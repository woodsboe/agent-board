import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Local-first secret storage.
 *
 * Credentials (API keys, git PATs) are encrypted at rest with AES-256-GCM before
 * they are written to SQLite. The 32-byte key is sourced, in order, from:
 *   1. the AGENTBOARD_SECRET_KEY env var (recommended for production builds), or
 *   2. a gitignored key file at prisma/.secret.key, auto-generated on first use.
 *
 * Plaintext secrets never leave the API process: responses only ever carry the
 * masked `preview` produced by maskSecret().
 */

const moduleDir = dirname(fileURLToPath(import.meta.url));
const keyPath = resolve(moduleDir, "../../../../prisma/.secret.key");

function loadKey(): Buffer {
  const envKey = process.env.AGENTBOARD_SECRET_KEY;
  if (envKey && envKey.trim()) {
    // Derive a stable 32-byte key from whatever the operator provides.
    return createHash("sha256").update(envKey.trim()).digest();
  }

  if (existsSync(keyPath)) {
    const raw = readFileSync(keyPath, "utf8").trim();
    const key = Buffer.from(raw, "hex");
    if (key.length === 32) return key;
  }

  const generated = randomBytes(32);
  mkdirSync(dirname(keyPath), { recursive: true });
  writeFileSync(keyPath, generated.toString("hex"), { mode: 0o600 });
  return generated;
}

let cachedKey: Buffer | null = null;
function key(): Buffer {
  if (!cachedKey) cachedKey = loadKey();
  return cachedKey;
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(":");
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, ctB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !ctB64) {
    throw new Error("Malformed encrypted secret");
  }
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, "base64")), decipher.final()]).toString("utf8");
}

/** Human-readable, non-reversible preview, e.g. "sk-a…wxyz". */
export function maskSecret(plaintext: string): string {
  const trimmed = plaintext.trim();
  if (trimmed.length <= 8) return "••••";
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`;
}
