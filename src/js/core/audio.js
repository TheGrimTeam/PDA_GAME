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
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(1300 + Math.random() * 900, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.09, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.015);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.02);
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
    if (r < 15) {
        minDelay = 8000; maxDelay = 24000; // Очень редкие одиночные щелчки (раз в 8-24 сек)
    } else if (r < 30) {
        minDelay = 3600; maxDelay = 10000; // Редкий предупреждающий треск (раз в 4-10 сек)
    } else if (r < 45) {
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
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.frequency.setValueAtTime(950, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.015, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.06);
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

function playSound(type) {
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(e => {});
    }
    if (!audioCtx || audioCtx.state === 'suspended') return;
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination); const now = audioCtx.currentTime;

    if (type === 'sell') {
        osc.type = 'square'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
        setTimeout(() => {
            const osc2 = audioCtx.createOscillator(); const gain2 = audioCtx.createGain();
            osc2.connect(gain2); gain2.connect(audioCtx.destination);
            osc2.type = 'square'; osc2.frequency.setValueAtTime(1200, audioCtx.currentTime); osc2.frequency.exponentialRampToValueAtTime(1600, audioCtx.currentTime + 0.1);
            gain2.gain.setValueAtTime(0.1, audioCtx.currentTime); gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
            osc2.start(audioCtx.currentTime); osc2.stop(audioCtx.currentTime + 0.2);
        }, 100);
    } else if (type === 'hazard') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, now); osc.frequency.linearRampToValueAtTime(50, now + 0.6);
        gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.start(now); osc.stop(now + 0.6);
    } else if (type === 'scan') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(1200, now);
        gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
    } else if (type === 'error') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(120, now);
        gain.gain.setValueAtTime(0.15, now); gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
    } else if (type === 'karma') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(80, now); osc.frequency.exponentialRampToValueAtTime(30, now + 1.5);
        gain.gain.setValueAtTime(0.4, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
        osc.start(now); osc.stop(now + 1.5);
    } else if (type === 'death') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, now); osc.frequency.exponentialRampToValueAtTime(10, now + 2);
        gain.gain.setValueAtTime(0.147, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 2);
        osc.start(now); osc.stop(now + 2);
    } else if (type === 'use') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
        gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
    } else if (type === 'siren') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(180, now); osc.frequency.exponentialRampToValueAtTime(320, now + 0.5); osc.frequency.exponentialRampToValueAtTime(180, now + 1.0);
        gain.gain.setValueAtTime(0.04, now); gain.gain.linearRampToValueAtTime(0.0, now + 1.0);
        osc.start(now); osc.stop(now + 1.0);
    } else if (type === 'radio') {
        osc.type = 'square'; osc.frequency.setValueAtTime(1200, now); osc.frequency.setValueAtTime(1800, now + 0.1);
        gain.gain.setValueAtTime(0.05, now); gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
        const bufferSize = audioCtx.sampleRate * 1.5; const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0); for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
        const noise = audioCtx.createBufferSource(); noise.buffer = buffer;
        const bandpass = audioCtx.createBiquadFilter(); bandpass.type = 'bandpass'; bandpass.frequency.value = 1500; bandpass.Q.value = 1.2;
        const noiseGain = audioCtx.createGain();
        noise.connect(bandpass); bandpass.connect(noiseGain); noiseGain.connect(audioCtx.destination);
        noiseGain.gain.setValueAtTime(0, now); noiseGain.gain.setValueAtTime(0.15, now + 0.15); noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
        noise.start(now);
    }
}
