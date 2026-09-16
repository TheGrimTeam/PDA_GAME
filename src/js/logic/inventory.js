// ============================================================
// ЛОГИКА ИНВЕНТАРЯ, КРАФТА И УЛУЧШЕНИЙ
// ============================================================

function dropItem(index, isSafe = false) { if (isSafe) player.safeBox.splice(index, 1); else player.inventory.splice(index, 1); saveState(); renderInventory(); }

function useMedkit(index, id, isSafe = false) {
    // Лечение медикаментом излечивает вирус инфицирования
    if (player.infectionTime) {
        player.infectionTime = 0;
        showBanner("ВИРУС КУПИРОВАН МЕДИКАМЕНТОМ!", 'var(--quest-color)');
    }
    let it = ITEMS_DB[id];
    if (it.radCure && player.karma_score < 3) {
        player.rads = Math.max(0, player.rads - it.radCure);
    }

    let maxHp = getEffectiveMaxHp();
    player.hp = Math.min(maxHp, player.hp + (it.heal || 0));
    player.stats.medsUsed = (player.stats.medsUsed || 0) + 1;
    playSound('use'); if (isSafe) player.safeBox.splice(index, 1); else player.inventory.splice(index, 1); saveState(); renderInventory();
}

function quickUseItem(type) {
    if (player.hp <= 0) return alert("Вы мертвы!");
    if (type === 'hp') {
        let foundIdx = player.inventory.findIndex(id => ITEMS_DB[id] && ITEMS_DB[id].heal > 0);
        if (foundIdx !== -1) {
            let id = player.inventory[foundIdx];
            useMedkit(foundIdx, id, false);
            showBanner("ЛЕЧЕНИЕ: " + ITEMS_DB[id].name.toUpperCase(), '#fff');
        } else {
            alert("В рюкзаке нет лечащих медикаментов!");
        }
    } else if (type === 'rad') {
        let foundIdx = player.inventory.findIndex(id => ITEMS_DB[id] && ITEMS_DB[id].radCure > 0);
        if (foundIdx !== -1) {
            let id = player.inventory[foundIdx];
            useMedkit(foundIdx, id, false);
            showBanner("АНТИРАД: " + ITEMS_DB[id].name.toUpperCase(), 'var(--rad-color)');
        } else {
            alert("В рюкзаке нет средств вывода радиации!");
        }
    } else if (type === 'food') {
        let foundIdx = player.inventory.findIndex(id => ITEMS_DB[id] && ITEMS_DB[id].feed > 0);
        if (foundIdx !== -1) {
            let id = player.inventory[foundIdx];
            useFood(foundIdx, id, false);
            showBanner("СЪЕДЕНО: " + ITEMS_DB[id].name.toUpperCase(), 'var(--quest-color)');
        } else {
            alert("В рюкзаке нет еды или воды!");
        }
    }
}

function saveSurvivalNotes() {
    let text = document.getElementById('survival-notes').value;
    localStorage.setItem('wasteland_notes', text);
}

function useFood(index, id, isSafe = false) {
    player.stats.foodEaten = (player.stats.foodEaten || 0) + 1;
    let it = ITEMS_DB[id];
    if (it.radCure && player.karma_score < 3) {
        player.rads = Math.max(0, player.rads - it.radCure);
    }
    let barRep = (player.npcRep && player.npcRep['npc_bar']) || 0;
    let barLvl = getNpcRepLevel(barRep);
    let maxHunger = MAX_HUNGER + (barLvl * 10);
    player.hunger = Math.min(maxHunger, player.hunger + (it.feed || 0));
    let maxHp = getEffectiveMaxHp();
    if (player.hp > maxHp) player.hp = maxHp;
    playSound('use'); if (isSafe) player.safeBox.splice(index, 1); else player.inventory.splice(index, 1); saveState(); renderInventory();
}

