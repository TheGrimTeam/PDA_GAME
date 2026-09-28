import { test, expect } from '../../fixtures/game.fixture';

/**
 * RG-98..RG-104 — ПДА «спал» (телефон заблокирован, таймеры стояли).
 * После пробуждения zoneCatchUp() доигрывает пропущенные минуты по тем же правилам,
 * что и в живой игре (src/js/logic/events.js).
 */
test.describe('Regression: заблокированный телефон', () => {
  test.beforeEach(async ({ game }) => {
    await game.patchPlayer({
      inBase: false,
      zombieTime: 0,
      infectionTime: 0,
      hp: 100,
      hunger: 100,
      rads: 0,
      karma_score: 0,
      role: 'Безработный',
      shelterLevel: 0,
      equipment: null,
      weapons: {},
      fractions: {},
      score: 0,
    });
  });

  /** Имитация сна: последняя минута Зоны и «пульс» ПДА были N минут назад */
  async function sleepFor(game: any, minutes: number): Promise<void> {
    await game.page.evaluate((m: number) => {
      const ago = Date.now() - m * 60_000 - 1000;
      eval('player').lastZoneTick = ago;
      localStorage.setItem('pda_heartbeat', String(ago));
    }, minutes);
  }

  test('RG-98: за 10 минут сна голод −30, радиация +20, время выживания идёт', async ({ game }) => {
    const before = (await game.playerState()).stats.survivedSeconds || 0;
    await sleepFor(game, 10);
    const lived = await game.page.evaluate(() => (window as any).zoneCatchUp(false));
    const p = await game.playerState();
    expect(lived).toBe(10);
    expect(p.hunger).toBe(70);
    expect(p.rads).toBe(20);
    expect(p.stats.survivedSeconds - before).toBe(600);
    await expect(game.page.locator('#event-banner')).toContainText('ПДА СПАЛ 10 МИН');
  });

  test('RG-99: разблокировка телефона запускает расчёт пропущенного времени', async ({ game }) => {
    await sleepFor(game, 5);
    await game.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    const p = await game.playerState();
    expect(p.hunger).toBe(85);
  });

  test('RG-100: голодный урон — только с момента, когда еда кончилась', async ({ game }) => {
    // Герой (карма 3): без радиации, чтобы максимум HP не менялся
    await game.patchPlayer({ hunger: 30, karma_score: 3 });
    await sleepFor(game, 20);
    await game.page.evaluate(() => (window as any).zoneCatchUp(false));
    const p = await game.playerState();
    // Еда кончается на 10-й минуте; урон 5 HP за минуты 10..20 = 11 × 5 = 55
    expect(p.hunger).toBe(0);
    expect(p.hp).toBe(45);
  });

  test('RG-101: долгий сон без еды убивает, но только когда реально пора', async ({ game }) => {
    await game.patchPlayer({ hunger: 0, karma_score: 3, hp: 20 });
    await sleepFor(game, 60);
    const lived = await game.page.evaluate(() => (window as any).zoneCatchUp(false));
    const p = await game.playerState();
    expect(p.hp).toBe(0);
    expect(lived).toBe(4); // 20 HP / 5 в минуту — погиб на 4-й минуте
    await game.expectViewActive('dead');
  });

  test('RG-102: на Базе во время сна ничего не тратится', async ({ game }) => {
    await game.patchPlayer({ inBase: true });
    await sleepFor(game, 30);
    await game.page.evaluate(() => (window as any).zoneCatchUp(false));
    const p = await game.playerState();
    expect(p.hunger).toBe(100);
    expect(p.rads).toBe(0);
    expect(Date.now() - p.lastZoneTick).toBeLessThan(60_000); // отсчёт сдвинут, задним числом не спишется
  });

  test('RG-103: жалование Рабочего идёт и во время сна', async ({ game }) => {
    await game.patchPlayer({ role: 'Рабочий', score: 0 });
    await sleepFor(game, 10);
    await game.page.evaluate(() => (window as any).zoneCatchUp(false));
    expect((await game.playerState()).score).toBe(30);
  });

  test('RG-104: сытость остаётся целым числом после сна с бонусом Убежища', async ({ game }) => {
    await game.patchPlayer({ shelterLevel: 1 });
    await sleepFor(game, 7);
    await game.page.evaluate(() => (window as any).zoneCatchUp(false));
    const p = await game.playerState();
    expect(Number.isInteger(p.hunger)).toBe(true);
    expect(p.hunger).toBe(100 - Math.floor(7 * 2.7)); // 2.7 в минуту, дробь копится
  });

  test('RG-105: реальный «сон» — таймеры стояли 10 минут, пульс сам догоняет время', async ({ game }) => {
    await game.page.clock.install();
    await game.page.reload();
    await game.page.waitForFunction(() => typeof (window as any).switchView === 'function');
    await game.page.evaluate(() => {
      Math.random = () => 0.5; // без случайных событий Зоны
      const p = eval('player');
      Object.assign(p, { inBase: false, hp: 100, hunger: 100, rads: 0, karma_score: 0, fractions: {}, weapons: {} });
      p.lastZoneTick = Date.now();
      localStorage.setItem('pda_heartbeat', String(Date.now()));
    });
    // Прыжок времени: как заблокированный телефон — таймеры не срабатывали каждую минуту
    await game.page.clock.fastForward(10 * 60_000);
    await game.page.clock.runFor(6_000); // первый «пульс» после пробуждения
    const p = await game.playerState();
    expect(p.hunger).toBe(70);
    expect(p.rads).toBe(20);
  });
});
