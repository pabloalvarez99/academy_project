# Microservices Architecture

Microservices decompose a monolithic application into small, independently deployable services. Each service owns its data, communicates over a network, and can be scaled, deployed, and updated independently.

## Monolith vs Microservices

```
Monolith                          Microservices
─────────────────────             ──────────────────────────────────
Single deployable unit            Many small independent services
Shared database                   Each service owns its data
Scale everything together         Scale individual bottlenecks
Simple local calls                Network calls (latency, failure)
Easy to develop (initially)       Complex infrastructure
Hard to scale/deploy              Easy to scale/deploy per service
```

**When to use microservices**: Large teams, high scale requirements, independent release cadences. For small teams or early-stage products, start with a monolith.

## Service Communication

### Synchronous (REST / gRPC)
```
Client → Service A → Service B → Service C
                ←─────────────────────────
```

- REST: HTTP/JSON, simple, universally supported, higher overhead
- gRPC: HTTP/2 + Protocol Buffers, efficient, strongly typed, streaming
- **Problem**: Tight temporal coupling — if B is down, A fails

### Asynchronous (Message Queue)
```
Service A → [Queue] → Service B → [Queue] → Service C
```

Tools: Kafka, RabbitMQ, AWS SQS, NATS

- Producer sends message and continues — no waiting
- Consumer processes at its own pace
- **Advantages**: Resilience, buffering, decoupling, event replay
- **Disadvantages**: Harder to debug, eventual consistency, message ordering

### Event-Driven Pattern
```go
// Service publishes an event
event := OrderPlaced{OrderID: "123", Total: 99.99}
broker.Publish("orders.placed", event)

// Other services react independently
// inventory service: reserve stock
// email service: send confirmation
// analytics service: track revenue
```

## Service Discovery

Services need to find each other dynamically (IPs change with containers):

```
DNS-based: order-service.prod.svc.cluster.local (Kubernetes)

Registry-based:
  → Service registers on startup: PUT /registry/order-service {ip: "10.0.1.5", port: 8080}
  → Client queries: GET /registry/payment-service → {ip: "10.0.1.12", port: 9090}
  → Tools: Consul, Eureka, etcd
```

## API Gateway

Single entry point for all external traffic:

```
Client → [API Gateway] → /users      → User Service
                       → /orders     → Order Service
                       → /products   → Product Service

Responsibilities:
  • Authentication & authorization
  • Rate limiting
  • SSL termination
  • Request routing
  • Response aggregation
  • Logging & metrics
```

Tools: Kong, NGINX, AWS API Gateway, Traefik

## Resilience Patterns

### Circuit Breaker
```
CLOSED: requests flow normally
    ↓ (failure rate exceeds threshold)
OPEN: requests fail immediately (no network call)
    ↓ (after timeout)
HALF-OPEN: test request allowed
    ↓ (success → CLOSED, failure → OPEN)
```

```go
// Hystrix-style pseudocode
cb := circuitbreaker.New(circuitbreaker.Settings{
    MaxRequests:   1,           // allowed in half-open
    Interval:      30 * time.Second,
    Timeout:       60 * time.Second,
    ReadyToTrip:   func(c Counts) bool { return c.ConsecutiveFailures > 5 },
})

result, err := cb.Execute(func() (interface{}, error) {
    return paymentService.Charge(req)
})
```

### Retry with Exponential Backoff
```
Attempt 1: immediate
Attempt 2: wait 1s
Attempt 3: wait 2s
Attempt 4: wait 4s (+ jitter to prevent thundering herd)
```

### Bulkhead
Isolate failures: give each service its own thread pool / connection pool so one slow service can't exhaust shared resources.

### Timeout
Always set timeouts on network calls. Without them, threads block indefinitely and cascade failures.

## Data Management

Each service owns its data — **no shared databases**:

```
✓ User Service    → users_db (PostgreSQL)
✓ Order Service   → orders_db (PostgreSQL)
✓ Product Service → products_db (MongoDB)
✓ Session Service → session_db (Redis)

✗ Multiple services → same database table (tight coupling)
```

### Eventual Consistency with Sagas
Cross-service transactions can't use ACID — use the Saga pattern:

```
Choreography saga (event-based):
  Order Service: emit OrderCreated
  → Inventory Service: reserve stock → emit StockReserved
  → Payment Service: charge card → emit PaymentCompleted
  → Order Service: confirm order

If payment fails:
  → emit PaymentFailed
  → Inventory Service: release stock (compensating transaction)
```

## Deployment

### Docker + Kubernetes
```yaml
# Each service has its own Dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o service .

FROM alpine:latest
COPY --from=builder /app/service /service
EXPOSE 8080
CMD ["/service"]
```

```yaml
# Kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  replicas: 3
  selector:
    matchLabels: { app: order-service }
  template:
    spec:
      containers:
      - name: order-service
        image: company/order-service:v2.1.0
        resources:
          requests: { memory: "128Mi", cpu: "100m" }
          limits:   { memory: "256Mi", cpu: "500m" }
```

## Observability

With many services, you need distributed tracing + centralized logging:

```
Distributed Tracing: Jaeger / Zipkin / OpenTelemetry
  trace_id propagated through all service calls
  span per service showing time spent

Centralized Logging: ELK Stack (Elasticsearch + Logstash + Kibana)
  structured JSON logs from all services
  queryable by trace_id, user_id, service name

Metrics: Prometheus + Grafana
  /metrics endpoint per service (requests/sec, p99 latency, error rate)
  dashboards and alerting
```

The **RED method** for service health:
- **R**ate: requests per second
- **E**rrors: error rate
- **D**uration: latency distribution (p50, p95, p99)

## Service Mesh

Sidecar proxy (Envoy/Istio) injected alongside each service:

```
Service A → [Envoy sidecar] ←→ [Envoy sidecar] → Service B
                ↕                       ↕
          [Control Plane (Istio)]
```

Handles: mTLS, load balancing, retries, circuit breaking, telemetry — without code changes.

## Interview Questions

**Q: What's the difference between REST and gRPC for microservices?**
A: REST uses HTTP/1.1 + JSON: human-readable, firewall-friendly, higher overhead. gRPC uses HTTP/2 + Protocol Buffers: binary encoding (3-10x smaller), built-in streaming, strongly typed contracts, language-agnostic code generation. gRPC is better for internal service-to-service; REST for public APIs.

**Q: How do you handle distributed transactions in microservices?**
A: You avoid them where possible. Each service transaction is local and ACID. Cross-service consistency uses the Saga pattern with compensating transactions (rollback via events). For critical operations, use the Outbox pattern: write event to DB in same transaction as business data, then publish to message broker.

**Q: What's the CAP theorem and how does it apply?**
A: CAP states a distributed system can only guarantee two of: Consistency (all nodes see same data), Availability (every request gets a response), Partition tolerance (works despite network failures). Since network partitions happen, you choose CP (consistent but may reject requests) or AP (always responds but may return stale data). Microservices typically choose AP with eventual consistency.
