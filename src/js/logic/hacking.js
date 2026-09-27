// ============================================================
// СИСТЕМА ДЕШИФРОВАНИЯ (ВЗЛОМ) — в стиле терминалов Fallout
// ============================================================
// Экран показывает дамп памяти: адреса и строки мусорных символов,
// среди которых спрятаны слова-кандидаты. Одно из них — пароль.
// После неверной попытки терминал сообщает СОВПАДЕНИЕ: сколько букв
// стоят на тех же местах, что и в пароле.
// Парные скобки ( ) [ ] { } < > в одной строке — бонус: убирают
// ложное слово или восстанавливают попытки.
// ============================================================

const HACK_MAX_ATTEMPTS = 4;
const HACK_ROW_WIDTH = 12;          // символов в строке дампа
const HACK_JUNK = "!@#$%^&*-_=+;:'\",./?|\\~`";
const HACK_BRACKETS = [['(', ')'], ['[', ']'], ['{', '}'], ['<', '>']];

// Словари по длине слова. Сложность устройства = длина слов и их количество.
const HACK_WORDS = {
    5: ["АНГАР", "БАРАК", "ВИРУС", "ЗАВОД", "ЗАМОК", "ЗАПАС", "ЗОМБИ", "ЛАЗЕР", "РАДАР", "РАЦИЯ", "СКЛАД", "ТУМАН",
        "КАРТА", "ШАХТА", "ВЕТЕР", "ГРОЗА", "ЖЕТОН", "КАПЛЯ", "СЛИЗЬ", "ДОЗОР", "ОТРЯД", "ВЗРЫВ", "СХРОН"],
    6: ["БУНКЕР", "ВЫБРОС", "СИГНАЛ", "ПАТРОН", "ФОНАРЬ", "ГИЛЬЗА", "ПЕЧАТЬ", "СИРЕНА", "КОМПАС", "СИНТЕЗ", "МУТАНТ",
        "ОРУЖИЕ", "АПТЕКА", "ПРИБОР", "ЗАТВОР", "МАЯЧОК", "РЕЙДЕР", "СТРАЖА", "КАНАЛЫ", "ЛОГОВО", "БАРЬЕР", "ЗАСАДА", "ТАЙНИК"],
    8: ["АНОМАЛИЯ", "ДЕТЕКТОР", "ПРОТОКОЛ", "ТЕРМИНАЛ", "КОНТРАКТ", "ДОЗИМЕТР", "КАРАНТИН", "ТОРГОВЕЦ", "ПЕРИМЕТР",
        "ЛАБОРАНТ", "ЭПИЦЕНТР", "АРТЕФАКТ", "РЕАКТОРЫ", "ИНЖЕНЕРЫ", "ЗАЩИТНИК", "САНИТАРЫ", "СТАЛКЕРЫ", "МАРОДЕРЫ", "ВЕРТОЛЕТ"]
};

// Профили устройств по префиксу QR-кода
const HACK_DEVICES = {
    usb_:  { title: "ФЛЕШКА",   level: "ЛЁГКИЙ",  wordLen: 5, words: 8,  rows: 12, brackets: 3, reward: [100, 300] },
    term_: { title: "ТЕРМИНАЛ", level: "СРЕДНИЙ", wordLen: 6, words: 10, rows: 14, brackets: 3, reward: [100, 300] },
    safe_: { title: "СХРОН",    level: "СЛОЖНЫЙ", wordLen: 8, words: 12, rows: 16, brackets: 4, reward: [300, 600] }
};

let currentHackCode = "";
let hackAttemptsLeft = HACK_MAX_ATTEMPTS;
let hackSecretWord = "";
let hackWordsList = [];
let hackDump = [];        // строки дампа: массив токенов {t:'junk'|'word'|'br', ...}
let hackTried = {};       // слово → совпадение
let hackRemoved = {};     // слово → true (убрано скобками)
let hackBracketUsed = {}; // id скобки → true
let hackFinished = false;
let hackAddrBase = 0;

function getHackDevice(code) {
    if (code.startsWith(QR_PREFIX_SAFE)) return HACK_DEVICES.safe_;
    if (code.startsWith(QR_PREFIX_TERM)) return HACK_DEVICES.term_;
    return HACK_DEVICES.usb_;
}

function hackRand(n) { return Math.floor(Math.random() * n); }

function hackJunk(len) {
    let s = "";
    for (let i = 0; i < len; i++) s += HACK_JUNK[hackRand(HACK_JUNK.length)];
    return s;
}

function hackEsc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Сколько букв стоят на тех же местах
function hackLikeness(a, b) {
    let n = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] === b[i]) n++;
    return n;
}

