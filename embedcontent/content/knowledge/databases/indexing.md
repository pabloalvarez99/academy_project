# Database Indexing

Indexes are the most impactful tool for query performance. Understanding them is essential for any engineer working with databases.

## What is an Index?

An index is a separate data structure that maps column values to row locations, allowing the database to find rows without scanning the entire table.

```
Without index (full table scan):
  SELECT * FROM orders WHERE customer_id = 42;
  → Read every row: O(n)

With index on customer_id:
  → B-tree lookup: O(log n)
  → For 1M rows: ~20 comparisons vs 1M reads
```

## B-Tree Index (Default)

Most databases use B-trees (actually B+ trees) for indexes.

```
          [30 | 70]
         /    |    \
      [10,20] [40,50,60] [80,90]
      /  |  \  ...
leaf pages contain actual data pointers
```

**Properties**:
- Sorted — supports range queries (`BETWEEN`, `>`, `<`, `ORDER BY`)
- O(log n) search, insert, delete
- All leaf nodes at same depth (balanced)
- Leaf nodes linked — efficient range scans

## Hash Index

Maps column value → row via a hash function. Used in PostgreSQL hash indexes, MySQL MEMORY tables.

- O(1) exact lookups — faster than B-tree for equality
- **No range queries** — hash destroys ordering
- **No ORDER BY** benefit
- Less common than B-tree

## Index Types by Use Case

### Single-Column Index
```sql
CREATE INDEX idx_email ON users(email);
-- Speeds up: WHERE email = 'x@y.com'
```

### Composite (Multi-Column) Index
```sql
CREATE INDEX idx_city_country ON customers(city, country);
-- Speeds up: WHERE city = 'Berlin' AND country = 'Germany'
-- Also speeds: WHERE city = 'Berlin'  (leftmost prefix rule)
-- Does NOT help: WHERE country = 'Germany' alone
```

**Leftmost prefix rule**: A composite index on (A, B, C) can be used for queries on:
- A alone
- A and B
- A, B, and C
But NOT B alone or C alone.

### Covering Index
An index that contains all columns needed by the query — no table lookup required.

```sql
-- Query: SELECT product_name, unit_price FROM products WHERE category_id = 3
CREATE INDEX idx_cat_name_price ON products(category_id, product_name, unit_price);
-- All needed columns are in the index — "index-only scan"
```

### Partial Index
Index only a subset of rows matching a condition.

```sql
-- Only index active users
CREATE INDEX idx_active_users ON users(email) WHERE active = true;
-- Much smaller index, faster for queries that always filter active=true
```

### Unique Index
Enforces uniqueness AND provides fast lookup.
```sql
CREATE UNIQUE INDEX idx_username ON users(username);
-- PRIMARY KEY automatically creates a unique index
```

## How the Query Planner Uses Indexes

The database query planner (optimizer) decides whether to use an index based on:
- **Selectivity**: How many rows does the condition match? High selectivity (few matches) → index wins. Low selectivity (>20-30% of table) → full scan may be faster.
- **Table statistics**: The planner uses column statistics to estimate row counts.
- **Index size vs table size**: For tiny tables, a full scan beats index overhead.

```sql
-- Force PostgreSQL to show the plan:
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 42;

-- Look for: "Index Scan" (good) vs "Seq Scan" (full scan)
-- Also look for: actual rows, cost estimates
```

## Covering Index and Index-Only Scans

```
Normal index lookup:
  Index → row IDs → heap fetch (random I/O for each row)

Index-only scan (covering index):
  Index → done (no heap fetch)
```

For read-heavy workloads, covering indexes can dramatically reduce I/O.

## When Indexes Hurt Performance

1. **Write overhead**: Every INSERT/UPDATE/DELETE must update all indexes on the table.
2. **Too many indexes**: Each index is maintained separately. 10 indexes on one table = 10x write overhead.
3. **Low-cardinality columns**: Indexing a boolean column (only 2 values) rarely helps — the planner will prefer a full scan.
4. **Unused indexes**: Wasted disk space and write overhead.

## Index Strategies

### Find missing indexes
```sql
-- PostgreSQL: queries with sequential scans on large tables
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename = 'orders';

-- MySQL: show index usage
SHOW INDEX FROM orders;
```

### Find unused indexes (PostgreSQL)
```sql
SELECT indexrelname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0;
```

### EXPLAIN in practice
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT o.id, c.company_name
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.order_date > '2024-01-01';
```

Output tells you:
- Which indexes were used
- Actual vs estimated row counts
- Time spent in each node
- Buffer hits vs disk reads

## Go + SQL Indexing Example

```go
// Ensure indexes exist at startup
_, err = db.Exec(`
    CREATE INDEX IF NOT EXISTS idx_orders_customer
    ON orders(customer_id);

    CREATE INDEX IF NOT EXISTS idx_orders_date
    ON orders(order_date DESC);
`)

// Prepared statement benefits from index
stmt, _ := db.Prepare(`
    SELECT id, total FROM orders
    WHERE customer_id = ? AND order_date > ?
    ORDER BY order_date DESC LIMIT 20
`)
```

## Interview Questions

**Q: When would you NOT use an index?**
A: Low-cardinality columns (booleans, small enums), small tables where full scans are fast, columns that are never used in WHERE/JOIN/ORDER BY, and when writes are far more frequent than reads.

**Q: What is the leftmost prefix rule?**
A: A composite index on (A, B, C) can only be used from left to right. Queries on (A), (A,B), or (A,B,C) use the index. Queries on (B), (C), or (B,C) alone cannot use it.

**Q: What's the difference between a clustered and non-clustered index?**
A: A clustered index determines the physical storage order of the table rows (only one per table, typically the primary key). Non-clustered indexes are separate structures with pointers to the actual rows. In InnoDB, the primary key is always clustered.
