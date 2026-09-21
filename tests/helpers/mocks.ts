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
    // Полный набор методов AudioParam, используемых в audio.js:
    // setValueAtTime, linearRampToValueAtTime, exponentialRampToValueAtTime,
    // setTargetAtTime, cancelScheduledValues, cancelAndHoldAtTime.
    const makeParam = (value = 0) => ({
      value,
      defaultValue: value,
      minValue: -3.4028235e38,
      maxValue: 3.4028235e38,
      setValueAtTime() {},
      linearRampToValueAtTime() {},
      exponentialRampToValueAtTime() {},
      setTargetAtTime() {},
      setValueCurveAtTime() {},
      cancelScheduledValues() {},
      cancelAndHoldAtTime() {},
    });

    const makeNode = () => ({
      connect() {},
      disconnect() {},
      start() {},
      stop() {},
      type: '',
      frequency: makeParam(440),
      detune: makeParam(0),
      gain: makeParam(1),
      Q: makeParam(1),
      playbackRate: makeParam(1),
      buffer: null,
      loop: false,
      onended: null,
    });

    (window as any).AudioContext = class {
      state = 'running';
      currentTime = 0;
      sampleRate = 44100;
      destination = makeNode();
      createOscillator() {
        return makeNode();
      }
      createGain() {
        return makeNode();
      }
      createBiquadFilter() {
        return makeNode();
      }
      createBufferSource() {
        return makeNode();
      }
      createBuffer(_ch: number, length: number, _rate: number) {
        return { length, getChannelData: () => new Float32Array(length) };
      }
      createDynamicsCompressor() {
        return makeNode();
      }
      createStereoPanner() {
        return makeNode();
      }
      createWaveShaper() {
        return makeNode();
      }
      createDelay() {
        return makeNode();
      }
      createConvolver() {
        return makeNode();
      }
      createAnalyser() {
        return makeNode();
      }
      resume() {
        return Promise.resolve();
      }
      suspend() {
        return Promise.resolve();
      }
      close() {
        return Promise.resolve();
      }
    };
    // Safari/webkit-совместимый алиас.
    (window as any).webkitAudioContext = (window as any).AudioContext;
  });
}

/**
 * Синхронная заглушка нативных диалогов браузера.
 *
 * ВАЖНО: `page.on('dialog', ...)` НЕ подходит для кода, который вызывает
 * `confirm()`/`prompt()`/`alert()` внутри `page.evaluate()`: нативный диалог
 * блокирует JS-поток, Playwright не успевает доставить асинхронное событие
 * `dialog`, и `confirm()` возвращает `false` (диалог «отменяется»).
 * Поэтому подменяем сами функции синхронно через addInitScript.
 *
 * @param confirmValue  что возвращает confirm() (по умолчанию true)
 * @param promptValue   что возвращает prompt() (по умолчанию '50')
 */
export async function mockDialogs(
  page: Page,
  confirmValue = true,
  promptValue = '50'
): Promise<void> {
  await page.addInitScript(
    ([cv, pv]: [boolean, string]) => {
      (window as any).confirm = () => cv;
      (window as any).alert = () => undefined;
      (window as any).prompt = () => pv;
    },
    [confirmValue, promptValue] as [boolean, string]
  );
}

/** Комплексная подготовка страницы: моки камеры, аудио, PRNG и диалогов. */
export async function applyDefaultMocks(page: Page, seed = 42): Promise<void> {
  await mockQrScanner(page);
  await mockAudio(page);
  await mockRandom(page, seed);
  await mockDialogs(page);
}
