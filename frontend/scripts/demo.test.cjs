const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
function loadTypeScript(file, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const exports = {};
  vm.runInNewContext(outputText, { exports, require: name => dependencies[name] ?? require(name), Intl, Date, JSON, Number, Math, Error, URL }, { filename: file });
  return exports;
}
const hotel = loadTypeScript('src/lib/demo/hotel.ts');
const day = '2026-10-27';
const input = { guest: 'Test Guest', email: '', roomId: '108', arrival: day, departure: '2026-10-29', guests: 2, source: 'Direct', notes: '' };
test('a complete guest journey settles the balance and hands the room to housekeeping', () => {
  let state = hotel.addStay(hotel.seedHotel(day), input, day);
  const stay = state.stays.at(-1);
  assert.equal(hotel.total(stay, state.rooms), 13000);
  state = hotel.updateStay(state, stay.id, 'check-in', day);
  assert.equal(state.stays.at(-1).status, 'in-house');
  assert.throws(() => hotel.updateStay(state, stay.id, 'check-out', day), /Settle/);
  state = hotel.updateStay(state, stay.id, 'settle', day);
  state = hotel.updateStay(state, stay.id, 'check-out', day);
  assert.equal(state.rooms.find(r => r.id === '108').state, 'dirty');
  state = hotel.cleanRoom(state, '108');
  assert.equal(state.rooms.find(r => r.id === '108').state, 'ready');
});
test('overlapping reservations are rejected but adjacent stays are allowed', () => {
  const state = hotel.addStay(hotel.seedHotel(day), input, day);
  assert.throws(() => hotel.addStay(state, input, day), /unavailable/);
  assert.equal(hotel.available(state, '108', '2026-10-29', '2026-10-30'), true);
});
test('invalid dates, empty guest names and excessive occupancy are rejected', () => {
  for (const change of [{ arrival: '2026-10-26' }, { departure: day }, { arrival: 'bad' }, { guest: ' ' }, { guests: 3 }, { guests: 0 }, { guests: 1.5 }]) {
    assert.throws(() => hotel.addStay(hotel.seedHotel(day), { ...input, ...change }, day));
  }
});
test('maintenance and dirty room checks protect check-in', () => {
  const seed = hotel.seedHotel(day);
  assert.throws(() => hotel.addStay(seed, { ...input, roomId: '208' }, day), /unavailable/);
  const dirty = hotel.addStay(seed, { ...input, roomId: '107' }, day);
  assert.throws(() => hotel.updateStay(dirty, dirty.stays.at(-1).id, 'check-in', day), /ready/);
});
test('future arrivals cannot check in early and closed stays cannot take payments', () => {
  let state = hotel.addStay(hotel.seedHotel(day), { ...input, arrival: '2026-10-28' }, day);
  const id = state.stays.at(-1).id;
  assert.throws(() => hotel.updateStay(state, id, 'check-in', day), /stay dates/);
  state = hotel.updateStay(state, id, 'cancel', day);
  assert.throws(() => hotel.updateStay(state, id, 'settle', day), /closed/);
  assert.equal(hotel.available(state, '108', day, '2026-10-29'), true);
});
test('snapshot restoration validates browser data', () => {
  const state = hotel.seedHotel(day);
  assert.equal(hotel.restoreHotel(JSON.stringify(state)).stays.length, 8);
  assert.throws(() => hotel.restoreHotel('{bad'));
  assert.throws(() => hotel.restoreHotel('{"version":1,"rooms":[],"stays":[]}'));
});
const { middleware } = loadTypeScript('src/middleware.ts', { 'next/server': { NextResponse: { next: () => ({ kind: 'next' }), redirect: url => ({ kind: 'redirect', pathname: url.pathname }) } } });
function request(pathname, authenticated = false, host = 'staywired.vercel.app') {
  return { nextUrl: { pathname }, headers: { get: () => host }, cookies: { has: () => authenticated }, url: `https://${host}${pathname}` };
}
test('private bookings and administrator pages require authentication', () => {
  for (const path of ['/bookings/', '/bookings/new/', '/admin/', '/admin/tenants/', '/rooms/']) {
    assert.equal(middleware(request(path)).pathname, '/login/');
    assert.equal(middleware(request(path, true)).kind, 'next');
  }
});
test('demo and booking widget stay public on main and tenant domains', () => {
  for (const host of ['staywired.vercel.app', 'hotel.localhost']) {
    for (const path of ['/demo/', '/book/', '/book/confirmation/']) assert.equal(middleware(request(path, false, host)).kind, 'next');
  }
  assert.equal(middleware(request('/')).pathname, '/landing/');
});
