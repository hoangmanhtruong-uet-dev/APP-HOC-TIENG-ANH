import { execFileSync, spawn } from "node:child_process";
import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

const expectedRef = process.env.E2E_EXPECTED_SUPABASE_PROJECT_REF?.trim();
if (!expectedRef) {
  throw new Error(
    "E2E_EXPECTED_SUPABASE_PROJECT_REF is required for remote authenticated E2E.",
  );
}

function readLocalEnvironmentValue(name) {
  const content = readFileSync(".env.local", "utf8");
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = content.match(new RegExp(`^${escapedName}=(.+)$`, "m"));
  return match?.[1]?.trim().replace(/^['"]|['"]$/g, "");
}

function projectRefFromUrl(value) {
  const hostname = new URL(value).hostname;
  return hostname.endsWith(".supabase.co")
    ? hostname.slice(0, -".supabase.co".length)
    : undefined;
}

function runSupabaseJson(args) {
  const output = execFileSync(
    process.execPath,
    ["node_modules/supabase/dist/supabase.js", ...args],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  return JSON.parse(output);
}

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  readLocalEnvironmentValue("NEXT_PUBLIC_SUPABASE_URL");
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  readLocalEnvironmentValue("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const linkedRef = readFileSync("supabase/.temp/project-ref", "utf8").trim();
const appRef = supabaseUrl ? projectRefFromUrl(supabaseUrl) : undefined;

if (
  !supabaseUrl ||
  !anonKey ||
  appRef !== expectedRef ||
  linkedRef !== expectedRef
) {
  throw new Error(
    "FAIL CLOSED: expected, application, and linked Supabase project refs must match.",
  );
}

const projects = runSupabaseJson(["projects", "list", "--output", "json"]);
const target = projects.find((project) => project.ref === expectedRef);
if (!target || target.status !== "ACTIVE_HEALTHY") {
  throw new Error(
    "FAIL CLOSED: expected Supabase project is not active and healthy.",
  );
}
if (/production|prod/i.test(target.name)) {
  throw new Error(
    "FAIL CLOSED: remote authenticated E2E cannot target production.",
  );
}

const keys = runSupabaseJson([
  "projects",
  "api-keys",
  "--project-ref",
  expectedRef,
  "--reveal",
  "--output",
  "json",
]);
const serviceRoleKey = keys.find((key) => key.name === "service_role")?.api_key;
if (!serviceRoleKey) {
  throw new Error(
    "Supabase service-role credential is unavailable to the operator profile.",
  );
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const speakingSecretResult = await admin.rpc(
  "get_speaking_pipeline_signing_secret",
);
if (
  speakingSecretResult.error ||
  typeof speakingSecretResult.data !== "string" ||
  speakingSecretResult.data.length < 32
) {
  throw new Error("Staging Speaking pipeline secret is unavailable.");
}
const speakingPipelineSigningSecret = speakingSecretResult.data;
const createdUserIds = [];
const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
const accounts = {
  a: {
    email: `global-e2e-a-${suffix}@example.test`,
    password: `Ga!${crypto.randomUUID().replaceAll("-", "")}9z`,
    displayName: "Global E2E A",
  },
  b: {
    email: `global-e2e-b-${suffix}@example.test`,
    password: `Gb!${crypto.randomUUID().replaceAll("-", "")}8y`,
    displayName: "Global E2E B",
  },
  onboarding: {
    email: `global-e2e-onboarding-${suffix}@example.test`,
    password: `Go!${crypto.randomUUID().replaceAll("-", "")}7x`,
    displayName: "Global E2E Onboarding",
  },
  review: {
    email: `global-e2e-review-${suffix}@example.test`,
    password: `Gr!${crypto.randomUUID().replaceAll("-", "")}6w`,
    displayName: "Global E2E Review",
  },
  placementActive: {
    email: `global-e2e-placement-active-${suffix}@example.test`,
    password: `Gp!${crypto.randomUUID().replaceAll("-", "")}5v`,
    displayName: "Global E2E Placement Active",
  },
  placementComplete: {
    email: `global-e2e-placement-complete-${suffix}@example.test`,
    password: `Gc!${crypto.randomUUID().replaceAll("-", "")}4u`,
    displayName: "Global E2E Placement Complete",
  },
};

function requireData(result, operation) {
  if (result.error || !result.data) {
    throw result.error ?? new Error(`${operation} returned no data.`);
  }
  return result.data;
}

async function createActor(account, expectedUserId) {
  const actor = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signIn = await actor.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  });
  if (signIn.error || signIn.data.user?.id !== expectedUserId) {
    throw signIn.error ?? new Error("Authenticated fixture identity mismatch.");
  }
  return actor;
}

async function createAuthUser(account) {
  const result = await admin.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: { display_name: account.displayName },
  });
  if (result.error || !result.data.user) {
    throw result.error ?? new Error("Supabase Auth did not return a user.");
  }
  createdUserIds.push(result.data.user.id);
  return result.data.user;
}

async function completeLearner(account, user, prioritySkills) {
  const actor = await createActor(account, user.id);
  const profile = await actor.from("learner_profiles").upsert({
    user_id: user.id,
    test_type: "academic",
    current_band: 5,
    target_band: 7,
    daily_study_minutes: 45,
    study_days_per_week: 5,
    priority_skills: prioritySkills,
    primary_goal: "study_abroad",
    onboarding_step: 8,
  });
  if (profile.error) throw profile.error;
  const completed = await actor.rpc("complete_learner_onboarding");
  if (completed.error) throw completed.error;
  await actor.auth.signOut();
}

async function prepareReviewLearner(account, user) {
  const actor = await createActor(account, user.id);
  const profile = await actor.from("learner_profiles").upsert({
    user_id: user.id,
    test_type: "academic",
    current_band: 5,
    target_band: 7,
    daily_study_minutes: 45,
    study_days_per_week: 5,
    priority_skills: ["reading", "writing"],
    primary_goal: "study_abroad",
    onboarding_step: 8,
  });
  if (profile.error) throw profile.error;
  await actor.auth.signOut();
}

async function preparePlacement(account, user, shouldComplete) {
  const actor = await createActor(account, user.id);
  const catalog = requireData(
    await actor.rpc("get_active_placement_test", {
      p_slug: "english-foundation",
    }),
    "get_active_placement_test",
  );
  const attempt = requireData(
    await actor.rpc("start_placement_attempt", {
      p_slug: "english-foundation",
      p_idempotency_key: crypto.randomUUID(),
    }),
    "start_placement_attempt",
  );
  let revision = Number(attempt.revision);
  const answers = {};
  const questions = shouldComplete
    ? catalog.questions
    : catalog.questions.slice(0, 1);
  for (const [index, question] of questions.entries()) {
    const optionId = question.options[0].id;
    const saved = requireData(
      await actor.rpc("save_placement_answer", {
        p_attempt_id: attempt.id,
        p_question_id: question.id,
        p_option_id: optionId,
        p_current_position: Math.min(index + 2, catalog.questions.length),
        p_expected_revision: revision,
      }),
      "save_placement_answer",
    );
    answers[question.id] = optionId;
    revision = Number(saved.revision);
  }
  if (shouldComplete) {
    requireData(
      await actor.rpc("submit_placement_attempt", {
        p_attempt_id: attempt.id,
        p_answers: answers,
        p_idempotency_key: crypto.randomUUID(),
      }),
      "submit_placement_attempt",
    );
  }
  await actor.auth.signOut();
  return attempt.id;
}

async function prepareCompletedLearnerVisualData(account, user) {
  const actor = await createActor(account, user.id);
  const routes = {};
  for (const [fixture, slug, prefix] of [
    ["practice", "academic-vocabulary-foundations", "/practice"],
    ["reading", "academic-reading-cool-roofs", "/practice/reading"],
    [
      "listening",
      "academic-listening-community-library",
      "/practice/listening",
    ],
  ]) {
    const completed = requireData(
      await actor.rpc("start_exercise_attempt", {
        p_exercise_slug: slug,
        p_idempotency_key: `visual-${fixture}-result-${suffix}`,
      }),
      `start ${fixture} result fixture`,
    );
    requireData(
      await actor.rpc("submit_exercise_attempt", {
        p_attempt_id: completed.id,
      }),
      `submit ${fixture} result fixture`,
    );
    routes[`${fixture}-result`] = `${prefix}/${slug}/result/${completed.id}`;
    await actor.rpc("start_exercise_attempt", {
      p_exercise_slug: slug,
      p_idempotency_key: `visual-${fixture}-active-${suffix}`,
    });
  }

  const writing = requireData(
    await actor.rpc("start_writing_submission", {
      p_task_slug: "community-green-spaces",
      p_idempotency_key: `visual-writing-result-${suffix}`,
    }),
    "start writing visual fixture",
  );
  const essay = Array.from(
    { length: 55 },
    (_, index) =>
      `Community green spaces improve daily life through health, connection, and climate resilience. Evidence ${index + 1} supports careful long-term local investment.`,
  ).join(" ");
  requireData(
    await actor.rpc("save_writing_draft", {
      p_submission_id: writing.id,
      p_draft_text: essay,
      p_expected_revision: writing.server_revision,
    }),
    "save writing visual fixture",
  );
  requireData(
    await actor.rpc("submit_writing_submission", {
      p_submission_id: writing.id,
      p_idempotency_key: `visual-writing-submit-${suffix}`,
    }),
    "submit writing visual fixture",
  );
  routes["writing-submitted"] =
    `/practice/writing/community-green-spaces/submission/${writing.id}`;
  await actor.rpc("start_writing_submission", {
    p_task_slug: "community-green-spaces",
    p_idempotency_key: `visual-writing-active-${suffix}`,
  });

  const speaking = requireData(
    await actor.rpc("start_speaking_attempt", {
      p_set_slug: "everyday-choices",
      p_idempotency_key: `visual-speaking-result-${suffix}`,
    }),
    "start speaking visual fixture",
  );
  routes["speaking-submitted"] =
    `/practice/speaking/everyday-choices/attempt/${speaking.id}`;

  const mockComplete = requireData(
    await actor.rpc("start_mock_test", {
      p_mock_test_slug: "academic-foundation-mock",
      p_idempotency_key: `visual-mock-result-${suffix}`,
    }),
    "start mock summary visual fixture",
  );
  routes["mock-complete"] =
    `/mock-tests/academic-foundation-mock/session/${mockComplete.id}/summary`;
  routes["mock-active"] =
    `/mock-tests/academic-foundation-mock/session/${mockComplete.id}`;
  await actor.auth.signOut();
  return routes;
}

function runE2E(environment) {
  const requestedArguments = process.argv.slice(2);
  const hasWorkerOverride = requestedArguments.some(
    (argument) => argument === "--workers" || argument.startsWith("--workers="),
  );
  const child = spawn(
    process.execPath,
    [
      "scripts/run-e2e.mjs",
      "--require-authenticated",
      ...(hasWorkerOverride ? [] : ["--workers=1"]),
      ...requestedArguments,
    ],
    { stdio: "inherit", shell: false, env: environment },
  );
  return new Promise((resolve) => {
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function deleteAuthUserWithRetry(userId) {
  if (!(await removeSpeakingRecordings(userId))) return false;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const result = await admin.auth.admin.deleteUser(userId);
    if (!result.error) return true;
    if (attempt < 3) await delay(250 * 2 ** (attempt - 1));
  }
  return false;
}

async function removeSpeakingRecordings(userId) {
  const bucket = admin.storage.from("speaking-recordings");
  const files = [];
  const pendingPrefixes = [userId];
  while (pendingPrefixes.length > 0) {
    const prefix = pendingPrefixes.pop();
    const listed = await bucket.list(prefix, { limit: 1_000 });
    if (listed.error) return false;
    for (const item of listed.data ?? []) {
      const path = `${prefix}/${item.name}`;
      if (item.metadata) files.push(path);
      else pendingPrefixes.push(path);
    }
  }
  if (files.length === 0) return true;
  const removed = await bucket.remove(files);
  return !removed.error;
}

let exitCode = 1;
try {
  const userA = await createAuthUser(accounts.a);
  const userB = await createAuthUser(accounts.b);
  await createAuthUser(accounts.onboarding);
  const reviewUser = await createAuthUser(accounts.review);
  const placementActiveUser = await createAuthUser(accounts.placementActive);
  const placementCompleteUser = await createAuthUser(
    accounts.placementComplete,
  );
  if (userA.id === userB.id)
    throw new Error("Global E2E identities must differ.");
  await completeLearner(accounts.a, userA, ["reading", "writing", "speaking"]);
  await completeLearner(accounts.b, userB, [
    "listening",
    "writing",
    "speaking",
  ]);
  await prepareReviewLearner(accounts.review, reviewUser);
  const placementActiveId = await preparePlacement(
    accounts.placementActive,
    placementActiveUser,
    false,
  );
  const placementCompleteId = await preparePlacement(
    accounts.placementComplete,
    placementCompleteUser,
    true,
  );
  const screenRoutes = await prepareCompletedLearnerVisualData(
    accounts.a,
    userA,
  );
  screenRoutes["placement-active"] =
    `/placement-test?attempt=${placementActiveId}`;
  screenRoutes["placement-complete"] =
    `/placement-test?result=${placementCompleteId}`;

  const environment = {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    E2E_USER_A_EMAIL: accounts.a.email,
    E2E_USER_A_PASSWORD: accounts.a.password,
    E2E_USER_B_EMAIL: accounts.b.email,
    E2E_USER_B_PASSWORD: accounts.b.password,
    E2E_AUTH_EMAIL: accounts.a.email,
    E2E_AUTH_PASSWORD: accounts.a.password,
    E2E_ONBOARDING_EMAIL: accounts.onboarding.email,
    E2E_ONBOARDING_PASSWORD: accounts.onboarding.password,
    E2E_REVIEW_EMAIL: accounts.review.email,
    E2E_REVIEW_PASSWORD: accounts.review.password,
    E2E_PLACEMENT_ACTIVE_EMAIL: accounts.placementActive.email,
    E2E_PLACEMENT_ACTIVE_PASSWORD: accounts.placementActive.password,
    E2E_PLACEMENT_COMPLETE_EMAIL: accounts.placementComplete.email,
    E2E_PLACEMENT_COMPLETE_PASSWORD: accounts.placementComplete.password,
    E2E_SCREEN_ROUTES_JSON: JSON.stringify(screenRoutes),
    E2E_EXPECTED_SUPABASE_PROJECT_REF: expectedRef,
    SPEAKING_PIPELINE_SIGNING_SECRET: speakingPipelineSigningSecret,
  };
  console.log(
    `REMOTE_AUTH_FIXTURE=READY USERS=6 DISTINCT_AB=PASS VISUAL_ROUTES=${Object.keys(screenRoutes).length} PROJECT=${expectedRef}`,
  );
  exitCode = await runE2E(environment);
} finally {
  let cleaned = 0;
  for (const userId of createdUserIds) {
    if (!(await deleteAuthUserWithRetry(userId))) {
      console.error(`Failed to clean E2E user id ${userId}.`);
    } else {
      cleaned += 1;
    }
  }
  console.log(
    `REMOTE_AUTH_FIXTURE_CLEANED=${cleaned}/${createdUserIds.length}`,
  );
  if (cleaned !== createdUserIds.length) exitCode = 1;
}

process.exit(exitCode);
