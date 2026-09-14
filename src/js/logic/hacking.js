// ============================================================
// СИСТЕМА ДЕШИФРОВАНИЯ (ВЗЛОМ)
// ============================================================

let currentHackCode = "";
let hackAttemptsLeft = 4;
let hackSecretWord = "";
let hackWordsList = [];

const HACK_WORDS_POOL = [
    ["REACTOR", "RESTORE", "REFUGEE", "ROBOTIC", "RADICAL", "RECLAIM", "REPLICA", "RECOVER"],
    ["MODULE", "MUTANT", "MATRIX", "MARKET", "MAGNET", "MORTAL", "METHOD", "MANUAL"],
    ["SHELTER", "STALKER", "STORMER", "SCANNER", "SOLDIER", "SYSTEMS", "SCHEMES", "SURGEON"],
    ["BUNKERED", "BATTERY", "BIOMASS", "BANDITS", "BARRIER", "BOOTING", "BIOSENS", "BULLSEYE"]
];

function startHacking(code) {
    let now = Date.now();
    // Защита от повторного взлома (раз в 2 часа = 7200 сек)
    if (player.scannedCodes[code]) {
        let diffSec = (now - player.scannedCodes[code]) / 1000;
        if (diffSec < 7200) {
            playSound('error');
            let remaining = Math.ceil(7200 - diffSec);
            let hours = Math.floor(remaining / 3600);
            let minutes = Math.floor((remaining % 3600) / 60);
            let seconds = remaining % 60;
            let timeStr = hours > 0 ? `${hours} ч. ${minutes} мин.` : `${minutes} мин. ${seconds} сек.`;
            document.getElementById('scan-result').innerHTML = `<span style='color:yellow'>Устройство временно заблокировано защитой. Ждите ${timeStr}</span>`;
            return;
        }
    }

    currentHackCode = code;
    hackAttemptsLeft = 4;

    // Выбираем случайный набор слов
    let wordSet = HACK_WORDS_POOL[Math.floor(Math.random() * HACK_WORDS_POOL.length)];
    hackWordsList = [...wordSet].sort(() => 0.5 - Math.random());
    hackSecretWord = hackWordsList[Math.floor(Math.random() * hackWordsList.length)];

    // Рендерим UI дешифратора
    document.getElementById('hack-system-name').innerText = code.toUpperCase();
    updateHackAttemptsUI();

    // Очищаем консоль и пишем лог
    const consoleEl = document.getElementById('hack-console');
    consoleEl.innerHTML = `<div>[СИСТЕМА]: Обнаружено шифрование памяти.</div>
                           <div>[СИСТЕМА]: Инициализация дешифратора...</div>
                           <div>[СИСТЕМА]: Выберите правильный ключ доступа:</div>`;

    // Рендерим кнопки слов
    const gridEl = document.getElementById('hack-words-grid');
    gridEl.innerHTML = "";
    hackWordsList.forEach(w => {
        gridEl.innerHTML += `<button onclick="submitHackWord('${w}')" style="font-size:0.95rem; font-family:monospace; padding:6px 2px; text-align:center;">${w}</button>`;
    });

    switchView('hacking');
    playSound('radio');
}

function updateHackAttemptsUI() {
    const attemptsEl = document.getElementById('hack-attempts');
    let dots = "";
    for (let i = 0; i < 4; i++) {
        if (i < hackAttemptsLeft) {
            dots += "⬤ ";
        } else {
            dots += "◯ ";
        }
    }
    attemptsEl.innerText = dots.trim();
    attemptsEl.style.color = hackAttemptsLeft <= 1 ? "var(--bandit-color)" : "var(--trade-color)";
}

function submitHackWord(word) {
    if (hackAttemptsLeft <= 0) return;
    playSound('scan');
    const consoleEl = document.getElementById('hack-console');

    if (word === hackSecretWord) {
        // ПОБЕДА!
        playSound('sell');

        // Начисление случайной награды
        let minC = currentHackCode.startsWith("safe_") ? 300 : 100;
        let maxC = currentHackCode.startsWith("safe_") ? 600 : 300;
        let creditsReward = Math.floor(Math.random() * (maxC - minC + 1)) + minC;

        player.score += creditsReward;

        // Выдаем случайную полезную деталь
        let junkKeys = Object.keys(ITEMS_DB).filter(k => ITEMS_DB[k].cat === 'junk' || ITEMS_DB[k].cat === 'gear');
        let itemRewardCode = junkKeys[Math.floor(Math.random() * junkKeys.length)];
        let itemName = ITEMS_DB[itemRewardCode].name;

        let invSize = player.inventory.reduce((sum, id) => sum + ITEMS_DB[id].size, 0);
        let gotItem = false;
        if (invSize + ITEMS_DB[itemRewardCode].size <= player.maxSize) {
            player.inventory.push(itemRewardCode);
            gotItem = true;
            player.stats.itemsFound = (player.stats.itemsFound || 0) + 1;
        }

        // Блокируем код от повторного взлома
        player.scannedCodes[currentHackCode] = Date.now();
        saveState();

        consoleEl.innerHTML += `<div style="color:var(--term-green); margin-top:5px;">> Доступ разрешен! Ключ совпал.</div>
                                <div style="color:var(--trade-color)">> Получено: ${creditsReward} 💎</div>
                                ${gotItem ? `<div style="color:var(--quest-color)">> Извлечена деталь: ${itemName}</div>` : `<div style="color:var(--bandit-color)">> Извлечена деталь: ${itemName} (нет места в рюкзаке!)</div>`}`;

        // Отключаем кнопки
        document.getElementById('hack-words-grid').innerHTML = `<button onclick="switchView('scan')" class="btn-hero" style="grid-column: span 2; padding:12px; font-size:1.1rem;">ОТКЛЮЧИТЬСЯ (ГОТОВО)</button>`;
    } else {
        // НЕВЕРНО - считаем совпадение символов на тех же позициях
        hackAttemptsLeft--;
        updateHackAttemptsUI();

        let similarity = 0;
        let minLen = Math.min(word.length, hackSecretWord.length);
        for (let i = 0; i < minLen; i++) {
            if (word[i] === hackSecretWord[i]) {
                similarity++;
            }
        }

        consoleEl.innerHTML += `<div style="color:var(--bandit-color); margin-top:3px;">> ${word} - ОТКАЗ. Сходство: ${similarity}/${minLen}</div>`;
        consoleEl.scrollTop = consoleEl.scrollHeight;

        if (hackAttemptsLeft <= 0) {
            // ПРОИГРЫШ / БЛОКИРОВКА
            playSound('error');
            player.scannedCodes[currentHackCode] = Date.now(); // Блокируем на 2 часа
            saveState();

            consoleEl.innerHTML += `<div style="color:var(--bandit-color); font-weight:bold; margin-top:5px;">> СИСТЕМА ЗАБЛОКИРОВАНА. ИДЕТ СБРОС ДАННЫХ...</div>`;
            document.getElementById('hack-words-grid').innerHTML = `<button onclick="switchView('scan')" class="btn-danger" style="grid-column: span 2; padding:12px; font-size:1.1rem;">ОТКЛЮЧИТЬСЯ (ЗАБЛОКИРОВАНО)</button>`;
        }
    }
}

function abortHacking() {
    if (confirm("Вы уверены, что хотите прервать дешифрование? Прогресс будет утерян.")) {
        switchView('scan');
    }
}
