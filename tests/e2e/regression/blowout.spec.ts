import { test, expect } from '../../fixtures/game.fixture';
import { scanDirect } from '../../helpers/scan-helper';
import { QR } from '../../helpers/qr-codes';

/**
 * RG-71..RG-74 — пси-выброс.
 */
test.describe('Regression: пси-выброс', () => {
  test.beforeEach(async ({ game }) => {
    await game.patchPlayer({
      inBase: false,
      zombieTime: 0,
      infectionTime: 0,
      inventory: [],
      hp: 100,
      rads: 0,
      score: 0,
      role: 'Выживший',
    });
  });

  test('RG-71: запуск выброса triggerTestBlowout', async ({ game }) => {
    await game.page.evaluate(() => (window as any).triggerTestBlowout());

    const status = game.page.locator('#blowout-status-text');
    await expect(status).toBeVisible();
  });

  test('RG-72: укрытие по QR базы во время выброса', async ({ game }) => {
    await game.page.evaluate(() => (window as any).triggerTestBlowout());
    await game.page.evaluate(() => (window as any).triggerBlowoutSequence());

    await scanDirect(game.page, QR.npc('npc_base'));

    const player = await game.playerState();
    // Успешное укрытие на базе выживших даёт премию +200 кредитов.
    expect(player.score).toBe(200);
  });

  test('RG-73: урон без укрытия resolveBlowout', async ({ game }) => {
    await game.patchPlayer({ hp: 100, rads: 0 });
    await game.page.evaluate(() => (window as any).triggerTestBlowout());
    await game.page.evaluate(() => (window as any).resolveBlowout());

    const player = await game.playerState();
    // Без укрытия HP падает до 30% (30), радиация растёт на 35.
    expect(player.hp).toBe(30);
    expect(player.rads).toBe(35);
  });

  test('RG-74: баннер предупреждения о выбросе', async ({ game }) => {
    await game.page.evaluate(() => (window as any).triggerTestBlowout());

    // Статус выброса обновляется, баннер предупреждения присутствует в DOM.
    const status = game.page.locator('#blowout-status-text');
    await expect(status).toBeVisible();
    await expect(status).not.toBeEmpty();
    const banner = game.page.locator('#blowout-warning-banner');
    await expect(banner).toBeAttached();
  });
});
