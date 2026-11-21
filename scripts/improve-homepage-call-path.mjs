import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const file = 'dist/index.html';
let html = readFileSync(file, 'utf8');

function replaceOnce(before, after) {
  assert.equal(html.split(before).length, 2, 'Expected one matching homepage element');
  html = html.replace(before, () => after);
}

const originalHeading = /<p class="hero-dubai-title">DUBAI<\/p><h1>[^]*?<\/h1>/;
const heading = html.match(originalHeading);
assert(heading, 'Expected homepage hero heading');
replaceOnce(heading[0], '<h1><span class="neon-text">Car Recovery</span><br><span class="metal-text">&amp; Towing in Dubai</span> <span class="hero-availability">24/7</span></h1>');
replaceOnce(
  'Towing, recovery and flatbed transport for standard, luxury and sports cars, plus bike towing, motorcycle transport, breakdown recovery and roadside assistance across Dubai.',
  'Car towing, flatbed towing, luxury &amp; sports car towing, car breakdown recovery, accident recovery, roadside assistance, desert &amp; off-road recovery, motorcycle transport, and basement car recovery.<strong class="hero-arrival">Arrival time within 15 minutes</strong>'
);

const phone = html.match(/<a class="btn call" href="tel:(\+\d+)"/)?.[1];
assert(phone, 'Expected the existing business phone number');
const arrival = '<strong class="hero-arrival">Arrival time within 15 minutes</strong>';
replaceOnce(arrival, `${arrival}<a class="hero-phone-number" href="tel:${phone}" data-contact="phone">${phone.replace(/^(\+971)(\d{2})(\d{3})(\d+)$/, '$1 $2 $3 $4')}</a>`);
replaceOnce(
  '<p class="hero-condition">Subject to availability and location.</p><p class="hero-vehicle-line">WE RECOVER LUXURY, STANDARD, SPORTS CARS &amp; BIKES</p>',
  '<p class="hero-condition">Phone enquiries 24/7. We confirm availability and your quote before pickup.</p>'
);

const styles = `<style id="homepage-call-path">
  body[data-page="home"] .hero h1 span { display: inline; }
  body[data-page="home"] .hero .hero-description { color: #f7f7f5; }
  body[data-page="home"] .hero .hero-condition { font-size: 13px; color: #f7f7f5; line-height: 1.4; }
  body[data-page="home"] .hero-contact-trio .btn { animation: none; translate: none; }
  body[data-page="home"] .hero-contact-trio a:focus-visible { outline: 3px solid white; outline-offset: 3px; }
  body[data-page="home"] .hero-arrival { display: block; margin-top: 12px; font-weight: 1000; color: #ff3655 !important; -webkit-text-fill-color: #ff3655 !important; }
  body[data-page="home"] .hero h1 .hero-availability { color: #ff3655 !important; -webkit-text-fill-color: #ff3655 !important; background: none !important; }
  body[data-page="home"] .hero-phone-number {
    display: table; width: auto; max-width: 100%; min-height: 0;
    margin-top: 6px; padding: 8px 12px; border: 1px solid #ff3658; border-radius: 12px;
    background: linear-gradient(180deg, #ff365b, #e50937 55%, #b80026); color: white !important; -webkit-text-fill-color: white !important; font-size: inherit; font-family: inherit; font-weight: 1000;
    line-height: inherit; letter-spacing: 0; text-decoration: none; box-sizing: border-box;
  }
  body[data-page="home"] .hero-phone-number:focus-visible { outline: 3px solid white; outline-offset: 3px; }
  body[data-page="home"] .hero .hero-actions { position: relative; width: 100%; }
  body[data-page="home"] .hero .hero-condition { display: block; margin-top: 10px; }
  body[data-page="home"] .hero .hero-content { height: auto !important; }
  @media (min-width: 1000px) {
    body[data-page="home"] .hero .hero-content.wrap { min-height: 800px !important; padding-bottom: 156px !important; }
  }
  @media (max-width: 699px) {
    body[data-page="home"] .hero .hero-content { position: relative; justify-content: flex-start; padding-top: 232px !important; padding-bottom: 180px !important; }
    body[data-page="home"] .hero h1 { font-size: clamp(31px, 8.25vw, 48px) !important; line-height: 1.05; }
    body[data-page="home"] .hero-contact-trio { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
    body[data-page="home"] .hero-contact-trio .call { grid-column: 1 / -1; min-height: 56px; }
    body[data-page="home"] .hero-contact-trio .call span { font-size: 18px !important; }
  }
</style>`;
replaceOnce('</head>', `${styles}\n</head>`);

assert.match(html, /<a class="btn call" href="tel:\+971501263137" data-contact="phone">/);
assert.match(html, /<link rel="canonical" href="https:\/\/www\.dubaicarrecovery\.site\/"/);
writeFileSync(file, html);
writeFileSync(`${file}.gz`, gzipSync(html, { level: 9 }));
console.log('Homepage towing description and mobile call hierarchy updated.');
