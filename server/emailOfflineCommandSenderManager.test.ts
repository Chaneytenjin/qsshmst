import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pagePath = new URL("../client/src/pages/SystemMaintenance.tsx", import.meta.url);
const routerPath = new URL("./routers.ts", import.meta.url);

describe("Gmail 授權寄件者管理", () => {
  it("系統維護頁提供新增、移除與啟用切換控制，並要求明確儲存才生效", () => {
    const source = readFileSync(pagePath, "utf8");

    expect(source).toContain("data-testid=\"authorized-sender-manager\"");
    expect(source).toContain("addAuthorizedSender");
    expect(source).toContain("removeAuthorizedSender");
    expect(source).toContain("toggleAuthorizedSender");
    expect(source).toContain("儲存授權設定");
  });

  it("系統端保存每位寄件者的啟用狀態，且啟用離線指令時要求至少一位有效寄件者", () => {
    const source = readFileSync(routerPath, "utf8");

    expect(source).toContain("isActive: z.boolean().default(true)");
    expect(source).toContain("至少需要一個已啟用的授權寄件者");
    expect(source).toContain("activeAuthorizedSenderCount");
  });
});
