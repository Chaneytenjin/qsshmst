import nodemailer from "nodemailer";
import { afterAll, describe, expect, it } from "vitest";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || "465");
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

const hasSmtpCredentials = process.env.STANDALONE_ENABLE_NETWORK_TESTS === "true" && Boolean(smtpHost && smtpUser && smtpPass);

const transporter = hasSmtpCredentials
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      connectionTimeout: 12_000,
      greetingTimeout: 12_000,
      socketTimeout: 12_000,
    })
  : null;

describe("SMTP 設定（選擇性網路驗證）", () => {
  it.skipIf(!hasSmtpCredentials)("可使用設定的帳號完成 SMTP 驗證", async () => {
    await expect(transporter!.verify()).resolves.toBe(true);
  });
});

afterAll(async () => {
  transporter?.close();
});
