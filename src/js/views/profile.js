// ============================================================
// VIEWS: ПРОФИЛЬ
// Личное дело, репутация, арсенал, тактический фото-модуль
// ============================================================

function renderProfile() {
    const eqContent = document.getElementById('profile-equipment-content');
    if (eqContent) {
        if (player.equipment && ITEMS_DB[player.equipment]) {
            let eq = ITEMS_DB[player.equipment];
            eqContent.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center;">
                <div><b style="color:var(--trade-color)">🛡 ${eq.name}</b><br><small style="color:var(--text-dim)">${eq.desc || ''}</small></div>
                <button onclick="unequipSpecialItem()" style="padding:2px 6px; font-size:0.8rem; border-color:var(--bandit-color); color:var(--bandit-color); background:rgba(255,51,51,0.1);">СНЯТЬ</button>
            </div>`;
        } else {
            eqContent.innerHTML = `<span style="color:var(--text-dim);">Экипировка не выбрана. Купите спецпредмет на Базе.</span>`;
        }
    }

    // Рендерим личный QR-код игрока

    if (!player.weapons || typeof player.weapons !== 'object') {
        player.weapons = {};
    }
    let defaultWeapons = {
        "Противогаз ГП-5": { active: false, durability: 100, cost: 250 },
        "Нож": { active: false, durability: 100, cost: 20 },
        "Пистолет": { active: false, durability: 100, cost: 50 },
        "Дробовик": { active: false, durability: 100, cost: 80 },
        "Пистолет-пулемет": { active: false, durability: 100, cost: 100 },
        "Автомат": { active: false, durability: 100, cost: 150 },
        "Пулемет": { active: false, durability: 100, cost: 250 },
        "Винтовка": { active: false, durability: 100, cost: 200 }
    };
    for (let wName in defaultWeapons) {
        if (!player.weapons[wName]) {
            player.weapons[wName] = defaultWeapons[wName];
        }
    }
    if (!player.npcRep || typeof player.npcRep !== 'object') {
        player.npcRep = {};
    }

    let callsignEl = document.getElementById('prof-callsign');
    if (callsignEl) callsignEl.innerText = player.callsign || 'СТАЛКЕР';

    let roleEl = document.getElementById('prof-role');
    if (roleEl) {
        roleEl.innerText = player.role || 'Безработный';
        roleEl.style.color = player.role === 'ХАКЕР ПУСТОШЕЙ' ? 'var(--term-green)' : (player.role === 'Военный' ? 'var(--quest-color)' : (player.role === 'Рабочий' ? 'var(--trade-color)' : '#aaa'));
    }

    let karmaEl = document.getElementById('prof-karma');
    if (karmaEl) {
        let isZomb = player.zombieTime && ((Date.now() - player.zombieTime) < ZOMBIE_TIME_MS);
        let isInf = player.infectionTime && ((Date.now() - player.infectionTime) < INFECTION_TIME_MS);
        if (isZomb) {
            karmaEl.innerText = '🧟 ЗОМБИ';
            karmaEl.className = 'danger';
        } else if (isInf) {
            karmaEl.innerText = '⚠️ ИНФИЦИРОВАН';
            karmaEl.className = 'rad-warning';
        } else {
            let k = (typeof getKarmaStatus === 'function') ? getKarmaStatus() : { name: 'Выживший', class: 'survivor' };
            karmaEl.innerText = k.name;
            karmaEl.className = k.class;
        }
    }

    let scoreEl = document.getElementById('prof-karma-score');
    if (scoreEl) scoreEl.innerText = (player.karma_score > 0 ? "+" : "") + (player.karma_score || 0);

    let profScore = document.getElementById('prof-score');
    if (profScore) profScore.innerText = player.score || 0;

    let profTokens = document.getElementById('prof-tokens');
    if (profTokens) profTokens.innerText = player.tokens_collected || 0;

    // 1. Рендерим репутацию и привилегии NPC
    const repContent = document.getElementById('profile-reputation-content');
    if (repContent) {
        let repHtml = "";
        let npcList = [
            { id: 'npc_med', name: "Доктор Кроу (Медик)", icon: "🩺", desc: "Медицинская поддержка и здоровье" },
            { id: 'npc_eng', name: "Инженер Михалыч", icon: "⚙️", desc: "Увеличение рюкзака и ремонт снаряжения" },
            { id: 'npc_trad', name: "Торговец Сидорович", icon: "🔫", desc: "Защита оружия от износа в Пустоши" },
            { id: 'npc_bar', name: "Бармен Джо", icon: "🍺", desc: "Увеличение максимальной сытости" }
        ];

        npcList.forEach(npc => {
            let pts = player.npcRep[npc.id] || 0;
            let lvl = Math.floor(pts / 20);
            repHtml += `
                <div style="margin-bottom: 8px; border-bottom: 1px dashed #333; padding-bottom: 6px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <b style="color: var(--term-green); font-size: 1.05rem;">${npc.icon} ${npc.name}</b>
                        <span style="color: var(--quest-color); font-weight: bold;">Ур. ${lvl} <small style="color:var(--text-dim);">(${pts} очк.)</small></span>
                    </div>
                    <div style="font-size: 0.9rem; color:var(--text-dim); margin-top: 2px;">${npc.desc}</div>
                </div>
            `;
        });
        repContent.innerHTML = repHtml;
    }

    // 2. Рендерим арсенал и износ оружия
    const wList = document.getElementById('profile-weapons-list');
    if (wList && player.weapons) {
        wList.innerHTML = "";
        for (let wName in player.weapons) {
            let w = player.weapons[wName];
            let durability = (w && typeof w.durability === 'number') ? w.durability : 100;
            let active = w && w.active;
            let statusColor = durability > 50 ? 'var(--term-green)' : (durability > 0 ? 'var(--rad-color)' : 'var(--bandit-color)');
            let statusText = durability > 50 ? 'Исправно' : (durability > 0 ? 'Изношено' : 'ТРЕБУЕТ РЕМОНТА');

            let actionBtns = "";
            if (active && durability < 100) {
                actionBtns = `
                    <div style="display: flex; gap: 5px; margin-top: 5px;">
                        <button onclick="repairWeaponWithJunk('${wName}')" style="flex: 1; font-size: 0.9rem; padding: 4px; border-color: var(--trade-color); color: var(--trade-color);">ПОЧИНИТЬ ХЛАМОМ</button>
                        <button onclick="repairWeaponAtBase('${wName}')" style="flex: 1; font-size: 0.9rem; padding: 4px; border-color: var(--quest-color); color: var(--quest-color);">РЕМОНТ</button>
                    </div>
                `;
            }

            wList.innerHTML += `
                <div style="border: 1px dashed ${active ? 'var(--term-green)' : '#444'}; padding: 6px; margin-bottom: 6px; background: rgba(0,0,0,0.3);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <label style="cursor: pointer; display: flex; align-items: center; gap: 6px;">
                            <input type="checkbox" ${active ? 'checked' : ''} onchange="toggleWeapon('${wName}')" style="width: 18px; height: 18px; accent-color: var(--term-green);">
                            <b style="color: ${active ? '#fff' : '#888'}; font-size: 1.1rem;">${wName}</b>
                        </label>
                        <span style="color: ${statusColor}; font-size: 0.95rem; font-weight: bold;">${durability}%</span>
                    </div>
                    ${active ? `<div style="font-size: 0.85rem; color: ${statusColor}; margin-top: 2px;">Статус: ${statusText}</div>` : ''}
                    ${actionBtns}
                </div>
            `;
        }
    }
}

function sellEquipment() {
    if (!player.equipment || !ITEMS_DB[player.equipment]) return;
    let item = ITEMS_DB[player.equipment];
    let sellPrice = Math.floor(item.val / 2);
    if (confirm(`Продать ${item.name} за ${sellPrice} 💎?`)) {
        playSound('sell');
        player.score += sellPrice;
        player.equipment = null;
        saveState();
        renderProfile();
        alert(`Успешно продано за ${sellPrice} 💎!`);
    }
}

// === ГЛОБАЛЬНЫЙ МЕНЕДЖЕР КАМЕРЫ ПДА ===
let pdaMediaStream = null;

// === ТАКТИЧЕСКИЙ ФОТО-МОДУЛЬ ПДА В ПРОФИЛЕ ===

async function saveOrSharePdaPhoto() {
    let previewImg = document.getElementById('photo-preview-img');
    let downloadLink = document.getElementById('photo-download-link');
    if (!previewImg || !previewImg.src) return;

    // Попытка 1: Использование Web Share API (вызывает системный диалог телефона "Сохранить изображение" / "Поделиться")
    if (navigator.share && navigator.canShare) {
        try {
            let response = await fetch(previewImg.src);
            let blob = await response.blob();
            let file = new File([blob], `pda_photo_${Date.now()}.png`, { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Тактическое фото ПДА',
                    text: 'Снимок статуса выживания в Зоне [WASTELAND PDA]'
                });
                return;
            }
        } catch(e) {
            console.warn("Share failed, falling back to direct download link", e);
        }
    }

    // Попытка 2: Прямое скачивание через ссылку
    if (downloadLink) {
        downloadLink.click();
    } else {
        window.open(previewImg.src, '_blank');
    }
}

function handlePdaPhotoCaptured(event) {
    let file = event.target.files && event.target.files[0];
    if (!file) return;

    let reader = new FileReader();
    reader.onload = function(e) {
        let img = new Image();
        img.onload = function() {
            let canvas = document.getElementById('pda-photo-canvas');
            let ctx = canvas.getContext('2d');

            let width = img.width || 1280;
            let height = img.height || 720;

            // Ограничиваем максимальный размер для идеального быстродействия
            let maxDim = 1600;
            if (width > maxDim || height > maxDim) {
                if (width > height) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                } else {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                }
            }

            canvas.width = width;
            canvas.height = height;

            // 1. Отрисовка исходного снимка
            ctx.drawImage(img, 0, 0, width, height);

            // 2. Атмосферная пиксельная обработка фото под 3 уникальных фильтра Выживания
            let selectedFilter = document.getElementById('pda-photo-filter-select') ? document.getElementById('pda-photo-filter-select').value : 'green';

            let themeColor = COLOR_TERM_GREEN;
            let bgDark = 'rgba(2, 11, 2, 0.88)';

            let imgData = ctx.getImageData(0, 0, width, height);
            let data = imgData.data;

            if (selectedFilter === 'amber') {
                // ☣️ ВЫБРОС ЗОНЫ (ЯНТАРНЫЙ ВЫБРОС / АНОМАЛЬНОЕ СВЕЧЕНИЕ)
                themeColor = '#ff9900';
                bgDark = 'rgba(25, 10, 0, 0.90)';

                for (let i = 0; i < data.length; i += 4) {
                    let r = data[i], g = data[i+1], b = data[i+2];
                    let lum = 0.299 * r + 0.587 * g + 0.114 * b;

                    // Повышенный контраст и теплые янтарно-оранжевые оттенки аномального заката/выброса
                    data[i]     = Math.min(255, lum * 1.25 + 35); // Ржавый красный/оранжевый
                    data[i + 1] = Math.min(255, lum * 0.75 + 10); // Янтарный зеленый
                    data[i + 2] = Math.max(0, lum * 0.2 - 10);    // Отсечение синего (полный янтарный спектр)
                }
                ctx.putImageData(imgData, 0, 0);

                // Мягкий янтарный градиент виньетирования
                let vignette = ctx.createRadialGradient(width/2, height/2, width*0.3, width/2, height/2, width*0.75);
                vignette.addColorStop(0, 'rgba(255, 140, 0, 0.05)');
                vignette.addColorStop(1, 'rgba(40, 10, 0, 0.65)');
                ctx.fillStyle = vignette;
                ctx.fillRect(0, 0, width, height);

            } else if (selectedFilter === 'mono') {
                // 💀 МЕРТВАЯ ПУСТОШЬ (ЧЁРНО-БЕЛЫЙ ХОЛОДНЫЙ НУАР ВЫЖИВАНИЯ)
                themeColor = COLOR_TRADE; // Холодный неоново-голубой стальной интерфейс
                bgDark = 'rgba(10, 15, 20, 0.90)';

                for (let i = 0; i < data.length; i += 4) {
                    let r = data[i], g = data[i+1], b = data[i+2];
                    let lum = 0.299 * r + 0.587 * g + 0.114 * b;

                    // Жесткий кинематографичный контраст постапокалипсиса
                    let contrastLum = lum < 120 ? lum * 0.7 : Math.min(255, lum * 1.2);

                    data[i]     = Math.min(255, contrastLum * 0.9);
                    data[i + 1] = Math.min(255, contrastLum * 0.95);
                    data[i + 2] = Math.min(255, contrastLum * 1.05); // Легкий стальной холодный оттенок
                }
                ctx.putImageData(imgData, 0, 0);

                // Темная виньетка выживальщика
                let vignette = ctx.createRadialGradient(width/2, height/2, width*0.25, width/2, height/2, width*0.7);
                vignette.addColorStop(0, 'rgba(0, 0, 0, 0.0)');
                vignette.addColorStop(1, 'rgba(5, 5, 10, 0.75)');
                ctx.fillStyle = vignette;
                ctx.fillRect(0, 0, width, height);

            } else {
                // ☢️ РАДИОАКТИВНЫЙ ФОСФОР (КЛАССИЧЕСКИЙ ИЗУМРУДНЫЙ ПДА)
                themeColor = COLOR_TERM_GREEN;
                bgDark = 'rgba(2, 12, 2, 0.90)';

                for (let i = 0; i < data.length; i += 4) {
                    let r = data[i], g = data[i+1], b = data[i+2];
                    let lum = 0.299 * r + 0.587 * g + 0.114 * b;

                    data[i]     = Math.max(0, lum * 0.2 - 10);
                    data[i + 1] = Math.min(255, lum * 1.2 + 20); // Изумрудный фосфор
                    data[i + 2] = Math.max(0, lum * 0.15);
                }
                ctx.putImageData(imgData, 0, 0);

                // Фосфорная виньетка
                let vignette = ctx.createRadialGradient(width/2, height/2, width*0.3, width/2, height/2, width*0.75);
                vignette.addColorStop(0, 'rgba(0, 30, 0, 0.0)');
                vignette.addColorStop(1, 'rgba(0, 15, 0, 0.7)');
                ctx.fillStyle = vignette;
                ctx.fillRect(0, 0, width, height);
            }

            // 3. Сканирующие полосы (CRT)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            let lineSpacing = Math.max(3, Math.floor(height / 220));
            for (let y = 0; y < height; y += lineSpacing * 2) {
                ctx.fillRect(0, y, width, lineSpacing);
            }

            // 4. Текстовый штамп ПДА (Дата, Позывной, HP, Рад, Голод)
            let now = new Date();
            let dateStr = now.toLocaleDateString('ru-RU') + ' ' + now.toLocaleTimeString('ru-RU');
            let callsign = player.callsign || 'СТАЛКЕР';
            let maxHp = getEffectiveMaxHp();

            let headerH = Math.max(50, Math.floor(height * 0.07));
            let footerH = Math.max(60, Math.floor(height * 0.08));

            ctx.fillStyle = bgDark;
            ctx.fillRect(0, 0, width, headerH);
            ctx.fillRect(0, height - footerH, width, footerH);

            ctx.strokeStyle = themeColor;
            ctx.lineWidth = Math.max(2, Math.floor(width / 450));
            ctx.strokeRect(6, 6, width - 12, headerH - 12);
            ctx.strokeRect(6, height - footerH + 6, width - 12, footerH - 12);

            ctx.fillStyle = themeColor;
            ctx.shadowColor = themeColor;
            ctx.shadowBlur = 6;

            let fontSize = Math.max(16, Math.floor(width / 32));
            ctx.font = `bold ${fontSize}px monospace`;

            ctx.fillText(`[WASTELAND PDA v3.5]`, 20, Math.floor(headerH * 0.65));
            let dateText = `DATE: ${dateStr}`;
            ctx.fillText(dateText, width - ctx.measureText(dateText).width - 20, Math.floor(headerH * 0.65));

            ctx.fillText(`OPERATOR: ${callsign}`, 20, height - Math.floor(footerH * 0.35));
            let statsStr = `HP:${player.hp}/${maxHp} | RAD:${player.rads}% | HUNGER:${player.hunger}%`;
            ctx.fillText(statsStr, width - ctx.measureText(statsStr).width - 20, height - Math.floor(footerH * 0.35));

            ctx.strokeRect(12, 12, width - 24, height - 24);

            // 5. Генерируем превью и ссылку для скачивания
            let dataUrl = canvas.toDataURL('image/png');
            let previewImg = document.getElementById('photo-preview-img');
            let downloadLink = document.getElementById('photo-download-link');
            let previewBox = document.getElementById('photo-preview-box');

            if (previewImg) previewImg.src = dataUrl;
            if (downloadLink) {
                downloadLink.href = dataUrl;
                downloadLink.download = `pda_photo_${now.getTime()}.png`;
            }
            if (previewBox) {
                previewBox.style.display = 'block';
                previewBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            playSound('photo');
            if (!player.photoBonusReceived) {
                player.photoBonusReceived = true;
                player.score = (player.score || 0) + 100;
                saveState();
                renderProfile();
                showBanner("📸 НАГРАДА! +100 💎 ЗА ПЕРВОЕ ФОТО В ЛИЧНОМ ДЕЛЕ!", 'var(--term-green)');
            } else {
                showBanner("📸 ФОТО УСПЕШНО ОБРАБОТАНО И СОХРАНЕНО!", 'var(--term-green)');
            }

            // Авто-скачивание на мобильном устройстве
            try {
                let a = document.createElement('a');
                a.href = dataUrl;
                a.download = `pda_photo_${now.getTime()}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            } catch(err) {}
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}
