// End-to-end test: fake editor on the "computer" + real phone-sized browser.
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const { SyncServer } = require('../src/server.js');
const { vscode, addDoc, pcInsert } = require('./mock-vscode.js');

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const shots = process.env.SHOTS || '';
let failed = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
  if (!ok) failed++;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 4000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return true;
    await wait(50);
  }
  return false;
}

const winDoc = addDoc('/proj/src/app.js', 'function hello() {\r\n  return 1;\r\n}\r\n', 'javascript');
const luaDoc = addDoc('/proj/main.lua', 'local x = 1\nprint(x)\n', 'lua');

const token = 'test-token-abc';
const server = new SyncServer(vscode, { port: 0, host: '127.0.0.1', token, mediaDir: path.join(root, 'media') });
await server.listen();
const base = `http://127.0.0.1:${server.port}`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

// --- wrong key is refused
const bad = await fetch(`${base}/api/tabs`, { headers: { 'X-Token': 'nope' } });
check('wrong key rejected with 401', bad.status === 401);
const noKey = await fetch(`${base}/api/files`);
check('missing key rejected', noKey.status === 401);

// --- server rebases an edit made against an old version
{
  const H = { 'X-Token': token, 'Content-Type': 'application/json' };
  const post = (p, b) => fetch(base + p, { method: 'POST', headers: H, body: JSON.stringify(b) }).then((r) => r.json());
  const d = addDoc('/proj/rebase.txt', 'hello world\n', 'plaintext');
  const o = await post('/api/open', { uri: d.uri.toString() });
  await pcInsert(d, 0, 0, '>> '); // computer edits first; the phone has not seen it yet
  // phone inserts "big " before "world" based on the old version: retain 6, insert, retain 6
  const r = await post('/api/edit', { uri: o.uri, version: o.version, changes: [6, [0, 'big '], 6], clientId: 'x' });
  check('stale phone edit is rebased, not rejected', r.ok && d.getText() === '>> hello big world\n', JSON.stringify([r, d.getText()]));
  const bad = await post('/api/edit', { uri: o.uri, version: o.version + 5, changes: [3], clientId: 'x' });
  check('edit from the future is refused', bad.ok === false);
}

// --- connect
await page.goto(`${base}/#t=${token}`);
check('key removed from address bar', !page.url().includes(token));
check('status online', await until(() => page.$eval('#status', (e) => e.dataset.state === 'online')));
// active doc on the computer opens automatically on first load
check('auto-opens active PC file', await until(async () => (await page.textContent('#title')) === 'rebase.txt'));

// --- open the CRLF file from the drawer
await page.click('#menu');
await page.click('#pcTabs .file:has-text("app.js")');
check('opened app.js', await until(async () => (await page.textContent('#title')) === 'app.js'));
const phoneText = () => page.evaluate(() => window.__mobileSync.view.state.doc.toString());
check('phone shows file content (CRLF normalised)', (await phoneText()) === 'function hello() {\n  return 1;\n}\n');

// --- type on phone -> computer
await page.click('.cm-line:has-text("return 1;")');
await page.keyboard.press('End');
await page.keyboard.type(' // from phone');
check(
  'phone typing reaches computer, CRLF kept',
  await until(() => winDoc.getText() === 'function hello() {\r\n  return 1; // from phone\r\n}\r\n'),
  JSON.stringify(winDoc.getText())
);
check('computer doc is unsaved (dirty)', winDoc.isDirty && winDoc.saved !== winDoc.getText());
check('phone shows unsaved dot', await until(() => page.isVisible('#dirty')));

// --- newline on phone
await page.keyboard.press('Enter');
await page.keyboard.type('x++;');
check('newline from phone', await until(() => winDoc.getText().includes('// from phone\r\n  x++;\r\n}')), JSON.stringify(winDoc.getText()));

// --- computer -> phone
await pcInsert(winDoc, 0, 0, '// edited on PC\r\n');
check('PC edit appears on phone', await until(async () => (await phoneText()).startsWith('// edited on PC\nfunction hello()')));

