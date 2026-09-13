import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

function createContext(isFounder: boolean): TrpcContext {
  return {
    user: {
      id: isFounder ? 1 : 2,
      openId: isFounder ? "founder" : "admin",
      username: isFounder ? "Chaney" : "admin-user",
      name: isFounder ? "Chaney" : "Administrator",
      email: isFounder ? "founder@qingshui.example" : "admin@qingshui.example",
      loginMethod: "password",
      role: "admin",
      isFounder,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("emailOfflineCommand 權限隔離", () => {
  it("拒絕非創始管理員讀取或設定 Apps Script Gmail 離線指令與收件稽核", async () => {
    const caller = appRouter.createCaller(createContext(false));

    await expect(caller.emailOfflineCommand.settings()).rejects.toThrow();
    await expect(caller.emailOfflineCommand.history()).rejects.toThrow();
    await expect(caller.emailOfflineCommand.save({
      recipientEmail: "offline@mail.qingshui.example",
      authorizedSenders: [{ email: "founder@qingshui.example", isActive: false }],
      isEnabled: false,
      rotateCommandSecret: false,
    })).rejects.toThrow();
  });
});
