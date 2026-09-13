import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { ENV } from "./_core/env";

const VERSION = "v1";

function key(): Buffer {
  return createHash("sha256").update(ENV.cookieSecret).digest();
}

export function encryptActivationCertificateRecipient(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptActivationCertificateRecipient(value: string): string {
  const [version, iv, tag, ciphertext] = value.split(".");
  if (version !== VERSION || !iv || !tag || !ciphertext) throw new Error("Invalid activation certificate recipient ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}
