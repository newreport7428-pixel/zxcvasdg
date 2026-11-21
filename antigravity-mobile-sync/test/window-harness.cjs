'use strict';
// One fake "Antigravity window" running the built extension (dist/extension.js) with a mock
// vscode API. Started by test/windows.mjs with child_process.fork; talks to it over IPC.
const path = require('path');
const fs = require('fs');
const Module = require('module');
const mock = require('./mock-vscode.js');

const vs = mock.vscode;
const SHARED = process.env.SHARED; // secrets + globalState shared by all windows, like VS Code
const PORT = Number(process.env.PORT);
const ROOT = path.dirname(__dirname);
const send = (m) => process.send && process.send(m);

const readJson = (f) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(SHARED, f), 'utf8'));
  } catch {
    return {};
  }
};
const writeJson = (f, o) => fs.writeFileSync(path.join(SHARED, f), JSON.stringify(o));

// ---- workspace folders
let folders = [];
const folderChange = [];
function addFolderDocs(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isFile()) mock.addDoc(p, fs.readFileSync(p, 'utf8'), 'plaintext');
  }
}
function setFolders(list) {
  folders = list.map((p, i) => ({ name: path.basename(p), index: i, uri: vs.Uri.file(p) }));
}
if (process.env.FOLDER) {
  setFolders([process.env.FOLDER]);
  addFolderDocs(process.env.FOLDER);
}

const ws = vs.workspace;
Object.defineProperty(ws, 'workspaceFolders', { get: () => (folders.length ? folders : undefined) });
Object.defineProperty(ws, 'name', { get: () => (folders.length ? folders.map((f) => f.name).join(', ') : undefined) });
ws.getConfiguration = () => ({ get: (k, d) => (k === 'port' ? PORT : k === 'host' ? '127.0.0.1' : d) });
ws.onDidChangeWorkspaceFolders = (fn) => {
  folderChange.push(fn);
  return { dispose() {} };
};
ws.updateWorkspaceFolders = (start, del, ...adds) => {
  const paths = folders.map((f) => f.uri.fsPath);
  paths.splice(start, del || 0, ...adds.map((a) => a.uri.fsPath));
  setFolders(paths);
  for (const a of adds) addFolderDocs(a.uri.fsPath);
  for (const fn of folderChange) fn({});
  return true;
};
ws.getWorkspaceFolder = (u) => folders.find((f) => u.fsPath.startsWith(f.uri.fsPath + '/'));
ws.asRelativePath = (u) => {
  const f = ws.getWorkspaceFolder(u);
  if (!f) return u.fsPath;
  const rel = u.fsPath.slice(f.uri.fsPath.length + 1);
  return folders.length > 1 ? `${f.name}/${rel}` : rel;
};

// ---- window UI bits the extension touches
vs.StatusBarAlignment = { Right: 2 };
vs.ViewColumn = { Active: -1 };
vs.Uri.joinPath = (u, p) => vs.Uri.file(path.join(u.fsPath, p));
Object.assign(vs.window, {
  createStatusBarItem: () => ({
    show() {},
    dispose() {},
    set text(t) {
      send({ type: 'status', text: t });
    },
  }),
  showInformationMessage: (m) => send({ type: 'msg', m }),
  showWarningMessage: (m) => send({ type: 'msg', m }),
  showErrorMessage: (m) => send({ type: 'error', m }),
  createWebviewPanel: () => ({
    webview: {
      set html(h) {
        send({ type: 'qr', urls: [...h.matchAll(/<code>(http[^<]+)<\/code>/g)].map((x) => x[1].replace(/&amp;/g, '&')) });
      },
    },
    onDidDispose() {},
    reveal() {},
  }),
  showQuickPick: async () => undefined,
  showInputBox: async () => undefined,
});
vs.commands.registerCommand('vscode.openFolder', (uri, opts) => send({ type: 'openFolder', path: uri.fsPath, newWindow: !!(opts && opts.forceNewWindow) }));
vs.commands.registerCommand('_workbench.getRecentlyOpened', () => ({
  workspaces: (process.env.RECENT || '').split(':').filter(Boolean).map((p) => ({ folderUri: vs.Uri.file(p) })),
}));

// ---- load the real, bundled extension
const orig = Module._load;
Module._load = function (req, ...a) {
  return req === 'vscode' ? vs : orig.call(this, req, ...a);
};
const ext = require(path.join(ROOT, 'dist/extension.js'));
const context = {
  subscriptions: [],
  extensionUri: vs.Uri.file(ROOT),
  secrets: {
    get: async (k) => readJson('secrets.json')[k],
    store: async (k, v) => writeJson('secrets.json', { ...readJson('secrets.json'), [k]: v }),
    delete: async (k) => {
      const o = readJson('secrets.json');
      delete o[k];
      writeJson('secrets.json', o);
    },
  },
  globalState: {
    get: (k, d) => (k in readJson('global.json') ? readJson('global.json')[k] : d),
    update: async (k, v) => writeJson('global.json', { ...readJson('global.json'), [k]: v }),
  },
};
ext.activate(context);
send({ type: 'ready' });

process.on('message', async (m) => {
  if (m.type === 'cmd') await vs.commands.executeCommand(m.id);
  if (m.type === 'text') {
    const d = vs.workspace.textDocuments.find((x) => x.uri.fsPath === m.path);
    send({ type: 'text', id: m.id, text: d ? d.getText() : null });
  }
  if (m.type === 'exit') {
    await ext.deactivate();
    process.exit(0);
  }
});
