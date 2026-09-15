// ============================================================
// VIEWS: СКАНЕР
// Радио-модуль, пасхалки (УВБ-76, хакер).
// ВНИМАНИЕ: startDeadScan() и handleDeadScan() определены в
// src/js/logic/scan.js — здесь не дублируются.
// ============================================================

// === РАДИО ===
function toggleRadio() { player.radioOn = !player.radioOn; saveState(); updateRadioUI(); if (player.radioOn) startRadio(); else stopRadio(); }

function updateRadioUI() {
    const btn = document.getElementById('btn-radio-toggle'); const txt = document.getElementById('radio-text');
    if (player.radioOn) {
        btn.innerText = "ВКЛ"; btn.style.backgroundColor = "var(--trade-color)"; btn.style.color = "var(--term-dark)";
        player.radioMessages = player.radioMessages || [];
        if (player.radioMessages.length === 0) {
            txt.innerHTML = "<span style='color:var(--term-green)'>[Поиск сигнала в эфире...]</span>";
        } else {
            txt.innerHTML = player.radioMessages.map(msg => `<div style="margin-bottom:8px; border-bottom:1px dashed #333; padding-bottom:4px; font-family: monospace; font-size: 0.95rem; color: var(--trade-color); line-height: 1.3;">${msg}</div>`).join('');
        }
    }
    else {
        btn.innerText = "ВЫКЛ"; btn.style.backgroundColor = "transparent"; btn.style.color = "var(--trade-color)";
        txt.innerHTML = "<span style='color:#555'>[Радиомодуль отключен. Тишина]</span>";
    }
}

function startRadio() {
    if (radioTimer) clearTimeout(radioTimer);
    radioTimer = setTimeout(() => {
        if (!player.radioOn || player.hp <= 0) return;

        let msg;
        if (uvbActive) {
            playCreepyBuzz();
            let uvbMessages = [
                "⚠️ УВБ-76: [ТОН 60Гц] МДЖБ 76 49 21 82 ... ПРИЕМ",
                "⚠️ УВБ-76: [ШУМ] Сектор 14 пуст. Эвакуация провалена.",
                "⚠️ УВБ-76: [ИДИ НА СЕВЕР] Запись 2084: Они идут из подвала Убежища...",
                "⚠️ УВБ-76: [ТОН] Бром-9, Янтарь-21, Кобальт-4. Ответьте.",
                "⚠️ УВБ-76: 8 2 1 9 4 0 (повторяется тихим синтетическим голосом)",
                "⚠️ УВБ-76: [ШОРОХ] ...объект 404 нарушил герметичность нижних уровней...",
                "⚠️ УВБ-76: [ПОМЕХИ] Внимание, протокол 'Чистое Небо' аннулирован.",
                "⚠️ УВБ-76: [ПИКСЕЛЬНЫЙ ШУМ] Ч-55-12-88. Процедура самоликвидации отложена.",
                "⚠️ УВБ-76: [ТОН 60Гц] МДЖБ 21 440 98 10 ... НАЧАЛО ТРАНСЛЯЦИИ",
                "⚠️ УВБ-76: [ГОЛОС] Не доверяйте ИИ Убежища. Он лжет о запасах воды.",
                "⚠️ УВБ-76: [СИГНАЛ] Координаты схрона: 54.89, 37.45. Код от сейфа 0451.",
                "⚠️ УВБ-76: [ПОМЕХИ] Сталкер по кличке Меченый, срочно вернись на Кордон.",
                "⚠️ УВБ-76: [МЕТАЛЛИЧЕСКИЙ ЗВУК] ...гермозатвор сектора Г заблокирован...",
                "⚠️ УВБ-76: [ДЫХАНИЕ] Они... они уже пробрались в вентиляционную шахту...",
                "⚠️ УВБ-76: [ТОН] 18 49 20 02. Времени больше нет.",
                "⚠️ УВБ-76: [СИРЕНА] Обнаружен критический радиационный выброс класса X-1.",
                "⚠️ УВБ-76: [ХРИП СВЯЗИ] База, это Ворон, мы нашли их гнездо, запрашиваем поддержку...",
                "⚠️ УВБ-76: [МЕХАНИЧЕСКИЙ ЩЕЛЧОК] Инициализирован резервный протокол 'Новый Эдем'...",
                "⚠️ УВБ-76: [ИСКАЖЕНИЯ] ...Прайс... это он во всем виноват... он не тот, кем кажется..."
            ];
            msg = uvbMessages[Math.floor(Math.random() * uvbMessages.length)];
        } else {
            playSound('radio');
            let baseMsg = RADIO_MSGS[Math.floor(Math.random() * RADIO_MSGS.length)];
            let timeStr = new Date().toLocaleTimeString().slice(0, 5); // ЧЧ:ММ
            msg = `[${timeStr}] ${baseMsg}`;
        }

        player.radioMessages = player.radioMessages || [];
        player.radioMessages.push(msg);
        if (player.radioMessages.length > 3) {
            player.radioMessages.shift(); // Оставляем только 3 последних
        }
        saveState();
        updateRadioUI();
        startRadio();
    }, uvbActive ? (Math.floor(Math.random() * 30000) + 30000) : (Math.floor(Math.random() * 40000) + 20000)); // Интервал приема 30-60 сек
}