// --- extra key bar
await page.locator('#keybar button', { hasText: '{' }).first().dispatchEvent('pointerdown');
check('key bar inserts symbol', await until(() => winDoc.getText().includes('x++;{')), JSON.stringify(winDoc.getText()));

// --- save from phone
await page.click('#save');
check('save from phone saves on computer', await until(() => !winDoc.isDirty && winDoc.saved === winDoc.getText()));
check('unsaved dot cleared', await until(async () => !(await page.isVisible('#dirty'))));

// --- stress: phone typing while the computer edits the same file
await page.click('.cm-line:has-text("x++;")');
await page.keyboard.press('End');
const typing = page.keyboard.type('abcdefghijklmnopqrstuvwxyz0123456789', { delay: 15 });
for (let i = 0; i < 5; i++) {
  await wait(60);
  await pcInsert(winDoc, 0, 0, `/*${i}*/`);
}
await typing;
const norm = (s) => s.replace(/\r\n/g, '\n');
const converged = await until(async () => (await phoneText()) === norm(winDoc.getText()), 6000);
check('phone and computer converge after simultaneous edits', converged, converged ? '' : JSON.stringify([await phoneText(), norm(winDoc.getText())]));
check('no phone keystrokes lost during the clash', winDoc.getText().includes('abcdefghijklmnopqrstuvwxyz0123456789'), JSON.stringify(winDoc.getText()));
for (let i = 0; i < 5; i++) check(`PC edit ${i} kept during the clash`, winDoc.getText().includes(`/*${i}*/`));

// --- heavier clash: PC types on the same line the phone is typing on
const typing2 = page.keyboard.type('PHONE_TYPING_ON_THE_SAME_LINE', { delay: 10 });
for (let i = 0; i < 8; i++) {
  await wait(25);
  const lines = winDoc.getText().split('\r\n');
  const li = lines.findIndex((l) => l.includes('abcdef'));
  await pcInsert(winDoc, li, 0, `[pc${i}]`);
}
await typing2;
const conv2 = await until(async () => (await phoneText()) === norm(winDoc.getText()), 6000);
check('converge when both type on the same line', conv2, conv2 ? '' : JSON.stringify([await phoneText(), norm(winDoc.getText())]));
check('same-line clash keeps phone text', winDoc.getText().includes('PHONE_TYPING_ON_THE_SAME_LINE'), JSON.stringify(winDoc.getText()));
check('same-line clash keeps PC text', [...Array(8).keys()].every((i) => winDoc.getText().includes(`[pc${i}]`)));

// --- lua file edit
await page.click('#menu');
await page.click('#pcTabs .file:has-text("main.lua")');
check('opened main.lua', await until(async () => (await page.textContent('#title')) === 'main.lua'));
await page.click('.cm-line:has-text("print(x)")');
await page.keyboard.press('End');
await page.keyboard.type(' -- hi');
check('edit second file (lua)', await until(() => luaDoc.getText() === 'local x = 1\nprint(x) -- hi\n'), JSON.stringify(luaDoc.getText()));

if (shots) {
  await page.screenshot({ path: path.join(shots, 'editor.png') });
  await page.click('#menu');
  await page.fill('#search', 'app');
  await wait(300);
  await page.screenshot({ path: path.join(shots, 'drawer.png') });
  await page.click('#scrim', { position: { x: 370, y: 300 } });
}

// --- reconnect after server restart keeps working
const port = server.port;
await server.close();
check('shows offline when computer stops', await until(() => page.$eval('#status', (e) => e.dataset.state === 'offline'), 8000));
const server2 = new SyncServer(vscode, { port, host: '127.0.0.1', token, mediaDir: path.join(root, 'media') });
await server2.listen();
check('reconnects automatically', await until(() => page.$eval('#status', (e) => e.dataset.state === 'online'), 15000));
await pcInsert(luaDoc, 0, 0, '-- after reconnect\n');
check('sync works after reconnect', await until(async () => (await phoneText()).startsWith('-- after reconnect')), JSON.stringify(await phoneText()));

// --- wrong key in the page shows the login screen
const page2 = await ctx.newPage();
await page2.goto(`${base}/#t=wrong`);
check('wrong key shows login screen', await until(() => page2.isVisible('#login')));

check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close();
await server2.close();
console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
