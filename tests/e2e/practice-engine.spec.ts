import { test, expect } from '@playwright/test';

test.describe('Practice Engine', () => {
  test('User can answer questions and submit attempt', async ({ page }) => {
    // Placeholder for actual test
    expect(true).toBe(true);

    // Start attempt
    // await page.goto('/practice/exercise-1');

    // Answer Multiple Choice
    await page.locator('input[type="radio"][value="A. True"]').check();

    // Check Autosave Indicator
    await expect(page.locator('text=Đã lưu nháp')).toBeVisible();

    // Go to next question
    await page.locator('text=Câu tiếp').click();

    // Submit
    await page.locator('text=Nộp bài').click();
    await page.locator('text=Nộp bài ngay').click();

    // Assert navigation to results
    // await expect(page).toHaveURL(/\/practice\/result\/.*/);
  });
});
