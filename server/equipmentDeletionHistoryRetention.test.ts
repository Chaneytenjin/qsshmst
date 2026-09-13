import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const schemaSource = readFileSync(resolve(projectRoot, "drizzle/schema.ts"), "utf8");
const dbSource = readFileSync(resolve(projectRoot, "server/db.ts"), "utf8");
const routerSource = readFileSync(resolve(projectRoot, "server/routers.ts"), "utf8");
const pageSource = readFileSync(resolve(projectRoot, "client/src/pages/EquipmentManage.tsx"), "utf8");

describe("器材移除後的異動資料保留", () => {
  it("為器材建立可追溯的軟刪除欄位", () => {
    expect(schemaSource).toContain('deletedAt: timestamp("deletedAt")');
    expect(schemaSource).toContain('deletedById: int("deletedById").references(() => users.id, { onDelete: "set null" })');
  });

  it("移除器材時僅標示已移除，不刪除借還、提醒、位置異動與警示資料", () => {
    const deletionStart = dbSource.indexOf("export async function deleteEquipment");
    const deletionEnd = dbSource.indexOf("// ─── Equipment Location History", deletionStart);
    const deletionSource = dbSource.slice(deletionStart, deletionEnd);

    expect(deletionSource).toContain("tx.update(equipment).set({");
    expect(deletionSource).toContain("categoryId: null,");
    expect(deletionSource).toContain("deletedAt: new Date(),");
    expect(deletionSource).toContain("deletedById,");
    expect(deletionSource).not.toContain("tx.delete(borrowReturnReminders)");
    expect(deletionSource).not.toContain("tx.delete(borrowRecords)");
    expect(deletionSource).not.toContain("tx.delete(borrowRequests)");
    expect(deletionSource).not.toContain("tx.delete(equipmentLocationMovementAlerts)");
    expect(deletionSource).not.toContain("tx.delete(equipmentLocationHistory)");
    expect(deletionSource).not.toContain("tx.delete(equipment)");
  });

  it("讓一般清單排除已移除器材，並在刪除稽核中記錄歷程保留", () => {
    expect(dbSource).toContain("const conditions: SQL[] = [isNull(equipment.deletedAt)];");
    expect(dbSource).toContain("and(eq(equipment.id, id), isNull(equipment.deletedAt))");
    expect(routerSource).toContain("await deleteEquipment(input.id, ctx.user.id);");
    expect(routerSource).toContain('{ deletionMode: "soft", historyRetained: true }');
  });

  it("在移除確認視窗清楚說明相依歷程會保留作稽核", () => {
    expect(pageSource).toContain("移除前歷程保留預覽");
    expect(pageSource).toContain("將保留 {equipmentDeletePreview.dependentRecordCount} 筆既有歷程供稽核");
    expect(pageSource).toContain('deleteConfirmationStep === "preview" ? "繼續二次確認" : "移除器材"');
    expect(pageSource).not.toContain("移除器材保留歷程");
    expect(pageSource).toContain('placeholder="請輸入器材名稱"');
    expect(pageSource).toContain('placeholder="輸入分類名稱"');
    expect(pageSource).not.toContain("請輸入器材名稱</span>");
    expect(pageSource).toContain("equipment-category-delete-dialog");
    expect(pageSource).toContain("text-white sm:max-w-xl");
    expect(pageSource).not.toContain("{entry.count} 筆 · {entry.effect}");
  });
});
