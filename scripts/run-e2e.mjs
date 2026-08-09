import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

const port = process.env.E2E_PORT ?? "3100";
const baseUrl = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;
const serverReadyTimeoutMs = 120_000;
const nextCli = "node_modules/next/dist/bin/next";
const playwrightCli = "node_modules/@playwright/test/cli.js";
const requireAuthenticated = process.argv.includes("--require-authenticated");
const playwrightArgs = process.argv
  .slice(2)
  .filter((argument) => argument !== "--require-authenticated");
const authenticatedEnvironmentNames = [
  "E2E_USER_A_EMAIL",
  "E2E_USER_A_PASSWORD",
  "E2E_USER_B_EMAIL",
  "E2E_USER_B_PASSWORD",
  "E2E_ONBOARDING_EMAIL",
  "E2E_ONBOARDING_PASSWORD",
  "E2E_EXPECTED_SUPABASE_PROJECT_REF",
];

const sharedAliases = {
  E2E_AUTH_EMAIL: "E2E_USER_A_EMAIL",
  E2E_AUTH_PASSWORD: "E2E_USER_A_PASSWORD",
  E2E_LEARNING_EMAIL: "E2E_USER_A_EMAIL",
  E2E_LEARNING_PASSWORD: "E2E_USER_A_PASSWORD",
  E2E_PLACEMENT_USER_A_EMAIL: "E2E_USER_A_EMAIL",
  E2E_PLACEMENT_USER_A_PASSWORD: "E2E_USER_A_PASSWORD",
  E2E_PLACEMENT_USER_B_EMAIL: "E2E_USER_B_EMAIL",
  E2E_PLACEMENT_USER_B_PASSWORD: "E2E_USER_B_PASSWORD",
  E2E_PRACTICE_USER_A_EMAIL: "E2E_USER_A_EMAIL",
  E2E_PRACTICE_USER_A_PASSWORD: "E2E_USER_A_PASSWORD",
  E2E_PRACTICE_USER_B_EMAIL: "E2E_USER_B_EMAIL",
  E2E_PRACTICE_USER_B_PASSWORD: "E2E_USER_B_PASSWORD",
  E2E_MOCK_USER_A_EMAIL: "E2E_USER_A_EMAIL",
  E2E_MOCK_USER_A_PASSWORD: "E2E_USER_A_PASSWORD",
  E2E_MOCK_USER_B_EMAIL: "E2E_USER_B_EMAIL",
  E2E_MOCK_USER_B_PASSWORD: "E2E_USER_B_PASSWORD",
};

for (const [alias, sharedName] of Object.entries(sharedAliases)) {
  process.env[alias] ??= process.env[sharedName];
}

function readLocalEnvironmentValue(name) {
  try {
    const envFile = readFileSync(".env.local", "utf8");
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = envFile.match(new RegExp(`^${escapedName}=(.+)$`, "m"));
    return match?.[1]?.trim().replace(/^['"]|['"]$/g, "");
  } catch {
    return undefined;
  }
}

function getProjectRef(rawUrl) {
  if (!rawUrl) return undefined;

  try {
    const hostname = new URL(rawUrl).hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") return "local";
    return hostname.endsWith(".supabase.co")
      ? hostname.slice(0, -".supabase.co".length)
      : undefined;
  } catch {
    return undefined;
  }
}

for (const publicName of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
]) {
  process.env[publicName] ??= readLocalEnvironmentValue(publicName);
}

const activeProjectRef = getProjectRef(process.env.NEXT_PUBLIC_SUPABASE_URL);
if (activeProjectRef) {
  process.env.E2E_ACTIVE_SUPABASE_PROJECT_REF = activeProjectRef;
}
process.env.E2E_BASE_URL = baseUrl;
process.env.E2E_AUTHENTICATED_REQUIRED = requireAuthenticated
  ? "true"
  : "false";

const missingAuthenticatedEnvironment = authenticatedEnvironmentNames.filter(
  (name) => !process.env[name]?.trim(),
);
if (missingAuthenticatedEnvironment.length > 0) {
  const message = `Authenticated E2E configuration missing: ${missingAuthenticatedEnvironment.join(", ")}`;
  if (requireAuthenticated) throw new Error(message);
  console.warn(message);
  console.warn(
    "Authenticated cases may skip. Use npm run test:e2e:authenticated to require this configuration.",
  );
}
if (
  requireAuthenticated &&
  process.env.E2E_EXPECTED_SUPABASE_PROJECT_REF !== activeProjectRef
) {
  throw new Error(
    "E2E_EXPECTED_SUPABASE_PROJECT_REF does not match the active Supabase project ref.",
  );
}

async function isReady() {
  try {
    const response = await fetch(baseUrl, { cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer() {
  const startedAt = Date.now();

  while (Date.now() - startedAt < serverReadyTimeoutMs) {
    if (await isReady()) return;
    await delay(500);
  }

  throw new Error(`Timed out waiting for ${baseUrl}`);
}

function stopServer(server) {
  if (!server || server.exitCode !== null) return;

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], {
      stdio: "ignore",
    });
    return;
  }

  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    server.kill("SIGTERM");
  }
}

function run(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
      ...options,
    });

    child.on("exit", (code, signal) => {
      resolve({ code: code ?? 1, signal });
    });
  });
}

let server;

try {
  if (await isReady()) {
    if (process.env.E2E_REUSE_SERVER !== "true") {
      throw new Error(
        `${baseUrl} is already in use. Stop that process or set E2E_REUSE_SERVER=true only after verifying its environment.`,
      );
    }
  } else {
    server = spawn(
      process.execPath,
      [nextCli, "start", "--hostname", "localhost", "--port", port],
      {
        cwd: process.cwd(),
        detached: process.platform !== "win32",
        env: process.env,
        stdio: "inherit",
      },
    );
    await waitForServer();
  }

  const result = await run(process.execPath, [
    playwrightCli,
    "test",
    ...playwrightArgs,
  ]);
  process.exitCode = result.code;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  stopServer(server);
  process.exit(process.exitCode ?? 0);
}
