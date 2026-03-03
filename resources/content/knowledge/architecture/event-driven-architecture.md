# Event-Driven Architecture

Event-driven systems decouple producers from consumers, enabling asynchronous workflows, high throughput, and independent scalability. Understanding the patterns — and their failure modes — separates event-driven systems that work in production from those that don't.

## Events vs Commands vs Queries (CQS/CQRS)

These three message types have fundamentally different semantics:

| Type | Meaning | Direction | Expectation |
|---|---|---|---|
| **Event** | "Something happened" (fact) | Broadcast (1:N) | No response expected |
| **Command** | "Do this thing" | Directed (1:1) | Success/failure response |
| **Query** | "Tell me this" | Request/response | Data response |

```typescript
// Event: past tense, describes a fact that occurred
interface OrderPlacedEvent {
  type:       "order.placed";
  orderId:    string;
  customerId: string;
  items:      OrderItem[];
  total:      number;
  placedAt:   string;  // ISO timestamp
}

// Command: imperative, requests an action
interface ShipOrderCommand {
  type:      "ShipOrder";
  orderId:   string;
  warehouse: string;
}

// Query: requests information
interface GetOrderStatusQuery {
  type:    "GetOrderStatus";
  orderId: string;
}
```

Events represent immutable facts about what happened. They do not prescribe what should happen next — that's the consumer's concern. This is the key to loose coupling.

## CQRS — Command Query Responsibility Segregation

Separate read and write models. The write model handles commands and emits events; the read model subscribes to events and maintains optimized projections for queries:

```
Commands → Write Model → Events → Message Broker
                                       ↓
                              Read Model Projections
                                       ↓
                              Queries → Read Model
```

**Why**: Write models are normalized for consistency. Read models are denormalized for query performance. They can scale independently — reads often dominate by 100:1.

## Event Sourcing

Store state as an append-only log of events rather than current state snapshots:

```
Traditional DB:  users table: { id: 1, balance: 850 }  ← current state only

Event Store:     account-1/events:
  { type: "AccountOpened",   amount: 1000, at: "..." }
  { type: "MoneyWithdrawn",  amount: 200,  at: "..." }
  { type: "MoneyDeposited",  amount: 50,   at: "..." }
  → current balance = 1000 - 200 + 50 = 850
```

**Benefits**: Full audit trail by default, time-travel debugging, replay events to rebuild state or populate new read models.

**Costs**: Complex to query (need projections for current state), eventually consistent, aggregate snapshots needed for long event streams (>1000 events), harder to fix bugs in event logic retrospectively.

## Event Flow: Producer → Broker → Consumer

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│  [Order Service]                                                  │
│    └─ ORDER PLACED                                                │
│         │                                                         │
│         ▼                                                         │
│  [Message Broker: Kafka / RabbitMQ / SQS]                        │
│    ├─ Topic: orders.placed                                        │
│    │    ├─ Partition 0 ──→ [Inventory Service] → Reserve stock   │
│    │    ├─ Partition 1 ──→ [Notification Service] → Send email   │
│    │    └─ Partition 2 ──→ [Analytics Service] → Update metrics  │
│    │                                                              │
│    └─ Dead Letter Queue (DLQ): orders.placed.dlq                 │
│         ↑ Failed messages after max retries                       │
│         └─→ [Alert + Manual review / replay]                      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

