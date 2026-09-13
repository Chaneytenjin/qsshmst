import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(resolve(process.cwd(), "client/src/pages/EquipmentManage.tsx"), "utf8");
const styles = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");

describe("新增器材 ID 欄位", () => {
  it("保留固定前綴與可輸入後段，並排在存放位置之後", () => {
    expect(pageSource).toContain("equipment-scan-id-prefix");
    expect(pageSource).toContain("QSSHMST");
    expect(pageSource).toContain('htmlFor="equipment-scan-id-suffix">ID</label>');
    expect(pageSource).toContain('aria-label="ID 後段"');
    expect(pageSource.indexOf('aria-label="器材存放位置"')).toBeLessThan(pageSource.indexOf('aria-label="ID 後段"'));
    expect(pageSource).not.toContain("固定前綴為 QSSHMST；後段可自行輸入英文字母、數字、底線或連字號留空時由系統自動產生唯一掃描 ID");
  });

  it("為固定前綴提供淺色模式專屬背景、邊框與文字對比", () => {
    expect(styles).toContain("html:not(.dark) .equipment-scan-id-prefix {");
    expect(styles).toContain("background: linear-gradient(135deg, oklch(0.94 0.065 210), oklch(0.87 0.09 220)) !important;");
    expect(styles).toContain("color: oklch(0.22 0.10 215) !important;");
  });

  it("編輯器材在存放位置後提供唯讀 ID 預覽，且不送出 ID 更新", () => {
    expect(pageSource).toContain('id="equipment-scan-id-preview"');
    expect(pageSource).toContain('aria-label="ID（僅供預覽）"');
    expect(pageSource).toContain('value={editItem.qrCodeId || "未設定"} readOnly aria-readonly="true"');
    expect(pageSource).toContain("ID 僅供預覽，無法修改");
    expect(pageSource).not.toContain('updateMutation.mutate({ id: editItem.id, ...equipmentData, scanIdSuffix:');
    expect(pageSource.indexOf('aria-label="器材存放位置"')).toBeLessThan(pageSource.indexOf('id="equipment-scan-id-preview"'));
    expect(pageSource).not.toContain('<label className="label-caps mb-1.5 block">序號</label>');
  });

  it("編輯器材僅在存放位置變更時開啟必填的移轉原因彈窗", () => {
    expect(pageSource).toContain("if (previousLocation !== nextLocation)");
    expect(pageSource).toContain("setPendingLocationUpdate({ ...data, location: nextLocation });");
    expect(pageSource).toContain("填寫位置異動原因");
    expect(pageSource).toContain('aria-label="移轉原因／自訂備註"');
    expect(pageSource).toContain('請填寫移轉原因／自訂備註');
    expect(pageSource).not.toContain('register("locationNote"');
  });
});
