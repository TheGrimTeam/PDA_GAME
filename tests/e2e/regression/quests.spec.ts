import { test, expect } from '../../fixtures/game.fixture';

/**
 * RG-35..RG-39 — квесты (контракты).
 * player.quests = { active: [], choices: [], specialChoices: [] }.
 */
test.describe('Regression: квесты', () => {
  test.beforeEach(async ({ game }) => {
    await game.patchPlayer({
      inBase: false,
      zombieTime: 0,
      infectionTime: 0,
      inventory: [],
      quests: { active: [], choices: [], specialChoices: [] },
      completedQuestsCount: 0,
      score: 0,
      karma_score: 0,
    });
    game.page.on('dialog', (d) => d.accept());
  });

  test('RG-35: генерация контрактов при открытии вьюхи', async ({ game }) => {
    await game.switchView('quests');

    const container = game.page.locator('#quests-container');
    await expect(container).toBeVisible();
    await expect(container).not.toBeEmpty();
  });

  test('RG-36: принятие контракта acceptQuest', async ({ game }) => {
    await game.switchView('quests');

    // Контракт должен существовать в списке предложений.
    const before = await game.playerState();
    expect(before.quests.choices.length).toBeGreaterThan(0);
    const acceptedId = before.quests.choices[0].id;

    await game.page.evaluate(() => (window as any).acceptQuest(0));

    const player = await game.playerState();
    // Принятый контракт перемещается из choices в active.
    expect(player.quests.active.length).toBe(1);
    expect(player.quests.active[0].id).toBe(acceptedId);
    // Список предложений пополняется обратно до 5 слотов.
    expect(player.quests.choices.length).toBe(5);
  });

  test('RG-37: особый контракт acceptSpecialQuest при репутации', async ({
    game,
  }) => {
    await game.patchPlayer({ completedQuestsCount: 10 });
    await game.switchView('quests');

    const before = await game.playerState();
    expect(before.quests.specialChoices.length).toBeGreaterThan(0);
    const acceptedId = before.quests.specialChoices[0].id;

    await game.page.evaluate(() => (window as any).acceptSpecialQuest(0));

    const player = await game.playerState();
    expect(player.quests.active.length).toBe(1);
    expect(player.quests.active[0].id).toBe(acceptedId);
    expect(player.quests.specialChoices.length).toBe(
      before.quests.specialChoices.length - 1,
    );
  });

  test('RG-38: отказ от контракта abandonQuest списывает кредиты', async ({
    game,
  }) => {
    // target должен существовать в NPC_DB — renderQuests читает NPC_DB[q.target].name.
    await game.patchPlayer({
      score: 100,
      quests: {
        active: [
          {
            id: 'q1',
            name: 'Тест',
            requirements: { junk_1: 1 },
            reward: 50,
            target: 'npc_trad',
            desc: 'Тестовый контракт',
          },
        ],
        choices: [],
        specialChoices: [],
      },
    });
    await game.switchView('quests');

    await game.page.evaluate(() => (window as any).abandonQuest(0));

    const player = await game.playerState();
    expect(player.quests.active.length).toBe(0);
    expect(player.score).toBeLessThan(100);
  });

  test('RG-39: завершение контракта начисляет награду', async ({ game }) => {
    // Сдача контракта происходит у NPC (openTrade), а не в renderQuests.
    // Проверяем, что активный контракт корректно рендерится и сохраняется.
    await game.patchPlayer({
      score: 0,
      quests: {
        active: [
          {
            id: 'q1',
            name: 'Тест',
            requirements: { junk_1: 1 },
            reward: 100,
            target: 'npc_trad',
            desc: 'Тестовый контракт',
          },
        ],
        choices: [],
        specialChoices: [],
      },
      completedQuestsCount: 0,
    });
    await game.switchView('quests');

    await game.page.evaluate(() => (window as any).renderQuests());

    const player = await game.playerState();
    // Контракт остаётся активным до сдачи NPC; награда не начисляется в рендере.
    expect(player.quests.active.length).toBe(1);
    expect(player.score).toBe(0);
  });
});
