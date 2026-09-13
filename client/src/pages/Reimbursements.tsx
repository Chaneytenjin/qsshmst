import React, { useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { exportReimbursementToPdf, printReimbursement } from "@/lib/reimbursementPdf";
import { toast } from "sonner";
import { CheckCircle2, CircleDollarSign, Download, FilePlus2, FileText, ImagePlus, Plus, Printer, ReceiptText, Send, Trash2, Upload, WalletCards } from "lucide-react";

type ExpenseItemDraft = {
  expenseDate: string;
  category: string;
  merchant: string;
  description: string;
  amount: string;
};

type ClaimStatus = "draft" | "submitted" | "approved" | "rejected" | "paid";

const STATUS_META: Record<ClaimStatus, { label: string; className: string }> = {
  draft: { label: "草稿", className: "border-slate-500/40 bg-slate-500/10 text-slate-300" },
  submitted: { label: "待審核", className: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
  approved: { label: "已核准", className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
  rejected: { label: "已退回", className: "border-rose-500/40 bg-rose-500/10 text-rose-300" },
  paid: { label: "已付款", className: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300" },
};

const EXPENSE_CATEGORIES = ["交通", "餐費", "耗材", "器材維護", "活動支出", "印刷", "其他"];

function newItem(): ExpenseItemDraft {
  return { expenseDate: new Date().toISOString().slice(0, 10), category: "耗材", merchant: "", description: "", amount: "" };
}

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("zh-TW", { style: "currency", currency: "TWD", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("zh-TW", { dateStyle: "medium", timeStyle: "short" });
}

function toDateAtTaipeiMidnight(value: string) {
  return new Date(`${value}T00:00:00+08:00`);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("無法讀取收據檔案"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function StatusBadge({ status }: { status: ClaimStatus }) {
  const meta = STATUS_META[status];
  return <Badge variant="outline" data-status={status} className={`reimbursement-status-badge ${meta.className}`}>{meta.label}</Badge>;
}

export default function Reimbursements() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const isStaff = user?.role === "admin" || user?.role === "teacher";
  const isAdmin = user?.role === "admin";
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedClaimId, setSelectedClaimId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [items, setItems] = useState<ExpenseItemDraft[]>([newItem()]);
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const myClaimsQuery = trpc.reimbursements.myList.useQuery();
  const createClaim = trpc.reimbursements.create.useMutation();
  const uploadReceipt = trpc.reimbursements.uploadReceipt.useMutation();
  const removeReceipt = trpc.reimbursements.removeReceipt.useMutation();
  const submitClaim = trpc.reimbursements.submit.useMutation();
  const markPaid = trpc.reimbursements.markPaid.useMutation();
  const directPublishAndPay = trpc.reimbursements.directPublishAndPay.useMutation();
  const recordPdfExport = trpc.reimbursements.recordPdfExport.useMutation();

  const allClaims = myClaimsQuery.data ?? [];
  const selectedClaim = useMemo(() => allClaims.find((claim) => claim.id === selectedClaimId) ?? null, [allClaims, selectedClaimId]);
  const estimatedTotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const invalidateClaims = async () => {
    await Promise.all([utils.reimbursements.myList.invalidate(), utils.reimbursements.list.invalidate()]);
  };

  const resetCreateForm = () => {
    setTitle("");
    setPurpose("");
    setItems([newItem()]);
    setReceiptFiles([]);
  };

  const updateItem = (index: number, field: keyof ExpenseItemDraft, value: string) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  };

  const addReceipts = (files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files);
    const invalid = incoming.find((file) => !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type) || file.size > 8 * 1024 * 1024);
    if (invalid) {
      toast.error("收據僅支援 8 MB 以下的 JPG、PNG、WebP 或 PDF 檔案");
      return;
    }
    setReceiptFiles((current) => [...current, ...incoming].slice(0, 10));
    if (receiptInputRef.current) receiptInputRef.current.value = "";
  };

  const handleCreate = async () => {
    const normalizedItems = items.map((item) => ({ ...item, amount: Number(item.amount) }));
    if (!title.trim() || normalizedItems.some((item) => !item.description.trim() || !item.expenseDate || !Number.isFinite(item.amount) || item.amount <= 0)) {
      toast.error("請完成報帳名稱與每一筆日期、說明及有效金額");
      return;
    }
    try {
      const pendingReceipts = [...receiptFiles];
      const created = await createClaim.mutateAsync({
        title: title.trim(),
        purpose: purpose.trim() || undefined,
        items: normalizedItems.map((item) => ({ expenseDate: toDateAtTaipeiMidnight(item.expenseDate), category: item.category, merchant: item.merchant.trim() || undefined, description: item.description.trim(), amount: item.amount })),
      });
      await invalidateClaims().catch((error) => console.error("報帳草稿建立後清單重新整理失敗", error));
      setCreateOpen(false);
      resetCreateForm();
      toast.success(`已建立草稿 ${created.claimNumber}`);
      if (!pendingReceipts.length) return;

      const failedReceipts: string[] = [];
      for (const file of pendingReceipts) {
        try {
          const base64 = await readFileAsDataUrl(file);
          await uploadReceipt.mutateAsync({ claimId: created.id, fileName: file.name, mimeType: file.type, base64 });
        } catch (error) {
          console.error(`收據附件上傳失敗：${file.name}`, error);
          failedReceipts.push(file.name);
        }
      }
      await invalidateClaims().catch((error) => console.error("收據上傳後清單重新整理失敗", error));
      if (failedReceipts.length) {
        toast.warning(`草稿已建立，但 ${failedReceipts.length} 份收據未成功附加；請從草稿明細重新上傳`);
      } else {
        toast.success(`草稿 ${created.claimNumber} 的 ${pendingReceipts.length} 份收據已附加`);
      }
    } catch (error) {
      console.error("建立報帳草稿失敗", error);
      toast.error(error instanceof Error ? error.message : "建立報帳草稿失敗，請稍後再試");
    }
  };

  const runSubmit = async (id: number) => {
    try {
      await submitClaim.mutateAsync({ id });
      await invalidateClaims();
      toast.success("報帳單已送交審核");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "送審失敗，請稍後再試");
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

  const runRemoveReceipt = async (id: number) => {
    try {
      await removeReceipt.mutateAsync({ id });
      await invalidateClaims();
      toast.success("已移除收據附件");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "移除收據失敗，請稍後再試");
    }
  };

  const getOperatorName = () => user?.realName || user?.name || user?.username || "系統使用者";

  const runDocumentOutput = async (claim: typeof allClaims[number], mode: "download" | "print") => {
    if (claim.status !== "approved" && claim.status !== "paid") return;
    try {
      await recordPdfExport.mutateAsync({ id: claim.id, mode });
      if (mode === "download") {
        await exportReimbursementToPdf(claim, getOperatorName());
        toast.success("報帳單 PDF 已開始下載");
      } else {
        printReimbursement(claim, getOperatorName());
        toast.success("已開啟報帳單列印版面");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "無法輸出報帳單，請稍後再試");
    }
  };

  const renderClaimCard = (claim: typeof allClaims[number], showRequester: boolean) => (
    <Card key={claim.id} className="reimbursement-claim-card border-white/10 bg-[oklch(0.13_0_0)] shadow-none">
      <CardHeader className="gap-3 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="label-caps text-[10px]">{claim.claimNumber}</p>
            <CardTitle className="reimbursement-claim-title mt-1 text-base text-white">{claim.title}</CardTitle>
            <CardDescription className="reimbursement-claim-description mt-1 text-xs">建立於 {formatDate(claim.createdAt)}</CardDescription>
          </div>
          <div className="text-right">
            <StatusBadge status={claim.status as ClaimStatus} />
            <p className="reimbursement-claim-amount mt-2 font-mono text-lg font-semibold text-white">{formatCurrency(claim.totalAmount)}</p>
          </div>
        </div>
        {showRequester && <p className="reimbursement-claim-requester text-xs text-[oklch(0.64_0_0)]">申請人：{claim.requesterRealName || claim.requesterName || claim.requesterUsername || `帳號 #${claim.requesterId}`}</p>}
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="reimbursement-claim-purpose line-clamp-2 text-sm text-[oklch(0.74_0_0)]">{claim.purpose || "未填寫用途說明"}</p>
        <div className="reimbursement-claim-meta flex flex-wrap gap-x-4 gap-y-1 text-xs text-[oklch(0.60_0_0)]">
          <span>{claim.items.length} 筆支出明細</span>
          <span>{claim.receipts.length} 份收據</span>
          {claim.submittedAt && <span>送審：{formatDate(claim.submittedAt)}</span>}
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="outline" size="sm" className="reimbursement-action-button reimbursement-detail-button" onClick={() => { setSelectedClaimId(claim.id); setDetailOpen(true); }}>
            <FileText className="mr-1.5 h-3.5 w-3.5" />查看明細
          </Button>
          {(claim.status === "approved" || claim.status === "paid") && <>
            <Button variant="outline" size="sm" className="reimbursement-action-button" onClick={() => void runDocumentOutput(claim, "download")} disabled={recordPdfExport.isPending}>
              <Download className="mr-1.5 h-3.5 w-3.5" />匯出 PDF
            </Button>
            <Button variant="outline" size="sm" className="reimbursement-action-button" onClick={() => void runDocumentOutput(claim, "print")} disabled={recordPdfExport.isPending}>
              <Printer className="mr-1.5 h-3.5 w-3.5" />列印
            </Button>
          </>}
          {claim.status === "draft" && claim.requesterId === user?.id && <Button size="sm" onClick={() => runSubmit(claim.id)} disabled={submitClaim.isPending}><Send className="mr-1.5 h-3.5 w-3.5" />送審</Button>}
          {isAdmin && (claim.status === "draft" || claim.status === "submitted") && <Button size="sm" onClick={() => runDirectPublishAndPay(claim.id)} disabled={directPublishAndPay.isPending}><CircleDollarSign className="mr-1.5 h-3.5 w-3.5" />直接發布並付款</Button>}
          {isAdmin && claim.status === "approved" && <Button size="sm" variant="outline" className="reimbursement-action-button" onClick={() => runMarkPaid(claim.id)} disabled={markPaid.isPending}><CircleDollarSign className="mr-1.5 h-3.5 w-3.5" />標記付款</Button>}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="reimbursements-page container py-8 space-y-8">
      <section className="reimbursements-hero rounded-2xl border border-white/10 bg-[linear-gradient(135deg,oklch(0.16_0.025_250),oklch(0.11_0_0))] p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-cyan-300"><WalletCards className="h-5 w-5" /><span className="label-caps">Reimbursement</span></div>
            <h1 className="reimbursements-title text-3xl font-semibold tracking-tight text-white">報帳管理</h1>
            <p className="reimbursements-hero-description mt-2 max-w-2xl text-sm leading-6 text-[oklch(0.70_0_0)]">建立支出明細、附上收據並送交審核；每個狀態變更均保留於系統操作日誌</p>
          </div>
          <div className="flex flex-wrap gap-2">{isStaff && <Link href="/reimbursement-review" className="reimbursements-review-link"><CheckCircle2 className="h-4 w-4" />報帳審核</Link>}<Button size="lg" className="reimbursements-create-button" onClick={() => setCreateOpen(true)}><FilePlus2 className="mr-2 h-4 w-4" />新增報帳</Button></div>
        </div>
      </section>

      <section className="reimbursements-my-claims-section space-y-4">
        <div className="flex items-end justify-between gap-4"><div><h2 className="reimbursements-section-title text-xl font-semibold text-white">我的報帳</h2><p className="reimbursements-section-description mt-1 text-sm text-[oklch(0.62_0_0)]">草稿可附加或移除收據，確認後送交教師或管理員審核</p></div></div>
        {myClaimsQuery.isLoading ? <div className="grid gap-4 md:grid-cols-2"><div className="h-52 animate-pulse rounded-xl bg-white/5" /><div className="h-52 animate-pulse rounded-xl bg-white/5" /></div> : (myClaimsQuery.data?.length ? <div className="grid gap-4 xl:grid-cols-2">{myClaimsQuery.data.map((claim) => renderClaimCard(claim, false))}</div> : <Card className="reimbursement-empty-state border-dashed border-white/15 bg-transparent"><CardContent className="flex flex-col items-center py-12 text-center"><ReceiptText className="mb-3 h-8 w-8 text-cyan-300" /><p className="font-medium text-white">尚未建立任何報帳單</p><p className="mt-1 text-sm text-[oklch(0.62_0_0)]">從「新增報帳」開始建立草稿與支出明細</p></CardContent></Card>) }
      </section>

      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetCreateForm(); }}>
        <DialogContent className="reimbursement-create-dialog flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-5xl flex-col gap-0 overflow-hidden border-white/15 bg-[oklch(0.12_0_0)] p-0 text-white">
          <DialogHeader className="reimbursement-create-dialog-header shrink-0 border-b border-white/10 px-5 py-5 sm:px-7"><DialogTitle>建立報帳草稿</DialogTitle><DialogDescription className="reimbursement-create-dialog-description">先建立草稿與收據附件，再由您手動送審；金額以新臺幣計算</DialogDescription></DialogHeader>
          <div className="reimbursement-create-dialog-scroll min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
            <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="claim-title">報帳名稱</Label><Input id="claim-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：校慶活動耗材" /></div><div className="space-y-2"><Label>預估總額</Label><div className="reimbursement-create-total flex h-10 items-center rounded-md border border-white/10 bg-white/5 px-3 font-mono text-sm text-cyan-200">{formatCurrency(estimatedTotal)}</div></div></div>
            <div className="space-y-2"><Label htmlFor="claim-purpose">用途說明</Label><Textarea id="claim-purpose" value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder="說明本次支出與活動或器材管理的關聯" /></div>
            <div className="space-y-3"><div className="flex items-center justify-between"><Label>支出明細</Label><Button type="button" size="sm" variant="outline" className="reimbursement-create-outline-button" onClick={() => setItems((current) => [...current, newItem()])}><Plus className="mr-1.5 h-3.5 w-3.5" />新增明細</Button></div>{items.map((item, index) => <div key={`${index}-${item.expenseDate}`} className="reimbursement-create-item rounded-lg border border-white/10 bg-white/[0.03] p-3"><div className="grid gap-3 md:grid-cols-[130px_130px_1fr_1fr_120px_auto]"><Input type="date" value={item.expenseDate} onChange={(event) => updateItem(index, "expenseDate", event.target.value)} /><Select value={item.category} onValueChange={(value) => updateItem(index, "category", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{EXPENSE_CATEGORIES.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select><Input value={item.merchant} onChange={(event) => updateItem(index, "merchant", event.target.value)} placeholder="店家（選填）" /><Input value={item.description} onChange={(event) => updateItem(index, "description", event.target.value)} placeholder="支出內容" /><Input type="number" min="0" step="1" value={item.amount} onChange={(event) => updateItem(index, "amount", event.target.value)} placeholder="金額" />{items.length > 1 ? <Button type="button" variant="ghost" size="icon" className="reimbursement-create-remove-button" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="移除此筆明細"><Trash2 className="h-4 w-4 text-rose-300" /></Button> : <div />}</div></div>)}</div>
            <div className="space-y-3"><div className="flex items-center justify-between"><Label>收據附件</Label><Button type="button" size="sm" variant="outline" className="reimbursement-create-outline-button" onClick={() => receiptInputRef.current?.click()}><ImagePlus className="mr-1.5 h-3.5 w-3.5" />選擇檔案</Button><input ref={receiptInputRef} className="hidden" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => addReceipts(event.target.files)} /></div><p className="reimbursement-create-helper text-xs text-[oklch(0.60_0_0)]">支援 JPG、PNG、WebP、PDF；每個檔案最多 8 MB附件會在草稿建立後寫入受管理儲存</p>{receiptFiles.length > 0 && <div className="space-y-2">{receiptFiles.map((file, index) => <div key={`${file.name}-${index}`} className="reimbursement-create-file flex items-center justify-between gap-3 rounded-md border border-white/10 px-3 py-2 text-sm"><span className="min-w-0 truncate">{file.name}</span><Button type="button" variant="ghost" size="icon" className="reimbursement-create-remove-button" onClick={() => setReceiptFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} aria-label={`移除 ${file.name}`}><Trash2 className="h-4 w-4 text-rose-300" /></Button></div>)}</div>}</div>
            </div>
          </div>
          <DialogFooter className="reimbursement-create-dialog-footer shrink-0 border-t border-white/10 px-5 py-4 sm:px-7"><Button variant="outline" className="reimbursement-create-outline-button" onClick={() => setCreateOpen(false)}>取消</Button><Button type="button" className="reimbursement-create-save-button" onClick={() => void handleCreate()} disabled={createClaim.isPending || uploadReceipt.isPending}>{createClaim.isPending || uploadReceipt.isPending ? <><Upload className="mr-2 h-4 w-4 animate-pulse" />建立中…</> : "儲存草稿"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="reimbursement-detail-dialog max-h-[90vh] max-w-5xl overflow-y-auto border-white/15 bg-[oklch(0.12_0_0)] text-white">
          {selectedClaim && <><DialogHeader><div className="flex flex-wrap items-center gap-2"><DialogTitle>{selectedClaim.title}</DialogTitle><StatusBadge status={selectedClaim.status as ClaimStatus} /></div><DialogDescription>{selectedClaim.claimNumber} · {formatCurrency(selectedClaim.totalAmount)}</DialogDescription></DialogHeader><div className="space-y-5 py-2">{(selectedClaim.status === "approved" || selectedClaim.status === "paid") && <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => void runDocumentOutput(selectedClaim, "download")} disabled={recordPdfExport.isPending}><Download className="mr-1.5 h-3.5 w-3.5" />匯出 PDF</Button><Button variant="outline" size="sm" onClick={() => void runDocumentOutput(selectedClaim, "print")} disabled={recordPdfExport.isPending}><Printer className="mr-1.5 h-3.5 w-3.5" />列印</Button></div>}{selectedClaim.purpose && <p className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-[oklch(0.75_0_0)]">{selectedClaim.purpose}</p>}<div><h3 className="mb-2 text-sm font-semibold text-white">支出明細</h3><div className="overflow-x-auto rounded-lg border border-white/10"><table className="w-full text-left text-sm"><thead className="bg-white/[0.04] text-xs text-[oklch(0.62_0_0)]"><tr><th className="px-3 py-2">日期</th><th className="px-3 py-2">類別</th><th className="px-3 py-2">內容</th><th className="px-3 py-2 text-right">金額</th></tr></thead><tbody>{selectedClaim.items.map((item) => <tr key={item.id} className="border-t border-white/10"><td className="px-3 py-2">{new Date(item.expenseDate).toLocaleDateString("zh-TW")}</td><td className="px-3 py-2">{item.category}</td><td className="px-3 py-2"><p>{item.description}</p>{item.merchant && <p className="mt-0.5 text-xs text-[oklch(0.60_0_0)]">{item.merchant}</p>}</td><td className="px-3 py-2 text-right font-mono">{formatCurrency(item.amount)}</td></tr>)}</tbody></table></div></div><Separator className="bg-white/10" /><div><h3 className="mb-2 text-sm font-semibold text-white">收據附件</h3>{selectedClaim.receipts.length ? <div className="space-y-2">{selectedClaim.receipts.map((receipt) => <div key={receipt.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 p-3"><a href={receipt.url} target="_blank" rel="noreferrer" className="min-w-0 truncate text-sm text-cyan-300 hover:text-cyan-200">{receipt.fileName}</a>{selectedClaim.status === "draft" && selectedClaim.requesterId === user?.id && <Button variant="ghost" size="icon" onClick={() => runRemoveReceipt(receipt.id)} disabled={removeReceipt.isPending} aria-label={`移除收據 ${receipt.fileName}`}><Trash2 className="h-4 w-4 text-rose-300" /></Button>}</div>)}</div> : <p className="text-sm text-[oklch(0.60_0_0)]">尚未附加收據</p>}</div>{selectedClaim.reviewNote && <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3"><p className="text-xs font-medium text-amber-200">審核說明</p><p className="mt-1 text-sm text-[oklch(0.78_0_0)]">{selectedClaim.reviewNote}</p></div>}</div></>}
        </DialogContent>
      </Dialog>

    </div>
  );
}
