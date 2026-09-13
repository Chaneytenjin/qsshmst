// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AuditCenter from "../client/src/pages/AuditCenter";

const mocks = vi.hoisted(() => ({
  user: { id: 1, role: "admin", isFounder: true },
  location: "/audit-center/login",
  setLocation: vi.fn(),
  verifyPinUseMutation: vi.fn(),
  loginAuditUseQuery: vi.fn(),
  highRiskSummaryUseQuery: vi.fn(),
  operationLogsUseQuery: vi.fn(),
  systemModeHistoryUseQuery: vi.fn(),
  ipBlacklistUseQuery: vi.fn(),
  saveIpBlacklistUseMutation: vi.fn(),
  setIpBlacklistActiveUseMutation: vi.fn(),
  auditEventResolutionsUseQuery: vi.fn(),
  saveAuditEventResolutionUseMutation: vi.fn(),
  notificationDeliveriesUseQuery: vi.fn(),
  resendClosureNotificationUseMutation: vi.fn(),
  recordFullIpViewUseMutation: vi.fn(),
}));

vi.mock("../client/src/lib/trpc", () => ({
  trpc: {
    auditPin: { verify: { useMutation: mocks.verifyPinUseMutation } },
    loginAudit: {
      list: { useQuery: mocks.loginAuditUseQuery },
      highRiskSummary: { useQuery: mocks.highRiskSummaryUseQuery },
    },
    operationLogs: { list: { useQuery: mocks.operationLogsUseQuery } },
    systemMaintenance: { history: { useQuery: mocks.systemModeHistoryUseQuery } },
    auditEventResolutions: {
      list: { useQuery: mocks.auditEventResolutionsUseQuery },
      save: { useMutation: mocks.saveAuditEventResolutionUseMutation },
      notificationDeliveries: { useQuery: mocks.notificationDeliveriesUseQuery },
      resendClosureNotification: { useMutation: mocks.resendClosureNotificationUseMutation },
    },
    ipBlacklist: {
      list: { useQuery: mocks.ipBlacklistUseQuery },
      save: { useMutation: mocks.saveIpBlacklistUseMutation },
      setActive: { useMutation: mocks.setIpBlacklistActiveUseMutation },
    },
    protectedAccountSecurity: { recordFullIpView: { useMutation: mocks.recordFullIpViewUseMutation } },
  },
}));

