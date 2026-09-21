import { test, expect } from '../../fixtures/game.fixture';
import { scanDirect } from '../../helpers/scan-helper';

/**
 * RG-58..RG-70 — события, циклы выживания, инфекция и зомби.
 *
 * ВАЖНО: игровые циклы (startEventLoop/startHeartbeatLoop/startInfectionLoop)
 * создаются через setInterval при загрузке страницы. Чтобы page.clock управлял
 * ими, часы устанавливаются ДО навигации, а затем страница перезагружается
 * (reload) — только тогда setInterval регистрируется на фейковых таймерах.
 */
test.describe('Regression: события и циклы', () => {
  test.beforeEach(async ({ game }) => {
    await game.patchPlayer({
      inBase: false,
      zombieTime: 0,
      infectionTime: 0,
      inventory: [],
      hunger: 100,
      rads: 0,
      hp: 100,
      karma_score: 0,
      role: 'Выживший',
      shelterLevel: 0,
      weapons: {},
    });
  });

  /** Установить фейковые часы и перезагрузить страницу, чтобы циклы попали под них. */
  async function installClockAndReload(game: any): Promise<void> {
    await game.page.clock.install();
    await game.page.reload();
    await game.page.waitForFunction(
      () => typeof (window as any).switchView === 'function',
    );
  }

  test('RG-58: голод снижается каждые 60 сек', async ({ game }) => {
    await installClockAndReload(game);
    await game.patchPlayer({ hunger: 100, inBase: false, hp: 100 });
    await game.page.clock.runFor(61_000);

    const player = await game.playerState();
    expect(player.hunger).toBeLessThan(100);
  });

  test('RG-59: радиация накапливается при карме < 3', async ({ game }) => {
    await installClockAndReload(game);
    await game.patchPlayer({ karma_score: 0, rads: 0, inBase: false, hp: 100 });
    await game.page.clock.runFor(61_000);

    const player = await game.playerState();
    expect(player.rads).toBeGreaterThan(0);
  });

  test('RG-60: смерть от голода снижает HP', async ({ game }) => {
    await installClockAndReload(game);
    await game.patchPlayer({ hunger: 0, hp: 100, inBase: false });
    await game.page.clock.runFor(61_000);

    const player = await game.playerState();
    expect(player.hp).toBeLessThan(100);
  });

  test('RG-61: износ активного оружия', async ({ game }) => {
    await installClockAndReload(game);
    await game.patchPlayer({
      inventory: ['wpn_1'],
      weapons: { wpn_1: { durability: 100, active: true } },
      inBase: false,
      hp: 100,
    });
    await game.page.clock.runFor(61_000);

    const player = await game.playerState();
    expect(player.weapons?.wpn_1?.durability ?? 100).toBeLessThan(100);
  });

  test('RG-62: случайное событие при высоком roll', async ({ game }) => {
    await installClockAndReload(game);
    await game.page.evaluate(() => {
      Math.random = () => 0.05; // 5% < 10% → событие срабатывает
    });
    await game.patchPlayer({ inBase: false, hp: 100, rads: 0, karma_score: 0 });
    await game.page.clock.runFor(61_000);

    // Событие «радиационная буря» накапливает радиацию.
    const player = await game.playerState();
    expect(player.rads).toBeGreaterThan(0);
  });

  test('RG-63: иммунитет eq_storm к бурям и спорам', async ({ game }) => {
    await installClockAndReload(game);
    await game.page.evaluate(() => {
      Math.random = () => 0.05;
    });
    await game.patchPlayer({
      equipment: 'eq_storm',
      inBase: false,
      hp: 100,
      rads: 0,
      karma_score: 0,
    });
    await game.page.clock.runFor(61_000);

    const player = await game.playerState();
    // Иммунитет: радиация от события не накапливается сверх базовой.
    expect(player.rads).toBeLessThanOrEqual(10);
  });

  test('RG-64: жалование Рабочего начисляется', async ({ game }) => {
    await installClockAndReload(game);
    await game.patchPlayer({ role: 'Рабочий', score: 0, inBase: false, hp: 100 });
    // Жалование начисляется в heartbeat-цикле (каждые 5 сек, порог 60 сек).
    await game.page.clock.runFor(65_000);

    const player = await game.playerState();
    expect(player.score).toBeGreaterThan(0);
  });

  test('RG-65: жалование Военного начисляется', async ({ game }) => {
    await installClockAndReload(game);
    await game.patchPlayer({ role: 'Военный', score: 0, inBase: false, hp: 100 });
    await game.page.clock.runFor(65_000);

    const player = await game.playerState();
    expect(player.score).toBeGreaterThan(0);
  });

  test('RG-66: регенерация убежища 5 уровня', async ({ game }) => {
    await installClockAndReload(game);
    await game.patchPlayer({ shelterLevel: 5, hp: 50, inBase: false });
    await game.page.clock.runFor(65_000);

    const player = await game.playerState();
    expect(player.hp).toBeGreaterThan(50);
  });

  test('RG-67: инфекция превращает в зомби через 5 мин', async ({ game }) => {
    await installClockAndReload(game);
    await game.patchPlayer({
      infectionTime: Date.now(),
      zombieTime: 0,
      inBase: false,
      hp: 100,
    });
    await game.page.clock.runFor(5 * 60 * 1000 + 2000);

    const player = await game.playerState();
    expect(player.zombieTime).toBeGreaterThan(0);
  });

  test('RG-68: зомби не может подбирать предметы', async ({ game }) => {
    await game.patchPlayer({ zombieTime: Date.now(), inventory: [] });

    await scanDirect(game.page, 'item_10');

    const player = await game.playerState();
    expect(player.inventory).not.toContain('item_10');
  });

  test('RG-69: вирус выгорает через 10 мин', async ({ game }) => {
    await installClockAndReload(game);
    await game.patchPlayer({
      zombieTime: Date.now(),
      infectionTime: 0,
      inBase: false,
      hp: 100,
    });
    await game.page.clock.runFor(10 * 60 * 1000 + 2000);

    const player = await game.playerState();
    expect(player.zombieTime).toBe(0);
  });

  test('RG-70: зомби не может открывать сейф (safe_)', async ({ game }) => {
    await game.patchPlayer({ zombieTime: Date.now(), safeBox: [] });

    await scanDirect(game.page, 'safe_test-1');

    // Зомби заблокирован: сейф не должен быть открыт/добавлен в инвентарь.
    const player = await game.playerState();
    expect(player.safeBox).toEqual([]);
    expect(player.inventory).not.toContain('safe_test-1');
  });
});
