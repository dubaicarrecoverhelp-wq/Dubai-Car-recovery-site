import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, copyFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';

// Apply after service removals, so the loop always uses the published offers.
const file = 'dist/index.html';
let html = readFileSync(file, 'utf8');
const section = html.match(/<section[^>]*id="our-services"[^>]*>[\s\S]*?<\/section>/)?.[0];
assert(section, 'Expected homepage services section');
const cards = section.match(/<div class="card card-[^"]+"[^>]*>/g);
assert(cards?.length > 1, 'Expected supported service cards');
let index = 0;
const updated = section
  .replace(/--quantity:\d+;/, `--quantity:${cards.length};`)
  .replace(/--index:\d+;/g, () => `--index:${index++};`)
  .replace('<div class="service-carousel wrapper">', '<button type="button" class="service-loop-toggle" aria-pressed="false" aria-controls="service-loop">Pause cards</button><div class="service-carousel wrapper" id="service-loop">');
assert.equal(index, cards.length);
html = html.replace(section, updated);
for (const name of ['service-loop.css', 'service-loop.js']) {
  const source = readFileSync(`scripts/${name}`);
  copyFileSync(`scripts/${name}`, `dist/${name}`);
  writeFileSync(`dist/${name}.gz`, gzipSync(source, {level: 9}));
  const version = createHash('sha256').update(source).digest('hex').slice(0, 12);
  const tag = name.endsWith('.css')
    ? `<link rel="stylesheet" href="/${name}?v=${version}">`
    : `<script defer src="/${name}?v=${version}"></script>`;
  html = html.replace('</body>', `${tag}</body>`);
}
writeFileSync(file, html);
writeFileSync(`${file}.gz`, gzipSync(html, {level: 9}));
console.log(`Seamless services loop built with ${cards.length} consecutive cards.`);
