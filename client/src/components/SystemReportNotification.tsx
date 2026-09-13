import React, { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bell, BellRing, CalendarClock, Check, ChevronLeft, Download, FileText, Megaphone, Paperclip, Pin, TriangleAlert } from "lucide-react";

const PRIORITY_LABELS = { normal: "一般", important: "重要", urgent: "緊急" } as const;

const PRIORITY_CLASSES = {
  normal: "system-report-priority-normal",
  important: "system-report-priority-important",
  urgent: "system-report-priority-urgent",
} as const;

export function SystemReportNotification({ collapsed = false }: { collapsed?: boolean }) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const inboxQuery = trpc.systemReports.inbox.useQuery(undefined, { refetchInterval: 60_000 });
  const reports = inboxQuery.data ?? [];
  const unreadReports = useMemo(() => reports.filter((report) => !report.isRead), [reports]);
  const urgentUnreadCount = unreadReports.filter((report) => report.priority === "urgent").length;
  const selectedReport = reports.find((report) => report.id === selectedId) ?? null;
  const selectedAttachments = selectedReport?.assets?.filter((asset) => asset.assetKind === "attachment") ?? [];
  const selectedImages = selectedReport?.assets?.filter((asset) => asset.assetKind === "image") ?? [];
  const markReadMutation = trpc.systemReports.markRead.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.systemReports.inbox.invalidate(), utils.systemReports.unread.invalidate()]);
      setSelectedId(null);
    },
  });
  const trackDownloadMutation = trpc.systemReports.trackDownload.useMutation();

  const unreadCount = unreadReports.length;
  const buttonLabel = unreadCount > 0 ? `公告通知，共 ${unreadCount} 則未讀${urgentUnreadCount ? `，其中 ${urgentUnreadCount} 則緊急` : ""}` : "公告通知，沒有未讀公告";

  return (
    <>
      <button
        type="button"
        onClick={() => { setSelectedId(null); setOpen(true); }}
        className={`session-sidebar-announcement-trigger relative flex w-full items-center text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.68_0.12_210)] ${collapsed ? "justify-center p-1" : "gap-3 px-2 py-2"}`}
        aria-label={buttonLabel}
        title={collapsed ? buttonLabel : undefined}
      >
        <span className={`session-sidebar-announcement-icon relative flex h-8 w-8 shrink-0 items-center justify-center border ${urgentUnreadCount ? "is-urgent" : unreadCount ? "is-unread" : "is-read"}`}>
          {urgentUnreadCount ? <BellRing size={15} /> : <Bell size={15} />}
          {unreadCount > 0 && <span className="absolute -right-1.5 -top-1.5 flex min-w-4 h-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black leading-none text-white">{unreadCount > 99 ? "99+" : unreadCount}</span>}
        </span>
        {collapsed ? <span className="sr-only">{buttonLabel}</span> : <span className="min-w-0 flex-1"><span className="session-sidebar-announcement-title block text-xs font-bold">公告通知</span><span className={`session-sidebar-announcement-status mt-0.5 block truncate text-[10px] ${urgentUnreadCount ? "is-urgent" : unreadCount ? "is-unread" : "is-read"}`}>{inboxQuery.isLoading ? "同步公告中…" : unreadCount ? `${unreadCount} 則未讀${urgentUnreadCount ? ` · ${urgentUnreadCount} 則緊急` : ""}` : "所有公告已閱讀"}</span></span>}
      </button>
      <span className="sr-only" aria-live="polite">{unreadCount ? `目前有 ${unreadCount} 則未讀公告` : "目前沒有未讀公告"}</span>

      <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setSelectedId(null); }}>
        <DialogContent className="system-report-inbox-dialog max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {selectedReport ? <>
            <DialogHeader>
              <button type="button" onClick={() => setSelectedId(null)} className="mb-3 inline-flex w-fit items-center gap-1 text-xs font-bold text-cyan-200 hover:text-cyan-100"><ChevronLeft size={15} />返回公告清單</button>
              <div className="mb-2 flex flex-wrap items-center gap-2">{selectedReport.isPinned && <span className="inline-flex items-center gap-1 border border-[oklch(0.72_0.14_65)] px-2 py-0.5 text-xs text-[oklch(0.82_0.14_78)]"><Pin size={12} />置頂</span>}<span className={`inline-flex items-center gap-1 border px-2 py-0.5 text-xs ${PRIORITY_CLASSES[selectedReport.priority]}`}>{selectedReport.priority === "urgent" && <TriangleAlert size={12} />}{PRIORITY_LABELS[selectedReport.priority]}</span>{selectedReport.isRead && <span className="inline-flex items-center gap-1 border border-emerald-300/45 px-2 py-0.5 text-xs text-emerald-200"><Check size={12} />已閱讀</span>}</div>
              <DialogTitle className="text-xl leading-snug">{selectedReport.title}</DialogTitle>
              <DialogDescription>發布於 {selectedReport.publishedAt ? new Date(selectedReport.publishedAt).toLocaleString("zh-TW") : "剛剛"}</DialogDescription>
              {selectedReport.priority === "urgent" && selectedReport.mustReadBy && <div className={`mt-3 flex gap-2 border p-3 text-xs leading-5 ${new Date(selectedReport.mustReadBy) <= new Date() ? "border-rose-300/70 bg-rose-500/10 text-rose-100" : "border-amber-300/60 bg-amber-300/10 text-amber-100"}`} role="alert"><TriangleAlert size={16} className="mt-0.5 shrink-0" /><p><strong>緊急必讀截止</strong><br />請於 {new Date(selectedReport.mustReadBy).toLocaleString("zh-TW")} 前確認閱讀</p></div>}
            </DialogHeader>
            <div className="system-report-inbox-content border-y py-5 text-sm leading-7 whitespace-pre-wrap">{selectedReport.content}</div>
            {selectedImages.length > 0 && <section aria-label="公告圖片" className="grid gap-3 sm:grid-cols-2">{selectedImages.map((asset) => <a key={asset.id} href={asset.url} target="_blank" rel="noreferrer" className="system-report-inbox-asset overflow-hidden border"><img src={asset.url} alt={asset.fileName} className="aspect-video w-full object-cover" /><span className="block truncate px-3 py-2 text-xs">{asset.fileName}</span></a>)}</section>}
            {selectedAttachments.length > 0 && <section aria-label="公告附件" className="space-y-2"><p className="label-caps flex items-center gap-1.5"><Paperclip size={14} />附件</p>{selectedAttachments.map((asset) => <a key={asset.id} href={asset.url} target="_blank" rel="noreferrer" onClick={() => trackDownloadMutation.mutate({ assetId: asset.id })} className="system-report-inbox-attachment flex items-center justify-between gap-3 border px-3 py-2 text-sm"><span className="truncate">{asset.fileName}</span><Download size={15} /></a>)}</section>}
            <DialogFooter>{!selectedReport.isRead && <Button type="button" onClick={() => markReadMutation.mutate({ id: selectedReport.id })} disabled={markReadMutation.isPending}>{markReadMutation.isPending ? "確認中…" : "確認已閱讀"}</Button>}</DialogFooter>
          </> : <>
            <DialogHeader><div className="mb-2 flex items-center gap-2 text-cyan-200"><Megaphone size={20} /><span className="label-caps">ANNOUNCEMENT INBOX</span></div><DialogTitle>公告通知</DialogTitle><DialogDescription>{unreadCount ? `目前有 ${unreadCount} 則未讀公告，緊急公告會在每次登入時要求確認` : "所有目前有效的公告皆已閱讀；您仍可在此查看內容"}</DialogDescription></DialogHeader>
            {inboxQuery.error ? <div role="alert" className="system-report-inbox-error mt-4 flex items-center justify-between gap-3 border p-3 text-sm"><span>公告通知暫時無法載入</span><button type="button" onClick={() => void inboxQuery.refetch()} className="underline underline-offset-2">重試</button></div> : reports.length ? <div className="mt-4 space-y-3">{reports.map((report) => <button key={report.id} type="button" onClick={() => setSelectedId(report.id)} className={`system-report-inbox-card w-full border p-4 text-left transition-colors ${report.isRead ? "is-read" : report.priority === "urgent" ? "is-urgent" : "is-unread"}`}><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className={`inline-flex items-center gap-1 border px-2 py-0.5 text-xs ${PRIORITY_CLASSES[report.priority]}`}>{report.priority === "urgent" && <TriangleAlert size={12} />}{PRIORITY_LABELS[report.priority]}</span>{report.isPinned && <Pin size={13} className="text-amber-200" />}</div><span className={`text-xs font-semibold ${report.isRead ? "text-[oklch(0.54_0_0)]" : "text-cyan-100"}`}>{report.isRead ? "已閱讀" : "未讀"}</span></div><p className="system-report-inbox-card-title mt-3 font-bold">{report.title}</p><p className="system-report-inbox-card-description mt-1 line-clamp-2 text-xs leading-5">{report.content}</p>{report.priority === "urgent" && report.mustReadBy && <p className="mt-3 flex items-center gap-1.5 text-xs text-rose-200"><CalendarClock size={13} />必讀截止：{new Date(report.mustReadBy).toLocaleString("zh-TW")}</p>}</button>)}</div> : <div className="system-report-inbox-empty mt-5 border border-dashed p-8 text-center text-sm"><FileText className="mx-auto mb-3" size={24} />目前沒有有效公告</div>}
          </>}
        </DialogContent>
      </Dialog>
    </>
  );
}
