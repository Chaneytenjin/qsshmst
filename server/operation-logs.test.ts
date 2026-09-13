import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb, getAllUsers, upsertUser, getUserByUsername, createOperationLog, getOperationLogs, getOperationLogCount } from "./db";
import { hashPassword } from "./_core/password";
import { users, operationLogs } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Operation Logs", () => {
  let testUserId: number;
  let adminUserId: number;
  let db: any;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");

    // 建立測試用戶
    const testUsername = `oplog_test_${Date.now()}`;
    const hashedPassword = await hashPassword("TestPassword123");
    await upsertUser({
      username: testUsername,
      passwordHash: hashedPassword,
      name: "Operation Log Test User",
      email: `oplog_test_${Date.now()}@example.com`,
      role: "student",
    });

    const testUser = await getUserByUsername(testUsername);
    if (!testUser) throw new Error("Failed to create test user");
    testUserId = testUser.id;

    // 建立管理員用戶
    const adminUsername = `oplog_admin_${Date.now()}`;
    const adminPassword = await hashPassword("AdminPassword123");
    await upsertUser({
      username: adminUsername,
      passwordHash: adminPassword,
      name: "Operation Log Admin User",
      email: `oplog_admin_${Date.now()}@example.com`,
      role: "admin",
    });

    const adminUser = await getUserByUsername(adminUsername);
    if (!adminUser) throw new Error("Failed to create admin user");
    adminUserId = adminUser.id;
  });

  afterAll(async () => {
    if (!db) return;
    // 清理測試數據
    await db.delete(operationLogs).where(eq(operationLogs.userId, adminUserId));
    await db.delete(users).where(eq(users.id, testUserId));
    await db.delete(users).where(eq(users.id, adminUserId));
  });

  describe("operationLogs recording", () => {
    it("應該記錄操作日誌", async () => {
      // 記錄一條測試日誌
      await createOperationLog({
        userId: adminUserId,
        username: "testadmin",
        action: "create",
        entityType: "user",
        entityId: testUserId,
        entityName: "Test User",
        details: JSON.stringify({ role: "student" }),
        ipAddress: "127.0.0.1",
        userAgent: "Test Agent",
      });

      // 驗證日誌已被記錄
      const logs = await getOperationLogs({
        username: "testadmin",
        action: "create",
      });

      expect(logs).toBeDefined();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].username).toBe("testadmin");
      expect(logs[0].action).toBe("create");
    });

    it("應該記錄不同類型的操作", async () => {
      const operations = ["create", "update", "delete", "approve", "reject"];

      for (const op of operations) {
        await createOperationLog({
          userId: adminUserId,
          username: "testadmin",
          action: op,
          entityType: "user",
          entityId: testUserId,
          entityName: "Test User",
          details: JSON.stringify({}),
          ipAddress: "127.0.0.1",
          userAgent: "Test Agent",
        });
      }

      // 驗證所有操作都被記錄
      for (const op of operations) {
        const logs = await getOperationLogs({
          action: op,
          username: "testadmin",
        });
        expect(logs.length).toBeGreaterThan(0);
      }
    });

    it("應該記錄不同資源類型的操作", async () => {
      const entityTypes = ["equipment", "user", "borrowRequest", "borrowRecord"];

      for (const entityType of entityTypes) {
        await createOperationLog({
          userId: adminUserId,
          username: "testadmin",
          action: "create",
          entityType,
          entityId: testUserId,
          entityName: `${entityType} Test`,
          details: JSON.stringify({}),
          ipAddress: "127.0.0.1",
          userAgent: "Test Agent",
        });
      }

      // 驗證所有資源類型都被記錄
      for (const entityType of entityTypes) {
        const logs = await getOperationLogs({
          entityType,
          username: "testadmin",
        });
        expect(logs.length).toBeGreaterThan(0);
      }
    });

    it("應該正確序列化詳細信息", async () => {
      const details = {
        role: "admin",
        email: "test@example.com",
        quantity: 5,
      };

      await createOperationLog({
        userId: adminUserId,
        username: "testadmin",
        action: "update",
        entityType: "user",
        entityId: testUserId,
        entityName: "Test User",
        details: JSON.stringify(details),
        ipAddress: "127.0.0.1",
        userAgent: "Test Agent",
      });

      const logs = await getOperationLogs({
        action: "update",
        username: "testadmin",
      });

      expect(logs.length).toBeGreaterThan(0);
      const storedDetails = JSON.parse(logs[0].details || "{}");
      expect(storedDetails).toEqual(details);
    });

    it("應該記錄 IP 地址和 User-Agent", async () => {
      const testIp = "192.168.1.1";
      const testAgent = "Mozilla/5.0 Test Browser";

      await createOperationLog({
        userId: adminUserId,
        username: "testadmin",
        action: "create",
        entityType: "equipment",
        entityId: 1,
        entityName: "Test Equipment",
        details: JSON.stringify({}),
        ipAddress: testIp,
        userAgent: testAgent,
      });

      const logs = await getOperationLogs({
        action: "create",
        entityType: "equipment",
        username: "testadmin",
      });

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].ipAddress).toBe(testIp);
      expect(logs[0].userAgent).toBe(testAgent);
    });

    it("應該支持分頁查詢", async () => {
      // 記錄多條日誌
      for (let i = 0; i < 5; i++) {
        await createOperationLog({
          userId: adminUserId,
          username: "testadmin",
          action: "create",
          entityType: "user",
          entityId: testUserId,
          entityName: `Test User ${i}`,
          details: JSON.stringify({}),
          ipAddress: "127.0.0.1",
          userAgent: "Test Agent",
        });
      }

      // 驗證分頁
      const logsPage1 = await getOperationLogs({
        username: "testadmin",
        limit: 2,
        offset: 0,
      });

      const logsPage2 = await getOperationLogs({
        username: "testadmin",
        limit: 2,
        offset: 2,
      });

      expect(logsPage1.length).toBeLessThanOrEqual(2);
      expect(logsPage2.length).toBeLessThanOrEqual(2);
    });

    it("應該計算日誌計數", async () => {
      const count = await getOperationLogCount({
        username: "testadmin",
      });

      expect(count).toBeGreaterThan(0);
      expect(typeof count).toBe("number");
    });

    it("應只以去重維護篩選回傳手動掃描與受控停用事件", async () => {
      await createOperationLog({ userId: adminUserId, username: "testadmin", action: "runAccountDeduplication", entityType: "accountDeduplication", entityName: "手動帳號去重檢查", details: JSON.stringify({ mode: "report-only" }) });
      await createOperationLog({ userId: adminUserId, username: "testadmin", action: "deactivateDuplicateAccount", entityType: "user", entityId: testUserId, entityName: "Test User", details: JSON.stringify({ preservation: "帳號已停用，未刪除任何資料" }) });
      await createOperationLog({ userId: adminUserId, username: "testadmin", action: "update", entityType: "user", entityId: testUserId, entityName: "Test User", details: JSON.stringify({ changedFields: ["role"] }) });

      const logs = await getOperationLogs({ username: "testadmin", deduplicationOnly: true });
      const count = await getOperationLogCount({ username: "testadmin", deduplicationOnly: true });

      expect(logs).toHaveLength(2);
      expect(logs.map((log) => log.action).sort()).toEqual(["deactivateDuplicateAccount", "runAccountDeduplication"]);
      expect(count).toBe(2);
    });
  });
});
