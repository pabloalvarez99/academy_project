# Database Transactions and ACID

A **transaction** is a unit of work that is either fully completed or fully rolled back — there's no partial success.

## ACID Properties

### Atomicity
All operations in a transaction succeed, or none do.

```sql
BEGIN;
  UPDATE accounts SET balance = balance - 100 WHERE id = 1;
  UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;  -- both updates apply, or neither
```

If the second UPDATE fails, the first is rolled back. The money doesn't vanish.

### Consistency
A transaction brings the database from one valid state to another. All constraints, triggers, and cascades are enforced.

```sql
-- Constraint: balance >= 0
UPDATE accounts SET balance = balance - 999999 WHERE id = 1;
-- Fails if balance would go negative → consistency maintained
```

### Isolation
Concurrent transactions don't see each other's intermediate states.

#### Isolation Levels (weakest → strongest)

| Level | Dirty Read | Non-Repeatable Read | Phantom Read |
|-------|-----------|---------------------|--------------|
| READ UNCOMMITTED | ✓ possible | ✓ possible | ✓ possible |
| READ COMMITTED | ✗ prevented | ✓ possible | ✓ possible |
| REPEATABLE READ | ✗ prevented | ✗ prevented | ✓ possible |
| SERIALIZABLE | ✗ prevented | ✗ prevented | ✗ prevented |

**Dirty Read**: Reading uncommitted data from another transaction.
**Non-Repeatable Read**: Reading the same row twice gives different results.
**Phantom Read**: A query returns different sets of rows on repeated execution.

Most databases default to READ COMMITTED. PostgreSQL defaults to READ COMMITTED, MySQL InnoDB to REPEATABLE READ.

### Durability
Once committed, changes survive crashes. Achieved through:
- Write-ahead logging (WAL)
- Fsync to disk before acknowledging commit
- Replication for additional durability

## Transaction Control

```sql
BEGIN;                    -- start transaction
SAVEPOINT sp1;            -- create savepoint
UPDATE ...;
ROLLBACK TO sp1;          -- undo since savepoint
RELEASE SAVEPOINT sp1;    -- remove savepoint
COMMIT;                   -- persist all changes

-- Or abort everything:
ROLLBACK;
```

## Common Concurrency Problems

### Lost Update
Two transactions read the same value, both modify it, second write overwrites first:
```
T1: read balance=100, T2: read balance=100
T1: write balance=150, T2: write balance=80  ← T1's update lost!
```
**Fix**: SELECT ... FOR UPDATE (pessimistic locking) or optimistic locking with version column.

### Deadlock
T1 holds lock on A waiting for B. T2 holds lock on B waiting for A.
Databases detect and kill one transaction.
**Prevention**: Always acquire locks in the same order.

## Optimistic vs Pessimistic Locking

### Pessimistic
Lock the row when you read it. Other readers block until you commit.
```sql
SELECT * FROM inventory WHERE id = 1 FOR UPDATE;
```

### Optimistic
No locking. Add a `version` column. On update, check version hasn't changed:
```sql
UPDATE products
SET stock = stock - 1, version = version + 1
WHERE id = 1 AND version = 5;
-- Fails silently if version changed (another transaction got there first)
```
Better for high-read, low-write scenarios. Retry on conflict.

## SQLite WAL Mode

SQLite in WAL (Write-Ahead Logging) mode allows concurrent readers while a write transaction is in progress:

```sql
PRAGMA journal_mode=WAL;
-- Readers don't block writers
-- Writers don't block readers
-- Only one writer at a time
```

EKS uses WAL mode for all SQLite databases.

## Interview Questions

**Q: What's the difference between ROLLBACK and ROLLBACK TO SAVEPOINT?**
A: ROLLBACK undoes the entire transaction. ROLLBACK TO SAVEPOINT undoes only work after the savepoint, keeping the transaction open.

**Q: Does READ COMMITTED prevent dirty reads?**
A: Yes. READ COMMITTED ensures you only see data from committed transactions. Higher isolation levels also prevent this.

**Q: What is a phantom read?**
A: When a transaction re-executes a query and gets different rows because another committed transaction inserted/deleted rows matching the query predicate.
