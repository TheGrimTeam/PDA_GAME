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

    if (viewName !== 'scan') {
        stopScanner();
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
            document.getElementById('rad-val').style.color = player.rads >= MAX_RADS * 0.75 ? COLOR_RAD : '';
            if (document.getElementById('rad-max-val')) document.getElementById('rad-max-val').innerText = '/' + MAX_RADS;
            let radFill = document.getElementById('rad-fill');
            if (radFill) radFill.style.width = Math.min(100, (player.rads / MAX_RADS) * 100) + '%';
        }
        let maxHunger = getMaxHunger();
        if (player.hunger > maxHunger) player.hunger = maxHunger; // например, Ядро убрали из рюкзака
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
        player.maxSize = MAX_BACKPACK_SIZE + (player.backpackUpgradesCount * 5) + (engLvl * 2) + shelterBonus + perkRank('strongBack') * 5;
        updateXpHud();

        if (document.getElementById('inv-max')) document.getElementById('inv-max').innerText = player.maxSize;
        if (document.getElementById('score-val') && player.score !== undefined) document.getElementById('score-val').innerText = player.score;

        if (document.getElementById('hp-val')) document.getElementById('hp-val').className = player.hp <= 20 ? 'danger' : '';
        updateHudBars(baseMaxHp, maxHunger);

        if (k.name === 'ГЕРОЙ' && document.getElementById('rad-val')) {
            document.getElementById('rad-val').style.color = 'var(--hero-color)';
            document.getElementById('rad-val').innerText = "ИММУН";
        }

    } catch (e) {
        console.error("updateHUD error:", e);
    }
}

// Полоски HP/еды, подсветка опасных значений и счётчики на кнопках быстрого доступа
function updateHudBars(baseMaxHp, maxHunger) {
    let setW = (id, v) => { let el = document.getElementById(id); if (el) el.style.width = Math.max(0, Math.min(100, v)) + '%'; };
    setW('hp-fill', player.hp / Math.max(1, baseMaxHp) * 100);
    setW('hunger-fill', player.hunger / Math.max(1, maxHunger) * 100);
    let hm = document.getElementById('hunger-max-val');
    if (hm) hm.innerText = '/' + maxHunger;

    let alert = (id, on) => { let el = document.getElementById(id); if (el) el.classList.toggle('pb-alert', !!on); };
    alert('hud-hp-box', player.hp > 0 && player.hp <= 25);
    alert('hud-food-box', player.hunger <= 20);
    alert('hud-rad-box', player.rads >= MAX_RADS * 0.75);

    let inv = Array.isArray(player.inventory) ? player.inventory : [];
    let count = f => inv.filter(id => ITEMS_DB[id] && f(ITEMS_DB[id])).length;
    [['hp', it => it.heal > 0], ['rad', it => it.radCure > 0], ['food', it => it.feed > 0]].forEach(([k, f]) => {
        let n = count(f);
        let nEl = document.getElementById(`quick-${k}-n`);
        if (nEl) nEl.innerText = n;
        let btn = document.getElementById(`quick-${k}`);
        if (btn) btn.classList.toggle('pb-empty', n === 0);
    });
}
