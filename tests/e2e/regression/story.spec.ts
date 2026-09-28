import { test, expect } from '../../fixtures/game.fixture';
import { scanDirect } from '../../helpers/scan-helper';

/**
 * ST-01..ST-10 — сюжетная цепочка «Путь к эпицентру» и «Ядро Синтеза».
 * Диалоги alert/confirm синхронно замоканы (helpers/mocks.ts → mockDialogs).
 */
const FRESH_STORY = { stage: 1, q1: {}, q2: [], announced: {}, coordsKnown: false, synthStartedAt: 0, extendedStock: false };

test.describe('Regression: сюжет «Путь к эпицентру»', () => {
  test.beforeEach(async ({ game }) => {
    await game.patchPlayer({
      inBase: false,
      zombieTime: 0,
      infectionTime: 0,
      inventory: [],
      safeBox: [],
      scannedCodes: {},
      hp: 100,
      hunger: 100,
      rads: 0,
      score: 0,
      karma_score: 0,
      equipment: null,
      eqPurchased: {},
      npcRep: { npc_med: 0, npc_eng: 0, npc_trad: 0, npc_bar: 0 },
      story: { ...FRESH_STORY },
    });
  });

  /** Продать предметы NPC через реальный интерфейс торговли */
  async function sellTo(game: any, npc: string, items: string[]): Promise<void> {
    await game.page.evaluate(({ npc, items }: { npc: string; items: string[] }) => {
      const p = eval('player');
      p.inventory = items.slice();
      (window as any).openTrade(npc);
      for (let i = 0; i < items.length; i++) (window as any).sellItem(0, 10);
    }, { npc, items });
  }

  test('ST-01: квест 1 — по 2 профильных предмета каждому NPC, награда репутацией', async ({ game }) => {
    await sellTo(game, 'npc_med', ['med_1', 'med_3']);
    await sellTo(game, 'npc_bar', ['food_1', 'food_2']);
    await sellTo(game, 'npc_eng', ['junk_1', 'junk_2']);
    await sellTo(game, 'npc_trad', ['wpn_1', 'wpn_2']);

    const done = await game.page.evaluate(() => (window as any).isStoryStageDone(1));
    expect(done).toBe(true);

    await game.page.evaluate(() => (window as any).claimStoryReward());
    const player = await game.playerState();
    expect(player.story.stage).toBe(2);
    expect(player.story.extendedStock).toBe(true);
    for (const npc of ['npc_med', 'npc_eng', 'npc_trad', 'npc_bar']) {
      expect(player.npcRep[npc]).toBe(20); // +1 уровень
    }

    // Расширенный ассортимент у торговца
    const stock = await game.page.evaluate(() => {
      (window as any).openTrade('npc_bar');
      return eval('currentTradeStock').length;
    });
    expect(stock).toBe(12);
  });

  test('ST-02: квест 1 — непрофильные продажи не засчитываются', async ({ game }) => {
    await game.page.evaluate(() => {
      const p = eval('player');
      p.inventory = ['food_1', 'food_2'];
      (window as any).openTrade('npc_base'); // база скупает всё, но это не NPC квеста
      (window as any).sellItem(0, 10);
      (window as any).sellItem(0, 10);
    });
    const player = await game.playerState();
    expect(player.story.q1.npc_bar || 0).toBe(0);
  });

  test('ST-03: квест 2 — сдача 10 видов оружия у Сидоровича, награда 5 болтов', async ({ game }) => {
    const weapons = Array.from({ length: 10 }, (_, i) => `wpn_${i + 1}`);
    await game.patchPlayer({ story: { ...FRESH_STORY, stage: 2 }, inventory: [...weapons, 'wpn_1'] });
    await game.page.evaluate(() => {
      (window as any).openTrade('npc_trad');
      (window as any).turnInStoryWeapons();
    });

    let player = await game.playerState();
    expect(player.story.q2.length).toBe(10);
    expect(player.inventory).toEqual(['wpn_1']); // дубликат не сдаётся
    expect(player.score).toBeGreaterThan(0);

    await game.patchPlayer({ inventory: [] });
    await game.page.evaluate(() => (window as any).claimStoryReward());
    player = await game.playerState();
    expect(player.story.stage).toBe(3);
    expect(player.inventory.filter((id: string) => id === 'junk_6')).toHaveLength(5);
  });

  test('ST-04: квест 3 — 3 капсулы энергии по QR на полигонах, награда детектор «Велес»', async ({ game }) => {
    await game.patchPlayer({ story: { ...FRESH_STORY, stage: 3 } });
    for (const c of ['energy_1', 'energy_2', 'energy_3']) await scanDirect(game.page, c);

    let player = await game.playerState();
    expect(player.inventory).toEqual(expect.arrayContaining(['energy_1', 'energy_2', 'energy_3']));

    await game.page.evaluate(() => (window as any).claimStoryReward());
    player = await game.playerState();
    expect(player.story.stage).toBe(4);
    expect(player.equipment).toBe('eq_anom');
    // Капсулы остаются для финала
    expect(player.inventory).toEqual(expect.arrayContaining(['energy_1', 'energy_2', 'energy_3']));
  });

  test('ST-05: квест 3 — если детектор уже покупали, компенсация 1000 💎', async ({ game }) => {
    await game.patchPlayer({
      story: { ...FRESH_STORY, stage: 3 },
      inventory: ['energy_1', 'energy_2', 'energy_3'],
      eqPurchased: { eq_anom: true },
      equipment: 'eq_rad',
      score: 0,
    });
    await game.page.evaluate(() => (window as any).claimStoryReward());
    const player = await game.playerState();
    expect(player.score).toBe(1000);
    expect(player.equipment).toBe('eq_rad');
  });

  test('ST-06: квест 4 — координаты у Доктора, 15 минут синтеза, Ядро', async ({ game }) => {
    await game.patchPlayer({ story: { ...FRESH_STORY, stage: 4 }, inventory: ['energy_1', 'energy_2', 'energy_3'] });

    // Без координат станция не запускается
    await scanDirect(game.page, 'lab_synth');
    let player = await game.playerState();
    expect(player.story.synthStartedAt).toBe(0);

    await game.page.evaluate(() => (window as any).openTrade('npc_med'));
    await scanDirect(game.page, 'lab_synth');
    player = await game.playerState();
    expect(player.story.coordsKnown).toBe(true);
    expect(player.story.synthStartedAt).toBeGreaterThan(0);

    // Раньше времени — Ядра нет
    await scanDirect(game.page, 'lab_synth');
    player = await game.playerState();
    expect(player.inventory).not.toContain('anom_4');

    // Прошло 15 минут
    await game.page.evaluate(() => { eval('player').story.synthStartedAt = Date.now() - 15 * 60 * 1000 - 1000; });
    await scanDirect(game.page, 'lab_synth');
    player = await game.playerState();
    expect(player.inventory).toEqual(['anom_4']);
    expect(player.story.stage).toBe(5);
    expect(player.hunger).toBe(150);
  });

  test('ST-07: синтез срывается при возвращении на Базу', async ({ game }) => {
    await game.patchPlayer({
      story: { ...FRESH_STORY, stage: 4, coordsKnown: true, synthStartedAt: Date.now() },
      inventory: ['energy_1', 'energy_2', 'energy_3'],
      inBase: true,
    });
    await game.page.evaluate(() => (window as any).storyTick());
    const player = await game.playerState();
    expect(player.story.synthStartedAt).toBe(0);
  });

  test('ST-08: Ядро Синтеза — +50 HP и сытости только в рюкзаке', async ({ game }) => {
    const base = await game.page.evaluate(() => [(window as any).getMaxHp(), (window as any).getMaxHunger()]);
    await game.patchPlayer({ inventory: ['anom_4'] });
    const withCore = await game.page.evaluate(() => [(window as any).getMaxHp(), (window as any).getMaxHunger()]);
    expect(withCore[0]).toBe(base[0] + 50);
    expect(withCore[1]).toBe(base[1] + 50);

    await game.patchPlayer({ inventory: [], safeBox: ['anom_4'] });
    const inSafe = await game.page.evaluate(() => [(window as any).getMaxHp(), (window as any).getMaxHunger()]);
    expect(inSafe).toEqual(base);
  });

  test('ST-09: смерть с Ядром — 100% заражение, медикаменты не лечат', async ({ game }) => {
    await game.patchPlayer({ inventory: ['anom_4', 'med_1'] });
    await game.page.evaluate(() => {
      Math.random = () => 0.99; // обычный шанс заражения не сработал бы
      const p = eval('player');
      p.hp = 0;
      (window as any).checkDeathState();
    });
    let player = await game.playerState();
    expect(player.infectionTime).toBeGreaterThan(0);

    await game.page.evaluate(() => {
      const p = eval('player');
      p.hp = 50;
      p.isCurrentlyDead = false;
      (window as any).useMedkit(1, 'med_1', false);
    });
    player = await game.playerState();
    expect(player.infectionTime).toBeGreaterThan(0); // вирус не купирован
  });

  test('ST-10: сюжетные предметы нельзя получить сканированием', async ({ game }) => {
    for (const code of ['anom_4', 'energy_1']) await scanDirect(game.page, code);
    const player = await game.playerState();
    expect(player.inventory).toEqual([]);
    expect(player.hp).toBe(100); // anom_4 не обрабатывается как полевая аномалия
  });

  test('ST-11: капсулы засчитываются и в подсумке; повторный скан не дублирует', async ({ game }) => {
    await game.patchPlayer({ story: { ...FRESH_STORY, stage: 3 }, safeBoxUnlocked: true, safeBox: ['energy_1', 'energy_2'] });
    await scanDirect(game.page, 'energy_1'); // уже есть в подсумке
    await scanDirect(game.page, 'energy_3');
    const player = await game.playerState();
    expect(player.inventory).toEqual(['energy_3']);
    expect(await game.page.evaluate(() => (window as any).isStoryStageDone(3))).toBe(true);
  });

  test('ST-12: синтез забирает капсулы и из рюкзака, и из подсумка', async ({ game }) => {
    await game.patchPlayer({
      story: { ...FRESH_STORY, stage: 4, coordsKnown: true, synthStartedAt: Date.now() - 16 * 60 * 1000 },
      inventory: ['energy_1'],
      safeBoxUnlocked: true,
      safeBox: ['energy_2', 'energy_3'],
    });
    await scanDirect(game.page, 'lab_synth');
    const player = await game.playerState();
    expect(player.inventory).toEqual(['anom_4']);
    expect(player.safeBox).toEqual([]);
  });

  test('ST-13: аномалии больше не выдают капсулы', async ({ game }) => {
    await game.patchPlayer({ story: { ...FRESH_STORY, stage: 3 } });
    await game.page.evaluate(() => { Math.random = () => 0.1; });
    await scanDirect(game.page, 'anom_1');
    const player = await game.playerState();
    expect(player.inventory.some((id: string) => id.startsWith('energy_'))).toBe(false);
  });

  test('ST-14: сюжетные предметы не попадают в обычные контракты', async ({ game }) => {
    const bad = await game.page.evaluate(() => {
      const db = eval('ITEMS_DB');
      const found: string[] = [];
      for (let i = 0; i < 500; i += 1) {
        const q = (window as any).createRandomQuest();
        for (const id of Object.keys(q.requirements)) if (db[id].cat === 'quest' || db[id].noScan) found.push(id);
      }
      return found;
    });
    expect(bad).toEqual([]);
  });

  test('ST-15: контракты старых версий с капсулами вычищаются при загрузке', async ({ game }) => {
    await game.page.evaluate(() => {
      const p = eval('player');
      p.quests.choices = [{ id: 'old', name: 'Заказ', requirements: { energy_2: 1 }, target: 'npc_med', reward: 0 }];
      p.quests.active = [{ id: 'old2', name: 'Заказ', requirements: { energy_1: 1 }, target: 'npc_med', reward: 0 }];
      localStorage.setItem('wasteland_player', JSON.stringify(p));
    });
    await game.page.reload();
    await game.page.waitForFunction(() => typeof (window as any).switchView === 'function');
    const player = await game.playerState();
    const ids = [...player.quests.choices, ...player.quests.active].flatMap((q: any) => Object.keys(q.requirements));
    expect(ids.some((id: string) => id.startsWith('energy_'))).toBe(false);
    expect(player.quests.choices.length).toBe(5);
  });
});
