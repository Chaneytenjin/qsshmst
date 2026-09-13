// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Dashboard from "../client/src/pages/Dashboard";

const mocks = vi.hoisted(() => ({
  user: { id: 1, role: "admin" },
  statsUseQuery: vi.fn(),
  monthlyReimbursementSummaryUseQuery: vi.fn(),
  exportMonthlyReimbursementSummaryCsv: vi.fn(),
  annualReimbursementBudgetComparisonUseQuery: vi.fn(),
  saveAnnualReimbursementBudget: vi.fn(),
  exportReimbursementAnalysisPdf: vi.fn(),
  reimbursementMonthlyTrendUseQuery: vi.fn(),
  exportMultiMonthReimbursementSummaryCsv: vi.fn(),
  loginActivityUseQuery: vi.fn(),
  operationalAlertsUseQuery: vi.fn(),
  weeklyIdleTimeoutSecurityUseQuery: vi.fn(),
  unverifiedEmailUsersUseQuery: vi.fn(),
  deduplicationEmailSummaryUseQuery: vi.fn(),
  brandLogoSummary24hUseQuery: vi.fn(),
  brandLogoHourlyTrendUseQuery: vi.fn(),
  saveBrandLogoThreshold: vi.fn(),
  myListUseQuery: vi.fn(),
  borrowListUseQuery: vi.fn(),
}));

