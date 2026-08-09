import { writeFile } from "node:fs/promises";

import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type BrowserContext,
  type Page,
  type TestInfo,
} from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import inventory from "./screen-inventory.json";
import type { Database } from "../../src/types/database";

type Account = { email?: string; password?: string };
type RuntimeIssue = { source: "console" | "pageerror"; message: string };
type ScreenResult = {
  id: string;
  route: string;
  viewports: Record<
    string,
    { visual: string; overflow: string; axe: string; console: string }
  >;
};

const accounts: Record<string, Account> = {
  completed: {
    email: process.env.E2E_USER_A_EMAIL,
    password: process.env.E2E_USER_A_PASSWORD,
  },
  fresh: {
    email: process.env.E2E_USER_B_EMAIL,
    password: process.env.E2E_USER_B_PASSWORD,
  },
  onboarding: {
    email: process.env.E2E_ONBOARDING_EMAIL,
    password: process.env.E2E_ONBOARDING_PASSWORD,
  },
  review: {
    email: process.env.E2E_REVIEW_EMAIL,
    password: process.env.E2E_REVIEW_PASSWORD,
  },
  placementActive: {
    email: process.env.E2E_PLACEMENT_ACTIVE_EMAIL,
    password: process.env.E2E_PLACEMENT_ACTIVE_PASSWORD,
  },
  placementComplete: {
    email: process.env.E2E_PLACEMENT_COMPLETE_EMAIL,
    password: process.env.E2E_PLACEMENT_COMPLETE_PASSWORD,
  },
};

const viewportHeights: Record<number, number> = {
  360: 800,
  390: 844,
  768: 1024,
  1280: 900,
};
const requestedStateIds = new Set(
  (process.env.E2E_SCREEN_STATE_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const selectedStates = requestedStateIds.size
  ? inventory.states.filter((state) => requestedStateIds.has(state.id))
  : inventory.states;

function requireEnvironment(testInfo: TestInfo) {
  test.skip(
    testInfo.project.name !== "chromium-desktop",
    "Canonical 55-state visual evidence is Chromium-only.",
  );
  const missing = Object.entries(accounts).flatMap(([name, account]) =>
    account.email && account.password ? [] : [name],
  );
  test.skip(
    missing.length > 0 || !process.env.E2E_SCREEN_ROUTES_JSON,
    `AUTH_ENV: deterministic screen fixtures are missing (${missing.join(", ") || "routes"}).`,
  );
}

function parseFixtureRoutes() {
  try {
    return JSON.parse(process.env.E2E_SCREEN_ROUTES_JSON ?? "{}") as Record<
      string,
      string
    >;
  } catch {
    throw new Error("E2E_SCREEN_ROUTES_JSON must be valid JSON.");
  }
}

async function login(page: Page, account: Account) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(account.email!);
  await page.locator('input[type="password"]').fill(account.password!);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/(dashboard|onboarding|placement-test)$/);
}

async function createAuthenticatedPage(
  context: BrowserContext,
  account: Account,
) {
  const page = await context.newPage();
  await login(page, account);
  return page;
}

function pageKey(state: (typeof inventory.states)[number]) {
  if (state.auth === "public") return "public";
  if (state.fixture === "fresh-completed") return "fresh";
  if (state.fixture === "onboarding-review") return "review";
  if (state.fixture === "placement-active") return "placementActive";
  if (state.fixture === "placement-complete") return "placementComplete";
  if (
    state.fixture === "fresh-onboarding" ||
    state.fixture === "placement-pending"
  )
    return "onboarding";
  return "completed";
}

function resolveRoute(
  state: (typeof inventory.states)[number],
  fixtureRoutes: Record<string, string>,
) {
  if (fixtureRoutes[state.fixture]) return fixtureRoutes[state.fixture];
  if (!state.route.includes(":")) return state.route;
  const base = fixtureRoutes[state.fixture];
  if (!base) throw new Error(`Missing dynamic route for ${state.fixture}.`);
  if (state.id === "writing-improved") return `${base}/improved`;
  if (state.id === "writing-complete") return `${base}/complete`;
  if (state.id === "speaking-pronunciation") return `${base}/pronunciation`;
  if (state.id === "speaking-attempt-progress") return `${base}/progress`;
  return base;
}

