// ============================================================
// ГЕНЕРАТОРЫ ТЕСТОВЫХ QR-КОДОВ
// ============================================================
// Формируют строки кодов в формате, который ожидает handleScan().
// ============================================================

export const QR = {
  item: (id: string) => id, // item_/food_/med_/wpn_/junk_/gear_
  loot: () => 'loot',
  npc: (key: string) => key, // npc_eng, npc_med, npc_base, ...
  anomaly: (id = 'anom_1') => id,
  safe: (id = 'safe_1') => id,
  usb: (id = 'usb_1') => id,
  term: (id = 'term_1') => id,
  heal: (corpseId: string, name: string) => `heal:${corpseId}:${name}`,
  healItem: (txId: string, itemId: string, heal: number, name: string) =>
    `healitem:${txId}:${itemId}:${heal}:${name}`,
  rob: (
    type: 'bandit' | 'survivor' | 'military',
    id: string,
    name: string,
    items: string[],
    score: number,
  ) => `rob:${type}:${id}:${name}:${items.join(',')}:${score}`,
  arrest: (id: string) => `arrest:${id}`,
  banditId: (id: string) => `bandit_id:${id}`,
  playerId: (id: string) => `player_id:${id}`,
  zombieId: (id: string) => `zombie_id:${id}`,
  p2pSell: (payload: string) => `p2ptrade:sell:${payload}`,
  p2pConfirm: (payload: string) => `p2ptrade:confirm:${payload}`,
};