function moveToSafe(index) { let id = player.inventory[index]; if (player.safeBox.reduce((s, iId) => s + ITEMS_DB[iId].size, 0) + ITEMS_DB[id].size > 5) return alert("Нет места!"); playSound('scan'); player.safeBox.push(id); player.inventory.splice(index, 1); saveState(); renderInventory(); }
function moveToInv(index) { let id = player.safeBox[index]; if (player.inventory.reduce((s, iId) => s + ITEMS_DB[id].size, 0) + ITEMS_DB[id].size > player.maxSize) return alert("Нет места!"); playSound('scan'); player.inventory.push(id); player.safeBox.splice(index, 1); saveState(); renderInventory(); }

function renderCraftBox(idReq, idBtn, questArr, callback) {
    let hasAll = true, txt = [], rc = {}, ic = {}; questArr.forEach(id => rc[id] = (rc[id] || 0) + 1); player.inventory.forEach(id => ic[id] = (ic[id] || 0) + 1);
    for (let id in rc) { let need = rc[id], have = ic[id] || 0; txt.push(`<span style="color:${have >= need ? 'var(--term-green)' : '#ccc'}">${ITEMS_DB[id].name} (${Math.min(have, need)}/${need})</span>`); if (have < need) hasAll = false; }
    document.getElementById(idReq).innerHTML = txt.join(", "); document.getElementById(idBtn).style.display = hasAll ? 'block' : 'none';
}

function applyUpgrade() {
    if (!player.upgradeQuest) {
        alert("Квесты модуля еще не выполнены!");
        return;
    }
    let rc = {};
    player.upgradeQuest.forEach(id => rc[id] = (rc[id] || 0) + 1);
    for (let id in rc) {
        let need = rc[id], have = player.inventory.filter(x => x === id).length;
        if (have < need) {
            alert("Не все детали собраны в рюкзаке!");
            return;
        }
    }
    playSound('upgrade');
    player.upgradeQuest.forEach(id => {
        let idx = player.inventory.indexOf(id);
        if (idx !== -1) player.inventory.splice(idx, 1);
    });

    if (player.backpackUpgradesCount === undefined) player.backpackUpgradesCount = 0;
    player.backpackUpgradesCount++;

    let engLvl = typeof getNpcRepLevel === 'function' ? getNpcRepLevel(player.npcRep['npc_eng'] || 0) : 0;
    let shelterBonus = (player.shelterLevel >= 5) ? 3 : 0;
    player.maxSize = MAX_BACKPACK_SIZE + (player.backpackUpgradesCount * 5) + (engLvl * 2) + shelterBonus;

    player.upgradeQuest = genQ(1, 2);
    saveState();
    renderInventory();
    renderQuests();
    updateHUD();
    showBanner("🎒 Рюкзак расширен! Вместимость: " + player.maxSize + " слотов", 'var(--term-green)');
}

function applySafeBox() {
    if (!player.safeBoxQuest) {
        alert("Необходимые детали не собраны!");
        return;
    }
    let rc = {};
    player.safeBoxQuest.forEach(id => rc[id] = (rc[id] || 0) + 1);
    for (let id in rc) {
        let need = rc[id], have = player.inventory.filter(x => x === id).length;
        if (have < need) {
            alert("Не все детали для подсумка собраны!");
            return;
        }
    }
    playSound('use');
    player.safeBoxQuest.forEach(id => {
        let idx = player.inventory.indexOf(id);
        if (idx !== -1) player.inventory.splice(idx, 1);
    });
    player.safeBoxUnlocked = true;
    player.safeBoxQuest = genQ(3, 5);
    saveState();
    renderInventory();
    renderQuests();
    showBanner("🔒 Защищенный подсумок успешно создан!", 'var(--trade-color)');
}

