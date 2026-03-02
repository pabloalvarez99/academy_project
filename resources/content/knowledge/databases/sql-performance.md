# SQL Query Performance

Writing correct SQL is easy. Writing *fast* SQL requires understanding how the query engine processes your queries.

## How a Query Executes

```
SQL text
  ↓ Parser          → parse tree
  ↓ Analyzer        → annotated tree (name resolution, type checks)
  ↓ Query Planner   → logical plan → physical plan (uses statistics + indexes)
  ↓ Executor        → iterates rows, returns results
```

The **query planner** is the key — it decides HOW to execute your query and can make huge performance differences.

## EXPLAIN and EXPLAIN ANALYZE

Always start performance investigation with EXPLAIN:

```sql
-- PostgreSQL: show estimated plan
EXPLAIN SELECT * FROM orders WHERE customer_id = 'ALFKI';

-- PostgreSQL: execute and show actual stats
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT o.id, c.company_name
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.order_date > '2024-01-01';
```

**Key things to look for**:
- `Seq Scan` (sequential scan) on large tables → missing index
- `Index Scan` → good, uses index
- `Index Only Scan` → best, all data from index (covering index)
- `Hash Join` vs `Nested Loop` vs `Merge Join` → depends on table size
- `rows=X` estimates far off from `actual rows=Y` → stale statistics

```sql
-- Update statistics (PostgreSQL)
ANALYZE orders;

-- MySQL equivalent
ANALYZE TABLE orders;
```

## The N+1 Query Problem

The most common ORM-caused performance disaster.

```go
// BAD: N+1 queries
customers, _ := db.Query("SELECT id, name FROM customers LIMIT 100")
for _, c := range customers {
    // This executes 100 additional queries!
    orders, _ := db.Query("SELECT * FROM orders WHERE customer_id = ?", c.ID)
}
// Total: 101 queries

// GOOD: 1 query with JOIN
rows, _ := db.Query(`
    SELECT c.id, c.name, o.id as order_id, o.total
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.id
    LIMIT 100
`)
// Total: 1 query
```

**Detection**: Enable query logging, look for repetitive queries that differ only in a parameter value.

## Common Performance Anti-Patterns

### 1. SELECT *
```sql
-- BAD: fetches all columns, prevents covering index
SELECT * FROM products WHERE category_id = 5;

-- GOOD: fetch only what you need
SELECT id, product_name, unit_price FROM products WHERE category_id = 5;
```

### 2. Functions on Indexed Columns
```sql
-- BAD: index on order_date not used (function wraps the column)
SELECT * FROM orders WHERE YEAR(order_date) = 2024;

-- GOOD: range scan uses index
SELECT * FROM orders WHERE order_date BETWEEN '2024-01-01' AND '2024-12-31';
```

### 3. Leading Wildcard
```sql
-- BAD: full table scan (can't use index with leading %)
SELECT * FROM products WHERE product_name LIKE '%coffee%';

-- GOOD: index can be used (trailing wildcard only)
SELECT * FROM products WHERE product_name LIKE 'coffee%';

-- BEST for full-text: use FTS index
SELECT * FROM products WHERE to_tsvector(product_name) @@ 'coffee';
```

### 4. OR with Different Indexed Columns
```sql
-- BAD: can't use a single index efficiently
SELECT * FROM users WHERE email = 'x@y.com' OR phone = '123-456';

-- GOOD: UNION ALL (each branch uses its own index)
SELECT * FROM users WHERE email = 'x@y.com'
UNION ALL
SELECT * FROM users WHERE phone = '123-456';
```

### 5. Implicit Type Conversion
```sql
-- BAD: customer_id is VARCHAR but we pass INT → index not used
SELECT * FROM customers WHERE customer_id = 123;

-- GOOD: match types
SELECT * FROM customers WHERE customer_id = '123';
```

## JOIN Performance

```sql
-- Join order matters less (query planner reorders)
-- But index on join columns is critical

-- Ensure indexes exist on both sides of every JOIN
CREATE INDEX idx_orders_customer ON orders(customer_id);
-- customers.id is typically the primary key (already indexed)
```

**Join algorithms**:
- **Nested Loop**: For small inner table or when inner has index. O(n × m) worst case.
- **Hash Join**: Build hash table of smaller table, probe with larger. Good for large tables without index.
- **Merge Join**: Both tables must be sorted on join key. Efficient for large sorted datasets.

## Pagination

```sql
-- BAD: OFFSET becomes slower as offset grows (scans and discards rows)
SELECT * FROM orders ORDER BY id LIMIT 20 OFFSET 10000;
-- For offset 10000: reads 10020 rows, discards first 10000

-- GOOD: Keyset pagination (cursor-based)
SELECT * FROM orders WHERE id > :last_seen_id ORDER BY id LIMIT 20;
-- Always O(log n) — uses index directly
```

## Aggregate Query Optimization

```sql
-- Pre-aggregate with CTE to reduce rows before JOINing
WITH order_totals AS (
    SELECT customer_id, COUNT(*) AS order_count, SUM(total) AS revenue
    FROM orders
    GROUP BY customer_id
)
SELECT c.company_name, ot.order_count, ot.revenue
FROM customers c
JOIN order_totals ot ON c.id = ot.customer_id
WHERE ot.revenue > 1000;

-- Index to support GROUP BY
CREATE INDEX idx_orders_customer_date ON orders(customer_id, order_date);
```

## Connection Pooling

Database connections are expensive (~10ms to establish). Always use a pool:

```go
db, _ := sql.Open("postgres", dsn)
db.SetMaxOpenConns(25)          // max concurrent connections
db.SetMaxIdleConns(10)          // keep idle connections warm
db.SetConnMaxLifetime(5 * time.Minute)  // recycle to avoid stale connections
```

## Read Replicas

Offload read queries to replicas:
```go
type DB struct {
    primary  *sql.DB  // writes + critical reads
    replica  *sql.DB  // analytics, reporting, background reads
}

func (d *DB) GetDashboardStats() (*Stats, error) {
    return queryStats(d.replica)  // stale reads OK for analytics
}

func (d *DB) PlaceOrder(order *Order) error {
    return insertOrder(d.primary)  // must be consistent
}
```

## Interview Questions

**Q: What is the N+1 query problem?**
A: When you fetch a list of N items, then for each item execute one more query — resulting in N+1 total queries. Fix with JOINs or batch loading (IN clause). Common in ORMs with lazy loading.

**Q: Why is OFFSET pagination slow at scale?**
A: OFFSET requires the DB to scan and discard rows 1..offset before returning your page. At OFFSET 100000 the DB reads 100020 rows just to give you 20. Keyset/cursor pagination uses an index to jump directly to the right position.

**Q: When does a query NOT use an index?**
A: When the query planner estimates a full scan is cheaper (low selectivity, very small table), when the indexed column is wrapped in a function, when there's a leading wildcard in LIKE, or when types don't match causing implicit conversion.
