// ============================================================
// ЛОГИКА ИНВЕНТАРЯ, КРАФТА И УЛУЧШЕНИЙ
// ============================================================

function dropItem(index, isSafe = false) {
    let id = isSafe ? player.safeBox[index] : player.inventory[index];
    if (isStoryItem(id) && !confirm(`Выкинуть «${ITEMS_DB[id].name}»? Это сюжетный предмет, его не получить заново обычным сканированием.`)) return;
    if (isSafe) player.safeBox.splice(index, 1); else player.inventory.splice(index, 1); saveState(); renderInventory(); }

function useMedkit(index, id, isSafe = false) {
    // Лечение медикаментом излечивает вирус инфицирования — но не при «Ядре Синтеза» в рюкзаке
    if (player.infectionTime && hasSynthCore()) {
        showBanner("☣ ЯДРО СИНТЕЗА ПОДАВЛЯЕТ ЛЕЧЕНИЕ! Вирус не купирован.", 'var(--bandit-color)');
    } else if (player.infectionTime) {
        player.infectionTime = 0;
        showBanner("ВИРУС КУПИРОВАН МЕДИКАМЕНТОМ!", 'var(--quest-color)');
    }
    let it = ITEMS_DB[id];
    if (it.radCure && player.karma_score < 3) {
        player.rads = Math.max(0, player.rads - it.radCure);
    }

    let maxHp = getEffectiveMaxHp();
    let heal = Math.round((it.heal || 0) * (1 + 0.25 * perkRank('medic'))); // перк «Полевой медик»
    player.hp = Math.min(maxHp, player.hp + heal);
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
    player.hunger = Math.min(getMaxHunger(), player.hunger + (it.feed || 0));
    let maxHp = getEffectiveMaxHp();
    if (player.hp > maxHp) player.hp = maxHp;
    playSound('use'); if (isSafe) player.safeBox.splice(index, 1); else player.inventory.splice(index, 1); saveState(); renderInventory();
}

function moveToSafe(index) { let id = player.inventory[index]; if (player.safeBox.reduce((s, iId) => s + ITEMS_DB[iId].size, 0) + ITEMS_DB[id].size > 5) return alert("Нет места!"); playSound('scan'); player.safeBox.push(id); player.inventory.splice(index, 1); saveState(); renderInventory(); }
function moveToInv(index) { let id = player.safeBox[index]; if (player.inventory.reduce((s, iId) => s + ITEMS_DB[iId].size, 0) + ITEMS_DB[id].size > player.maxSize) return alert("Нет места!"); playSound('scan'); player.inventory.push(id); player.safeBox.splice(index, 1); saveState(); renderInventory(); }

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
    player.maxSize = MAX_BACKPACK_SIZE + (player.backpackUpgradesCount * 5) + (engLvl * 2) + shelterBonus + perkRank('strongBack') * 5;

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

// Покупка защищённого подсумка за крышки — для тех, кто не нашёл детали для крафта
function buySafeBox() {
    if (player.safeBoxUnlocked) return;
    if (player.score < SAFE_BOX_PRICE) {
        playSound('error');
        return alert(`Мало крышек! Подсумок стоит ${SAFE_BOX_PRICE} крышек, у вас ${player.score}.`);
    }
    if (!confirm(`Купить защищённый подсумок за ${SAFE_BOX_PRICE} крышек?`)) return;
    player.score -= SAFE_BOX_PRICE;
    player.safeBoxUnlocked = true;
    playSound('upgrade');
    saveState();
    renderInventory();
    showBanner("🔒 Защищенный подсумок куплен!", 'var(--trade-color)');
}

// Сюжетные предметы: не выпадают при обычном сканировании (капсулы, Ядро)
function isStoryItem(id) {
    let it = ITEMS_DB[id];
    return !!(it && (it.cat === 'quest' || it.noScan));
}

// Порядок и подписи групп в рюкзаке
const INV_GROUPS = [
    { key: 'story', title: '★ СЮЖЕТ' },
    { key: 'med', title: '✚ МЕДИЦИНА' },
    { key: 'food', title: '🍖 ЕДА И ВОДА' },
    { key: 'artifact', title: '◈ АРТЕФАКТЫ' },
    { key: 'weapon', title: '⚔ ОРУЖИЕ' },
    { key: 'gear', title: '⛭ СНАРЯЖЕНИЕ' },
    { key: 'junk', title: '⚙ ХЛАМ' },
    { key: 'token', title: '◉ ЖЕТОНЫ' },
    { key: 'other', title: 'ПРОЧЕЕ' }
];

