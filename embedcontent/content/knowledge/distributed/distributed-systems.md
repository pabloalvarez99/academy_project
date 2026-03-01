# Distributed Systems Fundamentals

Distributed systems consist of multiple computers coordinating to appear as a single system. Understanding their failure modes and consistency models is essential for building reliable infrastructure.

## Why Distribution is Hard

```
Problems that don't exist in a single process:
  • Network failures (packets dropped, delayed, duplicated, reordered)
  • Partial failures (some nodes work, others don't)
  • No global clock (can't determine "happened before" across machines)
  • No shared memory (must communicate via unreliable network)
```

**Fallacies of distributed computing** (Peter Deutsch):
1. The network is reliable
2. Latency is zero
3. Bandwidth is infinite
4. The network is secure
5. Topology doesn't change
6. There is one administrator
7. Transport cost is zero
8. The network is homogeneous

## CAP Theorem

A distributed data store can guarantee at most **2 of 3**:

```
         Consistency
            /   \
           /     \
          /       \
  CA    /           \  CP
       /             \
      /               \
Availability ────────── Partition Tolerance
           AP
```

Since **network partitions happen** (you cannot prevent them), real systems choose between:

**CP** (Consistency + Partition tolerance): System rejects requests if can't guarantee consistency. Example: HBase, Zookeeper, etcd
```
Node A (leader) ←─── partition ───→ Node B
Request to B → B refuses (can't confirm with A)
```

**AP** (Availability + Partition tolerance): System stays available, may return stale data. Example: Cassandra, DynamoDB, CouchDB
```
Node A (leader) ←─── partition ───→ Node B
Request to B → B returns its last known value (may be stale)
```

**CA** (Consistency + Availability): Only possible without partitions — i.e., single-node databases.

## Consistency Models

Stronger consistency = more coordination overhead = lower performance:

```
Strongest                              Weakest
    │                                      │
    ▼                                      ▼
Linearizability  →  Sequential  →  Causal  →  Eventual
(strict happens-before)          (causally related ordered)  (all replicas converge)
```

**Linearizability**: Once a write is acknowledged, all subsequent reads see it. Appears as a single copy. Required for: leader election, distributed locks, increment operations.

**Eventual Consistency**: All replicas will converge to the same value — eventually. No guarantee when. Used by: DNS, shopping carts (Amazon), social media feeds.

**Causal Consistency**: Operations causally related are seen in order. "If you see my reply, you see my post." Used by: collaborative editing (Google Docs-style).

## Consensus Algorithms

Distributed systems need to agree on values (leader election, log ordering). Consensus requires a majority (quorum) to tolerate failures:

```
3 nodes → tolerate 1 failure  (need 2/3)
5 nodes → tolerate 2 failures (need 3/5)
f failures → need 2f+1 nodes
```

### Raft (used by etcd, CockroachDB, TiKV)

```
States: Follower | Candidate | Leader

1. Election:
   - Follower times out waiting for heartbeat → becomes Candidate
   - Requests votes from peers (with its log term/index)
   - Wins majority → becomes Leader
   - Sends heartbeats to prevent new elections

2. Log Replication:
   - Client sends command to Leader
   - Leader appends to its log
   - Leader replicates to Followers (AppendEntries RPC)
   - Once majority acknowledge → Leader commits → responds to client
   - Leader notifies Followers → they commit too

3. Safety:
   - Only candidates with up-to-date logs can win elections
   - Committed entries are never lost
```

### Paxos (foundation, used by Google Chubby, Spanner)

Similar goals to Raft but harder to understand and implement. Raft was explicitly designed to be understandable.

## Replication

### Single-Leader (Master-Slave)
```
Writes → Leader → replicate → Follower 1
                            → Follower 2

Reads: from any replica (may be stale)
Failover: promote a follower to leader
Problem: split-brain (two leaders)
```

**Synchronous replication**: Leader waits for follower acknowledgment before responding. Durable but slower.

**Asynchronous replication**: Leader responds immediately. Faster but follower may lag (replication lag).

### Multi-Leader
```
Leader A ←──── sync ────→ Leader B
   ↕                           ↕
Followers                 Followers
```

Used for: multi-datacenter, offline-capable clients. **Problem**: write conflicts require resolution.

