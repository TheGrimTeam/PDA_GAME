// ============================================================
// КАЗИНО: КОЛОДА КАРТ И ОЦЕНКА ПОКЕРНЫХ КОМБИНАЦИЙ
// ============================================================
// Общая часть для «21 очко» (casino-21.js) и покера (casino-poker.js).
// Карта: { v: 2..14 (11 — Валет, 12 — Дама, 13 — Король, 14 — Туз), s: масть }.
// ============================================================

const CARD_SUITS = ['♠', '♥', '♦', '♣'];
const CARD_NAMES = { 11: 'В', 12: 'Д', 13: 'К', 14: 'Т' };
const CASINO_MIN_BET = 5;
const CASINO_MAX_BET = 100;

// Новая перемешанная колода из 52 карт
function cardsNewDeck() {
    let deck = [];
    for (let s of CARD_SUITS) for (let v = 2; v <= 14; v++) deck.push({ v: v, s: s });
    for (let i = deck.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function cardLabel(c) {
    return (CARD_NAMES[c.v] || String(c.v)) + c.s;
}

// Разметка карты; hidden — рубашкой вверх, selected — выбрана для обмена
function cardHtml(c, opts = {}) {
    if (opts.hidden) return `<span class="card card-back"></span>`;
    let red = (c.s === '♥' || c.s === '♦') ? ' card-red' : '';
    let sel = opts.selected ? ' card-sel' : '';
    let click = opts.onclick ? ` role="button" onclick="${opts.onclick}"` : '';
    return `<span class="card${red}${sel}"${click}><b>${CARD_NAMES[c.v] || c.v}</b><i>${c.s}</i></span>`;
}

// Ставка казино: от 5 до 100 крышек
function casinoClampBet(bet) {
    return Math.max(CASINO_MIN_BET, Math.min(CASINO_MAX_BET, bet));
}

// ---------- Покерные комбинации ----------

const POKER_HANDS = ['Старшая карта', 'Пара', 'Две пары', 'Тройка', 'Стрит', 'Флеш', 'Фулл-хаус', 'Каре', 'Стрит-флеш', 'Роял-флеш'];

// Оценка руки из 5 карт: { cat: 0..9, tie: [значения для сравнения], name }
function pokerEval(hand) {
    let vals = hand.map(c => c.v).sort((a, b) => b - a);
    let counts = {};
    vals.forEach(v => counts[v] = (counts[v] || 0) + 1);
    // Группы: сначала по размеру, потом по старшинству
    let groups = Object.entries(counts).map(([v, n]) => ({ v: +v, n: n }))
        .sort((a, b) => b.n - a.n || b.v - a.v);
    let flush = hand.every(c => c.s === hand[0].s);
    let uniq = [...new Set(vals)];
    let straightHigh = 0;
    if (uniq.length === 5) {
        if (vals[0] - vals[4] === 4) straightHigh = vals[0];
        else if (vals.join(',') === '14,5,4,3,2') straightHigh = 5; // колесо: Т-2-3-4-5
    }

    let cat, tie;
    if (straightHigh && flush) { cat = straightHigh === 14 ? 9 : 8; tie = [straightHigh]; }
    else if (groups[0].n === 4) { cat = 7; tie = [groups[0].v, groups[1].v]; }
    else if (groups[0].n === 3 && groups[1].n === 2) { cat = 6; tie = [groups[0].v, groups[1].v]; }
    else if (flush) { cat = 5; tie = vals; }
    else if (straightHigh) { cat = 4; tie = [straightHigh]; }
    else if (groups[0].n === 3) { cat = 3; tie = groups.map(g => g.v); }
    else if (groups[0].n === 2 && groups[1].n === 2) { cat = 2; tie = groups.map(g => g.v); }
    else if (groups[0].n === 2) { cat = 1; tie = groups.map(g => g.v); }
    else { cat = 0; tie = vals; }
    return { cat: cat, tie: tie, name: POKER_HANDS[cat] };
}

// > 0 — первая рука сильнее, < 0 — вторая, 0 — ничья
function pokerCompare(a, b) {
    if (a.cat !== b.cat) return a.cat - b.cat;
    for (let i = 0; i < Math.max(a.tie.length, b.tie.length); i++) {
        let d = (a.tie[i] || 0) - (b.tie[i] || 0);
        if (d !== 0) return d;
    }
    return 0;
}
