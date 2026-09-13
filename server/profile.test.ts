import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { upsertUser, getUserById, getUserByUsername, updateUserProfile, getUserPreferences, upsertUserPreferences } from "./db";
import { hashPassword } from "./_core/password";

describe("Profile Management", () => {
  let testUserId: number;
  const testUsername = `test_profile_${Date.now()}`;
  const testEmail = `test_${Date.now()}@example.com`;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 建立測試使用者
    const hashedPassword = await hashPassword("TestPassword123");
    await upsertUser({
      username: testUsername,
      passwordHash: hashedPassword,
      name: "Test User",
      email: testEmail,
      role: "student",
    });

    // 以唯一帳號取得剛建立的使用者，不能假設資料庫的自動編號
    const user = await getUserByUsername(testUsername);
    if (!user) throw new Error("Failed to create test user");
    testUserId = user.id;
  });

  describe("updateUserProfile", () => {
    it("應該更新使用者的個人資料", async () => {
      const newData = {
        realName: "張三",
        email: "zhangsan@example.com",
        phone: "0912345678",
        department: "高一甲班",
      };

      await updateUserProfile(testUserId, newData);

      const user = await getUserById(testUserId);
      expect(user?.realName).toBe(newData.realName);
      expect(user?.email).toBe(newData.email);
      expect(user?.phone).toBe(newData.phone);
      expect(user?.department).toBe(newData.department);
    });

    it("應該只更新提供的欄位", async () => {
      const originalUser = await getUserById(testUserId);
      const partialUpdate = {
        realName: "李四",
      };

      await updateUserProfile(testUserId, partialUpdate);

      const updatedUser = await getUserById(testUserId);
      expect(updatedUser?.realName).toBe("李四");
      expect(updatedUser?.email).toBe(originalUser?.email);
    });
  });

  describe("getUserPreferences", () => {
    it("應該取得使用者的偏好設定", async () => {
      // 先建立偏好設定
      await upsertUserPreferences(testUserId, {
        theme: "dark",
        language: "zh-TW",
        notificationsEnabled: true,
        emailNotifications: false,
        borrowingNotifications: true,
      });

      const preferences = await getUserPreferences(testUserId);
      expect(preferences).toBeDefined();
      expect(preferences?.theme).toBe("dark");
      expect(preferences?.language).toBe("zh-TW");
      expect(preferences?.notificationsEnabled).toBe(true);
      expect(preferences?.emailNotifications).toBe(false);
      expect(preferences?.borrowingNotifications).toBe(true);
    });

    it("不存在的使用者應該返回 null", async () => {
      const preferences = await getUserPreferences(99999);
      expect(preferences).toBeNull();
    });
  });

  describe("upsertUserPreferences", () => {
    it("應該建立新的偏好設定", async () => {
      const preferencesData = {
        theme: "light" as const,
        language: "en",
        notificationsEnabled: false,
        emailNotifications: true,
        borrowingNotifications: false,
      };

      await upsertUserPreferences(testUserId, preferencesData);

      const preferences = await getUserPreferences(testUserId);
      expect(preferences?.theme).toBe("light");
      expect(preferences?.language).toBe("en");
      expect(preferences?.notificationsEnabled).toBe(false);
      expect(preferences?.emailNotifications).toBe(true);
      expect(preferences?.borrowingNotifications).toBe(false);
    });

    it("應該更新現有的偏好設定", async () => {
      const updateData = {
        theme: "dark" as const,
        language: "zh-TW",
      };

      await upsertUserPreferences(testUserId, updateData);

      const preferences = await getUserPreferences(testUserId);
      expect(preferences?.theme).toBe("dark");
      expect(preferences?.language).toBe("zh-TW");
    });

    it("應該保留未更新的欄位", async () => {
      // 先設定完整的偏好設定
      await upsertUserPreferences(testUserId, {
        theme: "dark",
        language: "zh-TW",
        notificationsEnabled: true,
        emailNotifications: false,
        borrowingNotifications: true,
      });

      // 只更新主題
      await upsertUserPreferences(testUserId, {
        theme: "light",
      });

      const preferences = await getUserPreferences(testUserId);
      expect(preferences?.theme).toBe("light");
      expect(preferences?.language).toBe("zh-TW");
      expect(preferences?.notificationsEnabled).toBe(true);
    });
  });

  afterAll(async () => {
    // 清理測試資料
    const db = await getDb();
    if (db) {
      // 注意：實際應用中應該有適當的清理機制
      console.log("Test completed");
    }
  });
});
