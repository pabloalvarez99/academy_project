# REST API Design Best Practices

Well-designed APIs are a pleasure to use and maintain. Poorly designed ones become technical debt that haunts teams for years.

## Core REST Principles

**Resource-oriented URLs** — nouns, not verbs:
```
✓ GET    /users/123
✓ POST   /users
✓ PUT    /users/123
✓ PATCH  /users/123
✓ DELETE /users/123

✗ GET /getUser?id=123
✗ POST /createUser
✗ POST /users/123/delete
```

**HTTP verbs map to actions**:
| Method | Meaning | Idempotent | Safe |
|--------|---------|-----------|------|
| GET | Read | Yes | Yes |
| POST | Create | No | No |
| PUT | Replace (full update) | Yes | No |
| PATCH | Partial update | No | No |
| DELETE | Delete | Yes | No |

**Idempotent**: Same request produces same result regardless of how many times it's sent.

## URL Structure

```
# Hierarchy represents relationships
GET /organizations/{orgId}/repos/{repoId}/issues

# Query params for filtering, sorting, pagination
GET /products?category=electronics&sort=price&order=asc&page=2&limit=20

# Actions that don't map cleanly to CRUD — use sub-resources
POST /orders/{id}/cancel       ✓ (create a cancellation)
POST /accounts/{id}/activate   ✓
```

## HTTP Status Codes

```
2xx Success
  200 OK                — successful GET, PUT, PATCH
  201 Created           — successful POST (include Location header with new resource URL)
  204 No Content        — successful DELETE or action with no response body

4xx Client Errors
  400 Bad Request       — invalid input, validation failure
  401 Unauthorized      — not authenticated (send auth token)
  403 Forbidden         — authenticated but not authorized
  404 Not Found         — resource doesn't exist
  409 Conflict          — state conflict (duplicate creation, version mismatch)
  422 Unprocessable     — valid JSON but invalid semantics
  429 Too Many Requests — rate limited

5xx Server Errors
  500 Internal Server Error — unexpected server failure
  502 Bad Gateway           — upstream service failure
  503 Service Unavailable   — overloaded or maintenance
  504 Gateway Timeout       — upstream timed out
```

## Request/Response Design

```json
// Consistent error format (RFC 7807 Problem Details)
{
  "type": "https://api.example.com/errors/validation",
  "title": "Validation Failed",
  "status": 400,
  "detail": "The 'email' field must be a valid email address",
  "errors": [
    {"field": "email", "message": "Invalid email format"},
    {"field": "age",   "message": "Must be at least 18"}
  ]
}
```

```json
// Paginated list response
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 154,
    "next": "/products?page=3&limit=20",
    "prev": "/products?page=1&limit=20"
  }
}
```

## Versioning

Never break existing clients. Version your API:

```
// URL versioning (most common, very explicit)
GET /v1/users/123
GET /v2/users/123

// Header versioning (cleaner URLs, harder to test)
GET /users/123
Accept: application/vnd.myapi.v2+json

// Query param (least preferred)
GET /users/123?version=2
```

**Semver approach**: Only major versions in URL. Backwards-compatible changes (new optional fields) are fine without a new version.

## Authentication

```
// Bearer token (OAuth, JWT)
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

// API Key (simpler, for server-to-server)
X-API-Key: sk-abc123

// Basic auth (only over HTTPS, legacy)
Authorization: Basic base64(username:password)
```

## Rate Limiting

Always include rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1738000000   (Unix timestamp when limit resets)
Retry-After: 60                  (seconds to wait when 429)
```

## Go REST API Example

```go
package main

import (
    "encoding/json"
    "net/http"
    "strconv"

    "github.com/go-chi/chi/v5"
    "github.com/go-chi/chi/v5/middleware"
)

type Product struct {
    ID    int     `json:"id"`
    Name  string  `json:"name"`
    Price float64 `json:"price"`
}

func main() {
    r := chi.NewRouter()
    r.Use(middleware.Logger)
    r.Use(middleware.Recoverer)
    r.Use(middleware.RealIP)

    r.Get("/products", listProducts)
    r.Post("/products", createProduct)
    r.Get("/products/{id}", getProduct)
    r.Put("/products/{id}", updateProduct)
    r.Delete("/products/{id}", deleteProduct)

    http.ListenAndServe(":8080", r)
}

func getProduct(w http.ResponseWriter, r *http.Request) {
    id, err := strconv.Atoi(chi.URLParam(r, "id"))
    if err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "invalid id"})
        return
    }

    product, err := db.GetProduct(id)
    if err == ErrNotFound {
        w.WriteHeader(http.StatusNotFound)
        json.NewEncoder(w).Encode(map[string]string{"error": "not found"})
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(product)
}
```

## HATEOAS and Hypermedia

Level 3 REST — responses include links to related actions:
```json
{
  "id": 123,
  "status": "pending",
  "_links": {
    "self": {"href": "/orders/123"},
    "cancel": {"href": "/orders/123/cancel", "method": "POST"},
    "customer": {"href": "/customers/456"}
  }
}
```

Useful for discoverability but complex to implement. Use when clients need to navigate your API without hardcoding URLs.

## OpenAPI / Swagger

Document your API with OpenAPI 3.0:
```yaml
openapi: 3.0.0
info:
  title: Products API
  version: 1.0.0
paths:
  /products/{id}:
    get:
      summary: Get a product by ID
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: integer }
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Product'
        '404':
          description: Not found
```

Tools: Swagger UI (browser explorer), Redoc (docs), go-swagger (codegen).

## Interview Questions

**Q: What's the difference between PUT and PATCH?**
A: PUT replaces the entire resource (idempotent — same body sent 5 times has same result). PATCH applies a partial update — only specified fields are changed. PATCH is not inherently idempotent (depends on implementation).

**Q: When do you use POST vs PUT for creation?**
A: POST when the server assigns the ID (POST /users creates user, server returns ID). PUT when the client knows the ID (PUT /users/123 creates or replaces user 123). POST is the most common for creation.

**Q: How do you handle API versioning without breaking clients?**
A: Use URL versioning for major breaking changes (/v2/). Avoid breaking changes within a version by: only adding new optional fields (never removing), never changing field types, deprecating fields with warning headers before removing. Run multiple versions in parallel during migration.
