import { describe, expect, it } from "vitest";
import { decryptActivationCertificateRecipient, encryptActivationCertificateRecipient } from "./activationCertificateRecipientVault";

describe("啟用書收件地址加密保存", () => {
  it("以 AES-GCM 保存收件地址，密文不含明文且可正確解密", () => {
    const email = "recipient@example.com";
    const ciphertext = encryptActivationCertificateRecipient(email);

    expect(ciphertext).not.toContain(email);
    expect(decryptActivationCertificateRecipient(ciphertext)).toBe(email);
  });
});
