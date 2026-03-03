import { useState, useCallback } from 'react'
import { CheckCircle, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Card {
  id: string
  category: Category
  question: string
  answer: string
  keyPoints: string[]
  seeAlso?: string
}

type Category = 'scalability' | 'caching' | 'databases' | 'messaging' | 'apis' | 'distributed'

// ── Content ───────────────────────────────────────────────────────────────────

const CATEGORIES: { id: Category; label: string; icon: string }[] = [
  { id: 'scalability',  label: 'Scalability',         icon: '↑' },
  { id: 'caching',      label: 'Caching',             icon: '⚡' },
  { id: 'databases',    label: 'Databases',           icon: '⛃' },
  { id: 'messaging',    label: 'Messaging',           icon: '✉' },
  { id: 'apis',         label: 'APIs',                icon: '⇄' },
  { id: 'distributed',  label: 'Distributed Systems', icon: '⬡' },
]

const CARDS: Card[] = [
  // ── Scalability ────────────────────────────────────────────────────────────
  {
    id: 'scale-horiz-vert',
    category: 'scalability',
    question: 'When do you scale horizontally vs vertically?',
    answer: 'Vertical scaling (scale up) adds more CPU/RAM to an existing machine — it\'s simple but has a hard ceiling and creates a single point of failure. Horizontal scaling (scale out) adds more machines — it has no theoretical ceiling and improves fault tolerance, but requires stateless services and a load balancer.\n\nVertical is a short-term fix; horizontal is the long-term architecture for high-availability systems.',
    keyPoints: [
      'Vertical: easier, no code changes, but expensive and limited',
      'Horizontal: requires stateless services (no local session/state)',
      'Prefer horizontal for services with unpredictable or bursty load',
      'Databases often scale vertically first, then via read replicas or sharding',
      'Cloud VMs make horizontal scaling elastic (auto-scaling groups)',
    ],
  },
  {
    id: 'scale-load-balancer',
    category: 'scalability',
    question: 'What are common load balancing algorithms?',
    answer: 'Load balancers distribute traffic across servers to maximize throughput and minimize latency. The right algorithm depends on server homogeneity and request characteristics.\n\nMost production systems use Least Connections or consistent hashing for APIs, and Round Robin for stateless microservices behind a service mesh.',
    keyPoints: [
      'Round Robin: requests cycle through servers in order — simple, equal-weight assumption',
      'Least Connections: sends to the server with fewest active connections — better for variable-duration requests',
      'IP Hash / Consistent Hashing: same client always hits same server — needed for session affinity',
      'Weighted Round Robin: servers with more capacity get more traffic',
      'Layer 4 (TCP) vs Layer 7 (HTTP): L7 can route by URL path, headers, cookies',
    ],
  },
  {
    id: 'scale-cdn',
    category: 'scalability',
    question: 'How does a CDN work and when should you use one?',
    answer: 'A CDN (Content Delivery Network) is a geographically distributed network of edge servers that cache content close to end users. When a user requests an asset, the CDN serves it from the nearest PoP (Point of Presence) instead of the origin server, reducing latency and origin load.\n\nUse a CDN for any static or semi-static content: images, JS/CSS bundles, videos, and even cacheable API responses.',
    keyPoints: [
      'Cache-Control and ETag headers control what and how long the CDN caches',
      'Cache miss → CDN fetches from origin and stores locally for future requests',
      'CDN also provides DDoS mitigation, TLS termination, and HTTP/2 push',
      'Dynamic content can use CDN edge functions (Cloudflare Workers, Lambda@Edge)',
      'Invalidation: use versioned asset names (bundle.abc123.js) instead of cache purging',
    ],
  },
  {
    id: 'scale-sharding',
    category: 'scalability',
    question: 'What is database sharding and what are its trade-offs?',
    answer: 'Sharding splits a database horizontally: each shard holds a subset of rows, identified by a shard key. Queries that include the shard key route to one shard; cross-shard queries hit multiple shards and require aggregation. Sharding lets you scale writes beyond what a single machine can handle.\n\nIt is a last resort — try read replicas, caching, and query optimization first.',
    keyPoints: [
      'Shard key choice is critical: avoid hot shards (e.g. don\'t shard by "created_at")',
      'Consistent hashing minimises data movement when adding/removing shards',
      'Cross-shard joins and transactions are expensive or impossible',
      'Re-sharding requires careful data migration — plan from the start',
      'Alternatives: vertical partitioning (split tables by column groups), functional partitioning (separate DBs per service)',
    ],
  },
  {
    id: 'scale-replication',
    category: 'scalability',
    question: 'How does primary-replica replication work?',
    answer: 'The primary (master) accepts all writes and streams a replication log to one or more replicas. Replicas apply changes asynchronously (or synchronously for strong consistency). Reads can be served from replicas, scaling read throughput linearly.\n\nFailover: if the primary fails, a replica is promoted. This is automated by tools like Patroni (PostgreSQL) or Orchestrator (MySQL).',
    keyPoints: [
      'Async replication: low write latency but replicas may lag → stale reads',
      'Sync replication: strong consistency but write latency includes network RTT to replica',
      'Read-your-writes consistency: route reads back to primary after a write, or wait for replica to catch up',
      'Multi-primary (active-active): both nodes accept writes, conflict resolution needed',
      'Replication lag is your primary operational metric — alert on it',
    ],
  },
  {
    id: 'scale-stateless',
    category: 'scalability',
    question: 'Why should services be stateless for horizontal scalability?',
    answer: 'A stateless service stores no per-request or per-user data in local memory. Each request contains all the context needed to process it (e.g. JWT in the header, session in Redis). This means any instance can handle any request — load balancers can freely route traffic and you can add/remove instances without draining state.\n\nState is not eliminated; it\'s moved to shared external stores (Redis, DB, S3).',
    keyPoints: [
      'Session state → Redis or database, not in-process memory',
      'File uploads → object storage (S3), not local disk',
      'Scheduled jobs → distributed lock or coordination service, not cron on one instance',
      'Stateless services are also easier to deploy and roll back without reconnection issues',
      '12-Factor App principle III: store config in environment, not in code or instance',
    ],
  },

  // ── Caching ────────────────────────────────────────────────────────────────
  {
    id: 'cache-aside',
    category: 'caching',
    question: 'Explain the cache-aside (lazy loading) pattern.',
    answer: 'Cache-aside is the most common pattern: the application code is responsible for loading data into the cache. On a read, check the cache first; on a miss, query the database, store the result in cache, then return it. Writes update the database directly and invalidate (or update) the cache.\n\nIt keeps only "hot" data in cache, but the first request after a miss always hits the database.',
    keyPoints: [
      'Read: 1) check cache → 2) miss: query DB → 3) write to cache → 4) return',
      'Write: update DB, then delete cache key (simpler than updating — avoids race conditions)',
      'Cache population is lazy — data only cached when first requested',
      'Stale data risk: mitigate with TTL + explicit invalidation on writes',
      'Compare to read-through: same logic but implemented inside the cache client, not app code',
    ],
  },
  {
    id: 'cache-write-strategies',
    category: 'caching',
    question: 'What\'s the difference between write-through and write-back caching?',
    answer: 'Write-through: every write goes to cache AND database synchronously. Data is always consistent but every write has two round trips. Write-back (write-behind): writes go only to the cache, which later flushes to the database asynchronously. Faster writes, but data loss risk if the cache node fails before flushing.\n\nWrite-through is safer and preferred unless you have very high write volumes.',
    keyPoints: [
      'Write-through: strong consistency, higher write latency, no data loss risk',
      'Write-back: lower write latency, risk of data loss on crash, complex failure handling',
      'Write-around: writes go directly to DB, bypassing cache — reduces cache pollution for infrequent writes',
      'Redis AOF + RDB persistence can make write-back safer in practice',
      'For financial data: write-through or write-through + DB transaction',
    ],
  },
  {
    id: 'cache-eviction',
    category: 'caching',
    question: 'What are common cache eviction policies and when do you choose each?',
    answer: 'When a cache is full, it must evict entries to make room. The eviction policy determines which entries are removed. LRU is the most common and works well for temporal locality — recently used data is likely to be used again soon.',
    keyPoints: [
      'LRU (Least Recently Used): evict the entry not accessed for the longest time — best general-purpose',
      'LFU (Least Frequently Used): evict the entry accessed least often — better for stable popular data',
      'TTL (Time to Live): evict after a fixed duration — simple, predictable, great for session data',
      'FIFO: evict oldest inserted entry — rarely optimal, but simple',
      'Random: evict a random entry — surprisingly competitive for large uniform access patterns',
    ],
    seeAlso: 'Redis supports: allkeys-lru, allkeys-lfu, volatile-lru, volatile-ttl, noeviction',
  },
  {
    id: 'cache-redis-vs-memcached',
    category: 'caching',
    question: 'When would you choose Redis over Memcached?',
    answer: 'Memcached is a pure key-value cache — simple, fast, multi-threaded. Redis is a data structure server that also serves as a cache — it supports strings, lists, sets, sorted sets, hashes, streams, and pub/sub. Redis also has persistence and clustering built in.\n\nChoose Memcached if you only need simple string caching and multi-threaded throughput matters. Choose Redis for everything else.',
    keyPoints: [
      'Redis: sorted sets → leaderboards; pub/sub → real-time events; streams → event queues',
      'Redis: EXPIRE, PERSIST, atomic INCR — Memcached has only TTL',
      'Redis: persistence (AOF + RDB) — survives restarts; Memcached does not',
      'Memcached: better at horizontal memory distribution with consistent hashing client-side',
      'Redis Cluster: built-in sharding + replication for large datasets',
    ],
  },
  {
    id: 'cache-stampede',
    category: 'caching',
    question: 'What is a cache stampede and how do you prevent it?',
    answer: 'A cache stampede (thundering herd) happens when a popular key expires simultaneously for many users, causing all of them to query the database at once. This can overwhelm the database and cause cascading failures.\n\nThis is especially dangerous on cache restarts or after planned cache flushes.',
    keyPoints: [
      'Solution 1 — Probabilistic early expiry: start refreshing the cache slightly before TTL expires (random jitter)',
      'Solution 2 — Mutex/lock: only one process queries the DB; others wait and read from cache when it\'s populated',
      'Solution 3 — Stale-while-revalidate: return stale data while refreshing in background',
      'Solution 4 — External computation: use a background job to refresh hot keys before they expire',
      'Never set the same TTL for many keys — add random jitter (±10-20%) to spread expiry',
    ],
  },

  // ── Databases ──────────────────────────────────────────────────────────────
  {
    id: 'db-sql-vs-nosql',
    category: 'databases',
    question: 'How do you decide between SQL and NoSQL?',
    answer: 'SQL databases (PostgreSQL, MySQL) provide ACID transactions, joins, and a flexible query language — ideal when data relationships are complex and consistency is critical. NoSQL covers a wide family: document stores (MongoDB), key-value (Redis), column-family (Cassandra), and graph (Neo4j) — each optimised for specific access patterns.\n\nDefault to SQL; choose NoSQL when a specific access pattern or scale requirement makes SQL a poor fit.',
    keyPoints: [
      'Choose SQL: complex queries, transactions across multiple entities, schema is stable',
      'Choose document (MongoDB): hierarchical/nested data, schema is evolving, read by document ID',
      'Choose key-value (Redis/DynamoDB): simple lookups by key, extremely high throughput',
      'Choose Cassandra/wide-column: time-series, write-heavy, global distribution, no complex joins',
      'Choose graph (Neo4j): relationship-heavy queries (social networks, fraud detection)',
    ],
  },
  {
    id: 'db-cap',
    category: 'databases',
    question: 'What is the CAP theorem and how does it apply to real systems?',
    answer: 'CAP theorem: a distributed system can only guarantee two of three: Consistency (all nodes see the same data), Availability (every request gets a response), and Partition Tolerance (system works despite network partitions).\n\nIn practice, network partitions are unavoidable, so you\'re always choosing between CP and AP. Modern systems often operate on a spectrum rather than binary choice.',
    keyPoints: [
      'CP systems: sacrifice availability during a partition (ZooKeeper, etcd, HBase)',
      'AP systems: remain available but may return stale data (Cassandra, DynamoDB, CouchDB)',
      'SQL databases are typically CA — but partitions break them entirely',
      'PACELC extends CAP: even without partitions, trade-off between latency and consistency',
      'Real answer: "CA" in CAP means "CA when there\'s no partition" — not a meaningful distributed choice',
    ],
  },
  {
    id: 'db-acid-base',
    category: 'databases',
    question: 'What\'s the difference between ACID and BASE consistency?',
    answer: 'ACID (Atomicity, Consistency, Isolation, Durability) is the traditional relational database guarantee: transactions are all-or-nothing, data is always valid, and committed data persists. BASE (Basically Available, Soft state, Eventually consistent) is the NoSQL trade-off: high availability and performance at the cost of temporary inconsistency.',
    keyPoints: [
      'Atomicity: all operations in a transaction succeed or all are rolled back',
      'Isolation: transactions don\'t see each other\'s intermediate state (Read Committed, Serializable)',
      'Eventual consistency: all nodes will converge to the same value — eventually',
      'Read-your-writes: you see your own writes immediately; others may lag',
      'BASE is pragmatic: many apps tolerate stale user profile data but not stale payment state',
    ],
  },
  {
    id: 'db-indexes',
    category: 'databases',
    question: 'How do database indexes work and when do they hurt?',
    answer: 'A B-tree index stores a sorted copy of one or more columns, allowing O(log n) lookups instead of O(n) full table scans. The database maintains the index on every INSERT, UPDATE, and DELETE — so indexes speed up reads at the cost of write overhead.\n\nOver-indexing is a real problem: a table with 15 indexes on it will have very slow writes.',
    keyPoints: [
      'B-tree: default index, great for =, <, >, BETWEEN, ORDER BY, and prefix LIKE',
      'Hash index: O(1) equality lookups only, no range queries (used in PostgreSQL memory indexes)',
      'Composite index: index on (a, b, c) accelerates WHERE a=? AND b=? — column order matters',
      'Covering index: index includes all columns in SELECT — avoids heap access entirely',
      'When NOT to index: low-cardinality columns (boolean, status with 3 values), very small tables, write-heavy tables',
    ],
  },
  {
    id: 'db-query-tuning',
    category: 'databases',
    question: 'What\'s the first step when a SQL query is slow?',
    answer: 'Run EXPLAIN ANALYZE to see the query plan: whether the database is doing a sequential scan (bad for large tables) or an index scan, how many rows are estimated vs actual, and where time is spent. Most slow queries are missing an index, have an N+1 problem, or return far more data than needed.',
    keyPoints: [
      'Seq Scan on large table = missing index — add one on the WHERE/JOIN column',
      'Nested Loop with high row estimates = statistics are stale — run ANALYZE',
      'N+1: ORM fetching parent then N children in separate queries — fix with JOIN or eager load',
      'SELECT *: fetches unnecessary columns and prevents covering index usage',
      'LIMIT without ORDER BY is non-deterministic and often faster but gives wrong results',
    ],
    seeAlso: 'PostgreSQL: EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) — shows buffer hits and I/O',
  },
  {
    id: 'db-connection-pool',
    category: 'databases',
    question: 'Why is connection pooling important for databases?',
    answer: 'Each database connection consumes ~5-10 MB on the server and takes ~50-100ms to establish (TLS handshake + auth). Without pooling, every request opens and closes a connection — at 1000 req/s this is catastrophic. A connection pool maintains N persistent connections and reuses them, reducing latency to near-zero connection overhead.\n\nPostgreSQL supports ~100-200 connections before performance degrades — PgBouncer can multiplex thousands of app connections onto a small pool.',
    keyPoints: [
      'Pool size ≠ number of threads: CPU-bound tasks: pool_size = num_cores; I/O-bound: pool_size = num_cores × 2-4',
      'PgBouncer transaction mode: one DB connection serves many app connections sequentially',
      'Connection leaks: failing to release connections back to pool → pool exhaustion → 503s',
      'Health check connections: pools should validate connections before use (SELECT 1)',
      'Monitor: pool_size, checked_out, wait_queue length — alert when queue builds up',
    ],
  },

  // ── Messaging ──────────────────────────────────────────────────────────────
  {
    id: 'msg-queue-vs-stream',
    category: 'messaging',
    question: 'When would you use a message queue vs an event stream?',
    answer: 'A message queue (RabbitMQ, SQS) delivers each message to exactly one consumer — messages are deleted after acknowledgement. Useful for task distribution: each job is processed once. An event stream (Kafka, Kinesis) is an append-only log — consumers maintain their own offset and can replay events. Multiple independent consumers can each process every event.\n\nUse queues for work distribution; use streams for event sourcing, audit logs, and fan-out to many consumers.',
    keyPoints: [
      'Queue: competing consumers, each message processed once, message deleted after ack',
      'Stream: consumer groups, each group gets all messages, replay from any offset',
      'Kafka retains messages for days/weeks — queue messages are gone after consumption',
      'RabbitMQ supports routing, fanout, topic exchanges — more flexible routing than Kafka',
      'DLQ (Dead Letter Queue): unprocessable messages sent here for inspection — essential for both',
    ],
  },
  {
    id: 'msg-kafka',
    category: 'messaging',
    question: 'Explain Kafka\'s core concepts: topics, partitions, consumer groups.',
    answer: 'A Kafka topic is a named log of ordered, immutable events. Topics are split into partitions — each partition is an ordered sequence independently stored on a broker. A consumer group is a set of consumers that together consume a topic: each partition is assigned to exactly one consumer in the group, enabling parallel processing with ordering guarantees per partition.\n\nMore partitions = more parallelism, but more overhead.',
    keyPoints: [
      'Partition key determines which partition a message goes to — same key → same partition → ordering guaranteed',
      'Consumer group rebalance: when a consumer joins/leaves, partitions are reassigned',
      'Offset: each consumer tracks its own position — Kafka doesn\'t push, consumers pull',
      'Retention: Kafka keeps messages for a configurable time (default 7 days) regardless of consumption',
      'Replication factor: each partition is replicated to N brokers — leader handles reads/writes, replicas take over on failure',
    ],
  },
  {
    id: 'msg-idempotency',
    category: 'messaging',
    question: 'What is idempotency and why does it matter in distributed systems?',
    answer: 'An operation is idempotent if applying it multiple times produces the same result as applying it once. In distributed systems, messages can be delivered more than once (at-least-once delivery), network retries happen, and timeouts cause ambiguity about whether a request succeeded. Idempotent handlers make all of these safe.\n\nDesigning for idempotency is not optional in distributed systems — it\'s a fundamental requirement.',
    keyPoints: [
      'HTTP: GET, PUT, DELETE are idempotent; POST is not (use POST for creation with idempotency key)',
      'Idempotency key: client generates a unique ID per request; server deduplicates on it',
      'Database upsert (INSERT ON CONFLICT DO UPDATE) is a natural idempotent write',
      'Event handlers: check if event was already processed before acting (store processed event IDs)',
      'Exactly-once is very hard — design for at-least-once + idempotent consumers instead',
    ],
  },
  {
    id: 'msg-outbox',
    category: 'messaging',
    question: 'What is the transactional outbox pattern?',
    answer: 'The outbox pattern solves the dual-write problem: you need to write to your database AND publish an event atomically. Without it, a crash between the DB write and the publish leaves you with saved data but no event (or vice versa). The solution: write the event to an "outbox" table in the same database transaction, then have a separate process (Debezium, polling) publish it to the message broker.\n\nThis guarantees at-least-once delivery of events that correspond exactly to committed DB changes.',
    keyPoints: [
      'Step 1: INSERT into business table + INSERT into outbox_events in one transaction',
      'Step 2: Relay process polls outbox_events and publishes to Kafka/SQS, marks as sent',
      'Debezium (CDC): reads DB WAL/binlog and streams changes — no polling overhead',
      'Guarantees: if DB transaction commits, event will eventually be published',
      'Ordering: partition by aggregate ID to maintain per-entity ordering',
    ],
  },

  // ── APIs ───────────────────────────────────────────────────────────────────
  {
    id: 'api-rest-graphql-grpc',
    category: 'apis',
    question: 'Compare REST, GraphQL, and gRPC — when to use each?',
    answer: 'REST is the default for public HTTP APIs — simple, cacheable, widely understood. GraphQL lets clients request exactly the fields they need, eliminating over/under-fetching — ideal for complex UIs querying multiple resources. gRPC uses Protocol Buffers over HTTP/2 — strongly typed, very fast, ideal for internal service-to-service communication.\n\nMost systems use REST externally + gRPC internally.',
    keyPoints: [
      'REST: URL represents a resource; HTTP verbs (GET/POST/PUT/DELETE) are the actions; JSON payload',
      'GraphQL: one endpoint (/graphql); client defines the query shape; great for BFFs (Backend for Frontend)',
      'gRPC: binary Protocol Buffers, streaming support, auto-generated client stubs; lower latency than REST',
      'REST caching: use HTTP Cache-Control headers at CDN/proxy layer — GraphQL is harder to cache',
      'GraphQL N+1: use DataLoader (batching) to prevent N DB queries per field resolver',
    ],
  },
  {
    id: 'api-rate-limiting',
    category: 'apis',
    question: 'What are common strategies for API rate limiting?',
    answer: 'Rate limiting protects your service from abuse and ensures fair usage. It\'s applied per API key, per IP, or per user. The algorithm chosen affects how bursty traffic is handled.\n\nRedis is the standard backend for rate limit counters because it\'s fast, atomic (INCR), and supports TTL.',
    keyPoints: [
      'Fixed Window: count requests in a time bucket (e.g. 100 per minute) — simple but allows 2× burst at window boundary',
      'Sliding Window Log: track exact timestamps of requests — accurate, but memory-heavy',
      'Sliding Window Counter: blend of fixed windows — approximates sliding at low memory cost',
      'Token Bucket: refill N tokens/second; burst allowed up to bucket capacity — most natural for user APIs',
      'Leaky Bucket: fixed-rate processing queue — smooths traffic, rejects bursts; good for downstream protection',
    ],
  },
  {
    id: 'api-gateway',
    category: 'apis',
    question: 'What problems does an API gateway solve?',
    answer: 'An API gateway is a single entry point for all clients. It handles cross-cutting concerns that would otherwise be duplicated across every service: authentication, rate limiting, SSL termination, request routing, logging, and circuit breaking. Clients talk to one address; the gateway routes to the right microservice.\n\nExamples: Kong, AWS API Gateway, Nginx, Envoy.',
    keyPoints: [
      'Auth: verify JWT/API key once at the gateway, not in every service',
      'Rate limiting: centralized quota enforcement per client',
      'Request transformation: translate REST to gRPC, add headers, reshape payloads',
      'Circuit breaker: stop routing to unhealthy services, return fallbacks',
      'Aggregation (BFF): one gateway call fans out to 3 services and merges responses',
    ],
  },
  {
    id: 'api-webhooks-vs-polling',
    category: 'apis',
    question: 'Compare webhooks and polling for receiving asynchronous updates.',
    answer: 'Polling: the client repeatedly asks "anything new?" at a fixed interval. Simple but wasteful — 99% of requests may return nothing. Webhooks: the server pushes updates to a client-provided URL when events happen. Efficient but requires the client to have a publicly accessible HTTPS endpoint and handle retries.\n\nLong polling and SSE (Server-Sent Events) are middle grounds for browser clients.',
    keyPoints: [
      'Polling: easy to implement, works behind firewalls, but creates unnecessary load',
      'Webhooks: real-time, efficient, but client must be internet-accessible and idempotent',
      'Long polling: client holds request open until server has data — simulates push for HTTP',
      'SSE: server streams events over a persistent HTTP connection — unidirectional, browser-native',
      'WebSocket: bidirectional persistent connection — best for chat, live collaboration, gaming',
    ],
  },
  {
    id: 'api-versioning',
    category: 'apis',
    question: 'What are strategies for versioning a REST API?',
    answer: 'API versioning lets you evolve your API without breaking existing clients. The goal is to keep old clients working while shipping improvements to new ones. There\'s no single correct approach — pick one and apply it consistently.\n\nVersion in the URL is the most visible and easiest to debug; header versioning is cleaner architecturally.',
    keyPoints: [
      'URL path: /v1/users, /v2/users — most common, easy to test in a browser, visible in logs',
      'Header: Accept: application/vnd.myapi.v2+json — cleaner URLs but harder to test',
      'Query parameter: /users?version=2 — discouraged, breaks caching',
      'Never break v1 — add new fields, don\'t remove or rename existing ones',
      'Sunset header: inform clients when a version will be removed (RFC 8594)',
    ],
  },

  // ── Distributed Systems ────────────────────────────────────────────────────
  {
    id: 'dist-consistent-hashing',
    category: 'distributed',
    question: 'How does consistent hashing work?',
    answer: 'Consistent hashing maps both nodes and keys onto a virtual ring (hash space 0 to 2³²). A key is assigned to the first node clockwise from its position on the ring. When a node is added or removed, only the keys on the adjacent segment are remapped — approximately K/N keys, where K is total keys and N is number of nodes.\n\nUsed in Dynamo, Cassandra, Memcached, and most distributed caches.',
    keyPoints: [
      'Without consistent hashing: adding 1 node remaps ~all keys (mod N changes)',
      'With consistent hashing: adding 1 of N nodes remaps only 1/N of keys',
      'Virtual nodes (vnodes): each physical node gets many positions on the ring — evens out load',
      'Replication: replicate key to the next R nodes clockwise (Dynamo uses R=3)',
      'Hot spots: vnodes + random placement of physical nodes prevent hot partitions',
    ],
  },
  {
    id: 'dist-circuit-breaker',
    category: 'distributed',
    question: 'What is the circuit breaker pattern?',
    answer: 'A circuit breaker wraps a remote call and monitors for failures. After a threshold of failures, it "opens" the circuit: subsequent calls fail immediately without attempting the remote call. After a timeout, it enters "half-open" state and allows one test request through. If it succeeds, the circuit closes; if not, it reopens.\n\nThis prevents cascading failures: a slow downstream service no longer ties up all threads waiting for timeouts.',
    keyPoints: [
      'States: Closed (normal) → Open (failing fast) → Half-Open (testing recovery)',
      'Failure threshold: e.g. 5 failures in 10 seconds → open',
      'Fallback: return cached data, a default value, or a graceful error while circuit is open',
      'Libraries: Resilience4j (Java), Polly (.NET), opossum (Node.js)',
      'Combine with bulkhead: limit concurrent calls per downstream service to prevent thread exhaustion',
    ],
  },
  {
    id: 'dist-saga',
    category: 'distributed',
    question: 'How do you handle distributed transactions with the Saga pattern?',
    answer: 'A Saga is a sequence of local transactions, each publishing an event that triggers the next step. If any step fails, compensating transactions undo the previous steps. This achieves eventual consistency across services without 2PC (two-phase commit), which is fragile and slow in distributed systems.\n\nSagas trade atomicity for availability — partial failures are visible briefly during compensation.',
    keyPoints: [
      'Choreography: each service publishes events and reacts to others\' events — no central coordinator, harder to debug',
      'Orchestration: a central saga orchestrator sends commands and handles responses — easier to trace, single point of coordination',
      'Compensating transaction: the undo operation (refund, release inventory) must be idempotent',
      'Saga state: orchestrator stores the current step — allows resume on crash',
      '2PC vs Saga: 2PC blocks all participants during commit; Saga is non-blocking but temporarily inconsistent',
    ],
  },
  {
    id: 'dist-leader-election',
    category: 'distributed',
    question: 'How does leader election work in distributed systems?',
    answer: 'Leader election ensures exactly one node in a cluster performs a specific role (scheduler, primary, shard owner). Nodes use a distributed coordination service (ZooKeeper, etcd) to acquire a lock — the lock holder is the leader. If the leader fails to renew its lease, the lock expires and another node acquires it.\n\nRaft and Paxos are consensus algorithms that implement leader election internally.',
    keyPoints: [
      'etcd/ZooKeeper: leader acquires a lease with a TTL; must renew periodically or lose it',
      'Split brain: two nodes think they\'re leader — prevented by requiring a majority quorum (n/2+1 nodes)',
      'Raft: leader elected by majority vote; followers become candidates on election timeout',
      'Fencing token: each new leader gets a monotonically increasing token; stale leaders are rejected',
      'Use cases: Kafka controller, Kubernetes controller-manager, database primary election',
    ],
  },
]

// ── Progress ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'system-design-known-v1'

function loadKnown(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')) }
  catch { return new Set() }
}
function saveKnown(s: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...s]))
}

