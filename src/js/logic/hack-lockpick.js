// ============================================================
// ВЗЛОМ ТЕРМИНАЛА (term_): МИНИ-ИГРА «ОТМЫЧКА» (как в Fallout 3/NV)
// ============================================================
// Игрок выставляет угол шпильки (ползунок или палец по дуге) и
// удерживает «ПОВЕРНУТЬ». Чем ближе угол к скрытой «сладкой точке»,
// тем дальше проворачивается замок — это и есть подсказка.
// Если давить в упоре не в том месте, шпилька дрожит и ломается
// (сгорает попытка). Замок провернулся до конца — взлом успешен.
// Пока замок повёрнут, двигать шпильку нельзя — сначала отпустите.
// ============================================================

const LOCK_SWEET_HALF = 8;    // ± градусов, где замок открывается полностью
const LOCK_FALLOFF = 40;      // за сколько градусов от зоны поворот падает до минимума
const LOCK_MIN_OPEN = 0.06;   // даже далеко от точки замок чуть-чуть поддаётся
const LOCK_OPEN_DEG = 90;     // поворот цилиндра для открытия
const LOCK_TURN_SPEED = 150;  // °/с при повороте
const LOCK_RETURN_SPEED = 260;// °/с при возврате, когда отпустили
const LOCK_BREAK_TIME = 0.7;  // сек давления в упоре до поломки шпильки
const LOCK_SVG_H = 146;       // высота viewBox рисунка замка (hacking.html)

let lockSweet = 90;      // «сладкая точка», 0..180°
let lockAngle = 90;      // угол шпильки, 0..180°
let lockRot = 0;         // поворот цилиндра, 0..90°
let lockTurning = false;
let lockStress = 0;      // сколько секунд шпилька в упоре
let lockRaf = null;
let lockLastTs = 0;
let lockLastVibrate = 0;
let lockBound = false;
let lockDragging = false;

function lockpickStart() {
    lockSweet = 10 + Math.random() * 160;
    lockAngle = 90;
    lockRot = 0;
    lockTurning = false;
    lockStress = 0;
    lockBindControls();
    let slider = document.getElementById('lock-angle');
    if (slider) { slider.value = lockAngle; slider.disabled = false; }
    document.getElementById('lock-turn-btn').disabled = false;
    hackLog('Выставьте шпильку и удерживайте «ПОВЕРНУТЬ».', 'dim');
    hackLog('Чем дальше поддаётся замок — тем ближе вы к цели.', 'dim');
    lockRender();
    lockStartLoop();
}

function lockpickStop() {
    lockTurning = false;
    if (lockRaf) cancelAnimationFrame(lockRaf);
    lockRaf = null;
    let btn = document.getElementById('lock-turn-btn');
    if (btn) btn.disabled = true;
    let slider = document.getElementById('lock-angle');
    if (slider) slider.disabled = true;
}

// Насколько замок может провернуться при текущем угле (0..1)
function lockOpenness(angle) {
    let d = Math.abs(angle - lockSweet);
    if (d <= LOCK_SWEET_HALF) return 1;
    return Math.max(LOCK_MIN_OPEN, 1 - (d - LOCK_SWEET_HALF) / LOCK_FALLOFF);
}

function lockSetAngle(value) {
    if (hackFinished || lockTurning || lockRot > 1) return; // сначала отпустите замок
    lockAngle = Math.max(0, Math.min(180, Number(value)));
    let slider = document.getElementById('lock-angle');
    if (slider && Number(slider.value) !== lockAngle) slider.value = lockAngle;
    lockRender();
}

function lockTurnStart() {
    if (hackFinished || hackAttemptsLeft <= 0) return;
    lockTurning = true;
}

function lockTurnEnd() {
    lockTurning = false;
}

