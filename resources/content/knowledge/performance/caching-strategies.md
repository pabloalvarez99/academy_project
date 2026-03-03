# Caching Strategies

Caching is the highest-leverage performance optimization in distributed systems. A well-designed cache layer can reduce database load by 90%+ and cut API latency from hundreds of milliseconds to single-digit milliseconds. Getting the strategy wrong causes cache stampedes, stale data, and bugs that are hard to reproduce.

## Core Cache Patterns

### Cache-Aside (Lazy Loading)

The application manages the cache explicitly. Most common pattern — cache is only populated on demand.

```
Read:  Check cache → HIT: return cached value
                  → MISS: fetch from DB, write to cache, return
Write: Write to DB → invalidate or update cache entry
```

```typescript
async function getUser(userId: string): Promise<User> {
  const cacheKey = `user:${userId}`;

  // 1. Check cache
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // 2. Cache miss — fetch from DB
  const user = await db.users.findById(userId);
  if (!user) throw new NotFoundError(userId);

  // 3. Populate cache with TTL
  await redis.setex(cacheKey, 300, JSON.stringify(user));  // 5 min TTL

  return user;
}

async function updateUser(userId: string, data: Partial<User>): Promise<User> {
  const user = await db.users.update(userId, data);

  // Invalidate stale cache entry
  await redis.del(`user:${userId}`);

  return user;
}
```

**Pros**: Only caches what's actually requested. Cache failure degrades gracefully (app still works, just slower).
**Cons**: First request always misses (cold start). Stale data window between write and invalidation.

### Read-Through

The cache sits in front of the data source. On a miss, the cache itself fetches from the DB and populates itself. Application always talks to the cache.

```
App → Cache → (on miss) → DB
App ←────────────────────────
```

Used by: AWS ElastiCache with DAX (DynamoDB Accelerator), read-through capable Redis clients. Useful when you want cache logic centralized rather than scattered across application code.

### Write-Through

On every write, the application writes to both the cache and the DB in the same operation:

```
Write: App → Cache → DB (synchronous, same operation)
Read:  App → Cache (always fresh)
```

**Pros**: Cache is always consistent with the DB. No stale reads.
**Cons**: Every write pays double latency. Cache fills with data that may never be read ("write amplification").
**Use when**: Read-heavy workloads where consistency is critical and write latency is acceptable (user profiles, configuration data).

### Write-Back (Write-Behind)

Application writes only to cache. Cache asynchronously flushes to DB in the background:

```
Write: App → Cache (fast, immediate return)
             Cache ──[async]──→ DB (batched, delayed)
Read:  App → Cache
```

**Pros**: Lowest write latency. Batching reduces DB write pressure.
**Cons**: Data loss risk if cache fails before flush. Complex failure recovery. Harder to implement correctly.
**Use when**: High-frequency writes where eventual DB consistency is acceptable (analytics counters, activity feeds, gaming leaderboards).

## Cache Stampede / Thundering Herd

When a popular cache key expires, hundreds of simultaneous requests all get a cache miss and concurrently query the DB:

```
00:00.000 - cache key "trending_products" expires
00:00.001 - 500 concurrent requests all get MISS
00:00.001 - all 500 fire DB queries simultaneously
00:00.002 - DB falls over under load
```

### Fix 1 — Mutex / Cache Lock

```typescript
async function getWithLock(key: string, fetchFn: () => Promise<any>): Promise<any> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const lockKey = `lock:${key}`;
  const lockAcquired = await redis.set(lockKey, "1", "NX", "EX", 10);  // 10s lock

  if (lockAcquired) {
    // This request fetches and populates
    const value = await fetchFn();
    await redis.setex(key, 300, JSON.stringify(value));
    await redis.del(lockKey);
    return value;
  } else {
    // Others wait briefly and retry
    await sleep(50);
    return getWithLock(key, fetchFn);  // retry — value likely cached now
  }
}
```

### Fix 2 — Probabilistic Early Expiration (XFetch Algorithm)

Stochastically refresh before actual expiry based on recomputation cost:

```typescript
function shouldEarlyRefresh(ttl: number, delta: number, beta = 1.0): boolean {
  // delta = time to recompute the value (in seconds)
  // As expiry approaches, probability of early refresh increases
  return Date.now() / 1000 - delta * beta * Math.log(Math.random()) > ttl;
}
```

### Fix 3 — Jittered TTL

Prevent mass expiry of related keys at the same time:

