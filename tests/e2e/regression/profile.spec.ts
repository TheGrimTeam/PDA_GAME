import { test, expect } from '../../fixtures/game.fixture';

/**
 * RG-90..RG-93 — профиль игрока.
 */
test.describe('Regression: профиль', () => {
  test.beforeEach(async ({ game }) => {
    await game.patchPlayer({
      inBase: false,
      zombieTime: 0,
      infectionTime: 0,
      hp: 80,
      rads: 10,
      score: 123,
      role: 'Выживший',
      inventory: [],
    });
    await game.switchView('profile');
  });

  test('RG-90: профиль отображает HP и радиацию', async ({ game }) => {
    await game.expectViewActive('profile');
    await expect(game.page.locator('#view-profile')).toBeVisible();
  });

  test('RG-91: сохранение заметок выживания', async ({ game }) => {
    // Блокнот выжившего (#survival-notes) находится во вьюхе сканера.
    await game.switchView('scan');
    const notes = game.page.locator('#survival-notes');
    await expect(notes).toBeVisible();

    await notes.fill('Тестовые заметки');
    await game.page.evaluate(() => (window as any).saveSurvivalNotes());

    const stored = await game.page.evaluate(() =>
      localStorage.getItem('wasteland_notes'),
    );
    expect(stored).toContain('Тестовые заметки');
  });

  test('RG-92: factoryReset с неверным позывным не сбрасывает прогресс', async ({ game }) => {
    game.page.on('dialog', (d) => d.accept());
    const before = await game.playerState();
    // Первый prompt — неверный позывной → сброс не выполняется.
    await game.page.evaluate(() => {
      (window as any).prompt = () => 'НЕВЕРНЫЙ_ПОЗЫВНОЙ';
      (window as any).factoryReset();
    });

    const after = await game.playerState();
    expect(after.callsign).toBe(before.callsign);
    expect(after.score).toBe(before.score);
  });

  test('RG-93: профиль показывает статистику', async ({ game }) => {
    await expect(game.page.locator('#view-profile')).toBeVisible();
    // Реальные элементы личного дела (src/html/views/profile.html):
    // позывной, статус, очки кармы и роль.
    await expect(game.page.locator('#prof-callsign')).toBeAttached();
    await expect(game.page.locator('#prof-karma')).toBeAttached();
    await expect(game.page.locator('#prof-karma-score')).toBeAttached();
    await expect(game.page.locator('#prof-role')).toBeAttached();
  });
});
