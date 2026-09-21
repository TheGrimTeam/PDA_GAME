import { test as base, Page } from '@playwright/test';
import { GamePage } from '../helpers/game-page';
import { applyDefaultMocks } from '../helpers/mocks';

type GameFixtures = {
  game: GamePage;
  /** Страница с применёнными моками, но без перехода на index.html. */
  mockedPage: Page;
};

/**
 * Базовая фикстура: применяет моки (камера, аудио, PRNG) до загрузки
 * приложения и предоставляет Page Object `game`.
 */
export const test = base.extend<GameFixtures>({
  mockedPage: async ({ page }, use) => {
    await applyDefaultMocks(page);
    await use(page);
  },

  game: async ({ mockedPage }, use) => {
    const game = new GamePage(mockedPage);
    await game.goto();
    await use(game);
  },
});

export { expect } from '@playwright/test';
