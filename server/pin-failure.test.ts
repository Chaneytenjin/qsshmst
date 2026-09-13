import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { getDb, recordPinFailure, getPinFailureAttempts, isPinLocked, getPinLockTimeRemaining, resetPinFailureAttempts, getLoginPinFailureAttempts, getLoginPinLockTimeRemaining, isLoginPinLocked, recordLoginPinFailure, resetLoginPinFailureAttempts, upsertUser, getUserByUsername } from "./db";
import { hashPassword } from "./_core/password";

describe("PIN Failure Rate Limiting", () => {
  let testUserId: number;
  const testUsername = `pin_test_${Date.now()}`;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    // 建立測試用戶
    const hashedPassword = await hashPassword("TestPassword123");
    await upsertUser({
      username: testUsername,
      passwordHash: hashedPassword,
      name: "PIN Test User",
      email: `pin_test_${Date.now()}@example.com`,
      role: "student",
    });

    // 取得使用者 ID（使用 username 查詢）
    const user = await getUserByUsername(testUsername);
    if (!user) throw new Error("Failed to create test user");
    testUserId = user.id;
  });

  describe("recordPinFailure", () => {
    it("應該記錄 PIN 失敗嘗試", async () => {
      // 先重置失敗計數
      await resetPinFailureAttempts(testUserId);
      
      // 記錄第一次失敗
      await recordPinFailure(testUserId);
      
      const attempts = await getPinFailureAttempts(testUserId);
      expect(attempts).toBeDefined();
      expect(attempts?.attemptCount).toBe(1);
    });

    it("應該累加失敗計數", async () => {
      // 重置並記錄多次失敗
      await resetPinFailureAttempts(testUserId);
      
      await recordPinFailure(testUserId);
      await recordPinFailure(testUserId);
      await recordPinFailure(testUserId);
      
      const attempts = await getPinFailureAttempts(testUserId);
      expect(attempts?.attemptCount).toBe(3);
    });
  });

  describe("isPinLocked", () => {
    it("失敗次數少於 3 次時不應該被鎖定", async () => {
      await resetPinFailureAttempts(testUserId);
      
      await recordPinFailure(testUserId);
      await recordPinFailure(testUserId);
      
      const isLocked = await isPinLocked(testUserId);
      expect(isLocked).toBe(false);
    });

    it("失敗次數達到 3 次時應該被鎖定", async () => {
      await resetPinFailureAttempts(testUserId);
      
      await recordPinFailure(testUserId);
      await recordPinFailure(testUserId);
      await recordPinFailure(testUserId);
      
      const isLocked = await isPinLocked(testUserId);
      expect(isLocked).toBe(true);
    });
  });

  describe("getPinLockTimeRemaining", () => {
    it("應該返回剩餘鎖定時間（秒）", async () => {
      await resetPinFailureAttempts(testUserId);
      
      // 記錄 3 次失敗以觸發鎖定
      await recordPinFailure(testUserId);
      await recordPinFailure(testUserId);
      await recordPinFailure(testUserId);
      
      const remainingSeconds = await getPinLockTimeRemaining(testUserId);
      expect(remainingSeconds).toBeGreaterThan(0);
      expect(remainingSeconds).toBeLessThanOrEqual(900); // 15 分鐘 = 900 秒
    });

    it("未被鎖定的帳號應該返回 0", async () => {
      await resetPinFailureAttempts(testUserId);
      
      const remainingSeconds = await getPinLockTimeRemaining(testUserId);
      expect(remainingSeconds).toBe(0);
    });
  });

  describe("resetPinFailureAttempts", () => {
    it("應該重置失敗計數", async () => {
      // 先記錄失敗
      await recordPinFailure(testUserId);
      await recordPinFailure(testUserId);
      
      let attempts = await getPinFailureAttempts(testUserId);
      expect(attempts?.attemptCount).toBe(2);
      
      // 重置
      await resetPinFailureAttempts(testUserId);
      
      attempts = await getPinFailureAttempts(testUserId);
      expect(attempts?.attemptCount ?? 0).toBe(0);
    });

    it("重置後應該不被鎖定", async () => {
      // 先記錄 3 次失敗
      await resetPinFailureAttempts(testUserId);
      await recordPinFailure(testUserId);
      await recordPinFailure(testUserId);
      await recordPinFailure(testUserId);
      
      let isLocked = await isPinLocked(testUserId);
      expect(isLocked).toBe(true);
      
      // 重置
      await resetPinFailureAttempts(testUserId);
      
      isLocked = await isPinLocked(testUserId);
      expect(isLocked).toBe(false);
    });
  });

  describe("登入 PIN 與稽核 PIN 鎖定隔離", () => {
    it("會分別記錄失敗次數，且登入 PIN 鎖定不影響稽核 PIN", async () => {
      await resetPinFailureAttempts(testUserId);
      await resetLoginPinFailureAttempts(testUserId);

      await recordPinFailure(testUserId);
      await recordLoginPinFailure(testUserId);
      await recordLoginPinFailure(testUserId);
      await recordLoginPinFailure(testUserId);

      const auditAttempts = await getPinFailureAttempts(testUserId);
      const loginAttempts = await getLoginPinFailureAttempts(testUserId);
      expect(auditAttempts?.attemptCount).toBe(1);
      expect(loginAttempts?.attemptCount).toBe(3);
      expect(await isPinLocked(testUserId)).toBe(false);
      expect(await isLoginPinLocked(testUserId)).toBe(true);
      expect(await getLoginPinLockTimeRemaining(testUserId)).toBeGreaterThan(0);
    });

    it("重設其中一組 PIN 的鎖定狀態時，不會重設另一組", async () => {
      await resetPinFailureAttempts(testUserId);
      await resetLoginPinFailureAttempts(testUserId);
      await recordPinFailure(testUserId);
      await recordPinFailure(testUserId);
      await recordLoginPinFailure(testUserId);

      await resetLoginPinFailureAttempts(testUserId);

      expect((await getLoginPinFailureAttempts(testUserId))?.attemptCount ?? 0).toBe(0);
      expect((await getPinFailureAttempts(testUserId))?.attemptCount).toBe(2);
      expect(await isPinLocked(testUserId)).toBe(false);
      expect(await isLoginPinLocked(testUserId)).toBe(false);
    });
  });

  afterAll(async () => {
    // 清理測試資料
    try {
      if (testUserId) {
        await resetPinFailureAttempts(testUserId);
        await resetLoginPinFailureAttempts(testUserId);
      }
    } catch (error) {
      console.log("Cleanup error (expected if user doesn't exist):", error);
    }
  });
});
