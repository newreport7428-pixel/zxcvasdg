// Several Antigravity windows at once: each window is a separate process running the built
// extension. Checks the hub (first window), joining, switching from the phone, opening and
// adding folders from the phone, hub take-over when the main window closes, and Stop.
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fork } from 'child_process';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const here = path.dirname(fileURLToPath(import.meta.url));
const shots = process.env.SHOTS || '';
let failed = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
  if (!ok) failed++;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      if (await fn()) return true;
    } catch {}
    await wait(100);
  }
  return false;
}

const PORT = 18765;
const token = 'multi-window-token-123456';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ms-win-'));
const shared = path.join(tmp, 'shared');
fs.mkdirSync(shared);
fs.writeFileSync(path.join(shared, 'secrets.json'), JSON.stringify({ 'mobileSync.token': token }));
fs.writeFileSync(path.join(shared, 'global.json'), '{}');
const proj = (name, file, text) => {
  const dir = path.join(tmp, 'projects', name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, file), text);
  return dir;
};
const A = proj('alpha', 'a.txt', 'alpha file\n');
const B = proj('beta', 'b.txt', 'beta file\n');
const C = proj('gamma', 'c.txt', 'gamma file\n');
const D = proj('delta', 'd.txt', 'delta file\n');
const E = proj('epsilon', 'e.txt', 'epsilon file\n');

const wins = new Map(); // folder -> { proc, events }
let reqId = 0;
function openWindow(folder) {
  const proc = fork(path.join(here, 'window-harness.cjs'), [], {
    env: { ...process.env, SHARED: shared, PORT: String(PORT), FOLDER: folder, RECENT: D },
    stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
  });
  const w = { proc, folder, status: '', errors: [] };
  proc.on('message', (m) => {
    if (m.type === 'status') w.status = m.text;
    if (m.type === 'error') w.errors.push(m.m);
    if (m.type === 'openFolder') {
      // what Antigravity does: open a new window, or reload this one with the other folder
      if (m.newWindow) openWindow(m.path);
      else closeWindow(folder).then(() => openWindow(m.path));
    }
  });
  wins.set(folder, w);
  return w;
}
async function closeWindow(folder) {
  const w = wins.get(folder);
  if (!w) return;
  wins.delete(folder);
  w.proc.send({ type: 'exit' });
  await new Promise((r) => w.proc.once('exit', r));
}
function docText(folder, file) {
  const w = wins.get(folder);
  const id = ++reqId;
  return new Promise((resolve) => {
    const on = (m) => {
      if (m.type === 'text' && m.id === id) {
        w.proc.off('message', on);
        resolve(m.text);
      }
    };
    w.proc.on('message', on);
    w.proc.send({ type: 'text', id, path: path.join(folder, file) });
  });
}
const base = `http://127.0.0.1:${PORT}`;
const listWindows = async () => (await (await fetch(`${base}/api/windows`, { headers: { 'X-Token': token } })).json()).windows || [];

// --- 1) first window becomes the hub; a second window joins by itself
const wa = openWindow(A);
await until(() => wa.status.includes('off'));
wa.proc.send({ type: 'cmd', id: 'mobileSync.start' });
check('first window starts and owns the port', await until(async () => (await listWindows()).length === 1));
const wb = openWindow(B); // Mobile Sync was left running, so a new window joins automatically
check('second window joins automatically', await until(async () => (await listWindows()).length === 2), JSON.stringify(await listWindows().catch(() => [])));
check('second window shows it joined', await until(() => wb.status.includes('(ร่วม)')), wb.status);
const ws1 = await listWindows();
const idB = ws1.find((w) => w.folders[0] === B).id;
const idA = ws1.find((w) => w.folders[0] === A).id;
check('wrong key cannot list windows', (await fetch(`${base}/api/windows`, { headers: { 'X-Token': 'nope' } })).status === 401);

// --- 2) phone opens the window whose QR was scanned, edits it, then switches window
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const phoneText = () => page.evaluate(() => window.__mobileSync.view.state.doc.toString());
const openView = async (name) => {
  if (!(await page.$eval('#side', (e) => e.classList.contains('open')))) await page.click('#menu');
  if (!(await page.isVisible(`.view[data-view=${name}]`))) await page.click(`#activity [data-view=${name}]`);
};
await page.goto(`${base}/#t=${token}&w=${idB}`);
check('phone online', await until(() => page.$eval('#status', (e) => e.dataset.state === 'online')));
check('phone opens the scanned window (beta)', await until(async () => (await page.textContent('#title')) === 'b.txt'));
await page.click('.cm-line:has-text("beta file")');
await page.keyboard.press('End');
await page.keyboard.type(' +phone');
check('edit reaches the beta window', await until(async () => (await docText(B, 'b.txt')) === 'beta file +phone\n'));

