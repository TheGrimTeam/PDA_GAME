import { Page } from '@playwright/test';
import { STORAGE_KEY_PLAYER } from './constants';

/**
 * Инъекция состояния игрока в localStorage до загрузки приложения.
 * Значения объединяются с уже существующим сохранением (если есть).
 */
export async function seedPlayer(
  page: Page,
  patch: Record<string, unknown>,
): Promise<void> {
  await page.addInitScript(
    ([key, data]) => {
      const base = JSON.parse(localStorage.getItem(key as string) ?? '{}');
      localStorage.setItem(
        key as string,
        JSON.stringify({ ...base, ...(data as object) }),
      );
    },
    [STORAGE_KEY_PLAYER, patch] as const,
  );
}

/** Полная замена состояния игрока. */
export async function setPlayer(
  page: Page,
  state: Record<string, unknown>,
): Promise<void> {
  await page.addInitScript(
    ([key, data]) => {
      localStorage.setItem(key as string, JSON.stringify(data));
    },
    [STORAGE_KEY_PLAYER, state] as const,
  );
}

/** Чтение состояния игрока из localStorage. */
export async function readPlayer(page: Page): Promise<any> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? '{}'),
    STORAGE_KEY_PLAYER,
  );
}

/** Чтение произвольного ключа localStorage. */
export async function readStorage(
  page: Page,
  key: string,
): Promise<string | null> {
  return page.evaluate((k) => localStorage.getItem(k), key);
}

/** Запись произвольного ключа localStorage. */
export async function writeStorage(
  page: Page,
  key: string,
  value: string,
): Promise<void> {
  await page.evaluate(
    ([k, v]) => localStorage.setItem(k as string, v as string),
    [key, value] as const,
  );
}

/** Очистка localStorage. */
export async function clearStorage(page: Page): Promise<void> {
  await page.evaluate(() => localStorage.clear());
}
