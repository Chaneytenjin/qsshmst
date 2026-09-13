import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { Secret, TOTP } from "otpauth";
import { ENV } from "./_core/env";

const ISSUER = "清水高中媒體服務隊管理系統";
const ENCRYPTION_VERSION = "v1";

function getEncryptionKey() {
  if (!ENV.cookieSecret) throw new Error("Two-factor encryption key is unavailable");
  return createHash("sha256").update(ENV.cookieSecret).digest();
}

function createTotp(secret: Secret, username: string) {
  return new TOTP({
    issuer: ISSUER,
    label: username,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret,
  });
}

export function createTwoFactorSetup(username: string) {
  const secret = new Secret({ size: 20 });
  const totp = createTotp(secret, username);
  return {
    secret: secret.base32,
    otpAuthUri: totp.toString(),
  };
}

export function encryptTwoFactorSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [ENCRYPTION_VERSION, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptTwoFactorSecret(encryptedSecret: string) {
  const [version, ivValue, tagValue, ciphertext] = encryptedSecret.split(".");
  if (version !== ENCRYPTION_VERSION || !ivValue || !tagValue || !ciphertext) throw new Error("Invalid encrypted two-factor secret");
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}

export function verifyTwoFactorCode(secret: string, username: string, code: string) {
  if (!/^\d{6}$/.test(code)) return false;
  const delta = createTotp(Secret.fromBase32(secret), username).validate({ token: code, window: 1 });
  return delta !== null;
}

const RECOVERY_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const RECOVERY_CODE_LENGTH = 12;

export function normalizeTwoFactorRecoveryCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidTwoFactorRecoveryCode(code: string) {
  return new RegExp(`^[${RECOVERY_CODE_ALPHABET}]{${RECOVERY_CODE_LENGTH}}$`).test(normalizeTwoFactorRecoveryCode(code));
}

export function createTwoFactorRecoveryCode() {
  let value = "";
  while (value.length < RECOVERY_CODE_LENGTH) {
    const byte = randomBytes(1)[0];
    const maxUnbiasedValue = Math.floor(256 / RECOVERY_CODE_ALPHABET.length) * RECOVERY_CODE_ALPHABET.length;
    if (byte >= maxUnbiasedValue) continue;
    value += RECOVERY_CODE_ALPHABET[byte % RECOVERY_CODE_ALPHABET.length];
  }
  return `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8)}`;
}

export async function hashTwoFactorRecoveryCode(code: string) {
  return bcrypt.hash(normalizeTwoFactorRecoveryCode(code), 12);
}

export async function verifyTwoFactorRecoveryCodeHash(code: string, codeHash: string) {
  if (!isValidTwoFactorRecoveryCode(code)) return false;
  return bcrypt.compare(normalizeTwoFactorRecoveryCode(code), codeHash);
}

export function describeLoginDevice(userAgent: string) {
  const browser = /Edg\//.test(userAgent) ? "Microsoft Edge" : /Chrome\//.test(userAgent) ? "Google Chrome" : /Safari\//.test(userAgent) && !/Chrome\//.test(userAgent) ? "Safari" : /Firefox\//.test(userAgent) ? "Firefox" : "未知瀏覽器";
  const platform = /iPhone|iPad|iPod/.test(userAgent) ? "iOS" : /Android/.test(userAgent) ? "Android" : /Windows/.test(userAgent) ? "Windows" : /Mac OS/.test(userAgent) ? "macOS" : /Linux/.test(userAgent) ? "Linux" : "未知裝置";
  return `${browser} · ${platform}`;
}
