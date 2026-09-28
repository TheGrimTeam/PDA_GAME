import { test, expect } from '../../fixtures/game.fixture';
import { scanDirect } from '../../helpers/scan-helper';
import { wordsWin } from '../../helpers/hack-helper';

/**
 * RG-123..RG-132 — опыт, уровни и перки (config/perks.js, logic/perks.js).
 */
test.describe('Regression: опыт и перки', () => {
  test.beforeEach(async ({ game }) => {
    await game.patchPlayer({
      inBase: false, zombieTime: 0, infectionTime: 0, hp: 100, hunger: 100, rads: 0,
      karma_score: 0, inventory: [], scannedCodes: {}, score: 0, equipment: null,
      xp: 0, level: 1, perkPoints: 0, perks: {}, fractions: {}, weapons: {},
    });
  });
  const state = (game: any) => game.playerState();
  const call = (game: any, fn: string, ...args: any[]) =>
    game.page.evaluate(({ fn, args }: { fn: string; args: any[] }) => (window as any)[fn](...args), { fn, args });

  test('RG-123: уровень растёт по таблице опыта, даёт очко перка и +5 HP', async ({ game }) => {
    const hp1 = await call(game, 'getMaxHp');
    await call(game, 'gainXp', 99);
    expect((await state(game)).level).toBe(1);
    await call(game, 'gainXp', 1);
    let p = await state(game);
    expect(p.level).toBe(2);
    expect(p.perkPoints).toBe(1);
    expect(await call(game, 'getMaxHp')).toBe(hp1 + 5);
    await call(game, 'gainXp', 900); // всего 1000 → 5 уровень
    p = await state(game);
    expect(p.level).toBe(5);
    expect(p.perkPoints).toBe(4);
  });

  test('RG-124: опыт капает каждую минуту в Зоне, в том числе во сне', async ({ game }) => {
    await game.page.evaluate(() => {
      const ago = Date.now() - 10 * 60_000 - 1000;
      eval('player').lastZoneTick = ago;
      localStorage.setItem('pda_heartbeat', String(ago));
      (window as any).zoneCatchUp(false);
    });
    expect((await state(game)).xp).toBe(10);
  });

  test('RG-125: опыт за действия — предмет, артефакт, вскрытие схрона', async ({ game }) => {
    await scanDirect(game.page, 'junk_1');
    expect((await state(game)).xp).toBe(2);
    await game.page.evaluate(() => { Math.random = () => 0.1; });
    await scanDirect(game.page, 'anom_1');
    expect((await state(game)).xp).toBe(17);
    await scanDirect(game.page, 'safe_1');
    await wordsWin(game.page);
    expect((await state(game)).xp).toBe(57);
  });

  test('RG-126: перк нельзя взять без очков и раньше нужного уровня', async ({ game }) => {
    expect(await call(game, 'takePerk', 'toughness')).toBe(false);          // нет очков
    await game.patchPlayer({ perkPoints: 1, level: 2, xp: 100 });
    expect(await call(game, 'takePerk', 'regen')).toBe(false);              // нужен 8 ур.
    expect(await call(game, 'takePerk', 'toughness')).toBe(true);
    const p = await state(game);
    expect(p.perks.toughness).toBe(1);
    expect(p.perkPoints).toBe(0);
  });

  test('RG-127: «Живучий» +20 HP за ранг, не больше максимального ранга', async ({ game }) => {
    await game.patchPlayer({ perkPoints: 5, level: 12, xp: 6600 });
    const base = await call(game, 'getMaxHp');
    for (let i = 0; i < 3; i++) expect(await call(game, 'takePerk', 'toughness')).toBe(true);
    expect(await call(game, 'takePerk', 'toughness')).toBe(false);
    expect(await call(game, 'getMaxHp')).toBe(base + 60);
  });

  test('RG-128: «Взломщик» даёт лишнюю попытку во взломе', async ({ game }) => {
    await game.patchPlayer({ perks: { hacker: 2 } });
    await scanDirect(game.page, 'usb_1');
    expect(await game.page.evaluate(() => eval('hackAttemptsLeft'))).toBe(6);
  });

  test('RG-129: «Торгаш» — продажа дороже', async ({ game }) => {
    await game.patchPlayer({ inventory: ['med_1'] });
    const val = await game.page.evaluate(() => eval('ITEMS_DB').med_1.val);
    await game.page.evaluate(() => (window as any).openTrade('npc_med'));
    await expect(game.page.locator('#trade-sell-list')).toContainText(`Даст: ${Math.floor(val * 1.5)}`);
    await game.patchPlayer({ perks: { barter: 2 } });
    await game.page.evaluate(() => (window as any).renderTradeView());
    await expect(game.page.locator('#trade-sell-list')).toContainText(`Даст: ${Math.round(val * 18) / 10 | 0}`); // ×1.5 × 1.2 = ×1.8
  });

  test('RG-130: «Лужёный желудок» и «Антирадиант» замедляют голод и радиацию', async ({ game }) => {
    await game.patchPlayer({ perks: { leadBelly: 2, radResist: 2 } });
    await game.page.evaluate(() => {
      const ago = Date.now() - 10 * 60_000 - 1000;
      eval('player').lastZoneTick = ago;
      localStorage.setItem('pda_heartbeat', String(ago));
      (window as any).zoneCatchUp(false);
    });
    const p = await state(game);
    expect(p.hunger).toBe(100 - 21); // 3 × 0.7 = 2.1 в минуту
    expect(p.rads).toBe(14);         // 2 × 0.7 = 1.4 в минуту
  });

  test('RG-131: карточка перков в профиле — кнопка ВЗЯТЬ работает', async ({ game }) => {
    await game.patchPlayer({ perkPoints: 1, level: 3, xp: 300 });
    await game.switchView('profile');
    await expect(game.page.locator('#perks-content')).toContainText('УРОВЕНЬ 3');
    await game.page.locator('.perk-row', { hasText: 'Крепкий хребет' }).locator('.perk-btn-go').click();
    expect((await state(game)).perks.strongBack).toBe(1);
    await expect(game.page.locator('.perk-row', { hasText: 'Крепкий хребет' })).toContainText('■□');
  });

  test('RG-132: полоса опыта в шапке', async ({ game }) => {
    await game.patchPlayer({ xp: 150, level: 2, perkPoints: 1 });
    await game.page.evaluate(() => (window as any).updateHUD());
    await expect(game.page.locator('#xp-level')).toHaveText('2');
    await expect(game.page.locator('#xp-text')).toHaveText('50/200 XP');
    await expect(game.page.locator('#xp-points')).toBeVisible();
  });
});
