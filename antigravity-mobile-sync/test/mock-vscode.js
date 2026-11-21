'use strict';
// Minimal fake of the parts of the `vscode` API that src/server.js uses.

class Emitter {
  constructor() {
    this.fns = new Set();
    this.event = (fn) => {
      this.fns.add(fn);
      return { dispose: () => this.fns.delete(fn) };
    };
  }
  fire(e) {
    for (const fn of this.fns) fn(e);
  }
}

class Position {
  constructor(line, character) {
    this.line = line;
    this.character = character;
  }
}
class Range {
  constructor(l1, c1, l2, c2) {
    this.start = new Position(l1, c1);
    this.end = new Position(l2, c2);
  }
  isEqual(o) {
    return (
      this.start.line === o.start.line &&
      this.start.character === o.start.character &&
      this.end.line === o.end.line &&
      this.end.character === o.end.character
    );
  }
}
class Uri {
  constructor(s) {
    this.s = s;
    const m = s.match(/^(\w+):\/\/(.*)$/);
    this.scheme = m[1];
    this.path = m[2];
    this.fsPath = m[2];
  }
  static parse(s) {
    return new Uri(s);
  }
  static file(p) {
    return new Uri('file://' + p);
  }
  toString() {
    return this.s;
  }
}
const EndOfLine = { LF: 1, CRLF: 2 };

const onChange = new Emitter();
const onSave = new Emitter();
const onClose = new Emitter();
const onTabs = new Emitter();
const onActive = new Emitter();

class TextDocument {
  constructor(uri, text, languageId) {
    this.uri = uri;
    this.text = text;
    this.languageId = languageId;
    this.version = 1;
    this.isDirty = false;
    this.eol = text.includes('\r\n') ? EndOfLine.CRLF : EndOfLine.LF;
    this.saved = text;
  }
  getText() {
    return this.text;
  }
  lines() {
    return this.text.split(this.eol === EndOfLine.CRLF ? '\r\n' : '\n');
  }
  offsetAt(p) {
    const lines = this.lines();
    const sep = this.eol === EndOfLine.CRLF ? 2 : 1;
    let off = 0;
    for (let i = 0; i < p.line; i++) off += lines[i].length + sep;
    return off + p.character;
  }
  validateRange(r) {
    const lines = this.lines();
    const fix = (p) => {
      const line = Math.min(p.line, lines.length - 1);
      return [line, Math.min(p.character, lines[line].length)];
    };
    return new Range(...fix(r.start), ...fix(r.end));
  }
  async save() {
    this.saved = this.text;
    this.isDirty = false;
    onSave.fire(this);
    return true;
  }
}

class WorkspaceEdit {
  constructor() {
    this.edits = [];
  }
  replace(uri, range, text) {
    this.edits.push({ uri, range, text });
  }
}

class TabInputText {
  constructor(uri) {
    this.uri = uri;
  }
}

const docs = [];
const group = { isActive: true, tabs: [] };
let activeTextEditor;

function refreshTabs() {
  group.tabs = docs.map((d) => ({
    input: new TabInputText(d.uri),
    label: d.uri.path.split('/').pop(),
    isDirty: d.isDirty,
    isActive: activeTextEditor && activeTextEditor.document === d,
  }));
  onTabs.fire({});
}

const workspace = {
  get textDocuments() {
    return docs;
  },
  onDidChangeTextDocument: onChange.event,
  onDidSaveTextDocument: onSave.event,
  onDidCloseTextDocument: onClose.event,
  async applyEdit(we) {
    const doc = docs.find((d) => d.uri.toString() === we.edits[0].uri.toString());
    const items = we.edits
      .map((e) => ({ ...e, from: doc.offsetAt(e.range.start), to: doc.offsetAt(e.range.end) }))
      .sort((a, b) => b.from - a.from);
    let t = doc.text;
    for (const e of items) t = t.slice(0, e.from) + e.text + t.slice(e.to);
    doc.text = t;
    doc.version++;
    const wasDirty = doc.isDirty;
    doc.isDirty = doc.text !== doc.saved;
    onChange.fire({ document: doc, contentChanges: items.map((e) => ({ range: e.range, text: e.text })) });
    if (wasDirty !== doc.isDirty) refreshTabs();
    return true;
  },
  async findFiles() {
    return docs.map((d) => d.uri);
  },
  asRelativePath(u) {
    return u.path.replace(/^\/proj\//, '');
  },
  getWorkspaceFolder(u) {
    return u.path.startsWith('/proj/') ? { uri: Uri.file('/proj') } : undefined;
  },
  async openTextDocument(u) {
    const d = docs.find((x) => x.uri.toString() === u.toString());
    if (!d) throw new Error('not found');
    return d;
  },
};

const window = {
  tabGroups: { all: [group], onDidChangeTabs: onTabs.event },
  onDidChangeActiveTextEditor: onActive.event,
  get activeTextEditor() {
    return activeTextEditor;
  },
  async showTextDocument(doc) {
    activeTextEditor = { document: doc };
    refreshTabs();
    onActive.fire(activeTextEditor);
  },
};

// Test helpers
function addDoc(path, text, languageId) {
  const d = new TextDocument(Uri.file(path), text, languageId);
  docs.push(d);
  activeTextEditor = { document: d };
  refreshTabs();
  return d;
}
async function pcInsert(doc, line, ch, text) {
  const we = new WorkspaceEdit();
  we.replace(doc.uri, new Range(line, ch, line, ch), text);
  return workspace.applyEdit(we);
}

module.exports = {
  vscode: { Range, Position, Uri, EndOfLine, WorkspaceEdit, TabInputText, workspace, window },
  addDoc,
  pcInsert,
};
