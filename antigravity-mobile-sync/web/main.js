// Phone side of Mobile Sync. Bundled into media/app.js by build.mjs.
import { EditorState, Compartment, Annotation, Transaction, ChangeSet } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { indentWithTab, undo, redo, indentMore, indentLess } from '@codemirror/commands';
import { StreamLanguage } from '@codemirror/language';
import { oneDark } from '@codemirror/theme-one-dark';
import { setDiagnostics, lintGutter, openLintPanel } from '@codemirror/lint';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { java } from '@codemirror/lang-java';
import { cpp } from '@codemirror/lang-cpp';
import { php } from '@codemirror/lang-php';
import { sql } from '@codemirror/lang-sql';
import { xml } from '@codemirror/lang-xml';
import { yaml } from '@codemirror/lang-yaml';
import { go } from '@codemirror/lang-go';
import { rust } from '@codemirror/lang-rust';
import { lua } from '@codemirror/legacy-modes/mode/lua';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { ruby } from '@codemirror/legacy-modes/mode/ruby';
import { swift } from '@codemirror/legacy-modes/mode/swift';
import { csharp, kotlin, dart } from '@codemirror/legacy-modes/mode/clike';
import { powerShell } from '@codemirror/legacy-modes/mode/powershell';
import { toml } from '@codemirror/legacy-modes/mode/toml';
import { dockerFile } from '@codemirror/legacy-modes/mode/dockerfile';

// ---------------------------------------------------------------- helpers
const $ = (s) => document.querySelector(s);
const el = (tag, props = {}, ...kids) => {
  const e = Object.assign(document.createElement(tag), props);
  for (const k of kids) e.append(k);
  return e;
};
const randomId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');
const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem('ms.' + k);
      return v === null ? d : JSON.parse(v);
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem('ms.' + k, JSON.stringify(v));
    } catch {}
  },
  del(k) {
    try {
      localStorage.removeItem('ms.' + k);
    } catch {}
  },
};

let toastTimer;
function toast(msg, ms = 2500) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), ms);
}

// ---------------------------------------------------------------- auth
const hashToken = new URLSearchParams(location.hash.slice(1)).get('t');
if (hashToken) {
  store.set('token', hashToken);
  history.replaceState(null, '', location.pathname); // keep the key out of the address bar
}
let token = store.get('token', '');
const clientId = randomId();

class AuthError extends Error {}

