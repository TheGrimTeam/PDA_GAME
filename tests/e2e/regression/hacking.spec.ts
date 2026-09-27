import { test, expect } from '../../fixtures/game.fixture';
import { scanDirect } from '../../helpers/scan-helper';
import { hackHit, hackMiss, syncWin, lockHold, wordsWin, wordsWrong } from '../../helpers/hack-helper';

/**
 * RG-43..RG-47, RG-78..RG-81, RG-86, RG-92..RG-97 — взлом.
 * usb_ — «Синхронизация», term_ — «Отмычка», safe_ — «Подбор кода» (6 букв).
 */
test.describe('Regression: взлом', () => {
  test.beforeEach(async ({ game }) => {
    await game.patchPlayer({
      inBase: false,
      zombieTime: 0,
      infectionTime: 0,
      inventory: [],
      scannedCodes: {},
      score: 0,
      karma_score: 0,
    });
  });

  const visiblePanels = (game: any) => game.page.evaluate(() =>
    ['hack-panel-sync', 'hack-panel-lock', 'hack-panel-words']
      .filter((id) => (document.getElementById(id) as HTMLElement).style.display !== 'none'));

  test('RG-92: каждый носитель открывает свою игру', async ({ game }) => {
    await scanDirect(game.page, 'usb_1');
    expect(await visiblePanels(game)).toEqual(['hack-panel-sync']);
    await scanDirect(game.page, 'term_1');
    expect(await visiblePanels(game)).toEqual(['hack-panel-lock']);
    await expect(game.page.locator('#hack-attempts-label')).toHaveText('ШПИЛЬКИ');
    await scanDirect(game.page, 'safe_1');
    expect(await visiblePanels(game)).toEqual(['hack-panel-words']);
  });

  // ---------- Схрон: подбор кода ----------

  test('RG-43: схрон — код из 10 слов по 6 букв', async ({ game }) => {
    await scanDirect(game.page, 'safe_1');
    await game.expectViewActive('hacking');
    const words: string[] = await game.page.evaluate(() => eval('hackWordsList'));
    expect(words).toHaveLength(10);
    expect(words.every((w) => w.length === 6)).toBe(true);
    const dump = await game.page.locator('#hack-words-grid').innerText();
    for (const w of words) expect(dump).toContain(w);
  });

  test('RG-44: верный код даёт награду и снимает Карму за схрон', async ({ game }) => {
    await scanDirect(game.page, 'safe_2');
    await wordsWin(game.page);
    const player = await game.playerState();
    expect(player.score).toBeGreaterThanOrEqual(300);
    expect(player.karma_score).toBe(-1);
    expect(player.scannedCodes['safe_2']).toBeGreaterThan(0);
    await expect(game.page.locator('#hack-actions')).toContainText('ГОТОВО');
  });

  test('RG-45: неверное слово сжигает попытку и помечается совпадением', async ({ game }) => {
    await scanDirect(game.page, 'safe_3');
    const wrong = await wordsWrong(game.page);
    const likeness = await game.page.evaluate((w) => (window as any).hackLikeness(w, eval('hackSecretWord')), wrong);
    expect(await game.page.evaluate(() => eval('hackAttemptsLeft'))).toBe(3);
    await expect(game.page.locator('.hk-tried')).toHaveText(`${wrong}${likeness}`);
    await expect(game.page.locator('#hack-console')).toContainText(`Совпадение: ${likeness}/6`);
  });

  test('RG-46: 4 ошибки блокируют схрон', async ({ game }) => {
    await scanDirect(game.page, 'safe_4');
    for (let i = 0; i < 4; i += 1) await wordsWrong(game.page);
    const player = await game.playerState();
    expect(player.scannedCodes['safe_4']).toBeDefined();
    expect(player.score).toBe(0);
    expect(player.karma_score).toBe(0);
  });

  test('RG-47: прерывание взлома без блокировки', async ({ game }) => {
    await scanDirect(game.page, 'safe_5');
    game.page.on('dialog', (d) => d.accept());
    await game.page.evaluate(() => (window as any).abortHacking());
    await game.expectViewActive('scan');
    const player = await game.playerState();
    expect(player.scannedCodes?.['safe_5']).toBeUndefined();
  });

  test('RG-93: скобки убирают ложное слово', async ({ game }) => {
    await scanDirect(game.page, 'safe_6');
    await game.page.evaluate(() => { Math.random = () => 0.1; });
    await game.page.locator('.hk-br').first().click();
    const removed = await game.page.evaluate(() => Object.keys(eval('hackRemoved')));
    expect(removed).toHaveLength(1);
    expect(removed[0]).not.toBe(await game.page.evaluate(() => eval('hackSecretWord')));
  });

  // ---------- Флешка: синхронизация ----------

  test('RG-78: флешка — 3 уровня, зона уже и бегунок быстрее', async ({ game }) => {
    await scanDirect(game.page, 'usb_1');
    const read = () => game.page.evaluate(() => ({
      width: eval('hackZone').width,
      speed: eval('SYNC_SPEEDS')[eval('hackLevel') - 1],
    }));
    const l1 = await read();
    await hackHit(game.page);
    const l2 = await read();
    await hackHit(game.page);
    const l3 = await read();
    expect(l2.width).toBeLessThan(l1.width);
    expect(l3.width).toBeLessThan(l2.width);
    expect(l2.speed).toBeGreaterThan(l1.speed);
    expect(l3.speed).toBeGreaterThan(l2.speed);
  });

  test('RG-79: флешка — победа даёт награду без штрафа Кармы', async ({ game }) => {
    await scanDirect(game.page, 'usb_2');
    await syncWin(game.page);
    const player = await game.playerState();
    expect(player.score).toBeGreaterThanOrEqual(100);
    expect(player.karma_score).toBe(0);
  });

  test('RG-80: флешка — бегунок движется сам', async ({ game }) => {
    await scanDirect(game.page, 'usb_3');
    const p1 = await game.page.evaluate(() => eval('hackPos'));
    await game.page.waitForTimeout(300);
    const p2 = await game.page.evaluate(() => eval('hackPos'));
    expect(p2).not.toBe(p1);
  });

  test('RG-81: флешка — промах сжигает попытку, 4 промаха блокируют', async ({ game }) => {
    await scanDirect(game.page, 'usb_4');
    await hackMiss(game.page);
    expect(await game.page.evaluate(() => eval('hackAttemptsLeft'))).toBe(3);
    for (let i = 0; i < 3; i += 1) await hackMiss(game.page);
    const player = await game.playerState();
    expect(player.scannedCodes['usb_4']).toBeDefined();
    await expect(game.page.locator('#hack-sync-btn')).toBeDisabled();
  });

  test('RG-86: флешка — промах не сбрасывает пройденный уровень', async ({ game }) => {
    await scanDirect(game.page, 'usb_5');
    await hackHit(game.page);
    await hackMiss(game.page);
    expect(await game.page.evaluate(() => eval('hackLevel'))).toBe(2);
  });

  // ---------- Терминал: отмычка ----------

  test('RG-94: терминал — шпилька в нужной точке открывает замок', async ({ game }) => {
    await scanDirect(game.page, 'term_1');
    await lockHold(game.page, 'sweet', 2);
    const player = await game.playerState();
    expect(player.score).toBeGreaterThanOrEqual(100);
    expect(player.scannedCodes['term_1']).toBeGreaterThan(0);
    expect(player.karma_score).toBe(0);
  });

  test('RG-95: терминал — давление не в той точке ломает шпильку', async ({ game }) => {
    await scanDirect(game.page, 'term_2');
    await lockHold(game.page, 'far', 2);
    expect(await game.page.evaluate(() => eval('hackAttemptsLeft'))).toBe(3);
    await expect(game.page.locator('#hack-console')).toContainText('Шпилька сломалась');
    for (let i = 0; i < 3; i += 1) await lockHold(game.page, 'far', 2);
    const player = await game.playerState();
    expect(player.scannedCodes['term_2']).toBeDefined();
    expect(player.score).toBe(0);
  });

  test('RG-96: терминал — чем ближе к точке, тем дальше поворот', async ({ game }) => {
    await scanDirect(game.page, 'term_3');
    const open = await game.page.evaluate(() => {
      const s = eval('lockSweet');
      const f = (window as any).lockOpenness;
      const dir = s > 90 ? -1 : 1;
      return [f(s + dir * 45), f(s + dir * 25), f(s + dir * 12), f(s)];
    });
    expect(open[0]).toBeLessThan(open[1]);
    expect(open[1]).toBeLessThan(open[2]);
    expect(open[3]).toBe(1);
  });

  test('RG-97: терминал — пока замок повёрнут, шпильку не сдвинуть', async ({ game }) => {
    await scanDirect(game.page, 'term_4');
    const moved = await game.page.evaluate(() => {
      (window as any).lockSetAngle(40);
      (window as any).lockTurnStart();
      (window as any).lockStep(0.1);
      (window as any).lockSetAngle(150);
      const a = eval('lockAngle');
      (window as any).lockTurnEnd();
      return a;
    });
    expect(moved).toBe(40);
  });
});