await openView('explorer');
check('explorer shows project name', await until(async () => (await page.textContent('#projBtn')).includes('beta')));
await page.click('#projBtn');
check('project sheet lists both windows', await until(async () => (await page.$$('#projBody .file.proj')).length >= 2));
if (shots) await page.screenshot({ path: path.join(shots, 'projects.png') });
await page.click('#projBody .file.proj:has-text("alpha")');
check('switching to alpha shows alpha files', await until(() => page.isVisible('#tree .node.leaf:has-text("a.txt")')) || (await until(async () => (await page.textContent('#title')) === 'a.txt', 1000)));
await openView('explorer');
await page.click('#tree .node.leaf:has-text("a.txt")');
check('alpha file opens', await until(async () => (await page.textContent('#title')) === 'a.txt'));
await page.click('.cm-line:has-text("alpha file")');
await page.keyboard.press('End');
await page.keyboard.type(' +alpha');
check('edit reaches the alpha window only', await until(async () => (await docText(A, 'a.txt')) === 'alpha file +alpha\n'));
check('beta window untouched by alpha edit', (await docText(B, 'b.txt')) === 'beta file +phone\n');

// --- 3) open another folder in a NEW window from the phone (folder browser)
await openView('explorer');
await page.click('#projBtn');
await page.click('#projBody .extCmd:has-text("หน้าต่างใหม่")');
check('folder browser shows sibling projects', await until(() => page.isVisible('#browseList .node:has-text("gamma")')), await page.textContent('#browsePath'));
if (shots) await page.screenshot({ path: path.join(shots, 'browse.png') });
await page.click('#browseList .node:has-text("gamma")');
check('browser enters the folder', await until(async () => (await page.textContent('#browsePath')).endsWith('gamma')));
await page.click('#browseGo');
check('a new window opens on the computer', await until(async () => (await listWindows()).some((w) => w.folders[0] === C), 15000));
check('phone switches to the new window', await until(async () => (await page.textContent('#projBtn')).includes('gamma'), 15000), await page.textContent('#projBtn'));
await openView('explorer');
check('new window files shown', await until(() => page.isVisible('#tree .node.leaf:has-text("c.txt")')));

// --- 4) add a folder to this window (several projects in one window)
await page.click('#projBtn');
await page.click('#projBody .extCmd:has-text("เพิ่มโฟลเดอร์")');
await until(() => page.isVisible('#browseList .node:has-text("epsilon")'));
await page.click('#browseList .node:has-text("epsilon")');
await until(async () => (await page.textContent('#browsePath')).endsWith('epsilon'));
await page.click('#browseGo');
check('added folder appears in the tree', await until(() => page.isVisible('#tree .node.folder:has-text("epsilon")'), 10000));
check('window now has two folders', await until(async () => (await listWindows()).find((w) => w.folders[0] === C)?.folders.length === 2));

// --- 5) the main (hub) window closes: another window takes over, phone keeps working
await page.click('#tree .node.leaf:has-text("c.txt")').catch(async () => {
  await openView('explorer');
  await page.click('#tree .node.leaf:has-text("c.txt")');
});
await until(async () => (await page.textContent('#title')) === 'c.txt');
await closeWindow(A);
check('another window takes over as main', await until(async () => (await listWindows()).length === 2, 20000), JSON.stringify(await listWindows().catch(() => 'down')));
check('phone reconnects after take-over', await until(() => page.$eval('#status', (e) => e.dataset.state === 'online'), 20000));
await until(async () => (await page.textContent('#title')) === 'c.txt', 10000);
await page.click('.cm-line:has-text("gamma file")');
await page.keyboard.press('End');
await page.keyboard.type(' +after');
check('editing works after take-over', await until(async () => (await docText(C, 'c.txt')) === 'gamma file +after\n', 10000), String(await docText(C, 'c.txt')));

// --- 6) open a folder IN PLACE of this window (window reloads): phone follows
await openView('explorer');
await page.click('#projBtn');
check('recent projects listed', await until(() => page.isVisible('#projBody .file.proj:has-text("delta")')));
await page.click('#projBody .file.proj:has-text("delta") .mini:has-text("แทนที่")');
check('window reloads with the new folder', await until(async () => (await listWindows()).some((w) => w.folders[0] === D) && !(await listWindows()).some((w) => w.folders[0] === C), 20000));
check('phone follows to the replaced window', await until(async () => (await page.textContent('#projBtn')).includes('delta'), 20000), await page.textContent('#projBtn'));

// --- 7) Stop in one window stops all of them
const any = [...wins.values()][0];
any.proc.send({ type: 'cmd', id: 'mobileSync.stop' });
check('stop in one window stops every window', await until(async () => {
  try {
    await fetch(`${base}/api/windows`, { headers: { 'X-Token': token } });
    return false;
  } catch {
    return true;
  }
}, 15000));
check('no extension errors', [...wins.values()].every((w) => !w.errors.length), [...wins.values()].flatMap((w) => w.errors).join(' | '));
check('no page errors', errors.length === 0, errors.join(' | '));

await browser.close();
for (const f of [...wins.keys()]) await closeWindow(f);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
