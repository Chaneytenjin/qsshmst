import nodemailer, { type Transporter } from "nodemailer";
import { appendSystemMailFooterHtml, appendSystemMailFooterText, getSystemMailFrom } from "./emailSender";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "465");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) throw new Error("SMTP borrow reminder settings are incomplete");
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

export async function sendBorrowReturnReminder(input: {
  to: string;
  borrowerLabel: string;
  equipmentName: string;
  expectedReturnAt: Date;
  reminderType: "due_soon" | "overdue";
  dashboardUrl: string;
}): Promise<void> {
  const dueAt = input.expectedReturnAt.toLocaleString("zh-TW", { timeZone: "Asia/Taipei", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
  const isOverdue = input.reminderType === "overdue";
  const title = isOverdue ? "器材逾期歸還提醒" : "器材明日到期提醒";
  const body = isOverdue
    ? `您借用的「${input.equipmentName}」已超過應歸還時間請儘速歸還，或聯繫管理人員處理`
    : `您借用的「${input.equipmentName}」將於明日到期請預先安排歸還，或聯繫管理人員處理`;
  await getTransporter().sendMail({
    from: getSystemMailFrom(),
    to: input.to,
    subject: `[清水高中媒體服務隊管理系統] ${title}`,
    text: appendSystemMailFooterText([
      `清水高中媒體服務隊管理系統｜${title}`,
      "",
      `帳號：${input.borrowerLabel}`,
      `器材：${input.equipmentName}`,
      `應歸還時間：${dueAt}`,
      body,
      "",
      `前往系統查看：${input.dashboardUrl}`,
    ].join("\n")),
    html: appendSystemMailFooterHtml(`<main style="font-family:Arial,'Noto Sans TC',sans-serif;max-width:680px;margin:auto;border:1px solid #d5d9df;background:#ffffff;color:#17202a"><header style="padding:24px 28px;background:${isOverdue ? "#8b1e1e" : "#10212f"};color:#ffffff"><p style="margin:0 0 8px;font-size:12px;letter-spacing:1.6px">QINGSHUI HIGH SCHOOL · MEDIA SQUAD</p><h1 style="margin:0;font-size:24px">${title}</h1></header><section style="padding:28px"><p>您好，<strong>${escapeHtml(input.borrowerLabel)}</strong></p><p>${escapeHtml(body)}</p><dl style="margin:20px 0;padding:16px;background:#f4f7f9"><dt style="font-size:12px;color:#52606d">器材</dt><dd style="margin:4px 0 14px;font-weight:700">${escapeHtml(input.equipmentName)}</dd><dt style="font-size:12px;color:#52606d">應歸還時間</dt><dd style="margin:4px 0;font-weight:700">${escapeHtml(dueAt)}</dd></dl><p style="margin:26px 0"><a href="${input.dashboardUrl}" style="display:inline-block;padding:12px 18px;background:#0d7490;color:#ffffff;text-decoration:none;font-weight:700">前往系統查看</a></p><p style="color:#52606d;font-size:13px;line-height:1.7">此訊息由每日提醒程序自動發送；完成歸還後，後續提醒會停止</p></section></main>`),
  });
}
