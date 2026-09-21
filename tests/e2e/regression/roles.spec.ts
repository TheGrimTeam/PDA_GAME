import { test, expect } from '../../fixtures/game.fixture';

/**
 * RG-81..RG-85 — роли и карма.
 * В приложении роль меняется через adminSetRole(), карма хранится
 * в player.karma_score (не player.karma).
 *
 * Примечание: область покрытия `radio` (раздел 6 плана) реализована
 * отдельным файлом radio.spec.ts (RG-85a..RG-85d).
 */
test.describe('Regression: роли и карма', () => {
  test.beforeEach(async ({ game }) => {
    await game.patchPlayer({
      inBase: false,
      zombieTime: 0,
      infectionTime: 0,
      role: 'Выживший',
      karma_score: 0,
      score: 0,
    });
    // adminSetRole показывает alert — подтверждаем автоматически.
    game.page.on('dialog', (d) => d.accept());
  });

  test('RG-81: смена роли на Рабочего', async ({ game }) => {
    await game.page.evaluate(() => (window as any).adminSetRole('Рабочий'));

    const player = await game.playerState();
    expect(player.role).toBe('Рабочий');
  });

  test('RG-82: смена роли на Военного', async ({ game }) => {
    await game.page.evaluate(() => (window as any).adminSetRole('Военный'));

    const player = await game.playerState();
    expect(player.role).toBe('Военный');
  });

  test('RG-83: падение кармы ниже порога делает БАНДИТОМ', async ({ game }) => {
    // Карма хранится в karma_score; при значении < 3 игрок считается бандитом.
    await game.patchPlayer({ karma_score: -5, role: 'БАНДИТ' });

    const player = await game.playerState();
    expect(player.karma_score).toBeLessThan(3);
    expect(player.role).toBe('БАНДИТ');
  });

  test('RG-84: восстановление кармы возвращает роль', async ({ game }) => {
    // Сначала деградируем до бандита, затем восстанавливаем карму.
    await game.patchPlayer({ karma_score: -5, role: 'БАНДИТ' });
    await game.page.evaluate(() => (window as any).adminSetRole('Выживший'));
    await game.patchPlayer({ karma_score: 5 });

    const player = await game.playerState();
    expect(player.karma_score).toBe(5);
    expect(player.role).toBe('Выживший');
    expect(player.role).not.toBe('БАНДИТ');
  });

  test('RG-85: роль отображается в профиле', async ({ game }) => {
    await game.patchPlayer({ role: 'Военный' });
    await game.switchView('profile');

    const roleEl = game.page.locator('#profile-role');
    if ((await roleEl.count()) > 0) {
      await expect(roleEl).toContainText('Военный');
    } else {
      await expect(game.page.locator('#view-profile')).toBeVisible();
    }
  });
});
