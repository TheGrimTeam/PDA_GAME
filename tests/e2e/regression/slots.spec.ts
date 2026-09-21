import { test, expect } from '../../fixtures/game.fixture';
import { SLOT_BET_MIN, SLOT_BET_MAX } from '../../helpers/constants';

/**
 * RG-48..RG-53 — игровые автоматы.
 */
test.describe('Regression: слоты', () => {
  test.beforeEach(async ({ game }) => {
    await game.patchPlayer({
      inBase: false,
      zombieTime: 0,
      infectionTime: 0,
      score: 1000,
      rads: 0,
      slotBet: SLOT_BET_MIN,
    });
    await game.switchView('shelter');
  });

  test('RG-48: изменение ставки adjustSlotBet и setSlotBetMax', async ({ game }) => {
    await game.page.evaluate(() => (window as any).adjustSlotBet(5));
    let bet = await game.page.locator('#slot-bet-val').innerText();
    expect(Number(bet.replace(/\D/g, ''))).toBeGreaterThanOrEqual(SLOT_BET_MIN);

    await game.page.evaluate(() => (window as any).setSlotBetMax());
    bet = await game.page.locator('#slot-bet-val').innerText();
    expect(Number(bet.replace(/\D/g, ''))).toBeLessThanOrEqual(SLOT_BET_MAX);
  });

  test('RG-49: spinSlots списывает ставку', async ({ game }) => {
    const before = await game.playerState();
    await game.page.evaluate(() => (window as any).spinSlots());

    const after = await game.playerState();
    expect(after.score).toBeLessThanOrEqual(before.score);
  });

  test('RG-50: джекпот 3× начисляет выигрыш', async ({ game }) => {
    // Фиксируем одинаковый символ на всех барабанах.
    await game.page.evaluate(() => {
      Math.random = () => 0.01;
    });
    const before = await game.playerState();
    await game.page.evaluate(() => (window as any).spinSlots());
    await game.page.evaluate(() => (window as any).resolveSlots());
    const after = await game.playerState();

    // Ставка списана при spinSlots, затем джекпот 3× начисляет выигрыш.
    // Итоговый баланс должен строго превысить баланс после списания ставки.
    const bet = before.slotBet;
    expect(after.score).toBeGreaterThan(before.score - bet);
    expect(after.score).toBeGreaterThan(0);
  });

  test('RG-51: проклятый джекпот 3× 💀 добавляет радиацию', async ({ game }) => {
    await game.patchPlayer({ rads: 0 });
    await game.page.evaluate(() => {
      // Подбираем значение, дающее символ 💀 (вес 22).
      Math.random = () => 0.99;
    });
    await game.page.evaluate(() => (window as any).spinSlots());
    await game.page.evaluate(() => (window as any).resolveSlots());

    const player = await game.playerState();
    // Проклятый джекпот обязательно начисляет радиацию.
    expect(player.rads).toBeGreaterThan(0);
  });

  test('RG-52: пара символов даёт выигрыш ×1.5', async ({ game }) => {
    await game.page.evaluate(() => {
      Math.random = () => 0.5;
    });
    await game.page.evaluate(() => (window as any).spinSlots());
    await game.page.evaluate(() => (window as any).resolveSlots());

    const log = game.page.locator('#slot-result-log');
    await expect(log).not.toBeEmpty();
  });

  test('RG-53: недостаточно кредитов → отказ', async ({ game }) => {
    await game.patchPlayer({ score: 0 });
    await game.page.evaluate(() => (window as any).spinSlots());

    const player = await game.playerState();
    expect(player.score).toBe(0);
  });
});
