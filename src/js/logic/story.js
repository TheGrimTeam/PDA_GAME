// ============================================================
// ЛОГИКА СЮЖЕТНОЙ ЦЕПОЧКИ «ПУТЬ К ЭПИЦЕНТРУ»
// ============================================================
// Состояние хранится в player.story:
//   stage          — номер текущего квеста (1..4), 5 — цепочка пройдена
//   q1             — продано профильных предметов каждому NPC { npc_med: 2, ... }
//   q2             — список разных видов оружия, проданных в квесте 2
//   coordsKnown    — Доктор сообщил координаты станции (квест 4)
//   synthStartedAt — время запуска синтеза (0 — не запущен)
//   extendedStock  — у торговцев расширенный ассортимент (награда квеста 1)
//   announced      — этапы, о выполнении которых игрок уже уведомлён
// ============================================================

function getStory() {
    if (!player.story || typeof player.story !== 'object') player.story = {};
    let st = player.story;
    if (!st.stage) st.stage = 1;
    if (!st.q1) st.q1 = {};
    if (!Array.isArray(st.q2)) st.q2 = [];
    if (!st.announced) st.announced = {};
    if (!st.synthStartedAt) st.synthStartedAt = 0;
    return st;
}

// «Ядро Синтеза» действует, только пока лежит в рюкзаке (не в сейфе)
function hasSynthCore() {
    return Array.isArray(player.inventory) && player.inventory.includes('anom_4');
}

function storyCapsulesMissing() {
    return Object.values(STORY_FIELD_ANOMALIES).filter(id => !player.inventory.includes(id));
}

// Выполнено ли условие текущего квеста (награду ещё можно не забрать)
function isStoryStageDone(stage) {
    let st = getStory();
    if (stage === 1) return STORY_Q1_NPCS.every(npc => (st.q1[npc] || 0) >= STORY_Q1_ITEMS_PER_NPC);
    if (stage === 2) return st.q2.length >= STORY_Q2_WEAPON_KINDS;
    if (stage === 3) return storyCapsulesMissing().length === 0;
    return false;
}

// Однократное уведомление о выполнении условия квеста
function announceStoryProgress() {
    let st = getStory();
    if (st.stage >= 1 && st.stage <= 3 && isStoryStageDone(st.stage) && !st.announced[st.stage]) {
        st.announced[st.stage] = true;
        playSound('quest');
        showBanner(`📜 «${STORY_QUESTS[st.stage].name}» выполнен! Заберите награду во вкладке квестов.`, 'var(--hero-color)');
    }
}

// Вызывается из торговли при продаже предмета NPC
function onStoryItemSold(npcCode, itemId) {
    let st = getStory();
    let item = ITEMS_DB[itemId];
    let npc = NPC_DB[npcCode];
    if (!item || !npc) return;

    if (st.stage === 1 && STORY_Q1_NPCS.includes(npcCode) && npc.buys && npc.buys.includes(item.cat)) {
        let have = st.q1[npcCode] || 0;
        if (have < STORY_Q1_ITEMS_PER_NPC) {
            st.q1[npcCode] = have + 1;
            showBanner(`📜 Первый день: ${npc.name} ${st.q1[npcCode]}/${STORY_Q1_ITEMS_PER_NPC}`, 'var(--quest-color)');
        }
    }

    if (st.stage === 2 && item.cat === 'weapon' && !st.q2.includes(itemId)) {
        st.q2.push(itemId);
        showBanner(`📜 Лёгкие деньги: оружие ${Math.min(st.q2.length, STORY_Q2_WEAPON_KINDS)}/${STORY_Q2_WEAPON_KINDS}`, 'var(--quest-color)');
    }
    announceStoryProgress();
}

// Какие виды оружия из рюкзака ещё не засчитаны в квесте 2 (по одному индексу на вид)
function storyUncountedWeaponIdx() {
    let st = getStory();
    let seen = {};
    let result = [];
    player.inventory.forEach((id, i) => {
        let it = ITEMS_DB[id];
        if (it && it.cat === 'weapon' && !st.q2.includes(id) && !seen[id]) {
            seen[id] = true;
            result.push(i);
        }
    });
    return result;
}

