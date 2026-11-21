package main

// Helpers for the first-run setup on a VPS that already runs IIS.

import (
	"bufio"
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
)

// portBusy reports whether another program (e.g. IIS) already listens on addr.
func portBusy(addr string) bool {
	l, err := net.Listen("tcp", addr)
	if err != nil {
		return true
	}
	l.Close()
	return false
}

var (
	siteLine = regexp.MustCompile(`^SITE "(.+?)" \(id:\d+,bindings:(.*),state:\w+\)`)
	vdirPath = regexp.MustCompile(`physicalPath:(.*)\)\s*$`)
	envVar   = regexp.MustCompile(`%([^%]+)%`)
)

// detectIISFolder asks IIS (appcmd) which website answers on port 80 for host and returns
// its folder. Best effort: returns "" when IIS or the site cannot be found.
func detectIISFolder(host string) (site, folder string) {
	if runtime.GOOS != "windows" {
		return "", ""
	}
	appcmd := filepath.Join(os.Getenv("windir"), "system32", "inetsrv", "appcmd.exe")
	out, err := exec.Command(appcmd, "list", "site").Output()
	if err != nil {
		return "", ""
	}
	site = pickIISSite(string(out), host)
	if site == "" {
		return "", ""
	}
	out, err = exec.Command(appcmd, "list", "vdir", "/app.name:"+site+"/").Output()
	if err != nil {
		return site, ""
	}
	if p := parseVdirPath(string(out)); isDir(p) {
		return site, p
	}
	return site, ""
}

// pickIISSite chooses, from `appcmd list site` output, the started site that answers on
// port 80 for host, falling back to a site that answers for every host name.
func pickIISSite(out, host string) string {
	exact, catchAll := "", ""
	for _, line := range strings.Split(out, "\n") {
		line = strings.TrimSpace(line)
		m := siteLine.FindStringSubmatch(line)
		if m == nil || !strings.HasSuffix(line, "state:Started)") {
			continue
		}
		for _, b := range strings.Split(m[2], ",") {
			if !strings.HasPrefix(b, "http/") {
				continue
			}
			parts := strings.Split(strings.TrimPrefix(b, "http/"), ":") // ip:port:host
			if len(parts) != 3 || parts[1] != "80" {
				continue
			}
			if strings.EqualFold(parts[2], host) && exact == "" {
				exact = m[1]
			} else if parts[2] == "" && catchAll == "" {
				catchAll = m[1]
			}
		}
	}
	if exact != "" {
		return exact
	}
	return catchAll
}

func parseVdirPath(out string) string {
	for _, line := range strings.Split(out, "\n") {
		if m := vdirPath.FindStringSubmatch(strings.TrimSpace(line)); m != nil {
			return envVar.ReplaceAllStringFunc(m[1], func(v string) string {
				if val := os.Getenv(strings.Trim(v, "%")); val != "" {
					return val
				}
				return v
			})
		}
	}
	return ""
}

func isDir(p string) bool {
	st, err := os.Stat(p)
	return err == nil && st.IsDir()
}

// askWebroot asks for the IIS website folder, suggesting one it found, until it gets a real folder.
func askWebroot(in *bufio.Reader, host string) (string, error) {
	site, suggestion := detectIISFolder(host)
	if suggestion == "" && isDir(`C:\inetpub\wwwroot`) {
		suggestion = `C:\inetpub\wwwroot`
	}
	fmt.Println()
	fmt.Println("Port 80/443 is already used on this VPS (probably by IIS). That is fine:")
	fmt.Println("the relay will use port 8443 and get its HTTPS certificate through the")
	fmt.Println("folder of the IIS website that answers on port 80 for " + host + ".")
	if site != "" && suggestion != "" {
		fmt.Printf("Found IIS website %q in %s\n", site, suggestion)
	}
	for try := 0; try < 5; try++ {
		fmt.Println()
		if suggestion != "" {
			fmt.Printf("Press Enter to use %s, or type another folder:\n> ", suggestion)
		} else {
			fmt.Println(`Type the folder of that IIS website (IIS Manager -> the site -> Basic Settings -> Physical path):`)
			fmt.Print("> ")
		}
		line, err := in.ReadString('\n')
		ans := strings.Trim(strings.TrimSpace(line), `"`)
		if ans == "" && err != nil {
			return "", fmt.Errorf("no folder entered")
		}
		switch strings.ToLower(ans) {
		case "":
			if suggestion != "" {
				return suggestion, nil
			}
			fmt.Println("Please type a folder, for example C:\\inetpub\\wwwroot")
			continue
		case "y", "yes", "n", "no":
			fmt.Println("Please type the folder path itself, for example C:\\inetpub\\wwwroot")
			continue
		}
		if isDir(ans) {
			return ans, nil
		}
		fmt.Printf("Folder %q was not found. Please try again.\n", ans)
	}
	return "", fmt.Errorf("no valid folder entered")
}
