import { describe, expect, it, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  createReimbursementClaim: vi.fn(),
  createReimbursementNotification: vi.fn(),
  createReimbursementReceipt: vi.fn(),
  createOperationLog: vi.fn(),
  deleteReimbursementReceipt: vi.fn(),
  getReimbursementClaimById: vi.fn(),
  getReimbursementClaims: vi.fn(),
  getReimbursementReceiptById: vi.fn(),
  getUnreadReimbursementNotifications: vi.fn(),
  getMonthlyReimbursementCategorySummary: vi.fn(),
  getReimbursementMonthlyTrend: vi.fn(),
  markReimbursementNotificationsRead: vi.fn(),
  updateReimbursementClaimStatus: vi.fn(),
}));

const storageMocks = vi.hoisted(() => ({ storagePut: vi.fn() }));

vi.mock("./db", () => dbMocks);
vi.mock("./storage", () => storageMocks);

const draftClaim = {
  id: 41,
  claimNumber: "RB20260815-1234",
  requesterId: 3,
  title: "活動耗材",
  purpose: "社團活動使用",
  status: "draft",
  totalAmount: "540.00",
  submittedAt: null,
  reviewedById: null,
  reviewedAt: null,
  reviewNote: null,
  paidById: null,
  paidAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  requesterUsername: "student",
  requesterName: "學生",
  requesterRealName: "學生甲",
  reviewerUsername: null,
  reviewerName: null,
  reviewerRealName: null,
  items: [{ id: 8, claimId: 41, expenseDate: new Date(), category: "耗材", merchant: "文具店", description: "紙張", amount: "540.00", createdAt: new Date() }],
  receipts: [],
};

