import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { upsertUser, getUserByUsername, upsertUserPreferences } from "./db";
import { hashPassword } from "./_core/password";

type AppRouter = typeof appRouter;
type Caller = ReturnType<AppRouter['createCaller']>;

describe("Profile tRPC Procedures", () => {
  let testUserId: number;
  const testUsername = `trpc_profile_${Date.now()}`;

  beforeAll(async () => {
    // 建立測試使用者
    const hashedPassword = await hashPassword("TestPassword123");
    await upsertUser({
      username: testUsername,
      passwordHash: hashedPassword,
      name: "tRPC Test User",
      email: "trpc@example.com",
      role: "student",
    });

    // 以唯一帳號取得剛建立的使用者，不能假設資料庫的自動編號
    const user = await getUserByUsername(testUsername);
    if (!user) throw new Error("Failed to create test user");
    testUserId = user.id;
    await upsertUserPreferences(testUserId, {
      theme: "dark",
      language: "zh-TW",
      notificationsEnabled: true,
    });
  });

  describe("profile.getProfile", () => {
    it("應該返回使用者的個人資料和偏好設定", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "student", name: "Test" },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.profile.getProfile();
      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user?.id).toBe(testUserId);
      expect(result.preferences).toBeDefined();
    });
  });

  describe("profile.updateProfile", () => {
    it("應該成功更新個人資料", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "student", name: "Test" },
        req: {} as any,
        res: {} as any,
      });

      const updateData = {
        realName: "測試用戶",
        email: "test@example.com",
        phone: "0912345678",
        department: "測試部門",
      };

      const result = await caller.profile.updateProfile(updateData);
      expect(result.success).toBe(true);
    });

    it("應該驗證電子郵件格式", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "student", name: "Test" },
        req: {} as any,
        res: {} as any,
      });

      const invalidData = {
        email: "invalid-email",
      };

      await expect(caller.profile.updateProfile(invalidData as any)).rejects.toThrow();
    });
  });

  describe("profile.getPreferences", () => {
    it("應該返回使用者的偏好設定", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "student", name: "Test" },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.profile.getPreferences();
      expect(result).toBeDefined();
      expect(result?.theme).toBeDefined();
      expect(result?.language).toBeDefined();
    });
  });

  describe("profile.updatePreferences", () => {
    it("應該成功更新偏好設定", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "student", name: "Test" },
        req: {} as any,
        res: {} as any,
      });

      const updateData = {
        theme: "light" as const,
        language: "en",
        notificationsEnabled: false,
      };

      const result = await caller.profile.updatePreferences(updateData);
      expect(result.success).toBe(true);

      const systemThemeResult = await caller.profile.updatePreferences({ theme: "system" });
      expect(systemThemeResult.success).toBe(true);
    });

    it("應該驗證主題值", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "student", name: "Test" },
        req: {} as any,
        res: {} as any,
      });

      const invalidData = {
        theme: "invalid-theme",
      };

      await expect(caller.profile.updatePreferences(invalidData as any)).rejects.toThrow();
    });
  });

  describe("profile.changePassword", () => {
    it("應該拒絕錯誤的目前密碼", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "student", name: "Test" },
        req: {} as any,
        res: {} as any,
      });

      const changeData = {
        currentPassword: "WrongPassword",
        newPassword: "NewPassword789",
        confirmPassword: "NewPassword789",
      };

      await expect(caller.profile.changePassword(changeData)).rejects.toThrow("目前密碼不正確");
    });

    it("應該拒絕不符合複雜度要求的密碼", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "student", name: "Test" },
        req: {} as any,
        res: {} as any,
      });

      const changeData = {
        currentPassword: "TestPassword123",
        newPassword: "short",
        confirmPassword: "short",
      };

      await expect(caller.profile.changePassword(changeData)).rejects.toThrow();
    });

    it("應該拒絕不符的新密碼確認", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "student", name: "Test" },
        req: {} as any,
        res: {} as any,
      });

      const changeData = {
        currentPassword: "TestPassword123",
        newPassword: "NewPassword999",
        confirmPassword: "DifferentPassword",
      };

      await expect(caller.profile.changePassword(changeData)).rejects.toThrow();
    });
  });
});
