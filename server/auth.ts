import crypto from "crypto";
import { User, db } from "./db";

// Use a secure, dynamically generated or environment-defined JWT/session secret
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");

// Base32 Alphabet for 2FA Secret Generation
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

// Helper to base32 decode
function base32Decode(base32: string): Buffer {
  const cleaned = base32.replace(/=+$/, "").toUpperCase();
  let bits = "";
  for (let i = 0; i < cleaned.length; i++) {
    const val = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (val === -1) {
      throw new Error("Invalid base32 character in MFA secret");
    }
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    const chunk = bits.substring(i, i + 8);
    if (chunk.length === 8) {
      bytes.push(parseInt(chunk, 2));
    }
  }
  return Buffer.from(bytes);
}

/**
 * Hash a password using PBKDF2-SHA512
 */
export function hashPassword(password: string, salt: string): string {
  // 100,000 iterations, 64-byte key length
  return crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
}

/**
 * Generate a cryptographically secure random salt
 */
export function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Generate a secure cryptographically random token (e.g., sessions, resets, codes)
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Generate a Base32 MFA Secret compatible with Google Authenticator (16 chars)
 */
export function generateMFASecret(): string {
  let secret = "";
  const bytes = crypto.randomBytes(10); // 10 bytes = 80 bits = 16 base32 chars
  for (let i = 0; i < bytes.length; i++) {
    secret += BASE32_ALPHABET[bytes[i] % 32];
  }
  return secret;
}

/**
 * Generate standard compliant TOTP (RFC 6238)
 */
export function generateTOTP(secretBase32: string, timestamp: number = Date.now()): string {
  const key = base32Decode(secretBase32);
  const epoch = Math.floor(timestamp / 1000 / 30);
  const timeBuf = Buffer.alloc(8);
  // Write 64-bit counter
  timeBuf.writeUInt32BE(Math.floor(epoch / 0x100000000), 0);
  timeBuf.writeUInt32BE(epoch & 0xffffffff, 4);

  const hmac = crypto.createHmac("sha1", key).update(timeBuf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, "0");
}

/**
 * Verify a TOTP token (Google Authenticator) with +/- 1 drift window
 */
export function verifyTOTP(token: string, secretBase32: string): boolean {
  const cleaned = token.trim().replace(/\s/g, "");
  if (cleaned.length !== 6 || !/^\d+$/.test(cleaned)) return false;

  const now = Date.now();
  // Check -30s, now, and +30s to be resilient to clock drift
  for (let drift = -1; drift <= 1; drift++) {
    const calculated = generateTOTP(secretBase32, now + drift * 30000);
    if (calculated === cleaned) {
      return true;
    }
  }
  return false;
}

/**
 * Generate 2FA recovery codes
 */
export function generateRecoveryCodes(): { plain: string[]; hashed: string[] } {
  const codes: string[] = [];
  const hashed: string[] = [];
  for (let i = 0; i < 8; i++) {
    const code = crypto.randomBytes(4).toString("hex"); // e.g. "a5b2c7d9"
    codes.push(code);
    hashed.push(hashPassword(code, "mfa_recovery")); // standard salt for recovery hashing
  }
  return { plain: codes, hashed };
}

/**
 * Verify recovery code and mark as used (by deleting it from user's record)
 */
export function useRecoveryCode(user: User, code: string): boolean {
  const codeHash = hashPassword(code.trim().toLowerCase(), "mfa_recovery");
  const index = user.mfaRecoveryCodes.indexOf(codeHash);
  if (index !== -1) {
    // Consume code (it is single use!)
    const updatedCodes = [...user.mfaRecoveryCodes];
    updatedCodes.splice(index, 1);
    db.updateUser(user.id, { mfaRecoveryCodes: updatedCodes });
    return true;
  }
  return false;
}

/**
 * In-memory IP/Endpoint Rate Limiting Protection (OWASP compliant)
 */
interface RateLimitRecord {
  count: number;
  resetTime: number;
}
const rateLimits = new Map<string, RateLimitRecord>();

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimits.get(key);

  if (!record || now > record.resetTime) {
    rateLimits.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return false;
  }

  record.count++;
  if (record.count > limit) {
    return true;
  }
  return false;
}
