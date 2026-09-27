# ГРИМ-ПДА — мобильное приложение (Android / iOS)

Приложение — обёртка [Capacitor](https://capacitorjs.com) над собранной игрой (`index.html` из корня проекта).
Код игры не дублируется: при сборке `scripts/prepare-www.mjs` копирует свежий `index.html` в `mobile/www`,
а Capacitor упаковывает его в приложения.

Чем приложение лучше сайта:

- игра лежит внутри приложения — работает без интернета с первого запуска, нет проблем со старым кэшем;
- прогресс хранится в данных приложения и не пропадает при чистке браузера;
- камера для QR работает без HTTPS; вибрация при взломе отмычкой (Android).

## Как выпустить новую версию

1. Соберите игру как обычно (`build.html` → `index.html`) и закоммитьте.
2. Отправьте в `main` или `develop` — на GitHub автоматически соберётся APK
   (**Actions → Android APK**, файл во вкладке *Artifacts* запуска).
3. Чтобы выложить APK для игроков по прямой ссылке, поставьте тег:
   ```bash
   git tag app-v0.3.1
   git push origin app-v0.3.1
   ```
   APK появится в **Releases** репозитория, iOS-сборка уйдёт в TestFlight.

## Android

### Один раз: ключ подписи

Все версии APK должны быть подписаны **одним и тем же ключом**, иначе новая версия не встанет поверх старой,
и игроку придётся удалить приложение вместе с прогрессом.

В **Settings → Secrets and variables → Actions** добавьте секреты:

| Секрет | Что это |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | файл ключа (`.keystore`), закодированный в base64 |
| `ANDROID_KEYSTORE_PASSWORD` | пароль хранилища |
| `ANDROID_KEY_ALIAS` | имя ключа |
| `ANDROID_KEY_PASSWORD` | пароль ключа |

Без секретов собирается отладочный APK — он годится для проверки, но не для раздачи игрокам.
Сам файл ключа храните отдельно в надёжном месте.

### Установка на телефон

1. Скачайте `.apk` на телефон (из Releases или пришлите файлом в мессенджер).
2. Откройте файл. Android попросит разрешить установку из этого источника — разрешите.
3. При первом сканировании приложение спросит доступ к камере — разрешите.

Обновление — так же: новый APK ставится поверх старого, прогресс сохраняется.

## iOS (TestFlight)

### Один раз: настройка в Apple Developer

1. **Идентификатор приложения.** [developer.apple.com](https://developer.apple.com/account/resources/identifiers/list) →
   Identifiers → «+» → App IDs → App → Bundle ID `ru.thegrimteam.pda` (Explicit).
2. **Карточка приложения.** [App Store Connect](https://appstoreconnect.apple.com) → Приложения → «+» → Новое приложение:
   платформа iOS, Bundle ID `ru.thegrimteam.pda`, SKU любой (например `grim-pda`).
   В названии и описании **не используйте** «Fallout», «Pip-Boy», «Nuka-Cola» — это чужие торговые марки,
   такое приложение отклонят.
3. **Ключ API.** App Store Connect → Пользователи и доступ → Интеграции → Ключи App Store Connect API → «+»,
   доступ **Admin** (нужен, чтобы сборка сама создала сертификат и профиль). Скачайте файл `AuthKey_XXXX.p8`
   (скачать можно только один раз), запишите **Key ID** и **Issuer ID**.
4. **Team ID** — [developer.apple.com/account](https://developer.apple.com/account) → Membership details.
5. Секреты в GitHub (**Settings → Secrets and variables → Actions**):

| Секрет | Значение |
|---|---|
| `APPLE_TEAM_ID` | Team ID (10 символов) |
| `APPLE_API_KEY_ID` | Key ID ключа API |
| `APPLE_API_ISSUER_ID` | Issuer ID |
| `APPLE_API_KEY_P8` | всё содержимое файла `AuthKey_XXXX.p8`, включая строки `-----BEGIN/END PRIVATE KEY-----` |

### Выпуск сборки

**Actions → iOS TestFlight → Run workflow** (или тег `app-v*`). Через 10–30 минут после окончания сборка
появится в App Store Connect → TestFlight.

- **Внутреннее тестирование** — до 100 участников вашей команды в App Store Connect, без проверки Apple.
- **Внешнее тестирование** — до 10 000 человек по публичной ссылке; первая сборка проходит короткую проверку Apple.

Игроки ставят приложение **TestFlight** из App Store и открывают ссылку-приглашение.
Сборки TestFlight действуют 90 дней — к каждой игре выпускайте свежую.

## Локальная сборка (для разработчиков)

Нужны Node.js 22+, для Android — Android Studio (JDK 21), для iOS — Mac с Xcode.

```bash
cd mobile
npm install
npm run sync            # копирует index.html и обновляет оба проекта
npm run open:android    # открыть в Android Studio
npm run open:ios        # открыть в Xcode
```

Иконка и заставка лежат в `mobile/assets`; после их замены:
`npx capacitor-assets generate --android --ios --iconBackgroundColor '#04120a' --splashBackgroundColor '#04120a'`.
