import { useAuth } from "@/_core/hooks/useAuth";
import React from "react";
import { trpc } from "@/lib/trpc";
import { useTheme } from "@/contexts/ThemeContext";
import { downloadMultiMonthReimbursementSummaryCsv, downloadReimbursementSummaryCsv } from "@/lib/reimbursementSummaryExport";
import { exportReimbursementAnalysisPdf } from "@/lib/reimbursementAnalysisExport";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import {
  Activity,
  ClipboardList,
  LogIn,
  MapPin,
  Package,
  AlertTriangle,
  ShieldAlert,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  MailWarning,
  CircleDollarSign,
  Download,
  FileDown,
} from "lucide-react";
import { Link } from "wouter";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

const loginVolumeChartConfig = {
  loginCount: { label: "登入次數", color: "oklch(0.72 0.14 210)" },
  failedCount: { label: "失敗次數", color: "oklch(0.68 0.20 25)" },
} satisfies ChartConfig;

const failureRateChartConfig = {
  failureRate: { label: "失敗率", color: "oklch(0.75 0.14 85)" },
} satisfies ChartConfig;

const idleTimeoutChartConfig = {
  idleTimeoutCount: { label: "閒置逾時", color: "oklch(0.76 0.15 35)" },
} satisfies ChartConfig;

const brandLogoTrendChartConfig = {
  total: { label: "異常數量", color: "oklch(0.75 0.16 20)" },
  switched: { label: "成功切換", color: "oklch(0.76 0.15 155)" },
  textFallback: { label: "文字備援", color: "oklch(0.82 0.15 85)" },
} satisfies ChartConfig;

const reimbursementCategoryChartConfig = {
  totalAmount: { label: "支出金額", color: "oklch(0.74 0.14 170)" },
} satisfies ChartConfig;

const reimbursementTrendChartConfig = {
  totalAmount: { label: "支出金額", color: "oklch(0.66 0.16 175)" },
} satisfies ChartConfig;

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" });
}

