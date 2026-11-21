'use strict';
// HTTP + Server-Sent-Events server that mirrors open text documents to a phone.
// It takes the `vscode` API as a parameter so it can be tested with a mock.

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { ChangeSet, Text } = require('@codemirror/state');

const STATIC = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/app.css': ['app.css', 'text/css; charset=utf-8'],
  '/icon.svg': ['icon.svg', 'image/svg+xml'],
  '/manifest.webmanifest': ['manifest.webmanifest', 'application/manifest+json'],
};

const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

const MAX_BODY = 10 * 1024 * 1024; // 10 MB
const MAX_DOC_CHARS = 5 * 1024 * 1024;
const MAX_FAILS = 10;
const BLOCK_MS = 15 * 60 * 1000;
const HISTORY = 500; // change sets kept per file to rebase late phone edits
const FILE_EXCLUDE = '**/{node_modules,.git,dist,out,build,.next,.nuxt,.venv,venv,__pycache__,target,.gradle,Pods}/**';

const normalize = (s) => s.replace(/\r\n?/g, '\n');
const toText = (s) => Text.of(normalize(s).split('\n'));
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();

class SyncServer {
  constructor(vscode, opts) {
    this.vscode = vscode;
    this.opts = opts;
    this.clients = new Map(); // id -> { res, address }
    this.watched = new Map(); // uri -> { version, shadow: Text (LF-normalised copy), history: [{ version, changes }] }
    this.pendingOrigin = new Map(); // uri -> clientId while applying a phone edit
    this.fails = new Map(); // address -> { count, until, warned }
    this.disposables = [];
    this.listening = false;
    this.tokenHash = sha(opts.token);
    this.http = http.createServer((req, res) => this.handle(req, res).catch((err) => this.fail(res, 500, err.message)));
  }

  // ---------- lifecycle ----------

  listen() {
    return new Promise((resolve, reject) => {
      this.http.once('error', reject);
      this.http.listen(this.opts.port, this.opts.host, () => {
        this.http.off('error', reject);
        this.listening = true;
        this.port = this.http.address().port;
        this.hookEvents();
        this.keepAlive = setInterval(() => this.broadcastRaw(': ping\n\n'), 20000);
        resolve();
      });
    });
  }

  close() {
    this.listening = false;
    clearInterval(this.keepAlive);
    for (const d of this.disposables) d.dispose();
    this.disposables = [];
    for (const c of this.clients.values()) c.res.end();
    this.clients.clear();
    return new Promise((resolve) => this.http.close(() => resolve()));
  }

  clientCount() {
    return this.clients.size;
  }

  urls() {
    const out = [];
    const host = this.opts.host;
    const addTo = (ip, label) =>
      out.push({ label, url: `http://${ip}:${this.port}/#t=${encodeURIComponent(this.opts.token)}` });
    if (host && host !== '0.0.0.0' && host !== '::') {
      addTo(host, 'Address');
      return out;
    }
    for (const list of Object.values(os.networkInterfaces())) {
      for (const a of list || []) {
        if (a.family !== 'IPv4' && a.family !== 4) continue;
        if (a.internal) continue;
        const [x, y] = a.address.split('.').map(Number);
        const tailscale = x === 100 && y >= 64 && y <= 127;
        addTo(a.address, tailscale ? 'Tailscale (ใช้นอกบ้านได้)' : 'Wi-Fi บ้าน (เครือข่ายเดียวกัน)');
      }
    }
    out.sort((a, b) => (a.label.startsWith('Wi-Fi') ? -1 : 1) - (b.label.startsWith('Wi-Fi') ? -1 : 1));
    return out;
  }

  // ---------- editor -> phone ----------

  hookEvents() {
    const vs = this.vscode;
    this.disposables.push(
      vs.workspace.onDidChangeTextDocument((e) => {
        const uri = e.document.uri.toString();
        const w = this.watched.get(uri);
        if (!w) return;
        if (!e.contentChanges.length) {
          this.broadcast({ type: 'dirty', uri, dirty: e.document.isDirty, version: e.document.version });
          return;
        }
        // contentChanges are relative to the document before this edit, like a CodeMirror ChangeSet.
        let changes;
        try {
          const specs = e.contentChanges.map((ch) => ({
            from: offsetIn(w.shadow, ch.range.start),
            to: offsetIn(w.shadow, ch.range.end),
            insert: normalize(ch.text),
          }));
          changes = ChangeSet.of(specs, w.shadow.length);
          w.shadow = changes.apply(w.shadow);
          if (!sameLength(w.shadow, e.document)) throw new Error('shadow out of sync');
        } catch {
          // Should not happen; start over from the real document. Phones notice the gap and reload.
          this.track(e.document);
          this.broadcast({ type: 'reset', uri, version: e.document.version });
          return;
        }
        w.version = e.document.version;
        w.history.push({ version: w.version, changes });
        if (w.history.length > HISTORY) w.history.splice(0, w.history.length - HISTORY);
        this.broadcast({
          type: 'change',
          uri,
          version: w.version,
          dirty: e.document.isDirty,
          origin: this.pendingOrigin.get(uri) || 'pc',
          changes: changes.toJSON(),
          len: w.shadow.length,
        });
      }),
      vs.workspace.onDidSaveTextDocument((doc) => {
        const uri = doc.uri.toString();
        if (this.watched.has(uri)) this.broadcast({ type: 'dirty', uri, dirty: doc.isDirty, version: doc.version });
      }),
      vs.workspace.onDidCloseTextDocument((doc) => {
        const uri = doc.uri.toString();
        if (this.watched.delete(uri)) this.broadcast({ type: 'closed', uri });
      }),
      vs.window.tabGroups.onDidChangeTabs(() => this.broadcast({ type: 'tabs', tabs: this.tabs() })),
      vs.window.onDidChangeActiveTextEditor((ed) => {
        if (ed) this.broadcast({ type: 'active', uri: ed.document.uri.toString() });
      })
    );
  }

