import { test, expect } from '../../fixtures/game.fixture';

/**
 * RG-40..RG-42 — убежище.
 */
test.describe('Regression: убежище', () => {
  test.beforeEach(async ({ game }) => {
    await game.patchPlayer({
      inBase: false,
      zombieTime: 0,
      infectionTime: 0,
      inventory: [],
      shelterLevel: 0,
      score: 0,
    });
  });

  test('RG-40: рендер убежища renderShelter', async ({ game }) => {
    await game.switchView('shelter');

    await expect(game.page.locator('#shelter-level-title')).toBeVisible();
    await expect(game.page.locator('#shelter-bonus-desc')).toBeVisible();
  });

  test('RG-41: улучшение убежища upgradeShelter при наличии ресурсов', async ({
    game,
  }) => {
    // upgradeShelter() списывает ПРЕДМЕТЫ из инвентаря (SHELTER_UPGRADES[1].req:
    // junk_3 ×2, junk_5 ×1, gear_5 ×1), а не кредиты.
    await game.patchPlayer({
      shelterLevel: 0,
      inventory: ['junk_3', 'junk_3', 'junk_5', 'gear_5'],
    });
    await game.switchView('shelter');

    await game.page.evaluate(() => (window as any).upgradeShelter());

    const player = await game.playerState();
    // Уровень убежища повышается ровно на 1, требуемые ресурсы списываются.
    expect(player.shelterLevel).toBe(1);
    expect(player.inventory).not.toContain('junk_3');
    expect(player.inventory).not.toContain('junk_5');
    expect(player.inventory).not.toContain('gear_5');
  });

  test('RG-42: бонусы уровней отображаются в описании', async ({ game }) => {
    await game.patchPlayer({ shelterLevel: 3 });
    await game.switchView('shelter');

    const desc = game.page.locator('#shelter-bonus-desc');
    await expect(desc).toBeVisible();
    await expect(desc).not.toBeEmpty();

    const title = await game.page.locator('#shelter-level-title').innerText();
    expect(title).toMatch(/\d/);
  });
});