// «Сдача квеста» у торговца: продать разом по одному экземпляру каждого нового вида оружия
function turnInStoryWeapons() {
    let st = getStory();
    let npc = NPC_DB[currentTradeNpc];
    if (st.stage !== 2 || !npc || !npc.buys || !npc.buys.includes('weapon')) return;
    let idxs = storyUncountedWeaponIdx();
    if (idxs.length === 0) return alert("В рюкзаке нет нового оружия для квеста.");

    let ids = idxs.map(i => player.inventory[i]);
    let total = 0;
    // Удаляем с конца, чтобы индексы не съезжали
    idxs.sort((a, b) => b - a).forEach(i => player.inventory.splice(i, 1));
    ids.forEach(id => {
        total += Math.max(1, Math.floor(ITEMS_DB[id].val * 1.5));
        if (!st.q2.includes(id)) st.q2.push(id);
    });
    player.score += total;
    playSound('sell');
    announceStoryProgress();
    saveState();
    renderTradeView();
    alert(`Сдано оружия: ${ids.length} вид(ов). Получено: ${total} ¢\nПрогресс: ${Math.min(st.q2.length, STORY_Q2_WEAPON_KINDS)}/${STORY_Q2_WEAPON_KINDS}`);
}

// Квест 3: успешное извлечение артефакта из полевой аномалии.
// Возвращает id капсулы, которую нужно выдать, или null.
function storyCapsuleForAnomaly(anomCode) {
    let st = getStory();
    if (st.stage !== 3) return null;
    let capsule = STORY_FIELD_ANOMALIES[anomCode];
    if (!capsule) return null;
    if (player.inventory.includes(capsule) || (player.safeBox || []).includes(capsule)) return null;
    return capsule;
}

// Квест 4: Доктор Кроу сообщает координаты станции
function onStoryNpcVisit(npcCode) {
    let st = getStory();
    if (st.stage === 4 && npcCode === 'npc_med' && !st.coordsKnown) {
        st.coordsKnown = true;
        saveState();
        playSound('quest');
        alert(`🩺 ДОКТОР КРОУ:\n«Раз уж ты собрал капсулы — вот координаты. Никому ни слова.»\n\n📍 ${SYNTH_STATION_COORDS}`);
    }
}

