// ============================================================
// ИНТЕРАКТИВНАЯ КАРТА ЗОНЫ И РЕДАКТОР МЕТОК
// ============================================================

const DEFAULT_MAP_MARKERS = [];

let zoneMarkers = [];
let isMapEditorActive = false;
let selectedMarkerId = null;
let draggedMarkerId = null;

function applyMapBackground() {
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer) return;
    const savedBg = localStorage.getItem(STORAGE_KEY_MAP_BG);
    if (savedBg) {
        mapContainer.style.backgroundImage = `url(${savedBg})`;
        mapContainer.style.backgroundSize = 'cover';
        mapContainer.style.backgroundPosition = 'center';
        mapContainer.style.backgroundRepeat = 'no-repeat';
    } else {
        mapContainer.style.backgroundImage = 'none';
        mapContainer.style.backgroundColor = '#020b02';
    }
}

function uploadCustomMapBg(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            localStorage.setItem(STORAGE_KEY_MAP_BG, e.target.result);
            applyMapBackground();
            playSound('karma');
            showBanner("🗺️ Карта успешно загружена в исходном качестве!", 'var(--term-green)');
        } catch (err) {
            alert("⚠️ Ошибка: файл слишком велик для памяти браузера localStorage.");
        }
    };
    reader.readAsDataURL(file);
}

function resetCustomMapBg() {
    localStorage.removeItem(STORAGE_KEY_MAP_BG);
    applyMapBackground();
    playSound('use');
    alert("Фон карты сброшен к стандартному виду.");
}

function initMapSystem() {
    let saved = localStorage.getItem(STORAGE_KEY_MAP_MARKERS);
    if (saved) {
        try {
            zoneMarkers = JSON.parse(saved);
        } catch (e) {
            zoneMarkers = [...DEFAULT_MAP_MARKERS];
        }
    } else {
        zoneMarkers = [...DEFAULT_MAP_MARKERS];
    }
    applyMapBackground();

    // Настройка клика по карте: если редактор активен и выбрана метка, клик перемещает ее в это место!
    const mapContainer = document.getElementById('map-container');
    if (mapContainer && !mapContainer.hasPointerBound) {
        mapContainer.hasPointerBound = true;

        // Универсальная функция для перемещения выбранной метки по нажатию/тапу
        const handleMapPointerMove = (clientX, clientY, target) => {
            if (!isMapEditorActive || !selectedMarkerId) return false;
            if (target && target.closest('.map-marker-node')) return false;

            const rect = mapContainer.getBoundingClientRect();
            let xPx = clientX - rect.left;
            let yPx = clientY - rect.top;

            if (xPx < 0 || xPx > rect.width || yPx < 0 || yPx > rect.height) return false;

            let xPerc = Math.max(2, Math.min(98, (xPx / rect.width) * 100));
            let yPerc = Math.max(2, Math.min(98, (yPx / rect.height) * 100));

            let m = zoneMarkers.find(x => x.id === selectedMarkerId);
            if (m) {
                m.x = Math.round(xPerc * 10) / 10;
                m.y = Math.round(yPerc * 10) / 10;

                if (document.getElementById('edit-marker-x')) document.getElementById('edit-marker-x').value = m.x;
                if (document.getElementById('edit-marker-y')) document.getElementById('edit-marker-y').value = m.y;

                saveMapMarkers();
                renderZoneMap();
                playSound('scan');
                showBanner("🎯 Метка перемещена [" + m.x + "%, " + m.y + "%]", 'var(--term-green)');
                return true;
            }
            return false;
        };

        // Поддержка pointerdown (идеально для телефонов и ПК)
        mapContainer.addEventListener('pointerdown', (e) => {
            // Если редактор активен и выбрана метка — перемещаем ее по тапу на карту
            handleMapPointerMove(e.clientX, e.clientY, e.target);
        });
    }
}

function renderZoneMap() {
    let layer = document.getElementById('map-markers-layer');
    if (!layer) return;
    layer.innerHTML = '';

    zoneMarkers.forEach(m => {
        let el = document.createElement('div');
        el.className = 'map-marker-node';
        el.id = `map-node-${m.id}`;
        el.style.position = 'absolute';
        el.style.left = `${m.x}%`;
        el.style.top = `${m.y}%`;
        el.style.transform = 'translate(-50%, -50%)';
        el.style.cursor = 'pointer';
        el.style.fontSize = '1.4rem';
        el.style.padding = '4px';
        el.style.borderRadius = '50%';
        el.style.background = m.id === selectedMarkerId ? 'rgba(57,255,20,0.3)' : 'rgba(0,0,0,0.6)';
        el.style.border = `2px solid ${m.color || 'var(--term-green)'}`;
        el.style.boxShadow = m.id === selectedMarkerId ? '0 0 12px var(--term-green)' : '0 0 5px rgba(0,0,0,0.8)';
        el.style.transition = 'transform 0.15s ease, box-shadow 0.15s ease';
        el.innerHTML = m.icon || '📍';

        // При клике на маркер
        el.onclick = (e) => {
            e.stopPropagation();
            selectMapMarker(m.id);
        };

        layer.appendChild(el);
    });
}

