# HTTP and REST APIs

## HTTP Fundamentals

HTTP (HyperText Transfer Protocol) is a stateless, request-response protocol running over TCP/IP.

### Request Structure

```
GET /api/users/123 HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGci...
Accept: application/json
```

### Response Structure

```
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: max-age=60

{"id": 123, "name": "Alice"}
```

## HTTP Methods

| Method | Meaning | Idempotent | Safe | Body |
|--------|---------|-----------|------|------|
| GET | Retrieve resource | ✓ | ✓ | No |
| POST | Create resource | ✗ | ✗ | Yes |
| PUT | Replace resource | ✓ | ✗ | Yes |
| PATCH | Partial update | ✗ | ✗ | Yes |
| DELETE | Remove resource | ✓ | ✗ | No |
| HEAD | Like GET, no body | ✓ | ✓ | No |
| OPTIONS | List allowed methods | ✓ | ✓ | No |

**Idempotent**: Same request repeated produces the same result.
**Safe**: No side effects on the server.

## HTTP Status Codes

### 2xx Success
| Code | Meaning |
|------|---------|
| 200 | OK — request succeeded |
| 201 | Created — resource was created (use with POST) |
| 204 | No Content — success but no body (use with DELETE) |
| 206 | Partial Content — used for range requests |

### 3xx Redirection
| Code | Meaning |
|------|---------|
| 301 | Moved Permanently — update your bookmarks |
| 302 | Found (temporary redirect) |
| 304 | Not Modified — use cached version |

### 4xx Client Error
| Code | Meaning |
|------|---------|
| 400 | Bad Request — malformed syntax |
| 401 | Unauthorized — not authenticated |
| 403 | Forbidden — authenticated but no permission |
| 404 | Not Found |
| 405 | Method Not Allowed |
| 409 | Conflict — e.g., duplicate resource |
| 422 | Unprocessable Entity — validation failed |
| 429 | Too Many Requests — rate limited |

### 5xx Server Error
| Code | Meaning |
|------|---------|
| 500 | Internal Server Error |
| 502 | Bad Gateway |
| 503 | Service Unavailable |
| 504 | Gateway Timeout |

## REST Principles

REST (Representational State Transfer) is an architectural style, not a protocol.

### 6 Constraints

1. **Client-Server**: UI and data storage are separated
2. **Stateless**: Each request contains all needed information; no session state on server
3. **Cacheable**: Responses indicate if they can be cached
4. **Uniform Interface**: Consistent API surface (resources + HTTP verbs)
5. **Layered System**: Client can't tell if talking to server or proxy
6. **Code on Demand** (optional): Server can send executable code

### Resource Naming Convention

```
GET    /users           → list all users
POST   /users           → create user
GET    /users/123       → get user 123
PUT    /users/123       → replace user 123
PATCH  /users/123       → update user 123 partially
DELETE /users/123       → delete user 123

GET    /users/123/posts → get user 123's posts
POST   /users/123/posts → create post for user 123
```

**Rules:**
- Use nouns, not verbs (`/users` not `/getUsers`)
- Plural for collections (`/users` not `/user`)
- Lowercase with hyphens (`/blog-posts` not `/blogPosts`)
- Nest for relationships (max 2 levels deep)

## Common Headers

```
# Request
Authorization: Bearer <token>
Content-Type: application/json
Accept: application/json
Accept-Encoding: gzip, deflate
If-None-Match: "abc123"

# Response
Content-Type: application/json; charset=utf-8
Cache-Control: no-cache, must-revalidate
ETag: "abc123"
X-Rate-Limit-Remaining: 95
Location: /users/456    # after POST that creates resource
```

## Authentication Patterns

### JWT (JSON Web Token)
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
Three base64-encoded parts: header.payload.signature

### API Key
```
X-API-Key: sk-1234567890abcdef
```

### Basic Auth
```
Authorization: Basic dXNlcjpwYXNz   # base64("user:pass")
```

## Pagination

```json
GET /users?page=2&per_page=20

{
  "data": [...],
  "meta": {
    "page": 2,
    "per_page": 20,
    "total": 150,
    "total_pages": 8
  },
  "links": {
    "prev": "/users?page=1&per_page=20",
    "next": "/users?page=3&per_page=20"
  }
}
```

## Interview Questions

**Q: What's the difference between PUT and PATCH?**
A: PUT replaces the entire resource. PATCH partially updates it. PUT is idempotent; PATCH may not be.

**Q: What does stateless mean in REST?**
A: The server stores no client session state. Each request must include all context (auth tokens, user ID) needed to process it.

**Q: When do you use 401 vs 403?**
A: 401 = not authenticated (no credentials). 403 = authenticated but not authorized (wrong permissions).
