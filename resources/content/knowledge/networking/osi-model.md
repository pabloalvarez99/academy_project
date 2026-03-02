# OSI Model

The Open Systems Interconnection (OSI) model is a conceptual framework that standardizes network communication into 7 layers, enabling interoperability between different systems.

## The 7 Layers

| Layer | Name         | Protocol Examples        | Function                          |
|-------|--------------|--------------------------|-----------------------------------|
| 7     | Application  | HTTP, FTP, DNS, SMTP     | User-facing protocols             |
| 6     | Presentation | TLS/SSL, JPEG, ASCII     | Encoding, encryption, compression |
| 5     | Session      | NetBIOS, RPC             | Session management                |
| 4     | Transport    | TCP, UDP                 | End-to-end communication          |
| 3     | Network      | IP, ICMP, OSPF           | Logical addressing and routing    |
| 2     | Data Link    | Ethernet, Wi-Fi (802.11) | Frame transmission, MAC addresses |
| 1     | Physical     | Cables, Radio, Fiber     | Raw bit transmission              |

## Memory Aid

**"All People Seem To Need Data Processing"**
(Application → Physical, top to bottom)

**Or bottom-up:** "Please Do Not Throw Sausage Pizza Away"

## TCP vs UDP (Layer 4)

### TCP (Transmission Control Protocol)
- **Connection-oriented** — 3-way handshake before data transfer
- **Guaranteed delivery** — acknowledgments (ACK) for every segment
- **Ordered delivery** — sequence numbers ensure correct ordering
- **Flow control** — prevents sender from overwhelming receiver
- **Use cases:** HTTP/HTTPS, FTP, SSH, databases, file transfer

### UDP (User Datagram Protocol)
- **Connectionless** — fire-and-forget
- **No delivery guarantee** — no ACKs, no retransmission
- **Lower latency** — no handshake overhead
- **Use cases:** DNS, video streaming, VoIP, online gaming, DHCP

## Key Concepts

### Encapsulation
Each layer adds its own header as data travels **down** the stack (sender side). On receipt, each layer strips its header as data travels **up** the stack (receiver side).

```
Application  →  [Data]
Transport    →  [TCP Header][Data]
Network      →  [IP Header][TCP Header][Data]
Data Link    →  [Frame Header][IP Header][TCP Header][Data][Frame Trailer]
Physical     →  binary bits on the wire
```

### Devices by Layer
- **Layer 1:** Hub, repeater (raw signal amplification)
- **Layer 2:** Switch (uses MAC addresses)
- **Layer 3:** Router (uses IP addresses)
- **Layer 4-7:** Firewall, load balancer, proxy

## Common Interview Questions

**Q: At which layer does routing occur?**
A: Layer 3 (Network). Routers examine IP addresses to forward packets.

**Q: What layer does a switch operate at?**
A: Layer 2 (Data Link). Switches use MAC addresses to forward frames within a LAN.

**Q: What is the difference between a packet and a frame?**
A: A **packet** is the Layer 3 unit (with IP headers). A **frame** is the Layer 2 unit (with MAC headers wrapping a packet).

**Q: Why does HTTP use TCP instead of UDP?**
A: Web pages require complete, ordered, error-free data. TCP guarantees this. UDP's speed advantage doesn't outweigh the need for reliability in HTTP.
