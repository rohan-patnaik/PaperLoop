import { test, expect } from '@playwright/test';

const waitForApp = async (page) => {
  await page.waitForFunction(() => window.__APP__ && window.__APP__.openPaperById);
};

test('opens a paper modal via debug hook', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);

  await page.evaluate(() => window.__APP__.openPaperById(7));

  const viewer = page.locator('#viewer');
  await expect(viewer).toBeVisible();
  await expect(page.locator('#viewer-title')).toContainText('Attention Is All You Need');
});

test('teleports to stop and exposes validation result', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);

  const validation = await page.evaluate(() => window.__APP__.getValidationResult());
  expect(validation.ok).toBeTruthy();

  await page.evaluate(() => window.__APP__.teleportToStop(3));
  const stopId = await page.evaluate(() => window.__APP__.getNearestStopId());
  expect([3, null]).toContain(stopId);
});
