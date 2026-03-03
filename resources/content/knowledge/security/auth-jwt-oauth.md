# JWT and OAuth 2.0 — Deep Dive

Token-based authentication is the backbone of modern APIs. This article covers JWT structure, OAuth 2.0 flows, and the practical decisions engineers get wrong in production.

## JWT Structure

A JWT is three base64url-encoded JSON objects joined by dots:

```
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImV4cCI6MTc0MDAwMDAwMH0.<signature>
header                                  payload                                               signature
```

### Header
```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "key-id-2024"   // key ID for rotation — lets verifiers pick the right public key
}
```

### Payload (Claims)
```json
{
  "sub":   "user-123",          // subject — unique user identifier
  "iss":   "https://auth.example.com",  // issuer
  "aud":   ["api.example.com"], // audience — who this token is for
  "exp":   1740000000,          // expiry (Unix timestamp) — ALWAYS set this
  "iat":   1739996400,          // issued at
  "nbf":   1739996400,          // not before (optional)
  "jti":   "uuid-v4",           // JWT ID — enables one-time use / revocation list
  "role":  "admin",             // custom claim — authorization data
  "scope": "read:users write:posts"  // OAuth scopes
}
```

Claims are **readable by anyone** — base64url is encoding, not encryption. Never put passwords, SSNs, or secrets in a JWT payload. Use HTTPS. If the payload must be confidential, use JWE (JSON Web Encryption).

### Signature

```
RS256: RSA-SHA256(base64url(header) + "." + base64url(payload), privateKey)
HS256: HMAC-SHA256(base64url(header) + "." + base64url(payload), sharedSecret)
```

## RS256 vs HS256

| | RS256 (asymmetric) | HS256 (symmetric) |
|---|---|---|
| Keys | Private key signs, public key verifies | Single shared secret — sign and verify |
| Distribution | Public key can be published (JWKS endpoint) | Secret must be shared securely with every verifier |
| Use case | Multiple services, public identity providers | Single service or tightly controlled internal services |
| Key rotation | Rotate private key, update JWKS URL | Must re-share new secret with all services |
| Risk if leaked | Private key leak = sign anything; public key = harmless | Secret leak = full compromise |

**Recommendation**: Use RS256 for anything crossing a service boundary. HS256 is acceptable for a monolith or single-service scenario with a 256-bit+ secret.

## TypeScript JWT Verification

```typescript
import jwt from "jsonwebtoken";

interface TokenPayload {
  sub: string;
  role: string;
  exp: number;
  iss: string;
  aud: string | string[];
}

function verifyAccessToken(token: string, publicKey: string): TokenPayload {
  // Always specify algorithms explicitly — never let the token header decide
  const payload = jwt.verify(token, publicKey, {
    algorithms: ["RS256"],          // whitelist only — blocks "alg: none" attacks
    issuer:     "https://auth.example.com",
    audience:   "api.example.com",  // reject tokens not intended for this service
  }) as TokenPayload;

  return payload;
}

// Express middleware example
function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing token" });
    return;
  }

  try {
    const token = authHeader.slice(7);
    req.user = verifyAccessToken(token, PUBLIC_KEY);
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: "Token expired" });
    } else {
      res.status(401).json({ error: "Invalid token" });
    }
  }
}
```

## OAuth 2.0 Flows

OAuth 2.0 is a **delegation protocol** — a resource owner (user) grants a client (your app) limited access to their resources on a provider (Google, GitHub).

### Authorization Code Flow (Web Apps)

Best for server-side apps. The authorization code is short-lived and exchanged server-to-server.

```
1. Client redirects user to:
   https://provider.com/authorize
     ?response_type=code
     &client_id=YOUR_APP
     &redirect_uri=https://yourapp.com/callback
     &scope=openid email profile
     &state=RANDOM_CSRF_TOKEN

2. User authenticates and approves

3. Provider redirects to:
   https://yourapp.com/callback?code=AUTH_CODE&state=RANDOM_CSRF_TOKEN

4. Server validates state (CSRF protection), then POST exchange:
   POST https://provider.com/token
   grant_type=authorization_code&code=AUTH_CODE&client_id=...&client_secret=...

5. Provider returns:
   { "access_token": "...", "refresh_token": "...", "id_token": "..." }
```

