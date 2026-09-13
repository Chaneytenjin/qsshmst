import { describe, it, expect, beforeAll } from "vitest";
import { calculateNextLoginFailureState, LOGIN_FAILURE_LOCK_THRESHOLD, LOGIN_FAILURE_WINDOW_SECONDS, recordLoginFailure, getLoginFailureAttempts, isLoginLocked, getLoginLockTimeRemaining, resetLoginFailureAttempts, upsertUser, getUserByUsername, unlockLoginAttempts } from "./db";
import { hashPassword } from "./_core/password";

describe("Login Failure Rate Limiting", () => {
  let testUserId: number;
  const testUsername = `login_test_${Date.now()}`;

  beforeAll(async () => {
    // 建立測試用戶
    const hashedPassword = await hashPassword("TestPassword123");
    await upsertUser({
      username: testUsername,
      passwordHash: hashedPassword,
      name: "Login Test User",
      email: `login_test_${Date.now()}@example.com`,
      role: "student",
    });

    // 取得使用者 ID（使用 username 查詢）
    const user = await getUserByUsername(testUsername);
    if (!user) throw new Error("Failed to create test user");
    testUserId = user.id;
  });

  describe("recordLoginFailure", () => {
    it("應該記錄登入失敗嘗試", async () => {
      // 先重置失敗計數
      await resetLoginFailureAttempts(testUserId);
      
      // 記錄第一次失敗
      await recordLoginFailure(testUserId);
      
      const attempts = await getLoginFailureAttempts(testUserId);
      expect(attempts).toBeDefined();
      expect(attempts?.attemptCount).toBe(1);
    });

    it("應該累加失敗計數", async () => {
      // 重置並記錄多次失敗
      await resetLoginFailureAttempts(testUserId);
      
      await recordLoginFailure(testUserId);
      await recordLoginFailure(testUserId);
      await recordLoginFailure(testUserId);
      
      const attempts = await getLoginFailureAttempts(testUserId);
      expect(attempts?.attemptCount).toBe(3);
    });
  });

  describe("短時間異常登入偵測", () => {
    it("五分鐘內累積三次失敗時會產生鎖定時間", () => {
      const now = new Date("2026-08-12T01:00:00.000Z");
      const next = calculateNextLoginFailureState({
        attemptCount: LOGIN_FAILURE_LOCK_THRESHOLD - 1,
        lastAttemptAt: new Date(now.getTime() - LOGIN_FAILURE_WINDOW_SECONDS * 1000 + 1),
      }, now);

      expect(next.attemptCount).toBe(LOGIN_FAILURE_LOCK_THRESHOLD);
      expect(next.isWithinFailureWindow).toBe(true);
      expect(next.lockedUntil).toBeInstanceOf(Date);
    });

    it("超過五分鐘的舊失敗紀錄不會與新的登入失敗累積", () => {
      const now = new Date("2026-08-12T01:00:00.000Z");
      const next = calculateNextLoginFailureState({
        attemptCount: LOGIN_FAILURE_LOCK_THRESHOLD - 1,
        lastAttemptAt: new Date(now.getTime() - LOGIN_FAILURE_WINDOW_SECONDS * 1000 - 1),
      }, now);

      expect(next.attemptCount).toBe(1);
      expect(next.isWithinFailureWindow).toBe(false);
      expect(next.lockedUntil).toBeNull();
    });
  });

  describe("isLoginLocked", () => {
    it("失敗次數少於 3 次時不應該被鎖定", async () => {
      await resetLoginFailureAttempts(testUserId);
      
      await recordLoginFailure(testUserId);
      await recordLoginFailure(testUserId);
      
      const isLocked = await isLoginLocked(testUserId);
      expect(isLocked).toBe(false);
    });

    it("失敗次數達到 3 次時應該被鎖定", async () => {
      await resetLoginFailureAttempts(testUserId);
      
      await recordLoginFailure(testUserId);
      await recordLoginFailure(testUserId);
      await recordLoginFailure(testUserId);
      
      const isLocked = await isLoginLocked(testUserId);
      expect(isLocked).toBe(true);
    });
  });

  describe("getLoginLockTimeRemaining", () => {
    it("應該返回剩餘鎖定時間（秒）", async () => {
      await resetLoginFailureAttempts(testUserId);
      
      await recordLoginFailure(testUserId);
      await recordLoginFailure(testUserId);
      await recordLoginFailure(testUserId);
      
      const remainingTime = await getLoginLockTimeRemaining(testUserId);
      expect(remainingTime).toBeGreaterThan(0);
      expect(remainingTime).toBeLessThanOrEqual(15 * 60); // 15 minutes
    });

    it("未被鎖定時應該返回 0", async () => {
      await resetLoginFailureAttempts(testUserId);
      
      const remainingTime = await getLoginLockTimeRemaining(testUserId);
      expect(remainingTime).toBe(0);
    });
  });

  describe("resetLoginFailureAttempts", () => {
    it("應該重置失敗計數和鎖定狀態", async () => {
      // 先鎖定帳號
      await resetLoginFailureAttempts(testUserId);
      await recordLoginFailure(testUserId);
      await recordLoginFailure(testUserId);
      await recordLoginFailure(testUserId);
      
      let isLocked = await isLoginLocked(testUserId);
      expect(isLocked).toBe(true);
      
      // 重置
      await resetLoginFailureAttempts(testUserId);
      
      isLocked = await isLoginLocked(testUserId);
      expect(isLocked).toBe(false);
      
      const attempts = await getLoginFailureAttempts(testUserId);
      expect(attempts?.attemptCount).toBe(0);
      expect(attempts?.lockedUntil).toBeNull();
    });
  });

  describe("unlockLoginAttempts", () => {
    it("應該解除帳號鎖定", async () => {
      // 先鎖定帳號
      await resetLoginFailureAttempts(testUserId);
      await recordLoginFailure(testUserId);
      await recordLoginFailure(testUserId);
      await recordLoginFailure(testUserId);
      
      let isLocked = await isLoginLocked(testUserId);
      expect(isLocked).toBe(true);
      
      // 解除鎖定
      await unlockLoginAttempts(testUserId);
      
      isLocked = await isLoginLocked(testUserId);
      expect(isLocked).toBe(false);
      
      const attempts = await getLoginFailureAttempts(testUserId);
      expect(attempts?.attemptCount).toBe(0);
      expect(attempts?.lockedUntil).toBeNull();
    });
  });
});
