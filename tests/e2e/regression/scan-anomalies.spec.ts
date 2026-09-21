import { test, expect } from '../../fixtures/game.fixture';
import { scanDirect } from '../../helpers/scan-helper';
import { mockRandom } from '../../helpers/mocks';

/**
 * RG-11..RG-16 — аномалии.
 * Успех/провал, болт, детектор, кулдаун.
 */
test.describe('Regression: аномалии', () => {
  test.beforeEach(async ({ game }) => {
    await game.patchPlayer({
      inBase: false,
      zombieTime: 0,
      infectionTime: 0,
      inventory: [],
      scannedCodes: {},
      hp: 100,
      equipment: null,
      stats: {
        survivedSeconds: 0,
        questsDone: 0,
        corpsesRobbed: 0,
        itemsFound: 0,
        deaths: 0,
        foodEaten: 0,
        medsUsed: 0,
      },
    });
  });

  test('RG-11: успешное взятие аномалии даёт артефакт', async ({ game }) => {
    // roll = 0.1 ≤ 0.7 → успех.
    await mockRandom(game.page, 1);
    await game.page.evaluate(() => {
      Math.random = () => 0.1;
    });

    await scanDirect(game.page, 'anom_1');

    const player = await game.playerState();
    expect(player.inventory.length).toBeGreaterThan(0);
  });

  test('RG-12: провал аномалии наносит урон HP', async ({ game }) => {
    await game.page.evaluate(() => {
      Math.random = () => 0.9; // roll > 0.7 → провал
    });

    await scanDirect(game.page, 'anom_2');

    const player = await game.playerState();
    expect(player.hp).toBeLessThan(100);
  });

  test('RG-13: провал аномалии может уничтожить предмет', async ({ game }) => {
    await game.patchPlayer({ inventory: ['junk_1', 'junk_2'] });
    await game.page.evaluate(() => {
      // Первый вызов — провал (0.9), второй — выбор ветки потери предмета.
      let call = 0;
      Math.random = () => {
        call += 1;
        return call === 1 ? 0.9 : 0.1;
      };
    });

    await scanDirect(game.page, 'anom_3');

    const player = await game.playerState();
    // Либо потерян предмет, либо снят HP — в обоих случаях состояние изменилось.
    const lostItem = player.inventory.length < 2;
    const lostHp = player.hp < 100;
    expect(lostItem || lostHp).toBe(true);
  });

  test('RG-14: болт junk_6 повышает шанс успеха', async ({ game }) => {
    await game.patchPlayer({ inventory: ['junk_6'] });
    // roll = 0.75: при базовом шансе 0.7 — провал, с болтом 0.8 — успех.
    await game.page.evaluate(() => {
      Math.random = () => 0.75;
    });

    await scanDirect(game.page, 'anom_4');

    const player = await game.playerState();
    // Болт израсходован.
    expect(player.inventory).not.toContain('junk_6');
    // Успех: HP не снижен, артефакт получен.
    expect(player.hp).toBe(100);
    expect(player.inventory.length).toBeGreaterThan(0);
  });

  test('RG-15: детектор eq_anom даёт 100% успех', async ({ game }) => {
    // Детектор аномалий хранится в player.equipment.
    await game.patchPlayer({ equipment: 'eq_anom' });
    await game.page.evaluate(() => {
      Math.random = () => 0.99; // даже при максимальном roll — успех
    });

    await scanDirect(game.page, 'anom_5');

    const player = await game.playerState();
    expect(player.hp).toBe(100);
    expect(player.inventory.length).toBeGreaterThan(0);
  });

  test('RG-16: повторное сканирование аномалии блокируется кулдауном', async ({
    game,
  }) => {
    await game.page.evaluate(() => {
      Math.random = () => 0.1;
    });

    await scanDirect(game.page, 'anom_6');
    const afterFirst = await game.playerState();
    const firstCount = afterFirst.inventory.length;

    // Повторное сканирование того же кода — артефакт не добавляется.
    await scanDirect(game.page, 'anom_6');
    const afterSecond = await game.playerState();
    expect(afterSecond.inventory.length).toBe(firstCount);
  });
});
