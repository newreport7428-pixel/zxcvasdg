// End-to-end: phone -> relay binary (HTTPS, self-signed IP mode) -> extension relay client -> local server.
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const { SyncServer } = require('../src/server.js');
const { RelayClient } = require('../src/relay.js');
const { vscode, addDoc, pcInsert } = require('./mock-vscode.js');

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
let failed = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
  if (!ok) failed++;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 5000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return true;
    await wait(50);
  }
  return false;
}

// --- relay binary in a temp folder (it writes config, certs and log next to itself)
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ms-relay-'));
const exe = path.join(dir, 'mobile-sync-relay');
fs.copyFileSync(path.join(root, 'relay/bin/mobile-sync-relay-linux'), exe);
fs.chmodSync(exe, 0o755);
const agentKey = 'relay-test-key-0123456789abcdef';
fs.writeFileSync(path.join(dir, 'relay-config.json'), JSON.stringify({ host: '127.0.0.1', agentKey }));
const RELAY_PORT = 18443;
let relayProc;
function startRelay() {
  relayProc = spawn(exe, ['-listen', `127.0.0.1:${RELAY_PORT}`, '-http', ''], { stdio: ['ignore', 'pipe', 'pipe'] });
  relayProc.stderr.on('data', () => {});
  relayProc.stdout.on('data', () => {});
}
startRelay();
check('relay writes connect-string.txt', await until(() => fs.existsSync(path.join(dir, 'connect-string.txt'))));
const connect = fs.readFileSync(path.join(dir, 'connect-string.txt'), 'utf8').trim();
check('connect string has key and certificate pin', /^https:\/\/127\.0\.0\.1:18443#key=.+&pin=[0-9a-f]{64}$/.test(connect), connect.replace(/key=[^&]+/, 'key=…'));

// --- computer side
const doc = addDoc('/proj/remote.py', 'def main():\n    pass\n', 'python');
const token = 'phone-token-xyz';
const seen = [];
const server = new SyncServer(vscode, {
  port: 0,
  host: '127.0.0.1',
  token,
  agentNonce: 'nonce-abcdefghijklmnopqrstuvwx',
  mediaDir: path.join(root, 'media'),
  onClientsChanged: (i) => i && i.connected && seen.push(i.address),
});
await server.listen();
const statuses = [];
const mk = (c) =>
  new RelayClient({ connect: c, localHost: '127.0.0.1', localPort: server.port, agentNonce: server.opts.agentNonce, onStatus: (s, d) => statuses.push([s, d]) });

// wrong key is refused
const bad = mk(connect.replace(/key=[^&]+/, 'key=wrong-key-wrong-key-wrong'));
bad.start();
check('relay refuses a wrong computer key', await until(() => bad.status === 'denied'));
bad.stop();
// wrong certificate pin is refused before answering the challenge
const badPin = mk(connect.replace(/pin=[0-9a-f]+/, 'pin=' + '0'.repeat(64)));
badPin.start();
check('computer refuses a relay with the wrong certificate', await until(() => badPin.status === 'denied'));
badPin.stop();

const client = mk(connect);
client.start();
check('computer connects to relay', await until(() => client.status === 'online'));

// --- phone through the relay
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['Pixel 7'], ignoreHTTPSErrors: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`https://127.0.0.1:${RELAY_PORT}/#t=${token}`);
check('phone online through VPS', await until(() => page.$eval('#status', (e) => e.dataset.state === 'online')));
check('computer sees phone address via VPS', await until(() => seen.some((a) => a.startsWith('VPS:127.0.0.1'))), seen.join(','));
check('file opens through VPS', await until(async () => (await page.textContent('#title')) === 'remote.py'));
const phoneText = () => page.evaluate(() => window.__mobileSync.view.state.doc.toString());

await page.click('.cm-line:has-text("pass")');
await page.keyboard.press('End');
await page.keyboard.type('  # typed on phone via VPS');
check('phone typing reaches computer via VPS', await until(() => doc.getText().includes('pass  # typed on phone via VPS')), JSON.stringify(doc.getText()));
await pcInsert(doc, 0, 0, '# from PC\n');
check('PC edit reaches phone via VPS (live stream)', await until(async () => (await phoneText()).startsWith('# from PC\n')));
await page.click('#save');
check('save via VPS', await until(() => !doc.isDirty));

// --- wrong phone key through relay is still checked by the computer
const r401 = await page.evaluate(async () => (await fetch('/api/tabs', { headers: { 'X-Token': 'nope' } })).status);
check('wrong phone key rejected through VPS', r401 === 401);

// --- relay restarts: everything reconnects by itself
relayProc.kill();
await until(() => relayProc.exitCode !== null || relayProc.signalCode !== null);
check('phone shows offline when VPS is down', await until(() => page.$eval('#status', (e) => e.dataset.state === 'offline'), 8000));
startRelay();
check('computer reconnects to VPS', await until(() => client.status === 'online', 20000));
check('phone reconnects', await until(() => page.$eval('#status', (e) => e.dataset.state === 'online'), 20000));
await pcInsert(doc, 0, 0, '# after VPS restart\n');
check('sync after VPS restart', await until(async () => (await phoneText()).startsWith('# after VPS restart')));

// --- computer offline: relay shows a friendly page
client.stop();
await wait(300);
const res = await page.evaluate(async () => {
  const r = await fetch('/', { cache: 'no-store' });
  return [r.status, await r.text()];
});
check('relay shows "computer offline" page', res[0] === 503 && res[1].includes('คอมยังไม่ได้เชื่อมต่อ'));

check('relay log does not contain secrets', !fs.readFileSync(path.join(dir, 'relay.log'), 'utf8').match(new RegExp(`${token}|${agentKey}`)));
check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close();
relayProc.kill();
await server.close();
fs.rmSync(dir, { recursive: true, force: true });
console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
