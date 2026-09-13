import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pagePath = new URL("../client/src/pages/QrCodeBorrowReturn.tsx", import.meta.url);

describe("Code 128 Barcode 相機掃描配置", () => {
  it("限制為系統實際產生的 Code 128 格式，並使用寬幅辨識框", () => {
    const source = readFileSync(pagePath, "utf8");
    const css = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");
    expect(source).toContain("const barcodeFormats = [Html5QrcodeSupportedFormats.CODE_128]");
    expect(source).toContain("new Html5Qrcode(qrReaderRef.current.id");
    expect(source).toContain('{ facingMode: { ideal: "environment" } }');
    expect(source).toContain("function getBorrowScannerFormats(codeMode: EquipmentCodeMode, needsBorrowerQr: boolean)");
    expect(source).toContain("return needsBorrowerQr ? [Html5QrcodeSupportedFormats.QR_CODE] : getScannerFormats(codeMode)");
    expect(source).toContain('qrbox: !needsBorrowerQr && equipmentCodeMode === "barcode" ? { width: 340, height: 150 }');
    expect(source).toContain('aspectRatio: !needsBorrowerQr && equipmentCodeMode === "barcode" ? 2.2 : 1.0');
    expect(source).toContain("useBarCodeDetectorIfSupported: !needsBorrowerQr && equipmentCodeMode !== \"qr\"");
    expect(source).toContain('width: { ideal: 1280 }, height: { ideal: 720 }');
    expect(source).toContain("桌面掃描建議：請讓 Barcode 橫向置中");
    expect(css).toContain(".qr-scanner-viewport #qr-reader {\n  position: relative;");
    expect(css).toContain("border: 0 !important;");
    expect(css).toContain("background: transparent !important;");
  });
});
