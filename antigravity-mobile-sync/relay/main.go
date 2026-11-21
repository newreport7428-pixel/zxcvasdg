// Mobile Sync relay: runs on your VPS so the phone can reach Antigravity from anywhere.
//
//	phone --HTTPS--> relay (VPS) <--WSS-- Antigravity extension (your computer)
//
// The computer dials out to the relay, so nothing needs to be opened on your home router.
// The relay only forwards requests; the secret key in the phone link is still checked on
// your computer. Built with Go 1.20 so it also runs on Windows Server 2012 / 2012 R2.
package main

import (
	"bufio"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	_ "embed"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"encoding/pem"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"math/big"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gorilla/websocket"
	"golang.org/x/crypto/acme"
	"golang.org/x/crypto/acme/autocert"
)

//go:embed isrg-root-x1.pem
var isrgRoot []byte

const (
	agentPath   = "/_ms_agent"
	maxBody     = 10 << 20
	maxFails    = 10
	blockFor    = 15 * time.Minute
	headTimeout = 60 * time.Second
)

type Config struct {
	Host     string `json:"host"`              // domain name (Let's Encrypt) or public IP (self-signed)
	AgentKey string `json:"agentKey"`          // shared with the extension, never sent over the wire
	Listen   string `json:"listen,omitempty"`  // HTTPS address, default :443
	Webroot  string `json:"webroot,omitempty"` // IIS site folder when IIS owns port 80
}

// ---------------------------------------------------------------- messages

type msg struct {
	T  string            `json:"t"`
	ID uint64            `json:"id,omitempty"`
	M  string            `json:"m,omitempty"`  // method
	P  string            `json:"p,omitempty"`  // path + query
	H  map[string]string `json:"h,omitempty"`  // headers
	IP string            `json:"ip,omitempty"` // phone address
	B  string            `json:"b,omitempty"`  // base64 body / chunk
	S  int               `json:"s,omitempty"`  // status
	N  string            `json:"n,omitempty"`  // challenge nonce
	// auth reply
	Mac string `json:"mac,omitempty"`
}

// ---------------------------------------------------------------- agent

type stream struct {
	ch   chan msg
	done chan struct{}
	once sync.Once
}

func (s *stream) close() { s.once.Do(func() { close(s.done) }) }

type agent struct {
	conn    *websocket.Conn
	wmu     sync.Mutex
	mu      sync.Mutex
	streams map[uint64]*stream
	closed  chan struct{}
}

func (a *agent) send(m msg) error {
	a.wmu.Lock()
	defer a.wmu.Unlock()
	a.conn.SetWriteDeadline(time.Now().Add(20 * time.Second))
	return a.conn.WriteJSON(m)
}

func (a *agent) shutdown() {
	a.mu.Lock()
	defer a.mu.Unlock()
	select {
	case <-a.closed:
		return
	default:
	}
	close(a.closed)
	a.conn.Close()
	for _, s := range a.streams {
		s.close()
	}
	a.streams = map[uint64]*stream{}
}

type relay struct {
	cfg    Config
	mu     sync.Mutex
	cur    *agent
	nextID uint64
	fails  sync.Map // ip -> *failRec
	up     websocket.Upgrader
}

type failRec struct {
	mu    sync.Mutex
	count int
	until time.Time
}

func (r *relay) blocked(ip string) bool {
	v, ok := r.fails.Load(ip)
	if !ok {
		return false
	}
	f := v.(*failRec)
	f.mu.Lock()
	defer f.mu.Unlock()
	return time.Now().Before(f.until)
}

func (r *relay) fail(ip string) {
	v, _ := r.fails.LoadOrStore(ip, &failRec{})
	f := v.(*failRec)
	f.mu.Lock()
	defer f.mu.Unlock()
	f.count++
	if f.count >= maxFails {
		f.count = 0
		f.until = time.Now().Add(blockFor)
		log.Printf("blocked %s for %v after repeated failed computer logins", ip, blockFor)
	}
}

func (r *relay) current() *agent {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.cur
}

