import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The scorer and this handoff share the kit's byte-identical canonical builder.
const here = fileURLToPath(new URL('.', import.meta.url));
const output = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
if (output === resolve(here)) throw new Error('Choose a separate output directory');
mkdirSync(output, { recursive: true });
for (const dir of ['game', 'screenshots']) cpSync(join(here, dir), join(output, dir), { recursive: true });
writeFileSync(join(output, 'dossier.json'), buildDossier(output, {
  text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993, game_max_bytes: 50331648, game_path_max_bytes: 1000,
}));
