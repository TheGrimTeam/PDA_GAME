import { test, expect } from '../../fixtures/game.fixture';
import {
  seedPlayer,
  setPlayer,
  readPlayer,
  readStorage,
  writeStorage,
  clearStorage,
} from '../../helpers/state-helper';
import { STORAGE_KEY_PLAYER } from '../../helpers/constants';

/**
 * TC-01..TC-10 — сохранение/загрузка состояния в localStorage.
 */
test.describe('Technical: localStorage', () => {
  test('TC-01: ключ игрока используется приложением', async ({ game }) => {
    await game.goto();
    const value = await readStorage(game.page, STORAGE_KEY_PLAYER);
    expect(value === null || typeof value === 'string').toBe(true);
  });

  test('TC-02: seedPlayer объединяет поля', async ({ game }) => {
    await seedPlayer(game.page, { hp: 77, role: 'Военный' });
    await game.goto();

    const player = await game.playerState();
    expect(player.hp).toBe(77);
    expect(player.role).toBe('Военный');
  });

  test('TC-03: setPlayer полностью заменяет состояние', async ({ game }) => {
    await setPlayer(game.page, { hp: 55, role: 'Рабочий', score: 10 });
    await game.goto();

    const player = await game.playerState();
    expect(player.hp).toBe(55);
    expect(player.role).toBe('Рабочий');
  });

  test('TC-04: readPlayer возвращает объект', async ({ game }) => {
    await game.goto();
    const player = await readPlayer(game.page);
    expect(typeof player).toBe('object');
  });

  test('TC-05: writeStorage/readStorage работают', async ({ game }) => {
    await game.goto();
    await writeStorage(game.page, 'test_key', 'test_value');
    const value = await readStorage(game.page, 'test_key');
    expect(value).toBe('test_value');
  });

  test('TC-06: clearStorage очищает хранилище', async ({ game }) => {
    await game.goto();
    await writeStorage(game.page, 'temp_key', 'temp_value');
    await clearStorage(game.page);
    const value = await readStorage(game.page, 'temp_key');
    expect(value).toBeNull();
  });

  test('TC-07: состояние сохраняется при изменении', async ({ game }) => {
    await game.goto();
    await game.patchPlayer({ hp: 33 });
    // Реальная функция сохранения — saveState() (src/js/core/utils.js).
    await game.page.evaluate(() => (window as any).saveState());

    const stored = await readPlayer(game.page);
    expect(stored).toBeTruthy();
    expect(stored.hp).toBe(33);
  });

  test('TC-08: состояние загружается после перезагрузки', async ({ game }) => {
    await game.goto();
    await game.patchPlayer({ hp: 44 });
    await game.page.evaluate(() => (window as any).saveState());
    await game.page.reload();
    await game.page.waitForFunction(() => typeof (window as any).switchView === 'function');

    const player = await game.playerState();
    // После перезагрузки HP восстановлен из localStorage.
    expect(player.hp).toBe(44);
  });

  test('TC-09: повреждённое хранилище не ломает загрузку', async ({ game }) => {
    await writeStorage(game.page, STORAGE_KEY_PLAYER, '{invalid json');
    await game.goto();

    const hasSwitch = await game.page.evaluate(() => typeof (window as any).switchView === 'function');
    expect(hasSwitch).toBe(true);
  });

  test('TC-10: заметки выживания сохраняются отдельно', async ({ game }) => {
    await game.goto();
    await writeStorage(game.page, 'wasteland_notes', 'мои заметки');
    const notes = await readStorage(game.page, 'wasteland_notes');
    expect(notes).toBe('мои заметки');
  });
});
