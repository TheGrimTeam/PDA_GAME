// ============================================================
// КОНСТАНТЫ И НАСТРОЙКИ ИГРЫ
// ============================================================
// Здесь собраны базовые числовые лимиты, префиксы QR-кодов,
// цвета интерфейса и прочие неизменяемые значения.
// ============================================================

// --- Цвета интерфейса (используются в JS-логике) ---
const COLOR_TERM_GREEN = '#39ff14';
const COLOR_TRADE = '#00e5ff';
const COLOR_BANDIT = '#ff3333';
const COLOR_RAD = '#ffcc00';
const COLOR_HERO = '#ffd700';

// --- Префиксы QR-кодов ---
const QR_PREFIX_ITEM = 'item_';
const QR_PREFIX_FOOD = 'food_';
const QR_PREFIX_MED = 'med_';
const QR_PREFIX_WPN = 'wpn_';
const QR_PREFIX_JUNK = 'junk_';
const QR_PREFIX_GEAR = 'gear_';
const QR_PREFIX_LOOT = 'loot';
const QR_PREFIX_ROB = 'rob:';
const QR_PREFIX_HEAL = 'heal:';
const QR_PREFIX_SAFE = 'safe_';
const QR_PREFIX_USB = 'usb_';
const QR_PREFIX_TERM = 'term_';
const QR_PREFIX_ARREST = 'arrest:';
const QR_PREFIX_BANDIT_ID = 'bandit_id:';
const QR_PREFIX_PLAYER_ID = 'player_id:';
const QR_PREFIX_ZOMBIE_ID = 'zombie_id:';

// --- Игровые лимиты ---
const MAX_HP_BASE = 100;
const MAX_HUNGER = 100;
const MAX_RADS = 60;   // максимальный уровень радиации (потолок накопления)
const MAX_BACKPACK_SIZE = 30;
const INFECTION_TIME_MS = 5 * 60 * 1000;   // 5 минут до превращения
const ZOMBIE_TIME_MS = 10 * 60 * 1000;     // 10 минут в зомби
const BLOWOUT_INTERVAL_MS = 60 * 60 * 1000; // период выброса (раз в 60 минут)

// --- Ключи localStorage ---
const STORAGE_KEY_PLAYER = 'wasteland_player';
const STORAGE_KEY_MAP_MARKERS = 'pda_zone_markers';
const STORAGE_KEY_MAP_BG = 'pda_custom_map_bg';
