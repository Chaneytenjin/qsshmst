import { useState } from "react";
import React from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { CheckCircle, XCircle, Search, PencilLine, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit", year: "numeric" });
}

function formatDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
}

function daysBetween(a: Date | string, b: Date | string) {
  const diff = new Date(b).getTime() - new Date(a).getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function toDateInput(value: Date | string) {
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const parts = Object.fromEntries(dateParts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function toTaipeiDateBoundary(value: string, boundary: "start" | "end") {
  return new Date(`${value}T${boundary === "start" ? "00:00" : "23:59"}:00+08:00`);
}

type FounderUpdateSnapshot = {
  quantity: number | null;
  borrowDate: Date | string | null;
  returnDate: Date | string | null;
  purpose: string | null;
};

function hasFounderUpdateSnapshot(snapshot: FounderUpdateSnapshot | null | undefined) {
  return Boolean(snapshot && (snapshot.quantity !== null || snapshot.borrowDate || snapshot.returnDate || snapshot.purpose !== null));
}

function getFounderEditQuantityLimit(request: any) {
  const availableQuantity = Number(request?.equipmentAvailableQuantity ?? 0);
  const existingApprovedQuantity = request?.status === "approved" ? Number(request?.quantity ?? 0) : 0;
  return Math.max(0, Math.floor(Number.isFinite(availableQuantity) ? availableQuantity : 0) + Math.max(0, Math.floor(Number.isFinite(existingApprovedQuantity) ? existingApprovedQuantity : 0)));
}

const emptyFounderEditValidationErrors = {
  quantity: false,
  borrowDate: false,
  returnDate: false,
  purpose: false,
  reason: false,
};

export default function BorrowRequests() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [reviewTarget, setReviewTarget] = useState<{ id: number; action: "approved" | "rejected" } | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [isRejectReasonValidationVisible, setIsRejectReasonValidationVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editDraft, setEditDraft] = useState({ quantity: "1", borrowDate: "", returnDate: "", purpose: "", reason: "" });
  const [founderEditValidationErrors, setFounderEditValidationErrors] = useState(emptyFounderEditValidationErrors);
  const [expandedFounderUpdateId, setExpandedFounderUpdateId] = useState<number | null>(null);
  const [contentPreview, setContentPreview] = useState<{ label: "用途" | "備註"; equipmentName: string; content: string | null | undefined } | null>(null);
  const founderEditQuantityLimit = getFounderEditQuantityLimit(editTarget);

  const { data: requests, isLoading } = trpc.borrowRequests.list.useQuery({
    status: statusFilter || undefined,
  });

  const reviewMutation = trpc.borrowRequests.review.useMutation({
    onSuccess: () => {
      utils.borrowRequests.list.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success(reviewTarget?.action === "approved" ? "申請已核准" : "申請已拒絕");
      setReviewTarget(null);
      setReviewNote("");
    },
    onError: (e) => toast.error(e.message),
  });

  const founderUpdateMutation = trpc.borrowRequests.founderUpdate.useMutation({
    onSuccess: (result) => {
      utils.borrowRequests.list.invalidate();
      toast.success(result.synchronizedBorrowRecord ? "申請已更新，並同步目前借用記錄" : "申請資料已更新");
      setEditTarget(null);
      setFounderEditValidationErrors(emptyFounderEditValidationErrors);
    },
    onError: (error) => toast.error(error.message),
  });

  const filtered = (requests ?? []).filter((r: any) => {
    if (!search) return true;
    return (r.equipmentName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (r.requesterName ?? "").toLowerCase().includes(search.toLowerCase());
  });

  const handleReview = () => {
    if (!reviewTarget) return;
    if (reviewTarget.action === "rejected" && !reviewNote.trim()) {
      setIsRejectReasonValidationVisible(true);
      return;
    }
    reviewMutation.mutate({ id: reviewTarget.id, status: reviewTarget.action, reviewNote: reviewNote.trim() || undefined });
  };

  const openFounderEdit = (request: any) => {
    const quantityLimit = getFounderEditQuantityLimit(request);
    setEditTarget(request);
    setEditDraft({
      quantity: quantityLimit >= Number(request.quantity) ? String(request.quantity) : "",
      borrowDate: toDateInput(request.borrowDate),
      returnDate: toDateInput(request.returnDate),
      purpose: request.purpose ?? "",
      reason: "",
    });
    setFounderEditValidationErrors(emptyFounderEditValidationErrors);
  };

  const submitFounderEdit = () => {
    if (!editTarget) return;
    const validationErrors = {
      quantity: !editDraft.quantity || Number(editDraft.quantity) < 1 || Number(editDraft.quantity) > founderEditQuantityLimit,
      borrowDate: !editDraft.borrowDate,
      returnDate: !editDraft.returnDate || (Boolean(editDraft.borrowDate) && editDraft.returnDate < editDraft.borrowDate),
      purpose: !editDraft.purpose.trim(),
      reason: false,
    };
    setFounderEditValidationErrors(validationErrors);
    if (Object.values(validationErrors).some(Boolean)) return;
    founderUpdateMutation.mutate({
      id: editTarget.id,
      quantity: Number(editDraft.quantity),
      borrowDate: toTaipeiDateBoundary(editDraft.borrowDate, "start"),
      returnDate: toTaipeiDateBoundary(editDraft.returnDate, "end"),
      purpose: editDraft.purpose.trim(),
      reason: editDraft.reason.trim() || undefined,
    });
  };

  return (
    <div className="borrow-requests-page animate-fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">借用申請審核</h1>
          <p className="page-subtitle">BORROW REQUEST REVIEW</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(0.40_0_0)]" />
          <input
            className="industrial-input pl-8"
            placeholder="搜尋器材或申請人..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {[
            { value: "pending", label: "待審核" },
            { value: "approved", label: "已核准" },
            { value: "rejected", label: "已拒絕" },
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
              {opt.value === "pending" && (
                <span className="ml-1.5 font-mono">
                  {(requests ?? []).filter((r: any) => r.status === "pending").length}
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
          <div className="borrow-requests-empty-state empty-state">
            <CheckCircle size={32} className="mb-3 opacity-30" />
            <p className="text-white font-bold mb-1">
              {statusFilter === "pending" ? "目前無待審核申請" : "無符合條件的申請"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>器材</th>
                  <th>申請人</th>
                  <th>數量</th>
                  <th>借用期間</th>
                  <th>天數</th>
                  <th>用途</th>
                  <th>備註</th>
                  <th>最近伺服管調整</th>
                  <th>狀態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((req: any) => {
                  const isFounderUpdateExpanded = expandedFounderUpdateId === req.id;
                  const hasDetail = hasFounderUpdateSnapshot(req.founderUpdateBefore) || hasFounderUpdateSnapshot(req.founderUpdateAfter);
                  return (
                  <React.Fragment key={req.id}>
                  <tr>
                    <td>
                      <p className="text-white text-sm font-medium">{req.equipmentName}</p>
                      <p className="label-caps">#{req.id}</p>
                    </td>
                    <td>
                      <p className="text-white text-sm">{req.requesterName ?? "—"}</p>
                    </td>
                    <td><span className="font-mono text-white">{req.quantity}</span></td>
                    <td>
                      <p className="borrow-request-period-date text-sm text-[oklch(0.75_0_0)]">{formatDate(req.borrowDate)}</p>
                      <p className="borrow-request-period-end label-caps">至 {formatDate(req.returnDate)}</p>
                    </td>
                    <td>
                      <span className="font-mono text-white text-sm">
                        {daysBetween(req.borrowDate, req.returnDate)} 天
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="borrow-request-content-trigger text-sm"
                        onClick={() => setContentPreview({ label: "用途", equipmentName: req.equipmentName ?? "器材", content: req.purpose })}
                        aria-label={`查看「${req.equipmentName ?? "器材"}」的完整用途`}
                      >
                        查看用途
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="borrow-request-content-trigger borrow-request-review-note text-sm"
                        onClick={() => setContentPreview({ label: "備註", equipmentName: req.equipmentName ?? "器材", content: req.reviewNote })}
                        aria-label={`查看「${req.equipmentName ?? "器材"}」的完整備註`}
                      >
                        查看備註
                      </button>
                    </td>
                    <td>
                      {req.founderLastUpdatedAt ? (
                        <button
                          type="button"
                          onClick={() => setExpandedFounderUpdateId((current) => current === req.id ? null : req.id)}
                          className="max-w-40 text-left outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.72_0.14_210)]"
                          title="點擊查看完整修改前後差異"
                          aria-expanded={expandedFounderUpdateId === req.id}
                          aria-controls={`founder-update-diff-${req.id}`}
                        >
                          <span className="flex items-center gap-1 text-xs text-[oklch(0.73_0.11_210)] font-mono"><span>{formatDateTime(req.founderLastUpdatedAt)}</span>{expandedFounderUpdateId === req.id ? <ChevronUp size={13} aria-hidden="true" /> : <ChevronDown size={13} aria-hidden="true" />}</span>
                          <span className="mt-0.5 block text-xs text-[oklch(0.54_0_0)] truncate">{req.founderUpdateReason ?? "未填寫原因"}</span>
                          <span className="mt-1 block text-[10px] uppercase tracking-wider text-[oklch(0.48_0_0)]">查看完整差異</span>
                        </button>
                      ) : <span className="text-xs text-[oklch(0.36_0_0)]">—</span>}
                    </td>
                    <td><StatusBadge status={req.status} /></td>
                    <td>
                      {req.status === "pending" && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => { setReviewTarget({ id: req.id, action: "approved" }); setReviewNote(""); setIsRejectReasonValidationVisible(false); }}
                            className="borrow-request-action p-1.5 text-[oklch(0.45_0_0)] hover:text-[oklch(0.70_0.14_145)] transition-colors"
                            title="核准"
                            aria-label={`核准申請 #${req.id}`}
                          >
                            <CheckCircle size={14} />
                          </button>
                          <button
                            onClick={() => { setReviewTarget({ id: req.id, action: "rejected" }); setReviewNote(""); setIsRejectReasonValidationVisible(false); }}
                            className="borrow-request-action p-1.5 text-[oklch(0.45_0_0)] hover:text-[oklch(0.60_0.20_15)] transition-colors"
                            title="拒絕"
                            aria-label={`拒絕申請 #${req.id}`}
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                      )}
                      {user?.isFounder && (
                        <button
                          type="button"
                          onClick={() => openFounderEdit(req)}
                          className="borrow-request-action ml-1 p-1.5 text-[oklch(0.66_0.12_210)] hover:text-white transition-colors"
                          title="伺服器管理員修改申請"
                          aria-label={`修改申請 #${req.id}`}
                        >
                          <PencilLine size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                  {isFounderUpdateExpanded && (
                    <tr id={`founder-update-diff-${req.id}`} className="bg-[oklch(0.14_0.02_210)]">
                      <td colSpan={10} className="p-0">
                        <div className="border-y border-[oklch(0.30_0.08_210)] px-5 py-4">
                          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                            <div><p className="flex items-center gap-2 text-sm font-bold text-[oklch(0.84_0.10_210)]"><ShieldCheck size={16} />創始管理員修改完整差異</p><p className="mt-1 text-xs text-[oklch(0.62_0_0)]">修改時間：{formatDateTime(req.founderLastUpdatedAt)} · 原因：{req.founderUpdateReason ?? "未填寫原因"}</p></div>
                            {!hasDetail && <span className="text-xs text-amber-200">此舊紀錄未保存完整前後快照</span>}
                          </div>
                          {hasDetail && <div className="grid gap-4 lg:grid-cols-2">
                            <div className="border border-[oklch(0.38_0.08_20)] bg-[oklch(0.16_0.02_20)] p-4"><p className="label-caps text-[oklch(0.76_0.10_20)]">修改前</p><dl className="mt-3 grid gap-2 text-sm"><div className="flex justify-between gap-3"><dt className="text-[oklch(0.58_0_0)]">數量</dt><dd className="font-mono text-white">{req.founderUpdateBefore?.quantity ?? "—"}</dd></div><div className="flex justify-between gap-3"><dt className="text-[oklch(0.58_0_0)]">借用時間</dt><dd className="text-right text-white">{formatDateTime(req.founderUpdateBefore?.borrowDate)}</dd></div><div className="flex justify-between gap-3"><dt className="text-[oklch(0.58_0_0)]">歸還時間</dt><dd className="text-right text-white">{formatDateTime(req.founderUpdateBefore?.returnDate)}</dd></div><div><dt className="text-[oklch(0.58_0_0)]">用途</dt><dd className="mt-1 whitespace-pre-wrap text-white">{req.founderUpdateBefore?.purpose || "未填寫"}</dd></div></dl></div>
                            <div className="border border-[oklch(0.34_0.11_145)] bg-[oklch(0.16_0.03_145)] p-4"><p className="label-caps text-[oklch(0.76_0.13_145)]">修改後</p><dl className="mt-3 grid gap-2 text-sm"><div className="flex justify-between gap-3"><dt className="text-[oklch(0.58_0_0)]">數量</dt><dd className="font-mono text-white">{req.founderUpdateAfter?.quantity ?? "—"}</dd></div><div className="flex justify-between gap-3"><dt className="text-[oklch(0.58_0_0)]">借用時間</dt><dd className="text-right text-white">{formatDateTime(req.founderUpdateAfter?.borrowDate)}</dd></div><div className="flex justify-between gap-3"><dt className="text-[oklch(0.58_0_0)]">歸還時間</dt><dd className="text-right text-white">{formatDateTime(req.founderUpdateAfter?.returnDate)}</dd></div><div><dt className="text-[oklch(0.58_0_0)]">用途</dt><dd className="mt-1 whitespace-pre-wrap text-white">{req.founderUpdateAfter?.purpose || "未填寫"}</dd></div></dl></div>
                          </div>}
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Confirm Dialog */}
      <Dialog open={reviewTarget !== null} onOpenChange={(o) => { if (!o) { setReviewTarget(null); setReviewNote(""); setIsRejectReasonValidationVisible(false); } }}>
        <DialogContent className="bg-[oklch(0.12_0_0)] border border-[oklch(0.22_0_0)] rounded-none max-w-sm text-white">
          <DialogHeader>
            <DialogTitle className="text-white font-bold">
              {reviewTarget?.action === "approved" ? "確認核准申請" : "確認拒絕申請"}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-3 space-y-4">
            {reviewTarget?.action === "rejected" ? <p className="text-[oklch(0.65_0_0)] text-sm">請填寫拒絕原因 <span className="text-red-400" aria-hidden="true">*</span></p> : null}
            <div>
              <label className="label-caps mb-1.5 block" htmlFor="borrow-request-review-note">{reviewTarget?.action === "rejected" ? "拒絕原因 *" : "備註"}</label>
              <textarea
                id="borrow-request-review-note"
                className={`industrial-input resize-none ${isRejectReasonValidationVisible ? "border-red-500 focus-visible:ring-red-400" : ""}`}
                rows={3}
                value={reviewNote}
                onChange={(e) => { setReviewNote(e.target.value); if (e.target.value.trim()) setIsRejectReasonValidationVisible(false); }}
                placeholder={reviewTarget?.action === "rejected" ? "請填寫拒絕原因" : "選填備註..."}
                required={reviewTarget?.action === "rejected"}
                aria-invalid={isRejectReasonValidationVisible}
                aria-describedby={isRejectReasonValidationVisible ? "borrow-request-rejection-reason-error" : undefined}
              />
              {isRejectReasonValidationVisible && <p id="borrow-request-rejection-reason-error" role="alert" className="mt-1.5 text-xs font-medium text-red-400">請填寫拒絕原因</p>}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleReview}
                className={reviewTarget?.action === "approved" ? "btn-primary flex-1" : "btn-danger flex-1"}
                disabled={reviewMutation.isPending}
              >
                {reviewMutation.isPending ? "處理中..." : reviewTarget?.action === "approved" ? "確認核准" : "確認拒絕"}
              </button>
              <button onClick={() => { setReviewTarget(null); setReviewNote(""); setIsRejectReasonValidationVisible(false); }} className="btn-secondary">取消</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editTarget !== null} onOpenChange={(open) => { if (!open) { setEditTarget(null); setFounderEditValidationErrors(emptyFounderEditValidationErrors); } }}>
        <DialogContent className="founder-borrow-update-dialog bg-[oklch(0.12_0_0)] border border-[oklch(0.36_0.10_210)] rounded-none max-w-lg text-white" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white font-bold"><ShieldCheck className="text-[oklch(0.72_0.14_210)]" size={18} />伺服器管理員修改申請</DialogTitle>
          </DialogHeader>
          <form className="mt-3 space-y-4" noValidate onSubmit={(event) => { event.preventDefault(); submitFounderEdit(); }}>
            <p className="founder-update-notice text-xs leading-relaxed text-[oklch(0.82_0.07_210)]">此操作只修改申請資料，不變更申請人、器材或審核狀態；若申請已核准且借用仍進行中，系統會同步調整借用記錄與可借數量</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><label htmlFor="founder-edit-quantity" className="label-caps mb-1.5 block">申請數量 <span aria-hidden="true">*</span></label><select id="founder-edit-quantity" className={`industrial-input ${founderEditValidationErrors.quantity ? "border-red-500 focus-visible:ring-red-400" : ""}`} value={editDraft.quantity} onChange={(event) => { setEditDraft((current) => ({ ...current, quantity: event.target.value })); setFounderEditValidationErrors((current) => ({ ...current, quantity: false })); }} required aria-invalid={founderEditValidationErrors.quantity} aria-describedby={founderEditValidationErrors.quantity ? "founder-edit-quantity-error" : undefined}><option value="" disabled>請選擇申請數量</option>{Array.from({ length: founderEditQuantityLimit }, (_, index) => index + 1).map((quantity) => <option key={quantity} value={quantity}>{quantity}</option>)}</select>{founderEditValidationErrors.quantity && <p id="founder-edit-quantity-error" role="alert" className="mt-1.5 text-xs font-medium text-red-400">請選擇申請數量</p>}</div>
              <div><label className="label-caps mb-1.5 block">目前狀態</label><div className="industrial-input flex items-center bg-[oklch(0.16_0_0)]"><StatusBadge status={editTarget?.status ?? "pending"} /></div></div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><label htmlFor="founder-edit-borrow-date" className="label-caps mb-1.5 block">借用日 <span aria-hidden="true">*</span></label><input id="founder-edit-borrow-date" type="date" className={`industrial-input ${founderEditValidationErrors.borrowDate ? "border-red-500 focus-visible:ring-red-400" : ""}`} value={editDraft.borrowDate} onChange={(event) => { setEditDraft((current) => ({ ...current, borrowDate: event.target.value })); setFounderEditValidationErrors((current) => ({ ...current, borrowDate: false })); }} required aria-invalid={founderEditValidationErrors.borrowDate} aria-describedby={founderEditValidationErrors.borrowDate ? "founder-edit-borrow-date-error" : undefined} />{founderEditValidationErrors.borrowDate && <p id="founder-edit-borrow-date-error" role="alert" className="mt-1.5 text-xs font-medium text-red-400">請填寫借用日</p>}</div>
              <div><label htmlFor="founder-edit-return-date" className="label-caps mb-1.5 block">歸還日 <span aria-hidden="true">*</span></label><input id="founder-edit-return-date" type="date" className={`industrial-input ${founderEditValidationErrors.returnDate ? "border-red-500 focus-visible:ring-red-400" : ""}`} value={editDraft.returnDate} onChange={(event) => { setEditDraft((current) => ({ ...current, returnDate: event.target.value })); setFounderEditValidationErrors((current) => ({ ...current, returnDate: false })); }} required aria-invalid={founderEditValidationErrors.returnDate} aria-describedby={founderEditValidationErrors.returnDate ? "founder-edit-return-date-error" : undefined} />{founderEditValidationErrors.returnDate && <p id="founder-edit-return-date-error" role="alert" className="mt-1.5 text-xs font-medium text-red-400">{editDraft.borrowDate && editDraft.returnDate && editDraft.returnDate < editDraft.borrowDate ? "歸還日不可早於借用日" : "請填寫歸還日"}</p>}</div>
            </div>
            <div><label htmlFor="founder-edit-purpose" className="label-caps mb-1.5 block">用途 <span aria-hidden="true">*</span></label><textarea id="founder-edit-purpose" className={`industrial-input resize-none ${founderEditValidationErrors.purpose ? "border-red-500 focus-visible:ring-red-400" : ""}`} rows={3} value={editDraft.purpose} onChange={(event) => { setEditDraft((current) => ({ ...current, purpose: event.target.value })); setFounderEditValidationErrors((current) => ({ ...current, purpose: false })); }} placeholder="輸入文字說明" required aria-invalid={founderEditValidationErrors.purpose} aria-describedby={founderEditValidationErrors.purpose ? "founder-edit-purpose-error" : undefined} />{founderEditValidationErrors.purpose && <p id="founder-edit-purpose-error" role="alert" className="mt-1.5 text-xs font-medium text-red-400">請填寫用途</p>}</div>
            <div><label htmlFor="founder-edit-reason" className="label-caps mb-1.5 block">修改說明</label><textarea id="founder-edit-reason" className="industrial-input resize-none" rows={2} maxLength={300} value={editDraft.reason} onChange={(event) => setEditDraft((current) => ({ ...current, reason: event.target.value }))} placeholder="選填，請留下本次手動調整原因" /></div>
            <div className="flex gap-3"><button type="submit" className="btn-primary flex-1" disabled={founderUpdateMutation.isPending}>{founderUpdateMutation.isPending ? "更新中..." : "儲存修改"}</button><button type="button" className="btn-secondary" onClick={() => { setEditTarget(null); setFounderEditValidationErrors(emptyFounderEditValidationErrors); }}>取消</button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={contentPreview !== null} onOpenChange={(open) => { if (!open) setContentPreview(null); }}>
        <DialogContent className="borrow-request-content-dialog bg-[oklch(0.12_0_0)] border border-[oklch(0.22_0_0)] rounded-none max-w-md text-white">
          <DialogHeader>
            <DialogTitle className="text-white font-bold">{contentPreview?.label ?? "內容"}</DialogTitle>
            <DialogDescription className="borrow-request-content-dialog-description">
              {contentPreview?.equipmentName ?? "器材"}的完整{contentPreview?.label ?? "內容"}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 space-y-4">
            <p className="borrow-request-content-dialog-body whitespace-pre-wrap break-words text-sm">
              {contentPreview?.content?.trim() || `未填寫${contentPreview?.label ?? "內容"}`}
            </p>
            <button type="button" className="btn-secondary" onClick={() => setContentPreview(null)} aria-label="關閉內容彈窗">關閉</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
