import { describe, expect, it } from "vitest";
import { getSessionTokenFromRequestHeaders, sdk } from "./_core/sdk";

describe("custom login session verification", () => {
  it("空白顯示名稱的既有自訂帳號工作階段仍可通過驗證", async () => {
    const token = await sdk.createSessionToken("session-without-display-name", { name: "", deviceId: "device-123" });

    const session = await sdk.verifySession(token);

    expect(session).toEqual(expect.objectContaining({
      username: "session-without-display-name",
      name: "",
      appId: "qingshui-media-service",
      deviceId: "device-123",
    }));
  });

  it("缺少帳號識別或應用程式識別的工作階段仍會被拒絕", async () => {
    expect(await sdk.verifySession("")).toBeNull();
  });

  it("原生 App 可透過 Authorization Bearer 傳送簽章工作階段，且優先於瀏覽器 Cookie", () => {
    expect(getSessionTokenFromRequestHeaders({
      authorization: "Bearer native.session-token_123",
      cookie: "app_session_id=browser-session-token",
    })).toBe("native.session-token_123");
  });

  it("Bearer 格式無效時會安全回退至既有 Cookie 工作階段", () => {
    expect(getSessionTokenFromRequestHeaders({
      authorization: "Basic unsupported",
      cookie: "app_session_id=browser-session-token",
    })).toBe("browser-session-token");
  });
});
