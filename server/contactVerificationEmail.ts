import nodemailer, { type Transporter } from "nodemailer";
import { appendSystemMailFooterText, getSystemMailFrom } from "./emailSender";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "465");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) throw new Error("SMTP verification settings are incomplete");

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 12_000,
      greetingTimeout: 12_000,
      socketTimeout: 12_000,
    });
  }
  return transporter;
}

export async function sendEmailVerificationCode(input: { to: string; code: string; expiresInMinutes: number }): Promise<void> {
  await getTransporter().sendMail({
    from: getSystemMailFrom(),
    to: input.to,
    subject: "[清水高中媒體服務隊管理系統] 電子郵件驗證碼",
    text: appendSystemMailFooterText([
      "您正在驗證清水高中媒體服務隊管理系統的電子郵件地址",
      "",
      `驗證碼：${input.code}`,
      `此驗證碼將於 ${input.expiresInMinutes} 分鐘後失效，請勿提供給他人`,
      "",
      "若您未提出此要求，請忽略此郵件",
    ].join("\n")),
  });
}
