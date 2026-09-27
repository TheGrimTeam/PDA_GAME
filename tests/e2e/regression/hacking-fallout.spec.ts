import { test, expect } from '../../fixtures/game.fixture';
import { scanDirect } from '../../helpers/scan-helper';

/**
 * RG-78..RG-85 — взлом в стиле Fallout, схроны, повторная попытка в аномалиях, звуки.
 */
test.describe('Regression: взлом (Fallout), схроны, аномалии, звук', () => {
  test.beforeEach(async ({ game }) => {
    await game.patchPlayer({
      inBase: false,
      zombieTime: 0,
      infectionTime: 0,
      inventory: [],
      scannedCodes: {},
      score: 0,
      hp: 100,
      karma_score: 0,
      equipment: null,
    });
  });

  test('RG-78: сложность зависит от устройства (usb/term/safe)', async ({ game }) => {
    const expected: Record<string, [number, number]> = { usb_1: [5, 8], term_1: [6, 10], safe_1: [8, 12] };
    for (const [code, [len, count]] of Object.entries(expected)) {
      await scanDirect(game.page, code);
      await game.expectViewActive('hacking');
      const words: string[] = await game.page.evaluate(() => eval('hackWordsList'));
      expect(words).toHaveLength(count);
      expect(words.every((w) => w.length === len)).toBe(true);
      // Все слова реально видны в дампе
      const dump = await game.page.locator('#hack-words-grid').innerText();
      for (const w of words) expect(dump).toContain(w);
    }
  });

  test('RG-79: неверное слово помечается совпадением прямо в дампе', async ({ game }) => {
    await scanDirect(game.page, 'term_2');
    const { wrong, likeness } = await game.page.evaluate(() => {
      const secret = eval('hackSecretWord');
      const wrong = eval('hackWordsList').find((w: string) => w !== secret);
      return { wrong, likeness: (window as any).hackLikeness(wrong, secret) };
    });
    await game.page.locator('.hk-word', { hasText: wrong }).click();

    await expect(game.page.locator('.hk-tried')).toHaveText(`${wrong}${likeness}`);
    await expect(game.page.locator('#hack-console')).toContainText(`Совпадение: ${likeness}/6`);
    await expect(game.page.locator('#hack-candidates')).toContainText('Подходят');
  });

  test('RG-80: скобки убирают ложное слово или восстанавливают попытки', async ({ game }) => {
    await scanDirect(game.page, 'usb_2');
    await game.page.evaluate(() => { Math.random = () => 0.1; }); // ветка «убрать ложное слово»
    const br = game.page.locator('.hk-br').first();
    await br.click();
    const removed = await game.page.evaluate(() => Object.keys(eval('hackRemoved')));
    expect(removed).toHaveLength(1);
    const secret = await game.page.evaluate(() => eval('hackSecretWord'));
    expect(removed[0]).not.toBe(secret);
  });

  test('RG-81: вскрытие схрона (safe_) снижает Карму, флешка — нет', async ({ game }) => {
    await scanDirect(game.page, 'safe_7');
    await game.page.evaluate(() => (window as any).submitHackWord(eval('hackSecretWord')));
    let player = await game.playerState();
    expect(player.karma_score).toBe(-1);

    await scanDirect(game.page, 'usb_7');
    await game.page.evaluate(() => (window as any).submitHackWord(eval('hackSecretWord')));
    player = await game.playerState();
    expect(player.karma_score).toBe(-1);
  });

  test('RG-82: неудача в аномалии не разряжает её — можно пробовать снова', async ({ game }) => {
    await game.page.evaluate(() => { Math.random = () => 0.9; }); // провал
    await scanDirect(game.page, 'anom_1');
    let player = await game.playerState();
    expect(player.scannedCodes['anom_1']).toBeUndefined();

    await game.page.evaluate(() => { Math.random = () => 0.1; }); // успех
    await scanDirect(game.page, 'anom_1');
    player = await game.playerState();
    expect(player.inventory.some((id: string) => id.startsWith('art_'))).toBe(true);
    expect(player.scannedCodes['anom_1']).toBeGreaterThan(0);
  });

  test('RG-83: нет места в рюкзаке — аномалия не разряжается', async ({ game }) => {
    // Забиваем рюкзак под завязку тяжёлыми предметами
    await game.page.evaluate(() => {
      const p = eval('player');
      const db = eval('ITEMS_DB');
      const heavy = Object.keys(db).filter((k) => db[k].cat === 'weapon');
      p.inventory = [];
      let size = 0;
      for (const id of heavy) {
        if (size + db[id].size > p.maxSize) continue;
        p.inventory.push(id); size += db[id].size;
      }
      while (size < p.maxSize) { p.inventory.push('junk_1'); size += db['junk_1'].size; }
      Math.random = () => 0.1;
    });
    await scanDirect(game.page, 'anom_2');
    const player = await game.playerState();
    expect(player.scannedCodes['anom_2']).toBeUndefined();
    await expect(game.page.locator('#scan-result')).toContainText('можно попробовать');
  });

  test('RG-84: все звуковые сигналы воспроизводятся без ошибок', async ({ game }) => {
    const errors = await game.page.evaluate(() => {
      const sounds = eval('SOUNDS');
      const failed: string[] = [];
      for (const k of Object.keys(sounds)) {
        try { sounds[k](); } catch (e) { failed.push(k + ': ' + e); }
      }
      return { failed, count: Object.keys(sounds).length };
    });
    expect(errors.failed).toEqual([]);
    expect(errors.count).toBeGreaterThanOrEqual(14);
  });

  test('RG-85: возрождение не ломает принятие контрактов', async ({ game }) => {
    await game.page.evaluate(() => {
      const p = eval('player');
      p.hp = 0;
      (window as any).checkDeathState();
      (window as any).handleDeadScan('npc_base');
    });
    await game.switchView('quests');
    await game.page.evaluate(() => (window as any).acceptQuest(0));
    const player = await game.playerState();
    expect(player.quests.active).toHaveLength(1);
  });
});
