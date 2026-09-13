import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Ban, Download, FileCheck2, Loader2, ShieldCheck, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const sourceLabels = { email_attachment: "郵件附件", preview: "PDF 預覽", manual_download: "手動匯出" } as const;
const statusLabels = { valid: "有效", revoked: "已撤銷", expired: "已失效" } as const;

function formatDate(value: Date | string | null) {
  return value ? new Date(value).toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false }) : "—";
}

function openDownload(url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export default function ActivationCertificateExports() {
  const utils = trpc.useUtils();
  const [target, setTarget] = useState<{ id: number; number: string } | null>(null);
  const [status, setStatus] = useState<"revoked" | "expired">("revoked");
  const [reason, setReason] = useState("");
  const exportsQuery = trpc.activationCertificates.listExports.useQuery();
  const downloadMutation = trpc.activationCertificates.getDownload.useMutation({
    onSuccess: (result) => {
      openDownload(result.downloadUrl);
      void utils.activationCertificates.listExports.invalidate();
      toast.success(`已開啟 ${result.fileName}`);
    },
    onError: (error) => toast.error(error.message || "無法取得啟用書 PDF"),
  });
  const changeStatusMutation = trpc.activationCertificates.changeStatus.useMutation({
    onSuccess: async () => {
      await utils.activationCertificates.listExports.invalidate();
      toast.success(status === "revoked" ? "文件已撤銷" : "文件已標示為失效");
      setTarget(null);
      setReason("");
    },
    onError: (error) => toast.error(error.message || "無法變更文件狀態"),
  });

  const openChangeStatus = (record: { id: number; certificateNumber: string }) => {
    setTarget({ id: record.id, number: record.certificateNumber });
    setStatus("revoked");
    setReason("");
  };

  const confirmChangeStatus = () => {
    if (!target || reason.trim().length < 3) {
      toast.error("請填寫至少 3 個字的撤銷或失效原因");
      return;
    }
    changeStatusMutation.mutate({ id: target.id, status, reason: reason.trim() });
  };

  return <div className="space-y-6">
    <div>
      <p className="label-caps">DOCUMENT AUDIT</p>
      <h1 className="mt-2 text-2xl font-bold text-white">啟用書 PDF 匯出紀錄</h1>
      <p className="mt-2 text-sm text-slate-400">顯示由伺服器實際產生的啟用書檔案、來源、下載狀態與公開驗證效力下載連結僅於管理員請求時短暫產生</p>
    </div>
    <section className="border border-[oklch(0.24_0_0)] bg-[oklch(0.13_0_0)]">
      <div className="flex items-center justify-between border-b border-[oklch(0.22_0_0)] px-5 py-4"><div className="flex items-center gap-2"><FileCheck2 size={17} className="text-sky-300" /><h2 className="font-semibold">文件列表</h2></div><span className="label-caps">{exportsQuery.data?.length ?? 0} 筆</span></div>
      {exportsQuery.isLoading ? <div className="flex items-center gap-2 p-6 text-sm text-slate-400"><Loader2 size={16} className="animate-spin" />載入紀錄中…</div> : exportsQuery.isError ? <p className="p-6 text-sm text-red-200">無法載入文件紀錄，請稍後再試</p> : exportsQuery.data?.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1120px] text-left text-sm"><thead className="border-b border-[oklch(0.22_0_0)] text-xs text-slate-400"><tr><th className="px-5 py-3 font-medium">啟用書編號</th><th className="px-5 py-3 font-medium">產生來源</th><th className="px-5 py-3 font-medium">產生時間</th><th className="px-5 py-3 font-medium">文件效力</th><th className="px-5 py-3 font-medium">下載狀態</th><th className="px-5 py-3 font-medium">最後下載</th><th className="px-5 py-3 text-right font-medium">操作</th></tr></thead><tbody>{exportsQuery.data.map((record) => <tr key={record.id} className="border-b border-[oklch(0.18_0_0)] last:border-0"><td className="px-5 py-4 font-mono text-xs text-sky-200">{record.certificateNumber}</td><td className="px-5 py-4 text-slate-300">{sourceLabels[record.source]}</td><td className="px-5 py-4 text-slate-400">{formatDate(record.createdAt)}</td><td className="px-5 py-4"><div><span className={record.status === "valid" ? "inline-flex items-center gap-1 text-emerald-300" : "inline-flex items-center gap-1 text-red-300"}>{record.status === "valid" ? <ShieldCheck size={14} /> : <TriangleAlert size={14} />}{statusLabels[record.status]}</span>{record.statusReason && <p className="mt-1 max-w-48 truncate text-xs text-slate-500" title={record.statusReason}>原因：{record.statusReason}</p>}</div></td><td className="px-5 py-4"><span className={record.downloadCount > 0 ? "text-emerald-300" : "text-slate-500"}>{record.downloadCount > 0 ? `已下載 ${record.downloadCount} 次` : "尚未下載"}</span></td><td className="px-5 py-4 text-slate-400">{formatDate(record.lastDownloadedAt)}</td><td className="px-5 py-4 text-right"><div className="flex justify-end gap-2"><button type="button" className="btn-secondary text-xs" disabled={downloadMutation.isPending} onClick={() => downloadMutation.mutate({ id: record.id })}><Download size={13} className="mr-1 inline" />下載 PDF</button>{record.status === "valid" && <button type="button" className="inline-flex items-center border border-red-300/40 px-2.5 py-1.5 text-xs font-semibold text-red-200 transition-colors hover:bg-red-500/15" onClick={() => openChangeStatus(record)}><Ban size={13} className="mr-1" />撤銷／失效</button>}</div></td></tr>)}</tbody></table></div> : <p className="p-8 text-center text-sm text-slate-500">尚無伺服器產生的啟用書 PDF 紀錄</p>}
    </section>
    <Dialog open={Boolean(target)} onOpenChange={(open) => { if (!open && !changeStatusMutation.isPending) setTarget(null); }}>
      <DialogContent className="border border-red-300/35 bg-[oklch(0.15_0.01_25)] text-white sm:max-w-lg">
        <DialogHeader><DialogTitle>變更文件效力</DialogTitle><DialogDescription className="text-slate-300">此操作會立即影響公開 QR Code 與文件編號驗證結果，且無法恢復為有效狀態</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2"><p className="font-mono text-sm text-sky-200">{target?.number}</p><label className="block text-sm font-medium">處理方式<select value={status} onChange={(event) => setStatus(event.target.value as "revoked" | "expired")} className="industrial-input mt-2 w-full"><option value="revoked">撤銷文件</option><option value="expired">標示為失效</option></select></label><label className="block text-sm font-medium">{status === "revoked" ? "撤銷原因" : "失效原因"}<textarea value={reason} onChange={(event) => setReason(event.target.value)} className="industrial-input mt-2 min-h-28 w-full resize-y" placeholder="請具體說明原因；此原因會顯示在公開驗證結果" maxLength={1000} /></label></div>
        <DialogFooter><button type="button" className="btn-secondary" disabled={changeStatusMutation.isPending} onClick={() => setTarget(null)}>取消</button><button type="button" className="inline-flex items-center bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-400 disabled:opacity-50" disabled={changeStatusMutation.isPending || reason.trim().length < 3} onClick={confirmChangeStatus}>{changeStatusMutation.isPending ? <Loader2 size={15} className="mr-1 animate-spin" /> : <Ban size={15} className="mr-1" />}{status === "revoked" ? "確認撤銷" : "確認標示失效"}</button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
