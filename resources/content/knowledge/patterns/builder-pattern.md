# Builder Pattern

The Builder pattern constructs **complex objects step by step**, separating construction logic from the final representation. The same construction process can produce different representations.

## What It Is

A creational pattern that replaces a constructor with many parameters (telescoping constructor anti-pattern) with a fluent chain of named setter calls, culminating in a terminal `build()` call.

> Core idea: construction is a multi-step process. Name each step. Make the object immutable once built.

## The Problem It Solves

```typescript
// Telescoping constructor anti-pattern — unreadable after 4+ params
const req = new HttpRequest("GET", "/api/users", null, 30_000, true, "application/json", ["X-Trace: 1"]);
//                           ^url    ^body         ^timeout  ^follow  ^contentType      ^headers
// Which arg is which? Easy to swap timeout and followRedirects silently.
```

With Builder:

```typescript
const req = new HttpRequestBuilder("GET", "/api/users")
  .timeout(30_000)
  .followRedirects(true)
  .header("X-Trace", "1")
  .build();
```

## When to Use It

| Signal | Example |
|--------|---------|
| Constructor has 4+ parameters, especially optional ones | `new User(name, email, null, null, true, false, null)` |
| Object needs to be immutable once built | Value objects, configuration, requests |
| Same construction logic, different output formats | SQL vs NoSQL query builders |
| Validation should happen at `build()`, not at each setter | Ensure required fields before creating the object |
| Construction has mandatory ordering (e.g., FROM before WHERE) | SQL query, HTTP request pipeline |

## Structure

```
Builder (interface or abstract class)
+ setA(val): this        ← returns self for chaining
+ setB(val): this
+ build(): Product

ConcreteBuilder implements Builder
- fields: ...
+ setA(val): this
+ setB(val): this
+ build(): Product       ← validates, then constructs immutable Product

Product (immutable)
- readonly a: A
- readonly b: B

Director (optional)
- builder: Builder
+ constructStandardConfig(): Product  ← canned construction sequence
```

The **Director** is optional. It encodes common construction recipes so callers don't repeat multi-step sequences.

## Code Example — TypeScript QueryBuilder

```typescript
type OrderDirection = "ASC" | "DESC";

interface Query {
  readonly sql:    string;
  readonly params: unknown[];
}

class QueryBuilder {
  private table:       string | null = null;
  private columns:     string[]      = ["*"];
  private conditions:  string[]      = [];
  private orderColumn: string | null = null;
  private orderDir:    OrderDirection = "ASC";
  private limitVal:    number | null = null;
  private offsetVal:   number | null = null;
  private params:      unknown[]     = [];

  select(...cols: string[]): this {
    this.columns = cols;
    return this;
  }

  from(table: string): this {
    this.table = table;
    return this;
  }

  where(condition: string, ...values: unknown[]): this {
    // Replace ? with $N placeholders for pg-style parameterization
    let clause = condition;
    for (const val of values) {
      this.params.push(val);
      clause = clause.replace("?", `$${this.params.length}`);
    }
    this.conditions.push(clause);
    return this;
  }

  orderBy(column: string, direction: OrderDirection = "ASC"): this {
    this.orderColumn = column;
    this.orderDir    = direction;
    return this;
  }

  limit(n: number): this {
    if (n < 1) throw new RangeError("LIMIT must be >= 1");
    this.limitVal = n;
    return this;
  }

  offset(n: number): this {
    if (n < 0) throw new RangeError("OFFSET must be >= 0");
    this.offsetVal = n;
    return this;
  }

  build(): Query {
    if (!this.table) throw new Error("FROM clause is required");

    const parts: string[] = [
      `SELECT ${this.columns.join(", ")}`,
      `FROM ${this.table}`,
    ];

    if (this.conditions.length > 0) {
      parts.push(`WHERE ${this.conditions.join(" AND ")}`);
    }
    if (this.orderColumn) {
      parts.push(`ORDER BY ${this.orderColumn} ${this.orderDir}`);
    }
    if (this.limitVal !== null)  parts.push(`LIMIT ${this.limitVal}`);
    if (this.offsetVal !== null) parts.push(`OFFSET ${this.offsetVal}`);

    return { sql: parts.join(" "), params: [...this.params] };
  }
}

// Usage
const { sql, params } = new QueryBuilder()
  .select("id", "name", "email")
  .from("users")
  .where("active = ?", true)
  .where("created_at > ?", "2024-01-01")
  .orderBy("name", "ASC")
  .limit(25)
  .offset(50)
  .build();

console.log(sql);
// SELECT id, name, email FROM users WHERE active = $1 AND created_at > $2 ORDER BY name ASC LIMIT 25 OFFSET 50
console.log(params); // [true, '2024-01-01']
```

