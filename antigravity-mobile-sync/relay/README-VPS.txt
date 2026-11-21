Mobile Sync relay - quick install (Windows Server 2012 R2 or newer)

1. Unzip this folder anywhere on the VPS.
2. Right-click install-relay.cmd -> "Run as administrator".
3. Answer the two questions:
     - your domain for the relay, e.g. code.example.com (its DNS A record must point to this VPS)
     - if IIS already uses port 80/443: the IIS website folder, e.g. C:\inetpub\wwwroot
       (that website must answer on port 80 for the domain above)
       otherwise just press Enter
4. When it says Done, the connect string is already copied to the clipboard.
   On your computer in Antigravity: Ctrl+Shift+P -> "Mobile Sync: Connect to VPS Relay" -> paste.
5. If your VPS provider has a firewall in its web panel, open the port the installer printed.

To remove: right-click uninstall-relay.cmd -> "Run as administrator".
