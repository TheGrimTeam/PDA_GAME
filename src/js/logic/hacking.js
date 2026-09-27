// ============================================================
// ВЗЛОМ: МИНИ-ИГРА «СИНХРОНИЗАЦИЯ»
// ============================================================
// По шкале движется бегунок сканера. Игрок жмёт «СИНХРОНИЗАЦИЯ»,
// когда бегунок в зелёной зоне. Для вскрытия нужно пройти 3 уровня:
// с каждым уровнем зона уже, а бегунок быстрее.
// Промах сжигает попытку; попытки кончились — блокировка на 2 часа.
// ============================================================

const HACK_MAX_ATTEMPTS = 4;
const HACK_LEVELS = 3;
const HACK_PAUSE_MS = 700; // пауза после попадания/промаха, чтобы игрок увидел результат

// Профили устройств: ширина зоны (% шкалы) и скорость бегунка (% шкалы в секунду) по уровням
const HACK_DEVICES = {
    usb_:  { title: "ФЛЕШКА",   level: "ЛЁГКИЙ",  zones: [24, 18, 13], speeds: [45, 65, 90],   reward: [100, 300] },
    term_: { title: "ТЕРМИНАЛ", level: "СРЕДНИЙ", zones: [20, 14, 10], speeds: [55, 80, 110],  reward: [100, 300] },
    safe_: { title: "СХРОН",    level: "СЛОЖНЫЙ", zones: [18, 14, 11], speeds: [55, 75, 95],   reward: [300, 600] }
};

let currentHackCode = "";
let hackDevice = null;
let hackAttemptsLeft = HACK_MAX_ATTEMPTS;
let hackLevel = 1;                       // текущий уровень 1..3
let hackPos = 0;                         // позиция бегунка, % (0..100)
let hackDir = 1;                         // направление движения: 1 вправо, -1 влево
let hackZone = { start: 40, width: 20 }; // зелёная зона, %
let hackFinished = false;
let hackPaused = false;
let hackRaf = null;
let hackLastTs = 0;

function getHackDevice(code) {
    if (code.startsWith(QR_PREFIX_SAFE)) return HACK_DEVICES.safe_;
    if (code.startsWith(QR_PREFIX_TERM)) return HACK_DEVICES.term_;
    return HACK_DEVICES.usb_;
}

function hackRand(n) { return Math.floor(Math.random() * n); }

function startHacking(code) {
    let now = Date.now();
    // Защита от повторного взлома (раз в 2 часа)
    if (player.scannedCodes[code]) {
        let diffSec = (now - player.scannedCodes[code]) / 1000;
        if (diffSec < ANOMALY_COOLDOWN_SEC) {
            playSound('error');
            let remaining = Math.ceil(ANOMALY_COOLDOWN_SEC - diffSec);
            let hours = Math.floor(remaining / 3600);
            let minutes = Math.floor((remaining % 3600) / 60);
            let seconds = remaining % 60;
            let timeStr = hours > 0 ? `${hours} ч. ${minutes} мин.` : `${minutes} мин. ${seconds} сек.`;
            document.getElementById('scan-result').innerHTML = `<span style='color:yellow'>Устройство временно заблокировано защитой. Ждите ${timeStr}</span>`;
            return;
        }
    }

    currentHackCode = code;
    hackDevice = getHackDevice(code);
    hackAttemptsLeft = HACK_MAX_ATTEMPTS;
    hackLevel = 1;
    hackFinished = false;
    hackPaused = false;

    document.getElementById('hack-system-name').innerText = `${hackDevice.title} ${code.toUpperCase()}`;
    document.getElementById('hack-level').innerText = hackDevice.level;
    document.getElementById('hack-console').innerHTML = '';
    document.getElementById('hack-actions').innerHTML = '';
    document.getElementById('hack-sync-btn').disabled = false;
    hackLog('Подключение к контуру защиты...', 'dim');
    hackLog('Жмите «СИНХРОНИЗАЦИЯ», когда бегунок в зелёной зоне.', 'dim');
    if (code.startsWith(QR_PREFIX_SAFE)) {
        hackLog('Внимание: схрон чужой. Вскрытие снизит Карму на 1.', 'warn');
    }

    setupHackLevel();
    updateHackAttemptsUI();
    switchView('hacking');
    playSound('radio');
    startHackLoop();
}

