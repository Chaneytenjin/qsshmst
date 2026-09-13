import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn().mockResolvedValue({ messageId: "footer-test" }),
}));

vi.mock("nodemailer", () => ({
  default: { createTransport: mocks.createTransport },
}));

import { sendBorrowReturnReminder } from "./borrowReturnReminderEmail";
import { sendEmailVerificationCode } from "./contactVerificationEmail";
import { sendPasswordChangeReminder } from "./passwordChangeReminderEmail";

const footerPattern = /來自 清水高中媒體服務隊管理系統\nCopyright ©2026清水高中媒體服務隊 All rights reserved$/;

describe("其他系統郵件的統一尾註", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SMTP_HOST = "smtp.example.test";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_USER = "mailer@example.test";
    process.env.SMTP_PASS = "test-password";
    process.env.SMTP_FROM = "系統 <system@example.test>";
    mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail });
    mocks.sendMail.mockResolvedValue({ messageId: "footer-test" });
  });

  it("驗證碼、借還提醒與密碼提醒皆以指定文字結尾，HTML 版本也包含相同尾註", async () => {
    await sendEmailVerificationCode({ to: "student@example.test", code: "123456", expiresInMinutes: 10 });
    await sendBorrowReturnReminder({
      to: "student@example.test",
      borrowerLabel: "媒服同學",
      equipmentName: "攝影機",
      expectedReturnAt: new Date("2026-08-26T12:00:00.000Z"),
      reminderType: "due_soon",
      dashboardUrl: "https://app.example.test/dashboard",
    });
    await sendPasswordChangeReminder({
      to: "teacher@example.test",
      accountLabel: "媒服教師",
      passwordChangedAt: new Date("2026-02-27T00:00:00.000Z"),
      profileUrl: "https://app.example.test/profile",
    });

    expect(mocks.sendMail).toHaveBeenCalledTimes(3);
    const messages = mocks.sendMail.mock.calls.map(([message]) => message);
    for (const message of messages) {
      expect(message.text).toMatch(footerPattern);
    }
    for (const message of messages.filter((message) => message.html)) {
      expect(message.html).toContain('data-system-mail-footer="true"');
      expect(message.html).toContain("來自 清水高中媒體服務隊管理系統");
      expect(message.html).toContain("Copyright ©2026清水高中媒體服務隊 All rights reserved");
    }
  });
});
