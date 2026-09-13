import nodemailer, { type Transporter } from "nodemailer";
import { appendSystemMailFooterHtml, appendSystemMailFooterText, getSystemMailFrom } from "./emailSender";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "465");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) throw new Error("SMTP password reminder settings are incomplete");
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

export async function sendPasswordChangeReminder(input: { to: string; accountLabel: string; passwordChangedAt: Date; profileUrl: string }): Promise<void> {
  const changedAt = input.passwordChangedAt.toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei", year: "numeric", month: "long", day: "numeric" });
  const text = appendSystemMailFooterText([
    "清水高中媒體服務隊管理系統｜密碼更換提醒",
    "",
    `帳號：${input.accountLabel}`,
    `上次密碼更新：${changedAt}`,
    "您的密碼已達 180 天更換週期為維護帳號安全，請登入系統後於「個人設定」更新密碼",
    "",
    `前往個人設定：${input.profileUrl}`,
    "本提醒每次密碼週期只會寄送一次；更新密碼後，下一個 180 天週期將重新開始",
  ].join("\n"));
  await getTransporter().sendMail({
    from: getSystemMailFrom(),
    to: input.to,
    subject: "[清水高中媒體服務隊管理系統] 密碼已達更換週期",
    text,
    html: appendSystemMailFooterHtml(`<main style="font-family:Arial,'Noto Sans TC',sans-serif;max-width:680px;margin:auto;border:1px solid #d5d9df;background:#ffffff;color:#17202a"><header style="padding:24px 28px;background:#10212f;color:#ffffff"><p style="margin:0 0 8px;font-size:12px;letter-spacing:1.6px">QINGSHUI HIGH SCHOOL · MEDIA SQUAD</p><h1 style="margin:0;font-size:24px">密碼更換提醒</h1></header><section style="padding:28px"><p>您好，<strong>${input.accountLabel.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character)}</strong></p><p>您的密碼已於 <strong>${changedAt}</strong> 更新，現已達 <strong>180 天</strong>更換週期為維護帳號安全，請登入系統後於「個人設定」更新密碼</p><p style="margin:26px 0"><a href="${input.profileUrl}" style="display:inline-block;padding:12px 18px;background:#0d7490;color:#ffffff;text-decoration:none;font-weight:700">前往個人設定更新密碼</a></p><p style="color:#52606d;font-size:13px;line-height:1.7">本提醒每次密碼週期只會寄送一次；更新密碼後，下一個 180 天週期將重新開始</p></section></main>`),
  });
}
