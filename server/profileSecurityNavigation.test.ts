import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const profilePath = new URL("../client/src/pages/Profile.tsx", import.meta.url);
const appPath = new URL("../client/src/App.tsx", import.meta.url);

describe("個人設定安全分區導覽", () => {
  it("以長條式入口導向各項獨立安全管理子頁", () => {
    const source = readFileSync(profilePath, "utf8");
    expect(source).toContain('data-testid="security-section-navigation"');
    expect(source).toContain("安全設定總覽");
    expect(source).toContain("登入密碼");
    expect(source).not.toContain("登入保護");
    expect(source).toContain("雙因素與恢復");
    expect(source).toContain("通行密鑰");
    expect(source).toContain("設備與安全活動");
    expect(source).toContain('href={`/profile/security/${id}`}');
    expect(source).toContain('showSecuritySection("password")');
    expect(source).toContain('showSecuritySection("two-factor")');
    expect(source).toContain('showSecuritySection("passkeys")');
    expect(source).toContain('showSecuritySection("devices")');
    expect(source).not.toContain("scrollToSecuritySection(id)");
  });

  it("註冊受保護的安全設定子頁路由，並拒絕未定義分區", () => {
    const source = readFileSync(appPath, "utf8");
    expect(source).toContain('path="/profile/security"');
    expect(source).toContain('<Profile initialTab="security" />');
    expect(source).toContain('path="/profile/security/:section"');
    expect(source).toContain('const profileSecuritySections = ["password", "two-factor", "passkeys", "devices"] as const;');
    expect(source).toContain("isProfileSecuritySection(securitySection)");
    expect(source).toContain('<Profile initialTab="security" securitySection={securitySection} />');
  });

  it("在四個安全子頁呈現可存取的麵包屑與返回上一頁控制", () => {
    const source = readFileSync(profilePath, "utf8");
    expect(source).toContain("const securitySectionLabels: Record<SecuritySection, string>");
    expect(source).toContain('aria-label="安全設定麵包屑導覽"');
    expect(source).toContain('href="/profile/security"');
    expect(source).toContain('aria-current="page"');
    expect(source).toContain("{securitySectionLabels[securitySection]}");
    expect(source).toContain('aria-label="返回上一頁：安全設定總覽"');
    expect(source).toContain("<ChevronLeft");
    expect(source).toContain("返回上一頁");
  });

  it("安全設定總覽只保留子分頁入口，不重複呈現已移至子頁的內容", () => {
    const source = readFileSync(profilePath, "utf8");
    expect(source).toContain("const showSecuritySection = (section: SecuritySection) => securitySection === section;");
    expect(source).not.toContain("!securitySection || securitySection === section");
    expect(source).not.toContain("安全提示");
  });

  it("持續執行密碼更換週期的背景查詢，但不呈現週期資訊卡", () => {
    const source = readFileSync(profilePath, "utf8");
    expect(source).toContain("trpc.profile.passwordChangeStatus.useQuery");
    expect(source).not.toContain("passwordChangeStatus?.applies && <div");
  });
});
