// ============================================================
// VIEWS: СМЕРТЬ / ТРУП
// Состояние смерти, QR-коды лечения и мародерства
// ============================================================

function declareDeath() { if(confirm("Вы убиты? ПДА заблокируется.")) { player.hp = 0; saveState(); checkDeathState(); } }

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
        if(document.getElementById('view-dead').classList.contains('active')) switchView('scan');
        if (player.radioOn) startRadio();
    }
}

function showHealQR() {
    document.getElementById('corpse-qr-container').style.display = "block";
    let cId = "help_" + Date.now();
    generateQR('corpse-qr-container', QR_PREFIX_HEAL + cId + ":" + player.callsign);

    document.getElementById('corpse-qr-desc').style.display = "block";
    document.getElementById('corpse-qr-desc').innerHTML = "<span style='color:var(--hero-color)'>Покажите этот код спасителю. У него спишется еда/медикамент, он получит +1 кармы, а вы встанете с 20% здоровья.</span>";
    document.getElementById('btn-confirm-heal').style.display = "block";
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
    document.getElementById('btn-confirm-heal').style.display = "none";
}

function showSurvivorQRModal() {
    let corpseCont = document.getElementById('corpse-qr-container');
    let corpseDesc = document.getElementById('corpse-qr-desc');

    corpseCont.style.display = "block";
    corpseCont.style.width = "210px";
    corpseCont.style.height = "210px";
    corpseCont.style.margin = "0 auto 15px auto";
    corpseCont.style.display = "flex";
    corpseCont.style.justifyContent = "center";
    corpseCont.style.alignItems = "center";
    corpseCont.style.borderRadius = "4px";
    corpseCont.style.overflow = "hidden";

    let isZomb = player.zombieTime && ((Date.now() - player.zombieTime) < ZOMBIE_TIME_MS);
    let qrPayload = isZomb ? (QR_PREFIX_ZOMBIE_ID + (player.id || player.callsign) + ":" + player.callsign) : (QR_PREFIX_PLAYER_ID + (player.id || player.callsign) + ":" + player.callsign);

    generateQR('corpse-qr-container', qrPayload);

    corpseDesc.style.display = "block";
    if (isZomb) {
        corpseDesc.innerHTML = "<span style='color:var(--bandit-color)'>🧟 ВЫ ЗОМБИ! Покажите этот QR-код другим игрокам. За вашу ликвидацию или охоту они получат награду.</span>";
    } else {
        corpseDesc.innerHTML = "<span style='color:var(--rad-color)'>☣️ Статус выжившего. Покажите этот код для сканирования и получения бонуса (+250 💎).</span>";
    }

    document.getElementById('btn-confirm-heal').style.display = "none";
    document.getElementById('btn-confirm-rob').style.display = "none";
}

function confirmHeal() {
    if (player.rads > 50) player.rads = 50;
    player.hp = 20;
    // ВНИМАНИЕ: Лечение спасителем восстанавливает 20% HP, но ОСТАВЛЯЕТ инфекцию/заражение активными!
    saveState();
    document.getElementById('corpse-qr-container').style.display = "none";
    document.getElementById('corpse-qr-desc').style.display = "none";
    document.getElementById('btn-confirm-heal').style.display = "none";
    player.inBase = false; player.isCurrentlyDead = false;
    checkDeathState();
    alert("Вы были подняты спасителем (20% HP). Внимание: Инфекция вируса не вылечена!");
}

function confirmRob(corpseType = 'survivor') {
    player.inventory = [];
    saveState();
    document.getElementById('corpse-qr-container').style.display = "none";
    document.getElementById('corpse-qr-desc').style.display = "none";
    document.getElementById('btn-confirm-rob').style.display = "none";
    alert(corpseType === 'bandit' ? "Вас облутали бандиты. Рюкзак пуст." : "Вас облутали. Рюкзак пуст.");
}
