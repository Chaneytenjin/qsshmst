import type { LucideIcon } from "lucide-react";
import {
  BellRing,
  BarChart3,
  Database,
  FileCheck2,
  MailWarning,
  Shield,
  ShieldAlert,
  TriangleAlert,
  Users,
  Wrench,
} from "lucide-react";

export interface SystemManagementNavigationItem {
  label: string;
  description: string;
  path: string;
  icon: LucideIcon;
  roles: readonly string[];
  founderOnly?: boolean;
}

export const SYSTEM_MANAGEMENT_OVERVIEW_PATH = "/system-management";

export const SYSTEM_MANAGEMENT_ITEMS: readonly SystemManagementNavigationItem[] = [
  { label: "位置異動月度稽核", description: "檢視器材與存放位置的月度異動趨勢及異常調度", path: "/location-audit-report", icon: BarChart3, roles: ["admin", "teacher"] },
  { label: "管控中心", description: "檢視登入與操作稽核紀錄，追蹤系統安全事件", path: "/audit-center/login", icon: Shield, roles: ["admin"], founderOnly: true },
  { label: "緊急公告追蹤", description: "確認緊急公告的閱讀狀態與追蹤情形", path: "/urgent-announcement-status", icon: TriangleAlert, roles: ["admin"] },
  { label: "資料庫維護", description: "執行受 PIN 保護的帳號去重與維護作業", path: "/database-maintenance", icon: Database, roles: ["admin"], founderOnly: true },
  { label: "系統維護", description: "設定系統上線、維護或離線模式", path: "/system-maintenance", icon: Wrench, roles: ["admin"], founderOnly: true },
  { label: "系統異常郵件", description: "管理系統異常與緊急離線郵件的授權設定", path: "/system-alert-email", icon: MailWarning, roles: ["admin"], founderOnly: true },
  { label: "Logo 異常監測", description: "檢視品牌識別載入失敗與監測紀錄", path: "/brand-logo-monitoring", icon: ShieldAlert, roles: ["admin"], founderOnly: true },
  { label: "帳號啟用書紀錄", description: "查看帳號啟用書的產生與匯出紀錄", path: "/activation-certificate-exports", icon: FileCheck2, roles: ["admin"], founderOnly: true },
  { label: "帳號管理", description: "管理帳號、角色、狀態與安全資訊", path: "/users", icon: Users, roles: ["admin"] },
  { label: "提醒歷程管理", description: "檢視到期與逾期提醒的寄送紀錄", path: "/reminder-history", icon: BellRing, roles: ["admin"] },
];

export const SYSTEM_MANAGEMENT_PATHS = [SYSTEM_MANAGEMENT_OVERVIEW_PATH, ...SYSTEM_MANAGEMENT_ITEMS.map((item) => item.path)] as const;

export const isAuditCenterPath = (path: string) => path.startsWith("/audit-center/");
