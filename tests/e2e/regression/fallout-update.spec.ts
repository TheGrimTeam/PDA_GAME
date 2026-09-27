import { test, expect } from '../../fixtures/game.fixture';

/**
 * RG-87..RG-91 — инфекция после возрождения, покупка подсумка, крышки, шкала радиации.
 */
test.describe('Regression: инфекция, подсумок, крышки', () => {
  test.beforeEach(async ({ game }) => {
    await game.patchPlayer({
      inBase: false,
      zombieTime: 0,
      infectionTime: 0,
      inventory: [],
      safeBox: [],
      safeBoxUnlocked: false,
      hp: 100,
      rads: 0,
      score: 0,
      karma_score: 0,
      equipment: null,
    });
  });

  test('RG-87: возрождение на Базе не лечит инфекцию', async ({ game }) => {
    const infectedAt = Date.now() - 60_000;
    await game.page.evaluate((t) => {
      const p = eval('player');
      p.hp = 0;
      p.infectionTime = t;
      (window as any).checkDeathState();
      (window as any).handleDeadScan('npc_base');
    }, infectedAt);
    const player = await game.playerState();
    expect(player.hp).toBeGreaterThan(0);
    expect(player.infectionTime).toBe(infectedAt); // таймер продолжает идти
  });

  test('RG-88: инфекцию лечит только медикамент', async ({ game }) => {
    await game.patchPlayer({ infectionTime: Date.now(), inventory: ['med_1'] });
    await game.page.evaluate(() => (window as any).useMedkit(0, 'med_1', false));
    const player = await game.playerState();
    expect(player.infectionTime).toBe(0);
  });

  test('RG-89: защищённый подсумок покупается за 1000 крышек', async ({ game }) => {
    await game.patchPlayer({ score: 999 });
    await game.page.evaluate(() => (window as any).buySafeBox());
    let player = await game.playerState();
    expect(player.safeBoxUnlocked).toBe(false);

    await game.patchPlayer({ score: 1500 });
    await game.page.evaluate(() => (window as any).buySafeBox());
    player = await game.playerState();
    expect(player.safeBoxUnlocked).toBe(true);
    expect(player.score).toBe(500);
  });

  test('RG-90: валюта — крышки', async ({ game }) => {
    await game.patchPlayer({ score: 1250 });
    await game.page.evaluate(() => (window as any).updateHUD());
    await expect(game.page.locator('#hud')).toContainText('КРЫШКИ');
    await expect(game.page.locator('#hud')).toContainText('1250 ¢');
    await expect(game.page.locator('#hud')).not.toContainText('КРЕДИТЫ');
  });

  test('RG-91: шкала радиации заполняется пропорционально потолку', async ({ game }) => {
    await game.patchPlayer({ rads: 10 });
    await game.page.evaluate(() => (window as any).updateHUD());
    const width = await game.page.locator('#rad-fill').evaluate((el) => (el as HTMLElement).style.width);
    expect(width).toBe('25%');
    await expect(game.page.locator('#rad-max-val')).toHaveText('/40');
  });
});
