import { describe, expect, it, vi } from "vitest";
import {
  readSidebarCollapsed,
  SIDEBAR_COLLAPSED_STORAGE_KEY,
  writeSidebarCollapsed,
} from "../client/src/lib/sidebarPreference";

describe("側邊選單偏好設定", () => {
  it("僅在已儲存 true 時以收合狀態啟動", () => {
    expect(readSidebarCollapsed(undefined)).toBe(false);
    expect(readSidebarCollapsed({ getItem: () => null })).toBe(false);
    expect(readSidebarCollapsed({ getItem: () => "false" })).toBe(false);
    expect(readSidebarCollapsed({ getItem: () => "true" })).toBe(true);
  });

  it("以一致的鍵名保存收合偏好", () => {
    const setItem = vi.fn();
    writeSidebarCollapsed({ setItem }, true);
    writeSidebarCollapsed({ setItem }, false);

    expect(setItem).toHaveBeenNthCalledWith(1, SIDEBAR_COLLAPSED_STORAGE_KEY, "true");
    expect(setItem).toHaveBeenNthCalledWith(2, SIDEBAR_COLLAPSED_STORAGE_KEY, "false");
  });
});
