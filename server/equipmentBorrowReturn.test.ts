import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  borrowEquipment: vi.fn(),
  returnEquipment: vi.fn(),
  createOperationLog: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

type EquipmentState = {
  id: number;
  totalQuantity: number;
  availableQuantity: number;
  status: "available" | "borrowed";
};

function createContext(role: "admin" | "teacher" | "student"): TrpcContext {
  return {
    user: {
      id: role === "student" ? 3 : 2,
      openId: `test-${role}`,
      username: `test-${role}`,
      name: `Test ${role}`,
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

describe("Equipment Borrow/Return API", () => {
  let equipment: EquipmentState;

  beforeEach(() => {
    equipment = { id: 1, totalQuantity: 1, availableQuantity: 1, status: "available" };
    dbMocks.createOperationLog.mockResolvedValue(1);
    dbMocks.borrowEquipment.mockImplementation(async (equipmentId: number) => {
      if (equipmentId !== equipment.id) throw new Error("器材不存在");
      if (equipment.availableQuantity < 1) throw new Error("可借數量不足");
      equipment.availableQuantity -= 1;
      equipment.status = "borrowed";
    });
    dbMocks.returnEquipment.mockImplementation(async (equipmentId: number) => {
      if (equipmentId !== equipment.id) throw new Error("器材不存在");
      if (equipment.status !== "borrowed") throw new Error("器材未被借用");
      equipment.availableQuantity = equipment.totalQuantity;
      equipment.status = "available";
    });
  });

  it("allows a staff user to borrow equipment and records the transition", async () => {
    const caller = appRouter.createCaller(createContext("teacher"));

    await expect(caller.equipment.borrow({ equipmentId: equipment.id, userId: 3 })).resolves.toEqual({ success: true });
    expect(equipment).toMatchObject({ availableQuantity: 0, status: "borrowed" });
    expect(dbMocks.createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "borrow", entityType: "equipment" }));
  });

  it("prevents borrowing when no inventory remains", async () => {
    const caller = appRouter.createCaller(createContext("teacher"));
    await caller.equipment.borrow({ equipmentId: equipment.id, userId: 3 });

    await expect(caller.equipment.borrow({ equipmentId: equipment.id, userId: 3 })).rejects.toThrow("可借數量不足");
  });

  it("allows a staff user to return borrowed equipment", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    await caller.equipment.borrow({ equipmentId: equipment.id, userId: 3 });

    await expect(caller.equipment.return({ equipmentId: equipment.id })).resolves.toEqual({ success: true });
    expect(equipment).toMatchObject({ availableQuantity: 1, status: "available" });
  });

  it("prevents returning equipment that is not borrowed", async () => {
    const caller = appRouter.createCaller(createContext("teacher"));
    await expect(caller.equipment.return({ equipmentId: equipment.id })).rejects.toThrow("器材未被借用");
  });

  it("prevents students from borrowing or returning equipment", async () => {
    const caller = appRouter.createCaller(createContext("student"));
    await expect(caller.equipment.borrow({ equipmentId: equipment.id, userId: 3 })).rejects.toThrow("需要教師或管理員權限");
    await expect(caller.equipment.return({ equipmentId: equipment.id })).rejects.toThrow("需要教師或管理員權限");
  });
});
