import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const expectedRef = process.env.E2E_EXPECTED_SUPABASE_PROJECT_REF?.trim();
if (!expectedRef) {
  throw new Error("E2E_EXPECTED_SUPABASE_PROJECT_REF is required.");
}

const linkedRef = readFileSync("supabase/.temp/project-ref", "utf8").trim();
if (linkedRef !== expectedRef) {
  throw new Error("FAIL CLOSED: linked and expected Supabase refs differ.");
}

function runJson(args) {
  return JSON.parse(
    execFileSync(
      process.execPath,
      ["node_modules/supabase/dist/supabase.js", ...args],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    ),
  );
}

function runText(args) {
  return execFileSync(
    process.execPath,
    ["node_modules/supabase/dist/supabase.js", ...args],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
}

const projects = runJson(["projects", "list", "--output", "json"]);
const target = projects.find((project) => project.ref === expectedRef);
if (!target || target.status !== "ACTIVE_HEALTHY") {
  throw new Error("FAIL CLOSED: expected project is not active and healthy.");
}
if (/prod|production/i.test(target.name)) {
  throw new Error(
    "FAIL CLOSED: release verification cannot target production.",
  );
}

// Supabase CLI currently renders `migration list` as a table even when
// `--output json` is supplied. Parse both columns and fail closed if the table
// format cannot be understood.
const migrationOutput = runText(["migration", "list", "--linked"]);
let migrations;
try {
  const result = JSON.parse(migrationOutput);
  migrations = result.migrations ?? result;
} catch {
  migrations = migrationOutput
    .split(/\r?\n/)
    .map((line) => line.split("|").slice(0, 2))
    .map(([local = "", remote = ""]) => ({
      local: local.replaceAll("`", "").trim(),
      remote: remote.replaceAll("`", "").trim(),
    }))
    .filter(
      ({ local, remote }) => /^\d{14}$/.test(local) || /^\d{14}$/.test(remote),
    );
}
if (!Array.isArray(migrations) || migrations.length === 0) {
  throw new Error("FAIL CLOSED: no migration rows could be parsed.");
}
const mismatches = migrations.filter(
  (migration) => !migration.local || migration.local !== migration.remote,
);
if (mismatches.length > 0) {
  throw new Error(
    `Migration parity failed for ${mismatches.length} migration entries.`,
  );
}

console.log(
  `REMOTE_MIGRATION_PARITY=PASS PROJECT=${expectedRef} MIGRATIONS=${migrations.length}`,
);
