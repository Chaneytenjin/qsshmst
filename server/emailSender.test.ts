import { afterEach, describe, expect, it } from "vitest";
import { appendSystemMailFooterHtml, appendSystemMailFooterText, getSystemMailFrom, SYSTEM_MAIL_FOOTER_LINES, SYSTEM_MAIL_SENDER_NAME } from "./emailSender";

describe("系統郵件寄件者", () => {
  const savedFrom = process.env.SMTP_FROM;
  const savedUser = process.env.SMTP_USER;

  afterEach(() => {
    process.env.SMTP_FROM = savedFrom;
    process.env.SMTP_USER = savedUser;
  });

  it("保留 SMTP 實際地址並強制使用指定的顯示名稱", () => {
    process.env.SMTP_FROM = "任何舊名稱 <notification@example.test>";
    process.env.SMTP_USER = "sender@example.test";
    expect(getSystemMailFrom()).toBe(`${SYSTEM_MAIL_SENDER_NAME} <notification@example.test>`);
  });

  it("未設定 SMTP_FROM 時使用 SMTP_USER 作為實際地址", () => {
    delete process.env.SMTP_FROM;
    process.env.SMTP_USER = "sender@example.test";
    expect(getSystemMailFrom()).toBe(`${SYSTEM_MAIL_SENDER_NAME} <sender@example.test>`);
  });

  it("在純文字與 HTML 郵件最後附上指定的來源與版權兩行文字", () => {
    expect(appendSystemMailFooterText("既有內容")).toBe(`既有內容\n\n${SYSTEM_MAIL_FOOTER_LINES.join("\n")}`);

    const html = appendSystemMailFooterHtml("<main><p>既有內容</p></main>");
    expect(html).toContain("data-system-mail-footer=\"true\"");
    expect(html).toMatch(/來自 清水高中媒體服務隊管理系統<\/div><div>Copyright ©2026清水高中媒體服務隊 All rights reserved<\/div><\/footer><\/main>$/);
  });
});
