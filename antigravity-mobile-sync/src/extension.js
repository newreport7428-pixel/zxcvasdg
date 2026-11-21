// Mobile Sync — edit the files open in Antigravity / VS Code from a phone browser.
// Everything stays on your own network: the extension runs a small HTTP server on
// this computer and the phone talks to it directly. No third-party servers.
'use strict';

const vscode = require('vscode');
const { SyncServer } = require('./server');
const { qrSvg } = require('./qr');
const { RelayClient, parseConnectString } = require('./relay');

const SECRET_KEY = 'mobileSync.token';
const RELAY_KEY = 'mobileSync.relay';
let server = null;
let relay = null;
let statusItem = null;

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
    token = require('crypto').randomBytes(24).toString('base64url');
    await context.secrets.store(SECRET_KEY, token);
  }
  return token;
}

function updateStatus() {
  if (!statusItem) return;
  if (server && server.listening) {
    const n = server.clientCount();
    const vps = relay ? { online: ' · VPS ✓', connecting: ' · VPS …', offline: ' · VPS ✗', denied: ' · VPS ✗' }[relay.status] : '';
    statusItem.text = `$(device-mobile) Mobile Sync: ${n ? n + ' connected' : 'on'}${vps}`;
    statusItem.tooltip = 'Mobile Sync กำลังทำงาน — กดเพื่อเปิดเมนู';
    statusItem.command = 'mobileSync.menu';
  } else {
    statusItem.text = '$(device-mobile) Mobile Sync: off';
    statusItem.tooltip = 'กดเพื่อเปิดเมนู Mobile Sync';
    statusItem.command = 'mobileSync.menu';
  }
  statusItem.show();
}

async function start(context) {
  if (server && server.listening) {
    showLink();
    return;
  }
  const cfg = config();
  const token = await getToken(context);
  server = new SyncServer(vscode, {
    port: cfg.port,
    host: cfg.host,
    token,
    allowCommands: cfg.allowCommands,
    agentNonce: require('crypto').randomBytes(24).toString('base64url'),
    mediaDir: vscode.Uri.joinPath(context.extensionUri, 'media').fsPath,
    onClientsChanged: (info) => {
      updateStatus();
      if (info && info.connected && config().notifyOnConnect) {
        vscode.window.showInformationMessage(`Mobile Sync: มีมือถือเชื่อมต่อเข้ามาจาก ${info.address} (ถ้าไม่ใช่คุณ ให้กด Stop แล้ว Reset Secret Key)`);
      }
    },
    onSuspicious: (address) => {
      vscode.window.showWarningMessage(
        `Mobile Sync: บล็อก ${address} แล้ว เพราะใส่รหัสผิดหลายครั้ง`
      );
    },
  });
  try {
    await server.listen();
  } catch (err) {
    server = null;
    vscode.window.showErrorMessage(`Mobile Sync: เปิดเซิร์ฟเวอร์ไม่ได้: ${err.message} (ถ้าพอร์ตชน ให้เปลี่ยน mobileSync.port ใน Settings)`);
    updateStatus();
    return;
  }
  await startRelay(context);
  updateStatus();
  showLink();
}

