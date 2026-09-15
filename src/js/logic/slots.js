// ============================================================
// МИНИ-ИГРА: ИГРОВОЙ АВТОМАТ
// ============================================================

let currentSlotBet = 10;
let isSlotSpinning = false;
const slotSymbols = [
    { char: '🔋', weight: 25, payout: 3 },    // Батарея
    { char: '💊', weight: 20, payout: 4 },    // Рад-Х
    { char: '🔫', weight: 15, payout: 5 },    // Ствол
    { char: '☣️', weight: 12, payout: 6 },    // Биохазард
    { char: '💎', weight: 6, payout: 15 },    // Кристаллы (джекпот!)
    { char: '💀', weight: 22, payout: 0 }     // Череп (пустышка)
];

function updateSlotUI() {
    let balanceVal = document.getElementById('slot-balance-val');
    let betVal = document.getElementById('slot-bet-val');
    if (balanceVal) balanceVal.innerText = player.score || 0;
    if (betVal) betVal.innerText = currentSlotBet;
}

function adjustSlotBet(amount) {
    if (isSlotSpinning) return;
    currentSlotBet = Math.max(5, Math.min(100, currentSlotBet + amount));
    playSound('scan');
    updateSlotUI();
}

function setSlotBetMax() {
    if (isSlotSpinning) return;
    currentSlotBet = Math.max(5, Math.min(100, player.score || 0));
    if (currentSlotBet < 5) currentSlotBet = 5;
    playSound('scan');
    updateSlotUI();
}

function getRandomSlotSymbol() {
    let totalWeight = slotSymbols.reduce((sum, s) => sum + s.weight, 0);
    let rand = Math.random() * totalWeight;
    let cumulative = 0;
    for (let s of slotSymbols) {
        cumulative += s.weight;
        if (rand <= cumulative) return s;
    }
    return slotSymbols[0];
}

function spinSlots() {
    if (isSlotSpinning) return;
    if ((player.score || 0) < currentSlotBet) {
        playSound('error');
        let log = document.getElementById('slot-result-log');
        if (log) log.innerHTML = "<span style='color:var(--bandit-color); font-weight:bold;'>НЕДОСТАТОЧНО КРИСТАЛЛОВ 💎!</span>";
        return;
    }

    isSlotSpinning = true;
    player.score -= currentSlotBet;
    saveState();
    updateSlotUI();

    let log = document.getElementById('slot-result-log');
    if (log) log.innerHTML = "<span style='color:var(--quest-color);'>Барабаны вращаются...</span>";

    let spinCount = 0;
    const spinInterval = setInterval(() => {
        document.getElementById('slot-reel-1').innerText = slotSymbols[Math.floor(Math.random() * slotSymbols.length)].char;
        document.getElementById('slot-reel-2').innerText = slotSymbols[Math.floor(Math.random() * slotSymbols.length)].char;
        document.getElementById('slot-reel-3').innerText = slotSymbols[Math.floor(Math.random() * slotSymbols.length)].char;
        playSound('click');
        spinCount++;

        if (spinCount >= 10) {
            clearInterval(spinInterval);
            resolveSlots();
        }
    }, 100);
}

function resolveSlots() {
    let sym1 = getRandomSlotSymbol();
    let sym2 = getRandomSlotSymbol();
    let sym3 = getRandomSlotSymbol();

    document.getElementById('slot-reel-1').innerText = sym1.char;
    document.getElementById('slot-reel-2').innerText = sym2.char;
    document.getElementById('slot-reel-3').innerText = sym3.char;

    let log = document.getElementById('slot-result-log');
    let winAmount = 0;

    if (sym1.char === sym2.char && sym2.char === sym3.char) {
        if (sym1.payout > 0) {
            winAmount = Math.round(currentSlotBet * sym1.payout);
            playSound('karma');
            if (log) log.innerHTML = '<span style="color:var(--term-green); font-weight:bold;">ДЖЕКПОТ! 3x ' + sym1.char + '! Выигрыш: +' + winAmount + ' 💎</span>';
        } else {
            player.rads = Math.min(MAX_RADS, (player.rads || 0) + 5);
            playSound('death');
            if (log) log.innerHTML = '<span style="color:var(--bandit-color); font-weight:bold;">ПРОКЛЯТЫЙ ДЖЕКПОТ 3x 💀! Получено +5 Рад!</span>';
        }
    } else if (sym1.char === sym2.char || sym2.char === sym3.char || sym1.char === sym3.char) {
        let matchingSym = (sym1.char === sym2.char || sym1.char === sym3.char) ? sym1 : sym2;
        if (matchingSym.payout > 0) {
            winAmount = Math.round(currentSlotBet * 1.5);
            playSound('sell');
            if (log) log.innerHTML = '<span style="color:var(--trade-color);">Победа! Пара ' + matchingSym.char + '! Выигрыш: +' + winAmount + ' 💎</span>';
        } else {
            playSound('error');
            if (log) log.innerHTML = '<span style="color:#888;">Пусто! Пара черепов 💀 принесла лишь пыль.</span>';
        }
    } else {
        playSound('error');
        if (log) log.innerHTML = '<span style="color:#777;">Мимо! Ни одного совпадения.</span>';
    }

    if (winAmount > 0) {
        player.score += winAmount;
    }

    saveState();
    updateSlotUI();
    isSlotSpinning = false;
}
