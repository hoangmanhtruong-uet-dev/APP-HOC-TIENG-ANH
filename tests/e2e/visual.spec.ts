import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium-desktop",
    "OPTIONAL_VISUAL_DUPLICATE: visual baselines are captured once in the canonical Chromium project.",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
});

const visualViewports = [
  { name: "mobile-360", width: 360, height: 800 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1280", width: 1280, height: 900 },
] as const;

const publicScreens = [
  ["home", "/", "Học đúng bài, tiến bộ rõ mỗi ngày"],
  ["login", "/login", "Đăng nhập"],
  ["register", "/register", "Tạo tài khoản"],
  ["forgot-password", "/forgot-password", "Khôi phục mật khẩu"],
  ["privacy", "/privacy", "Chính sách quyền riêng tư"],
  ["terms", "/terms", "Điều khoản sử dụng"],
] as const;

async function stabilize(page: Page) {
  await page.addStyleTag({
    content:
      "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}",
  });
  await page.locator("img").evaluateAll(async (elements) => {
    const images = elements as HTMLImageElement[];
    for (const image of images) image.loading = "eager";
    await Promise.all(
      images.map(async (image) => {
        await image.decode();
        if (image.naturalWidth === 0) {
          throw new Error(
            `Image failed to load: ${image.currentSrc || image.src}`,
          );
        }
      }),
    );
  });
}

for (const viewport of visualViewports) {
  for (const [name, route, heading] of publicScreens) {
    test(`@visual ${name} at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(route, { waitUntil: "networkidle" });
      await stabilize(page);
      await expect(
        page.getByRole("heading", { name: heading }).first(),
      ).toBeVisible();
      await expect(page).toHaveScreenshot(`${name}-${viewport.name}.png`, {
        animations: "disabled",
        fullPage: true,
        timeout: 15_000,
      });
    });
  }
}

test("@visual login validation error", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill("invalid-email");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Hãy kiểm tra lại các trường" }),
  ).toBeVisible();
  await stabilize(page);
  await expect(page).toHaveScreenshot("login-validation-mobile-390.png", {
    animations: "disabled",
    fullPage: true,
    mask: [page.getByText(/^Mã yêu cầu:/)],
  });
});

test("@visual register validation error", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/register", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Tạo tài khoản" }).click();
  await expect(page.getByRole("alert").first()).toBeVisible();
  await stabilize(page);
  await expect(page).toHaveScreenshot("register-validation-mobile-390.png", {
    animations: "disabled",
    fullPage: true,
    mask: [page.getByText(/^Mã yêu cầu:/)],
  });
});
