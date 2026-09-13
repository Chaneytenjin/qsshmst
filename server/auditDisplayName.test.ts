import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const dbSource = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
const auditCenterSource = readFileSync(resolve(process.cwd(), "client/src/pages/AuditCenter.tsx"), "utf8");
const loginAuditSource = readFileSync(resolve(process.cwd(), "client/src/pages/LoginAudit.tsx"), "utf8");
const operationLogsSource = readFileSync(resolve(process.cwd(), "client/src/pages/OperationLogs.tsx"), "utf8");
const equipmentManageSource = readFileSync(resolve(process.cwd(), "client/src/pages/EquipmentManage.tsx"), "utf8");
const qrCodeBorrowReturnSource = readFileSync(resolve(process.cwd(), "client/src/pages/QrCodeBorrowReturn.tsx"), "utf8");
const reminderHistorySource = readFileSync(resolve(process.cwd(), "client/src/pages/ReminderHistory.tsx"), "utf8");
const brandLogoMonitoringSource = readFileSync(resolve(process.cwd(), "client/src/pages/BrandLogoMonitoring.tsx"), "utf8");
const utilsSource = readFileSync(resolve(process.cwd(), "client/src/lib/utils.ts"), "utf8");
const roleBadgeSource = readFileSync(resolve(process.cwd(), "client/src/components/StatusBadge.tsx"), "utf8");

describe("稽核人員姓名與管理員用語", () => {
  it("登入、操作與系統模式稽核均提供姓名優先的 displayName", () => {
    expect(dbSource).toContain("export type LoginAuditLogEntry = LoginAuditLog & { displayName: string }");
    expect(dbSource).toContain("export type OperationLogEntry = OperationLog & { displayName: string }");
    expect(dbSource).toContain("displayName: sql<string>`COALESCE(NULLIF(${users.realName}, ''), NULLIF(${users.name}, ''), NULLIF(${users.username}, '')");
    expect(dbSource).toContain("displayName: entry.displayName");
  });

  it("各稽核畫面同時顯示姓名與登入帳號，並保留安全回退", () => {
    expect(utilsSource).toContain("export function formatAuditActor");
    expect(utilsSource).toContain("${displayName}（${username}）");
    expect(utilsSource).toContain('return displayName || username || "未知人員"');
    expect(auditCenterSource).toContain("姓名（登入帳號）");
    expect(auditCenterSource).toContain("formatAuditActor(log)");
    expect(auditCenterSource).toContain("formatAuditActor(entry)");
    expect(loginAuditSource).toContain("formatAuditActor(log)");
    expect(operationLogsSource).toContain("formatAuditActor(log)");
    expect(equipmentManageSource).toContain("formatAuditActor({ displayName: entry.changedByRealName || entry.changedByName, username: entry.changedByUsername })");
    expect(qrCodeBorrowReturnSource).toContain("formatAuditActor({ name: entry.printedByName, username: entry.printedByUsername })");
    expect(reminderHistorySource).toContain("formatAuditActor({ name: entry.resentByName, username: entry.resentByUsername })");
    expect(brandLogoMonitoringSource).toContain("formatAuditActor({ realName: event.reporterRealName || event.reporterName, username: event.reporterUsername })");
  });

  it("核心角色標籤採用管理員用語，且活躍使用者排除測試帳號", () => {
    expect(roleBadgeSource).toContain('admin: "管理員"');
    expect(dbSource).toContain("activeUserRows.filter((user) => !isTestAccount(user)).length");
  });
});
