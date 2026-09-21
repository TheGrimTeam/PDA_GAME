// ============================================================
// КОНСТАНТЫ ТЕСТОВОЙ ИНФРАСТРУКТУРЫ
// ============================================================
// Дублируют значения из src/js/config/constants.js, чтобы тесты
// не зависели от рантайма приложения.
// ============================================================

// --- Ключи localStorage ---
export const STORAGE_KEY_PLAYER = 'wasteland_player';
export const STORAGE_KEY_MAP_MARKERS = 'pda_zone_markers';
export const STORAGE_KEY_MAP_BG = 'pda_custom_map_bg';
export const STORAGE_KEY_HEARTBEAT = 'pda_heartbeat';
export const STORAGE_KEY_NOTES = 'wasteland_notes';

// --- Игровые лимиты ---
export const MAX_HP_BASE = 100;
export const MAX_HUNGER = 100;
export const MAX_RADS = 60;
export const MAX_BACKPACK_SIZE = 30;

// --- Префиксы QR-кодов ---
export const QR_PREFIX_ITEM = 'item_';
export const QR_PREFIX_FOOD = 'food_';
export const QR_PREFIX_MED = 'med_';
export const QR_PREFIX_WPN = 'wpn_';
export const QR_PREFIX_JUNK = 'junk_';
export const QR_PREFIX_GEAR = 'gear_';
export const QR_PREFIX_LOOT = 'loot';
export const QR_PREFIX_ROB = 'rob:';
export const QR_PREFIX_HEAL = 'heal:';
export const QR_PREFIX_HEAL_ITEM = 'healitem:';
export const QR_PREFIX_SAFE = 'safe_';
export const QR_PREFIX_USB = 'usb_';
export const QR_PREFIX_TERM = 'term_';
export const QR_PREFIX_ARREST = 'arrest:';
export const QR_PREFIX_BANDIT_ID = 'bandit_id:';
export const QR_PREFIX_PLAYER_ID = 'player_id:';
export const QR_PREFIX_ZOMBIE_ID = 'zombie_id:';
export const QR_PREFIX_ANOM = 'anom_';

// --- Вьюхи приложения ---
export const VIEWS = [
  'base',
  'scan',
  'inventory',
  'quests',
  'shelter',
  'map',
  'profile',
  'dead',
] as const;

export type ViewName = (typeof VIEWS)[number];
