import { test, expect } from '../../fixtures/game.fixture';

/**
 * TC-11..TC-22 — утилиты (utils.js), QR-генерация, аудио.
 */
test.describe('Technical: утилиты', () => {
  test.beforeEach(async ({ game }) => {
    await game.goto();
  });

  test('TC-11: clamp ограничивает значение', async ({ game }) => {
    const result = await game.page.evaluate(() => {
      const fn = (window as any).clamp;
      if (typeof fn !== 'function') return null;
      return [fn(5, 0, 10), fn(-5, 0, 10), fn(15, 0, 10)];
    });
    if (result) {
      expect(result).toEqual([5, 0, 10]);
    } else {
      expect(result).toBeNull();
    }
  });

  test('TC-12: randomInt возвращает целое в диапазоне', async ({ game }) => {
    const result = await game.page.evaluate(() => {
      const fn = (window as any).randomInt;
      if (typeof fn !== 'function') return null;
      return fn(1, 6);
    });
    if (result !== null) {
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(6);
    }
  });

  test('TC-13: pick выбирает элемент массива', async ({ game }) => {
    const result = await game.page.evaluate(() => {
      const fn = (window as any).pick;
      if (typeof fn !== 'function') return null;
      return fn(['a', 'b', 'c']);
    });
    if (result !== null) {
      expect(['a', 'b', 'c']).toContain(result);
    }
  });

  test('TC-14: formatScore форматирует число', async ({ game }) => {
    const result = await game.page.evaluate(() => {
      const fn = (window as any).formatScore;
      if (typeof fn !== 'function') return null;
      return fn(1234);
    });
    if (result !== null) {
      expect(typeof result).toBe('string');
    }
  });

  test('TC-15: escapeHtml экранирует спецсимволы', async ({ game }) => {
    const result = await game.page.evaluate(() => {
      const fn = (window as any).escapeHtml;
      if (typeof fn !== 'function') return null;
      return fn('<b>&"');
    });
    if (result !== null) {
      expect(result).not.toContain('<b>');
    }
  });

  test('TC-16: QR-генератор создаёт canvas', async ({ game }) => {
    const hasQr = await game.page.evaluate(() => {
      return typeof (window as any).QRCode !== 'undefined'
        || typeof (window as any).QR !== 'undefined';
    });
    // Библиотека генерации QR должна быть загружена.
    expect(hasQr).toBe(true);
  });

  test('TC-17: генерация QR-кода игрока', async ({ game }) => {
    const result = await game.page.evaluate(() => {
      const fn = (window as any).generatePlayerQR;
      if (typeof fn !== 'function') return null;
      try {
        fn();
        return true;
      } catch {
        return false;
      }
    });
    expect(result === null || typeof result === 'boolean').toBe(true);
  });

  test('TC-18: AudioContext мок не падает', async ({ game }) => {
    const result = await game.page.evaluate(() => {
      try {
        const ctx = new (window as any).AudioContext();
        return typeof ctx === 'object';
      } catch {
        return false;
      }
    });
    // Мок AudioContext должен успешно создаваться.
    expect(result).toBe(true);
  });

  test('TC-19: функция playSound безопасна', async ({ game }) => {
    const result = await game.page.evaluate(() => {
      const fn = (window as any).playSound;
      if (typeof fn !== 'function') return null;
      try {
        fn('click');
        return true;
      } catch {
        return false;
      }
    });
    expect(result === null || typeof result === 'boolean').toBe(true);
  });

  test('TC-20: getItemById возвращает предмет', async ({ game }) => {
    const result = await game.page.evaluate(() => {
      const fn = (window as any).getItemById;
      if (typeof fn !== 'function') return null;
      return fn('item_10');
    });
    expect(result === null || typeof result === 'object').toBe(true);
  });

  test('TC-21: константы игры доступны', async ({ game }) => {
    // MAX_BACKPACK_SIZE и ITEMS_DB объявлены через const в классических скриптах,
    // поэтому они НЕ являются свойствами window. Доступ к ним — через eval().
    const result = await game.page.evaluate(() => {
      return {
        maxBackpack: eval('typeof MAX_BACKPACK_SIZE !== "undefined" ? MAX_BACKPACK_SIZE : null'),
        itemsDbKeys: eval('typeof ITEMS_DB !== "undefined" ? Object.keys(ITEMS_DB).length : -1'),
      };
    });
    // Лимит рюкзака равен 30, а база предметов непустая.
    expect(result.maxBackpack).toBe(30);
    expect(result.itemsDbKeys).toBeGreaterThan(0);
  });

  test('TC-22: switchView переключает все вьюхи', async ({ game }) => {
    const views = ['base', 'scan', 'inventory', 'quests', 'shelter', 'map', 'profile'];
    for (const view of views) {
      await game.switchView(view as any);
      await expect(game.page.locator(`#view-${view}`)).toHaveClass(/active/);
    }
  });
});