vi.mock("../client/src/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("wouter", () => ({ useLocation: () => [mocks.location, mocks.setLocation] }));
vi.mock("../client/src/components/AuditPinDialog", () => ({ AuditPinDialog: () => null }));

describe("AuditCenter", () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    mocks.user = { id: 1, role: "admin", isFounder: true };
    mocks.location = "/audit-center/login";
    mocks.verifyPinUseMutation.mockReturnValue({ mutateAsync: vi.fn() });
    mocks.loginAuditUseQuery.mockReturnValue({ data: { logs: [], total: 0, page: 1, totalPages: 1 }, isLoading: false, error: null });
    mocks.highRiskSummaryUseQuery.mockReturnValue({ data: { highRiskLoginCount: 2, lockedLoginEventCount: 1, highRiskOperationCount: 3, activeLockedAccountCount: 1, lockedEventWarning: { threshold: 3, lockedEventCount: 1, triggered: false } }, isLoading: false, error: null });
    mocks.operationLogsUseQuery.mockReturnValue({ data: { logs: [], total: 0, page: 1, totalPages: 1 }, isLoading: false, error: null });
    mocks.systemModeHistoryUseQuery.mockReturnValue({ data: [], isLoading: false, error: null });
    mocks.ipBlacklistUseQuery.mockReturnValue({ data: [{ id: 3, ipAddress: "203.0.113.8", note: "可疑來源", isActive: true, createdAt: new Date(), updatedAt: new Date() }], isLoading: false, error: null, refetch: vi.fn() });
    mocks.saveIpBlacklistUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mocks.setIpBlacklistActiveUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mocks.auditEventResolutionsUseQuery.mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() });
    mocks.saveAuditEventResolutionUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mocks.notificationDeliveriesUseQuery.mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() });
    mocks.resendClosureNotificationUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mocks.recordFullIpViewUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
    vi.clearAllMocks();
  });

  it("未驗證 PIN 時會先顯示稽核中心的驗證閘門", () => {
    mocks.verifyPinUseMutation.mockReturnValue({ mutateAsync: vi.fn() });
    mocks.loginAuditUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: null });
    mocks.highRiskSummaryUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: null });
    mocks.operationLogsUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: null });

    render(<AuditCenter />);

    expect(screen.getByText("稽核中心")).toBeInTheDocument();
    expect(screen.getByText("登入稽核與操作日誌屬於敏感資料，請先驗證 PIN 碼")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "驗證 PIN 碼" })).toBeInTheDocument();
  });

  it("已驗證後可在統一頁面切換登入稽核與操作日誌", () => {
    window.sessionStorage.setItem("qingshui-audit-pin-verified-at", Date.now().toString());
    mocks.verifyPinUseMutation.mockReturnValue({ mutateAsync: vi.fn() });
    mocks.loginAuditUseQuery.mockReturnValue({ data: { logs: [], total: 0, page: 1, totalPages: 1 }, isLoading: false, error: null });
    mocks.operationLogsUseQuery.mockReturnValue({ data: { logs: [], total: 0, page: 1, totalPages: 1 }, isLoading: false, error: null });

    render(<AuditCenter />);

    expect(screen.getByRole("tab", { name: "登入稽核" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("沒有符合條件的登入稽核紀錄")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "操作日誌" }));
    expect(mocks.setLocation).toHaveBeenCalledWith("/audit-center/operation");
  });

  it("已驗證 PIN 的創始管理員可查看系統模式歷程與每個限制期間的強制登出統計", () => {
    window.sessionStorage.setItem("qingshui-audit-pin-verified-at", Date.now().toString());
    mocks.location = "/audit-center/system-mode";
    mocks.systemModeHistoryUseQuery.mockReturnValue({ data: [{
      id: 901,
      action: "enableSystemMaintenanceMode",
      systemMode: "maintenance",
      username: "Chaney",
      effectiveAt: new Date("2026-08-17T04:00:00.000Z"),
      forcedLogoutCount: 4,
    }], isLoading: false, error: null });

    render(<AuditCenter />);

    expect(screen.getByTestId("system-mode-history-panel")).toBeInTheDocument();
    expect(screen.getByText("SYSTEM MAINTENANCE")).toBeInTheDocument();
    expect(screen.getAllByText("4 人次").length).toBeGreaterThan(0);
    expect(screen.getByText("啟用系統維護")).toBeInTheDocument();
  });

  it("在登入稽核以標籤清楚區分密碼與通行密鑰登入", () => {
    window.sessionStorage.setItem("qingshui-audit-pin-verified-at", Date.now().toString());
    mocks.verifyPinUseMutation.mockReturnValue({ mutateAsync: vi.fn() });
    mocks.loginAuditUseQuery.mockReturnValue({ data: { logs: [
      { id: 31, username: "password-user", status: "success", loginMethod: "password", failureReason: null, ipAddress: "127.0.0.1", loginAt: new Date() },
      { id: 32, username: "passkey-user", status: "success", loginMethod: "passkey", failureReason: null, ipAddress: "127.0.0.2", loginAt: new Date() },
    ], total: 2, page: 1, totalPages: 1 }, isLoading: false, error: null });

    render(<AuditCenter />);

    expect(screen.getByText("登入方式")).toBeInTheDocument();
    expect(screen.getByText("密碼")).toBeInTheDocument();
    expect(screen.getByText("通行密鑰")).toBeInTheDocument();
  });

  it("稽核日誌的 IP 預設遮罩，僅在滑鼠停留或鍵盤聚焦時暫時顯示完整位址", () => {
    window.sessionStorage.setItem("qingshui-audit-pin-verified-at", Date.now().toString());
    mocks.loginAuditUseQuery.mockReturnValue({ data: { logs: [{ id: 48, username: "privacy-user", status: "success", loginMethod: "password", failureReason: null, ipAddress: "203.0.113.48", loginAt: new Date() }], total: 1, page: 1, totalPages: 1 }, isLoading: false, error: null });
    mocks.operationLogsUseQuery.mockReturnValue({ data: { logs: [{ id: 49, username: "privacy-admin", action: "update", entityType: "equipment", entityName: "攝影機", details: null, ipAddress: "2001:db8:abcd::49", createdAt: new Date() }], total: 1, page: 1, totalPages: 1 }, isLoading: false, error: null });

    render(<AuditCenter />);
    const loginIp = screen.getByTestId("masked-audit-ip");
    expect(loginIp).toHaveTextContent("203.0.•••.•••");
    expect(loginIp).not.toHaveTextContent("203.0.113.48");
    fireEvent.mouseEnter(loginIp);
    expect(loginIp).toHaveTextContent("203.0.113.48");
    fireEvent.mouseLeave(loginIp);
    expect(loginIp).toHaveTextContent("203.0.•••.•••");
    fireEvent.focus(loginIp);
    expect(loginIp).toHaveTextContent("203.0.113.48");
    fireEvent.blur(loginIp);
    expect(loginIp).toHaveTextContent("203.0.•••.•••");

    cleanup();
    mocks.location = "/audit-center/operation";
    render(<AuditCenter />);
    const operationIp = screen.getByTestId("masked-audit-ip");
    expect(operationIp).not.toHaveTextContent("2001:db8:abcd::49");
    fireEvent.mouseEnter(operationIp);
    expect(operationIp).toHaveTextContent("2001:db8:abcd::49");
  });

  it("在登入紀錄醒目標示異常事件，並可僅顯示本頁高風險登入", () => {
    window.sessionStorage.setItem("qingshui-audit-pin-verified-at", Date.now().toString());
    mocks.verifyPinUseMutation.mockReturnValue({ mutateAsync: vi.fn() });
    mocks.loginAuditUseQuery.mockReturnValue({
      data: {
        logs: [
          { id: 1, username: "locked-user", status: "failed", failureReason: "帳號已鎖定", ipAddress: "127.0.0.1", loginAt: new Date() },
          { id: 2, username: "wrong-password", status: "failed", failureReason: "密碼錯誤", ipAddress: "127.0.0.2", loginAt: new Date() },
          { id: 3, username: "normal-user", status: "success", failureReason: null, ipAddress: "127.0.0.3", loginAt: new Date() },
        ], total: 3, page: 1, totalPages: 1,
      }, isLoading: false, error: null,
    });
    mocks.operationLogsUseQuery.mockReturnValue({ data: { logs: [], total: 0, page: 1, totalPages: 1 }, isLoading: false, error: null });

    render(<AuditCenter />);

    expect(screen.getByText("高風險登入")).toBeInTheDocument();
    expect(screen.getByText("異常登入")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("僅顯示本頁高風險登入"));
    expect(screen.getByText("locked-user")).toBeInTheDocument();
    expect(screen.queryByText("wrong-password")).not.toBeInTheDocument();
    expect(screen.queryByText("normal-user")).not.toBeInTheDocument();
  });

  it("創始管理員可為高風險登入事件填寫處理註記並更新狀態", () => {
    window.sessionStorage.setItem("qingshui-audit-pin-verified-at", Date.now().toString());
    const save = vi.fn();
    mocks.loginAuditUseQuery.mockReturnValue({ data: { logs: [{ id: 71, username: "locked-user", status: "failed", failureReason: "帳號已鎖定", ipAddress: "127.0.0.1", loginAt: new Date() }], total: 1, page: 1, totalPages: 1 }, isLoading: false, error: null });
    mocks.operationLogsUseQuery.mockReturnValue({ data: { logs: [], total: 0, page: 1, totalPages: 1 }, isLoading: false, error: null });
    mocks.auditEventResolutionsUseQuery.mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() });
    mocks.saveAuditEventResolutionUseMutation.mockReturnValue({ mutate: save, isPending: false });

    render(<AuditCenter />);

    expect(screen.getByText("待處理")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "處理" }));
    fireEvent.change(screen.getByLabelText("處理註記"), { target: { value: "已確認來源並通知管理人員" } });
    fireEvent.click(screen.getByRole("button", { name: "儲存註記" }));
    expect(save).toHaveBeenCalledWith({ sourceType: "loginAudit", sourceEventId: 71, status: "in_progress", handlingNote: "已確認來源並通知管理人員" });
  });

  it("顯示近 24 小時高風險摘要，且快速篩選只保留鎖定事件", () => {
    window.sessionStorage.setItem("qingshui-audit-pin-verified-at", Date.now().toString());
    mocks.verifyPinUseMutation.mockReturnValue({ mutateAsync: vi.fn() });
    mocks.highRiskSummaryUseQuery.mockReturnValue({ data: { highRiskLoginCount: 4, lockedLoginEventCount: 2, highRiskOperationCount: 3, activeLockedAccountCount: 1 }, isLoading: false, error: null });
    mocks.loginAuditUseQuery.mockReturnValue({
      data: {
        logs: [
          { id: 1, username: "locked-user", status: "failed", failureReason: "帳號已鎖定", ipAddress: "127.0.0.1", loginAt: new Date() },
          { id: 2, username: "suspicious-user", status: "failed", failureReason: "可疑登入", ipAddress: "127.0.0.2", loginAt: new Date() },
          { id: 3, username: "normal-user", status: "success", failureReason: null, ipAddress: "127.0.0.3", loginAt: new Date() },
        ], total: 3, page: 1, totalPages: 1,
      }, isLoading: false, error: null,
    });

    render(<AuditCenter />);

    expect(screen.getByText("近 24 小時高風險摘要")).toBeInTheDocument();
    expect(screen.getByText("高風險登入事件").parentElement).toHaveTextContent("4");
    expect(screen.getByText("鎖定事件").parentElement).toHaveTextContent("2");
    expect(screen.getByText("目前鎖定帳號").parentElement).toHaveTextContent("1");
    fireEvent.click(screen.getByRole("button", { name: "僅顯示高風險鎖定事件" }));
    expect(screen.getByText("locked-user")).toBeInTheDocument();
    expect(screen.queryByText("suspicious-user")).not.toBeInTheDocument();
    expect(screen.queryByText("normal-user")).not.toBeInTheDocument();
  });

  it("可切換高風險摘要期間，並在鎖定事件達門檻時顯示安全警告", () => {
    window.sessionStorage.setItem("qingshui-audit-pin-verified-at", Date.now().toString());
    mocks.verifyPinUseMutation.mockReturnValue({ mutateAsync: vi.fn() });
    mocks.highRiskSummaryUseQuery.mockReturnValue({ data: { highRiskLoginCount: 5, lockedLoginEventCount: 3, highRiskOperationCount: 2, activeLockedAccountCount: 2, lockedEventWarning: { threshold: 3, lockedEventCount: 3, triggered: true } }, isLoading: false, error: null });
    mocks.loginAuditUseQuery.mockReturnValue({ data: { logs: [], total: 0, page: 1, totalPages: 1 }, isLoading: false, error: null });

    render(<AuditCenter />);

    expect(screen.getByRole("alert")).toHaveTextContent("已達門檻 3 次");
    fireEvent.click(screen.getByRole("button", { name: "30 天" }));
    expect(screen.getByText("近 30 天高風險摘要")).toBeInTheDocument();
    expect(mocks.highRiskSummaryUseQuery.mock.calls.at(-1)?.[0]).toEqual({ period: "30d" });
  });

  it("可切換至 IP 黑名單並建立帶有備註的封鎖規則", () => {
    window.sessionStorage.setItem("qingshui-audit-pin-verified-at", Date.now().toString());
    mocks.location = "/audit-center/ip-blacklist";
    const save = vi.fn();
    mocks.saveIpBlacklistUseMutation.mockReturnValue({ mutate: save, isPending: false });

    render(<AuditCenter />);

    expect(screen.getByText("IP 黑名單")).toBeInTheDocument();
    expect(screen.getByText("203.0.113.8")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("IP 位址"), { target: { value: "198.51.100.42" } });
    fireEvent.change(screen.getByLabelText("管理備註"), { target: { value: "重複暴力登入" } });
    fireEvent.click(screen.getByRole("button", { name: "加入並啟用" }));
    expect(save).toHaveBeenCalledWith({ ipAddress: "198.51.100.42", note: "重複暴力登入", isActive: true });
  });

  it("日期範圍篩選會將整天的起訖時間傳入登入稽核查詢", () => {
    window.sessionStorage.setItem("qingshui-audit-pin-verified-at", Date.now().toString());
    mocks.verifyPinUseMutation.mockReturnValue({ mutateAsync: vi.fn() });
    mocks.loginAuditUseQuery.mockReturnValue({ data: { logs: [], total: 0, page: 1, totalPages: 1 }, isLoading: false, error: null });
    mocks.operationLogsUseQuery.mockReturnValue({ data: { logs: [], total: 0, page: 1, totalPages: 1 }, isLoading: false, error: null });

    render(<AuditCenter />);
    fireEvent.change(screen.getByLabelText("開始日期"), { target: { value: "2026-08-01" } });
    fireEvent.change(screen.getByLabelText("結束日期"), { target: { value: "2026-08-07" } });

    const latestInput = mocks.loginAuditUseQuery.mock.calls.at(-1)?.[0];
    expect(latestInput.startDate).toBeInstanceOf(Date);
    expect(latestInput.endDate).toBeInstanceOf(Date);
    expect(latestInput.startDate.toISOString()).toContain("2026-08-01T00:00:00");
    expect(latestInput.endDate.toISOString()).toContain("2026-08-07T23:59:59.999");
  });

  it("在操作日誌醒目標示高風險操作，並可僅顯示本頁高風險操作", () => {
    mocks.location = "/audit-center/operation";
    window.sessionStorage.setItem("qingshui-audit-pin-verified-at", Date.now().toString());
    mocks.verifyPinUseMutation.mockReturnValue({ mutateAsync: vi.fn() });
    mocks.loginAuditUseQuery.mockReturnValue({ data: { logs: [], total: 0, page: 1, totalPages: 1 }, isLoading: false, error: null });
    mocks.operationLogsUseQuery.mockReturnValue({
      data: {
        logs: [
          { id: 1, username: "admin", action: "delete", entityType: "equipment", entityName: "攝影機", ipAddress: "127.0.0.1", createdAt: new Date() },
          { id: 2, username: "admin", action: "update", entityType: "equipment", entityName: "麥克風", ipAddress: "127.0.0.1", createdAt: new Date() },
        ], total: 2, page: 1, totalPages: 1,
      }, isLoading: false, error: null,
    });

    render(<AuditCenter />);

    expect(screen.getByText("高風險操作")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("僅顯示本頁高風險操作"));
    expect(screen.getByText("攝影機")).toBeInTheDocument();
    expect(screen.queryByText("麥克風")).not.toBeInTheDocument();
  });

  it("可使用去重維護專用篩選器追蹤手動掃描與重複帳號停用紀錄", () => {
    mocks.location = "/audit-center/operation";
    window.sessionStorage.setItem("qingshui-audit-pin-verified-at", Date.now().toString());
    mocks.verifyPinUseMutation.mockReturnValue({ mutateAsync: vi.fn() });
    mocks.operationLogsUseQuery.mockReturnValue({ data: { logs: [{ id: 5, username: "Chaney", action: "runAccountDeduplication", entityType: "accountDeduplication", entityName: "手動帳號去重檢查", ipAddress: null, createdAt: new Date() }], total: 1, page: 1, totalPages: 1 }, isLoading: false, error: null });

    render(<AuditCenter />);

    expect(screen.getByLabelText("僅顯示去重維護操作")).not.toBeChecked();
    fireEvent.click(screen.getByLabelText("僅顯示去重維護操作"));
    expect(mocks.operationLogsUseQuery.mock.calls.at(-1)?.[0]).toMatchObject({ deduplicationOnly: true, page: 1, pageSize: 50 });
    expect(screen.getByText("手動帳號去重檢查")).toBeInTheDocument();
  });

  it("重新進入稽核中心時，仍在有效期內的工作階段可直接顯示稽核內容", () => {
    window.sessionStorage.setItem("qingshui-audit-pin-verified-at", Date.now().toString());
    mocks.verifyPinUseMutation.mockReturnValue({ mutateAsync: vi.fn() });
    mocks.loginAuditUseQuery.mockReturnValue({ data: { logs: [], total: 0, page: 1, totalPages: 1 }, isLoading: false, error: null });
    mocks.operationLogsUseQuery.mockReturnValue({ data: { logs: [], total: 0, page: 1, totalPages: 1 }, isLoading: false, error: null });

    const firstVisit = render(<AuditCenter />);
    expect(screen.getByRole("tab", { name: "登入稽核" })).toBeInTheDocument();
    firstVisit.unmount();

    render(<AuditCenter />);
    expect(screen.getByRole("tab", { name: "登入稽核" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "驗證 PIN 碼" })).not.toBeInTheDocument();
  });

  it("本機 PIN 工作階段超過 30 分鐘時會清除狀態並回到驗證閘門", () => {
    window.sessionStorage.setItem("qingshui-audit-pin-verified-at", (Date.now() - 30 * 60 * 1000 - 1).toString());
    mocks.verifyPinUseMutation.mockReturnValue({ mutateAsync: vi.fn() });
    mocks.loginAuditUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: null });
    mocks.operationLogsUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: null });

    render(<AuditCenter />);

    expect(screen.getByRole("button", { name: "驗證 PIN 碼" })).toBeInTheDocument();
    expect(window.sessionStorage.getItem("qingshui-audit-pin-verified-at")).toBeNull();
  });

  it("伺服器回覆 PIN 驗證失效時會清除工作階段並重新要求驗證", async () => {
    window.sessionStorage.setItem("qingshui-audit-pin-verified-at", Date.now().toString());
    mocks.verifyPinUseMutation.mockReturnValue({ mutateAsync: vi.fn() });
    mocks.loginAuditUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: "PIN 碼驗證失效，請重新驗證", data: { code: "UNAUTHORIZED" } },
    });
    mocks.operationLogsUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: null });

    render(<AuditCenter />);

    await waitFor(() => expect(screen.getByRole("button", { name: "驗證 PIN 碼" })).toBeInTheDocument());
    expect(window.sessionStorage.getItem("qingshui-audit-pin-verified-at")).toBeNull();
  });
});