function selectMapMarker(id) {
    selectedMarkerId = id;
    let m = zoneMarkers.find(x => x.id === id);
    let titleEl = document.getElementById('map-info-title');
    let descEl = document.getElementById('map-info-desc');

    if (m) {
        playSound('scan');
        if (titleEl) titleEl.innerHTML = `<span style="color:${m.color || 'var(--term-green)'}">${m.icon} ${m.name}</span> <span style="font-size:0.8rem; color:#888;">[X:${m.x}%, Y:${m.y}%]</span>`;
        if (descEl) descEl.innerText = m.desc || 'Описание отсутствует.';

        // Если редактор активен, заполняем поля формы
        if (isMapEditorActive) {
            document.getElementById('edit-marker-name').value = m.name;
            document.getElementById('edit-marker-icon').value = m.icon;
            if (document.getElementById('edit-marker-x')) document.getElementById('edit-marker-x').value = m.x;
            if (document.getElementById('edit-marker-y')) document.getElementById('edit-marker-y').value = m.y;
            document.getElementById('edit-marker-desc').value = m.desc;
        }
    }
    renderZoneMap();
}

function toggleMapEditor() {
    isMapEditorActive = !isMapEditorActive;
    let panel = document.getElementById('map-editor-panel');
    let btn = document.getElementById('btn-toggle-map-editor');

    if (panel) panel.style.display = isMapEditorActive ? 'block' : 'none';
    if (btn) {
        btn.innerText = isMapEditorActive ? '❌ ЗАКРЫТЬ РЕДАКТОР МЕТОК' : '⚙️ ВКЛЮЧИТЬ РЕДАКТОР МЕТОК (DRAG & DROP)';
        btn.style.borderColor = isMapEditorActive ? 'var(--bandit-color)' : 'var(--quest-color)';
        btn.style.color = isMapEditorActive ? 'var(--bandit-color)' : 'var(--quest-color)';
    }

    playSound('scan');
    renderZoneMap();
}

function onIconInputUpdate() {
    if (selectedMarkerId) {
        let m = zoneMarkers.find(x => x.id === selectedMarkerId);
        if (m) {
            let iconVal = document.getElementById('edit-marker-icon').value.trim() || '📍';
            m.icon = iconVal;
            let node = document.getElementById(`map-node-${m.id}`);
            if (node) node.innerHTML = iconVal;
            document.getElementById('map-info-title').innerText = `${iconVal} ${m.name}`;
        }
    }
}

function saveSelectedMarker() {
    if (!selectedMarkerId) {
        // Если маркер не выбран, автоматически создаем новый с текущими настройками из полей формы!
        addNewMapMarker();
        return;
    }
    let m = zoneMarkers.find(x => x.id === selectedMarkerId);
    if (m) {
        m.name = document.getElementById('edit-marker-name').value.trim() || 'Без названия';
        m.icon = document.getElementById('edit-marker-icon').value.trim() || '📍';
        if (document.getElementById('edit-marker-color')) {
            m.color = document.getElementById('edit-marker-color').value;
        }
        m.desc = document.getElementById('edit-marker-desc').value.trim();

        saveMapMarkers();
        playSound('sell');
        showBanner("✅ МЕТКА КАРТЫ СОХРАНЕНА!", 'var(--term-green)');
        selectMapMarker(m.id);
        renderZoneMap();
    } else {
        addNewMapMarker();
    }
}

function addNewMapMarker() {
    let nameInput = document.getElementById('edit-marker-name');
    let iconInput = document.getElementById('edit-marker-icon');
    let colorInput = document.getElementById('edit-marker-color');
    let descInput = document.getElementById('edit-marker-desc');

    let markerName = (nameInput && nameInput.value.trim()) ? nameInput.value.trim() : 'НОВАЯ ТОЧКА';
    let markerIcon = (iconInput && iconInput.value.trim()) ? iconInput.value.trim() : '📍';
    let markerColor = colorInput ? colorInput.value : 'var(--trade-color)';
    let markerDesc = descInput ? descInput.value.trim() : 'Описание новой локации.';

    let newId = 'm_' + Date.now();
    let newMarker = {
        id: newId,
        name: markerName,
        icon: markerIcon,
        x: 50,
        y: 50,
        desc: markerDesc,
        color: markerColor
    };
    zoneMarkers.push(newMarker);
    saveMapMarkers();

    // Автоматически включаем режим редактора (перетаскивания), если он выключен
    if (!isMapEditorActive) {
        isMapEditorActive = true;
        let panel = document.getElementById('map-editor-panel');
        let btn = document.getElementById('btn-toggle-map-editor');
        if (panel) panel.style.display = 'block';
        if (btn) {
            btn.innerText = '✅ РЕДАКТОР МЕТОК АКТИВЕН (ПЕРЕТАЩИТЕ МЕТКУ)';
            btn.style.borderColor = 'var(--term-green)';
            btn.style.color = 'var(--term-green)';
        }
    }

    renderZoneMap();
    selectMapMarker(newId);
    playSound('karma');
    showBanner("📍 МЕТКА ДОБАВЛЕНА В ЦЕНТР КАРТЫ!", markerColor);
}

