import { test, expect } from '../../fixtures/game.fixture';

/**
 * RG-85a..RG-85d — радиоэфир FM-42 (область покрытия `radio`).
 *
 * Покрывает:
 *  - toggleRadio() / updateRadioUI() — включение и отображение статуса;
 *  - registerRadioSecretClick() — счётчик секретных нажатий;
 *  - triggerRadioEasterEgg() — пасхалка «УВБ-76»;
 *  - скан QR-кода `uvb76` — альтернативный вход в пасхалку.
 *
 * `radioTimer` объявлен через `let` в глобальной области, поэтому доступен
 * только через eval(), как и `player`.
 */
test.describe('Regression: радиоэфир FM-42', () => {
  test.beforeEach(async ({ game }) => {
    await game.patchPlayer({
      inBase: false,
      hp: 100,
      zombieTime: 0,
      infectionTime: 0,
      radioOn: false,
      radioMessages: [],
    });
    await game.switchView('scan');
  });

  test('RG-85a: toggleRadio включает радио и обновляет UI', async ({ game }) => {
    await game.page.evaluate(() => (window as any).toggleRadio());

    const player = await game.playerState();
    expect(player.radioOn).toBe(true);

    // Кнопка-переключатель отражает состояние «ВКЛ».
    await expect(game.page.locator('#btn-radio-toggle')).toHaveText('ВКЛ');

    // Повторное переключение выключает радио.
    await game.page.evaluate(() => (window as any).toggleRadio());
    const after = await game.playerState();
    expect(after.radioOn).toBe(false);
    await expect(game.page.locator('#btn-radio-toggle')).toHaveText('ВЫКЛ');
  });

  test('RG-85b: updateRadioUI показывает сообщения эфира', async ({ game }) => {
    await game.patchPlayer({
      radioOn: true,
      radioMessages: ['<div>ТЕСТОВОЕ СООБЩЕНИЕ ЭФИРА</div>'],
    });
    await game.page.evaluate(() => (window as any).updateRadioUI());

    await expect(game.page.locator('#radio-text')).toContainText(
      'ТЕСТОВОЕ СООБЩЕНИЕ ЭФИРА',
    );
  });

  test('RG-85c: 5 секретных нажатий запускают пасхалку УВБ-76', async ({
    game,
  }) => {
    // registerRadioSecretClick() накапливает клики и на 5-м вызывает пасхалку.
    await game.page.evaluate(() => {
      for (let i = 0; i < 5; i++) (window as any).registerRadioSecretClick();
    });

    const player = await game.playerState();
    expect(player.radioOn).toBe(true);

    const radioText = await game.page.locator('#radio-text').innerText();
    expect(radioText).toContain('УВБ-76');
  });

  test('RG-85d: скан кода uvb76 активирует аварийную частоту', async ({
    game,
  }) => {
    await game.page.evaluate(() => (window as any).handleScan('uvb76'));

    const player = await game.playerState();
    expect(player.radioOn).toBe(true);

    const radioText = await game.page.locator('#radio-text').innerText();
    expect(radioText).toContain('УВБ-76');
  });
});
