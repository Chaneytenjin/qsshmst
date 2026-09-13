import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => {
  process.env.DATABASE_URL = "mysql://passkey-test";
  const state = {
    challenge: null as { id: number; expiresAt: Date; challenge: string; type: "authentication" | "registration" } | null,
    selectedCredential: null as { id: number } | null,
    inserted: [] as unknown[],
    updated: [] as unknown[],
    deletedCount: 0,
  };
  const rows = () => {
    const selected = state.challenge ?? state.selectedCredential;
    const result = selected ? [selected] : [];
    return Object.assign(result, { for: vi.fn(async () => result) });
  };
  const transactionDb = {
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(rows) })) })) })),
    delete: vi.fn(() => ({ where: vi.fn(async () => { state.deletedCount += 1; state.challenge = null; }) })),
  };
  const db = {
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(rows) })) })) })),
    insert: vi.fn(() => ({ values: vi.fn(async (value: unknown) => { state.inserted.push(value); }) })),
    update: vi.fn(() => ({ set: vi.fn((value: unknown) => ({ where: vi.fn(async () => { state.updated.push(value); }) })) })),
    delete: vi.fn(() => ({ where: vi.fn(async () => { state.deletedCount += 1; }) })),
    transaction: vi.fn(async (callback: (tx: typeof transactionDb) => unknown) => callback(transactionDb)),
  };
  return { state, db };
});

vi.mock("drizzle-orm/mysql2", () => ({ drizzle: vi.fn(() => database.db) }));

import {
  consumePasskeyChallenge,
  createPasskeyCredential,
  deletePasskeyCredential,
  renamePasskeyCredential,
  updatePasskeyCredentialUsage,
} from "./db";

describe("passkey database access", () => {
  beforeEach(() => {
    database.state.challenge = null;
    database.state.selectedCredential = null;
    database.state.inserted.length = 0;
    database.state.updated.length = 0;
    database.state.deletedCount = 0;
    vi.clearAllMocks();
  });

  it("保存憑證，並在登入完成後更新簽章計數器與裝置備份狀態", async () => {
    await createPasskeyCredential({
      userId: 77,
      credentialId: "credential-77",
      publicKey: "AQID",
      counter: 0,
      deviceType: "multiDevice",
      backedUp: true,
      name: "我的 iPhone",
      transports: "[\"internal\"]",
    });
    await updatePasskeyCredentialUsage({ credentialId: "credential-77", counter: 5, deviceType: "multiDevice", backedUp: true });

    expect(database.state.inserted).toHaveLength(1);
    expect(database.state.inserted[0]).toMatchObject({ credentialId: "credential-77", userId: 77, counter: 0 });
    expect(database.state.updated[0]).toMatchObject({ counter: 5, deviceType: "multiDevice", backedUp: true, lastUsedAt: expect.any(Date), updatedAt: expect.any(Date) });
  });

  it("只允許憑證擁有者重新命名或移除憑證", async () => {
    database.state.selectedCredential = { id: 16, credentialId: "credential-77", name: "我的 iPad", registeredDeviceLabel: "iPad" };

    await expect(renamePasskeyCredential(77, "credential-77", "教室 iPad")).resolves.toBe(true);
    await expect(deletePasskeyCredential(77, "credential-77")).resolves.toMatchObject({ id: 16, credentialId: "credential-77", name: "我的 iPad", registeredDeviceLabel: "iPad" });
    expect(database.state.updated[0]).toMatchObject({ name: "教室 iPad", updatedAt: expect.any(Date) });
    expect(database.state.deletedCount).toBe(1);

    database.state.selectedCredential = null;
    await expect(renamePasskeyCredential(77, "other-credential", "不應更新")).resolves.toBe(false);
    await expect(deletePasskeyCredential(77, "other-credential")).resolves.toBeNull();
  });

  it("以交易鎖定並刪除挑戰，使同一挑戰無法被重複使用", async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    database.state.challenge = { id: 55, challenge: "one-time-challenge", type: "authentication", expiresAt };

    await expect(consumePasskeyChallenge("one-time-challenge", "authentication")).resolves.toMatchObject({ id: 55, challenge: "one-time-challenge" });
    await expect(consumePasskeyChallenge("one-time-challenge", "authentication")).resolves.toBeNull();
    expect(database.state.deletedCount).toBe(1);
  });

  it("即使挑戰已逾時也會刪除，不會留下可重播的驗證資料", async () => {
    database.state.challenge = { id: 56, challenge: "expired-challenge", type: "authentication", expiresAt: new Date(Date.now() - 1_000) };

    await expect(consumePasskeyChallenge("expired-challenge", "authentication")).resolves.toBeNull();
    expect(database.state.deletedCount).toBe(1);
  });
});
