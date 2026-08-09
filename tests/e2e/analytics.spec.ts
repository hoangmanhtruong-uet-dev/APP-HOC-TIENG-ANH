import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

const email = process.env.E2E_LEARNING_EMAIL;
const password = process.env.E2E_LEARNING_PASSWORD;
const expectedProjectRef = process.env.E2E_EXPECTED_SUPABASE_PROJECT_REF;
const activeProjectRef = process.env.E2E_ACTIVE_SUPABASE_PROJECT_REF;

function requireAnalyticsEnvironment(testInfo: TestInfo) {
  test.skip(
    testInfo.project.name !== "chromium-desktop",
    "INTENTIONAL: authenticated analytics verification runs once on desktop.",
  );
  test.skip(
    !email || !password,
    "AUTH_ENV: a dedicated completed-onboarding analytics account was not provided.",
  );
  test.skip(
    !expectedProjectRef || expectedProjectRef !== activeProjectRef,
    "AUTH_ENV: expected Supabase project ref must match the active environment.",
  );
}

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/(dashboard|onboarding)$/);
  test.skip(
    new URL(page.url()).pathname === "/onboarding",
    "AUTH_ENV: dedicated account has not completed onboarding.",
  );
}

test("dashboard and progress render persisted analytics without a band trend", async ({
  page,
}, testInfo) => {
  requireAnalyticsEnvironment(testInfo);
  await login(page);

  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Continue Learning" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Today’s Learning Plan" }),
  ).toBeVisible();
  await expect(page.getByText(/band trend|band dự đoán/i)).toHaveCount(0);

  await page.goto("/progress");
  await expect(
    page.getByRole("heading", { name: "Skill Breakdown" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Recent Activity" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Focus Next" })).toBeVisible();
  await expect(page.getByText(/band trend|band dự đoán/i)).toHaveCount(0);
});

test("analytics pages are responsive, keyboard reachable and accessible", async ({
  page,
}, testInfo) => {
  requireAnalyticsEnvironment(testInfo);
  await login(page);

  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/progress");
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      ),
      `/progress at ${width}px`,
    ).toBe(false);
  }

  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/progress");
  const settingsLink = page.getByRole("link", { name: "Open settings" });
  await settingsLink.focus();
  await expect(settingsLink).toBeFocused();
  const accessibility = await new AxeBuilder({ page })
    .include("#main-content")
    .analyze();
  expect(accessibility.violations).toEqual([]);
});
