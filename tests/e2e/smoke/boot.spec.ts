import { test, expect } from '../../fixtures/game.fixture';
import { STORAGE_KEY_PLAYER } from '../../helpers/constants';

/**
 * Smoke-тест загрузки приложения.
 * Проверяет, что собранный index.html корректно инициализируется:
 * глобальные функции доступны, HUD отрисован, состояние персистится.
 */
test.describe('Smoke: загрузка приложения', () => {
  test('приложение загружается и инициализирует состояние', async ({ game, mockedPage }) => {
    // Глобальные точки входа доступны.
    // `player` объявлен через `let`, поэтому читается через eval, а не window.player.
    const globals = await mockedPage.evaluate(() => ({
      switchView: typeof (window as any).switchView,
      handleScan: typeof (window as any).handleScan,
      saveState: typeof (window as any).saveState,
      player: typeof eval('player'),
    }));

    expect(globals.switchView).toBe('function');
    expect(globals.handleScan).toBe('function');
    expect(globals.saveState).toBe('function');
    expect(globals.player).toBe('object');

    // HUD отрисован и содержит числовые значения
    await expect(mockedPage.locator('#hud')).toBeVisible();
    expect(await game.hudValue('hp-val')).toMatch(/^\d+$/);
    expect(await game.hudValue('rad-val')).toMatch(/^\d+$/);

    // Игрок создан с базовыми полями
    const player = await game.playerState();
    expect(player).toBeTruthy();
    expect(typeof player.callsign).toBe('string');
    expect(player.callsign.length).toBeGreaterThan(0);
    expect(player.hp).toBeGreaterThan(0);

    // Состояние персистится в localStorage
    const stored = await mockedPage.evaluate(
      (key) => localStorage.getItem(key),
      STORAGE_KEY_PLAYER,
    );
    expect(stored).not.toBeNull();
  });

  test('стартовый экран — База (inBase по умолчанию)', async ({ game }) => {
    await game.expectViewActive('base');
    await expect(game.page.locator('#view-base')).toContainText('ГРИМ-СЕТЬ: БАЗА');
  });
});
