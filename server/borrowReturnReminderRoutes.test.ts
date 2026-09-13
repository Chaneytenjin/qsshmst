import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  getUnreadBorrowReturnReminders: vi.fn(),
  markBorrowReturnRemindersRead: vi.fn(),
  createOperationLog: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

function createContext(): TrpcContext {
  return {
    user: {
      id: 3,
      openId: "borrow-reminder-student",
      username: "borrow-reminder-student",
      name: "借用測試者",
      role: "student",
      isActive: true,
      isFounder: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as TrpcContext["res"],
  };
}

describe("Borrow return reminder routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getUnreadBorrowReturnReminders.mockResolvedValue([]);
    dbMocks.markBorrowReturnRemindersRead.mockResolvedValue(undefined);
    dbMocks.createOperationLog.mockResolvedValue(undefined);
  });

  it("依目前登入者查詢未讀提醒，並以目前登入者範圍標記已讀及寫入稽核", async () => {
    const caller = appRouter.createCaller(createContext());
    await caller.borrowRecords.unreadReminders();
    expect(dbMocks.getUnreadBorrowReturnReminders).toHaveBeenCalledWith(3);

    await expect(caller.borrowRecords.markRemindersRead({ ids: [11, 12] })).resolves.toEqual({ success: true });
    expect(dbMocks.markBorrowReturnRemindersRead).toHaveBeenCalledWith([11, 12], 3);
    expect(dbMocks.createOperationLog).toHaveBeenCalledWith(expect.objectContaining({
      userId: 3,
      action: "acknowledgeBorrowReminder",
      entityType: "borrowReturnReminder",
    }));
  });
});
