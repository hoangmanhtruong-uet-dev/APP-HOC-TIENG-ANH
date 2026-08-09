import { createClient } from "@supabase/supabase-js";
import { expect, test, type TestInfo } from "@playwright/test";

import type { Database } from "../../src/types/database";

const userAEmail = process.env.E2E_USER_A_EMAIL;
const userAPassword = process.env.E2E_USER_A_PASSWORD;
const userBEmail = process.env.E2E_USER_B_EMAIL;
const userBPassword = process.env.E2E_USER_B_PASSWORD;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const expectedProjectRef = process.env.E2E_EXPECTED_SUPABASE_PROJECT_REF;
const activeProjectRef = process.env.E2E_ACTIVE_SUPABASE_PROJECT_REF;

function requireEnvironment(testInfo: TestInfo) {
  test.skip(
    testInfo.project.name !== "chromium-desktop",
    "INTENTIONAL: remote database isolation runs once on desktop.",
  );
  test.skip(
    !userAEmail ||
      !userAPassword ||
      !userBEmail ||
      !userBPassword ||
      !supabaseUrl ||
      !anonKey,
    "AUTH_ENV: shared A/B authenticated database fixtures are required.",
  );
  test.skip(
    !expectedProjectRef || expectedProjectRef !== activeProjectRef,
    "AUTH_ENV: expected Supabase project ref must match the active environment.",
  );
}

test("USER_B cannot read, mutate, submit or resume USER_A resources through Supabase", async ({}, testInfo) => {
  test.setTimeout(60_000);
  requireEnvironment(testInfo);
  const userA = createClient<Database>(supabaseUrl!, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const userB = createClient<Database>(supabaseUrl!, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const [sessionA, sessionB] = await Promise.all([
    userA.auth.signInWithPassword({
      email: userAEmail!,
      password: userAPassword!,
    }),
    userB.auth.signInWithPassword({
      email: userBEmail!,
      password: userBPassword!,
    }),
  ]);
  expect(sessionA.error).toBeNull();
  expect(sessionB.error).toBeNull();
  expect(sessionA.data.user?.id).toBeTruthy();
  expect(sessionB.data.user?.id).toBeTruthy();
  expect(sessionA.data.user?.id).not.toBe(sessionB.data.user?.id);

  const operationKey = () => crypto.randomUUID();
  const exercise = await userA.rpc("start_exercise_attempt", {
    p_exercise_slug: "academic-vocabulary-foundations",
    p_idempotency_key: operationKey(),
  });
  const writing = await userA.rpc("start_writing_submission", {
    p_task_slug: "community-green-spaces",
    p_idempotency_key: operationKey(),
  });
  const speaking = await userA.rpc("start_speaking_attempt", {
    p_set_slug: "everyday-choices",
    p_idempotency_key: operationKey(),
  });
  const mock = await userA.rpc("start_mock_test", {
    p_mock_test_slug: "academic-foundation-mock",
    p_idempotency_key: operationKey(),
  });
  for (const result of [exercise, writing, speaking, mock]) {
    expect(result.error).toBeNull();
    expect(result.data?.id).toBeTruthy();
  }

  const resources = [
    ["learner_attempts", exercise.data!.id],
    ["writing_submissions", writing.data!.id],
    ["speaking_attempts", speaking.data!.id],
    ["mock_test_sessions", mock.data!.id],
  ] as const;
  for (const [table, id] of resources) {
    const read = await userB.from(table).select("id").eq("id", id);
    expect(read.error, `${table} cross-owner SELECT`).toBeNull();
    expect(read.data, `${table} cross-owner SELECT`).toEqual([]);

    const update = await userB
      .from(table)
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id);
    expect(update.error, `${table} cross-owner UPDATE`).not.toBeNull();

    const deletion = await userB.from(table).delete().eq("id", id);
    expect(deletion.error, `${table} cross-owner DELETE`).not.toBeNull();
  }

  const writingMutation = await userB.rpc("save_writing_draft", {
    p_submission_id: writing.data!.id,
    p_draft_text: "Cross-owner mutation must not persist.",
    p_expected_revision: 0,
  });
  expect(writingMutation.error?.code).toBe("P0002");

  const speakingSubmit = await userB.rpc("submit_speaking_attempt", {
    p_attempt_id: speaking.data!.id,
    p_idempotency_key: operationKey(),
  });
  expect(["P0001", "P0002"]).toContain(speakingSubmit.error?.code);

  const mockSubmit = await userB.rpc("submit_mock_test", {
    p_session_id: mock.data!.id,
    p_idempotency_key: operationKey(),
  });
  expect(["P0001", "P0002"]).toContain(mockSubmit.error?.code);

  const [writingAfter, speakingAfter, mockAfter] = await Promise.all([
    userA
      .from("writing_submissions")
      .select("status, draft_text")
      .eq("id", writing.data!.id)
      .single(),
    userA
      .from("speaking_attempts")
      .select("status")
      .eq("id", speaking.data!.id)
      .single(),
    userA
      .from("mock_test_sessions")
      .select("status")
      .eq("id", mock.data!.id)
      .single(),
  ]);
  expect(writingAfter.data).toEqual({ status: "draft", draft_text: "" });
  expect(speakingAfter.data?.status).toBe("in_progress");
  expect(mockAfter.data?.status).toBe("in_progress");

  await Promise.all([userA.auth.signOut(), userB.auth.signOut()]);
});
