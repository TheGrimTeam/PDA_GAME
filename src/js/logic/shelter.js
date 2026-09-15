// ============================================================
// УБЕЖИЩЕ (ЗАЛ СЛАВЫ И МОДЕРНИЗАЦИЯ)
// ============================================================

function renderShelter() {
    // Загрузка / обновление статистики
    document.getElementById('stat-survival-time').innerText = formatSurvivalTime(player.stats.survivedSeconds);
    document.getElementById('stat-quests').innerText = player.stats.questsDone || 0;
    document.getElementById('stat-corpses').innerText = player.stats.corpsesRobbed || 0;
    document.getElementById('stat-items').innerText = player.stats.itemsFound || 0;
    document.getElementById('stat-deaths').innerText = player.stats.deaths || 0;
    document.getElementById('stat-food').innerText = player.stats.foodEaten || 0;
    document.getElementById('stat-meds').innerText = player.stats.medsUsed || 0;

    let lvl = player.shelterLevel || 0;
    let titleEl = document.getElementById('shelter-level-title');
    let bonusEl = document.getElementById('shelter-bonus-desc');

    // Название текущего уровня убежища и список бонусов
    let shelterNames = {
        0: "УЛИЦА (НЕТ УБЕЖИЩА)",
        1: "УРОВЕНЬ 1: ПАЛАТКА",
        2: "УРОВЕНЬ 2: ЗЕМЛЯНКА",
        3: "УРОВЕНЬ 3: ДЕРЕВЯННЫЙ БУНКЕР",
        4: "УРОВЕНЬ 4: БЕТОННЫЙ БУНКЕР",
        5: "УРОВЕНЬ 5: УКРЕПЛЕННЫЙ ФОРПОСТ"
    };
    titleEl.innerText = shelterNames[lvl] || ("УРОВЕНЬ " + lvl);

    let activeBonuses = [];
    if (lvl >= 1) activeBonuses.push("• Сытость расходуется на 10% медленнее.");
    if (lvl >= 2) activeBonuses.push("• Накопление радиации снижено на 10%.");
    if (lvl >= 3) activeBonuses.push("• Износ оружия в Зоне на 10% медленнее.");
    if (lvl >= 4) activeBonuses.push("• Максимальное здоровье увеличено на +10% HP.");
    if (lvl >= 5) activeBonuses.push("• Регенерация (+1 HP в минуту в Зоне) и вес рюкзака +3 кг.");

    if (activeBonuses.length === 0) {
        bonusEl.innerText = "Нет бонусов. Постройте убежище, чтобы защититься от опасностей Пустоши.";
    } else {
        bonusEl.innerHTML = "<b style='color:var(--term-green);'>АКТИВНЫЕ БОНУСЫ:</b><br>" + activeBonuses.join("<br>");
    }

    // Рендеринг блока модернизации
    let nextLvl = lvl + 1;
    let upgradeBox = document.getElementById('shelter-upgrade-box');
    if (nextLvl > 5) {
        upgradeBox.innerHTML = `<h4 style="border-bottom: 1px dashed var(--hero-color); padding-bottom: 4px; margin-bottom: 8px; color: var(--hero-color); font-size: 1.15rem; text-align: center;">🔨 МАКСИМАЛЬНЫЙ УРОВЕНЬ</h4>
                                <p style="text-align:center; color:var(--hero-color); font-weight:bold; font-size:1.1rem;">Ваш укрепленный форпост полностью защищен от внешних угроз!</p>`;
    } else {
        let nextInfo = SHELTER_UPGRADES[nextLvl];
        document.getElementById('shelter-next-level-name').innerText = "Следующий уровень: " + nextInfo.name;

        // Подсчет требований
        let reqs = nextInfo.req;
        let textReq = [];
        let hasAll = true;

        // Считаем предметы в рюкзаке
        let invCounts = {};
        player.inventory.forEach(id => {
            invCounts[id] = (invCounts[id] || 0) + 1;
        });

        for (let itemId in reqs) {
            let need = reqs[itemId];
            let have = invCounts[itemId] || 0;
            let itemName = ITEMS_DB[itemId] ? ITEMS_DB[itemId].name : itemId;
            let isMet = have >= need;
            if (!isMet) hasAll = false;

            textReq.push(`<span style="color:${isMet ? 'var(--term-green)' : COLOR_BANDIT}">${itemName}: ${have}/${need}</span>`);
        }

        document.getElementById('shelter-req-list').innerHTML = "<b>Требуется:</b><br>" + textReq.join("<br>") + `<br><br><span style="color:var(--trade-color)">Бонус: ${nextInfo.bonus}</span>`;

        let btnUpgrade = document.getElementById('btn-upgrade-shelter');
        if (hasAll) {
            btnUpgrade.style.display = 'block';
        } else {
            btnUpgrade.style.display = 'none';
        }
    }

    if (typeof updateSlotUI === "function") updateSlotUI();
}

function upgradeShelter() {
    let lvl = player.shelterLevel || 0;
    let nextLvl = lvl + 1;
    if (nextLvl > 5) return;

    let nextInfo = SHELTER_UPGRADES[nextLvl];
    let reqs = nextInfo.req;

    // Потребляем предметы из инвентаря
    for (let itemId in reqs) {
        let need = reqs[itemId];
        for (let i = 0; i < need; i++) {
            let idx = player.inventory.indexOf(itemId);
            if (idx !== -1) {
                player.inventory.splice(idx, 1);
            }
        }
    }

    player.shelterLevel = nextLvl;
    playSound('use');
    saveState();
    renderShelter();
    alert(`🎉 Поздравляем! Ваше убежище улучшено до уровня ${nextLvl} (${nextInfo.name})!`);
}