function formatMs(ms) {
    let sec = Math.max(0, Math.ceil(ms / 1000));
    let m = Math.floor(sec / 60), s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Сканирование QR-кода Станции синтеза
function handleSynthStationScan(resDiv) {
    let st = getStory();
    if (st.stage === STORY_FINAL_STAGE) {
        playSound('error');
        return resDiv.innerHTML = "<span style='color:var(--text-dim)'>Станция синтеза выработала ресурс. Ядро уже у вас.</span>";
    }
    if (st.stage < 4) {
        playSound('error');
        return resDiv.innerHTML = "<span style='color:yellow'>Станция обесточена. Вам здесь пока нечего делать.</span>";
    }
    if (!st.coordsKnown) {
        playSound('error');
        return resDiv.innerHTML = "<span style='color:yellow'>Терминал станции требует код доступа. Поговорите с Доктором Кроу.</span>";
    }
    let missing = storyCapsulesMissing();
    if (missing.length > 0) {
        if (st.synthStartedAt) st.synthStartedAt = 0; // капсулы потеряны — синтез сорван
        saveState();
        playSound('error');
        return resDiv.innerHTML = `<span class='danger'>Для синтеза нужны все 3 капсулы энергии в рюкзаке.</span><br><small>Не хватает: ${missing.map(id => ITEMS_DB[id].name).join(', ')}</small>`;
    }

    let now = Date.now();
    if (!st.synthStartedAt) {
        st.synthStartedAt = now;
        st.synthAnnounced = false;
        saveState();
        playSound('use');
        return resDiv.innerHTML = `<b style="color:var(--trade-color)">⚗ СИНТЕЗ ЗАПУЩЕН</b><br><small>Оставайтесь на точке ${formatMs(SYNTH_DURATION_MS)}. Не умирайте и не возвращайтесь на Базу — иначе процесс сорвётся. Затем отсканируйте станцию снова.</small>`;
    }

    let left = SYNTH_DURATION_MS - (now - st.synthStartedAt);
    if (left > 0) {
        playSound('scan');
        return resDiv.innerHTML = `<b style="color:var(--trade-color)">⚗ СИНТЕЗ ИДЁТ</b><br><small>Осталось: ${formatMs(left)}. Не покидайте точку.</small>`;
    }

    // Синтез завершён: капсулы сплавляются в Ядро
    Object.values(STORY_FIELD_ANOMALIES).forEach(id => {
        let idx = player.inventory.indexOf(id);
        if (idx !== -1) player.inventory.splice(idx, 1);
    });
    player.inventory.push('anom_4');
    player.stats.itemsFound = (player.stats.itemsFound || 0) + 1;
    st.stage = STORY_FINAL_STAGE;
    st.synthStartedAt = 0;
    player.hunger = getMaxHunger(); // Ядро насыщает
    saveState();
    playSound('quest');
    resDiv.innerHTML = `<b style="color:var(--hero-color)">${CAP} ЯДРО СИНТЕЗА ПОЛУЧЕНО!</b><br><small>Энергия трёх аномалий сплавилась в один артефакт (${ITEMS_DB['anom_4'].val} ${CAP}).</small><br><small class="danger">Осторожно: умрёте с Ядром в рюкзаке — заражение неизбежно, лекарства не помогут. Прячьте его в сейф перед опасной вылазкой.</small>`;
}

// Тик из heartbeat-цикла: срыв или завершение синтеза
function storyTick() {
    let st = player.story;
    if (!st || !st.synthStartedAt) return;
    if (player.hp <= 0 || player.inBase) {
        st.synthStartedAt = 0;
        saveState();
        playSound('error');
        showBanner('⚗ СИНТЕЗ СОРВАН: вы покинули станцию. Запустите процесс заново.', 'var(--bandit-color)');
        return;
    }
    if (!st.synthAnnounced && Date.now() - st.synthStartedAt >= SYNTH_DURATION_MS) {
        st.synthAnnounced = true;
        saveState();
        playSound('quest');
        showBanner('⚗ СИНТЕЗ ЗАВЕРШЁН! Отсканируйте QR-код станции, чтобы забрать Ядро.', 'var(--hero-color)');
    }
}

// Выдача награды за квесты 1–3 и переход к следующему
function claimStoryReward() {
    let st = getStory();
    let stage = st.stage;
    if (stage < 1 || stage > 3 || !isStoryStageDone(stage)) return;
    let msg = '';

    if (stage === 1) {
        player.npcRep = player.npcRep || {};
        STORY_Q1_NPCS.forEach(npc => { player.npcRep[npc] = (player.npcRep[npc] || 0) + 20; });
        st.extendedStock = true;
        msg = `Репутация +1 уровень у всех 4 торговцев.\nАссортимент торговцев расширен до ${TRADE_STOCK_SIZE_EXTENDED} позиций.`;
    } else if (stage === 2) {
        let rewardItem = ITEMS_DB[STORY_Q2_REWARD_ITEM];
        let need = rewardItem.size * STORY_Q2_REWARD_QTY;
        let used = player.inventory.reduce((sum, id) => sum + ITEMS_DB[id].size, 0);
        if (used + need > player.maxSize) {
            playSound('error');
            return alert(`Нет места в рюкзаке для награды (нужно ${need} кг свободного веса).`);
        }
        for (let i = 0; i < STORY_Q2_REWARD_QTY; i++) player.inventory.push(STORY_Q2_REWARD_ITEM);
        msg = `Получено: ${rewardItem.name} ×${STORY_Q2_REWARD_QTY}.\nБолт тратится при сканировании аномалии и повышает шанс успеха.`;
    } else if (stage === 3) {
        let owned = player.equipment === 'eq_anom' || (player.eqPurchased && player.eqPurchased['eq_anom']);
        if (owned) {
            player.score += STORY_Q3_COMPENSATION;
            msg = `Детектор «Велес» у вас уже был — учёные выплатили компенсацию: ${STORY_Q3_COMPENSATION} ¢.`;
        } else {
            if (player.equipment && !confirm(`Детектор «Велес» займёт слот снаряжения вместо «${ITEMS_DB[player.equipment].name}» (оно пропадёт). Продолжить?\n\nОтмена — забрать награду позже.`)) {
                return;
            }
            player.equipment = 'eq_anom';
            msg = 'Получен легендарный детектор «Велес» (экипирован).';
        }
        msg += '\n\nКапсулы энергии оставьте в рюкзаке — Доктор Кроу знает, что с ними делать.';
    }

    st.stage = stage + 1;
    playSound('quest');
    saveState();
    renderQuests();
    alert(`📜 КВЕСТ «${STORY_QUESTS[stage].name}» ЗАВЕРШЁН!\n\n${msg}`);
}

// Разметка блока сюжетной цепочки для вкладки квестов
function renderStoryBlock() {
    let st = getStory();
    let html = `<h3 style="color:var(--hero-color); border-bottom:1px dashed #555; padding-bottom:5px; margin-bottom:12px;">🗺 СЮЖЕТ: ПУТЬ К ЭПИЦЕНТРУ (${Math.min(st.stage, 4)}/4)</h3>`;

    for (let n = 1; n < Math.min(st.stage, STORY_FINAL_STAGE); n++) {
        html += `<div style="font-size:0.9rem; color:var(--term-green); margin-bottom:4px;">✔ ${n}. ${STORY_QUESTS[n].name}</div>`;
    }
    if (st.stage >= STORY_FINAL_STAGE) {
        html += `<div style="font-size:0.9rem; color:var(--term-green); margin-bottom:4px;">✔ 4. ${STORY_QUESTS[4].name}</div>`;
        html += `<div class="quest-card" style="border-color:var(--hero-color); margin:8px 0 16px 0;"><b style="color:var(--hero-color)">Цепочка пройдена.</b><br><small>${ITEMS_DB['anom_4'].desc}</small></div>`;
        return html;
    }

    let q = STORY_QUESTS[st.stage];
    let progress = '';
    if (st.stage === 1) {
        progress = STORY_Q1_NPCS.map(npc => {
            let have = Math.min(st.q1[npc] || 0, STORY_Q1_ITEMS_PER_NPC);
            return `<div style="color:${have >= STORY_Q1_ITEMS_PER_NPC ? 'var(--term-green)' : '#ccc'}; padding-left:10px;">• ${NPC_DB[npc].name}: ${have}/${STORY_Q1_ITEMS_PER_NPC}</div>`;
        }).join('');
    } else if (st.stage === 2) {
        let have = Math.min(st.q2.length, STORY_Q2_WEAPON_KINDS);
        progress = `<div style="color:${have >= STORY_Q2_WEAPON_KINDS ? 'var(--term-green)' : '#ccc'}; padding-left:10px;">• Разных видов оружия продано: ${have}/${STORY_Q2_WEAPON_KINDS}</div>`;
        let inBag = storyUncountedWeaponIdx().length;
        if (inBag > 0) progress += `<div style="color:var(--text-dim); padding-left:10px; font-size:0.85rem;">В рюкзаке новых видов: ${inBag}</div>`;
    } else if (st.stage === 3) {
        progress = Object.entries(STORY_FIELD_ANOMALIES).map(([anom, cap]) => {
            let ok = player.inventory.includes(cap);
            return `<div style="color:${ok ? 'var(--term-green)' : '#ccc'}; padding-left:10px;">• ${ITEMS_DB[cap].name} (${anom}): ${ok ? 'в рюкзаке' : 'нет'}</div>`;
        }).join('');
    } else if (st.stage === 4) {
        let steps = [];
        steps.push(`${st.coordsKnown ? '✔' : '•'} Координаты от Доктора Кроу${st.coordsKnown ? `: <span style="color:#fff">${SYNTH_STATION_COORDS}</span>` : ''}`);
        let missing = storyCapsulesMissing();
        steps.push(`${missing.length === 0 ? '✔' : '•'} Капсулы энергии в рюкзаке: ${3 - missing.length}/3`);
        if (st.synthStartedAt) {
            let left = SYNTH_DURATION_MS - (Date.now() - st.synthStartedAt);
            steps.push(left > 0 ? `⚗ Синтез идёт, осталось ${formatMs(left)}` : '✔ Синтез завершён — отсканируйте станцию');
        } else {
            steps.push('• Запустите синтез на станции (15 мин)');
        }
        progress = steps.map(s => `<div style="color:#ccc; padding-left:10px; margin-bottom:3px;">${s}</div>`).join('');
    }

    let done = isStoryStageDone(st.stage);
    let btn = '';
    if (st.stage <= 3) {
        btn = done
            ? `<button class="btn-quest" style="margin-top:8px; border-color:var(--hero-color); color:var(--hero-color);" onclick="claimStoryReward()">ПОЛУЧИТЬ НАГРАДУ</button>`
            : `<button class="btn-quest" style="margin-top:8px; opacity:0.5; cursor:not-allowed;" disabled>В ПРОЦЕССЕ</button>`;
    }

    html += `<div class="quest-card" style="border-color:var(--hero-color); background:rgba(255,215,0,0.03); margin:8px 0 16px 0;">
        <h4 style="color:var(--hero-color); margin-bottom:5px;">Квест ${st.stage}: «${q.name}»</h4>
        <p style="font-size:0.9rem; color:var(--text-dim); margin-bottom:6px;">${q.desc}</p>
        <div style="font-size:0.95rem; margin-bottom:6px;"><b>Задание:</b> ${q.task}</div>
        ${progress}
        <div style="font-size:0.9rem; margin-top:8px;"><b>Награда:</b> <span style="color:var(--hero-color)">${q.reward}</span></div>
        ${btn}
    </div>`;
    return html;
}
