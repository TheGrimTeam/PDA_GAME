// ============================================================
// СИСТЕМА ПСИ-ВЫБРОСА
// ============================================================

let blowoutTimer = null;
let blowoutActiveTimer = null;
let blowoutSecondsLeft = 0;
let isBlowoutIncoming = false;

function startBlowoutSchedule() {
    if (blowoutTimer) clearInterval(blowoutTimer);
    // Период выброса задаётся константой BLOWOUT_INTERVAL_MS
    blowoutTimer = setInterval(() => {
        triggerBlowoutSequence();
    }, BLOWOUT_INTERVAL_MS);
}

function triggerTestBlowout() {
    if (isBlowoutIncoming) {
        alert("Выброс уже приближается!");
        return;
    }
    triggerBlowoutSequence();
    alert("Тестовый выброс запущен! У вас есть 4 минуты. Вы должны отсканировать QR-код своей фракционной базы, чтобы спастись (для Выживших: npc_base, для Бандитов: npc_bandit_base).");
}

function triggerBlowoutSequence() {
    isBlowoutIncoming = true;
    blowoutSecondsLeft = 240; // 4 минуты (240 секунд)
    updateBlowoutUI();

    if (blowoutActiveTimer) clearInterval(blowoutActiveTimer);
    blowoutActiveTimer = setInterval(() => {
        blowoutSecondsLeft--;
        updateBlowoutUI();

        // Звук сирены каждые 2 секунды
        if (blowoutSecondsLeft % 2 === 0) {
            playSound('siren');
        }

        if (blowoutSecondsLeft <= 0) {
            clearInterval(blowoutActiveTimer);
            resolveBlowout();
        }
    }, 1000);
}

function updateBlowoutUI() {
    let banner = document.getElementById('blowout-warning-banner');
    let statusText = document.getElementById('blowout-status-text');

    let mins = Math.floor(blowoutSecondsLeft / 60);
    let secs = blowoutSecondsLeft % 60;
    let timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

    if (isBlowoutIncoming) {
        if (banner) {
            banner.style.display = 'block';
            banner.innerText = `⚠️ ВНИМАНИЕ! ПСИ-ВЫБРОС ЧЕРЕЗ ${timeStr}! ОТСКАНИРУЙТЕ QR-КОД ВАШЕЙ БАЗЫ ДЛЯ СПАСЕНИЯ!`;
        }
        if (statusText) {
            statusText.innerHTML = `<span style="color:var(--rad-color); font-weight:bold; animation: pulse-led 0.5s infinite alternate;">⚠️ ВЫБРОС ЧЕРЕЗ ${timeStr}!</span>`;
        }
    } else {
        if (banner) banner.style.display = 'none';
        if (statusText) {
            statusText.innerText = `Статус: Спокойно (Следующий примерно через час)`;
        }
    }
}

function resolveBlowout() {
    isBlowoutIncoming = false;
    updateBlowoutUI();

    // Игрок не успел отсканировать нужный QR-код во время Выброса
    playSound('death');
    player.hp = Math.max(1, Math.round(player.hp * 0.3)); // Снижает HP до 30%
    player.rads = Math.min(MAX_RADS, (player.rads || 0) + 35); // Радиация
    saveState();

    let scr = document.getElementById('screen');
    if (scr) {
        scr.style.filter = "invert(1) hue-rotate(0deg) contrast(3)";
        setTimeout(() => { scr.style.filter = ""; }, 1200);
    }
    showBanner("⚠️ ВАС НАКРЫЛ ПСИ-ВЫБРОС! ВЫ НЕ УСПЕЛИ ДОБЕЖАТЬ ДО УКРЫТИЯ!", 'var(--rad-color)');
}

function checkBlowoutShelterScan(scannedCode) {
    if (!isBlowoutIncoming) return false;
    let c = scannedCode.trim().toLowerCase();
    let k = getKarmaStatus();
    let isBandit = k.name === 'БАНДИТ';

    // Валидные коды укрытий
    let survivorCodes = ['base', 'base_safe', 'npc_base', 'убежище'];
    let banditCodes = ['npc_bandit_base', 'npc_camp', 'camp_bandit', 'bandit_camp'];

    if (isBandit) {
        if (banditCodes.includes(c)) {
            isBlowoutIncoming = false;
            if (blowoutActiveTimer) clearInterval(blowoutActiveTimer);
            updateBlowoutUI();

            playSound('karma');
            showBanner("✅ УКРЫТИЕ В ЛАГЕРЕ БАНДИТОВ ПОДТВЕРЖДЕНО!", 'var(--term-green)');
            player.score = (player.score || 0) + 200;
            saveState();
            return true;
        } else if (survivorCodes.includes(c)) {
            playSound('error');
            showBanner("⚠️ ВЫ БАНДИТ! ОХРАНА БАЗЫ ВЫЖИВШИХ ВАС НЕ ПУСКАЕТ!", 'var(--rad-color)');
            return true; // Считаем сканирование обработанным, но спасения не произошло
        }
    } else {
        // Выжившие, нейтралы, военные
        if (survivorCodes.includes(c)) {
            isBlowoutIncoming = false;
            if (blowoutActiveTimer) clearInterval(blowoutActiveTimer);
            updateBlowoutUI();

            playSound('karma');
            showBanner("✅ УКРЫТИЕ НА БАЗЕ ВЫЖИВШИХ ПОДТВЕРЖДЕНО!", 'var(--term-green)');
            player.score = (player.score || 0) + 200;
            saveState();
            return true;
        } else if (banditCodes.includes(c)) {
            playSound('error');
            showBanner("⚠️ БАНДИТЫ В ЛАГЕРЕ ОТКРЫЛИ ПО ВАМ ОГОНЬ!", 'var(--rad-color)');
            return true; // Обработано, но не спасло
        }
    }
    return false;
}
