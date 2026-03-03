# Microservices Patterns

Microservices decompose a system into independently deployable services organized around business capabilities. Done well, they enable independent scaling and team autonomy. Done poorly, they create a distributed monolith — all the complexity of distribution with none of the benefits.

## Service Decomposition

### By Business Capability

Organize services around what the business does, not technical layers:

```
Monolith:
  ├── controllers/
  ├── services/
  ├── models/          ← All business logic mixed together
  └── repositories/

By Business Capability:
  ├── order-service/    ← owns the order lifecycle
  ├── inventory-service/
  ├── payment-service/
  ├── notification-service/
  └── user-service/
```

### By Subdomain (Domain-Driven Design)

Align service boundaries with DDD bounded contexts. Each context has its own ubiquitous language — "order" means different things in fulfillment vs billing:

```
Core Domain:
  └── order-service        ← competitive differentiator — invest heavily

Supporting Subdomain:
  └── notification-service ← needed but not differentiating

Generic Subdomain:
  └── auth-service         ← use a third-party (Auth0, Cognito) if possible
```

**Decomposition heuristics**:
- Services should be independently deployable — if you always deploy A and B together, merge them
- Services should own their data — no shared database between services
- Team size: "two-pizza team" per service (5-8 engineers)
- Minimize cross-service transactions

## Inter-Service Communication

### Synchronous: REST vs gRPC

| | REST/HTTP | gRPC |
|---|---|---|
| Protocol | HTTP/1.1 or HTTP/2 | HTTP/2 (required) |
| Payload | JSON (human-readable) | Protocol Buffers (binary) |
| Contract | OpenAPI spec (optional) | `.proto` file (required) |
| Performance | Moderate | 5–10x faster, smaller payload |
| Streaming | Limited (SSE) | Native bi-directional streaming |
| Browser support | Native | Requires grpc-web proxy |
| Code generation | Manual or OpenAPI tools | Auto-generated clients |
| Best for | Public APIs, cross-org | Internal service mesh, high-throughput |

```protobuf
// orders.proto
syntax = "proto3";

service OrderService {
  rpc PlaceOrder(PlaceOrderRequest) returns (PlaceOrderResponse);
  rpc StreamOrderUpdates(OrderId) returns (stream OrderUpdate);
}

message PlaceOrderRequest {
  string customer_id = 1;
  repeated OrderItem items = 2;
}
```

### Asynchronous: Events

Prefer async messaging when:
- The caller doesn't need an immediate response
- The downstream service may be temporarily unavailable
- Multiple services need to react to the same event
- You want to decouple deploy timelines

## Sync vs Async Trade-offs

| | Synchronous (REST/gRPC) | Asynchronous (Events) |
|---|---|---|
| Coupling | Temporal coupling — both services must be up | Decoupled — producer doesn't wait |
| Latency | Low for single hop | Higher (broker adds ~1-10ms) |
| Complexity | Simple request/response | Requires message broker, DLQ, idempotency |
| Error handling | Immediate feedback, easy retry | Must handle partial failures, eventual consistency |
| Availability | Cascades failures — A is down if B is down | A continues publishing even if B is down |
| Observability | Single request trace | Requires correlation IDs across async hops |
| Best for | User-facing reads, real-time queries | Background processing, multi-consumer workflows |

## API Gateway

All external traffic enters through a single gateway. Services are never directly exposed:

```
Internet
    │
    ▼
[API Gateway]                  ← Kong, AWS API Gateway, Nginx, Traefik
    ├─ Authentication/JWT validation
    ├─ Rate limiting (per-user, per-API-key)
    ├─ Request routing (path-based, header-based)
    ├─ SSL termination
    ├─ Request/response transformation
    ├─ Logging and tracing injection (correlation IDs)
    │
    ├──────→ [User Service]     :8001
    ├──────→ [Order Service]    :8002
    └──────→ [Inventory Service]:8003
```

## Service Mesh and Sidecar Pattern

A service mesh moves cross-cutting concerns (mTLS, observability, circuit breaking) out of application code into a sidecar proxy co-deployed with each service:

```
┌─────────────────────────────────────────────────────────┐
│  Pod / Container Group                                   │
│                                                          │
│  ┌─────────────────┐       ┌────────────────────────┐   │
│  │  Order Service  │◄─────►│  Envoy Sidecar Proxy   │   │
│  │  (your code)    │ local │  - mTLS between services│   │
│  └─────────────────┘       │  - Circuit breaker      │   │
│                             │  - Retry logic          │   │
│                             │  - Distributed tracing  │   │
│                             │  - Load balancing        │   │
│                             └────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

Istio and Linkerd are the dominant service meshes. They require no application code changes — all networking logic is in the proxy.

## Circuit Breaker

Prevents cascading failures when a downstream service degrades:

```
States:
  CLOSED    → requests pass through normally (circuit conducting)
  OPEN      → requests fail immediately (no calls to downstream)
  HALF-OPEN → limited requests allowed through to probe recovery