// The computer connects here. It proves it knows the key with an HMAC over a fresh nonce,
// so the key itself never travels over the network.
func (r *relay) handleAgent(w http.ResponseWriter, req *http.Request) {
	ip := clientIP(req)
	if r.blocked(ip) {
		http.Error(w, "blocked", http.StatusTooManyRequests)
		return
	}
	conn, err := r.up.Upgrade(w, req, nil)
	if err != nil {
		return
	}
	conn.SetReadLimit(64 << 20)
	nonce := randString(32)
	conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
	if err := conn.WriteJSON(msg{T: "challenge", N: nonce}); err != nil {
		conn.Close()
		return
	}
	conn.SetReadDeadline(time.Now().Add(15 * time.Second))
	var reply msg
	if err := conn.ReadJSON(&reply); err != nil || reply.T != "auth" {
		conn.Close()
		return
	}
	mac := hmac.New(sha256.New, []byte(r.cfg.AgentKey))
	mac.Write([]byte(nonce))
	want := hex.EncodeToString(mac.Sum(nil))
	if subtle.ConstantTimeCompare([]byte(want), []byte(reply.Mac)) != 1 {
		r.fail(ip)
		conn.WriteJSON(msg{T: "denied"})
		conn.Close()
		log.Printf("rejected computer login from %s (wrong key)", ip)
		return
	}
	conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
	conn.WriteJSON(msg{T: "ok"})

	a := &agent{conn: conn, streams: map[uint64]*stream{}, closed: make(chan struct{})}
	r.mu.Lock()
	old := r.cur
	r.cur = a
	r.mu.Unlock()
	if old != nil {
		old.shutdown()
	}
	log.Printf("computer connected from %s", ip)

	// keepalive
	conn.SetReadDeadline(time.Now().Add(75 * time.Second))
	conn.SetPongHandler(func(string) error { return conn.SetReadDeadline(time.Now().Add(75 * time.Second)) })
	go func() {
		t := time.NewTicker(25 * time.Second)
		defer t.Stop()
		for {
			select {
			case <-a.closed:
				return
			case <-t.C:
				a.wmu.Lock()
				err := conn.WriteControl(websocket.PingMessage, nil, time.Now().Add(10*time.Second))
				a.wmu.Unlock()
				if err != nil {
					a.shutdown()
					return
				}
			}
		}
	}()

	for {
		var m msg
		if err := conn.ReadJSON(&m); err != nil {
			break
		}
		conn.SetReadDeadline(time.Now().Add(75 * time.Second))
		a.mu.Lock()
		s := a.streams[m.ID]
		a.mu.Unlock()
		if s == nil {
			continue
		}
		select {
		case s.ch <- m:
		case <-s.done:
		default:
			// phone is reading too slowly; drop this request rather than stall everyone
			s.close()
			a.send(msg{T: "cancel", ID: m.ID})
		}
	}
	a.shutdown()
	r.mu.Lock()
	if r.cur == a {
		r.cur = nil
	}
	r.mu.Unlock()
	log.Printf("computer disconnected")
}

var hopHeaders = map[string]bool{
	"connection": true, "keep-alive": true, "proxy-connection": true, "transfer-encoding": true,
	"upgrade": true, "te": true, "trailer": true, "content-length": true,
}

func (r *relay) handlePhone(w http.ResponseWriter, req *http.Request) {
	a := r.current()
	if a == nil {
		offline(w)
		return
	}
	body, err := io.ReadAll(io.LimitReader(req.Body, maxBody+1))
	if err != nil || len(body) > maxBody {
		http.Error(w, "request too large", http.StatusRequestEntityTooLarge)
		return
	}
	h := map[string]string{}
	for k, v := range req.Header {
		lk := strings.ToLower(k)
		if hopHeaders[lk] || strings.HasPrefix(lk, "x-mobile-sync-") || len(v) == 0 {
			continue
		}
		h[lk] = strings.Join(v, ", ")
	}
	id := atomic.AddUint64(&r.nextID, 1)
	s := &stream{ch: make(chan msg, 256), done: make(chan struct{})}
	a.mu.Lock()
	select {
	case <-a.closed:
		a.mu.Unlock()
		offline(w)
		return
	default:
	}
	a.streams[id] = s
	a.mu.Unlock()
	defer func() {
		a.mu.Lock()
		delete(a.streams, id)
		a.mu.Unlock()
	}()

	out := msg{T: "req", ID: id, M: req.Method, P: req.URL.RequestURI(), H: h, IP: clientIP(req)}
	if len(body) > 0 {
		out.B = base64.StdEncoding.EncodeToString(body)
	}
	if err := a.send(out); err != nil {
		offline(w)
		return
	}

	flusher, _ := w.(http.Flusher)
	gotHead := false
	timer := time.NewTimer(headTimeout)
	defer timer.Stop()
	for {
		select {
		case m := <-s.ch:
			switch m.T {
			case "head":
				for k, v := range m.H {
					if !hopHeaders[strings.ToLower(k)] {
						w.Header().Set(k, v)
					}
				}
				w.WriteHeader(m.S)
				gotHead = true
				timer.Stop()
				if flusher != nil {
					flusher.Flush()
				}
			case "data":
				b, _ := base64.StdEncoding.DecodeString(m.B)
				if _, err := w.Write(b); err != nil {
					a.send(msg{T: "cancel", ID: id})
					return
				}
				if flusher != nil {
					flusher.Flush()
				}
			case "end":
				return
			}
		case <-s.done:
			if !gotHead {
				offline(w)
			}
			return
		case <-timer.C:
			a.send(msg{T: "cancel", ID: id})
			if !gotHead {
				http.Error(w, "computer did not answer", http.StatusGatewayTimeout)
			}
			return
		case <-req.Context().Done():
			a.send(msg{T: "cancel", ID: id})
			return
		}
	}
}

