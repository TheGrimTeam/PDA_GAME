// ============================================================
// СИСТЕМА АДМИНИСТРИРОВАНИЯ И РОЛЕЙ
// ============================================================

function adminLogout() {
    player.isAdmin = false;
    saveState();
    updateAdminVisibility();
    renderProfile();
    alert("Вы вышли из режима администратора.");
}

function adminModifyCredits(isAdd) {
    let input = document.getElementById('admin-credit-amount');
    let amount = parseInt(input ? input.value : 0);
    if (isNaN(amount) || amount <= 0) {
        alert("Пожалуйста, введите корректное число кредитов!");
        return;
    }
    if (!isAdd) {
        if ((player.score || 0) < amount) {
            if (!confirm(`У игрока всего ${player.score || 0}💎. Списать выбранную сумму в минус?`)) return;
        }
        player.score = Math.max(0, (player.score || 0) - amount);
        playSound('sell');
        showBanner(`💸 Администратор списал ${amount} 💎`, 'var(--bandit-color)');
    } else {
        player.score = (player.score || 0) + amount;
        playSound('karma');
        showBanner(`💎 Администратор начислил ${amount} 💎`, 'var(--term-green)');
    }
    saveState();
    renderProfile();
    updateHUD();
}

function adminQuickAddCredits(val) {
    let input = document.getElementById('admin-credit-amount');
    if (input) input.value = val;
}

function adminSetRole(role) {
    player.role = role;
    saveState();
    updateAdminVisibility();
    renderProfile();
    alert(`Роль игрока успешно изменена на: ${role.toUpperCase()}`);
}

function generateArrestWarrantQR() {
    if (player.role !== 'Военный') {
        return alert("Только Военные могут выдавать ордера на арест!");
    }
    let container = document.getElementById('arrest-qr-container');
    container.style.display = 'block';
    let warrantId = "arrest_" + player.callsign + "_" + Date.now();
    generateQR('arrest-qr-container', `${QR_PREFIX_ARREST}${player.callsign}:${warrantId}`);
    alert("Ордер на арест сгенерирован! Покажите этот QR-код бандиту для сканирования его ПДА.");
}

function handleArrestScan(code) {
    // Когда бандит сканирует ордер военного
    let parts = code.split(":");
    let officerName = parts[1];
    let warrantId = parts[2];

    // Блокируем ПДА бандита на 10 минут (600,000 мс)
    player.arrestedUntil = Date.now() + 600000;
    playSound('death');
    saveState();
    checkDeathState();
    alert(`⚖ ВЫ АРЕСТОВАНЫ ОФИЦЕРОМ ${officerName.toUpperCase()}!\nВаш ПДА заблокирован на 10 минут.`);
}

function handleBanditScan(code) {
    // Когда военный сканирует ID бандита
    if (player.role !== 'Военный') {
        return alert("Только Военные получают премию за фиксацию бандитов!");
    }
    let parts = code.split(":");
    let banditName = parts[1];

    // Премия 100 кредитов
    player.score += 100;
    playSound('sell');
    saveState();
    document.getElementById('scan-result').innerHTML = `<b style="color:var(--quest-color)">БАНДИТ ПОЙМАН!</b><br><small>Фиксация нарушителя: ${banditName}. Премия: +100 💎</small>`;
}

function returnToBase() {
    player.inBase = true;
    saveState();
    switchView('base');
}
