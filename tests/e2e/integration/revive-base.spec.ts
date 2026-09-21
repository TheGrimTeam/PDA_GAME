import { test, expect } from '../../fixtures/two-players.fixture';
import { GamePage } from '../../helpers/game-page';

/**
 * IN-29..IN-32 — возрождение в базе после смерти.
 *
 * Реальный протокол (src/js/logic/scan.js, handleDeadScan):
 *  - сканирование `npc_base` разрешено, если игрок не БАНДИТ (или есть пропуск);
 *  - возрождение: rads=0, hp=getEffectiveMaxHp(), hunger=MAX_HUNGER,
 *    inventory=[], infectionTime=0, zombieTime=0, isCurrentlyDead=false.
 */
test.describe('Integration: возрождение в базе', () => {
  test.beforeEach(async ({ pageA, pageB }) => {
    pageA.on('dialog', (d) => d.accept());
    pageB.on('dialog', (d) => d.accept());
    const a = new GamePage(pageA);
    const b = new GamePage(pageB);
    await a.goto();
    await b.goto();
    await a.patchPlayer({
      inBase: false,
      zombieTime: 0,
      infectionTime: 0,
      hp: 0,
      rads: 0,
      inventory: [],
      score: 0,
      karma_score: 0,
      role: 'Выживший',
      equipment: '',
      callsign: 'DEADMAN',
    });
    await b.patchPlayer({ inBase: false, zombieTime: 0, infectionTime: 0, hp: 100, inventory: [], score: 0 });
  });

  test('IN-29: мёртвый игрок видит экран смерти', async ({ pageA }) => {
    await pageA.evaluate(() => {
      const p = eval('player');
      p.hp = 0;
      (window as any).checkDeathState();
    });

    await expect(pageA.locator('#view-dead')).toBeVisible();
  });

  test('IN-30: возрождение через QR базы восстанавливает HP', async ({ pageA }) => {
    await pageA.evaluate(() => {
      const p = eval('player');
      p.hp = 0;
      (window as any).checkDeathState();
    });

    await pageA.evaluate(() => (window as any).handleDeadScan('npc_base'));

    const playerA = await new GamePage(pageA).playerState();
    expect(playerA.hp).toBeGreaterThan(0);
    expect(playerA.isCurrentlyDead).toBe(false);
  });

  test('IN-31: возрождение сбрасывает радиацию и голод', async ({ pageA }) => {
    await pageA.evaluate(() => {
      const p = eval('player');
      p.hp = 0;
      p.rads = 80;
      p.hunger = 10;
      (window as any).checkDeathState();
    });

    await pageA.evaluate(() => (window as any).handleDeadScan('npc_base'));

    const playerA = await new GamePage(pageA).playerState();
    expect(playerA.rads).toBe(0);
    expect(playerA.hunger).toBe(100);
  });

  test('IN-32: возрождение сбрасывает инвентарь', async ({ pageA }) => {
    await pageA.evaluate(() => {
      const p = eval('player');
      p.inventory = ['junk_1', 'junk_2'];
      p.hp = 0;
      (window as any).checkDeathState();
    });

    await pageA.evaluate(() => (window as any).handleDeadScan('npc_base'));

    const playerA = await new GamePage(pageA).playerState();
    expect(playerA.inventory).toEqual([]);
  });
});
