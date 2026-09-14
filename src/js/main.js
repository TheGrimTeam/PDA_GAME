// ============================================================
// ТОЧКА ВХОДА
// Инициализация игры, обработчики событий, запуск PWA
// ============================================================

function init() {
    if (player.inBase === undefined) player.inBase = true;
    let hasPresetZona = false;
    try { hasPresetZona = player.quests.choices.some(q => q && q.id && typeof q.id === 'string' && q.id.startsWith('preset_zona')); } catch(e) {}
    if (!player.quests.choices || player.quests.choices.length < 5) generateQuestChoices();

    // Обработка офлайн-времени (износ оружия, голод, радиация)
    processOfflineTime();

    if (player.hp <= 0) {
        checkDeathState();
    } else if (player.inBase) {
        switchView('base');
    } else {
        switchView('scan');
    }

    runGeigerLoop();
    runHeartbeatLoop();

    let notesEl = document.getElementById('survival-notes');
    if (notesEl) {
        notesEl.value = localStorage.getItem('wasteland_notes') || '';
    }

    startInfectionLoop();
    startHeartbeatLoop();
    startEventLoop();
    startBlowoutSchedule();
    updateRadioUI();
    if (player.radioOn && !player.inBase) startRadio();
    updateAdminVisibility();
}

// === ОБРАБОТЧИК КНОПКИ СТАРТА СКАНЕРА ===
document.getElementById('start-scan-btn').addEventListener('click', () => {
    if (typeof Html5Qrcode === 'undefined') {
        alert("⚠️ Офлайн-сканер: библиотека камеры не загружена (требуется разовый выход в интернет для кэширования). Используйте ручной ввод кодов ниже!");
        let manualBox = document.getElementById('admin-manual-scan-box');
        if (manualBox && player.isAdmin) manualBox.style.display = 'flex';
        return;
    }
    try {
        if (!scanner) scanner = new Html5Qrcode("qr-reader");
        scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: {width: 250, height: 250} }, (t) => {
            scanner.stop();
            handleScan(t);
        }, (e) => {}).catch(err => {
            alert("Ошибка камеры! Убедитесь, что разрешили доступ к камере в настройках браузера.");
        });
    } catch(err) {
        alert("Не удалось запустить камеру. Используйте ручной ввод ниже.");
        let manualBox = document.getElementById('admin-manual-scan-box');
        if (manualBox && player.isAdmin) manualBox.style.display = 'flex';
    }
});

// === ИНИЦИАЛИЗАЦИЯ КАРТЫ В switchView ===
let old_switchView_map = switchView;
switchView = function(viewName) {
    old_switchView_map(viewName);
    if (viewName === 'map') {
        if (zoneMarkers.length === 0) initMapSystem();
        renderZoneMap();
    }
};

// === ЗАПУСК ===
initMapSystem();
init();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
