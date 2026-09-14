// ============================================================
// ЛОГИКА КВЕСТОВ (КОНТРАКТОВ)
// ============================================================

function generateQuestChoices() {
    let pool = [];
    for (let i = 0; i < 5; i++) {
        pool.push(createRandomQuest());
    }
    player.quests.choices = pool;

    let specialPool = [];
    if ((player.completedQuestsCount || 0) >= 5) {
        specialPool = [
            { id: "preset_maroder_" + Date.now(), name: "💀 Мародер", requirements: { "token_bandit": 10 }, target: "npc_trad", reward: 5850, desc: "Собрать 10 жетонов мародеров для Сидоровича" },
            { id: "preset_pacifist_" + Date.now(), name: "🕊 Пацифист", requirements: { "med_1": 5, "med_2": 3, "med_4": 2 }, target: "npc_med", reward: 3120, desc: "Поставить медикаменты (5 стимуляторов, 3 антирадина, 2 аптечки) Доктору Кроу" },
            { id: "preset_zona_" + Date.now(), name: "🌀 Зона", requirements: { "art_1": 1, "art_2": 1, "art_3": 1 }, target: "npc_eng", reward: 6500, desc: "Принести артефакты Капля, Слизь и Пустышка Михалычу" }
        ];
    }
    player.quests.specialChoices = specialPool;
    saveState();
}

function createRandomQuest() {
    let itemKeys = Object.keys(ITEMS_DB).filter(k => ITEMS_DB[k].cat !== 'token' && ITEMS_DB[k].cat !== 'artifact' && ITEMS_DB[k].cat !== 'eq');
    let reqs = {}; let totalVal = 0; let numItems = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < numItems; i++) {
        let code = itemKeys[Math.floor(Math.random() * itemKeys.length)];
        let qty = Math.floor(Math.random() * 2) + 1;
        reqs[code] = (reqs[code] || 0) + qty;
        totalVal += (ITEMS_DB[code].val * qty);
    }
    let npcKeys = Object.keys(NPC_DB).filter(k => !NPC_DB[k].isBase);
    let npcId = npcKeys[Math.floor(Math.random() * npcKeys.length)];
    return {
        id: "rand_" + Math.random().toString(36).substr(2, 9),
        name: "📦 Заказ снабжения",
        requirements: reqs,
        target: npcId,
        reward: Math.floor(totalVal * (1.5 + Math.random() * 0.5) * 1.3),
        desc: `Поставка припасов для ${NPC_DB[npcId].name}`
    };
}

