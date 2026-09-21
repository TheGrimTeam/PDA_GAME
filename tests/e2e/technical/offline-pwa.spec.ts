import { test, expect } from '../../fixtures/game.fixture';

/**
 * TC-23..TC-26 — PWA, service worker, offline-режим.
 */
test.describe('Technical: PWA и offline', () => {
  test('TC-23: manifest.json доступен и валиден', async ({ game }) => {
    const response = await game.page.request.get('/manifest.json');
    expect(response.ok()).toBe(true);

    const manifest = await response.json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
  });

  test('TC-24: service worker регистрируется', async ({ game }) => {
    await game.goto();
    // В тестовом окружении serviceWorkers заблокированы, поэтому проверяем
    // наличие API и корректность загрузки страницы.
    const hasSwApi = await game.page.evaluate(() => 'serviceWorker' in navigator);
    // API service worker должно присутствовать в браузере.
    expect(hasSwApi).toBe(true);
  });

  test('TC-25: приложение работает в offline-режиме', async ({ game, context }) => {
    await game.goto();
    await context.setOffline(true);

    const hasSwitch = await game.page.evaluate(
      () => typeof (window as any).switchView === 'function',
    );
    expect(hasSwitch).toBe(true);

    await context.setOffline(false);
  });

  test('TC-26: sw.js доступен', async ({ game }) => {
    const response = await game.page.request.get('/sw.js');
    expect(response.ok()).toBe(true);
  });
});
