import { statSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const INDEX = join(ROOT, 'index.html');

function newestMtime(dir: string): number {
  let max = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    max = Math.max(max, entry.isDirectory() ? newestMtime(p) : statSync(p).mtimeMs);
  }
  return max;
}

const srcMtime = newestMtime(join(ROOT, 'src'));
const indexMtime = statSync(INDEX).mtimeMs;

if (srcMtime > indexMtime) {
  console.warn('⚠️  index.html устарел. Пересоберите через build.html.');
  process.exit(1);
}
console.log('✅ index.html актуален.');
