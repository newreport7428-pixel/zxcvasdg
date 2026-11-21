'use strict';
// Connects this computer to your Mobile Sync relay on a VPS and forwards the phone's
// requests to the local server. The connection is made *from* the computer, so no ports
// need to be opened at home.

const http = require('http');
const crypto = require('crypto');
const WebSocket = require('ws');

// "https://host[:port]#key=...&pin=..." -> { url, key, pin, origin }
function parseConnectString(s) {
  const str = String(s || '').trim();
  const m = str.match(/^(https?):\/\/([^/#?\s]+)\/?#(.+)$/i);
  if (!m) throw new Error('รูปแบบไม่ถูกต้อง ต้องเป็น https://โดเมน#key=... (คัดลอกจากไฟล์ connect-string.txt บน VPS)');
  const params = new URLSearchParams(m[3]);
  const key = params.get('key');
  const pin = (params.get('pin') || '').toLowerCase().replace(/[^0-9a-f]/g, '');
  if (!key || key.length < 16) throw new Error('ไม่พบ key ในข้อความที่วาง');
  const scheme = m[1].toLowerCase();
  return {
    origin: `${scheme}://${m[2]}`,
    url: `${scheme === 'https' ? 'wss' : 'ws'}://${m[2]}/_ms_agent`,
    key,
    pin: pin || null,
  };
}

class RelayClient {
  /**
   * @param {{ connect: string, localHost: string, localPort: number, agentNonce: string,
   *           onStatus?: (s: 'connecting'|'online'|'offline'|'denied', detail?: string) => void }} opts
   */
  constructor(opts) {
    this.opts = opts;
    this.cfg = parseConnectString(opts.connect);
    this.ws = null;
    this.stopped = false;
    this.retry = 1000;
    this.reqs = new Map(); // id -> ClientRequest
    this.status = 'offline';
  }

  get origin() {
    return this.cfg.origin;
  }

  setStatus(s, detail) {
    this.status = s;
    if (this.opts.onStatus) this.opts.onStatus(s, detail);
  }

  start() {
    this.stopped = false;
    this.connect();
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.timer);
    for (const r of this.reqs.values()) r.destroy();
    this.reqs.clear();
    if (this.ws) this.ws.terminate();
    this.ws = null;
    this.setStatus('offline');
  }

  connect() {
    if (this.stopped) return;
    this.setStatus('connecting');
    const { url, pin } = this.cfg;
    // With a self-signed relay (IP address only) we check the certificate fingerprint ourselves
    // before answering the login challenge, so a fake relay learns nothing.
    const ws = new WebSocket(url, { rejectUnauthorized: !pin, handshakeTimeout: 15000, perMessageDeflate: false });
    this.ws = ws;
    let authed = false;

    ws.on('message', (data) => {
      let m;
      try {
        m = JSON.parse(data.toString());
      } catch {
        return;
      }
      if (!authed) {
        if (m.t === 'challenge') {
          if (pin) {
            const cert = ws._socket && ws._socket.getPeerCertificate && ws._socket.getPeerCertificate();
            const fp = cert && cert.fingerprint256 ? cert.fingerprint256.replace(/:/g, '').toLowerCase() : '';
            if (fp !== pin) {
              this.setStatus('denied', 'ใบรับรองของ VPS ไม่ตรงกับที่บันทึกไว้ (อาจมีคนดักกลางทาง หรือ VPS สร้างใบรับรองใหม่)');
              this.stopped = true;
              ws.terminate();
              return;
            }
          }
          const mac = crypto.createHmac('sha256', this.cfg.key).update(m.n).digest('hex');
          ws.send(JSON.stringify({ t: 'auth', mac }));
        } else if (m.t === 'ok') {
          authed = true;
          this.retry = 1000;
          this.setStatus('online');
        } else if (m.t === 'denied') {
          this.stopped = true;
          this.setStatus('denied', 'VPS ปฏิเสธ key นี้ (key ไม่ตรงกับ relay-config.json บน VPS)');
          ws.terminate();
        }
        return;
      }
      if (m.t === 'req') this.forward(m);
      else if (m.t === 'cancel') {
        const r = this.reqs.get(m.id);
        if (r) r.destroy();
        this.reqs.delete(m.id);
      }
    });

    ws.on('error', () => {}); // 'close' follows
    ws.on('close', () => {
      for (const r of this.reqs.values()) r.destroy();
      this.reqs.clear();
      if (this.ws === ws) this.ws = null;
      if (this.stopped) return;
      this.setStatus('offline');
      this.timer = setTimeout(() => this.connect(), this.retry);
      this.retry = Math.min(this.retry * 2, 30000);
    });
  }

  send(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(obj));
  }

  forward(m) {
    const { id } = m;
    const headers = { ...(m.h || {}) };
    for (const k of Object.keys(headers)) if (k.startsWith('x-mobile-sync-')) delete headers[k];
    headers['x-mobile-sync-remote'] = String(m.ip || '');
    headers['x-mobile-sync-agent'] = this.opts.agentNonce;
    const body = m.b ? Buffer.from(m.b, 'base64') : null;
    if (body) headers['content-length'] = String(body.length);
    const req = http.request(
      { host: this.opts.localHost, port: this.opts.localPort, method: m.m, path: m.p, headers },
      (res) => {
        const h = {};
        for (const [k, v] of Object.entries(res.headers)) h[k] = Array.isArray(v) ? v.join(', ') : String(v);
        this.send({ t: 'head', id, s: res.statusCode, h });
        res.on('data', (chunk) => this.send({ t: 'data', id, b: chunk.toString('base64') }));
        res.on('end', () => {
          this.reqs.delete(id);
          this.send({ t: 'end', id });
        });
        res.on('error', () => {
          this.reqs.delete(id);
          this.send({ t: 'end', id });
        });
      }
    );
    req.on('error', () => {
      if (!this.reqs.has(id)) return;
      this.reqs.delete(id);
      this.send({ t: 'head', id, s: 502, h: { 'content-type': 'text/plain' } });
      this.send({ t: 'end', id });
    });
    this.reqs.set(id, req);
    req.end(body || undefined);
  }
}

module.exports = { RelayClient, parseConnectString };