function renderInventory() {
    const list = document.getElementById('inventory-list'); list.innerHTML = player.inventory.length === 0 ? "<p>Рюкзак пуст.</p>" : "";
    player.inventory.forEach((id, i) => {
        let it = ITEMS_DB[id], acts = `<button onclick="initiateP2PTrade(${i})" style="border-color:var(--trade-color); color:var(--trade-color);">ПРОДАТЬ ИГРОКУ</button> <button onclick="dropItem(${i}, false)">ВЫКИНУТЬ</button>`;

        let statsDesc = [];
        if (it.heal) { acts = `<button onclick="useMedkit(${i}, '${id}', false)" style="border-color:#fff;">ЮЗАТЬ (+${it.heal} HP)</button> ` + acts; statsDesc.push(`<span style="color:#fff">+${it.heal} HP</span>`); }
        if (it.feed) { acts = `<button onclick="useFood(${i}, '${id}', false)" style="border-color:#fff;">СЪЕСТЬ (+${it.feed} ЕДА)</button> ` + acts; statsDesc.push(`<span style="color:#fff">+${it.feed} ЕДА</span>`); }
        if (it.radCure) {
            statsDesc.push(`<span style="color:var(--rad-color)">-${it.radCure} РАД</span>`);
            if (!it.heal && !it.feed) {
                acts = `<button onclick="useMedkit(${i}, '${id}', false)" style="border-color:#fff;">ЮЗАТЬ (-${it.radCure} РАД)</button> ` + acts;
            }
        }
        let statsText = statsDesc.length > 0 ? ` | ${statsDesc.join(' | ')}` : '';

        if (player.safeBoxUnlocked) acts = `<button onclick="moveToSafe(${i})" class="btn-safe" style="margin-right:5px">В СЕЙФ</button> ` + acts;

        list.innerHTML += `<div class="item"><div class="item-info"><b>${it.name}</b><br><small>Цена: ${it.val} | Вес: ${it.size}${statsText}</small></div><div style="display:flex; gap:5px; flex-wrap:wrap; justify-content:flex-end;">${acts}</div></div>`;
    });
    if (player.safeBoxUnlocked) {
        document.getElementById('safe-box-container').style.display = 'block'; document.getElementById('safebox-quest-box').style.display = 'none';
        document.getElementById('safe-val').innerText = player.safeBox.reduce((sum, id) => sum + ITEMS_DB[id].size, 0);
        const safeList = document.getElementById('safebox-list'); safeList.innerHTML = player.safeBox.length === 0 ? "<p style='color:var(--text-dim)'>Пусто</p>" : "";
        player.safeBox.forEach((id, i) => {
            let it = ITEMS_DB[id], acts = `<button onclick="dropItem(${i}, true)">ВЫКИНУТЬ</button>`;

            let statsDesc = [];
            if (it.heal) { acts = `<button onclick="useMedkit(${i}, '${id}', true)" style="border-color:#fff;">ЮЗАТЬ (+${it.heal} HP)</button> ` + acts; statsDesc.push(`<span style="color:#fff">+${it.heal} HP</span>`); }
            if (it.feed) { acts = `<button onclick="useFood(${i}, '${id}', true)" style="border-color:#fff;">СЪЕСТЬ (+${it.feed} ЕДА)</button> ` + acts; statsDesc.push(`<span style="color:#fff">+${it.feed} ЕДА</span>`); }
            if (it.radCure) {
                statsDesc.push(`<span style="color:var(--rad-color)">-${it.radCure} РАД</span>`);
                if (!it.heal && !it.feed) {
                    acts = `<button onclick="useMedkit(${i}, '${id}', true)" style="border-color:#fff;">ЮЗАТЬ (-${it.radCure} РАД)</button> ` + acts;
                }
            }
            let statsText = statsDesc.length > 0 ? ` | ${statsDesc.join(' | ')}` : '';

            acts = `<button onclick="moveToInv(${i})" style="color:var(--term-green); border-color:var(--term-green); margin-right:5px">В РЮКЗАК</button> ` + acts;
            safeList.innerHTML += `<div class="item" style="border-color:var(--trade-color)"><div class="item-info"><b>${it.name}</b><br><small>Цена: ${it.val} | Вес: ${it.size}${statsText}</small></div><div style="display:flex; gap:5px; flex-wrap:wrap; justify-content:flex-end;">${acts}</div></div>`;
        });
    } else { document.getElementById('safe-box-container').style.display = 'none'; document.getElementById('safebox-quest-box').style.display = 'block'; renderCraftBox('req-safe-items', 'btn-upgrade-safe', player.safeBoxQuest, applySafeBox); }
    renderCraftBox('req-items', 'btn-upgrade', player.upgradeQuest, applyUpgrade);
}
