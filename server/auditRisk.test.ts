import { describe, expect, it } from "vitest";
import { getLoginRisk, getOperationRisk, isRiskEvent } from "../client/src/lib/auditRisk";

describe("稽核風險分類", () => {
  it("將一般登入失敗標示為異常登入", () => {
    expect(getLoginRisk({ status: "failed", failureReason: "密碼錯誤" })).toEqual({ level: "warning", label: "異常登入" });
  });

  it("將鎖定或可疑原因的登入失敗標示為高風險", () => {
    expect(getLoginRisk({ status: "failed", failureReason: "帳號已鎖定" })).toEqual({ level: "high", label: "高風險登入" });
  });

  it("將成功登入視為一般事件", () => {
    expect(getLoginRisk({ status: "success" })).toEqual({ level: "none", label: "正常" });
  });

  it("將刪除、重置密碼與停用列為高風險操作", () => {
    expect(getOperationRisk({ action: "delete" }).level).toBe("high");
    expect(getOperationRisk({ action: "resetPassword" }).level).toBe("high");
    expect(getOperationRisk({ action: "deactivate" }).level).toBe("high");
    expect(getOperationRisk({ action: "update" }).level).toBe("none");
  });

  it("將登入驗證挑戰逾時列為可處理的安全提醒", () => {
    expect(getOperationRisk({ action: "loginChallengeExpired" })).toEqual({ level: "warning", label: "安全提醒" });
  });

  it("只會將異常或高風險分類視為風險事件", () => {
    expect(isRiskEvent({ level: "warning", label: "異常登入" })).toBe(true);
    expect(isRiskEvent({ level: "high", label: "高風險操作" })).toBe(true);
    expect(isRiskEvent({ level: "none", label: "正常" })).toBe(false);
  });
});
