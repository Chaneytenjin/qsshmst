import React, { useEffect, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function formatDueAt(value: Date | string) {
  return new Date(value).toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function BorrowReturnReminderDialog() {
  const remindersQuery = trpc.borrowRecords.unreadReminders.useQuery();
  const markReadMutation = trpc.borrowRecords.markRemindersRead.useMutation();
  const [dismissed, setDismissed] = useState(false);
  const reminders = remindersQuery.data ?? [];
  const hasOverdue = reminders.some((reminder) => reminder.reminderType === "overdue");
  const open = reminders.length > 0 && !dismissed;

  useEffect(() => {
    if (reminders.length > 0) setDismissed(false);
  }, [reminders.length]);

  const acknowledge = async () => {
    if (reminders.length === 0) return;
    try {
      await markReadMutation.mutateAsync({ ids: reminders.map((reminder) => reminder.id) });
      await remindersQuery.refetch();
      setDismissed(true);
      toast.success("已確認器材歸還提醒");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "無法確認提醒，請稍後再試");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) setDismissed(true); }}>
      <DialogContent className="max-w-lg border-[oklch(0.3_0.06_35)] bg-[oklch(0.12_0_0)] text-white" data-testid="borrow-return-reminder-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            {hasOverdue ? <AlertTriangle className="text-red-400" /> : <CalendarClock className="text-amber-300" />}
            {hasOverdue ? "器材逾期歸還提醒" : "器材即將到期提醒"}
          </DialogTitle>
          <DialogDescription className="text-[oklch(0.72_0_0)]">
            請確認下列借用器材的歸還時間系統已同步寄送電子郵件提醒；若已歸還，請聯繫管理人員完成紀錄更新
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {reminders.map((reminder) => {
            const isOverdue = reminder.reminderType === "overdue";
            return <div key={reminder.id} className={`border-l-2 px-3 py-3 ${isOverdue ? "border-red-400 bg-red-500/10" : "border-amber-300 bg-amber-500/10"}`}>
              <div className="flex items-start justify-between gap-3"><p className="font-semibold text-white">{reminder.equipmentName || "未命名器材"}</p><span className={`shrink-0 text-xs font-bold ${isOverdue ? "text-red-300" : "text-amber-200"}`}>{isOverdue ? "已逾期" : "明日到期"}</span></div>
              <p className="mt-1 font-mono text-xs text-[oklch(0.72_0_0)]">應歸還：{formatDueAt(reminder.expectedReturnAt)}</p>
            </div>;
          })}
        </div>
        <DialogFooter>
          <Button type="button" onClick={acknowledge} disabled={markReadMutation.isPending} className="bg-white text-black hover:bg-gray-200">
            <CheckCircle2 className="mr-2 h-4 w-4" />{markReadMutation.isPending ? "確認中..." : "我已了解"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
