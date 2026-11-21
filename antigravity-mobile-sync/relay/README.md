# mobile-sync-relay

Runs on a VPS so the phone can reach Mobile Sync from anywhere. See the main README (Thai) for setup.

Build (Go 1.20 so it still runs on Windows Server 2012 / 2012 R2):

    npm run relay

Modes, chosen on first run and saved in `relay-config.json` next to the program:
- domain, ports 80/443 free: Let's Encrypt via TLS-ALPN / HTTP-01 (autocert), HTTPS on :443
- domain, IIS owns port 80/443: HTTP-01 through the IIS site folder (`webroot`), HTTPS on :8443
- IP only: self-signed certificate; the extension pins its SHA-256 fingerprint

Testing flags: `-dev-plain-http`, `-acme-directory`, `-acme-ca`, `-selfcheck-addr`.
