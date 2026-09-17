// ============================================================
// ЛОГИКА СКАНИРОВАНИЯ QR-КОДОВ
// ============================================================
// Обработка всех типов QR: предметы, лут, лечение, мародёрство,
// аномалии, терминалы, P2P-торговля, арест, базы.
// ============================================================

function submitManualCode() {
    try {
        const input = document.getElementById('manual-code');
        if (!input) {
            alert('Поле ввода не найдено');
            return;
        }
        const code = String(input.value || '').trim();
        let resDiv = document.getElementById('scan-result');
        if (!code) {
            if (resDiv) resDiv.innerHTML = "<span class='danger'>Введите код QR</span>";
            input.focus();
            return;
        }
        console.log("Submitting manual code:", code);
        if (resDiv) resDiv.innerHTML = "<span style='color:var(--trade-color)'>Обработка кода: " + code + "</span>";
        handleScan(code);
        input.value = '';
    } catch (err) {
        console.error(err);
        alert('Ошибка ввода кода: ' + err.message);
    }
}
window.submitManualCode = submitManualCode;

function submitDeadManualCode() {
    try {
        const input = document.getElementById('dead-manual-code');
        if (!input) return;
        const code = String(input.value || '').trim();
        if (!code) {
            input.focus();
            return;
        }
        handleDeadScan(code);
    } catch (err) {
        console.error(err);
        alert('Ошибка ввода кода: ' + err.message);
    }
}
window.submitDeadManualCode = submitDeadManualCode;

function submitHealItemManualCode() {
    try {
        const input = document.getElementById('heal-item-manual-code');
        if (!input) return;
        const code = String(input.value || '').trim();
        if (!code) {
            input.focus();
            return;
        }
        handleHealItemScan(code);
    } catch (err) {
        console.error(err);
        alert('Ошибка ввода кода: ' + err.message);
    }
}
window.submitHealItemManualCode = submitHealItemManualCode;

