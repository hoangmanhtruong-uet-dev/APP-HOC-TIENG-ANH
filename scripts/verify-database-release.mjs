import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";

const supabaseCli = "node_modules/supabase/dist/supabase.js";
const databaseTestFiles = readdirSync("supabase/tests/database", {
  withFileTypes: true,
})
  .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
  .map((entry) => entry.name)
  .sort();
const migrations = readdirSync("supabase/migrations", { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
  .map((entry) => entry.name)
  .sort();
const timestamps = migrations.map((name) => name.match(/^(\d{14})_/)?.[1]);

function run(command, args, { capture = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: false,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    let settled = false;
    for (const stream of [child.stdout, child.stderr]) {
      stream.on("data", (chunk) => {
        const value = chunk.toString();
        output += value;
        process.stdout.write(value);
      });
    }
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      reject(
        error.code === "ENOENT"
          ? new Error("Docker unavailable. Run this gate in release CI.")
          : error,
      );
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      if (code !== 0) {
        reject(
          new Error(
            `${command} ${args.join(" ")} failed with exit code ${code}.`,
          ),
        );
        return;
      }
      resolve(capture ? output : undefined);
    });
  });
}

function escapeWorkflowCommand(value) {
  return value
    .replaceAll("%", "%25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A");
}

async function verifyDatabaseRelease() {
  if (databaseTestFiles.length === 0) {
    throw new Error("Database release gate requires at least one pgTAP file.");
  }
  if (timestamps.some((timestamp) => !timestamp)) {
    throw new Error("Every migration must start with a 14-digit timestamp.");
  }
  if (new Set(timestamps).size !== timestamps.length) {
    throw new Error("Migration timestamps must be unique.");
  }

  await run("docker", ["info"]);
  let stackStartAttempted = false;
  let gateError;
  let successSummary;

  try {
    stackStartAttempted = true;
    await run(process.execPath, [
      supabaseCli,
      "start",
      "-x",
      "studio,imgproxy,edge-runtime,logflare,vector,supavisor",
    ]);
    await run(process.execPath, [supabaseCli, "db", "reset", "--local"]);
    let pgTapOutput = "";
    for (const databaseTestFile of databaseTestFiles) {
      const testPath = `supabase/tests/database/${databaseTestFile}`;
      const testOutput = await run(
        process.execPath,
        [supabaseCli, "test", "db", testPath],
        { capture: true },
      );
      pgTapOutput += `\n${testOutput}`;
    }
    await run(process.execPath, [
      supabaseCli,
      "db",
      "lint",
      "--local",
      "--level",
      "warning",
      "--fail-on",
      "warning",
    ]);

    const skippedAssertions = (
      pgTapOutput.match(/^\s*ok\s+\d+.*#\s*SKIP\b/gim) ?? []
    ).length;
    const passedAssertions =
      (pgTapOutput.match(/^\s*ok\s+\d+/gm) ?? []).length - skippedAssertions;
    const failedAssertions = (pgTapOutput.match(/^\s*not ok\s+\d+/gm) ?? [])
      .length;
    if (
      failedAssertions > 0 ||
      skippedAssertions > 0 ||
      passedAssertions === 0
    ) {
      throw new Error(
        `pgTAP gate failed: ${passedAssertions} passed, ${failedAssertions} failed, ${skippedAssertions} skipped.`,
      );
    }

    successSummary = `DATABASE_RELEASE_GATE=PASS MIGRATIONS=${migrations.length} TEST_FILES=${databaseTestFiles.length} ASSERTIONS=${passedAssertions} FAILED=0 SKIPPED=0`;
  } catch (error) {
    gateError = error;
  } finally {
    if (stackStartAttempted) {
      try {
        await run(process.execPath, [
          supabaseCli,
          "stop",
          "--no-backup",
          "--yes",
        ]);
        console.log("DATABASE_RELEASE_CLEANUP=PASS");
      } catch (cleanupError) {
        gateError = gateError
          ? new AggregateError(
              [gateError, cleanupError],
              "Database gate and cleanup both failed.",
            )
          : cleanupError;
      }
    }
  }

  if (gateError) throw gateError;
  console.log(successSummary);
}

try {
  await verifyDatabaseRelease();
} catch (error) {
  const message =
    error instanceof AggregateError
      ? error.errors
          .map((cause) =>
            cause instanceof Error ? cause.message : String(cause),
          )
          .join(" | ")
      : error instanceof Error
        ? error.message
        : String(error);
  console.error(`DATABASE_RELEASE_GATE=FAIL REASON=${message}`);
  if (process.env.GITHUB_ACTIONS === "true") {
    console.error(
      `::error title=Database release gate::${escapeWorkflowCommand(message)}`,
    );
  }
  process.exitCode = 1;
}
