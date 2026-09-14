# Wasteland PDA [Alfa 0.2]

Постапокалиптическая PWA-игра «ГРИМ-СЕТЬ» — выживание в Зоне с QR-кодами,
крафтом, квестами, торговлей, картой и CRT-терминальным интерфейсом.

## Принципы проекта

- **Чистый HTML / CSS / JS.** Никакого Node.js, npm, bundler'ов и `package.json`.
- **Модульные исходники** в `src/`, которые **схлопываются конкатенацией** в единый
  `index.html`.
- **Сборка выполняется в браузере** через [`build.html`](build.html) — он читает
  файлы из `src/` через `fetch`, склеивает их и отдаёт готовый `index.html` на скачивание.
- **Функционал не меняется** — это рефакторинг структуры, а не переписывание логики.

## Структура проекта

```
PDA_GAME/
├── index.html              # Собранный (готовый к запуску) файл — результат сборки
├── build.html              # Браузерный сборщик (открыть в браузере → скачать index.html)
├── manifest.json           # PWA-манифест
├── sw.js                   # Service Worker (офлайн-кэш)
├── README.md               # Этот файл
│
├── src/
│   ├── index.template.html # Шаблон с плейсхолдерами {{CSS}}, {{VIEWS}}, {{JS}}
│   │
│   ├── css/                # Стили, разбитые по назначению
│   │   ├── 01-base.css         # Переменные, шрифты, сброс, body
│   │   ├── 02-layout.css       # CRT-оверлеи, #screen-content, #hud, навигация
│   │   ├── 03-components.css   # Кнопки, карточки, инпуты, баннеры
│   │   ├── 04-views.css        # Стили конкретных вьюх
│   │   └── 05-animations.css   # keyframes, анимации
│   │
│   ├── html/
│   │   └── views/          # Статичная разметка вьюх (без логики)
│   │       ├── base.html
│   │       ├── dead.html
│   │       ├── scan.html
│   │       ├── inventory.html
│   │       ├── quests.html
│   │       ├── map.html
│   │       ├── profile.html
│   │       ├── shelter.html
│   │       ├── hacking.html
│   │       ├── trade.html
│   │       └── nav.html
│   │
│   ├── js/
│   │   ├── vendor/         # Вендорные библиотеки (как есть)
│   │   │   ├── html5-qrcode.js
│   │   │   └── qrcode.js
│   │   │
│   │   ├── config/         # Константы и статические данные
│   │   │   ├── constants.js    # Цвета, лимиты, префиксы QR, ключи localStorage
│   │   │   ├── items.js        # ITEMS_DB, генератор предметов
│   │   │   ├── npc.js          # NPC_DB
│   │   │   └── upgrades.js     # SHELTER_UPGRADES, рецепты крафта
│   │   │
│   │   ├── state/
│   │   │   └── player.js       # Объект player, saveState/loadState
│   │   │
│   │   ├── core/           # Базовые подсистемы
│   │   │   ├── audio.js        # playSound, гейгер, сердцебиение, boot
│   │   │   ├── utils.js        # getKarmaStatus, getMaxHp, formatSurvivalTime, showBanner
│   │   │   └── qr.js           # generateQR, сканеры, handleScan, ручной ввод
│   │   │
│   │   ├── logic/          # Игровая логика (без DOM-разметки)
│   │   │   ├── inventory.js
│   │   │   ├── crafting.js
│   │   │   ├── quests.js
│   │   │   ├── trade.js
│   │   │   ├── shelter.js
│   │   │   ├── hacking.js
│   │   │   ├── map.js
│   │   │   ├── events.js
│   │   │   ├── blowout.js
│   │   │   ├── slots.js
│   │   │   ├── p2p.js
│   │   │   ├── combat.js
│   │   │   └── admin.js
│   │   │
│   │   ├── views/          # Рендеринг вьюх (DOM)
│   │   │   ├── base.js
│   │   │   ├── dead.js
│   │   │   ├── scan.js
│   │   │   ├── inventory.js
│   │   │   ├── quests.js
│   │   │   ├── map.js
│   │   │   ├── profile.js
│   │   │   ├── shelter.js
│   │   │   ├── hacking.js
│   │   │   ├── trade.js
│   │   │   └── navigation.js   # switchView, updateHUD
│   │   │
│   │   └── main.js         # Точка входа: init(), привязка событий, циклы
│   │
│   └── assets/
│       └── zone_map.jpg    # Карта Зоны
```

## Как собрать

1. Откройте [`build.html`](build.html) в браузере (двойной клик или через локальный сервер).
2. Нажмите **«СОБРАТЬ»** — сборщик прочитает все файлы из `src/` в правильном порядке.
3. Нажмите **«СКАЧАТЬ index.html»** и положите полученный файл в корень проекта,
   заменив старый.

> Для работы `fetch` при открытии `build.html` напрямую с диска (`file://`) браузер
> может блокировать чтение. В этом случае запустите локальный сервер, например:
> `python3 -m http.server 8000` и откройте `http://localhost:8000/build.html`.

## Порядок конкатенации

Сборщик склеивает файлы строго в таком порядке:

1. **CSS** — все файлы из `src/css/` по алфавиту (префиксы `01-`…`05-` задают порядок).
2. **HTML-вьюхи** — все файлы из `src/html/views/` в порядке из списка сборщика.
3. **JS** — вендоры → config → state → core → logic → views → main.

Порядок JS критичен: код использует глобальные функции и объекты (без ES-модулей),
поэтому зависимости должны быть объявлены раньше использования.

## Запуск игры

Откройте собранный `index.html` в браузере. Для полноценной работы PWA и камеры
(QR-сканер) рекомендуется HTTPS или `localhost`.

## Лицензия

Внутренний игровой проект.