function handleScan(qrCode) {
    const resDiv = document.getElementById('scan-result');
    if (!qrCode) return;
    qrCode = String(qrCode);
    if (pendingRepairWeapon) {
        let wName = pendingRepairWeapon;
        pendingRepairWeapon = null;
        let cost = getRepairCost(wName);
        if (player.score >= cost) {
            player.score -= cost;
            player.weapons[wName].durability = 100;
            playSound('use');
            saveState();
            renderProfile();
            resDiv.innerHTML = `<b style="color:var(--quest-color)">ОРУЖИЕ (${wName}) ОТРЕМОНТИРОВАНО!</b><br><small>Списано кредитов: ${cost} 💎</small>`;
            alert(`Оружие (${wName}) успешно отремонтировано на Базе за ${cost} 💎!`);
        } else {
            playSound('error');
            resDiv.innerHTML = `<span class='danger'>Недостаточно кредитов для ремонта! (${cost} 💎 требуется)</span>`;
            alert(`Недостаточно кредитов! Требуется: ${cost} 💎`);
        }
        return;
    }

    if (document.getElementById('manual-code')) document.getElementById('manual-code').value = ''; let code = qrCode.trim().toLowerCase();

    // Лечебный предмет от спасителя: обрабатывается ДО проверки hp<=0,
    // так как умирающий имеет 0 HP и должен иметь возможность сканировать.
    if (code.startsWith(QR_PREFIX_HEAL_ITEM)) {
        // Зомби не может быть вылечен человеческим предметом.
        if (player.zombieTime && ((Date.now() - player.zombieTime) < ZOMBIE_TIME_MS)) {
            playSound('error');
            return resDiv.innerHTML = "<span class='danger'>🧟 ВЫ ЗОМБИ! Лечебный предмет вам не поможет.</span>";
        }
        handleHealItemScan(code);
        return;
    }

    if (player.hp <= 0) return;

    // Проверка: если игрок зомби, он не может поднимать вещи, лут, хлам и взламывать терминалы
    if (player.zombieTime && ((Date.now() - player.zombieTime) < ZOMBIE_TIME_MS)) {
        if (code.startsWith(QR_PREFIX_ROB) || code.startsWith(QR_PREFIX_HEAL) || code.startsWith(QR_PREFIX_SAFE) || code.startsWith(QR_PREFIX_USB) || code.startsWith(QR_PREFIX_TERM) || code.startsWith(QR_PREFIX_JUNK) || code.startsWith(QR_PREFIX_ITEM) || code.startsWith(QR_PREFIX_FOOD) || code.startsWith(QR_PREFIX_GEAR) || code.startsWith(QR_PREFIX_MED) || code.startsWith(QR_PREFIX_WPN) || code.startsWith("art_") || code.includes(QR_PREFIX_LOOT)) {
            playSound('error');
            return resDiv.innerHTML = "<span class='danger'>🧟 ВЫ ЗОМБИ! Вы не можете поднимать вещи, снаряжение, оружие, еду, медикаменты или использовать человеческие терминалы. Охотьтесь на живых!</span>";
        }
    }

    if (checkBlowoutShelterScan(code)) return;

    if (code === 'uvb76' || code === 'uvb-76' || code === 'жужжалка') {
        triggerRadioEasterEgg();
        return;
    }

    // Проверка укрытия от Выброса по QR-коду базы
    if (checkBlowoutShelterScan(code)) {
        return;
    }

    // Взлом терминалов и флешек
    if (code.startsWith(QR_PREFIX_SAFE) || code.startsWith(QR_PREFIX_USB) || code.startsWith(QR_PREFIX_TERM)) {
        startHacking(code);
        return;
    }

    // Торговля между игроками (P2P торговля)
    if (code.startsWith("p2ptrade:")) {
        handleP2PTradeScan(code);
        return;
    }

    // Арест военным (arrest:...) или сканирование бандита (bandit_id:...)
    if (code.startsWith(QR_PREFIX_ARREST)) {
        handleArrestScan(code);
        return;
    }
    if (code.startsWith(QR_PREFIX_BANDIT_ID)) {
        handleBanditScan(code);
        return;
    }

    // 1. Помощь умирающему (Спасение)
    if (code.startsWith(QR_PREFIX_HEAL)) {
        let parts = code.split(":");
        let corpseId = parts[1];
        let targetName = parts[2];

        // Отдавать можно только предметы, реально восстанавливающие HP:
        // у med_2 (Антирадин) и med_6 (Рад-Х) heal = 0, они бы не подняли умирающего.
        let consumableIdx = player.inventory.findIndex(id => {
            const it = ITEMS_DB[id];
            return it && (it.cat === 'food' || it.cat === 'med') && (it.heal || 0) > 0;
        });

        if (consumableIdx === -1) {
            playSound('error');
            return resDiv.innerHTML = "<span class='danger'>У вас нет еды или медикаментов для помощи!</span>";
        }

        let usedItemId = player.inventory[consumableIdx];
        let usedItem = ITEMS_DB[usedItemId];
        let usedItemName = usedItem.name;
        let healAmount = usedItem.heal || 0;
        player.inventory.splice(consumableIdx, 1);

        player.karma_score++;
        playSound('use');

        player.history = player.history || [];
        player.history.push({ type: 'heal', name: targetName, date: Date.now() });

        saveState();

        // Генерируем QR лечебного предмета с отдельным префиксом healitem:,
        // чтобы умирающий не мог сканировать обычный медикамент.
        // txId = corpseId из QR умирающего: именно с ним сверяется pendingHealId
        // на стороне умирающего в handleHealItemScan().
        let txId = corpseId;

        resDiv.innerHTML = `<b style="color:var(--hero-color)">ВЫ СПАСЛИ ${targetName.toUpperCase()}!</b><br><small>Вы отдали: ${usedItemName}. Получено +1 к Карме.</small><br><span style="color:#fff">Покажите этот QR-код спасенному — он должен его отсканировать.</span><div id="heal-item-qr" class="qr-surface" style="width:190px; height:190px;"></div><small style="color:var(--text-dim)">Передано: ${usedItemName} (+${healAmount} HP)</small>`;
        generateQR('heal-item-qr', `${QR_PREFIX_HEAL_ITEM}${txId}:${usedItemId}:${healAmount}:${player.callsign}`);
        return;
    }

    // 2. Мародерство (Грабеж)
    if (code.startsWith(QR_PREFIX_ROB)) {
        let parts = code.split(":");
        let corpseType = 'survivor';
        let corpseId = '';
        let victimName = "Неизвестный";
        let items = [];
        let stolenScore = 0;

        if (parts[1] === 'bandit' || parts[1] === 'survivor' || parts[1] === 'military') {
            corpseType = parts[1];
            corpseId = parts[2];
            victimName = parts[3] || "Неизвестный";
            items = parts[4] ? parts[4].split(",") : [];
            stolenScore = parseInt(parts[5]) || 0;
        } else {
            corpseId = parts[1];
            victimName = parts[2] || "Неизвестный";
            items = parts[3] ? parts[3].split(",") : [];
            stolenScore = parseInt(parts[4]) || 0;
        }
        if (stolenScore > 0) {
            player.score += stolenScore;
        }

        if (player.scannedCodes[corpseId]) { playSound('error'); return resDiv.innerHTML = "<span style='color:yellow'>Вы уже обобрали это тело!</span>"; }

        let tokenType = 'token_survivor';
        if (corpseType === 'bandit') {
            tokenType = 'token_bandit';
        } else if (corpseType === 'military') {
            tokenType = 'token_military';
        }

        let isBanditRobber = (player.karma_score <= -3);
        let earnedBounty = 0;
        let pickedUp = [];
        let currentSize = player.inventory.reduce((sum, id) => sum + ITEMS_DB[id].size, 0);

        if (corpseType === 'military') {
            if (isBanditRobber) {
                earnedBounty = 150;
                player.score += 150;
                playSound('sell');
            } else {
                player.karma_score--;
                playSound('karma');
            }
        } else if (corpseType === 'bandit') {
            playSound('use');
        } else {
            player.karma_score--;
            playSound('karma');
        }

        if (tokenType && ITEMS_DB[tokenType] && currentSize + ITEMS_DB[tokenType].size <= player.maxSize) {
            player.inventory.push(tokenType); currentSize += ITEMS_DB[tokenType].size; pickedUp.push(ITEMS_DB[tokenType].name); player.tokens_collected++;
        }
        for (let id of items) { if (ITEMS_DB[id] && currentSize + ITEMS_DB[id].size <= player.maxSize) { player.inventory.push(id); currentSize += ITEMS_DB[id].size; pickedUp.push(ITEMS_DB[id].name); } }

        player.scannedCodes[corpseId] = Date.now();

        player.history = player.history || [];
        player.history.push({ type: 'rob', name: victimName + (corpseType === 'bandit' ? ' (Бандит)' : ''), date: Date.now() });
        player.stats.corpsesRobbed = (player.stats.corpsesRobbed || 0) + 1;
        player.stats.itemsFound = (player.stats.itemsFound || 0) + pickedUp.length;

        saveState();

        let karmaMsg = "";
        let titleColor = "var(--bandit-color)";
        let corpseTitle = "ВЫЖИВШЕГО";

        if (corpseType === 'bandit') {
            corpseTitle = "БАНДИТА";
            titleColor = "var(--quest-color)";
            karmaMsg = "<small style='color:var(--quest-color)'>Обыск бандита: карма не изменилась.</small>";
        } else if (corpseType === 'military') {
            corpseTitle = "ВОЕННОГО";
            titleColor = "var(--rad-color)";
            if (isBanditRobber) {
                karmaMsg = `<small style='color:var(--quest-color)'>💰 Контрабанда Синдиката: премия +150 💎 за ликвидацию военного!</small>`;
            } else {
                karmaMsg = "<small class='danger'>Ограблен военный офицер. Карма снижена!</small>";
            }
        } else {
            karmaMsg = "<small class='danger'>Получено -1 к Карме за мародерство.</small>";
        }

        resDiv.innerHTML = `<b style="color:${titleColor}">ТРУП ${corpseTitle} ОГРАБЛЕН!</b><br>${karmaMsg}<br><small>Забрано предметов: ${pickedUp.length}</small>`;
        return;
    }

    // 3. Аномалии
    if (code.startsWith(QR_PREFIX_ANOM)) {
        let now = Date.now();
        if (player.scannedCodes[code]) {
            let diffSec = (now - player.scannedCodes[code]) / 1000;
            if (diffSec < ANOMALY_COOLDOWN_SEC) {
                playSound('error');
                let remaining = Math.ceil(ANOMALY_COOLDOWN_SEC - diffSec);
                let hours = Math.floor(remaining / 3600);
                let minutes = Math.floor((remaining % 3600) / 60);
                let seconds = remaining % 60;
                let timeStr = "";
                if (hours > 0) timeStr = `${hours} ч. ${minutes} мин.`;
                else if (minutes > 0) timeStr = `${minutes} мин. ${seconds} сек.`;
                else timeStr = `${seconds} сек.`;
                return resDiv.innerHTML = `<span style='color:yellow'>Аномалия разряжена. Ждите ${timeStr}</span>`;
            }
        }

        let successChance = 0.7;
        if (player.equipment === 'eq_anom') successChance = 1.0;

        let hasBoltIndex = player.inventory.indexOf("junk_6");
        let usedBolt = false;

        if (hasBoltIndex !== -1) {
            successChance = 0.8;
            if (player.equipment === 'eq_anom') successChance = 1.0;
            usedBolt = true;
            player.inventory.splice(hasBoltIndex, 1);
        }

        let roll = Math.random(); player.scannedCodes[code] = now;

        if (roll <= successChance) {
            let arts = ['art_1', 'art_2', 'art_3']; let winArt = arts[Math.floor(Math.random() * arts.length)]; let item = ITEMS_DB[winArt];
            let currentSize = player.inventory.reduce((sum, id) => sum + ITEMS_DB[id].size, 0);
            if (currentSize + item.size > player.maxSize) {
                playSound('error'); resDiv.innerHTML = `<span class='danger'>Вы нашли ${item.name}, но в рюкзаке нет места!</span>`;
            } else {
                player.inventory.push(winArt); playSound('sell'); player.stats.itemsFound = (player.stats.itemsFound || 0) + 1;
                resDiv.innerHTML = `<b style="color:var(--trade-color)">ВЫ ДОСТАЛИ АРТЕФАКТ!</b><br><small>${item.name} (Цена: ${item.val} 💎)</small>${usedBolt ? "<br><small style='color:var(--text-dim)'><i>Вы бросили болт и избежали урона.</i></small>" : ""}`;
            }
        } else {
            playSound('hazard'); let penaltyRoll = Math.random();
            if (penaltyRoll < 0.5 || player.inventory.length === 0) {
                player.hp = Math.max(0, player.hp - 40);
                resDiv.innerHTML = `<b class="danger">АНОМАЛИЯ УДАРИЛА ВАС!</b><br><small>-40 HP</small>${usedBolt ? "<br><small style='color:var(--text-dim)'><i>Даже болт не помог...</i></small>" : ""}`;
                checkDeathState();
            } else {
                let dropIdx = Math.floor(Math.random() * player.inventory.length);
                let droppedName = ITEMS_DB[player.inventory[dropIdx]].name;
                player.inventory.splice(dropIdx, 1);
                resDiv.innerHTML = `<b class="danger">АНОМАЛИЯ СОЖГЛА ПРЕДМЕТ!</b><br><small>Утеряно: ${droppedName}</small>${usedBolt ? "<br><small style='color:var(--text-dim)'><i>Даже болт не помог...</i></small>" : ""}`;
            }
        }
        saveState(); return;
    }

    if (NPC_DB[code]) { playSound('scan'); return openTrade(code); }
    if (!ITEMS_DB[code]) { playSound('error'); return resDiv.innerHTML = "<span class='danger'>ОШИБКА: Код не распознан</span>"; }

    let item = ITEMS_DB[code];
    let itemNow = Date.now();
    if (player.scannedCodes[code]) {
        let diffSec = (itemNow - player.scannedCodes[code]) / 1000;
        let cooldownTime = SCAN_COOLDOWN_DEFAULT_SEC;
        if (item.cat === 'weapon' || item.cat === 'med' || item.cat === 'gear') {
            cooldownTime = SCAN_COOLDOWN_GEAR_SEC;
        }
        if (diffSec < cooldownTime) {
            playSound('error');
            let rem = Math.ceil(cooldownTime - diffSec);
            let mins = Math.floor(rem / 60);
            let secs = rem % 60;
            let timeStr = mins > 0 ? `${mins} мин. ${secs} сек.` : `${secs} сек.`;
            return resDiv.innerHTML = `<span style='color:yellow'>Предмет появится через ${timeStr}</span>`;
        }
    }

    let currentSize = player.inventory.reduce((sum, id) => sum + ITEMS_DB[id].size, 0);
    if (currentSize + item.size > player.maxSize) { playSound('error'); return resDiv.innerHTML = "<span class='danger'>НЕТ МЕСТА В РЮКЗАКЕ!</span>"; }

    playSound('scan'); player.inventory.push(code); player.scannedCodes[code] = itemNow; player.stats.itemsFound = (player.stats.itemsFound || 0) + 1; saveState();
    resDiv.innerHTML = `ПОДОБРАНО: <b style="color:#fff">${item.name}</b><br><small>(Вес: ${item.size} | Цена: ${item.val})</small>`;
}

