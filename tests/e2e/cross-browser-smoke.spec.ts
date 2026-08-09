import { expect, test, type Page, type TestInfo } from "@playwright/test";

const email = process.env.E2E_USER_A_EMAIL;
const password = process.env.E2E_USER_A_PASSWORD;

function requireAuthenticatedEnvironment(testInfo: TestInfo) {
  test.skip(
    testInfo.project.name === "chromium-mobile",
    "Cross-browser smoke uses desktop engines; mobile coverage belongs to the 55-state matrix.",
  );
  test.skip(
    !email || !password,
    "AUTH_ENV: deterministic completed learner credentials are required.",
  );
  test.skip(
    !process.env.E2E_EXPECTED_SUPABASE_PROJECT_REF ||
      process.env.E2E_EXPECTED_SUPABASE_PROJECT_REF !==
        process.env.E2E_ACTIVE_SUPABASE_PROJECT_REF,
    "AUTH_ENV: expected staging project ref must match the active project.",
  );
}

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email!);
  await page.locator('input[type="password"]').fill(password!);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("critical authenticated routes render without fatal runtime errors", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  requireAuthenticatedEnvironment(testInfo);
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  await login(page);

  for (const route of [
    "/dashboard",
    "/practice/academic-vocabulary-foundations",
    "/practice/writing/community-green-spaces",
    "/practice/speaking/everyday-choices",
    "/mock-tests",
    "/settings",
  ]) {
    errors.length = 0;
    await page.goto(route, { waitUntil: "networkidle" });
    await expect(page.locator("main").first()).toBeVisible();
    await expect(page).not.toHaveURL(/\/(login|error)$/);
    expect(errors, `${testInfo.project.name} ${route}`).toEqual([]);
  }
});