**Conflict resolution**: Last-write-wins (LWW — data loss possible), application-level merge, CRDTs.

### Leaderless (Dynamo-style)
```
Client sends write to all N replicas → waits for W acknowledgments
Client sends read from all N replicas → waits for R responses, picks latest version

Quorum: W + R > N ensures at least 1 node has latest write
Common: N=3, W=2, R=2
```

Used by: DynamoDB, Cassandra, Riak

## Distributed Transactions

### Two-Phase Commit (2PC)
```
Phase 1 (Prepare):
  Coordinator → "Can you commit?" → all participants
  Participants: lock resources, write to log, respond YES/NO

Phase 2 (Commit/Abort):
  If all YES: Coordinator → "Commit!" → all participants
  If any NO:  Coordinator → "Abort!"  → all participants
```

**Problem**: If coordinator crashes after prepare but before commit, participants are stuck holding locks. Blocking protocol.

### Saga Pattern (preferred for microservices)
```
Long-running transaction = sequence of local transactions
Each step publishes event that triggers next step

If step N fails → execute compensating transactions for steps 1..(N-1)

Order: create_order → charge_payment → ship_order
Fail:  cancel_shipment → refund_payment → cancel_order
```

## Distributed Clocks

Physical clocks drift and can't be synchronized perfectly across nodes.

### Logical Clocks (Lamport Timestamps)
```
Rule 1: increment counter on each event
Rule 2: on send, attach counter; on receive, max(local, received) + 1

If A → B (A happened before B): timestamp(A) < timestamp(B)
But converse not guaranteed: timestamp(A) < timestamp(B) doesn't mean A → B
```

### Vector Clocks
```
Each node has a vector [v1, v2, ..., vN] (one counter per node)

Node A update: [1, 0, 0]
Node A → Node B: B receives [1, 0, 0], updates to [1, 1, 0]
Node B → Node C: C receives [1, 1, 0], updates to [1, 1, 1]

Concurrent events: [2, 1, 0] and [1, 2, 0] — neither happened before the other
→ conflict, needs resolution
```

Used by: DynamoDB, Riak for conflict detection.

### Google TrueTime (Spanner)
Atomic clocks + GPS receivers in every datacenter. `TrueTime.now()` returns `[earliest, latest]` — guaranteed the true time is in the interval. Spanner waits out the uncertainty before committing, providing external consistency globally.

## Message Delivery Guarantees

```
At-most-once:   send and forget. Message may be lost. Never duplicated.
At-least-once:  retry until acknowledged. May be duplicated.
Exactly-once:   idempotent processing + deduplication. Most expensive.
```

**Idempotency**: processing a message N times produces the same result as processing once. Design operations to be idempotent → safe to use at-least-once delivery.

```go
// Idempotent: set absolute value (safe to retry)
UPDATE accounts SET balance = 100 WHERE id = 1

// NOT idempotent: relative change (dangerous to retry)
UPDATE accounts SET balance = balance + 100 WHERE id = 1
// Fix: include idempotency key
UPDATE accounts SET balance = balance + 100
WHERE id = 1 AND last_transaction_id != 'txn-abc123'
```

## Interview Questions

**Q: What's the difference between consistency in CAP and ACID?**
A: ACID consistency means a transaction brings the database from one valid state to another (business rules satisfied). CAP consistency is about linearizability — all nodes see the same data at the same time. They're different concepts with the same word. An ACID-consistent database can still be CAP-inconsistent (stale reads on replicas).

**Q: How would you implement distributed locking?**
A: Use a strongly consistent store (Redis with Redlock, etcd, Zookeeper). The lock must have a TTL/lease to automatically expire if the holder crashes. On renewal, verify you still hold the lock before performing critical operations — network pauses can cause lock expiry without the holder's knowledge. Fencing tokens (monotonically increasing IDs per lock grant) prevent stale lock holders from corrupting state even after losing the lock.

**Q: What's the difference between Raft and 2PC?**
A: 2PC is a commitment protocol for distributed transactions — all participants must agree or abort. It's blocking: if the coordinator crashes, participants wait indefinitely. Raft is a consensus algorithm for replicating a state machine log across nodes — it continues operating as long as a quorum is available. Raft is non-blocking (majority survives, can elect new leader). Databases like CockroachDB use Raft for replication and a variant of 2PC across shards for distributed transactions.
