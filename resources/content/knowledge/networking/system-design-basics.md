# System Design Basics

Core concepts for designing scalable, reliable distributed systems.

## Scalability

**Vertical scaling** (scale up): Add more resources to existing machine (more CPU, RAM).
- Simple, no code changes required
- Hard limit: single machine ceiling
- Single point of failure

**Horizontal scaling** (scale out): Add more machines.
- Near-infinite capacity
- Requires load balancing, distributed state management
- Complexity: network partitions, consistency challenges

```
             ┌─────────────┐
Clients ──→  │ Load Balancer│
             └──────┬──────┘
                    │
           ┌────────┼────────┐
           ↓        ↓        ↓
        Server1  Server2  Server3  ← stateless app servers
           └────────┼────────┘
                    ↓
              ┌──────────┐
              │  Database │  ← shared persistent state
              └──────────┘
```

## Load Balancing

Distributes requests across multiple servers.

**Algorithms**:
- **Round-robin**: Rotate through servers sequentially
- **Least connections**: Send to server with fewest active connections
- **IP hash**: Same client IP always hits same server (session affinity)
- **Weighted**: Some servers handle more load (different hardware)

**Layer 4 vs Layer 7**:
- L4 (TCP): Fast, minimal inspection — routes by IP/port
- L7 (HTTP): Can route by URL path, headers, cookies — smarter but slower

## Caching

Store frequently accessed data in fast storage to reduce latency and backend load.

### Cache Layers
```
Browser cache → CDN → Reverse Proxy (nginx) → App cache (Redis) → Database
     fastest                                                         slowest
```

### Cache Strategies

**Cache-aside (lazy loading)**:
```
1. App checks cache → miss → fetch from DB → store in cache → return
2. App checks cache → hit → return (fast)
```

**Write-through**: Write to cache AND DB simultaneously. Consistent but slower writes.

**Write-behind (write-back)**: Write to cache, async write to DB. Fast writes, risk of data loss.

### Cache Invalidation (the hard problem)
- **TTL**: Entries expire after N seconds — simple but stale window
- **Event-driven**: Invalidate on write — complex, but consistent
- **Cache-aside with versioning**: Key includes version, old keys become garbage

### Redis vs Memcached
- **Redis**: Persistence, data structures (lists, sets, sorted sets), pub/sub, clustering
- **Memcached**: Simpler, pure cache, multi-threaded — better raw throughput for simple get/set

## Database Patterns

### Read Replicas
```
Writes → Primary DB ──→ Replica 1 (async replication)
                    └──→ Replica 2
Reads  → Replica 1 or 2
```
Good for read-heavy workloads. Replication lag can cause stale reads.

### Sharding (Horizontal Partitioning)
Split data across multiple databases by a shard key.

```
User 1-1M  → DB Shard 1
User 1M-2M → DB Shard 2
User 2M-3M → DB Shard 3
```

**Shard key choice matters**: Bad key → hot spots (one shard gets all traffic).

### CQRS — Command Query Responsibility Segregation
Separate read and write models. Writes go to a normalized DB, reads from denormalized projections optimized for queries.

## CAP Theorem

In a distributed system with network partitions, you can only guarantee **two** of three:

| Property | Meaning |
|----------|---------|
| **C**onsistency | Every read gets the most recent write |
| **A**vailability | Every request gets a response (not necessarily current) |
| **P**artition tolerance | System works despite network failures |

Since partitions happen in reality, real systems choose **CP** or **AP**:
- **CP** (e.g., HBase, ZooKeeper): Strong consistency, may refuse requests during partition
- **AP** (e.g., Cassandra, DynamoDB, CouchDB): Always responds, may return stale data

## Message Queues

Decouple producers from consumers. Enable async processing.

```
Order Service → [Queue] → Inventory Service
                       → Email Service
                       → Analytics Service
```

**Benefits**:
- Buffer traffic spikes
- Retry failed processing
- Services evolve independently

**Kafka vs RabbitMQ**:
- **Kafka**: Log-based, high throughput, replay messages, event streaming, retention
- **RabbitMQ**: Traditional message broker, routing, fanout, dead letter queues, lower latency

## API Design Patterns

### REST
- Resources → nouns (`/users/123`, `/orders`)
- HTTP verbs → actions (GET, POST, PUT, DELETE)
- Stateless — server holds no client state
- Well-understood, widely supported

### GraphQL
- Client specifies exactly what data it needs
- Single endpoint (`/graphql`)
- Good for: mobile clients (bandwidth), complex entity graphs
- Trade-off: caching harder, N+1 query problems

### gRPC
- Protocol Buffers for serialization (compact, typed)
- HTTP/2 (multiplexing, streaming)
- Excellent for: internal microservices, streaming, generated clients
- Trade-off: browser support, debugging harder

## Reliability Patterns

**Circuit Breaker**: Stop calling a failing service to let it recover.
```
States: CLOSED → OPEN (after N failures) → HALF-OPEN (test recovery) → CLOSED
```

**Retry with backoff**: Retry failed requests with increasing delays.
```go
backoff := 100ms
for attempt := 0; attempt < maxRetries; attempt++ {
    if err := call(); err == nil { break }
    time.Sleep(backoff)
    backoff *= 2  // exponential backoff
}
```

**Timeout**: Never wait forever. Set connection and read timeouts.

**Bulkhead**: Isolate failures — separate thread pools per dependency.

## Interview Questions

**Q: How would you design a URL shortener?**
A: REST API (POST /shorten → short code). Store mapping in DB (key-value: code → long URL). Cache hot URLs in Redis. Serve redirects via CDN edge nodes. Generate codes with base62 encoding of an auto-increment ID or random 6-char string with collision check.

**Q: What's the difference between horizontal and vertical scaling?**
A: Vertical = bigger machine (CPU, RAM limit, SPOF). Horizontal = more machines (load balancer needed, stateless design required, near-unlimited scale).

**Q: When would you use a message queue?**
A: When you need to decouple services (producer doesn't need immediate consumer response), handle traffic spikes (queue absorbs bursts), enable retry logic for unreliable operations, or fan-out one event to multiple consumers.
