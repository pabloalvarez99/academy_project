# OWASP Top 10 Web Vulnerabilities

The OWASP (Open Web Application Security Project) Top 10 is the industry standard for web application security risks.

## 1. Broken Access Control

**What it is:** Users can access resources or perform actions beyond their intended permissions.

**Examples:**
- Accessing another user's account by changing an ID in the URL
- Accessing admin pages without authentication
- IDOR (Insecure Direct Object Reference)

**Prevention:**
```
- Deny access by default
- Validate permissions server-side (never trust client)
- Use UUIDs instead of sequential IDs
- Log and alert on access control failures
```

## 2. Cryptographic Failures

**What it is:** Sensitive data exposed due to weak or missing encryption.

**Examples:**
- Passwords stored in plaintext or with MD5/SHA1
- HTTP instead of HTTPS
- Weak cryptographic keys

**Prevention:**
- Use bcrypt/argon2 for passwords (NOT SHA-*)
- Enforce HTTPS everywhere (HSTS)
- Never store sensitive data you don't need

## 3. Injection (SQL, Command, LDAP)

**What it is:** Untrusted data sent to an interpreter as part of a command.

**SQL Injection Example:**
```sql
-- Vulnerable
SELECT * FROM users WHERE username = '" + input + "'

-- Attack input: ' OR '1'='1
-- Resulting query selects ALL users
```

**Prevention:**
```go
// Use parameterized queries ALWAYS
db.Query("SELECT * FROM users WHERE username = ?", username)
```

## 4. Insecure Design

**What it is:** Missing or ineffective security controls at the design level (not implementation bugs).

**Prevention:**
- Threat modeling during design
- Secure design patterns
- Reference architectures

## 5. Security Misconfiguration

**What it is:** Insecure default settings, missing security hardening.

**Examples:**
- Default credentials unchanged
- Unnecessary features enabled
- Verbose error messages exposing stack traces
- Open S3 buckets

## 6. Vulnerable Components

**What it is:** Using components with known vulnerabilities.

**Prevention:**
- Use `go mod audit`, `npm audit`, `pip-audit`
- Monitor CVE databases
- Keep dependencies updated

## 7. Authentication Failures

**What it is:** Weaknesses in authentication and session management.

**Examples:**
- Weak passwords allowed
- No brute-force protection
- Session tokens not invalidated on logout

## 8. Software Integrity Failures

**What it is:** Insecure deserialization or CI/CD pipeline attacks.

**Examples:**
- Auto-update without signature verification
- Malicious npm packages (supply chain)

## 9. Security Logging Failures

**What it is:** Insufficient logging prevents detection and forensics.

**Prevention:**
- Log authentication events (success + failure)
- Log access control failures
- Include timestamps, user IDs, IPs
- Alert on suspicious patterns

## 10. Server-Side Request Forgery (SSRF)

**What it is:** Server fetches a URL supplied by an attacker, accessing internal services.

**Attack scenario:**
```
Attacker → POST /fetch-url {"url": "http://169.254.169.254/metadata"}
Server → Fetches AWS instance metadata → Returns credentials
```

**Prevention:**
- Validate and allowlist URLs
- Block private IP ranges from user-supplied URLs
- Use network-level controls
