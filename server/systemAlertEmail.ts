import nodemailer, { type Transporter } from "nodemailer";
import { appendSystemMailFooterText, getSystemMailFrom } from "./emailSender";
import {
  createSystemAlertEmailDelivery,
  getLatestSystemAlertEmailDelivery,
  getSystemAlertEmailRecipients,
} from "./db";

const ALERT_COOLDOWN_MS = 15 * 60 * 1000;
const MAIL_SUBJECT = "清水高中媒體服務隊管理系統";

export type SystemAlertEmailInput = {
  eventKey: string;
  source: string;
  title: string;
  summary: string;
  details?: string[];
  force?: boolean;
  kind?: "alert" | "summary";
};

export type SystemAlertEmailResult = {
  sent: number;
  failed: number;
  suppressed: number;
  recipients: number;
};

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "465");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP notification settings are incomplete");
  }

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

function formatMessage(input: SystemAlertEmailInput): string {
  const lines = [
    input.kind === "summary" ? "清水高中媒體服務隊管理系統每日維護摘要" : "清水高中媒體服務隊管理系統偵測到異常",
    "",
    `事件：${input.title}`,
    `來源：${input.source}`,
    `摘要：${input.summary}`,
    `時間：${new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}`,
  ];

  if (input.details?.length) {
    lines.push("", "補充資訊：", ...input.details.filter(Boolean).map((detail) => `- ${detail}`));
  }

  lines.push("", "此為系統自動通知，請登入系統確認狀況");
  return appendSystemMailFooterText(lines.join("\n"));
}

function getErrorDetail(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 1000);
  return String(error).slice(0, 1000);
}

export async function sendSystemAlertEmail(input: SystemAlertEmailInput): Promise<SystemAlertEmailResult> {
  const recipients = await getSystemAlertEmailRecipients(false);
  const result: SystemAlertEmailResult = { sent: 0, failed: 0, suppressed: 0, recipients: recipients.length };
  if (recipients.length === 0) return result;

  const eventKey = input.eventKey.slice(0, 191);
  const source = input.source.slice(0, 128);
  const subject = MAIL_SUBJECT;
  const text = formatMessage(input);
  const now = Date.now();

  for (const recipient of recipients) {
    const lastSent = await getLatestSystemAlertEmailDelivery(eventKey, recipient.email, "sent");
    if (!input.force && lastSent && now - new Date(lastSent.createdAt).getTime() < ALERT_COOLDOWN_MS) {
      await createSystemAlertEmailDelivery({
        recipientId: recipient.id,
        recipientEmail: recipient.email,
        eventKey,
        source,
        subject,
        status: "suppressed",
        errorDetail: "同類異常於 15 分鐘內已通知，略過重複寄送",
      });
      result.suppressed += 1;
      continue;
    }

    try {
      await getTransporter().sendMail({
        from: getSystemMailFrom(),
        to: recipient.email,
        subject,
        text,
      });
      await createSystemAlertEmailDelivery({
        recipientId: recipient.id,
        recipientEmail: recipient.email,
        eventKey,
        source,
        subject,
        status: "sent",
      });
      result.sent += 1;
    } catch (error) {
      await createSystemAlertEmailDelivery({
        recipientId: recipient.id,
        recipientEmail: recipient.email,
        eventKey,
        source,
        subject,
        status: "failed",
        errorDetail: getErrorDetail(error),
      });
      result.failed += 1;
      console.error("[SystemAlertEmail] Delivery failed", { recipientId: recipient.id, eventKey });
    }
  }

  return result;
}
