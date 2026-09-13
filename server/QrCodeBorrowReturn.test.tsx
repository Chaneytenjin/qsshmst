// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QrCodeBorrowReturn from "../client/src/pages/QrCodeBorrowReturn";

const mocks = vi.hoisted(() => ({
  listUseQuery: vi.fn(),
  borrowUseMutation: vi.fn(),
  returnUseMutation: vi.fn(),
  resolveDynamicBorrowerQrUseMutation: vi.fn(),
  recentRecordsUseQuery: vi.fn(),
  borrowMutateAsync: vi.fn(),
  returnMutateAsync: vi.fn(),
  resolveDynamicBorrowerQrMutateAsync: vi.fn(),
  refetch: vi.fn(),
  recentRecordsRefetch: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
  exportQrPrintSheetToPdf: vi.fn(),
  brandLogoReportUseMutation: vi.fn(),
  printHistoryUseQuery: vi.fn(),
  recordQrPrintMutateAsync: vi.fn(),
  printHistoryRefetch: vi.fn(),
  scannerRender: vi.fn(),
}));

vi.mock("../client/src/lib/trpc", () => ({
  trpc: {
    equipment: {
      list: { useQuery: mocks.listUseQuery },
      borrow: { useMutation: mocks.borrowUseMutation },
      return: { useMutation: mocks.returnUseMutation },
      resolveDynamicBorrowerQr: { useMutation: mocks.resolveDynamicBorrowerQrUseMutation },
      getQrPrintHistory: { useQuery: mocks.printHistoryUseQuery },
      recordQrPrint: { useMutation: () => ({ mutateAsync: mocks.recordQrPrintMutateAsync, isPending: false }) },
    },
    borrowRecords: { list: { useQuery: mocks.recentRecordsUseQuery } },
    brandLogoMonitoring: { reportFailure: { useMutation: mocks.brandLogoReportUseMutation } },
  },
}));

vi.mock("html5-qrcode", () => ({
  Html5Qrcode: class {
    isScanning = false;
    start = async (...args: unknown[]) => {
      this.isScanning = true;
      mocks.scannerRender(...args);
      return null;
    };
    stop = async () => {
      this.isScanning = false;
    };
    clear = vi.fn();
  },
  Html5QrcodeSupportedFormats: { QR_CODE: 0, CODE_128: 5, CODE_39: 3, CODE_93: 4, EAN_13: 9, EAN_8: 10, ITF: 8, UPC_A: 14, UPC_E: 15 },
}));

vi.mock("jsbarcode", () => ({ default: vi.fn() }));

vi.mock("qrcode.react", () => ({
  QRCodeCanvas: ({ value }: { value: string }) => <div data-testid="qr-code-canvas">{value}</div>,
}));

vi.mock("sonner", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
    info: mocks.toastInfo,
  },
}));

vi.mock("../client/src/lib/qrPdfExport", () => ({
  exportQrPrintSheetToPdf: mocks.exportQrPrintSheetToPdf,
}));

vi.mock("../client/src/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 1, username: "test-admin", name: "測試管理員", role: "admin" } }),
}));

const equipment = {
  id: 8,
  name: "Sony A7 相機",
  qrCodeId: "QSSHMST0008",
  status: "available",
  location: "攝影器材櫃 A-03",
  categoryId: 1,
  categoryName: "攝影器材",
};

const secondEquipment = {
  id: 9,
  name: "DJI Mini 空拍機",
  qrCodeId: "QSSHMST0009",
  status: "available",
  location: "器材室 B-02",
  categoryId: 2,
  categoryName: "空拍器材",
};