function stopRadio() { if (radioTimer) clearTimeout(radioTimer); }

let radioSecretClicks = 0;
function registerRadioSecretClick() {
    if (uvbActive || radioSecretClicks >= 5) {
        return; // Игнорируем любые нажатия после 5, чтобы не прерывать эффекты
    }
    radioSecretClicks++;
    playSound('scan');
    showBanner("НАСТРОЙКА ЧАСТОТЫ: " + radioSecretClicks + "/5", 'var(--trade-color)');
    if (radioSecretClicks === 5) {
        triggerRadioEasterEgg();
    }
}

let hackClicks = 0;
function registerHackClick() {
    if (player.role === "ХАКЕР ПУСТОШЕЙ" || hackClicks >= 5) {
        return; // Игнорируем любые нажатия после 5, чтобы не прерывать эффекты взлома и глитч
    }
    hackClicks++;
    playSound('scan');
    showBanner("АКТИВАЦИЯ ТЕРМИНАЛА: " + hackClicks + "/5", 'var(--quest-color)');
    if (hackClicks === 5) {
        player.role = "ХАКЕР ПУСТОШЕЙ";
        saveState();
        let roleEl = document.getElementById('prof-role');
        if (roleEl) {
            roleEl.innerText = "ХАКЕР ПУСТОШЕЙ";
            roleEl.style.color = "var(--term-green)";
        }
        playSound('karma');
        let scr = document.getElementById('screen');
        if (scr) {
            scr.style.filter = "invert(1) hue-rotate(90deg) contrast(2)";
            setTimeout(() => { scr.style.filter = ""; }, 800);
        }
        showBanner("СУПЕРПОЛЬЗОВАТЕЛЬ АКТИВИРОВАН!", 'var(--term-green)');
    }
}

let uvbActive = false;
function triggerRadioEasterEgg() {
    uvbActive = true;
    playSound('error');

    let radioText = document.getElementById('radio-text');
    const alertMsg = `<div style="margin-bottom:8px; border-bottom:1px dashed ${COLOR_BANDIT}; padding-bottom:4px; font-family: monospace; font-size: 0.95rem; color: ${COLOR_BANDIT}; line-height: 1.3; animation: pulse-led 0.5s infinite alternate;">⚠️ ОБНАРУЖЕНА АВАРИЙНАЯ ЧАСТОТА УВБ-76 ⚠️</div><div style="font-size:0.9rem; color:#aaa;">[ЖУЖЖАНИЕ СЕТИ] МДЖБ 76 49 21 82... ВЫЖИВШИЙ, ТЫ СЛЫШИШЬ НАС?</div>`;

    player.radioMessages = player.radioMessages || [];
    player.radioMessages.push(alertMsg);
    if (player.radioMessages.length > 3) player.radioMessages.shift();

    player.radioOn = true;
    saveState();
    updateRadioUI();

    // Сбрасываем старый таймер и запускаем радио-цикл немедленно
    if (radioTimer) clearTimeout(radioTimer);
    startRadio();

    playCreepyBuzz();
    showBanner("ПОДКЛЮЧЕНО К УВБ-76", 'var(--rad-color)');
}

function playCreepyBuzz() {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(60, audioCtx.currentTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(150, audioCtx.currentTime);

        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 1.8);
        gain.gain.linearRampToValueAtTime(0.0, audioCtx.currentTime + 2.0);

        osc.start();
        osc.stop(audioCtx.currentTime + 2.0);
    } catch(e) {}
}
