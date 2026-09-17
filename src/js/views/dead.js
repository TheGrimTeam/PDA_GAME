// ============================================================
// VIEWS: СМЕРТЬ / ТРУП
// Состояние смерти, QR-коды лечения и мародерства
// ============================================================

function declareDeath() {
    if (confirm("Вы убиты? ПДА заблокируется.")) {
        player.hp = 0;
        // Сбрасываем незавершённый запрос на лечение: старый QR больше не должен приниматься.
        player.pendingHealId = null;
        player.pendingHealAt = 0;
        saveState();
        checkDeathState();
    }
}

function checkDeathState() {
    updateHUD();
    if (player.hp <= 0) {
        if (!player.isCurrentlyDead) {
            player.isCurrentlyDead = true;
            player.stats.deaths = (player.stats.deaths || 0) + 1;

            // При смерти: если еще не инфицирован и не зомби, шанс заражения составляет 15%
            if (!player.infectionTime && !player.zombieTime) {
                if (Math.random() < 0.33) {
                    player.infectionTime = Date.now();
                    playSound('hazard');
                    showBanner("ИНФЕЦИРОВАН ВИРУСОМ!", 'yellow');
                }
            }
        }
        playSound('death'); stopRadio();
        let k = getKarmaStatus();
        let hintText = 'Базу Корпорации';
        if (k.name === 'БАНДИТ' && player.equipment !== 'eq_pass_base') hintText = 'Лагерь Бандитов';
        document.getElementById('dead-respawn-hint').innerText = hintText;
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('view-dead').classList.add('active');
        document.getElementById('nav-buttons').style.display = 'none';
        if(scanner) scanner.stop();
    } else {
        document.getElementById('nav-buttons').style.display = 'grid';
        // Игрок больше не мёртв — незавершённый запрос на лечение неактуален.
        player.pendingHealId = null;
        player.pendingHealAt = 0;
        stopHealItemScanner();
        if(document.getElementById('view-dead').classList.contains('active')) switchView('scan');
        if (player.radioOn) startRadio();
    }
}

function showHealQR() {
    document.getElementById('corpse-qr-container').style.display = "block";
    let cId = "help_" + Date.now();
    // Сохраняем ID запроса на лечение: с ним будет сверяться txId из QR лечебного предмета.
    player.pendingHealId = cId;
    player.pendingHealAt = Date.now();
    saveState();
    generateQR('corpse-qr-container', QR_PREFIX_HEAL + cId + ":" + player.callsign);

    document.getElementById('corpse-qr-desc').style.display = "block";
    document.getElementById('corpse-qr-desc').innerHTML = "<span style='color:var(--hero-color)'>Покажите этот код спасителю. У него спишется еда/медикамент, он получит +1 кармы. Затем отсканируйте QR предмета, который он покажет.</span>";
    document.getElementById('btn-scan-heal-item').style.display = "block";
    document.getElementById('btn-confirm-rob').style.display = "none";
}

function showRobQR() {
    if (player.inventory.length === 0) return alert("Ваш рюкзак пуст. Нечего мародерствовать.");

    // Автоматически определяем тип трупа по роли и карме погибшего
    let corpseType = 'survivor';
    if (player.role === 'Военный') {
        corpseType = 'military';
    } else if (player.karma_score <= -3) {
        corpseType = 'bandit';
    }

    document.getElementById('corpse-qr-container').style.display = "block";
    let cId = "rob_" + corpseType + "_" + Date.now();
    generateQR('corpse-qr-container', QR_PREFIX_ROB + corpseType + ":" + cId + ":" + player.callsign + ":" + player.inventory.join(","));

    document.getElementById('corpse-qr-desc').style.display = "block";
    if (corpseType === 'military') {
        document.getElementById('corpse-qr-desc').innerHTML = "<span style='color:var(--bandit-color)'>Покажите этот код мародеру. Вы Военный, мародер заберет ваши вещи и Жетон Военного.</span>";
    } else if (corpseType === 'bandit') {
        document.getElementById('corpse-qr-desc').innerHTML = "<span style='color:var(--quest-color)'>Покажите этот код мародеру. Вы Бандит, мародер заберет ваши вещи и Жетон Бандита (без потери кармы).</span>";
    } else {
        document.getElementById('corpse-qr-desc').innerHTML = "<span style='color:var(--bandit-color)'>Покажите этот код мародеру. Вы Выживший, мародер заберет ваши вещи и Жетон Выжившего (-1 кармы).</span>";
    }

    document.getElementById('btn-confirm-rob').onclick = function() { confirmRob(corpseType); };
    document.getElementById('btn-confirm-rob').style.display = "block";
    document.getElementById('btn-scan-heal-item').style.display = "none";
}

function showSurvivorQRModal() {
    let corpseCont = document.getElementById('corpse-qr-container');
    let corpseDesc = document.getElementById('corpse-qr-desc');

    // Белая подложка, отступы и скругление обеспечивает класс .qr-surface.
    corpseCont.style.display = "block";
    corpseCont.style.width = "210px";
    corpseCont.style.height = "210px";
    corpseCont.style.margin = "0 auto 15px auto";

    let isZomb = player.zombieTime && ((Date.now() - player.zombieTime) < ZOMBIE_TIME_MS);
    let qrPayload = isZomb ? (QR_PREFIX_ZOMBIE_ID + (player.id || player.callsign) + ":" + player.callsign) : (QR_PREFIX_PLAYER_ID + (player.id || player.callsign) + ":" + player.callsign);

    generateQR('corpse-qr-container', qrPayload);

    corpseDesc.style.display = "block";
    if (isZomb) {
        corpseDesc.innerHTML = "<span style='color:var(--bandit-color)'>🧟 ВЫ ЗОМБИ! Покажите этот QR-код другим игрокам. За вашу ликвидацию или охоту они получат награду.</span>";
    } else {
        corpseDesc.innerHTML = "<span style='color:var(--rad-color)'>☣️ Статус выжившего. Покажите этот код для сканирования и получения бонуса (+250 💎).</span>";
    }

    document.getElementById('btn-scan-heal-item').style.display = "none";
    document.getElementById('btn-confirm-rob').style.display = "none";
}

