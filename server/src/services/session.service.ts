import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getDb, UserRecord } from "../repositories/db.js";

// Development sessions are invalidated on restart; production requires a private key.
const developmentSecret = randomBytes(48).toString('hex');

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored) return false;
  if (!stored.startsWith("scrypt:")) return password === stored;
  const [, salt, hash] = stored.split(":");
  const expected = Buffer.from(hash || "", "hex");
  const actual = scryptSync(password, salt, 64);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function signingKey(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    throw new Error('SESSION_SECRET must contain at least 32 characters.');
  }
  return developmentSecret;
}

function fingerprint(user: UserRecord): string {
  return createHmac("sha256", signingKey()).update(user.passwordHash || "").digest("hex");
}

export function issueSession(user: UserRecord, kind: "session" | "device" = "session"): string {
  const payload = Buffer.from(JSON.stringify({ userId: user.id, kind, expiresAt: Date.now() + (kind === "device" ? 90 : 30) * 86400000, fingerprint: fingerprint(user) })).toString("base64url");
  return `${payload}.${createHmac("sha256", signingKey()).update(payload).digest("base64url")}`;
}

export function authenticateSession(token: string, kind: "session" | "device" = "session"): UserRecord {
  if (typeof token !== 'string' || token.length > 4096 || token.split('.').length !== 2) throw new Error('Сессия недействительна. Войдите заново.');
  const [payload, signature] = token.split(".");
  if (!payload || !signature) throw new Error("Сессия недействительна. Войдите заново.");
  const expected = createHmac("sha256", signingKey()).update(payload).digest();
  const actual = Buffer.from(signature, "base64url");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new Error("Сессия недействительна. Войдите заново.");
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  const user = getDb().users.find((candidate) => candidate.id === parsed.userId);
  if (parsed.kind !== kind || !Number.isFinite(parsed.expiresAt) || parsed.expiresAt < Date.now() || !user || user.isActive === false || parsed.fingerprint !== fingerprint(user)) {
    throw new Error("Сессия истекла или доступ отозван. Войдите заново.");
  }
  return user;
}
