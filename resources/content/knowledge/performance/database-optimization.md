# Database Query Optimization

Slow queries are the most common cause of production performance incidents. This article covers the tools and techniques to find, diagnose, and fix them — with particular focus on indexing strategy and query plan analysis.

## Index Types

### B-Tree (Default)

The default index type in PostgreSQL, MySQL, and most relational DBs. A balanced tree structure where each node contains key ranges, enabling O(log n) lookups.

```sql
CREATE INDEX idx_users_email ON users(email);
-- Supports: =, <, >, BETWEEN, LIKE 'prefix%'
-- Does NOT support: LIKE '%suffix', full-text search, geometric queries
```

### Hash Index

O(1) exact lookups only. Smaller than B-tree for equality queries but useless for range queries:

```sql
CREATE INDEX idx_sessions_token ON sessions USING HASH (token);
-- Good for: exact match on high-cardinality columns (UUIDs, tokens)
-- Useless for: ranges, ordering, LIKE
```

### GiST / GIN (PostgreSQL)

For complex data types:
```sql
-- GIN: full-text search, array containment, JSONB
CREATE INDEX idx_articles_fts ON articles USING GIN (to_tsvector('english', content));
CREATE INDEX idx_products_tags ON products USING GIN (tags);  -- array column

-- GiST: geometric types, nearest-neighbor, range types
CREATE INDEX idx_locations_coords ON locations USING GIST (coordinates);
```

### Partial Index

Index a subset of rows — smaller, faster for selective queries:

```sql
-- Only index unprocessed orders (small hot set vs full table)
CREATE INDEX idx_orders_pending ON orders(created_at) WHERE status = 'pending';

-- Only index non-deleted users
CREATE INDEX idx_users_active_email ON users(email) WHERE deleted_at IS NULL;
```

### Covering Index (Index-Only Scan)

Include all columns needed by a query in the index itself, so PostgreSQL never touches the heap:

```sql
-- Query: SELECT email, name FROM users WHERE department_id = 5
-- Without covering index: index scan on department_id + heap fetch for email, name

CREATE INDEX idx_users_dept_covering ON users(department_id) INCLUDE (email, name);
-- Now: index-only scan, no heap access at all
```

## EXPLAIN ANALYZE — Reading Query Plans

`EXPLAIN ANALYZE` executes the query and shows actual timings. The most important information:

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.created_at > '2024-01-01'
GROUP BY u.id;
```

Sample output:
```
HashAggregate  (cost=1842.50..1892.50 rows=5000 width=40)
               (actual time=45.123..46.891 rows=4832 loops=1)
  Buffers: shared hit=923 read=89    ← hit=cache, read=disk I/O
  ->  Hash Left Join  (cost=312.00..1767.50 rows=15000 width=32)
                      (actual time=8.234..38.456 rows=15000 loops=1)
        Hash Cond: (o.user_id = u.id)
        ->  Seq Scan on orders o     ← FULL TABLE SCAN — potential problem
              (cost=0.00..890.00 rows=50000 width=16)
              (actual time=0.012..12.345 rows=50000 loops=1)
        ->  Hash  (cost=247.00..247.00 rows=5200 width=24)
              ->  Index Scan using idx_users_created_at on users u
                    (actual time=0.034..3.210 rows=5000 loops=1)
                    Index Cond: (created_at > '2024-01-01')

Planning Time: 1.234 ms
Execution Time: 47.456 ms      ← total wall clock time
```

**Key things to look for**:

| Warning Sign | What It Means | Fix |
|---|---|---|
| `Seq Scan` on large table | No usable index | Add index on filter/join columns |
| `loops=N` where N is large | Nested loop with many iterations | Add index on inner table's join column |
| High `rows` estimate vs actual | Stale statistics | `ANALYZE table_name` |
| `shared read` high | Cold cache, many disk reads | `VACUUM ANALYZE`, check shared_buffers |
| `Hash` on very large table | Sort/hash spillover to disk | Increase `work_mem` for the session |

## Index Selectivity

An index is only useful if it's selective — it eliminates a large fraction of rows.

```sql
-- Check cardinality before creating an index
SELECT
  COUNT(DISTINCT status)     as unique_values,   -- likely 3-5 (low cardinality)
  COUNT(*)                   as total_rows,
  COUNT(DISTINCT status)::float / COUNT(*) as selectivity
FROM orders;

-- selectivity = 0.00003 → index on status alone is nearly useless
-- Postgres will do a seq scan if it returns >5-10% of rows

