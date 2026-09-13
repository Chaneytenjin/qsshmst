import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("自訂頭像已停用", () => {
  it("不提供個人設定上傳入口或伺服器端上傳端點", () => {
    const profileSource = readFileSync("/home/ubuntu/qingshui-media-equipment/client/src/pages/Profile.tsx", "utf8");
    const routerSource = readFileSync("/home/ubuntu/qingshui-media-equipment/server/routers.ts", "utf8");

    expect(profileSource).not.toContain("AvatarCropDialog");
    expect(profileSource).not.toContain("uploadAvatarMutation");
    expect(profileSource).not.toContain("拖放或選擇個人頭像");
    expect(routerSource).not.toContain("uploadAvatar: protectedProcedure");
    expect(routerSource).not.toContain("user-avatars/${ctx.user.id}");
  });

  it("側邊欄一律使用系統預設圓形識別，不讀取自訂頭像網址", () => {
    const layoutSource = readFileSync("/home/ubuntu/qingshui-media-equipment/client/src/components/AppLayout.tsx", "utf8");

    expect(layoutSource).toContain("session-sidebar-user-avatar-fallback");
    expect(layoutSource).not.toContain("user.avatarUrl ? <img");
  });
});
