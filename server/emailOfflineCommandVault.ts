import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { ENV } from "./_core/env";

const VERSION = "v1";
const CONTEXT = "qssh-email-offline-command";

function encryptionKey() {
  if (!ENV.cookieSecret) throw new Error("郵件離線指令加密金鑰無法使用");
  return createHash("sha256").update(`${CONTEXT}:${ENV.cookieSecret}`).digest();
}

export function encryptEmailOfflineCommandSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptEmailOfflineCommandSecret(value: string) {
  const [version, iv, tag, ciphertext] = value.split(".");
  if (version !== VERSION || !iv || !tag || !ciphertext) throw new Error("無效的郵件離線指令密文");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}
