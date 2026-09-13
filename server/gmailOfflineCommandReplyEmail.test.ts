import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
}));

vi.mock("nodemailer", () => ({
  default: { createTransport: mocks.createTransport },
}));

import { sendGmailOfflineCommandSuccessReply } from "./gmailOfflineCommandReplyEmail";

describe("Gmail 離線指令成功回覆郵件", () => {
  const savedEnvironment = {
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM,
  };

  beforeEach(() => {
    process.env.SMTP_HOST = "smtp.example.test";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_USER = "sender@example.test";
    process.env.SMTP_PASS = "test-password";
    process.env.SMTP_FROM = "系統 <sender@example.test>";
    mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail });
    mocks.sendMail.mockReset().mockResolvedValue({ messageId: "offline-command-reply-test" });
  });

  afterEach(() => {
    Object.assign(process.env, savedEnvironment);
  });

  it("成功切換離線後以系統寄件者回覆原始寄件者，並保留郵件串接資訊與統一頁尾", async () => {
    await sendGmailOfflineCommandSuccessReply({
      to: "founder@example.test",
      messageId: "<gmail-command-001@example.test>",
      resultingMode: "offline",
    });

    expect(mocks.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: "Media service management system <sender@example.test>",
      to: "founder@example.test",
      subject: "[清水高中媒體服務隊管理系統] 離線指令執行結果",
      inReplyTo: "<gmail-command-001@example.test>",
      references: "<gmail-command-001@example.test>",
      text: expect.stringContaining("系統已成功切換為離線模式"),
      html: expect.stringContaining("系統已成功切換為離線模式"),
    }));
    const message = mocks.sendMail.mock.calls[0]?.[0];
    expect(message.text).toMatch(/來自 清水高中媒體服務隊管理系統\nCopyright ©2026清水高中媒體服務隊 All rights reserved$/);
    expect(message.html).toContain('data-system-mail-footer="true"');
  });

  it("針對已離線的成功指令仍回覆實際執行狀態", async () => {
    await sendGmailOfflineCommandSuccessReply({
      to: "founder@example.test",
      messageId: "<gmail-command-002@example.test>",
      resultingMode: "already_offline",
    });

    expect(mocks.sendMail).toHaveBeenLastCalledWith(expect.objectContaining({
      text: expect.stringContaining("系統原已處於離線模式"),
      html: expect.stringContaining("系統原已處於離線模式"),
    }));
  });
});