async function api(path, body) {
  const res = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: { 'X-Token': token, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  if (res.status === 401 || res.status === 429) throw new AuthError(res.status === 429 ? 'blocked' : 'wrong key');
  return res.json();
}

// ---------------------------------------------------------------- languages
function languageFor(id, path) {
  const ext = (path.split('.').pop() || '').toLowerCase();
  const legacy = (m) => StreamLanguage.define(m);
  switch (id) {
    case 'javascript':
      return javascript();
    case 'javascriptreact':
      return javascript({ jsx: true });
    case 'typescript':
      return javascript({ typescript: true });
    case 'typescriptreact':
      return javascript({ typescript: true, jsx: true });
    case 'python':
      return python();
    case 'html':
    case 'vue':
    case 'svelte':
      return html();
    case 'css':
    case 'scss':
    case 'less':
      return css();
    case 'json':
    case 'jsonc':
      return json();
    case 'markdown':
      return markdown();
    case 'java':
      return java();
    case 'c':
    case 'cpp':
      return cpp();
    case 'php':
      return php();
    case 'sql':
      return sql();
    case 'xml':
    case 'svg':
      return xml();
    case 'yaml':
      return yaml();
    case 'go':
      return go();
    case 'rust':
      return rust();
    case 'lua':
      return legacy(lua);
    case 'shellscript':
      return legacy(shell);
    case 'ruby':
      return legacy(ruby);
    case 'swift':
      return legacy(swift);
    case 'csharp':
      return legacy(csharp);
    case 'kotlin':
      return legacy(kotlin);
    case 'dart':
      return legacy(dart);
    case 'powershell':
      return legacy(powerShell);
    case 'toml':
      return legacy(toml);
    case 'dockerfile':
      return legacy(dockerFile);
  }
  if (ext === 'luau') return legacy(lua);
  return [];
}

// ---------------------------------------------------------------- editor
const Remote = Annotation.define();
const wrapComp = new Compartment();
const prefs = {
  wrap: store.get('wrap', true),
  fontSize: store.get('fontSize', 14),
  follow: store.get('follow', false),
};

const docs = new Map(); // uri -> doc record
let current = null; // uri
let pcTabs = [];
let pcActive = null;
let fileList = null;

const view = new EditorView({ parent: $('#editor') });
window.__mobileSync = { view }; // handy for debugging from the browser console

function extensionsFor(d) {
  return [
    basicSetup,
    keymap.of([indentWithTab]),
    oneDark,
    wrapComp.of(prefs.wrap ? EditorView.lineWrapping : []),
    lintGutter(),
    languageFor(d.languageId, d.path),
    EditorView.updateListener.of((u) => {
      for (const tr of u.transactions) {
        if (tr.docChanged && !tr.annotation(Remote)) localChange(d, tr);
      }
    }),
  ];
}

function setState(d, spec) {
  if (d.uri === current) view.dispatch(spec);
  else d.state = d.state.update(spec).state;
}

function docText(d) {
  return d.uri === current ? view.state.doc : d.state.doc;
}

// ---------------------------------------------------------------- sync
// Like operational transform: the computer is the authority and numbers every change.
// The phone keeps its own unconfirmed edits (inflight = sent, pending = not sent yet) and
// rebases them over changes from the computer, so nobody's typing is thrown away.
function localChange(d, tr) {
  d.pending = d.pending ? d.pending.compose(tr.changes) : tr.changes;
  d.dirty = true;
  renderHeader();
  clearTimeout(d.flushTimer);
  d.flushTimer = setTimeout(() => flush(d), 40);
}

async function flush(d) {
  if (d.inflight || !d.pending || d.closed) return;
  const sent = (d.inflight = d.pending);
  d.pending = null;
  clearTimeout(d.ackTimer);
  // The confirmation arrives on the event stream; if it never does, reload from the computer.
  d.ackTimer = setTimeout(() => d.inflight === sent && resync(d), 8000);
  let res;
  try {
    res = await api('/api/edit', { uri: d.uri, version: d.version, changes: sent.toJSON(), clientId });
  } catch (err) {
    if (err instanceof AuthError) return showLogin(err.message);
    toast('การเชื่อมต่อหลุด กำลังโหลดไฟล์ใหม่จากคอม');
    return resync(d);
  }
  if (res.ok) return;
  if (res.error === 'gone') return markClosed(d);
  toast('ซิงค์ไม่ทัน — โหลดเวอร์ชันล่าสุดจากคอมแล้ว');
  resync(d);
}

function onRemoteChange(ev) {
  const d = docs.get(ev.uri);
  if (!d || d.closed || d.syncing) return;
  if (ev.version <= d.version) return;
  if (ev.version !== d.version + 1) return resync(d); // missed something

  if (ev.origin === clientId) {
    // Our own edit, confirmed. Its content is already on screen.
    if (!d.inflight) return resync(d);
    d.inflight = null;
    clearTimeout(d.ackTimer);
    d.version = ev.version;
    d.dirty = ev.dirty;
    renderHeader();
    if (!d.pending && docText(d).length !== ev.len) return resync(d);
    return flush(d);
  }

  let local;
  try {
    local = ChangeSet.fromJSON(ev.changes);
    if (d.inflight) {
      const sent = d.inflight;
      d.inflight = sent.map(local); // the computer will rebase it the same way
      local = local.map(sent, true);
    }
    if (d.pending) {
      const mine = d.pending;
      d.pending = mine.map(local);
      local = local.map(mine, true);
    }
  } catch {
    return resync(d);
  }
  setState(d, { changes: local, annotations: [Remote.of(true), Transaction.addToHistory.of(false)] });
  d.version = ev.version;
  d.dirty = ev.dirty;
  renderHeader();
  if (!d.inflight && !d.pending && docText(d).length !== ev.len) resync(d);
}

async function resync(d) {
  if (d.syncing) return;
  d.syncing = true;
  clearTimeout(d.flushTimer);
  clearTimeout(d.ackTimer);
  let data;
  try {
    data = await api('/api/open', { uri: d.uri });
  } catch (err) {
    d.syncing = false;
    if (err instanceof AuthError) return showLogin(err.message);
    return; // offline; the reconnect handler resyncs again
  }
  d.syncing = false;
  if (!data.ok) return markClosed(d);
  d.inflight = null;
  d.pending = null;
  const old = docText(d).toString();
  const next = data.text;
  // Replace only the part that differs so the cursor and scroll stay put.
  let a = 0;
  while (a < old.length && a < next.length && old[a] === next[a]) a++;
  let b = 0;
  while (b < old.length - a && b < next.length - a && old[old.length - 1 - b] === next[next.length - 1 - b]) b++;
  if (a !== old.length - b || a !== next.length - b) {
    setState(d, {
      changes: { from: a, to: old.length - b, insert: next.slice(a, next.length - b) },
      annotations: [Remote.of(true), Transaction.addToHistory.of(false)],
    });
  }
  d.version = data.version;
  d.dirty = data.dirty;
  renderHeader();
}

function markClosed(d) {
  d.closed = true;
  toast(`${d.path} ถูกปิดบนคอมแล้ว`);
  closeDoc(d.uri);
}

// ---------------------------------------------------------------- documents
async function openDoc(uri, { quiet = false } = {}) {
  if (docs.has(uri)) return showDoc(uri);
  let data;
  try {
    data = await api('/api/open', { uri });
  } catch (err) {
    if (err instanceof AuthError) return showLogin(err.message);
    return toast('เปิดไฟล์ไม่ได้ — ไม่ได้เชื่อมต่อกับคอม');
  }
  if (!data.ok) return quiet || toast(data.error || 'เปิดไฟล์ไม่ได้');
  const d = {
    uri,
    path: data.path,
    languageId: data.languageId,
    version: data.version,
    dirty: data.dirty,
    pending: null, // ChangeSet typed but not sent yet
    inflight: null, // ChangeSet sent, waiting for confirmation
    closed: false,
  };
  d.state = EditorState.create({ doc: data.text, extensions: extensionsFor(d) });
  docs.set(uri, d);
  applyDiags(d, data.diags || []);
  showDoc(uri);
}

function showDoc(uri) {
  if (current && docs.has(current)) docs.get(current).state = view.state;
  current = uri;
  const d = docs.get(uri);
  view.setState(d.state);
  store.set('open', [...docs.keys()]);
  store.set('current', current);
  renderTabs();
  renderHeader();
  closeDrawer();
}

function closeDoc(uri) {
  const d = docs.get(uri);
  if (!d) return;
  if (d.pending && !d.closed) flush(d); // send what is left before forgetting it
  if (current === uri) d.state = view.state;
  docs.delete(uri);
  if (current === uri) {
    current = null;
    const next = [...docs.keys()].pop();
    if (next) showDoc(next);
    else view.setState(EditorState.create({ doc: '' }));
  }
  store.set('open', [...docs.keys()]);
  renderTabs();
  renderHeader();
}

// Make sure everything typed on the phone has reached the computer.
async function settle(d) {
  clearTimeout(d.flushTimer);
  await flush(d);
  for (let i = 0; i < 50 && (d.inflight || d.pending); i++) await new Promise((r) => setTimeout(r, 50));
}

// ---------------------------------------------------------------- problems from extensions
function applyDiags(d, diags) {
  const text = docText(d);
  const clamp = ({ l, c }) => {
    if (l + 1 > text.lines) return text.length;
    const line = text.line(l + 1);
    return line.from + Math.min(c, line.length);
  };
  const list = [];
  for (const x of diags || []) {
    const from = clamp(x.from);
    const to = Math.max(from, clamp(x.to));
    list.push({ from, to, severity: x.severity, message: x.message, source: x.source || undefined });
  }
  d.problems = { error: 0, warning: 0 };
  for (const x of list) if (x.severity in d.problems) d.problems[x.severity]++;
  const state = d.uri === current ? view.state : d.state;
  setState(d, setDiagnostics(state, list));
  renderHeader();
}

// ---------------------------------------------------------------- commands from extensions
let commandList = null;
async function loadCommands() {
  commandList = null;
  renderCommands();
  try {
    const res = await api('/api/commands');
    commandList = res.allowed ? res.commands : [];
    if (!res.allowed) toast('คอมปิดการรันคำสั่งจากมือถือไว้ (mobileSync.allowCommands)');
  } catch (err) {
    if (err instanceof AuthError) return showLogin(err.message);
    commandList = [];
    toast('โหลดรายการคำสั่งไม่ได้');
  }
  renderCommands();
}

function renderCommands() {
  const box = $('#cmdList');
  if (!commandList) return box.replaceChildren(el('p', { className: 'muted', textContent: 'กำลังโหลดคำสั่ง…' }));
  const terms = $('#cmdSearch').value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const recent = store.get('recentCmds', []);
  let items = commandList.filter((c) => terms.every((t) => (c.title + ' ' + c.id + ' ' + c.ext).toLowerCase().includes(t)));
  if (!terms.length) {
    const rec = recent.map((id) => commandList.find((c) => c.id === id)).filter(Boolean);
    items = [...rec, ...items.filter((c) => !recent.includes(c.id))];
  }
  items = items.slice(0, 100);
  box.replaceChildren(
    ...(items.length
      ? items.map((c) => {
          const row = el('button', { className: 'file' + (recent.includes(c.id) ? ' recent' : '') }, el('span', { className: 'name', textContent: c.title }), el('span', { className: 'dir', textContent: c.ext }));
          row.onclick = () => runCommand(c);
          return row;
        })
      : [el('p', { className: 'muted', textContent: 'ไม่พบคำสั่ง' })])
  );
}

async function runCommand(c) {
  closeCommands();
  const d = current && docs.get(current);
  if (d) await settle(d);
  store.set('recentCmds', [c.id, ...store.get('recentCmds', []).filter((x) => x !== c.id)].slice(0, 8));
  toast(`กำลังรัน: ${c.title}`, 1500);
  try {
    const res = await api('/api/run', { id: c.id, uri: current });
    if (!res.ok) toast(`รันไม่สำเร็จ: ${res.error}`, 4000);
    else if (res.done) toast(`รันแล้ว ✓ ${c.title}`, 2000);
    else toast('ส่งคำสั่งแล้ว — ถ้าคำสั่งนี้ถามอะไรต่อ ต้องตอบบนคอม', 4000);
  } catch (err) {
    if (err instanceof AuthError) return showLogin(err.message);
    toast('รันคำสั่งไม่ได้ — ไม่ได้เชื่อมต่อ');
  }
}

function openCommands() {
  $('#cmdSheet').hidden = false;
  $('#cmdSearch').value = '';
  if (!commandList) loadCommands();
  else renderCommands();
  $('#cmdSearch').focus();
}
function closeCommands() {
  $('#cmdSheet').hidden = true;
}

async function saveCurrent() {
  const d = current && docs.get(current);
  if (!d) return;
  await settle(d);
  try {
    const res = await api('/api/save', { uri: d.uri });
    if (res.ok) {
      d.dirty = res.dirty;
      toast('บันทึกแล้ว ✓', 1200);
    } else toast('บันทึกไม่สำเร็จ');
  } catch (err) {
    if (err instanceof AuthError) return showLogin(err.message);
    toast('บันทึกไม่สำเร็จ — ไม่ได้เชื่อมต่อ');
  }
  renderHeader();
}

// ---------------------------------------------------------------- connection
let es = null;
let everConnected = false;

function connect() {
  if (es) es.close();
  setStatus('connecting');
  es = new EventSource(`/api/events?t=${encodeURIComponent(token)}&c=${clientId}`);
  es.onopen = () => {
    setStatus('online');
    if (everConnected) for (const d of docs.values()) resync(d);
    everConnected = true;
  };
  es.onerror = async () => {
    setStatus('offline');
    try {
      await api('/api/tabs');
    } catch (err) {
      if (err instanceof AuthError) {
        es.close();
        showLogin(err.message);
      }
    }
  };
  es.onmessage = (m) => {
    const ev = JSON.parse(m.data);
    switch (ev.type) {
      case 'hello':
        pcTabs = ev.tabs;
        setActive(ev.active);
        renderPcTabs();
        if (!docs.size) restoreOpenDocs();
        break;
      case 'tabs':
        pcTabs = ev.tabs;
        renderPcTabs();
        break;
      case 'active':
        setActive(ev.uri);
        break;
      case 'change':
        onRemoteChange(ev);
        break;
      case 'dirty': {
        const d = docs.get(ev.uri);
        if (d && !d.pending && !d.inflight && ev.version === d.version) {
          d.dirty = ev.dirty;
          renderHeader();
        }
        break;
      }
      case 'diag': {
        const d = docs.get(ev.uri);
        if (d) applyDiags(d, ev.diags);
        break;
      }
      case 'reset': {
        const d = docs.get(ev.uri);
        if (d) resync(d);
        break;
      }
      case 'closed': {
        const d = docs.get(ev.uri);
        if (d) markClosed(d);
        break;
      }
    }
  };
}

function setActive(uri) {
  pcActive = uri;
  renderPcTabs();
  if (prefs.follow && uri && uri !== current) openDoc(uri, { quiet: true });
}

async function restoreOpenDocs() {
  const open = store.get('open', []);
  const cur = store.get('current', null);
  for (const uri of open) await openDoc(uri, { quiet: true });
  if (cur && docs.has(cur)) showDoc(cur);
  if (!docs.size && pcActive) openDoc(pcActive, { quiet: true });
}

function setStatus(s) {
  const dot = $('#status');
  dot.dataset.state = s;
  dot.title = { online: 'เชื่อมต่อแล้ว', offline: 'ไม่ได้เชื่อมต่อ', connecting: 'กำลังเชื่อมต่อ…' }[s];
}

// ---------------------------------------------------------------- UI
function renderHeader() {
  const d = current && docs.get(current);
  $('#title').textContent = d ? d.path.split('/').pop() : 'Mobile Sync';
  $('#title').title = d ? d.path : '';
  $('#dirty').hidden = !(d && d.dirty);
  $('#save').disabled = !d;
  const p = d && d.problems;
  const badge = $('#problems');
  badge.hidden = !(p && (p.error || p.warning));
  if (!badge.hidden) badge.textContent = [p.error ? `✖${p.error}` : '', p.warning ? `⚠${p.warning}` : ''].filter(Boolean).join(' ');
  badge.classList.toggle('has-error', !!(p && p.error));
  for (const tab of document.querySelectorAll('#tabs .tab')) {
    const td = docs.get(tab.dataset.uri);
    tab.classList.toggle('dirty', !!(td && td.dirty));
  }
}

function renderTabs() {
  const box = $('#tabs');
  box.replaceChildren(
    ...[...docs.values()].map((d) => {
      const close = el('button', { className: 'x', textContent: '×', title: 'ปิดบนมือถือ' });
      close.onclick = (e) => {
        e.stopPropagation();
        closeDoc(d.uri);
      };
      const tab = el('div', { className: 'tab' + (d.uri === current ? ' on' : '') }, el('span', { textContent: d.path.split('/').pop() }), close);
      tab.dataset.uri = d.uri;
      tab.onclick = () => showDoc(d.uri);
      return tab;
    })
  );
  box.hidden = docs.size === 0;
  box.querySelector('.on')?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
}

function fileRow(path, uri, extra = '') {
  const name = path.split('/').pop();
  const dir = path.slice(0, -name.length);
  const row = el('button', { className: 'file' + extra }, el('span', { className: 'name', textContent: name }), el('span', { className: 'dir', textContent: dir }));
  row.onclick = () => openDoc(uri);
  return row;
}

function renderPcTabs() {
  $('#pcTabs').replaceChildren(
    ...(pcTabs.length
      ? pcTabs.map((t) => fileRow(t.path, t.uri, (t.dirty ? ' dirty' : '') + (t.uri === pcActive ? ' active' : '')))
      : [el('p', { className: 'muted', textContent: 'ยังไม่มีไฟล์เปิดอยู่บนคอม' })])
  );
}

function renderSearch() {
  const q = $('#search').value.trim().toLowerCase();
  const box = $('#results');
  if (!fileList) return box.replaceChildren(el('p', { className: 'muted', textContent: 'กำลังโหลดรายชื่อไฟล์…' }));
  const terms = q.split(/\s+/).filter(Boolean);
  const hits = fileList.filter((f) => terms.every((t) => f.path.toLowerCase().includes(t))).slice(0, 80);
  box.replaceChildren(
    ...(hits.length ? hits.map((f) => fileRow(f.path, f.uri)) : [el('p', { className: 'muted', textContent: 'ไม่พบไฟล์' })])
  );
}

async function loadFiles() {
  fileList = null;
  renderSearch();
  try {
    fileList = (await api('/api/files')).files;
  } catch (err) {
    if (err instanceof AuthError) return showLogin(err.message);
    fileList = [];
    toast('โหลดรายชื่อไฟล์ไม่ได้');
  }
  renderSearch();
}

function openDrawer() {
  $('#drawer').classList.add('open');
  $('#scrim').hidden = false;
  if (!fileList) loadFiles();
}
function closeDrawer() {
  $('#drawer').classList.remove('open');
  $('#scrim').hidden = true;
}

function applyPrefs() {
  document.documentElement.style.setProperty('--fs', prefs.fontSize + 'px');
  $('#wrap').checked = prefs.wrap;
  $('#follow').checked = prefs.follow;
  $('#fsLabel').textContent = prefs.fontSize;
}

function setWrap(on) {
  prefs.wrap = on;
  store.set('wrap', on);
  const eff = wrapComp.reconfigure(on ? EditorView.lineWrapping : []);
  for (const d of docs.values()) {
    if (d.uri === current) view.dispatch({ effects: eff });
    else d.state = d.state.update({ effects: eff }).state;
  }
}

// Extra keys above the phone keyboard. pointerdown+preventDefault keeps the keyboard open.
const KEYS = [
  ['Tab', (v) => indentMore(v) || true, 'indent'],
  ['⇤', (v) => indentLess(v), 'outdent'],
  ['←', (v) => moveBy(v, -1)],
  ['→', (v) => moveBy(v, 1)],
  ['↶', (v) => undo(v)],
  ['↷', (v) => redo(v)],
  ...'{}()[];:="\'<>/\\|&!_-+*#$%`'.split('').map((ch) => [ch, (v) => insert(v, ch)]),
];
function insert(v, text) {
  v.dispatch(v.state.replaceSelection(text));
  return true;
}
function moveBy(v, n) {
  const head = Math.max(0, Math.min(v.state.doc.length, v.state.selection.main.head + n));
  v.dispatch({ selection: { anchor: head }, scrollIntoView: true });
  return true;
}
function buildKeybar() {
  const bar = $('#keybar');
  for (const [label, run] of KEYS) {
    const b = el('button', { textContent: label, type: 'button' });
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (!current) return;
      run(view);
      view.focus();
    });
    bar.append(b);
  }
}

