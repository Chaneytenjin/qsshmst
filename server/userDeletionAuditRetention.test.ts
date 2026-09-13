import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const schemaSource = readFileSync(resolve(projectRoot, "drizzle/schema.ts"), "utf8");
const dbSource = readFileSync(resolve(projectRoot, "server/db.ts"), "utf8");

describe("帳號刪除的後台紀錄保留", () => {
  it("讓稽核與操作紀錄的操作者外鍵可安全設為空值", () => {
    expect(schemaSource).toContain('userId: int("userId").references(() => users.id, { onDelete: "set null" })');
    expect(schemaSource).toContain('handledById: int("handledById").references(() => users.id, { onDelete: "set null" })');
    expect(schemaSource).toContain('printedById: int("printedById").references(() => users.id, { onDelete: "set null" })');
    expect(schemaSource).toContain('changedById: int("changedById").references(() => users.id, { onDelete: "set null" })');
  });

  it("在刪除帳號時保留後台紀錄，僅解除操作者關聯", () => {
    const deletionStart = dbSource.indexOf("export async function deleteUser");
    const deletionEnd = dbSource.indexOf("// ─── Equipment Categories", deletionStart);
    const deletionSource = dbSource.slice(deletionStart, deletionEnd);

    expect(deletionSource).toContain("tx.update(loginAuditLogs).set({ userId: null })");
    expect(deletionSource).toContain("tx.update(operationLogs).set({ userId: null })");
    expect(deletionSource).toContain("tx.update(equipmentLocationHistory).set({ changedById: null })");
    expect(deletionSource).toContain("tx.update(qrPrintHistory).set({ printedById: null })");
    expect(deletionSource).not.toContain("tx.delete(loginAuditLogs)");
    expect(deletionSource).not.toContain("tx.delete(operationLogs)");
    expect(deletionSource).not.toContain("tx.delete(equipmentLocationHistory)");
    expect(deletionSource).not.toContain("tx.delete(qrPrintHistory)");
  });
});
