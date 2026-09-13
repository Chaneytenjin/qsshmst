import React, { useEffect, useState } from "react";
import { CheckCircle2, CircleX, ReceiptText } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function formatCreatedAt(value: Date | string) {
  return new Date(value).toLocaleString("zh-TW", { dateStyle: "medium", timeStyle: "short" });
}

export function ReimbursementNotificationDialog() {
  const [, navigate] = useLocation();
  const notificationsQuery = trpc.reimbursements.unreadNotifications.useQuery(undefined, { refetchInterval: 60_000 });
  const markReadMutation = trpc.reimbursements.markNotificationsRead.useMutation();
  const [dismissed, setDismissed] = useState(false);
  const notifications = notificationsQuery.data ?? [];
  const open = notifications.length > 0 && !dismissed;

  useEffect(() => {
    if (notifications.length > 0) setDismissed(false);
  }, [notifications.length]);

  const acknowledge = async (goToReimbursements: boolean) => {
    if (notifications.length === 0) return;
    try {
      await markReadMutation.mutateAsync({ ids: notifications.map((notification) => notification.id) });
      await notificationsQuery.refetch();
      setDismissed(true);
      if (goToReimbursements) navigate("/reimbursements");
      toast.success("已確認報帳審核通知");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "無法確認報帳通知，請稍後再試");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) setDismissed(true); }}>
      <DialogContent className="max-w-lg border-emerald-400/35 bg-[oklch(0.12_0_0)] text-white" data-testid="reimbursement-notification-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg"><ReceiptText className="text-emerald-300" />報帳審核結果通知</DialogTitle>
          <DialogDescription className="text-[oklch(0.72_0_0)]">您的報帳單已有新的審核結果詳細內容與收據附件可於報帳管理查看</DialogDescription>
        </DialogHeader>
        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {notifications.map((notification) => {
            const approved = notification.notificationType === "approved";
            return <div key={notification.id} className={`border-l-2 px-3 py-3 ${approved ? "border-emerald-400 bg-emerald-500/10" : "border-rose-400 bg-rose-500/10"}`}>
              <div className="flex items-start justify-between gap-3"><p className="font-semibold text-white">{notification.claimTitle}</p><span className={`flex shrink-0 items-center gap-1 text-xs font-bold ${approved ? "text-emerald-200" : "text-rose-200"}`}>{approved ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleX className="h-3.5 w-3.5" />}{approved ? "已核准" : "已退回"}</span></div>
              <p className="mt-1 font-mono text-xs text-[oklch(0.64_0_0)]">{notification.claimNumber} · {formatCreatedAt(notification.createdAt)}</p>
              <p className="mt-2 text-sm leading-6 text-[oklch(0.80_0_0)]">{notification.message}</p>
            </div>;
          })}
        </div>
        <DialogFooter className="gap-2 sm:gap-0"><Button type="button" variant="outline" onClick={() => void acknowledge(false)} disabled={markReadMutation.isPending}>{markReadMutation.isPending ? "確認中…" : "確認已讀"}</Button><Button type="button" onClick={() => void acknowledge(true)} disabled={markReadMutation.isPending} className="bg-emerald-300 text-emerald-950 hover:bg-emerald-200"><ReceiptText className="mr-2 h-4 w-4" />前往報帳管理</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