// === СКАНЕР НА ЭКРАНЕ СМЕРТИ ===
function startDeadScan() {
    if (!deadScanner) if (typeof Html5Qrcode === 'undefined') {
        alert("⚠️ Офлайн-режим: камера недоступна без кэша. Введите код вручную ниже.");
        document.getElementById('admin-manual-dead-box').style.display = 'flex';
        return;
    }
    deadScanner = new Html5Qrcode("qr-reader-dead");
    document.getElementById('qr-reader-dead').style.display = 'block'; document.getElementById('btn-dead-scan').style.display = 'none';
    deadScanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, (t) => { deadScanner.stop(); handleDeadScan(t); }, (e) => { }).catch(e => alert("Ошибка камеры."));
}

function handleDeadScan(qrCode) {
    document.getElementById('dead-manual-code').value = ''; let code = qrCode.trim().toLowerCase();
    let k = getKarmaStatus();
    let allowedBase = false;
    if (code === "npc_base") {
        if (k.name !== "БАНДИТ" || player.equipment === "eq_pass_base") allowedBase = true;
    }
    if (code === "npc_bandit_base") {
        if (k.name === "БАНДИТ" || player.equipment === "eq_pass_camp") allowedBase = true;
    }

    if (allowedBase) {
        playSound('use');
        player.rads = 0;
        player.hp = getEffectiveMaxHp();

        player.hunger = MAX_HUNGER;
        player.inventory = [];
        player.quests.active = null;
        player.infectionTime = 0; player.zombieTime = 0;
        // Возрождение отменяет незавершённый запрос на лечение.
        player.pendingHealId = null;
        player.pendingHealAt = 0;
        document.getElementById('corpse-qr-container').style.display = "none";
        document.getElementById('corpse-qr-desc').style.display = "none";
        document.getElementById('btn-scan-heal-item').style.display = "none";
        document.getElementById('btn-confirm-rob').style.display = "none";
        document.getElementById('qr-reader-dead').style.display = 'none'; document.getElementById('btn-dead-scan').style.display = 'block';
        player.isCurrentlyDead = false; saveState(); checkDeathState(); alert("ВЫ ВОСКРЕШЕНЫ И ПОЛНОСТЬЮ ИЗЛЕЧЕНЫ!");
    } else {
        playSound('error');
        let targetHint = (k.name === 'БАНДИТ') ? 'Лагерь Бандитов' : 'База Корпорации';
        alert(`ОТКАЗ! Вы ${k.name}, ваша точка возрождения: ${targetHint}`);
        if (deadScanner) startDeadScan();
    }
}
