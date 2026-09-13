import { afterEach, describe, expect, it } from "vitest";
import { ENV } from "./_core/env";
import { createTwoFactorSetup, decryptTwoFactorSecret, encryptTwoFactorSecret } from "./twoFactor";

describe("two-factor encryption", () => {
  const originalSecret = ENV.cookieSecret;
  afterEach(() => { ENV.cookieSecret = originalSecret; });

  it("將 TOTP 密鑰以可回復的加密格式保存，並建立標準驗證器 URI", () => {
    ENV.cookieSecret = "account-security-test-secret";
    const setup = createTwoFactorSetup("security-user");
    const encrypted = encryptTwoFactorSecret(setup.secret);

    expect(setup.otpAuthUri).toContain("otpauth://totp/");
    expect(encrypted).not.toContain(setup.secret);
    expect(decryptTwoFactorSecret(encrypted)).toBe(setup.secret);
  });
});
