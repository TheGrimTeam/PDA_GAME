// Копирует собранную игру (index.html из корня проекта) в mobile/www,
// откуда Capacitor упаковывает её в приложения Android и iOS.
// sw.js не копируется: в приложении Service Worker не нужен.
import { mkdirSync, copyFileSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const www = join(here, '..', 'www');

rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });
for (const file of ['index.html', 'manifest.json']) {
  const src = join(root, file);
  if (!existsSync(src)) throw new Error(`Не найден ${src}. Соберите игру через build.html.`);
  copyFileSync(src, join(www, file));
}
console.log('✅ mobile/www подготовлен из', join(root, 'index.html'));