function createContext(role: "student" | "teacher" | "admin", id = 3): TrpcContext {
  return {
    user: {
      id,
      openId: `reimbursement-${role}-${id}`,
      username: `${role}-${id}`,
      name: "測試使用者",
      role,
      isActive: true,
      isFounder: role === "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as TrpcContext["res"],
  };
}

describe("Reimbursement routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.createReimbursementClaim.mockResolvedValue(41);
    dbMocks.createReimbursementNotification.mockResolvedValue(88);
    dbMocks.createReimbursementReceipt.mockResolvedValue(77);
    dbMocks.createOperationLog.mockResolvedValue(undefined);
    dbMocks.getReimbursementClaims.mockResolvedValue([draftClaim]);
    dbMocks.getReimbursementClaimById.mockResolvedValue(draftClaim);
    dbMocks.getReimbursementReceiptById.mockResolvedValue(undefined);
    dbMocks.getUnreadReimbursementNotifications.mockResolvedValue([]);
    dbMocks.getMonthlyReimbursementCategorySummary.mockResolvedValue({ month: "2026-08", totalAmount: 540, claimCount: 1, categories: [{ category: "耗材", totalAmount: 540, itemCount: 1 }] });
    dbMocks.getReimbursementMonthlyTrend.mockResolvedValue([{ month: "2026-07", label: "2026/07", totalAmount: 240, claimCount: 1, itemCount: 1 }, { month: "2026-08", label: "2026/08", totalAmount: 540, claimCount: 1, itemCount: 1 }]);
    dbMocks.markReimbursementNotificationsRead.mockResolvedValue(undefined);
    dbMocks.updateReimbursementClaimStatus.mockResolvedValue(undefined);
    storageMocks.storagePut.mockResolvedValue({ key: "reimbursements/41/receipts/receipt.jpg", url: "/manus-storage/reimbursements/41/receipts/receipt.jpg" });
  });

  it("任何登入使用者可建立含正確加總與稽核紀錄的報帳草稿", async () => {
    const caller = appRouter.createCaller(createContext("student"));
    const result = await caller.reimbursements.create({
      title: "活動耗材",
      purpose: "社團活動使用",
      items: [
        { expenseDate: new Date("2026-08-12T00:00:00+08:00"), category: "耗材", merchant: "文具店", description: "紙張", amount: 540 },
      ],
    });

    expect(result).toEqual(expect.objectContaining({ success: true, id: 41, claimNumber: expect.stringMatching(/^RB\d{8}-\d{4}$/) }));
    expect(dbMocks.createReimbursementClaim).toHaveBeenCalledWith(expect.objectContaining({ requesterId: 3, status: "draft", totalAmount: "540.00" }), expect.arrayContaining([expect.objectContaining({ amount: "540.00", description: "紙張" })]));
    expect(dbMocks.createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "createReimbursementClaim", entityType: "reimbursementClaim", entityId: 41 }));
  });

  it("學生不可檢視全體報帳單，草稿本人可安全送審", async () => {
    const caller = appRouter.createCaller(createContext("student"));
    await expect(caller.reimbursements.list()).rejects.toThrow("需要教師或管理員權限");
    await expect(caller.reimbursements.submit({ id: 41 })).resolves.toEqual({ success: true });
    expect(dbMocks.updateReimbursementClaimStatus).toHaveBeenCalledWith(41, expect.objectContaining({ status: "submitted", reviewedById: null }));
    expect(dbMocks.createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "submitReimbursementClaim", entityId: 41 }));
  });

  it("教師不可審核自己提出的報帳，其他教師可核准並寫入稽核", async () => {
    dbMocks.getReimbursementClaimById.mockResolvedValue({ ...draftClaim, status: "submitted" });
    const ownCaller = appRouter.createCaller(createContext("teacher", 3));
    await expect(ownCaller.reimbursements.review({ id: 41, decision: "approved", reviewNote: "核對完成" })).rejects.toThrow("不可審核自己提出的報帳單");

    const reviewer = appRouter.createCaller(createContext("teacher", 7));
    await expect(reviewer.reimbursements.review({ id: 41, decision: "approved", reviewNote: "核對完成" })).resolves.toEqual({ success: true });
    expect(dbMocks.updateReimbursementClaimStatus).toHaveBeenCalledWith(41, expect.objectContaining({ status: "approved", reviewedById: 7, reviewNote: "核對完成" }));
    expect(dbMocks.createReimbursementNotification).toHaveBeenCalledWith(expect.objectContaining({ claimId: 41, recipientId: 3, notificationType: "approved", message: expect.stringContaining("已通過審核") }));
    expect(dbMocks.createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "reviewReimbursementClaim", entityId: 41 }));
  });

  it("管理員與創始管理員可將草稿或已送審報帳直接發布並付款，學生不可略過審核", async () => {
    const admin = appRouter.createCaller(createContext("admin", 7));
    await expect(admin.reimbursements.directPublishAndPay({ id: 41 })).resolves.toEqual({ success: true });
    expect(dbMocks.updateReimbursementClaimStatus).toHaveBeenCalledWith(41, expect.objectContaining({ status: "paid", reviewedById: 7, paidById: 7, reviewNote: "管理員直接發布並付款（免審核流程）" }));
    expect(dbMocks.createReimbursementNotification).toHaveBeenCalledWith(expect.objectContaining({ claimId: 41, recipientId: 3, notificationType: "approved", message: expect.stringContaining("直接發布並標記付款完成") }));
    expect(dbMocks.createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "directPublishAndPayReimbursementClaim", entityId: 41 }));

    const student = appRouter.createCaller(createContext("student", 3));
    await expect(student.reimbursements.directPublishAndPay({ id: 41 })).rejects.toThrow("需要管理員權限");
  });

  it("申請人可讀取並確認自己的報帳審核通知，且確認操作保留稽核紀錄", async () => {
    const notification = { id: 88, claimId: 41, recipientId: 3, notificationType: "rejected", message: "已退回", isRead: false, readAt: null, createdAt: new Date(), claimNumber: draftClaim.claimNumber, claimTitle: draftClaim.title };
    dbMocks.getUnreadReimbursementNotifications.mockResolvedValue([notification]);
    const caller = appRouter.createCaller(createContext("student", 3));
    await expect(caller.reimbursements.unreadNotifications()).resolves.toEqual([notification]);
    await expect(caller.reimbursements.markNotificationsRead({ ids: [88] })).resolves.toEqual({ success: true });
    expect(dbMocks.getUnreadReimbursementNotifications).toHaveBeenCalledWith(3);
    expect(dbMocks.markReimbursementNotificationsRead).toHaveBeenCalledWith([88], 3);
    expect(dbMocks.createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "acknowledgeReimbursementNotifications", entityType: "reimbursementNotification" }));
  });

  it("僅教師與管理員可取得指定月份報帳分類統計並匯出 CSV 稽核快照", async () => {
    const teacher = appRouter.createCaller(createContext("teacher", 7));
    await expect(teacher.dashboard.monthlyReimbursementSummary({ month: "2026-07" })).resolves.toEqual(expect.objectContaining({ month: "2026-08", totalAmount: 540 }));
    expect(dbMocks.getMonthlyReimbursementCategorySummary).toHaveBeenCalledWith("2026-07");
    await expect(teacher.dashboard.exportMonthlyReimbursementSummaryCsv({ month: "2026-07" })).resolves.toEqual(expect.objectContaining({ totalAmount: 540 }));
    expect(dbMocks.createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "exportMonthlyReimbursementSummaryCsv", entityType: "reimbursementSummary" }));
    await expect(appRouter.createCaller(createContext("student", 3)).dashboard.monthlyReimbursementSummary()).rejects.toThrow("需要教師或管理員權限");
    await expect(appRouter.createCaller(createContext("student", 3)).dashboard.exportMonthlyReimbursementSummaryCsv({ month: "2026-07" })).rejects.toThrow("需要教師或管理員權限");
  });

  it("僅教師與管理員可取得跨月份支出趨勢並合併匯出多月 CSV 稽核快照", async () => {
    const teacher = appRouter.createCaller(createContext("teacher", 7));
    await expect(teacher.dashboard.reimbursementMonthlyTrend({ months: ["2026-08", "2026-07"] })).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ month: "2026-07", totalAmount: 240 })]));
    expect(dbMocks.getReimbursementMonthlyTrend).toHaveBeenCalledWith(["2026-08", "2026-07"]);
    await expect(teacher.dashboard.exportMultiMonthReimbursementSummaryCsv({ months: ["2026-08", "2026-07", "2026-07"] })).resolves.toEqual(expect.objectContaining({ months: ["2026-07", "2026-08"] }));
    expect(dbMocks.getMonthlyReimbursementCategorySummary).toHaveBeenCalledWith("2026-07");
    expect(dbMocks.getMonthlyReimbursementCategorySummary).toHaveBeenCalledWith("2026-08");
    expect(dbMocks.createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "exportMultiMonthReimbursementSummaryCsv", entityType: "reimbursementSummary", details: expect.stringContaining("monthCount") }));
    await expect(appRouter.createCaller(createContext("student", 3)).dashboard.reimbursementMonthlyTrend({ months: ["2026-07", "2026-08"] })).rejects.toThrow("需要教師或管理員權限");
    await expect(appRouter.createCaller(createContext("student", 3)).dashboard.exportMultiMonthReimbursementSummaryCsv({ months: ["2026-07", "2026-08"] })).rejects.toThrow("需要教師或管理員權限");
  });

  it("僅已核准或已付款案件可輸出 PDF，並記錄下載或列印操作", async () => {
    const caller = appRouter.createCaller(createContext("student", 3));
    dbMocks.getReimbursementClaimById.mockResolvedValue({ ...draftClaim, status: "approved" });
    await expect(caller.reimbursements.recordPdfExport({ id: 41, mode: "download" })).resolves.toEqual({ success: true });
    expect(dbMocks.createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "exportReimbursementPdf", entityId: 41 }));

    dbMocks.getReimbursementClaimById.mockResolvedValue({ ...draftClaim, status: "rejected" });
    await expect(caller.reimbursements.recordPdfExport({ id: 41, mode: "print" })).rejects.toThrow("僅已核准或已付款");
  });

  it("收據僅接受允許格式且必須屬於登入者的草稿", async () => {
    const caller = appRouter.createCaller(createContext("student"));
    await expect(caller.reimbursements.uploadReceipt({ claimId: 41, fileName: "receipt.exe", mimeType: "application/octet-stream", base64: "aGVsbG8=" })).rejects.toThrow("收據僅支援");
    expect(storageMocks.storagePut).not.toHaveBeenCalled();

    await expect(caller.reimbursements.uploadReceipt({ claimId: 41, fileName: "receipt.jpg", mimeType: "image/jpeg", base64: "aGVsbG8=" })).resolves.toEqual(expect.objectContaining({ id: 77, fileName: "receipt.jpg" }));
    expect(storageMocks.storagePut).toHaveBeenCalledWith(expect.stringContaining("reimbursements/41/receipts/"), expect.any(Buffer), "image/jpeg");
    expect(dbMocks.createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "uploadReimbursementReceipt", entityType: "reimbursementReceipt", entityId: 77 }));
  });
});
