// ============================================================
// ЛОГИКА ТОРГОВЛИ И РЕПУТАЦИИ
// ============================================================

function openTrade(npcCode) {
    let npc = NPC_DB[npcCode];
    let k = getKarmaStatus();

    if (npc.isBase) {
        if (npc.reqKarma === "survivor" && k.name === "БАНДИТ") {
            if (player.equipment !== "eq_pass_base") {
                playSound('error');
                alert("ОТКАЗ! Вы Бандит, вход на базу Корпорации запрещен.");
                return switchView('scan');
            }
        }
        if (npc.reqKarma === "bandit" && k.name !== "БАНДИТ") {
            if (player.equipment !== "eq_pass_camp") {
                playSound('error');
                alert("ОТКАЗ! Вы не Бандит, убирайтесь из Лагеря.");
                return switchView('scan');
            }
        }
    }

    currentTradeNpc = npcCode;
    if (player.quests.active && player.quests.active.length > 0 && !npc.isBase) {
        let myQuests = player.quests.active.filter(q => q.target === npcCode);
        for (let q of myQuests) {
            let allPresent = true;
            for (let reqCode in q.requirements) {
                let need = q.requirements[reqCode];
                let have = player.inventory.filter(id => id === reqCode).length;
                if (have < need) allPresent = false;
            }
            if (allPresent) {
                if (confirm(`Сдать контракт "${q.name || "Контракт"}" и получить ${q.reward} 💎?`)) {
                    playSound('sell');
                    for (let reqCode in q.requirements) {
                        let need = q.requirements[reqCode];
                        for (let i = 0; i < need; i++) {
                            let idx = player.inventory.indexOf(reqCode);
                            if (idx !== -1) player.inventory.splice(idx, 1);
                        }
                    }
                    player.score += q.reward;
                    player.quests.active = player.quests.active.filter(actQ => actQ.id !== q.id);
                    while (player.quests.choices.length < 5) {
                        player.quests.choices.push(createRandomQuest());
                    }
                    while (player.quests.choices.length < 5) {
                        player.quests.choices.push(createRandomQuest());
                    }
                    player.stats.questsDone = (player.stats.questsDone || 0) + 1;

                    let prevCount = player.completedQuestsCount || 0;
                    player.completedQuestsCount = prevCount + 1;

                    // НАЧИСЛЕНИЕ РЕПУТАЦИИ У КОНКРЕТНОГО NPC (+25 очков за каждый выполненный квест)
                    player.npcRep = player.npcRep || {};
                    let oldRep = player.npcRep[npcCode] || 0;
                    let oldLvl = getNpcRepLevel(oldRep);

                    player.npcRep[npcCode] = oldRep + 25;
                    let newLvl = getNpcRepLevel(player.npcRep[npcCode]);

                    if (player.quests.choices.length === 0 && player.quests.active.length === 0) {
                        generateQuestChoices();
                    }
                    saveState();

                    if (newLvl > oldLvl) {
                        alert(`🌟 ПОВЫШЕНИЕ РЕПУТАЦИИ!\nВы достигли Уровня ${newLvl} у ${npc.name}!\nПолучены новые привилегии.`);
                    } else if (prevCount < 5 && player.completedQuestsCount >= 5) {
                        alert(`🎉 ВЫ ВЫПОЛНИЛИ 5 КВЕСТОВ СНАБЖЕНИЯ!\nВам стали доступны Особые Контракты («Мародер», «Пацифист», «Зона»)!`);
                    } else {
                        alert(`КОНТРАКТ СДАН!\nПолучено: ${q.reward} 💎\nРепутация у ${npc.name}: +25 очков.`);
                    }
                    break;
                }
            }
        }
    }
    currentTradeStock = [];
    if (!npc.isBase) {
        let allowed = Object.keys(ITEMS_DB).filter(id => npc.sells.includes(ITEMS_DB[id].cat));
        for (let i = 0; i < 8; i++) {
            if (allowed.length === 0) break;
            let randId = allowed[Math.floor(Math.random() * allowed.length)];
            let basePrice = Math.floor(ITEMS_DB[randId].val * (1.5 + Math.random()));

            // Бонус скидки от Торгового чипа или Репутации
            if (player.equipment === 'eq_trade') {
                basePrice = Math.floor(basePrice * 0.75);
            }
            currentTradeStock.push({ id: randId, price: basePrice });
        }
    }
    renderTradeView(); switchView('trade');
}

