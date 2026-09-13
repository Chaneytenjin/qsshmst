import { trpc } from "@/lib/trpc";
import { AlertTriangle, BellRing, CheckCircle2, Clock3, MailX, RefreshCw, RotateCw, Send } from "lucide-react";
import { formatAuditActor } from "@/lib/utils";
import { toast } from "sonner";

function formatDate(value: Date | string | null | undefined) {
  return value ? new Date(value).toLocaleString("zh-TW", { dateStyle: "medium", timeStyle: "short" }) : "—";
}

export default function ReminderHistory() {
  const utils = trpc.useUtils();
  const history = trpc.borrowRecords.reminderHistory.useQuery({ limit: 150 });
  const resend = trpc.borrowRecords.resendReminder.useMutation({
    onSuccess: () => {
      void utils.borrowRecords.reminderHistory.invalidate();
      toast.success("提醒已重送，寄送結果已更新至歷程");
    },
    onError: (error) => toast.error(error.message || "提醒重送失敗，請稍後再試"),
  });

  const entries = history.data ?? [];
  return <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:px-8" aria-labelledby="reminder-history-title">
    <section className="border border-cyan-300/25 bg-[oklch(0.13_0.01_225)] p-5 shadow-[0_18px_54px_oklch(0.05_0_0/0.35)] sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="label-caps text-cyan-200">REMINDER DELIVERY · MANAGEMENT CONSOLE</p><h1 id="reminder-history-title" className="mt-2 flex items-center gap-3 text-2xl font-black text-white sm:text-3xl"><BellRing className="text-cyan-200" size={28} />提醒歷程管理</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[oklch(0.73_0.03_225)]">查看到期與逾期歸還提醒的站內與電子郵件寄送結果管理員可針對尚未歸還、具有效電子郵件的紀錄一鍵重送</p></div><button type="button" onClick={() => void history.refetch()} disabled={history.isFetching} className="inline-flex items-center justify-center gap-2 border border-cyan-200/60 bg-cyan-200/10 px-4 py-2.5 text-sm font-bold text-cyan-50 hover:bg-cyan-200/20 disabled:opacity-60"><RefreshCw size={16} className={history.isFetching ? "animate-spin" : ""} />重新載入</button></div>
    </section>

    {history.error ? <section role="alert" className="mt-6 flex items-center justify-between gap-4 border border-rose-300/55 bg-rose-950/30 p-5 text-rose-100"><span className="flex items-center gap-2"><AlertTriangle size={20} />提醒歷程載入失敗：{history.error.message}</span><button type="button" className="border border-rose-200/60 px-3 py-2 text-sm font-bold" onClick={() => void history.refetch()}>重試</button></section> : null}
    {history.isLoading ? <div className="mt-6 space-y-3" aria-label="載入提醒歷程中">{[1, 2, 3, 4].map((key) => <div key={key} className="h-20 animate-pulse bg-[oklch(0.16_0.01_225)]" />)}</div> : <section className="mt-6 overflow-x-auto border border-cyan-300/20 bg-[oklch(0.14_0.01_225)]"><table className="w-full min-w-[68rem] text-left text-sm"><thead className="border-b border-white/10 text-xs uppercase tracking-wider text-[oklch(0.62_0.03_225)]"><tr><th className="px-4 py-3">建立時間</th><th className="px-4 py-3">器材／借用人</th><th className="px-4 py-3">類型</th><th className="px-4 py-3">應歸還</th><th className="px-4 py-3">郵件狀態</th><th className="px-4 py-3">最近重送</th><th className="px-4 py-3 text-right">操作</th></tr></thead><tbody>{entries.length ? entries.map((entry: any) => { const label = entry.borrowerName || entry.borrowerUsername || `使用者 #${entry.borrowerId}`; const resendActor = entry.resentByName || entry.resentByUsername ? formatAuditActor({ name: entry.resentByName, username: entry.resentByUsername }) : "管理員"; const canResend = entry.borrowStatus !== "returned" && Boolean(entry.borrowerEmail); return <tr key={entry.id} className="border-b border-white/5 text-[oklch(0.86_0.02_225)]"><td className="px-4 py-4 text-xs text-[oklch(0.68_0.03_225)]">{formatDate(entry.createdAt)}</td><td className="px-4 py-4"><p className="font-semibold text-white">{entry.equipmentName || "未命名器材"}</p><p className="mt-1 text-xs text-[oklch(0.66_0.03_225)]">{label}{entry.borrowerEmail ? ` · ${entry.borrowerEmail}` : " · 未設定電子郵件"}</p></td><td className="px-4 py-4"><span className={entry.reminderType === "overdue" ? "font-bold text-rose-200" : "font-bold text-amber-200"}>{entry.reminderType === "overdue" ? "逾期提醒" : "明日到期"}</span><p className="mt-1 text-xs text-[oklch(0.6_0.03_225)]">借用狀態：{entry.borrowStatus === "returned" ? "已歸還" : entry.borrowStatus === "overdue" ? "逾期" : "進行中"}</p></td><td className="px-4 py-4 text-xs">{formatDate(entry.expectedReturnAt)}</td><td className="px-4 py-4">{entry.emailStatus === "sent" ? <span className="inline-flex items-center gap-1 text-emerald-200"><CheckCircle2 size={15} />已寄送</span> : entry.emailStatus === "failed" ? <span className="inline-flex items-center gap-1 text-rose-200"><MailX size={15} />失敗</span> : <span className="inline-flex items-center gap-1 text-amber-200"><Clock3 size={15} />{entry.emailStatus === "skipped" ? "略過" : "待寄送"}</span>}{entry.emailError ? <p className="mt-1 max-w-48 truncate text-xs text-rose-200" title={entry.emailError}>{entry.emailError}</p> : null}</td><td className="px-4 py-4 text-xs text-[oklch(0.68_0.03_225)]">{entry.resendCount ? <><p>{entry.resendCount} 次</p><p className="mt-1">{formatDate(entry.lastResentAt)}</p><p>{resendActor}</p></> : "尚未重送"}</td><td className="px-4 py-4 text-right"><button type="button" className="inline-flex items-center gap-1 border border-cyan-200/50 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-200/10 disabled:cursor-not-allowed disabled:opacity-45" disabled={!canResend || resend.isPending} title={canResend ? "重新寄送此筆提醒郵件" : entry.borrowStatus === "returned" ? "器材已歸還，無須重送" : "借用人尚未設定電子郵件"} onClick={() => resend.mutate({ id: entry.id })}><Send size={13} />{resend.isPending ? "重送中..." : "一鍵重送"}</button></td></tr>; }) : <tr><td colSpan={7} className="px-4 py-14 text-center text-[oklch(0.67_0.03_225)]"><RotateCw className="mx-auto mb-3 opacity-60" size={24} />目前沒有提醒寄送歷程</td></tr>}</tbody></table></section>}
  </main>;
}
