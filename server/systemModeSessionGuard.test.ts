import { describe, expect, it, vi } from "vitest";
import { COOKIE_NAME } from "../shared/const";

const mocks = vi.hoisted(() => ({
  getUserByUsername: vi.fn(),
  getLoginDeviceById: vi.fn(),
  getSystemMaintenanceSettings: vi.fn(),
  upsertUser: vi.fn(),
}));

vi.mock("./db", () => ({
  getUserByUsername: mocks.getUserByUsername,
  getLoginDeviceById: mocks.getLoginDeviceById,
  getSystemMaintenanceSettings: mocks.getSystemMaintenanceSettings,
  upsertUser: mocks.upsertUser,
}));

import { sdk } from "./_core/sdk";
import { createContext } from "./_core/context";
import { resolveSystemMode } from "./systemMode";

function buildRequest(token: string) {
  return { headers: { cookie: `${COOKIE_NAME}=${token}` } } as any;
}

function buildUser(isFounder = false) {
  return {
    id: isFounder ? 901 : 902,
    username: isFounder ? "Chaney" : "restricted-user",
    name: isFounder ? "創始管理員" : "一般使用者",
    role: "admin",
    isFounder,
    isActive: true,
    isTemporaryPassword: false,
    openId: null,
  } as any;
}

describe("system mode session guard", () => {
  it("會在預告時間到達前維持在線，並在到期時推導為指定的限制模式", () => {
    const scheduledFor = new Date("2026-08-17T08:00:00.000Z");
    const settings = {
      systemMode: "online",
      maintenanceMode: false,
      scheduledMode: "maintenance",
      scheduledFor,
      announcement: "預計維護公告",
      estimatedRestoredAt: new Date("2026-08-17T09:00:00.000Z"),
    } as any;

    expect(resolveSystemMode(settings, new Date("2026-08-17T07:59:59.000Z"))).toMatchObject({
      systemMode: "online",
      isScheduled: true,
      scheduledMode: "maintenance",
      announcement: "預計維護公告",
    });
    expect(resolveSystemMode(settings, new Date("2026-08-17T08:00:00.000Z"))).toMatchObject({
      systemMode: "maintenance",
      isRestricted: true,
      isScheduled: false,
      scheduledMode: null,
    });
  });

  it.each([
    ["maintenance", "系統維護中"],
    ["offline", "系統離線中"],
  ] as const)("會在 %s 模式拒絕非創始管理員既有工作階段", async (systemMode, expectedMessage) => {
    const user = buildUser(false);
    mocks.getUserByUsername.mockResolvedValueOnce(user);
    mocks.getSystemMaintenanceSettings.mockResolvedValueOnce({ systemMode, maintenanceMode: systemMode === "maintenance" });
    const token = await sdk.createSessionToken(user.username, { name: user.name });

    await expect(sdk.authenticateRequest(buildRequest(token))).rejects.toThrow(expectedMessage);
    expect(mocks.upsertUser).not.toHaveBeenCalled();
  });

  it("會允許創始管理員在維護或離線模式維持工作階段以恢復服務", async () => {
    const founder = buildUser(true);
    mocks.getUserByUsername.mockResolvedValueOnce(founder);
    mocks.getSystemMaintenanceSettings.mockResolvedValueOnce({ systemMode: "offline", maintenanceMode: false });
    const token = await sdk.createSessionToken(founder.username, { name: founder.name });

    await expect(sdk.authenticateRequest(buildRequest(token))).resolves.toMatchObject({ id: founder.id, isFounder: true });
    expect(mocks.upsertUser).toHaveBeenCalledWith({ username: founder.username, lastSignedIn: expect.any(Date) });
  });

  it("在系統限制拒絕既有非創始管理員工作階段時會清除 Cookie", async () => {
    const user = buildUser(false);
    mocks.getUserByUsername.mockResolvedValueOnce(user);
    mocks.getSystemMaintenanceSettings.mockResolvedValueOnce({ systemMode: "maintenance", maintenanceMode: true });
    const token = await sdk.createSessionToken(user.username, { name: user.name });
    const clearCookie = vi.fn();

    const context = await createContext({
      req: buildRequest(token),
      res: { clearCookie },
    } as any);

    expect(context.user).toBeNull();
    expect(clearCookie).toHaveBeenCalledWith(COOKIE_NAME, expect.objectContaining({ maxAge: -1, httpOnly: true, secure: true }));
  });
});
