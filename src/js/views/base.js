// ============================================================
// VIEWS: БАЗА (ЛОББИ / ПАУЗА)
// ============================================================

function renderBaseView() {
    player.inBase = true;
    saveState();
    let callsignInput = document.getElementById('base-callsign-input');
    if (callsignInput) callsignInput.value = player.callsign || "";
    let scoreEl = document.getElementById('base-score');
    if (scoreEl) scoreEl.innerText = player.score || 0;
    let k = getKarmaStatus();
    let karmaEl = document.getElementById('base-karma');
    if (karmaEl) {
        karmaEl.innerText = k.name;
        karmaEl.className = k.class;
    }
}

function saveBaseCallsign() {
    let val = document.getElementById('base-callsign-input').value.trim();
    if (val) {
        player.callsign = val;
        saveState();
        alert("Позывной сохранен: " + val);
    }
}

function startGameFromBase() {
    player.inBase = false;
    saveState();
    runBootSequence();
    setTimeout(() => {
        switchView('scan');
        if (player.radioOn) {
            startRadio();
        }
    }, 1800);
}
