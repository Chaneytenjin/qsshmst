import { afterEach, describe, expect, it } from "vitest";
import { ENV } from "./_core/env";
import { decryptTemporaryPassword, encryptTemporaryPassword } from "./temporaryPasswordVault";

describe("temporary password vault", () => {
  const originalSecret = ENV.cookieSecret;
  afterEach(() => { ENV.cookieSecret = originalSecret; });

  it("以 AES-GCM 保存密碼，密文不含明文且可正確解密", () => {
    ENV.cookieSecret = "temporary-password-vault-test-secret";
    const password = "Qsm!8zR4mP2";
    const encrypted = encryptTemporaryPassword(password);
    expect(encrypted).not.toContain(password);
    expect(decryptTemporaryPassword(encrypted)).toBe(password);
  });
});
