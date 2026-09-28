// ============================================================
// КАЗИНО: «21 ОЧКО» (блэкджек против дилера)
// ============================================================
// Цель — набрать больше дилера, но не больше 21.
// Туз — 1 или 11, картинки — 10. Дилер добирает до 17.
// Выплаты: победа ×2, «очко» (21 с двух карт) ×2.5, ничья — возврат ставки.
// ============================================================

let bjBet = 10;
let bjStake = 0;          // сколько поставлено в текущей раздаче (с учётом удвоения)
let bjDeck = [];
let bjPlayer = [];
let bjDealer = [];
let bjActive = false;     // раздача идёт, ход игрока

function bjValue(hand) {
    let sum = 0, aces = 0;
    for (let c of hand) {
        if (c.v === 14) { aces++; sum += 11; }
        else sum += Math.min(c.v, 10);
    }
    while (sum > 21 && aces > 0) { sum -= 10; aces--; }
    return sum;
}

function bjIsNatural(hand) {
    return hand.length === 2 && bjValue(hand) === 21;
}

function bjAdjustBet(delta) {
    if (bjActive) return;
    bjBet = casinoClampBet(bjBet + delta);
    playSound('click');
    bjRender();
}

// Новая раздача. deck — готовая колода (для тестов), иначе перемешанная
function bjDeal(deck) {
    if (bjActive) return;
    if ((player.score || 0) < bjBet) {
        playSound('error');
        return bjMessage(`Мало крышек: ставка ${bjBet}, у вас ${player.score || 0}.`, 'err');
    }
    player.score -= bjBet;
    bjStake = bjBet;
    bjDeck = deck ? deck.slice() : cardsNewDeck();
    bjPlayer = [bjDeck.pop(), bjDeck.pop()];
    bjDealer = [bjDeck.pop(), bjDeck.pop()];
    bjActive = true;
    saveState();
    playSound('scan');

    if (bjIsNatural(bjPlayer) || bjIsNatural(bjDealer)) return bjFinish();
    bjMessage('Ваш ход: ЕЩЁ — взять карту, ХВАТИТ — остановиться.', 'dim');
    bjRender();
}

function bjHit() {
    if (!bjActive) return;
    bjPlayer.push(bjDeck.pop());
    playSound('click');
    let v = bjValue(bjPlayer);
    if (v > 21) return bjFinish();
    if (v === 21) return bjStand();
    bjRender();
}

function bjStand() {
    if (!bjActive) return;
    // Дилер добирает, пока меньше 17
    while (bjValue(bjDealer) < 17) bjDealer.push(bjDeck.pop());
    bjFinish();
}

// Удвоение: только на первых двух картах — ставка ×2, одна карта и стоп
function bjDouble() {
    if (!bjActive || bjPlayer.length !== 2) return;
    if ((player.score || 0) < bjStake) {
        playSound('error');
        return bjMessage('Не хватает крышек, чтобы удвоить.', 'err');
    }
    player.score -= bjStake;
    bjStake *= 2;
    bjPlayer.push(bjDeck.pop());
    if (bjValue(bjPlayer) > 21) return bjFinish();
    bjStand();
}

function bjFinish() {
    bjActive = false;
    let p = bjValue(bjPlayer), d = bjValue(bjDealer);
    let payout = 0, msg, kind;

    if (bjIsNatural(bjPlayer) && !bjIsNatural(bjDealer)) {
        payout = Math.floor(bjStake * 2.5); msg = `ОЧКО! 21 с двух карт. Выигрыш: +${payout} ${CAP}`; kind = 'win';
    } else if (bjIsNatural(bjDealer) && !bjIsNatural(bjPlayer)) {
        msg = `У дилера очко. Ставка ${bjStake} ${CAP} проиграна.`; kind = 'lose';
    } else if (p > 21) {
        msg = `Перебор (${p}). Ставка ${bjStake} ${CAP} проиграна.`; kind = 'lose';
    } else if (d > 21) {
        payout = bjStake * 2; msg = `У дилера перебор (${d})! Выигрыш: +${payout} ${CAP}`; kind = 'win';
    } else if (p > d) {
        payout = bjStake * 2; msg = `${p} против ${d}. Выигрыш: +${payout} ${CAP}`; kind = 'win';
    } else if (p === d) {
        payout = bjStake; msg = `Ничья (${p}). Ставка возвращена.`; kind = 'dim';
    } else {
        msg = `${p} против ${d}. Ставка ${bjStake} ${CAP} проиграна.`; kind = 'lose';
    }

    player.score += payout;
    saveState();
    playSound(kind === 'win' ? 'sell' : (kind === 'lose' ? 'error' : 'scan'));
    bjMessage(msg, kind);
    bjRender();
}

function bjMessage(html, kind) {
    let el = document.getElementById('bj-log');
    if (!el) return;
    let color = { win: 'var(--term-green)', lose: 'var(--bandit-color)', err: 'var(--bandit-color)', dim: 'var(--text-dim)' }[kind] || '#ccc';
    el.innerHTML = `<span style="color:${color}">${html}</span>`;
}

function bjRender() {
    let dealerEl = document.getElementById('bj-dealer');
    if (!dealerEl) return;
    let dealerCards = bjDealer.map((c, i) => cardHtml(c, { hidden: bjActive && i === 1 })).join('');
    dealerEl.innerHTML = dealerCards || '<span class="card-empty">—</span>';
    document.getElementById('bj-dealer-val').innerText = bjDealer.length ? (bjActive ? `${bjValue([bjDealer[0]])} + ?` : bjValue(bjDealer)) : '';
    document.getElementById('bj-player').innerHTML = bjPlayer.map(c => cardHtml(c)).join('') || '<span class="card-empty">—</span>';
    document.getElementById('bj-player-val').innerText = bjPlayer.length ? bjValue(bjPlayer) : '';
    document.getElementById('bj-bet-val').innerText = bjActive ? bjStake : bjBet;

    document.getElementById('bj-bet-controls').style.display = bjActive ? 'none' : 'flex';
    document.getElementById('bj-deal-btn').style.display = bjActive ? 'none' : 'block';
    document.getElementById('bj-play-controls').style.display = bjActive ? 'flex' : 'none';
    document.getElementById('bj-double-btn').disabled = !(bjActive && bjPlayer.length === 2 && (player.score || 0) >= bjStake);
}
