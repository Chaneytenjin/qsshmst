import { describe, it, expect, beforeAll } from "vitest";
import { getDb, getUserById, upsertUser, getUserByUsername, unlockLoginAttempts, recordLoginFailure, getLoginFailureAttempts } from "./db";
import { hashPassword } from "./_core/password";

describe("User Management UI Features", () => {
  let testUserId: number;
  let founderUserId: number;
  const testUsername = `ui_test_${Date.now()}`;
  const founderUsername = "Chaney";

  beforeAll(async () => {
    // 創建測試用戶
    const hashedPassword = await hashPassword("TestPassword123");
    await upsertUser({
      username: testUsername,
      passwordHash: hashedPassword,
      name: "UI Test User",
      email: `ui_test_${Date.now()}@example.com`,
      role: "student",
      isTemporaryPassword: true,
    });

    // 獲取測試用戶 ID
    const user = await getUserByUsername(testUsername);
    if (!user) throw new Error("Failed to create test user");
    testUserId = user.id;

    // 獲取創始管理員 ID
    const founder = await getUserByUsername(founderUsername);
    if (!founder) throw new Error("Founder user not found");
    founderUserId = founder.id;
  });

  describe("getTempPassword", () => {
    it("應該返回臨時密碼狀態", async () => {
      const user = await getUserById(testUserId);
      expect(user?.isTemporaryPassword).toBe(true);
    });

    it("應該正確識別無臨時密碼的帳號", async () => {
      // 創建一個無臨時密碼的用戶
      const hashedPassword = await hashPassword("TestPassword123");
      const uniqueUsername = `no_temp_${Date.now()}_${Math.random()}`;
      await upsertUser({
        username: uniqueUsername,
        passwordHash: hashedPassword,
        name: "No Temp Password User",
        email: `no_temp_${Date.now()}@example.com`,
        role: "student",
        isTemporaryPassword: false,
      });

      const user = await getUserByUsername(uniqueUsername);
      expect(user?.isTemporaryPassword).toBe(false);
    });
  });

  describe("unlockLoginAttempts", () => {
    it("應該成功解除登入鎖定", async () => {
      // 先鎖定帳號
      await recordLoginFailure(testUserId);
      await recordLoginFailure(testUserId);
      await recordLoginFailure(testUserId);

      // 驗證帳號已被鎖定
      let attempts = await getLoginFailureAttempts(testUserId);
      expect(attempts?.lockedUntil).not.toBeNull();

      // 解除鎖定
      await unlockLoginAttempts(testUserId);

      // 驗證鎖定已被解除
      attempts = await getLoginFailureAttempts(testUserId);
      expect(attempts?.lockedUntil).toBeNull();
      expect(attempts?.attemptCount).toBe(0);
    });

    it("應該在解除鎖定時重置失敗計數", async () => {
      // 先鎖定帳號
      await recordLoginFailure(testUserId);
      await recordLoginFailure(testUserId);
      await recordLoginFailure(testUserId);

      // 解除鎖定
      await unlockLoginAttempts(testUserId);

      // 驗證失敗計數已重置
      const attempts = await getLoginFailureAttempts(testUserId);
      expect(attempts?.attemptCount).toBe(0);
    });
  });

  describe("User Management Permissions", () => {
    it("應該正確識別創始管理員", async () => {
      const founder = await getUserById(founderUserId);
      expect(founder?.isFounder).toBe(true);
    });

    it("應該正確識別普通用戶", async () => {
      const user = await getUserById(testUserId);
      expect(user?.isFounder).toBe(false);
    });
  });
});
