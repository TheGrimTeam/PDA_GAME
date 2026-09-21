import { test, expect } from '../../fixtures/game.fixture';
import { readStorage } from '../../helpers/state-helper';
import { STORAGE_KEY_NOTES } from '../../helpers/constants';

/**
 * RG-17..RG-24 — инвентарь, крафт, сейф, заметки.
 * Схема: player.safeBox (не safeInventory), player.stats обязателен,
 * карма — player.karma_score, репутация — player.npcRep.
 */
test.describe('Regression: инвентарь', () => {
  test.beforeEach(async ({ game }) => {
    await game.patchPlayer({
      inBase: false,
      zombieTime: 0,
      infectionTime: 0,
      inventory: [],
      safeBox: [],
      scannedCodes: {},
      hp: 50,
      hunger: 50,
      rads: 0,
      karma_score: 10,
      npcRep: {},
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
    game.page.on('dialog', (d) => d.accept());
  });

  test('RG-17: useFood восстанавливает сытость', async ({ game }) => {
    await game.patchPlayer({ inventory: ['food_1'], hunger: 30 });
    await game.switchView('inventory');

    await game.page.evaluate(() => (window as any).useFood(0, 'food_1'));

    const player = await game.playerState();
    expect(player.hunger).toBeGreaterThan(30);
    expect(player.inventory).not.toContain('food_1');
  });

  test('RG-18: useMedkit восстанавливает HP', async ({ game }) => {
    await game.patchPlayer({ inventory: ['med_1'], hp: 40 });
    await game.switchView('inventory');

    await game.page.evaluate(() => (window as any).useMedkit(0, 'med_1'));

    const player = await game.playerState();
    expect(player.hp).toBeGreaterThan(40);
    expect(player.inventory).not.toContain('med_1');
  });

  test('RG-19: quickUseItem применяет предмет по типу', async ({ game }) => {
    await game.patchPlayer({ inventory: ['food_2'], hunger: 20 });
    await game.switchView('inventory');

    await game.page.evaluate(() => (window as any).quickUseItem('food'));

    const player = await game.playerState();
    expect(player.hunger).toBeGreaterThan(20);
  });

  test('RG-20: dropItem удаляет предмет из инвентаря', async ({ game }) => {
    await game.patchPlayer({ inventory: ['junk_1', 'junk_2'] });
    await game.switchView('inventory');

    await game.page.evaluate(() => (window as any).dropItem(0));

    const player = await game.playerState();
    expect(player.inventory.length).toBe(1);
    expect(player.inventory).not.toContain('junk_1');
  });

  test('RG-21: moveToSafe и moveToInv переносят предметы', async ({ game }) => {
    await game.patchPlayer({ inventory: ['junk_3'], safeBox: [] });
    await game.switchView('inventory');

    await game.page.evaluate(() => (window as any).moveToSafe(0));

    let player = await game.playerState();
    expect(player.inventory).not.toContain('junk_3');
    expect(player.safeBox).toContain('junk_3');

    await game.page.evaluate(() => (window as any).moveToInv(0));

    player = await game.playerState();
    expect(player.inventory).toContain('junk_3');
    expect(player.safeBox).not.toContain('junk_3');
  });

  test('RG-22: крафт через applyUpgrade расходует хлам', async ({ game }) => {
    // applyUpgrade требует player.upgradeQuest (список деталей).
    await game.patchPlayer({
      inventory: ['junk_1', 'junk_3'],
      upgradeQuest: ['junk_1', 'junk_3'],
      backpackUpgradesCount: 0,
    });
    await game.switchView('inventory');

    const before = await game.playerState();
    await game.page.evaluate(() => (window as any).applyUpgrade());
    const after = await game.playerState();

    // Детали израсходованы, счётчик улучшений вырос.
    expect(after.inventory.length).toBeLessThan(before.inventory.length);
    expect(after.backpackUpgradesCount).toBeGreaterThan(
      before.backpackUpgradesCount ?? 0,
    );
  });

  test('RG-23: saveSurvivalNotes сохраняет заметки в localStorage', async ({
    game,
  }) => {
    // Блокнот выжившего (#survival-notes) находится во вьюхе сканера.
    await game.switchView('scan');

    const notes = 'Выживание: не пить из лужи';
    await game.page.fill('#survival-notes', notes);
    await game.page.evaluate(() => (window as any).saveSurvivalNotes());

    const stored = await readStorage(game.page, STORAGE_KEY_NOTES);
    expect(stored).toBe(notes);
  });

  test('RG-24: антирад-эффект med_2 снижает радиацию', async ({ game }) => {
    // radCure применяется только при karma_score < 3 (см. useMedkit).
    await game.patchPlayer({ inventory: ['med_2'], rads: 40, karma_score: 0 });
    await game.switchView('inventory');

    await game.page.evaluate(() => (window as any).useMedkit(0, 'med_2'));

    const player = await game.playerState();
    expect(player.rads).toBeLessThan(40);
  });
});
