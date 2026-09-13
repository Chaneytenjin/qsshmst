import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: mocks.createTransport,
  },
}));

import { sendPasskeySecurityEmail } from "./passkeySecurityEmail";

describe("sendPasskeySecurityEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SMTP_HOST = "smtp.example.test";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_USER = "mailer@example.test";
    process.env.SMTP_PASS = "test-password";
    process.env.SMTP_FROM = "安全中心 <security@example.test>";
    mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail });
    mocks.sendMail.mockResolvedValue({ messageId: "message-1" });
  });

  it("寄送新增通行密鑰通知，並跳脫 HTML 中的帳戶與憑證名稱", async () => {
    await sendPasskeySecurityEmail({
      to: "student@example.test",
      username: "<學生&使用者>",
      action: "added",
      passkeyName: "我的 <iPhone>",
      registeredDeviceLabel: "iPhone",
      occurredAt: new Date("2026-08-12T03:30:00.000Z"),
      ipAddress: "198.51.100.27",
      deviceSummary: "Safari · macOS",
    });

    expect(mocks.createTransport).toHaveBeenCalledWith(expect.objectContaining({ host: "smtp.example.test", port: 465, secure: true }));
    expect(mocks.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: "student@example.test",
      from: "Media service management system <security@example.test>",
      subject: "[清水高中媒體服務隊管理系統] 通行密鑰已新增",
      text: expect.stringContaining("註冊裝置：iPhone"),
      html: expect.stringContaining("&lt;學生&amp;使用者&gt;"),
    }));
    expect(mocks.sendMail.mock.calls[0]?.[0]?.text).toContain("操作裝置：Safari · macOS");
    expect(mocks.sendMail.mock.calls[0]?.[0]?.text).toContain("來源 IP：198.51.100.27");
    expect(mocks.sendMail.mock.calls[0]?.[0]?.text).toContain("異動時間：2026/8/12");
    expect(mocks.sendMail.mock.calls[0]?.[0]?.html).toContain("我的 &lt;iPhone&gt;");
    expect(mocks.sendMail.mock.calls[0]?.[0]?.html).toContain("來源 IP</td><td style=\"padding:9px 0\">198.51.100.27");
    expect(mocks.sendMail.mock.calls[0]?.[0]?.text).toMatch(/來自 清水高中媒體服務隊管理系統\nCopyright ©2026清水高中媒體服務隊 All rights reserved$/);
    expect(mocks.sendMail.mock.calls[0]?.[0]?.html).toContain('data-system-mail-footer="true"');
  });

  it("寄送移除通行密鑰通知，且未提供裝置類型時使用明確替代文字", async () => {
    await sendPasskeySecurityEmail({
      to: "teacher@example.test",
      username: "teacher",
      action: "removed",
      passkeyName: "教室電腦",
    });

    expect(mocks.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      subject: "[清水高中媒體服務隊管理系統] 通行密鑰已移除",
      text: expect.stringContaining("註冊裝置：未記錄裝置類型"),
    }));
    expect(mocks.sendMail.mock.calls[0]?.[0]?.text).toContain("操作裝置：未記錄操作裝置");
    expect(mocks.sendMail.mock.calls[0]?.[0]?.text).toContain("來源 IP：未記錄來源 IP");
  });
});
