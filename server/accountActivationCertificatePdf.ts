import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import type { ActivationCertificate, ActivationCertificateAccount } from "./accountActivationEmail";

const FONT_PATH = "/storage/NotoSansCJKtc-Regular_ca19d3ec.otf";
const SEAL_PATH = "/storage/qingshui-media-service-circular-seal-alpha_cf98cb70.png";
const USER_ROUND_MARK_PATH = "/storage/qingshui-media-service-user-round-mark_fb0d86b2.png";
const SIGNATURE_FONT_PATH = "/storage/WindSong-Medium_edcce91e.ttf";
const WATERMARK_TEXT = "清水高中媒體服務隊管理系統";

let fontBufferPromise: Promise<Buffer> | null = null;
let sealBufferPromise: Promise<Buffer> | null = null;
let userRoundMarkBufferPromise: Promise<Buffer> | null = null;
let signatureFontBufferPromise: Promise<Buffer> | null = null;

export type AccountActivationCertificatePdfInput = {
  account: ActivationCertificateAccount;
  certificate: ActivationCertificate;
  isTemporaryPassword: boolean;
  assetBaseUrl: string;
};

function escapePdfText(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ");
}

function formatRole(role: ActivationCertificateAccount["role"]): string {
  return { admin: "管理員", teacher: "教師", student: "學生" }[role];
}

function formatDate(value: Date): string {
  return new Date(value).toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false });
}

async function getTraditionalChineseFont(assetBaseUrl: string): Promise<Buffer> {
  if (!fontBufferPromise) {
    const fontUrl = new URL(FONT_PATH, assetBaseUrl).toString();
    fontBufferPromise = fetch(fontUrl)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Unable to load PDF font (${response.status})`);
        return Buffer.from(await response.arrayBuffer());
      })
      .catch((error) => {
        fontBufferPromise = null;
        throw error;
      });
  }
  return fontBufferPromise;
}

async function getCircularAttachmentSeal(assetBaseUrl: string): Promise<Buffer> {
  if (!sealBufferPromise) {
    const sealUrl = new URL(SEAL_PATH, assetBaseUrl).toString();
    sealBufferPromise = fetch(sealUrl)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Unable to load activation certificate seal (${response.status})`);
        return Buffer.from(await response.arrayBuffer());
      })
      .catch((error) => {
        sealBufferPromise = null;
        throw error;
      });
  }
  return sealBufferPromise;
}

async function getActivationCertificateUserRoundMark(assetBaseUrl: string): Promise<Buffer> {
  if (!userRoundMarkBufferPromise) {
    const userRoundMarkUrl = new URL(USER_ROUND_MARK_PATH, assetBaseUrl).toString();
    userRoundMarkBufferPromise = fetch(userRoundMarkUrl)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Unable to load activation certificate user round mark (${response.status})`);
        return Buffer.from(await response.arrayBuffer());
      })
      .catch((error) => {
        userRoundMarkBufferPromise = null;
        throw error;
      });
  }
  return userRoundMarkBufferPromise;
}

async function getSignatureFont(assetBaseUrl: string): Promise<Buffer> {
  if (!signatureFontBufferPromise) {
    const fontUrl = new URL(SIGNATURE_FONT_PATH, assetBaseUrl).toString();
    signatureFontBufferPromise = fetch(fontUrl)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Unable to load PDF signature font (${response.status})`);
        return Buffer.from(await response.arrayBuffer());
      })
      .catch((error) => {
        signatureFontBufferPromise = null;
        throw error;
      });
  }
  return signatureFontBufferPromise;
}