// Новая зелёная зона (случайное место) и сброс бегунка для текущего уровня
function setupHackLevel() {
    let width = hackDevice.zones[hackLevel - 1];
    hackZone = { start: 5 + Math.random() * (90 - width), width: width };
    hackPos = 0;
    hackDir = 1;
    renderHackTrack();
    updateHackLevelUI();
}

function hackLog(text, kind) {
    const consoleEl = document.getElementById('hack-console');
    let color = { ok: 'var(--term-green)', err: 'var(--bandit-color)', warn: 'var(--rad-color)', bonus: 'var(--trade-color)', dim: 'var(--text-dim)' }[kind] || '#ccc';
    let div = document.createElement('div');
    div.style.color = color;
    div.textContent = '> ' + text;
    consoleEl.appendChild(div);
    consoleEl.scrollTop = consoleEl.scrollHeight;
}

function renderHackTrack() {
    let zone = document.getElementById('hack-zone');
    let runner = document.getElementById('hack-runner');
    if (zone) { zone.style.left = hackZone.start + '%'; zone.style.width = hackZone.width + '%'; }
    if (runner) runner.style.left = hackPos + '%';
}

function updateHackLevelUI() {
    let el = document.getElementById('hack-stage');
    if (!el) return;
    let dots = '';
    for (let i = 1; i <= HACK_LEVELS; i++) dots += (i < hackLevel || (hackFinished && hackAttemptsLeft > 0)) ? '● ' : (i === hackLevel ? '◉ ' : '○ ');
    el.innerText = `${dots.trim()}  уровень ${Math.min(hackLevel, HACK_LEVELS)}/${HACK_LEVELS}`;
}

function updateHackAttemptsUI() {
    const attemptsEl = document.getElementById('hack-attempts');
    let boxes = '';
    for (let i = 0; i < HACK_MAX_ATTEMPTS; i++) boxes += (i < hackAttemptsLeft ? '■ ' : '□ ');
    attemptsEl.innerText = `${boxes.trim()}  (${hackAttemptsLeft})`;
    attemptsEl.style.color = hackAttemptsLeft <= 1 ? "var(--bandit-color)" : "var(--trade-color)";
    const warnEl = document.getElementById('hack-lock-warning');
    if (warnEl) warnEl.style.display = (hackAttemptsLeft === 1 && !hackFinished) ? 'block' : 'none';
}

// Движение бегунка туда-обратно по шкале
function startHackLoop() {
    stopHackLoop();
    hackLastTs = 0;
    const step = (ts) => {
        let view = document.getElementById('view-hacking');
        if (hackFinished || !view || !view.classList.contains('active')) { hackRaf = null; return; }
        if (hackLastTs && !hackPaused) {
            let dt = Math.min(0.1, (ts - hackLastTs) / 1000);
            hackPos += hackDir * hackDevice.speeds[hackLevel - 1] * dt;
            if (hackPos >= 100) { hackPos = 100; hackDir = -1; }
            if (hackPos <= 0) { hackPos = 0; hackDir = 1; }
            renderHackTrack();
        }
        hackLastTs = ts;
        hackRaf = requestAnimationFrame(step);
    };
    hackRaf = requestAnimationFrame(step);
}

function stopHackLoop() {
    if (hackRaf) cancelAnimationFrame(hackRaf);
    hackRaf = null;
}

function isHackInZone(pos) {
    return pos >= hackZone.start && pos <= hackZone.start + hackZone.width;
}