function deleteSelectedMarker() {
    if (!selectedMarkerId) return alert("Сначала выберите маркер для удаления!");
    if (confirm("Удалить эту метку с карты?")) {
        zoneMarkers = zoneMarkers.filter(x => x.id !== selectedMarkerId);
        selectedMarkerId = null;
        saveMapMarkers();
        playSound('death');
        showBanner("🗑 МЕТКА УДАЛЕНА С КАРТЫ!", 'var(--bandit-color)');
        renderZoneMap();
    }
}

function resetMapMarkersToDefault() {
    if (confirm("Сбросить все метки на стандартную конфигурацию?")) {
        zoneMarkers = [...DEFAULT_MAP_MARKERS];
        saveMapMarkers();
        selectedMarkerId = null;
        playSound('use');
        renderZoneMap();
    }
}

function saveMapMarkers() {
    localStorage.setItem(STORAGE_KEY_MAP_MARKERS, JSON.stringify(zoneMarkers));
}

// Обработка перетаскивания (Drag & Drop)
function startDragMarker(e, id) {
    draggedMarkerId = id;
    selectMapMarker(id);

    const mapContainer = document.getElementById('map-container');
    const rect = mapContainer.getBoundingClientRect();

    function onMouseMove(me) {
        if (!draggedMarkerId) return;
        let m = zoneMarkers.find(x => x.id === draggedMarkerId);
        if (m) {
            let relX = Math.round(((me.clientX - rect.left) / rect.width) * 100);
            let relY = Math.round(((me.clientY - rect.top) / rect.height) * 100);
            m.x = Math.max(5, Math.min(95, relX));
            m.y = Math.max(5, Math.min(95, relY));

            if (document.getElementById('edit-marker-x')) document.getElementById('edit-marker-x').value = m.x;
            if (document.getElementById('edit-marker-y')) document.getElementById('edit-marker-y').value = m.y;
            renderZoneMap();
        }
    }

    function onMouseUp() {
        draggedMarkerId = null;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        saveMapMarkers();
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
}

function startDragMarkerTouch(e, id) {
    draggedMarkerId = id;
    selectMapMarker(id);

    const mapContainer = document.getElementById('map-container');
    const rect = mapContainer.getBoundingClientRect();

    function onTouchMove(te) {
        if (!draggedMarkerId || !te.touches[0]) return;
        let touch = te.touches[0];
        let m = zoneMarkers.find(x => x.id === draggedMarkerId);
        if (m) {
            let relX = Math.round(((touch.clientX - rect.left) / rect.width) * 100);
            let relY = Math.round(((touch.clientY - rect.top) / rect.height) * 100);
            m.x = Math.max(5, Math.min(95, relX));
            m.y = Math.max(5, Math.min(95, relY));

            if (document.getElementById('edit-marker-x')) document.getElementById('edit-marker-x').value = m.x;
            if (document.getElementById('edit-marker-y')) document.getElementById('edit-marker-y').value = m.y;
            renderZoneMap();
        }
    }

    function onTouchEnd() {
        draggedMarkerId = null;
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
        saveMapMarkers();
    }

    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
}

function handleMapBackgroundUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        let img = new Image();
        img.onload = function () {
            let canvas = document.createElement('canvas');
            let ctx = canvas.getContext('2d');

            let width = img.width;
            let height = img.height;
            let maxDim = 640;

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
            ctx.drawImage(img, 0, 0, width, height);

            let compressedDataUrl = canvas.toDataURL('image/jpeg', 0.55);

            try {
                localStorage.setItem(STORAGE_KEY_MAP_BG, compressedDataUrl);
                applyMapBackground();
                playSound('karma');
                alert("🗺️ Карта успешно сжата и сохранена!");
            } catch (err) {
                try {
                    localStorage.removeItem('wasteland_player_history');
                    localStorage.setItem(STORAGE_KEY_MAP_BG, compressedDataUrl);
                    applyMapBackground();
                    playSound('karma');
                    alert("🗺️ Карта успешно сохранена!");
                } catch (err2) {
                    alert("⚠️ Ошибка памяти браузера. Выберите файл меньшего объема.");
                }
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}
