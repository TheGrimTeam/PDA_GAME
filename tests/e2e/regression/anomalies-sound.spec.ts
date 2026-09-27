import { test, expect } from '../../fixtures/game.fixture';
import { scanDirect } from '../../helpers/scan-helper';

/**
 * RG-82..RG-85 — повторная попытка в аномалиях, звуки, возрождение.
 */
test.describe('Regression: аномалии, звук, возрождение', () => {
  test.beforeEach(async ({ game }) => {
    await game.patchPlayer({
      inBase: false,
      zombieTime: 0,
      infectionTime: 0,
      inventory: [],
      scannedCodes: {},
      score: 0,
      hp: 100,
      karma_score: 0,
      equipment: null,
    });
  });

  test('RG-82: неудача в аномалии не разряжает её — можно пробовать снова', async ({ game }) => {
    await game.page.evaluate(() => { Math.random = () => 0.9; }); // провал
    await scanDirect(game.page, 'anom_1');
    let player = await game.playerState();
    expect(player.scannedCodes['anom_1']).toBeUndefined();

    await game.page.evaluate(() => { Math.random = () => 0.1; }); // успех
    await scanDirect(game.page, 'anom_1');
    player = await game.playerState();
    expect(player.inventory.some((id: string) => id.startsWith('art_'))).toBe(true);
    expect(player.scannedCodes['anom_1']).toBeGreaterThan(0);
  });

  test('RG-83: нет места в рюкзаке — аномалия не разряжается', async ({ game }) => {
    // Забиваем рюкзак под завязку тяжёлыми предметами
    await game.page.evaluate(() => {
      const p = eval('player');
      const db = eval('ITEMS_DB');
      const heavy = Object.keys(db).filter((k) => db[k].cat === 'weapon');
      p.inventory = [];
      let size = 0;
      for (const id of heavy) {
        if (size + db[id].size > p.maxSize) continue;
        p.inventory.push(id); size += db[id].size;
      }
      while (size < p.maxSize) { p.inventory.push('junk_1'); size += db['junk_1'].size; }
      Math.random = () => 0.1;
    });
    await scanDirect(game.page, 'anom_2');
    const player = await game.playerState();
    expect(player.scannedCodes['anom_2']).toBeUndefined();
    await expect(game.page.locator('#scan-result')).toContainText('можно попробовать');
  });

  test('RG-84: все звуковые сигналы воспроизводятся без ошибок', async ({ game }) => {
    const errors = await game.page.evaluate(() => {
      const sounds = eval('SOUNDS');
      const failed: string[] = [];
      for (const k of Object.keys(sounds)) {
        try { sounds[k](); } catch (e) { failed.push(k + ': ' + e); }
      }
      return { failed, count: Object.keys(sounds).length };
    });
    expect(errors.failed).toEqual([]);
    expect(errors.count).toBeGreaterThanOrEqual(14);
  });

  test('RG-85: возрождение не ломает принятие контрактов', async ({ game }) => {
    await game.page.evaluate(() => {
      const p = eval('player');
      p.hp = 0;
      (window as any).checkDeathState();
      (window as any).handleDeadScan('npc_base');
    });
    await game.switchView('quests');
    await game.page.evaluate(() => (window as any).acceptQuest(0));
    const player = await game.playerState();
    expect(player.quests.active).toHaveLength(1);
  });
});
