// Mobile Sync — edit the files open in Antigravity / VS Code from a phone browser.
// Everything stays on your own network: the extension runs a small HTTP server on
// this computer and the phone talks to it directly (or through your own VPS relay).
//
// Several windows: every window runs a private server; the first one also owns the public
// port and the VPS connection (the "hub") and forwards phone requests to the right window.
'use strict';

const vscode = require('vscode');
const os = require('os');
const crypto = require('crypto');
const { SyncServer } = require('./server');
const { HubServer, hubRequest, agentNonceFor } = require('./hub');
const { qrSvg } = require('./qr');
const { RelayClient, parseConnectString } = require('./relay');

const SECRET_KEY = 'mobileSync.token';
const RELAY_KEY = 'mobileSync.relay';
const RUNNING_KEY = 'mobileSync.running'; // remembered across reloads and new windows
const windowId = crypto.randomBytes(8).toString('hex');

let server = null; // this window's private server
let hub = null; // set when this window owns the public port
let relay = null; // only on the hub
let heartbeat = null;
let statusItem = null;
let ctx = null;
let starting = null;

function config() {
  const c = vscode.workspace.getConfiguration('mobileSync');
  return {
    port: c.get('port', 8765),
    host: c.get('host', '0.0.0.0'),
    notifyOnConnect: c.get('notifyOnConnect', true),
    allowCommands: c.get('allowCommands', true),
  };
}

async function getToken(context, reset = false) {
  let token = reset ? undefined : await context.secrets.get(SECRET_KEY);
  if (!token) {
    token = crypto.randomBytes(24).toString('base64url');
    await context.secrets.store(SECRET_KEY, token);
  }
  return token;
}

const running = () => !!(server && server.listening);

function windowInfo() {
  return {
    id: windowId,
    name: vscode.workspace.name || 'หน้าต่างว่าง (ยังไม่เปิดโฟลเดอร์)',
    folders: (vscode.workspace.workspaceFolders || []).map((f) => f.uri.fsPath),
    port: server.port,
  };
}

function updateStatus() {
  if (!statusItem) return;
  if (running()) {
    const n = server.clientCount();
    const vps = relay ? { online: ' · VPS ✓', connecting: ' · VPS …', offline: ' · VPS ✗', denied: ' · VPS ✗' }[relay.status] : '';
    const role = hub ? '' : ' (ร่วม)';
    statusItem.text = `$(device-mobile) Mobile Sync: ${n ? n + ' connected' : 'on'}${role}${vps}`;
    statusItem.tooltip = hub
      ? 'Mobile Sync กำลังทำงาน (หน้าต่างหลัก) — กดเพื่อเปิดเมนู'
      : 'Mobile Sync กำลังทำงาน (เข้าร่วมกับหน้าต่างหลัก) — กดเพื่อเปิดเมนู';
  } else {
    statusItem.text = '$(device-mobile) Mobile Sync: off';
    statusItem.tooltip = 'กดเพื่อเปิดเมนู Mobile Sync';
  }
  statusItem.command = 'mobileSync.menu';
  statusItem.show();
}

// ---------------------------------------------------------------- start / stop

async function start(context, { quiet = false } = {}) {
  if (running()) {
    if (!quiet) showLink();
    return;
  }
  if (starting) return starting;
  starting = (async () => {
    const cfg = config();
    const token = await getToken(context);
    server = new SyncServer(vscode, {
      port: 0,
      host: '127.0.0.1', // private; phones reach it through the hub
      token,
      allowCommands: cfg.allowCommands,
      agentNonce: agentNonceFor(token),
      mediaDir: vscode.Uri.joinPath(context.extensionUri, 'media').fsPath,
      onClientsChanged: (info) => {
        updateStatus();
        if (info && info.connected && config().notifyOnConnect) {
          vscode.window.showInformationMessage(
            `Mobile Sync: มีมือถือเชื่อมต่อเข้ามาจาก ${info.address} (ถ้าไม่ใช่คุณ ให้กด Stop แล้ว Reset Secret Key)`
          );
        }
      },
      onSuspicious: (address) => vscode.window.showWarningMessage(`Mobile Sync: บล็อก ${address} แล้ว เพราะใส่รหัสผิดหลายครั้ง`),
    });
    try {
      await server.listen();
    } catch (err) {
      server = null;
      vscode.window.showErrorMessage(`Mobile Sync: เปิดเซิร์ฟเวอร์ไม่ได้: ${err.message}`);
      return;
    }
    await context.globalState.update(RUNNING_KEY, true);
    const role = await joinOrLead(context);
    if (role === 'error') {
      await server.close();
      server = null;
      updateStatus();
      return;
    }
    heartbeat = setInterval(() => beat(context).catch(() => {}), 5000);
    updateStatus();
    if (!quiet) showLink();
  })();
  try {
    await starting;
  } finally {
    starting = null;
  }
}

