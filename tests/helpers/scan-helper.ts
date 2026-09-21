import { Page } from '@playwright/test';

/**
 * Ввод кода через поле ручного ввода на экране сканера.
 * Блок `#admin-manual-scan-box` по умолчанию скрыт (display:none),
 * поэтому принудительно показываем его перед вводом.
 */
export async function scanViaManualInput(page: Page, code: string): Promise<void> {
  await page.evaluate(() => {
    (window as any).switchView('scan');
    const box = document.getElementById('admin-manual-scan-box');
    if (box) box.style.display = 'block';
  });
  await page.fill('#manual-code', code);
  await page.evaluate(() => (window as any).submitManualCode());
}

/** Прямой вызов диспетчера (быстрее, для регрессионных тестов). */
export async function scanDirect(page: Page, code: string): Promise<void> {
  await page.evaluate((c) => (window as any).handleScan(c), code);
}
