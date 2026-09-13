import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  getSchedule: vi.fn(),
  updateOverdue: vi.fn(),
  getTargets: vi.fn(),
  createReminder: vi.fn(),
  updateEmail: vi.fn(),
  updateLastRun: vi.fn(),
  sendEmail: vi.fn(),
  sendSystemAlert: vi.fn(),
}));

vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: mocks.authenticateRequest } }));
vi.mock("./db", () => ({
  getOverdueBorrowReminderScheduleByTaskUid: mocks.getSchedule,
  updateOverdueRecords: mocks.updateOverdue,
  getBorrowReminderTargets: mocks.getTargets,
  createBorrowReturnReminder: mocks.createReminder,
  updateBorrowReturnReminderEmail: mocks.updateEmail,
  updateOverdueBorrowReminderScheduleLastRun: mocks.updateLastRun,
}));
vi.mock("./borrowReturnReminderEmail", () => ({ sendBorrowReturnReminder: mocks.sendEmail }));
vi.mock("./systemAlertEmail", () => ({ sendSystemAlertEmail: mocks.sendSystemAlert }));

import { runOverdueBorrowReminderSchedule } from "./overdueBorrowReminderSchedule";

function createResponse() {
  const response = { status: vi.fn(), json: vi.fn() };
  response.status.mockReturnValue(response);
  return response;
}

describe("Overdue borrow reminder schedule", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-13T08:00:00.000Z")); // Taiwan 16:00
    vi.clearAllMocks();
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "cron-overdue" });
    mocks.getSchedule.mockResolvedValue({ id: 4, isActive: true, scheduleCronTaskUid: "cron-overdue" });
    mocks.updateOverdue.mockResolvedValue(undefined);
    mocks.getTargets.mockResolvedValue([]);
    mocks.createReminder.mockResolvedValue(71);
    mocks.updateEmail.mockResolvedValue(undefined);
    mocks.updateLastRun.mockResolvedValue(undefined);
    mocks.sendEmail.mockResolvedValue(undefined);
    mocks.sendSystemAlert.mockResolvedValue({ sent: 1 });
  });

  afterEach(() => vi.useRealTimers());

  it("建立明日到期的站內提醒、寄送借用者郵件，並向管理者送出摘要", async () => {
    mocks.getTargets.mockResolvedValue([{
      id: 8,
      equipmentName: "Sony A7 相機",
      borrowerId: 23,
      borrowerName: "王小明",
      borrowerUsername: "wang",
      borrowerEmail: "wang@example.com",
      expectedReturnAt: new Date("2026-08-14T03:00:00.000Z"),
      status: "active",
    }]);
    const res = createResponse();

    await runOverdueBorrowReminderSchedule({ protocol: "https", headers: { "x-forwarded-host": "qingshuimed.example" }, get: () => "qingshuimed.example", originalUrl: "/api/scheduled/overdueBorrowReminder" } as any, res as any);

    expect(mocks.updateOverdue).toHaveBeenCalledOnce();
    expect(mocks.createReminder).toHaveBeenCalledWith(expect.objectContaining({ borrowRecordId: 8, borrowerId: 23, reminderType: "due_soon", reminderDate: "2026-08-13" }));
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "wang@example.com", reminderType: "due_soon", dashboardUrl: "https://qingshuimed.example/dashboard" }));
    expect(mocks.updateEmail).toHaveBeenCalledWith({ id: 71, status: "sent" });
    expect(mocks.updateLastRun).toHaveBeenCalledWith(4);
    expect(mocks.sendSystemAlert).toHaveBeenCalledWith(expect.objectContaining({ eventKey: "borrow-reminder:2026-08-13" }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true, dueSoon: 1, overdue: 0, emailsSent: 1 }));
  });

  it("每日去重後不重複寄送，且沒有電子郵件的借用者仍保留站內提醒", async () => {
    mocks.getTargets.mockResolvedValue([{
      id: 9,
      equipmentName: "無線麥克風",
      borrowerId: 25,
      borrowerName: "陳小華",
      borrowerUsername: "chen",
      borrowerEmail: null,
      expectedReturnAt: new Date("2026-08-12T03:00:00.000Z"),
      status: "overdue",
    }]);
    mocks.createReminder.mockResolvedValueOnce(undefined).mockResolvedValueOnce(72);
    const firstRes = createResponse();
    await runOverdueBorrowReminderSchedule({ originalUrl: "/api/scheduled/overdueBorrowReminder" } as any, firstRes as any);
    expect(mocks.sendEmail).not.toHaveBeenCalled();

    const secondRes = createResponse();
    await runOverdueBorrowReminderSchedule({ originalUrl: "/api/scheduled/overdueBorrowReminder" } as any, secondRes as any);
    expect(mocks.updateEmail).toHaveBeenCalledWith({ id: 72, status: "skipped", error: "帳號未設定電子郵件" });
    expect(secondRes.json).toHaveBeenCalledWith(expect.objectContaining({ overdue: 1, emailsSkipped: 1 }));
  });

  it("拒絕非排程呼叫並在內部錯誤時回傳可調查的 JSON 錯誤", async () => {
    mocks.authenticateRequest.mockResolvedValueOnce({ isCron: false });
    const forbiddenRes = createResponse();
    await runOverdueBorrowReminderSchedule({ originalUrl: "/api/scheduled/overdueBorrowReminder" } as any, forbiddenRes as any);
    expect(forbiddenRes.status).toHaveBeenCalledWith(403);

    mocks.authenticateRequest.mockRejectedValueOnce(new Error("authentication down"));
    const failedRes = createResponse();
    await runOverdueBorrowReminderSchedule({ originalUrl: "/api/scheduled/overdueBorrowReminder" } as any, failedRes as any);
    expect(failedRes.status).toHaveBeenCalledWith(500);
    expect(failedRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: "authentication down", context: expect.objectContaining({ url: "/api/scheduled/overdueBorrowReminder" }) }));
  });
});
