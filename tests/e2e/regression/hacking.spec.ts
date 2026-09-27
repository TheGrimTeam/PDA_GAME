import { test, expect } from '../../fixtures/game.fixture';
import { scanDirect } from '../../helpers/scan-helper';
import { hackHit, hackMiss, hackWin } from '../../helpers/hack-helper';

/**
 * RG-43..RG-47 — взлом: мини-игра «Синхронизация».
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

  test('RG-43: запуск взлома по safe_', async ({ game }) => {
    await scanDirect(game.page, 'safe_1');

    await game.expectViewActive('hacking');
    await expect(game.page.locator('#hack-track')).toBeVisible();
    await expect(game.page.locator('#hack-sync-btn')).toBeEnabled();
    await expect(game.page.locator('#hack-stage')).toContainText('1/3');
  });

  test('RG-44: три попадания подряд дают награду', async ({ game }) => {
    await scanDirect(game.page, 'safe_2');
    await game.expectViewActive('hacking');

    const before = await game.playerState();
    await hackWin(game.page);
    const after = await game.playerState();

    // Награда 300..600 💎 для safe_
    expect(after.score - before.score).toBeGreaterThanOrEqual(300);
    expect(after.scannedCodes['safe_2']).toBeGreaterThan(0);
    await expect(game.page.locator('#hack-actions')).toContainText('ГОТОВО');
  });

  test('RG-45: промах сжигает попытку', async ({ game }) => {
    await scanDirect(game.page, 'safe_3');
    await game.expectViewActive('hacking');

    const before = await game.page.locator('#hack-attempts').innerText();
    await hackMiss(game.page);
    const after = await game.page.locator('#hack-attempts').innerText();

    expect(after).not.toBe(before);
    expect(await game.page.evaluate(() => eval('hackAttemptsLeft'))).toBe(3);
  });

  test('RG-46: исчерпание попыток блокирует код', async ({ game }) => {
    await scanDirect(game.page, 'safe_4');
    await game.expectViewActive('hacking');

    for (let i = 0; i < 4; i += 1) await hackMiss(game.page);

    const player = await game.playerState();
    expect(player.scannedCodes?.['safe_4']).toBeDefined();
    expect(player.score).toBe(0);
    await expect(game.page.locator('#hack-sync-btn')).toBeDisabled();
  });

  test('RG-47: прерывание взлома abortHacking', async ({ game }) => {
    await scanDirect(game.page, 'safe_5');
    await game.expectViewActive('hacking');

    game.page.on('dialog', (d) => d.accept());
    await game.page.evaluate(() => (window as any).abortHacking());

    await game.expectViewActive('scan');
    // Прерывание не блокирует устройство
    const player = await game.playerState();
    expect(player.scannedCodes?.['safe_5']).toBeUndefined();
  });

  test('RG-78: с каждым уровнем зона уже, а бегунок быстрее', async ({ game }) => {
    await scanDirect(game.page, 'term_1');
    const read = () => game.page.evaluate(() => ({
      width: eval('hackZone').width,
      speed: eval('hackDevice').speeds[eval('hackLevel') - 1],
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
    await expect(game.page.locator('#hack-stage')).toContainText('3/3');
  });

  test('RG-79: сложность зависит от устройства (usb < term < safe)', async ({ game }) => {
    const widths: Record<string, number> = {};
    for (const code of ['usb_1', 'term_2', 'safe_6']) {
      await scanDirect(game.page, code);
      widths[code] = await game.page.evaluate(() => eval('hackZone').width);
    }
    expect(widths.usb_1).toBeGreaterThan(widths.term_2);
    expect(widths.term_2).toBeGreaterThan(widths.safe_6);
  });

  test('RG-80: бегунок движется сам', async ({ game }) => {
    await scanDirect(game.page, 'usb_3');
    const p1 = await game.page.evaluate(() => eval('hackPos'));
    await game.page.waitForTimeout(300);
    const p2 = await game.page.evaluate(() => eval('hackPos'));
    expect(p2).not.toBe(p1);
  });

  test('RG-81: вскрытие схрона (safe_) снижает Карму, флешка — нет', async ({ game }) => {
    await scanDirect(game.page, 'safe_7');
    await hackWin(game.page);
    let player = await game.playerState();
    expect(player.karma_score).toBe(-1);

    await scanDirect(game.page, 'usb_7');
    await hackWin(game.page);
    player = await game.playerState();
    expect(player.karma_score).toBe(-1);
  });

  test('RG-86: промах не сбрасывает пройденный уровень', async ({ game }) => {
    await scanDirect(game.page, 'term_3');
    await hackHit(game.page);
    await hackMiss(game.page);
    expect(await game.page.evaluate(() => eval('hackLevel'))).toBe(2);
  });
});