func offline(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Retry-After", "5")
	w.WriteHeader(http.StatusServiceUnavailable)
	io.WriteString(w, `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mobile Sync</title><body style="font-family:system-ui;background:#282c34;color:#d7dae0;padding:24px">
<h2>คอมยังไม่ได้เชื่อมต่อกับ VPS</h2><p>เปิด Antigravity แล้วสั่ง <b>Mobile Sync: Start</b> หน้านี้จะลองใหม่เองทุก 5 วินาที</p>
<script>setTimeout(function(){location.reload()},5000)</script>`)
}

func clientIP(req *http.Request) string {
	host, _, err := net.SplitHostPort(req.RemoteAddr)
	if err != nil {
		return req.RemoteAddr
	}
	return host
}

func randString(n int) string {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return base64.RawURLEncoding.EncodeToString(b)
}

// ---------------------------------------------------------------- TLS

func selfSigned(dir, ip string) (tls.Certificate, string, error) {
	certFile := filepath.Join(dir, "selfsigned-cert.pem")
	keyFile := filepath.Join(dir, "selfsigned-key.pem")
	if c, err := tls.LoadX509KeyPair(certFile, keyFile); err == nil {
		return c, fingerprint(c), nil
	}
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return tls.Certificate{}, "", err
	}
	serial, _ := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 120))
	tmpl := &x509.Certificate{
		SerialNumber:          serial,
		Subject:               pkix.Name{CommonName: "Mobile Sync relay " + ip},
		NotBefore:             time.Now().Add(-time.Hour),
		NotAfter:              time.Now().AddDate(10, 0, 0),
		KeyUsage:              x509.KeyUsageDigitalSignature | x509.KeyUsageCertSign,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
		IsCA:                  true,
		IPAddresses:           []net.IP{net.ParseIP(ip)},
	}
	der, err := x509.CreateCertificate(rand.Reader, tmpl, tmpl, &key.PublicKey, key)
	if err != nil {
		return tls.Certificate{}, "", err
	}
	kb, _ := x509.MarshalECPrivateKey(key)
	os.WriteFile(certFile, pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der}), 0o600)
	os.WriteFile(keyFile, pem.EncodeToMemory(&pem.Block{Type: "EC PRIVATE KEY", Bytes: kb}), 0o600)
	c, err := tls.LoadX509KeyPair(certFile, keyFile)
	return c, fingerprint(c), err
}

func fingerprint(c tls.Certificate) string {
	sum := sha256.Sum256(c.Certificate[0])
	return hex.EncodeToString(sum[:])
}

// ---------------------------------------------------------------- setup