async function startRelay(context) {
  if (relay) relay.stop();
  relay = null;
  const connect = await context.secrets.get(RELAY_KEY);
  if (!connect || !server || !server.listening) return;
  const host = server.opts.host;
  try {
    relay = new RelayClient({
      connect,
      localHost: !host || host === '0.0.0.0' || host === '::' ? '127.0.0.1' : host,
      localPort: server.port,
      agentNonce: server.opts.agentNonce,
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
  if (server && server.listening) {
    await startRelay(context);
    updateStatus();
    vscode.window.showInformationMessage('Mobile Sync: บันทึกแล้ว กำลังเชื่อมต่อ VPS…');
  } else {
    vscode.window.showInformationMessage('Mobile Sync: บันทึกแล้ว จะเชื่อมต่อ VPS เมื่อสั่ง Start');
  }
}

async function disconnectRelay(context) {
  await context.secrets.delete(RELAY_KEY);
  if (relay) relay.stop();
  relay = null;
  updateStatus();
  vscode.window.showInformationMessage('Mobile Sync: เลิกใช้ VPS แล้ว');
}

async function stop() {
  if (relay) relay.stop();
  relay = null;
  if (server) {
    await server.close();
    server = null;
  }
  updateStatus();
  vscode.window.showInformationMessage('Mobile Sync: ปิดแล้ว มือถือถูกตัดการเชื่อมต่อ');
}

let linkPanel = null;
function showLink() {
  if (!server || !server.listening) {
    vscode.window.showWarningMessage('Mobile Sync ยังไม่ได้เปิด — สั่ง "Mobile Sync: Start" ก่อน');
    return;
  }
  const urls = server.urls().filter((u) => !/\/\/(127\.|localhost|\[::1\])/.test(u.url));
  if (relay) {
    urls.unshift({
      label: relay.cfg.pin ? 'ผ่าน VPS (ใช้ได้ทุกที่ — มือถือจะเตือนเรื่องใบรับรอง ให้กดดำเนินการต่อ)' : 'ผ่าน VPS (ใช้ได้ทุกที่)',
      url: `${relay.origin}/#t=${encodeURIComponent(server.opts.token)}`,
      note: relay.status === 'online' ? '' : 'ตอนนี้ยังต่อ VPS ไม่ติด',
    });
  }
  if (!urls.length) {
    vscode.window.showWarningMessage('Mobile Sync: ไม่พบที่อยู่เครือข่าย คอมต่อ Wi-Fi อยู่หรือเปล่า?');
    return;
  }
  if (linkPanel) {
    linkPanel.reveal();
  } else {
    linkPanel = vscode.window.createWebviewPanel('mobileSyncLink', 'Mobile Sync', vscode.ViewColumn.Active, {
      enableScripts: false,
    });
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
<p>มือถือต้องต่อ Wi-Fi วงเดียวกับคอม หรือทั้งสองเครื่องเปิด Tailscale ไว้</p>
<p class="warn">⚠ ลิงก์นี้มีรหัสลับอยู่ข้างใน ห้ามส่งให้ใครหรือโพสต์ที่ไหน
 ถ้าหลุด ให้สั่ง <b>Mobile Sync: Reset Secret Key</b></p>
${items}
</body></html>`;
}

// One touch-friendly menu for everything (handy over remote desktop, no shortcuts needed).
async function menu(context) {
  const running = server && server.listening;
  const hasRelay = !!(await context.secrets.get(RELAY_KEY));
  const items = [];
  if (!running) items.push({ label: '$(play) เริ่ม Mobile Sync', run: () => start(context) });
  else {
    items.push({ label: '$(device-mobile) แสดง QR / ลิงก์สำหรับมือถือ', run: () => showLink() });
    items.push({ label: '$(debug-stop) หยุด Mobile Sync', run: () => stop() });
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
  statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  context.subscriptions.push(statusItem);
  updateStatus();

  context.subscriptions.push(
    vscode.commands.registerCommand('mobileSync.start', () => start(context)),
    vscode.commands.registerCommand('mobileSync.stop', () => stop()),
    vscode.commands.registerCommand('mobileSync.showLink', () => showLink()),
    vscode.commands.registerCommand('mobileSync.menu', () => menu(context)),
    vscode.commands.registerCommand('mobileSync.connectRelay', () => connectRelay(context)),
    vscode.commands.registerCommand('mobileSync.disconnectRelay', () => disconnectRelay(context)),
    vscode.commands.registerCommand('mobileSync.resetToken', async () => {
      const wasRunning = server && server.listening;
      if (wasRunning) await stop();
      await getToken(context, true);
      vscode.window.showInformationMessage('Mobile Sync: สร้างรหัสใหม่แล้ว ลิงก์/QR เดิมใช้ไม่ได้อีก');
      if (wasRunning) await start(context);
    }),
    { dispose: () => (relay && relay.stop(), server && server.close()) }
  );

  if (vscode.workspace.getConfiguration('mobileSync').get('autoStart', false)) {
    start(context);
  }
}

function deactivate() {
  if (relay) relay.stop();
  if (server) return server.close();
}

module.exports = { activate, deactivate };
