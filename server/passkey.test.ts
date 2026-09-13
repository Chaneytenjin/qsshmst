import { describe, expect, it } from "vitest";
import {
  PASSKEY_CHALLENGE_TTL_MS,
  base64UrlToUint8Array,
  describePasskeyRegistrationDevice,
  deriveWebAuthnUserId,
  getPasskeyRelyingParty,
  parsePasskeyTransports,
  serializePasskeyTransports,
  toWebAuthnCredential,
} from "./passkey";

describe("passkey helpers", () => {
  it("derives a deterministic non-guessable WebAuthn user handle", () => {
    const userHandle = deriveWebAuthnUserId(42);

    expect(userHandle).toBe(deriveWebAuthnUserId(42));
    expect(userHandle).not.toBe(deriveWebAuthnUserId(43));
    expect(Buffer.from(base64UrlToUint8Array(userHandle)).toString("utf8")).toBe("qingshui-passkey-user:42");
  });

  it("only accepts localhost or PUBLIC_APP_URL as a passkey relying party", () => {
    expect(getPasskeyRelyingParty({ headers: { host: "localhost:3000", "x-forwarded-proto": "http" }, protocol: "http" })).toEqual({
      rpID: "localhost",
      origin: "http://localhost:3000",
    });
    expect(() => getPasskeyRelyingParty({ headers: { host: "example.invalid" }, protocol: "https" })).toThrow("目前網站網域無法用於通行密鑰驗證");
  });

  it("uses a five-minute one-time challenge window", () => {
    expect(PASSKEY_CHALLENGE_TTL_MS).toBe(5 * 60 * 1000);
  });

  it("describes the device used to register a passkey without retaining the user agent", () => {
    expect(describePasskeyRegistrationDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)")).toBe("iPhone");
    expect(describePasskeyRegistrationDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)")).toBe("Mac");
    expect(describePasskeyRegistrationDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("Windows 電腦");
    expect(describePasskeyRegistrationDevice(undefined)).toBe("未知裝置");
  });

  it("keeps only supported transports and restores a WebAuthn credential", () => {
    const serialized = serializePasskeyTransports(["internal", "invalid", "hybrid"]);

    expect(serialized).toBe('["internal","hybrid"]');
    expect(parsePasskeyTransports(serialized)).toEqual(["internal", "hybrid"]);
    expect(parsePasskeyTransports('["invalid"]')).toBeUndefined();

    const credential = toWebAuthnCredential({
      credentialId: "credential-1",
      publicKey: Buffer.from([1, 2, 3, 4]).toString("base64url"),
      counter: 7,
      transports: serialized,
    });
    expect(credential.id).toBe("credential-1");
    expect([...credential.publicKey]).toEqual([1, 2, 3, 4]);
    expect(credential.counter).toBe(7);
    expect(credential.transports).toEqual(["internal", "hybrid"]);
  });
});
