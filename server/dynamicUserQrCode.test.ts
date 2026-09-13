import { afterEach, describe, expect, it } from "vitest";
import { DYNAMIC_USER_QR_TTL_MS, issueDynamicUserQrCode, verifyDynamicUserQrCode } from "./dynamicUserQrCode";

describe("動態使用者 QR Code", () => {
  const originalSecret = process.env.JWT_SECRET;
  const now = 1_800_000_123_000;

  function useTestSecret() {
    process.env.JWT_SECRET = "dynamic-user-qr-test-secret";
  }

  it("簽發可於同一五分鐘時間窗驗證的使用者識別碼", () => {
    useTestSecret();
    const token = issueDynamicUserQrCode(42, now);
    expect(token.value).toMatch(/^QSSH-USER-V2:42:\d+:[A-Za-z0-9_-]+$/);
    expect(token.expiresInSeconds).toBeGreaterThan(0);
    expect(verifyDynamicUserQrCode(token.value, now)).toMatchObject({ userId: 42 });
  });

  it("拒絕逾時、遭竄改或格式不正確的識別碼", () => {
    useTestSecret();
    const token = issueDynamicUserQrCode(42, now);
    expect(verifyDynamicUserQrCode(token.value, now + DYNAMIC_USER_QR_TTL_MS)).toBeNull();
    expect(verifyDynamicUserQrCode(`${token.value}x`, now)).toBeNull();
    expect(verifyDynamicUserQrCode("QSSH-USER:42", now)).toBeNull();
  });

  it("不接受無效的使用者識別碼", () => {
    useTestSecret();
    expect(() => issueDynamicUserQrCode(0, now)).toThrow("使用者識別碼無效");
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });
});
