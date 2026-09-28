// ============================================================
// КАЗИНО: РУЛЕТКА (европейская, один ноль)
// ============================================================
// 37 ячеек: 0 (зелёный) и 1–36 (красные/чёрные). Одна ставка на спин.
// Выплаты (вместе со ставкой): цвет, чёт/нечет, 1–18/19–36 — ×2;
// дюжина — ×3; число — ×36. На ноль проигрывают все ставки, кроме «0».
// ============================================================

// Порядок чисел на настоящем европейском колесе (по часовой стрелке)
const RL_WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const RL_RED = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const RL_SPIN_MS = 3200;

// Виды ставок: подпись, проверка выигрыша, множитель выплаты
const RL_BETS = {
    red:   { label: 'КРАСНОЕ', mult: 2, win: n => RL_RED.includes(n) },
    black: { label: 'ЧЁРНОЕ',  mult: 2, win: n => n > 0 && !RL_RED.includes(n) },
    even:  { label: 'ЧЁТ',     mult: 2, win: n => n > 0 && n % 2 === 0 },
    odd:   { label: 'НЕЧЕТ',   mult: 2, win: n => n % 2 === 1 },
    low:   { label: '1–18',    mult: 2, win: n => n >= 1 && n <= 18 },
    high:  { label: '19–36',   mult: 2, win: n => n >= 19 },
    d1:    { label: '1–12',    mult: 3, win: n => n >= 1 && n <= 12 },
    d2:    { label: '13–24',   mult: 3, win: n => n >= 13 && n <= 24 },
    d3:    { label: '25–36',   mult: 3, win: n => n >= 25 },
    num:   { label: 'ЧИСЛО',   mult: 36, win: n => n === rlNumber }
};

let rlBet = 10;
let rlType = 'red';
let rlNumber = 17;
let rlSpinning = false;
let rlAngle = 0;          // текущий поворот колеса, градусы
let rlHistory = [];       // последние выпавшие числа
let rlBuilt = false;

function rlColor(n) {
    if (n === 0) return 'green';
    return RL_RED.includes(n) ? 'red' : 'black';
}

function rlAdjustBet(delta) {
    if (rlSpinning) return;
    rlBet = casinoClampBet(rlBet + delta);
    playSound('click');
    rlRender();
}

function rlChoose(type) {
    if (rlSpinning) return;
    rlType = type;
    playSound('click');
    rlRender();
}

function rlAdjustNumber(delta) {
    if (rlSpinning) return;
    rlNumber = (rlNumber + delta + 37) % 37;
    rlType = 'num';
    playSound('click');
    rlRender();
}

function rlBetLabel() {
    return rlType === 'num' ? `число ${rlNumber}` : RL_BETS[rlType].label.toLowerCase();
}

// Запуск. forced — заранее заданное число (для тестов), instant — без анимации
function rlSpin(forced, instant) {
    if (rlSpinning) return;
    if ((player.score || 0) < rlBet) {
        playSound('error');
        return rlMessage(`Мало крышек: ставка ${rlBet}, у вас ${player.score || 0}.`, 'err');
    }
    player.score -= rlBet;
    saveState();
    let result = (typeof forced === 'number') ? forced : Math.floor(Math.random() * 37);
    rlSpinning = true;
    rlMessage(`Ставка ${rlBet} ${CAP} на ${rlBetLabel()}. Колесо крутится...`, 'dim');
    rlRender();
    playSound('radio');

    // Поворачиваем так, чтобы ячейка результата встала под указатель сверху
    let step = 360 / RL_WHEEL.length;
    let target = -RL_WHEEL.indexOf(result) * step;
    let current = ((rlAngle % 360) + 360) % 360;
    let delta = ((target - current) % 360 + 360) % 360;
    rlAngle += 360 * 5 + delta;
    let wheel = document.getElementById('rl-wheel-rot');
    if (wheel) {
        wheel.style.transition = instant ? 'none' : `transform ${RL_SPIN_MS}ms cubic-bezier(0.15, 0.6, 0.2, 1)`;
        wheel.style.transform = `rotate(${rlAngle}deg)`;
    }
    if (instant) rlResolve(result);
    else setTimeout(() => rlResolve(result), RL_SPIN_MS);
}