function invGroupKey(id) {
    if (isStoryItem(id)) return 'story';
    let cat = ITEMS_DB[id].cat;
    return INV_GROUPS.some(g => g.key === cat) ? cat : 'other';
}

// Карточка предмета: название, короткая строка «цена · вес · эффект», описание, кнопки
function invItemCard(id, i, isSafe) {
    let it = ITEMS_DB[id];
    let story = isStoryItem(id);
    let acts = [];
    let effects = [];
    if (it.heal) effects.push(`<span class="inv-eff">+${it.heal} HP</span>`);
    if (it.feed) effects.push(`<span class="inv-eff">+${it.feed} ЕДА</span>`);
    if (it.radCure) effects.push(`<span class="inv-eff inv-eff-rad">−${it.radCure} РАД</span>`);

    if (it.heal || (it.radCure && !it.feed)) acts.push(`<button class="inv-btn-use" onclick="useMedkit(${i}, '${id}', ${isSafe})">ПРИМЕНИТЬ</button>`);
    if (it.feed) acts.push(`<button class="inv-btn-use" onclick="useFood(${i}, '${id}', ${isSafe})">СЪЕСТЬ</button>`);
    if (isSafe) {
        acts.push(`<button class="inv-btn-move" onclick="moveToInv(${i})">В РЮКЗАК</button>`);
    } else {
        if (player.safeBoxUnlocked) acts.push(`<button class="btn-safe" onclick="moveToSafe(${i})">В ПОДСУМОК</button>`);
        if (it.cat !== 'quest') acts.push(`<button class="inv-btn-trade" onclick="initiateP2PTrade(${i})">ПРОДАТЬ ИГРОКУ</button>`);
    }
    acts.push(`<button class="inv-btn-drop" onclick="dropItem(${i}, ${isSafe})">ВЫКИНУТЬ</button>`);

    let meta = [];
    if (it.val > 0) meta.push(`${it.val} ${CAP}`);
    meta.push(`${it.size} кг`);
    let desc = it.desc && it.cat !== 'eq' ? `<div class="inv-desc">${it.desc}</div>` : '';
    return `<div class="item inv-item${story ? ' inv-story' : ''}${isSafe ? ' inv-safe' : ''}">
        <div class="item-info"><b>${it.name}</b>${story ? ' <span class="inv-tag">СЮЖЕТ</span>' : ''}
            <div class="inv-meta">${meta.join(' · ')}${effects.length ? ' · ' + effects.join(' ') : ''}</div>${desc}</div>
        <div class="inv-acts">${acts.join('')}</div></div>`;
}

function renderInventory() {
    const list = document.getElementById('inventory-list');
    if (player.inventory.length === 0) {
        list.innerHTML = "<p class='inv-empty'>Рюкзак пуст. Сканируйте QR-коды в Зоне, чтобы находить лут.</p>";
    } else {
        let groups = {};
        player.inventory.forEach((id, i) => {
            if (!ITEMS_DB[id]) return;
            let k = invGroupKey(id);
            (groups[k] = groups[k] || []).push(invItemCard(id, i, false));
        });
        list.innerHTML = INV_GROUPS.filter(g => groups[g.key])
            .map(g => `<div class="inv-group-title">${g.title} <span>${groups[g.key].length}</span></div>${groups[g.key].join('')}`).join('');
    }
    if (player.safeBoxUnlocked) {
        document.getElementById('safe-box-container').style.display = 'block'; document.getElementById('safebox-quest-box').style.display = 'none';
        document.getElementById('safe-val').innerText = player.safeBox.reduce((sum, id) => sum + ITEMS_DB[id].size, 0);
        const safeList = document.getElementById('safebox-list'); safeList.innerHTML = player.safeBox.length === 0 ? "<p style='color:var(--text-dim)'>Пусто</p>" : "";
        safeList.innerHTML += player.safeBox.map((id, i) => ITEMS_DB[id] ? invItemCard(id, i, true) : '').join('');
    } else { document.getElementById('safe-box-container').style.display = 'none'; document.getElementById('safebox-quest-box').style.display = 'block'; renderCraftBox('req-safe-items', 'btn-upgrade-safe', player.safeBoxQuest, applySafeBox);
        let priceEl = document.getElementById('safe-box-price'); if (priceEl) priceEl.innerText = SAFE_BOX_PRICE; }
    renderCraftBox('req-items', 'btn-upgrade', player.upgradeQuest, applyUpgrade);
}
