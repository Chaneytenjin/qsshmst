export type AuditRiskLevel = "none" | "warning" | "high";

export interface AuditRisk {
  level: AuditRiskLevel;
  label: string;
}

const HIGH_RISK_LOGIN_PATTERN = /鎖定|lock|暴力|brute|suspicious|異常|黑名單|blacklist/i;
const HIGH_RISK_OPERATION_ACTIONS = new Set(["delete", "resetPassword", "deactivate"]);
const WARNING_OPERATION_ACTIONS = new Set(["loginChallengeExpired"]);

export function getLoginRisk(log: { status?: string | null; failureReason?: string | null }): AuditRisk {
  if (log.status !== "failed") return { level: "none", label: "正常" };
  if (HIGH_RISK_LOGIN_PATTERN.test(log.failureReason ?? "")) {
    return { level: "high", label: "高風險登入" };
  }
  return { level: "warning", label: "異常登入" };
}

export function getOperationRisk(log: { action?: string | null }): AuditRisk {
  if (HIGH_RISK_OPERATION_ACTIONS.has(log.action ?? "")) {
    return { level: "high", label: "高風險操作" };
  }
  if (WARNING_OPERATION_ACTIONS.has(log.action ?? "")) {
    return { level: "warning", label: "安全提醒" };
  }
  return { level: "none", label: "一般操作" };
}

export function isRiskEvent(risk: AuditRisk) {
  return risk.level !== "none";
}
