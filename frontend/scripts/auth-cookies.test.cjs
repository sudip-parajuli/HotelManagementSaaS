const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function setup(file, post) {
  const source = fs.readFileSync(require('node:path').join(__dirname, '..', file), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const removed = [], set = [];
  const exports = {};
  const dependencies = {
    '@/lib/server/backend': { backendHeaders: () => ({}) },
    'axios': { default: { post } },
    'next/server': { NextResponse: { json: body => ({ body, cookies: { delete: key => removed.push(key), set: key => set.push(key) } }) } },
  };
  vm.runInNewContext(output, { exports, process: { env: { NODE_ENV: 'production' } }, console: { error() {} }, require: key => dependencies[key] });
  return { route: exports, removed, set };
}
const contextCookies = ['original_access_token','original_refresh_token','impersonated_tenant_name','impersonated_tenant_reason'];
test('fresh owner login discards previous impersonation context and backup credentials', async () => {
  const { route, removed, set } = setup('src/app/api-auth/login/route.ts', async () => ({ status: 200, data: { access: 'test', refresh: 'test', user: { role: 'SUPER_ADMIN' } } }));
  await route.POST({ json: async () => ({}), headers: new Headers() });
  for (const key of contextCookies) assert.ok(removed.includes(key));
  assert.deepEqual(set, ['access_token', 'refresh_token']);
});
test('local logout clears backup access even after the short demo token has expired', async () => {
  const { route, removed } = setup('src/app/api-auth/logout/route.ts', () => { throw Error('Backend must not be called without refresh'); });
  await route.POST({ cookies: { get: () => undefined } });
  for (const key of [...contextCookies,'access_token','refresh_token']) assert.ok(removed.includes(key));
});
test('backend outage cannot prevent logout from removing every session credential', async () => {
  const { route, removed } = setup('src/app/api-auth/logout/route.ts', async () => { throw Error('offline'); });
  await route.POST({ cookies: { get: () => ({ value: 'test' }) }, headers: new Headers() });
  for (const key of [...contextCookies,'access_token','refresh_token']) assert.ok(removed.includes(key));
});
