Mobile Sync relay - quick install (Windows Server 2012 R2 or newer)

1. Unzip this folder anywhere on the VPS.
2. Right-click install-relay.cmd -> "Run as administrator".
3. Type your domain (e.g. newgtx.net or code.newgtx.net; its DNS A record must point to this VPS).
   If IIS already uses port 80/443, the installer notices it, suggests the IIS website folder,
   and you just press Enter (or type the folder path, e.g. C:\inetpub\wwwroot).
4. When it says Done, the connect string is already copied to the clipboard.
   On your computer in Antigravity: Ctrl+Shift+P -> "Mobile Sync: Connect to VPS Relay" -> paste.
5. If your VPS provider has a firewall in its web panel, open the port the installer printed.

To remove: right-click uninstall-relay.cmd -> "Run as administrator".