function showLogin(reason) {
  setStatus('offline');
  $('#login').hidden = false;
  $('#loginReason').textContent =
    reason === 'blocked'
      ? 'ใส่รหัสผิดหลายครั้งเกินไป ถูกบล็อกชั่วคราว 15 นาที'
      : token
        ? 'รหัสไม่ถูกต้อง (อาจถูกรีเซ็ตบนคอม)'
        : 'ยังไม่มีรหัสเชื่อมต่อ';
}

function wire() {
  $('#menu').onclick = openDrawer;
  $('#scrim').onclick = closeDrawer;
  $('#save').onclick = saveCurrent;
  $('#cmd').onclick = openCommands;
  $('#cmdClose').onclick = closeCommands;
  $('#cmdReload').onclick = loadCommands;
  $('#cmdSearch').oninput = renderCommands;
  $('#problems').onclick = () => openLintPanel(view);
  $('#search').oninput = renderSearch;
  $('#reload').onclick = loadFiles;
  $('#wrap').onchange = (e) => setWrap(e.target.checked);
  $('#follow').onchange = (e) => {
    prefs.follow = e.target.checked;
    store.set('follow', prefs.follow);
    if (prefs.follow && pcActive) openDoc(pcActive, { quiet: true });
  };
  $('#fsDown').onclick = () => {
    prefs.fontSize = Math.max(9, prefs.fontSize - 1);
    store.set('fontSize', prefs.fontSize);
    applyPrefs();
  };
  $('#fsUp').onclick = () => {
    prefs.fontSize = Math.min(28, prefs.fontSize + 1);
    store.set('fontSize', prefs.fontSize);
    applyPrefs();
  };
  $('#forget').onclick = () => {
    if (!confirm('ลบรหัสเชื่อมต่อออกจากมือถือเครื่องนี้?')) return;
    store.del('token');
    store.del('open');
    location.reload();
  };
  $('#loginForm').onsubmit = (e) => {
    e.preventDefault();
    let v = $('#tokenInput').value.trim();
    const m = v.match(/#t=([^&\s]+)/);
    if (m) v = decodeURIComponent(m[1]);
    if (!v) return;
    token = v;
    store.set('token', v);
    $('#login').hidden = true;
    connect();
  };
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveCurrent();
    }
  });
  // Warn before leaving with edits that have not reached the computer yet.
  window.addEventListener('beforeunload', (e) => {
    if ([...docs.values()].some((d) => d.pending || d.inflight)) e.preventDefault();
  });
}

wire();
buildKeybar();
applyPrefs();
renderHeader();
if (token) connect();
else showLogin();
