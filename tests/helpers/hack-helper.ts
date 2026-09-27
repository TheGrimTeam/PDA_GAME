import type { Page } from '@playwright/test';

/**
 * Хелперы мини-игр взлома.
 *   usb_  — «Синхронизация» (src/js/logic/hack-sync.js)
 *   term_ — «Отмычка»       (src/js/logic/hack-lockpick.js)
 *   safe_ — «Подбор кода»   (src/js/logic/hack-words.js)
 * Состояние меняется внутри одного evaluate, поэтому анимация не успевает вмешаться.
 */

/** Синхронизация: попадание в зелёную зону текущего уровня */
export async function hackHit(page: Page): Promise<void> {
  const level = await page.evaluate(() => {
    const zone = eval('hackZone');
    eval('hackPaused = false; hackPos = ' + (zone.start + zone.width / 2));
    const lvl = eval('hackLevel');
    (window as any).hackSync();
    return lvl;
  });
  // После попадания уровень меняется с задержкой (пауза для игрока)
  await page.waitForFunction((lvl) => eval('hackFinished') || eval('hackLevel') > lvl, level);
}

/** Синхронизация: промах мимо зелёной зоны */
export async function hackMiss(page: Page): Promise<void> {
  await page.evaluate(() => {
    const zone = eval('hackZone');
    const pos = zone.start > 50 ? 0 : 100;
    eval('hackPaused = false; hackPos = ' + pos);
    (window as any).hackSync();
  });
}

/** Синхронизация: пройти все 3 уровня */
export async function syncWin(page: Page): Promise<void> {
  for (let i = 0; i < 3; i += 1) await hackHit(page);
}

/** Отмычка: выставить угол и держать «ПОВЕРНУТЬ» заданное число секунд (шаги физики вручную) */
export async function lockHold(page: Page, angle: number | 'sweet' | 'far', seconds: number): Promise<void> {
  await page.evaluate(({ angle, seconds }) => {
    const sweet = eval('lockSweet');
    const a = angle === 'sweet' ? sweet : angle === 'far' ? (sweet > 90 ? 0 : 180) : angle;
    eval('lockTurning = false; lockRot = 0');
    (window as any).lockSetAngle(a);
    (window as any).lockTurnStart();
    for (let t = 0; t < seconds && !eval('hackFinished'); t += 0.05) (window as any).lockStep(0.05);
    (window as any).lockTurnEnd();
  }, { angle, seconds });
}

/** Подбор кода: ввести верное слово */
export async function wordsWin(page: Page): Promise<void> {
  await page.evaluate(() => (window as any).submitHackWord(eval('hackSecretWord')));
}

/** Подбор кода: ввести неверное слово из дампа */
export async function wordsWrong(page: Page): Promise<string> {
  return page.evaluate(() => {
    const secret = eval('hackSecretWord');
    const tried = eval('hackTried');
    const w = eval('hackWordsList').find((x: string) => x !== secret && tried[x] === undefined);
    (window as any).submitHackWord(w);
    return w;
  });
}
