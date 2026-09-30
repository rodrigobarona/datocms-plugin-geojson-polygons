import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const maplibreDist = join(
  dirname(require.resolve('maplibre-gl/package.json')),
  'dist',
);
const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

mkdirSync(publicDir, { recursive: true });

// The worker imports ./maplibre-gl-shared.mjs, so both must sit side by side.
for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  copyFileSync(join(maplibreDist, file), join(publicDir, file));
}
