import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

import type { Database } from "../../src/types/database";

test.describe.configure({ mode: "serial" });

const userAEmail = process.env.E2E_PRACTICE_USER_A_EMAIL;
const userAPassword = process.env.E2E_PRACTICE_USER_A_PASSWORD;
const userBEmail = process.env.E2E_PRACTICE_USER_B_EMAIL;
const userBPassword = process.env.E2E_PRACTICE_USER_B_PASSWORD;
const expectedProjectRef = process.env.E2E_EXPECTED_SUPABASE_PROJECT_REF;
const activeProjectRef = process.env.E2E_ACTIVE_SUPABASE_PROJECT_REF;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function requireEnvironment(testInfo: TestInfo) {
  test.skip(
    testInfo.project.name !== "chromium-desktop",
    "INTENTIONAL: persisted microphone mutation runs once on desktop.",
  );
  test.skip(
    !userAEmail ||
      !userAPassword ||
      !userBEmail ||
      !userBPassword ||
      !supabaseUrl ||
      !anonKey,
    "AUTH_ENV: two dedicated completed-onboarding accounts are required.",
  );
  test.skip(
    !expectedProjectRef || expectedProjectRef !== activeProjectRef,
    "AUTH_ENV: expected Supabase project ref must match the active environment.",
  );
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/(dashboard|onboarding)$/);
  test.skip(
    new URL(page.url()).pathname === "/onboarding",
    "AUTH_ENV: dedicated account has not completed onboarding.",
  );
}

test("Speaking private recording, verified submit, progress and owner isolation", async ({
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  requireEnvironment(testInfo);
  const contextA = await browser.newContext({ permissions: ["microphone"] });
  const pageA = await contextA.newPage();
  await login(pageA, userAEmail!, userAPassword!);

  await pageA.goto("/practice/speaking");
  await expect(
    pageA.getByRole("heading", { name: "Everyday choices" }),
  ).toBeVisible();
  await expect(pageA.getByText("Neighbourhood ideas")).toHaveCount(0);
  await pageA.goto("/practice/speaking/neighbourhood-ideas-draft");
  await expect(
    pageA.getByRole("heading", { name: "Không tìm thấy trang" }),
  ).toBeVisible();

  await pageA.goto("/practice/speaking/everyday-choices");
  const start = pageA.getByRole("button", { name: "Bắt đầu ghi âm" });
  const runner = pageA.getByText(/required responses/);
  await expect(start.or(runner)).toBeVisible();
  if (await start.isVisible()) await start.click();
  await expect(runner).toBeVisible();
  await pageA.reload();
  await expect(runner).toBeVisible();

  for (let index = 0; index < 4; index += 1) {
    await pageA.getByRole("button", { name: "Start recording" }).click();
    await pageA.waitForTimeout(1400);
    await pageA.getByRole("button", { name: "Stop recording" }).click();
    await expect(
      pageA.getByRole("button", { name: "Upload & verify" }),
    ).toBeEnabled();
    await pageA.getByRole("button", { name: "Upload & verify" }).click();
    await expect(
      pageA.getByText("Audio đã được PostgreSQL xác nhận."),
    ).toBeVisible({
      timeout: 20_000,
    });
    await expect(pageA.getByText("Audio verified")).toBeVisible();
    if (index < 3) {
      await pageA.getByRole("button", { name: "Next prompt" }).click();
    }
  }

  await pageA.getByRole("button", { name: "Finish Speaking" }).click();
  await pageA
    .getByRole("button", { name: "Xác nhận nộp bài", exact: true })
    .click();
  await expect(pageA).toHaveURL(
    /\/practice\/speaking\/everyday-choices\/attempt\//,
  );
  await expect(
    pageA.getByRole("heading", {
      name: "Transcript and AI feedback are optional",
    }),
  ).toBeVisible();
  const reviewPath = new URL(pageA.url()).pathname;

  await pageA.goto("/progress");
  await expect(
    pageA.getByRole("heading", { name: "Recent Activity" }),
  ).toBeVisible();
  await expect(
    pageA.getByRole("link", { name: "Everyday choices" }).first(),
  ).toBeVisible();

  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await login(pageB, userBEmail!, userBPassword!);
  await pageB.goto(reviewPath);
  await expect(
    pageB.getByRole("heading", { name: "Không tìm thấy trang" }),
  ).toBeVisible();

  const clientA = createClient<Database>(supabaseUrl!, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const clientB = createClient<Database>(supabaseUrl!, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const [sessionA, sessionB] = await Promise.all([
    clientA.auth.signInWithPassword({
      email: userAEmail!,
      password: userAPassword!,
    }),
    clientB.auth.signInWithPassword({
      email: userBEmail!,
      password: userBPassword!,
    }),
  ]);
  expect(sessionA.error).toBeNull();
  expect(sessionB.error).toBeNull();

  const assetA = await clientA
    .from("speaking_audio_assets")
    .select("id, storage_path")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  expect(assetA.error).toBeNull();
  expect(assetA.data?.storage_path).toBeTruthy();
  const storagePath = assetA.data!.storage_path;

  const metadataB = await clientB
    .from("speaking_audio_assets")
    .select("id")
    .eq("id", assetA.data!.id);
  expect(metadataB.error).toBeNull();
  expect(metadataB.data).toEqual([]);

  const bucketA = clientA.storage.from("speaking-recordings");
  const bucketB = clientB.storage.from("speaking-recordings");
  const [downloadB, signedUrlB, replaceB] = await Promise.all([
    bucketB.download(storagePath),
    bucketB.createSignedUrl(storagePath, 60),
    bucketB.upload(storagePath, new Blob(["not-user-a-audio"]), {
      contentType: "audio/webm",
      upsert: true,
    }),
  ]);
  expect(downloadB.error).not.toBeNull();
  expect(signedUrlB.error).not.toBeNull();
  expect(replaceB.error).not.toBeNull();

  // Storage DELETE may intentionally return an empty success when RLS hides
  // the object. Verify the invariant from the owner session after the request.
  await bucketB.remove([storagePath]);
  const [downloadA, signedUrlA] = await Promise.all([
    bucketA.download(storagePath),
    bucketA.createSignedUrl(storagePath, 60),
  ]);
  expect(downloadA.error).toBeNull();
  expect(downloadA.data?.size).toBeGreaterThan(0);
  expect(signedUrlA.error).toBeNull();
  expect(signedUrlA.data?.signedUrl).toBeTruthy();

  const publicObjectUrl = bucketA.getPublicUrl(storagePath).data.publicUrl;
  const publicResponse = await fetch(publicObjectUrl);
  expect(publicResponse.ok).toBe(false);

  await Promise.all([clientA.auth.signOut(), clientB.auth.signOut()]);
  await contextB.close();
  await contextA.close();
});

test("Speaking routes are responsive, keyboard reachable and axe-clean", async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  requireEnvironment(testInfo);
  await login(page, userAEmail!, userAPassword!);
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/practice/speaking",
      "/practice/speaking/everyday-choices",
      "/progress",
    ]) {
      await page.goto(path);
      await expect(page.locator("#main-content")).toBeVisible();
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth,
        ),
        `${path} at ${width}px`,
      ).toBe(false);
    }
  }
  await page.goto("/practice/speaking");
  const firstLink = page
    .getByRole("link", { name: "Open Everyday choices" })
    .first();
  await firstLink.focus();
  await expect(firstLink).toBeFocused();
  const accessibility = await new AxeBuilder({ page })
    .include("#main-content")
    .analyze();
  expect(accessibility.violations).toEqual([]);
});
