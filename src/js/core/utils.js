// ============================================================
// УТИЛИТЫ И ОБЩИЕ ХЕЛПЕРЫ
// ============================================================

// Вспомогательная функция для получения названия ранга по карме
function getKarmaStatus() {
    if (player.karma_score >= 3) return { name: "ГЕРОЙ", class: "hero-glow" };
    if (player.karma_score <= -3) return { name: "БАНДИТ", class: "danger" };
    return { name: "ВЫЖИВШИЙ", class: "" };
}

function getMaxHp() {
    let crowRep = (player.npcRep && player.npcRep['npc_med']) || 0;
    let crowLvl = getNpcRepLevel(crowRep);
    let baseMaxHp = Math.round(100 * (1 + crowLvl * 0.1));
    if (player.shelterLevel >= 4) {
        baseMaxHp = Math.round(baseMaxHp * 1.1); // Убежище 4 ур: +10% макс HP
    }
    return baseMaxHp;
}

function getRadMultiplier() {
    let mult = 1.0;
    let hasMask = player.weapons && player.weapons["Противогаз ГП-5"] && player.weapons["Противогаз ГП-5"].active && player.weapons["Противогаз ГП-5"].durability > 0;
    let hasCloak = (player.equipment === 'eq_rad');

    if (hasCloak && hasMask) {
        mult = 0.5 * 0.4; // 0.2 (суммарная защита: -80% радиации!)
    } else if (hasMask) {
        mult = 0.4; // -60% радиации
    } else if (hasCloak) {
        mult = 0.5; // -50% радиации
    }
    return Math.max(0.15, mult); // Полного абсолютного иммунитета без читов нет, но защита максимальная
}

function formatSurvivalTime(seconds) {
    if (!seconds) return "00:00:00";
    let h = Math.floor(seconds / 3600);
    let m = Math.floor((seconds % 3600) / 60);
    let s = seconds % 60;
    return [h, m, s].map(v => v < 10 ? "0" + v : v).join(":");
}

function showBanner(text, color) {
    let b = document.getElementById('event-banner');
    b.innerText = text;
    b.style.display = 'block';
    b.style.background = color;
    b.style.color = '#000';
    setTimeout(() => b.style.display = 'none', 5000);
}

function saveState() {
    localStorage.setItem(STORAGE_KEY_PLAYER, JSON.stringify(player));
    updateHUD();
    try {
        let invView = document.getElementById('view-inventory');
        if (invView && invView.classList.contains('active')) {
            renderInventory();
        }
        let questView = document.getElementById('view-quests');
        if (questView && questView.classList.contains('active')) {
            renderQuests();
        }
        let profView = document.getElementById('view-profile');
        if (profView && profView.classList.contains('active')) {
            renderProfile();
        }
    } catch (e) {
        console.error("saveState ui update error:", e);
    }
}

function changeCallsign() {
    let newName = prompt("Введите ваш новый позывной:", player.callsign);
    if (newName && newName.trim() !== "") { player.callsign = newName.trim(); saveState(); renderProfile(); }
}

// === ОБРАБОТКА ОФЛАЙН ВРЕМЕНИ ЧЕРЕЗ СЕРДЦЕБИЕНИЕ (HEARTBEAT) ===
function processOfflineTime() {
    let now = Date.now();
    let lastHeartbeat = parseInt(localStorage.getItem('pda_heartbeat'));
    if (lastHeartbeat && !player.inBase) {
        let diffMinutes = Math.floor((now - lastHeartbeat) / 60000);
        if (diffMinutes > 0 && player.hp > 0) {
            // Износ оружия за офлайн минуты (средний износ ~2% за минуту)
            if (player.weapons) {
                for (let wName in player.weapons) {
                    let w = player.weapons[wName];
                    if (w.active && w.durability > 0) {
                        let totalWear = diffMinutes * 1.4;
                        w.durability = Math.max(0, w.durability - totalWear);
                    }
                }
            }

            // Голод за оффлайн минуты
            let hungerLossPerMin = (player.equipment === 'eq_hunger') ? 0.8 : 2.4;
            let totalHungerLoss = diffMinutes * hungerLossPerMin;
            player.hunger = Math.max(0, player.hunger - totalHungerLoss);

            // Радиация за оффлайн минуты
            let totalRadGain = 0;
            if (player.karma_score < 3) {
                let radGainPerMin = Math.max(1, Math.round(2 * getRadMultiplier()));
                totalRadGain = diffMinutes * radGainPerMin;
                player.rads = Math.min(MAX_RADS, player.rads + totalRadGain);
            }

            // Урон от голода или радиации в офлайне
            if (player.hunger === 0) {
                let hungerDmg = (player.equipment === 'eq_hunger') ? 2 : 5;
                player.hp = Math.max(0, player.hp - (diffMinutes * hungerDmg));
            }

            saveState();

            if (diffMinutes >= 1) {
                setTimeout(() => {
                    alert(`⏱ ОФЛАЙН-РЕЖИМ ПДА:\nПока телефон был заблокирован (~${diffMinutes} мин.), Пустошь не спала.\n• Голод: -${totalHungerLoss}\n• Радиация: +${(player.karma_score < 3) ? totalRadGain : 0}\n• Оружие износилось.`);
                }, 1200);
            }
        }
    }
    localStorage.setItem('pda_heartbeat', now.toString());
}
