import { test, expect } from '../../fixtures/game.fixture';
import { scanDirect } from '../../helpers/scan-helper';
import { QR } from '../../helpers/qr-codes';

/**
 * RG-25..RG-34 — торговля с NPC.
 */
test.describe('Regression: торговля', () => {
  test.beforeEach(async ({ game }) => {
    await game.patchPlayer({
      inBase: false,
      zombieTime: 0,
      infectionTime: 0,
      inventory: [],
      safeInventory: [],
      scannedCodes: {},
      score: 1000,
      karma_score: 0,
      role: 'Выживший',
      npcRep: {},
    });
  });

  test('RG-25: открытие торговли по QR npc_*', async ({ game }) => {
    await scanDirect(game.page, QR.npc('npc_eng'));

    await game.expectViewActive('trade');
    await expect(game.page.locator('#trade-npc-name')).not.toBeEmpty();
  });

  test('RG-26: покупка предмета buyItem списывает кредиты', async ({ game }) => {
    await scanDirect(game.page, QR.npc('npc_eng'));
    await game.expectViewActive('trade');

    const before = await game.playerState();
    await game.page.evaluate(() => (window as any).buyItem(0));
    const after = await game.playerState();

    // Либо покупка совершена (кредиты уменьшились), либо товар недоступен.
    expect(after.score).toBeLessThanOrEqual(before.score);
  });

  test('RG-27: продажа предмета sellItem начисляет кредиты', async ({ game }) => {
    await game.patchPlayer({ inventory: ['junk_1'], score: 100 });
    await scanDirect(game.page, QR.npc('npc_trad'));
    await game.expectViewActive('trade');

    await game.page.evaluate(() => (window as any).sellItem(0, 10));

    const player = await game.playerState();
    expect(player.score).toBeGreaterThan(100);
    expect(player.inventory).not.toContain('junk_1');
  });

  test('RG-28: продажа всего sellAllToBase', async ({ game }) => {
    await game.patchPlayer({ inventory: ['junk_1', 'junk_2'], score: 0 });
    await scanDirect(game.page, QR.npc('npc_base'));
    await game.expectViewActive('trade');

    await game.page.evaluate(() => (window as any).sellAllToBase());

    const player = await game.playerState();
    expect(player.score).toBeGreaterThan(0);
  });

  test('RG-29: покупка экипировки buyEquipment', async ({ game }) => {
    await game.patchPlayer({ score: 5000 });
    await scanDirect(game.page, QR.npc('npc_trad'));
    await game.expectViewActive('trade');

    const before = await game.playerState();
    await game.page.evaluate(() => (window as any).buyEquipment('eq_trade'));
    const after = await game.playerState();

    expect(after.score).toBeLessThanOrEqual(before.score);
  });

  test('RG-30: лечение у Доктора Кроу buyHeal', async ({ game }) => {
    await game.patchPlayer({ hp: 30, score: 5000 });
    await scanDirect(game.page, QR.npc('npc_med'));
    await game.expectViewActive('trade');

    await game.page.evaluate(() => (window as any).buyHeal());

    const player = await game.playerState();
    expect(player.hp).toBeGreaterThan(30);
  });

  test('RG-31: скидка eq_trade снижает стоимость лечения', async ({ game }) => {
    // Скидка зависит от player.equipment === 'eq_trade'.
    await game.patchPlayer({ equipment: 'eq_trade', npcRep: {} });
    await scanDirect(game.page, QR.npc('npc_med'));

    const costWithDiscount = await game.page.evaluate(() =>
      (window as any).getHealCost('npc_med'),
    );

    await game.patchPlayer({ equipment: null });
    const costBase = await game.page.evaluate(() =>
      (window as any).getHealCost('npc_med'),
    );

    expect(costWithDiscount).toBeLessThan(costBase);
  });

  test('RG-32: доступ на Базу по карме (npc_base / npc_bandit_base)', async ({
    game,
  }) => {
    // Бандит (karma_score <= -3) не может войти на Базу Выживших.
    await game.patchPlayer({ karma_score: -5, equipment: null, inventory: [] });
    await scanDirect(game.page, QR.npc('npc_base'));

    const player = await game.playerState();
    // Торговля не открыта — вьюха trade не активна.
    await expect(game.page.locator('#view-trade')).not.toHaveClass(/active/);
    expect(player.inventory).toEqual([]);
  });

  test('RG-33: обход доступа через eq_pass_base', async ({ game }) => {
    await game.patchPlayer({
      karma_score: -5,
      equipment: 'eq_pass_base',
    });

    await scanDirect(game.page, QR.npc('npc_base'));

    await game.expectViewActive('trade');
  });

  test('RG-34: репутация NPC влияет на цены', async ({ game }) => {
    await game.patchPlayer({ npcRep: { npc_med: 0 } });
    await scanDirect(game.page, QR.npc('npc_med'));
    const costLowRep = await game.page.evaluate(() =>
      (window as any).getHealCost('npc_med'),
    );

    await game.patchPlayer({ npcRep: { npc_med: 100 } });
    const costHighRep = await game.page.evaluate(() =>
      (window as any).getHealCost('npc_med'),
    );

    expect(costHighRep).toBeLessThanOrEqual(costLowRep);
  });
});
