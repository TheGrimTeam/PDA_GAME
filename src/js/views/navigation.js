// ============================================================
// VIEWS: НАВИГАЦИЯ
// Переключение вьюх, HUD, баннеры событий
// ============================================================

function switchView(viewName) {
    if (player.hp <= 0 && viewName !== 'base' && viewName !== 'profile') return;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('#nav-buttons button').forEach(b => b.classList.remove('active-nav'));
    document.getElementById(`view-${viewName}`).classList.add('active');

    if (viewName === 'base' || viewName === 'dead' || player.hp <= 0) {
        document.getElementById('nav-buttons').style.display = 'none';
    } else {
        document.getElementById('nav-buttons').style.display = 'grid';
        if (document.getElementById(`btn-nav-${viewName}`)) document.getElementById(`btn-nav-${viewName}`).classList.add('active-nav');
    }

    if (viewName !== 'scan' && scanner) {
        try {
            scanner.stop().catch(e => {});
        } catch(e) {}
    }
    if(viewName === 'inventory') renderInventory();
    if(viewName === 'quests') renderQuests();
    if(viewName === 'profile') renderProfile();
    if(viewName === 'base') renderBaseView();
    if(viewName === 'shelter') renderShelter();

    let manualEl = document.getElementById('manual-code');
    if (manualEl) manualEl.placeholder = (viewName === 'scan') ? "Код (junk_1, anom_1, npc_base)" : "Код";
}

function updateHUD() {
    try {
        if (player.rads > MAX_RADS) player.rads = MAX_RADS;
        let baseMaxHp = getMaxHp();
        let maxHp = getEffectiveMaxHp();
        if (player.hp > maxHp) {
            player.hp = maxHp;
        }

        // Проверка критического уровня здоровья (виньетка)
        let vig = document.getElementById('low-hp-overlay');
        if (vig) {
            if (player.hp <= 25 && player.hp > 0 && !player.inBase) {
                vig.classList.add('low-hp-active');
            } else {
                vig.classList.remove('low-hp-active');
            }
        }

        let k = getKarmaStatus();

        if (document.getElementById('hp-val')) document.getElementById('hp-val').innerText = player.hp;
        if (document.getElementById('hp-max-val')) document.getElementById('hp-max-val').innerText = '/' + baseMaxHp;
        if (document.getElementById('rad-val')) {
            document.getElementById('rad-val').innerText = player.rads;
            document.getElementById('rad-val').style.color = player.rads >= 50 ? COLOR_RAD : '';
        }
        if (document.getElementById('hunger-val')) {
            document.getElementById('hunger-val').innerText = player.hunger;
            document.getElementById('hunger-val').className = player.hunger <= 20 ? 'danger' : '';
        }

        if (document.getElementById('inv-val')) {
            let invSize = 0;
            if (player.inventory && Array.isArray(player.inventory)) {
                player.inventory.forEach(id => {
                    if (ITEMS_DB[id]) invSize += ITEMS_DB[id].size || 0;
                });
            }
            document.getElementById('inv-val').innerText = invSize;
        }

        // Динамический максимальный вес с учетом репутации Инженера Михалыча (+2 кг за каждый уровень, макс 35 кг на Ур. 10)
        let engLvl = typeof getNpcRepLevel === 'function' ? getNpcRepLevel(player.npcRep['npc_eng'] || 0) : 0;
        if (player.backpackUpgradesCount === undefined) player.backpackUpgradesCount = 0;
        let shelterBonus = (player.shelterLevel >= 5) ? 3 : 0;
        player.maxSize = MAX_BACKPACK_SIZE + (player.backpackUpgradesCount * 5) + (engLvl * 2) + shelterBonus;

        if (document.getElementById('inv-max')) document.getElementById('inv-max').innerText = player.maxSize;
        if (document.getElementById('score-val') && player.score !== undefined) document.getElementById('score-val').innerText = player.score;

        if (document.getElementById('hp-val')) document.getElementById('hp-val').className = player.hp <= 20 ? 'danger' : '';

        if (k.name === 'ГЕРОЙ' && document.getElementById('rad-val')) {
            document.getElementById('rad-val').style.color = 'var(--hero-color)';
            document.getElementById('rad-val').innerText = "ИММУН";
        }

    } catch (e) {
        console.error("updateHUD error:", e);
    }
}
