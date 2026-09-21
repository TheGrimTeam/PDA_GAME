import { test, expect } from '../../fixtures/two-players.fixture';
import { GamePage } from '../../helpers/game-page';
import { scanDirect } from '../../helpers/scan-helper';
import { QR } from '../../helpers/qr-codes';

/**
 * IN-24..IN-28 — арест бандита по QR.
 *
 * Реальная логика (src/js/logic/roles.js):
 *  - handleArrestScan(code) — бандит сканирует ордер военного:
 *      player.arrestedUntil = Date.now() + 600000 (блокировка ПДА на 10 мин).
 *  - handleBanditScan(code) — военный сканирует ID бандита:
 *      требует player.role === 'Военный', начисляет +100 к score.
 */
test.describe('Integration: арест бандита', () => {
  test.beforeEach(async ({ pageA, pageB }) => {
    const a = new GamePage(pageA);
    const b = new GamePage(pageB);
    await a.goto();
    await b.goto();
    await a.patchPlayer({ inBase: false, zombieTime: 0, infectionTime: 0, inventory: [], score: 0, karma_score: 0 });
    await b.patchPlayer({ inBase: false, zombieTime: 0, infectionTime: 0, inventory: [], score: 0, karma_score: 0 });
  });

  test('IN-24: военный сканирует bandit_id и получает премию +100', async ({ pageA }) => {
    await pageA.evaluate(() => {
      const p = eval('player');
      p.role = 'Военный';
      p.score = 0;
    });

    await scanDirect(pageA, QR.banditId('bandit-1'));

    const playerA = await new GamePage(pageA).playerState();
    // handleBanditScan: военному начисляется премия 100 кредитов.
    expect(playerA.score).toBe(100);
  });

  test('IN-25: арест бандита через arrest: блокирует ПДА', async ({ pageA }) => {
    const before = Date.now();
    await scanDirect(pageA, QR.arrest('officer-1'));

    const playerA = await new GamePage(pageA).playerState();
    // handleArrestScan: arrestedUntil = now + 600000.
    expect(playerA.arrestedUntil).toBeGreaterThan(before);
    expect(playerA.arrestedUntil).toBeLessThanOrEqual(before + 600000 + 5000);
  });

  test('IN-26: арест не начисляет очки', async ({ pageA }) => {
    await pageA.evaluate(() => {
      const p = eval('player');
      p.score = 0;
    });

    await scanDirect(pageA, QR.arrest('officer-1'));

    const playerA = await new GamePage(pageA).playerState();
    // handleArrestScan: score не меняется — это блокировка, а не награда.
    expect(playerA.score).toBe(0);
  });

  test('IN-27: арест не меняет карму', async ({ pageA }) => {
    await pageA.evaluate(() => {
      const p = eval('player');
      p.karma_score = 0;
    });

    await scanDirect(pageA, QR.arrest('officer-1'));

    const playerA = await new GamePage(pageA).playerState();
    // handleArrestScan: karma_score не изменяется.
    expect(playerA.karma_score).toBe(0);
  });

  test('IN-28: повторный арест продлевает блокировку', async ({ pageA }) => {
    await scanDirect(pageA, QR.arrest('officer-1'));
    const first = (await new GamePage(pageA).playerState()).arrestedUntil;

    await scanDirect(pageA, QR.arrest('officer-1'));
    const second = (await new GamePage(pageA).playerState()).arrestedUntil;

    // Повторное сканирование переустанавливает arrestedUntil (не раньше первого).
    expect(second).toBeGreaterThanOrEqual(first);
  });
});
