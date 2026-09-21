import { Page } from '@playwright/test';

/** Ввод кода через поле ручного ввода на экране сканера. */
export async function scanViaManualInput(page: Page, code: string): Promise<void> {
  await page.evaluate(() => (window as any).switchView('scan'));
  await page.fill('#manual-code', code);
  await page.evaluate(() => (window as any).submitManualCode());
}

/** Прямой вызов диспетчера (быстрее, для регрессионных тестов). */
export async function scanDirect(page: Page, code: string): Promise<void> {
  await page.evaluate((c) => (window as any).handleScan(c), code);
}
