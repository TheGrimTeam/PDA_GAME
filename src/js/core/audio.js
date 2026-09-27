// ============================================================
// АУДИО ДВИЖОК (Web Audio API, процедурный синтез)
// ============================================================

const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = new AudioContext();

function tryResumeAudio() {
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

document.body.addEventListener('click', tryResumeAudio, { once: true });
document.body.addEventListener('touchstart', tryResumeAudio, { once: true });

// === ДИНАМИЧЕСКИЙ ГЕЙГЕР И СЕРДЦЕБИЕНИЕ (OFFLINE СИНТЕЗ) ===
let geigerTimer = null;
function playGeigerClick() {
    if (!audioCtx || audioCtx.state === 'suspended' || player.inBase || player.hp <= 0) return;
    // Настоящий счётчик Гейгера трещит, а не пищит: короткий шумовой щелчок
    noiseBurst(0, 0.006, 0.12, 3000);
}

function runGeigerLoop() {
    if (geigerTimer) clearTimeout(geigerTimer);
    if (player.hp <= 0 || player.inBase || !player.rads || player.rads <= 0) {
        geigerTimer = setTimeout(runGeigerLoop, 5000);
        return;
    }
    playGeigerClick();
    let r = player.rads;
    let minDelay, maxDelay;
    // Пороги — доли от потолка радиации MAX_RADS
    if (r < MAX_RADS * 0.25) {
        minDelay = 8000; maxDelay = 24000; // Очень редкие одиночные щелчки (раз в 8-24 сек)
    } else if (r < MAX_RADS * 0.5) {
        minDelay = 3600; maxDelay = 10000; // Редкий предупреждающий треск (раз в 4-10 сек)
    } else if (r < MAX_RADS * 0.75) {
        minDelay = 1600; maxDelay = 4400;  // Умеренные щелчки (раз в 2-4 сек)
    } else {
        minDelay = 500; maxDelay = 1400;   // Заметный треск при сильном заражении (раз в 0.5 - 1.4 сек)
    }
    let nextDelay = Math.random() * (maxDelay - minDelay) + minDelay;
    geigerTimer = setTimeout(runGeigerLoop, nextDelay);
}

let heartbeatTimer = null;
function playHeartbeatBeat(freq, vol) {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.28);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
}

function runHeartbeatLoop() {
    if (heartbeatTimer) clearTimeout(heartbeatTimer);
    if (player.hp <= 0 || player.hp > 25 || player.inBase) {
        heartbeatTimer = setTimeout(runHeartbeatLoop, 1500);
        return;
    }
    playHeartbeatBeat(58, 0.12);
    setTimeout(() => {
        playHeartbeatBeat(53, 0.09);
    }, 220);
    let interval = 1300;
    if (player.hp <= 12) interval = 750; // Паника!
    heartbeatTimer = setTimeout(runHeartbeatLoop, interval);
}

// === RETRO BIOS BOOT SEQUENCE ===
function playRetroBeep() {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    tone(950, 0, 0.05, { type: 'triangle', vol: 0.02 });
}

function runBootSequence() {
    let bootScreen = document.getElementById('bios-boot');
    if (bootScreen) {
        bootScreen.style.transition = 'none';
        bootScreen.style.opacity = 1;
        bootScreen.style.display = 'flex';
    }
    let el = document.getElementById('bios-text');
    if (!el) return;
    let biosLines = [
        "GRIM-NET BOOTLOADER V4.15",
        "COPYRIGHT (C) 2084 GRIM CORP.",
        "------------------------------------",
        "CPU: GRIM-TX80 @ 12MHz... OK",
        "RAM: 64KB MEMORY ADDR STABLE... OK",
        "NVRAM STORAGE CHIP LOADED... OK",
        "GEIGER RADIATION SCANNER... OK",
        "RADIO FM-42 TUNING ANTENNA... OK",
        "LOADED USER PROFILE CALLSIGN: " + player.callsign,
        "STATUS: OUTPOST OFFLINE MESH ENABLED",
        "------------------------------------",
        "BOOT COMPLETE. LAUNCHING SHELL INTERFACE..."
    ];

    let lineIdx = 0;
    el.innerHTML = "";

    function printLine() {
        if (lineIdx < biosLines.length) {
            el.innerHTML += biosLines[lineIdx] + "<br>";
            lineIdx++;
            playRetroBeep();
            setTimeout(printLine, 120 + Math.random() * 100);
        } else {
            setTimeout(() => {
                let bootScreen = document.getElementById('bios-boot');
                if (bootScreen) {
                    bootScreen.style.transition = 'opacity 0.6s ease';
                    bootScreen.style.opacity = 0;
                    setTimeout(() => { bootScreen.style.display = 'none'; }, 600);
                }
            }, 600);
        }
    }
    setTimeout(printLine, 200);
}

// ============================================================
// ЗВУКОВЫЕ СИГНАЛЫ ПДА
// ============================================================
// Все сигналы мягкие (синус/треугольник с плавной атакой) и проходят через
// общий регулятор громкости и фильтр, срезающий резкие верха.
// У каждого события своя «интонация», чтобы понимать его не глядя на экран:
//   вверх  — хорошо (подбор, покупка, лечение, квест)
//   вниз   — плохо / отказ (ошибка, карма, смерть)
//   пульс  — опасность (урон, аномалия, выброс)
// ============================================================

const SOUND_MASTER_VOLUME = 0.7;
let soundOut = null;

// Общий выход: мягкий low-pass + мастер-громкость
function getSoundOut() {
    if (soundOut) return soundOut;
    let filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 3200;
    let master = audioCtx.createGain();
    master.gain.value = SOUND_MASTER_VOLUME;
    filter.connect(master);
    master.connect(audioCtx.destination);
    soundOut = filter;
    return soundOut;
}

