// End-to-end test: fake editor on the "computer" + real phone-sized browser.
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const { SyncServer } = require('../src/server.js');
const { vscode, addDoc, pcInsert, setDiagnostics } = require('./mock-vscode.js');

// A fake "SFTP" extension installed on the computer: uploads on save + an upload command.
const uploads = [];
vscode.workspace.onDidSaveTextDocument((d) => uploads.push(['on-save', d.uri.path.split('/').pop()]));
vscode.commands.registerCommand('sftp.upload.activeFile', () =>
  uploads.push(['command', vscode.window.activeTextEditor.document.uri.path.split('/').pop()])
);
vscode.extensions.all.push({
  id: 'Natizyskunk.sftp',
  packageJSON: {
    displayName: 'SFTP',
    contributes: {
      commands: [
        { command: 'sftp.upload.activeFile', title: 'Upload Active File', category: 'SFTP' },
        { command: 'sftp.internal', title: 'Internal Thing', category: 'SFTP' },
      ],
      menus: { commandPalette: [{ command: 'sftp.internal', when: 'false' }] },
    },
  },
});

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

// --- installed extensions keep working
uploads.length = 0;
await page.keyboard.type(' -- upload me');
await page.click('#save');
check('save from phone triggers SFTP upload-on-save', await until(() => uploads.some(([k, f]) => k === 'on-save' && f === 'main.lua')), JSON.stringify(uploads));

await page.click('#cmd');
await page.fill('#cmdSearch', 'sftp upload');
check('extension commands listed on phone', await until(() => page.isVisible('#cmdList .file:has-text("SFTP: Upload Active File")')));
check('hidden extension commands not listed', !(await page.isVisible('#cmdList .file:has-text("Internal Thing")')));
if (shots) await page.screenshot({ path: path.join(shots, 'commands.png') });
await page.click('#cmdList .file:has-text("SFTP: Upload Active File")');
check('phone runs extension command on the phone\'s file', await until(() => uploads.some(([k, f]) => k === 'command' && f === 'main.lua')), JSON.stringify(uploads));
check('command result shown', await until(async () => (await page.textContent('#toast')).includes('รันแล้ว')));

setDiagnostics(luaDoc, [
  { range: [1, 0, 1, 5], severity: 0, message: "undefined global 'print'", source: 'Lua' },
  { range: [0, 6, 0, 7], severity: 1, message: 'unused local x', source: 'Lua' },
]);
check('problems from extensions underlined on phone', await until(() => page.isVisible('.cm-lintRange-error')));
check('problem count shown', await until(async () => (await page.textContent('#problems')) === '✖1 ⚠1'));
await page.click('#problems');
check('problem list opens', await until(() => page.isVisible('.cm-panel-lint')));
if (shots) await page.screenshot({ path: path.join(shots, 'problems.png') });
await page.keyboard.press('Escape');

// --- IDE-like side bar: Explorer tree, Search, Extensions, Problems, status bar
const openView = async (name) => {
  if (!(await page.$eval('#side', (e) => e.classList.contains('open')))) await page.click('#menu');
  await page.click(`#activity [data-view=${name}]`);
};
await openView('explorer');
check('explorer shows workspace folder tree', await until(() => page.isVisible('#tree .node.folder:has-text("src")')));
check('explorer shows workspace name', (await page.textContent('#wsName')) === 'PROJ');
await page.click('#collapseAll');
check('collapse all hides files inside folders', await until(async () => !(await page.isVisible('#tree .node.leaf:has-text("app.js")'))));
await page.click('#tree .node.folder:has-text("src")');
check('tapping a folder expands it', await until(() => page.isVisible('#tree .node.leaf:has-text("app.js")')));
if (shots) await page.screenshot({ path: path.join(shots, 'explorer.png') });
await page.click('#tree .node.leaf:has-text("app.js")');
check('tapping a file in the tree opens it', await until(async () => (await page.textContent('#title')) === 'app.js'));
check('side bar closes after opening a file on a phone', await until(async () => !(await page.$eval('#side', (e) => e.classList.contains('open')))));

