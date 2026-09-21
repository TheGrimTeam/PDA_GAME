import { test, expect } from '../../fixtures/game.fixture';
import { scanDirect, scanViaManualInput } from '../../helpers/scan-helper';
import { MAX_BACKPACK_SIZE } from '../../helpers/constants';

/**
 * RG-01..RG-10 — сканирование предметов.
 * Проверяет добавление в инвентарь, кулдауны, переполнение и ручной ввод.
 */
test.describe('Regression: сканирование предметов', () => {
  test.beforeEach(async ({ game }) => {
    // Игрок в Зоне, не зомби, инвентарь пуст.
    await game.patchPlayer({
      inBase: false,
      zombieTime: 0,
      infectionTime: 0,
      inventory: [],
      scannedCodes: {},
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

  test('RG-01: сканирование предмета добавляет его в инвентарь', async ({
    game,
  }) => {
    // В ITEMS_DB нет префикса item_*: предметы делятся на food/gear/med/wpn/junk.
    await scanDirect(game.page, 'gear_1');

    const player = await game.playerState();
    expect(player.inventory.length).toBe(1);
    expect(player.inventory[0]).toBe('gear_1');
  });

  test('RG-02: сканирование еды food_*', async ({ game }) => {
    await scanDirect(game.page, 'food_1');

    const player = await game.playerState();
    expect(player.inventory).toContain('food_1');
  });

  test('RG-03: сканирование медикаментов med_*', async ({ game }) => {
    await scanDirect(game.page, 'med_1');

    const player = await game.playerState();
    expect(player.inventory).toContain('med_1');
  });

  test('RG-04: сканирование оружия wpn_*', async ({ game }) => {
    await scanDirect(game.page, 'wpn_1');

    const player = await game.playerState();
    expect(player.inventory).toContain('wpn_1');
  });

  test('RG-05: сканирование хлама junk_*', async ({ game }) => {
    await scanDirect(game.page, 'junk_1');

    const player = await game.playerState();
    expect(player.inventory).toContain('junk_1');
  });

  test('RG-06: сканирование снаряжения gear_*', async ({ game }) => {
    await scanDirect(game.page, 'gear_1');

    const player = await game.playerState();
    expect(player.inventory).toContain('gear_1');
  });

  test('RG-07: кулдаун повторного сканирования того же кода', async ({ game }) => {
    await scanDirect(game.page, 'gear_2');
    const afterFirst = await game.playerState();
    expect(afterFirst.inventory).toContain('gear_2');

    // Повторное сканирование того же кода сразу — предмет не дублируется.
    await scanDirect(game.page, 'gear_2');
    const afterSecond = await game.playerState();
    const count = afterSecond.inventory.filter((i: string) => i === 'gear_2').length;
    expect(count).toBe(1);
  });

  test('RG-08: отказ при переполнении рюкзака', async ({ game }) => {
    const full = Array.from({ length: MAX_BACKPACK_SIZE }, (_, i) => `junk_${i + 1}`);
    await game.patchPlayer({ inventory: full });

    await scanDirect(game.page, 'item_5');

    const player = await game.playerState();
    expect(player.inventory.length).toBe(MAX_BACKPACK_SIZE);
    expect(player.inventory).not.toContain('item_5');
  });

  test('RG-09: нераспознанный код → сообщение об ошибке', async ({ game }) => {
    await game.switchView('scan');
    await scanDirect(game.page, 'totally_unknown_code_xyz');

    const result = game.page.locator('#scan-result');
    await expect(result).toBeVisible();
    await expect(result).toContainText(/не распознан|ОШИБКА/i);

    const player = await game.playerState();
    expect(player.inventory).not.toContain('totally_unknown_code_xyz');
  });

  test('RG-10: ручной ввод кода через #manual-code', async ({ game }) => {
    await scanViaManualInput(game.page, 'gear_3');

    const player = await game.playerState();
    expect(player.inventory).toContain('gear_3');
  });
});
