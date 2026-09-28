// ============================================================
// КАЗИНО: ПОКЕР С БОТОМ (пятикарточный дро)
// ============================================================
// 1) Оба ставят анте в банк, получают по 5 карт.
// 2) Обмен: игрок отмечает карты и меняет их (0–5 карт), бот тоже меняет.
// 3) Торговля: ВСКРЫТЬСЯ / ПОВЫСИТЬ (+ставка) / СБРОСИТЬ.
//    На повышение бот отвечает или сбрасывает; если игрок вскрывается,
//    бот может повысить сам — тогда игрок уравнивает или сбрасывает.
// 4) Вскрытие: сильнейшая комбинация забирает банк, ничья — делёж.
// ============================================================

let pkBet = 10;           // анте и размер повышения
let pkDeck = [];
let pkHand = [];
let pkBot = [];
let pkSel = {};           // индексы карт, отмеченных для обмена
let pkPhase = 'idle';     // idle | draw | bet | respond
let pkPot = 0;
let pkPlayerIn = 0;       // сколько игрок положил в банк в этой раздаче
let pkBotDrew = 0;

function pkAdjustBet(delta) {
    if (pkPhase !== 'idle') return;
    pkBet = casinoClampBet(pkBet + delta);
    playSound('click');
    pkRender();
}

function pkPutIn(amount) {
    player.score -= amount;
    pkPlayerIn += amount;
    pkPot += amount;
}

// Новая раздача. deck — готовая колода (для тестов)
function pkDeal(deck) {
    if (pkPhase !== 'idle') return;
    if ((player.score || 0) < pkBet) {
        playSound('error');
        return pkMessage(`Мало крышек: анте ${pkBet}, у вас ${player.score || 0}.`, 'err');
    }
    pkPot = 0; pkPlayerIn = 0; pkSel = {}; pkBotDrew = 0;
    pkPutIn(pkBet);
    pkPot += pkBet; // анте бота
    pkDeck = deck ? deck.slice() : cardsNewDeck();
    pkHand = []; pkBot = [];
    for (let i = 0; i < 5; i++) { pkHand.push(pkDeck.pop()); pkBot.push(pkDeck.pop()); }
    pkPhase = 'draw';
    saveState();
    playSound('scan');
    pkMessage('Нажмите на карты, которые хотите сменить, затем ОБМЕНЯТЬ (или ОСТАВИТЬ ВСЕ).', 'dim');
    pkRender();
}

function pkToggle(i) {
    if (pkPhase !== 'draw') return;
    if (pkSel[i]) delete pkSel[i]; else pkSel[i] = true;
    playSound('click');
    pkRender();
}

function pkDraw() {
    if (pkPhase !== 'draw') return;
    let n = 0;
    for (let i = 0; i < 5; i++) if (pkSel[i]) { pkHand[i] = pkDeck.pop(); n++; }
    pkSel = {};
    // Бот меняет карты по своей стратегии
    let botSwap = pkBotChooseDiscards(pkBot);
    botSwap.forEach(i => { pkBot[i] = pkDeck.pop(); });
    pkBotDrew = botSwap.length;
    pkPhase = 'bet';
    playSound('scan');
    pkMessage(`Вы сменили ${n}, бот сменил ${pkBotDrew}. У вас: ${pokerEval(pkHand).name}. Ваш ход.`, 'dim');
    pkRender();
}

// ---------- Решения бота ----------

// Какие карты бот сбрасывает (индексы)
function pkBotChooseDiscards(hand) {
    let ev = pokerEval(hand);
    let idx = [0, 1, 2, 3, 4];
    if (ev.cat >= 4 && ev.cat !== 7) return [];                              // стрит и выше — держит
    if (ev.cat === 7 || ev.cat === 3 || ev.cat === 2 || ev.cat === 1) {       // каре/тройка/две пары/пара — меняет кикеры
        let keep = {};
        let counts = {};
        hand.forEach(c => counts[c.v] = (counts[c.v] || 0) + 1);
        hand.forEach((c, i) => { if (counts[c.v] >= 2) keep[i] = true; });
        return idx.filter(i => !keep[i]);
    }
    // Четыре карты к флешу — меняет одну
    for (let s of CARD_SUITS) {
        let same = idx.filter(i => hand[i].s === s);
        if (same.length === 4) return idx.filter(i => hand[i].s !== s);
    }
    // Четыре карты подряд — меняет выпадающую
    let order = idx.slice().sort((a, b) => hand[a].v - hand[b].v);
    for (let skip = 0; skip < 5; skip++) {
        let rest = order.filter((_, k) => k !== skip).map(i => hand[i].v);
        if (new Set(rest).size === 4 && rest[3] - rest[0] === 3) return [order[skip]];
    }
    // Ничего нет — оставляет старшую карту
    let high = order[4];
    return idx.filter(i => i !== high);
}

// Сила руки бота в долях: учитывает категорию и старшинство
function pkBotStrength() {
    let ev = pokerEval(pkBot);
    if (ev.cat >= 2) return 1;
    if (ev.cat === 1) return ev.tie[0] >= 11 ? 0.7 : 0.45; // пара валетов и выше
    return 0;
}

// Бот отвечает на повышение игрока: true — уравнял
function pkBotCalls() {
    let s = pkBotStrength();
    if (s >= 0.7) return true;
    if (s > 0) return Math.random() < 0.6;
    return Math.random() < 0.12;   // иногда «ловит блеф» со старшей картой
}

