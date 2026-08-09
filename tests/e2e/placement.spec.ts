import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const emailA = process.env.E2E_PLACEMENT_USER_A_EMAIL;
const passwordA = process.env.E2E_PLACEMENT_USER_A_PASSWORD;
const emailB = process.env.E2E_PLACEMENT_USER_B_EMAIL;
const passwordB = process.env.E2E_PLACEMENT_USER_B_PASSWORD;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function requirePlacementEnvironment(testInfo: TestInfo) {
  test.skip(
    testInfo.project.name !== "chromium-desktop",
    "INTENTIONAL: authenticated Placement runs once in canonical Chromium.",
  );
  test.skip(
    !emailA || !passwordA || !emailB || !passwordB || !supabaseUrl || !anonKey,
    "AUTH_ENV: dedicated Placement A/B credentials and Supabase public config are required.",
  );
  test.skip(
    process.env.E2E_EXPECTED_SUPABASE_PROJECT_REF !==
      process.env.E2E_ACTIVE_SUPABASE_PROJECT_REF,
    "REMOTE_DB: expected project ref must match the active Supabase project.",
  );
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/(dashboard|onboarding)$/);
}

async function chooseAnswer(page: Page, answer: string) {
  await page.getByText(answer, { exact: true }).click();
}

test("Placement autosaves, resumes and denies cross-owner mutation", async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000);
  requirePlacementEnvironment(testInfo);
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  await login(pageA, emailA!, passwordA!);
  await pageA.goto("/placement-test");
  const start = pageA.getByRole("button", { name: "Start test" });
  if (await start.isVisible()) await start.click();

  const attemptId = await pageA.locator('input[name="attemptId"]').inputValue();
  await chooseAnswer(pageA, "is");
  await expect(pageA.getByText("Saved", { exact: true })).toBeVisible();
  await pageA.getByRole("button", { name: /^Next/ }).click();
  await chooseAnswer(pageA, "children");
  await expect(pageA.getByText("Saved", { exact: true })).toBeVisible();
  await pageA.getByRole("button", { name: /^Next/ }).click();
  await expect(pageA.getByText("Question 3 of 5")).toBeVisible();
  const savedAnswerInputs = await pageA
    .locator('input[type="hidden"][name^="answer:"]')
    .evaluateAll((inputs) =>
      inputs.map((input) => ({
        name: (input as HTMLInputElement).name,
        value: (input as HTMLInputElement).value,
      })),
    );
  await pageA.reload();
  await expect(pageA.getByText("Question 3 of 5")).toBeVisible();
  await expect(pageA.locator('input[name="attemptId"]')).toHaveValue(attemptId);
  for (const answer of savedAnswerInputs) {
    await expect(pageA.locator(`input[name="${answer.name}"]`)).toHaveValue(
      answer.value,
    );
  }
  await pageA.reload();
  await expect(pageA.locator('input[name="attemptId"]')).toHaveValue(attemptId);

  const contextA2 = await browser.newContext();
  const pageA2 = await contextA2.newPage();
  await login(pageA2, emailA!, passwordA!);
  await pageA2.goto("/placement-test");
  await expect(pageA2.locator('input[name="attemptId"]')).toHaveValue(
    attemptId,
  );
  await expect(pageA2.getByText("Question 3 of 5")).toBeVisible();

  const clientA = createClient(supabaseUrl!, anonKey!, {
    auth: { persistSession: false },
  });
  const { error: loginAError } = await clientA.auth.signInWithPassword({
    email: emailA!,
    password: passwordA!,
  });
  expect(loginAError).toBeNull();
  const {
    data: { user: userA },
  } = await clientA.auth.getUser();
  expect(userA).not.toBeNull();
  const { data: activeAttempts, error: activeAttemptsError } = await clientA
    .from("placement_attempts")
    .select("id")
    .eq("status", "in_progress");
  expect(activeAttemptsError).toBeNull();
  expect(activeAttempts).toEqual([{ id: attemptId }]);

  const clientB = createClient(supabaseUrl!, anonKey!, {
    auth: { persistSession: false },
  });
  const { error: loginError } = await clientB.auth.signInWithPassword({
    email: emailB!,
    password: passwordB!,
  });
  expect(loginError).toBeNull();
  const {
    data: { user: userB },
  } = await clientB.auth.getUser();
  expect(userB).not.toBeNull();
  expect(userB!.id).not.toBe(userA!.id);
  const { data: crossOwnerRead, error: crossOwnerReadError } = await clientB
    .from("placement_attempts")
    .select("id")
    .eq("id", attemptId);
  expect(crossOwnerReadError).toBeNull();
  expect(crossOwnerRead).toEqual([]);
  const { data: questionData } = await clientB.rpc(
    "get_active_placement_test",
    { p_slug: "english-foundation" },
  );
  const firstQuestion = (
    questionData as {
      questions: Array<{ id: string; options: Array<{ id: string }> }>;
    }
  ).questions[0];
  const { error: ownerError } = await clientB.rpc("save_placement_answer", {
    p_attempt_id: attemptId,
    p_question_id: firstQuestion.id,
    p_option_id: firstQuestion.options[0].id,
    p_current_position: 1,
    p_expected_revision: 0,
  });
  expect(ownerError?.code).toBe("P0002");
  const { error: positionOwnerError } = await clientB.rpc(
    "update_placement_position",
    {
      p_attempt_id: attemptId,
      p_current_position: 1,
      p_expected_revision: 0,
    },
  );
  expect(positionOwnerError?.code).toBe("P0002");
  const { error: finishOwnerError } = await clientB.rpc(
    "submit_placement_attempt",
    {
      p_attempt_id: attemptId,
      p_answers: {},
      p_idempotency_key: attemptId,
    },
  );
  expect(finishOwnerError?.code).toBe("P0002");
  const { error: directInsertError } = await clientB
    .from("placement_attempts")
    .insert({
      user_id: userB!.id,
      placement_test_id: (questionData as { id: string }).id,
      start_idempotency_key: crypto.randomUUID(),
    });
  expect(directInsertError?.code).toBe("42501");
  const { error: directUpdateError } = await clientB
    .from("placement_attempts")
    .update({ current_position: 1 })
    .eq("id", attemptId);
  expect(directUpdateError?.code).toBe("42501");
  const { error: directDeleteError } = await clientB
    .from("placement_attempts")
    .delete()
    .eq("id", attemptId);
  expect(directDeleteError?.code).toBe("42501");
  await clientB.auth.signOut();

  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await login(pageB, emailB!, passwordB!);
  await pageB.goto(`/placement-test?attempt=${attemptId}`);
  await expect(
    pageB.locator(`input[name="attemptId"][value="${attemptId}"]`),
  ).toHaveCount(0);

  const { data: revisionState, error: revisionStateError } = await clientA
    .from("placement_attempts")
    .select("revision")
    .eq("id", attemptId)
    .single();
  expect(revisionStateError).toBeNull();
  const { error: acceptedRevisionError } = await clientA.rpc(
    "save_placement_answer",
    {
      p_attempt_id: attemptId,
      p_question_id: firstQuestion.id,
      p_option_id: firstQuestion.options[0].id,
      p_current_position: 3,
      p_expected_revision: revisionState!.revision,
    },
  );
  expect(acceptedRevisionError).toBeNull();
  const { error: staleRevisionError } = await clientA.rpc(
    "save_placement_answer",
    {
      p_attempt_id: attemptId,
      p_question_id: firstQuestion.id,
      p_option_id: firstQuestion.options[1].id,
      p_current_position: 3,
      p_expected_revision: revisionState!.revision,
    },
  );
  expect(staleRevisionError?.code).toBe("PT409");
  await pageA2.reload();
  await expect(pageA2.getByText("Question 3 of 5")).toBeVisible();

  const { error: ownerDirectUpdateError } = await clientA
    .from("placement_attempts")
    .update({ current_position: 1 })
    .eq("id", attemptId);
  expect(ownerDirectUpdateError?.code).toBe("42501");

  for (const [answer, last] of [
    ["in", false],
    ["went", false],
    ["easier", true],
  ] as const) {
    await chooseAnswer(pageA2, answer);
    if (last) {
      await pageA2.getByRole("button", { name: "Finish test" }).click();
    } else {
      await expect(pageA2.getByText("Saved", { exact: true })).toBeVisible();
      await pageA2.getByRole("button", { name: /^Next/ }).click();
    }
  }
  await expect(pageA2).toHaveURL(/\/placement-test\?result=/);

  const { data: completed, error: completedError } = await clientA
    .from("placement_attempts")
    .select("id,status")
    .eq("id", attemptId);
  expect(completedError).toBeNull();
  expect(completed).toEqual([{ id: attemptId, status: "submitted" }]);
  const { data: completedState, error: completedStateError } = await clientA
    .from("placement_attempts")
    .select("answers")
    .eq("id", attemptId)
    .single();
  expect(completedStateError).toBeNull();
  const { error: idempotentReplayError } = await clientA.rpc(
    "submit_placement_attempt",
    {
      p_attempt_id: attemptId,
      p_answers: completedState!.answers,
      p_idempotency_key: attemptId,
    },
  );
  expect(idempotentReplayError).toBeNull();
  const { error: payloadMismatchError } = await clientA.rpc(
    "submit_placement_attempt",
    {
      p_attempt_id: attemptId,
      p_answers: {},
      p_idempotency_key: attemptId,
    },
  );
  expect(payloadMismatchError?.code).toBe("22023");
  await pageA2.goto("/placement-test");
  await expect(
    pageA2.locator(`input[name="attemptId"][value="${attemptId}"]`),
  ).toHaveCount(0);
  await clientA.auth.signOut();
  await contextB.close();
  await contextA2.close();
  await contextA.close();
});
