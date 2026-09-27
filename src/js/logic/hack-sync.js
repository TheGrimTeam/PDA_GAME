// ============================================================
// ВЗЛОМ ФЛЕШКИ (usb_): МИНИ-ИГРА «СИНХРОНИЗАЦИЯ»
// ============================================================
// По шкале движется бегунок сканера. Игрок жмёт «СИНХРОНИЗАЦИЯ»,
// когда бегунок в зелёной зоне. 3 уровня подряд: с каждым уровнем
// зона уже, а бегунок быстрее. Промах сжигает попытку (уровень остаётся).
// ============================================================

const SYNC_LEVELS = 3;
const SYNC_ZONES = [24, 18, 13];   // ширина зелёной зоны, % шкалы
const SYNC_SPEEDS = [45, 65, 90];  // скорость бегунка, % шкалы в секунду
const SYNC_PAUSE_MS = 700;         // пауза после попадания/промаха

let hackLevel = 1;                       // текущий уровень 1..3
let hackPos = 0;                         // позиция бегунка, %
let hackDir = 1;                         // 1 — вправо, -1 — влево
let hackZone = { start: 40, width: 20 }; // зелёная зона, %
let hackPaused = false;
let hackRaf = null;
let hackLastTs = 0;

function syncStart() {
    hackLevel = 1;
    hackPaused = false;
    document.getElementById('hack-sync-btn').disabled = false;
    hackLog('Жмите «СИНХРОНИЗАЦИЯ», когда бегунок в зелёной зоне.', 'dim');
    syncSetupLevel();
    syncStartLoop();
}

function syncStop() {
    if (hackRaf) cancelAnimationFrame(hackRaf);
    hackRaf = null;
    let btn = document.getElementById('hack-sync-btn');
    if (btn) btn.disabled = true;
}

// Новая зелёная зона (случайное место) и сброс бегунка
function syncSetupLevel() {
    let width = SYNC_ZONES[hackLevel - 1];
    hackZone = { start: 5 + Math.random() * (90 - width), width: width };
    hackPos = 0;
    hackDir = 1;
    syncRender();
    syncUpdateLevelUI();
}

function syncRender() {
    let zone = document.getElementById('hack-zone');
    let runner = document.getElementById('hack-runner');
    if (zone) { zone.style.left = hackZone.start + '%'; zone.style.width = hackZone.width + '%'; }
    if (runner) runner.style.left = hackPos + '%';
}

function syncUpdateLevelUI() {
    let el = document.getElementById('hack-stage');
    if (!el) return;
    let dots = '';
    for (let i = 1; i <= SYNC_LEVELS; i++) dots += (i < hackLevel || (hackFinished && hackAttemptsLeft > 0)) ? '● ' : (i === hackLevel ? '◉ ' : '○ ');
    el.innerText = `${dots.trim()}  уровень ${Math.min(hackLevel, SYNC_LEVELS)}/${SYNC_LEVELS}`;
}

function syncStartLoop() {
    if (hackRaf) cancelAnimationFrame(hackRaf);
    hackLastTs = 0;
    const step = (ts) => {
        let view = document.getElementById('view-hacking');
        if (hackFinished || !view || !view.classList.contains('active')) { hackRaf = null; return; }
        if (hackLastTs && !hackPaused) {
            let dt = Math.min(0.1, (ts - hackLastTs) / 1000);
            hackPos += hackDir * SYNC_SPEEDS[hackLevel - 1] * dt;
            if (hackPos >= 100) { hackPos = 100; hackDir = -1; }
            if (hackPos <= 0) { hackPos = 0; hackDir = 1; }
            syncRender();
        }
        hackLastTs = ts;
        hackRaf = requestAnimationFrame(step);
    };
    hackRaf = requestAnimationFrame(step);
}

function syncFlash(cls) {
    let track = document.getElementById('hack-track');
    if (!track) return;
    track.classList.remove('hk-hit', 'hk-miss');
    void track.offsetWidth; // перезапуск CSS-анимации
    track.classList.add(cls);
}

// Кнопка «СИНХРОНИЗАЦИЯ»
function hackSync() {
    if (hackFinished || hackPaused || hackAttemptsLeft <= 0) return;

    let inZone = hackPos >= hackZone.start && hackPos <= hackZone.start + hackZone.width;
    if (inZone) {
        hackLog(`Уровень ${hackLevel}: синхронизация успешна.`, 'ok');
        syncFlash('hk-hit');
        if (hackLevel >= SYNC_LEVELS) {
            hackWin();
            syncUpdateLevelUI();
            return;
        }
        playSound('upgrade');
        hackPaused = true;
        setTimeout(() => {
            if (hackFinished) return;
            hackLevel++;
            hackPaused = false;
            syncSetupLevel();
            hackLog(`Уровень ${hackLevel}: зона уже, сигнал быстрее.`, 'dim');
        }, SYNC_PAUSE_MS);
        return;
    }

    // Промах — попытка сгорает, бегунок продолжает с того же места
    syncFlash('hk-miss');
    if (hackSpendAttempt('Промах!')) return;
    hackPaused = true;
    setTimeout(() => { hackPaused = false; }, SYNC_PAUSE_MS);
}
