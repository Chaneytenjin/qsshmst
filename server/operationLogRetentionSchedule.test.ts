import { beforeEach, describe, expect, it, vi } from "vitest";
import { runOperationLogRetentionSchedule } from "./operationLogRetentionSchedule";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  getScheduleByTaskUid: vi.fn(),
  runCleanup: vi.fn(),
}));

vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: mocks.authenticateRequest } }));
vi.mock("./db", () => ({
  getOperationLogRetentionScheduleByTaskUid: mocks.getScheduleByTaskUid,
  runOperationLogRetentionCleanup: mocks.runCleanup,
}));

function createResponse() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  return response;
}

describe("operation-log retention schedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "retention-task" });
    mocks.getScheduleByTaskUid.mockResolvedValue({ id: 5, scheduleCronTaskUid: "retention-task", retentionDays: 365, isActive: true });
    mocks.runCleanup.mockResolvedValue({ cutoffAt: new Date("2025-08-13T00:00:00.000Z"), deletedCount: 14 });
  });

  it("只允許受信任排程身分執行，並記錄 365 天清理結果", async () => {
    const response = createResponse();
    await runOperationLogRetentionSchedule({ originalUrl: "/api/scheduled/operationLogRetention", url: "/api/scheduled/operationLogRetention" } as any, response as any);

    expect(mocks.runCleanup).toHaveBeenCalledWith(expect.objectContaining({ id: 5, retentionDays: 365 }));
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true, retentionDays: 365, deletedCount: 14 }));
  });

  it("拒絕非排程請求，且不會執行任何清理", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: false });
    const response = createResponse();
    await runOperationLogRetentionSchedule({ originalUrl: "/api/scheduled/operationLogRetention", url: "/api/scheduled/operationLogRetention" } as any, response as any);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({ error: "cron-only" });
    expect(mocks.runCleanup).not.toHaveBeenCalled();
  });

  it("遇到非 365 天政策時拒絕清理，避免錯誤刪除範圍", async () => {
    mocks.getScheduleByTaskUid.mockResolvedValue({ id: 5, scheduleCronTaskUid: "retention-task", retentionDays: 30, isActive: true });
    const response = createResponse();
    await runOperationLogRetentionSchedule({ originalUrl: "/api/scheduled/operationLogRetention", url: "/api/scheduled/operationLogRetention" } as any, response as any);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ error: "invalid-retention-policy", retentionDays: 30 });
    expect(mocks.runCleanup).not.toHaveBeenCalled();
  });
});
