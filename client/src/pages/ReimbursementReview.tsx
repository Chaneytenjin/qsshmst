import React, { useMemo, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { exportReimbursementToPdf, printReimbursement } from "@/lib/reimbursementPdf";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, CircleDollarSign, Download, FileText, Printer, ShieldCheck } from "lucide-react";

type ClaimStatus = "draft" | "submitted" | "approved" | "rejected" | "paid";

const STATUS_META: Record<ClaimStatus, { label: string; className: string }> = {
  draft: { label: "草稿", className: "border-slate-500/40 bg-slate-500/10 text-slate-300" },
  submitted: { label: "待審核", className: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
  approved: { label: "已核准", className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
  rejected: { label: "已退回", className: "border-rose-500/40 bg-rose-500/10 text-rose-300" },
  paid: { label: "已付款", className: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300" },
};

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("zh-TW", { style: "currency", currency: "TWD", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("zh-TW", { dateStyle: "medium", timeStyle: "short" });
}

function StatusBadge({ status }: { status: ClaimStatus }) {
  const meta = STATUS_META[status];
  return <Badge variant="outline" data-status={status} className={`reimbursement-status-badge ${meta.className}`}>{meta.label}</Badge>;
}

export default function ReimbursementReview() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const isAdmin = user?.role === "admin";
  const [selectedClaimId, setSelectedClaimId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const claimsQuery = trpc.reimbursements.list.useQuery();
  const reviewClaim = trpc.reimbursements.review.useMutation();
  const markPaid = trpc.reimbursements.markPaid.useMutation();
  const directPublishAndPay = trpc.reimbursements.directPublishAndPay.useMutation();
  const recordPdfExport = trpc.reimbursements.recordPdfExport.useMutation();
  const claims = claimsQuery.data ?? [];
  const selectedClaim = useMemo(() => claims.find((claim) => claim.id === selectedClaimId) ?? null, [claims, selectedClaimId]);

  const invalidateClaims = async () => {
    await Promise.all([utils.reimbursements.list.invalidate(), utils.reimbursements.myList.invalidate()]);
  };

  const runReview = async (decision: "approved" | "rejected") => {
    if (!selectedClaim || !reviewNote.trim()) {
      toast.error("請填寫審核說明後再送出");
      return;
    }
    try {
      await reviewClaim.mutateAsync({ id: selectedClaim.id, decision, reviewNote: reviewNote.trim() });
      await invalidateClaims();
      setReviewOpen(false);
      setReviewNote("");
      toast.success(decision === "approved" ? "報帳單已核准" : "報帳單已退回申請人");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "審核操作失敗，請稍後再試");
    }
  };

  const runMarkPaid = async (id: number) => {
    try {
      await markPaid.mutateAsync({ id });
      await invalidateClaims();
      toast.success("已標記為付款完成");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "付款標記失敗，請稍後再試");
    }
  };

  const runDirectPublishAndPay = async (id: number) => {
    try {
      await directPublishAndPay.mutateAsync({ id });
      await invalidateClaims();
      toast.success("已直接發布並標記付款完成");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "直接發布付款失敗，請稍後再試");
    }
  };

  const runDocumentOutput = async (claim: typeof claims[number], mode: "download" | "print") => {
    if (claim.status !== "approved" && claim.status !== "paid") return;
    try {
      await recordPdfExport.mutateAsync({ id: claim.id, mode });
      const operator = user?.realName || user?.name || user?.username || "系統使用者";
      if (mode === "download") {
        await exportReimbursementToPdf(claim, operator);
        toast.success("報帳單 PDF 已開始下載");
      } else {
        printReimbursement(claim, operator);
        toast.success("已開啟報帳單列印版面");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "無法輸出報帳單，請稍後再試");
    }
  };

  return (
    <div className="reimbursements-page reimbursement-review-page container space-y-8 py-8">
      <section className="reimbursements-hero rounded-2xl border border-white/10 bg-[linear-gradient(135deg,oklch(0.16_0.025_250),oklch(0.11_0_0))] p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-3 flex items-center gap-2 text-cyan-300"><ShieldCheck className="h-5 w-5" /><span className="label-caps">Reimbursement review</span></div><h1 className="reimbursements-title text-3xl font-semibold tracking-tight text-white">報帳審核</h1><p className="reimbursements-hero-description mt-2 max-w-2xl text-sm leading-6 text-[oklch(0.70_0_0)]">審核非本人送交的報帳單，所有決定與付款標記均保留於系統操作日誌</p></div><Link href="/reimbursements" className="reimbursement-return-link" aria-label="返回報帳管理"><ArrowLeft className="h-4 w-4" />返回報帳管理</Link></div>
      </section>

      <section className="reimbursements-review-section space-y-4" aria-label="報帳審核清單">
        <div><h2 className="reimbursements-section-title text-xl font-semibold text-white">待辦與審核紀錄</h2><p className="reimbursements-section-description mt-1 text-sm text-[oklch(0.62_0_0)]">教師可核准或退回非本人提出的已送審報帳，管理員可執行付款相關作業</p></div>
        {claimsQuery.isLoading ? <div className="h-52 animate-pulse rounded-xl bg-white/5" /> : claims.length ? <div className="grid gap-4 xl:grid-cols-2">{claims.map((claim) => <Card key={claim.id} className="reimbursement-claim-card border-white/10 bg-[oklch(0.13_0_0)] shadow-none"><CardHeader className="gap-3 pb-3"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="label-caps text-[10px]">{claim.claimNumber}</p><CardTitle className="reimbursement-claim-title mt-1 text-base text-white">{claim.title}</CardTitle><CardDescription className="reimbursement-claim-description mt-1 text-xs">建立於 {formatDate(claim.createdAt)}</CardDescription></div><div className="text-right"><StatusBadge status={claim.status as ClaimStatus} /><p className="reimbursement-claim-amount mt-2 font-mono text-lg font-semibold text-white">{formatCurrency(claim.totalAmount)}</p></div></div><p className="reimbursement-claim-requester text-xs text-[oklch(0.64_0_0)]">申請人：{claim.requesterRealName || claim.requesterName || claim.requesterUsername || `帳號 #${claim.requesterId}`}</p></CardHeader><CardContent className="space-y-3"><p className="reimbursement-claim-purpose line-clamp-2 text-sm text-[oklch(0.74_0_0)]">{claim.purpose || "未填寫用途說明"}</p><div className="reimbursement-claim-meta flex flex-wrap gap-x-4 gap-y-1 text-xs text-[oklch(0.60_0_0)]"><span>{claim.items.length} 筆支出明細</span><span>{claim.receipts.length} 份收據</span>{claim.submittedAt && <span>送審：{formatDate(claim.submittedAt)}</span>}</div><div className="flex flex-wrap gap-2 pt-1"><Button variant="outline" size="sm" className="reimbursement-action-button reimbursement-detail-button" onClick={() => { setSelectedClaimId(claim.id); setDetailOpen(true); }}><FileText className="mr-1.5 h-3.5 w-3.5" />查看明細</Button>{(claim.status === "approved" || claim.status === "paid") && <><Button variant="outline" size="sm" className="reimbursement-action-button" onClick={() => void runDocumentOutput(claim, "download")} disabled={recordPdfExport.isPending}><Download className="mr-1.5 h-3.5 w-3.5" />匯出 PDF</Button><Button variant="outline" size="sm" className="reimbursement-action-button" onClick={() => void runDocumentOutput(claim, "print")} disabled={recordPdfExport.isPending}><Printer className="mr-1.5 h-3.5 w-3.5" />列印</Button></>}{claim.status === "submitted" && claim.requesterId !== user?.id && <Button size="sm" variant="outline" className="reimbursement-action-button" onClick={() => { setSelectedClaimId(claim.id); setReviewNote(""); setReviewOpen(true); }}><ShieldCheck className="mr-1.5 h-3.5 w-3.5" />審核</Button>}{isAdmin && (claim.status === "draft" || claim.status === "submitted") && <Button size="sm" onClick={() => void runDirectPublishAndPay(claim.id)} disabled={directPublishAndPay.isPending}><CircleDollarSign className="mr-1.5 h-3.5 w-3.5" />直接發布並付款</Button>}{isAdmin && claim.status === "approved" && <Button size="sm" variant="outline" className="reimbursement-action-button" onClick={() => void runMarkPaid(claim.id)} disabled={markPaid.isPending}><CircleDollarSign className="mr-1.5 h-3.5 w-3.5" />標記付款</Button>}</div></CardContent></Card>)}</div> : <Card className="reimbursement-empty-state border-dashed border-white/15 bg-transparent"><CardContent className="py-10 text-center text-sm text-[oklch(0.62_0_0)]">目前沒有可審核的報帳單</CardContent></Card>}
      </section>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}><DialogContent className="reimbursement-detail-dialog max-h-[90vh] max-w-5xl overflow-y-auto border-white/15 bg-[oklch(0.12_0_0)] text-white">{selectedClaim && <><DialogHeader><div className="flex flex-wrap items-center gap-2"><DialogTitle>{selectedClaim.title}</DialogTitle><StatusBadge status={selectedClaim.status as ClaimStatus} /></div><DialogDescription>{selectedClaim.claimNumber} · {formatCurrency(selectedClaim.totalAmount)}</DialogDescription></DialogHeader><div className="space-y-5 py-2">{selectedClaim.purpose && <p className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-[oklch(0.75_0_0)]">{selectedClaim.purpose}</p>}<div><h3 className="mb-2 text-sm font-semibold text-white">支出明細</h3><div className="overflow-x-auto rounded-lg border border-white/10"><table className="w-full text-left text-sm"><thead className="bg-white/[0.04] text-xs text-[oklch(0.62_0_0)]"><tr><th className="px-3 py-2">日期</th><th className="px-3 py-2">類別</th><th className="px-3 py-2">內容</th><th className="px-3 py-2 text-right">金額</th></tr></thead><tbody>{selectedClaim.items.map((item) => <tr key={item.id} className="border-t border-white/10"><td className="px-3 py-2">{new Date(item.expenseDate).toLocaleDateString("zh-TW")}</td><td className="px-3 py-2">{item.category}</td><td className="px-3 py-2"><p>{item.description}</p>{item.merchant && <p className="mt-0.5 text-xs text-[oklch(0.60_0_0)]">{item.merchant}</p>}</td><td className="px-3 py-2 text-right font-mono">{formatCurrency(item.amount)}</td></tr>)}</tbody></table></div></div><Separator className="bg-white/10" /><div><h3 className="mb-2 text-sm font-semibold text-white">收據附件</h3>{selectedClaim.receipts.length ? <div className="space-y-2">{selectedClaim.receipts.map((receipt) => <div key={receipt.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 p-3"><a href={receipt.url} target="_blank" rel="noreferrer" className="min-w-0 truncate text-sm text-cyan-300 hover:text-cyan-200">{receipt.fileName}</a></div>)}</div> : <p className="text-sm text-[oklch(0.60_0_0)]">尚未附加收據</p>}</div>{selectedClaim.reviewNote && <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3"><p className="text-xs font-medium text-amber-200">審核說明</p><p className="mt-1 text-sm text-[oklch(0.78_0_0)]">{selectedClaim.reviewNote}</p></div>}</div></>}</DialogContent></Dialog>
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}><DialogContent className="border-white/15 bg-[oklch(0.12_0_0)] text-white"><DialogHeader><DialogTitle>審核報帳單</DialogTitle><DialogDescription>{selectedClaim?.claimNumber} · {selectedClaim && formatCurrency(selectedClaim.totalAmount)}審核說明會提供給申請人並寫入操作日誌</DialogDescription></DialogHeader><div className="space-y-2 py-2"><label htmlFor="reimbursement-review-note" className="text-sm font-medium">審核說明</label><Textarea id="reimbursement-review-note" value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="例如：收據與活動預算核對無誤" /></div><DialogFooter className="gap-2 sm:gap-0"><Button variant="outline" onClick={() => void runReview("rejected")} disabled={reviewClaim.isPending}>退回</Button><Button onClick={() => void runReview("approved")} disabled={reviewClaim.isPending}><CheckCircle2 className="mr-2 h-4 w-4" />核准</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
