# Singleton Pattern

The Singleton pattern ensures a class has **only one instance** and provides a global access point to it. The class itself is responsible for keeping track of that sole instance.

## What It Is

A creational pattern that restricts instantiation to one object. All callers share the same instance — no matter how many times they request it.

> Use sparingly. Singleton is the most controversial GoF pattern because it introduces hidden global state, makes testing hard, and couples modules. Know the alternatives before reaching for it.

## When to Use It

| Legitimate Signal | Why Singleton Fits |
|------------------|--------------------|
| Shared connection pool (DB, Redis) | Opening N connections is expensive; all code shares one pool |
| Application-wide configuration | Config loaded once from env/disk, read everywhere |
| Logger | Single output stream; multiple instances would interleave writes |
| Hardware device driver | One printer, one GPU — only one logical controller makes sense |
| In-process cache | Single source of truth prevents cache incoherence |

**Red flags** — if you need singleton because "it's convenient to access from anywhere," you probably want dependency injection instead.

## Naive Implementation and Why It Fails

```typescript
// WRONG in multi-threaded environments (e.g., Node.js worker threads, Java)
class Database {
  private static instance: Database;

  private constructor(private url: string) {}

  static getInstance(): Database {
    if (!Database.instance) {          // ← race condition in multi-thread
      Database.instance = new Database(process.env.DB_URL!);
    }
    return Database.instance;
  }
}
```

Two threads can both pass the `if` check before either creates the instance, resulting in two instances.

## Code Example — TypeScript Connection Pool (Thread-Safe Double-Check)

```typescript
import { Pool } from "pg"; // PostgreSQL connection pool

class DatabasePool {
  private static instance: DatabasePool | null = null;
  private static initLock = false; // simple mutex flag for async init

  private pool: Pool;
  private queryCount = 0;

  private constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max:             20,   // max connections in pool
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 2_000,
    });

    this.pool.on("error", (err) => {
      console.error("[DB] Unexpected pool error:", err);
    });
  }

  // Double-checked locking pattern adapted for single-threaded JS
  static getInstance(): DatabasePool {
    if (!DatabasePool.instance) {
      if (DatabasePool.initLock) {
        throw new Error("Singleton initialization loop detected");
      }
      DatabasePool.initLock = true;
      DatabasePool.instance = new DatabasePool();
      DatabasePool.initLock = false;
    }
    return DatabasePool.instance;
  }

  async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    this.queryCount++;
    const client = await this.pool.connect();
    try {
      const result = await client.query<T>(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  stats() {
    return {
      totalCount:   this.pool.totalCount,
      idleCount:    this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      queryCount:   this.queryCount,
    };
  }

  async shutdown(): Promise<void> {
    await this.pool.end();
    DatabasePool.instance = null; // allow re-init (useful in tests)
  }
}

// Usage across the entire application — same instance every time
const db = DatabasePool.getInstance();
const users = await db.query<{ id: string; name: string }>(
  "SELECT id, name FROM users WHERE active = $1",
  [true]
);
```

## Module-Level Singleton in JavaScript / TypeScript

Node.js modules are cached after the first `require`/`import`. The simplest, most idiomatic singleton in JS is just a module export:

```typescript
// db.ts — module cache makes this a singleton automatically
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default pool;

// Anywhere in the app:
import pool from "./db";
await pool.query("SELECT 1");
// Always the same Pool instance — no getInstance() needed
```

This pattern is preferred in Node.js over the class-based version.

## Thread Safety in Other Languages

```java
// Java — double-checked locking with volatile
public class DatabasePool {
    private static volatile DatabasePool instance;

    private DatabasePool() { /* init pool */ }

    public static DatabasePool getInstance() {
        if (instance == null) {                    // first check (no lock)
            synchronized (DatabasePool.class) {
                if (instance == null) {            // second check (with lock)
                    instance = new DatabasePool();
                }
            }
        }
        return instance;
    }
}

// Java — Initialization-on-demand holder (cleaner, lazy, thread-safe)
public class DatabasePool {
    private DatabasePool() {}

    private static class Holder {
        static final DatabasePool INSTANCE = new DatabasePool();
    }

    public static DatabasePool getInstance() {
        return Holder.INSTANCE;
    }
}
```

```python
# Python — module-level (preferred, thread-safe by GIL)
# db.py
import psycopg2.pool
_pool = psycopg2.pool.ThreadedConnectionPool(1, 20, dsn=os.environ["DATABASE_URL"])

def get_pool():
    return _pool
```

## Dependency Injection as the Better Alternative

Singleton creates hidden coupling. DI makes the dependency explicit and testable:

```typescript
// Instead of:
class UserService {
  async find(id: string) {
    return DatabasePool.getInstance().query(/* ... */); // hidden dep
  }
}

// Prefer:
class UserService {
  constructor(private db: DatabasePool) {}  // explicit dep, easy to mock

  async find(id: string) {
    return this.db.query(/* ... */);
  }
}

// In tests:
const mockDb = { query: jest.fn().mockResolvedValue([{ id: "1" }]) };
const svc = new UserService(mockDb as unknown as DatabasePool);
```

Register the singleton in your DI container once; inject it everywhere.

## Trade-offs and Pitfalls

| Pro | Con |
|-----|-----|
| Guarantees one shared resource | Global state — mutations affect all callers |
| Lazy initialization possible | Hard to unit test without resetting static state |
| Simple API — just call `getInstance()` | Violates Single Responsibility (manages own lifecycle) |
| Works well for stateless shared objects | Hides dependencies — impossible to see from function signatures |

**Pitfall — Test pollution**: A singleton carrying state between tests will cause order-dependent failures. Always expose a `reset()` or `shutdown()` method for test teardown.

**Pitfall — Singleton in serverless**: AWS Lambda / Vercel Functions may run many isolated instances — your "singleton" is per-instance, not per-application. Connection pools must be sized accordingly.

## Real-World Examples

| System | Singleton Use |
|--------|--------------|
| Node.js module cache | Every `import` of the same module returns cached singleton |
| Java `Runtime.getRuntime()` | One JVM runtime per process |
| Python `logging.getLogger("root")` | Root logger is a singleton |
| Angular services (root scope) | `providedIn: 'root'` creates an app-wide singleton |
| Redux / Zustand store | Single store instance shared by entire React tree |
| `window` object in browsers | One global environment per tab |
