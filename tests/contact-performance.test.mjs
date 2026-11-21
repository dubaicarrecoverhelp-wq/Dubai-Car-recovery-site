import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {findPickup, validPickup} from '../scripts/location-controller.js';

const fix = (accuracy = 25, timestamp = 100000) => ({coords: {latitude: 25.2, longitude: 55.3, accuracy}, timestamp});
function rig() {
 const result = {success: [], failure: [], cleared: []};
 const geo = {watchPosition(accept, fail, options) {result.accept = accept;result.fail = fail;result.options = options;return 9;}, clearWatch(id) {result.cleared.push(id);}};
 result.cancel = findPickup({geolocation: geo, now: () => 100000, success: p => result.success.push(p), failure: e => result.failure.push(e), setTimer: fn => {result.timer = fn;return 1;}, clearTimer: () => {}});
 return result;
}
test('location rejects malformed, stale, implausible and future coordinates', () => {
 assert(validPickup(fix(), 100000));
 for (const p of [null, fix(0), fix(1001), fix(25, 1), fix(25, 110000), {...fix(), coords: {...fix().coords, latitude: 91}}]) assert.equal(validPickup(p, 100000), false);
});
test('a usable first fix completes immediately and stops watching', () => {
 const r = rig();r.accept(fix(65));r.accept(fix(10));r.fail({code: 3});
 assert.equal(r.success.length, 1);assert.equal(r.failure.length, 0);assert.deepEqual(r.cleared, [9]);
 assert.equal(r.options.maximumAge, 10000);assert.equal(r.options.timeout, 8000);
});
test('coarse location is improved briefly, then returns the best honest accuracy', () => {
 const r = rig();r.accept(fix(900));r.accept(fix(250));r.timer();
 assert.equal(r.success[0].coords.accuracy, 250);assert.deepEqual(r.cleared, [9]);
});
test('permission denial and acquisition timeout return a failure without fabricated coordinates', () => {
 for (const code of [1, 2, 3]) {const r = rig();r.fail({code});assert.equal(r.failure[0].code, code);assert.equal(r.success.length, 0);}
});
test('cancelled requests cannot later share a location', () => {
 const r = rig();r.cancel();r.accept(fix());assert.equal(r.success.length, 0);assert.deepEqual(r.cleared, [9]);
});
test('synchronous geolocation callbacks still clean up their watcher', () => {
 let cleared;
 findPickup({geolocation: {watchPosition(ok) {ok(fix());return 7;}, clearWatch(id) {cleared = id;}}, now: () => 100000, success() {}, failure() {assert.fail();}});
 assert.equal(cleared, 7);
});
test('consented campaign analytics never delays ordinary WhatsApp navigation', () => {
 const listeners = {}, dataLayer = [];
 const context = {
  URLSearchParams, Date, Element: class {}, location: {search: '?dcr_campaign=24440969896', pathname: '/', assign() {assert.fail('Analytics must not navigate');}},
  navigator: {}, sessionStorage: {getItem(key) {return key === 'dcr_contact_analytics_choice' ? 'allow' : null;}, setItem() {}},
  window: {dataLayer}, document: {head: {append() {}}, createElement() {return {};}, addEventListener(type, handler) {listeners[type] = handler;}, querySelector() {return null;}},
  setTimeout() {assert.fail('Contact navigation must not wait on a timer');}
 };
 vm.runInNewContext(fs.readFileSync('scripts/contact-events.js', 'utf8').replace('__DCR_CONTACT_CAMPAIGN_IDS__', '["24440969896"]'), context);
 const anchor = new context.Element();anchor.protocol = 'https:';anchor.hostname = 'wa.me';anchor.pathname = '/971501263137';anchor.classList = {contains: () => false};anchor.closest = () => anchor;
 listeners.click({target: anchor, defaultPrevented: false, preventDefault() {assert.fail('WhatsApp should use its native link');}});
 assert(dataLayer.some(row => row[0] === 'event' && row[1] === 'dcr_whatsapp_open'));
});

function locationUI(accuracy, inForm = false) {
 const result = {links: [], assigned: [], messages: []};
 const context = {
  window: {isSecureContext: true}, navigator: {geolocation: {}}, business: {name: 'DubaiCarRecovery.site', whatsapp: '971501263137'}, currentLocation: null,
  locationButtons: [{disabled: false, classList: {remove() {}}, querySelector() {return {};}}],
  locationResults: [{append(link) {result.links.push(link);}}],
  document: {querySelectorAll: () => [], createElement: () => ({})}, Event, encodeURIComponent,
  resetLocationButtons() {}, showLocation(...message) {result.messages.push(message);}, locationFailure(message) {result.error = message;},
  useLocation(position) {context.currentLocation = {mapsURL: 'https://www.google.com/maps/search/?api=1&query=25.200000%2C55.300000', accuracy: position.coords.accuracy};},
  findPickup({success}) {success(fix(accuracy));}, location: {assign(url) {result.assigned.push(url);}}
 };
 vm.runInNewContext(fs.readFileSync('scripts/fast-location.js', 'utf8'), context);
 context.requestLocation({currentTarget: {closest: () => inForm ? {} : null}});
 return result;
}
test('hero location immediately prepares the correct WhatsApp chat with map and accuracy', () => {
 const r = locationUI(65), url = new URL(r.assigned[0]);
 assert.equal(url.hostname, 'wa.me');assert.equal(url.pathname, '/971501263137');
 assert.match(url.searchParams.get('text'), /25.200000%2C55.300000/);
 assert.match(url.searchParams.get('text'), /within 65 metres/);
 assert.equal(r.links[0].href, r.assigned[0]);
});
test('approximate pins require a deliberate send tap and form location does not abandon the form', () => {
 for (const r of [locationUI(250), locationUI(25, true)]) {assert.equal(r.assigned.length, 0);assert.equal(r.links.length, 1);}
 assert(locationUI(250).messages.some(row => row[0].includes('approximate')));
});
