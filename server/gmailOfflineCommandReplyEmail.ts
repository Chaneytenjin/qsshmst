import nodemailer, { type Transporter } from "nodemailer";
import { appendSystemMailFooterHtml, appendSystemMailFooterText, getSystemMailFrom } from "./emailSender";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "465");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) throw new Error("SMTP offline command reply settings are incomplete");
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

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character);
}

export async function sendGmailOfflineCommandSuccessReply(input: {
  to: string;
  messageId: string;
  resultingMode: "offline" | "already_offline";
}): Promise<void> {
  const wasAlreadyOffline = input.resultingMode === "already_offline";
  const resultLabel = wasAlreadyOffline ? "系統原已處於離線模式" : "系統已成功切換為離線模式";
  const safeMessageId = input.messageId.replace(/[\r\n]/g, "").trim();
  const text = [
    "清水高中媒體服務隊管理系統｜離線指令執行結果",
    "",
    "您好，",
    `您的授權離線指令已完成驗證與執行${resultLabel}`,
    "系統會持續保留本次指令收件、處理與回覆結果的稽核紀錄",
  ].join("\n");
  const html = `<main style="font-family:Arial,'Noto Sans TC',sans-serif;max-width:680px;margin:auto;border:1px solid #d5d9df;background:#ffffff;color:#17202a"><header style="padding:24px 28px;background:#10212f;color:#ffffff"><p style="margin:0 0 8px;font-size:12px;letter-spacing:1.6px">QINGSHUI HIGH SCHOOL · MEDIA SQUAD</p><h1 style="margin:0;font-size:24px">離線指令執行結果</h1></header><section style="padding:28px"><p>您好，</p><p>您的授權離線指令已完成驗證與執行<strong>${escapeHtml(resultLabel)}</strong></p><p style="color:#52606d;font-size:13px;line-height:1.7">系統會持續保留本次指令收件、處理與回覆結果的稽核紀錄</p></section></main>`;

  await getTransporter().sendMail({
    from: getSystemMailFrom(),
    to: input.to,
    subject: "[清水高中媒體服務隊管理系統] 離線指令執行結果",
    ...(safeMessageId ? { inReplyTo: safeMessageId, references: safeMessageId } : {}),
    text: appendSystemMailFooterText(text),
    html: appendSystemMailFooterHtml(html),
  });
}