function renderQuests() {
    const container = document.getElementById('quests-container');
    container.innerHTML = '';

    if (!player.quests.choices || player.quests.choices.length === 0) {
        generateQuestChoices();
    }

    if (player.quests.active && player.quests.active.length > 0) {
        container.innerHTML += `<h3 style="color:var(--trade-color); border-bottom:1px dashed #555; padding-bottom:5px; margin-bottom:12px;">АКТИВНЫЕ КОНТРАКТЫ (${player.quests.active.length}/2)</h3>`;
        player.quests.active.forEach((q, idx) => {
            let html = `<div class="quest-card" style="border-color:var(--trade-color); margin-bottom:12px;">
                <h4 style="color:var(--trade-color); display:flex; justify-content:space-between; margin-bottom:5px;">
                    <span>${q.name || "Контракт"}</span>
                    <small style="font-size:0.8rem; color:var(--text-dim);">Доставить: ${NPC_DB[q.target].name}</small>
                </h4>
                <p style="font-size:0.9rem; color:var(--text-dim); margin-bottom:8px;">${q.desc || ""}</p>
                <div style="font-size:0.95rem; margin-bottom:8px;"><b>Требуется:</b></div>`;

            for (let code in q.requirements) {
                let need = q.requirements[code];
                let have = player.inventory.filter(id => id === code).length;
                let isMet = have >= need;
                html += `<div style="color:${isMet ? 'var(--term-green)' : '#ccc'}; font-size:0.95rem; padding-left:10px;">• ${ITEMS_DB[code] ? ITEMS_DB[code].name : code}: ${have}/${need}</div>`;
            }

            html += `<div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                <span style="font-size:0.95rem;">Награда: <b style="color:var(--trade-color);">${q.reward} 💎</b></span>
                <button class="btn-quest btn-danger" style="margin-top:0; width:auto; padding:4px 10px; font-size:0.9rem;" onclick="abandonQuest(${idx})">ОТМЕНИТЬ (-10 💎)</button>
            </div></div>`;
            container.innerHTML += html;
        });
    }

    let isMaxActive = player.quests.active && player.quests.active.length >= 2;
    if (isMaxActive) {
        container.innerHTML += `<div style="color:var(--rad-color); text-align:center; padding:12px; border:1px dashed var(--rad-color); font-weight:bold; margin-bottom:12px;">Вы взяли максимум контрактов (2/2). Сдайте их торговцам или отмените.</div>`;
    }

    // 1. Regular Quests (5 slots)
    container.innerHTML += `<h3 style="color:var(--quest-color); border-bottom:1px dashed #555; padding-bottom:5px; margin:15px 0 12px 0;">ОБЫЧНЫЕ КОНТРАКТЫ (5 слотов)</h3>`;
    player.quests.choices.forEach((q, index) => {
        let html = `<div class="quest-card" style="margin-bottom:12px;">
            <h4 style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <span style="color:var(--quest-color);">${q.name || "Заказ"}</span>
                <small style="font-size:0.8rem; color:var(--text-dim);">${NPC_DB[q.target].name}</small>
            </h4>
            <p style="font-size:0.9rem; color:var(--text-dim); margin-bottom:8px;">${q.desc || ""}</p>
            <div style="font-size:0.95rem; margin-bottom:8px;"><b>Требуется:</b></div>`;

        for (let code in q.requirements) {
            let need = q.requirements[code];
            let have = player.inventory.filter(id => id === code).length;
            let isMet = have >= need;
            html += `<div style="color:${isMet ? 'var(--term-green)' : '#ccc'}; font-size:0.95rem; padding-left:10px;">• ${ITEMS_DB[code] ? ITEMS_DB[code].name : code}: ${have}/${need}</div>`;
        }

        html += `<div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
            <span>Награда: <b style="color:var(--trade-color);">${q.reward} 💎</b></span>
            <button class="btn-quest" style="margin-top:0; width:auto; padding:4px 15px;" onclick="acceptQuest(${index})" ${isMaxActive ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>ПРИНЯТЬ</button>
        </div></div>`;
        container.innerHTML += html;
    });

    // 2. Special Quests (3 slots)
    if ((player.completedQuestsCount || 0) >= 5) {
        container.innerHTML += `<h3 style="color:var(--hero-color); border-bottom:1px dashed #555; padding-bottom:5px; margin:20px 0 12px 0;">🏆 ОСОБЫЕ КОНТРАКТЫ (3 слота)</h3>`;
        if (!player.quests.specialChoices || player.quests.specialChoices.length === 0) {
            player.quests.specialChoices = [
                { id: "preset_maroder_" + Date.now(), name: "💀 Мародер", requirements: { "token_bandit": 10 }, target: "npc_trad", reward: 5850, desc: "Собрать 10 жетонов мародеров для Сидоровича" },
                { id: "preset_pacifist_" + Date.now(), name: "🕊 Пацифист", requirements: { "med_1": 5, "med_2": 3, "med_4": 2 }, target: "npc_med", reward: 3120, desc: "Поставить медикаменты (5 стимуляторов, 3 антирадина, 2 аптечки) Доктору Кроу" },
                { id: "preset_zona_" + Date.now(), name: "🌀 Зона", requirements: { "art_1": 1, "art_2": 1, "art_3": 1 }, target: "npc_eng", reward: 6500, desc: "Принести артефакты Капля, Слизь и Пустышка Михалычу" }
            ];
        }
        player.quests.specialChoices.forEach((q, index) => {
            let html = `<div class="quest-card" style="border-color:var(--hero-color); margin-bottom:12px; background:rgba(255,215,0,0.03);">
                <h4 style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <span style="color:var(--hero-color);">${q.name || "Особый заказ"}</span>
                    <small style="font-size:0.8rem; color:var(--text-dim);">${NPC_DB[q.target].name}</small>
                </h4>
                <p style="font-size:0.9rem; color:var(--text-dim); margin-bottom:8px;">${q.desc || ""}</p>
                <div style="font-size:0.95rem; margin-bottom:8px;"><b>Требуется:</b></div>`;

            for (let code in q.requirements) {
                let need = q.requirements[code];
                let have = player.inventory.filter(id => id === code).length;
                let isMet = have >= need;
                html += `<div style="color:${isMet ? 'var(--term-green)' : '#ccc'}; font-size:0.95rem; padding-left:10px;">• ${ITEMS_DB[code] ? ITEMS_DB[code].name : code}: ${have}/${need}</div>`;
            }

            html += `<div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                <span>Награда: <b style="color:var(--hero-color);">${q.reward} 💎</b></span>
                <button class="btn-quest" style="margin-top:0; width:auto; padding:4px 15px; border-color:var(--hero-color); color:var(--hero-color);" onclick="acceptSpecialQuest(${index})" ${isMaxActive ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>ПРИНЯТЬ</button>
            </div></div>`;
            container.innerHTML += html;
        });
    } else {
        container.innerHTML += `<div style="font-size:0.85rem; color:var(--text-dim); margin-top:15px; text-align:center;">🔒 Особые контракты разблокируются после выполнения 5 обычных (выполнено: ${player.completedQuestsCount || 0}/5)</div>`;
    }
}

function acceptQuest(index) {
    if (player.quests.active.length >= 2) {
        return alert("Вы можете выполнять не более 2 квестов одновременно!");
    }
    playSound('use');
    let quest = player.quests.choices.splice(index, 1)[0];
    player.quests.active.push(quest);
    while (player.quests.choices.length < 5) {
        player.quests.choices.push(createRandomQuest());
    }
    saveState();
    renderQuests();
}

function acceptSpecialQuest(index) {
    if (player.quests.active.length >= 2) {
        return alert("Вы можете выполнять не более 2 квестов одновременно!");
    }
    playSound('use');
    let quest = player.quests.specialChoices.splice(index, 1)[0];
    player.quests.active.push(quest);
    saveState();
    renderQuests();
}

function abandonQuest(index) {
    if (confirm("Отменить контракт за 10 кредитов?")) {
        playSound('error');
        player.score = Math.max(0, player.score - 10);
        player.quests.active.splice(index, 1);
        while (player.quests.choices.length < 5) {
            player.quests.choices.push(createRandomQuest());
        }
        renderQuests();
        saveState();
    }
}
