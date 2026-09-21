import { test as base, BrowserContext, Page } from '@playwright/test';
import { applyDefaultMocks } from '../helpers/mocks';

type TwoPlayers = {
  ctxA: BrowserContext;
  ctxB: BrowserContext;
  pageA: Page;
  pageB: Page;
};

/**
 * Фикстура двух изолированных browser context для интеграционных
 * сценариев P2P (обмен QR между двумя «устройствами»).
 */
export const test = base.extend<TwoPlayers>({
  ctxA: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    await use(ctx);
    await ctx.close();
  },
  ctxB: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    await use(ctx);
    await ctx.close();
  },
  pageA: async ({ ctxA }, use) => {
    const page = await ctxA.newPage();
    await applyDefaultMocks(page);
    await use(page);
  },
  pageB: async ({ ctxB }, use) => {
    const page = await ctxB.newPage();
    await applyDefaultMocks(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