function formatTwd(value: number | string) {
  return new Intl.NumberFormat("zh-TW", { style: "currency", currency: "TWD", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatChartAmount(value: number | string) {
  return new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 0 }).format(Math.round(Number(value) || 0));
}

function getTaipeiMonthValue(date = new Date()): string {
  const values = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit" }).formatToParts(date);
  const year = values.find((value) => value.type === "year")?.value;
  const month = values.find((value) => value.type === "month")?.value;
  return `${year}-${month}`;
}

function getMonthOffset(month: string, offset: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getMonthRange(startMonth: string, endMonth: string, maximumMonths = 24): string[] {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(startMonth) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(endMonth) || startMonth > endMonth) return [];
  const months: string[] = [];
  for (let month = startMonth; month <= endMonth && months.length < maximumMonths; month = getMonthOffset(month, 1)) months.push(month);
  return months;
}

function formatMonthOption(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return `${year} 年 ${monthNumber} 月`;
}

const REIMBURSEMENT_MIN_MONTH = "2026-08";
const REIMBURSEMENT_MIN_YEAR = 2026;

export default function Dashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const role = user?.role ?? "student";
  const [showUnverifiedEmails, setShowUnverifiedEmails] = React.useState(false);
  const [brandLogoThresholdDraft, setBrandLogoThresholdDraft] = React.useState("3");
  const [brandLogoAlertEnabled, setBrandLogoAlertEnabled] = React.useState(true);
  const [reimbursementMonth, setReimbursementMonth] = React.useState(() => getTaipeiMonthValue() < REIMBURSEMENT_MIN_MONTH ? REIMBURSEMENT_MIN_MONTH : getTaipeiMonthValue());
  const [reimbursementTrendStartMonth, setReimbursementTrendStartMonth] = React.useState(() => {
    const candidate = getMonthOffset(getTaipeiMonthValue(), -5);
    return candidate < REIMBURSEMENT_MIN_MONTH ? REIMBURSEMENT_MIN_MONTH : candidate;
  });
  const [reimbursementTrendEndMonth, setReimbursementTrendEndMonth] = React.useState(() => getTaipeiMonthValue());
  const [reimbursementBudgetYear, setReimbursementBudgetYear] = React.useState(() => Number(getTaipeiMonthValue().slice(0, 4)));
  const [reimbursementBudgetDraft, setReimbursementBudgetDraft] = React.useState("");
  const [dashboardUpdatedAt, setDashboardUpdatedAt] = React.useState<Date | null>(null);
  const [isDashboardUpdatePulsing, setIsDashboardUpdatePulsing] = React.useState(false);
  const reimbursementExportRef = React.useRef<HTMLElement | null>(null);
  const dashboardSnapshotRef = React.useRef<string | null>(null);
  const reimbursementMonthOptions = React.useMemo(() => {
    const currentMonth = getTaipeiMonthValue();
    const latestMonth = currentMonth < REIMBURSEMENT_MIN_MONTH ? REIMBURSEMENT_MIN_MONTH : currentMonth;
    const months: string[] = [];
    for (let month = latestMonth; month >= REIMBURSEMENT_MIN_MONTH; month = getMonthOffset(month, -1)) months.push(month);
    return months;
  }, []);
  const reimbursementBudgetYearOptions = React.useMemo(() => {
    const currentYear = Math.max(REIMBURSEMENT_MIN_YEAR, Number(getTaipeiMonthValue().slice(0, 4)));
    return Array.from({ length: currentYear - REIMBURSEMENT_MIN_YEAR + 1 }, (_, index) => currentYear - index);
  }, []);
  const reimbursementTrendMonths = React.useMemo(() => getMonthRange(reimbursementTrendStartMonth, reimbursementTrendEndMonth), [reimbursementTrendStartMonth, reimbursementTrendEndMonth]);
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();
  const { data: monthlyReimbursementSummary, isLoading: monthlyReimbursementSummaryLoading, error: monthlyReimbursementSummaryError } = trpc.dashboard.monthlyReimbursementSummary.useQuery(
    { month: reimbursementMonth },
    { enabled: role === "admin" || role === "teacher", refetchInterval: 60_000 }
  );
  const exportMonthlyReimbursementCsv = trpc.dashboard.exportMonthlyReimbursementSummaryCsv.useMutation({
    onSuccess: (summary) => {
      downloadReimbursementSummaryCsv(summary);
      toast.success(`${summary.month} 報帳分類統計 CSV 已開始下載`);
    },
    onError: (error) => toast.error(error.message || "無法匯出報帳分類統計 CSV"),
  });
  const { data: reimbursementMonthlyTrend, isLoading: reimbursementMonthlyTrendLoading, error: reimbursementMonthlyTrendError } = trpc.dashboard.reimbursementMonthlyTrend.useQuery(
    { months: reimbursementTrendMonths },
    { enabled: (role === "admin" || role === "teacher") && reimbursementTrendMonths.length >= 2, refetchInterval: 60_000 }
  );
  const { data: annualReimbursementBudgetComparison, isLoading: annualReimbursementBudgetLoading, error: annualReimbursementBudgetError, refetch: refetchAnnualReimbursementBudget } = trpc.dashboard.annualReimbursementBudgetComparison.useQuery(
    { year: reimbursementBudgetYear },
    { enabled: role === "admin" || role === "teacher", refetchInterval: 60_000 }
  );
  const saveAnnualReimbursementBudget = trpc.dashboard.saveAnnualReimbursementBudget.useMutation({
    onSuccess: async () => { await refetchAnnualReimbursementBudget(); toast.success("年度報帳預算已儲存"); },
    onError: (error) => toast.error(error.message || "無法儲存年度報帳預算"),
  });
  const exportReimbursementAnalysisPdfMutation = trpc.dashboard.exportReimbursementAnalysisPdf.useMutation();
  const exportMultiMonthReimbursementCsv = trpc.dashboard.exportMultiMonthReimbursementSummaryCsv.useMutation({
    onSuccess: (result) => {
      downloadMultiMonthReimbursementSummaryCsv(result.summaries);
      toast.success(`${result.months[0]} 至 ${result.months[result.months.length - 1]} 報帳統計 CSV 已開始下載`);
    },
    onError: (error) => toast.error(error.message || "無法匯出多月報帳分類統計 CSV"),
  });
  const { data: loginActivity, isLoading: loginActivityLoading, error: loginActivityError } = trpc.dashboard.loginActivity.useQuery(
    { period: "7d" },
    { enabled: role === "admin", refetchInterval: 60_000 }
  );
  const { data: operationalAlerts, isLoading: operationalAlertsLoading, error: operationalAlertsError } = trpc.dashboard.operationalAlerts.useQuery(
    undefined,
    { enabled: role === "admin", refetchInterval: 60_000 }
  );
  const { data: weeklyIdleTimeoutSecurity, isLoading: weeklyIdleTimeoutSecurityLoading, error: weeklyIdleTimeoutSecurityError } = trpc.dashboard.weeklyIdleTimeoutSecurity.useQuery(
    undefined,
    { enabled: role === "admin", refetchInterval: 60_000 }
  );
  const { data: unverifiedEmailUsers, isLoading: unverifiedEmailUsersLoading } = trpc.dashboard.unverifiedEmailUsers.useQuery(
    undefined,
    { enabled: role === "admin" }
  );
  const { data: deduplicationEmailSummary, isLoading: deduplicationEmailSummaryLoading } = trpc.dashboard.deduplicationEmailSummary.useQuery(
    undefined,
    { enabled: role === "admin", refetchInterval: 60_000 }
  );
  const { data: brandLogoSummary24h, isLoading: brandLogoSummaryLoading, error: brandLogoSummaryError, refetch: refetchBrandLogoSummary } = trpc.brandLogoMonitoring.summary24h.useQuery(
    undefined,
    { enabled: role === "admin", refetchInterval: 60_000 }
  );
  const { data: brandLogoHourlyTrend, isLoading: brandLogoTrendLoading, error: brandLogoTrendError, refetch: refetchBrandLogoTrend } = trpc.brandLogoMonitoring.hourlyTrend.useQuery(
    undefined,
    { enabled: role === "admin", refetchInterval: 60_000 }
  );
  const saveBrandLogoAlertThresholdMutation = trpc.brandLogoMonitoring.setAlertThreshold.useMutation({
    onSuccess: async () => {
      await Promise.all([refetchBrandLogoSummary(), refetchBrandLogoTrend()]);
      toast.success("Logo 異常警示門檻已更新");
    },
    onError: (error) => toast.error(error.message || "無法更新 Logo 警示門檻"),
  });
  const { data: recentRequests } = trpc.borrowRequests.myList.useQuery(
    undefined,
    { enabled: user?.role === "student" }
  );
  const { data: pendingRequests } = trpc.borrowRequests.list.useQuery(
    { status: "pending" },
    { enabled: user?.role !== "student" }
  );
  const dashboardSnapshot = React.useMemo(() => JSON.stringify({
    stats,
    pendingRequestCount: pendingRequests?.length ?? null,
    recentRequestCount: recentRequests?.length ?? null,
    operationalAlerts,
    reimbursementTotal: monthlyReimbursementSummary?.totalAmount ?? null,
  }), [monthlyReimbursementSummary?.totalAmount, operationalAlerts, pendingRequests?.length, recentRequests?.length, stats]);

  React.useEffect(() => {
    if (!brandLogoSummary24h?.alert) return;
    setBrandLogoThresholdDraft(String(brandLogoSummary24h.alert.thresholdCount));
    setBrandLogoAlertEnabled(brandLogoSummary24h.alert.isEnabled);
  }, [brandLogoSummary24h?.alert?.thresholdCount, brandLogoSummary24h?.alert?.isEnabled]);
  React.useEffect(() => {
    setReimbursementBudgetDraft(annualReimbursementBudgetComparison?.budget ? String(annualReimbursementBudgetComparison.budget.amount) : "");
  }, [annualReimbursementBudgetComparison?.budget?.amount, reimbursementBudgetYear]);
  React.useEffect(() => {
    if (!stats || statsLoading) return;
    if (dashboardSnapshotRef.current === null) {
      dashboardSnapshotRef.current = dashboardSnapshot;
      return;
    }
    if (dashboardSnapshotRef.current === dashboardSnapshot) return;
    dashboardSnapshotRef.current = dashboardSnapshot;
    setDashboardUpdatedAt(new Date());
    setIsDashboardUpdatePulsing(true);
    toast.info("總覽資料已同步最新異動");
    const resetPulseId = window.setTimeout(() => setIsDashboardUpdatePulsing(false), 1_600);
    return () => window.clearTimeout(resetPulseId);
  }, [dashboardSnapshot, stats, statsLoading]);

  const saveBrandLogoAlertThreshold = () => {
    const thresholdCount = Number.parseInt(brandLogoThresholdDraft, 10);
    if (!Number.isInteger(thresholdCount) || thresholdCount < 1 || thresholdCount > 500) {
      toast.error("警示門檻需為 1 至 500 的整數");
      return;
    }
    saveBrandLogoAlertThresholdMutation.mutate({ thresholdCount, isEnabled: brandLogoAlertEnabled });
  };

  const exportReimbursementSummaryCsv = () => {
    exportMonthlyReimbursementCsv.mutate({ month: reimbursementMonth });
  };
  const exportMultiMonthReimbursementSummaryCsv = () => {
    if (reimbursementTrendMonths.length < 2) {
      toast.error("請選擇至少兩個月，且起始月份不得晚於結束月份");
      return;
    }
    exportMultiMonthReimbursementCsv.mutate({ months: reimbursementTrendMonths });
  };
  const exportReimbursementAnalysis = async () => {
    if (!reimbursementExportRef.current) { toast.error("報帳分析尚未完成載入"); return; }
    try {
      await exportReimbursementAnalysisPdfMutation.mutateAsync({ year: reimbursementBudgetYear, startMonth: reimbursementTrendStartMonth, endMonth: reimbursementTrendEndMonth });
      await exportReimbursementAnalysisPdf({ element: reimbursementExportRef.current, year: reimbursementBudgetYear, exportedBy: user?.realName || user?.name || user?.username || "系統管理人員" });
      toast.success("報帳分析 PDF 已開始下載");
    } catch (error) {
      console.error("報帳分析 PDF 匯出失敗", error);
      toast.error("報帳分析 PDF 匯出失敗，請稍後再試");
    }
  };
  const reimbursementPanelClass = theme === "dark" ? "border-emerald-400/35 bg-[oklch(0.16_0.035_165)] text-white" : "border-emerald-700/30 bg-[oklch(0.96_0.025_165)] text-[oklch(0.22_0.035_165)]";
  const reimbursementInnerClass = theme === "dark" ? "border-emerald-300/25 bg-[oklch(0.14_0_0)]" : "border-emerald-700/20 bg-white";
  const reimbursementMutedClass = theme === "dark" ? "text-[oklch(0.68_0_0)]" : "text-[oklch(0.42_0.02_165)]";

  return (
    <div className="dashboard-theme-scope animate-fade-in">
      {/* Page Header */}
      <div className="section-header">
        <div>
          <h1 className="page-title">總覽</h1>
          <p className="page-subtitle">
            {role === "admin" ? "SYSTEM ADMINISTRATOR" : role === "teacher" ? "TEACHER PANEL" : "STUDENT PANEL"}
          </p>
        </div>
        <p className="label-caps hidden sm:block">
          {new Date().toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>
      {dashboardUpdatedAt && (
        <div className={`dashboard-update-notice ${isDashboardUpdatePulsing ? "dashboard-update-notice-pulse" : ""}`} role="status" aria-live="polite">
          <Activity size={15} aria-hidden="true" />
          <span>資料已更新</span>
          <span className="font-mono opacity-80">{dashboardUpdatedAt.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}</span>
        </div>
      )}

      {/* Stats Grid */}
      {statsLoading ? (
        <div className="dashboard-stat-grid grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {[...Array(4)].map((_, i) => (
              <div key={i} className="stat-card tech-stat-skeleton animate-pulse">
              <div className="h-3 w-16 bg-[oklch(0.22_0_0)] mb-4 rounded-none" />
              <div className="h-10 w-20 bg-[oklch(0.22_0_0)] rounded-none" />
            </div>
          ))}
        </div>
      ) : (
        <div className="dashboard-stat-grid grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {role === "student" ? (
            <>
              <StatCard label="我的待審核" value={(stats as any)?.myPending ?? 0} icon={Clock} accentColor="oklch(0.75 0.12 85)" className="dashboard-pending-stat-card" href="/my-requests" />
              <StatCard label="我的借出中" value={(stats as any)?.myActive ?? 0} icon={Package} accentColor="oklch(0.65 0.15 220)" href="/my-records" />
              <StatCard label="我的逾期" value={(stats as any)?.myOverdue ?? 0} icon={AlertTriangle} accentColor="oklch(0.60 0.20 15)" className="dashboard-overdue-stat-card" href="/my-records" />
              <StatCard label="可借器材" value={stats?.totalEquipment ?? 0} icon={CheckCircle} accentColor="oklch(0.70 0.14 145)" href="/browse" />
            </>
          ) : (
            <>
              <StatCard label="待審核申請" value={stats?.pending ?? 0} icon={Clock} accentColor="oklch(0.75 0.12 85)" className="dashboard-pending-stat-card" href="/requests" />
              <StatCard label="借出中器材" value={stats?.active ?? 0} icon={Package} accentColor="oklch(0.65 0.15 220)" href="/records" />
              <StatCard label="逾期未還" value={stats?.overdue ?? 0} icon={AlertTriangle} accentColor="oklch(0.60 0.20 15)" className="dashboard-overdue-stat-card" href="/records" />
              {role === "admin" ? (
                <StatCard label="活躍使用者" value={stats?.totalUsers ?? 0} icon={Users} accentColor="oklch(0.55 0 0)" href="/users" />
              ) : (
                <StatCard label="可借器材" value={stats?.totalEquipment ?? 0} icon={CheckCircle} accentColor="oklch(0.70 0.14 145)" href="/equipment" />
              )}
            </>
          )}
        </div>
      )}

      {(role === "admin" || role === "teacher") && (
        <section ref={reimbursementExportRef} className={`dashboard-reimbursement-panel mb-8 border p-5 ${reimbursementPanelClass}`} aria-labelledby="reimbursement-category-dashboard-title">
          <div className="dashboard-reimbursement-header flex flex-wrap items-start justify-between gap-4">
            <div><h2 id="reimbursement-category-dashboard-title" className="flex items-center gap-2 text-lg font-bold"><CircleDollarSign size={18} className="text-emerald-500 dark:text-emerald-300" />報帳支出分佈</h2><p className={`label-caps mt-1 ${reimbursementMutedClass}`}>APPROVED REIMBURSEMENT SPENDING · {monthlyReimbursementSummary?.month ?? "—"}</p></div>
            <div className="dashboard-reimbursement-actions flex flex-wrap items-center gap-2"><label className="sr-only" htmlFor="reimbursement-summary-month">選擇統計月份</label><select id="reimbursement-summary-month" value={reimbursementMonth} onChange={(event) => setReimbursementMonth(event.target.value)} className="h-9 border border-emerald-500/45 bg-white px-2 text-sm text-slate-950 outline-none focus:border-emerald-600 dark:bg-[oklch(0.14_0_0)] dark:text-white">{reimbursementMonthOptions.map((month) => <option key={month} value={month}>{formatMonthOption(month)}</option>)}</select><button type="button" onClick={exportReimbursementSummaryCsv} disabled={!monthlyReimbursementSummary?.categories.length || exportMonthlyReimbursementCsv.isPending} className="inline-flex h-9 items-center border border-emerald-500/55 bg-emerald-500/10 px-3 text-sm font-bold text-emerald-800 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-100"><Download className="mr-1.5 h-3.5 w-3.5" />{exportMonthlyReimbursementCsv.isPending ? "匯出中…" : "匯出 CSV"}</button><button type="button" onClick={() => void exportReimbursementAnalysis()} className="inline-flex h-9 items-center border border-emerald-500/55 bg-emerald-500/10 px-3 text-sm font-bold text-emerald-800 transition-colors hover:bg-emerald-500/20 dark:text-emerald-100"><FileDown className="mr-1.5 h-3.5 w-3.5" />圖表匯出 PDF</button><Link href="/reimbursements" className="border border-emerald-500/55 px-3 py-2 text-sm font-bold text-emerald-800 transition-colors hover:bg-emerald-500/15 dark:text-emerald-100">前往報帳管理 →</Link></div>
          </div>
          {monthlyReimbursementSummaryLoading ? <div className={`mt-5 h-64 animate-pulse ${theme === "dark" ? "bg-[oklch(0.14_0_0)]" : "bg-emerald-100"}`} /> : monthlyReimbursementSummaryError ? <div role="alert" className="mt-5 border border-red-400/60 bg-red-100 p-4 text-sm text-red-800 dark:bg-red-950/35 dark:text-red-100">報帳分類統計載入失敗：{monthlyReimbursementSummaryError.message}</div> : !monthlyReimbursementSummary?.categories.length ? <div className={`mt-5 border border-dashed p-8 text-center text-sm ${reimbursementInnerClass} ${reimbursementMutedClass}`}>本月尚無已核准或已付款的報帳支出資料</div> : <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_16rem]"><div className={`border p-4 ${reimbursementInnerClass}`}><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="font-bold">各類別支出金額</p><p className={`label-caps mt-1 ${reimbursementMutedClass}`}>TOTAL BY EXPENSE CATEGORY</p></div><p className={`text-xs ${reimbursementMutedClass}`}>含已核准及已付款案件</p></div><ChartContainer config={reimbursementCategoryChartConfig} className="dashboard-reimbursement-chart reimbursement-category-chart h-64 w-full"><BarChart accessibilityLayer data={monthlyReimbursementSummary.categories} margin={{ top: 8, right: 12, left: 18, bottom: 0 }}><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="category" tickLine={false} axisLine={false} tickMargin={8} interval={0} /><YAxis width={72} tickLine={false} axisLine={false} tickFormatter={formatChartAmount} /><ChartTooltip content={<ChartTooltipContent formatter={(value) => formatTwd(String(value))} />} /><Bar dataKey="totalAmount" fill="var(--color-totalAmount)" radius={[2, 2, 0, 0]} /></BarChart></ChartContainer></div><div className={`space-y-3 border p-4 ${reimbursementInnerClass}`}><div><p className={`label-caps ${reimbursementMutedClass}`}>本月核准總額</p><p className="mt-1 text-2xl font-black text-emerald-700 dark:text-emerald-100">{formatTwd(monthlyReimbursementSummary.totalAmount)}</p></div><div><p className={`label-caps ${reimbursementMutedClass}`}>核准案件數</p><p className="mt-1 text-2xl font-black">{monthlyReimbursementSummary.claimCount}</p></div><div className="border-t border-emerald-400/25 pt-3"><p className={`label-caps ${reimbursementMutedClass}`}>類別比例</p><div className="mt-2 space-y-2">{monthlyReimbursementSummary.categories.map((item) => <div key={item.category} className="flex items-center justify-between gap-3 text-xs"><span className="truncate">{item.category}</span><span className="shrink-0 font-mono text-emerald-700 dark:text-emerald-100">{monthlyReimbursementSummary.totalAmount > 0 ? Math.round((item.totalAmount / monthlyReimbursementSummary.totalAmount) * 100) : 0}%</span></div>)}</div></div></div></div>}
          <div className={`mt-5 border p-4 ${reimbursementInnerClass}`} aria-labelledby="reimbursement-budget-title">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><h3 id="reimbursement-budget-title" className="font-bold">年度預算與實際支出比較</h3><p className={`label-caps mt-1 ${reimbursementMutedClass}`}>ANNUAL BUDGET VS ACTUAL APPROVED SPENDING</p></div>
              <label className={`text-xs font-bold ${reimbursementMutedClass}`} htmlFor="reimbursement-budget-year">年度<select id="reimbursement-budget-year" aria-label="年度預算年度" value={reimbursementBudgetYear} onChange={(event) => setReimbursementBudgetYear(Number(event.target.value))} className="ml-2 h-9 w-24 border border-emerald-500/45 bg-white px-2 text-sm text-slate-950 outline-none focus:border-emerald-600 dark:bg-[oklch(0.14_0_0)] dark:text-white">{reimbursementBudgetYearOptions.map((year) => <option key={year} value={year}>{year} 年</option>)}</select></label>
            </div>
            {annualReimbursementBudgetLoading ? <div className="mt-4 h-20 animate-pulse bg-emerald-100 dark:bg-[oklch(0.16_0_0)]" /> : annualReimbursementBudgetError ? <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-200">年度預算資料載入失敗：{annualReimbursementBudgetError.message}</p> : <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]"><div><div className="flex items-end justify-between gap-4"><div><p className={`text-xs ${reimbursementMutedClass}`}>實際支出</p><p className="mt-1 text-2xl font-black">{formatTwd(annualReimbursementBudgetComparison?.actualAmount ?? 0)}</p></div><div className="text-right"><p className={`text-xs ${reimbursementMutedClass}`}>年度預算</p><p className="mt-1 text-lg font-bold">{annualReimbursementBudgetComparison?.budget ? formatTwd(annualReimbursementBudgetComparison.budget.amount) : "尚未設定"}</p></div></div><div className="mt-4 h-3 overflow-hidden bg-emerald-950/15 dark:bg-black/35"><div className={`h-full ${annualReimbursementBudgetComparison?.utilizationPercent && annualReimbursementBudgetComparison.utilizationPercent > 100 ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, annualReimbursementBudgetComparison?.utilizationPercent ?? 0)}%` }} /></div><p className={`mt-2 text-xs ${reimbursementMutedClass}`}>{annualReimbursementBudgetComparison?.budget ? `已使用 ${(annualReimbursementBudgetComparison.utilizationPercent ?? 0).toFixed(1)}% · 剩餘 ${formatTwd(annualReimbursementBudgetComparison.remainingAmount ?? 0)}` : "管理員設定年度預算後，即可追蹤剩餘額度與使用比例"}</p></div>{role === "admin" && <div className="border border-emerald-400/25 p-3"><label className={`text-xs font-bold ${reimbursementMutedClass}`} htmlFor="reimbursement-budget-amount">設定年度預算<input id="reimbursement-budget-amount" type="number" min="0" step="1" value={reimbursementBudgetDraft} onChange={(event) => setReimbursementBudgetDraft(event.target.value)} className="mt-1 block w-full border border-emerald-500/45 bg-white px-2 py-2 text-sm text-slate-950 outline-none focus:border-emerald-600 dark:bg-[oklch(0.14_0_0)] dark:text-white" placeholder="例如 120000" /></label><button type="button" className="mt-2 w-full border border-emerald-500/55 bg-emerald-500/10 px-3 py-2 text-sm font-bold text-emerald-800 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-100" disabled={saveAnnualReimbursementBudget.isPending || !Number.isFinite(Number(reimbursementBudgetDraft)) || Number(reimbursementBudgetDraft) < 0} onClick={() => saveAnnualReimbursementBudget.mutate({ year: reimbursementBudgetYear, amount: Number(reimbursementBudgetDraft) })}>{saveAnnualReimbursementBudget.isPending ? "儲存中…" : "儲存年度預算"}</button></div>}</div>}
          </div>
          <div className={`mt-5 border p-4 ${reimbursementInnerClass}`} aria-labelledby="reimbursement-monthly-trend-title">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><h3 id="reimbursement-monthly-trend-title" className="font-bold">跨月份支出趨勢</h3><p className={`label-caps mt-1 ${reimbursementMutedClass}`}>MONTHLY APPROVED SPENDING TREND · 最多 24 個月</p></div>
              <div className="flex flex-wrap items-end gap-2"><label className={`text-xs font-bold ${reimbursementMutedClass}`} htmlFor="reimbursement-trend-start-month">起始月份<input id="reimbursement-trend-start-month" type="month" min={REIMBURSEMENT_MIN_MONTH} value={reimbursementTrendStartMonth} max={reimbursementTrendEndMonth} onChange={(event) => event.target.value >= REIMBURSEMENT_MIN_MONTH && setReimbursementTrendStartMonth(event.target.value)} className="mt-1 block h-9 border border-emerald-500/45 bg-white px-2 text-sm text-slate-950 outline-none focus:border-emerald-600 dark:bg-[oklch(0.14_0_0)] dark:text-white" /></label><label className={`text-xs font-bold ${reimbursementMutedClass}`} htmlFor="reimbursement-trend-end-month">結束月份<input id="reimbursement-trend-end-month" type="month" value={reimbursementTrendEndMonth} min={reimbursementTrendStartMonth} max={getTaipeiMonthValue()} onChange={(event) => event.target.value >= reimbursementTrendStartMonth && setReimbursementTrendEndMonth(event.target.value)} className="mt-1 block h-9 border border-emerald-500/45 bg-white px-2 text-sm text-slate-950 outline-none focus:border-emerald-600 dark:bg-[oklch(0.14_0_0)] dark:text-white" /></label><button type="button" onClick={exportMultiMonthReimbursementSummaryCsv} disabled={reimbursementTrendMonths.length < 2 || exportMultiMonthReimbursementCsv.isPending} className="inline-flex h-9 items-center border border-emerald-500/55 bg-emerald-500/10 px-3 text-sm font-bold text-emerald-800 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-100"><Download className="mr-1.5 h-3.5 w-3.5" />{exportMultiMonthReimbursementCsv.isPending ? "合併中…" : "合併匯出 CSV"}</button></div>
            </div>
            {reimbursementTrendMonths.length < 2 ? <p role="alert" className="mt-4 text-sm text-amber-700 dark:text-amber-200">請選擇至少兩個月，且起始月份不得晚於結束月份</p> : reimbursementMonthlyTrendLoading ? <div className={`mt-5 h-64 animate-pulse ${theme === "dark" ? "bg-[oklch(0.16_0_0)]" : "bg-emerald-100"}`} /> : reimbursementMonthlyTrendError ? <div role="alert" className="mt-5 border border-red-400/60 bg-red-100 p-4 text-sm text-red-800 dark:bg-red-950/35 dark:text-red-100">跨月份趨勢載入失敗：{reimbursementMonthlyTrendError.message}</div> : <div className="mt-5"><ChartContainer config={reimbursementTrendChartConfig} className="dashboard-reimbursement-chart reimbursement-trend-chart h-64 w-full"><LineChart accessibilityLayer data={reimbursementMonthlyTrend ?? []} margin={{ top: 8, right: 14, left: 18, bottom: 0 }}><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={20} /><YAxis width={72} tickLine={false} axisLine={false} tickFormatter={formatChartAmount} /><ChartTooltip content={<ChartTooltipContent formatter={(value) => formatTwd(String(value))} />} /><Line type="monotone" dataKey="totalAmount" stroke="var(--color-totalAmount)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} /></LineChart></ChartContainer><p className={`mt-2 text-xs ${reimbursementMutedClass}`}>已選取 {reimbursementTrendMonths.length} 個月；折線包含已核准與已付款案件，無支出月份以零值呈現</p></div>}
          </div>
        </section>
      )}

      {role === "admin" && (
        <section className="dashboard-theme-panel dashboard-theme-panel--amber mb-8 border border-amber-400/40 bg-[oklch(0.17_0.04_85)] p-5" aria-labelledby="operational-alert-dashboard-title">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 id="operational-alert-dashboard-title" className="flex items-center gap-2 text-lg font-bold text-white"><AlertTriangle size={18} className="text-amber-300" />本月異動與待處理摘要</h2><p className="label-caps mt-1">LOCATION MOVEMENT &amp; OPEN CASES · {operationalAlerts?.month ?? "—"}</p></div><Link href="/location-audit-report" className="border border-amber-300/70 px-3 py-2 text-sm font-bold text-amber-100 transition-colors hover:bg-amber-300/15">查看位置月報 →</Link></div>
          {operationalAlertsLoading ? <div className="mt-4 h-24 animate-pulse bg-[oklch(0.14_0_0)]" /> : operationalAlertsError ? <div role="alert" className="mt-4 border border-red-400/60 bg-red-950/35 p-4 text-sm text-red-100">異動警示摘要載入失敗：{operationalAlertsError.message}</div> : <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="border border-amber-300/25 bg-[oklch(0.14_0_0)] p-4"><p className="label-caps">本月異動警示</p><p className="mt-1 text-3xl font-black text-amber-100">{operationalAlerts?.locationMovementAlertCount ?? 0}</p><p className="mt-1 text-xs text-[oklch(0.68_0_0)]">每器材月內達門檻一次</p></div><div className="border border-amber-300/25 bg-[oklch(0.14_0_0)] p-4"><p className="label-caps">處理中異常事件</p><p className="mt-1 text-3xl font-black text-white">{operationalAlerts?.inProgressAuditEventCount ?? 0}</p><Link href="/audit-center/login" className="mt-1 inline-block text-xs text-amber-200 underline underline-offset-2">前往稽核中心</Link></div><div className="border border-amber-300/25 bg-[oklch(0.14_0_0)] p-4"><p className="label-caps">待審核借用申請</p><p className="mt-1 text-3xl font-black text-white">{stats?.pending ?? 0}</p><Link href="/requests" className="mt-1 inline-block text-xs text-amber-200 underline underline-offset-2">查看申請</Link></div><div className="border border-amber-300/25 bg-[oklch(0.14_0_0)] p-4"><p className="label-caps">警示通知需注意</p><p className="mt-1 text-3xl font-black text-rose-200">{(operationalAlerts?.pendingNotificationCount ?? 0) + (operationalAlerts?.failedNotificationCount ?? 0)}</p><p className="mt-1 text-xs text-[oklch(0.68_0_0)]">待寄 {operationalAlerts?.pendingNotificationCount ?? 0} · 失敗 {operationalAlerts?.failedNotificationCount ?? 0}</p></div></div>}
        </section>
      )}

      {role === "admin" && (
        <section className="dashboard-theme-panel dashboard-theme-panel--amber mb-8 border border-amber-500/40 bg-[oklch(0.18_0.04_85)] p-5" aria-labelledby="unverified-email-dashboard-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 id="unverified-email-dashboard-title" className="flex items-center gap-2 text-lg font-bold text-white"><MailWarning size={18} className="text-amber-300" />聯絡資料驗證追蹤</h2><p className="label-caps mt-1">EMAIL VERIFICATION FOLLOW-UP</p></div>
            <button type="button" onClick={() => setShowUnverifiedEmails((visible) => !visible)} className="border border-amber-300/70 px-3 py-2 text-sm font-bold text-amber-100 transition-colors hover:bg-amber-300/15" aria-expanded={showUnverifiedEmails}>{showUnverifiedEmails ? "收合未驗證帳號" : `篩選未驗證帳號（${unverifiedEmailUsers?.length ?? 0}）`}</button>
          </div>
          {showUnverifiedEmails && (unverifiedEmailUsersLoading ? <div className="mt-4 h-20 animate-pulse bg-[oklch(0.16_0_0)]" /> : !unverifiedEmailUsers?.length ? <p className="mt-4 text-sm text-emerald-200">所有啟用帳號均已完成電子郵件驗證</p> : <div className="mt-4 overflow-x-auto"><table className="data-table"><thead><tr><th>帳號</th><th>姓名</th><th>電子郵件</th><th>狀態</th><th>最近登入</th></tr></thead><tbody>{unverifiedEmailUsers.map((account) => <tr key={account.id}><td className="font-mono text-sm text-white">{account.username || "—"}</td><td>{account.realName || account.name || "—"}</td><td>{account.email || "尚未填寫"}</td><td><span className={account.verificationStatus === "missing_email" ? "text-red-200" : "text-amber-200"}>{account.verificationStatus === "missing_email" ? "未填寫信箱" : "尚未驗證"}</span></td><td>{formatDate(account.lastSignedIn)}</td></tr>)}</tbody></table></div>)}
        </section>
      )}

      {role === "admin" && (
        <section className="dashboard-theme-panel dashboard-theme-panel--rose mb-8 border border-rose-400/35 bg-[oklch(0.17_0.04_20)] p-5" aria-labelledby="brand-logo-health-dashboard-title">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 id="brand-logo-health-dashboard-title" className="flex items-center gap-2 text-lg font-bold text-white"><AlertTriangle size={18} className="text-rose-300" />Logo 資產健康</h2><p className="label-caps mt-1">BRAND ASSET HEALTH · LAST 24 HOURS</p></div><Link href="/brand-logo-monitoring" className="border border-rose-300/70 px-3 py-2 text-sm font-bold text-rose-100 transition-colors hover:bg-rose-300/15">查看 Logo 異常監測 →</Link></div>
          {brandLogoSummaryError && <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-red-400/60 bg-red-950/35 p-4 text-sm text-red-100"><span>Logo 異常摘要暫時無法載入；下方數值可能不是最新結果</span><button type="button" onClick={() => void refetchBrandLogoSummary()} className="border border-red-300/70 px-3 py-1.5 font-bold text-red-100 transition-colors hover:bg-red-300/15">重新載入摘要</button></div>}
          {brandLogoTrendError && <div role="alert" className="mt-3 flex flex-wrap items-center justify-between gap-3 border border-amber-400/60 bg-amber-950/30 p-4 text-sm text-amber-100"><span>Logo 異常趨勢暫時無法載入；圖表可能為空白或非最新結果</span><button type="button" onClick={() => void refetchBrandLogoTrend()} className="border border-amber-300/70 px-3 py-1.5 font-bold text-amber-100 transition-colors hover:bg-amber-300/15">重新載入趨勢</button></div>}
          {brandLogoSummaryLoading ? <div className="mt-4 h-20 animate-pulse bg-[oklch(0.16_0_0)]" /> : <><div className="mt-4 grid gap-3 sm:grid-cols-3"><div><p className="label-caps">異常數量</p><p className="mt-1 text-3xl font-black text-white">{brandLogoSummary24h?.total ?? 0}</p></div><div><p className="label-caps">成功切換備援</p><p className="mt-1 text-2xl font-bold text-emerald-200">{brandLogoSummary24h?.switched ?? 0}</p></div><div><p className="label-caps">文字備援</p><p className="mt-1 text-2xl font-bold text-amber-200">{brandLogoSummary24h?.textFallback ?? 0}</p></div></div>{brandLogoSummary24h?.alert?.triggered && <div role="alert" className="mt-5 flex items-start gap-3 border border-rose-300/70 bg-rose-950/35 p-4 text-rose-100"><ShieldAlert className="mt-0.5 shrink-0 text-rose-300" size={20} /><div><p className="font-bold">Logo 異常警示已觸發</p><p className="mt-1 text-sm">近 24 小時累計 {brandLogoSummary24h.total} 次異常，已達您設定的 {brandLogoSummary24h.alert.thresholdCount} 次門檻請檢查下方趨勢與監測紀錄</p></div></div>}<div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]"><div className="border border-rose-400/30 bg-[oklch(0.14_0_0)] p-4"><div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-white">近 24 小時異常趨勢</p><p className="label-caps mt-1">HOURLY INCIDENT &amp; RECOVERY TREND</p></div><span className="text-xs text-[oklch(0.62_0_0)]">每小時統計 · 台灣時間</span></div>{brandLogoTrendLoading ? <div className="h-64 animate-pulse bg-[oklch(0.16_0_0)]" /> : <ChartContainer config={brandLogoTrendChartConfig} className="h-64 w-full"><LineChart accessibilityLayer data={brandLogoHourlyTrend?.hourly ?? []} margin={{ top: 8, right: 14, left: -10, bottom: 0 }}><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={22} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} /><ChartTooltip content={<ChartTooltipContent />} /><Line type="monotone" dataKey="total" stroke="var(--color-total)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} /><Line type="monotone" dataKey="switched" stroke="var(--color-switched)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} /><Line type="monotone" dataKey="textFallback" stroke="var(--color-textFallback)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} /></LineChart></ChartContainer>}</div><div className="border border-rose-400/30 bg-[oklch(0.14_0_0)] p-4"><p className="font-bold text-white">警示門檻</p><p className="mt-1 text-xs leading-relaxed text-[oklch(0.62_0_0)]">異常總數達門檻時，儀表板會顯示警示設定只影響管理提示，不會停止既有 Logo 備援</p><label className="mt-4 flex items-center gap-2 text-sm font-semibold text-rose-100"><input type="checkbox" checked={brandLogoAlertEnabled} onChange={(event) => setBrandLogoAlertEnabled(event.target.checked)} className="h-4 w-4 accent-rose-400" />啟用儀表板警示</label><label className="mt-4 block text-xs font-bold text-[oklch(0.68_0_0)]">近 24 小時異常次數</label><input type="number" min={1} max={500} value={brandLogoThresholdDraft} onChange={(event) => setBrandLogoThresholdDraft(event.target.value.replace(/\D/g, "").slice(0, 3))} className="mt-2 w-full border border-rose-300/60 bg-[oklch(0.18_0_0)] px-3 py-2 font-mono text-white outline-none focus:border-rose-200" aria-label="Logo 異常警示門檻" /><button type="button" className="mt-3 w-full border border-rose-300/70 bg-rose-300/15 px-3 py-2 text-sm font-bold text-rose-100 transition-colors hover:bg-rose-300/25 disabled:cursor-not-allowed disabled:opacity-60" onClick={saveBrandLogoAlertThreshold} disabled={saveBrandLogoAlertThresholdMutation.isPending}>{saveBrandLogoAlertThresholdMutation.isPending ? "儲存中…" : "儲存警示設定"}</button><p className="mt-3 text-xs text-[oklch(0.56_0_0)]">目前：{brandLogoSummary24h?.alert?.isEnabled ? `啟用，門檻 ${brandLogoSummary24h.alert.thresholdCount} 次` : "警示已停用"}</p></div></div></>}
        </section>
      )}

      {role === "admin" && (
        <section className="dashboard-theme-panel dashboard-theme-panel--cyan mb-8 border border-cyan-500/35 bg-[oklch(0.17_0.035_225)] p-5" aria-labelledby="deduplication-email-summary-title">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 id="deduplication-email-summary-title" className="flex items-center gap-2 text-lg font-bold text-white"><MailWarning size={18} className="text-cyan-300" />今日去重摘要寄送狀態</h2><p className="label-caps mt-1">DAILY ACCOUNT DEDUPLICATION EMAIL</p></div><Link href="/database-maintenance"><a className="border border-cyan-300/70 px-3 py-2 text-sm font-bold text-cyan-100 transition-colors hover:bg-cyan-300/15">查看資料庫維護 →</a></Link></div>
          {deduplicationEmailSummaryLoading ? <div className="mt-4 h-20 animate-pulse bg-[oklch(0.16_0_0)]" /> : <div className="mt-4">{!deduplicationEmailSummary?.hasRunToday ? <div><p className="font-bold text-cyan-100">今日排程尚未執行</p><p className="mt-1 text-sm text-cyan-100/80">系統將於台灣時間凌晨 03:00 產生僅供檢視的去重報告並寄送摘要；不會自動停用或刪除帳號</p></div> : <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4"><div><p className="label-caps">掃描結果</p><p className="mt-1 font-bold text-white">{deduplicationEmailSummary.duplicateGroupCount ?? 0} 組重複識別資料</p></div><div><p className="label-caps">寄送狀態</p><p className={`mt-1 font-bold ${deduplicationEmailSummary.emailStatus === "sent" ? "text-emerald-200" : deduplicationEmailSummary.emailStatus === "partial" || deduplicationEmailSummary.emailStatus === "suppressed" ? "text-amber-200" : "text-red-200"}`}>{({ sent: "已寄送", partial: "部分成功", failed: "寄送失敗", suppressed: "已略過重複通知", "no-recipients": "尚未設定收件者", pending: "等待排程", unavailable: "狀態暫時無法取得" } as const)[deduplicationEmailSummary.emailStatus] || deduplicationEmailSummary.emailStatus}</p></div><div><p className="label-caps">收件結果</p><p className="mt-1 text-cyan-100">成功 {deduplicationEmailSummary.sent} · 失敗 {deduplicationEmailSummary.failed}{deduplicationEmailSummary.suppressed ? ` · 略過 ${deduplicationEmailSummary.suppressed}` : ""}</p></div><div><p className="label-caps">最近寄送</p><p className="mt-1 text-cyan-100">{deduplicationEmailSummary.lastDeliveryAt ? new Date(deduplicationEmailSummary.lastDeliveryAt).toLocaleString("zh-TW") : "尚無寄送紀錄"}</p></div></div>}<div className="mt-4 border-t border-cyan-400/25 pt-4"><p className="label-caps">收件者設定</p>{!deduplicationEmailSummary?.activeRecipientCount ? <p className="mt-1 font-bold text-amber-200">尚未設定任何啟用收件者，今日摘要不會寄出</p> : <><p className="mt-1 text-sm text-cyan-100">已設定 {deduplicationEmailSummary.configuredRecipientCount} 位 · 啟用 {deduplicationEmailSummary.activeRecipientCount} 位{deduplicationEmailSummary.inactiveRecipientCount ? ` · 停用 ${deduplicationEmailSummary.inactiveRecipientCount} 位` : ""}</p><p className="mt-2 break-words text-sm text-white">通知對象：{deduplicationEmailSummary.activeRecipients.map((recipient) => recipient.label ? `${recipient.label}（${recipient.email}）` : recipient.email).join("、")}</p></>}</div></div>}
        </section>
      )}

      {role === "admin" && (
        <section className="dashboard-theme-panel dashboard-theme-panel--neutral mb-8 space-y-4" aria-labelledby="login-activity-dashboard-title">
          <div className="dashboard-login-activity-header" data-testid="dashboard-login-activity-header">
            <div className="dashboard-login-activity-heading">
              <h2 id="login-activity-dashboard-title" className="flex items-center gap-2 text-lg font-bold text-white"><Activity size={18} className="text-[oklch(0.72_0.14_210)]" />登入活動總覽</h2>
              <p className="label-caps mt-1">LOGIN SECURITY OVERVIEW · RECENT 7 DAYS</p>
            </div>
            <div className="dashboard-login-activity-summary" aria-label="近七日登入摘要">
              <span className="dashboard-login-activity-summary-label">LOGIN SUMMARY</span>
              <div className="dashboard-login-activity-summary-values"><span><LogIn size={14} />共 <strong>{loginActivity?.totalLoginCount ?? 0}</strong> 次登入</span><span>失敗率 <strong>{loginActivity?.failureRate ?? 0}%</strong></span></div>
            </div>
          </div>

          {loginActivity?.lockedEventWarning.triggered && (
            <div role="alert" className="flex items-start gap-3 border border-red-400/45 bg-[oklch(0.22_0.08_25)] p-4 text-red-100">
              <ShieldAlert size={20} className="mt-0.5 shrink-0 text-red-300" />
              <div><p className="font-bold">登入安全警告</p><p className="mt-1 text-sm">最近 7 天偵測到 {loginActivity.lockedEventWarning.lockedEventCount} 次帳號鎖定事件，已達門檻 {loginActivity.lockedEventWarning.threshold} 次請優先檢視異常 IP 來源</p></div>
            </div>
          )}

          {loginActivityLoading ? (
            <div className="grid gap-4 xl:grid-cols-2"><div className="h-72 animate-pulse bg-[oklch(0.16_0_0)]" /><div className="h-72 animate-pulse bg-[oklch(0.16_0_0)]" /></div>
          ) : loginActivityError ? (
            <div className="border border-red-500/40 bg-red-950/20 p-4 text-sm text-red-200">登入活動分析載入失敗：{loginActivityError.message}</div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="brutalist-card p-5">
                <div className="mb-4"><p className="text-sm font-bold text-white">每日登入次數</p><p className="label-caps mt-1">SUCCESS &amp; FAILED LOGINS</p></div>
                <ChartContainer config={loginVolumeChartConfig} className="h-64 w-full">
                  <BarChart accessibilityLayer data={loginActivity?.dailyLogins ?? []} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="loginCount" fill="var(--color-loginCount)" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="failedCount" fill="var(--color-failedCount)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>

              <div className="brutalist-card p-5">
                <div className="mb-4"><p className="text-sm font-bold text-white">登入失敗率趨勢</p><p className="label-caps mt-1">DAILY FAILURE RATE</p></div>
                <ChartContainer config={failureRateChartConfig} className="h-64 w-full">
                  <LineChart accessibilityLayer data={loginActivity?.dailyLogins ?? []} margin={{ top: 8, right: 14, left: -8, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis unit="%" tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(value) => `${value}%`} />} />
                    <Line type="monotone" dataKey="failureRate" stroke="var(--color-failureRate)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--color-failureRate)" }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ChartContainer>
              </div>

              <div className="brutalist-card overflow-hidden xl:col-span-2">
                <div className="flex items-center justify-between border-b border-[oklch(0.18_0_0)] px-5 py-4"><div><p className="flex items-center gap-2 text-sm font-bold text-white"><MapPin size={15} className="text-[oklch(0.75_0.14_85)]" />異常 IP 來源</p><p className="label-caps mt-1">FAILED LOGIN PATTERN ANALYSIS</p></div><span className="label-caps">失敗至少 2 次或含高風險事件</span></div>
                {!loginActivity?.abnormalIps.length ? <div className="p-8 text-center text-sm text-[oklch(0.42_0_0)]">目前區間內尚未發現異常 IP 登入模式</div> : <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>IP 來源</th><th>登入次數</th><th>失敗次數</th><th>失敗率</th><th>高風險</th><th>鎖定事件</th></tr></thead><tbody>{loginActivity.abnormalIps.map((ip) => <tr key={ip.ipAddress} className={ip.lockedEventCount > 0 ? "bg-red-950/20" : ""}><td className="font-mono text-sm text-white">{ip.ipAddress}</td><td>{ip.loginCount}</td><td className="text-red-200">{ip.failedCount}</td><td>{ip.failureRate}%</td><td>{ip.highRiskCount}</td><td>{ip.lockedEventCount}</td></tr>)}</tbody></table></div>}
              </div>
            </div>
          )}
        </section>
      )}

      {role === "admin" && (
        <section className="dashboard-theme-panel dashboard-theme-panel--orange mb-8 border border-[oklch(0.58_0.12_35)] bg-[oklch(0.16_0.035_35)] p-5" aria-labelledby="idle-timeout-security-title">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 id="idle-timeout-security-title" className="flex items-center gap-2 text-lg font-bold text-white"><Clock size={18} className="text-[oklch(0.78_0.14_45)]" />閒置逾時安全摘要</h2><p className="label-caps mt-1">IDLE TIMEOUT SECURITY · RECENT 7 DAYS</p></div>
            <p className="text-xs text-[oklch(0.66_0_0)]">系統會在 30 分鐘無操作後安全結束工作階段</p>
          </div>
          {weeklyIdleTimeoutSecurityLoading ? <div className="mt-4 h-44 animate-pulse bg-[oklch(0.14_0_0)]" /> : weeklyIdleTimeoutSecurityError ? <div role="alert" className="mt-4 border border-red-400/60 bg-red-950/35 p-4 text-sm text-red-100">閒置逾時摘要載入失敗：{weeklyIdleTimeoutSecurityError.message}</div> : <div className="mt-4 grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]"><div className="grid content-start gap-4"><div><p className="label-caps">本週逾時事件</p><p className="mt-1 text-4xl font-black text-[oklch(0.86_0.11_45)]">{weeklyIdleTimeoutSecurity?.totalIdleTimeoutCount ?? 0}</p></div><div><p className="label-caps">受影響帳號</p><p className="mt-1 text-2xl font-bold text-white">{weeklyIdleTimeoutSecurity?.affectedUserCount ?? 0}</p></div><div><p className="label-caps">最近事件</p><p className="mt-1 text-sm text-[oklch(0.78_0_0)]">{weeklyIdleTimeoutSecurity?.lastIdleTimeoutAt ? new Date(weeklyIdleTimeoutSecurity.lastIdleTimeoutAt).toLocaleString("zh-TW", { hour12: false }) : "最近七天無逾時事件"}</p></div></div><div className="border border-[oklch(0.42_0.09_35)] bg-[oklch(0.14_0_0)] p-4"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold text-white">每日閒置逾時趨勢</p><p className="label-caps mt-1">TAIWAN CALENDAR DAYS</p></div>{!weeklyIdleTimeoutSecurity?.totalIdleTimeoutCount && <span className="text-xs text-emerald-200">未發現逾時事件</span>}</div><ChartContainer config={idleTimeoutChartConfig} className="h-52 w-full"><BarChart accessibilityLayer data={weeklyIdleTimeoutSecurity?.dailyIdleTimeouts ?? []} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="idleTimeoutCount" fill="var(--color-idleTimeoutCount)" radius={[2, 2, 0, 0]} /></BarChart></ChartContainer></div></div>}
        </section>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Requests (admin/teacher) */}
        {role !== "student" && (
          <div className="brutalist-card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[oklch(0.18_0_0)]">
              <div>
                <p className="text-white font-bold text-sm">待審核申請</p>
                <p className="label-caps mt-0.5">PENDING REQUESTS</p>
              </div>
              <Link href="/requests">
                <a className="label-caps text-[oklch(0.55_0_0)] hover:text-white transition-colors">
                  查看全部 →
                </a>
              </Link>
            </div>
            {!pendingRequests || pendingRequests.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-[oklch(0.35_0_0)] text-sm">目前無待審核申請</p>
              </div>
            ) : (
              <div>
                {pendingRequests.slice(0, 5).map((req: any) => (
                  <div key={req.id} className="flex items-center gap-4 px-5 py-3.5 border-b border-[oklch(0.16_0_0)] hover:bg-[oklch(0.16_0_0)] transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{req.equipmentName}</p>
                      <p className="label-caps mt-0.5 truncate">{req.requesterName} · {formatDate(req.borrowDate)} ~ {formatDate(req.returnDate)}</p>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Requests (student) */}
        {role === "student" && (
          <div className="brutalist-card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[oklch(0.18_0_0)]">
              <div>
                <p className="text-white font-bold text-sm">我的借用申請</p>
                <p className="label-caps mt-0.5">MY REQUESTS</p>
              </div>
              <Link href="/my-requests">
                <a className="label-caps text-[oklch(0.55_0_0)] hover:text-white transition-colors">
                  查看全部 →
                </a>
              </Link>
            </div>
            {!recentRequests || recentRequests.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-[oklch(0.35_0_0)] text-sm">尚無借用申請</p>
              </div>
            ) : (
              <div>
                {recentRequests.slice(0, 5).map((req: any) => (
                  <div key={req.id} className="flex items-center gap-4 px-5 py-3.5 border-b border-[oklch(0.16_0_0)]">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{req.equipmentName}</p>
                      <p className="label-caps mt-0.5">{formatDate(req.borrowDate)} ~ {formatDate(req.returnDate)}</p>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="brutalist-card p-5">
          <p className="text-white font-bold text-sm mb-1">快速操作</p>
          <p className="label-caps mb-5">QUICK ACTIONS</p>
          <div className="space-y-2">
            {role === "admin" && (
              <>
                <Link href="/equipment">
                  <a className="flex items-center gap-3 p-3 border border-[oklch(0.22_0_0)] hover:border-[oklch(0.40_0_0)] hover:bg-[oklch(0.16_0_0)] transition-all group">
                    <Package size={15} className="text-[oklch(0.45_0_0)] group-hover:text-white transition-colors" />
                    <span className="text-sm text-[oklch(0.70_0_0)] group-hover:text-white transition-colors">管理器材清單</span>
                  </a>
                </Link>
                <Link href="/requests">
                  <a className="flex items-center gap-3 p-3 border border-[oklch(0.22_0_0)] hover:border-[oklch(0.40_0_0)] hover:bg-[oklch(0.16_0_0)] transition-all group">
                    <ClipboardList size={15} className="text-[oklch(0.45_0_0)] group-hover:text-white transition-colors" />
                    <span className="text-sm text-[oklch(0.70_0_0)] group-hover:text-white transition-colors">審核借用申請</span>
                  </a>
                </Link>
                <Link href="/users">
                  <a className="flex items-center gap-3 p-3 border border-[oklch(0.22_0_0)] hover:border-[oklch(0.40_0_0)] hover:bg-[oklch(0.16_0_0)] transition-all group">
                    <Users size={15} className="text-[oklch(0.45_0_0)] group-hover:text-white transition-colors" />
                    <span className="text-sm text-[oklch(0.70_0_0)] group-hover:text-white transition-colors">管理使用者帳號</span>
                  </a>
                </Link>
              </>
            )}
            {role === "teacher" && (
              <>
                <Link href="/requests">
                  <a className="flex items-center gap-3 p-3 border border-[oklch(0.22_0_0)] hover:border-[oklch(0.40_0_0)] hover:bg-[oklch(0.16_0_0)] transition-all group">
                    <ClipboardList size={15} className="text-[oklch(0.45_0_0)] group-hover:text-white transition-colors" />
                    <span className="text-sm text-[oklch(0.70_0_0)] group-hover:text-white transition-colors">審核借用申請</span>
                  </a>
                </Link>
                <Link href="/records">
                  <a className="flex items-center gap-3 p-3 border border-[oklch(0.22_0_0)] hover:border-[oklch(0.40_0_0)] hover:bg-[oklch(0.16_0_0)] transition-all group">
                    <RotateCcw size={15} className="text-[oklch(0.45_0_0)] group-hover:text-white transition-colors" />
                    <span className="text-sm text-[oklch(0.70_0_0)] group-hover:text-white transition-colors">確認器材歸還</span>
                  </a>
                </Link>
              </>
            )}
            {role === "student" && (
              <>
                <Link href="/browse">
                  <a className="flex items-center gap-3 p-3 border border-[oklch(0.22_0_0)] hover:border-[oklch(0.40_0_0)] hover:bg-[oklch(0.16_0_0)] transition-all group">
                    <Package size={15} className="text-[oklch(0.45_0_0)] group-hover:text-white transition-colors" />
                    <span className="text-sm text-[oklch(0.70_0_0)] group-hover:text-white transition-colors">瀏覽可借器材</span>
                  </a>
                </Link>
                <Link href="/my-requests">
                  <a className="flex items-center gap-3 p-3 border border-[oklch(0.22_0_0)] hover:border-[oklch(0.40_0_0)] hover:bg-[oklch(0.16_0_0)] transition-all group">
                    <ClipboardList size={15} className="text-[oklch(0.45_0_0)] group-hover:text-white transition-colors" />
                    <span className="text-sm text-[oklch(0.70_0_0)] group-hover:text-white transition-colors">查看我的申請</span>
                  </a>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
