import { createHmac, timingSafeEqual } from "node:crypto";

export const DYNAMIC_USER_QR_PREFIX = "QSSH-USER-V2";
export const DYNAMIC_USER_QR_TTL_MS = 5 * 60_000;

type DynamicUserQrCodeClaims = {
  userId: number;
  window: number;
};

function getSigningSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("動態使用者 QR Code 簽章設定未完成");
  return secret;
}

function createSignature(userId: number, window: number) {
  return createHmac("sha256", getSigningSecret())
    .update(`${DYNAMIC_USER_QR_PREFIX}.${userId}.${window}`)
    .digest("base64url");
}

function getWindow(now: number) {
  return Math.floor(now / DYNAMIC_USER_QR_TTL_MS);
}

export function issueDynamicUserQrCode(userId: number, now = Date.now()) {
  if (!Number.isSafeInteger(userId) || userId <= 0) throw new Error("使用者識別碼無效");
  const window = getWindow(now);
  const expiresAt = (window + 1) * DYNAMIC_USER_QR_TTL_MS;
  const signature = createSignature(userId, window);
  return {
    value: `${DYNAMIC_USER_QR_PREFIX}:${userId}:${window}:${signature}`,
    expiresAt: new Date(expiresAt),
    expiresInSeconds: Math.max(1, Math.ceil((expiresAt - now) / 1_000)),
  };
}

function isSignatureValid(expected: string, actual: string) {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

export function verifyDynamicUserQrCode(value: string, now = Date.now()): DynamicUserQrCodeClaims | null {
  const match = value.trim().match(/^QSSH-USER-V2:(\d+):(\d+):([A-Za-z0-9_-]+)$/i);
  if (!match) return null;

  const userId = Number(match[1]);
  const window = Number(match[2]);
  const signature = match[3];
  if (!Number.isSafeInteger(userId) || userId <= 0 || !Number.isSafeInteger(window) || window !== getWindow(now)) return null;

  const expectedSignature = createSignature(userId, window);
  return isSignatureValid(expectedSignature, signature) ? { userId, window } : null;
}