// Единый расчёт стоимости лечения у NPC (базовая цена берётся из npc.healCost)
function getHealCost(npcCode) {
    let npc = NPC_DB[npcCode];
    let healCost = (npc && npc.healCost) || 500;

    // Скидка от Торгового чипа
    if (player.equipment === 'eq_trade') healCost = Math.round(healCost * 0.7);

    // Скидка по репутации (10% за уровень, на Ур. 10 — бесплатно)
    let rep = (player.npcRep && player.npcRep[npcCode]) || 0;
    let lvl = getNpcRepLevel(rep);
    if (lvl >= 10) {
        healCost = 0;
    } else {
        let discountMult = Math.max(0, 1 - (lvl * 0.1));
        healCost = Math.round(healCost * discountMult);
    }

    return healCost;
}

function renderTradeView() {
    let npc = NPC_DB[currentTradeNpc]; document.getElementById('trade-npc-name').innerText = npc.name;

    let isMed = (currentTradeNpc === 'npc_med');
    let healCost = getHealCost(currentTradeNpc);

    let healBtnText = healCost === 0 ? "СНЯТЬ РАДЫ И ЛЕЧИТЬ (БЕСПЛАТНО ПО РЕПУТАЦИИ)" : `СНЯТЬ РАДЫ И ЛЕЧИТЬ (${healCost} 💎)`;
    document.getElementById('btn-medic-heal-action').innerText = healBtnText;
    document.getElementById('medic-heal-box').style.display = npc.canHeal ? 'block' : 'none';

    document.getElementById('base-sell-all-box').style.display = npc.isBase ? 'block' : 'none';

    let k = getKarmaStatus();
    if (npc.isBase) document.getElementById('base-sell-desc').innerText = (npc.reqKarma === 'bandit') ? "Сдать лут Барыге (штраф x0.7)" : "Сдать весь лут Корпорации";

    document.getElementById('title-trade-buy').style.display = 'block';

    const buyList = document.getElementById('trade-buy-list');
    buyList.style.display = 'block';
    buyList.innerHTML = "";

    if (npc.isBase) {
        let eqToSell = ['eq_rad', 'eq_gas', 'eq_hunger', 'eq_storm', 'eq_anom', 'eq_trade'];
        if (currentTradeNpc === 'npc_base') {
            eqToSell.push('eq_pass_camp');
        } else if (currentTradeNpc === 'npc_bandit_base') {
            eqToSell.push('eq_pass_base');
        }

        eqToSell.forEach(eqId => {
            let item = ITEMS_DB[eqId];
            let price = item.val;
            let alreadyOwned = (player.equipment === eqId);
            let btnHtml = alreadyOwned
                ? `<button class="btn-trade" disabled>КУПЛЕНО</button>`
                : `<button class="btn-trade" onclick="buyEquipment('${eqId}')">КУПИТЬ</button>`;

            buyList.innerHTML += `
                <div class="item">
                    <div class="item-info">
                        <b>${item.name}</b><br>
                        <small style="color:var(--trade-color)">${item.desc}</small><br>
                        <small>Цена: ${price} 💎</small>
                    </div>
                    ${btnHtml}
                </div>
            `;
        });
    } else {
        if (currentTradeStock.length === 0) {
            buyList.innerHTML = "<p>Нет товаров на продажу</p>";
        } else {
            currentTradeStock.forEach((data, i) => buyList.innerHTML += `<div class="item"><div class="item-info"><b>${ITEMS_DB[data.id].name}</b><br><small>Вес: ${ITEMS_DB[data.id].size} | Цена: ${data.price} 💎</small></div><button class="btn-trade" onclick="buyItem(${i})">КУПИТЬ</button></div>`);
        }
    }

    const sellList = document.getElementById('trade-sell-list'); sellList.innerHTML = ""; let hasItems = false;
    document.getElementById('title-trade-sell').innerText = npc.isBase ? (npc.reqKarma === 'bandit' ? "БАРЫГА СКУПАЕТ (ЦЕНА х0.7)" : "СКУПАЕТ (СТАНДАРТНАЯ ЦЕНА х1)") : "СКУПАЕТ У ВАС (ЦЕНА х1.5)";
    player.inventory.forEach((id, i) => {
        if (npc.isBase || npc.buys.includes(ITEMS_DB[id].cat)) {
            hasItems = true; let mult = npc.isBase ? npc.mult : 1.5; let sp = Math.max(1, Math.floor(ITEMS_DB[id].val * mult));
            sellList.innerHTML += `<div class="item"><div class="item-info"><b>${ITEMS_DB[id].name}</b><br><small>Вес: ${ITEMS_DB[id].size} | Даст: ${sp} 💎</small></div><button class="btn-trade" style="color:var(--term-green); border-color:var(--term-green)" onclick="sellItem(${i}, ${sp})">ПРОДАТЬ</button></div>`;
        }
    });
    if (!hasItems) sellList.innerHTML = "<p>В рюкзаке нет лута на продажу (достаньте из сейфа).</p>";
}