export async function buildAccountActivationCertificatePdf(input: AccountActivationCertificatePdfInput): Promise<Buffer> {
  const verificationUrl = new URL("/certificate-verify", input.assetBaseUrl);
  verificationUrl.searchParams.set("code", input.certificate.verificationToken);
  const [fontBuffer, sealBuffer, userRoundMarkBuffer, signatureFontBuffer, qrCodeBuffer] = await Promise.all([
    getTraditionalChineseFont(input.assetBaseUrl),
    getCircularAttachmentSeal(input.assetBaseUrl),
    getActivationCertificateUserRoundMark(input.assetBaseUrl),
    getSignatureFont(input.assetBaseUrl),
    QRCode.toBuffer(verificationUrl.toString(), {
      type: "png",
      errorCorrectionLevel: "M",
      margin: 1,
      width: 240,
      color: { dark: "#10212f", light: "#ffffff" },
    }),
  ]);
  const accountLabel = input.account.username || input.account.name || `帳號 #${input.account.id}`;
  const rows: Array<[string, string]> = [
    ["啟用書編號", input.certificate.certificateNumber],
    ["帳號名稱", input.account.username || "未設定自訂帳號"],
    ["姓名／顯示名稱", input.account.name || accountLabel],
    ["系統角色", formatRole(input.account.role)],
    ["帳號建立時間", formatDate(input.account.createdAt)],
    ["發行時間", formatDate(input.certificate.issuedAt)],
  ];

  return new Promise<Buffer>((resolve, reject) => {
    const document = new PDFDocument({ size: "A4", margin: 48, info: { Title: "帳號啟用書", Author: "清水高中媒體服務隊管理系統" } });
    const chunks: Buffer[] = [];

    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    document.registerFont("NotoSansTC", fontBuffer);
    document.registerFont("WindSong", signatureFontBuffer);
    document.font("NotoSansTC");
    document.save();
    document.fillColor("#0e7490").opacity(0.065).fontSize(37).rotate(-33, { origin: [297, 412] }).text(WATERMARK_TEXT, 52, 394, { width: 490, align: "center" });
    document.restore();
    document.rect(48, 48, 499, 88).fill("#10212f");
    document.fillColor("#ffffff").fontSize(9).text("QINGSHUI HIGH SCHOOL · MEDIA SQUAD", 72, 70, { characterSpacing: 1.1 });
    document.fontSize(23).text("帳號啟用書", 72, 91);
    document.image(userRoundMarkBuffer, 459, 55, { fit: [70, 70] });
    document.fillColor("#52606d").fontSize(11).text("此文件由清水高中媒體服務隊管理系統發行，供帳號建置與實體存檔使用", 48, 164, { width: 499, lineGap: 4 });

    let y = 208;
    for (const [label, value] of rows) {
      document.strokeColor("#e5e7eb").lineWidth(0.8).moveTo(48, y + 30).lineTo(547, y + 30).stroke();
      document.fillColor("#52606d").fontSize(10).text(label, 56, y + 8, { width: 160 });
      document.fillColor("#17202a").fontSize(10).text(escapePdfText(value), 225, y + 8, { width: 314 });
      y += 38;
    }

    const status = input.isTemporaryPassword ? "待首次登入變更密碼" : "用戶已更改密碼";
    document.rect(48, y + 24, 499, 70).fill("#eef6fb");
    document.fillColor("#28475e").fontSize(11).text(`密碼狀態：${status}`, 64, y + 40);
    document.fontSize(9).text("本 PDF 不包含密碼、臨時密碼、驗證碼或其他登入憑證", 64, y + 62, { width: 460 });
    document.fillColor("#64748b").fontSize(8.5).text("若非預期持有人，請聯絡系統管理員系統不會透過本附件揭露登入憑證", 48, y + 116, { width: 330, lineGap: 3 });
    document.image(qrCodeBuffer, 440, y + 108, { fit: [88, 88] });
    document.fillColor("#52606d").fontSize(7.5).text("掃描 QR Code 驗證文件", 398, y + 201, { width: 145, align: "center" });
    document.fontSize(6.5).text("或至系統輸入啟用書編號查詢", 398, y + 212, { width: 145, align: "center" });
    const approvalY = y + 244;
    document.strokeColor("#cbd5e1").lineWidth(0.8).roundedRect(48, approvalY + 16, 212, 70, 4).stroke();
    document.strokeColor("#cbd5e1").lineWidth(0.8).roundedRect(280, approvalY + 16, 267, 70, 4).stroke();
    document.fillColor("#52606d").fontSize(8.5).text("文件簽核", 60, approvalY + 24, { characterSpacing: 0.8 });
    document.image(sealBuffer, 122, approvalY + 19, { fit: [64, 64] });
    document.fillColor("#52606d").fontSize(9).text("負責人", 296, approvalY + 24, { width: 235 });
    document.strokeColor("#94a3b8").lineWidth(0.7).moveTo(296, approvalY + 62).lineTo(531, approvalY + 62).stroke();
    document.font("WindSong").fillColor("#1f4d63").fontSize(33).text("Chaney", 308, approvalY + 28, { width: 190, align: "center" });
    document.end();
  });
}
