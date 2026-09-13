import React from "react";
import { Clock3, Download, FileImage, Megaphone, Pencil, Pin, Send, TriangleAlert } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { SystemReportBackLink, SystemReportSubnav } from "@/components/SystemReportSubnav";

type ReportStatus = "draft" | "published" | "archived";
type ReportPriority = "normal" | "important" | "urgent";

const STATUS_LABELS: Record<ReportStatus, string> = { draft: "草稿", published: "已發布", archived: "已封存" };
const PRIORITY_LABELS: Record<ReportPriority, string> = { normal: "一般", important: "重要", urgent: "緊急" };
const PRIORITY_BADGE_CLASSES: Record<ReportPriority, string> = {
  normal: "border border-[oklch(0.28_0_0)] bg-[oklch(0.17_0_0)] text-[oklch(0.65_0_0)]",
  important: "border border-[oklch(0.72_0.14_65)] bg-[oklch(0.72_0.14_65_/_0.14)] text-[oklch(0.84_0.14_78)]",
  urgent: "border border-[oklch(0.62_0.20_25)] bg-[oklch(0.62_0.20_25_/_0.16)] text-[oklch(0.82_0.16_32)]",
};

export default function SystemReportCreated() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const reportsQuery = trpc.systemReports.list.useQuery();
  const publishMutation = trpc.systemReports.publish.useMutation();
  const setPinnedMutation = trpc.systemReports.setPinned.useMutation();
  const setPriorityMutation = trpc.systemReports.setPriority.useMutation();
  const trackDownloadMutation = trpc.systemReports.trackDownload.useMutation();
  const reports = reportsQuery.data ?? [];
  const isSaving = publishMutation.isPending || setPinnedMutation.isPending || setPriorityMutation.isPending;

  const invalidateReports = async () => {
    await Promise.all([utils.systemReports.list.invalidate(), utils.systemReports.unread.invalidate(), user?.role === "admin" ? utils.systemReports.statistics.invalidate() : Promise.resolve()]);
  };

  const canEdit = (report: typeof reports[number]) => user?.role === "admin" || report.authorId === user?.id;
  const updatePinned = async (id: number, nextIsPinned: boolean) => {
    try { await setPinnedMutation.mutateAsync({ id, isPinned: nextIsPinned }); await invalidateReports(); toast.success(nextIsPinned ? "報告已置頂" : "已取消置頂"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "無法更新置頂設定"); }
  };
  const updatePriority = async (id: number, nextPriority: ReportPriority) => {
    try { await setPriorityMutation.mutateAsync({ id, priority: nextPriority }); await invalidateReports(); toast.success(`重要程度已調整為「${PRIORITY_LABELS[nextPriority]}」`); }
    catch (error) { toast.error(error instanceof Error ? error.message : "無法更新重要程度"); }
  };
  const publish = async (id: number) => {
    try { await publishMutation.mutateAsync({ id }); await invalidateReports(); toast.success("系統報告已發布"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "無法發布系統報告"); }
  };

  return (
    <div className="system-reports-page container py-8 space-y-8">
      <header className="system-reports-header flex flex-col gap-4 border-b border-[oklch(0.22_0_0)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div><SystemReportBackLink /><div className="mb-3 mt-4 flex items-center gap-2 text-cyan-300"><Megaphone className="h-5 w-5" /><span className="label-caps">System Reports</span></div><h1 className="page-title text-3xl font-semibold tracking-tight text-white">已建立的報告</h1><p className="system-reports-header-description page-subtitle mt-2">查看系統報告草稿、發布狀態與附件</p></div>
      </header>
      <SystemReportSubnav active="created" />
      <section aria-label="系統報告清單" className="system-reports-list"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold text-white">已建立的報告</h2><span className="label-caps">{reports.length} 則</span></div>{reportsQuery.isLoading ? <div className="grid gap-3"><div className="h-28 animate-pulse bg-[oklch(0.17_0_0)]" /><div className="h-28 animate-pulse bg-[oklch(0.17_0_0)]" /></div> : reportsQuery.error ? <div className="empty-state"><p>無法載入系統報告</p><button className="btn-secondary mt-4" onClick={() => reportsQuery.refetch()}>重新載入</button></div> : reports.length === 0 ? <div className="empty-state"><p className="text-white">尚未建立系統報告</p><p className="label-caps mt-2">回到建立系統報告頁面開始新增內容</p><Link href="/system-reports" className="btn-primary mt-4 inline-flex items-center gap-2"><Pencil size={14} />建立系統報告</Link></div> : <div className="space-y-3">{reports.map((report) => { const author = report.authorRealName || report.authorName || report.authorUsername || "未知作者"; const isDraft = report.status === "draft"; const hasExpired = Boolean(report.expiresAt && new Date(report.expiresAt) <= new Date()); return <article key={report.id} className={`system-reports-list-item border bg-[oklch(0.13_0_0)] p-5 ${report.priority === "urgent" ? "border-[oklch(0.62_0.20_25)]" : report.priority === "important" ? "border-[oklch(0.72_0.14_65)]" : "border-[oklch(0.24_0_0)]"}`}><div className="flex flex-col gap-4 sm:flex-row sm:justify-between"><div className="min-w-0"><div className="mb-2 flex flex-wrap items-center gap-2"><span className={isDraft ? "status-badge pending" : hasExpired ? "status-badge overdue" : "status-badge available"}>{hasExpired ? "已到期下架" : STATUS_LABELS[report.status]}</span>{report.isPinned && <span className="inline-flex items-center gap-1 border border-[oklch(0.72_0.14_65)] px-2 py-0.5 text-xs text-[oklch(0.82_0.14_78)]"><Pin size={12} />置頂</span>}<span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs ${PRIORITY_BADGE_CLASSES[report.priority]}`}>{report.priority === "urgent" && <TriangleAlert size={12} />}{PRIORITY_LABELS[report.priority]}</span><span className="label-caps">#{report.id}</span></div><h3 className="text-base font-semibold text-white">{report.title}</h3><p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-[oklch(0.68_0_0)]">{report.content}</p><p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-[oklch(0.50_0_0)]"><Clock3 size={13} />{isDraft ? "最後更新" : "發布"}：{new Date(isDraft ? report.updatedAt : report.publishedAt || report.updatedAt).toLocaleString("zh-TW")} · {author}{report.expiresAt ? ` · 有效至 ${new Date(report.expiresAt).toLocaleString("zh-TW")}` : " · 永久顯示"}{report.priority === "urgent" && report.mustReadBy ? ` · 必讀截止 ${new Date(report.mustReadBy).toLocaleString("zh-TW")}` : ""}</p>{report.assets?.length ? <div className="mt-3 flex flex-wrap gap-2">{report.assets.map((asset) => <a key={asset.id} href={asset.url} target="_blank" rel="noreferrer" onClick={() => { if (asset.assetKind === "attachment" && report.status === "published" && !hasExpired) trackDownloadMutation.mutate({ assetId: asset.id }); }} className="system-reports-asset-link inline-flex max-w-full items-center gap-1.5 border border-[oklch(0.26_0_0)] px-2 py-1 text-xs text-[oklch(0.66_0_0)] hover:text-white">{asset.assetKind === "image" ? <FileImage size={13} /> : <Download size={13} />}<span className="max-w-52 truncate">{asset.fileName}</span></a>)}</div> : null}</div><div className="flex shrink-0 flex-wrap gap-2 self-start">{canEdit(report) && <><button type="button" className="btn-secondary flex items-center gap-1.5" onClick={() => void updatePinned(report.id, !report.isPinned)} disabled={isSaving}><Pin size={14} />{report.isPinned ? "取消置頂" : "置頂"}</button><label className="sr-only" htmlFor={`report-priority-${report.id}`}>調整 {report.title} 的重要程度</label><select id={`report-priority-${report.id}`} aria-label={`調整 ${report.title} 的重要程度`} className="industrial-input h-9 w-28 py-1 text-xs" value={report.priority} disabled={isSaving} onChange={(event) => void updatePriority(report.id, event.target.value as ReportPriority)}><option value="normal">一般</option><option value="important">重要</option><option value="urgent" disabled={report.priority !== "urgent"}>緊急（草稿設定）</option></select></>}{isDraft && canEdit(report) && <><Link href={`/system-reports?edit=${report.id}`} className="btn-secondary flex items-center gap-1.5"><Pencil size={14} />編輯</Link><button type="button" className="btn-primary flex items-center gap-1.5" onClick={() => void publish(report.id)} disabled={isSaving}><Send size={14} />發布</button></>}</div></div></article>; })}</div>}</section>
    </div>
  );
}