function rlResolve(n) {
    rlSpinning = false;
    rlHistory.unshift(n);
    rlHistory = rlHistory.slice(0, 10);
    let bet = RL_BETS[rlType];
    let colorName = { red: 'красное', black: 'чёрное', green: 'зеро' }[rlColor(n)];
    if (bet.win(n)) {
        let payout = rlBet * bet.mult;
        player.score += payout;
        playSound(bet.mult >= 36 ? 'quest' : 'sell');
        rlMessage(`Выпало ${n} (${colorName}). Выигрыш: +${payout} ${CAP}`, 'win');
    } else {
        playSound('error');
        rlMessage(`Выпало ${n} (${colorName}). Ставка ${rlBet} ${CAP} проиграна.`, 'lose');
    }
    saveState();
    rlRender();
}

function rlMessage(html, kind) {
    let el = document.getElementById('rl-log');
    if (!el) return;
    let color = { win: 'var(--term-green)', lose: 'var(--bandit-color)', err: 'var(--bandit-color)', dim: 'var(--text-dim)' }[kind] || '#ccc';
    el.innerHTML = `<span style="color:${color}">${html}</span>`;
}

// Колесо: 37 секторов с номерами (строится один раз)
function rlBuildWheel() {
    let svg = document.getElementById('rl-wheel-rot');
    if (!svg || rlBuilt) return;
    rlBuilt = true;
    let step = 360 / RL_WHEEL.length, R = 98, r = 62, parts = '';
    const pt = (rad, deg) => {
        let a = (deg - 90) * Math.PI / 180;
        return `${(100 + rad * Math.cos(a)).toFixed(2)},${(100 + rad * Math.sin(a)).toFixed(2)}`;
    };
    RL_WHEEL.forEach((n, i) => {
        let a1 = i * step - step / 2, a2 = i * step + step / 2;
        let fill = { red: '#b3261e', black: '#111', green: '#1b7a3a' }[rlColor(n)];
        parts += `<path d="M${pt(r, a1)} L${pt(R, a1)} A${R},${R} 0 0 1 ${pt(R, a2)} L${pt(r, a2)} A${r},${r} 0 0 0 ${pt(r, a1)} Z" fill="${fill}" stroke="#d8d8c8" stroke-width="0.4"/>`;
        let [tx, ty] = pt((R + r) / 2, i * step).split(',');
        parts += `<text x="${tx}" y="${ty}" transform="rotate(${i * step} ${tx} ${ty})" class="rl-num">${n}</text>`;
    });
    parts += `<circle cx="100" cy="100" r="${r}" fill="#06180d" stroke="#d8d8c8" stroke-width="1"/>`;
    parts += `<circle cx="100" cy="100" r="16" fill="#0b2414" stroke="var(--quest-color)" stroke-width="2"/>`;
    svg.innerHTML = parts;
}

function rlRender() {
    if (!document.getElementById('rl-log')) return;
    rlBuildWheel();
    document.getElementById('rl-bet-val').innerText = rlBet;
    document.querySelectorAll('#rl-bets button[data-bet]').forEach(b => {
        b.classList.toggle('active-nav', b.dataset.bet === rlType);
        b.disabled = rlSpinning;
    });
    let numBtn = document.getElementById('rl-num-btn');
    numBtn.innerHTML = `ЧИСЛО <b>${rlNumber}</b> ×36`;
    numBtn.className = `rl-num-pick rl-${rlColor(rlNumber)}${rlType === 'num' ? ' active-nav' : ''}`;
    document.getElementById('rl-spin-btn').disabled = rlSpinning;
    document.getElementById('rl-bet-controls').style.visibility = rlSpinning ? 'hidden' : 'visible';
    document.getElementById('rl-history').innerHTML = rlHistory.length
        ? rlHistory.map(n => `<span class="rl-chip rl-${rlColor(n)}">${n}</span>`).join('')
        : '<span style="color:var(--text-dim)">ещё не крутили</span>';
}
