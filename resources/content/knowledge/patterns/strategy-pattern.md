# Strategy Pattern

The Strategy pattern defines a **family of algorithms**, encapsulates each one, and makes them interchangeable. The client can switch algorithms at runtime without altering the code that uses them.

## What It Is

A behavioral pattern that extracts varying behavior into separate classes (strategies) behind a common interface. The **context** holds a reference to the current strategy and delegates work to it, without knowing the concrete implementation.

> Core idea: favor composition over inheritance. Instead of subclassing to change behavior, inject behavior.

## When to Use It

| Signal | Example |
|--------|---------|
| Multiple algorithms for the same task | Bubble sort vs quicksort vs merge sort |
| Runtime algorithm selection needed | User picks compression level (fast/best) |
| Eliminating large if/switch chains | `if paymentType === "card"` ... `else if "paypal"` |
| Algorithms that should vary independently from the context | Tax calculation differs by country |
| Open/Closed Principle violation in existing code | Adding a new case breaks existing logic |

## Structure

```
<<interface>>
Strategy
+ execute(data): Result

ConcreteStrategyA implements Strategy
ConcreteStrategyB implements Strategy
ConcreteStrategyC implements Strategy

Context
- strategy: Strategy
+ setStrategy(s: Strategy): void
+ run(data): Result   // delegates to strategy.execute(data)
```

The Context owns the strategy reference. Strategies are stateless where possible — they receive all needed data via `execute()` parameters.

## Code Example — TypeScript Payment Processor

```typescript
// Strategy interface
interface PaymentStrategy {
  pay(amount: number, currency: string): Promise<PaymentResult>;
  validate(details: PaymentDetails): boolean;
}

interface PaymentDetails {
  [key: string]: string;
}

interface PaymentResult {
  success: boolean;
  transactionId: string;
  fee: number;
}

// Concrete strategies
class CreditCardStrategy implements PaymentStrategy {
  constructor(private cardNumber: string, private cvv: string) {}

  validate(details: PaymentDetails): boolean {
    return details.cardNumber?.length === 16 && details.cvv?.length === 3;
  }

  async pay(amount: number, currency: string): Promise<PaymentResult> {
    console.log(`Charging $${amount} ${currency} to card ending ${this.cardNumber.slice(-4)}`);
    // Call Stripe/Braintree API here
    return { success: true, transactionId: `CC-${Date.now()}`, fee: amount * 0.029 };
  }
}

class PayPalStrategy implements PaymentStrategy {
  constructor(private email: string) {}

  validate(details: PaymentDetails): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email ?? "");
  }

  async pay(amount: number, currency: string): Promise<PaymentResult> {
    console.log(`Sending $${amount} ${currency} via PayPal to ${this.email}`);
    return { success: true, transactionId: `PP-${Date.now()}`, fee: amount * 0.034 };
  }
}

class CryptoStrategy implements PaymentStrategy {
  constructor(private walletAddress: string, private coin: "BTC" | "ETH") {}

  validate(details: PaymentDetails): boolean {
    return details.walletAddress?.startsWith("0x") || details.walletAddress?.length === 34;
  }

  async pay(amount: number, currency: string): Promise<PaymentResult> {
    console.log(`Broadcasting ${amount} ${currency} → ${this.coin} to ${this.walletAddress}`);
    return { success: true, transactionId: `CRYPTO-${Date.now()}`, fee: 0.001 };
  }
}

// Context
class Checkout {
  private strategy: PaymentStrategy;

  constructor(strategy: PaymentStrategy) {
    this.strategy = strategy;
  }

  setStrategy(strategy: PaymentStrategy): void {
    this.strategy = strategy;
  }

  async processPayment(amount: number, currency = "USD"): Promise<PaymentResult> {
    return this.strategy.pay(amount, currency);
  }
}

// Usage
const checkout = new Checkout(new CreditCardStrategy("4111111111111111", "123"));
await checkout.processPayment(99.99);

checkout.setStrategy(new PayPalStrategy("user@example.com"));
await checkout.processPayment(49.50);
```

## Other Common Uses

**Sorting strategies** — `Array.prototype.sort` accepts a comparator function; that comparator is the strategy.

```typescript
const byPrice = (a: Item, b: Item) => a.price - b.price;
const byName  = (a: Item, b: Item) => a.name.localeCompare(b.name);
items.sort(byPrice); // swap strategy without touching sort logic
```

**Compression** — `zlib` exposes `deflate`, `gzip`, and `brotli` behind the same stream interface.

```python
import zlib, brotli

def compress(data: bytes, strategy: str) -> bytes:
    if strategy == "gzip":
        return zlib.compress(data, level=6)
    elif strategy == "brotli":
        return brotli.compress(data, quality=4)
    elif strategy == "none":
        return data
    raise ValueError(f"Unknown strategy: {strategy}")
```

## Trade-offs and Pitfalls

| Pro | Con |
|-----|-----|
| Eliminates conditionals in the context | Increases class count — one class per strategy |
| Strategies are individually testable | Client must know which strategies exist to pick one |
| Open/Closed: add strategies without touching context | Overhead for simple cases — a plain function is enough |
| Strategies can be swapped at runtime | Strategies often share no state, so data must be passed explicitly |

**Pitfall — Over-engineering**: If you only have two variants and they'll never grow, an if/else is clearer. Reserve Strategy for 3+ variants or when new ones will be added frequently.

**Pitfall — Leaky context**: If strategies need to reach back into the context to read state, you have a design smell. Pass all needed data as parameters to `execute()`.

## Real-World Examples

| System | Strategy Use |
|--------|-------------|
| Java `Collections.sort` / `Comparator` | Pluggable comparison logic |
| Passport.js (Node.js) | Authentication strategies (Local, OAuth, JWT) |
| Webpack | Loader and plugin pipeline — each loader is a strategy |
| AWS SDK retry policies | `ExponentialBackoff`, `FixedDelay`, `NoRetry` |
| Scikit-learn estimators | All classifiers share `.fit()` / `.predict()` interface |
| V8 JavaScript engine | Inline cache strategies (`Monomorphic`, `Polymorphic`, `Megamorphic`) |
