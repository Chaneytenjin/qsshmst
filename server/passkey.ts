import type { AuthenticatorTransportFuture, WebAuthnCredential } from "@simplewebauthn/server";
import type { PasskeyCredential } from "../drizzle/schema";
import { ENV } from "./_core/env";

export const PASSKEY_CHALLENGE_TTL_MS = 5 * 60 * 1000;

const supportedTransports = new Set<AuthenticatorTransportFuture>([
  "ble",
  "cable",
  "hybrid",
  "internal",
  "nfc",
  "smart-card",
  "usb",
]);

export type PasskeyRelyingParty = {
  rpID: string;
  origin: string;
};

export function deriveWebAuthnUserId(userId: number) {
  return Buffer.from(`qingshui-passkey-user:${userId}`, "utf8").toString("base64url");
}

export function base64UrlToUint8Array(value: string) {
  return new Uint8Array(Buffer.from(value, "base64url"));
}

export function serializePasskeyTransports(transports?: readonly string[] | null) {
  if (!transports?.length) return null;
  const safeTransports = transports.filter((transport): transport is AuthenticatorTransportFuture => supportedTransports.has(transport as AuthenticatorTransportFuture));
  return safeTransports.length ? JSON.stringify(safeTransports) : null;
}

export function parsePasskeyTransports(value?: string | null): AuthenticatorTransportFuture[] | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return undefined;
    const safeTransports = parsed.filter((transport): transport is AuthenticatorTransportFuture => typeof transport === "string" && supportedTransports.has(transport as AuthenticatorTransportFuture));
    return safeTransports.length ? safeTransports : undefined;
  } catch {
    return undefined;
  }
}

export function toWebAuthnCredential(credential: Pick<PasskeyCredential, "credentialId" | "publicKey" | "counter" | "transports">): WebAuthnCredential {
  return {
    id: credential.credentialId,
    publicKey: base64UrlToUint8Array(credential.publicKey),
    counter: credential.counter,
    transports: parsePasskeyTransports(credential.transports),
  };
}

export function describePasskeyRegistrationDevice(userAgent: unknown): string {
  const normalized = typeof userAgent === "string" ? userAgent : "";
  if (/iPhone/i.test(normalized)) return "iPhone";
  if (/iPad/i.test(normalized)) return "iPad";
  if (/Macintosh|Mac OS X/i.test(normalized)) return "Mac";
  if (/Android/i.test(normalized)) return "Android 裝置";
  if (/Windows NT/i.test(normalized)) return "Windows 電腦";
  if (/CrOS/i.test(normalized)) return "Chromebook";
  if (/Linux/i.test(normalized)) return "Linux 電腦";
  return "未知裝置";
}

export function getPasskeyRelyingParty(input: { headers: Record<string, unknown>; protocol?: string }): PasskeyRelyingParty {
  const forwardedHost = input.headers["x-forwarded-host"];
  const hostHeader = typeof forwardedHost === "string"
    ? forwardedHost
    : typeof input.headers.host === "string"
      ? input.headers.host
      : "";
  const host = hostHeader.split(",")[0]?.trim().toLowerCase() || "";
  const hostname = host.replace(/:\d+$/, "");
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  let configuredHost = "";
  try {
    configuredHost = new URL(ENV.publicAppUrl).hostname.toLowerCase();
  } catch {
    configuredHost = "";
  }
  const isConfiguredHost = Boolean(configuredHost) && hostname === configuredHost;

  if (!host || (!isLocal && !isConfiguredHost)) {
    throw new Error("目前網站網域無法用於通行密鑰驗證");
  }

  const forwardedProtocol = input.headers["x-forwarded-proto"];
  const candidateProtocol = typeof forwardedProtocol === "string"
    ? forwardedProtocol.split(",")[0]?.trim().toLowerCase()
    : input.protocol?.toLowerCase();
  const protocol = isLocal && candidateProtocol === "http" ? "http" : "https";

  return { rpID: hostname, origin: `${protocol}://${host}` };
}