-- Better: composite index puts high-cardinality column first
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
-- Selective on user_id, then filters further by status
```

**Rule of thumb**: Columns used in WHERE clauses that filter to <10% of rows benefit from B-tree indexes. Columns with low cardinality (boolean, status enum) only help as the second column in a composite index.

## When NOT to Index

- **Small tables** (<1000 rows): sequential scan is often faster than index overhead
- **Columns updated very frequently**: write amplification — every UPDATE must maintain all indexes
- **Low-cardinality standalone columns**: `is_active`, `gender`, `country_code` — use partial or composite indexes instead
- **Columns in SELECT only, never in WHERE/JOIN/ORDER BY**: indexes only help filtering and joining

## N+1 Query Problem

The most common ORM-induced performance killer. Occurs when you fetch a list of N items, then issue one query per item for related data:

```typescript
// N+1: 1 query for users + 1 query per user for their orders
const users = await db.query("SELECT * FROM users LIMIT 100");  // 1 query
for (const user of users) {
  user.orders = await db.query(                                   // 100 queries!
    "SELECT * FROM orders WHERE user_id = $1", [user.id]
  );
}
// Total: 101 queries
```

```typescript
// Fix 1: JOIN in a single query
const rows = await db.query(`
  SELECT u.*, o.id as order_id, o.total, o.created_at as order_date
  FROM users u
  LEFT JOIN orders o ON o.user_id = u.id
  LIMIT 100
`);
const users = groupRowsByUser(rows);
// Total: 1 query

// Fix 2: Batch fetch and merge in application (eager loading)
const users = await db.query("SELECT * FROM users LIMIT 100");
const userIds = users.map(u => u.id);
const orders = await db.query(
  "SELECT * FROM orders WHERE user_id = ANY($1)", [userIds]
);  // 1 query with IN clause
const ordersByUser = groupBy(orders, "user_id");
users.forEach(u => u.orders = ordersByUser[u.id] ?? []);
// Total: 2 queries regardless of N
```

**ORM equivalents**:
```typescript
// TypeORM
const users = await userRepo.find({ relations: ["orders"] });  // JOIN

// Prisma
const users = await prisma.user.findMany({ include: { orders: true } });

// Sequelize
const users = await User.findAll({ include: [{ model: Order }] });
```

## Connection Pooling

Opening a new DB connection per request is expensive (TCP handshake + TLS + auth = 20–100ms). Connection pooling reuses connections:

```
Without pooling: each request opens/closes a connection (100ms overhead)
With pooling:    requests borrow from a pool (0-1ms overhead)
```

```typescript
// pg (node-postgres) pool configuration
import { Pool } from "pg";

const pool = new Pool({
  host:     process.env.DB_HOST,
  database: process.env.DB_NAME,
  max:      20,          // max connections in pool
  min:      5,           // keep 5 alive (warm connections)
  idleTimeoutMillis:  30_000,  // close idle after 30s
  connectionTimeoutMillis: 2_000,  // fail fast if pool exhausted
});

// Use PgBouncer as an external pool in transaction mode for very high concurrency
// PgBouncer in transaction mode: connection held only during transaction,
// allows 10x more app instances than DB max_connections
```

## Slow Query Log Analysis

```sql
-- PostgreSQL: enable in postgresql.conf
log_min_duration_statement = 1000  -- log queries taking >1s

-- Find worst offenders with pg_stat_statements extension
SELECT
  query,
  calls,
  total_exec_time / calls         AS avg_ms,
  total_exec_time,
  rows / calls                    AS avg_rows,
  stddev_exec_time                AS stddev_ms
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

```sql
-- Find missing indexes: tables doing many sequential scans
SELECT
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  n_live_tup
FROM pg_stat_user_tables
WHERE seq_scan > 1000
  AND n_live_tup > 10000
ORDER BY seq_tup_read DESC;
```

## Query Plan Caching

PostgreSQL caches query plans after the 5th execution. If the plan was compiled with unrepresentative parameters, it stays cached and performs poorly:

```sql
-- Force fresh plan for a specific query (dev only)
SET plan_cache_mode = force_custom_plan;

-- In production: ensure statistics are up to date
ANALYZE orders;  -- update statistics for the planner

-- autovacuum handles this automatically if tuned correctly:
autovacuum_analyze_scale_factor = 0.05  -- trigger after 5% of rows change
```

## Practical Checklist

```
Before every slow query investigation:
  □ Run EXPLAIN (ANALYZE, BUFFERS) — read actual vs estimated row counts
  □ Check pg_stat_statements for total_exec_time (may be fast per call but called 1M times)
  □ Verify ANALYZE has been run recently on affected tables

Index decisions:
  □ Does the column appear in WHERE, JOIN ON, or ORDER BY?
  □ Is selectivity >90% (filters to <10% of rows)?
  □ Is this column part of a composite index already?
  □ Will write amplification cost more than read gain?

N+1 audit:
  □ Log all queries in dev with their call counts
  □ Inspect ORM-generated SQL (enable query logging)
  □ Any queries inside loops → refactor to batch/JOIN
```

## Interview Questions

**Q: What's the difference between a clustered and non-clustered index?**
A: A clustered index determines the physical row order on disk — there can only be one per table (InnoDB PRIMARY KEY is always clustered). A non-clustered index is a separate structure with pointers back to heap rows. PostgreSQL has no clustered indexes by default; all are heap-stored with separate B-tree structures (`CLUSTER` command physically reorganizes once but doesn't maintain order).

**Q: Why might adding an index make a query slower?**
A: The planner might choose the index even when a sequential scan is cheaper — if the query returns a large percentage of rows, the random I/O of index lookups plus heap fetches is slower than a sequential scan. Fix with `SET enable_indexscan = off` to test, or improve statistics with ANALYZE. Also, indexes always slow down writes.
