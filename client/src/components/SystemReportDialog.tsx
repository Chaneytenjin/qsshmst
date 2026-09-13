import React from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarClock, Download, Megaphone, Paperclip, Pin, ShieldCheck, TriangleAlert } from "lucide-react";

const PRIORITY_LABELS = {
  normal: "一般",
  important: "重要",
  urgent: "緊急",
} as const;

const PRIORITY_BADGE_CLASSES = {
  normal: "border border-[oklch(0.28_0_0)] bg-[oklch(0.17_0_0)] text-[oklch(0.65_0_0)]",
  important: "border border-[oklch(0.72_0.14_65)] bg-[oklch(0.72_0.14_65_/_0.14)] text-[oklch(0.84_0.14_78)]",
  urgent: "border border-[oklch(0.62_0.20_25)] bg-[oklch(0.62_0.20_25_/_0.16)] text-[oklch(0.82_0.16_32)]",
} as const;

export function SystemReportDialog() {
  const utils = trpc.useUtils();
  const unreadQuery = trpc.systemReports.unread.useQuery();
  const activeReport = unreadQuery.data?.[0];
  const images = activeReport?.assets?.filter((asset) => asset.assetKind === "image") ?? [];
  const attachments = activeReport?.assets?.filter((asset) => asset.assetKind === "attachment") ?? [];
  const mustReadBy = activeReport?.priority === "urgent" ? activeReport.mustReadBy : null;
  const isMustReadOverdue = Boolean(mustReadBy && new Date(mustReadBy) <= new Date());
  const markReadMutation = trpc.systemReports.markRead.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.systemReports.unread.invalidate(), utils.systemReports.inbox.invalidate()]);
    },
  });
  const trackDownloadMutation = trpc.systemReports.trackDownload.useMutation({
    onSuccess: async () => {
      await utils.systemReports.statistics.invalidate();
    },
  });

  const acknowledge = () => {
    if (activeReport) markReadMutation.mutate({ id: activeReport.id });
  };

  return (
    <Dialog open={Boolean(activeReport)} onOpenChange={() => undefined}>
      <DialogContent className={`max-h-[85vh] overflow-y-auto sm:max-w-xl ${activeReport?.priority === "urgent" ? "border-[oklch(0.62_0.20_25)]" : activeReport?.priority === "important" ? "border-[oklch(0.72_0.14_65)]" : ""}`} onEscapeKeyDown={(event) => event.preventDefault()} onPointerDownOutside={(event) => event.preventDefault()}>
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2 text-[oklch(0.72_0.14_65)]">
            <Megaphone size={20} />
            <span className="label-caps">系統報告</span>
          </div>
          <div className="mb-1 flex flex-wrap items-center gap-2">{activeReport?.isPinned && <span className="inline-flex items-center gap-1 border border-[oklch(0.72_0.14_65)] px-2 py-0.5 text-xs text-[oklch(0.82_0.14_78)]"><Pin size={12} />置頂公告</span>}{activeReport && <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs ${PRIORITY_BADGE_CLASSES[activeReport.priority]}`}>{activeReport.priority === "urgent" && <TriangleAlert size={12} />}{PRIORITY_LABELS[activeReport.priority]}</span>}</div>
          <DialogTitle className="text-xl leading-snug">{activeReport?.title}</DialogTitle>
          <DialogDescription>
            發布於 {activeReport?.publishedAt ? new Date(activeReport.publishedAt).toLocaleString("zh-TW") : "剛剛"}
            {activeReport?.authorRealName || activeReport?.authorName || activeReport?.authorUsername ? ` · ${activeReport.authorRealName || activeReport.authorName || activeReport.authorUsername}` : ""}
          </DialogDescription>
          {activeReport?.expiresAt && <p className="mt-2 flex items-center gap-1.5 text-xs text-[oklch(0.72_0.14_65)]"><CalendarClock size={14} />有效至 {new Date(activeReport.expiresAt).toLocaleString("zh-TW")}</p>}
          {mustReadBy && <div className={`mt-3 flex gap-2 border p-3 text-xs leading-5 ${isMustReadOverdue ? "border-[oklch(0.62_0.20_25)] bg-[oklch(0.62_0.20_25_/_0.14)] text-[oklch(0.88_0.12_30)]" : "border-[oklch(0.72_0.14_65)] bg-[oklch(0.72_0.14_65_/_0.10)] text-[oklch(0.88_0.14_78)]"}`} role="alert" aria-live="assertive"><TriangleAlert size={17} className="mt-0.5 shrink-0" /><p><strong>緊急必讀提醒</strong><br />請於 {new Date(mustReadBy).toLocaleString("zh-TW")} 前確認閱讀{isMustReadOverdue ? "此必讀期限已過，請立即確認內容" : "未完成閱讀前，系統會在您每次登入後再次提醒"}</p></div>}
        </DialogHeader>

        <div className="border-y border-[oklch(0.22_0_0)] py-5 text-sm leading-7 whitespace-pre-wrap text-[oklch(0.82_0_0)]">
          {activeReport?.content}
        </div>

        {images.length > 0 && <section aria-label="報告圖片" className="grid gap-3 sm:grid-cols-2">
          {images.map((asset) => <a key={asset.id} href={asset.url} target="_blank" rel="noreferrer" className="group overflow-hidden border border-[oklch(0.24_0_0)] bg-[oklch(0.12_0_0)]">
            <img src={asset.url} alt={asset.fileName} className="aspect-video w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]" />
            <span className="block truncate px-3 py-2 text-xs text-[oklch(0.62_0_0)]">{asset.fileName}</span>
          </a>)}
        </section>}

        {attachments.length > 0 && <section aria-label="報告附件" className="space-y-2">
          <p className="label-caps flex items-center gap-1.5"><Paperclip size={14} />附件</p>
          {attachments.map((asset) => <a key={asset.id} href={asset.url} target="_blank" rel="noreferrer" onClick={() => trackDownloadMutation.mutate({ assetId: asset.id })} className="flex items-center justify-between gap-3 border border-[oklch(0.24_0_0)] px-3 py-2 text-sm text-[oklch(0.76_0_0)] transition-colors hover:border-[oklch(0.72_0.14_65)] hover:text-white">
            <span className="truncate">{asset.fileName}</span><Download size={15} className="shrink-0" />
          </a>)}
        </section>}

        <div className="flex gap-2 text-xs leading-relaxed text-[oklch(0.58_0_0)]">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[oklch(0.66_0.12_210)]" />
          <p>確認後將記錄本次閱讀狀態；若還有其他未讀系統報告，系統會先顯示緊急及置頂公告，再依發布時間繼續顯示</p>
        </div>

        <DialogFooter>
          <Button type="button" className="min-w-32" onClick={acknowledge} disabled={markReadMutation.isPending}>
            {markReadMutation.isPending ? "確認中…" : "我已閱讀"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
