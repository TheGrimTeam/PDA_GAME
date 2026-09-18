// ============================================================
// ОРУЖИЕ И ЭКИПИРОВКА
// ============================================================

function toggleWeapon(wName) {
    if (!player.weapons[wName]) return;
    player.weapons[wName].active = !player.weapons[wName].active;
    playSound('use');
    saveState();
    renderProfile();
}

function repairWeaponWithJunk(wName) {
    let neededJunk = ['junk_1', 'junk_3', 'junk_6'];
    let foundIdx = player.inventory.findIndex(id => neededJunk.includes(id));

    if (foundIdx === -1) {
        return alert("Для починки в полевых условиях нужна Изолента, Металлолом или Болт (в рюкзаке нет нужного хлама)!");
    }

    let junkName = ITEMS_DB[player.inventory[foundIdx]].name;
    player.inventory.splice(foundIdx, 1);
    player.weapons[wName].durability = 100;
    playSound('use');
    saveState();
    renderProfile();
    alert(`Оружие (${wName}) успешно отремонтировано с помощью предмета: ${junkName}!`);
}

function getRepairCost(wName) {
    let w = player.weapons[wName];
    if (!w || w.durability >= 100) return 0;
    let maxCosts = {
        "Нож": 20,
        "Пистолет": 50,
        "Дробовик": 80,
        "Пистолет-пулемет": 100,
        "Автомат": 150,
        "Винтовка": 150,
        "Пулемет": 150
    };
    let maxCost = maxCosts[wName] || 50;
    let wearPercent = (100 - w.durability) / 100;
    let baseCost = Math.max(2, Math.round(maxCost * wearPercent));

    // Скидка Инженера Михалыча на ремонт: 10% за каждый уровень репутации (-10% * lvl, вплоть до 0 при Ур. 10)
    let engRep = (player.npcRep && player.npcRep['npc_eng']) || 0;
    let engLvl = getNpcRepLevel(engRep);
    let discountMult = Math.max(0, 1 - (engLvl * 0.1));
    baseCost = Math.round(baseCost * discountMult);

    return baseCost;
}

function repairWeaponAtBase(wName) {
    let cost = getRepairCost(wName);
    if (cost === 0) return alert("Оружие полностью исправно!");
    if (player.score < cost) {
        return alert(`Недостаточно кредитов! Стоимость ремонта на базе: ${cost} 💎`);
    }

    pendingRepairWeapon = wName;
    alert(`Для подтверждения ремонта отсканируйте QR-код вашей Базы.`);
    switchView('scan');
    startScanner();
}

function unequipSpecialItem() {
    if (!player.equipment) return;
    player.equipment = null;
    playSound('use');
    saveState();
    renderProfile();
    showBanner("Спецпредмет снят", 'var(--text-dim)');
}