### PKCE — Proof Key for Code Exchange (SPAs and Mobile)

SPAs and native apps cannot safely store a `client_secret`. PKCE replaces it with a cryptographic challenge:

```
1. Client generates:
   code_verifier  = crypto.randomBytes(32).toString("base64url")  // 43-128 chars
   code_challenge = base64url(SHA256(code_verifier))              // S256 method

2. Send code_challenge in authorization request (not the verifier)

3. On token exchange, send code_verifier instead of client_secret
   Provider re-derives the challenge and compares — only the original
   client knows the verifier
```

### Client Credentials Flow (Machine-to-Machine)

No user involved — service authenticates directly with its own `client_id` + `client_secret`:

```
POST /token
grant_type=client_credentials&client_id=SVC_ID&client_secret=SVC_SECRET&scope=read:data

→ { "access_token": "...", "expires_in": 3600 }
```

Use this for background jobs, microservice-to-microservice calls, CI/CD pipeline access.

## Refresh Token Rotation

Short-lived access tokens + long-lived refresh tokens limit breach impact:

```
Access Token:   15 minutes  → sent on every request (Authorization: Bearer ...)
Refresh Token:  7–30 days   → stored in httpOnly cookie, used only to refresh

On refresh:
POST /auth/refresh
Cookie: refresh_token=...

→ { "access_token": "new...", "refresh_token": "new..." }  // rotate both

Old refresh token is immediately invalidated.
If a stolen refresh token is reused → both tokens invalidated (detect theft).
```

Refresh token rotation means a leaked refresh token can only be exploited once before the legitimate user's next refresh invalidates the attacker's copy.

## Stateless Auth vs Sessions

| | Stateless JWT | Server Sessions |
|---|---|---|
| Server storage | None | Session store (Redis/DB) |
| Revocation | Hard — need blacklist or short expiry | Trivial — delete session record |
| Horizontal scaling | Easy — any server validates independently | Requires shared session store |
| Token size | 300–600 bytes per request | Small cookie (session ID) |
| Cross-service | Works natively | Needs sticky sessions or shared store |
| Best for | Microservices, APIs, mobile | Traditional web apps, need instant revocation |

## Common Mistakes

| Mistake | Why it's dangerous | Fix |
|---|---|---|
| Storing JWT in `localStorage` | XSS can read `localStorage` and exfiltrate tokens | Use `httpOnly; Secure; SameSite=Strict` cookies |
| No `exp` claim | Tokens never expire — stolen token is valid forever | Always set `exp`, 15 min for access tokens |
| Trusting `alg` header | Attacker sends `"alg": "none"` to bypass signature | Whitelist algorithms in verify options |
| Long-lived access tokens | Breach window is wide open | 15 min max; use refresh tokens |
| Secrets in payload | Payload is base64-decoded, not encrypted | Put secrets server-side; put identity in token |
| Not validating `aud` | Token for Service A accepted by Service B | Always validate audience claim |

## Interview Questions

**Q: Can you invalidate a JWT before it expires?**
A: Not with pure stateless JWTs. Options: maintain a token blacklist (Redis set of revoked `jti` values — defeats statelessness partially), use very short expiry windows, or switch to opaque tokens for sessions that require instant revocation.

**Q: When would you choose sessions over JWTs?**
A: When you need immediate revocation (financial apps, security-sensitive actions), when you're building a traditional server-rendered web app, or when token size in every HTTP header is a concern.

**Q: What's the difference between OAuth and OIDC?**
A: OAuth 2.0 is an authorization framework — it grants access to resources. OIDC (OpenID Connect) layers authentication on top, adding a standardized `id_token` (JWT) with user identity claims and a `/userinfo` endpoint. Use OAuth for API access delegation, OIDC for "sign in with Google"-style identity.
