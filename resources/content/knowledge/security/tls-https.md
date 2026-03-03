# TLS and HTTPS — Transport Security in Depth

TLS (Transport Layer Security) is the cryptographic protocol that secures virtually all internet traffic. Understanding it lets you configure it correctly, debug certificate issues, and avoid the misconfigurations that erode security.

## TLS vs SSL

SSL is dead. SSLv2 was broken in 1995, SSLv3 in 2014 (POODLE). "SSL" is now colloquial for TLS. Supported versions:

| Version | Status | Year |
|---|---|---|
| SSL 2.0 / 3.0 | Broken — must be disabled | 1995 / 1996 |
| TLS 1.0 / 1.1 | Deprecated (RFC 8996, 2021) — disable | 1999 / 2006 |
| TLS 1.2 | Acceptable — widely deployed | 2008 |
| TLS 1.3 | Recommended — mandatory for new deployments | 2018 |

## Symmetric vs Asymmetric Crypto in TLS

TLS uses both:

- **Asymmetric** (RSA, ECDSA): expensive, used only during the handshake to authenticate and establish a shared secret
- **Symmetric** (AES-GCM, ChaCha20): fast, used to encrypt all application data after the handshake

This hybrid approach gives you the security properties of public-key crypto with the performance of symmetric encryption.

## TLS 1.3 Handshake

TLS 1.3 reduced the handshake to 1 round-trip (1-RTT), cutting latency compared to TLS 1.2's 2-RTT:

```
Client                                          Server
  |                                               |
  |── ClientHello ──────────────────────────────→|
  |   (supported cipher suites, key_share,        |
  |    supported_versions: [TLS 1.3])             |
  |                                               |
  |←──────────────────────── ServerHello ─────── |
  |   (chosen cipher suite, key_share,            |
  |    Certificate, CertificateVerify,            |
  |    Finished)                                  |
  |                                               |
  |── Finished ────────────────────────────────→ |
  |                                               |
  |═══════════ Encrypted application data ══════ |
```

Key innovations in TLS 1.3:
- Elliptic curve Diffie-Hellman (ECDHE) for key exchange — forward secrecy by default
- Removed RSA key exchange, RC4, MD5, SHA-1, export ciphers
- Session resumption via 0-RTT (use carefully — replay attack risk)
- Encrypted certificates — only the SNI header is visible to network observers

## Certificate Chain of Trust

```
Root CA (self-signed, stored in OS/browser trust store)
  └── Intermediate CA (signed by Root CA)
        └── Your Certificate (signed by Intermediate CA)
              └── your domain: example.com
```

Browsers verify the entire chain. If you serve only the leaf certificate without intermediate(s), some clients will fail (especially older mobile OSes). Always include the full chain in your server configuration.

**Certificate fields that matter**:
```
Subject:         CN=example.com
Subject Alt Names (SAN): DNS:example.com, DNS:*.example.com
Issuer:          CN=Let's Encrypt R11
Validity:        2024-11-01 to 2025-02-01  ← check this in monitoring
Public Key:      EC 256-bit (preferred) or RSA 2048-bit (minimum)
Signature Alg:   SHA-256WithRSAEncryption or ecdsa-with-SHA256
```

**SNI (Server Name Indication)**: Sent by the client at the start of the TLS handshake so the server knows which certificate to present — critical for virtual hosting (multiple domains on one IP).

## Cipher Suites

A cipher suite specifies the algorithms used for key exchange, authentication, encryption, and MAC:

```
TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
     │       │        │          │
     │       │        │          └── Hash (HMAC)
     │       │        └──────────── Bulk encryption (AES-256-GCM)
     │       └───────────────────── Authentication (RSA cert)
     └───────────────────────────── Key exchange (ECDHE)
```

TLS 1.3 simplified this — cipher suites only specify symmetric encryption + HMAC. Key exchange (always ECDHE) and authentication are separate:

```
TLS_AES_256_GCM_SHA384       ← preferred
TLS_CHACHA20_POLY1305_SHA256 ← good for mobile/low-power devices
TLS_AES_128_GCM_SHA256       ← acceptable minimum
```

## OCSP Stapling

OCSP (Online Certificate Status Protocol) lets clients check if a certificate has been revoked. Without stapling, the browser contacts the CA's OCSP server for every connection — slow and a privacy leak (CA sees every site you visit).

**OCSP Stapling**: Server fetches the OCSP response from the CA, caches it, and staples it to the TLS handshake. Client gets revocation status without contacting the CA.

