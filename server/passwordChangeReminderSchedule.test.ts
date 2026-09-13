import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  getSchedule: vi.fn(),
  getTargets: vi.fn(),
  markSent: vi.fn(),
  updateLastRun: vi.fn(),
  sendReminder: vi.fn(),
}));

vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: mocks.authenticateRequest } }));
vi.mock("./db", () => ({
  getPasswordChangeReminderScheduleByTaskUid: mocks.getSchedule,
  getUsersDueForPasswordChangeReminder: mocks.getTargets,
  markPasswordChangeReminderSent: mocks.markSent,
  updatePasswordChangeReminderScheduleLastRun: mocks.updateLastRun,
}));
vi.mock("./passwordChangeReminderEmail", () => ({ sendPasswordChangeReminder: mocks.sendReminder }));

import { runPasswordChangeReminderSchedule } from "./passwordChangeReminderSchedule";

function createResponse() {
  const res = { statusCode: 200, body: undefined as unknown, status(code: number) { this.statusCode = code; return this; }, json(value: unknown) { this.body = value; return this; } };
  return res;
}

describe("180 天密碼更換提醒排程", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "password-reminder-task" });
    mocks.getSchedule.mockResolvedValue({ id: 3, scheduleCronTaskUid: "password-reminder-task", isActive: true });
    mocks.getTargets.mockResolvedValue([{ id: 12, username: "verified-user", name: "Verified User", email: "verified@example.com", passwordChangedAt: new Date("2026-02-01T00:00:00.000Z"), createdAt: new Date("2026-02-01T00:00:00.000Z") }]);
    mocks.sendReminder.mockResolvedValue(undefined);
    mocks.markSent.mockResolvedValue(undefined);
    mocks.updateLastRun.mockResolvedValue(undefined);
  });

  it("只對已到期且已通過資料層信箱驗證的目標寄送一次提醒，成功後才標記已寄送", async () => {
    const res = createResponse();
    await runPasswordChangeReminderSchedule({ protocol: "https", headers: { "x-forwarded-host": "qingshuimed.example" }, get: () => "qingshuimed.example", originalUrl: "/api/scheduled/passwordChangeReminder" } as any, res as any);

    expect(mocks.sendReminder).toHaveBeenCalledWith(expect.objectContaining({ to: "verified@example.com", profileUrl: "https://qingshuimed.example/profile", accountLabel: "verified-user" }));
    expect(mocks.markSent).toHaveBeenCalledWith(12);
    expect(mocks.updateLastRun).toHaveBeenCalledWith(3);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, checked: 1, sent: 1, failed: 0, intervalDays: 180 });
  });

  it("寄信失敗時不標記已提醒，保留下一次排程重新嘗試的可能", async () => {
    mocks.sendReminder.mockRejectedValueOnce(new Error("SMTP unavailable"));
    const res = createResponse();
    await runPasswordChangeReminderSchedule({ protocol: "https", headers: { host: "qingshuimed.example" }, get: () => "qingshuimed.example", originalUrl: "/api/scheduled/passwordChangeReminder" } as any, res as any);

    expect(mocks.markSent).not.toHaveBeenCalled();
    expect(res.body).toEqual({ ok: true, checked: 1, sent: 0, failed: 1, intervalDays: 180 });
  });

  it("拒絕非排程身分的呼叫", async () => {
    mocks.authenticateRequest.mockResolvedValueOnce({ isCron: false });
    const res = createResponse();
    await runPasswordChangeReminderSchedule({ originalUrl: "/api/scheduled/passwordChangeReminder" } as any, res as any);
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: "cron-only" });
  });
});
