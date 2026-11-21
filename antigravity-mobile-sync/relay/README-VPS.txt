Mobile Sync relay - quick install (Windows Server 2012 R2 or newer)

1. Add a DNS A record for a subdomain, e.g. code.yourdomain.com, pointing to this VPS.
2. Unzip this folder anywhere on the VPS.
3. Right-click install-relay.cmd -> "Run as administrator".
4. Type the subdomain from step 1.
   If IIS already uses port 80/443, the installer creates its own IIS website
   "MobileSync-<domain>" pointing to C:\mobile-sync\www (your websites are not touched).
   It tells you if the domain is already used by another IIS website or a port is taken.
5. When it says Done, the connect string is already copied to the clipboard.
   On your computer in Antigravity: Ctrl+Shift+P -> "Mobile Sync: Connect to VPS Relay" -> paste.
6. If your VPS provider has a firewall in its web panel, open the port the installer printed.

To remove: right-click uninstall-relay.cmd -> "Run as administrator"
(also removes the IIS website it created).
