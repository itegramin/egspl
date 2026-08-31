import fs from 'node:fs';

for (const f of ['loading', 'success', 'empty']) {
  const p = `src/assets/lottie/${f}.json`;
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const ok = j.v && j.w && j.h && Array.isArray(j.layers) && j.layers.length > 0;
  console.log(f, '-> valid JSON:', ok, '| w:', j.w, 'h:', j.h, 'layers:', j.layers.length);
}
