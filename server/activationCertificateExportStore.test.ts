import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createExport: vi.fn(),
  getExportByToken: vi.fn(),
  storagePut: vi.fn(),
}));

vi.mock("./db", () => ({
  createAccountActivationCertificateExport: mocks.createExport,
  getAccountActivationCertificateExportByVerificationToken: mocks.getExportByToken,
}));
vi.mock("./storage", () => ({ storagePut: mocks.storagePut }));

import { storeAccountActivationCertificatePdf } from "./activationCertificateExportStore";

describe("啟用書 PDF 匯出儲存", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.storagePut.mockResolvedValue({ key: "activation-certificates/42/token-123.pdf", url: "/manus-storage/activation-certificates/42/token-123.pdf" });
    mocks.getExportByToken.mockResolvedValue({ id: 9, verificationToken: "token-123" });
  });

  it("保存 PDF 並建立含專屬驗證權杖的下載稽核紀錄", async () => {
    const artifact = {
      certificate: { certificateNumber: "QSM-ACT-42-TEST", verificationToken: "token-123", issuedAt: new Date("2026-08-13T00:00:00.000Z"), accountLabel: "student" },
      pdf: Buffer.from("%PDF-1.7"),
      fileName: "清水媒體服務隊-帳號啟用書-42.pdf",
    };

    const record = await storeAccountActivationCertificatePdf({ accountId: 42, generatedById: 1, source: "manual_download", artifact });

    expect(mocks.storagePut).toHaveBeenCalledWith("activation-certificates/42/token-123.pdf", artifact.pdf, "application/pdf");
    expect(mocks.createExport).toHaveBeenCalledWith(expect.objectContaining({
      accountId: 42,
      generatedById: 1,
      certificateNumber: "QSM-ACT-42-TEST",
      verificationToken: "token-123",
      storageKey: "activation-certificates/42/token-123.pdf",
      source: "manual_download",
    }));
    expect(record).toEqual({ id: 9, verificationToken: "token-123" });
  });
});
