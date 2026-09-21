import { test, expect } from '../../fixtures/two-players.fixture';
import { GamePage } from '../../helpers/game-page';
import { scanDirect } from '../../helpers/scan-helper';
import { QR } from '../../helpers/qr-codes';

/**
 * IN-17..IN-23 — ограбление трупов (bandit / survivor / military).
 */
test.describe('Integration: ограбление трупов', () => {
  test.beforeEach(async ({ pageA, pageB }) => {
    const a = new GamePage(pageA);
    const b = new GamePage(pageB);
    await a.goto();
    await b.goto();
    await a.patchPlayer({ inBase: false, zombieTime: 0, infectionTime: 0, inventory: [], score: 0, karma_score: 0 });
    await b.patchPlayer({ inBase: false, zombieTime: 0, infectionTime: 0, inventory: [], score: 0, karma_score: 0 });
  });

  test('IN-17: ограбление бандита выдаёт жетон и предмет', async ({ pageA }) => {
    // В ITEMS_DB нет префикса item_*: используем реальные коды (junk_1, gear_1 и т.п.).
    await scanDirect(pageA, QR.rob('bandit', 'b-1', 'Бандит', ['junk_1'], 50));

    const playerA = await new GamePage(pageA).playerState();
    // handleScan: за обыск бандита выдаётся token_bandit + предметы из QR.
    expect(playerA.inventory).toContain('token_bandit');
    expect(playerA.inventory).toContain('junk_1');
    expect(playerA.stats.corpsesRobbed).toBe(1);
  });

  test('IN-18: ограбление выжившего снижает карму', async ({ pageA }) => {
    await pageA.evaluate(() => {
      const p = eval('player');
      p.karma_score = 0;
    });

    await scanDirect(pageA, QR.rob('survivor', 's-1', 'Выживший', ['junk_1'], 50));

    const playerA = await new GamePage(pageA).playerState();
    // handleScan: ограбление выжившего делает karma_score-- (см. src/js/logic/scan.js).
    expect(playerA.karma_score).toBeLessThan(0);
  });

  test('IN-19: ограбление военного даёт предметы и снижает карму', async ({ pageA }) => {
    await scanDirect(pageA, QR.rob('military', 'm-1', 'Военный', ['wpn_1'], 100));

    const playerA = await new GamePage(pageA).playerState();
    // handleScan: военный отдаёт token_military + предметы, карма снижается (не бандит).
    expect(playerA.inventory).toContain('token_military');
    expect(playerA.inventory).toContain('wpn_1');
    expect(playerA.karma_score).toBeLessThan(0);
  });

  test('IN-20: ограбление добавляет очки из stolenScore', async ({ pageA }) => {
    await pageA.evaluate(() => {
      const p = eval('player');
      p.score = 0;
    });

    await scanDirect(pageA, QR.rob('bandit', 'b-1', 'Бандит', ['junk_1'], 50));

    const playerA = await new GamePage(pageA).playerState();
    // handleScan: stolenScore (parts[4]) прибавляется к player.score.
    expect(playerA.score).toBe(50);
  });

  test('IN-21: ограбление бандита не снижает карму', async ({ pageA }) => {
    await pageA.evaluate(() => {
      const p = eval('player');
      p.karma_score = 0;
    });

    await scanDirect(pageA, QR.rob('bandit', 'b-1', 'Бандит', ['junk_1'], 50));

    const playerA = await new GamePage(pageA).playerState();
    // handleScan: обыск бандита карму не меняет (см. src/js/logic/scan.js).
    expect(playerA.karma_score).toBe(0);
  });

  test('IN-22: ограбление не превышает лимит рюкзака', async ({ pageA }) => {
    // Заполняем рюкзак тяжёлыми предметами (gear_1: size 2-4) сверх лимита MAX_BACKPACK_SIZE=30.
    await pageA.evaluate(() => {
      const p = eval('player');
      p.inventory = new Array(20).fill('gear_1');
    });

    await scanDirect(pageA, QR.rob('bandit', 'b-1', 'Бандит', ['junk_2', 'junk_3'], 50));

    const playerA = await new GamePage(pageA).playerState();
    // handleScan: предметы не добавляются, если суммарный size превышает maxSize.
    expect(playerA.inventory).not.toContain('junk_2');
    expect(playerA.inventory).not.toContain('junk_3');
    expect(playerA.inventory).not.toContain('token_bandit');
    expect(playerA.inventory.length).toBe(20);
  });

  test('IN-23: ограбление в режиме зомби запрещено', async ({ pageA }) => {
    await pageA.evaluate(() => {
      const p = eval('player');
      p.zombieTime = Date.now();
      p.inventory = [];
      p.stats.corpsesRobbed = 0;
    });

    await scanDirect(pageA, QR.rob('bandit', 'b-1', 'Бандит', ['junk_1'], 50));

    const playerA = await new GamePage(pageA).playerState();
    // handleScan: зомби не может мародёрствовать — ни предметов, ни жетона, ни статистики.
    expect(playerA.inventory).not.toContain('junk_1');
    expect(playerA.inventory).not.toContain('token_bandit');
    expect(playerA.stats.corpsesRobbed).toBe(0);
  });
});
