import nodemailer, { type Transporter } from "nodemailer";
import { appendSystemMailFooterHtml, appendSystemMailFooterText, getSystemMailFrom } from "./emailSender";

export type PasskeySecurityEmailInput = {
  to: string;
  username: string;
  action: "added" | "removed";
  passkeyName: string;
  registeredDeviceLabel?: string | null;
  occurredAt?: Date;
  ipAddress?: string | null;
  deviceSummary?: string | null;
};

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "465");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) throw new Error("SMTP passkey security notification settings are incomplete");

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

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character);
}

export async function sendPasskeySecurityEmail(input: PasskeySecurityEmailInput): Promise<void> {
  const actionLabel = input.action === "added" ? "新增" : "移除";
  const occurredAt = (input.occurredAt || new Date()).toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false });
  const deviceLabel = input.registeredDeviceLabel || "未記錄裝置類型";
  const ipAddress = input.ipAddress?.trim() || "未記錄來源 IP";
  const deviceSummary = input.deviceSummary?.trim() || "未記錄操作裝置";
  const text = appendSystemMailFooterText([
    "清水高中媒體服務隊管理系統｜通行密鑰安全通知",
    "",
    `帳號：${input.username}`,
    `動作：${actionLabel}通行密鑰`,
    `名稱：${input.passkeyName}`,
    `註冊裝置：${deviceLabel}`,
    `操作裝置：${deviceSummary}`,
    `來源 IP：${ipAddress}`,
    `異動時間：${occurredAt}`,
    "",
    input.action === "added"
      ? "您現在可以使用此通行密鑰，以 Face ID、Touch ID 或裝置解鎖方式登入系統"
      : "此通行密鑰已無法再用於登入系統",
    "若這不是您的操作，請立即改用其他登入方式進入帳戶安全頁，移除不明憑證並聯絡系統管理員",
  ].join("\n"));

  await getTransporter().sendMail({
    from: getSystemMailFrom(),
    to: input.to,
    subject: `[清水高中媒體服務隊管理系統] 通行密鑰已${actionLabel}`,
    text,
    html: appendSystemMailFooterHtml(`<main style="font-family:Arial,'Noto Sans TC',sans-serif;max-width:680px;margin:auto;border:1px solid #d5d9df;background:#ffffff;color:#17202a"><header style="padding:24px 28px;background:#10212f;color:#ffffff"><p style="margin:0 0 8px;font-size:12px;letter-spacing:1.6px">QINGSHUI HIGH SCHOOL · MEDIA SQUAD</p><h1 style="margin:0;font-size:24px">通行密鑰安全通知</h1></header><section style="padding:28px"><p style="margin-top:0">您的帳戶剛剛<strong>${escapeHtml(actionLabel)}</strong>了一組通行密鑰</p><table style="width:100%;border-collapse:collapse"><tbody><tr><td style="padding:9px 0;color:#52606d;width:34%">帳號</td><td style="padding:9px 0;font-weight:700">${escapeHtml(input.username)}</td></tr><tr><td style="padding:9px 0;color:#52606d">通行密鑰名稱</td><td style="padding:9px 0">${escapeHtml(input.passkeyName)}</td></tr><tr><td style="padding:9px 0;color:#52606d">註冊裝置</td><td style="padding:9px 0">${escapeHtml(deviceLabel)}</td></tr><tr><td style="padding:9px 0;color:#52606d">操作裝置</td><td style="padding:9px 0">${escapeHtml(deviceSummary)}</td></tr><tr><td style="padding:9px 0;color:#52606d">來源 IP</td><td style="padding:9px 0">${escapeHtml(ipAddress)}</td></tr><tr><td style="padding:9px 0;color:#52606d">異動時間</td><td style="padding:9px 0">${escapeHtml(occurredAt)}</td></tr></tbody></table><aside style="margin-top:22px;padding:14px 16px;border-left:4px solid #b42318;background:#fff4f2;color:#5c1d16;font-size:13px;line-height:1.65">若這不是您的操作，請立即使用其他登入方式進入帳戶安全頁，移除不明憑證並聯絡系統管理員</aside></section></main>`),
  });
}
