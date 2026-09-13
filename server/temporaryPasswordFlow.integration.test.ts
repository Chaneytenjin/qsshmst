import { afterAll, describe, expect, it, vi } from "vitest";

const emailMocks = vi.hoisted(() => ({
  sendAccountActivationCertificate: vi.fn().mockResolvedValue({ certificateNumber: "QSM-ACT-E2E-TEST" }),
}));

vi.mock("./accountActivationEmail", () => ({
  sendAccountActivationCertificate: emailMocks.sendAccountActivationCertificate,
}));

vi.mock("./accountActivationCertificatePdf", () => ({
  buildAccountActivationCertificatePdf: vi.fn().mockResolvedValue(Buffer.from("ci-test-pdf")),
}));

import { appRouter } from "./routers";
import { deleteUser, getUserByUsername } from "./db";
import { decryptTemporaryPassword } from "./temporaryPasswordVault";

let createdUserId: number | undefined;

function createAdminCaller() {
  return appRouter.createCaller({
    user: { id: 3570001, username: "Chaney", name: "Chaney", role: "admin", isFounder: true },
    req: {
      protocol: "https",
      get: (name: string) => name.toLowerCase() === "host" ? "app.example.test" : undefined,
    } as any,
    res: {} as any,
  });
}

describe("帳號建立至啟用書的受控臨時密碼流程", () => {
  afterAll(async () => {
    if (createdUserId) await deleteUser(createdUserId);
  });

  it("建立帳號後只在受控回傳與啟用書伺服器呼叫中提供明文，資料庫只保存密文", async () => {
    const caller = createAdminCaller();
    const created = await caller.users.create({
      name: "整合流程驗證帳號",
      email: "integration-certificate@example.com",
      role: "student",
    });
    const persisted = await getUserByUsername(created.username);
    if (!persisted) throw new Error("端到端測試帳號未建立");
    createdUserId = persisted.id;

    expect(persisted.passwordHash).not.toBe(created.tempPassword);
    expect(persisted.temporaryPasswordCiphertext).toBeTruthy();
    expect(persisted.temporaryPasswordCiphertext).not.toContain(created.tempPassword);
    expect(decryptTemporaryPassword(persisted.temporaryPasswordCiphertext!)).toBe(created.tempPassword);

    await caller.users.sendActivationCertificate({ id: persisted.id, recipientEmail: "integration-certificate@example.com" });
    expect(emailMocks.sendAccountActivationCertificate).toHaveBeenLastCalledWith(expect.objectContaining({
      to: "integration-certificate@example.com",
      account: expect.objectContaining({ id: persisted.id, username: created.username }),
      temporaryPassword: created.tempPassword,
      assetBaseUrl: "https://app.example.test",
    }));

    const reset = await caller.users.resetPassword({ id: persisted.id });
    const afterReset = await getUserByUsername(created.username);
    expect(afterReset?.temporaryPasswordCiphertext).toBeTruthy();
    expect(reset).toEqual({ success: true, temporaryPasswordGenerated: true });
    expect(reset).not.toHaveProperty("tempPassword");
    const resetTemporaryPassword = decryptTemporaryPassword(afterReset!.temporaryPasswordCiphertext!);
    expect(resetTemporaryPassword).not.toBe(created.tempPassword);
    expect(resetTemporaryPassword).toMatch(/^[A-Za-z0-9!@#$%^&*]{8}$/);
  }, 15_000);
});