await openView('search');
await page.fill('#search', 'return 1');
check('text search finds matches in files', await until(() => page.isVisible('#results .node.match')), await page.textContent('#searchInfo'));
if (shots) await page.screenshot({ path: path.join(shots, 'search.png') });
await page.click('#results .node.match');
const expectLine = (await phoneText()).split('\n').findIndex((l) => l.includes('return 1')) + 1;
check('tapping a result jumps to that line', await until(async () => (await page.textContent('#sbPos')).startsWith(`Ln ${expectLine},`)), await page.textContent('#sbPos'));
check('status bar shows language', (await page.textContent('#sbLang')) === 'JavaScript');

await openView('extensions');
check('extensions view lists installed extensions', await until(() => page.isVisible('#extList .ext:has-text("SFTP")')));
await page.click('#extList .ext:has-text("SFTP")');
check('extension shows its commands', await until(() => page.isVisible('.extCmd:has-text("Upload Active File")')));
if (shots) await page.screenshot({ path: path.join(shots, 'extensions.png') });
uploads.length = 0;
await page.click('.extCmd:has-text("Upload Active File")');
check('run extension command from Extensions view', await until(() => uploads.some(([k, f]) => k === 'command' && f === 'app.js')), JSON.stringify(uploads));

await openView('problems');
check('problems view lists workspace problems', await until(() => page.isVisible('#probList .problem:has-text("undefined global")')));
check('status bar shows problem totals', await until(async () => (await page.textContent('#sbProblems')).includes('✖ 1')), await page.textContent('#sbProblems'));
if (shots) await page.screenshot({ path: path.join(shots, 'problems-view.png') });
await page.click('#probList .problem:has-text("undefined global")');
check('tapping a problem opens the file there', await until(async () => (await page.textContent('#title')) === 'main.lua' && (await page.textContent('#sbPos')).startsWith('Ln 2,')), await page.textContent('#sbPos'));
if (shots) await page.screenshot({ path: path.join(shots, 'editor.png') });
if (shots) {
  // tablet / landscape: side bar docked next to the editor, like the desktop IDE
  const tab = await browser.newContext({ ...devices['iPad Pro 11 landscape'] });
  const tp = await tab.newPage();
  await tp.goto(`${base}/#t=${token}`);
  await until(() => tp.$eval('#status', (e) => e.dataset.state === 'online'));
  if (!(await tp.isVisible('#tree'))) await tp.click('#activity [data-view=explorer]');
  check('tablet: side bar docked next to the editor', await until(() => tp.isVisible('#tree .node')));
  await tp.click('#tree .node.leaf:has-text("main.lua")').catch(() => {});
  await wait(600);
  await tp.screenshot({ path: path.join(shots, 'tablet.png') });
  await tab.close();
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

// --- computer edits that land while the phone is reloading a file are not lost
await page.route('**/api/open', async (route) => {
  const resp = await route.fetch(); // the computer has answered...
  await wait(500); // ...but the answer reaches the phone late
  await route.fulfill({ response: resp });
});
const luaUri = luaDoc.uri.toString();
page.evaluate((u) => window.__mobileSync.resync(u), luaUri);
await wait(150);
await pcInsert(luaDoc, 0, 0, '-- typed during reload\n');
check('PC edit during phone reload is kept', await until(async () => (await phoneText()).startsWith('-- typed during reload\n-- after reconnect')), JSON.stringify(await phoneText()));

const lateDoc = addDoc('/proj/late.txt', 'first line\n', 'plaintext');
await openView('explorer');
await page.click('#pcTabs .file:has-text("late.txt")');
await wait(150);
await pcInsert(lateDoc, 0, 0, 'typed while opening\n');
check('PC edit while phone opens a file is kept', await until(async () => (await phoneText()) === 'typed while opening\nfirst line\n'), JSON.stringify(await phoneText()));
await page.unroute('**/api/open');

// --- wrong key in the page shows the login screen
const page2 = await ctx.newPage();
await page2.goto(`${base}/#t=wrong`);
check('wrong key shows login screen', await until(() => page2.isVisible('#login')));

check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close();
await server2.close();
console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