// Одна нота: плавная атака 12 мс и затухание, без щелчков
function tone(freq, delay, dur, opts = {}) {
    let t = audioCtx.currentTime + delay;
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (opts.glideTo) osc.frequency.exponentialRampToValueAtTime(opts.glideTo, t + dur);
    let vol = opts.vol || 0.08;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(getSoundOut());
    osc.start(t);
    osc.stop(t + dur + 0.03);
}

// Короткий отфильтрованный шум (эфир, щелчок затвора)
function noiseBurst(delay, dur, vol, freq) {
    let t = audioCtx.currentTime + delay;
    let len = Math.max(1, Math.floor(audioCtx.sampleRate * dur));
    let buffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    let data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    let src = audioCtx.createBufferSource();
    src.buffer = buffer;
    let band = audioCtx.createBiquadFilter();
    band.type = 'bandpass'; band.frequency.value = freq || 1500; band.Q.value = 1.0;
    let gain = audioCtx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(band); band.connect(gain); gain.connect(getSoundOut());
    src.start(t);
}

// Ноты (Гц)
const NOTE = { C4: 261.6, E4: 329.6, G4: 392.0, Eb4: 311.1, A4: 440.0, C5: 523.3, D5: 587.3, E5: 659.3, G5: 784.0, A5: 880.0, B5: 987.8, C6: 1046.5 };

const SOUNDS = {
    // Подбор предмета / успешный скан: короткий светлый «блип» вверх
    scan:    () => { tone(NOTE.A5, 0, 0.08, { type: 'triangle', vol: 0.06 }); tone(NOTE.E5 * 2, 0.06, 0.09, { vol: 0.04 }); },
    // Нажатие / выбор: едва слышный тик
    click:   () => tone(NOTE.A5, 0, 0.04, { type: 'triangle', vol: 0.03 }),
    // Использование предмета: две ноты вверх
    use:     () => { tone(NOTE.C5, 0, 0.12, { vol: 0.07 }); tone(NOTE.G5, 0.1, 0.18, { vol: 0.06 }); },
    // Лечение: тёплый мажорный аккорд вверх
    heal:    () => { tone(NOTE.C5, 0, 0.2, { vol: 0.06 }); tone(NOTE.E5, 0.08, 0.22, { vol: 0.05 }); tone(NOTE.G5, 0.16, 0.3, { vol: 0.05 }); },
    // Деньги: «звон монет» — быстрое трезвучие
    sell:    () => { tone(NOTE.E5, 0, 0.08, { type: 'triangle', vol: 0.06 }); tone(NOTE.G5, 0.07, 0.08, { type: 'triangle', vol: 0.06 }); tone(NOTE.B5, 0.14, 0.16, { type: 'triangle', vol: 0.05 }); },
    // Квест / достижение: короткие фанфары
    quest:   () => { [NOTE.C5, NOTE.E5, NOTE.G5].forEach((f, i) => tone(f, i * 0.09, 0.12, { type: 'triangle', vol: 0.06 })); tone(NOTE.C6, 0.27, 0.4, { type: 'triangle', vol: 0.06 }); },
    // Улучшение (рюкзак, убежище): ступенька вверх с «отзвуком»
    upgrade: () => { tone(NOTE.G4, 0, 0.12, { type: 'triangle', vol: 0.06 }); tone(NOTE.C5, 0.1, 0.12, { type: 'triangle', vol: 0.06 }); tone(NOTE.G5, 0.2, 0.35, { vol: 0.05 }); },
    // Отказ / ошибка: мягкое «не-а» — две ноты вниз
    error:   () => { tone(NOTE.G4, 0, 0.12, { type: 'triangle', vol: 0.07 }); tone(NOTE.Eb4, 0.12, 0.18, { type: 'triangle', vol: 0.07 }); },
    // Опасность / урон: три коротких пульса и глухой удар
    hazard:  () => { [0, 0.14, 0.28].forEach(d => tone(NOTE.A4, d, 0.09, { type: 'triangle', vol: 0.07 })); tone(110, 0, 0.3, { vol: 0.08 }); },
    // Потеря Кармы: медленный минорный спуск
    karma:   () => { tone(NOTE.A4, 0, 0.3, { vol: 0.06 }); tone(NOTE.E4, 0.25, 0.5, { vol: 0.06 }); },
    // Смерть: долгое затухание вниз
    death:   () => { tone(NOTE.G4, 0, 1.4, { vol: 0.07, glideTo: 98 }); tone(NOTE.C4, 0.3, 1.2, { vol: 0.04, glideTo: 65 }); },
    // Сирена выброса: плавная волна, не резкая
    siren:   () => { tone(300, 0, 0.5, { vol: 0.05, glideTo: 480 }); tone(480, 0.5, 0.5, { vol: 0.05, glideTo: 300 }); },
    // Радиоэфир: два сигнала и тихое шипение
    radio:   () => { tone(1200, 0, 0.07, { type: 'triangle', vol: 0.03 }); tone(1600, 0.09, 0.07, { type: 'triangle', vol: 0.03 }); noiseBurst(0.15, 1.0, 0.05, 1500); },
    // Затвор фотомодуля
    photo:   () => { noiseBurst(0, 0.06, 0.08, 2500); tone(NOTE.A5, 0.05, 0.05, { type: 'triangle', vol: 0.03 }); }
};

function playSound(type) {
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(e => {});
    }
    if (!audioCtx || audioCtx.state === 'suspended') return;
    let fn = SOUNDS[type];
    if (!fn) return;
    try { fn(); } catch (e) { console.warn('playSound error:', e); }
}
