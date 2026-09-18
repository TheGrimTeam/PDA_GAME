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
    // Синхронизируем UI сканера при загрузке: камера по умолчанию выключена.
    updateScannerUI();
}

// === ОБРАБОТЧИК КНОПКИ СТАРТА/СТОПА СКАНЕРА ===
document.getElementById('start-scan-btn').addEventListener('click', () => {
    if (scannerActive) {
        stopScanner();
    } else {
        startScanner();
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
