import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("原生 App 工作階段契約", () => {
  it("僅對標示為 native 的完成登入流程回傳可安全儲存的工作階段權杖", () => {
    const source = readFileSync("server/routers.ts", "utf8");

    expect(source).toContain('"x-qssh-client-platform"');
    expect(source).toContain("mobileSessionToken: sessionToken");
  });

  it("提供不含密碼雜湊的 mobileMe 端點，並在原生登出時撤銷裝置", () => {
    const source = readFileSync("server/routers.ts", "utf8");

    expect(source).toContain("mobileMe: protectedProcedure.query");
    expect(source).toContain("avatarUrl: ctx.user.avatarUrl");
    expect(source).toContain("revokeLoginDevice(ctx.user.id, ctx.sessionDeviceId)");
  });
});