```nginx
ssl_stapling        on;
ssl_stapling_verify on;
resolver            1.1.1.1 8.8.8.8 valid=300s;
resolver_timeout    5s;
```

## nginx TLS Configuration (Production)

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    # Certificate chain (leaf + intermediate, in order)
    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # TLS versions — disable 1.0 and 1.1
    ssl_protocols TLSv1.2 TLSv1.3;

    # Cipher suites — modern, ordered by preference
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
    ssl_prefer_server_ciphers off;  # let TLS 1.3 pick

    # Session resumption
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;  # disable for forward secrecy

    # OCSP stapling
    ssl_stapling        on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/example.com/chain.pem;

    # HSTS (see below)
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # Additional security headers
    add_header X-Content-Type-Options    "nosniff"       always;
    add_header X-Frame-Options           "DENY"          always;
    add_header Referrer-Policy           "no-referrer"   always;
}

# Redirect all HTTP to HTTPS
server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;
}
```

## HSTS — HTTP Strict Transport Security

Tells browsers to never connect via HTTP — enforced client-side after first visit:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

| Directive | Effect |
|---|---|
| `max-age=63072000` | Browser enforces HTTPS for 2 years (reset timer on each visit) |
| `includeSubDomains` | Also applies to all subdomains |
| `preload` | Eligible for browser preload list — enforced even on first visit |

**Warning**: HSTS with `preload` is essentially irreversible — getting removed from the preload list takes months. Test on a staging domain first. Ensure ALL subdomains can support HTTPS before setting `includeSubDomains`.

## Certificate Pinning

Pinning lets a client reject certificates signed by a trusted CA if they don't match a specific public key. Used in mobile apps to prevent interception even with a CA compromise or corporate MITM proxy.

```typescript
// React Native / mobile: pin the leaf cert or CA public key
const sslPinningConfig = {
  "api.example.com": {
    publicKeyHashes: [
      "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",  // current key
      "sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=",  // backup key
    ]
  }
};
```

**Risks**: If you lose your pinned key (hardware security module failure, poor key management), your app stops working for all users until an update is pushed. Always pin 2+ keys (current + backup). Not recommended for web browsers (can't update fast enough).

## mTLS — Mutual TLS

Standard TLS authenticates only the server. mTLS has the client also present a certificate, providing mutual authentication — useful for service-to-service calls in a zero-trust network.

```
Client                        Server
  ├─ presents client cert ──→ server verifies client cert against CA
  ←─ presents server cert ──┤ client verifies server cert
  ══ encrypted channel ═════ both parties authenticated
```

```nginx
# Server side: require client certificates
ssl_client_certificate /etc/ssl/client-ca.pem;
ssl_verify_client      on;
ssl_verify_depth       2;

# Access client cert info in upstream headers
proxy_set_header X-SSL-Client-CN $ssl_client_s_dn_cn;
```

Used in: Kubernetes pod-to-pod (Istio/Linkerd service mesh), internal microservices, payment processor integrations.

## Common TLS Mistakes

| Mistake | Impact | Fix |
|---|---|---|
| TLS 1.0/1.1 still enabled | BEAST, POODLE, downgrade attacks | `ssl_protocols TLSv1.2 TLSv1.3` |
| Self-signed cert in production | Browser warnings, broken trust chains | Use Let's Encrypt (free, auto-renews) |
| Missing intermediate cert | Cert chain validation failures on some clients | Serve `fullchain.pem` not just `cert.pem` |
| No HSTS | HTTPS-to-HTTP downgrade on first visit | Add `Strict-Transport-Security` header |
| Certificate expiry | Site goes down, trust failure | Monitor expiry, automate renewal (`certbot renew`) |
| Weak RSA key (1024-bit) | Factorable with sufficient compute | 2048-bit minimum, 4096-bit or EC P-256 preferred |
| Session tickets without rotation | Session key reuse weakens forward secrecy | `ssl_session_tickets off` or rotate keys every 24h |

## Interview Questions

**Q: What is forward secrecy and why does TLS 1.3 enforce it?**
A: Forward secrecy (or perfect forward secrecy, PFS) means a session key is derived ephemerally — if the server's long-term private key is later compromised, previously recorded traffic cannot be decrypted. TLS 1.3 achieves this by mandating ECDHE key exchange, discarding the ephemeral key after the session ends. TLS 1.2 with RSA key exchange had no forward secrecy.

**Q: What does HTTPS not protect against?**
A: HTTPS protects data in transit. It does not protect against: XSS injecting code into the page, server-side vulnerabilities, certificate authority compromise, endpoint compromise (malware on client/server), metadata (which domains you connect to is visible via SNI and DNS).
