# Authentication and JWT

Understanding authentication patterns and token-based security for modern APIs.

## Authentication vs Authorization

- **Authentication (AuthN)**: Who are you? (identity verification)
- **Authorization (AuthZ)**: What can you do? (permission check)

```
Request → Authenticate → Authorize → Resource
           "Is this user real?"  "Can they access this?"
```

## Session-Based Auth (Stateful)

Traditional web approach — server stores session state.

```
1. User logs in → Server creates session, stores in DB/Redis
2. Server sends session ID in cookie
3. Every request: server looks up session ID → finds user
4. Logout: delete session from server
```

**Pros**: Easy to invalidate (just delete session)
**Cons**: Horizontal scaling needs shared session store; DB lookup per request

## Token-Based Auth (Stateless)

Server issues a signed token — no server-side storage needed.

```
1. User logs in → Server creates signed token, sends to client
2. Client stores token (localStorage, memory, httpOnly cookie)
3. Every request: client sends token in Authorization header
4. Server validates signature → extracts claims (no DB lookup!)
5. Logout: token stays valid until expiry (client just deletes it)
```

**Pros**: Stateless, scales horizontally, works across microservices
**Cons**: Can't instantly revoke (need token blacklist or short expiry)

## JWT — JSON Web Tokens

Most common token format. Three base64url-encoded parts joined by `.`:

```
header.payload.signature
```

### Header
```json
{"alg": "HS256", "typ": "JWT"}
```

### Payload (Claims)
```json
{
  "sub": "user-123",        // subject (user ID)
  "iss": "api.example.com", // issuer
  "aud": "web-app",         // audience
  "exp": 1740000000,        // expiry (Unix timestamp)
  "iat": 1739996400,        // issued at
  "role": "admin"           // custom claim
}
```

### Signature
```
HMAC-SHA256(
  base64url(header) + "." + base64url(payload),
  secretKey
)
```

```go
// Using golang-jwt/jwt
import "github.com/golang-jwt/jwt/v5"

// Create token
claims := jwt.MapClaims{
    "sub": userID,
    "exp": time.Now().Add(15 * time.Minute).Unix(),
}
token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
signed, _ := token.SignedString([]byte(secretKey))

// Validate token
parsed, err := jwt.Parse(signed, func(t *jwt.Token) (interface{}, error) {
    if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
        return nil, fmt.Errorf("unexpected signing method")
    }
    return []byte(secretKey), nil
})
if claims, ok := parsed.Claims.(jwt.MapClaims); ok && parsed.Valid {
    userID := claims["sub"].(string)
}
```

## Access Token + Refresh Token Pattern

Short-lived access token + long-lived refresh token:

```
Access Token:  15 minutes lifetime  → sent on every API request
Refresh Token: 7 days lifetime      → stored securely, used only to get new access tokens

Flow:
  Login → Issue [access_token (15m) + refresh_token (7d)]
  API call → Bearer access_token (validates in microseconds, no DB)
  Access expires → POST /auth/refresh with refresh_token
  → New access_token (+ optionally rotate refresh_token)
  Logout → Invalidate refresh_token in DB
```

This limits blast radius: stolen access token only valid for 15 minutes.

## OAuth 2.0 Overview

Delegated authorization protocol — lets users grant third parties access to their resources.

```
Authorization Code Flow (for web apps):
  1. App redirects user to Provider (Google, GitHub)
  2. User authenticates and grants permission
  3. Provider redirects back with authorization code
  4. App exchanges code for access_token (server-to-server)
  5. App uses access_token to call Provider's API on user's behalf
```

**Key roles**:
- **Resource Owner**: The user
- **Client**: Your application
- **Authorization Server**: Issues tokens (Google, Auth0)
- **Resource Server**: API being accessed

## OIDC — OpenID Connect

OAuth 2.0 + **identity layer**. Adds an `id_token` (a JWT) that contains user identity claims.

```
"Use Google to sign in" → OAuth 2.0 gives you an access_token for Google APIs
                        → OIDC gives you an id_token with user's email, name, sub
```

## Password Security

Never store plaintext passwords. Use adaptive hashing:

```go
import "golang.org/x/crypto/bcrypt"

// Registration: hash before storing
hash, err := bcrypt.GenerateFromPassword([]byte(password), 12) // cost=12
store(user, hash)

// Login: compare (constant-time)
err = bcrypt.CompareHashAndPassword(storedHash, []byte(attempt))
if err == nil { /* valid */ }
```

**Argon2** (winner of Password Hashing Competition) is the modern choice:
```go
import "golang.org/x/crypto/argon2"
hash := argon2.IDKey(password, salt, 1, 64*1024, 4, 32)
```

## Common Vulnerabilities

| Attack | Description | Defense |
|--------|-------------|---------|
| JWT none algorithm | Attacker changes `alg: none` to bypass sig | Always verify algorithm header |
| Weak secret | Brute-force HS256 with weak secret | Use 256-bit+ random secret |
| Token in localStorage | XSS can steal it | Use httpOnly cookies or in-memory |
| Long-lived tokens | Stolen token valid for days | Short expiry + refresh tokens |
| Missing expiry | No `exp` claim | Always set exp |

## Interview Questions

**Q: Why use JWT over sessions?**
A: JWTs are stateless — no DB lookup per request, which enables horizontal scaling and microservice architectures. Trade-off: harder to instantly revoke.

**Q: Is JWT encrypted?**
A: By default, no. JWT is base64-encoded (not encrypted) — the payload is readable by anyone. Use JWE (JSON Web Encryption) if the payload contains sensitive data. Always use HTTPS.

**Q: What's the difference between OAuth and OIDC?**
A: OAuth 2.0 handles authorization (access to resources). OIDC extends OAuth to handle authentication (user identity), adding the `id_token` and standardized user info endpoint.
