import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("個人設定分頁按鈕淺色模式對比", () => {
  it("為個人、通知與安全設定分頁提供專用樣式標記", () => {
    const profile = readFileSync("/home/ubuntu/qingshui-media-equipment/client/src/pages/Profile.tsx", "utf8");

    expect(profile).toContain('className="profile-settings-tab-list grid w-full grid-cols-3 border-2 border-gray-800"');
    expect(profile.match(/profile-settings-tab-trigger/g)).toHaveLength(3);
    expect(profile).toContain("個人設定");
    expect(profile).toContain("通知設定");
    expect(profile).toContain("安全設定");
  });

  it("在淺色模式區分未選取、懸停、已選取與鍵盤焦點狀態", () => {
    const css = readFileSync("/home/ubuntu/qingshui-media-equipment/client/src/index.css", "utf8");

    expect(css).toContain("html:not(.dark) .profile-settings-tab-list");
    expect(css).toContain("html:not(.dark) .profile-settings-tab-trigger {");
    expect(css).toContain("html:not(.dark) .profile-settings-tab-trigger:hover");
    expect(css).toContain('html:not(.dark) .profile-settings-tab-trigger[data-state="active"]');
    expect(css).toContain("html:not(.dark) .profile-settings-tab-trigger:focus-visible");
  });
});
