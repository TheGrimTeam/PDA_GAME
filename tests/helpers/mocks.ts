import { Page } from '@playwright/test';

/** Заглушка Html5Qrcode: камера не запускается, сканирование не происходит. */
export async function mockQrScanner(page: Page): Promise<void> {
  await page.addInitScript(() => {
    class FakeHtml5Qrcode {
      constructor(_el: string) {}
      start(_cfg: unknown, _opts: unknown, _onSuccess: unknown, _onError: unknown) {
        return Promise.resolve();
      }
      stop() {
        return Promise.resolve();
      }
      clear() {
        return Promise.resolve();
      }
      static getCameras() {
        return Promise.resolve([]);
      }
    }
    (window as any).Html5Qrcode = FakeHtml5Qrcode;
  });
}

/** Детерминированный Math.random (mulberry32). */
export async function mockRandom(page: Page, seed = 42): Promise<void> {
  await page.addInitScript((s: number) => {
    let a = s >>> 0;
    Math.random = () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }, seed);
}

/** Заглушка AudioContext (без звука). */
export async function mockAudio(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as any).AudioContext = class {
      state = 'running';
      currentTime = 0;
      destination = {};
      createOscillator() {
        return {
          connect() {},
          start() {},
          stop() {},
          frequency: { setValueAtTime() {} },
          type: '',
        };
      }
      createGain() {
        return {
          connect() {},
          gain: { setValueAtTime() {}, linearRampToValueAtTime() {} },
        };
      }
      createBiquadFilter() {
        return { connect() {}, frequency: { setValueAtTime() {} }, type: '' };
      }
      resume() {
        return Promise.resolve();
      }
    };
  });
}

/** Комплексная подготовка страницы: моки камеры, аудио и PRNG. */
export async function applyDefaultMocks(page: Page, seed = 42): Promise<void> {
  await mockQrScanner(page);
  await mockAudio(page);
  await mockRandom(page, seed);
}