Transitions:
  CLOSED    + N failures in window  → OPEN (trip circuit)
  OPEN      + timeout elapsed       → HALF-OPEN (probe)
  HALF-OPEN + success               → CLOSED (recover)
  HALF-OPEN + failure               → OPEN (still broken)
```

```typescript
class CircuitBreaker {
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  private failureCount = 0;
  private nextAttempt: number = Date.now();

  constructor(
    private readonly threshold: number = 5,    // failures before tripping
    private readonly timeout: number   = 30_000 // ms before probing
  ) {}

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() < this.nextAttempt) {
        throw new CircuitOpenError("Circuit breaker is open");
      }
      this.state = "HALF_OPEN";
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = "CLOSED";
  }

  private onFailure(): void {
    this.failureCount++;
    if (this.failureCount >= this.threshold || this.state === "HALF_OPEN") {
      this.state = "OPEN";
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}
```

## Bulkhead Pattern

Isolate resources per consumer so one slow downstream cannot exhaust all threads/connections:

```typescript
// Separate thread pools (or connection pools) per downstream service
const paymentPool = new ConnectionPool({ max: 10 });   // capped separately
const inventoryPool = new ConnectionPool({ max: 20 });

// If payment service is slow, it only blocks its 10 connections
// Inventory service connections are unaffected
```

Analogous to ship bulkheads — a hull breach in one compartment doesn't sink the ship.

## Distributed Tracing

A single user request may fan out across 10 services. Tracing ties them together:

```
User Request → API Gateway → Order Service → Inventory Service → DB
                                           └─→ Payment Service → Stripe
                                           └─→ Notification Service → SendGrid

Trace ID: abc-123 (same across all hops)
  Span 1: api-gateway       duration: 145ms
  Span 2: order-service     duration: 130ms (child of span 1)
  Span 3: inventory-service  duration: 40ms (child of span 2)
  Span 4: payment-service    duration: 80ms (child of span 2)
  Span 5: notification-service duration: 15ms (child of span 2)
```

```typescript
// Propagate trace context via HTTP headers
// W3C Trace Context standard:
//   traceparent: 00-{traceId}-{parentSpanId}-{flags}

app.use((req, res, next) => {
  const traceParent = req.headers["traceparent"] as string;
  const span = tracer.startSpan("order.create", { childOf: traceParent });

  req.span = span;
  res.setHeader("traceparent", span.toTraceParent());

  res.on("finish", () => {
    span.setTag("http.status_code", res.statusCode);
    span.finish();
  });

  next();
});
```

Tools: Jaeger, Zipkin, AWS X-Ray, Datadog APM, OpenTelemetry (vendor-neutral standard).

## Health Checks

```typescript
// Liveness: is the process alive? (restart if not)
app.get("/health/live", (req, res) => {
  res.status(200).json({ status: "alive" });
});

// Readiness: is the service ready to handle traffic? (remove from load balancer if not)
app.get("/health/ready", async (req, res) => {
  try {
    await db.query("SELECT 1");           // check DB
    await redis.ping();                   // check cache
    res.status(200).json({ status: "ready" });
  } catch (err) {
    res.status(503).json({ status: "not_ready", error: err.message });
  }
});

// Startup: Kubernetes waits until this returns 200 before starting liveness checks
app.get("/health/startup", (req, res) => {
  if (appIsInitialized) {
    res.status(200).json({ status: "started" });
  } else {
    res.status(503).json({ status: "starting" });
  }
});
```

## Common Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| Shared database | Services can't evolve schema independently — still a monolith | Each service owns its data store |
| Chatty services | High latency from many small synchronous calls | Aggregate at gateway; prefer async |
| Distributed monolith | Services always deployed together, tightly coupled | Fix coupling, not deployment |
| Premature decomposition | Microservices before you understand the domain | Start as a modular monolith; extract later |
| No service mesh | Auth, retries, tracing duplicated in every service | Adopt sidecar pattern early |
| Synchronous sagas | Long distributed transactions via sync chain | Use choreography-based sagas (events) |

## Interview Questions

**Q: When should you NOT use microservices?**
A: Early-stage products where the domain model is still changing (decomposing the wrong boundaries is worse than a monolith), small teams (<10 engineers) where operational overhead outweighs autonomy benefits, or systems with strong consistency requirements (transactional integrity across services is hard). Start with a well-structured modular monolith and extract services when clear pain points emerge.

**Q: How do you handle a transaction that spans multiple services?**
A: Use the Saga pattern. Either orchestration (a central coordinator sends commands and handles failures) or choreography (each service reacts to events and emits their own). Both rely on compensating transactions — if step 3 of 5 fails, undo steps 1 and 2 by emitting compensating events. There is no distributed ACID transaction in microservices — design for eventual consistency.
