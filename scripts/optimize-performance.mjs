import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {gzipSync} from 'node:zlib';

const write = (file, value) => {fs.writeFileSync(file, value);fs.writeFileSync(file + '.gz', gzipSync(value, {level: 9}));};
let app = fs.readFileSync('dist/app.js', 'utf8');
const originalLocation = /function requestLocation\(\)\{[\s\S]*?\n\}\n(?=for\(const button of locationButtons\))/;
assert(originalLocation.test(app), 'Expected existing location request');
const controller = fs.readFileSync('scripts/location-controller.js', 'utf8').replaceAll('export function ', 'function ');
app = app.replace(originalLocation, () => controller + '\n' + fs.readFileSync('scripts/fast-location.js', 'utf8'));

// Keep gallery images out of the initial download. Load the visible slide and
// its neighbours when the visitor actually approaches this section.
const renderMarker = ' const render=(animate=true)=>{track.style.transitionDuration';
assert(app.includes(renderMarker));
app = app.replace(renderMarker, ` let galleryVisible=false;
 const loadGallery=()=>{if(!galleryVisible)return;for(const slide of [...track.children].slice(Math.max(0,index-1),index+4)){const img=slide.querySelector('img[data-gallery-src]');if(img){img.src=img.dataset.gallerySrc;img.removeAttribute('data-gallery-src');}}};
 if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{galleryVisible=entries.some(e=>e.isIntersecting);loadGallery();},{rootMargin:'250px'});observer.observe(transportViewport);}else galleryVisible=true;
 const render=(animate=true)=>{loadGallery();track.style.transitionDuration`);

// Decorative video starts after interaction. Its poster stays visible while
// the page's real content and contact controls load.
const motionMarker = "// Crossfade before the supplied clip ends; reset only the hidden player.";
assert(app.includes(motionMarker));
app = app.replace(motionMarker, `let decorationReady=false;
const enableDecoration=()=>{if(decorationReady)return;decorationReady=true;document.body.removeAttribute('data-decoration');document.dispatchEvent(new Event('dcr:decoration-ready'));};
for(const type of ['pointerdown','keydown','scroll'])window.addEventListener(type,enableDecoration,{once:true,passive:true});
${motionMarker}`);
app = app.replace('const shouldPlay=()=>!document.hidden', 'const shouldPlay=()=>decorationReady&&!navigator.connection?.saveData&&!document.hidden');
app = app.replace(' document.addEventListener(\'visibilitychange\',resumeBackground);', " document.addEventListener('dcr:decoration-ready',resumeBackground);\n document.addEventListener('visibilitychange',resumeBackground);");
write('dist/app.js', app);
const version = createHash('sha256').update(app).digest('hex').slice(0, 12);

for (const name of ['hero-mobile-fast.webp', 'hero-desktop-fast.webp']) fs.copyFileSync(`assets/${name}`, `dist/media/${name}`);
let pages = 0;
for (const name of fs.readdirSync('dist', {recursive: true})) {
 if (!name.endsWith('.html')) continue;
 const file = path.join('dist', name);
 let html = fs.readFileSync(file, 'utf8');
 if (!html.includes('/app.js?v=')) continue;
 html = html.replace(/src="\/app\.js\?v=[^"]+"/g, `src="/app.js?v=${version}"`);
 html = html.replace(/<body\b/, '<body data-decoration="pending"');
 html = html.replace(/(<video class="header-motion-background[^>]*?) poster="[^"]+"/g, '$1');
 html = html.replace('</head>', `<link rel="preload" as="image" href="/media/header-clouds-poster.jpg" fetchpriority="high"><style>
 body[data-decoration="pending"] .site-header{background-image:url('/media/header-clouds-poster.jpg')!important;background-size:cover!important}
 body[data-decoration="pending"] .site-header *,body[data-decoration="pending"] .site-header::before,body[data-decoration="pending"] .site-header::after,body[data-decoration="pending"] .hero h1,body[data-decoration="pending"] .hero-actions{animation-play-state:paused!important}
 body[data-decoration="pending"] .hero h1,body[data-decoration="pending"] .hero-actions{opacity:1!important;transform:none!important}
 </style></head>`);
 // Without JavaScript the original gallery remains available.
 html = html.replace(/(<article class="transport-slide"[^>]*>)<img src="(\/media\/recovery\/[^"]+)"([^>]*?)>/g, (_, article, src, attrs) => `${article}<img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1672' height='941'%3E%3C/svg%3E" data-gallery-src="${src}"${attrs}><noscript><img src="${src}"${attrs}></noscript>`);
 if (html.includes('data-gallery-src=')) html = html.replace('</head>', '<noscript><style>.transport-slide>img[data-gallery-src]{display:none}</style></noscript></head>');
 html = html.replace(/(<source media="\(min-width:700px\)" srcset=")\/media\/hero-mobile-poster.webp"/, '$1/media/hero-desktop-fast.webp"');
 html = html.replace(/(<img class="hero-video" src=")\/media\/hero-mobile-poster.webp"/, '$1/media/hero-mobile-fast.webp"');
 // Avoid re-fetching the old CSS background behind the picture element.
 if (html.includes('class="hero-picture"')) html = html.replace('</head>', '<style>.hero:has(.hero-picture){background-image:none!important}</style></head>');
 write(file, html);pages++;
}
console.log(`Performance overlay: ${pages} pages, immediate contact links, progressive gallery and responsive hero images.`);
