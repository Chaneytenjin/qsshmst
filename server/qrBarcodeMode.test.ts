import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pagePath = new URL("../client/src/pages/QrCodeBorrowReturn.tsx", import.meta.url);
const formatsPath = new URL("../client/src/lib/equipmentLabelFormats.ts", import.meta.url);

describe("器材 QR Code／Barcode 雙模式介面", () => {
  it("提供 QR、Barcode 與雙碼模式的切換，並使用 Code 128 產生 Barcode", () => {
    const source = readFileSync(pagePath, "utf8");
    const formats = readFileSync(formatsPath, "utf8");

    expect(formats).toContain('export type EquipmentCodeMode = "qr" | "barcode" | "both"');
    expect(source).toContain('type EquipmentCodeMode');
    expect(source).toContain('format: "CODE128"');
    expect(source).toContain('data-testid="equipment-code-mode-switcher"');
    expect(source).toContain('Html5QrcodeSupportedFormats.CODE_128');
    expect(source).toContain('Html5QrcodeSupportedFormats.QR_CODE');
  });

  it("讓批次列印與預覽共用目前選取的識別碼模式", () => {
    const source = readFileSync(pagePath, "utf8");

    expect(source).toContain('<EquipmentCodeVisual value={equipment.qrCodeId} mode={equipmentCodeMode} />');
    expect(source).toContain('EquipmentCodeVisual value={equipment.qrCodeId} mode={equipmentCodeMode} compact');
    expect(source).toContain('activeEquipmentCodeMode.label');
  });
});
