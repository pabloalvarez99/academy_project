# TCP/IP Fundamentals

Understanding the network stack is essential for debugging connectivity issues and building networked applications.

## The OSI Model (Simplified)

In practice, engineers use the TCP/IP 4-layer model:

```
┌─────────────────────────────────────────────────────┐
│ Application Layer  │ HTTP, gRPC, DNS, SMTP, SSH     │
├─────────────────────────────────────────────────────┤
│ Transport Layer    │ TCP, UDP                        │
├─────────────────────────────────────────────────────┤
│ Internet Layer     │ IP (IPv4, IPv6), ICMP           │
├─────────────────────────────────────────────────────┤
│ Link Layer         │ Ethernet, Wi-Fi, ARP            │
└─────────────────────────────────────────────────────┘
```

Each layer wraps the layer above with its own header:
```
[Ethernet header][IP header][TCP header][HTTP data]
```

## IP — Internet Protocol

Provides host addressing and routing. Connectionless — each packet routed independently.

**IPv4**: 32-bit address (4 billion addresses, nearly exhausted)
```
192.168.1.100
Subnet mask: /24 = 255.255.255.0 → 256 addresses in this subnet
```

**IPv6**: 128-bit address
```
2001:0db8:85a3::8a2e:0370:7334
```

**Private address ranges** (not routable on public internet):
- `10.0.0.0/8`
- `172.16.0.0/12`
- `192.168.0.0/16`

## TCP — Transmission Control Protocol

Reliable, ordered, connection-oriented. The foundation of web, SSH, email.

### Three-Way Handshake
```
Client                  Server
  │──── SYN ──────────────→│   "I want to connect"
  │←─── SYN-ACK ───────────│   "OK, I acknowledge"
  │──── ACK ──────────────→│   "Connection established"
  │                         │
  │←══ DATA EXCHANGE ══════│
  │                         │
  │──── FIN ──────────────→│   "I'm done sending"
  │←─── FIN-ACK ───────────│   "OK, closing"
```

### TCP Guarantees
- **Reliability**: ACK for every segment; retransmit on timeout
- **Ordering**: Sequence numbers ensure data arrives in order
- **Flow control**: Receiver advertises window size (don't overwhelm receiver)
- **Congestion control**: Slow start + AIMD to avoid overwhelming network

### TCP vs UDP

| | TCP | UDP |
|--|-----|-----|
| Connection | Handshake required | Connectionless |
| Reliability | Guaranteed delivery | Best-effort |
| Ordering | Yes | No |
| Overhead | Higher (headers, ACKs) | Lower |
| Speed | Slower | Faster |
| Use cases | HTTP, SSH, email | DNS, video streaming, gaming |

## UDP — User Datagram Protocol

Fire-and-forget. No connection, no ACK, no ordering guarantees.

**Why use UDP?**
- DNS queries: one packet out, one packet in — TCP handshake overhead isn't worth it
- Video streaming: slightly dropped frames are OK; latency matters more than delivery
- Online gaming: old position data is useless; send new state, drop old
- QUIC: Google's protocol — reliability rebuilt on UDP for performance

## DNS — Domain Name System

Translates domain names to IP addresses.

```
You type: api.example.com
  ↓
1. Check local cache → miss
2. Query recursive resolver (ISP or 8.8.8.8)
   ↓
3. Resolver queries root nameserver → ".com TLD server is at x.x.x.x"
   ↓
4. Resolver queries .com TLD server → "example.com NS is at ns1.example.com"
   ↓
5. Resolver queries ns1.example.com → "api.example.com is 93.184.216.34"
   ↓
6. Response cached, returned to you
```

**Record types**:
- `A`: hostname → IPv4 address
- `AAAA`: hostname → IPv6 address
- `CNAME`: hostname → another hostname (alias)
- `MX`: mail server for domain
- `TXT`: arbitrary text (used for SPF, DKIM, domain verification)

**TTL**: How long to cache the response (seconds). Low TTL = faster DNS changes, more queries.

## Ports

Well-known port numbers:
| Port | Protocol |
|------|----------|
| 22 | SSH |
| 25 | SMTP |
| 53 | DNS |
| 80 | HTTP |
| 443 | HTTPS |
| 3306 | MySQL |
| 5432 | PostgreSQL |
| 6379 | Redis |
| 8080 | Alt HTTP |

A socket is identified by: `(IP, port, protocol)`. Multiple processes can listen on the same IP but different ports.

## HTTP/1.1 vs HTTP/2 vs HTTP/3

**HTTP/1.1**:
- One request per TCP connection (pipelining rarely works in practice)
- Head-of-line blocking: second request waits for first
- Text-based headers (verbose)

**HTTP/2**:
- Multiplexing: multiple requests over single TCP connection
- Binary framing, header compression (HPACK)
- Server push
- Still TCP — TCP-level head-of-line blocking remains

**HTTP/3 (QUIC)**:
- Runs over UDP
- Multiplexing without TCP head-of-line blocking
- Built-in TLS 1.3
- Connection migration (change IP without reconnecting — phone WiFi→cellular)
- ~15% faster page loads in practice

## Go Networking

```go
// TCP server
ln, err := net.Listen("tcp", ":8080")
for {
    conn, _ := ln.Accept()
    go handleConn(conn)  // goroutine per connection
}

// HTTP server (built on TCP)
http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "Hello")
})
http.ListenAndServe(":8080", nil)

// DNS lookup
addrs, _ := net.LookupHost("example.com")

// Dial with timeout
conn, err := net.DialTimeout("tcp", "example.com:443", 5*time.Second)
```

## Debugging Tools

```bash
# Test connectivity
ping 8.8.8.8              # ICMP echo — is host reachable?
traceroute api.example.com # show network hops

# DNS
nslookup example.com       # query DNS
dig example.com A          # detailed DNS query

# Connections
netstat -tlnp              # listening ports
ss -tlnp                   # modern netstat
lsof -i :8080              # who's using port 8080

# Traffic capture
tcpdump -i eth0 port 80   # capture HTTP traffic
wireshark                  # GUI packet analyzer

# HTTP
curl -v https://example.com           # verbose, shows headers
curl -w "%{time_total}" https://...   # timing
wget --server-response https://...    # show headers
```

## Interview Questions

**Q: What happens when you type a URL in the browser?**
A: DNS lookup (cache → resolver → recursive query), TCP 3-way handshake, TLS handshake, HTTP request sent, server processes request, HTTP response received, browser parses HTML, renders page (more DNS + connections for subresources).

**Q: Why is UDP faster than TCP?**
A: No connection establishment (no 3-way handshake), no acknowledgements to wait for, no retransmission, no head-of-line blocking. Trade-off: no delivery guarantee.

**Q: What is the difference between a process binding to 0.0.0.0 vs 127.0.0.1?**
A: `127.0.0.1` (loopback) only accepts connections from the same machine. `0.0.0.0` (all interfaces) accepts connections from any network interface — including external network — so it's reachable from other machines.
