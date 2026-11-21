package main

import (
	"os"
	"testing"
)

const sampleSites = "SITE \"Default Web Site\" (id:1,bindings:http/*:80:,https/*:443:,net.tcp/808:*,state:Started)\r\n" +
	"SITE \"newgtx\" (id:2,bindings:http/*:80:newgtx.net,http/*:80:www.newgtx.net,https/*:443:newgtx.net,state:Started)\r\n" +
	"SITE \"old\" (id:3,bindings:http/*:80:code.newgtx.net,state:Stopped)\r\n"

func TestPickIISSite(t *testing.T) {
	cases := map[string]string{
		"newgtx.net":      "newgtx",           // exact host binding wins
		"WWW.newgtx.net":  "newgtx",           // case-insensitive
		"code.newgtx.net": "Default Web Site", // stopped site ignored, catch-all used
		"other.com":       "Default Web Site",
	}
	for host, want := range cases {
		if got := pickIISSite(sampleSites, host); got != want {
			t.Errorf("pickIISSite(%q) = %q, want %q", host, got, want)
		}
	}
	if got := pickIISSite("SITE \"a\" (id:1,bindings:http/*:8080:,state:Started)", "x.com"); got != "" {
		t.Errorf("site without port 80 should not match, got %q", got)
	}
}

func TestParseVdirPath(t *testing.T) {
	os.Setenv("SystemDrive", "C:")
	out := "VDIR \"Default Web Site/\" (physicalPath:%SystemDrive%\\inetpub\\wwwroot)\r\n"
	if got := parseVdirPath(out); got != `C:\inetpub\wwwroot` {
		t.Errorf("got %q", got)
	}
	out = "VDIR \"newgtx/\" (physicalPath:D:\\Sites\\newgtx (live))\r\n"
	if got := parseVdirPath(out); got != `D:\Sites\newgtx (live)` {
		t.Errorf("got %q", got)
	}
}