vi.mock("../client/src/lib/trpc", () => ({
  trpc: {
    dashboard: { stats: { useQuery: mocks.statsUseQuery }, monthlyReimbursementSummary: { useQuery: mocks.monthlyReimbursementSummaryUseQuery }, exportMonthlyReimbursementSummaryCsv: { useMutation: () => ({ mutate: mocks.exportMonthlyReimbursementSummaryCsv, isPending: false }) }, annualReimbursementBudgetComparison: { useQuery: mocks.annualReimbursementBudgetComparisonUseQuery }, saveAnnualReimbursementBudget: { useMutation: () => ({ mutate: mocks.saveAnnualReimbursementBudget, isPending: false }) }, exportReimbursementAnalysisPdf: { useMutation: () => ({ mutateAsync: mocks.exportReimbursementAnalysisPdf, isPending: false }) }, reimbursementMonthlyTrend: { useQuery: mocks.reimbursementMonthlyTrendUseQuery }, exportMultiMonthReimbursementSummaryCsv: { useMutation: () => ({ mutate: mocks.exportMultiMonthReimbursementSummaryCsv, isPending: false }) }, loginActivity: { useQuery: mocks.loginActivityUseQuery }, operationalAlerts: { useQuery: mocks.operationalAlertsUseQuery }, weeklyIdleTimeoutSecurity: { useQuery: mocks.weeklyIdleTimeoutSecurityUseQuery }, unverifiedEmailUsers: { useQuery: mocks.unverifiedEmailUsersUseQuery }, deduplicationEmailSummary: { useQuery: mocks.deduplicationEmailSummaryUseQuery } },
    brandLogoMonitoring: { summary24h: { useQuery: mocks.brandLogoSummary24hUseQuery }, hourlyTrend: { useQuery: mocks.brandLogoHourlyTrendUseQuery }, setAlertThreshold: { useMutation: () => ({ mutate: mocks.saveBrandLogoThreshold, isPending: false }) } },
    borrowRequests: { myList: { useQuery: mocks.myListUseQuery }, list: { useQuery: mocks.borrowListUseQuery } },
  },
}));
vi.mock("../client/src/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("../client/src/components/StatCard", () => ({ StatCard: ({ label, value, href }: { label: string; value: number; href?: string }) => <a href={href} aria-label={href ? `查看${label}詳情` : undefined}>{label} {value}</a> }));
vi.mock("../client/src/components/StatusBadge", () => ({ StatusBadge: () => <span>狀態</span> }));
vi.mock("../client/src/components/ui/chart", () => ({ ChartContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, ChartTooltip: () => null, ChartTooltipContent: () => null }));
vi.mock("recharts", () => ({ Bar: () => null, BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, CartesianGrid: () => null, Line: () => null, LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, XAxis: () => null, YAxis: () => null }));
vi.mock("wouter", () => ({ Link: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

function configureMocks() {
  mocks.statsUseQuery.mockReturnValue({ data: { pending: 2, active: 4, overdue: 1, totalEquipment: 15, totalUsers: 8 }, isLoading: false });
  mocks.monthlyReimbursementSummaryUseQuery.mockReturnValue({ data: { month: "2026-08", totalAmount: 540, claimCount: 1, categories: [{ category: "耗材", totalAmount: 540, itemCount: 1 }] }, isLoading: false, error: null });
  mocks.annualReimbursementBudgetComparisonUseQuery.mockReturnValue({ data: { year: 2026, actualAmount: 540, budget: { id: 1, year: 2026, amount: 120000, updatedAt: new Date() }, remainingAmount: 119460, utilizationPercent: 0.45 }, isLoading: false, error: null, refetch: vi.fn() });
  mocks.reimbursementMonthlyTrendUseQuery.mockReturnValue({ data: [{ month: "2026-03", label: "2026/03", totalAmount: 320, claimCount: 1, itemCount: 1 }, { month: "2026-08", label: "2026/08", totalAmount: 540, claimCount: 1, itemCount: 1 }], isLoading: false, error: null });
  mocks.loginActivityUseQuery.mockReturnValue({ data: { period: "7d", totalLoginCount: 12, failedLoginCount: 5, failureRate: 41.7, dailyLogins: [{ date: "2026-08-12", label: "08/12", loginCount: 12, failedCount: 5, failureRate: 41.7 }], abnormalIps: [{ ipAddress: "198.51.100.14", loginCount: 5, failedCount: 4, highRiskCount: 3, lockedEventCount: 3, failureRate: 80 }], lockedEventWarning: { threshold: 3, lockedEventCount: 3, triggered: true } }, isLoading: false, error: null });
  mocks.operationalAlertsUseQuery.mockReturnValue({ data: { month: "2026-08", locationMovementAlertCount: 2, pendingNotificationCount: 1, failedNotificationCount: 0, inProgressAuditEventCount: 3 }, isLoading: false, error: null });
  mocks.weeklyIdleTimeoutSecurityUseQuery.mockReturnValue({ data: { period: "7d", totalIdleTimeoutCount: 4, affectedUserCount: 3, lastIdleTimeoutAt: new Date("2026-08-12T08:30:00.000Z"), dailyIdleTimeouts: [{ date: "2026-08-12", label: "08/12", idleTimeoutCount: 4 }] }, isLoading: false, error: null });
  mocks.unverifiedEmailUsersUseQuery.mockReturnValue({ data: [{ id: 4, username: "unverified-user", realName: "未驗證使用者", name: null, email: "pending@example.com", role: "student", lastSignedIn: new Date(), verificationStatus: "unverified", verificationCreatedAt: new Date(), verifiedAt: null }, { id: 5, username: "missing-email", realName: null, name: null, email: null, role: "student", lastSignedIn: new Date(), verificationStatus: "missing_email", verificationCreatedAt: null, verifiedAt: null }], isLoading: false });
  mocks.deduplicationEmailSummaryUseQuery.mockReturnValue({ data: { hasRunToday: true, duplicateGroupCount: 2, emailStatus: "sent", sent: 2, failed: 0, suppressed: 0, recipients: 2, configuredRecipientCount: 3, activeRecipientCount: 2, inactiveRecipientCount: 1, activeRecipients: [{ id: 1, label: "主任", email: "director@example.com" }, { id: 2, label: null, email: "security@example.com" }], lastDeliveryAt: new Date("2026-08-12T03:00:00.000Z") }, isLoading: false });
  mocks.brandLogoSummary24hUseQuery.mockReturnValue({ data: { total: 4, switched: 3, textFallback: 1, windowHours: 24, since: new Date(), alert: { thresholdCount: 3, isEnabled: true, configured: true, updatedAt: new Date(), updatedById: 1, triggered: true } }, isLoading: false });
  mocks.brandLogoHourlyTrendUseQuery.mockReturnValue({ data: { windowHours: 24, since: new Date(), hourly: [{ hour: "2026-08-12T08", label: "08:00", total: 4, switched: 3, textFallback: 1 }] }, isLoading: false });
  mocks.myListUseQuery.mockReturnValue({ data: [] });
  mocks.borrowListUseQuery.mockReturnValue({ data: [] });
}

configureMocks();

describe("Dashboard login activity analytics", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.user = { id: 1, role: "admin" };
    configureMocks();
  });

  it("管理者可查看登入次數、失敗率、異常 IP 與鎖定事件警告", () => {
    render(<Dashboard />);

    expect(screen.getByRole("heading", { name: "總覽" })).toBeInTheDocument();
    expect(screen.getByText("登入活動總覽")).toBeInTheDocument();
    expect(screen.getByLabelText("近七日登入摘要")).toHaveTextContent("共 12 次登入");
    expect(screen.getByLabelText("近七日登入摘要")).toHaveTextContent("失敗率 41.7%");
    expect(screen.getByText("每日登入次數")).toBeInTheDocument();
    expect(screen.getByText("登入失敗率趨勢")).toBeInTheDocument();
    expect(screen.getByText("異常 IP 來源")).toBeInTheDocument();
    expect(screen.getByText("198.51.100.14")).toBeInTheDocument();
    expect(screen.getByText("登入安全警告").closest('[role="alert"]')).toHaveTextContent("已達門檻 3 次");
    expect(mocks.loginActivityUseQuery).toHaveBeenCalledWith({ period: "7d" }, expect.objectContaining({ enabled: true }));
  });

  it("儀表板科技風資訊卡可導向相對應的管理頁面", () => {
    const { container } = render(<Dashboard />);

    expect(screen.getByRole("link", { name: "查看待審核申請詳情" })).toHaveAttribute("href", "/requests");
    expect(screen.getByRole("link", { name: "查看借出中器材詳情" })).toHaveAttribute("href", "/records");
    expect(screen.getByRole("link", { name: "查看逾期未還詳情" })).toHaveAttribute("href", "/records");
    expect(screen.getByRole("link", { name: "查看活躍使用者詳情" })).toHaveAttribute("href", "/users");
    expect(container.querySelector(".dashboard-theme-scope")).toBeInTheDocument();
    expect(container.querySelectorAll(".dashboard-theme-panel")).toHaveLength(6);
    expect(container.querySelector(".dashboard-theme-panel--amber")).toBeInTheDocument();
    expect(container.querySelector(".dashboard-theme-panel--rose")).toBeInTheDocument();
  });

  it("統計資料載入時會呈現科技風資料卡載入動畫", () => {
    mocks.statsUseQuery.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(<Dashboard />);

    expect(container.querySelectorAll(".tech-stat-skeleton")).toHaveLength(4);
  });

  it("偵測到新的統計資料時會顯示可存取的即時更新提示", async () => {
    const { rerender } = render(<Dashboard />);
    mocks.statsUseQuery.mockReturnValue({ data: { pending: 3, active: 4, overdue: 1, totalEquipment: 15, totalUsers: 8 }, isLoading: false });
    rerender(<Dashboard />);

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("資料已更新"));
    expect(screen.getByRole("status")).toHaveClass("dashboard-update-notice-pulse");
  });

  it("管理者可查看本月已核准報帳分類支出統計", () => {
    render(<Dashboard />);

    expect(screen.getByText("報帳支出分佈")).toBeInTheDocument();
    expect(screen.getByText("各類別支出金額")).toBeInTheDocument();
    expect(screen.getByText("本月核准總額")).toBeInTheDocument();
    const monthSelector = screen.getByRole("combobox", { name: "選擇統計月份" });
    expect((monthSelector as HTMLSelectElement).value).toMatch(/^\d{4}-\d{2}$/);
    expect(Array.from(monthSelector.querySelectorAll("option")).every((option) => option.value >= "2026-08")).toBe(true);
    expect(mocks.monthlyReimbursementSummaryUseQuery).toHaveBeenCalledWith(expect.objectContaining({ month: expect.stringMatching(/^\d{4}-\d{2}$/) }), expect.objectContaining({ enabled: true }));
    fireEvent.change(monthSelector, { target: { value: "2026-08" } });
    expect(mocks.monthlyReimbursementSummaryUseQuery).toHaveBeenLastCalledWith({ month: "2026-08" }, expect.objectContaining({ enabled: true }));
    const csvButton = screen.getByRole("button", { name: "匯出 CSV" });
    const pdfButton = screen.getByRole("button", { name: "圖表匯出 PDF" });
    expect(csvButton.parentElement).toBe(pdfButton.parentElement);
    fireEvent.click(csvButton);
    expect(mocks.exportMonthlyReimbursementSummaryCsv).toHaveBeenCalledWith({ month: "2026-08" });
  });

  it("報帳金額圖表使用完整數字刻度，不再使用 k 縮寫", () => {
    const source = readFileSync("client/src/pages/Dashboard.tsx", "utf8");

    expect(source).toContain("function formatChartAmount");
    expect(source).toContain("tickFormatter={formatChartAmount}");
    expect(source).toContain("<YAxis width={72}");
    expect(source).not.toContain("Math.round(Number(value) / 1000)}k");
  });

  it("管理者可查看年度預算使用比例並儲存年度預算設定", () => {
    render(<Dashboard />);

    expect(screen.getByText("年度預算與實際支出比較")).toBeInTheDocument();
    expect(screen.getByText(/已使用 0\.5%/)).toBeInTheDocument();
    const yearSelector = screen.getByRole("combobox", { name: "年度預算年度" });
    expect(Array.from(yearSelector.querySelectorAll("option")).every((option) => Number(option.value) >= 2026)).toBe(true);
    fireEvent.change(screen.getByLabelText("設定年度預算"), { target: { value: "150000" } });
    fireEvent.click(screen.getByRole("button", { name: "儲存年度預算" }));
    expect(mocks.saveAnnualReimbursementBudget).toHaveBeenCalledWith(expect.objectContaining({ year: expect.any(Number), amount: 150000 }));
    expect(mocks.annualReimbursementBudgetComparisonUseQuery).toHaveBeenCalledWith(expect.objectContaining({ year: expect.any(Number) }), expect.objectContaining({ enabled: true }));
  });

  it("管理者可查看跨月份報帳支出趨勢並合併匯出多月 CSV", () => {
    render(<Dashboard />);

    expect(screen.getByText("跨月份支出趨勢")).toBeInTheDocument();
    expect(screen.getByLabelText("起始月份")).toHaveAttribute("min", "2026-08");
    expect(screen.getByLabelText("結束月份")).toHaveAttribute("min", "2026-08");
    expect(mocks.reimbursementMonthlyTrendUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ months: expect.arrayContaining(["2026-08"]) }),
      expect.objectContaining({ enabled: true })
    );
    fireEvent.change(screen.getByLabelText("起始月份"), { target: { value: "2026-08" } });
    fireEvent.change(screen.getByLabelText("結束月份"), { target: { value: "2026-08" } });
    expect(screen.getByRole("button", { name: "合併匯出 CSV" })).toBeDisabled();
  });

  it("管理者可查看近七日閒置逾時安全摘要與每日趨勢", () => {
    render(<Dashboard />);

    expect(screen.getByText("閒置逾時安全摘要")).toBeInTheDocument();
    expect(screen.getByText("本週逾時事件")).toBeInTheDocument();
    expect(screen.getByText("受影響帳號")).toBeInTheDocument();
    expect(screen.getByText("每日閒置逾時趨勢")).toBeInTheDocument();
    expect(mocks.weeklyIdleTimeoutSecurityUseQuery).toHaveBeenCalledWith(undefined, expect.objectContaining({ enabled: true }));
  });

  it("管理者可查看本月位置異動警示與待處理摘要", () => {
    render(<Dashboard />);

    expect(screen.getByText("本月異動與待處理摘要")).toBeInTheDocument();
    expect(screen.getByText("本月異動警示")).toBeInTheDocument();
    expect(screen.getByText("處理中異常事件")).toBeInTheDocument();
    expect(mocks.operationalAlertsUseQuery).toHaveBeenCalledWith(undefined, expect.objectContaining({ enabled: true }));
  });

  it("管理者可篩選並查看尚未完成電子郵件驗證的帳號", () => {
    render(<Dashboard />);

    fireEvent.click(screen.getByRole("button", { name: "篩選未驗證帳號（2）" }));
    expect(screen.getByText("unverified-user")).toBeInTheDocument();
    expect(screen.getByText("pending@example.com")).toBeInTheDocument();
    expect(screen.getByText("未填寫信箱")).toBeInTheDocument();
    expect(mocks.unverifiedEmailUsersUseQuery).toHaveBeenCalledWith(undefined, expect.objectContaining({ enabled: true }));
  });

  it("管理者可查看今日去重摘要郵件的寄送狀態與掃描結果", () => {
    render(<Dashboard />);

    expect(screen.getByText("今日去重摘要寄送狀態")).toBeInTheDocument();
    expect(screen.getByText("2 組重複識別資料")).toBeInTheDocument();
    expect(screen.getByText("已寄送")).toBeInTheDocument();
    expect(screen.getByText("成功 2 · 失敗 0")).toBeInTheDocument();
    expect(screen.getByText("已設定 3 位 · 啟用 2 位 · 停用 1 位")).toBeInTheDocument();
    expect(screen.getByText("通知對象：主任（director@example.com）、security@example.com")).toBeInTheDocument();
    expect(mocks.deduplicationEmailSummaryUseQuery).toHaveBeenCalledWith(undefined, expect.objectContaining({ enabled: true }));
  });

  it("管理者可查看近 24 小時 Logo 異常與備援切換摘要", () => {
    render(<Dashboard />);

    expect(screen.getByText("Logo 資產健康")).toBeInTheDocument();
    expect(screen.getByText("成功切換備援")).toBeInTheDocument();
    expect(screen.getByText("文字備援")).toBeInTheDocument();
    expect(screen.getByText("近 24 小時異常趨勢")).toBeInTheDocument();
    expect(screen.getByText("Logo 異常警示已觸發")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "儲存警示設定" }));
    expect(mocks.saveBrandLogoThreshold).toHaveBeenCalledWith({ thresholdCount: 3, isEnabled: true });
    expect(mocks.brandLogoSummary24hUseQuery).toHaveBeenCalledWith(undefined, expect.objectContaining({ enabled: true }));
    expect(mocks.brandLogoHourlyTrendUseQuery).toHaveBeenCalledWith(undefined, expect.objectContaining({ enabled: true }));
  });

  it("非管理者不顯示登入活動安全分析區塊", () => {
    mocks.user = { id: 2, role: "teacher" };
    render(<Dashboard />);

    expect(screen.queryByText("登入活動總覽")).not.toBeInTheDocument();
    expect(screen.queryByText("閒置逾時安全摘要")).not.toBeInTheDocument();
  });
});
