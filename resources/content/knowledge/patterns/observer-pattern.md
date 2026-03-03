# Observer Pattern

The Observer pattern defines a **one-to-many dependency** between objects. When one object (the subject/observable) changes state, all its dependents (observers) are notified and updated automatically.

## What It Is

A behavioral pattern that decouples producers of events from consumers. The subject maintains a list of observers and calls them on state change. Observers register and unregister themselves at runtime — the subject has no knowledge of what the observers do with the notification.

> Core idea: objects that care about an event subscribe to it. The event source never imports its subscribers.

## When to Use It

| Signal | Example |
|--------|---------|
| One event, multiple independent reactions | User logs in → update UI, log audit trail, send welcome email |
| Reactions should be added without modifying the source | Plugin systems, middleware pipelines |
| Objects need to be notified without tight coupling | Model → View in MVC/MVVM |
| Runtime subscription/unsubscription needed | Feature flags toggling live listeners |
| Replacing polling with push notifications | File watcher, WebSocket message handler |

## Observer vs Pub/Sub vs Reactive Streams

| Concept | Coupling | Intermediary | Backpressure |
|---------|----------|-------------|-------------|
| Observer (GoF) | Direct — subject knows observer interface | None | None |
| Pub/Sub | Loose — publisher/subscriber don't know each other | Message broker (topic/channel) | Optional |
| Reactive Streams (RxJS/RxJava) | Composable pipelines | Operators (map/filter/merge) | Built-in (demand signaling) |

Use plain Observer for in-process state changes. Use Pub/Sub when crossing process boundaries. Use reactive streams when you need backpressure or composable transforms.

## Structure

```
<<interface>>
Observer<T>
+ update(event: T): void

<<interface>>
Observable<T>
+ subscribe(observer: Observer<T>): Unsubscribe
+ notify(event: T): void

ConcreteSubject implements Observable<T>
- observers: Set<Observer<T>>
- state: T

ConcreteObserver implements Observer<T>
+ update(event: T): void
```

`Unsubscribe` is a teardown function (common in JavaScript) or a `Subscription` handle. Always expose it to prevent memory leaks.

## Code Example — TypeScript Typed EventEmitter

```typescript
type Listener<T> = (event: T) => void;
type Unsubscribe = () => void;

class TypedEventEmitter<Events extends Record<string, unknown>> {
  private listeners = new Map<keyof Events, Set<Listener<unknown>>>();

  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): Unsubscribe {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as Listener<unknown>);

    return () => this.off(event, listener); // return teardown
  }

  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    this.listeners.get(event)?.delete(listener as Listener<unknown>);
  }

  once<K extends keyof Events>(event: K, listener: Listener<Events[K]>): Unsubscribe {
    const wrapper: Listener<Events[K]> = (event) => {
      listener(event);
      this.off(event as K, wrapper); // auto-unsubscribe after first call
    };
    return this.on(event as K, wrapper);
  }

  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    this.listeners.get(event)?.forEach((fn) => fn(data));
  }
}

// --- Domain usage ---
interface UserEvents {
  login:   { userId: string; timestamp: Date };
  logout:  { userId: string };
  purchase: { userId: string; orderId: string; amount: number };
}

const userBus = new TypedEventEmitter<UserEvents>();

// Observer 1: audit logger
const unsubAudit = userBus.on("login", ({ userId, timestamp }) => {
  console.log(`[AUDIT] ${userId} logged in at ${timestamp.toISOString()}`);
});

// Observer 2: analytics
userBus.on("purchase", ({ userId, orderId, amount }) => {
  console.log(`[ANALYTICS] Order ${orderId} — $${amount} by ${userId}`);
});

// Observer 3: one-time welcome email
userBus.once("login", ({ userId }) => {
  console.log(`[EMAIL] Sending welcome email to ${userId}`);
});

// Fire events
userBus.emit("login",    { userId: "u-42", timestamp: new Date() });
userBus.emit("purchase", { userId: "u-42", orderId: "ord-7", amount: 59.99 });

// Cleanup
unsubAudit(); // audit no longer notified
userBus.emit("login", { userId: "u-42", timestamp: new Date() }); // no audit log
```

## Reactive Streams Comparison (RxJS)

```typescript
import { Subject } from "rxjs";
import { filter, map } from "rxjs/operators";

const events$ = new Subject<UserEvents["purchase"]>();

// Composable — filter and transform in the pipeline
events$.pipe(
  filter((e) => e.amount > 100),
  map((e) => ({ ...e, tier: "high-value" }))
).subscribe((e) => console.log("High-value purchase:", e));

events$.next({ userId: "u-1", orderId: "ord-99", amount: 250 });
```

## Trade-offs and Pitfalls

| Pro | Con |
|-----|-----|
| Decouples subject from observers | Notification order is undefined — don't rely on it |
| Observers can be added without modifying subject | Memory leaks if observers are never unsubscribed |
| Supports broadcast to unlimited subscribers | Cascading updates — observer A triggers subject B, which triggers observer A |
| Easy to test individual observers in isolation | Hard to debug: who fired this event and why? |

**Pitfall — Memory leaks**: In JavaScript, a closure holding a DOM reference in an event listener prevents GC. Always return and call the `unsubscribe` function, especially in React `useEffect` cleanup.

**Pitfall — Synchronous notification storms**: If `emit()` is synchronous and one listener throws, remaining listeners are skipped. Wrap calls in `try/catch` per listener or use async notification.

**Pitfall — God event bus**: A single global bus for every event in the app becomes impossible to trace. Prefer scoped emitters tied to specific domain objects.

## Real-World Examples

| System | Observer Use |
|--------|-------------|
| Node.js `EventEmitter` | Core of `Stream`, `net.Socket`, `http.Server` |
| DOM `addEventListener` | Every browser event (click, resize, input) |
| React `useEffect` + state | Component re-renders = observers of state changes |
| Redux / Zustand | Store subscribers notified on every dispatch |
| RxJS `Observable` | Reactive streams in Angular's HTTP client |
| Vue 3 reactivity system | `watchEffect` tracks reactive deps as observers |
| Git hooks | Pre-commit, post-merge hooks = observers of repo events |
