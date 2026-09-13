import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const sendMail = vi.fn();
  const close = vi.fn();
  return {
    sendMail,
    close,
    createTransport: vi.fn(() => ({ sendMail, close })),
    createSystemAlertEmailDelivery: vi.fn(),
    getLatestSystemAlertEmailDelivery: vi.fn(),
    getSystemAlertEmailRecipients: vi.fn(),
  };
});

vi.mock("nodemailer", () => ({
  default: { createTransport: mocks.createTransport },
}));

vi.mock("./db", () => ({
  createSystemAlertEmailDelivery: mocks.createSystemAlertEmailDelivery,
  getLatestSystemAlertEmailDelivery: mocks.getLatestSystemAlertEmailDelivery,
  getSystemAlertEmailRecipients: mocks.getSystemAlertEmailRecipients,
}));

import { sendSystemAlertEmail } from "./systemAlertEmail";

describe("sendSystemAlertEmail", () => {
  beforeEach(() => {
    process.env.SMTP_HOST = "smtp.gmail.com";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_USER = "sender@example.com";
    process.env.SMTP_PASS = "app-password";
    process.env.SMTP_FROM = "sender@example.com";
    mocks.sendMail.mockReset().mockResolvedValue({ messageId: "mail-1" });
    mocks.createSystemAlertEmailDelivery.mockReset().mockResolvedValue(undefined);
    mocks.getLatestSystemAlertEmailDelivery.mockReset().mockResolvedValue(undefined);
    mocks.getSystemAlertEmailRecipients.mockReset().mockResolvedValue([
      { id: 9, email: "alerts@example.com", label: "資訊組", isActive: true },
    ]);
  });

  it("寄送啟用收件人並記錄成功結果", async () => {
    const result = await sendSystemAlertEmail({
      eventKey: "logo-fallback:/dashboard",
      source: "品牌 Logo 監測",
      title: "Logo 載入失敗備援已啟用",
      summary: "儀表板已改用備援 Logo",
    });

    expect(result).toEqual({ sent: 1, failed: 0, suppressed: 0, recipients: 1 });
    expect(mocks.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: "Media service management system <sender@example.com>",
      to: "alerts@example.com",
      subject: "清水高中媒體服務隊管理系統",
      text: expect.stringContaining("Copyright ©2026清水高中媒體服務隊 All rights reserved"),
    }));
    expect(mocks.createSystemAlertEmailDelivery).toHaveBeenCalledWith(expect.objectContaining({
      recipientId: 9,
      recipientEmail: "alerts@example.com",
      status: "sent",
    }));
    const sentMessage = mocks.sendMail.mock.calls[0]?.[0] as { text: string };
    expect(sentMessage.text).not.toContain("補充資訊：");
    expect(sentMessage.text).toMatch(/來自 清水高中媒體服務隊管理系統\nCopyright ©2026清水高中媒體服務隊 All rights reserved$/);
  });

  it("在十五分鐘冷卻時間內抑制相同事件的重複寄送", async () => {
    mocks.getLatestSystemAlertEmailDelivery.mockResolvedValue({ createdAt: new Date() });

    const result = await sendSystemAlertEmail({
      eventKey: "logo-fallback:/dashboard",
      source: "品牌 Logo 監測",
      title: "Logo 載入失敗備援已啟用",
      summary: "儀表板已改用備援 Logo",
    });

    expect(result).toEqual({ sent: 0, failed: 0, suppressed: 1, recipients: 1 });
    expect(mocks.sendMail).not.toHaveBeenCalled();
    expect(mocks.createSystemAlertEmailDelivery).toHaveBeenCalledWith(expect.objectContaining({
      status: "suppressed",
      errorDetail: "同類異常於 15 分鐘內已通知，略過重複寄送",
    }));
  });
});
