# Cryptography Basics

Essential cryptography concepts for engineers building secure systems.

## Symmetric Encryption

Same key is used to encrypt and decrypt. Fast — used for bulk data.

```
Plaintext → [Encrypt with key K] → Ciphertext → [Decrypt with key K] → Plaintext
```

**AES (Advanced Encryption Standard)** — the industry standard:
- Block cipher: processes 128-bit blocks
- Key sizes: 128, 192, or 256 bits
- Modes: CBC, GCM (prefer **GCM** — provides authentication too)

```go
// AES-GCM in Go
import "crypto/aes"
import "crypto/cipher"

block, _ := aes.NewCipher(key)          // key must be 16/24/32 bytes
gcm, _ := cipher.NewGCM(block)
nonce := make([]byte, gcm.NonceSize())  // random nonce, never reuse
rand.Read(nonce)
ciphertext := gcm.Seal(nonce, nonce, plaintext, nil)
```

**Problem**: How do you securely share the key? → Public-key cryptography.

## Asymmetric Encryption (Public-Key)

Two mathematically linked keys: public key (share freely) + private key (keep secret).

```
Alice wants to send Bob a secret:
  1. Bob publishes his PUBLIC key
  2. Alice encrypts with Bob's PUBLIC key → Ciphertext
  3. Only Bob can decrypt with his PRIVATE key
```

**RSA** — most common, based on integer factorization:
- Slow for large data → used to exchange symmetric keys (hybrid encryption)
- Key sizes: 2048+ bits (4096 for long-term secrets)

**ECDSA / Ed25519** — elliptic curve, much faster and shorter keys:
- Ed25519: 256-bit key ≈ RSA 3072-bit security
- Used for SSH keys, TLS 1.3, JWT signatures

## Hashing

One-way function: any input → fixed-size digest. Cannot be reversed.

| Algorithm | Output Size | Use |
|-----------|-------------|-----|
| MD5 | 128 bits | **Broken** — don't use for security |
| SHA-1 | 160 bits | **Broken** — avoid |
| SHA-256 | 256 bits | Checksums, certificate fingerprints |
| SHA-512 | 512 bits | High-security contexts |
| bcrypt | variable | **Password hashing** (slow by design) |
| Argon2 | variable | **Password hashing** (modern, preferred) |

```go
// SHA-256 in Go
import "crypto/sha256"
h := sha256.Sum256([]byte("hello"))
fmt.Printf("%x\n", h)  // 2cf24...

// Password hashing — use bcrypt/argon2, not SHA
import "golang.org/x/crypto/bcrypt"
hash, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
bcrypt.CompareHashAndPassword(hash, []byte(attempt))
```

## HMAC — Message Authentication Codes

Verify data integrity AND authenticity. Requires a shared secret key.

```
HMAC(key, message) → tag
```

If the tag matches, the message wasn't tampered with and came from someone with the key.

```go
import "crypto/hmac"
import "crypto/sha256"

mac := hmac.New(sha256.New, secretKey)
mac.Write([]byte(message))
tag := mac.Sum(nil)

// Verify — use hmac.Equal to prevent timing attacks!
valid := hmac.Equal(tag, expectedTag)
```

## Digital Signatures

Like HMAC but with asymmetric keys — anyone can verify, only the signer can sign.

```
Sign:   signature = Sign(privateKey, hash(message))
Verify: valid = Verify(publicKey, signature, hash(message))
```

Used in: JWT tokens, TLS certificates, code signing, Git commits (GPG).

## TLS / HTTPS

Transport Layer Security — the protocol securing HTTPS. Combines all the above:

```
TLS Handshake:
  1. Client → Server: Hello, supported cipher suites
  2. Server → Client: Certificate (contains public key), chosen cipher
  3. Key Exchange: ECDH generates shared secret (forward secrecy)
  4. Both derive symmetric session keys from shared secret
  5. All further communication: AES-GCM encrypted + HMAC authenticated
```

**Certificate Chain**:
```
Root CA (self-signed, trusted by OS/browser)
  └── Intermediate CA (signed by Root)
        └── Your domain cert (signed by Intermediate)
```

Browser verifies the full chain up to a trusted root.

## Common Mistakes to Avoid

1. **Rolling your own crypto** — use established libraries
2. **ECB mode for AES** — patterns leak; use GCM
3. **Reusing nonces** — catastrophic with GCM; breaks all security
4. **MD5/SHA-1 for passwords** — use bcrypt/Argon2 (intentionally slow)
5. **Storing keys in source code** — use env vars, secret managers
6. **Not validating certificates** — `InsecureSkipVerify: true` is never OK in production
7. **Short keys** — RSA < 2048 bits, AES < 128 bits are considered broken

## Interview Questions

**Q: What's the difference between encryption and hashing?**
A: Encryption is reversible with a key; hashing is one-way. Encrypt when you need to recover the original (data at rest/transit); hash when you only need to verify (passwords).

**Q: Why not use SHA-256 to store passwords?**
A: SHA-256 is fast — attackers can compute billions of hashes per second with GPUs. Password hashing algorithms (bcrypt, Argon2) are intentionally slow and include a salt to prevent rainbow table attacks.

**Q: What is forward secrecy?**
A: If the server's private key is compromised later, recorded past sessions can't be decrypted. TLS 1.3 achieves this with ephemeral Diffie-Hellman — new key pairs per session, never stored.
