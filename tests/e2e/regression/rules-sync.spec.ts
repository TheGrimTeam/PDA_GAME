import { test, expect } from '../../fixtures/game.fixture';
import { scanDirect } from '../../helpers/scan-helper';
import { QR } from '../../helpers/qr-codes';

/**
 * RG-71..RG-77 — соответствие механик правилам игры «Эфир Кармы».
 *
 * Как и в events.spec.ts, для проверки минутного цикла часы ставятся
 * ДО перезагрузки страницы, чтобы setInterval попал на фейковые таймеры.
 * Math.random фиксируется, чтобы случайные события Зоны были предсказуемы.
 */
test.describe('Regression: механики по правилам игры', () => {
  const BASE_STATE = {
    inBase: false,
    zombieTime: 0,
    infectionTime: 0,
    inventory: [],
    hunger: 100,
    rads: 0,
    hp: 100,
    karma_score: 0,
    role: 'Выживший',
    shelterLevel: 0,
    equipment: null,
    weapons: {},
    npcRep: {},
    fractions: {},
  };

  test.beforeEach(async ({ game }) => {
    await game.patchPlayer(BASE_STATE);
  });

  /** Фейковые часы + фиксированный Math.random (0.5 — событий Зоны нет). */
  async function installClockAndReload(game: any, random = 0.5): Promise<void> {
    await game.page.clock.install();
    await game.page.reload();
    await game.page.waitForFunction(
      () => typeof (window as any).switchView === 'function',
    );
    await game.page.evaluate((r: number) => { Math.random = () => r; }, random);
    // patchPlayer меняет только объект в памяти — после reload повторяем базовое состояние
    await game.patchPlayer(BASE_STATE);
  }

  test('RG-71: лечение у Кроу с Торговым чипом стоит 35 💎', async ({ game }) => {
    await game.patchPlayer({ equipment: 'eq_trade', npcRep: {} });
    const cost = await game.page.evaluate(() => (window as any).getHealCost('npc_med'));
    expect(cost).toBe(35);
  });

  test('RG-72: Противогаз ГП-5 (eq_gas) снижает радиацию на 60%', async ({ game }) => {
    await game.patchPlayer({ equipment: 'eq_gas', weapons: {} });
    const mult = await game.page.evaluate(() => (window as any).getRadMultiplier());
    expect(mult).toBeCloseTo(0.4);
  });

  test('RG-73: радиация упирается в 40 и сжигает максимум HP, но не убивает', async ({ game }) => {
    await game.page.evaluate(() => {
      const p = eval('player');
      p.rads = 100;
      p.hp = 100;
      (window as any).saveState();
    });
    const player = await game.playerState();
    const maxHp = await game.page.evaluate(() => (window as any).getMaxHp());
    expect(player.rads).toBe(40);
    expect(player.hp).toBe(maxHp - 40); // эффективный максимум = максимум HP − радиация
    expect(player.hp).toBeGreaterThan(0);
    await expect(game.page.locator('#view-dead')).not.toHaveClass(/active/);
  });

  test('RG-74: Убежище 1 ур. — сытость тратится на 10% медленнее', async ({ game }) => {
    await installClockAndReload(game);
    await game.patchPlayer({ shelterLevel: 1, hunger: 100, fractions: {} });
    await game.page.clock.runFor(10 * 60_000 + 1_000);

    const player = await game.playerState();
    // Без бонуса: 10 × 3 = 30. С бонусом: 10 × 2.7 = 27.
    expect(player.hunger).toBe(73);
  });

  test('RG-75: Убежище 2 ур. — радиация копится на 10% медленнее', async ({ game }) => {
    await installClockAndReload(game);
    await game.patchPlayer({ shelterLevel: 2, rads: 0, fractions: {} });
    await game.page.clock.runFor(10 * 60_000 + 1_000);

    const player = await game.playerState();
    // Без бонуса: 10 × 2 = 20. С бонусом: 10 × 1.8 = 18.
    expect(player.rads).toBe(18);
  });

  test('RG-76: радиационная буря со Свинцовым плащом даёт +7 РАД', async ({ game }) => {
    // Math.random = 0.05: событие срабатывает (< 0.1), индекс 0 — радиационная буря.
    await installClockAndReload(game, 0.05);
    await game.patchPlayer({ equipment: 'eq_rad', rads: 0, fractions: {} });
    await game.page.clock.runFor(61_000);

    const player = await game.playerState();
    // Фон: 2 × 0.5 = 1 РАД, буря: floor(15 × 0.5) = 7 РАД.
    expect(player.rads).toBe(8);
  });

  test('RG-77: повторный скан кода P2P-продажи не списывает кредиты дважды', async ({ game }) => {
    await game.patchPlayer({ score: 200, inventory: [], processedBuyTxs: {} });
    const code = QR.p2pSell('SELLER', 'food_1', 50, 'tx_rg77');
    await scanDirect(game.page, code);
    await scanDirect(game.page, code);

    const player = await game.playerState();
    expect(player.score).toBe(150);
    expect(player.inventory.filter((id: string) => id === 'food_1')).toHaveLength(1);
    // Код подтверждения показан повторно, чтобы продавец мог завершить сделку.
    await expect(game.page.locator('#trade-modal-content')).toContainText('УЖЕ ОПЛАЧЕНА');
  });
});
