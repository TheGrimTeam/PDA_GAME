// ============================================================
// БАЗА NPC И ТОРГОВЫХ ТОЧЕК
// ============================================================

const NPC_DB = {
    "npc_eng": { name: "Инженер Михалыч", buys: ["junk", "gear"], sells: ["junk", "gear"] },
    "npc_med": { name: "Доктор Кроу", buys: ["med"], sells: ["med"], canHeal: true, healCost: 300 },
    "npc_trad": { name: "Торговец Сидорович", buys: ["weapon", "gear", "artifact"], sells: ["weapon", "gear"] },
    "npc_bar": { name: "Бармен Джо", buys: ["food"], sells: ["food"] },
    "npc_base": { name: "ТЕРМИНАЛ БАЗЫ", isBase: true, reqKarma: "survivor", mult: 1.0 },
    "npc_bandit_base": { name: "ЛАГЕРЬ БАНДИТОВ", isBase: true, reqKarma: "bandit", mult: 0.7 }
};

// Расчёт уровня репутации (Ур. 0 до Ур. 10) по очкам
function getNpcRepLevel(repPoints) {
    let lvl = Math.floor(repPoints / 20);
    return Math.min(10, Math.max(0, lvl));
}