  tabs() {
    const vs = this.vscode;
    const out = [];
    const seen = new Set();
    for (const group of vs.window.tabGroups.all) {
      for (const tab of group.tabs) {
        if (!(tab.input instanceof vs.TabInputText)) continue;
        const uri = tab.input.uri.toString();
        if (seen.has(uri)) continue;
        seen.add(uri);
        out.push({
          uri,
          label: tab.label,
          path: tab.input.uri.scheme === 'file' ? vs.workspace.asRelativePath(tab.input.uri) : tab.label,
          dirty: tab.isDirty,
          active: tab.isActive && group.isActive,
        });
      }
    }
    return out;
  }

  broadcast(msg) {
    this.broadcastRaw(`data: ${JSON.stringify(msg)}\n\n`);
  }

  broadcastRaw(s) {
    for (const c of this.clients.values()) c.res.write(s);
  }

  // ---------- HTTP ----------

  async handle(req, res) {
    const url = new URL(req.url, 'http://x');
    let address = (req.socket.remoteAddress || '').replace(/^::ffff:/, '');
    // Requests forwarded by our own relay client carry the phone's real address.
    const viaRelay =
      this.opts.agentNonce &&
      (address === '127.0.0.1' || address === '::1') &&
      typeof req.headers['x-mobile-sync-agent'] === 'string' &&
      req.headers['x-mobile-sync-agent'].length === this.opts.agentNonce.length &&
      crypto.timingSafeEqual(Buffer.from(req.headers['x-mobile-sync-agent']), Buffer.from(this.opts.agentNonce));
    if (viaRelay) address = 'VPS:' + String(req.headers['x-mobile-sync-remote'] || '?').slice(0, 64);

    if (req.method === 'GET' && STATIC[url.pathname]) {
      const [file, type] = STATIC[url.pathname];
      const body = fs.readFileSync(path.join(this.opts.mediaDir, file));
      res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': type });
      return res.end(body);
    }
    if (!url.pathname.startsWith('/api/')) return this.fail(res, 404, 'not found');

    // --- authentication ---
    const f = this.fails.get(address);
    if (f && f.until > Date.now()) return this.fail(res, 429, 'blocked');
    const given = req.headers['x-token'] || (url.pathname === '/api/events' ? url.searchParams.get('t') : '');
    if (!given || !crypto.timingSafeEqual(sha(given), this.tokenHash)) {
      const rec = f || { count: 0, until: 0 };
      rec.count++;
      if (rec.count >= MAX_FAILS) {
        rec.until = Date.now() + BLOCK_MS;
        rec.count = 0;
        if (this.opts.onSuspicious) this.opts.onSuspicious(address);
      }
      this.fails.set(address, rec);
      return this.fail(res, 401, 'wrong key');
    }
    this.fails.delete(address);

    const route = `${req.method} ${url.pathname}`;
    if (route === 'GET /api/events') return this.events(req, res, url, address);
    if (route === 'GET /api/tabs') return this.json(res, { tabs: this.tabs(), active: this.activeUri() });
    if (route === 'GET /api/files') return this.json(res, { files: await this.files() });
    if (req.method !== 'POST') return this.fail(res, 404, 'not found');

    const body = await readJson(req);
    if (route === 'POST /api/open') return this.json(res, await this.open(body));
    if (route === 'POST /api/edit') return this.json(res, await this.edit(body));
    if (route === 'POST /api/save') return this.json(res, await this.save(body));
    return this.fail(res, 404, 'not found');
  }

