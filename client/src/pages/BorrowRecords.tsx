import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { RotateCcw, Search, AlertTriangle, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const RETURN_NOTE_PREVIEW_LENGTH = 24;

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit", year: "2-digit" });
}

function isOverdue(expectedReturnAt: Date | string, status: string) {
  if (status !== "active") return false;
  return new Date(expectedReturnAt) < new Date();
}

function isOverdueReturned(expectedReturnAt: Date | string, actualReturnAt: Date | string | null | undefined, status: string) {
  if (status !== "returned" || !actualReturnAt) return false;
  return new Date(actualReturnAt) > new Date(expectedReturnAt);
}

export default function BorrowRecords() {
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState("active");
  const [search, setSearch] = useState("");
  const [returnTarget, setReturnTarget] = useState<number | null>(null);
  const [returnNote, setReturnNote] = useState("");
  const [notePreview, setNotePreview] = useState<{ equipmentName: string; note: string } | null>(null);

  const { data: records, isLoading } = trpc.borrowRecords.list.useQuery({
    status: statusFilter || undefined,
  });

  const returnMutation = trpc.borrowRecords.return.useMutation({
    onSuccess: () => {
      utils.borrowRecords.list.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success("歸還確認完成");
      setReturnTarget(null);
      setReturnNote("");
    },
    onError: (e) => toast.error(e.message),
  });

  const syncMutation = trpc.borrowRecords.syncOverdue.useMutation({
    onSuccess: () => {
      utils.borrowRecords.list.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success("逾期狀態已同步");
    },
  });

  const filtered = (records ?? []).filter((r: any) => {
    if (!search) return true;
    return (r.equipmentName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (r.borrowerName ?? "").toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="borrow-records-page animate-fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">借用記錄</h1>
          <p className="page-subtitle">BORROW RECORDS</p>
        </div>
        <button onClick={() => syncMutation.mutate()} className="btn-secondary text-xs" disabled={syncMutation.isPending}>
          <RefreshCw size={12} className="inline mr-1" />
          {syncMutation.isPending ? "同步中..." : "同步逾期狀態"}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(0.40_0_0)]" />
          <input
            className="industrial-input pl-8"
            placeholder="搜尋器材或借用人..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {[
            { value: "active", label: "借出中" },
            { value: "overdue", label: "逾期" },
            { value: "returned", label: "已歸還" },
            { value: "", label: "全部" },
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
              {opt.value === "overdue" && (
                <span className="ml-1.5 font-mono text-[oklch(0.60_0.20_15)]">
                  {(records ?? []).filter((r: any) => r.status === "overdue").length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="brutalist-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-[oklch(0.30_0_0)] border-t-white animate-spin mx-auto mb-3" />
            <p className="label-caps">載入中</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="borrow-records-empty-state empty-state">
            <RotateCcw size={32} className="mb-3 opacity-30" />
            <p className="text-white font-bold mb-1">無符合條件的記錄</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>器材</th>
                  <th>借用人</th>
                  <th>數量</th>
                  <th>借出日期</th>
                  <th>應還日期</th>
                  <th>實際歸還</th>
                  <th>備註</th>
                  <th>狀態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((rec: any) => {
                  const overdue = isOverdue(rec.expectedReturnAt, rec.status);
                  const overdueReturned = isOverdueReturned(rec.expectedReturnAt, rec.actualReturnAt, rec.status);
                  const note = typeof rec.returnNote === "string" ? rec.returnNote : "";
                  const hasNote = note.trim().length > 0;
                  const hasLongNote = note.length > RETURN_NOTE_PREVIEW_LENGTH;
                  return (
                    <tr key={rec.id}>
                      <td>
                        <p className="text-white text-sm font-medium">{rec.equipmentName}</p>
                        <p className="label-caps">#{rec.id}</p>
                      </td>
                      <td><p className="text-white text-sm">{rec.borrowerName ?? "—"}</p></td>
                      <td><span className="font-mono text-white">{rec.quantity}</span></td>
                      <td><span className="text-sm text-[oklch(0.70_0_0)]">{formatDate(rec.borrowedAt)}</span></td>
                      <td>
                        <span className={`text-sm font-medium ${overdue ? "text-[oklch(0.60_0.20_15)]" : "text-[oklch(0.70_0_0)]"}`}>
                          {formatDate(rec.expectedReturnAt)}
                          {overdue && <AlertTriangle size={11} className="inline ml-1" />}
                        </span>
                      </td>
                      <td>
                        <span className={`text-sm ${overdueReturned ? "font-medium text-[oklch(0.60_0.20_15)]" : "text-[oklch(0.55_0_0)]"}`}>
                          {rec.actualReturnAt ? formatDate(rec.actualReturnAt) : "—"}
                        </span>
                      </td>
                      <td>
                        {hasLongNote ? (
                          <button
                            type="button"
                            className="borrow-record-return-note borrow-record-return-note--preview text-sm"
                            onClick={() => setNotePreview({ equipmentName: rec.equipmentName ?? "器材", note })}
                            aria-label={`查看「${rec.equipmentName ?? "器材"}」的完整備註`}
                          >
                            {note}
                          </button>
                        ) : (
                          <span className="borrow-record-return-note text-sm">{hasNote ? note : "—"}</span>
                        )}
                      </td>
                      <td><StatusBadge status={overdueReturned ? "overdue_returned" : rec.status} /></td>
                      <td>
                        {(rec.status === "active" || rec.status === "overdue") && (
                          <button
                            onClick={() => setReturnTarget(rec.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold tracking-wider uppercase border border-[oklch(0.30_0_0)] text-[oklch(0.55_0_0)] hover:border-[oklch(0.70_0.14_145)] hover:text-[oklch(0.70_0.14_145)] transition-all"
                          >
                            <RotateCcw size={11} />確認歸還
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Return Confirm Dialog */}
      <Dialog open={returnTarget !== null} onOpenChange={(o) => { if (!o) { setReturnTarget(null); setReturnNote(""); } }}>
        <DialogContent className="bg-[oklch(0.12_0_0)] border border-[oklch(0.22_0_0)] rounded-none max-w-sm text-white">
          <DialogHeader>
            <DialogTitle className="text-white font-bold">確認器材歸還</DialogTitle>
          </DialogHeader>
          <div className="mt-3 space-y-4">
            <p className="text-[oklch(0.65_0_0)] text-sm">確認後將記錄實際歸還時間並恢復器材可借數量</p>
            <div>
              <label className="label-caps mb-1.5 block">歸還備註</label>
              <textarea
                className="industrial-input resize-none"
                rows={2}
                value={returnNote}
                onChange={(e) => setReturnNote(e.target.value)}
                placeholder="選填，例：器材狀況良好"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => returnTarget !== null && returnMutation.mutate({ id: returnTarget, returnNote: returnNote || undefined })}
                className="btn-primary flex-1"
                disabled={returnMutation.isPending}
              >
                {returnMutation.isPending ? "處理中..." : "確認歸還"}
              </button>
              <button onClick={() => { setReturnTarget(null); setReturnNote(""); }} className="btn-secondary">取消</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={notePreview !== null} onOpenChange={(open) => { if (!open) setNotePreview(null); }}>
        <DialogContent className="borrow-record-note-dialog bg-[oklch(0.12_0_0)] border border-[oklch(0.22_0_0)] rounded-none max-w-md text-white">
          <DialogHeader>
            <DialogTitle className="text-white font-bold">備註</DialogTitle>
            <DialogDescription className="borrow-record-note-dialog-description">{notePreview?.equipmentName ?? "器材"}的完整歸還備註</DialogDescription>
          </DialogHeader>
          <div className="mt-3 space-y-4">
            <p className="borrow-record-note-dialog-content whitespace-pre-wrap break-words text-sm">
              {notePreview?.note}
            </p>
            <button type="button" onClick={() => setNotePreview(null)} className="btn-secondary" aria-label="關閉備註彈窗">關閉</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
