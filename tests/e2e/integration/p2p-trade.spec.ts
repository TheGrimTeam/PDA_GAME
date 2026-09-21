import { test, expect } from '../../fixtures/two-players.fixture';
import { GamePage } from '../../helpers/game-page';
import { scanDirect } from '../../helpers/scan-helper';
import { QR } from '../../helpers/qr-codes';

/**
 * IN-01..IN-08 — P2P-обмен между двумя устройствами.
 * Каждый тест использует два изолированных browser context (pageA/pageB).
 *
 * Реальный протокол (src/js/logic/p2p.js):
 *   продажа:  p2ptrade:sell:<sellerCallsign>:<itemId>:<price>:<txId>
 *   подтверждение: p2ptrade:confirm:<txId>:<price>:<itemId>
 *
 * Покупатель сканирует sell → confirm() → списание кредитов, добавление
 * предмета, генерация confirm-QR. Продавец сканирует confirm → удаление
 * предмета, зачисление кредитов, запись в processedTradeTxs.
 */

test.describe('Integration: P2P-обмен', () => {
  test.beforeEach(async ({ pageA, pageB }) => {
    // Диалоги (confirm/alert/prompt) уже синхронно замоканы в applyDefaultMocks
    // (см. tests/helpers/mocks.ts → mockDialogs). page.on('dialog') здесь
    // не работает: confirm() внутри page.evaluate блокирует JS-поток.
    const a = new GamePage(pageA);
    const b = new GamePage(pageB);
    await a.goto();
    await b.goto();
    await a.patchPlayer({
      inBase: false,
      zombieTime: 0,
      infectionTime: 0,
      inventory: [],
      score: 100,
      callsign: 'SELLER',
    });
    await b.patchPlayer({
      inBase: false,
      zombieTime: 0,
      infectionTime: 0,
      inventory: [],
      score: 100,
      callsign: 'BUYER',
    });
  });

  test('IN-01: игрок A генерирует QR для продажи', async ({ pageA }) => {
    // Кладём предмет в рюкзак и запускаем реальный сценарий продажи.
    await pageA.evaluate(() => {
      const p = eval('player');
      p.inventory = ['food_1'];
    });
    // prompt() уже замокан синхронно (mockDialogs → '50').
    await pageA.evaluate(() => (window as any).initiateP2PTrade(0));

    const modal = pageA.locator('#trade-modal');
    await expect(modal).toBeVisible();
    // QR продажи реально отрисован (canvas/img внутри контейнера).
    const qrHtml = await pageA.locator('#trade-qr-container').innerHTML();
    expect(qrHtml.length).toBeGreaterThan(0);
    // В модалке показана цена из prompt() и кнопка подтверждения.
    await expect(pageA.locator('#trade-modal-content')).toContainText('50');
    await expect(pageA.locator('#trade-modal-content')).toContainText('СКАНИРОВАТЬ');
  });

  test('IN-02: игрок B сканирует QR продажи и покупает предмет', async ({ pageA, pageB }) => {
    const txId = 'tx_in02';
    await scanDirect(pageB, QR.p2pSell('SELLER', 'food_1', 50, txId));

    const playerB = await new GamePage(pageB).playerState();
    // Покупатель списал 50 кредитов и получил предмет.
    expect(playerB.score).toBe(50);
    expect(playerB.inventory).toContain('food_1');
  });

  test('IN-03: подтверждение сделки игроком A (продавцом)', async ({ pageA, pageB }) => {
    const txId = 'tx_in03';
    await pageA.evaluate(() => {
      const p = eval('player');
      p.inventory = ['food_1'];
    });

    // Покупатель сканирует продажу.
    await scanDirect(pageB, QR.p2pSell('SELLER', 'food_1', 50, txId));
    // Продавец сканирует подтверждение.
    await scanDirect(pageA, QR.p2pConfirm(txId, 50, 'food_1'));

    const playerA = await new GamePage(pageA).playerState();
    // Продавец удалил предмет, получил 50 кредитов и записал txId.
    expect(playerA.inventory).not.toContain('food_1');
    expect(playerA.score).toBe(150);
    expect(playerA.processedTradeTxs[txId]).toBeTruthy();
  });

  test('IN-04: передача предмета от A к B', async ({ pageA, pageB }) => {
    const txId = 'tx_in04';
    await pageA.evaluate(() => {
      const p = eval('player');
      p.inventory = ['food_1'];
    });

    await scanDirect(pageB, QR.p2pSell('SELLER', 'food_1', 50, txId));
    await scanDirect(pageA, QR.p2pConfirm(txId, 50, 'food_1'));

    const playerA = await new GamePage(pageA).playerState();
    const playerB = await new GamePage(pageB).playerState();
    // Предмет перешёл от A к B.
    expect(playerA.inventory).not.toContain('food_1');
    expect(playerB.inventory).toContain('food_1');
  });

  test('IN-05: передача очков от B к A', async ({ pageA, pageB }) => {
    const txId = 'tx_in05';
    await pageA.evaluate(() => {
      const p = eval('player');
      p.inventory = ['food_1'];
    });

    await scanDirect(pageB, QR.p2pSell('SELLER', 'food_1', 50, txId));
    await scanDirect(pageA, QR.p2pConfirm(txId, 50, 'food_1'));

    const playerA = await new GamePage(pageA).playerState();
    const playerB = await new GamePage(pageB).playerState();
    // B заплатил 50, A получил 50.
    expect(playerB.score).toBe(50);
    expect(playerA.score).toBe(150);
  });

  test('IN-06: отмена сделки при недостатке очков', async ({ pageA, pageB }) => {
    const txId = 'tx_in06';
    await pageB.evaluate(() => {
      const p = eval('player');
      p.score = 10;
    });

    await scanDirect(pageB, QR.p2pSell('SELLER', 'food_1', 9999, txId));

    const playerB = await new GamePage(pageB).playerState();
    // Сделка не состоялась: кредиты не изменились, предмет не добавлен.
    expect(playerB.score).toBe(10);
    expect(playerB.inventory).not.toContain('food_1');
  });

  test('IN-07: защита от повторного использования QR', async ({ pageA, pageB }) => {
    const txId = 'tx_in07';
    await pageA.evaluate(() => {
      const p = eval('player');
      p.inventory = ['food_1'];
    });

    await scanDirect(pageB, QR.p2pSell('SELLER', 'food_1', 50, txId));
    await scanDirect(pageA, QR.p2pConfirm(txId, 50, 'food_1'));
    // Повторное подтверждение не должно дублировать передачу.
    await scanDirect(pageA, QR.p2pConfirm(txId, 50, 'food_1'));

    const playerA = await new GamePage(pageA).playerState();
    // Кредиты начислены ровно один раз (100 + 50), предмет удалён один раз.
    expect(playerA.score).toBe(150);
    expect(playerA.inventory.filter((id: string) => id === 'food_1').length).toBe(0);
  });

  test('IN-08: P2P-сделка доступна и в режиме зомби (нет блокировки префикса)', async ({
    pageA,
    pageB,
  }) => {
    const txId = 'tx_in08';
    // Зомби-режим у покупателя.
    await pageB.evaluate(() => {
      const p = eval('player');
      p.zombieTime = Date.now();
    });

    await scanDirect(pageB, QR.p2pSell('SELLER', 'food_1', 50, txId));

    const playerB = await new GamePage(pageB).playerState();
    // Префикс p2ptrade: не входит в zombie-guard, поэтому покупка проходит.
    expect(playerB.score).toBe(50);
    expect(playerB.inventory).toContain('food_1');
  });
});
