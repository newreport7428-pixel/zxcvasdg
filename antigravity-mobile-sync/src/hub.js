'use strict';
// The hub: one Antigravity window owns the public port (and the VPS connection) and forwards
// each phone request to the right window. Every window runs its own SyncServer on a private
// 127.0.0.1 port and registers here. If the hub window closes, another window takes over.
//
//   phone ──▶ hub :8765 ──/w/<id>/api/...──▶ window <id> (127.0.0.1:<random>)
//                      └──/api/...        ──▶ the hub's own window (older phone pages)

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
const WINDOW_TTL = 25000;
const MAX_FAILS = 10;
const BLOCK_MS = 15 * 60 * 1000;
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
const isLoopback = (a) => a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1';

// Shared by all windows (they all know the token), so forwarded phone addresses can be trusted.
function agentNonceFor(token) {
  return crypto.createHmac('sha256', String(token)).update('mobile-sync-agent').digest('base64url');
}

class HubServer {
  constructor(opts) {
    this.opts = opts; // { host, port, token, mediaDir, ownId }
    this.tokenHash = sha(opts.token);
    this.nonce = agentNonceFor(opts.token);
    this.windows = new Map(); // id -> { id, name, folders, port, seen }
    this.fails = new Map();
    this.http = http.createServer((req, res) => this.handle(req, res));
    this.listening = false;
  }

  listen() {
    return new Promise((resolve, reject) => {
      this.http.once('error', reject);
      this.http.listen(this.opts.port, this.opts.host, () => {
        this.http.off('error', reject);
        this.listening = true;
        this.port = this.http.address().port;
        this.sweep = setInterval(() => this.expire(), 5000);
        resolve();
      });
    });
  }

  close() {
    this.listening = false;
    clearInterval(this.sweep);
    return new Promise((resolve) => {
      this.http.close(() => resolve());
      if (this.http.closeAllConnections) this.http.closeAllConnections();
    });
  }

  register(w) {
    const old = this.windows.get(w.id);
    this.windows.set(w.id, { ...old, ...w, seen: Date.now() });
  }

  expire() {
    for (const [id, w] of this.windows) {
      if (id !== this.opts.ownId && Date.now() - w.seen > WINDOW_TTL) this.windows.delete(id);
    }
  }

  list() {
    this.expire();
    return [...this.windows.values()]
      .map((w) => ({ id: w.id, name: w.name, folders: w.folders || [], hub: w.id === this.opts.ownId }))
      .sort((a, b) => (b.hub ? 1 : 0) - (a.hub ? 1 : 0) || a.name.localeCompare(b.name));
  }

  authed(req, address) {
    const f = this.fails.get(address);
    if (f && f.until > Date.now()) return 'blocked';
    const given = req.headers['x-token'];
    if (given && crypto.timingSafeEqual(sha(given), this.tokenHash)) {
      this.fails.delete(address);
      return 'ok';
    }
    const rec = f || { count: 0, until: 0 };
    if (++rec.count >= MAX_FAILS) {
      rec.count = 0;
      rec.until = Date.now() + BLOCK_MS;
    }
    this.fails.set(address, rec);
    return 'wrong';
  }

  json(res, code, obj) {
    res.writeHead(code, { ...SECURITY_HEADERS, 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(obj));
  }

  handle(req, res) {
    const url = new URL(req.url, 'http://x');
    const socketAddr = (req.socket.remoteAddress || '').replace(/^::ffff:/, '');
    // Requests that came through our own VPS relay client carry the phone's real address.
    const fromRelay =
      isLoopback(socketAddr) &&
      typeof req.headers['x-mobile-sync-agent'] === 'string' &&
      req.headers['x-mobile-sync-agent'].length === this.nonce.length &&
      crypto.timingSafeEqual(Buffer.from(req.headers['x-mobile-sync-agent']), Buffer.from(this.nonce));
    const remote = fromRelay ? String(req.headers['x-mobile-sync-remote'] || '?').slice(0, 64) : socketAddr;
    const address = fromRelay ? 'VPS:' + remote : remote;

    if (req.method === 'GET' && STATIC[url.pathname]) {
      const [file, type] = STATIC[url.pathname];
      try {
        const body = fs.readFileSync(path.join(this.opts.mediaDir, file));
        res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': type });
        return res.end(body);
      } catch {
        return this.json(res, 500, { ok: false, error: 'missing file' });
      }
    }

    // --- window registration (only from this computer)
    if (url.pathname.startsWith('/_hub/')) {
      if (!isLoopback(socketAddr) || fromRelay) return this.json(res, 403, { ok: false });
      if (url.pathname === '/_hub/ping') return this.json(res, 200, { mobileSync: true });
      if (this.authed(req, 'local') !== 'ok') return this.json(res, 401, { ok: false });
      return readBody(req, (body) => {
        if (url.pathname === '/_hub/register' && body && typeof body.id === 'string' && Number.isInteger(body.port)) {
          this.register({ id: body.id.slice(0, 64), name: String(body.name || '').slice(0, 200), folders: Array.isArray(body.folders) ? body.folders.slice(0, 50) : [], port: body.port });
          return this.json(res, 200, { ok: true });
        }
        if (url.pathname === '/_hub/unregister' && body && typeof body.id === 'string') {
          this.windows.delete(body.id);
          return this.json(res, 200, { ok: true });
        }
        return this.json(res, 404, { ok: false });
      });
    }

    if (url.pathname === '/api/windows') {
      const a = this.authed(req, address);
      if (a !== 'ok') return this.json(res, a === 'blocked' ? 429 : 401, { ok: false, error: a });
      return this.json(res, 200, { ok: true, windows: this.list() });
    }

    // --- forward to a window
    let target;
    let rest;
    const m = url.pathname.match(/^\/w\/([^/]+)(\/api\/.*)$/);
    if (m) {
      target = this.windows.get(decodeURIComponent(m[1]));
      rest = m[2] + url.search;
      if (!target) return this.json(res, 410, { ok: false, error: 'window-gone' });
    } else if (url.pathname.startsWith('/api/')) {
      target = this.windows.get(this.opts.ownId);
      rest = url.pathname + url.search;
    } else return this.json(res, 404, { ok: false, error: 'not found' });
    if (!target) return this.json(res, 503, { ok: false, error: 'window-gone' });

    const headers = { ...req.headers };
    delete headers.host;
    headers['x-mobile-sync-remote'] = remote;
    headers['x-mobile-sync-agent'] = this.nonce;
    const fwd = http.request({ host: '127.0.0.1', port: target.port, method: req.method, path: rest, headers }, (r) => {
      res.writeHead(r.statusCode, r.headers);
      r.pipe(res);
    });
    fwd.on('error', () => {
      if (!res.headersSent) this.json(res, 410, { ok: false, error: 'window-gone' });
      else res.end();
    });
    req.pipe(fwd);
    res.on('close', () => fwd.destroy());
  }
}

function readBody(req, cb) {
  const chunks = [];
  let size = 0;
  req.on('data', (c) => {
    size += c.length;
    if (size < 65536) chunks.push(c);
  });
  req.on('end', () => {
    try {
      cb(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
    } catch {
      cb(null);
    }
  });
}

// Small client used by non-hub windows.
function hubRequest(port, pathName, token, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path: pathName,
        method: body ? 'POST' : 'GET',
        headers: { 'X-Token': token || '', 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
        timeout: 3000,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') });
          } catch {
            resolve({ status: res.statusCode, body: null });
          }
        });
      }
    );
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    req.end(data);
  });
}

module.exports = { HubServer, hubRequest, agentNonceFor };