// Строит дамп: каждое слово занимает свою строку, в части пустых строк — пары скобок
function buildHackDump(dev) {
    let totalRows = dev.rows * 2;
    let rowIdx = [...Array(totalRows).keys()].sort(() => Math.random() - 0.5);
    let wordRows = {};
    hackWordsList.forEach((w, i) => { wordRows[rowIdx[i]] = w; });
    let bracketRows = rowIdx.slice(hackWordsList.length, hackWordsList.length + dev.brackets);

    let dump = [];
    let brId = 0;
    for (let r = 0; r < totalRows; r++) {
        let tokens = [];
        if (wordRows[r] !== undefined) {
            let w = wordRows[r];
            let before = hackRand(HACK_ROW_WIDTH - w.length + 1);
            tokens.push({ t: 'junk', s: hackJunk(before) });
            tokens.push({ t: 'word', w: w });
            tokens.push({ t: 'junk', s: hackJunk(HACK_ROW_WIDTH - w.length - before) });
        } else if (bracketRows.includes(r)) {
            let pair = HACK_BRACKETS[hackRand(HACK_BRACKETS.length)];
            let inner = 1 + hackRand(4);
            let len = inner + 2;
            let before = hackRand(HACK_ROW_WIDTH - len + 1);
            tokens.push({ t: 'junk', s: hackJunk(before) });
            tokens.push({ t: 'br', id: brId++, s: pair[0] + hackJunk(inner) + pair[1] });
            tokens.push({ t: 'junk', s: hackJunk(HACK_ROW_WIDTH - len - before) });
        } else {
            tokens.push({ t: 'junk', s: hackJunk(HACK_ROW_WIDTH) });
        }
        dump.push(tokens);
    }
    return dump;
}

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

    let dev = getHackDevice(code);
    currentHackCode = code;
    hackAttemptsLeft = HACK_MAX_ATTEMPTS;
    hackTried = {};
    hackRemoved = {};
    hackBracketUsed = {};
    hackFinished = false;
    hackAddrBase = 0xF000 + hackRand(0x800) * 2;

    let pool = [...HACK_WORDS[dev.wordLen]].sort(() => Math.random() - 0.5);
    hackWordsList = pool.slice(0, dev.words);
    hackSecretWord = hackWordsList[hackRand(hackWordsList.length)];
    hackDump = buildHackDump(dev);

    document.getElementById('hack-system-name').innerText = `${dev.title} ${code.toUpperCase()}`;
    document.getElementById('hack-level').innerText = `${dev.level} · слова из ${dev.wordLen} букв`;
    document.getElementById('hack-console').innerHTML = '';
    hackLog('Обнаружено шифрование. Подключение дешифратора...', 'dim');
    hackLog('Выберите слово-пароль в дампе памяти.', 'dim');
    document.getElementById('hack-actions').innerHTML = '';
    if (code.startsWith(QR_PREFIX_SAFE)) {
        hackLog('Внимание: схрон чужой. Вскрытие снизит Карму на 1.', 'warn');
    }

    renderHackDump();
    updateHackAttemptsUI();
    switchView('hacking');
    playSound('radio');
}

function hackLog(text, kind) {
    const consoleEl = document.getElementById('hack-console');
    let color = { ok: 'var(--term-green)', err: 'var(--bandit-color)', warn: 'var(--rad-color)', bonus: 'var(--trade-color)', dim: 'var(--text-dim)' }[kind] || '#ccc';
    consoleEl.innerHTML += `<div style="color:${color}">&gt; ${hackEsc(text)}</div>`;
    consoleEl.scrollTop = consoleEl.scrollHeight;
}

function renderHackDump() {
    const grid = document.getElementById('hack-words-grid');
    let html = '';
    hackDump.forEach((tokens, r) => {
        let addr = '0x' + (hackAddrBase + r * HACK_ROW_WIDTH).toString(16).toUpperCase();
        let line = '';
        tokens.forEach(tok => {
            if (tok.t === 'junk') {
                line += hackEsc(tok.s);
            } else if (tok.t === 'word') {
                let w = tok.w;
                if (hackRemoved[w]) {
                    line += `<span class="hk-removed">${'.'.repeat(w.length)}</span>`;
                } else if (hackTried[w] !== undefined) {
                    line += `<span class="hk-word hk-tried" title="Совпадение ${hackTried[w]}/${w.length}">${w}<sup>${hackTried[w]}</sup></span>`;
                } else if (hackFinished) {
                    line += `<span class="hk-word${w === hackSecretWord ? ' hk-secret' : ''}">${w}</span>`;
                } else {
                    line += `<span class="hk-word" role="button" onclick="submitHackWord('${w}')">${w}</span>`;
                }
            } else if (tok.t === 'br') {
                if (hackBracketUsed[tok.id] || hackFinished) {
                    line += `<span class="hk-br-used">${hackEsc(tok.s)}</span>`;
                } else {
                    line += `<span class="hk-br" role="button" onclick="useHackBracket(${tok.id})">${hackEsc(tok.s)}</span>`;
                }
            }
        });
        html += `<div class="hk-row"><span class="hk-addr">${addr}</span>${line}</div>`;
    });
    grid.innerHTML = html;
    updateHackCandidates();
}

