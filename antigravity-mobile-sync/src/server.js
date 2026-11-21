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
const BUILTIN_COMMANDS = [
  ['editor.action.formatDocument', 'Format Document'],
  ['editor.action.organizeImports', 'Organize Imports'],
  ['editor.action.fixAll', 'Fix All'],
  ['editor.action.sourceAction', 'Source Action...'],
  ['workbench.action.files.saveAll', 'Save All'],
  ['workbench.action.files.revert', 'Revert File (discard unsaved changes)'],
  ['editor.action.trimTrailingWhitespace', 'Trim Trailing Whitespace'],
  ['editor.action.transformToUppercase', 'Transform to Uppercase'],
  ['editor.action.transformToLowercase', 'Transform to Lowercase'],
];
const HISTORY = 500;
const MAX_DIRTY_COMPARE = 4 * 1024 * 1024;
const hashOf = (s) => crypto.createHash('sha1').update(s).digest('base64'); // change sets kept per file to rebase late phone edits
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
          this.broadcast({ type: 'dirty', uri, dirty: this.dirtyOf(e.document), version: e.document.version });
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
          dirty: this.dirtyOf(e.document),
          origin: this.pendingOrigin.get(uri) || 'pc',
          changes: changes.toJSON(),
          len: w.shadow.length,
        });
      }),
      vs.workspace.onDidSaveTextDocument((doc) => {
        const uri = doc.uri.toString();
        const w = this.watched.get(uri);
        if (w) {
          this.markSaved(w);
          this.broadcast({ type: 'dirty', uri, dirty: this.dirtyOf(doc), version: doc.version });
        }
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
    if (vs.workspace.onDidChangeWorkspaceFolders) {
      this.disposables.push(vs.workspace.onDidChangeWorkspaceFolders(() => this.broadcast({ type: 'workspace' })));
    }
    if (vs.languages && vs.languages.onDidChangeDiagnostics) {
      this.disposables.push(
        vs.languages.onDidChangeDiagnostics((e) => {
          for (const u of e.uris) {
            const uri = u.toString();
            if (this.watched.has(uri)) this.broadcast({ type: 'diag', uri, diags: this.diagnostics(u) });
          }
          // Let the Problems view know something changed (at most once a second).
          if (!this.problemsTimer) {
            this.problemsTimer = setTimeout(() => {
              this.problemsTimer = null;
              this.broadcast({ type: 'problems' });
            }, 1000);
          }
        })
      );
    }
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
    if (route === 'GET /api/files') return this.json(res, { files: await this.files(), name: this.vscode.workspace.name || '' });
    if (route === 'GET /api/commands') return this.json(res, this.commandList());
    if (route === 'GET /api/extensions') return this.json(res, this.extensionList());
    if (route === 'GET /api/problems') return this.json(res, this.problems());
    if (route === 'GET /api/workspace') return this.json(res, await this.workspaceInfo());
    if (req.method !== 'POST') return this.fail(res, 404, 'not found');

    const body = await readJson(req);
    if (route === 'POST /api/open') return this.json(res, await this.open(body));
    if (route === 'POST /api/edit') return this.json(res, await this.edit(body));
    if (route === 'POST /api/save') return this.json(res, await this.save(body));
    if (route === 'POST /api/run') return this.json(res, await this.run(body));
    if (route === 'POST /api/search') return this.json(res, await this.search(body));
    if (route === 'POST /api/browse') return this.json(res, this.browse(body));
    if (route === 'POST /api/openFolder') return this.json(res, await this.openFolder(body));
    if (route === 'POST /api/addFolder') return this.json(res, this.addFolder(body));
    if (route === 'POST /api/removeFolder') return this.json(res, this.removeFolder(body));
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
      dirty: this.dirtyOf(doc),
      path: doc.uri.scheme === 'file' ? vs.workspace.asRelativePath(doc.uri) : doc.uri.path,
      diags: this.diagnostics(doc.uri),
    };
  }

  track(doc) {
    const w = { version: doc.version, shadow: toText(doc.getText()), history: [], saved: null };
    if (!doc.isDirty) this.markSaved(w);
    else if (doc.uri.scheme === 'file') {
      // Opened while already unsaved: compare against the file on disk.
      try {
        const disk = normalize(fs.readFileSync(doc.uri.fsPath, 'utf8'));
        w.saved = { len: disk.length, hash: hashOf(disk) };
      } catch {}
    }
    this.watched.set(doc.uri.toString(), w);
    return w;
  }

  markSaved(w) {
    if (!w) return;
    const text = w.shadow.toString();
    w.saved = { len: text.length, hash: hashOf(text) };
  }

  // VS Code keeps a file "unsaved" after any edit until it is saved (only its own Undo clears
  // that). Edits from the phone are normal edits, so undoing on the phone back to the saved text
  // would still look unsaved. Report unsaved only when the text really differs from the saved one.
  dirtyOf(doc) {
    if (!doc.isDirty) return false;
    const w = this.watched.get(doc.uri.toString());
    if (!w || !w.saved || w.shadow.length > MAX_DIRTY_COMPARE) return true;
    if (w.shadow.length !== w.saved.len) return true;
    return hashOf(w.shadow.toString()) !== w.saved.hash;
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
    if (cs.empty) return { ok: true, noop: true, dirty: this.dirtyOf(doc) }; // nothing to apply, no echo will come

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
    // workspace.save() saves the editor exactly like Ctrl+S: format-on-save and other save
    // participants run, and extensions listening for saves (e.g. SFTP upload-on-save) fire.
    let ok;
    if (typeof this.vscode.workspace.save === 'function') ok = !!(await this.vscode.workspace.save(doc.uri));
    else ok = await doc.save();
    if (ok) this.markSaved(this.watched.get(uri));
    return { ok, version: doc.version, dirty: this.dirtyOf(doc) };
  }

  // Problems reported by language extensions (ESLint, Pylance, TypeScript, ...).
  diagnostics(uri) {
    const vs = this.vscode;
    if (!vs.languages || !vs.languages.getDiagnostics) return [];
    const sev = ['error', 'warning', 'info', 'hint'];
    return vs.languages
      .getDiagnostics(uri)
      .slice(0, 500)
      .map((d) => ({
        from: { l: d.range.start.line, c: d.range.start.character },
        to: { l: d.range.end.line, c: d.range.end.character },
        severity: sev[d.severity] || 'info',
        message: String(d.message).slice(0, 2000),
        source: d.source ? String(d.source) + (d.code !== undefined ? `(${typeof d.code === 'object' ? d.code.value : d.code})` : '') : '',
      }));
  }

  // Commands that extensions add to the Command Palette, plus a few useful built-ins.
  commandList() {
    const vs = this.vscode;
    const allow = this.opts.allowCommands !== false;
    if (!allow) return { allowed: false, commands: [] };
    const out = new Map();
    const add = (id, title, category, ext, extId) => {
      if (!id || !title || out.has(id)) return;
      out.set(id, { id, title: category ? `${category}: ${title}` : title, ext, extId });
    };
    for (const [id, title] of BUILTIN_COMMANDS) add(id, title, '', 'Antigravity', '');
    for (const ext of vs.extensions ? vs.extensions.all : []) {
      const pj = ext.packageJSON || {};
      const contributes = pj.contributes || {};
      const hidden = new Set(
        ((contributes.menus && contributes.menus.commandPalette) || []).filter((m) => m && m.when === 'false').map((m) => m.command)
      );
      const cmds = Array.isArray(contributes.commands) ? contributes.commands : contributes.commands ? [contributes.commands] : [];
      for (const c of cmds) {
        if (!c || hidden.has(c.command)) continue;
        const title = typeof c.title === 'string' ? c.title : c.title && c.title.value;
        const cat = typeof c.category === 'string' ? c.category : c.category && c.category.value;
        if (!title || title.startsWith('%')) continue;
        add(c.command, title, cat && !cat.startsWith('%') ? cat : '', extName(ext), ext.id);
      }
    }
    return { allowed: true, commands: [...out.values()].sort((a, b) => a.title.localeCompare(b.title)) };
  }

  // ---------- projects / folders

  folders() {
    return (this.vscode.workspace.workspaceFolders || []).map((f) => ({ name: f.name, path: f.uri.fsPath }));
  }

  async workspaceInfo() {
    const vs = this.vscode;
    let recent = [];
    try {
      // Same list as File > Open Recent (internal command, best effort).
      const r = await vs.commands.executeCommand('_workbench.getRecentlyOpened');
      for (const w of (r && r.workspaces) || []) {
        const u = w.folderUri || (w.workspace && w.workspace.configPath);
        if (u && u.scheme === 'file') recent.push({ path: u.fsPath, name: w.label || path.basename(u.fsPath) });
      }
    } catch {}
    const open = new Set(this.folders().map((f) => f.path));
    recent = recent.filter((r) => !open.has(r.path)).slice(0, 30);
    return { ok: true, name: vs.workspace.name || '', folders: this.folders(), recent, home: os.homedir(), sep: path.sep };
  }

  // List sub-folders of a folder on this computer (for "open folder" on the phone).
  browse({ path: p }) {
    const target = typeof p === 'string' && p ? path.resolve(p) : os.homedir();
    let entries;
    try {
      entries = fs.readdirSync(target, { withFileTypes: true });
    } catch (err) {
      return { ok: false, error: 'เปิดโฟลเดอร์นี้ไม่ได้: ' + err.code, path: target };
    }
    const dirs = entries
      .filter((e) => {
        if (e.isDirectory()) return true;
        if (!e.isSymbolicLink()) return false;
        try {
          return fs.statSync(path.join(target, e.name)).isDirectory();
        } catch {
          return false;
        }
      })
      .map((e) => e.name)
      .filter((n) => !/^(\$Recycle\.Bin|System Volume Information)$/i.test(n))
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }));
    const parent = path.dirname(target);
    const drives = [];
    if (process.platform === 'win32') {
      for (const L of 'CDEFGHIJKLMNOPQRSTUVWXYZ') if (fs.existsSync(L + ':\\')) drives.push(L + ':\\');
    }
    return { ok: true, path: target, parent: parent !== target ? parent : null, dirs, drives, home: os.homedir() };
  }

  isDir(p) {
    try {
      return typeof p === 'string' && fs.statSync(p).isDirectory();
    } catch {
      return false;
    }
  }

  // Open a folder in a new window, or in place of this window's project (the window reloads).
  async openFolder({ path: p, mode }) {
    if (!this.isDir(p)) return { ok: false, error: 'ไม่พบโฟลเดอร์นี้' };
    const vs = this.vscode;
    const uri = vs.Uri.file(path.resolve(p));
    // Run after replying: replacing the folder reloads this window (and this server).
    setTimeout(() => {
      Promise.resolve(vs.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: mode !== 'replace' })).catch(() => {});
    }, 100);
    return { ok: true, path: uri.fsPath };
  }

  addFolder({ path: p }) {
    if (!this.isDir(p)) return { ok: false, error: 'ไม่พบโฟลเดอร์นี้' };
    const vs = this.vscode;
    const list = vs.workspace.workspaceFolders || [];
    const full = path.resolve(p);
    if (list.some((f) => f.uri.fsPath === full)) return { ok: true, already: true };
    const ok = vs.workspace.updateWorkspaceFolders(list.length, 0, { uri: vs.Uri.file(full) });
    return ok ? { ok: true } : { ok: false, error: 'เพิ่มโฟลเดอร์ไม่ได้' };
  }

  removeFolder({ path: p }) {
    const vs = this.vscode;
    const list = vs.workspace.workspaceFolders || [];
    const i = list.findIndex((f) => f.uri.fsPath === p);
    if (i < 0) return { ok: false, error: 'ไม่พบโฟลเดอร์นี้ใน workspace' };
    const ok = vs.workspace.updateWorkspaceFolders(i, 1);
    return ok ? { ok: true } : { ok: false, error: 'เอาโฟลเดอร์ออกไม่ได้' };
  }

  // Installed extensions, like the Extensions view.
  extensionList() {
    const vs = this.vscode;
    const list = (vs.extensions ? vs.extensions.all : []).map((ext) => {
      const pj = ext.packageJSON || {};
      const p = String(ext.extensionPath || '').replace(/\\/g, '/');
      const str = (v) => (typeof v === 'string' && !v.startsWith('%') ? v : '');
      return {
        id: ext.id,
        name: extName(ext),
        publisher: str(pj.publisher) || ext.id.split('.')[0],
        version: str(pj.version),
        description: str(pj.description).slice(0, 300),
        active: !!ext.isActive,
        builtin: !!pj.isBuiltin || /\/resources\/app\/extensions\//.test(p),
      };
    });
    list.sort((a, b) => a.name.localeCompare(b.name));
    return { extensions: list };
  }

  // Every problem in the workspace, like the Problems panel.
  problems() {
    const vs = this.vscode;
    if (!vs.languages || !vs.languages.getDiagnostics) return { files: [], errors: 0, warnings: 0 };
    const sev = ['error', 'warning', 'info', 'hint'];
    let errors = 0;
    let warnings = 0;
    const files = [];
    for (const [uri, diags] of vs.languages.getDiagnostics()) {
      if (!diags.length || (uri.scheme !== 'file' && uri.scheme !== 'untitled')) continue;
      if (uri.scheme === 'file' && !vs.workspace.getWorkspaceFolder(uri) && !this.tabs().some((t) => t.uri === uri.toString())) continue;
      const items = diags.slice(0, 200).map((d) => {
        const severity = sev[d.severity] || 'info';
        if (severity === 'error') errors++;
        if (severity === 'warning') warnings++;
        return {
          line: d.range.start.line,
          col: d.range.start.character,
          severity,
          message: String(d.message).slice(0, 500),
          source: d.source ? String(d.source) : '',
        };
      });
      files.push({ uri: uri.toString(), path: uri.scheme === 'file' ? vs.workspace.asRelativePath(uri) : uri.path, items });
      if (files.length >= 300) break;
    }
    files.sort((a, b) => a.path.localeCompare(b.path));
    return { files, errors, warnings };
  }

  // Text search across the workspace, like the Search view. Unsaved text of open files is used.
  async search({ query, matchCase, regex, wholeWord }) {
    const vs = this.vscode;
    if (typeof query !== 'string' || !query || query.length > 500) return { ok: false, error: 'bad query' };
    let re;
    try {
      let src = regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (wholeWord) src = `\\b(?:${src})\\b`;
      re = new RegExp(src, matchCase ? 'g' : 'gi');
    } catch (err) {
      return { ok: false, error: 'regex ไม่ถูกต้อง: ' + err.message };
    }
    const started = Date.now();
    const results = [];
    let total = 0;
    let truncated = false;
    const uris = await vs.workspace.findFiles('**/*', FILE_EXCLUDE, 20000);
    for (const uri of uris) {
      if (total >= 1000 || Date.now() - started > 8000) {
        truncated = true;
        break;
      }
      let text;
      const open = this.findDoc(uri.toString());
      if (open) text = open.getText();
      else {
        try {
          const bytes = await vs.workspace.fs.readFile(uri);
          if (bytes.length > 1024 * 1024 || bytes.subarray(0, 8000).includes(0)) continue;
          text = new TextDecoder('utf-8').decode(bytes);
        } catch {
          continue;
        }
      }
      const matches = [];
      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length && total < 1000; i++) {
        const line = lines[i];
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(line)) && total < 1000) {
          if (!m[0].length) {
            re.lastIndex++;
            continue;
          }
          const from = Math.max(0, m.index - 40);
          matches.push({ line: i, col: m.index, len: m[0].length, pre: line.slice(from, m.index), hit: m[0], post: line.slice(m.index + m[0].length, m.index + m[0].length + 80) });
          total++;
        }
      }
      if (matches.length) results.push({ uri: uri.toString(), path: vs.workspace.asRelativePath(uri), matches });
    }
    return { ok: true, results, total, truncated };
  }

  // Run a command on the computer with the phone's current file as the active editor.
  async run({ id, uri }) {
    const vs = this.vscode;
    if (this.opts.allowCommands === false) return { ok: false, error: 'ปิดการรันคำสั่งจากมือถือไว้ (mobileSync.allowCommands)' };
    if (typeof id !== 'string' || !id || id.length > 200) return { ok: false, error: 'bad command' };
    if (typeof uri === 'string' && this.watched.has(uri)) {
      const doc = this.findDoc(uri);
      if (doc) await vs.window.showTextDocument(doc, { preview: false, preserveFocus: false });
    }
    const exec = Promise.resolve(vs.commands.executeCommand(id)).then(
      () => ({ ok: true, done: true }),
      (err) => ({ ok: false, error: String((err && err.message) || err).slice(0, 500) })
    );
    // Some commands wait for input on the computer (a picker or a box); don't hang the phone.
    const later = new Promise((r) => setTimeout(() => r({ ok: true, done: false }), 4000));
    return Promise.race([exec, later]);
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

function extName(ext) {
  const pj = ext.packageJSON || {};
  const n = typeof pj.displayName === 'string' && !pj.displayName.startsWith('%') ? pj.displayName : pj.name;
  return n || ext.id;
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
