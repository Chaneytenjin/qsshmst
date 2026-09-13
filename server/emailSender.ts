export const SYSTEM_MAIL_SENDER_NAME = "Media service management system";
export const SYSTEM_MAIL_FOOTER_LINES = [
  "來自 清水高中媒體服務隊管理系統",
  "Copyright ©2026清水高中媒體服務隊 All rights reserved",
] as const;

const SYSTEM_MAIL_FOOTER_HTML = `<footer data-system-mail-footer="true" style="margin-top:28px;padding-top:16px;border-top:1px solid #d5d9df;color:#52606d;font-size:12px;line-height:1.7"><div>來自 清水高中媒體服務隊管理系統</div><div>Copyright ©2026清水高中媒體服務隊 All rights reserved</div></footer>`;

function extractMailAddress(value: string): string {
  const angleAddress = value.match(/<\s*([^<>\s]+@[^<>\s]+)\s*>/);
  if (angleAddress?.[1]) return angleAddress[1];
  return value.trim();
}

/** 統一所有系統郵件的可見寄件者名稱；SMTP_FROM 僅提供實際寄件地址 */
export function getSystemMailFrom(): string {
  const configuredAddress = process.env.SMTP_FROM || process.env.SMTP_USER || "";
  const address = extractMailAddress(configuredAddress);
  return address ? `${SYSTEM_MAIL_SENDER_NAME} <${address}>` : SYSTEM_MAIL_SENDER_NAME;
}

/** 在純文字郵件的最後附上統一系統來源與版權尾註 */
export function appendSystemMailFooterText(message: string): string {
  return `${message.trimEnd()}\n\n${SYSTEM_MAIL_FOOTER_LINES.join("\n")}`;
}

/** 在 HTML 郵件的主要內容結尾附上與純文字版本相同的兩行尾註 */
export function appendSystemMailFooterHtml(html: string): string {
  const trimmedHtml = html.trimEnd();
  if (trimmedHtml.includes('data-system-mail-footer="true"')) return trimmedHtml;
  if (/<\/main>$/i.test(trimmedHtml)) {
    return trimmedHtml.replace(/<\/main>$/i, `${SYSTEM_MAIL_FOOTER_HTML}</main>`);
  }
  return `${trimmedHtml}${SYSTEM_MAIL_FOOTER_HTML}`;
}
