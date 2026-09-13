import React, { useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, FileImage, FileText, Infinity as InfinityIcon, Megaphone, Paperclip, Pin, Send, Trash2, TriangleAlert, Upload } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { SystemReportSubnav } from "@/components/SystemReportSubnav";

type ReportPriority = "normal" | "important" | "urgent";
type PendingAsset = { file: File; assetKind: "image" | "attachment" };

const PRIORITY_LABELS: Record<ReportPriority, string> = { normal: "一般", important: "重要", urgent: "緊急" };
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ATTACHMENT_TYPES = ["application/pdf", "text/plain", "text/csv", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.openxmlformats-officedocument.presentationml.presentation"];

function toDatetimeLocalValue(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("無法讀取檔案"));
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.readAsDataURL(file);
  });
}

export default function SystemReports() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const reportsQuery = trpc.systemReports.list.useQuery();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [visibilityMode, setVisibilityMode] = useState<"permanent" | "expires">("permanent");
  const [expiresAtLocal, setExpiresAtLocal] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [priority, setPriority] = useState<ReportPriority>("normal");
  const [mustReadByLocal, setMustReadByLocal] = useState("");
  const [pendingAssets, setPendingAssets] = useState<PendingAsset[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const editQueryId = useState(() => {
    if (typeof window === "undefined") return null;
    const value = Number(new URLSearchParams(window.location.search).get("edit"));
    return Number.isInteger(value) && value > 0 ? value : null;
  })[0];

  const createMutation = trpc.systemReports.create.useMutation();
  const updateMutation = trpc.systemReports.updateDraft.useMutation();
  const publishMutation = trpc.systemReports.publish.useMutation();
  const uploadAssetMutation = trpc.systemReports.uploadAsset.useMutation();
  const removeAssetMutation = trpc.systemReports.removeAsset.useMutation();
  const setPinnedMutation = trpc.systemReports.setPinned.useMutation();
  const setPriorityMutation = trpc.systemReports.setPriority.useMutation();
  const reports = reportsQuery.data ?? [];
  const editingReport = useMemo(() => reports.find((report) => report.id === editingId), [editingId, reports]);
  const isSaving = isSubmitting || createMutation.isPending || updateMutation.isPending || publishMutation.isPending || uploadAssetMutation.isPending || removeAssetMutation.isPending || setPinnedMutation.isPending || setPriorityMutation.isPending;
  const isExpirySelected = visibilityMode === "expires";
  const expiresAt = isExpirySelected && expiresAtLocal ? new Date(expiresAtLocal) : null;
  const mustReadBy = priority === "urgent" && mustReadByLocal ? new Date(mustReadByLocal) : null;

  const invalidateReports = async () => {
    await Promise.all([utils.systemReports.list.invalidate(), utils.systemReports.unread.invalidate(), user?.role === "admin" ? utils.systemReports.statistics.invalidate() : Promise.resolve()]);
  };

  const resetComposer = () => {
    setEditingId(null);
    setTitle("");
    setContent("");
    setVisibilityMode("permanent");
    setExpiresAtLocal("");
    setIsPinned(false);
    setPriority("normal");
    setMustReadByLocal("");
    setPendingAssets([]);
  };

  const startEditing = (report: typeof reports[number]) => {
    setEditingId(report.id);
    setTitle(report.title);
    setContent(report.content);
    setVisibilityMode(report.expiresAt ? "expires" : "permanent");
    setExpiresAtLocal(toDatetimeLocalValue(report.expiresAt));
    setIsPinned(report.isPinned);
    setPriority(report.priority);
    setMustReadByLocal(toDatetimeLocalValue(report.mustReadBy));
    setPendingAssets([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (!editQueryId || editingId || !reports.length) return;
    const report = reports.find((item) => item.id === editQueryId);
    if (report && (user?.role === "admin" || report.authorId === user?.id)) startEditing(report);
  }, [editQueryId, editingId, reports, user]);

  const addFiles = (files: FileList | null, assetKind: PendingAsset["assetKind"]) => {
    if (!files?.length) return;
    const allowedTypes = assetKind === "image" ? IMAGE_TYPES : ATTACHMENT_TYPES;
    const accepted: PendingAsset[] = [];
    for (const file of Array.from(files)) {
      if (!allowedTypes.includes(file.type)) toast.error(`${file.name} 的格式不受支援`);
      else if (file.size === 0 || file.size > MAX_FILE_SIZE) toast.error(`${file.name} 必須介於 1 位元組至 8 MB 之間`);
      else accepted.push({ file, assetKind });
    }
    if (accepted.length) setPendingAssets((current) => [...current, ...accepted].slice(0, 10));
  };

  const uploadPendingAssets = async (reportId: number) => {
    for (const asset of pendingAssets) {
      await uploadAssetMutation.mutateAsync({ reportId, assetKind: asset.assetKind, fileName: asset.file.name, mimeType: asset.file.type, base64: await fileToBase64(asset.file) });
    }
  };

  const save = async (publishNow: boolean) => {
    if (!title.trim() || !content.trim()) return toast.error("請完成報告標題與內容");
    if (isExpirySelected && (!expiresAt || expiresAt <= new Date())) return toast.error("請設定晚於目前時間的有效期限，或改選永久顯示");
    if (priority === "urgent" && (!mustReadBy || mustReadBy <= new Date())) return toast.error("緊急公告必須設定晚於目前時間的必讀截止時間");
    if (mustReadBy && expiresAt && mustReadBy > expiresAt) return toast.error("必讀截止時間不得晚於公告有效期限");
    setIsSubmitting(true);
    try {
      let reportId = editingId;
      if (reportId) await updateMutation.mutateAsync({ id: reportId, title: title.trim(), content: content.trim(), expiresAt, mustReadBy, isPinned, priority });
      else reportId = (await createMutation.mutateAsync({ title: title.trim(), content: content.trim(), expiresAt, publishNow: publishNow && pendingAssets.length === 0, isPinned, priority, mustReadBy })).id;
      if (!reportId) throw new Error("無法建立系統報告");
      if (pendingAssets.length) await uploadPendingAssets(reportId);
      if (publishNow && (editingId || pendingAssets.length > 0)) await publishMutation.mutateAsync({ id: reportId });
      await invalidateReports();
      resetComposer();
      toast.success(publishNow ? "系統報告已發布，登入使用者將看到公告" : "系統報告草稿已儲存");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "無法儲存系統報告");
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeExistingAsset = async (assetId: number) => {
    try { await removeAssetMutation.mutateAsync({ id: assetId }); await invalidateReports(); toast.success("已自草稿移除檔案"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "無法移除檔案"); }
  };

  return (
    <div className="system-reports-page container py-8 space-y-8">
      <header className="system-reports-header flex flex-col gap-4 border-b border-[oklch(0.22_0_0)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-caps mb-2">內部公告與運行報告</p>
          <h1 className="page-title flex items-center gap-3"><Megaphone size={28} />系統報告</h1>
          <p className="system-reports-header-description page-subtitle mt-2">發布後，所有使用者會在登入系統後看到報告內容、圖片及附件並確認閱讀</p>
        </div>
        <div className="system-reports-role-note flex items-center gap-2 text-xs text-[oklch(0.60_0_0)]"><CheckCircle2 size={15} className="text-[oklch(0.65_0.13_145)]" />教師與管理員皆可建立及發布</div>
      </header>

      <section className="system-reports-composer border border-[oklch(0.24_0_0)] bg-[oklch(0.13_0_0)] p-5 sm:p-6" aria-label="建立系統報告">
        <div className="mb-5 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><FileText size={18} className="text-[oklch(0.72_0.14_65)]" /><h2 className="font-semibold text-white">{editingReport ? "編輯草稿" : "建立系統報告"}</h2></div>{editingReport && <button type="button" onClick={resetComposer} className="text-xs text-[oklch(0.60_0_0)] hover:text-white">取消編輯</button>}</div>
        <div className="space-y-5">
          <div><label htmlFor="system-report-title" className="label-caps mb-2 block">報告標題</label><input id="system-report-title" className="industrial-input" maxLength={160} placeholder="例如：器材借用系統維護通知" value={title} onChange={(event) => setTitle(event.target.value)} disabled={isSaving} /></div>
          <div><label htmlFor="system-report-content" className="label-caps mb-2 block">報告內容</label><textarea id="system-report-content" className="industrial-input min-h-48 resize-y leading-7" maxLength={20_000} placeholder="輸入所有登入使用者需閱讀的系統報告內容…" value={content} onChange={(event) => setContent(event.target.value)} disabled={isSaving} /><p className="mt-2 text-right text-xs text-[oklch(0.50_0_0)]">{content.length.toLocaleString()}/20,000</p></div>
          <fieldset className="border border-[oklch(0.22_0_0)] p-4"><legend className="px-2 label-caps">顯示期限</legend><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><label className="flex items-center gap-2 text-sm text-[oklch(0.78_0_0)]"><input type="radio" name="report-visibility" checked={visibilityMode === "permanent"} onChange={() => setVisibilityMode("permanent")} disabled={isSaving} /> <InfinityIcon size={15} />永久顯示</label><label className="flex items-center gap-2 text-sm text-[oklch(0.78_0_0)]"><input type="radio" name="report-visibility" checked={visibilityMode === "expires"} onChange={() => setVisibilityMode("expires")} disabled={isSaving} /> <CalendarClock size={15} />指定時間後自動下架</label></div>{isExpirySelected && <div className="mt-4"><label htmlFor="system-report-expires-at" className="label-caps mb-2 block">有效至</label><input id="system-report-expires-at" type="datetime-local" className="industrial-input max-w-sm" value={expiresAtLocal} onChange={(event) => setExpiresAtLocal(event.target.value)} disabled={isSaving} /></div>}</fieldset>
          <fieldset className="border border-[oklch(0.22_0_0)] p-4"><legend className="px-2 label-caps">公告優先程度</legend><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><label className="flex items-center gap-2 text-sm text-[oklch(0.84_0_0)]"><input aria-label="置頂系統報告" type="checkbox" checked={isPinned} onChange={(event) => setIsPinned(event.target.checked)} disabled={isSaving} /><Pin size={15} className="text-[oklch(0.72_0.14_65)]" />置頂公告<div className="text-xs text-[oklch(0.58_0_0)]">登入後優先顯示</div></label><div className="w-full sm:max-w-xs"><label htmlFor="system-report-priority" className="label-caps mb-2 block">重要程度</label><select id="system-report-priority" aria-label="系統報告重要程度" className="industrial-input" value={priority} onChange={(event) => setPriority(event.target.value as ReportPriority)} disabled={isSaving}><option value="normal">一般</option><option value="important">重要</option><option value="urgent">緊急</option></select></div></div>{priority === "urgent" && <div className="mt-4 border border-[oklch(0.62_0.20_25)] bg-[oklch(0.62_0.20_25_/_0.08)] p-3"><label htmlFor="system-report-must-read-by" className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[oklch(0.82_0.16_32)]"><TriangleAlert size={14} />必讀截止時間</label><input id="system-report-must-read-by" aria-label="緊急公告必讀截止時間" type="datetime-local" className="industrial-input max-w-sm" value={mustReadByLocal} onChange={(event) => setMustReadByLocal(event.target.value)} disabled={isSaving} /><p className="mt-2 text-xs leading-5 text-[oklch(0.70_0.08_28)]">未讀使用者每次登入時都會看到緊急提醒，直到完成閱讀或公告到期必讀截止時間不得晚於有效期限</p></div>}<p className="mt-3 text-xs leading-5 text-[oklch(0.58_0_0)]">緊急公告會以紅色標籤及醒目外框顯示；重要公告則以琥珀色標籤呈現</p></fieldset>
          <fieldset className="border border-[oklch(0.22_0_0)] p-4"><legend className="px-2 label-caps">圖片與附件</legend><p className="mb-4 text-xs leading-5 text-[oklch(0.58_0_0)]">圖片支援 JPG、PNG、WebP；附件支援 PDF、TXT、CSV、Word、Excel、PowerPoint每個檔案上限 8 MB，檔案僅會在草稿階段儲存與管理</p><div className="flex flex-col gap-3 sm:flex-row"><label className="btn-secondary flex cursor-pointer items-center justify-center gap-2"><FileImage size={15} />新增圖片<input aria-label="新增報告圖片" type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={isSaving} onChange={(event) => { addFiles(event.target.files, "image"); event.currentTarget.value = ""; }} /></label><label className="btn-secondary flex cursor-pointer items-center justify-center gap-2"><Paperclip size={15} />新增附件<input aria-label="新增報告附件" type="file" accept=".pdf,.txt,.csv,.docx,.xlsx,.pptx" multiple className="sr-only" disabled={isSaving} onChange={(event) => { addFiles(event.target.files, "attachment"); event.currentTarget.value = ""; }} /></label></div>{(editingReport?.assets?.length || pendingAssets.length) ? <div className="mt-4 space-y-2" aria-label="報告檔案清單">{editingReport?.assets?.map((asset) => <div key={asset.id} className="flex items-center justify-between gap-3 border border-[oklch(0.22_0_0)] px-3 py-2 text-sm"><span className="flex min-w-0 items-center gap-2 text-[oklch(0.75_0_0)]">{asset.assetKind === "image" ? <FileImage size={15} /> : <Paperclip size={15} />}<span className="truncate">{asset.fileName}</span></span><button type="button" className="text-[oklch(0.72_0.14_28)] hover:text-white" onClick={() => removeExistingAsset(asset.id)} disabled={isSaving} aria-label={`移除 ${asset.fileName}`}><Trash2 size={15} /></button></div>)}{pendingAssets.map((asset, index) => <div key={`${asset.file.name}-${index}`} className="flex items-center justify-between gap-3 border border-dashed border-[oklch(0.35_0_0)] px-3 py-2 text-sm"><span className="flex min-w-0 items-center gap-2 text-[oklch(0.64_0_0)]"><Upload size={15} /><span className="truncate">待上傳：{asset.file.name}</span></span><button type="button" className="text-[oklch(0.72_0.14_28)] hover:text-white" onClick={() => setPendingAssets((items) => items.filter((_, itemIndex) => itemIndex !== index))} disabled={isSaving} aria-label={`取消 ${asset.file.name}`}><Trash2 size={15} /></button></div>)}</div> : null}</fieldset>
          <div className="flex flex-col-reverse gap-3 border-t border-[oklch(0.22_0_0)] pt-5 sm:flex-row sm:justify-end"><button type="button" className="btn-secondary" onClick={() => void save(false)} disabled={isSaving || !title.trim() || !content.trim()}>儲存草稿</button><button type="button" className="btn-primary flex items-center justify-center gap-2" onClick={() => void save(true)} disabled={isSaving || !title.trim() || !content.trim()}><Send size={15} />{isSaving ? "發布中…" : editingReport ? "發布此草稿" : "直接發布"}</button></div>
        </div>
      </section>

      <SystemReportSubnav />
    </div>
  );
}
