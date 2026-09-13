import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  getAllEquipment: vi.fn(),
  createQrPrintHistory: vi.fn(),
  getQrPrintHistory: vi.fn(),
  createOperationLog: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

function createContext(role: "admin" | "teacher" | "student"): TrpcContext {
  return {
    user: {
      id: role === "student" ? 3 : 2,
      openId: `qr-print-${role}`,
      username: `qr-print-${role}`,
      name: `QR Print ${role}`,
      role,
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

describe("QR Code 列印歷程 API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getAllEquipment.mockResolvedValue([
      { id: 8, name: "Sony A7 相機", qrCodeId: "QSSHMST0008" },
      { id: 9, name: "DJI Mini 空拍機", qrCodeId: "QSSHMST0009" },
    ]);
    dbMocks.createQrPrintHistory.mockResolvedValue(undefined);
    dbMocks.createOperationLog.mockResolvedValue(undefined);
    dbMocks.getQrPrintHistory.mockResolvedValue([]);
  });

  it("會在確認列印時保存器材、位置、尺寸與操作稽核", async () => {
    const caller = appRouter.createCaller(createContext("teacher"));

    await expect(caller.equipment.recordQrPrint({
      equipmentIds: [8, 9, 8],
      locationFilter: "攝影器材櫃 A-03",
      labelPaperSize: "a4-2x2",
    })).resolves.toEqual({ success: true, equipmentCount: 2 });

    expect(dbMocks.createQrPrintHistory).toHaveBeenCalledWith({
      printedById: 2,
      equipmentIds: "[8,9]",
      equipmentCount: 2,
      locationFilter: "攝影器材櫃 A-03",
      labelPaperSize: "a4-2x2",
    });
    expect(dbMocks.createOperationLog).toHaveBeenCalledWith(expect.objectContaining({
      action: "printQrCode",
      entityType: "equipmentQrCode",
      details: expect.stringContaining('"equipmentCount":2'),
    }));
  });

  it("允許保存標籤機 62 × 29 mm 的列印尺寸", async () => {
    const caller = appRouter.createCaller(createContext("teacher"));

    await expect(caller.equipment.recordQrPrint({
      equipmentIds: [8],
      labelPaperSize: "label-62x29",
    })).resolves.toEqual({ success: true, equipmentCount: 1 });

    expect(dbMocks.createQrPrintHistory).toHaveBeenCalledWith(expect.objectContaining({ labelPaperSize: "label-62x29" }));
  });

  it("會拒絕包含不存在或尚未建立 QR Code 的器材", async () => {
    dbMocks.getAllEquipment.mockResolvedValue([{ id: 8, name: "Sony A7 相機", qrCodeId: "QSSHMST0008" }]);
    const caller = appRouter.createCaller(createContext("teacher"));

    await expect(caller.equipment.recordQrPrint({
      equipmentIds: [8, 99],
      labelPaperSize: "a4-3x2",
    })).rejects.toThrow("列印清單含有不存在或尚未建立 QR Code 的器材");
    expect(dbMocks.createQrPrintHistory).not.toHaveBeenCalled();
  });

  it("學生只會取得自己的列印歷程，教師可取得整體歷程", async () => {
    const studentCaller = appRouter.createCaller(createContext("student"));
    await studentCaller.equipment.getQrPrintHistory({ limit: 12 });
    expect(dbMocks.getQrPrintHistory).toHaveBeenLastCalledWith({ printedById: 3, limit: 12 });

    const teacherCaller = appRouter.createCaller(createContext("teacher"));
    await teacherCaller.equipment.getQrPrintHistory({ limit: 12 });
    expect(dbMocks.getQrPrintHistory).toHaveBeenLastCalledWith({ printedById: undefined, limit: 12 });
  });
});