async function beat(context) {
  // "Stop" in any window stops every window.
  if (!context.globalState.get(RUNNING_KEY, false)) {
    await shutdown();
    updateStatus();
    return;
  }
  await joinOrLead(context);
}

// Become the hub if the public port is free; otherwise register with the window that has it.
async function joinOrLead(context) {
  if (!running()) return 'error';
  const cfg = config();
  const token = await getToken(context);
  if (hub) {
    hub.register(windowInfo());
    return 'hub';
  }
  try {
    const r = await hubRequest(cfg.port, '/_hub/register', token, windowInfo());
    if (r.status === 200) return 'peer';
  } catch {}
  // No hub answered: try to become it.
  const h = new HubServer({
    host: cfg.host,
    port: cfg.port,
    token,
    ownId: windowId,
    mediaDir: vscode.Uri.joinPath(context.extensionUri, 'media').fsPath,
  });
  try {
    await h.listen();
  } catch (err) {
    if (err.code === 'EADDRINUSE') {
      let isOurs = false;
      try {
        isOurs = (await hubRequest(cfg.port, '/_hub/ping')).body?.mobileSync === true;
      } catch {}
      if (isOurs) return 'peer'; // another window is starting up; try again on the next beat
      vscode.window.showErrorMessage(
        `Mobile Sync: พอร์ต ${cfg.port} ถูกโปรแกรมอื่นใช้อยู่ ให้เปลี่ยน mobileSync.port ใน Settings`
      );
      return 'error';
    }
    vscode.window.showErrorMessage(`Mobile Sync: เปิดพอร์ต ${cfg.port} ไม่ได้: ${err.message}`);
    return 'error';
  }
  hub = h;
  hub.register(windowInfo());
  await startRelay(context);
  updateStatus();
  return 'hub';
}

async function startRelay(context) {
  if (relay) relay.stop();
  relay = null;
  const connect = await context.secrets.get(RELAY_KEY);
  if (!connect || !hub) return;
  const host = config().host;
  try {
    relay = new RelayClient({
      connect,
      localHost: !host || host === '0.0.0.0' || host === '::' ? '127.0.0.1' : host,
      localPort: hub.port,
      agentNonce: hub.nonce,
      onStatus: (st, detail) => {
        updateStatus();
        if (st === 'denied') vscode.window.showErrorMessage(`Mobile Sync: ต่อ VPS ไม่ได้ — ${detail}`);
      },
    });
  } catch (err) {
    vscode.window.showErrorMessage(`Mobile Sync: ข้อมูล VPS ที่บันทึกไว้ใช้ไม่ได้: ${err.message}`);
    return;
  }
  relay.start();
}

async function shutdown() {
  clearInterval(heartbeat);
  heartbeat = null;
  if (relay) relay.stop();
  relay = null;
  if (hub) await hub.close();
  else if (server && ctx) {
    try {
      await hubRequest(config().port, '/_hub/unregister', await getToken(ctx), { id: windowId });
    } catch {}
  }
  hub = null;
  if (server) await server.close();
  server = null;
}

async function stop(context) {
  await shutdown();
  await context.globalState.update(RUNNING_KEY, false);
  updateStatus();
  vscode.window.showInformationMessage('Mobile Sync: ปิดแล้ว (หน้าต่างอื่นจะหยุดตามภายในไม่กี่วินาที)');
}

