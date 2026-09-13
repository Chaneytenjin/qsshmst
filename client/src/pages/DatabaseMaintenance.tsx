import React, { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { AuditPinDialog } from "@/components/AuditPinDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { CheckCircle2, Database, KeyRound, RefreshCw, ShieldAlert, Trash2, UserX } from "lucide-react";

const AUDIT_PIN_SESSION_KEY = "qingshui-audit-pin-verified-at";
const PIN_VALIDITY_MS = 30 * 60 * 1000;

function hasValidAuditPinSession() {
  if (typeof window === "undefined") return false;
  const verifiedAt = Number(window.sessionStorage.getItem(AUDIT_PIN_SESSION_KEY));
  const isValid = Number.isFinite(verifiedAt) && Date.now() - verifiedAt < PIN_VALIDITY_MS;
  if (!isValid) window.sessionStorage.removeItem(AUDIT_PIN_SESSION_KEY);
  return isValid;
}

function isPinVerificationExpired(error: unknown) {
  const trpcError = error as { message?: string; data?: { code?: string } } | null | undefined;
  return trpcError?.data?.code === "UNAUTHORIZED" || trpcError?.message?.includes("PIN 碼驗證失效") === true;
}

type DuplicateUser = {
  id: number;
  username: string | null;
  email: string | null;
  realName: string | null;
  role: "admin" | "teacher" | "student";
  isActive: boolean;
  isFounder: boolean;
};

export default function DatabaseMaintenance() {
  const { user } = useAuth();
  const [pinVerified, setPinVerified] = useState(hasValidAuditPinSession);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pendingDeactivation, setPendingDeactivation] = useState<DuplicateUser | null>(null);
  const [testCleanupOpen, setTestCleanupOpen] = useState(false);
  const [testCleanupConfirmation, setTestCleanupConfirmation] = useState("");
  const verifyPinMutation = trpc.auditPin.verify.useMutation();
  const maintenance = trpc.users.deduplicationStatus.useQuery(undefined, { enabled: pinVerified });
  const runCheck = trpc.users.runDeduplicationCheck.useMutation({
    onSuccess: async (result) => {
      await maintenance.refetch();
      toast.success(`檢查完成：發現 ${result.duplicateGroupCount} 組重複識別資料`);
    },
    onError: (error) => toast.error(error.message || "無法執行帳號去重檢查"),
  });
  const deactivateUser = trpc.users.deactivateDuplicateUser.useMutation({
    onSuccess: async () => {
      setPendingDeactivation(null);
      await maintenance.refetch();
      toast.success("帳號已停用；原有資料與稽核紀錄均已保留");
    },
    onError: (error) => toast.error(error.message || "無法停用重複帳號"),
  });
  const cleanupTestAccounts = trpc.users.cleanupTestAccounts.useMutation({
    onSuccess: async (result) => {
      setTestCleanupOpen(false);
      setTestCleanupConfirmation("");
      await maintenance.refetch();
      toast.success(result.deletedCount ? `已永久清理 ${result.deletedCount} 個測試帳號及其關聯資料` : "目前沒有符合規則的測試帳號");
    },
    onError: (error) => toast.error(error.message || "無法清理測試帳號"),
  });

  useEffect(() => {
    if (!isPinVerificationExpired(maintenance.error)) return;
    window.sessionStorage.removeItem(AUDIT_PIN_SESSION_KEY);
    setPinVerified(false);
    setPinDialogOpen(true);
  }, [maintenance.error]);

  const completePinVerification = () => {
    window.sessionStorage.setItem(AUDIT_PIN_SESSION_KEY, Date.now().toString());
    setPinVerified(true);
    setPinDialogOpen(false);
  };

  if (!user?.isFounder) {
    return <div className="space-y-6"><div><h1 className="page-title">資料庫維護</h1><p className="page-subtitle">DATABASE MAINTENANCE</p></div><Card className="border border-red-500/40 bg-red-950/20"><CardContent className="flex items-center gap-3 pt-6 text-red-200"><ShieldAlert size={22} />僅創始管理員可以執行帳號去重維護</CardContent></Card></div>;
  }

  if (!pinVerified) {
    return <><div className="space-y-6"><div><h1 className="page-title">資料庫維護</h1><p className="page-subtitle">DATABASE MAINTENANCE · ACCOUNT DEDUPLICATION</p></div><Card className="max-w-lg"><CardHeader><CardTitle>PIN 碼驗證</CardTitle></CardHeader><CardContent><p className="mb-4 text-sm text-muted-foreground">帳號停用屬於敏感維護操作，請先驗證 PIN 碼</p><Button onClick={() => setPinDialogOpen(true)}><KeyRound className="mr-2" size={16} />驗證 PIN 碼</Button></CardContent></Card></div><AuditPinDialog open={pinDialogOpen} onOpenChange={setPinDialogOpen} onSuccess={completePinVerification} onVerify={async (pin) => { await verifyPinMutation.mutateAsync({ pin }); }} /></>;
  }

  const report = maintenance.data?.latestReport;
  const groups = report?.groups ?? [];
  const schedule = maintenance.data?.schedule;
  const testAccounts = maintenance.data?.testAccounts ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="page-title">資料庫維護</h1><p className="page-subtitle">DATABASE MAINTENANCE · ACCOUNT DEDUPLICATION</p></div><Button onClick={() => runCheck.mutate()} disabled={runCheck.isPending || maintenance.isLoading} className="border border-white/20"><RefreshCw className={`mr-2 ${runCheck.isPending ? "animate-spin" : ""}`} size={16} />{runCheck.isPending ? "檢查中…" : "立即產生去重報告"}</Button></div>

      <Card className="border-amber-500/35 bg-amber-950/15"><CardContent className="flex items-start gap-3 pt-6 text-amber-100"><ShieldAlert className="mt-0.5 shrink-0 text-amber-300" size={20} /><div><p className="font-bold">安全維護原則</p><p className="mt-1 text-sm text-amber-100/85">系統只依帳號名稱與電子郵件產生重複識別報告，絕不自動刪除或停用帳號每次停用均需由創始管理員逐筆確認，並保留帳號資料及完整操作日誌</p></div></CardContent></Card>

      <Card className="border-red-500/35 bg-red-950/15"><CardHeader className="gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="flex items-center gap-2 text-base"><Trash2 className="text-red-300" size={18} />測試帳號快速清理</CardTitle><p className="mt-1 text-sm text-muted-foreground">目前辨識到 {testAccounts.length} 個符合固定自動化測試識別規則的帳號</p></div><Button variant="destructive" onClick={() => setTestCleanupOpen(true)} disabled={!testAccounts.length || maintenance.isLoading}><Trash2 className="mr-2" size={16} />清理測試帳號</Button></CardHeader><CardContent><p className="text-sm text-muted-foreground">此功能只處理固定的自動化測試 username 與 OAuth openId 規則操作需要既有創始管理員 PIN 工作階段、彈窗完整清單預覽及固定確認字串，並會永久刪除其關聯資料</p>{testAccounts.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{testAccounts.slice(0, 8).map((account) => <span key={account.id} className="rounded border border-red-400/30 bg-red-500/10 px-2 py-1 font-mono text-xs text-red-100">{account.username || account.name || `帳號 #${account.id}`}</span>)}{testAccounts.length > 8 && <span className="px-2 py-1 text-xs text-muted-foreground">另有 {testAccounts.length - 8} 個</span>}</div>}</CardContent></Card>

      <div className="grid gap-4 md:grid-cols-2"><Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Database size={18} />每日自動檢查</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p><span className="text-muted-foreground">排程：</span>每日台灣時間凌晨 03:00</p><p><span className="text-muted-foreground">狀態：</span>{schedule?.isActive ? <span className="font-bold text-emerald-500">已啟用</span> : <span className="font-bold text-amber-500">尚未啟用</span>}</p><p><span className="text-muted-foreground">最後執行：</span>{schedule?.lastRunAt ? new Date(schedule.lastRunAt).toLocaleString("zh-TW") : "尚未執行"}</p></CardContent></Card><Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><CheckCircle2 size={18} />最近維護報告</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p><span className="text-muted-foreground">產生時間：</span>{report?.createdAt ? new Date(report.createdAt).toLocaleString("zh-TW") : "尚無報告"}</p><p><span className="text-muted-foreground">重複群組：</span><span className="font-bold">{report?.duplicateGroupCount ?? 0} 組</span></p><p className="text-xs text-muted-foreground">可隨時手動檢查；手動檢查同樣只產生報告</p></CardContent></Card></div>

      {maintenance.error ? <Card className="border-red-500/40"><CardContent className="pt-6 text-red-300">載入維護資料失敗：{maintenance.error.message}</CardContent></Card> : maintenance.isLoading ? <Card><CardContent className="py-10 text-center text-muted-foreground">正在載入維護報告…</CardContent></Card> : !report ? <Card><CardContent className="py-10 text-center text-muted-foreground">尚未產生任何去重報告您可以按下「立即產生去重報告」，或等待下一次每日自動檢查</CardContent></Card> : !groups.length ? <Card><CardContent className="py-10 text-center"><CheckCircle2 className="mx-auto mb-3 text-emerald-500" size={28} /><p className="font-bold">最近一次檢查沒有發現重複帳號</p><p className="mt-1 text-sm text-muted-foreground">已依帳號名稱與電子郵件完成比對</p></CardContent></Card> : <div className="space-y-4">{groups.map((group, index) => <Card key={`${group.field}-${group.value}-${index}`} className="overflow-hidden"><CardHeader className="border-b"><CardTitle className="text-base">重複{group.field === "username" ? "帳號名稱" : "電子郵件"}：<span className="font-mono text-primary">{group.value}</span></CardTitle><p className="text-sm text-muted-foreground">此群組有 {group.users.length} 個帳號請逐筆檢視後，僅停用確認為重複且不再使用的帳號</p></CardHeader><CardContent className="divide-y p-0">{group.users.map((account) => { const unavailable = !account.isActive || account.isFounder || account.id === user.id; return <div key={account.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-bold">{account.realName || account.username || account.email || `帳號 #${account.id}`}{account.isFounder && <span className="ml-2 text-xs text-amber-500">創始管理員（受保護）</span>}</p><p className="mt-1 break-all text-xs text-muted-foreground">帳號：{account.username || "未設定"} · 信箱：{account.email || "未設定"} · 角色：{account.role} · {account.isActive ? "啟用中" : "已停用"}</p></div><Button variant="outline" size="sm" onClick={() => setPendingDeactivation(account)} disabled={unavailable} className="shrink-0 border-red-500/60 text-red-300 hover:bg-red-500/15"><UserX className="mr-2" size={15} />{account.isFounder ? "受保護" : account.isActive ? "停用帳號" : "已停用"}</Button></div>; })}</CardContent></Card>)}</div>}

      <AlertDialog open={Boolean(pendingDeactivation)} onOpenChange={(open) => { if (!open) setPendingDeactivation(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>確認停用重複帳號？</AlertDialogTitle><AlertDialogDescription>即將停用「{pendingDeactivation?.username || pendingDeactivation?.email || `帳號 #${pendingDeactivation?.id}`}」帳號將不能再登入，但不會刪除其借用、稽核或操作資料此操作會寫入安全操作日誌</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deactivateUser.isPending}>取消</AlertDialogCancel><AlertDialogAction onClick={() => pendingDeactivation && deactivateUser.mutate({ id: pendingDeactivation.id })} disabled={deactivateUser.isPending} className="bg-red-700 text-white hover:bg-red-800">{deactivateUser.isPending ? "停用中…" : "確認停用帳號"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={testCleanupOpen} onOpenChange={(open) => { if (!open && !cleanupTestAccounts.isPending) { setTestCleanupOpen(false); setTestCleanupConfirmation(""); } }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>永久清理 {testAccounts.length} 個測試帳號？</AlertDialogTitle><AlertDialogDescription>請先確認下列完整預覽清單；系統會永久刪除這些帳號及其登入、偏好、借用與操作關聯資料，無法復原系統會保留一筆由目前創始管理員建立的清理稽核摘要</AlertDialogDescription></AlertDialogHeader><div className="space-y-2"><p className="text-sm font-semibold">即將永久刪除的帳號（{testAccounts.length}）</p><div className="max-h-52 space-y-2 overflow-y-auto border border-red-400/25 bg-red-950/20 p-3">{testAccounts.map((account) => <div key={account.id} className="border-b border-red-300/15 pb-2 last:border-b-0 last:pb-0"><p className="font-mono text-sm text-red-100">{account.username || account.name || `帳號 #${account.id}`}</p><p className="mt-0.5 text-xs text-muted-foreground">ID：{account.id} · 角色：{account.role === "admin" ? "管理者" : account.role === "teacher" ? "教師" : "學生"} · {account.isActive ? "啟用中" : "已停用"}</p></div>)}</div></div><label className="space-y-2 text-sm font-medium">確認清單無誤後，請輸入 <code className="rounded bg-muted px-1 py-0.5">DELETE TEST ACCOUNTS</code><Input value={testCleanupConfirmation} onChange={(event) => setTestCleanupConfirmation(event.target.value)} placeholder="DELETE TEST ACCOUNTS" autoComplete="off" /></label><AlertDialogFooter><AlertDialogCancel disabled={cleanupTestAccounts.isPending}>取消</AlertDialogCancel><AlertDialogAction onClick={() => cleanupTestAccounts.mutate({ confirmation: "DELETE TEST ACCOUNTS" })} disabled={cleanupTestAccounts.isPending || testCleanupConfirmation !== "DELETE TEST ACCOUNTS"} className="bg-red-700 text-white hover:bg-red-800">{cleanupTestAccounts.isPending ? "清理中…" : "永久清理測試帳號"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AuditPinDialog open={pinDialogOpen} onOpenChange={setPinDialogOpen} onSuccess={completePinVerification} onVerify={async (pin) => { await verifyPinMutation.mutateAsync({ pin }); }} />
    </div>
  );
}
