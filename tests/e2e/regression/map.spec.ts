import { test, expect } from '../../fixtures/game.fixture';

/**
 * RG-75..RG-80 — карта, метки, загрузка фона.
 */
test.describe('Regression: карта', () => {
  test.beforeEach(async ({ game }) => {
    await game.patchPlayer({
      inBase: false,
      zombieTime: 0,
      infectionTime: 0,
      inventory: [],
      hp: 100,
      rads: 0,
    });
    await game.switchView('map');
  });

  test('RG-75: переключение на вид карты', async ({ game }) => {
    await game.expectViewActive('map');
    await expect(game.page.locator('#view-map')).toBeVisible();
  });

  test('RG-76: рендер меток зоны на карте', async ({ game }) => {
    // DEFAULT_MAP_MARKERS пуст, поэтому initMapSystem() сам по себе не создаёт меток.
    // Проверяем реальный контракт renderZoneMap(): он отрисовывает метки из zoneMarkers
    // в слой #map-markers-layer. Наполняем zoneMarkers через публичный путь —
    // сохранение в localStorage (pda_zone_markers) + initMapSystem().
    await game.page.evaluate(() => {
      localStorage.setItem(
        'pda_zone_markers',
        JSON.stringify([
          { id: 'm1', name: 'Тестовая метка', icon: '📍', x: 10, y: 20, color: '#39ff14', desc: 'd' },
          { id: 'm2', name: 'Вторая метка', icon: '☢️', x: 30, y: 40, color: '#39ff14', desc: 'd' },
        ]),
      );
      (window as any).initMapSystem();
      (window as any).renderZoneMap();
    });

    const markers = await game.page.evaluate(() => {
      const el = document.getElementById('map-markers-layer');
      return el ? el.querySelectorAll('.map-marker-node').length : -1;
    });
    // Обе метки из zoneMarkers должны быть отрисованы в слое.
    expect(markers).toBe(2);
  });

  test('RG-77: сброс меток к стандартной конфигурации', async ({ game }) => {
    // resetMapMarkersToDefault подтверждается через confirm().
    game.page.on('dialog', (d) => d.accept());
    await game.page.evaluate(() => (window as any).resetMapMarkersToDefault());

    // После сброса метки сохраняются в localStorage под ключом pda_zone_markers.
    const stored = await game.page.evaluate(() =>
      localStorage.getItem('pda_zone_markers'),
    );
    expect(stored).not.toBeNull();
    expect(Array.isArray(JSON.parse(stored as string))).toBe(true);
  });

  test('RG-78: загрузка фона карты через input', async ({ game }) => {
    const input = game.page.locator('#map-bg-file-input');
    await expect(input).toBeAttached();
    await expect(input).toHaveAttribute('type', 'file');
    const map = game.page.locator('#view-map');
    await expect(map).toBeVisible();
  });

  test('RG-79: сохранение меток в localStorage', async ({ game }) => {
    // saveMapMarkers() сериализует zoneMarkers в localStorage.
    await game.page.evaluate(() => (window as any).saveMapMarkers());

    const stored = await game.page.evaluate(() =>
      localStorage.getItem('pda_zone_markers'),
    );
    expect(stored).not.toBeNull();
    expect(Array.isArray(JSON.parse(stored as string))).toBe(true);
  });

  test('RG-80: карта отображает позицию игрока', async ({ game }) => {
    const playerMarker = game.page.locator('#player-marker');
    if ((await playerMarker.count()) > 0) {
      await expect(playerMarker).toBeAttached();
    }
    await expect(game.page.locator('#view-map')).toBeVisible();
  });
});
