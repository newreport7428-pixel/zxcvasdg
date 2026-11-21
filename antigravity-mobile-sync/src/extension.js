// Mobile Sync — edit the files open in Antigravity / VS Code from a phone browser.
// Everything stays on your own network: the extension runs a small HTTP server on
// this computer and the phone talks to it directly. No third-party servers.
'use strict';

const vscode = require('vscode');
const { SyncServer } = require('./server');
const { qrSvg } = require('./qr');

const SECRET_KEY = 'mobileSync.token';
let server = null;
let statusItem = null;

function config() {
  const c = vscode.workspace.getConfiguration('mobileSync');
  return {
    port: c.get('port', 8765),
    host: c.get('host', '0.0.0.0'),
    notifyOnConnect: c.get('notifyOnConnect', true),
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
    statusItem.text = `$(device-mobile) Mobile Sync: ${n ? n + ' connected' : 'on'}`;
    statusItem.tooltip = 'Mobile Sync is running — click for QR code / link';
    statusItem.command = 'mobileSync.showLink';
  } else {
    statusItem.text = '$(device-mobile) Mobile Sync: off';
    statusItem.tooltip = 'Click to start Mobile Sync';
    statusItem.command = 'mobileSync.start';
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
  updateStatus();
  showLink();
}

async function stop() {
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
  const urls = server.urls();
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
  <h2>${esc(u.label)}</h2>
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

function activate(context) {
  statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  context.subscriptions.push(statusItem);
  updateStatus();

  context.subscriptions.push(
    vscode.commands.registerCommand('mobileSync.start', () => start(context)),
    vscode.commands.registerCommand('mobileSync.stop', () => stop()),
    vscode.commands.registerCommand('mobileSync.showLink', () => showLink()),
    vscode.commands.registerCommand('mobileSync.resetToken', async () => {
      const wasRunning = server && server.listening;
      if (wasRunning) await stop();
      await getToken(context, true);
      vscode.window.showInformationMessage('Mobile Sync: สร้างรหัสใหม่แล้ว ลิงก์/QR เดิมใช้ไม่ได้อีก');
      if (wasRunning) await start(context);
    }),
    { dispose: () => server && server.close() }
  );

  if (vscode.workspace.getConfiguration('mobileSync').get('autoStart', false)) {
    start(context);
  }
}

function deactivate() {
  if (server) return server.close();
}

module.exports = { activate, deactivate };
