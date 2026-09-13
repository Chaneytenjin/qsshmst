import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const profilePath = new URL("../client/src/pages/Profile.tsx", import.meta.url);

describe("個人設定使用者 QR Code", () => {
  it("在個人資料提供伺服器簽章的短效動態 QR Code 與五分鐘自動輪替提示", () => {
    const source = readFileSync(profilePath, "utf8");
    expect(source).toContain('data-testid="profile-user-qr-code"');
    expect(source).toContain("trpc.profile.dynamicUserQrCode.useQuery");
    expect(source).toContain("dynamicUserQrCode.value");
    expect(source).toContain('data-testid="profile-user-qr-countdown"');
    expect(source).toContain("每 5 分鐘自動失效");
    expect(source).toContain("不會揭露姓名、電子郵件或其他個人資料");
    expect(source).toContain("dynamicUserQrRemainingSeconds <= 30");
    expect(source).toContain("即將到期：安全 QR Code 剩餘");
    expect(source).toContain("立即更新");
    expect(source).toContain("refetchDynamicUserQrCode()");
  });
});