```typescript
const BASE_TTL = 300;
const jitter = Math.floor(Math.random() * 60);  // 0-60 seconds
await redis.setex(key, BASE_TTL + jitter, value);
```

## TTL Strategies

| Data Type | Recommended TTL | Reasoning |
|---|---|---|
| User session | 15–30 min (rolling) | Security — short enough to limit breach window |
| User profile | 5–15 min | Changes infrequently, tolerate slight staleness |
| Product catalog | 1–5 min | Updated by ops team, near-real-time needed |
| Trending/aggregated data | 1–10 min | Expensive to compute, slight staleness OK |
| Configuration / feature flags | 30–60 sec | Need fast rollout of changes |
| Auth tokens / rate limit counters | Exact expiry | Correctness critical — use exact value |
| Static assets (CDN) | 1 year + fingerprint | Content-addressed — change URL to bust cache |

## Multi-Layer Caching (L1 / L2 / CDN)

```
Request
   ↓
[L1: In-process memory cache]     ← microseconds, limited size (100–1000 items)
   ↓ miss
[L2: Redis / Memcached]           ← sub-millisecond, shared across instances
   ↓ miss
[L3: CDN edge cache]              ← 10–50ms, global distribution
   ↓ miss
[Origin: Application + DB]        ← 50–500ms baseline
```

```typescript
class TieredCache {
  private l1 = new LRUCache<string, any>({ max: 500, ttl: 60_000 });  // 60s in-proc

  async get(key: string): Promise<any> {
    // L1 check (synchronous, zero network)
    if (this.l1.has(key)) return this.l1.get(key);

    // L2 check (Redis)
    const l2Value = await redis.get(key);
    if (l2Value) {
      const parsed = JSON.parse(l2Value);
      this.l1.set(key, parsed);  // backfill L1
      return parsed;
    }

    return null;
  }

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    this.l1.set(key, value);
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  }

  async invalidate(key: string): Promise<void> {
    this.l1.delete(key);
    await redis.del(key);
  }
}
```

## Redis Data Structures for Caching

| Use Case | Redis Structure | Example |
|---|---|---|
| Simple key-value | String | `SET user:123 <json>` |
| Partial field updates | Hash | `HSET user:123 name "Alice" email "a@b.com"` |
| Sorted rankings | Sorted Set | `ZADD leaderboard 4200 "user:456"` |
| Unique visitor count | HyperLogLog | `PFADD visitors:2024-03-01 "user:789"` |
| Feed / recent items | List | `LPUSH feed:user123 <item>` + `LTRIM` |
| Tag/permission sets | Set | `SADD user:123:roles "admin" "editor"` |
| Rate limiting | String + INCR | `INCR ratelimit:ip:1.2.3.4` + `EXPIRE` |
| Pub/sub events | Pub/Sub | `PUBLISH channel message` |

## Cache Warming

Cold cache after a deployment can cause a latency spike or DB overload:

```typescript
// Warm cache at startup before accepting traffic
async function warmCache(): Promise<void> {
  console.log("Warming cache...");

  // Pre-load popular items
  const popularProductIds = await db.products.findPopular({ limit: 500 });
  await Promise.all(
    popularProductIds.map(id => getProduct(id))  // triggers cache-aside population
  );

  // Pre-compute expensive aggregations
  await refreshTrendingProducts();
  await refreshGlobalStats();

  console.log("Cache warm — ready to serve traffic");
}
```

## Partial Cache Invalidation

Avoid full cache flushes. Use structured key naming to enable targeted invalidation:

```
user:{id}              → single user
user:{id}:posts        → user's posts
posts:list:{page}      → paginated post list
posts:tags:{tag}       → posts by tag

// When user updates profile:
await redis.del(`user:${userId}`);

// When new post is created:
await redis.del(`user:${userId}:posts`);
await redis.del(`posts:list:*`);       // use SCAN + DEL for pattern matching
```

## Interview Questions

**Q: When should you NOT cache?**
A: When data must be perfectly consistent (financial balances, inventory counts during checkout), when data changes on every read (nonces, OTP codes), when the dataset is small enough that the DB query is already fast, or when cache invalidation logic would be more complex than the performance gain justifies.

**Q: What's the difference between cache eviction and cache invalidation?**
A: Eviction is passive — the cache removes entries when space is needed (LRU, LFU policies). Invalidation is explicit — the application removes or updates entries when underlying data changes. Both prevent stale data but serve different purposes.
