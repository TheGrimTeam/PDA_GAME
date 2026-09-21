import { test, expect } from '../../fixtures/game.fixture';

/**
 * Smoke-тесты SM-02, SM-04, SM-05, SM-08.
 * Проверяют BIOS-загрузку, старт игры с позывным, HUD и возврат на Базу.
 */
test.describe('Smoke: загрузка и старт', () => {
  test('SM-02: BIOS-boot проигрывается и завершается появлением #screen', async ({
    mockedPage,
  }) => {
    await mockedPage.goto('/index.html');

    // BIOS-экран присутствует в разметке и исчезает после инициализации.
    await expect(mockedPage.locator('#screen')).toBeVisible({ timeout: 15_000 });
    await expect(mockedPage.locator('#bios-boot')).toBeHidden();
  });

  test('SM-04: ввод позывного и старт игры из Базы', async ({ game, mockedPage }) => {
    await game.expectViewActive('base');

    // Поле позывного на экране Базы.
    const input = mockedPage.locator('#base-callsign-input');
    await expect(input).toBeVisible();
    await input.fill('ТЕСТ-СТАЛКЕР');

    await mockedPage.evaluate(() => (window as any).saveBaseCallsign());
    await mockedPage.evaluate(() => (window as any).startGameFromBase());

    const player = await game.playerState();
    expect(player.callsign).toBe('ТЕСТ-СТАЛКЕР');
    expect(player.inBase).toBe(false);
  });

  test('SM-05: HUD отображает HP, голод, радиацию и кредиты', async ({ game }) => {
    await expect(game.page.locator('#hud')).toBeVisible();

    for (const id of ['hp-val', 'hunger-val', 'rad-val', 'score-val']) {
      const value = await game.hudValue(id);
      expect(value, `HUD #${id} должен содержать число`).toMatch(/-?\d+/);
    }
  });

  test('SM-08: возврат на Базу через returnToBase()', async ({ game }) => {
    await game.patchPlayer({ inBase: false });
    await game.switchView('scan');

    await game.page.evaluate(() => (window as any).returnToBase());

    await game.expectViewActive('base');
    const player = await game.playerState();
    expect(player.inBase).toBe(true);
  });
});
