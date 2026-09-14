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

function factoryReset() { if (prompt("Введите PIN-код:") === "Прайс админ") { localStorage.removeItem('wasteland_player'); localStorage.removeItem('pda_heartbeat'); location.reload(); } else { alert("Неверный PIN!"); } }
