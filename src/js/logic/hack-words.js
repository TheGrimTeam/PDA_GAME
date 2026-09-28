// ============================================================
// ВЗЛОМ СХРОНА (safe_): МИНИ-ИГРА «ПОДБОР КОДА» (в стиле Fallout)
// ============================================================
// Дамп памяти: адреса и мусорные символы, среди них слова из 6 букв.
// Одно слово — пароль. После неверного слова терминал показывает
// СОВПАДЕНИЕ — сколько букв стоят на тех же местах, что в пароле.
// Парные скобки ( ) [ ] { } < > в строке — бонус: убирают ложное
// слово или восстанавливают попытки.
// ============================================================

const WORDS_LEN = 6;           // длина кода
const WORDS_COUNT = 10;        // слов-кандидатов в дампе
const WORDS_ROWS = 14;         // строк в каждой из двух колонок
const WORDS_BRACKETS = 3;      // бонусных скобок
const HACK_ROW_WIDTH = 12;     // символов в строке дампа
const HACK_JUNK = "!@#$%^&*-_=+;:'\",./?|\\~`";
const HACK_BRACKETS = [['(', ')'], ['[', ']'], ['{', '}'], ['<', '>']];

const HACK_WORDS = ["БУНКЕР", "ВЫБРОС", "СИГНАЛ", "ПАТРОН", "ФОНАРЬ", "ГИЛЬЗА", "ПЕЧАТЬ", "СИРЕНА", "КОМПАС", "СИНТЕЗ",
    "МУТАНТ", "ОРУЖИЕ", "АПТЕКА", "ПРИБОР", "ЗАТВОР", "МАЯЧОК", "РЕЙДЕР", "СТРАЖА", "КАНАЛЫ", "ЛОГОВО", "БАРЬЕР",
    "ЗАСАДА", "ТАЙНИК"];

let hackSecretWord = "";
let hackWordsList = [];
let hackDump = [];        // строки дампа: массив токенов {t:'junk'|'word'|'br', ...}
let hackTried = {};       // слово → совпадение
let hackRemoved = {};     // слово → true (убрано скобками)
let hackBracketUsed = {}; // id скобки → true
let hackAddrBase = 0;

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

function wordsStart() {
    hackTried = {};
    hackRemoved = {};
    hackBracketUsed = {};
    hackAddrBase = 0xF000 + hackRand(0x800) * 2;
    let pool = [...HACK_WORDS].sort(() => Math.random() - 0.5);
    hackWordsList = pool.slice(0, WORDS_COUNT);
    hackSecretWord = hackWordsList[hackRand(hackWordsList.length)];
    hackDump = buildHackDump();
    hackLog(`Выберите код (${WORDS_LEN} букв) в дампе памяти.`, 'dim');
    renderHackDump();
}

// Каждое слово занимает свою строку, в части пустых строк — пары скобок
function buildHackDump() {
    let totalRows = WORDS_ROWS * 2;
    let rowIdx = [...Array(totalRows).keys()].sort(() => Math.random() - 0.5);
    let wordRows = {};
    hackWordsList.forEach((w, i) => { wordRows[rowIdx[i]] = w; });
    let bracketRows = rowIdx.slice(hackWordsList.length, hackWordsList.length + WORDS_BRACKETS);

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

function submitHackWord(word) {
    if (hackAttemptsLeft <= 0 || hackFinished) return;
    if (hackTried[word] !== undefined) return; // уже пробовали

    if (word === hackSecretWord) {
        hackLog(word, 'ok');
        hackWin();
        renderHackDump();
        return;
    }

    let likeness = hackLikeness(word, hackSecretWord);
    if (hackWordsList.includes(word)) hackTried[word] = likeness;
    hackLog(word, 'err');
    if (hackSpendAttempt(`Отказ в доступе. Совпадение: ${likeness}/${hackSecretWord.length}.`)) {
        hackLog(`Код был: ${hackSecretWord}`, 'dim');
    }
    renderHackDump();
}

// Бонусные скобки: 75% — убрать ложное слово, иначе (или если убирать нечего) — вернуть попытки
function useHackBracket(id) {
    if (hackFinished || hackBracketUsed[id]) return;
    hackBracketUsed[id] = true;
    let duds = hackWordsList.filter(w => w !== hackSecretWord && !hackRemoved[w] && hackTried[w] === undefined);
    if (duds.length > 0 && (Math.random() < 0.75 || hackAttemptsLeft === hackMaxAttempts())) {
        let w = duds[hackRand(duds.length)];
        hackRemoved[w] = true;
        hackLog(`Ложное слово удалено: ${w}`, 'bonus');
    } else {
        hackAttemptsLeft = hackMaxAttempts();
        hackLog('Защита сброшена: попытки восстановлены.', 'bonus');
        updateHackAttemptsUI();
    }
    playSound('use');
    renderHackDump();
}
