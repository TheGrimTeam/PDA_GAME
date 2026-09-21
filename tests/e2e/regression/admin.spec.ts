import { test, expect } from '../../fixtures/game.fixture';

/**
 * RG-86..RG-89 — админ-панель.
 *
 * Реальный API (src/js/logic/admin.js, src/js/logic/roles.js):
 *   adminLogin()        — prompt логин/пароль, ставит player.isAdmin = true
 *   adminLogout()       — снимает player.isAdmin
 *   adminSetRole(role)  — устанавливает player.role
 *   adminQuickAddCredits(val) — начисляет кредиты из #admin-credit-amount
 *   returnToBase()      — player.inBase = true
 *   factoryReset()      — prompt позывного ×2, очищает localStorage и reload()
 */
test.describe('Regression: админ-панель', () => {
  test.beforeEach(async ({ game }) => {
    await game.patchPlayer({
      inBase: false,
      zombieTime: 0,
      infectionTime: 0,
      hp: 100,
      rads: 0,
      score: 0,
      hunger: 100,
      isAdmin: false,
    });
  });

  test('RG-87: adminLogin с верными данными выдаёт права администратора', async ({ game }) => {
    // prompt вызывается дважды: логин, затем пароль.
    await game.page.evaluate(() => {
      const answers = ['админ', 'Прайс админ'];
      (window as any).prompt = () => answers.shift() ?? null;
      (window as any).adminLogin();
    });

    const player = await game.playerState();
    expect(player.isAdmin).toBe(true);
  });

  test('RG-88: adminLogin с неверным паролем не выдаёт права', async ({ game }) => {
    await game.page.evaluate(() => {
      const answers = ['админ', 'неверный'];
      (window as any).prompt = () => answers.shift() ?? null;
      (window as any).adminLogin();
    });

    const player = await game.playerState();
    expect(player.isAdmin).toBe(false);
  });

  test('RG-89: adminSetRole устанавливает роль игрока', async ({ game }) => {
    await game.page.evaluate(() => (window as any).adminSetRole('Военный'));

    const player = await game.playerState();
    expect(player.role).toBe('Военный');
  });

  test('RG-86: adminModifyCredits начисляет кредиты', async ({ game }) => {
    // adminQuickAddCredits(val) лишь подставляет сумму в #admin-credit-amount.
    // Начисление выполняет adminModifyCredits(true), читающий значение из инпута.
    await game.page.evaluate(() => {
      (window as any).adminQuickAddCredits(250);
      (window as any).adminModifyCredits(true);
    });

    const player = await game.playerState();
    expect(player.score).toBe(250);
  });

  test('RG-90: returnToBase телепортирует игрока в базу', async ({ game }) => {
    await game.page.evaluate(() => (window as any).returnToBase());

    const player = await game.playerState();
    expect(player.inBase).toBe(true);
  });

  test('RG-91: factoryReset с неверным позывным не сбрасывает игру', async ({ game }) => {
    const callsign = (await game.playerState()).callsign;
    await game.page.evaluate((cs) => {
      // Первый prompt — неверный позывной.
      (window as any).prompt = () => 'WRONG_CALLSIGN';
      (window as any).factoryReset();
      // Проверяем, что данные игрока на месте (reload не произошёл).
      return cs;
    }, callsign);

    const player = await game.playerState();
    expect(player.callsign).toBe(callsign);
  });
});