Retry policy: immediate → 5s → 30s → 5m → 30m → DLQ
```

## Kafka vs RabbitMQ vs SQS

| | Apache Kafka | RabbitMQ | Amazon SQS |
|---|---|---|---|
| Model | Log-based, append-only | Message queue / broker | Managed queue |
| Ordering | Per-partition ordering | Per-queue FIFO (optional) | FIFO queue option |
| Retention | Configurable (days/weeks) | Until consumed | 14 days max |
| Replay | Yes — consumer controls offset | No — once consumed, gone | No |
| Throughput | Very high (millions/sec) | High (50k–100k/sec) | High (managed) |
| Consumer groups | Multiple independent groups | Competing consumers or pub/sub | One group per queue |
| Operational complexity | High (ZooKeeper/KRaft, cluster) | Medium | Low (fully managed) |
| Best for | Event streaming, audit logs, CQRS | Task queues, RPC, routing | AWS-native apps, simple queues |

**Guideline**: Use Kafka when you need event replay, multiple independent consumer groups, or very high throughput. Use SQS when you're on AWS and want zero-ops. Use RabbitMQ when you need flexible routing, request/reply patterns, or message priority.

## Dead Letter Queues (DLQ)

Messages that cannot be processed (bad data, downstream service unavailable, consumer bug) must not be silently dropped:

```typescript
// Consumer with retry and DLQ pattern (AWS SQS example)
const consumer = new SQSConsumer({
  queueUrl: process.env.ORDER_QUEUE_URL,
  maxRetries: 3,

  async handleMessage(message: SQSMessage): Promise<void> {
    try {
      const event = JSON.parse(message.Body) as OrderPlacedEvent;
      await inventoryService.reserveItems(event.orderId, event.items);
      // SQS auto-deletes on successful return
    } catch (err) {
      logger.error({ err, messageId: message.MessageId }, "Failed to process");

      const receiveCount = parseInt(message.Attributes?.ApproximateReceiveCount ?? "1");
      if (receiveCount >= 3) {
        // SQS moves to DLQ automatically after maxReceiveCount
        // Alert team
        await alerting.trigger("order_processing_failed", {
          messageId: message.MessageId,
          error: err.message,
        });
      }
      throw err;  // rethrow — SQS will retry
    }
  },
});
```

**DLQ operations**:
- Monitor DLQ depth — non-zero means a systematic bug
- Replay DLQ messages after fixing the bug (Kafka: reset offset; SQS: redrive policy)
- Never silently discard messages — data loss in business-critical flows is catastrophic

## Idempotency — The Key to Safe Retries

When a consumer processes the same event twice (network retry, duplicate delivery), the result must be the same as processing it once:

```typescript
async function processOrderPlaced(event: OrderPlacedEvent): Promise<void> {
  // Idempotency check: has this event been processed?
  const alreadyProcessed = await db.processedEvents.exists({
    eventId: event.orderId,
    type:    event.type,
  });

  if (alreadyProcessed) {
    logger.info({ eventId: event.orderId }, "Duplicate event — skipping");
    return;
  }

  // Process in a transaction, marking processed atomically
  await db.transaction(async (trx) => {
    await inventoryService.reserve(event.items, { trx });
    await trx.processedEvents.insert({
      eventId:     event.orderId,
      type:        event.type,
      processedAt: new Date(),
    });
  });
}
```

Use natural idempotency where possible: `INSERT ... ON CONFLICT DO NOTHING`, `UPDATE ... WHERE status = 'pending'`.

## Outbox Pattern — Guaranteed Event Publication

Naive event publishing is unsafe: what if the DB write succeeds but the message broker publish fails?

```typescript
// WRONG: two separate writes — can get out of sync
await db.orders.create(order);
await kafka.send("orders.placed", event);  // if this fails, order exists but no event
```

The Outbox pattern: write the event to a DB table in the same transaction as the domain change. A separate process reliably polls and publishes:

```typescript
// CORRECT: atomic write to both orders and outbox
await db.transaction(async (trx) => {
  const order = await trx.orders.create(orderData);
  await trx.outbox.insert({                   // same transaction
    aggregateId: order.id,
    eventType:   "order.placed",
    payload:     JSON.stringify(orderEvent),
    createdAt:   new Date(),
    published:   false,
  });
});

// Separate outbox relay process (runs continuously):
async function relayOutboxEvents(): Promise<void> {
  const unpublished = await db.outbox.findAll({ where: { published: false }, limit: 100 });
  for (const record of unpublished) {
    await kafka.send(record.eventType, JSON.parse(record.payload));
    await db.outbox.update(record.id, { published: true });
  }
}
```

## Eventual Consistency

In a distributed event-driven system, services reach consistency eventually — not immediately. This is a core trade-off, not a bug:

```
T+0ms:  Order service writes order to DB. Publishes order.placed.
T+50ms: Inventory service processes event, reserves stock.
T+100ms: Notification service sends confirmation email.

During T+0 to T+50ms: Order exists but stock not yet reserved.
This window is "eventual consistency" — it resolves within milliseconds to seconds.
```

Design your UIs and APIs to handle this: show "Order received — processing" rather than implying immediate completion of downstream effects. Use correlation IDs to track a saga across services.

## Interview Questions

**Q: How do you handle a message that keeps failing and going to the DLQ?**
A: First, alert immediately when DLQ depth is non-zero. Investigate the root cause: is it bad data, a consumer bug, or a downstream dependency outage? Fix the bug, then replay from DLQ. Use structured logging with `messageId` and `correlationId` so you can trace the full lifecycle. Consider a "poison pill" pattern — quarantine messages with specific bad patterns while replaying others.

**Q: What's the difference between at-most-once, at-least-once, and exactly-once delivery?**
A: At-most-once: messages may be dropped but never duplicated (fire and forget). At-least-once: messages are retried on failure, so duplicates are possible — consumers must be idempotent. Exactly-once: no loss and no duplicates — extremely hard to guarantee across distributed systems; Kafka offers it within a single cluster via transactional producers, but it comes with throughput penalties. In practice, design for at-least-once with idempotent consumers.
