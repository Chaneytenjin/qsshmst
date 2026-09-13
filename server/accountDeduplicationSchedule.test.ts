import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  getScheduleByTaskUid: vi.fn(),
  findDuplicates: vi.fn(),
  createReport: vi.fn(),
  updateLastRun: vi.fn(),
  sendSummary: vi.fn(),
}));

vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: mocks.authenticateRequest } }));
vi.mock("./db", () => ({
  getAccountDeduplicationScheduleByTaskUid: mocks.getScheduleByTaskUid,
  findDuplicateAccounts: mocks.findDuplicates,
  createAccountDeduplicationReport: mocks.createReport,
  updateAccountDeduplicationScheduleLastRun: mocks.updateLastRun,
}));
vi.mock("./systemAlertEmail", () => ({ sendSystemAlertEmail: mocks.sendSummary }));

import { runAccountDeduplicationSchedule } from "./accountDeduplicationSchedule";

function createResponse() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  return response;
}

describe("daily account deduplication schedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "task-dedup-1" });
    mocks.getScheduleByTaskUid.mockResolvedValue({ id: 4, isActive: true });
    mocks.findDuplicates.mockResolvedValue([{ field: "email", value: "duplicate@example.com", users: [{ id: 9 }, { id: 10 }] }]);
    mocks.createReport.mockResolvedValue(undefined);
    mocks.updateLastRun.mockResolvedValue(undefined);
    mocks.sendSummary.mockResolvedValue({ sent: 1, failed: 0, suppressed: 0, recipients: 1 });
  });

  it("接受已授權排程並只保存去重報告，絕不執行帳號停用", async () => {
    const response = createResponse();
    await runAccountDeduplicationSchedule({ originalUrl: "/api/scheduled/accountDedup", url: "/api/scheduled/accountDedup" } as any, response as any);

    expect(mocks.getScheduleByTaskUid).toHaveBeenCalledWith("task-dedup-1");
    expect(mocks.createReport).toHaveBeenCalledWith(expect.objectContaining({ scheduleId: 4, groups: expect.any(Array) }));
    expect(mocks.updateLastRun).toHaveBeenCalledWith(4);
    expect(mocks.sendSummary).toHaveBeenCalledWith(expect.objectContaining({
      kind: "summary",
      eventKey: expect.stringMatching(/^account-dedup-daily:/),
      title: "每日帳號去重掃描摘要",
      details: expect.arrayContaining(["此排程僅產出報告，不會自動停用或刪除任何帳號"]),
    }));
    expect(response.json).toHaveBeenCalledWith({ ok: true, duplicateGroupCount: 1, mode: "report-only", emailSummary: { sent: 1, failed: 0, suppressed: 0, recipients: 1 } });
  });

  it("拒絕非 cron 請求，且不讀取或寫入任何維護資料", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: false });
    const response = createResponse();
    await runAccountDeduplicationSchedule({ originalUrl: "/api/scheduled/accountDedup", url: "/api/scheduled/accountDedup" } as any, response as any);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({ error: "cron-only" });
    expect(mocks.findDuplicates).not.toHaveBeenCalled();
    expect(mocks.createReport).not.toHaveBeenCalled();
  });

  it("已停用的排程會成功略過且不產生新報告", async () => {
    mocks.getScheduleByTaskUid.mockResolvedValue({ id: 4, isActive: false });
    const response = createResponse();
    await runAccountDeduplicationSchedule({ originalUrl: "/api/scheduled/accountDedup", url: "/api/scheduled/accountDedup" } as any, response as any);

    expect(response.json).toHaveBeenCalledWith({ ok: true, skipped: "inactive" });
    expect(mocks.findDuplicates).not.toHaveBeenCalled();
    expect(mocks.createReport).not.toHaveBeenCalled();
  });

  it("郵件摘要失敗時仍會保留去重報告並回傳可觀測的寄送狀態", async () => {
    mocks.sendSummary.mockRejectedValue(new Error("SMTP unavailable"));
    const response = createResponse();
    await runAccountDeduplicationSchedule({ originalUrl: "/api/scheduled/accountDedup", url: "/api/scheduled/accountDedup" } as any, response as any);

    expect(mocks.createReport).toHaveBeenCalled();
    expect(mocks.updateLastRun).toHaveBeenCalledWith(4);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true, mode: "report-only", emailSummary: expect.objectContaining({ unavailable: true }) }));
  });
});
