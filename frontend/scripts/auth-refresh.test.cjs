const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const axios = require('axios');
function setup() {
  const source = fs.readFileSync(require('node:path').join(__dirname, '../src/lib/api/client.ts'), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, require });
  return exports;
}
const response = config => ({ data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config });
const expired = config => new axios.AxiosError('Expired', 'ERR_BAD_REQUEST', config, null, { ...response(config), status: 401 });
test('concurrent data and auth-context requests share one refresh and retry their own routes', async () => {
  const { apiClient, authClient } = setup();
  let refreshes = 0;
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const adapter = async config => {
    if (config.url === '/refresh') { refreshes++; await gate; return response(config); }
    if (!config._retry) throw expired(config);
    return response(config);
  };
  apiClient.defaults.adapter = adapter;
  authClient.defaults.adapter = adapter;
  const data = apiClient.get('/properties/rooms/');
  const profile = authClient.get('/me');
  await new Promise(resolve => setImmediate(resolve));
  release();
  const results = await Promise.all([data, profile]);
  assert.equal(refreshes, 1);
  assert.equal(results[0].config.baseURL, '/api');
  assert.equal(results[1].config.baseURL, '/api-auth');
});
test('a rejected refresh terminates instead of recursively refreshing', async () => {
  const { authClient } = setup();
  let calls = 0;
  authClient.defaults.adapter = async config => { calls++; throw expired(config); };
  await assert.rejects(authClient.get('/features'));
  assert.equal(calls, 2);
});
test('an invalid login never triggers token refresh', async () => {
  const { authClient } = setup();
  let calls = 0;
  authClient.defaults.adapter = async config => { calls++; throw expired(config); };
  await assert.rejects(authClient.post('/login', { email: 'example@example.com', password: 'invalid' }));
  assert.equal(calls, 1);
});
