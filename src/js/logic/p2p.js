// ============================================================
// СИСТЕМА P2P ТОРГОВЛИ (МЕЖДУ ИГРОКАМИ)
// ============================================================

function initiateP2PTrade(idx) {
    if (player.hp <= 0) return alert("Вы мертвы!");
    let itemId = player.inventory[idx];
    let item = ITEMS_DB[itemId];
    if (!item) return;

    let priceInput = prompt(`Вы собираетесь продать: ${item.name}.
Введите стоимость в кредитах 💎:`, item.val);
    if (priceInput === null) return;
    let price = parseInt(priceInput);
    if (isNaN(price) || price < 0) {
        alert("Некорректная цена!");
        return;
    }

    let txId = "tx_" + Date.now() + "_" + Math.floor(Math.random() * 1000);

    // Показываем QR код продажи
    document.getElementById('trade-modal').style.display = 'flex';
    document.getElementById('trade-qr-container').style.display = 'block';

    let contentEl = document.getElementById('trade-modal-content');
    contentEl.innerHTML = `
        <div style="font-size:1.15rem; color:#fff; margin-bottom:10px;">ВЫ ПРОДАЕТЕ: <b style="color:var(--trade-color)">${item.name}</b></div>
        <div style="font-size:1.15rem; color:#fff; margin-bottom:10px;">ЦЕНА: <b style="color:var(--quest-color)">${price} 💎</b></div>
        <p style="font-size:0.95rem; color:var(--text-dim); line-height:1.3; margin-bottom:10px;">
            1. Покажите этот QR-код покупателю для оплаты.<br>
            2. НЕ ЗАКРЫВАЙТЕ это окно.<br>
            3. Когда покупатель оплатит, он покажет вам подтверждающий QR-код. Нажмите кнопку ниже и отсканируйте его!
        </p>
        <button onclick="startTradeConfirmScan('${txId}', '${itemId}', ${price})" class="btn-hero" style="width:100%; margin-top:10px;">СКАНИРОВАТЬ ОТВЕТНЫЙ КОД ОПЛАТЫ</button>
    `;

    generateQR('trade-qr-container', `p2ptrade:sell:${player.callsign}:${itemId}:${price}:${txId}`);
    playSound('radio');
}

let tradeScanner = null;
function startTradeConfirmScan(txId, itemId, price) {
    // Открываем сканер прямо в модальном окне
    let contentEl = document.getElementById('trade-modal-content');
    contentEl.innerHTML = `
        <div style="font-size:1.15rem; color:#fff; margin-bottom:10px;">СКАНИРОВАНИЕ ПОДТВЕРЖДЕНИЯ</div>
        <p style="font-size:0.95rem; color:var(--text-dim); margin-bottom:10px;">Отсканируйте подтверждающий QR-код с экрана покупателя...</p>
        <div id="trade-inner-scanner" style="width:100%; border:2px solid var(--term-green); margin-bottom:10px;"></div>
    `;
    document.getElementById('trade-qr-container').style.display = 'none';

    if (typeof Html5Qrcode === 'undefined') {
        alert("⚠️ Офлайн-режим: сканер обмена недоступен.");
        closeTradeModal();
        return;
    }
    tradeScanner = new Html5Qrcode("trade-inner-scanner");
    tradeScanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 200, height: 200 } }, (t) => {
        tradeScanner.stop();
        closeTradeModal();
        handleScan(t);
    }, (e) => { }).catch(e => {
        alert("Ошибка камеры!");
        closeTradeModal();
    });
}

function closeTradeModal() {
    if (tradeScanner) {
        try {
            tradeScanner.stop().catch(e => { });
        } catch (e) { }
        tradeScanner = null;
    }
    document.getElementById('trade-modal').style.display = 'none';
    document.getElementById('trade-qr-container').style.display = 'none';
    renderInventory();
}

function handleP2PTradeScan(code) {
    let parts = code.split(":");
    let action = parts[1]; // sell или confirm

    if (action === "sell") {
        let sellerCallsign = parts[2];
        let itemId = parts[3];
        let price = parseInt(parts[4]);
        let txId = parts[5];

        let item = ITEMS_DB[itemId];
        if (!item) return alert("Неизвестный предмет!");

        if (player.score < price) {
            playSound('error');
            return alert(`Недостаточно кредитов! Требуется: ${price} 💎, у вас: ${player.score} 💎`);
        }

        let currentSize = player.inventory.reduce((sum, id) => sum + ITEMS_DB[id].size, 0);
        if (currentSize + item.size > player.maxSize) {
            playSound('error');
            return alert("Недостаточно места в рюкзаке для покупки этого предмета!");
        }

        if (confirm(`Купить "${item.name}" у игрока ${sellerCallsign} за ${price} 💎?`)) {
            // Производим списание и зачисление
            player.score -= price;
            player.inventory.push(itemId);
            player.stats.itemsFound = (player.stats.itemsFound || 0) + 1;
            playSound('sell');
            saveState();

            // Показываем покупателю код подтверждения
            document.getElementById('trade-modal').style.display = 'flex';
            document.getElementById('trade-qr-container').style.display = 'block';

            let contentEl = document.getElementById('trade-modal-content');
            contentEl.innerHTML = `
                <div style="font-size:1.2rem; color:var(--term-green); font-weight:bold; margin-bottom:10px;">ПОКУПКА СОВЕРШЕНА!</div>
                <div style="font-size:1.1rem; color:#fff; margin-bottom:10px;">Вы приобрели: <b>${item.name}</b></div>
                <p style="font-size:0.95rem; color:var(--text-dim); line-height:1.3; margin-bottom:10px;">
                    Покажите этот QR-код продавцу. Сканируя его, он подтвердит передачу, удалит вещь из рюкзака и получит ваши ${price} 💎.
                </p>
            `;

            generateQR('trade-qr-container', `p2ptrade:confirm:${txId}:${price}:${itemId}`);
        }
    }
    else if (action === "confirm") {
        let txId = parts[2];
        let price = parseInt(parts[3]);
        let itemId = parts[4];

        player.processedTradeTxs = player.processedTradeTxs || {};
        if (player.processedTradeTxs[txId]) {
            playSound('error');
            return alert("Эта сделка уже подтверждена и обработана!");
        }

        let itemIdx = player.inventory.indexOf(itemId);
        if (itemIdx === -1) {
            playSound('error');
            return alert(`Ошибка: Предмет "${ITEMS_DB[itemId] ? ITEMS_DB[itemId].name : itemId}" отсутствует в вашем рюкзаке!`);
        }

        // Продавец удаляет предмет и забирает деньги
        player.inventory.splice(itemIdx, 1);
        player.score += price;
        player.processedTradeTxs[txId] = Date.now();
        playSound('sell');
        saveState();

        alert(`🤝 Сделка успешно подтверждена!
Вы передали предмет и получили: ${price} 💎`);
    }
}