func loadOrCreateConfig(path string) (Config, error) {
	var cfg Config
	if b, err := os.ReadFile(path); err == nil {
		if err := json.Unmarshal(b, &cfg); err != nil {
			return cfg, fmt.Errorf("%s is broken: %v (delete it to start over)", path, err)
		}
		if cfg.Host == "" || len(cfg.AgentKey) < 16 {
			return cfg, fmt.Errorf("%s is missing host or agentKey (delete it to start over)", path)
		}
		return cfg, nil
	}
	fmt.Println("=== Mobile Sync relay: first-time setup ===")
	fmt.Println("Enter this VPS's domain name (recommended, e.g. mycode.duckdns.org)")
	fmt.Println("or its public IP address (works, but the phone will show a certificate warning):")
	fmt.Print("> ")
	in := bufio.NewReader(os.Stdin)
	line, _ := in.ReadString('\n')
	cfg.Host = strings.ToLower(strings.TrimSpace(line))
	cfg.Host = strings.TrimPrefix(strings.TrimPrefix(cfg.Host, "https://"), "http://")
	cfg.Host = strings.TrimSuffix(cfg.Host, "/")
	if cfg.Host == "" || strings.ContainsAny(cfg.Host, " /:") {
		return cfg, errors.New("no valid domain or IP entered")
	}
	if net.ParseIP(cfg.Host) == nil && (webrootPortsBusy()) {
		wr, err := askWebroot(in, cfg.Host)
		if err != nil {
			return cfg, err
		}
		cfg.Webroot = wr
		cfg.Listen = ":8443"
	}
	cfg.AgentKey = randString(32)
	b, _ := json.MarshalIndent(cfg, "", "  ")
	if err := os.WriteFile(path, b, 0o600); err != nil {
		return cfg, err
	}
	return cfg, nil
}

// webrootPortsBusy is replaceable in tests.
var webrootPortsBusy = func() bool { return portBusy(":80") || portBusy(":443") }

