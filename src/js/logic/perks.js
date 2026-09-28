// ============================================================
// ЛОГИКА ОПЫТА, УРОВНЕЙ И ПЕРКОВ
// ============================================================
// player.xp — весь накопленный опыт, player.level — текущий уровень,
// player.perkPoints — невзятые очки перков, player.perks — { id: ранг }.
// Константы и список перков — config/perks.js.
// ============================================================

function perkRank(id) {
    return (player.perks && player.perks[id]) || 0;
}

// Начислить опыт; при повышении уровня — очко перка и сообщение
function gainXp(amount) {
    if (!amount || amount <= 0) return;
    player.xp = (player.xp || 0) + amount;
    let levelsUp = 0;
    while ((player.level || 1) < MAX_LEVEL && player.xp >= xpForLevel((player.level || 1) + 1)) {
        player.level = (player.level || 1) + 1;
        player.perkPoints = (player.perkPoints || 0) + 1;
        levelsUp++;
    }
    if (levelsUp > 0) {
        playSound('quest');
        showBanner(`⭐ НОВЫЙ УРОВЕНЬ ${player.level}! +${HP_PER_LEVEL * levelsUp} к макс. HP, доступен перк (ПРОФИЛЬ)`, 'var(--hero-color)');
    }
}

// Может ли игрок взять следующий ранг перка; возвращает текст причины или ''
function perkBlockReason(id) {
    let perk = PERKS[id];
    let rank = perkRank(id);
    if (rank >= perk.maxRank) return 'максимум';
    let need = perk.minLevel[rank];
    if ((player.level || 1) < need) return `с ${need} ур.`;
    if ((player.perkPoints || 0) <= 0) return 'нет очков';
    return '';
}

function takePerk(id) {
    if (!PERKS[id] || perkBlockReason(id)) return false;
    player.perks = player.perks || {};
    player.perks[id] = perkRank(id) + 1;
    player.perkPoints--;
    playSound('upgrade');
    saveState();
    renderPerks();
    showBanner(`${PERKS[id].icon} ПЕРК «${PERKS[id].name}» — ранг ${player.perks[id]}`, 'var(--hero-color)');
    return true;
}

// Прогресс до следующего уровня: { cur, need, pct }
function xpProgress() {
    let lvl = player.level || 1;
    if (lvl >= MAX_LEVEL) return { cur: 0, need: 0, pct: 100 };
    let base = xpForLevel(lvl), next = xpForLevel(lvl + 1);
    let cur = (player.xp || 0) - base, need = next - base;
    return { cur: cur, need: need, pct: Math.min(100, Math.floor(cur / need * 100)) };
}

// Полоса опыта в шапке
function updateXpHud() {
    let lvlEl = document.getElementById('xp-level');
    if (!lvlEl) return;
    let p = xpProgress();
    lvlEl.innerText = player.level || 1;
    document.getElementById('xp-fill').style.width = p.pct + '%';
    document.getElementById('xp-text').innerText = (player.level || 1) >= MAX_LEVEL ? 'МАКС' : `${p.cur}/${p.need} XP`;
    let pts = document.getElementById('xp-points');
    if (pts) pts.style.display = (player.perkPoints || 0) > 0 ? 'inline' : 'none';
}

// Карточка «Уровень и перки» в профиле
function renderPerks() {
    let box = document.getElementById('perks-content');
    if (!box) return;
    let p = xpProgress();
    let lvl = player.level || 1;
    let html = `<div class="perk-level">УРОВЕНЬ <b>${lvl}</b>${lvl >= MAX_LEVEL ? ' (МАКС)' : ''}
        <span>${(player.xp || 0)} XP</span></div>
        <div class="perk-xpbar"><div style="width:${p.pct}%"></div></div>
        <div class="perk-sub">${lvl >= MAX_LEVEL ? 'Достигнут предел.' : `До ${lvl + 1} ур.: ${p.need - p.cur} XP`} · Бонус уровня: +${(lvl - 1) * HP_PER_LEVEL} HP</div>
        <div class="perk-points">Очки перков: <b>${player.perkPoints || 0}</b></div>`;
    for (let id in PERKS) {
        let perk = PERKS[id], rank = perkRank(id), block = perkBlockReason(id);
        let pips = '';
        for (let i = 0; i < perk.maxRank; i++) pips += i < rank ? '■' : '□';
        let btn = block
            ? `<button class="perk-btn" disabled>${block === 'максимум' ? 'ВЗЯТ' : block.toUpperCase()}</button>`
            : `<button class="perk-btn perk-btn-go" onclick="takePerk('${id}')">ВЗЯТЬ</button>`;
        html += `<div class="perk-row${rank ? ' perk-owned' : ''}">
            <div class="perk-info"><b>${perk.icon} ${perk.name}</b> <span class="perk-pips">${pips}</span><br><small>${perk.desc}</small></div>
            ${btn}
        </div>`;
    }
    box.innerHTML = html;
}
