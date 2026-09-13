import type { AccountActivationCertificatePdfArtifact } from "./accountActivationEmail";
import { createAccountActivationCertificateExport, getAccountActivationCertificateExportByVerificationToken } from "./db";
import { storagePut } from "./storage";

export type ActivationCertificateExportSource = "email_attachment" | "preview" | "manual_download";

export async function storeAccountActivationCertificatePdf(input: {
  accountId: number;
  generatedById: number;
  source: ActivationCertificateExportSource;
  artifact: AccountActivationCertificatePdfArtifact;
}) {
  const documentKey = `activation-certificates/${input.accountId}/${input.artifact.certificate.verificationToken}.pdf`;
  const stored = await storagePut(documentKey, input.artifact.pdf, "application/pdf");
  await createAccountActivationCertificateExport({
    accountId: input.accountId,
    generatedById: input.generatedById,
    certificateNumber: input.artifact.certificate.certificateNumber,
    verificationToken: input.artifact.certificate.verificationToken,
    storageKey: stored.key,
    fileName: input.artifact.fileName,
    source: input.source,
  });
  const record = await getAccountActivationCertificateExportByVerificationToken(input.artifact.certificate.verificationToken);
  if (!record) throw new Error("啟用書文件紀錄建立失敗");
  return record;
}