// Подсказка: сколько слов ещё не противоречат полученным совпадениям
function updateHackCandidates() {
    const el = document.getElementById('hack-candidates');
    if (!el) return;
    let tried = Object.keys(hackTried);
    if (tried.length === 0 || hackFinished) { el.innerText = ''; return; }
    let left = hackWordsList.filter(w => !hackRemoved[w] && hackTried[w] === undefined &&
        tried.every(t => hackLikeness(w, t) === hackTried[t]));
    el.innerText = `Подходят под все совпадения: ${left.length} слов(а)`;
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

function submitHackWord(word) {
    if (hackAttemptsLeft <= 0 || hackFinished) return;
    if (hackTried[word] !== undefined) return; // уже пробовали

    if (word === hackSecretWord) {
        hackFinished = true;
        playSound('quest');
        hackLog(word, 'ok');
        hackLog('Пароль принят. Доступ разрешён.', 'ok');

        // Начисление случайной награды
        let dev = getHackDevice(currentHackCode);
        let creditsReward = dev.reward[0] + hackRand(dev.reward[1] - dev.reward[0] + 1);
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

        hackLog(`Получено: ${creditsReward} 💎`, 'bonus');
        hackLog(gotItem ? `Извлечено: ${itemName}` : `Извлечено: ${itemName} — нет места в рюкзаке!`, gotItem ? 'ok' : 'err');
        if (isStash) {
            hackLog('Вы обчистили чужой схрон: −1 к Карме.', 'err');
            setTimeout(() => playSound('karma'), 700);
        }

        renderHackDump();
        updateHackAttemptsUI();
        document.getElementById('hack-actions').innerHTML = `<button onclick="switchView('scan')" class="btn-hero" style="width:100%; padding:12px; font-size:1.1rem;">ОТКЛЮЧИТЬСЯ (ГОТОВО)</button>`;
        return;
    }

    // Неверно — показываем совпадение букв на своих местах
    hackAttemptsLeft--;
    let likeness = hackLikeness(word, hackSecretWord);
    if (hackWordsList.includes(word)) hackTried[word] = likeness;
    playSound('error');
    hackLog(word, 'err');
    hackLog(`Отказ в доступе. Совпадение: ${likeness}/${hackSecretWord.length}`, 'err');

    if (hackAttemptsLeft <= 0) {
        hackFinished = true;
        player.scannedCodes[currentHackCode] = Date.now(); // Блокируем на 2 часа
        saveState();
        setTimeout(() => playSound('hazard'), 400);
        hackLog('ТЕРМИНАЛ ЗАБЛОКИРОВАН на 2 часа.', 'err');
        hackLog(`Пароль был: ${hackSecretWord}`, 'dim');
        document.getElementById('hack-actions').innerHTML = `<button onclick="switchView('scan')" class="btn-danger" style="width:100%; padding:12px; font-size:1.1rem;">ОТКЛЮЧИТЬСЯ (ЗАБЛОКИРОВАНО)</button>`;
    }
    renderHackDump();
    updateHackAttemptsUI();
}

// Бонусные скобки: 75% — убрать ложное слово, 25% (или если убирать нечего) — вернуть попытки
function useHackBracket(id) {
    if (hackFinished || hackBracketUsed[id]) return;
    hackBracketUsed[id] = true;
    let duds = hackWordsList.filter(w => w !== hackSecretWord && !hackRemoved[w] && hackTried[w] === undefined);
    if (duds.length > 0 && (Math.random() < 0.75 || hackAttemptsLeft === HACK_MAX_ATTEMPTS)) {
        let w = duds[hackRand(duds.length)];
        hackRemoved[w] = true;
        hackLog(`Ложное слово удалено: ${w}`, 'bonus');
    } else {
        hackAttemptsLeft = HACK_MAX_ATTEMPTS;
        hackLog('Защита сброшена: попытки восстановлены.', 'bonus');
    }
    playSound('use');
    renderHackDump();
    updateHackAttemptsUI();
}

function abortHacking() {
    if (hackFinished || confirm("Прервать дешифрование? Прогресс будет утерян, но блокировки не будет.")) {
        switchView('scan');
    }
}
