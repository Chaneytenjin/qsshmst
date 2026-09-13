import React, { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, Database, Filter, RefreshCw, Search, ShieldAlert } from "lucide-react";
import { trpc } from "@/lib/trpc";

function formatDate(value: Date | string | null | undefined) {
  return value ? new Date(value).toLocaleString("zh-TW") : "尚無紀錄";
}

export default function UrgentAnnouncementStatus() {
  const audiencesQuery = trpc.systemReports.unreadUrgentRecipients.useQuery();
  const retentionQuery = trpc.operationLogs.retentionStatus.useQuery();
  const reports = audiencesQuery.data ?? [];
  const outstandingUserCount = reports.reduce((total, report) => total + report.unreadCount, 0);
  const [keyword, setKeyword] = useState("");
  const [department, setDepartment] = useState("all");
  const [role, setRole] = useState("all");
  const [deadlineStatus, setDeadlineStatus] = useState<"all" | "overdue" | "dueToday" | "upcoming">("all");
  const departments = useMemo(() => Array.from(new Set(reports.flatMap((report) => report.unreadUsers.map((user) => user.department?.trim()).filter((value): value is string => Boolean(value))))).sort((a, b) => a.localeCompare(b, "zh-TW")), [reports]);
  const filteredReports = useMemo(() => {
    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    const normalizedKeyword = keyword.trim().toLocaleLowerCase("zh-TW");
    return reports.map((report) => {
      const deadline = report.mustReadBy ? new Date(report.mustReadBy) : null;
      const isOverdue = Boolean(deadline && deadline <= now);
      const isDueToday = Boolean(deadline && deadline > now && deadline <= endOfToday);
      const isUpcoming = Boolean(!deadline || deadline > endOfToday);
      const includeReport = deadlineStatus === "all" || (deadlineStatus === "overdue" && isOverdue) || (deadlineStatus === "dueToday" && isDueToday) || (deadlineStatus === "upcoming" && isUpcoming);
      if (!includeReport) return null;
      const unreadUsers = report.unreadUsers.filter((user) => {
        const searchable = [user.username, user.name, user.realName, user.department].filter(Boolean).join(" ").toLocaleLowerCase("zh-TW");
        return (!normalizedKeyword || searchable.includes(normalizedKeyword)) && (department === "all" || user.department === department) && (role === "all" || user.role === role);
      });
      return unreadUsers.length > 0 ? { ...report, unreadUsers, unreadCount: unreadUsers.length } : null;
    }).filter((report): report is NonNullable<typeof report> => report !== null);
  }, [reports, keyword, department, role, deadlineStatus]);
  const filteredUserCount = filteredReports.reduce((total, report) => total + report.unreadCount, 0);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 border-b border-[oklch(0.22_0_0)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-caps mb-2">緊急公告追蹤與資料保留</p>
          <h1 className="page-title flex items-center gap-3"><ShieldAlert size={28} />緊急公告追蹤</h1>
          <p className="page-subtitle mt-2">查看仍未確認緊急公告的啟用帳號，並監督操作日誌 365 天保留政策的執行結果</p>
        </div>
        <button type="button" className="btn-secondary flex items-center justify-center gap-2" onClick={() => void Promise.all([audiencesQuery.refetch(), retentionQuery.refetch()])} disabled={audiencesQuery.isFetching || retentionQuery.isFetching}>
          <RefreshCw size={15} className={audiencesQuery.isFetching || retentionQuery.isFetching ? "animate-spin" : ""} />重新整理
        </button>
      </header>

      <section aria-label="操作日誌保留政策" className="border border-[oklch(0.24_0_0)] bg-[oklch(0.13_0_0)] p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-2"><Database size={19} className="text-[oklch(0.66_0.13_210)]" /><h2 className="font-semibold text-white">操作日誌保留政策</h2></div>
        {retentionQuery.isLoading ? <div className="h-24 animate-pulse bg-[oklch(0.17_0_0)]" /> : retentionQuery.error ? <div className="empty-state"><p>無法載入日誌保留狀態</p><button className="btn-secondary mt-3" onClick={() => retentionQuery.refetch()}>重新載入</button></div> : retentionQuery.data?.schedule ? <div className="grid gap-4 sm:grid-cols-3">
          <div className="border border-[oklch(0.23_0_0)] p-4"><p className="label-caps">保留期限</p><p className="mt-2 text-2xl font-semibold text-white">{retentionQuery.data.schedule.retentionDays} 天</p><p className="mt-1 text-xs text-[oklch(0.58_0_0)]">僅清理早於截止日期的操作日誌</p></div>
          <div className="border border-[oklch(0.23_0_0)] p-4"><p className="label-caps">排程狀態</p><p className={`mt-2 text-lg font-semibold ${retentionQuery.data.schedule.isActive ? "text-[oklch(0.68_0.13_145)]" : "text-[oklch(0.76_0.13_72)]"}`}>{retentionQuery.data.schedule.isActive ? "背景清理已啟用" : "背景清理已停用"}</p><p className="mt-1 text-xs text-[oklch(0.58_0_0)]">每日 03:00（臺灣時間） · 最近執行：{formatDate(retentionQuery.data.schedule.lastRunAt)}</p></div>
          <div className="border border-[oklch(0.23_0_0)] p-4"><p className="label-caps">最近清理結果</p><p className="mt-2 text-2xl font-semibold text-white">{retentionQuery.data.latestRun?.deletedCount ?? 0} 筆</p><p className="mt-1 text-xs text-[oklch(0.58_0_0)]">執行：{formatDate(retentionQuery.data.latestRun?.ranAt)}{retentionQuery.data.latestRun ? ` · 截止 ${formatDate(retentionQuery.data.latestRun.cutoffAt)}` : ""}</p></div>
        </div> : <div className="border border-[oklch(0.76_0.13_72)] bg-[oklch(0.76_0.13_72_/_0.08)] p-4 text-sm text-[oklch(0.86_0.13_78)]">日誌保留排程正在設定中；啟用後，系統會每日清理超過 365 天的操作日誌並留下執行紀錄</div>}
      </section>

      <section aria-label="緊急公告未讀名單" className="border border-[oklch(0.24_0_0)] bg-[oklch(0.13_0_0)] p-5 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><AlertTriangle size={19} className="text-[oklch(0.82_0.16_32)]" /><h2 className="font-semibold text-white">未讀緊急公告名單</h2></div><span className="status-badge overdue">{filteredUserCount} / {outstandingUserCount} 筆待確認</span></div>
        {audiencesQuery.isLoading ? <div className="space-y-3"><div className="h-28 animate-pulse bg-[oklch(0.17_0_0)]" /><div className="h-28 animate-pulse bg-[oklch(0.17_0_0)]" /></div> : audiencesQuery.error ? <div className="empty-state"><p>無法載入未讀名單</p><button className="btn-secondary mt-3" onClick={() => audiencesQuery.refetch()}>重新載入</button></div> : reports.length === 0 ? <div className="empty-state"><CheckCircle2 className="mx-auto mb-3 text-[oklch(0.68_0.13_145)]" size={30} /><p className="text-white">目前沒有未讀的有效緊急公告</p><p className="label-caps mt-2">所有緊急公告均已確認，或目前尚未發布緊急公告</p></div> : <><div className="mb-5 grid gap-3 border border-[oklch(0.22_0_0)] bg-[oklch(0.15_0_0)] p-3 sm:grid-cols-2 lg:grid-cols-4"><label className="block"><span className="label-caps mb-1.5 flex items-center gap-1"><Search size={12} />帳號、姓名或部門</span><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜尋未讀者" className="h-9 w-full border border-[oklch(0.30_0_0)] bg-[oklch(0.12_0_0)] px-3 text-sm text-white outline-none placeholder:text-[oklch(0.50_0_0)] focus:border-[oklch(0.66_0.13_210)]" /></label><label className="block"><span className="label-caps mb-1.5 flex items-center gap-1"><Filter size={12} />部門</span><select value={department} onChange={(event) => setDepartment(event.target.value)} className="h-9 w-full border border-[oklch(0.30_0_0)] bg-[oklch(0.12_0_0)] px-3 text-sm text-white outline-none focus:border-[oklch(0.66_0.13_210)]"><option value="all">全部部門</option>{departments.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="block"><span className="label-caps mb-1.5">帳號角色</span><select value={role} onChange={(event) => setRole(event.target.value)} className="h-9 w-full border border-[oklch(0.30_0_0)] bg-[oklch(0.12_0_0)] px-3 text-sm text-white outline-none focus:border-[oklch(0.66_0.13_210)]"><option value="all">全部角色</option><option value="admin">管理員</option><option value="teacher">教師</option><option value="student">學生</option></select></label><label className="block"><span className="label-caps mb-1.5">必讀狀態</span><select value={deadlineStatus} onChange={(event) => setDeadlineStatus(event.target.value as typeof deadlineStatus)} className="h-9 w-full border border-[oklch(0.30_0_0)] bg-[oklch(0.12_0_0)] px-3 text-sm text-white outline-none focus:border-[oklch(0.66_0.13_210)]"><option value="all">全部期限</option><option value="overdue">已逾期</option><option value="dueToday">今日截止</option><option value="upcoming">未來截止</option></select></label></div>{filteredReports.length === 0 ? <div className="empty-state border border-dashed border-[oklch(0.32_0_0)]"><p className="text-white">目前沒有符合篩選條件的未讀使用者</p><button type="button" className="btn-secondary mt-3" onClick={() => { setKeyword(""); setDepartment("all"); setRole("all"); setDeadlineStatus("all"); }}>清除篩選</button></div> : <div className="space-y-4">{filteredReports.map((report) => {
          const overdue = Boolean(report.mustReadBy && new Date(report.mustReadBy) <= new Date());
          return <article key={report.id} className={`border p-4 sm:p-5 ${overdue ? "border-[oklch(0.62_0.20_25)] bg-[oklch(0.62_0.20_25_/_0.06)]" : "border-[oklch(0.76_0.13_72)]"}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="mb-2 flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1 border border-[oklch(0.62_0.20_25)] bg-[oklch(0.62_0.20_25_/_0.16)] px-2 py-0.5 text-xs text-[oklch(0.82_0.16_32)]"><AlertTriangle size={12} />緊急公告</span>{overdue && <span className="status-badge overdue">必讀期限已過</span>}</div><h3 className="font-semibold text-white">{report.title}</h3><p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-[oklch(0.60_0_0)]"><CalendarClock size={13} />必讀截止：{formatDate(report.mustReadBy)} · 已發布：{formatDate(report.publishedAt)}</p></div><span className="status-badge overdue">{report.unreadCount} 人未讀</span></div>
            {report.unreadUsers.length > 0 && <div className="mt-4 overflow-x-auto border-t border-[oklch(0.22_0_0)] pt-3"><table className="w-full min-w-160 text-left text-sm"><thead className="label-caps"><tr><th className="pb-2 font-medium">帳號</th><th className="pb-2 font-medium">姓名</th><th className="pb-2 font-medium">部門</th><th className="pb-2 font-medium">角色</th></tr></thead><tbody>{report.unreadUsers.map((user) => <tr key={user.id} className="border-t border-[oklch(0.20_0_0)] text-[oklch(0.78_0_0)]"><td className="py-2.5 font-mono text-xs">{user.username || `user_${user.id}`}</td><td className="py-2.5">{user.realName || user.name || "未設定"}</td><td className="py-2.5">{user.department || "未設定"}</td><td className="py-2.5">{user.role === "admin" ? "管理員" : user.role === "teacher" ? "教師" : "學生"}</td></tr>)}</tbody></table></div>}
          </article>;
        })}</div>}</>}
      </section>
    </div>
  );
}
