import type { Page } from '@playwright/test';

/**
 * Хелперы мини-игры «Синхронизация» (src/js/logic/hacking.js).
 * Бегунок ставится в нужную позицию и сразу вызывается hackSync() —
 * внутри одного evaluate кадр анимации не успевает сдвинуть бегунок.
 */

/** Попадание в зелёную зону текущего уровня */
export async function hackHit(page: Page): Promise<void> {
  const level = await page.evaluate(() => {
    const zone = eval('hackZone');
    eval('hackPaused = false; hackPos = ' + (zone.start + zone.width / 2));
    const lvl = eval('hackLevel');
    (window as any).hackSync();
    return lvl;
  });
  // После попадания уровень меняется с задержкой (пауза для игрока)
  await page.waitForFunction(
    (lvl) => eval('hackFinished') || eval('hackLevel') > lvl,
    level,
  );
}

/** Промах мимо зелёной зоны */
export async function hackMiss(page: Page): Promise<void> {
  await page.evaluate(() => {
    const zone = eval('hackZone');
    const pos = zone.start > 50 ? 0 : 100;
    eval('hackPaused = false; hackPos = ' + pos);
    (window as any).hackSync();
  });
}

/** Пройти все 3 уровня */
export async function hackWin(page: Page): Promise<void> {
  for (let i = 0; i < 3; i += 1) await hackHit(page);
}