func main() {
	exe, _ := os.Executable()
	base := filepath.Dir(exe)
	cfgPath := flag.String("config", filepath.Join(base, "relay-config.json"), "config file")
	listen := flag.String("listen", "", "HTTPS address (default from config, else :443)")
	httpListen := flag.String("http", ":80", "HTTP address for redirects and certificate checks (empty to disable)")
	devPlain := flag.String("dev-plain-http", "", "TESTING ONLY: serve without TLS on this address")
	acmeDir := flag.String("acme-directory", autocert.DefaultACMEDirectory, "ACME directory URL")
	acmeCA := flag.String("acme-ca", "", "TESTING ONLY: extra CA file to trust for the ACME server")
	selfCheckAddr := flag.String("selfcheck-addr", "", "TESTING ONLY: address used for the webroot self-check")
	setupOnly := flag.Bool("setup", false, "ask the setup questions, get the certificate, write connect-string.txt, then exit")
	printPorts := flag.Bool("print-ports", false, "print the TCP ports to open in the firewall, then exit")
	flag.Parse()

	logFile, err := os.OpenFile(filepath.Join(base, "relay.log"), os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o600)
	if err == nil {
		log.SetOutput(io.MultiWriter(os.Stderr, logFile))
	}

	cfg, err := loadOrCreateConfig(*cfgPath)
	if err != nil {
		log.Fatal(err)
	}
	certDir := filepath.Join(base, "certs")
	os.MkdirAll(certDir, 0o700)
	if *listen == "" {
		*listen = cfg.Listen
	}
	if *listen == "" {
		*listen = ":443"
	}
	if cfg.Webroot != "" {
		*httpListen = "" // IIS owns port 80
	}
	if *printPorts {
		ports := []string{}
		for _, a := range []string{*listen, *httpListen} {
			if _, p, err := net.SplitHostPort(a); err == nil && p != "" {
				ports = append(ports, p)
			}
		}
		fmt.Println(strings.Join(ports, ","))
		return
	}
	if *setupOnly {
		*httpListen = "" // do not start listeners while only setting up
	}
	roots, err := x509.SystemCertPool()
	if err != nil || roots == nil {
		roots = x509.NewCertPool()
	}
	roots.AppendCertsFromPEM(isrgRoot) // old Windows may lack the Let's Encrypt root
	if *acmeCA != "" {
		if b, err := os.ReadFile(*acmeCA); err == nil {
			roots.AppendCertsFromPEM(b)
		}
	}
	acmeClient := &acme.Client{
		DirectoryURL: *acmeDir,
		HTTPClient: &http.Client{Timeout: 60 * time.Second, Transport: &http.Transport{
			Proxy:           http.ProxyFromEnvironment,
			TLSClientConfig: &tls.Config{RootCAs: roots},
		}},
	}

	r := &relay{cfg: cfg, up: websocket.Upgrader{ReadBufferSize: 32 << 10, WriteBufferSize: 32 << 10}}
	mux := http.NewServeMux()
	mux.HandleFunc(agentPath, r.handleAgent)
	mux.HandleFunc("/", r.handlePhone)

	isIP := net.ParseIP(cfg.Host) != nil
	hostPort := cfg.Host
	if _, port, err := net.SplitHostPort(*listen); err == nil && port != "443" {
		hostPort = net.JoinHostPort(cfg.Host, port)
	}
	connect := "https://" + hostPort + "#key=" + cfg.AgentKey

	srv := &http.Server{Handler: mux, ReadHeaderTimeout: 20 * time.Second, IdleTimeout: 120 * time.Second}

	if *devPlain != "" {
		srv.Addr = *devPlain
		fmt.Println("CONNECT STRING:", "http://"+*devPlain+"#key="+cfg.AgentKey)
		log.Printf("TESTING mode, no TLS, listening on %s", *devPlain)
		log.Fatal(srv.ListenAndServe())
	}

	if isIP {
		cert, fp, err := selfSigned(certDir, cfg.Host)
		if err != nil {
			log.Fatal(err)
		}
		connect += "&pin=" + fp
		srv.TLSConfig = &tls.Config{Certificates: []tls.Certificate{cert}, MinVersion: tls.VersionTLS12}
		if *httpListen != "" {
			go func() {
				err := http.ListenAndServe(*httpListen, http.HandlerFunc(redirectHTTPS))
				if err != nil {
					log.Printf("note: HTTP redirect on %s not available: %v", *httpListen, err)
				}
			}()
		}
	} else if cfg.Webroot != "" {
		wc := &webrootCerts{host: cfg.Host, webroot: cfg.Webroot, dir: certDir, client: acmeClient, selfCheckAddr: *selfCheckAddr}
		log.Printf("getting a certificate for %s through the IIS folder %s ...", cfg.Host, cfg.Webroot)
		if err := wc.start(); err != nil {
			log.Fatalf("could not get a certificate: %v", err)
		}
		srv.TLSConfig = &tls.Config{GetCertificate: wc.GetCertificate, MinVersion: tls.VersionTLS12}
	} else {
		m := &autocert.Manager{
			Prompt:     autocert.AcceptTOS,
			HostPolicy: autocert.HostWhitelist(cfg.Host),
			Cache:      autocert.DirCache(certDir),
			Client:     acmeClient,
		}
		srv.TLSConfig = m.TLSConfig()
		srv.TLSConfig.MinVersion = tls.VersionTLS12
		if *httpListen != "" {
			go func() {
				err := http.ListenAndServe(*httpListen, m.HTTPHandler(http.HandlerFunc(redirectHTTPS)))
				if err != nil {
					log.Printf("note: port 80 not available (%v); certificates will use port 443 only", err)
				}
			}()
		}
	}
	// No HSTS header: it would also apply to any website on the same domain at port 443.

	os.WriteFile(filepath.Join(base, "connect-string.txt"), []byte(connect+"\r\n"), 0o600)
	if *setupOnly {
		fmt.Println()
		fmt.Println("Setup finished. Connect string saved in connect-string.txt:")
		fmt.Println(" ", connect)
		return
	}
	fmt.Println()
	fmt.Println("================================================================")
	fmt.Println(" Mobile Sync relay is running on", *listen)
	fmt.Println(" Paste this into Antigravity -> Mobile Sync: Connect to VPS Relay")
	fmt.Println(" (also saved in connect-string.txt next to this program):")
	fmt.Println()
	fmt.Println(" ", connect)
	fmt.Println()
	fmt.Println(" Keep it secret. Delete relay-config.json to create a new key.")
	fmt.Println("================================================================")

	srv.Addr = *listen
	log.Printf("listening on %s for %s", *listen, cfg.Host)
	log.Fatal(srv.ListenAndServeTLS("", ""))
}

func redirectHTTPS(w http.ResponseWriter, req *http.Request) {
	host := req.Host
	if h, _, err := net.SplitHostPort(host); err == nil {
		host = h
	}
	http.Redirect(w, req, "https://"+host+req.URL.RequestURI(), http.StatusMovedPermanently)
}
