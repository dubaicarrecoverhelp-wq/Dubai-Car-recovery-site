import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, copyFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';

// Apply after service removals, so the loop always uses the published offers.
const file = 'dist/index.html';
let html = readFileSync(file, 'utf8');
let section = html.match(/<section[^>]*id="our-services"[^>]*>[\s\S]*?<\/section>/)?.[0];
assert(section, 'Expected homepage services section');
const originalSection = section;
const basementCard = '<div class="card card-black" style="--index:8;--color-card:13, 15, 19;"><button class="img" type="button" aria-label="Read about Basement car recovery"><span class="service-art" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V8l9-5 9 5v13M6 21V10h12v11M8 15h8l-1-3H9zM8 15v4h8v-4M9 19v2m6-2v2"/></svg></span><h3>Basement car recovery</h3><p>Recovery enquiries for cars in basement or underground parking. Share the entrance height, ramp access and vehicle condition so suitable equipment can be assessed.</p></button></div>';
assert(section.endsWith('</div></div></div></section>'), 'Expected services track closing markup');
section = section.replace(/<\/div><\/div><\/div><\/section>$/, basementCard + '</div></div></div></section>');
const cards = section.match(/<div class="card card-[^"]+"[^>]*>/g);
assert(cards?.length > 1, 'Expected supported service cards');
let index = 0;
const updated = section
  .replace(/--quantity:\d+;/, `--quantity:${cards.length};`)
  .replace(/--index:\d+;/g, () => `--index:${index++};`)
  .replace('<div class="service-carousel wrapper">', '<div class="service-carousel wrapper" id="service-loop">');
assert.equal(index, cards.length);
html = html.replace(originalSection, updated);
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

// Apply the requested outline consistently to every page and dynamic text,
// while retaining each element's existing text color.
const outlines = `<style id="site-text-outlines">
html body, html body * {
 -webkit-text-stroke: .65px #000 !important;
 paint-order: stroke fill !important;
 text-shadow: -.4px 0 #000, .4px 0 #000, 0 -.4px #000, 0 .4px #000;
}
html body :is(h1,h2,h3,h4,h5,h6) {
 -webkit-text-stroke: 1.1px #000 !important;
}
html body ::placeholder { -webkit-text-stroke: .65px #000; paint-order: stroke fill; }
@media (forced-colors: active) {
 html body, html body *, html body :is(h1,h2,h3,h4,h5,h6) { -webkit-text-stroke: 0 !important; text-shadow: none !important; }
}
</style>`;
let outlinedPages = 0;
for (const name of readdirSync('dist', {recursive: true})) {
 if (!name.endsWith('.html')) continue;
 const page = join('dist', name);
 const content = readFileSync(page, 'utf8');
 if (!content.includes('</head>')) continue;
 const outlined = content.replace('</head>', outlines + '</head>');
 writeFileSync(page, outlined);
 writeFileSync(page + '.gz', gzipSync(outlined, {level: 9}));
 outlinedPages++;
}
console.log(`Black text outlines applied to ${outlinedPages} pages.`);
