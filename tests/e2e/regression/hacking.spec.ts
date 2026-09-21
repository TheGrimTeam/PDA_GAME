import { test, expect } from '../../fixtures/game.fixture';
import { scanDirect } from '../../helpers/scan-helper';

/**
 * RG-43..RG-47 — взлом терминалов.
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
    });
  });

  test('RG-43: запуск взлома по safe_', async ({ game }) => {
    await scanDirect(game.page, 'safe_1');

    await game.expectViewActive('hacking');
    await expect(game.page.locator('#hack-words-grid')).not.toBeEmpty();
  });

  test('RG-44: верный ключ даёт награду', async ({ game }) => {
    await scanDirect(game.page, 'safe_2');
    await game.expectViewActive('hacking');

    // hackSecretWord объявлен через `let` в глобальной области — читаем через eval.
    const secret = await game.page.evaluate(() => eval('hackSecretWord'));
    const before = await game.playerState();
    await game.page.evaluate((w) => (window as any).submitHackWord(w), secret);
    const after = await game.playerState();

    // Верный ключ начисляет награду (300..600 💎 для safe_).
    expect(after.score).toBeGreaterThan(before.score);
  });

  test('RG-45: неверный ключ снижает попытки', async ({ game }) => {
    await scanDirect(game.page, 'safe_3');
    await game.expectViewActive('hacking');

    const before = await game.page.locator('#hack-attempts').innerText();
    await game.page.evaluate(() => (window as any).submitHackWord('НЕВЕРНОЕ_СЛОВО'));
    const after = await game.page.locator('#hack-attempts').innerText();

    expect(after).not.toBe(before);
  });

  test('RG-46: исчерпание попыток блокирует код', async ({ game }) => {
    await scanDirect(game.page, 'safe_4');
    await game.expectViewActive('hacking');

    for (let i = 0; i < 4; i += 1) {
      await game.page.evaluate(() => (window as any).submitHackWord('НЕВЕРНО'));
    }

    const player = await game.playerState();
    // Код помечен как заблокированный/проваленный.
    const blocked =
      player.scannedCodes?.['safe_4'] !== undefined ||
      player.hackBlocked?.['safe_4'] !== undefined;
    expect(blocked).toBe(true);
  });

  test('RG-47: прерывание взлома abortHacking', async ({ game }) => {
    await scanDirect(game.page, 'safe_5');
    await game.expectViewActive('hacking');

    game.page.on('dialog', (d) => d.accept());
    await game.page.evaluate(() => (window as any).abortHacking());

    await game.expectViewActive('scan');
  });
});
