import React from "react";
import { BarChart3, CheckCircle2, Megaphone, Pin, TriangleAlert } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { SystemReportSubnav } from "@/components/SystemReportSubnav";

type ReportPriority = "normal" | "important" | "urgent";

const PRIORITY_LABELS: Record<ReportPriority, string> = {
  normal: "一般",
  important: "重要",
  urgent: "緊急",
};

const PRIORITY_BADGE_CLASSES: Record<ReportPriority, string> = {
  normal: "border border-[oklch(0.28_0_0)] bg-[oklch(0.17_0_0)] text-[oklch(0.65_0_0)]",
  important: "border border-[oklch(0.72_0.14_65)] bg-[oklch(0.72_0.14_65_/_0.14)] text-[oklch(0.84_0.14_78)]",
  urgent: "border border-[oklch(0.62_0.20_25)] bg-[oklch(0.62_0.20_25_/_0.16)] text-[oklch(0.82_0.16_32)]",
};

export default function SystemReportStatistics() {
  const { user } = useAuth();
  const statisticsQuery = trpc.systemReports.statistics.useQuery(undefined, { enabled: user?.role === "admin" });

  return (
    <div className="system-reports-page container py-8 space-y-8">
      <header className="system-reports-header flex flex-col gap-4 border-b border-[oklch(0.22_0_0)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-cyan-300"><Megaphone className="h-5 w-5" /><span className="label-caps">System Reports</span></div>
          <h1 className="page-title text-3xl font-semibold tracking-tight text-white">系統報告</h1>
          <p className="system-reports-header-description page-subtitle mt-2 max-w-2xl text-sm leading-6">發布後，所有使用者會在登入系統後看到報告內容、圖片及附件並確認閱讀</p>
        </div>
        <div className="system-reports-role-note flex items-center gap-2 text-xs text-[oklch(0.60_0_0)]"><CheckCircle2 size={15} className="text-[oklch(0.65_0.13_145)]" />教師與管理員皆可建立及發布</div>
      </header>

      <SystemReportSubnav active="statistics" />

      {user?.role === "admin" && <section aria-label="系統報告閱讀統計" className="system-reports-statistics-card border border-[oklch(0.24_0_0)] bg-[oklch(0.13_0_0)] p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-2"><BarChart3 size={19} className="text-[oklch(0.72_0.14_65)]" /><h2 className="font-semibold text-white">已發布報告閱讀統計</h2></div>
        {statisticsQuery.isLoading ? <div className="h-24 animate-pulse bg-[oklch(0.17_0_0)]" /> : statisticsQuery.error ? <div className="empty-state"><p>無法載入閱讀統計</p><button className="btn-secondary mt-3" onClick={() => statisticsQuery.refetch()}>重新載入</button></div> : (statisticsQuery.data?.length ?? 0) === 0 ? <p className="text-sm text-[oklch(0.58_0_0)]">尚無已發布報告可供統計</p> : <div className="space-y-3">
          {statisticsQuery.data?.map((report) => {
            const percentage = report.activeUserCount ? Math.round((report.readCount / report.activeUserCount) * 100) : 0;
            const attachments = report.assets.filter((asset) => asset.assetKind === "attachment");
            return <article key={report.id} className="system-reports-statistics-item border border-[oklch(0.22_0_0)] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="mb-2 flex flex-wrap items-center gap-2">{report.isPinned && <span className="inline-flex items-center gap-1 border border-[oklch(0.72_0.14_65)] px-2 py-0.5 text-xs text-[oklch(0.82_0.14_78)]"><Pin size={12} />置頂</span>}<span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs ${PRIORITY_BADGE_CLASSES[report.priority]}`}>{report.priority === "urgent" && <TriangleAlert size={12} />}{PRIORITY_LABELS[report.priority]}</span></div><p className="font-medium text-white">{report.title}</p><p className="mt-1 text-xs text-[oklch(0.55_0_0)]">#{report.id} · {report.expiresAt ? `有效至 ${new Date(report.expiresAt).toLocaleString("zh-TW")}` : "永久顯示"}{report.priority === "urgent" && report.mustReadBy ? ` · 必讀截止 ${new Date(report.mustReadBy).toLocaleString("zh-TW")}` : ""}</p></div><span className="status-badge available">{percentage}% 已讀</span></div>
              <div className="system-reports-read-progress-track mt-4 h-2 overflow-hidden bg-[oklch(0.21_0_0)]"><div className="system-reports-read-progress-fill h-full bg-[oklch(0.72_0.14_65)] transition-[width] duration-200" style={{ width: `${percentage}%` }} /></div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-center text-sm sm:grid-cols-4"><div><p className="text-lg font-semibold text-white">{report.readCount}</p><p className="label-caps">已讀</p></div><div><p className="text-lg font-semibold text-[oklch(0.76_0.13_72)]">{report.unreadCount}</p><p className="label-caps">未讀</p></div><div><p className="text-lg font-semibold text-[oklch(0.68_0_0)]">{report.activeUserCount}</p><p className="label-caps">啟用帳號</p></div><div><p className="text-lg font-semibold text-[oklch(0.66_0.13_210)]">{report.downloadCount}</p><p className="label-caps">附件下載</p></div></div>
              {attachments.length > 0 && <div className="mt-4 border-t border-[oklch(0.22_0_0)] pt-3"><p className="label-caps mb-2">附件互動</p><div className="space-y-1.5">{attachments.map((asset) => <div key={asset.id} className="flex items-center justify-between gap-3 text-xs text-[oklch(0.65_0_0)]"><span className="truncate">{asset.fileName}</span><span className="shrink-0">{asset.downloadCount} 次下載</span></div>)}</div></div>}
            </article>;
          })}
        </div>}
      </section>}
    </div>
  );
}
