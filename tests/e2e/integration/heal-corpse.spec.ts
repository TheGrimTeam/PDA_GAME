import { test, expect } from '../../fixtures/two-players.fixture';
import { GamePage } from '../../helpers/game-page';
import { scanDirect } from '../../helpers/scan-helper';
import { QR } from '../../helpers/qr-codes';

/**
 * IN-09..IN-16 — лечение раненого игрока через QR.
 *
 * Реальный протокол (src/js/views/dead.js, src/js/logic/scan.js):
 *  1. Раненый вызывает showHealQR() → pendingHealId = "help_<ts>",
 *     генерируется QR `heal:<pendingHealId>:<callsign>`.
 *  2. Спаситель сканирует `heal:<cId>:<name>` → списывается еда/медикамент
 *     с heal > 0, karma_score++, генерируется `healitem:<cId>:<itemId>:<heal>:<callsign>`.
 *  3. Раненый сканирует `healitem:<txId>:<itemId>:<heal>:<name>` →
 *     hp = max(1, min(maxHp, healAmount)), pendingHealId сбрасывается.
 */
test.describe('Integration: лечение раненого', () => {
  test.beforeEach(async ({ pageA, pageB }) => {
    const a = new GamePage(pageA);
    const b = new GamePage(pageB);
    await a.goto();
    await b.goto();
    await a.patchPlayer({
      inBase: false,
      zombieTime: 0,
      infectionTime: 0,
      hp: 0,
      rads: 0,
      inventory: [],
      karma_score: 0,
      callsign: 'VICTIM',
    });
    await b.patchPlayer({
      inBase: false,
      zombieTime: 0,
      infectionTime: 0,
      hp: 100,
      inventory: ['med_1'],
      karma_score: 0,
      callsign: 'MEDIC',
    });
  });

  /** Раненый показывает QR лечения; возвращает pendingHealId. */
  async function showHealQR(pageA: import('@playwright/test').Page): Promise<string> {
    return pageA.evaluate(() => {
      (window as any).showHealQR();
      return eval('player').pendingHealId as string;
    });
  }

  test('IN-09: раненый генерирует QR лечения', async ({ pageA }) => {
    const cId = await showHealQR(pageA);

    expect(cId).toMatch(/^help_/);
    const playerA = await new GamePage(pageA).playerState();
    expect(playerA.pendingHealId).toBe(cId);
    // QR отрисован.
    const qrHtml = await pageA.locator('#corpse-qr-container').innerHTML();
    expect(qrHtml.length).toBeGreaterThan(0);
  });

  test('IN-10: медик сканирует QR раненого и расходует медикамент', async ({ pageA, pageB }) => {
    const cId = await showHealQR(pageA);

    await scanDirect(pageB, QR.heal(cId, 'VICTIM'));

    const playerB = await new GamePage(pageB).playerState();
    // Медикамент списан, карма повышена.
    expect(playerB.inventory).not.toContain('med_1');
    expect(playerB.karma_score).toBe(1);
  });

  test('IN-11: медик без медикаментов не может помочь', async ({ pageA, pageB }) => {
    const cId = await showHealQR(pageA);
    await pageB.evaluate(() => {
      const p = eval('player');
      p.inventory = [];
    });

    await scanDirect(pageB, QR.heal(cId, 'VICTIM'));

    const playerB = await new GamePage(pageB).playerState();
    // Ничего не списано, карма не изменилась.
    expect(playerB.inventory.length).toBe(0);
    expect(playerB.karma_score).toBe(0);
  });

  test('IN-12: раненый получает HP после лечения', async ({ pageA, pageB }) => {
    const cId = await showHealQR(pageA);

    await scanDirect(pageB, QR.heal(cId, 'VICTIM'));
    await scanDirect(pageA, QR.healItem(cId, 'med_1', 30, 'MEDIC'));

    const playerA = await new GamePage(pageA).playerState();
    // med_1 восстанавливает 30 HP.
    expect(playerA.hp).toBe(30);
    expect(playerA.pendingHealId).toBeNull();
  });

  test('IN-13: лечение не превышает максимум HP', async ({ pageA, pageB }) => {
    const cId = await showHealQR(pageA);
    // Раненый почти полон: 95 HP, аптечка даёт 30 → должно ограничиться maxHp.
    await pageA.evaluate(() => {
      const p = eval('player');
      p.hp = 95;
    });

    await scanDirect(pageB, QR.heal(cId, 'VICTIM'));
    await scanDirect(pageA, QR.healItem(cId, 'med_1', 30, 'MEDIC'));

    const playerA = await new GamePage(pageA).playerState();
    expect(playerA.hp).toBeLessThanOrEqual(100);
    expect(playerA.hp).toBeGreaterThan(0);
  });

  test('IN-14: лечение расходует аптечку медика', async ({ pageA, pageB }) => {
    const cId = await showHealQR(pageA);

    await scanDirect(pageB, QR.heal(cId, 'VICTIM'));

    const playerB = await new GamePage(pageB).playerState();
    expect(playerB.inventory).not.toContain('med_1');
  });

  test('IN-15: лечение невозможно без аптечки', async ({ pageA, pageB }) => {
    const cId = await showHealQR(pageA);
    await pageB.evaluate(() => {
      const p = eval('player');
      p.inventory = [];
    });

    await scanDirect(pageB, QR.heal(cId, 'VICTIM'));

    const playerB = await new GamePage(pageB).playerState();
    expect(playerB.inventory).not.toContain('med_1');
    expect(playerB.karma_score).toBe(0);
  });

  test('IN-16: медик получает +1 кармы за лечение', async ({ pageA, pageB }) => {
    const cId = await showHealQR(pageA);

    await scanDirect(pageB, QR.heal(cId, 'VICTIM'));

    const playerB = await new GamePage(pageB).playerState();
    expect(playerB.karma_score).toBe(1);
  });
});
