import { test as base, Page } from '@playwright/test';
import { GamePage } from '../helpers/game-page';
import { applyDefaultMocks } from '../helpers/mocks';
import { seedPlayer } from '../helpers/state-helper';

type PlayerFixtures = {
  /** Патч состояния, который будет применён перед загрузкой игры. */
  playerPatch: Record<string, unknown>;
  game: GamePage;
};

/**
 * Фикстура с инъекцией состояния игрока.
 * Переопределите `playerPatch` в тесте через `test.use({ playerPatch: {...} })`
 * или задайте его в самом тесте перед `game.goto()`.
 */
export const test = base.extend<PlayerFixtures>({
  playerPatch: [{}, { option: true }],

  game: async ({ page, playerPatch }, use) => {
    await applyDefaultMocks(page);
    if (Object.keys(playerPatch).length > 0) {
      await seedPlayer(page, playerPatch);
    }
    const game = new GamePage(page);
    await game.goto();
    await use(game);
  },
});

export { expect } from '@playwright/test';
