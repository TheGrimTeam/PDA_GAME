import { test, expect } from '../../fixtures/game.fixture';

/**
 * UX-01..UX-08 — удобство интерфейса: закреплённое меню, шапка, рюкзак, карта, квесты.
 */
test.describe('Regression: интерфейс', () => {
  test.beforeEach(async ({ game }) => {
    await game.patchPlayer({ inBase: false, inventory: [], safeBox: [] });
    await game.page.evaluate(() => (window as any).switchView('scan'));
  });

  test('UX-01: нижнее меню вне прокручиваемой области и видно на длинном экране', async ({ game }) => {
    const inside = await game.page.evaluate(() => !!document.querySelector('#screen-content #nav-buttons'));
    expect(inside).toBe(false);
    await game.patchPlayer({ inventory: Array(12).fill('junk_1') });
    await game.page.evaluate(() => (window as any).switchView('inventory'));
    await expect(game.page.locator('#nav-buttons')).toBeInViewport();
  });

  test('UX-02: кнопки быстрого доступа показывают запас, пустые приглушены', async ({ game }) => {
    await game.patchPlayer({ inventory: ['med_1', 'med_1', 'food_1'] });
    await game.page.evaluate(() => (window as any).updateHUD());
    await expect(game.page.locator('#quick-hp-n')).toHaveText('2');
    await expect(game.page.locator('#quick-food-n')).toHaveText('1');
    await expect(game.page.locator('#quick-rad')).toHaveClass(/pb-empty/);
    await expect(game.page.locator('#quick-hp')).not.toHaveClass(/pb-empty/);
  });

  test('UX-03: опасные показатели подсвечиваются', async ({ game }) => {
    await game.patchPlayer({ hunger: 10, rads: 35 });
    await game.page.evaluate(() => (window as any).updateHUD());
    await expect(game.page.locator('#hud-food-box')).toHaveClass(/pb-alert/);
    await expect(game.page.locator('#hud-rad-box')).toHaveClass(/pb-alert/);
    await expect(game.page.locator('#hud-hp-box')).not.toHaveClass(/pb-alert/);
  });

  test('UX-04: рюкзак сгруппирован, сюжетные предметы помечены', async ({ game }) => {
    await game.patchPlayer({ inventory: ['junk_1', 'energy_1', 'med_1'] });
    await game.page.evaluate(() => (window as any).switchView('inventory'));
    const titles = game.page.locator('.inv-group-title');
    await expect(titles).toHaveCount(3);
    await expect(titles.nth(0)).toContainText('СЮЖЕТ');
    await expect(titles.nth(1)).toContainText('МЕДИЦИНА');
    await expect(titles.nth(2)).toContainText('ХЛАМ');
    await expect(game.page.locator('.inv-story .inv-tag')).toHaveText('СЮЖЕТ');
    await expect(game.page.locator('#inventory-list')).toContainText('ПРИМЕНИТЬ');
    await expect(game.page.locator('#inventory-list')).not.toContainText('ЮЗАТЬ');
  });

  test('UX-05: выкинуть сюжетный предмет можно только после подтверждения', async ({ game }) => {
    await game.patchPlayer({ inventory: ['energy_1'] });
    await game.page.evaluate(() => { (window as any).confirm = () => false; (window as any).dropItem(0); });
    expect((await game.playerState()).inventory).toEqual(['energy_1']);
    await game.page.evaluate(() => { (window as any).confirm = () => true; (window as any).dropItem(0); });
    expect((await game.playerState()).inventory).toEqual([]);
  });

  test('UX-06: карта в секторах А1–Д5, цель сюжета подсвечена в Д2', async ({ game }) => {
    await game.page.evaluate(() => (window as any).switchView('map'));
    await expect(game.page.locator('.map-cell')).toHaveCount(25);
    await expect(game.page.locator('#map-cell-Д2')).not.toHaveClass(/map-cell-target/);
    await game.patchPlayer({ story: { stage: 4, q1: {}, q2: [], announced: {}, coordsKnown: true, synthStartedAt: 0, extendedStock: false } });
    await game.page.evaluate(() => (window as any).switchView('map'));
    await expect(game.page.locator('#map-cell-Д2')).toHaveClass(/map-cell-target/);
    await expect(game.page.locator('#map-target-hint')).toContainText('Д2');
    await expect(game.page.locator('#view-map')).not.toContainText('ВКТЮЧИТЬ');
  });

  test('UX-07: предыстория квеста свёрнута под «История задания»', async ({ game }) => {
    await game.page.evaluate(() => (window as any).switchView('quests'));
    const lore = game.page.locator('#quests-container details.quest-lore').first();
    await expect(lore).toBeAttached();
    expect(await lore.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(false);
  });

  test('UX-08: экран торговца без выбранного NPC подсказывает, что делать', async ({ game }) => {
    await game.page.evaluate(() => (window as any).switchView('trade'));
    await expect(game.page.locator('#trade-buy-list')).toContainText('Отсканируйте QR-код торговца');
  });
});
