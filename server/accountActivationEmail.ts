import nodemailer, { type Transporter } from "nodemailer";
import { randomBytes } from "node:crypto";
import { buildAccountActivationCertificatePdf } from "./accountActivationCertificatePdf";
import { appendSystemMailFooterHtml, appendSystemMailFooterText, getSystemMailFrom } from "./emailSender";

export type ActivationCertificateAccount = {
  id: number;
  username: string | null;
  name: string | null;
  role: "admin" | "teacher" | "student";
  createdAt: Date;
};

export type ActivationCertificate = {
  certificateNumber: string;
  verificationToken: string;
  issuedAt: Date;
  accountLabel: string;
};

export type AccountActivationCertificatePdfArtifact = {
  certificate: ActivationCertificate;
  pdf: Buffer;
  fileName: string;
};

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "465");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) throw new Error("SMTP activation certificate settings are incomplete");

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

function formatRole(role: ActivationCertificateAccount["role"]): string {
  return { admin: "管理員", teacher: "教師", student: "學生" }[role];
}

export function buildAccountActivationCertificate(account: ActivationCertificateAccount): ActivationCertificate {
  const createdAt = new Date(account.createdAt);
  const suffix = Number.isFinite(createdAt.getTime()) ? createdAt.getTime().toString(36).toUpperCase() : "UNKNOWN";
  return {
    certificateNumber: `QSM-ACT-${account.id}-${suffix}`,
    verificationToken: randomBytes(24).toString("base64url"),
    issuedAt: new Date(),
    accountLabel: account.username || account.name || `帳號 #${account.id}`,
  };
}

export async function sendAccountActivationCertificate(input: { to: string; account: ActivationCertificateAccount; temporaryPassword?: string | null; assetBaseUrl: string; onPdfGenerated?: (artifact: AccountActivationCertificatePdfArtifact) => Promise<void> }): Promise<ActivationCertificate> {
  const certificate = buildAccountActivationCertificate(input.account);
  const issuedAt = certificate.issuedAt.toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false });
  const accountName = input.account.name || certificate.accountLabel;
  const username = input.account.username || "未設定自訂帳號";
  const role = formatRole(input.account.role);
  const hasTemporaryPassword = Boolean(input.temporaryPassword);
  const credentialText = hasTemporaryPassword
    ? [
        "",
        "登入憑證（請安全轉交帳號本人）",
        `臨時密碼：${input.temporaryPassword}`,
        "請於首次登入後立即修改密碼；此密碼自產生起僅 12 小時有效，完成變更後也會立即失效",
      ]
    : [
        "",
        "密碼狀態：用戶已更改密碼",
        "系統不會再次寄送或顯示先前的臨時密碼",
      ];
  const credentialHtml = hasTemporaryPassword
    ? `<section style="margin-top:22px;padding:18px;border:1px solid #d6a629;background:#fff8dd;color:#382a00"><p style="margin:0 0 8px;font-weight:700">登入憑證（請安全轉交帳號本人）</p><p style="margin:0 0 10px">臨時密碼</p><p style="margin:0 0 10px;padding:10px 12px;background:#ffffff;border:1px solid #d6a629;font-family:monospace;font-size:16px;font-weight:700;letter-spacing:.06em">${escapeHtml(input.temporaryPassword || "")}</p><p style="margin:0;font-size:13px;line-height:1.6">請於首次登入後立即修改密碼；此密碼自產生起僅 12 小時有效，完成變更後系統將不再保存</p></section>`
    : `<aside style="margin-top:22px;padding:14px 16px;border-left:4px solid #1e6fa8;background:#eef6fb;color:#28475e;font-size:13px;line-height:1.6">密碼狀態：<strong>用戶已更改密碼</strong>系統不會再次寄送或顯示先前的臨時密碼</aside>`;
  const certificatePdf = await buildAccountActivationCertificatePdf({
    account: input.account,
    certificate,
    isTemporaryPassword: hasTemporaryPassword,
    assetBaseUrl: input.assetBaseUrl,
  });
  const fileName = `清水高中媒體服務隊管理系統-帳號啟用書-${input.account.id}.pdf`;
  await input.onPdfGenerated?.({ certificate, pdf: certificatePdf, fileName });

  await getTransporter().sendMail({
    from: getSystemMailFrom(),
    to: input.to,
    subject: `[清水高中媒體服務隊管理系統] 帳號啟用書｜${certificate.accountLabel}`,
    text: appendSystemMailFooterText([
      "清水高中媒體服務隊管理系統｜帳號啟用書",
      "",
      `啟用書編號：${certificate.certificateNumber}`,
      `帳號名稱：${username}`,
      `姓名／顯示名稱：${accountName}`,
      `系統角色：${role}`,
      `帳號建立時間：${new Date(input.account.createdAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false })}`,
      `發行時間：${issuedAt}`,
      ...credentialText,
      "",
      "此文件證明上述帳號已由系統管理員建立並處於啟用狀態若您非預期收件人，請聯絡系統管理員並刪除此郵件",
    ].join("\n")),
    html: appendSystemMailFooterHtml(`<main style="font-family:Arial,'Noto Sans TC',sans-serif;max-width:680px;margin:auto;border:1px solid #d5d9df;background:#ffffff;color:#17202a"><header style="padding:24px 28px;background:#10212f;color:#ffffff"><p style="margin:0 0 8px;font-size:12px;letter-spacing:1.6px">QINGSHUI HIGH SCHOOL · MEDIA SQUAD</p><h1 style="margin:0;font-size:26px">帳號啟用書</h1></header><section style="padding:28px"><p style="margin-top:0;color:#52606d">此文件由清水高中媒體服務隊器材管理系統發行</p><table style="width:100%;border-collapse:collapse"><tbody><tr><td style="padding:10px 0;color:#52606d;width:36%">啟用書編號</td><td style="padding:10px 0;font-weight:700">${escapeHtml(certificate.certificateNumber)}</td></tr><tr><td style="padding:10px 0;color:#52606d">帳號名稱</td><td style="padding:10px 0;font-weight:700">${escapeHtml(username)}</td></tr><tr><td style="padding:10px 0;color:#52606d">姓名／顯示名稱</td><td style="padding:10px 0">${escapeHtml(accountName)}</td></tr><tr><td style="padding:10px 0;color:#52606d">系統角色</td><td style="padding:10px 0">${escapeHtml(role)}</td></tr><tr><td style="padding:10px 0;color:#52606d">帳號建立時間</td><td style="padding:10px 0">${escapeHtml(new Date(input.account.createdAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false }))}</td></tr><tr><td style="padding:10px 0;color:#52606d">發行時間</td><td style="padding:10px 0">${escapeHtml(issuedAt)}</td></tr></tbody></table>${credentialHtml}</section></main>`),
    attachments: [{
      filename: fileName,
      content: certificatePdf,
      contentType: "application/pdf",
    }],
  });

  return certificate;
}
