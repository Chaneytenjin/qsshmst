import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const readSource = (relativePath: string) => readFileSync(`${projectRoot}/${relativePath}`, "utf8");

describe("器材識別碼列印清單子頁", () => {
  it("以共用列印檢視承接既有列印、篩選與歷程功能", () => {
    const page = readSource("client/src/pages/QrCodePrintList.tsx");
    const borrowReturn = readSource("client/src/pages/QrCodeBorrowReturn.tsx");

    expect(page).toContain('<QrCodeBorrowReturn initialView="print" />');
    expect(borrowReturn).toContain('initialView?: "scanner" | "print"');
    expect(borrowReturn).toContain('initialView === "print" ? "器材識別碼列印清單"');
    expect(borrowReturn).toContain('data-testid="qr-print-history"');
    expect(borrowReturn).toContain('href="/qrcode-print-list"');
  });

  it("在受保護路由提供列印清單，並讓器材管理入口導向該子頁", () => {
    const app = readSource("client/src/App.tsx");
    const equipmentManage = readSource("client/src/pages/EquipmentManage.tsx");

    expect(app).toContain('import QrCodePrintList from "./pages/QrCodePrintList"');
    expect(app).toContain('path="/qrcode-print-list"');
    expect(app).toContain('component={QrCodePrintList} roles={["admin", "teacher"]}');
    expect(equipmentManage).toContain('/qrcode-print-list?print=${printableSelectedEquipmentIds.join(",")}');
    expect(equipmentManage).toContain('/qrcode-print-list?print=${item.id}');
  });

  it("為掃描器與手動輸入切換按鈕提供淺色模式高對比與焦點規則", () => {
    const borrowReturn = readSource("client/src/pages/QrCodeBorrowReturn.tsx");
    const css = readSource("client/src/index.css");

    expect(borrowReturn).toContain('className="qr-borrow-return-tabs grid w-full grid-cols-2"');
    expect(borrowReturn).toContain('className="qr-borrow-return-tab">掃描器');
    expect(borrowReturn).toContain('className="qr-borrow-return-tab">手動輸入');
    expect(css).toContain('html:not(.dark) .qr-borrow-return-page .qr-borrow-return-tabs');
    expect(css).toContain('.qr-borrow-return-tab[data-state="active"]');
    expect(css).toContain('.qr-borrow-return-page .qr-borrow-return-tab:focus-visible');
  });
});