async function connectRelay(context) {
  const value = await vscode.window.showInputBox({
    title: 'Mobile Sync: เชื่อมต่อผ่าน VPS',
    prompt: 'วางข้อความจากไฟล์ connect-string.txt บน VPS (ขึ้นต้นด้วย https://)',
    placeHolder: 'https://mycode.duckdns.org#key=...',
    password: true,
    ignoreFocusOut: true,
    validateInput: (v) => {
      try {
        parseConnectString(v);
        return null;
      } catch (err) {
        return err.message;
      }
    },
  });
  if (!value) return;
  await context.secrets.store(RELAY_KEY, value.trim());
  if (hub) {
    await startRelay(context);
    updateStatus();
    vscode.window.showInformationMessage('Mobile Sync: บันทึกแล้ว กำลังเชื่อมต่อ VPS…');
  } else if (running()) {
    vscode.window.showInformationMessage('Mobile Sync: บันทึกแล้ว หน้าต่างหลักจะใช้ค่านี้เมื่อเริ่มใหม่ครั้งถัดไป');
  } else {
    vscode.window.showInformationMessage('Mobile Sync: บันทึกแล้ว จะเชื่อมต่อ VPS เมื่อเริ่ม Mobile Sync');
  }
}

async function disconnectRelay(context) {
  await context.secrets.delete(RELAY_KEY);
  if (relay) relay.stop();
  relay = null;
  updateStatus();
  vscode.window.showInformationMessage('Mobile Sync: เลิกใช้ VPS แล้ว');
}

// ---------------------------------------------------------------- QR / links

function lanUrls(port, token, w) {
  const out = [];
  const host = config().host;
  const q = `#t=${encodeURIComponent(token)}&w=${w}`;
  if (host && host !== '0.0.0.0' && host !== '::') {
    if (!/^(127\.|localhost$|::1$)/.test(host)) out.push({ label: 'ที่อยู่', url: `http://${host}:${port}/${q}` });
    return out;
  }
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) {
      if ((a.family !== 'IPv4' && a.family !== 4) || a.internal) continue;
      const [x, y] = a.address.split('.').map(Number);
      const tailscale = x === 100 && y >= 64 && y <= 127;
      out.push({ label: tailscale ? 'Tailscale (ใช้นอกบ้านได้)' : 'Wi-Fi บ้าน (เครือข่ายเดียวกัน)', url: `http://${a.address}:${port}/${q}` });
    }
  }
  return out.sort((a) => (a.label.startsWith('Wi-Fi') ? -1 : 1));
}

let linkPanel = null;
async function showLink() {
  if (!running()) {
    vscode.window.showWarningMessage('Mobile Sync ยังไม่ได้เปิด — กดปุ่ม Mobile Sync ที่แถบล่าง แล้วเลือก "เริ่ม Mobile Sync"');
    return;
  }
  const token = await getToken(ctx);
  const urls = lanUrls(config().port, token, windowId);
  const connect = await ctx.secrets.get(RELAY_KEY);
  if (connect) {
    try {
      const cfg = parseConnectString(connect);
      urls.unshift({
        label: cfg.pin ? 'ผ่าน VPS (ใช้ได้ทุกที่ — มือถือจะเตือนเรื่องใบรับรอง ให้กดดำเนินการต่อ)' : 'ผ่าน VPS (ใช้ได้ทุกที่)',
        url: `${cfg.origin}/#t=${encodeURIComponent(token)}&w=${windowId}`,
        note: !hub ? '' : relay && relay.status === 'online' ? '' : 'ตอนนี้ยังต่อ VPS ไม่ติด',
      });
    } catch {}
  }
  if (!urls.length) {
    vscode.window.showWarningMessage('Mobile Sync: ไม่พบที่อยู่เครือข่าย คอมต่อ Wi-Fi อยู่หรือเปล่า?');
    return;
  }
  if (linkPanel) linkPanel.reveal();
  else {
    linkPanel = vscode.window.createWebviewPanel('mobileSyncLink', 'Mobile Sync', vscode.ViewColumn.Active, { enableScripts: false });
    linkPanel.onDidDispose(() => (linkPanel = null));
  }
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const items = urls
    .map(
      (u) => `<section>
  <h2>${esc(u.label)}</h2>${u.note ? `<p class="warn">${esc(u.note)}</p>` : ''}
  <div class="qr">${qrSvg(u.url)}</div>
  <code>${esc(u.url)}</code>
</section>`
    )
    .join('\n');
  linkPanel.webview.html = `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
<style>
 body{font-family:var(--vscode-font-family);padding:16px;color:var(--vscode-foreground)}
 section{display:inline-block;vertical-align:top;margin:0 24px 24px 0;max-width:320px}
 .qr{background:#fff;padding:12px;border-radius:8px;width:260px;height:260px}
 .qr svg{width:100%;height:100%}
 code{display:block;word-break:break-all;margin-top:8px;user-select:all}
 .warn{color:var(--vscode-editorWarning-foreground)}
</style></head><body>
<h1>สแกน QR ด้วยกล้องมือถือ</h1>
<p>ลิงก์นี้จะเปิดโปรเจกต์ <b>${esc(windowInfo().name)}</b> บนมือถือ (สลับไปหน้าต่างอื่นได้ในมือถือ)</p>
<p class="warn">⚠ ลิงก์นี้มีรหัสลับอยู่ข้างใน ห้ามส่งให้ใครหรือโพสต์ที่ไหน
 ถ้าหลุด ให้สั่ง <b>Mobile Sync: Reset Secret Key</b></p>
${items}
</body></html>`;
}