## Director — Canned Construction Sequences

```typescript
class QueryDirector {
  constructor(private builder: QueryBuilder) {}

  paginatedUserList(page: number, pageSize = 20): Query {
    return this.builder
      .select("id", "name", "email", "created_at")
      .from("users")
      .where("active = ?", true)
      .orderBy("created_at", "DESC")
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .build();
  }

  adminReport(): Query {
    return this.builder
      .select("id", "email", "role", "last_login")
      .from("users")
      .where("role = ?", "admin")
      .orderBy("last_login", "DESC")
      .build();
  }
}

const director = new QueryDirector(new QueryBuilder());
const page2    = director.paginatedUserList(2);
```

## Immutable Object Pattern with Builder (Python)

```python
from dataclasses import dataclass
from typing import Optional

@dataclass(frozen=True)
class HttpRequest:
    method:  str
    url:     str
    timeout: int
    headers: tuple[tuple[str, str], ...]
    body:    Optional[bytes]

class HttpRequestBuilder:
    def __init__(self, method: str, url: str) -> None:
        self._method  = method
        self._url     = url
        self._timeout = 10_000
        self._headers: list[tuple[str, str]] = []
        self._body:    Optional[bytes] = None

    def timeout(self, ms: int) -> "HttpRequestBuilder":
        self._timeout = ms
        return self

    def header(self, name: str, value: str) -> "HttpRequestBuilder":
        self._headers.append((name, value))
        return self

    def body(self, data: bytes) -> "HttpRequestBuilder":
        self._body = data
        return self

    def build(self) -> HttpRequest:
        if not self._url.startswith(("http://", "https://")):
            raise ValueError(f"Invalid URL: {self._url!r}")
        return HttpRequest(
            method=self._method,
            url=self._url,
            timeout=self._timeout,
            headers=tuple(self._headers),
            body=self._body,
        )

req = (HttpRequestBuilder("POST", "https://api.example.com/data")
       .timeout(5_000)
       .header("Authorization", "Bearer token")
       .header("Content-Type", "application/json")
       .body(b'{"key": "value"}')
       .build())
```

## Trade-offs and Pitfalls

| Pro | Con |
|-----|-----|
| Named, readable construction — no positional arg confusion | Extra class(es) to maintain |
| Validates at `build()` — catches incomplete objects early | Fluent chains can be hard to debug (no intermediate state visible) |
| Immutable product once built | Builder is mutable during construction — not thread-safe |
| Director reuses construction steps across variants | Overkill for simple objects with 2–3 properties |

**Pitfall — Forgetting `build()`**: If `build()` is optional or returns the builder itself, callers forget to call it. Make `build()` mandatory and return a distinct `Product` type.

**Pitfall — Mutable product**: If `Product` exposes setters, the Builder buys you nothing. Make the product class immutable (`readonly` / `frozen=True`).

**Pitfall — Stateful builder reuse**: A builder instance carries accumulated state. Calling `build()` twice on the same builder returns the same query — fine for immutable products, but dangerous if `build()` resets fields. Document clearly.

## Real-World Examples

| System | Builder Use |
|--------|------------|
| Java `StringBuilder` | Accumulate string fragments, call `toString()` at end |
| Java `HttpClient.newBuilder()` | Fluent HTTP client configuration |
| Kotlin DSL builders | `buildString {}`, `buildList {}`, Ktor routing DSL |
| SQLAlchemy `select()` | Python ORM query builder — chainable `.where()`, `.order_by()` |
| Elasticsearch QueryDSL | JSON query built via chained method calls |
| Lombok `@Builder` | Auto-generates builder class from annotated Java POJO |
| `jest.fn().mockReturnValue()` | Mock builder in Jest test suite |
| HTML `FormData` API | Accumulate fields before submitting |