// Бот сам повышает после того, как игрок вскрылся
function pkBotBets() {
    let s = pkBotStrength();
    if (s >= 1) return Math.random() < 0.85;
    if (s >= 0.7) return Math.random() < 0.5;
    return Math.random() < 0.1;    // блеф
}

// ---------- Торговля ----------

function pkRaise() {
    if (pkPhase !== 'bet') return;
    if ((player.score || 0) < pkBet) { playSound('error'); return pkMessage('Не хватает крышек на повышение.', 'err'); }
    pkPutIn(pkBet);
    if (pkBotCalls()) {
        pkPot += pkBet;
        pkMessage('Бот уравнял.', 'dim');
        pkShowdown();
    } else {
        pkWin(`Бот сбросил карты! Банк ваш: +${pkPot} ${CAP}`, false);
    }
}

function pkCheck() {
    if (pkPhase !== 'bet') return;
    if (pkBotBets()) {
        pkPot += pkBet;
        pkPhase = 'respond';
        playSound('hazard');
        pkMessage(`Бот повышает на ${pkBet} ${CAP}. Уравнять или сбросить?`, 'warn');
        pkRender();
    } else {
        pkShowdown();
    }
}

function pkCall() {
    if (pkPhase !== 'respond') return;
    if ((player.score || 0) < pkBet) { playSound('error'); return pkMessage('Не хватает крышек, чтобы уравнять.', 'err'); }
    pkPutIn(pkBet);
    pkShowdown();
}

function pkFold() {
    if (pkPhase !== 'bet' && pkPhase !== 'respond') return;
    pkPhase = 'idle';
    saveState();
    playSound('error');
    pkMessage(`Вы сбросили карты. Потеряно: ${pkPlayerIn} ${CAP}`, 'lose');
    pkRender(false);
}

function pkShowdown() {
    let me = pokerEval(pkHand), bot = pokerEval(pkBot);
    let cmp = pokerCompare(me, bot);
    if (cmp > 0) return pkWin(`${me.name} против «${bot.name}» у бота. Выигрыш: +${pkPot} ${CAP}`, true);
    pkPhase = 'idle';
    if (cmp === 0) {
        let half = Math.floor(pkPot / 2);
        player.score += half;
        saveState();
        playSound('scan');
        pkMessage(`Ничья: у обоих «${me.name}». Банк поделен, вам ${half} ${CAP}.`, 'dim');
    } else {
        saveState();
        playSound('error');
        pkMessage(`У бота «${bot.name}», у вас «${me.name}». Проиграно: ${pkPlayerIn} ${CAP}`, 'lose');
    }
    pkRender(true);
}

function pkWin(msg, showBot) {
    player.score += pkPot;
    pkPhase = 'idle';
    saveState();
    playSound('sell');
    pkMessage(msg, 'win');
    pkRender(showBot);
}

// ---------- Отрисовка ----------

function pkMessage(html, kind) {
    let el = document.getElementById('pk-log');
    if (!el) return;
    let color = { win: 'var(--term-green)', lose: 'var(--bandit-color)', err: 'var(--bandit-color)', warn: 'var(--rad-color)', dim: 'var(--text-dim)' }[kind] || '#ccc';
    el.innerHTML = `<span style="color:${color}">${html}</span>`;
}

// revealBot — показать карты бота (после вскрытия)
function pkRender(revealBot) {
    let botEl = document.getElementById('pk-bot');
    if (!botEl) return;
    let hideBot = pkPhase !== 'idle' || !revealBot;
    botEl.innerHTML = pkBot.map(c => cardHtml(c, { hidden: hideBot })).join('') || '<span class="card-empty">—</span>';
    document.getElementById('pk-bot-info').innerText = pkBot.length
        ? (hideBot ? (pkPhase === 'draw' ? '' : `сменил карт: ${pkBotDrew}`) : pokerEval(pkBot).name) : '';
    document.getElementById('pk-hand').innerHTML = pkHand.map((c, i) => cardHtml(c, {
        selected: !!pkSel[i], onclick: pkPhase === 'draw' ? `pkToggle(${i})` : ''
    })).join('') || '<span class="card-empty">—</span>';
    document.getElementById('pk-hand-info').innerText = pkHand.length ? pokerEval(pkHand).name : '';
    document.getElementById('pk-pot').innerText = pkPhase === 'idle' ? '—' : pkPot;
    document.getElementById('pk-bet-val').innerText = pkBet;

    let show = (id, on) => { document.getElementById(id).style.display = on ? 'flex' : 'none'; };
    show('pk-bet-controls', pkPhase === 'idle');
    document.getElementById('pk-deal-btn').style.display = pkPhase === 'idle' ? 'block' : 'none';
    show('pk-draw-controls', pkPhase === 'draw');
    show('pk-bet-actions', pkPhase === 'bet');
    show('pk-respond-actions', pkPhase === 'respond');
    let n = Object.keys(pkSel).length;
    document.getElementById('pk-draw-btn').innerText = n ? `ОБМЕНЯТЬ (${n})` : 'ОСТАВИТЬ ВСЕ';
}

// ---------- Вкладки казино ----------

function casinoTab(name) {
    ['slots', 'bj', 'poker'].forEach(t => {
        document.getElementById('casino-' + t).style.display = (t === name) ? 'block' : 'none';
        document.getElementById('casino-tab-' + t).classList.toggle('active-nav', t === name);
    });
    playSound('click');
    if (name === 'bj') bjRender();
    if (name === 'poker') pkRender();
}
