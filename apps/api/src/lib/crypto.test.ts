import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, maskSecret } from "./crypto";

describe("crypto", () => {
  it("round-trips a secret through encrypt/decrypt", () => {
    const secret = "sk-ant-abcdef0123456789";
    const ciphertext = encryptSecret(secret);
    expect(ciphertext).not.toContain(secret);
    expect(decryptSecret(ciphertext)).toBe(secret);
  });

  it("produces a distinct ciphertext each time (random IV)", () => {
    const secret = "shared-value";
    expect(encryptSecret(secret)).not.toBe(encryptSecret(secret));
  });

  it("rejects a tampered payload", () => {
    const ciphertext = encryptSecret("tamper-me");
    const tampered = `${ciphertext}00`;
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("masks secrets without revealing the middle", () => {
    expect(maskSecret("sk-ant-abcdef0123456789")).toBe("sk-a…6789");
    expect(maskSecret("short")).toBe("••••");
  });
});