  events(req, res, url, address) {
    const id = String(url.searchParams.get('c') || crypto.randomUUID()).slice(0, 64);
    res.writeHead(200, {
      ...SECURITY_HEADERS,
      'Content-Type': 'text/event-stream; charset=utf-8',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(`data: ${JSON.stringify({ type: 'hello', tabs: this.tabs(), active: this.activeUri() })}\n\n`);
    const old = this.clients.get(id);
    if (old) old.res.end();
    this.clients.set(id, { res, address });
    if (this.opts.onClientsChanged) this.opts.onClientsChanged({ connected: !old, address });
    req.on('close', () => {
      if (this.clients.get(id)?.res === res) {
        this.clients.delete(id);
        if (this.opts.onClientsChanged) this.opts.onClientsChanged({ connected: false, address });
      }
    });
  }

  activeUri() {
    const ed = this.vscode.window.activeTextEditor;
    return ed ? ed.document.uri.toString() : null;
  }

  async files() {
    const vs = this.vscode;
    const uris = await vs.workspace.findFiles('**/*', FILE_EXCLUDE, 20000);
    return uris
      .map((u) => ({ uri: u.toString(), path: vs.workspace.asRelativePath(u) }))
      .sort((a, b) => a.path.localeCompare(b.path));
  }

  findDoc(uri) {
    return this.vscode.workspace.textDocuments.find((d) => d.uri.toString() === uri);
  }

  allowed(uriStr) {
    const vs = this.vscode;
    if (this.tabs().some((t) => t.uri === uriStr)) return true;
    const uri = vs.Uri.parse(uriStr, true);
    return uri.scheme === 'file' && !!vs.workspace.getWorkspaceFolder(uri);
  }

  async open({ uri }) {
    const vs = this.vscode;
    if (typeof uri !== 'string' || !this.allowed(uri)) return { ok: false, error: 'ไฟล์นี้ไม่ได้อยู่ในโปรเจกต์ที่เปิดอยู่' };
    let doc = this.findDoc(uri);
    if (!doc) doc = await vs.workspace.openTextDocument(vs.Uri.parse(uri, true));
    if (doc.getText().length > MAX_DOC_CHARS) return { ok: false, error: 'ไฟล์ใหญ่เกินไป (เกิน 5 MB)' };
    // Make sure it is a real tab on the computer too, so unsaved edits stay visible there.
    if (!this.tabs().some((t) => t.uri === uri)) {
      await vs.window.showTextDocument(doc, { preview: false, preserveFocus: true });
    }
    const w = this.watched.get(uri) && this.watched.get(uri).version === doc.version ? this.watched.get(uri) : this.track(doc);
    return {
      ok: true,
      uri,
      version: w.version,
      text: w.shadow.toString(),
      languageId: doc.languageId,
      dirty: doc.isDirty,
      path: doc.uri.scheme === 'file' ? vs.workspace.asRelativePath(doc.uri) : doc.uri.path,
    };
  }

  track(doc) {
    const w = { version: doc.version, shadow: toText(doc.getText()), history: [] };
    this.watched.set(doc.uri.toString(), w);
    return w;
  }

  // A phone sends a ChangeSet made against `version`. If the computer changed the file since,
  // rebase the phone's changes over those newer changes instead of rejecting them.
  async edit({ uri, version, changes, clientId }) {
    const vs = this.vscode;
    const w = typeof uri === 'string' && this.watched.get(uri);
    const doc = w && this.findDoc(uri);
    if (!doc) return { ok: false, error: 'gone' };
    const conflict = () => ({ ok: false, error: 'conflict' });
    if (w.version !== doc.version || !Number.isInteger(version) || version > w.version) return conflict();

    let cs;
    try {
      cs = ChangeSet.fromJSON(changes);
      if (version < w.version) {
        const newer = w.history.filter((h) => h.version > version);
        if (!newer.length || newer[0].version !== version + 1) return conflict(); // too old
        for (const h of newer) cs = cs.map(h.changes);
      }
      if (cs.length !== w.shadow.length) return conflict();
    } catch {
      return conflict();
    }
    if (cs.empty) return { ok: true };

    const eol = doc.eol === vs.EndOfLine.CRLF ? '\r\n' : '\n';
    const we = new vs.WorkspaceEdit();
    cs.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
      const a = w.shadow.lineAt(fromA);
      const b = w.shadow.lineAt(toA);
      const range = new vs.Range(a.number - 1, fromA - a.from, b.number - 1, toA - b.from);
      we.replace(doc.uri, range, inserted.toString().replace(/\n/g, eol));
    });
    this.pendingOrigin.set(uri, String(clientId || 'phone'));
    let ok;
    try {
      ok = await vs.workspace.applyEdit(we);
    } finally {
      this.pendingOrigin.delete(uri);
    }
    return ok ? { ok: true } : conflict();
  }

  async save({ uri }) {
    const doc = typeof uri === 'string' && this.watched.has(uri) && this.findDoc(uri);
    if (!doc) return { ok: false, error: 'gone' };
    const ok = await doc.save();
    return { ok, version: doc.version, dirty: doc.isDirty };
  }

  json(res, obj) {
    res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(obj));
  }

  fail(res, code, message) {
    if (res.headersSent) return res.end();
    res.writeHead(code, { ...SECURITY_HEADERS, 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: message }));
  }
}

function offsetIn(text, p) {
  const line = text.line(p.line + 1); // throws if out of range
  if (p.character > line.length) throw new RangeError('bad position');
  return line.from + p.character;
}

// Cheap consistency check between the LF copy and the real (maybe CRLF) document.
function sameLength(shadow, doc) {
  const crlf = doc.eol === 2; // vscode.EndOfLine.CRLF
  return shadow.length + (crlf ? shadow.lines - 1 : 0) === doc.getText().length;
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('request too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(new Error('bad json'));
      }
    });
    req.on('error', reject);
  });
}

module.exports = { SyncServer };
