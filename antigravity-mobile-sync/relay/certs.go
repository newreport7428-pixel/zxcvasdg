package main

// Let's Encrypt certificates when IIS (or another web server) already owns port 80/443.
// The relay writes the ACME HTTP-01 challenge file into the IIS website folder, IIS serves it
// on port 80 as a normal static file, and the relay itself serves HTTPS on another port.

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"encoding/pem"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"time"

	"golang.org/x/crypto/acme"
)

const challengeWebConfig = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Written by Mobile Sync relay: lets IIS serve Let's Encrypt challenge files (no extension). -->
<configuration>
  <system.webServer>
    <staticContent>
      <clear />
      <mimeMap fileExtension="." mimeType="text/plain" />
    </staticContent>
  </system.webServer>
</configuration>
`

type webrootCerts struct {
	host          string
	webroot       string
	dir           string
	client        *acme.Client
	selfCheckAddr string // testing: dial this instead of host:80
	cur           atomic.Value
}

func (w *webrootCerts) GetCertificate(*tls.ClientHelloInfo) (*tls.Certificate, error) {
	c, _ := w.cur.Load().(*tls.Certificate)
	if c == nil {
		return nil, errors.New("certificate not ready yet")
	}
	return c, nil
}

func (w *webrootCerts) certPath() string { return filepath.Join(w.dir, w.host+".crt") }
func (w *webrootCerts) keyPath() string  { return filepath.Join(w.dir, w.host+".key") }

// load returns true when a saved certificate exists and does not need renewing yet.
func (w *webrootCerts) load() bool {
	c, err := tls.LoadX509KeyPair(w.certPath(), w.keyPath())
	if err != nil {
		return false
	}
	leaf, err := x509.ParseCertificate(c.Certificate[0])
	if err != nil || time.Now().After(leaf.NotAfter) {
		return false
	}
	c.Leaf = leaf
	w.cur.Store(&c)
	return !w.needsRenewal()
}

// needsRenewal: renew once a third of the certificate's lifetime is left (works for 90-day,
// 45-day and short-lived certificates alike).
func (w *webrootCerts) needsRenewal() bool {
	c, _ := w.cur.Load().(*tls.Certificate)
	if c == nil || c.Leaf == nil {
		return true
	}
	life := c.Leaf.NotAfter.Sub(c.Leaf.NotBefore)
	return time.Until(c.Leaf.NotAfter) < life/3
}

func loadOrCreateKey(path string) (*ecdsa.PrivateKey, error) {
	if b, err := os.ReadFile(path); err == nil {
		if blk, _ := pem.Decode(b); blk != nil {
			return x509.ParseECPrivateKey(blk.Bytes)
		}
	}
	k, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, err
	}
	der, _ := x509.MarshalECPrivateKey(k)
	return k, os.WriteFile(path, pem.EncodeToMemory(&pem.Block{Type: "EC PRIVATE KEY", Bytes: der}), 0o600)
}

func (w *webrootCerts) obtain(ctx context.Context) error {
	if w.client.Key == nil {
		k, err := loadOrCreateKey(filepath.Join(w.dir, "acme-account.key"))
		if err != nil {
			return err
		}
		w.client.Key = k
		if _, err := w.client.Register(ctx, &acme.Account{}, acme.AcceptTOS); err != nil && !errors.Is(err, acme.ErrAccountAlreadyExists) {
			return fmt.Errorf("Let's Encrypt account: %w", err)
		}
	}
	order, err := w.client.AuthorizeOrder(ctx, acme.DomainIDs(w.host))
	if err != nil {
		return fmt.Errorf("Let's Encrypt order: %w", err)
	}
	chalDir := filepath.Join(w.webroot, ".well-known", "acme-challenge")
	if err := os.MkdirAll(chalDir, 0o755); err != nil {
		return fmt.Errorf("cannot create %s: %w", chalDir, err)
	}
	cfgFile := filepath.Join(chalDir, "web.config")
	if _, err := os.Stat(cfgFile); os.IsNotExist(err) {
		os.WriteFile(cfgFile, []byte(challengeWebConfig), 0o644)
	}
	for _, zurl := range order.AuthzURLs {
		z, err := w.client.GetAuthorization(ctx, zurl)
		if err != nil {
			return err
		}
		if z.Status == acme.StatusValid {
			continue
		}
		var chal *acme.Challenge
		for _, c := range z.Challenges {
			if c.Type == "http-01" {
				chal = c
			}
		}
		if chal == nil {
			return errors.New("Let's Encrypt did not offer an http-01 challenge")
		}
		body, err := w.client.HTTP01ChallengeResponse(chal.Token)
		if err != nil {
			return err
		}
		file := filepath.Join(chalDir, chal.Token)
		if err := os.WriteFile(file, []byte(body), 0o644); err != nil {
			return fmt.Errorf("cannot write challenge file: %w", err)
		}
		defer os.Remove(file)
		if err := w.selfCheck(chal.Token, body); err != nil {
			return err
		}
		if _, err := w.client.Accept(ctx, chal); err != nil {
			return err
		}
		if _, err := w.client.WaitAuthorization(ctx, z.URI); err != nil {
			return fmt.Errorf("Let's Encrypt could not verify %s: %w", w.host, err)
		}
	}
	if order, err = w.client.WaitOrder(ctx, order.URI); err != nil {
		return err
	}
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return err
	}
	csr, err := x509.CreateCertificateRequest(rand.Reader, &x509.CertificateRequest{DNSNames: []string{w.host}}, key)
	if err != nil {
		return err
	}
	chain, _, err := w.client.CreateOrderCert(ctx, order.FinalizeURL, csr, true)
	if err != nil {
		return err
	}
	var certPEM []byte
	for _, der := range chain {
		certPEM = append(certPEM, pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})...)
	}
	kder, _ := x509.MarshalECPrivateKey(key)
	keyPEM := pem.EncodeToMemory(&pem.Block{Type: "EC PRIVATE KEY", Bytes: kder})
	if err := os.WriteFile(w.keyPath(), keyPEM, 0o600); err != nil {
		return err
	}
	if err := os.WriteFile(w.certPath(), certPEM, 0o600); err != nil {
		return err
	}
	if w.load(); w.needsRenewal() {
		return errors.New("new certificate could not be loaded")
	}
	log.Printf("got a Let's Encrypt certificate for %s", w.host)
	return nil
}

// Before asking Let's Encrypt, make sure IIS really serves the file (avoids hitting rate limits).
func (w *webrootCerts) selfCheck(token, want string) error {
	tr := &http.Transport{Proxy: nil}
	if w.selfCheckAddr != "" {
		tr.DialContext = func(ctx context.Context, network, _ string) (net.Conn, error) {
			return (&net.Dialer{}).DialContext(ctx, network, w.selfCheckAddr)
		}
	}
	cl := &http.Client{Timeout: 15 * time.Second, Transport: tr}
	url := "http://" + w.host + "/.well-known/acme-challenge/" + token
	resp, err := cl.Get(url)
	if err != nil {
		return fmt.Errorf("self-check could not open %s: %v\n  -> Is the DNS record for %s pointing to this VPS, and port 80 open?", url, err, w.host)
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
	if resp.StatusCode != 200 || strings.TrimSpace(string(b)) != want {
		return fmt.Errorf("self-check: IIS answered %s with HTTP %d instead of the challenge file.\n"+
			"  -> In IIS Manager, make sure a website on port 80 answers for %s (add a binding for it)\n"+
			"     and that its folder is %s", url, resp.StatusCode, w.host, w.webroot)
	}
	return nil
}

// start gets a certificate if needed and keeps renewing it in the background.
func (w *webrootCerts) start() error {
	if !w.load() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
		err := w.obtain(ctx)
		cancel()
		if err != nil {
			if _, ok := w.cur.Load().(*tls.Certificate); !ok {
				return err // nothing to serve with
			}
			log.Printf("certificate renewal failed (will retry): %v", err)
		}
	}
	go func() {
		for range time.Tick(12 * time.Hour) {
			if !w.needsRenewal() {
				continue
			}
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
			if err := w.obtain(ctx); err != nil {
				log.Printf("certificate renewal failed (will retry): %v", err)
			}
			cancel()
		}
	}()
	return nil
}