// Кнопка «СИНХРОНИЗАЦИЯ»
function hackSync() {
    if (hackFinished || hackPaused || hackAttemptsLeft <= 0) return;
    let track = document.getElementById('hack-track');

    if (isHackInZone(hackPos)) {
        hackLog(`Уровень ${hackLevel}: синхронизация успешна.`, 'ok');
        flashHackTrack(track, 'hk-hit');
        if (hackLevel >= HACK_LEVELS) {
            finishHackSuccess();
            return;
        }
        playSound('upgrade');
        hackPaused = true;
        setTimeout(() => {
            hackLevel++;
            hackPaused = false;
            setupHackLevel();
            hackLog(`Уровень ${hackLevel}: зона уже, сигнал быстрее.`, 'dim');
        }, HACK_PAUSE_MS);
        return;
    }

    // Промах — попытка сгорает
    hackAttemptsLeft--;
    playSound('error');
    flashHackTrack(track, 'hk-miss');
    hackLog(`Промах! Попыток осталось: ${hackAttemptsLeft}`, 'err');
    updateHackAttemptsUI();

    if (hackAttemptsLeft <= 0) {
        hackFinished = true;
        stopHackLoop();
        player.scannedCodes[currentHackCode] = Date.now(); // Блокируем на 2 часа
        saveState();
        setTimeout(() => playSound('hazard'), 400);
        hackLog('ЗАЩИТА СРАБОТАЛА. Устройство заблокировано на 2 часа.', 'err');
        document.getElementById('hack-sync-btn').disabled = true;
        document.getElementById('hack-actions').innerHTML = `<button onclick="switchView('scan')" class="btn-danger" style="width:100%; padding:12px; font-size:1.1rem;">ОТКЛЮЧИТЬСЯ (ЗАБЛОКИРОВАНО)</button>`;
        updateHackAttemptsUI();
        return;
    }
    // Короткая пауза, бегунок продолжает с того же места
    hackPaused = true;
    setTimeout(() => { hackPaused = false; }, HACK_PAUSE_MS);
}

function flashHackTrack(track, cls) {
    if (!track) return;
    track.classList.remove('hk-hit', 'hk-miss');
    void track.offsetWidth; // перезапуск CSS-анимации
    track.classList.add(cls);
}

function finishHackSuccess() {
    hackFinished = true;
    stopHackLoop();
    playSound('quest');
    hackLog('Все 3 контура синхронизированы. Доступ разрешён.', 'ok');

    // Начисление случайной награды
    let creditsReward = hackDevice.reward[0] + hackRand(hackDevice.reward[1] - hackDevice.reward[0] + 1);
    player.score += creditsReward;

    // Выдаем случайную полезную деталь
    let junkKeys = Object.keys(ITEMS_DB).filter(k => ITEMS_DB[k].cat === 'junk' || ITEMS_DB[k].cat === 'gear');
    let itemRewardCode = junkKeys[hackRand(junkKeys.length)];
    let itemName = ITEMS_DB[itemRewardCode].name;

    let invSize = player.inventory.reduce((sum, id) => sum + ITEMS_DB[id].size, 0);
    let gotItem = false;
    if (invSize + ITEMS_DB[itemRewardCode].size <= player.maxSize) {
        player.inventory.push(itemRewardCode);
        gotItem = true;
        player.stats.itemsFound = (player.stats.itemsFound || 0) + 1;
    }

    // Схрон — чужое имущество: вскрытие снижает Карму, как и обыск тела
    let isStash = currentHackCode.startsWith(QR_PREFIX_SAFE);
    if (isStash) player.karma_score--;

    // Блокируем код от повторного взлома
    player.scannedCodes[currentHackCode] = Date.now();
    saveState();

    hackLog(`Получено: ${creditsReward} ¢`, 'bonus');
    hackLog(gotItem ? `Извлечено: ${itemName}` : `Извлечено: ${itemName} — нет места в рюкзаке!`, gotItem ? 'ok' : 'err');
    if (isStash) {
        hackLog('Вы обчистили чужой схрон: −1 к Карме.', 'err');
        setTimeout(() => playSound('karma'), 700);
    }

    updateHackLevelUI();
    updateHackAttemptsUI();
    document.getElementById('hack-sync-btn').disabled = true;
    document.getElementById('hack-actions').innerHTML = `<button onclick="switchView('scan')" class="btn-hero" style="width:100%; padding:12px; font-size:1.1rem;">ОТКЛЮЧИТЬСЯ (ГОТОВО)</button>`;
}

function abortHacking() {
    if (hackFinished || confirm("Прервать взлом? Прогресс будет утерян, но блокировки не будет.")) {
        stopHackLoop();
        hackFinished = true;
        switchView('scan');
    }
}
