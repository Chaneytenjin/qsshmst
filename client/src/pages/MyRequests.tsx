import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { ClipboardList, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "wouter";

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit", year: "2-digit" });
}

export default function MyRequests() {
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState("");
  const [cancelTarget, setCancelTarget] = useState<number | null>(null);

  const { data: requests, isLoading } = trpc.borrowRequests.myList.useQuery({
    status: statusFilter || undefined,
  });

  const cancelMutation = trpc.borrowRequests.cancel.useMutation({
    onSuccess: () => {
      utils.borrowRequests.myList.invalidate();
      toast.success("申請已取消");
      setCancelTarget(null);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="animate-fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">我的申請</h1>
          <p className="page-subtitle">MY BORROW REQUESTS</p>
        </div>
        <Link href="/browse">
          <a className="btn-primary text-xs">+ 申請借用</a>
        </Link>
      </div>

      {/* Status Filter */}
      <div className="flex gap-1 mb-6 flex-wrap">
        {[
          { value: "", label: "全部" },
          { value: "pending", label: "待審核" },
          { value: "approved", label: "已核准" },
          { value: "rejected", label: "已拒絕" },
          { value: "cancelled", label: "已取消" },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`px-3 py-2 text-xs font-semibold tracking-widest uppercase border transition-all ${
              statusFilter === opt.value
                ? "bg-white text-black border-white"
                : "bg-transparent text-[oklch(0.55_0_0)] border-[oklch(0.25_0_0)] hover:border-[oklch(0.45_0_0)] hover:text-white"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="brutalist-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-[oklch(0.30_0_0)] border-t-white animate-spin mx-auto mb-3" />
            <p className="label-caps">載入中</p>
          </div>
        ) : !requests || requests.length === 0 ? (
          <div className="empty-state">
            <ClipboardList size={32} className="mb-3 opacity-30" />
            <p className="text-white font-bold mb-2">尚無借用申請</p>
            <Link href="/browse">
              <a className="btn-primary text-xs">前往瀏覽器材</a>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>器材</th>
                  <th>數量</th>
                  <th>借用期間</th>
                  <th>用途</th>
                  <th>狀態</th>
                  <th>審核備註</th>
                  <th>申請時間</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req: any) => (
                  <tr key={req.id}>
                    <td>
                      <p className="text-white text-sm font-medium">{req.equipmentName}</p>
                      <p className="label-caps">#{req.id}</p>
                    </td>
                    <td><span className="font-mono text-white">{req.quantity}</span></td>
                    <td>
                      <p className="text-sm text-[oklch(0.75_0_0)]">{formatDate(req.borrowDate)}</p>
                      <p className="label-caps">至 {formatDate(req.returnDate)}</p>
                    </td>
                    <td>
                      <span className="text-xs text-[oklch(0.55_0_0)] max-w-28 truncate block">
                        {req.purpose ?? "—"}
                      </span>
                    </td>
                    <td><StatusBadge status={req.status} /></td>
                    <td>
                      <span className="text-xs text-[oklch(0.45_0_0)] max-w-28 truncate block">
                        {req.reviewNote ?? "—"}
                      </span>
                    </td>
                    <td><span className="label-caps">{formatDate(req.createdAt)}</span></td>
                    <td>
                      {req.status === "pending" && (
                        <button
                          onClick={() => setCancelTarget(req.id)}
                          className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold tracking-wider uppercase border border-[oklch(0.25_0_0)] text-[oklch(0.45_0_0)] hover:border-[oklch(0.60_0.20_15)] hover:text-[oklch(0.60_0.20_15)] transition-all"
                        >
                          <X size={11} />取消
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancel Confirm Dialog */}
      <Dialog open={cancelTarget !== null} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <DialogContent className="bg-[oklch(0.12_0_0)] border border-[oklch(0.22_0_0)] rounded-none max-w-sm text-white">
          <DialogHeader>
            <DialogTitle className="text-white font-bold">確認取消申請</DialogTitle>
          </DialogHeader>
          <p className="text-[oklch(0.65_0_0)] text-sm mt-2">確定要取消此借用申請嗎？此操作無法復原</p>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => cancelTarget !== null && cancelMutation.mutate({ id: cancelTarget })}
              className="btn-danger flex-1"
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "取消中..." : "確認取消"}
            </button>
            <button onClick={() => setCancelTarget(null)} className="btn-secondary">返回</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
