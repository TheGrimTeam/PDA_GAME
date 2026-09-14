// ============================================================
// СОСТОЯНИЕ ИГРОКА
// ============================================================
// Загрузка из localStorage, миграция старых сохранений,
// инициализация полей по умолчанию.
// ============================================================

let savedPlayer = JSON.parse(localStorage.getItem(STORAGE_KEY_PLAYER));
let defaultCallsign = "GRIM-" + Math.floor(Math.random() * 9000 + 1000);

let pendingRepairWeapon = null;

let player = savedPlayer || {
    callsign: defaultCallsign, karma_score: 0, tokens_collected: 0,
    hp: 100, rads: 0, hunger: 100, maxSize: 30, score: 0,
    inventory: [], safeBox: [], safeBoxUnlocked: false,
    scannedCodes: {}, quests: { active: [], choices: [] }, upgradeQuest: genQ(1, 2), safeBoxQuest: genQ(3, 5), radioOn: false,
    equipment: null, completedQuestsCount: 0, npcRep: {},
    shelterLevel: 0,
    stats: { survivedSeconds: 0, questsDone: 0, corpsesRobbed: 0, itemsFound: 0, deaths: 0, foodEaten: 0, medsUsed: 0 }
};

if (!player.callsign) player.callsign = defaultCallsign;
if (player.karma_score === undefined) {
    player.karma_score = player.karma === "bandit" ? -3 : 0;
}
if (player.rads === undefined) player.rads = 0;
if (player.tokens_collected === undefined) player.tokens_collected = 0;
if (player.hunger === undefined) player.hunger = 100;
if (player.radioOn === undefined) player.radioOn = false;
if (!player.quests) player.quests = { active: null, choices: [] };
if (!player.safeBox) player.safeBox = [];
if (player.safeBoxUnlocked === undefined) player.safeBoxUnlocked = false;
if (Array.isArray(player.scannedCodes)) player.scannedCodes = {};
if (!Array.isArray(player.upgradeQuest)) player.upgradeQuest = genQ(1, 2);
if (!Array.isArray(player.safeBoxQuest)) player.safeBoxQuest = genQ(3, 5);
if (player.equipment === undefined) player.equipment = null;
if (!player.npcRep) player.npcRep = {};
if (!player.processedTradeTxs) player.processedTradeTxs = {};
if (!player.role) player.role = 'Безработный';
if (player.shelterLevel === undefined) player.shelterLevel = 0;
if (player.backpackUpgradesCount === undefined) player.backpackUpgradesCount = 0;

if (!player.stats) player.stats = { survivedSeconds: 0, questsDone: 0, corpsesRobbed: 0, itemsFound: 0, deaths: 0, foodEaten: 0, medsUsed: 0 };
if (player.stats.survivedSeconds === undefined) player.stats.survivedSeconds = 0;
if (player.stats.questsDone === undefined) player.stats.questsDone = player.completedQuestsCount || 0;
if (player.stats.corpsesRobbed === undefined) player.stats.corpsesRobbed = 0;
if (player.stats.itemsFound === undefined) player.stats.itemsFound = 0;
if (player.stats.deaths === undefined) player.stats.deaths = 0;
if (player.stats.foodEaten === undefined) player.stats.foodEaten = 0;
if (player.stats.medsUsed === undefined) player.stats.medsUsed = 0;

// Инициализация репутации для каждого NPC
if (!player.npcRep || typeof player.npcRep !== 'object') player.npcRep = {};
['npc_med', 'npc_eng', 'npc_trad', 'npc_bar'].forEach(npcId => {
    if (player.npcRep[npcId] === undefined) {
        player.npcRep[npcId] = 0;
    }
});
