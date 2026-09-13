import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const sendMail = vi.fn().mockResolvedValue({ messageId: "activation-certificate-test" });
  const buildAccountActivationCertificatePdf = vi.fn().mockResolvedValue(Buffer.from("%PDF-1.7\nactivation-certificate"));
  return {
    sendMail,
    createTransport: vi.fn(() => ({ sendMail })),
    buildAccountActivationCertificatePdf,
  };
});

vi.mock("nodemailer", () => ({ default: { createTransport: mocks.createTransport } }));
vi.mock("./accountActivationCertificatePdf", () => ({ buildAccountActivationCertificatePdf: mocks.buildAccountActivationCertificatePdf }));

import { buildAccountActivationCertificate, sendAccountActivationCertificate } from "./accountActivationEmail";

describe("帳號啟用書郵件", () => {
  const account = { id: 42, username: "media-student", name: "媒體同學", role: "student" as const, createdAt: new Date("2026-08-12T00:00:00.000Z") };

  beforeEach(() => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_USER = "sender@example.com";
    process.env.SMTP_PASS = "test-password";
    process.env.SMTP_FROM = "清水媒服系統 <sender@example.com>";
    vi.clearAllMocks();
  });

  it("以帳號 ID 與建立時間產生可追溯的啟用書編號", () => {
    const certificate = buildAccountActivationCertificate(account);
    expect(certificate.certificateNumber).toMatch(/^QSM-ACT-42-/);
    expect(certificate.accountLabel).toBe("media-student");
  });

  it("無可用臨時密碼時會明確標示用戶已更改密碼，且不會寄出任何登入憑證", async () => {
    const certificate = await sendAccountActivationCertificate({ to: "recipient@example.com", account, assetBaseUrl: "https://app.example.com" });
    expect(certificate.certificateNumber).toMatch(/^QSM-ACT-42-/);
    expect(mocks.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: "recipient@example.com",
      from: "Media service management system <sender@example.com>",
      subject: expect.stringContaining("帳號啟用書"),
      text: expect.stringContaining("啟用書編號"),
      html: expect.stringContaining("帳號啟用書"),
      attachments: [expect.objectContaining({
        filename: "清水高中媒體服務隊管理系統-帳號啟用書-42.pdf",
        content: Buffer.from("%PDF-1.7\nactivation-certificate"),
        contentType: "application/pdf",
      })],
    }));
    const message = mocks.sendMail.mock.calls[0]?.[0];
    expect(message.text).toContain("密碼狀態：用戶已更改密碼");
    expect(message.text).not.toMatch(/臨時密碼：|驗證碼：/);
    expect(message.text).toMatch(/來自 清水高中媒體服務隊管理系統\nCopyright ©2026清水高中媒體服務隊 All rights reserved$/);
    expect(message.html).toContain('data-system-mail-footer="true"');
    expect(message.html).toContain("Copyright ©2026清水高中媒體服務隊 All rights reserved");
    expect(mocks.buildAccountActivationCertificatePdf).toHaveBeenCalledWith(expect.objectContaining({
      account,
      certificate: expect.objectContaining({ certificateNumber: certificate.certificateNumber }),
      isTemporaryPassword: false,
      assetBaseUrl: "https://app.example.com",
    }));
  });

  it("僅在受控呼叫端提供臨時密碼時才會將其帶入啟用書", async () => {
    const temporaryPassword = "Qingshui-Temp-87";
    await sendAccountActivationCertificate({ to: "recipient@example.com", account, temporaryPassword, assetBaseUrl: "https://app.example.com" });

    const message = mocks.sendMail.mock.calls[0]?.[0];
    expect(message.text).toContain(`臨時密碼：${temporaryPassword}`);
    expect(message.html).toContain(temporaryPassword);
    expect(message.text).not.toContain("用戶已更改密碼");
    expect(mocks.buildAccountActivationCertificatePdf).toHaveBeenLastCalledWith(expect.objectContaining({
      isTemporaryPassword: true,
      assetBaseUrl: "https://app.example.com",
    }));
    expect(mocks.buildAccountActivationCertificatePdf.mock.calls.at(-1)?.[0]).not.toHaveProperty("temporaryPassword");
  });
});
