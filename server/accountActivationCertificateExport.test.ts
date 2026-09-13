import { describe, expect, it } from "vitest";
import { buildAccountActivationCertificateHtml } from "../client/src/lib/accountActivationCertificateExport";

describe("帳號啟用書 PDF／列印內容", () => {
  it("只呈現帳號資訊與密碼狀態，不會輸出密碼或驗證碼", () => {
    const html = buildAccountActivationCertificateHtml({
      id: 42,
      username: "media-student",
      name: "媒體同學",
      role: "student",
      createdAt: new Date("2026-08-12T00:00:00.000Z"),
      isTemporaryPassword: true,
    });

    expect(html).toContain("QSM-ACT-42-");
    expect(html).toContain("待首次登入變更密碼");
    expect(html).toContain("本列印／PDF 文件不包含密碼、臨時密碼、驗證碼或其他登入憑證");
    expect(html).toContain("qingshui-media-service-circular-seal-alpha_cf98cb70.png");
    expect(html).toContain("清水高中媒體服務隊管理系統");
    expect(html).not.toContain("TemporaryPassword");
    expect(html).not.toContain("驗證碼：");
  });

  it("已完成首次變更的帳號會在輸出文件標示用戶已更改密碼", () => {
    const html = buildAccountActivationCertificateHtml({
      id: 43,
      username: "media-teacher",
      name: "媒體老師",
      role: "teacher",
      createdAt: new Date("2026-08-12T00:00:00.000Z"),
      isTemporaryPassword: false,
    });

    expect(html).toContain("用戶已更改密碼");
    expect(html).not.toContain("登入憑證（請安全轉交帳號本人）");
  });
});
