import { useMemo, useState } from "react";
import { BadgeCheck, CalendarRange, ClipboardPenLine, FilePenLine, HandCoins, Pencil, Plus, Send, ShieldCheck, Trash2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

type ProposalStatus = "draft" | "submitted" | "approved" | "returned" | "rejected";
type ProposalDraft = { title: string; summary: string; content: string; start: string; end: string; budget: string };

const STATUS_META: Record<ProposalStatus, { label: string; className: string }> = {
  draft: { label: "草稿", className: "border-slate-500/40 bg-slate-500/10 text-slate-300" },
  submitted: { label: "待審核", className: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
  approved: { label: "已核准", className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
  returned: { label: "待補件", className: "border-violet-500/40 bg-violet-500/10 text-violet-300" },
  rejected: { label: "未核准", className: "border-rose-500/40 bg-rose-500/10 text-rose-300" },
};

function toDateInput(value: Date | string | null | undefined) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function blankDraft(): ProposalDraft {
  return { title: "", summary: "", content: "", start: "", end: "", budget: "" };
}

function proposalDraft(proposal: { title: string; summary: string | null; content: string; proposedStartAt: Date | null; proposedEndAt: Date | null; requestedBudget: string | null }): ProposalDraft {
  return { title: proposal.title, summary: proposal.summary ?? "", content: proposal.content, start: toDateInput(proposal.proposedStartAt), end: toDateInput(proposal.proposedEndAt), budget: proposal.requestedBudget ?? "" };
}

function displayDate(value: Date | string | null | undefined) {
  return value ? new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value)) : "未設定";
}

export default function MediaProjectProposals() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [createOpen, setCreateOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [draft, setDraft] = useState<ProposalDraft>(blankDraft);
  const [filter, setFilter] = useState<"all" | ProposalStatus>("all");
  const proposalsQuery = trpc.mediaProjectProposals.list.useQuery();
  const createProposal = trpc.mediaProjectProposals.create.useMutation();
  const updateProposal = trpc.mediaProjectProposals.update.useMutation();
  const reviewProposal = trpc.mediaProjectProposals.review.useMutation();
  const deleteProposal = trpc.mediaProjectProposals.delete.useMutation();
  const isStaff = user?.role === "admin" || user?.role === "teacher";
  const proposals = proposalsQuery.data ?? [];
  const editingProposal = useMemo(() => proposals.find((proposal) => proposal.id === editingId) ?? null, [editingId, proposals]);
  const reviewingProposal = useMemo(() => proposals.find((proposal) => proposal.id === reviewingId) ?? null, [reviewingId, proposals]);
  const filtered = useMemo(() => filter === "all" ? proposals : proposals.filter((proposal) => proposal.status === filter), [filter, proposals]);

  const invalidate = () => utils.mediaProjectProposals.list.invalidate();
  const openCreate = () => { setEditingId(null); setDraft(blankDraft()); setCreateOpen(true); };
  const openEdit = (proposal: NonNullable<typeof editingProposal>) => { setEditingId(proposal.id); setDraft(proposalDraft(proposal)); setCreateOpen(true); };

  const buildInput = (status: "draft" | "submitted") => {
    const budget = draft.budget.trim() ? Number(draft.budget) : null;
    if (!draft.title.trim() || !draft.content.trim()) {
      toast.error("請完成企劃名稱與企劃內容");
      return null;
    }
    if (budget !== null && (!Number.isFinite(budget) || budget < 0)) {
      toast.error("請填寫有效的申請經費");
      return null;
    }
    return { title: draft.title.trim(), summary: draft.summary.trim() || null, content: draft.content.trim(), proposedStartAt: draft.start ? new Date(`${draft.start}T00:00:00+08:00`) : null, proposedEndAt: draft.end ? new Date(`${draft.end}T00:00:00+08:00`) : null, requestedBudget: budget, status };
  };

  const saveProposal = async (status: "draft" | "submitted") => {
    const input = buildInput(status);
    if (!input) return;
    try {
      if (editingId) {
        await updateProposal.mutateAsync({ id: editingId, proposal: input });
        toast.success(status === "submitted" ? "企劃已更新並送交審核" : "企劃草稿已更新");
      } else {
        await createProposal.mutateAsync(input);
        toast.success(status === "submitted" ? "企劃已送交審核" : "企劃草稿已儲存");
      }
      await invalidate();
      setCreateOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "無法儲存企劃，請稍後再試");
    }
  };

  const submitReview = async (status: "approved" | "returned" | "rejected") => {
    if (!reviewingProposal) return;
    try {
      await reviewProposal.mutateAsync({ id: reviewingProposal.id, status, reviewNote: reviewNote.trim() || null });
      await invalidate();
      setReviewOpen(false);
      setReviewingId(null);
      setReviewNote("");
      toast.success(status === "approved" ? "企劃已核准" : status === "returned" ? "企劃已退回補件" : "企劃已標示為未核准");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "審核操作失敗，請稍後再試");
    }
  };

  const removeProposal = async (proposal: typeof proposals[number]) => {
    if (!window.confirm(`確定要刪除「${proposal.title}」嗎？`)) return;
    try {
      await deleteProposal.mutateAsync({ id: proposal.id });
      await invalidate();
      toast.success("企劃申請已刪除");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "無法刪除企劃，請稍後再試");
    }
  };

  return <div className="mx-auto max-w-6xl space-y-6" data-testid="media-project-proposals-page">
    <section className="relative overflow-hidden rounded-2xl border border-violet-300/20 bg-gradient-to-br from-violet-500/10 via-background to-cyan-500/10 p-5 sm:p-7">
      <div className="absolute right-0 top-0 h-40 w-40 bg-violet-400/10 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-3 inline-flex items-center gap-2 font-mono text-xs tracking-[0.16em] text-violet-300"><ClipboardPenLine size={15} /> MEDIA SERVICE PROPOSALS</div><h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">企劃申請</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">提交媒服活動、製作或器材需求企劃；送出後可追蹤審核結果與補件意見</p></div><Button onClick={openCreate} className="gap-2"><Plus size={16} />新增企劃</Button></div>
    </section>

    <Card className="border-violet-300/15 bg-card/70"><CardHeader className="gap-4 border-b border-border/60 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>企劃清單</CardTitle><CardDescription className="mt-1">{isStaff ? "可檢視並審核所有媒服企劃申請" : "僅顯示你建立的企劃申請"}</CardDescription></div><Tabs value={filter} onValueChange={(value) => setFilter(value as typeof filter)}><TabsList className="h-auto flex-wrap"><TabsTrigger value="all">全部</TabsTrigger><TabsTrigger value="submitted">待審核</TabsTrigger><TabsTrigger value="returned">待補件</TabsTrigger><TabsTrigger value="approved">已核准</TabsTrigger></TabsList></Tabs></CardHeader><CardContent className="p-4 sm:p-6">{proposalsQuery.isLoading ? <p className="py-10 text-center text-sm text-muted-foreground">正在載入企劃申請…</p> : proposalsQuery.error ? <p className="py-10 text-center text-sm text-destructive">企劃資料載入失敗，請重新整理後再試</p> : filtered.length === 0 ? <div className="rounded-xl border border-dashed border-border p-8 text-center"><FilePenLine className="mx-auto mb-3 text-muted-foreground" /><p className="font-semibold text-foreground">目前沒有符合條件的企劃</p><p className="mt-1 text-sm text-muted-foreground">可從右上角建立新的媒服企劃申請</p></div> : <div className="space-y-3">{filtered.map((proposal) => { const canEdit = proposal.applicantId === user?.id && (proposal.status === "draft" || proposal.status === "returned"); return <article key={proposal.id} className="rounded-xl border border-border/70 bg-background/30 p-4 transition hover:border-violet-300/35 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-foreground">{proposal.title}</h2><Badge variant="outline" className={STATUS_META[proposal.status as ProposalStatus].className}>{STATUS_META[proposal.status as ProposalStatus].label}</Badge></div>{proposal.summary && <p className="mt-1 text-sm text-muted-foreground">{proposal.summary}</p>}</div><div className="flex flex-wrap gap-2">{isStaff && proposal.status === "submitted" && <Button size="sm" onClick={() => { setReviewingId(proposal.id); setReviewNote(""); setReviewOpen(true); }} className="gap-1.5"><ShieldCheck size={14} />審核</Button>}{canEdit && <Button size="sm" variant="outline" onClick={() => openEdit(proposal)} className="gap-1.5"><Pencil size={14} />編輯</Button>}{(isStaff || canEdit) && <Button size="sm" variant="ghost" onClick={() => removeProposal(proposal)} className="gap-1.5 text-destructive hover:text-destructive"><Trash2 size={14} />刪除</Button>}</div></div><div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3"><span className="flex items-center gap-1.5"><CalendarRange size={13} />{displayDate(proposal.proposedStartAt)} 至 {displayDate(proposal.proposedEndAt)}</span><span className="flex items-center gap-1.5"><HandCoins size={13} />{proposal.requestedBudget ? `申請經費 NT$ ${Number(proposal.requestedBudget).toLocaleString("zh-TW")}` : "未申請經費"}</span><span>建立於 {displayDate(proposal.createdAt)}</span></div>{proposal.reviewNote && <div className="mt-4 rounded-lg border border-violet-400/20 bg-violet-400/5 p-3 text-sm"><p className="mb-1 font-semibold text-violet-200">審核意見</p><p className="whitespace-pre-wrap leading-6 text-foreground">{proposal.reviewNote}</p></div>}</article>; })}</div>}</CardContent></Card>

    <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{editingId ? "編輯企劃申請" : "新增企劃申請"}</DialogTitle><DialogDescription>可先儲存草稿，或在內容完成後直接送交審核</DialogDescription></DialogHeader><div className="grid gap-4 py-1"><div className="grid gap-2"><Label htmlFor="proposal-title">企劃名稱</Label><Input id="proposal-title" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="例如：校慶直播暨舞台技術支援企劃" /></div><div className="grid gap-2"><Label htmlFor="proposal-summary">摘要</Label><Input id="proposal-summary" value={draft.summary} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))} placeholder="簡要說明目標與執行重點" /></div><div className="grid gap-2"><Label htmlFor="proposal-content">企劃內容</Label><Textarea id="proposal-content" rows={8} value={draft.content} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} placeholder="說明活動目的、執行方式、人力分工、器材需求與預期成果" /></div><div className="grid gap-3 sm:grid-cols-3"><div className="grid gap-2"><Label htmlFor="proposal-start">預定開始</Label><Input id="proposal-start" type="date" value={draft.start} onChange={(event) => setDraft((current) => ({ ...current, start: event.target.value }))} /></div><div className="grid gap-2"><Label htmlFor="proposal-end">預定結束</Label><Input id="proposal-end" type="date" value={draft.end} onChange={(event) => setDraft((current) => ({ ...current, end: event.target.value }))} /></div><div className="grid gap-2"><Label htmlFor="proposal-budget">申請經費</Label><Input id="proposal-budget" type="number" min="0" value={draft.budget} onChange={(event) => setDraft((current) => ({ ...current, budget: event.target.value }))} placeholder="0" /></div></div></div><DialogFooter className="flex-col gap-2 sm:flex-row"><Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button><Button variant="secondary" onClick={() => saveProposal("draft")} disabled={createProposal.isPending || updateProposal.isPending}>儲存草稿</Button><Button onClick={() => saveProposal("submitted")} disabled={createProposal.isPending || updateProposal.isPending} className="gap-2"><Send size={15} />送交審核</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={reviewOpen} onOpenChange={setReviewOpen}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>審核企劃申請</DialogTitle><DialogDescription>{reviewingProposal?.title}</DialogDescription></DialogHeader><div className="grid gap-2"><Label htmlFor="proposal-review-note">審核意見</Label><Textarea id="proposal-review-note" rows={5} value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="可說明核准條件、需補件內容或未核准原因" /></div><DialogFooter className="flex-col gap-2 sm:flex-row"><Button variant="destructive" onClick={() => submitReview("rejected")} disabled={reviewProposal.isPending}>未核准</Button><Button variant="secondary" onClick={() => submitReview("returned")} disabled={reviewProposal.isPending}>退回補件</Button><Button onClick={() => submitReview("approved")} disabled={reviewProposal.isPending} className="gap-2"><BadgeCheck size={15} />核准</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
