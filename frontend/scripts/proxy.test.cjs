const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

function load(file, env, dependencies = {}, fetch = global.fetch) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const exports = {};
  vm.runInNewContext(outputText, { exports, require: key => dependencies[key] ?? require(key), process: { env }, Headers, Response, URL, AbortSignal, fetch, encodeURIComponent }, { filename: file });
  return exports;
}
const backendFile = 'src/lib/server/backend.ts';
const env = { NODE_ENV: 'production', INTERNAL_BACKEND_URL: 'https://staywired-api.vercel.app', STAYWIRED_PROXY_SECRET: 'test-only-secret' };
test('host context is server-authenticated without overriding platform HTTP routing', () => {
  const { backendHeaders } = load(backendFile, env, { 'server-only': {} });
  const headers = backendHeaders('staywired.vercel.app:443');
  assert.equal(headers.Host, undefined);
  assert.equal(headers['X-Staywired-Host'], 'staywired.vercel.app');
  assert.equal(headers['X-Staywired-Proxy-Secret'], 'test-only-secret');
  const noSecret = load(backendFile, { NODE_ENV: 'production' }, { 'server-only': {} });
  assert.equal(Object.keys(noSecret.backendHeaders('staywired.vercel.app')).length, 0);
});
function setup(fetch) {
  const backend = load(backendFile, env, { 'server-only': {} });
  return load('src/app/api/[...path]/route.ts', env, {
    '@/lib/server/backend': backend,
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
  }, fetch);
}
function request(method = 'GET', headers = {}) {
  return { method, headers: new Headers({ host: 'staywired.vercel.app', ...headers }), nextUrl: new URL('https://staywired.vercel.app/api/bookings/reservations/?page=2'), arrayBuffer: async () => new TextEncoder().encode('{"guest_id":1}').buffer };
}
test('API proxy preserves cookies/query/status and strips injected tenant secrets', async () => {
  let captured;
  const routes = setup(async (url, options) => { captured = { url, options }; return new Response('{"count":0}', { status: 200, headers: { 'content-type': 'application/json' } }); });
  const response = await routes.GET(request('GET', { cookie: 'access_token=sample', 'x-staywired-host': 'attacker.example', 'x-staywired-proxy-secret': 'attacker' }), { params: { path: ['bookings', 'reservations'] } });
  assert.equal(captured.url.href, 'https://staywired-api.vercel.app/api/bookings/reservations/?page=2');
  assert.equal(captured.options.headers.get('cookie'), 'access_token=sample');
  assert.equal(captured.options.headers.get('x-staywired-host'), 'staywired.vercel.app');
  assert.equal(captured.options.headers.get('x-staywired-proxy-secret'), 'test-only-secret');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(await response.text(), '{"count":0}');
});
test('cross-origin writes and path traversal fail before backend access', async () => {
  const routes = setup(async () => { throw new Error('Backend must not be contacted'); });
  assert.equal((await routes.POST(request('POST', { origin: 'https://attacker.example' }), { params: { path: ['bookings'] } })).status, 403);
  assert.equal((await routes.GET(request(), { params: { path: ['..', 'admin'] } })).status, 400);
});
test('backend unavailability becomes a usable 502 response', async () => {
  const routes = setup(async () => { throw new Error('unreachable'); });
  assert.equal((await routes.GET(request(), { params: { path: ['bookings'] } })).status, 502);
});
