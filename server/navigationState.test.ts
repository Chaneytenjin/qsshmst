import { describe, expect, it } from "vitest";
import {
  getVisibleNavigationItems,
  isNavigationPathActive,
  type NavigationRule,
} from "../client/src/lib/navigationState";

const navigationItems: Array<NavigationRule & { label: string }> = [
  { label: "總覽", path: "/dashboard", roles: ["admin", "teacher", "student"] },
];

const systemManagementItems: Array<NavigationRule & { label: string }> = [
  { label: "管控中心", path: "/audit-center/login", roles: ["admin"], founderOnly: true },
  { label: "緊急公告追蹤", path: "/urgent-announcement-status", roles: ["admin"] },
  { label: "資料庫維護", path: "/database-maintenance", roles: ["admin"], founderOnly: true },
  { label: "系統異常郵件", path: "/system-alert-email", roles: ["admin"], founderOnly: true },
  { label: "Logo 異常監測", path: "/brand-logo-monitoring", roles: ["admin"], founderOnly: true },
  { label: "帳號啟用書紀錄", path: "/activation-certificate-exports", roles: ["admin"], founderOnly: true },
  { label: "帳號管理", path: "/users", roles: ["admin"] },
  { label: "提醒歷程管理", path: "/reminder-history", roles: ["admin"] },
];

describe("側邊選單導覽狀態", () => {
  it("僅顯示符合角色且符合創始管理員限制的項目", () => {
    expect(getVisibleNavigationItems(navigationItems, "teacher", false).map((item) => item.label)).toEqual(["總覽"]);
    expect(getVisibleNavigationItems(navigationItems, "admin", false).map((item) => item.label)).toEqual(["總覽"]);
    expect(getVisibleNavigationItems(systemManagementItems, "teacher", false)).toEqual([]);
    expect(getVisibleNavigationItems(systemManagementItems, "admin", false).map((item) => item.label)).toEqual([
      "緊急公告追蹤",
      "帳號管理",
      "提醒歷程管理",
    ]);
    expect(getVisibleNavigationItems(systemManagementItems, "admin", true).map((item) => item.label)).toEqual([
      "管控中心",
      "緊急公告追蹤",
      "資料庫維護",
      "系統異常郵件",
      "Logo 異常監測",
      "帳號啟用書紀錄",
      "帳號管理",
      "提醒歷程管理",
    ]);
  });

  it("會正確辨識目前頁與其子頁，避免相近路徑誤判為作用中", () => {
    expect(isNavigationPathActive("/equipment", "/equipment")).toBe(true);
    expect(isNavigationPathActive("/equipment/42", "/equipment")).toBe(true);
    expect(isNavigationPathActive("/equipment-log", "/equipment")).toBe(false);
    expect(isNavigationPathActive("/records", "/equipment")).toBe(false);
  });
});
