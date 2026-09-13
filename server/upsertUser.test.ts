import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema";
import { getDb, getUserByOpenId, getUserByUsername, upsertUser } from "./db";

describe("upsertUser account uniqueness", () => {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const usernames = [`upsert_unique_${suffix}`, `upsert_alpha_${suffix}`, `upsert_beta_${suffix}`];
  const openIds = [`upsert_open_${suffix}`, `upsert_open_alpha_${suffix}`, `upsert_open_beta_${suffix}`];
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");
  });

  afterAll(async () => {
    if (!db) return;
    for (const username of usernames) await db.delete(users).where(eq(users.username, username));
  });

  it("同一 username 的重複 upsert 只更新既有紀錄，絕不新增第二筆帳號", async () => {
    const username = usernames[0];
    await upsertUser({ username, name: "第一次資料", email: "first@example.com", role: "student" });
    const first = await getUserByUsername(username);
    expect(first).toBeDefined();

    await upsertUser({ username, name: "第二次資料", email: "second@example.com", role: "teacher" });
    const rows = await db!.select().from(users).where(eq(users.username, username));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: first!.id, name: "第二次資料", email: "second@example.com", role: "teacher" });
  });

  it("同一 openId 的重複 upsert 只更新既有紀錄，絕不建立重複 OAuth 帳號", async () => {
    const openId = openIds[0];
    await upsertUser({ openId, name: "OAuth 第一次", email: "oauth-first@example.com" });
    const first = await getUserByOpenId(openId);
    expect(first).toBeDefined();

    await upsertUser({ openId, name: "OAuth 第二次", email: "oauth-second@example.com" });
    const rows = await db!.select().from(users).where(eq(users.openId, openId));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: first!.id, name: "OAuth 第二次", email: "oauth-second@example.com" });
  });

  it("username 與 openId 分別屬於不同帳號時拒絕寫入，以避免身分衝突造成重複紀錄", async () => {
    await upsertUser({ username: usernames[1], openId: openIds[1], name: "帳號甲" });
    await upsertUser({ username: usernames[2], openId: openIds[2], name: "帳號乙" });

    await expect(upsertUser({ username: usernames[1], openId: openIds[2], name: "衝突帳號" })).rejects.toThrow("User identity conflict");

    const alpha = await getUserByUsername(usernames[1]);
    const beta = await getUserByUsername(usernames[2]);
    expect(alpha?.openId).toBe(openIds[1]);
    expect(beta?.openId).toBe(openIds[2]);
  });
});