async function stabilize(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addStyleTag({
    content:
      "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}",
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

async function prepareDeclaredState(
  page: Page,
  fixture: string,
  route: string,
) {
  await page.context().setOffline(false);
  await page.goto(route, { waitUntil: "networkidle" });
  if (fixture === "login-validation") {
    await page.getByLabel("Email").fill("invalid-email");
    await page.locator('button[type="submit"]').click();
  } else if (fixture === "register-validation") {
    await page.locator('button[type="submit"]').click();
  } else if (fixture === "grammar-hint") {
    const hint = page
      .getByRole("button")
      .filter({ hasText: /hint|gợi ý/i })
      .first();
    if (await hint.isVisible()) await hint.click();
  } else if (fixture === "writing-offline") {
    await page.context().setOffline(true);
    const editor = page.locator("textarea").first();
    if (await editor.isVisible()) {
      await editor.fill(
        "A deterministic offline draft remains available while connectivity is interrupted.",
      );
    }
    await expect(page.locator("#writing-save-status")).toContainText(
      "Offline",
      { timeout: 10_000 },
    );
  }
  await stabilize(page);
}

async function recordRequiredSpeakingResponses(page: Page) {
  await page.goto("/practice/speaking/everyday-choices", {
    waitUntil: "networkidle",
  });
  const start = page.getByRole("button", { name: /Bắt đầu ghi âm/i });
  if (await start.isVisible()) await start.click();
  await expect(page.getByText(/required responses/i)).toBeVisible();
  for (let index = 0; index < 4; index += 1) {
    await page.getByRole("button", { name: "Start recording" }).click();
    await page.waitForTimeout(1_400);
    await page.getByRole("button", { name: "Stop recording" }).click();
    const upload = page.getByRole("button", { name: "Upload & verify" });
    await expect(upload).toBeEnabled();
    await upload.click();
    await expect(page.getByText("Audio verified")).toBeVisible({
      timeout: 20_000,
    });
    if (index < 3)
      await page.getByRole("button", { name: "Next prompt" }).click();
  }
}

async function submitStandaloneSpeaking(page: Page) {
  await recordRequiredSpeakingResponses(page);
  await page.getByRole("button", { name: "Finish Speaking" }).click();
  await page
    .getByRole("button", { name: "Xác nhận nộp bài", exact: true })
    .click();
  await expect(page).toHaveURL(
    /\/practice\/speaking\/everyday-choices\/attempt\//,
  );
}

function requireRpcData<T>(
  result: { data: T | null; error: { message: string } | null },
  operation: string,
) {
  if (result.error || !result.data)
    throw new Error(`${operation}: ${result.error?.message ?? "no data"}`);
  return result.data;
}

async function completeMockFixture(
  actor: SupabaseClient<Database>,
  page: Page,
  fixtureRoutes: Record<string, string>,
) {
  const sessionId = fixtureRoutes["mock-complete"]
    .split("/session/")[1]
    .split("/")[0];
  const session = requireRpcData(
    await actor
      .from("mock_test_sessions")
      .select("id, mock_test_version_id")
      .eq("id", sessionId)
      .single(),
    "read mock visual session",
  ) as { id: string; mock_test_version_id: string };
  const sections = requireRpcData(
    await actor
      .from("mock_test_sections")
      .select("id, section_type, section_order")
      .eq("mock_test_version_id", session.mock_test_version_id)
      .order("section_order"),
    "read mock visual sections",
  ) as Array<{ id: string; section_type: string; section_order: number }>;
  for (const section of sections) {
    const attempt = requireRpcData(
      await actor.rpc("start_mock_test_section", {
        p_session_id: session.id,
        p_section_id: section.id,
        p_idempotency_key: `visual-section-start-${section.id}`,
      }),
      `start mock ${section.section_type} section`,
    ) as {
      id: string;
      writing_submission_id: string | null;
      speaking_attempt_id: string | null;
    };
    if (section.section_type === "writing") {
      const submissionId = attempt.writing_submission_id;
      if (!submissionId)
        throw new Error("Mock writing section did not create a submission.");
      const draft = Array.from(
        { length: 55 },
        (_, index) =>
          `Green public places support healthier communities through inclusive planning and sustained investment, evidence point ${index + 1}.`,
      ).join(" ");
      const submission = requireRpcData(
        await actor
          .from("writing_submissions")
          .select("server_revision")
          .eq("id", submissionId)
          .single(),
        "read mock writing revision",
      ) as { server_revision: number };
      requireRpcData(
        await actor.rpc("save_writing_draft", {
          p_submission_id: submissionId,
          p_draft_text: draft,
          p_expected_revision: submission.server_revision,
        }),
        "save mock writing draft",
      );
    } else if (section.section_type === "speaking") {
      await recordRequiredSpeakingResponses(page);
    }
    requireRpcData(
      await actor.rpc("submit_mock_test_section", {
        p_section_attempt_id: attempt.id,
        p_idempotency_key: `visual-section-submit-${section.id}`,
      }),
      `submit mock ${section.section_type} section`,
    );
  }
  requireRpcData(
    await actor.rpc("submit_mock_test", {
      p_session_id: session.id,
      p_idempotency_key: `visual-mock-submit-${session.id}`,
    }),
    "submit mock visual session",
  );
  requireRpcData(
    await actor.rpc("complete_mock_test", { p_session_id: session.id }),
    "complete mock visual session",
  );
  requireRpcData(
    await actor.rpc("start_writing_submission", {
      p_task_slug: "community-green-spaces",
      p_idempotency_key: `visual-writing-offline-${crypto.randomUUID()}`,
    }),
    "restore writing draft for offline visual state",
  );
  const active = requireRpcData(
    await actor.rpc("start_mock_test", {
      p_mock_test_slug: "academic-foundation-mock",
      p_idempotency_key: `visual-mock-active-${crypto.randomUUID()}`,
    }),
    "start active mock visual session",
  ) as { id: string };
  fixtureRoutes["mock-active"] =
    `/mock-tests/academic-foundation-mock/session/${active.id}`;
}

async function overflowFailures(page: Page) {
  return page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth <= viewport + 1) return [];
    return [...document.querySelectorAll<HTMLElement>("body *")]
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          rect.width > 0 &&
          rect.height > 0 &&
          (rect.right > viewport + 1 || rect.left < -1)
        );
      })
      .slice(0, 10)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return `${element.tagName.toLowerCase()}#${element.id}.${[...element.classList].slice(0, 3).join(".")} [${Math.round(rect.left)},${Math.round(rect.right)}]`;
      });
  });
}