// Один шаг физики замка (вызывается из анимации; в тестах — напрямую)
function lockStep(dt) {
    if (hackFinished) return;
    if (lockTurning) {
        let open = lockOpenness(lockAngle);
        let target = LOCK_OPEN_DEG * open;
        if (lockRot < target) {
            lockRot = Math.min(target, lockRot + LOCK_TURN_SPEED * dt);
        }
        if (open >= 1 && lockRot >= LOCK_OPEN_DEG - 0.01) {
            lockTurning = false;
            lockRender();
            hackLog('Замок открыт.', 'ok');
            hackWin();
            return;
        }
        if (lockRot >= target - 0.5) {
            // Упёрлись: шпилька под нагрузкой
            lockStress += dt;
            let now = Date.now();
            if (navigator.vibrate && now - lockLastVibrate > 120) {
                try { navigator.vibrate(15); } catch (e) {}
                lockLastVibrate = now;
            }
            if (lockStress >= LOCK_BREAK_TIME) {
                lockTurning = false;
                lockStress = 0;
                lockRot = 0;
                lockFlash();
                hackSpendAttempt('Шпилька сломалась!');
                if (!hackFinished) hackLog('Новая шпилька. Точка та же — попробуйте другой угол.', 'dim');
            }
        }
    } else {
        lockRot = Math.max(0, lockRot - LOCK_RETURN_SPEED * dt);
        lockStress = Math.max(0, lockStress - dt * 2);
    }
    lockRender();
}

function lockStartLoop() {
    if (lockRaf) cancelAnimationFrame(lockRaf);
    lockLastTs = 0;
    const loop = (ts) => {
        let view = document.getElementById('view-hacking');
        if (hackFinished || !view || !view.classList.contains('active')) { lockRaf = null; lockTurning = false; return; }
        if (lockLastTs) lockStep(Math.min(0.1, (ts - lockLastTs) / 1000));
        lockLastTs = ts;
        lockRaf = requestAnimationFrame(loop);
    };
    lockRaf = requestAnimationFrame(loop);
}

function lockFlash() {
    let svg = document.getElementById('lock-svg');
    if (!svg) return;
    svg.classList.remove('lk-broken');
    void svg.getBoundingClientRect();
    svg.classList.add('lk-broken');
}

// Точка на дуге для угла шпильки: 0° — слева, 180° — справа
function lockArcPoint(angle, r) {
    let a = angle * Math.PI / 180;
    return { x: 100 - r * Math.cos(a), y: 100 - r * Math.sin(a) };
}

function lockRender() {
    let pin = document.getElementById('lock-pin');
    let cyl = document.getElementById('lock-cyl');
    if (!pin || !cyl) return;
    // Дрожь шпильки под нагрузкой
    let jitter = lockStress > 0 && lockTurning ? (Math.random() - 0.5) * 4 * (0.4 + lockStress / LOCK_BREAK_TIME) : 0;
    let tip = lockArcPoint(lockAngle + jitter, 88);
    pin.setAttribute('x2', tip.x.toFixed(1));
    pin.setAttribute('y2', tip.y.toFixed(1));
    cyl.setAttribute('transform', `rotate(${lockRot.toFixed(1)} 100 100)`);
    let angEl = document.getElementById('lock-angle-val');
    if (angEl) angEl.innerText = Math.round(lockAngle) + '°';
    let rotEl = document.getElementById('lock-rot-val');
    if (rotEl) rotEl.innerText = Math.round(lockRot / LOCK_OPEN_DEG * 100) + '%';
}

// Кнопка удержания и перетаскивание шпильки пальцем по дуге
function lockBindControls() {
    if (lockBound) return;
    lockBound = true;
    let btn = document.getElementById('lock-turn-btn');
    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); lockTurnStart(); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, lockTurnEnd));
    btn.addEventListener('contextmenu', (e) => e.preventDefault());

    let svg = document.getElementById('lock-svg');
    const angleFromEvent = (e) => {
        let rect = svg.getBoundingClientRect();
        let x = (e.clientX - rect.left) / rect.width * 200 - 100;
        let y = 100 - (e.clientY - rect.top) / rect.height * LOCK_SVG_H;
        let a = Math.atan2(Math.max(0, y), -x) * 180 / Math.PI;
        return Math.max(0, Math.min(180, a));
    };
    svg.addEventListener('pointerdown', (e) => { lockDragging = true; lockSetAngle(angleFromEvent(e)); });
    svg.addEventListener('pointermove', (e) => { if (lockDragging) lockSetAngle(angleFromEvent(e)); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => svg.addEventListener(ev, () => { lockDragging = false; }));
}
