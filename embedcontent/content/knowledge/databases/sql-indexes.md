# SQL Indexes

An index is a data structure that improves the speed of data retrieval at the cost of additional write overhead and storage.

## Why Indexes Matter

Without an index, a query like `SELECT * FROM users WHERE email = 'alice@example.com'` scans **every row** (full table scan — O(n)). With an index on `email`, it's a **B-tree lookup** (O(log n)).

## B-Tree Index (Default)

Most databases use B-tree (Balanced Tree) as the default index type.

```
         [M]
        /   \
     [D,H]  [Q,T]
    / | \   / | \
  [A-C][D-G][H-L]...
```

- Efficient for: equality (`=`), range (`>`, `<`, `BETWEEN`), `ORDER BY`
- Stored sorted → supports prefix searches
- Works for: PostgreSQL, MySQL, SQLite, SQL Server

## Creating Indexes

```sql
-- Single column index
CREATE INDEX idx_users_email ON users(email);

-- Composite index (column order matters!)
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);

-- Unique index (enforces constraint + performance)
CREATE UNIQUE INDEX idx_users_username ON users(username);

-- Partial index (only indexes matching rows)
CREATE INDEX idx_active_users ON users(email) WHERE active = true;
```

## Index Selection Rules

### When to create an index:
- Columns frequently used in `WHERE` clauses
- Foreign key columns (JOIN performance)
- Columns in `ORDER BY` or `GROUP BY`
- Columns with high cardinality (many unique values)

### When NOT to create an index:
- Small tables (full scan is faster)
- Columns with very low cardinality (e.g., boolean flags)
- Tables with very frequent INSERT/UPDATE/DELETE
- Columns rarely used in queries

## Composite Index Column Order

The **leftmost prefix rule**: a composite index `(a, b, c)` can be used for:
- Queries on `a`
- Queries on `a, b`
- Queries on `a, b, c`

But NOT for queries only on `b` or `c` alone.

```sql
-- This uses the index (idx on user_id, created_at)
SELECT * FROM orders WHERE user_id = 5 AND created_at > '2024-01-01';

-- This also uses the index (leftmost prefix)
SELECT * FROM orders WHERE user_id = 5;

-- This does NOT use the index efficiently
SELECT * FROM orders WHERE created_at > '2024-01-01';
```

## EXPLAIN QUERY PLAN

Use `EXPLAIN` to verify index usage:

```sql
EXPLAIN QUERY PLAN
SELECT * FROM users WHERE email = 'alice@example.com';
-- SEARCH users USING INDEX idx_users_email (email=?)
```

If you see `SCAN` instead of `SEARCH`, the index is not being used.

## Index Types Reference

| Type    | Best For                          | DB Support           |
|---------|-----------------------------------|----------------------|
| B-tree  | General purpose, ranges, sorts    | All major DBs        |
| Hash    | Equality only (`=`)               | PostgreSQL, MySQL    |
| GIN     | Full-text search, arrays          | PostgreSQL           |
| GiST    | Geometric data, full-text         | PostgreSQL           |
| Bitmap  | Low-cardinality columns           | PostgreSQL, Oracle   |

## Common Performance Mistakes

1. **Over-indexing** — Every index slows down writes (INSERT/UPDATE/DELETE must update all indexes)
2. **Wrong column order** in composite indexes
3. **Implicit type conversion** — `WHERE user_id = '5'` (string vs int) may skip the index
4. **Leading wildcard** — `WHERE name LIKE '%Smith'` cannot use a B-tree index
5. **Function on indexed column** — `WHERE YEAR(created_at) = 2024` prevents index use; use `created_at BETWEEN '2024-01-01' AND '2024-12-31'` instead
