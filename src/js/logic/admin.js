// ============================================================
// АДМИНИСТРИРОВАНИЕ
// ============================================================

function adminLogin() {
    let login = prompt("Введите логин:");
    if (login && login.trim().toLowerCase() === "админ") {
        let pass = prompt("Введите пароль:");
        if (pass === "Прайс админ") {
            player.isAdmin = true;
            saveState();
            updateAdminVisibility();
            alert("Доступ администратора активирован!");
            return;
        }
    }
    alert("Неверные данные!");
}

function updateAdminVisibility() {
    const scanBox = document.getElementById('admin-manual-scan-box');
    const deadBox = document.getElementById('admin-manual-dead-box');
    const adminCtrlBox = document.getElementById('admin-controls-box');
    const loginBtn = document.getElementById('btn-admin-login');

    if (scanBox) scanBox.style.display = player.isAdmin ? 'flex' : 'none';
    if (deadBox) deadBox.style.display = player.isAdmin ? 'flex' : 'none';
    if (adminCtrlBox) adminCtrlBox.style.display = player.isAdmin ? 'block' : 'none';
    if (loginBtn) loginBtn.style.display = player.isAdmin ? 'none' : 'block';
}

function factoryReset() {
    const first = prompt("Введите позывной для сброса ПДА:");
    if (first === null) return; // отмена — тихо выходим

    if (first.trim() !== player.callsign) {
        alert("Неверный позывной!");
        return;
    }

    const second = prompt("Введите позывной повторно для подтверждения:");
    if (second === null) return;

    if (second.trim() !== player.callsign) {
        alert("Позывные не совпадают!");
        return;
    }

    localStorage.removeItem(STORAGE_KEY_PLAYER);
    localStorage.removeItem('pda_heartbeat');
    localStorage.removeItem('wasteland_notes');
    localStorage.removeItem(STORAGE_KEY_MAP_MARKERS);
    localStorage.removeItem(STORAGE_KEY_MAP_BG);
    location.reload();
}