// === ЛЕЧЕНИЕ ЧЕРЕЗ СКАНИРОВАНИЕ QR ЛЕЧЕБНОГО ПРЕДМЕТА ===
// Кнопка confirmHeal() удалена: лечение невозможно без реального QR от спасителя.
let healItemScanner = null;

// Останавливает камеру сканера лечебного предмета, если она запущена.
// ВАЖНО: html5-qrcode может бросить СИНХРОННОЕ исключение ("Cannot stop, scanner
// is not running"), если сканер уже остановлен. Поэтому вызов stop() обязательно
// оборачиваем в try/catch — иначе исключение прервёт handleHealItemScan и лечение
// не сработает (HP не восстановится).
function stopHealItemScanner() {
    if (!healItemScanner) return;
    try {
        Promise.resolve(healItemScanner.stop()).catch(() => {});
    } catch (e) {
        // Игнорируем: сканер уже остановлен.
    }
}

function startHealItemScan() {
    if (typeof Html5Qrcode === 'undefined') {
        alert("⚠️ Офлайн-режим: камера недоступна. Введите код вручную.");
        document.getElementById('heal-item-manual-box').style.display = 'flex';
        return;
    }
    if (!healItemScanner) healItemScanner = new Html5Qrcode("qr-reader-heal-item");
    document.getElementById('qr-reader-heal-item').style.display = 'block';
    document.getElementById('btn-scan-heal-item').style.display = 'none';
    healItemScanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } },
        (t) => {
            // Останавливаем камеру, но НЕ ждём промис stop() — обрабатываем результат
            // сразу, как в startDeadScan(). Иначе при зависшем stop() обработка
            // (handleHealItemScan) никогда не вызовется, и лечение не сработает.
            try {
                Promise.resolve(healItemScanner.stop()).catch(() => {});
            } catch (e) {
                // Игнорируем: сканер уже остановлен.
            }
            handleHealItemScan(t);
        }, (e) => { })
        .catch(e => { alert("Ошибка камеры."); });
}

function handleHealItemScan(qrCode) {
    // Камера могла остаться запущенной (ручной ввод или повторный вызов) — гасим.
    stopHealItemScanner();
    let code = String(qrCode || '').trim().toLowerCase();
    if (!code.startsWith(QR_PREFIX_HEAL_ITEM)) {
        playSound('error');
        return alert("Это не код лечебного предмета!");
    }
    let parts = code.split(":");
    let txId = parts[1];
    let healAmount = parseInt(parts[3]) || 0;
    let healerName = parts[4] || "Неизвестный";

    if (!player.pendingHealId) {
        playSound('error');
        return alert("Нет активного запроса на лечение. Сначала покажите свой QR (кнопка ЛЕЧЕНИЕ).");
    }
    if (txId !== player.pendingHealId) {
        playSound('error');
        return alert("Этот QR предназначен для другого игрока!");
    }
    if (Date.now() - player.pendingHealAt > HEAL_ITEM_TIMEOUT_MS) {
        playSound('error');
        player.pendingHealId = null;
        saveState();
        return alert("Срок действия лечения истёк (1 минута). Покажите QR заново.");
    }
    player.processedHealTxs = player.processedHealTxs || {};
    if (player.processedHealTxs[txId]) {
        playSound('error');
        return alert("Этот предмет уже использован для лечения!");
    }
    if (healAmount <= 0) {
        playSound('error');
        return alert("Этот предмет не восстанавливает здоровье!");
    }

    player.processedHealTxs[txId] = Date.now();
    player.pendingHealId = null;
    player.pendingHealAt = 0;

    if (player.rads > 50) player.rads = 50;
    let maxHp = getEffectiveMaxHp();
    // Math.max(1, ...) гарантирует подъём: при maxHp <= 0 (высокая радиация)
    // игрок иначе остался бы с hp = 0, а isCurrentlyDead уже сброшен ниже.
    player.hp = Math.max(1, Math.min(maxHp, 20 + healAmount));
    // ВНИМАНИЕ: Лечение спасителем восстанавливает HP, но ОСТАВЛЯЕТ инфекцию/заражение активными!
    saveState();

    document.getElementById('corpse-qr-container').style.display = "none";
    document.getElementById('corpse-qr-desc').style.display = "none";
    document.getElementById('btn-scan-heal-item').style.display = "none";
    document.getElementById('qr-reader-heal-item').style.display = 'none';
    player.inBase = false; player.isCurrentlyDead = false;
    checkDeathState();
    alert(`Вы были подняты спасителем ${healerName} (+${healAmount} HP). Внимание: Инфекция вируса не вылечена!`);
}
window.startHealItemScan = startHealItemScan;
window.handleHealItemScan = handleHealItemScan;

function confirmRob(corpseType = 'survivor') {
    player.inventory = [];
    saveState();
    document.getElementById('corpse-qr-container').style.display = "none";
    document.getElementById('corpse-qr-desc').style.display = "none";
    document.getElementById('btn-confirm-rob').style.display = "none";
    alert(corpseType === 'bandit' ? "Вас облутали бандиты. Рюкзак пуст." : "Вас облутали. Рюкзак пуст.");
}
