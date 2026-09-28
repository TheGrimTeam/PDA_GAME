// ============================================================
// УТИЛИТЫ И ОБЩИЕ ХЕЛПЕРЫ
// ============================================================

// Вспомогательная функция для получения названия ранга по карме
function getKarmaStatus() {
    if (player.karma_score >= 3) return { name: "ГЕРОЙ", class: "hero-glow" };
    if (player.karma_score <= -3) return { name: "БАНДИТ", class: "danger" };
    return { name: "ВЫЖИВШИЙ", class: "" };
}

function getMaxHp() {
    let crowRep = (player.npcRep && player.npcRep['npc_med']) || 0;
    let crowLvl = getNpcRepLevel(crowRep);
    let baseMaxHp = Math.round(MAX_HP_BASE * (1 + crowLvl * 0.1));
    if (player.shelterLevel >= 4) {
        baseMaxHp = Math.round(baseMaxHp * 1.1); // Убежище 4 ур: +10% макс HP
    }
    if (hasSynthCore()) baseMaxHp += 50; // «Ядро Синтеза» в рюкзаке
    baseMaxHp += ((player.level || 1) - 1) * HP_PER_LEVEL; // уровень персонажа
    baseMaxHp += perkRank('toughness') * 20;               // перк «Живучий»
    return baseMaxHp;
}

// Максимальная сытость: база + Бармен Джо (+10 за уровень) + «Ядро Синтеза» (+50)
function getMaxHunger() {
    let barLvl = getNpcRepLevel((player.npcRep && player.npcRep['npc_bar']) || 0);
    return MAX_HUNGER + (barLvl * 10) + (hasSynthCore() ? 50 : 0);
}

// Реальный потолок HP с учётом радиации (радиация съедает максимум здоровья).
// Единая точка правды — не дублировать вычитание player.rads в других местах.
function getEffectiveMaxHp() {
    return getMaxHp() - (player.rads || 0);
}

function getRadMultiplier() {
    let mult = 1.0;
    // Противогаз работает и как предмет арсенала, и как надетое спецснаряжение eq_gas
    let hasMask = (player.equipment === 'eq_gas') ||
        (player.weapons && player.weapons["Противогаз ГП-5"] && player.weapons["Противогаз ГП-5"].active && player.weapons["Противогаз ГП-5"].durability > 0);
    let hasCloak = (player.equipment === 'eq_rad');

    if (hasCloak && hasMask) {
        mult = 0.5 * 0.4; // 0.2 (суммарная защита: -80% радиации!)
    } else if (hasMask) {
        mult = 0.4; // -60% радиации
    } else if (hasCloak) {
        mult = 0.5; // -50% радиации
    }
    return Math.max(0.15, mult); // Полного абсолютного иммунитета без читов нет, но защита максимальная
}

// Накопитель дробных приращений: возвращает целую часть накопленного значения,
// а остаток сохраняет в player.fractions[key] до следующего тика.
// Нужен, чтобы процентные бонусы (−10% и т.п.) к маленьким целым величинам
// (2 РАД/мин, 3 ЕДА/мин, 1–3% износа) не терялись при округлении.
function takeWhole(key, amount) {
    if (!player.fractions || typeof player.fractions !== 'object') player.fractions = {};
    let total = (player.fractions[key] || 0) + amount;
    let whole = Math.floor(total + 1e-9);
    player.fractions[key] = total - whole;
    return whole;
}

function formatSurvivalTime(seconds) {
    if (!seconds) return "00:00:00";
    let h = Math.floor(seconds / 3600);
    let m = Math.floor((seconds % 3600) / 60);
    let s = seconds % 60;
    return [h, m, s].map(v => v < 10 ? "0" + v : v).join(":");
}

function showBanner(text, color) {
    let b = document.getElementById('event-banner');
    b.innerText = text;
    b.style.display = 'block';
    b.style.background = color;
    b.style.color = '#000';
    setTimeout(() => b.style.display = 'none', 5000);
}

function saveState() {
    localStorage.setItem(STORAGE_KEY_PLAYER, JSON.stringify(player));
    updateHUD();
    try {
        let invView = document.getElementById('view-inventory');
        if (invView && invView.classList.contains('active')) {
            renderInventory();
        }
        let questView = document.getElementById('view-quests');
        if (questView && questView.classList.contains('active')) {
            renderQuests();
        }
        let profView = document.getElementById('view-profile');
        if (profView && profView.classList.contains('active')) {
            renderProfile();
        }
    } catch (e) {
        console.error("saveState ui update error:", e);
    }
}

function changeCallsign() {
    let newName = prompt("Введите ваш новый позывной:", player.callsign);
    if (newName && newName.trim() !== "") { player.callsign = newName.trim(); saveState(); renderProfile(); }
}

