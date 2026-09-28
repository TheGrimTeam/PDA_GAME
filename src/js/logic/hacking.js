// ============================================================
// ВЗЛОМ: ОБЩЕЕ ЯДРО
// ============================================================
// Тип носителя определяет мини-игру:
//   usb_  (простой)  — «Синхронизация»  (logic/hack-sync.js)
//   term_ (средний)  — «Отмычка»        (logic/hack-lockpick.js)
//   safe_ (сложный)  — «Подбор кода»    (logic/hack-words.js)
// Ядро отвечает за блокировку на 2 часа, попытки, награду, штраф
// Кармы за чужой схрон и выход. Игры вызывают hackSpendAttempt()
// при ошибке и hackWin() при победе.
// ============================================================

const HACK_MAX_ATTEMPTS = 4;

const HACK_DEVICES = {
    usb_:  { title: "ФЛЕШКА",   level: "ПРОСТАЯ",  game: 'sync',     attemptsLabel: "ПОПЫТКИ", reward: [100, 300] },
    term_: { title: "ТЕРМИНАЛ", level: "СРЕДНЯЯ",  game: 'lockpick', attemptsLabel: "ШПИЛЬКИ", reward: [100, 300] },
    safe_: { title: "СХРОН",    level: "СЛОЖНАЯ",  game: 'words',    attemptsLabel: "ПОПЫТКИ", reward: [300, 600] }
};

const HACK_GAMES = {
    sync:     { panel: 'hack-panel-sync',  start: () => syncStart(),     stop: () => syncStop() },
    lockpick: { panel: 'hack-panel-lock',  start: () => lockpickStart(), stop: () => lockpickStop() },
    words:    { panel: 'hack-panel-words', start: () => wordsStart(),    stop: () => {} }
};

let currentHackCode = "";
let hackDevice = null;
let hackAttemptsLeft = HACK_MAX_ATTEMPTS;
let hackFinished = false;

// Попытки во взломе: базовые + перк «Взломщик»
function hackMaxAttempts() {
    return HACK_MAX_ATTEMPTS + perkRank('hacker');
}

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

    // Остановить игру, если прошлый взлом не был завершён
    Object.values(HACK_GAMES).forEach(g => g.stop());

    currentHackCode = code;
    hackDevice = getHackDevice(code);
    hackAttemptsLeft = hackMaxAttempts();
    hackFinished = false;

    document.getElementById('hack-system-name').innerText = `${hackDevice.title} ${code.toUpperCase()}`;
    document.getElementById('hack-level').innerText = hackDevice.level;
    document.getElementById('hack-attempts-label').innerText = hackDevice.attemptsLabel;
    document.getElementById('hack-console').innerHTML = '';
    document.getElementById('hack-actions').innerHTML = '';
    Object.entries(HACK_GAMES).forEach(([name, g]) => {
        document.getElementById(g.panel).style.display = (name === hackDevice.game) ? 'block' : 'none';
    });

    hackLog('Подключение к контуру защиты...', 'dim');
    if (code.startsWith(QR_PREFIX_SAFE)) {
        hackLog('Внимание: схрон чужой. Вскрытие снизит Карму на 1.', 'warn');
    }

    updateHackAttemptsUI();
    switchView('hacking');
    playSound('radio');
    HACK_GAMES[hackDevice.game].start();
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

function updateHackAttemptsUI() {
    const attemptsEl = document.getElementById('hack-attempts');
    let boxes = '';
    for (let i = 0; i < hackMaxAttempts(); i++) boxes += (i < hackAttemptsLeft ? '■ ' : '□ ');
    attemptsEl.innerText = `${boxes.trim()}  (${hackAttemptsLeft})`;
    attemptsEl.style.color = hackAttemptsLeft <= 1 ? "var(--bandit-color)" : "var(--trade-color)";
    const warnEl = document.getElementById('hack-lock-warning');
    if (warnEl) warnEl.style.display = (hackAttemptsLeft === 1 && !hackFinished) ? 'block' : 'none';
}

// Ошибка в мини-игре: сгорает попытка. Возвращает true, если попытки кончились.
function hackSpendAttempt(message) {
    if (hackFinished) return true;
    hackAttemptsLeft--;
    playSound('error');
    hackLog(`${message} Осталось: ${hackAttemptsLeft}`, 'err');
    updateHackAttemptsUI();
    if (hackAttemptsLeft > 0) return false;

    hackFinished = true;
    HACK_GAMES[hackDevice.game].stop();
    player.scannedCodes[currentHackCode] = Date.now(); // Блокируем на 2 часа
    saveState();
    setTimeout(() => playSound('hazard'), 400);
    hackLog('ЗАЩИТА СРАБОТАЛА. Устройство заблокировано на 2 часа.', 'err');
    document.getElementById('hack-actions').innerHTML = `<button onclick="switchView('scan')" class="btn-danger" style="width:100%; padding:12px; font-size:1.1rem;">ОТКЛЮЧИТЬСЯ (ЗАБЛОКИРОВАНО)</button>`;
    updateHackAttemptsUI();
    return true;
}

// Победа в мини-игре: награда, штраф Кармы за схрон, блокировка кода
function hackWin() {
    if (hackFinished) return;
    hackFinished = true;
    HACK_GAMES[hackDevice.game].stop();
    playSound('quest');
    hackLog('Доступ разрешён.', 'ok');

    let creditsReward = hackDevice.reward[0] + hackRand(hackDevice.reward[1] - hackDevice.reward[0] + 1);
    creditsReward = Math.round(creditsReward * (1 + 0.1 * perkRank('fortune'))); // перк «Золотая жила»
    player.score += creditsReward;
    gainXp({ sync: XP_REWARDS.hackUsb, lockpick: XP_REWARDS.hackTerm, words: XP_REWARDS.hackSafe }[hackDevice.game]);

    // Случайная полезная деталь
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

    player.scannedCodes[currentHackCode] = Date.now();
    saveState();

    hackLog(`Получено: ${creditsReward} ¢`, 'bonus');
    hackLog(gotItem ? `Извлечено: ${itemName}` : `Извлечено: ${itemName} — нет места в рюкзаке!`, gotItem ? 'ok' : 'err');
    if (isStash) {
        hackLog('Вы обчистили чужой схрон: −1 к Карме.', 'err');
        setTimeout(() => playSound('karma'), 700);
    }
    updateHackAttemptsUI();
    document.getElementById('hack-actions').innerHTML = `<button onclick="switchView('scan')" class="btn-hero" style="width:100%; padding:12px; font-size:1.1rem;">ОТКЛЮЧИТЬСЯ (ГОТОВО)</button>`;
}

function abortHacking() {
    if (hackFinished || confirm("Прервать взлом? Прогресс будет утерян, но блокировки не будет.")) {
        if (hackDevice) HACK_GAMES[hackDevice.game].stop();
        hackFinished = true;
        switchView('scan');
    }
}