function buyEquipment(eqId) {
    let item = ITEMS_DB[eqId];
    if (player.score < item.val) return alert("Мало кредитов!");
    if (player.equipment) {
        if (!confirm(`Вы уверены? Это заменит экипированное снаряжение: ${ITEMS_DB[player.equipment].name}. Предыдущее снаряжение пропадет (лучше продайте его сначала в Профиле).`)) {
            return;
        }
    }
    playSound('sell');
    player.score -= item.val;
    player.equipment = eqId;
    saveState();
    renderTradeView();
    alert(`Приобретено снаряжение: ${item.name}!`);
}

function buyItem(i) {
    let s = currentTradeStock[i];
    if (player.score < s.price) return alert("Мало кредитов!");
    let item = ITEMS_DB[s.id];
    if (item && item.cat === 'eq') {
        playSound('sell');
        player.score -= s.price;
        player.equipment = s.id;
        currentTradeStock.splice(i, 1);
        saveState();
        renderTradeView();
        renderProfile();
        alert(`Приобретено и экипировано: ${item.name}!`);
        return;
    }
    if (player.inventory.reduce((sum, id) => sum + ITEMS_DB[id].size, 0) + item.size > player.maxSize) return alert("Нет места в рюкзаке!");
    playSound('sell');
    player.score -= s.price;
    player.inventory.push(s.id);
    currentTradeStock.splice(i, 1);
    saveState();
    renderTradeView();
}

function sellItem(i, price) { playSound('sell'); player.inventory.splice(i, 1); player.score += price; saveState(); renderTradeView(); }

function sellAllToBase() {
    if (player.inventory.length === 0) return alert("Рюкзак пуст!"); playSound('sell');
    let mult = NPC_DB[currentTradeNpc].mult; let total = player.inventory.reduce((sum, id) => sum + Math.max(1, Math.floor(ITEMS_DB[id].val * mult)), 0);
    player.score += total; player.inventory = []; alert(`Вещи проданы!\nПолучено: ${total} 💎`); saveState(); renderTradeView();
}

function buyHeal() {
    let healCost = getHealCost(currentTradeNpc);

    let currentMaxHp = getMaxHp();
    if (player.hp >= currentMaxHp && player.rads === 0) return alert("Здоров!");
    if (player.score < healCost) return alert("Мало кредитов!");
    playSound('use');
    player.score -= healCost;
    player.rads = 0;
    player.hp = getEffectiveMaxHp();
    saveState();
    renderTradeView();
    alert("Вылечен!");
}