// One touch-friendly menu for everything (handy over remote desktop, no shortcuts needed).
async function menu(context) {
  const hasRelay = !!(await context.secrets.get(RELAY_KEY));
  const items = [];
  if (!running()) items.push({ label: '$(play) เริ่ม Mobile Sync', run: () => start(context) });
  else {
    items.push({ label: '$(device-mobile) แสดง QR / ลิงก์สำหรับมือถือ', run: () => showLink() });
    items.push({ label: '$(debug-stop) หยุด Mobile Sync', run: () => stop(context) });
  }
  items.push({
    label: hasRelay ? '$(globe) เปลี่ยนข้อความเชื่อมต่อ VPS' : '$(globe) เชื่อมต่อผ่าน VPS (วางข้อความจาก VPS)',
    run: () => connectRelay(context),
  });
  if (hasRelay) items.push({ label: '$(close) เลิกใช้ VPS', run: () => disconnectRelay(context) });
  items.push({ label: '$(key) สร้างรหัสลับใหม่ (ลิงก์/QR เก่าใช้ไม่ได้)', run: () => vscode.commands.executeCommand('mobileSync.resetToken') });
  const pick = await vscode.window.showQuickPick(items, { title: 'Mobile Sync', placeHolder: 'เลือกคำสั่ง' });
  if (pick) await pick.run();
}

function activate(context) {
  ctx = context;
  statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  context.subscriptions.push(statusItem);
  updateStatus();

  context.subscriptions.push(
    vscode.commands.registerCommand('mobileSync.start', () => start(context)),
    vscode.commands.registerCommand('mobileSync.stop', () => stop(context)),
    vscode.commands.registerCommand('mobileSync.showLink', () => showLink()),
    vscode.commands.registerCommand('mobileSync.menu', () => menu(context)),
    vscode.commands.registerCommand('mobileSync.connectRelay', () => connectRelay(context)),
    vscode.commands.registerCommand('mobileSync.disconnectRelay', () => disconnectRelay(context)),
    vscode.commands.registerCommand('mobileSync.resetToken', async () => {
      const was = running();
      if (was) await stop(context);
      await getToken(context, true);
      vscode.window.showInformationMessage('Mobile Sync: สร้างรหัสใหม่แล้ว ลิงก์/QR เดิมใช้ไม่ได้อีก');
      if (was) await start(context);
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(() => running() && joinOrLead(context).catch(() => {})),
    { dispose: () => shutdown() }
  );

  // Keep running across window reloads (e.g. after opening another folder from the phone)
  // and in new windows, until "Stop" is chosen.
  const auto = context.globalState.get(RUNNING_KEY, false) || vscode.workspace.getConfiguration('mobileSync').get('autoStart', false);
  if (auto) start(context, { quiet: true });
}

function deactivate() {
  return shutdown();
}

module.exports = { activate, deactivate };
