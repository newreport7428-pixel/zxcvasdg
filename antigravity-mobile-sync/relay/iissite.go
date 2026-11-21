package main

// First-run setup when IIS owns port 80/443: create a dedicated IIS website for the relay's
// domain, pointing at the relay's own folder, so existing websites are never touched.

import (
	"bufio"
	"errors"
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

type iisSite struct {
	Name     string
	Bindings []string
	State    string
}

// appcmdPath returns IIS's command-line tool, or "" when IIS is not installed.
// MOBILE_SYNC_APPCMD overrides it (used by tests).
func appcmdPath() string {
	if p := os.Getenv("MOBILE_SYNC_APPCMD"); p != "" {
		return p
	}
	if runtime.GOOS != "windows" {
		return ""
	}
	p := filepath.Join(os.Getenv("windir"), "system32", "inetsrv", "appcmd.exe")
	if _, err := os.Stat(p); err != nil {
		return ""
	}
	return p
}

func appcmd(args ...string) (string, error) {
	out, err := exec.Command(appcmdPath(), args...).CombinedOutput()
	return strings.TrimSpace(string(out)), err
}

func listIISSites() ([]iisSite, error) {
	out, err := appcmd("list", "site")
	if err != nil {
		return nil, fmt.Errorf("could not list IIS websites: %v %s", err, out)
	}
	var sites []iisSite
	for _, line := range strings.Split(out, "\n") {
		line = strings.TrimSpace(line)
		m := siteLine.FindStringSubmatch(line)
		if m == nil {
			continue
		}
		st := line[strings.LastIndex(line, "state:")+6 : len(line)-1]
		sites = append(sites, iisSite{Name: m[1], Bindings: strings.Split(m[2], ","), State: st})
	}
	return sites, nil
}

// bindingOwner returns the website that already has an http port-80 binding for host.
func bindingOwner(sites []iisSite, host string) *iisSite {
	for i, s := range sites {
		for _, b := range s.Bindings {
			parts := strings.Split(strings.TrimPrefix(b, "http/"), ":")
			if strings.HasPrefix(b, "http/") && len(parts) == 3 && parts[1] == "80" && strings.EqualFold(parts[2], host) {
				return &sites[i]
			}
		}
	}
	return nil
}

func siteName(host string) string { return "MobileSync-" + host }

// ensureIISSite creates (or reuses) the relay's own IIS website for host on port 80.
func ensureIISSite(host, folder string) error {
	if err := os.MkdirAll(folder, 0o755); err != nil {
		return err
	}
	index := filepath.Join(folder, "index.html")
	if _, err := os.Stat(index); os.IsNotExist(err) {
		os.WriteFile(index, []byte("<!doctype html><title>Mobile Sync</title>Mobile Sync relay certificate folder.\n"), 0o644)
	}
	name := siteName(host)
	sites, err := listIISSites()
	if err != nil {
		return err
	}
	exists := false
	for _, s := range sites {
		if s.Name == name {
			exists = true
		}
	}
	if !exists {
		out, err := appcmd("add", "site", "/name:"+name, "/bindings:http/*:80:"+host, "/physicalPath:"+folder)
		if err != nil {
			return fmt.Errorf("IIS could not create the website %s:\n  %s", name, out)
		}
	}
	out, err := appcmd("start", "site", "/site.name:"+name)
	sites, _ = listIISSites()
	for _, s := range sites {
		if s.Name == name && s.State == "Started" {
			return nil
		}
	}
	return fmt.Errorf("IIS created the website %s but could not start it:\n  %s %v\n"+
		"  -> Port 80 may be used by a program that is not IIS. Check with: netstat -ano | findstr :80", name, out, err)
}

func removeIISSite(host string) error {
	if appcmdPath() == "" || host == "" {
		return nil
	}
	name := siteName(host)
	sites, err := listIISSites()
	if err != nil {
		return err
	}
	for _, s := range sites {
		if s.Name == name {
			if out, err := appcmd("delete", "site", "/site.name:"+name); err != nil {
				return fmt.Errorf("could not remove IIS website %s: %s", name, out)
			}
			fmt.Println("Removed IIS website", name)
		}
	}
	return nil
}

// dnsNote warns early when the domain does not resolve (a common first-time mistake).
func dnsNote(host string) {
	addrs, err := net.LookupHost(host)
	if err != nil || len(addrs) == 0 {
		fmt.Printf("\n!! %s has no DNS record yet. Add an A record for it pointing to this VPS's IP\n", host)
		fmt.Println("   at your domain/DNS provider. New records can take a few minutes to work.")
		return
	}
	local := map[string]bool{}
	if ifaces, err := net.InterfaceAddrs(); err == nil {
		for _, a := range ifaces {
			if ipn, ok := a.(*net.IPNet); ok {
				local[ipn.IP.String()] = true
			}
		}
	}
	for _, a := range addrs {
		if local[a] {
			return
		}
	}
	fmt.Printf("\nNote: %s points to %s. Make sure that is this VPS's public IP.\n", host, strings.Join(addrs, ", "))
}

// setupBehindIIS decides how the relay gets its certificate when port 80/443 is taken.
// It may change cfg.Host if the user picks a subdomain.
func setupBehindIIS(in *bufio.Reader, cfg *Config, base string) error {
	if appcmdPath() == "" {
		// Something other than IIS owns the ports: fall back to asking for its web folder.
		wr, err := askWebroot(in, cfg.Host)
		if err != nil {
			return err
		}
		cfg.Webroot = wr
		return nil
	}
	fmt.Println()
	fmt.Println("IIS is using port 80/443 on this VPS. The relay will get its own IIS website")
	fmt.Println("(only for the certificate check) and serve phones on its own port.")
	for try := 0; try < 5; try++ {
		sites, err := listIISSites()
		if err != nil {
			return err
		}
		owner := bindingOwner(sites, cfg.Host)
		if owner == nil || owner.Name == siteName(cfg.Host) {
			dnsNote(cfg.Host)
			folder := filepath.Join(base, "www")
			if err := ensureIISSite(cfg.Host, folder); err != nil {
				return err
			}
			fmt.Printf("\nIIS website %q is ready: http://%s -> %s\n", siteName(cfg.Host), cfg.Host, folder)
			cfg.Webroot = folder
			cfg.IISSite = siteName(cfg.Host)
			return nil
		}
		fmt.Printf("\n!! %s is already used by your IIS website %q.\n", cfg.Host, owner.Name)
		fmt.Println("   The relay should use its own subdomain so your website is not touched.")
		fmt.Printf("   1) Add a DNS A record, e.g. code.%s, pointing to this VPS's IP\n", strings.TrimPrefix(cfg.Host, "www."))
		fmt.Println("   2) Type that subdomain here and press Enter:")
		fmt.Print("> ")
		line, rerr := in.ReadString('\n')
		h := strings.ToLower(strings.TrimSpace(line))
		h = strings.TrimSuffix(strings.TrimPrefix(strings.TrimPrefix(h, "https://"), "http://"), "/")
		if h == "" && rerr != nil {
			return errors.New("no domain entered")
		}
		if h == "" || strings.ContainsAny(h, " /:") || net.ParseIP(h) != nil {
			fmt.Println("Please type a domain name such as code." + cfg.Host)
			continue
		}
		cfg.Host = h
	}
	return errors.New("no usable domain entered")
}
