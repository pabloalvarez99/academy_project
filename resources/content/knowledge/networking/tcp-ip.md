# TCP/IP Protocol Suite

TCP/IP is the foundational protocol suite of the modern internet. Unlike the 7-layer OSI model, TCP/IP uses a simplified 4-layer model.

## TCP/IP Layers

| TCP/IP Layer    | OSI Equivalent | Key Protocols             |
|-----------------|----------------|---------------------------|
| Application     | 5, 6, 7        | HTTP, DNS, FTP, SMTP, SSH |
| Transport       | 4              | TCP, UDP                  |
| Internet        | 3              | IP (v4/v6), ICMP, ARP     |
| Network Access  | 1, 2           | Ethernet, Wi-Fi           |

## IP Addressing

### IPv4
- 32-bit address (e.g., `192.168.1.100`)
- Written as 4 octets separated by dots
- ~4.3 billion total addresses (exhausted)
- Private ranges: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`

### IPv6
- 128-bit address (e.g., `2001:db8::1`)
- Written as 8 groups of 4 hex digits
- ~340 undecillion addresses
- Simplified notation: consecutive zero groups → `::`

## Subnetting

A subnet mask divides an IP address into **network** and **host** portions.

```
IP:      192.168.1.100
Mask:    255.255.255.0  (/24)
Network: 192.168.1.0
Hosts:   192.168.1.1 - 192.168.1.254
Broadcast: 192.168.1.255
```

**CIDR notation:** `/24` means the first 24 bits are the network portion.

## TCP Three-Way Handshake

```
Client          Server
  |--SYN-------->|   (seq=x)
  |<--SYN+ACK----|   (seq=y, ack=x+1)
  |--ACK-------->|   (ack=y+1)
  |  ESTABLISHED |
```

## DNS Resolution

1. Browser checks local cache
2. OS checks hosts file
3. Query to recursive resolver (ISP or 8.8.8.8)
4. Resolver queries root nameservers (`.`)
5. Root refers to TLD nameservers (`.com`)
6. TLD refers to authoritative nameserver
7. Authoritative returns the A/AAAA record
8. Resolver caches and returns to client
