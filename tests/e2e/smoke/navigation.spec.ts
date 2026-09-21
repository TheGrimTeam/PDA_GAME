import { test, expect } from '../../fixtures/game.fixture';
import { VIEWS } from '../../helpers/constants';

/**
 * Smoke-тест навигации: переключение между всеми вьюхами SPA
 * через глобальную функцию switchView().
 */
test.describe('Smoke: навигация', () => {
  test('все вьюхи переключаются и становятся активными', async ({ game }) => {
    for (const view of VIEWS) {
      await game.switchView(view);
      await game.expectViewActive(view);
    }
  });

  test('кнопки навигации переключают вьюхи', async ({ game }) => {
    // Выходим из Базы в Зону, чтобы отобразилась панель навигации.
    // `player` — let-переменная, поэтому меняем её через patchPlayer (eval).
    await game.patchPlayer({ inBase: false });
    await game.switchView('scan');

    await expect(game.page.locator('#nav-buttons')).toBeVisible();
    await game.page.click('#btn-nav-inventory');
    await game.expectViewActive('inventory');

    await game.page.click('#btn-nav-profile');
    await game.expectViewActive('profile');
  });
});
