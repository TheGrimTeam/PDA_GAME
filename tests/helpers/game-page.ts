import { Page, expect } from '@playwright/test';
import { ViewName } from './constants';

/**
 * Page Object: инкапсулирует навигацию, HUD и работу с вьюхами.
 * Использует только существующие id/классы приложения.
 */
export class GamePage {
  constructor(readonly page: Page) {}

  /** Открыть приложение и дождаться завершения инициализации. */
  async goto(): Promise<void> {
    await this.page.goto('/index.html');
    await this.page.waitForFunction(
      () => typeof (window as any).switchView === 'function',
    );
  }

  /** Переключить вьюху через глобальную функцию. */
  async switchView(view: ViewName): Promise<void> {
    await this.page.evaluate((v) => (window as any).switchView(v), view);
  }

  /** Проверить, что вьюха активна. */
  async expectViewActive(view: ViewName): Promise<void> {
    await expect(this.page.locator(`#view-${view}`)).toHaveClass(/active/);
  }

  /** Прочитать значение HUD-элемента. */
  async hudValue(id: string): Promise<string> {
    return (await this.page.locator(`#${id}`).innerText()).trim();
  }

  /**
   * Прочитать состояние игрока из рантайма.
   * `player` объявлен через `let` в глобальной области, поэтому он доступен
   * как глобальная переменная, но не как свойство `window`. Читаем его через
   * `eval` в контексте страницы.
   */
  async playerState(): Promise<any> {
    return this.page.evaluate(() => eval('player'));
  }

  /** Изменить поля игрока в рантайме (через eval, т.к. player — let-переменная). */
  async patchPlayer(patch: Record<string, unknown>): Promise<void> {
    await this.page.evaluate((data) => {
      const p = eval('player');
      Object.assign(p, data);
    }, patch);
  }
}