function renderPage(options: { equipmentData?: typeof equipment[]; isLoading?: boolean; recentRecords?: any[]; printHistory?: any[] } = {}) {
  mocks.listUseQuery.mockReturnValue({
    data: options.equipmentData ?? [equipment],
    isLoading: options.isLoading ?? false,
    error: null,
    refetch: mocks.refetch,
  });
  mocks.borrowUseMutation.mockReturnValue({ mutateAsync: mocks.borrowMutateAsync, isPending: false });
  mocks.returnUseMutation.mockReturnValue({ mutateAsync: mocks.returnMutateAsync, isPending: false });
  mocks.resolveDynamicBorrowerQrUseMutation.mockReturnValue({ mutateAsync: mocks.resolveDynamicBorrowerQrMutateAsync, isPending: false });
  mocks.recentRecordsUseQuery.mockReturnValue({ data: options.recentRecords ?? [], isLoading: false, error: null, refetch: mocks.recentRecordsRefetch });
  mocks.printHistoryUseQuery.mockReturnValue({ data: options.printHistory ?? [], isLoading: false, error: null, refetch: mocks.printHistoryRefetch });
  return render(<QrCodeBorrowReturn />);
}

describe("QrCodeBorrowReturn 手動輸入流程", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/qrcode-borrow-return");
    mocks.borrowMutateAsync.mockResolvedValue({ success: true });
    mocks.returnMutateAsync.mockResolvedValue({ success: true });
    mocks.resolveDynamicBorrowerQrMutateAsync.mockResolvedValue({ userId: 3 });
    mocks.exportQrPrintSheetToPdf.mockResolvedValue(undefined);
    mocks.recordQrPrintMutateAsync.mockResolvedValue({ success: true, equipmentCount: 1 });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("會顯示器材名稱、共用識別碼與預設雙碼區塊", () => {
    renderPage();

    expect(screen.getByText("Sony A7 相機")).toBeInTheDocument();
    expect(screen.getByText("ID: QSSHMST0008")).toBeInTheDocument();
    expect(screen.getByTestId("qr-code-canvas")).toHaveTextContent("QSSHMST0008");
    expect(screen.getByRole("img", { name: "Barcode QSSHMST0008" })).toBeInTheDocument();
    expect(screen.getByText("存放位置: 攝影器材櫃 A-03")).toBeInTheDocument();
  });

  it("可在 QR、Barcode 與雙碼模式間切換產生與列印格式", async () => {
    const user = userEvent.setup();
    renderPage();

    const modeSwitcher = screen.getByTestId("equipment-code-mode-switcher");
    expect(modeSwitcher).toHaveTextContent("QR Code + Barcode");

    await user.click(screen.getByRole("button", { name: "Barcode" }));
    expect(screen.getByText("器材 Barcode 批次列印")).toBeInTheDocument();
    expect(screen.queryByTestId("qr-code-canvas")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Barcode QSSHMST0008" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "QR Code" }));
    expect(screen.getByText("器材 QR Code 批次列印")).toBeInTheDocument();
    expect(screen.getByTestId("qr-code-canvas")).toHaveTextContent("QSSHMST0008");
  });

  it("會顯示最近六筆內的借還紀錄，並在成功借還後重新整理紀錄", async () => {
    const user = userEvent.setup();
    renderPage({ recentRecords: [
      { id: 101, equipmentName: "Sony A7 相機", borrowerId: 23, borrowerName: "王小明", quantity: 1, status: "active", borrowedAt: new Date("2026-08-13T09:00:00"), actualReturnAt: null },
      { id: 102, equipmentName: "無線麥克風", borrowerId: 24, borrowerName: "陳小華", quantity: 2, status: "returned", borrowedAt: new Date("2026-08-12T09:00:00"), actualReturnAt: new Date("2026-08-13T08:30:00") },
    ] });

    const recentActivity = screen.getByTestId("qr-recent-activity");
    expect(recentActivity).toBeInTheDocument();
    expect(recentActivity).toHaveTextContent("Sony A7 相機");
    expect(recentActivity).toHaveTextContent("無線麥克風");
    expect(recentActivity).toHaveTextContent("借用");
    expect(recentActivity).toHaveTextContent("歸還");

    await user.click(screen.getByRole("tab", { name: "手動輸入" }));
    await user.type(screen.getAllByLabelText("器材識別碼")[0]!, "QSSHMST0008");
    await user.type(screen.getByLabelText("借用者個人 QR Code"), "QSSH-USER-V2:9:1:signature");
    await user.click(screen.getByRole("button", { name: "確認借用" }));

    await waitFor(() => expect(mocks.recentRecordsRefetch).toHaveBeenCalledTimes(1));
  });

  it("載入時會顯示 QR Code 頁面與列印清單的骨架屏", () => {
    renderPage({ equipmentData: [], isLoading: true });

    expect(screen.getByTestId("qr-code-page-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("qr-print-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("qr-print-sheet")).not.toBeInTheDocument();
  });

  it("可依關鍵字與分類篩選器材識別碼列印清單，並保留單獨列印操作", async () => {
    const user = userEvent.setup();
    renderPage({ equipmentData: [equipment, secondEquipment] });

    await user.type(screen.getByRole("textbox", { name: "搜尋器材識別碼" }), "DJI");
    expect(screen.getByText("DJI Mini 空拍機")).toBeInTheDocument();
    expect(screen.queryByText("Sony A7 相機")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "列印 DJI Mini 空拍機 QR Code + Barcode" })).toBeInTheDocument();

    await user.clear(screen.getByRole("textbox", { name: "搜尋器材識別碼" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "篩選器材識別碼分類" }), "1");
    expect(screen.getByText("Sony A7 相機")).toBeInTheDocument();
    expect(screen.queryByText("DJI Mini 空拍機")).not.toBeInTheDocument();
  });

  it("可依存放位置排序器材識別碼列印清單", async () => {
    const user = userEvent.setup();
    renderPage({ equipmentData: [equipment, secondEquipment] });

    await user.selectOptions(screen.getByRole("combobox", { name: "依器材識別碼存放位置排序" }), "desc");
    const cards = screen.getAllByTestId("qr-print-card");
    expect(cards[0]).toHaveTextContent("Sony A7 相機");
    expect(cards[1]).toHaveTextContent("DJI Mini 空拍機");
  });

  it("可依存放位置篩選列印並於預覽中排除單一器材後才記錄列印", async () => {
    const user = userEvent.setup();
    renderPage({ equipmentData: [equipment, secondEquipment] });

    await user.selectOptions(screen.getByRole("combobox", { name: "篩選器材識別碼存放位置" }), "器材室 B-02");
    expect(screen.getByText("DJI Mini 空拍機")).toBeInTheDocument();
    expect(screen.queryByText("Sony A7 相機")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "預覽 QR Code + Barcode 清單" }));
    await user.click(screen.getByRole("checkbox", { name: "保留 DJI Mini 空拍機 於列印預覽" }));
    expect(screen.getByRole("button", { name: "確認並開啟列印" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "返回調整" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "篩選器材識別碼存放位置" }), "");
    await user.click(screen.getByRole("button", { name: "預覽 QR Code + Barcode 清單" }));
    await user.click(screen.getByRole("checkbox", { name: "保留 Sony A7 相機 於列印預覽" }));
    await user.click(screen.getByRole("button", { name: "確認並開啟列印" }));

    expect(mocks.recordQrPrintMutateAsync).toHaveBeenCalledWith({ equipmentIds: [9], locationFilter: undefined, labelPaperSize: "a4-3x2" });
  });

  it("會顯示已確認器材識別碼列印的時間、數量、位置與紙張尺寸歷程", () => {
    renderPage({ printHistory: [{
      id: 81,
      printedById: 2,
      printedByName: "器材管理員",
      printedByUsername: "media-admin",
      equipmentIds: "[8,9]",
      equipmentCount: 2,
      locationFilter: "攝影器材櫃 A-03",
      labelPaperSize: "a4-2x2",
      printedAt: new Date("2026-08-13T10:30:00"),
    }] });

    const history = screen.getByTestId("qr-print-history");
    expect(history).toHaveTextContent("器材識別碼列印歷程");
    expect(history).toHaveTextContent("2 項器材 · A4 大型 2 × 2");
    expect(history).toHaveTextContent("操作人：器材管理員（media-admin） · 位置：攝影器材櫃 A-03");
    expect(history).toHaveTextContent("2026/");
  });

  it("可從多筆 print 查詢參數進入已選器材批次列印", async () => {
    vi.useFakeTimers();
    const printSpy = vi.fn();
    Object.defineProperty(window, "print", { configurable: true, value: printSpy });
    window.history.replaceState({}, "", "/qrcode-borrow-return?print=8,9");
    renderPage({ equipmentData: [equipment, secondEquipment] });

    expect(screen.getByTestId("qr-print-sheet")).toHaveAttribute("data-print-mode", "selected");
    expect(screen.getAllByTestId("qr-print-card")).toHaveLength(2);
    screen.getAllByTestId("qr-print-card").forEach((card) => {
      expect(card).toHaveAttribute("data-print-selected", "true");
    });
    fireEvent.click(screen.getByRole("button", { name: "預覽已選取 2 項" }));
    expect(screen.getByRole("dialog", { name: "QR Code + Barcode 批次列印預覽" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "確認並開啟列印" }));
    expect(mocks.recordQrPrintMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ equipmentIds: [8, 9] }));
    await Promise.resolve();
    await vi.runAllTimersAsync();
    expect(printSpy).toHaveBeenCalledOnce();
  });

  it("可在器材識別碼列印區直接多選器材並使用標籤化批次版面", () => {
    renderPage({ equipmentData: [equipment, secondEquipment] });

    expect(screen.getByTestId("qr-batch-print-layout")).toHaveClass("qr-batch-print-layout");
    expect(screen.getAllByText("DUAL EQUIPMENT LABEL")).toHaveLength(2);
    fireEvent.click(screen.getByRole("checkbox", { name: "選取 Sony A7 相機 於識別碼列印版面" }));
    expect(screen.getByTestId("qr-print-sheet")).toHaveAttribute("data-print-mode", "selected");
    expect(screen.getAllByTestId("qr-print-card")[0]).toHaveAttribute("data-print-selected", "true");

    fireEvent.click(screen.getByRole("button", { name: "全選篩選結果" }));
    expect(screen.getAllByTestId("qr-print-card").every((card) => card.getAttribute("data-print-selected") === "true")).toBe(true);
  });

  it("可於單一器材預覽確認列印，並在列印結束後回復完整清單", async () => {
    vi.useFakeTimers();
    const printSpy = vi.fn();
    Object.defineProperty(window, "print", { configurable: true, value: printSpy });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "列印 Sony A7 相機 QR Code + Barcode" }));
    expect(screen.getByTestId("qr-print-sheet")).toHaveAttribute("data-print-mode", "selected");
    expect(screen.getByTestId("qr-print-card")).toHaveAttribute("data-print-selected", "true");
    fireEvent.click(screen.getByRole("button", { name: "確認並開啟列印" }));
    expect(mocks.recordQrPrintMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ equipmentIds: [8] }));
    await Promise.resolve();
    await vi.runAllTimersAsync();
    expect(printSpy).toHaveBeenCalledOnce();

    fireEvent(window, new Event("afterprint"));
    expect(screen.getByTestId("qr-print-sheet")).toHaveAttribute("data-print-mode", "all");
  });

  it("可產生並下載整份雙碼器材識別碼清單 PDF", async () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "匯出為 PDF" }));

    await waitFor(() => {
      expect(mocks.exportQrPrintSheetToPdf).toHaveBeenCalledWith(expect.objectContaining({
        codeMode: "both",
        labelPaperSize: "a4-3x2",
        groupByLocation: false,
        downloadedBy: "測試管理員",
        items: [expect.objectContaining({ id: 8, codeId: "QSSHMST0008", name: "Sony A7 相機" })],
      }));
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("QR Code + Barcode 清單 PDF 已開始下載");
  });

  it("可選擇依存放位置自動分頁後匯出 PDF", async () => {
    const user = userEvent.setup();
    renderPage({ equipmentData: [equipment, secondEquipment] });

    await user.click(screen.getByRole("checkbox", { name: "依存放位置自動分頁" }));
    await user.click(screen.getByRole("button", { name: "匯出為 PDF" }));

    await waitFor(() => {
      expect(mocks.exportQrPrintSheetToPdf).toHaveBeenCalledWith(expect.objectContaining({
        codeMode: "both",
        labelPaperSize: "a4-3x2",
        groupByLocation: true,
        downloadedBy: "測試管理員",
        items: expect.arrayContaining([expect.objectContaining({ id: 8 }), expect.objectContaining({ id: 9 })]),
      }));
    });
  });

  it("可依自訂標籤紙尺寸預覽批次列印內容並估算總頁數", async () => {
    const user = userEvent.setup();
    const fiveEquipment = Array.from({ length: 5 }, (_, index) => ({
      ...equipment,
      id: index + 20,
      name: `測試器材 ${index + 1}`,
      qrCodeId: `QSSHMST${String(index + 20).padStart(4, "0")}`,
    }));
    renderPage({ equipmentData: fiveEquipment });

    await user.selectOptions(screen.getByRole("combobox", { name: "選擇器材識別碼標籤紙尺寸" }), "a4-2x2");
    expect(screen.getByTestId("qr-print-sheet")).toHaveAttribute("data-label-paper-size", "a4-2x2");
    expect(screen.getByLabelText("預估列印總頁數")).toHaveTextContent("約 2 頁");

    await user.click(screen.getByRole("button", { name: "預覽 QR Code + Barcode 清單" }));
    const dialog = screen.getByRole("dialog", { name: "QR Code + Barcode 批次列印預覽" });
    expect(dialog).toHaveTextContent("A4 大型 2 × 2");
    expect(dialog).toHaveTextContent("5 枚");
    expect(dialog).toHaveTextContent("約 2 頁");
    expect(screen.getByTestId("qr-print-preview-grid")).toHaveClass("grid-cols-2");
  });

  it("會顯示可列印的品牌頁首，並在確認後觸發列印控制項", async () => {
    vi.useFakeTimers();
    const printSpy = vi.fn();
    Object.defineProperty(window, "print", { configurable: true, value: printSpy });
    renderPage();

    expect(screen.getByTestId("qr-print-sheet")).toHaveClass("animate-fade-in");
    expect(screen.getByTestId("qr-print-brand-header")).toHaveTextContent("清水高中媒體服務隊");
    expect(screen.getByTestId("qr-print-brand-header")).toHaveTextContent("器材識別碼列印清單");
    expect(screen.getByTestId("qr-print-brand-logo")).toHaveAttribute("data-brand-logo-vector", "true");
    expect(screen.getByTestId("qr-print-brand-logo")).toHaveClass("brand-logo-vector");
    expect(screen.getByTestId("qr-print-card")).toHaveClass("qr-print-card", "animate-fade-in");

    fireEvent.click(screen.getByRole("button", { name: "預覽 QR Code + Barcode 清單" }));
    fireEvent.click(screen.getByRole("button", { name: "確認並開啟列印" }));
    expect(mocks.recordQrPrintMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ equipmentIds: [8] }));
    await Promise.resolve();
    await vi.runAllTimersAsync();
    expect(printSpy).toHaveBeenCalledOnce();
  });

  it("列印樣式會保留品牌頁首並排除操作控制項與動畫", () => {
    const css = readFileSync("client/src/index.css", "utf8");

    expect(css).toContain("@media print");
    expect(css).toContain(".print-hidden { display: none !important; }");
    expect(css).toContain(".qr-print-brand-header { background: white !important;");
    expect(css).toContain(".qr-print-card { break-inside: avoid;");
    expect(css).toContain("@page { size: A4 portrait; margin: 10mm; }");
    expect(css).toContain(".qr-print-card-header { padding: 4mm !important;");
    expect(css).toContain("data-label-paper-size=\"a4-2x2\"");
    expect(css).toContain("data-label-paper-size=\"thermal-100x150\"");
    expect(css).toContain("animation: none !important;");
  });

  it("掃描、列印與預覽區具有淺色模式高對比樣式", () => {
    const css = readFileSync("client/src/index.css", "utf8");
    const page = readFileSync("client/src/pages/QrCodeBorrowReturn.tsx", "utf8");

    expect(page).toContain('className="qr-borrow-return-page container mx-auto p-4"');
    expect(page).toContain("qr-code-mode-switcher");
    expect(page).toContain("qr-print-preview-dialog");
    expect(css).toContain("html:not(.dark) .qr-borrow-return-page .qr-scan-mode-hint");
    expect(css).toContain("html:not(.dark) .qr-borrow-return-page .qr-recent-activity-card");
    expect(css).toContain("html:not(.dark) .qr-borrow-return-page .qr-print-filter-panel");
    expect(css).toContain("html:not(.dark) .qr-print-preview-dialog");
    expect(css).toContain("focus-visible");
  });

  it("高級掃描器會呈現即時狀態、格式徽章與掃描框外殼", () => {
    renderPage();

    expect(screen.getByTestId("qr-scanner-shell")).toHaveAttribute("aria-label", "QR／Barcode 相機掃描器");
    expect(screen.getByTestId("qr-scanner-viewport")).toBeInTheDocument();
    expect(screen.getByText("LIVE CAPTURE")).toBeInTheDocument();
    expect(screen.getAllByText("QR Code + Barcode").length).toBeGreaterThan(0);
    expect(screen.getByTestId("qr-scanner-status")).toHaveTextContent("準備掃描");
    expect(screen.getByRole("button", { name: "開始掃描" })).toHaveAttribute("aria-pressed", "false");
  });

  it("按下開始掃描會直接請求後鏡頭權限並自動啟動，不顯示預設相機控制面板", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "開始掃描" }));

    await waitFor(() => expect(mocks.scannerRender).toHaveBeenCalledTimes(1));
    expect(mocks.scannerRender).toHaveBeenCalledWith(
      { facingMode: { ideal: "environment" } },
      expect.objectContaining({ fps: 10 }),
      expect.any(Function),
      expect.any(Function)
    );
    expect(screen.getByTestId("qr-scanner-status")).toHaveTextContent("相機已啟動，請掃描使用者個人 QR Code");
    expect(screen.queryByText("Request Camera Permissions")).not.toBeInTheDocument();
  });

  it("掃描器視覺動態支援減少動態效果並保留鍵盤焦點樣式", () => {
    const css = readFileSync("client/src/index.css", "utf8");

    expect(css).toContain("@keyframes qr-scanner-sweep");
    expect(css).toContain("@keyframes qr-scanner-pulse");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain(".qr-scanner-viewport #qr-reader__dashboard_section_csr select:focus-visible");
  });

  it("可由手動輸入完成借用並顯示成功訊息", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("tab", { name: "手動輸入" }));
    await user.type(screen.getAllByLabelText("器材識別碼")[0]!, "QSSHMST0008");
    await user.type(screen.getByLabelText("借用者個人 QR Code"), "QSSH-USER-V2:3:1:signature");
    await user.click(screen.getByRole("button", { name: "確認借用" }));

    await waitFor(() => {
      expect(mocks.borrowMutateAsync).toHaveBeenCalledWith({ equipmentId: 8, userId: 3 });
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("器材 Sony A7 相機 借用成功！");
    expect(mocks.refetch).toHaveBeenCalled();
  });

  it("會拒絕找不到的器材識別碼，且不送出借用請求", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("tab", { name: "手動輸入" }));
    await user.type(screen.getAllByLabelText("器材識別碼")[0]!, "QSSHMST9999");
    await user.type(screen.getByLabelText("借用者個人 QR Code"), "QSSH-USER-V2:3:1:signature");
    await user.click(screen.getByRole("button", { name: "確認借用" }));

    expect(mocks.borrowMutateAsync).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalledWith("找不到該識別碼對應的器材");
  });

  it("會拒絕非動態個人 QR Code 的借用者資料", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("tab", { name: "手動輸入" }));
    await user.type(screen.getAllByLabelText("器材識別碼")[0]!, "QSSHMST0008");
    fireEvent.change(screen.getByLabelText("借用者個人 QR Code"), { target: { value: "0" } });
    await user.click(screen.getByRole("button", { name: "確認借用" }));

    expect(mocks.borrowMutateAsync).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalledWith("借用者必須使用有效的個人資料 QR Code，請重新掃描");
  });

  it("掃描借用時會先驗證個人資料 QR Code，再接續批量掃描器材並統一確認借用", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "開始掃描" }));

    const firstScan = mocks.scannerRender.mock.calls[0]?.[2] as ((value: string) => void) | undefined;
    expect(firstScan).toBeDefined();
    firstScan?.("QSSH-USER-V2:3:1:signature");

    await waitFor(() => expect(mocks.resolveDynamicBorrowerQrMutateAsync).toHaveBeenCalledWith({ value: "QSSH-USER-V2:3:1:signature" }));
    expect(screen.getByTestId("borrower-qr-scan-stage")).toHaveTextContent("步驟 2／2：掃描器材");
    expect(screen.getByTestId("borrower-qr-scan-stage")).toHaveTextContent("已驗證使用者 #3");

    await waitFor(() => expect(mocks.scannerRender.mock.calls.length).toBeGreaterThan(1));
    const secondScan = mocks.scannerRender.mock.calls.at(-1)?.[2] as ((value: string) => void) | undefined;
    secondScan?.("QSSHMST0008");

    await waitFor(() => expect(screen.getByTestId("borrow-batch-queue")).toHaveTextContent("待確認借用器材 1 項"));
    expect(mocks.borrowMutateAsync).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "停止掃描" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "確認批量借用（1 項）" }));
    expect(screen.getByRole("dialog", { name: "確認批量借用" })).toHaveTextContent("Sony A7 相機");
    fireEvent.click(screen.getByRole("button", { name: "確認借用 1 項" }));

    await waitFor(() => expect(mocks.borrowMutateAsync).toHaveBeenCalledWith({ equipmentId: 8, userId: 3 }));
    expect(mocks.resolveDynamicBorrowerQrMutateAsync).toHaveBeenCalledTimes(2);
    expect(mocks.toastSuccess).toHaveBeenCalledWith("已完成 1 項器材借用");
  });

  it("批量掃描會保留使用者認證並可連續加入多項器材後一次確認", async () => {
    renderPage({ equipmentData: [equipment, secondEquipment] });
    fireEvent.click(screen.getByRole("button", { name: "開始掃描" }));

    const borrowerScan = mocks.scannerRender.mock.calls[0]?.[2] as ((value: string) => void) | undefined;
    borrowerScan?.("QSSH-USER-V2:3:1:signature");
    await waitFor(() => expect(mocks.scannerRender.mock.calls.length).toBeGreaterThan(1));

    const equipmentScan = mocks.scannerRender.mock.calls.at(-1)?.[2] as ((value: string) => void) | undefined;
    equipmentScan?.("QSSHMST0008");
    await waitFor(() => expect(screen.getByTestId("borrow-batch-queue")).toHaveTextContent("Sony A7 相機"));
    equipmentScan?.("QSSHMST0009");

    await waitFor(() => expect(screen.getByTestId("borrow-batch-queue")).toHaveTextContent("待確認借用器材 2 項"));
    expect(screen.getByTestId("borrow-batch-queue")).toHaveTextContent("DJI Mini 空拍機");
    fireEvent.click(screen.getByRole("button", { name: "確認批量借用（2 項）" }));
    fireEvent.click(screen.getByRole("button", { name: "確認借用 2 項" }));

    await waitFor(() => expect(mocks.borrowMutateAsync).toHaveBeenNthCalledWith(1, { equipmentId: 8, userId: 3 }));
    expect(mocks.borrowMutateAsync).toHaveBeenNthCalledWith(2, { equipmentId: 9, userId: 3 });
  });

  it("可由手動輸入完成歸還，並在 API 失敗時顯示錯誤", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("tab", { name: "手動輸入" }));
    await user.type(screen.getAllByLabelText("器材識別碼")[1]!, "QSSHMST0008");
    await user.click(screen.getByRole("button", { name: "確認歸還" }));

    await waitFor(() => {
      expect(mocks.returnMutateAsync).toHaveBeenCalledWith({ equipmentId: 8 });
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("器材 Sony A7 相機 歸還成功！");

    mocks.returnMutateAsync.mockRejectedValueOnce(new Error("器材未被借用"));
    await user.type(screen.getAllByLabelText("器材識別碼")[1]!, "QSSHMST0008");
    await user.click(screen.getByRole("button", { name: "確認歸還" }));

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("歸還失敗: 器材未被借用");
    });
  });
});