function listenForRuntimeIssues(page: Page) {
  const issues: RuntimeIssue[] = [];
  page.on("console", (message) => {
    if (message.type() === "error")
      issues.push({ source: "console", message: message.text() });
  });
  page.on("pageerror", (error) => {
    issues.push({ source: "pageerror", message: error.message });
  });
  return issues;
}

function visualMasks(page: Page, state: (typeof inventory.states)[number]) {
  if (state.id === "settings" || state.id === "profile")
    return [page.getByTestId("account-email")];
  if (state.id === "listening-result")
    return [page.getByTestId("listening-elapsed-time")];
  if (state.id === "listening-exercise")
    return [page.getByTestId("listening-timer")];
  if (state.id === "writing-editor" || state.id === "writing-offline")
    return [page.getByTestId("writing-timer")];
  if (state.id === "login-validation" || state.id === "register-validation")
    return [page.getByTestId("request-id")];
  return [];
}

test("@visual exact 55-state canonical matrix", async ({
  browser,
}, testInfo) => {
  test.setTimeout(30 * 60_000);
  requireEnvironment(testInfo);
  if (requestedStateIds.size === 0) expect(inventory.states).toHaveLength(55);
  else expect(selectedStates).toHaveLength(requestedStateIds.size);
  const fixtureRoutes = parseFixtureRoutes();
  const contexts: BrowserContext[] = [];
  const pages: Record<string, Page> = {};
  const runtimeIssues = new Map<Page, RuntimeIssue[]>();
  const results: ScreenResult[] = [];
  const failures: string[] = [];
  let completedRuntimeFixtures = false;
  let actor: SupabaseClient<Database> | undefined;

  try {
    const publicContext = await browser.newContext();
    contexts.push(publicContext);
    pages.public = await publicContext.newPage();
    for (const key of [
      "completed",
      "fresh",
      "onboarding",
      "review",
      "placementActive",
      "placementComplete",
    ]) {
      const context = await browser.newContext();
      contexts.push(context);
      pages[key] = await createAuthenticatedPage(context, accounts[key]);
    }
    for (const page of Object.values(pages))
      runtimeIssues.set(page, listenForRuntimeIssues(page));

    actor = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const actorLogin = await actor.auth.signInWithPassword({
      email: accounts.completed.email!,
      password: accounts.completed.password!,
    });
    if (actorLogin.error) throw actorLogin.error;

    for (const state of selectedStates) {
      if (state.id === "mock-summary" && !completedRuntimeFixtures) {
        await submitStandaloneSpeaking(pages.completed);
        await completeMockFixture(actor, pages.completed, fixtureRoutes);
        completedRuntimeFixtures = true;
      }
      const route = resolveRoute(state, fixtureRoutes);
      const page = pages[pageKey(state)];
      const stateResult: ScreenResult = { id: state.id, route, viewports: {} };
      for (const width of inventory.requiredViewports) {
        const result = {
          visual: "FAIL",
          overflow: "FAIL",
          axe: "FAIL",
          console: "FAIL",
        };
        stateResult.viewports[String(width)] = result;
        const issues = runtimeIssues.get(page)!;
        issues.length = 0;
        try {
          await page.setViewportSize({ width, height: viewportHeights[width] });
          await prepareDeclaredState(page, state.fixture, route);
          await expect(page.locator(state.ready).first()).toBeVisible({
            timeout: 15_000,
          });
          expect(
            new URL(page.url()).pathname,
            `${state.id} redirected to an unexpected route`,
          ).toBe(
            new URL(
              (state as { expectedRoute?: string }).expectedRoute ?? route,
              "http://inventory.local",
            ).pathname,
          );

          const overflow = await overflowFailures(page);
          expect(
            overflow,
            `${state.id} overflow at ${width}: ${overflow.join("; ")}`,
          ).toEqual([]);
          result.overflow = "PASS";

          const accessibility = await new AxeBuilder({ page }).analyze();
          const blockers = accessibility.violations.filter((violation) =>
            ["critical", "serious"].includes(violation.impact ?? ""),
          );
          expect(
            blockers,
            `${state.id} axe blockers: ${blockers.map((item) => item.id).join(", ")}`,
          ).toEqual([]);
          result.axe = "PASS";

          expect(issues, `${state.id} runtime errors`).toEqual([]);
          result.console = "PASS";

          await expect(page).toHaveScreenshot(
            `inventory-${state.id}-${width}.png`,
            {
              animations: "disabled",
              fullPage: true,
              mask: visualMasks(page, state),
              maskColor: "#d9d4e3",
            },
          );
          result.visual = "PASS";
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          failures.push(`${state.id}@${width}: ${message.slice(0, 3_000)}`);
        } finally {
          if (state.fixture === "writing-offline")
            await page.context().setOffline(false);
        }
      }
      results.push(stateResult);
    }
  } finally {
    const reportPath = testInfo.outputPath("screen-inventory-report.json");
    await writeFile(
      reportPath,
      JSON.stringify(
        {
          expected: selectedStates.length,
          canonicalBrowser: inventory.canonicalBrowser,
          generatedAt: new Date().toISOString(),
          failures,
          states: results,
        },
        null,
        2,
      ),
    );
    await testInfo.attach("screen-inventory-report", {
      path: reportPath,
      contentType: "application/json",
    });
    if (actor) await actor.auth.signOut();
    await Promise.all(contexts.map((context) => context.close()));
  }

  expect(failures, failures.join("\n\n")).toEqual([]);
});