// ── Root ──────────────────────────────────────────────────────────────────────

export function SystemDesignModule() {
  const [known, setKnown] = useState<Set<string>>(loadKnown)
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [activeCategory, setActiveCategory] = useState<Category | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'known'>('all')

  const markKnown = useCallback((id: string) => {
    setKnown(prev => {
      const next = new Set([...prev, id])
      saveKnown(next)
      return next
    })
  }, [])

  const markPending = useCallback((id: string) => {
    setKnown(prev => {
      const next = new Set([...prev])
      next.delete(id)
      saveKnown(next)
      return next
    })
  }, [])

  const reveal = useCallback((id: string) => {
    setRevealed(prev => new Set([...prev, id]))
  }, [])

  function resetAll() {
    const empty = new Set<string>()
    saveKnown(empty)
    setKnown(empty)
    setRevealed(new Set())
  }

  const filtered = CARDS.filter(c => {
    if (activeCategory && c.category !== activeCategory) return false
    if (filter === 'known') return known.has(c.id)
    if (filter === 'pending') return !known.has(c.id)
    return true
  })

  const totalByCategory = (cat: Category) => CARDS.filter(c => c.category === cat).length
  const knownByCategory = (cat: Category) => CARDS.filter(c => c.category === cat && known.has(c.id)).length

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-48 bg-surface-800 border-r border-surface-600 flex flex-col py-4 px-2 shrink-0 gap-1">
        <p className="text-xs text-gray-600 uppercase tracking-wider px-2 mb-2">Categories</p>

        <button
          onClick={() => setActiveCategory(null)}
          className={`text-left rounded px-3 py-2 text-xs transition-colors ${
            activeCategory === null ? 'bg-accent text-white' : 'text-gray-400 hover:bg-surface-700 hover:text-gray-200'
          }`}>
          <div className="flex justify-between items-center">
            <span>All Topics</span>
            <span className="text-gray-600">{known.size}/{CARDS.length}</span>
          </div>
          <div className="mt-1.5 h-1 bg-surface-600 rounded-full overflow-hidden">
            <div className="h-full bg-accent/60 rounded-full" style={{ width: `${Math.round((known.size / CARDS.length) * 100)}%` }} />
          </div>
        </button>

        {CATEGORIES.map(cat => {
          const total = totalByCategory(cat.id)
          const done = knownByCategory(cat.id)
          const pct = Math.round((done / total) * 100)
          return (
            <button key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`text-left rounded px-3 py-2 text-xs transition-colors ${
                activeCategory === cat.id ? 'bg-accent text-white' : 'text-gray-400 hover:bg-surface-700 hover:text-gray-200'
              }`}>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </span>
                <span className="text-gray-600">{done}/{total}</span>
              </div>
              <div className="mt-1.5 h-1 bg-surface-600 rounded-full overflow-hidden">
                <div className="h-full bg-accent/60 rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </button>
          )
        })}

        <div className="mt-auto px-2">
          <button onClick={resetAll}
            className="flex items-center gap-1 text-xs text-gray-700 hover:text-gray-500 transition-colors">
            <RotateCcw size={10} /> Reset
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-surface-600 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-100">
              {activeCategory ? CATEGORIES.find(c => c.id === activeCategory)?.label : 'System Design'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {known.size} of {CARDS.length} cards reviewed
            </p>
          </div>
          <div className="flex gap-1">
            {(['all', 'pending', 'known'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded text-xs capitalize transition-colors ${
                  filter === f ? 'bg-accent text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-surface-700'
                }`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div className="p-6 flex flex-col gap-3 max-w-3xl">
          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-600">
              <p className="text-4xl mb-3">✓</p>
              <p className="text-sm">All cards in this category are reviewed!</p>
            </div>
          )}
          {filtered.map(card => (
            <FlashCard
              key={card.id}
              card={card}
              isKnown={known.has(card.id)}
              isRevealed={revealed.has(card.id)}
              onReveal={() => reveal(card.id)}
              onKnow={() => markKnown(card.id)}
              onUnknow={() => markPending(card.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Flash Card ────────────────────────────────────────────────────────────────

function FlashCard({ card, isKnown, isRevealed, onReveal, onKnow, onUnknow }: {
  card: Card; isKnown: boolean; isRevealed: boolean
  onReveal: () => void; onKnow: () => void; onUnknow: () => void
}) {
  const cat = CATEGORIES.find(c => c.id === card.category)!

  return (
    <div className={`rounded-lg border transition-all ${
      isKnown ? 'border-green-800 bg-green-950/20' : 'border-surface-600 bg-surface-800'
    }`}>
      {/* Question row */}
      <div className="flex items-start gap-3 px-4 py-3">
        <span className="text-sm text-gray-600 mt-0.5 w-5 text-center shrink-0">{cat.icon}</span>
        <div className="flex-1 min-w-0">
          <span className="text-xs text-gray-600 capitalize">{cat.label}</span>
          <p className="text-sm font-medium text-gray-100 mt-0.5 leading-snug">{card.question}</p>
        </div>
        {isKnown
          ? <CheckCircle size={16} className="text-green-400 shrink-0 mt-0.5" />
          : <button onClick={onReveal} className={`shrink-0 mt-0.5 transition-colors ${isRevealed ? 'text-gray-700' : 'text-accent hover:text-accent/80'}`}>
              {isRevealed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
        }
      </div>

      {/* Answer (revealed or always shown if known) */}
      {(isRevealed || isKnown) && (
        <div className="px-4 pb-4 border-t border-surface-600/50">
          <p className="text-sm text-gray-300 leading-relaxed mt-3 whitespace-pre-line">{card.answer}</p>

          <ul className="mt-3 space-y-1.5">
            {card.keyPoints.map((p, i) => (
              <li key={i} className="flex gap-2 text-xs text-gray-400">
                <span className="text-accent shrink-0 mt-0.5">▸</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>

          {card.seeAlso && (
            <p className="mt-3 text-xs text-gray-600 italic">{card.seeAlso}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            {!isKnown
              ? <button onClick={onKnow}
                  className="px-3 py-1.5 rounded text-xs bg-green-900/50 border border-green-700 text-green-300 hover:bg-green-900/80 transition-colors">
                  ✓ Got it
                </button>
              : <button onClick={onUnknow}
                  className="px-3 py-1.5 rounded text-xs text-gray-600 hover:text-gray-400 transition-colors">
                  ↻ Review again
                </button>
            }
          </div>
        </div>
      )}
    </div>
  )
}
