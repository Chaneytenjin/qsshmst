import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("新增帳號的系統產生與必填資料規則", () => {
  it("前端不提供帳號輸入，且要求姓名與電子郵件", () => {
    const page = readFileSync("client/src/pages/UserManage.tsx", "utf8");

    expect(page).toContain("系統自動產生帳號");
    expect(page).not.toContain('register("username"');
    expect(page).toContain('register("name", { required: "請填寫姓名"');
    expect(page).toContain('register("email", { required: "請填寫 Email"');
    expect(page).toContain('aria-invalid={Boolean(errors.name)}');
    expect(page).toContain('aria-invalid={Boolean(errors.email)}');
    expect(page).toContain('帳號建立成功：${result.username}');
    expect(page).toContain("啟用通知信已寄至 ${result.recipientEmail}");
  });

  it("後端忽略外部帳號名稱並以唯一系統帳號與必填姓名、信箱建立使用者", () => {
    const router = readFileSync("server/routers.ts", "utf8");

    expect(router).toContain("async function generateSystemManagedUsername");
    expect(router).toContain("const username = await generateSystemManagedUsername(input.role)");
    expect(router).toContain('name: z.string().trim().min(1, "姓名為必填")');
    expect(router).toContain('email: z.string().trim().email("請填寫有效電子郵件")');
    expect(router).toContain("usernameGeneratedBySystem: true");
    expect(router).toContain("autoSendAccountActivationCertificate");
    expect(router).toContain("activationEmailSent");
  });
});
