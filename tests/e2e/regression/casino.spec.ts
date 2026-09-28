import { test, expect } from '../../fixtures/game.fixture';

/**
 * RG-106..RG-117 — казино Убежища: «21 очко» и покер с ботом
 * (src/js/logic/cards.js, casino-21.js, casino-poker.js).
 * Колода подаётся в порядке раздачи: карты берутся с конца массива (pop).
 */
type Card = [number, string];

test.describe('Regression: казино — 21 очко и покер', () => {
  test.beforeEach(async ({ game }) => {
    await game.patchPlayer({ inBase: false, score: 100 });
    await game.switchView('shelter');
  });

  /** Раздача «21» заданной последовательностью карт: игрок, игрок, дилер, дилер, затем добор */
  async function bjDealSeq(game: any, seq: Card[]): Promise<void> {
    await game.page.evaluate((s: Card[]) => {
      const deck = s.map(([v, suit]) => ({ v, s: suit })).reverse();
      (window as any).bjDeal(deck);
    }, seq);
  }
  const score = (game: any) => game.page.evaluate(() => eval('player').score);

  test('RG-106: вкладки казино переключают игры', async ({ game }) => {
    await game.page.locator('#casino-tab-bj').click();
    await expect(game.page.locator('#casino-bj')).toBeVisible();
    await expect(game.page.locator('#casino-slots')).toBeHidden();
    await game.page.locator('#casino-tab-poker').click();
    await expect(game.page.locator('#casino-poker')).toBeVisible();
    await expect(game.page.locator('#casino-bj')).toBeHidden();
  });

  test('RG-107: «очко» с двух карт платит ×2.5', async ({ game }) => {
    await bjDealSeq(game, [[14, '♠'], [13, '♥'], [9, '♣'], [7, '♦']]);
    expect(await score(game)).toBe(100 - 10 + 25);
  });

  test('RG-108: перебор — ставка проиграна', async ({ game }) => {
    await bjDealSeq(game, [[10, '♠'], [6, '♥'], [9, '♣'], [7, '♦'], [10, '♦']]);
    await game.page.evaluate(() => (window as any).bjHit());
    expect(await score(game)).toBe(90);
    await expect(game.page.locator('#bj-log')).toContainText('Перебор');
  });

  test('RG-109: перебор у дилера — выигрыш ×2', async ({ game }) => {
    await bjDealSeq(game, [[10, '♠'], [9, '♥'], [10, '♣'], [6, '♦'], [10, '♦']]);
    await game.page.evaluate(() => (window as any).bjStand());
    expect(await score(game)).toBe(110);
  });

  test('RG-110: ничья возвращает ставку', async ({ game }) => {
    await bjDealSeq(game, [[10, '♠'], [8, '♥'], [10, '♣'], [8, '♦']]);
    await game.page.evaluate(() => (window as any).bjStand());
    expect(await score(game)).toBe(100);
  });

  test('RG-111: удвоение — ставка ×2 и одна карта', async ({ game }) => {
    await bjDealSeq(game, [[5, '♠'], [6, '♥'], [10, '♣'], [7, '♦'], [10, '♦']]);
    await game.page.evaluate(() => (window as any).bjDouble());
    expect(await score(game)).toBe(100 - 20 + 40); // 21 против 17
  });

  test('RG-112: без крышек раздача не начинается', async ({ game }) => {
    await game.patchPlayer({ score: 3 });
    await game.page.evaluate(() => (window as any).bjDeal());
    expect(await game.page.evaluate(() => eval('bjActive'))).toBe(false);
    expect(await score(game)).toBe(3);
  });

  test('RG-113: покер — оценка комбинаций и сравнение', async ({ game }) => {
    const r = await game.page.evaluate(() => {
      const H = (a: number[][], suits = '♠♥♦♣♠') => a.map((c, i) => ({ v: c[0], s: c[1] === 1 ? '♥' : suits[i] }));
      const ev = (window as any).pokerEval, cmp = (window as any).pokerCompare;
      return {
        wheel: ev(H([[14], [2], [3], [4], [5]])).name,
        flush: ev(H([[2, 1], [9, 1], [7, 1], [6, 1], [12, 1]])).name,
        kingsBeatQueens: cmp(ev(H([[13], [13], [2], [3], [4]])), ev(H([[12], [12], [14], [10], [9]]))) > 0,
        sixHighBeatsWheel: cmp(ev(H([[6], [2], [3], [4], [5]])), ev(H([[14], [2], [3], [4], [5]]))) > 0,
        kickerDecides: cmp(ev(H([[9], [9], [14], [3], [2]])), ev(H([[9], [9], [13], [3], [2]]))) > 0,
      };
    });
    expect(r).toEqual({ wheel: 'Стрит', flush: 'Флеш', kingsBeatQueens: true, sixHighBeatsWheel: true, kickerDecides: true });
  });

  /** Раздать покер и подменить руки игрока и бота после обмена */
  async function pokerTo(game: any, me: Card[], bot: Card[]): Promise<void> {
    await game.page.evaluate(({ me, bot }: { me: Card[]; bot: Card[] }) => {
      (window as any).pkDeal();
      (window as any).pkDraw();
      eval('pkHand = ' + JSON.stringify(me.map(([v, s]) => ({ v, s }))));
      eval('pkBot = ' + JSON.stringify(bot.map(([v, s]) => ({ v, s }))));
    }, { me, bot });
  }
  const PAIR_ACES: Card[] = [[14, '♠'], [14, '♥'], [9, '♦'], [5, '♣'], [2, '♠']];
  const JUNK: Card[] = [[13, '♣'], [10, '♥'], [7, '♦'], [4, '♣'], [3, '♠']];

  test('RG-114: покер — повышение, бот сбрасывает, банк игроку', async ({ game }) => {
    await pokerTo(game, PAIR_ACES, JUNK);
    await game.page.evaluate(() => { Math.random = () => 0.99; (window as any).pkRaise(); });
    // Анте 10 + повышение 10 от игрока, анте 10 от бота → банк 30 игроку
    expect(await score(game)).toBe(100 - 20 + 30);
    await expect(game.page.locator('#pk-log')).toContainText('сбросил');
  });

  test('RG-115: покер — вскрытие, сильнейшая рука забирает банк', async ({ game }) => {
    await pokerTo(game, PAIR_ACES, JUNK);
    await game.page.evaluate(() => { Math.random = () => 0.99; (window as any).pkCheck(); }); // бот не блефует
    expect(await score(game)).toBe(100 - 10 + 20);
    await expect(game.page.locator('#pk-bot-info')).toHaveText('Старшая карта'); // карты бота открыты
  });

  test('RG-116: покер — бот повышает с сильной рукой, игрок сбрасывает', async ({ game }) => {
    await pokerTo(game, JUNK, [[8, '♠'], [8, '♥'], [8, '♦'], [5, '♣'], [2, '♠']]);
    await game.page.evaluate(() => { Math.random = () => 0.01; (window as any).pkCheck(); });
    expect(await game.page.evaluate(() => eval('pkPhase'))).toBe('respond');
    await game.page.evaluate(() => (window as any).pkFold());
    expect(await score(game)).toBe(90); // потеряно только анте
  });

  test('RG-117: покер — отметка карт и обмен', async ({ game }) => {
    await game.page.locator('#casino-tab-poker').click();
    await game.page.locator('#pk-deal-btn').click();
    await game.page.locator('#pk-hand .card').nth(0).click();
    await game.page.locator('#pk-hand .card').nth(2).click();
    await expect(game.page.locator('#pk-draw-btn')).toHaveText('ОБМЕНЯТЬ (2)');
    const before = await game.page.evaluate(() => JSON.stringify(eval('pkHand')));
    await game.page.locator('#pk-draw-btn').click();
    const after = await game.page.evaluate(() => eval('pkHand'));
    const b = JSON.parse(before);
    expect(after[1]).toEqual(b[1]);
    expect(after[3]).toEqual(b[3]);
    expect(await game.page.evaluate(() => eval('pkPhase'))).toBe('bet');
    await expect(game.page.locator('#pk-bet-actions')).toBeVisible();
  });

  // ---------- Рулетка ----------

  /** Ставка и мгновенный спин с заданным результатом */
  async function rlSpinTo(game: any, type: string, result: number, number?: number): Promise<void> {
    await game.page.evaluate(({ type, result, number }: { type: string; result: number; number?: number }) => {
      if (typeof number === 'number') eval('rlNumber = ' + number);
      (window as any).rlChoose(type);
      (window as any).rlSpin(result, true);
    }, { type, result, number });
  }

  test('RG-118: рулетка — цвет, чёт/нечет, половины платят ×2', async ({ game }) => {
    await rlSpinTo(game, 'red', 32);   // 32 — красное
    expect(await score(game)).toBe(110);
    await rlSpinTo(game, 'black', 32); // проигрыш
    expect(await score(game)).toBe(100);
    await rlSpinTo(game, 'even', 18);
    await rlSpinTo(game, 'high', 19);
    expect(await score(game)).toBe(120);
  });

  test('RG-119: рулетка — дюжина ×3, число ×36', async ({ game }) => {
    await rlSpinTo(game, 'd2', 13);
    expect(await score(game)).toBe(120);
    await rlSpinTo(game, 'num', 7, 7);
    expect(await score(game)).toBe(120 - 10 + 360);
  });

  test('RG-120: рулетка — на зеро проигрывают все ставки, кроме числа 0', async ({ game }) => {
    for (const t of ['red', 'black', 'even', 'odd', 'low', 'high', 'd1']) await rlSpinTo(game, t, 0);
    expect(await score(game)).toBe(100 - 70);
    await rlSpinTo(game, 'num', 0, 0);
    expect(await score(game)).toBe(30 - 10 + 360);
  });

  test('RG-121: рулетка — история выпадений и запрет ставки без крышек', async ({ game }) => {
    await game.page.locator('#casino-tab-roulette').click();
    await rlSpinTo(game, 'red', 5);
    await rlSpinTo(game, 'red', 0);
    await expect(game.page.locator('#rl-history .rl-chip')).toHaveText(['0', '5']);
    await game.patchPlayer({ score: 2 });
    await game.page.evaluate(() => (window as any).rlSpin(1, true));
    expect(await score(game)).toBe(2);
  });

  test('RG-122: рулетка — колесо останавливается на выпавшем числе', async ({ game }) => {
    await game.page.locator('#casino-tab-roulette').click();
    await rlSpinTo(game, 'red', 23);
    const angle = await game.page.evaluate(() => eval('rlAngle'));
    const idx = await game.page.evaluate(() => eval('RL_WHEEL').indexOf(23));
    // Ячейка результата под указателем: поворот ≡ −индекс × шаг (mod 360)
    const step = 360 / 37;
    expect(Math.abs((((angle + idx * step) % 360) + 360) % 360) < 0.01 || Math.abs((((angle + idx * step) % 360) + 360) % 360 - 360) < 0.01).toBe(true);
  });
});
