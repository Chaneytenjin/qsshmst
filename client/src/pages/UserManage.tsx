
import { trpc } from "@/lib/trpc";
import { RoleBadge, StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { UserPlus, Search, Shield, ShieldOff, Trash2, Unlock, LockKeyhole, Eye, FlaskConical, CheckSquare, MailCheck, History, FileDown, RotateCcw, FileText, Paperclip, KeyRound, TriangleAlert, Clock3 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AuditPinDialog } from "@/components/AuditPinDialog";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/_core/hooks/useAuth";

type CreateUserForm = {
  name: string;
  email: string;
  role: "admin" | "teacher" | "student";
  studentId?: string;
  department?: string;
};

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("zh-TW", { year: "2-digit", month: "2-digit", day: "2-digit" });
}

function formatLockCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function UserManage() {
  const utils = trpc.useUtils();
  const auth = useAuth();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [accountKindFilter, setAccountKindFilter] = useState<"all" | "test" | "standard">("all");
  const [firstSetupFilter, setFirstSetupFilter] = useState<"all" | "pending" | "completed">("all");
  const [selectedTestAccountIds, setSelectedTestAccountIds] = useState<number[]>([]);
  const [activationTarget, setActivationTarget] = useState<any | null>(null);
  const [activationPreviewTarget, setActivationPreviewTarget] = useState<any | null>(null);
  const [activationHistoryTarget, setActivationHistoryTarget] = useState<any | null>(null);
  const [activationRecipientEmail, setActivationRecipientEmail] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [pendingTempPasswordUser, setPendingTempPasswordUser] = useState<{ userId: number; username: string } | null>(null);
  const [pendingFounderAccountDetail, setPendingFounderAccountDetail] = useState<{ userId: number; displayName: string } | null>(null);
  const [tempPasswordPinDialogOpen, setTempPasswordPinDialogOpen] = useState(false);
  const [founderAccountDetailsTarget, setFounderAccountDetailsTarget] = useState<{ userId: number; displayName: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; username: string | null; name: string | null } | null>(null);
  const [deleteConfirmationStep, setDeleteConfirmationStep] = useState<"preview" | "confirm">("preview");
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  const { data: users, isLoading } = trpc.users.list.useQuery();
  const userDeletePreviewInput = React.useMemo(() => ({ id: deleteTarget?.id ?? 0 }), [deleteTarget?.id]);
  const { data: userDeletePreview, isLoading: isUserDeletePreviewLoading, error: userDeletePreviewError } = trpc.users.deletePreview.useQuery(
    userDeletePreviewInput,
    { enabled: Boolean(deleteTarget) }
  );
  const { data: activationHistory, isLoading: isActivationHistoryLoading } = trpc.users.activationCertificateHistory.useQuery(
    { id: activationHistoryTarget?.id ?? 0 },
    { enabled: Boolean(activationHistoryTarget?.id) }
  );
  const { data: activationPdfPreview, isLoading: isActivationPdfPreviewLoading, error: activationPdfPreviewError } = trpc.users.previewActivationCertificate.useQuery(
    { id: activationPreviewTarget?.id ?? 0 },
    { enabled: Boolean(activationPreviewTarget?.id) }
  );
  const { data: loginSecurityStatuses, isLoading: isLoginSecurityLoading, error: loginSecurityError } = trpc.users.loginSecurityStatus.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => { utils.users.list.invalidate(); toast.success("角色已更新"); },
    onError: (e) => toast.error(e.message),
  });
  const toggleActiveMutation = trpc.users.toggleActive.useMutation({
    onSuccess: () => { utils.users.list.invalidate(); toast.success("帳號狀態已更新"); },
    onError: (e) => toast.error(e.message),
  });
  const createMutation = trpc.users.create.useMutation({
    onSuccess: (result) => {
      utils.users.list.invalidate();
      toast.success(`帳號建立成功：${result.username}`);
      if (result.activationEmailSent) toast.success(`啟用通知信已寄至 ${result.recipientEmail}`);
      else toast.warning("帳號已建立，但啟用通知信寄送失敗，請從帳號管理手動重寄");
      setShowForm(false);
      reset();
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.users.delete.useMutation({
    onSuccess: () => { utils.users.list.invalidate(); toast.success("帳號已刪除"); setDeleteTarget(null); setDeleteConfirmationStep("preview"); setDeleteConfirmationText(""); },
    onError: (e: any) => toast.error(e.message),
  });
  const resetPasswordMutation = trpc.users.resetPassword.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      toast.success(auth.user?.isFounder ? "已產生新的臨時密碼（12 小時有效）；請以 PIN 驗證後查看或直接寄送" : "已產生新的臨時密碼（12 小時有效）；僅創始管理員可於 PIN 驗證後查看" );
    },
    onError: (error) => toast.error(error.message || "重設密碼失敗"),
  });
  const extendTemporaryPasswordExpiryMutation = trpc.users.extendTemporaryPasswordExpiry.useMutation({
    onSuccess: (result) => {
      utils.users.list.invalidate();
      toast.success(`臨時密碼效期已延長至 ${new Date(result.temporaryPasswordExpiresAt).toLocaleString("zh-TW", { hour12: false })}`);
    },
    onError: (error) => toast.error(error.message || "延長效期失敗"),
  });
  const batchSetTestAccountActiveMutation = trpc.users.batchSetTestAccountActive.useMutation({
    onSuccess: (result) => {
      setSelectedTestAccountIds([]);
      utils.users.list.invalidate();
      toast.success(`已批次更新 ${result.updatedCount} 個測試帳號`);
    },
    onError: (error) => toast.error(error.message),
  });
  const sendActivationCertificateMutation = trpc.users.sendActivationCertificate.useMutation({
    onSuccess: (result) => {
      toast.success(`帳號啟用書已寄送，編號：${result.certificateNumber}`);
      setActivationTarget(null);
      setActivationRecipientEmail("");
    },
    onError: (error) => toast.error(error.message || "帳號啟用書寄送失敗"),
  });
  const resendActivationCertificateMutation = trpc.users.resendActivationCertificate.useMutation({
    onSuccess: (result) => {
      utils.users.activationCertificateHistory.invalidate();
      toast.success(`啟用書已再次寄送至 ${result.recipientEmail}`);
    },
    onError: (error) => toast.error(error.message || "帳號啟用書再次寄送失敗"),
  });
  const createActivationCertificateDownloadMutation = trpc.activationCertificates.createDownload.useMutation({
    onSuccess: (result) => {
      const link = document.createElement("a");
      link.href = result.downloadUrl;
      link.target = "_blank";
      link.rel = "noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`已建立並開啟 ${result.fileName}`);
    },
    onError: (error) => toast.error(error.message || "PDF 匯出失敗"),
  });
  const unlockLoginMutation = trpc.users.unlockLoginAttempts.useMutation({
    onSuccess: () => {
      utils.users.loginSecurityStatus.invalidate();
      toast.success("登入鎖定已解除");
    },
    onError: (e) => toast.error(e.message),
  });
  const lockLoginMutation = trpc.users.lockLoginAttempts.useMutation({
    onSuccess: () => {
      utils.users.loginSecurityStatus.invalidate();
      toast.success("帳號登入已鎖定 15 分鐘");
    },
    onError: (e) => toast.error(e.message),
  });
  const verifyPinMutation = trpc.auditPin.verify.useMutation();
  const [showTempPassword, setShowTempPassword] = useState<{ userId: number; username: string } | null>(null);

  const { data: tempPasswordData, error: tempPasswordError, isLoading: isTempPasswordLoading } = trpc.users.getTempPassword.useQuery(
    { id: showTempPassword?.userId ?? 0 },
    { enabled: !!showTempPassword?.userId, staleTime: Infinity }
  );
  const { data: founderAccountDetails, error: founderAccountDetailsError, isLoading: isFounderAccountDetailsLoading } = trpc.users.founderAccountDetails.useQuery(
    { id: founderAccountDetailsTarget?.userId ?? 0 },
    { enabled: Boolean(founderAccountDetailsTarget?.userId), staleTime: 30_000 }
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateUserForm>({
    defaultValues: { role: "student", name: "", email: "" },
  });
  const canViewTestAccounts = auth.user?.role === "admin" && auth.user?.isFounder === true;

  const filtered = (users ?? []).filter((u: any) => {
    if (!canViewTestAccounts && u.isTestAccount) return false;
    const matchSearch = !search || (u.name ?? "").toLowerCase().includes(search.toLowerCase()) || (u.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    const matchAccountKind = accountKindFilter === "all" || (accountKindFilter === "test" ? u.isTestAccount : !u.isTestAccount);
    const matchFirstSetup = firstSetupFilter === "all" || (firstSetupFilter === "pending" ? u.isTemporaryPassword : !u.isTemporaryPassword);
    return matchSearch && matchRole && matchAccountKind && matchFirstSetup;
  });

  const visibleTestAccountIds = filtered.filter((user: any) => user.isTestAccount).map((user: any) => user.id);
  const areAllVisibleTestAccountsSelected = visibleTestAccountIds.length > 0 && visibleTestAccountIds.every((id) => selectedTestAccountIds.includes(id));
  const toggleTestAccountSelection = (id: number) => setSelectedTestAccountIds((current) => current.includes(id) ? current.filter((currentId) => currentId !== id) : [...current, id]);
  const toggleAllVisibleTestAccounts = () => setSelectedTestAccountIds((current) => areAllVisibleTestAccountsSelected ? current.filter((id) => !visibleTestAccountIds.includes(id)) : Array.from(new Set([...current, ...visibleTestAccountIds])));
  const runBatchStatusUpdate = (isActive: boolean) => {
    if (!selectedTestAccountIds.length) return;
    const verb = isActive ? "啟用" : "停用";
    if (window.confirm(`確認要批次${verb} ${selectedTestAccountIds.length} 個已選取的測試帳號嗎？此操作會寫入操作日誌`)) batchSetTestAccountActiveMutation.mutate({ ids: selectedTestAccountIds, isActive });
  };

  const securityByUserId = new Map((loginSecurityStatuses ?? []).map((status) => [status.userId, status]));

  return (
    <div className="animate-fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">帳號管理</h1>
          <p className="page-subtitle">USER MANAGEMENT</p>
        </div>
        <button onClick={() => { reset(); setShowForm(true); }} className="btn-primary text-xs">
          <UserPlus size={13} className="inline mr-1" />新增帳號
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(0.40_0_0)]" />
          <input
            className="industrial-input pl-8"
            placeholder="搜尋姓名或 Email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="industrial-input w-auto"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">全部角色</option>
          <option value="admin">管理員</option>
          <option value="teacher">教師</option>
          <option value="student">學生</option>
        </select>
        {canViewTestAccounts && <select className="industrial-input w-auto" value={accountKindFilter} onChange={(e) => { setAccountKindFilter(e.target.value as typeof accountKindFilter); setSelectedTestAccountIds([]); }}>
          <option value="all">全部帳號類型</option>
          <option value="test">僅測試帳號</option>
          <option value="standard">僅正式帳號</option>
        </select>}
        <select className="industrial-input w-auto" aria-label="首次設定狀態篩選" value={firstSetupFilter} onChange={(e) => setFirstSetupFilter(e.target.value as typeof firstSetupFilter)}>
          <option value="all">首次設定：全部</option>
          <option value="pending">尚未完成首次設定</option>
          <option value="completed">已完成首次設定</option>
        </select>
      </div>

      {/* Summary */}
      <div className="flex gap-4 mb-6">
        {["admin", "teacher", "student"].map((r) => (
          <div key={r} className="flex items-center gap-2">
            <RoleBadge role={r} />
            <span className="font-mono text-white text-sm">
              {(users ?? []).filter((u: any) => u.role === r).length}
            </span>
          </div>
        ))}
        {canViewTestAccounts && <div className="flex items-center gap-2"><FlaskConical size={15} className="text-amber-300" /><span className="label-caps">測試帳號</span><span className="font-mono text-white text-sm">{(users ?? []).filter((u: any) => u.isTestAccount).length}</span></div>}
        <div className="flex items-center gap-2"><KeyRound size={15} className="text-sky-300" /><span className="label-caps">待首次設定</span><span className="font-mono text-white text-sm">{(users ?? []).filter((u: any) => u.isTemporaryPassword).length}</span></div>
      </div>

      {canViewTestAccounts && selectedTestAccountIds.length > 0 && <div className="mb-4 flex flex-col gap-3 border border-amber-400/30 bg-amber-500/10 p-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-amber-100">已選取 {selectedTestAccountIds.length} 個測試帳號；批次操作只會調整登入啟用狀態，不會刪除資料</p><div className="flex gap-2"><button className="btn-secondary text-xs" disabled={batchSetTestAccountActiveMutation.isPending} onClick={() => runBatchStatusUpdate(false)}>批次停用</button><button className="btn-primary text-xs" disabled={batchSetTestAccountActiveMutation.isPending} onClick={() => runBatchStatusUpdate(true)}>批次啟用</button></div></div>}

      {/* Table */}
      <div className="brutalist-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-[oklch(0.30_0_0)] border-t-white animate-spin mx-auto mb-3" />
            <p className="label-caps">載入中</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p className="text-white font-bold mb-1">無符合條件的帳號</p>
            <p className="label-caps">嘗試調整搜尋條件</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{canViewTestAccounts ? <button type="button" onClick={toggleAllVisibleTestAccounts} disabled={!visibleTestAccountIds.length} className="inline-flex items-center gap-1 text-xs disabled:opacity-30" title="全選目前篩選結果中的測試帳號"><CheckSquare size={14} />選取</button> : "—"}</th>
                  <th>使用者</th>
                  <th>分類</th>
                  <th>角色</th>
                  <th>學號/部門</th>
                  <th>狀態</th>
                  <th>最後登入</th>
                  <th>登入安全</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u: any) => {
                  const security = securityByUserId.get(u.id);
                  const lockedUntil = security?.lockedUntil ? new Date(security.lockedUntil).getTime() : 0;
                  const remainingSeconds = lockedUntil ? Math.max(0, Math.ceil((lockedUntil - now) / 1000)) : 0;
                  const isLocked = remainingSeconds > 0;
                  const isExpiringSoon = Boolean(u.isTemporaryPassword && u.temporaryPasswordExpiresAt && new Date(u.temporaryPasswordExpiresAt).getTime() > now && new Date(u.temporaryPasswordExpiresAt).getTime() - now <= 60 * 60 * 1000);
                  return (
                  <tr key={u.id} className={u.isFounder ? "bg-[oklch(0.18_0_0)] opacity-75" : ""}>
                    <td>{canViewTestAccounts && u.isTestAccount ? <input aria-label={`選取測試帳號 ${u.username || u.id}`} type="checkbox" checked={selectedTestAccountIds.includes(u.id)} onChange={() => toggleTestAccountSelection(u.id)} className="h-4 w-4 accent-amber-400" /> : <span className="text-muted-foreground">—</span>}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-[oklch(0.22_0_0)] border border-[oklch(0.30_0_0)] flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-bold">{(u.name ?? "U").charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{u.name ?? "—"}</p>
                          <p className="label-caps">{u.email ?? "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td>{u.isTestAccount ? <span className="inline-flex items-center gap-1 rounded border border-amber-400/40 bg-amber-500/15 px-2 py-1 text-xs font-bold text-amber-100"><FlaskConical size={12} />測試帳號</span> : <span className="label-caps">正式帳號</span>}</td>
                    <td>
                      {u.isFounder ? (
                        <div className="flex items-center gap-2">
                          <RoleBadge role={u.role} />
                          <span className="label-caps rounded bg-[oklch(0.25_0.15_40)] px-2 py-1 text-xs font-bold text-[oklch(0.70_0.15_40)]">創始管理員</span>
                        </div>
                      ) : (
                      <div className="flex items-center gap-2">
                        <select
                          className="bg-transparent border border-[oklch(0.22_0_0)] px-2 py-1 text-xs uppercase tracking-wider text-[oklch(0.70_0_0)] transition-colors hover:border-[oklch(0.40_0_0)]"
                          value={u.role}
                          onChange={(e) => updateRoleMutation.mutate({ id: u.id, role: e.target.value as any })}
                        >
                          <option value="admin">管理員</option>
                          <option value="teacher">教師</option>
                          <option value="student">學生</option>
                        </select>
                      </div>
                      )}
                    </td>
                    <td>
                      <span className="label-caps">{u.studentId ?? u.department ?? "—"}</span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`status-badge ${u.isActive ? "status-available" : "status-retired"}`}>
                          {u.isActive ? "啟用" : "停用"}
                        </span>
                        {u.isTemporaryPassword && (!u.temporaryPasswordExpiresAt || new Date(u.temporaryPasswordExpiresAt).getTime() <= now) ? (
                          <span className="status-badge border border-rose-400/40 bg-rose-500/15 text-rose-100" title="臨時密碼已到期，需重設後才能登入或寄送">臨時密碼已到期</span>
                        ) : isExpiringSoon ? (
                          <span className="status-badge inline-flex items-center gap-1 border border-rose-400/70 bg-rose-500/20 font-bold text-rose-100 shadow-[0_0_0_1px_oklch(0.7_0.17_25/0.18)]" role="status" aria-label={`警告：${u.name ?? u.username ?? "帳號"}的臨時密碼即將到期`} title={`臨時密碼將於 ${new Date(u.temporaryPasswordExpiresAt).toLocaleString("zh-TW", { hour12: false })} 到期`}><TriangleAlert size={13} aria-hidden="true" />即將到期</span>
                        ) : u.isTemporaryPassword ? (
                          <span className="status-badge border border-amber-400/40 bg-amber-500/15 text-amber-100" title={u.temporaryPasswordExpiresAt ? `臨時密碼將於 ${new Date(u.temporaryPasswordExpiresAt).toLocaleString("zh-TW", { hour12: false })} 到期` : "舊有臨時密碼沒有期限資訊，請重設"}>臨時密碼有效</span>
                        ) : (
                          <span className="status-badge border border-sky-400/40 bg-sky-500/15 text-sky-100" title="使用者已完成密碼變更，系統不再保存臨時密碼">臨時密碼已失效</span>
                        )}
                      </div>
                    </td>
                    <td><span className="label-caps">{formatDate(u.lastSignedIn)}</span></td>
                    <td>
                      <div className="space-y-1 min-w-28">
                        {isLoginSecurityLoading ? (
                          <span className="label-caps text-[oklch(0.55_0_0)]">登入安全狀態載入中</span>
                        ) : loginSecurityError ? (
                          <span className="label-caps text-[oklch(0.72_0.17_25)]" title={loginSecurityError.message}>登入安全狀態載入失敗</span>
                        ) : <>
                        <p className="label-caps text-[oklch(0.63_0_0)]">失敗 {security?.attemptCount ?? 0} 次</p>
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-[oklch(0.75_0.18_25)]" title="帳號目前鎖定中">
                            <LockKeyhole size={12} />鎖定 {formatLockCountdown(remainingSeconds)}
                          </span>
                        ) : (
                          <span className="label-caps text-[oklch(0.56_0.10_145)]">正常</span>
                        )}
                        </>}
                      </div>
                    </td>
                    <td>
                      {u.isFounder ? (
                        <span className="label-caps text-[oklch(0.50_0_0)]" title="創始管理員帳號的操作內容已隱藏">受保護</span>
                      ) : (
                      <div className="flex gap-1 flex-wrap">
                        <button
                          disabled={!u.isActive || u.isTestAccount}
                          onClick={() => { setActivationTarget(u); setActivationRecipientEmail(u.email || ""); }}
                          className="p-1.5 transition-colors border border-transparent text-[oklch(0.45_0_0)] hover:text-sky-300 hover:border-sky-300 disabled:opacity-30 disabled:cursor-not-allowed"
                          title={u.isTestAccount ? "測試帳號不可寄送啟用書" : !u.isActive ? "請先啟用帳號" : "寄送帳號啟用書"}
                        >
                          <MailCheck size={13} />
                        </button>
                        <button
                          onClick={() => setActivationHistoryTarget(u)}
                          className="p-1.5 transition-colors border border-transparent text-[oklch(0.45_0_0)] hover:text-sky-300 hover:border-sky-300"
                          title="查看啟用書寄送歷程"
                        >
                          <History size={13} />
                        </button>
                        {auth.user?.isFounder && (
                          <button
                            type="button"
                            onClick={() => { setPendingFounderAccountDetail({ userId: u.id, displayName: u.name || u.username || `帳號 #${u.id}` }); setTempPasswordPinDialogOpen(true); }}
                            className="p-1.5 transition-colors border border-transparent text-[oklch(0.45_0_0)] hover:text-violet-300 hover:border-violet-300"
                            title="PIN 驗證後查看完整帳號資料"
                            aria-label={`查看 ${u.name || u.username || `帳號 #${u.id}`} 的完整帳號資料`}
                          >
                            <FileText size={13} />
                          </button>
                        )}
                        {auth.user?.isFounder && (
                          <button
                            onClick={() => { setPendingTempPasswordUser({ userId: u.id, username: u.username || `user_${u.id}` }); setTempPasswordPinDialogOpen(true); }}
                            className="p-1.5 transition-colors border border-transparent text-[oklch(0.45_0_0)] hover:text-[oklch(0.70_0.12_85)] hover:border-[oklch(0.70_0.12_85)]"
                            title="PIN 驗證後查看臨時密碼狀態"
                          >
                            <Eye size={13} />
                          </button>
                        )}
                        {isExpiringSoon && (
                          <button
                            type="button"
                            disabled={extendTemporaryPasswordExpiryMutation.isPending}
                            onClick={() => extendTemporaryPasswordExpiryMutation.mutate({ id: u.id })}
                            className="inline-flex items-center gap-1 border border-rose-400/60 bg-rose-500/15 px-2 py-1 text-xs font-bold text-rose-100 transition-colors hover:bg-rose-500/30 disabled:cursor-wait disabled:opacity-60"
                            title="一鍵延長臨時密碼效期 12 小時，並通知管理者"
                            aria-label={`一鍵延長 ${u.name ?? u.username ?? "帳號"} 的臨時密碼效期 12 小時`}
                          >
                            <Clock3 size={13} aria-hidden="true" />延長 12h
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={resetPasswordMutation.isPending}
                          onClick={() => {
                            if (window.confirm(`確認要為帳號「${u.username || u.name || `#${u.id}`}」重設密碼嗎？系統會立即產生新的臨時密碼（12 小時有效），原密碼將失效`)) {
                              resetPasswordMutation.mutate({ id: u.id }, { onSuccess: () => { setActivationTarget(u); setActivationRecipientEmail(u.email || ""); } });
                            }
                          }}
                          className={`p-1.5 transition-colors border ${isExpiringSoon ? "border-rose-400/60 bg-rose-500/15 text-rose-100 hover:bg-rose-500/30" : "border-transparent text-[oklch(0.45_0_0)] hover:text-[oklch(0.76_0.13_72)] hover:border-[oklch(0.76_0.13_72)]"} disabled:opacity-30 disabled:cursor-not-allowed`}
                          title={isExpiringSoon ? "即將到期：快速重設密碼" : "產生新的臨時密碼並使目前密碼失效"}
                          aria-label={isExpiringSoon ? `快速重設 ${u.name ?? u.username ?? "帳號"} 的密碼` : undefined}
                        >
                          <KeyRound size={13} />
                        </button>
                        <button
                          onClick={() => toggleActiveMutation.mutate({ id: u.id, isActive: !u.isActive })}
                          className={`p-1.5 transition-colors border border-transparent ${u.isActive ? "text-[oklch(0.45_0_0)] hover:text-[oklch(0.60_0.20_15)] hover:border-[oklch(0.60_0.20_15)]" : "text-[oklch(0.45_0_0)] hover:text-[oklch(0.70_0.14_145)] hover:border-[oklch(0.70_0.14_145)]"}`}
                          title={u.isActive ? "停用帳號" : "啟用帳號"}
                        >
                          {u.isActive ? <ShieldOff size={13} /> : <Shield size={13} />}
                        </button>
                        {auth.user?.isFounder && (
                          <>
                            <button
                              disabled={isLoginSecurityLoading || !!loginSecurityError || isLocked || lockLoginMutation.isPending}
                              onClick={() => lockLoginMutation.mutate({ id: u.id })}
                              className="p-1.5 transition-colors border border-transparent text-[oklch(0.45_0_0)] hover:text-[oklch(0.75_0.18_25)] hover:border-[oklch(0.75_0.18_25)] disabled:opacity-30 disabled:cursor-not-allowed"
                              title={isLoginSecurityLoading ? "登入安全狀態載入中" : loginSecurityError ? "登入安全狀態載入失敗" : isLocked ? "帳號目前已鎖定" : "鎖定登入 15 分鐘"}
                            >
                              <LockKeyhole size={13} />
                            </button>
                            <button
                              disabled={isLoginSecurityLoading || !!loginSecurityError || !isLocked || unlockLoginMutation.isPending}
                              onClick={() => unlockLoginMutation.mutate({ id: u.id })}
                              className="p-1.5 transition-colors border border-transparent text-[oklch(0.45_0_0)] hover:text-[oklch(0.70_0.15_40)] hover:border-[oklch(0.70_0.15_40)] disabled:opacity-30 disabled:cursor-not-allowed"
                              title={isLoginSecurityLoading ? "登入安全狀態載入中" : loginSecurityError ? "登入安全狀態載入失敗" : isLocked ? "解除登入鎖定" : "帳號目前未鎖定"}
                            >
                              <Unlock size={13} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => { setDeleteTarget({ id: u.id, username: u.username, name: u.name }); setDeleteConfirmationStep("preview"); setDeleteConfirmationText(""); }}
                          className="p-1.5 transition-colors border border-transparent text-[oklch(0.45_0_0)] hover:text-[oklch(0.70_0.20_25)] hover:border-[oklch(0.70_0.20_25)]"
                          title="刪除帳號"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
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

      <Dialog open={Boolean(activationTarget)} onOpenChange={(open) => { if (!open && !sendActivationCertificateMutation.isPending) { setActivationTarget(null); setActivationRecipientEmail(""); } }}>
        <DialogContent className="bg-[oklch(0.12_0_0)] border border-sky-400/35 rounded-none max-w-md text-white">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-white"><MailCheck className="text-sky-300" size={18} />寄送帳號啟用書</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="border border-sky-300/25 bg-sky-500/10 p-3 text-sm"><p className="label-caps text-sky-200">帳號啟用書對象</p><p className="mt-1 font-bold">{activationTarget?.name || activationTarget?.username || `帳號 #${activationTarget?.id}`}</p><p className="mt-1 text-xs text-slate-300">帳號：{activationTarget?.username || "未設定"} · 角色：{activationTarget?.role === "admin" ? "管理者" : activationTarget?.role === "teacher" ? "教師" : "學生"}</p></div>
            <div><label className="label-caps mb-1.5 block">指定收件信箱</label><input type="email" className="industrial-input" value={activationRecipientEmail} onChange={(event) => setActivationRecipientEmail(event.target.value)} placeholder="recipient@example.com" autoComplete="email" /></div>
            <p className="text-xs leading-5 text-slate-400">{activationTarget?.isTemporaryPassword ? "此帳號仍使用系統臨時密碼；電子郵件啟用書會在伺服器端受控解密後帶入該密碼，請僅寄給指定收件人PDF 與列印版永遠不含登入憑證" : "此帳號已更改密碼；電子郵件啟用書會清楚標示「用戶已更改密碼」，且不會包含任何登入憑證"}</p>
            <div className="flex items-center gap-1.5 border border-sky-300/20 bg-sky-500/5 p-2 text-xs text-sky-100"><Paperclip size={13} className="text-sky-300" />電子郵件將附加含圓形專屬章戳的啟用書 PDF</div>
            <div className="flex flex-wrap justify-between gap-2"><div className="flex flex-wrap gap-2"><button type="button" className="btn-secondary text-xs" onClick={() => activationTarget && setActivationPreviewTarget(activationTarget)}><FileText size={13} className="mr-1 inline" />預覽 PDF 附件</button><button type="button" className="btn-secondary text-xs" disabled={createActivationCertificateDownloadMutation.isPending} onClick={() => activationTarget && createActivationCertificateDownloadMutation.mutate({ accountId: activationTarget.id })}><FileDown size={13} className="mr-1 inline" />{createActivationCertificateDownloadMutation.isPending ? "產生中…" : "匯出 PDF"}</button></div><div className="flex gap-2"><button type="button" className="btn-secondary" disabled={sendActivationCertificateMutation.isPending} onClick={() => { setActivationTarget(null); setActivationRecipientEmail(""); }}>取消</button><button type="button" className="btn-primary" disabled={sendActivationCertificateMutation.isPending || !/^\S+@\S+\.\S+$/.test(activationRecipientEmail)} onClick={() => activationTarget && sendActivationCertificateMutation.mutate({ id: activationTarget.id, recipientEmail: activationRecipientEmail.trim() })}>{sendActivationCertificateMutation.isPending ? "寄送中…" : "確認寄送啟用書"}</button></div></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open && !deleteMutation.isPending) { setDeleteTarget(null); setDeleteConfirmationStep("preview"); setDeleteConfirmationText(""); } }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border border-red-400/35 bg-[oklch(0.12_0_0)] text-white sm:max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-white"><TriangleAlert className="text-red-300" size={18} />{deleteConfirmationStep === "preview" ? "刪除前相依資料預覽" : "二次確認刪除帳號"}</DialogTitle></DialogHeader>
          {isUserDeletePreviewLoading ? <p className="py-5 text-sm text-slate-400">正在計算相依資料…</p> : userDeletePreviewError ? <p role="alert" className="border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100">{userDeletePreviewError.message || "無法載入刪除預覽"}</p> : userDeletePreview ? <div className="space-y-4 pt-2"><div className="border border-red-300/25 bg-red-500/10 p-4"><p className="label-caps text-red-200">刪除帳號</p><p className="mt-1 font-bold text-white">{userDeletePreview.target.username || userDeletePreview.target.name || `帳號 #${userDeletePreview.target.id}`}</p><p className="mt-1 text-sm text-red-100/80">將影響 {userDeletePreview.dependentRecordCount} 筆相依資料；執行後無法復原</p></div>{userDeletePreview.dependencies.length ? <ul className="max-h-56 space-y-2 overflow-y-auto border border-slate-700 bg-slate-950/30 p-3 text-sm">{userDeletePreview.dependencies.map((entry) => <li key={entry.key} className="flex justify-between gap-3"><span>{entry.label}</span><span className="font-mono text-slate-300">{entry.count} 筆 · {entry.effect}</span></li>)}</ul> : <p className="border border-emerald-400/25 bg-emerald-500/10 p-3 text-sm text-emerald-100">未發現需清理的相依資料</p>}{deleteConfirmationStep === "confirm" && <label className="block text-sm text-slate-300">請輸入帳號 <strong className="text-white">{userDeletePreview.target.username || userDeletePreview.target.name}</strong> 以確認<input className="industrial-input mt-2" value={deleteConfirmationText} onChange={(event) => setDeleteConfirmationText(event.target.value)} autoFocus /></label>}<div className="flex gap-3"><button type="button" className="btn-danger flex-1" disabled={deleteMutation.isPending || (deleteConfirmationStep === "confirm" && deleteConfirmationText.trim() !== (userDeletePreview.target.username || userDeletePreview.target.name || ""))} onClick={() => deleteConfirmationStep === "preview" ? setDeleteConfirmationStep("confirm") : deleteTarget && deleteMutation.mutate({ id: deleteTarget.id, confirmed: true })}>{deleteMutation.isPending ? "刪除中…" : deleteConfirmationStep === "preview" ? "繼續二次確認" : "永久刪除帳號"}</button><button type="button" className="btn-secondary" disabled={deleteMutation.isPending} onClick={() => { setDeleteTarget(null); setDeleteConfirmationStep("preview"); setDeleteConfirmationText(""); }}>取消</button></div></div> : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(activationPreviewTarget)} onOpenChange={(open) => { if (!open) setActivationPreviewTarget(null); }}>
        <DialogContent className="bg-[oklch(0.12_0_0)] border border-sky-400/35 rounded-none max-w-4xl text-white">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-white"><FileText className="text-sky-300" size={18} />啟用書 PDF 附件預覽</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2"><p className="text-sm text-slate-300">這是伺服器端實際產生、即將附加至電子郵件的 PDF；不包含密碼、臨時密碼或驗證碼，並含圓形專屬章戳與可掃描的 QR Code 驗證連結</p>{isActivationPdfPreviewLoading ? <p className="border border-sky-300/25 bg-sky-500/5 p-4 text-sm text-sky-100">正在產生啟用書 PDF 附件預覽…</p> : activationPdfPreviewError ? <p className="border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{activationPdfPreviewError.message || "PDF 附件預覽產生失敗"}</p> : activationPdfPreview?.pdfDataUrl ? <iframe title="帳號啟用書 PDF 附件預覽" src={activationPdfPreview.pdfDataUrl} className="h-[60vh] w-full border border-sky-300/25 bg-white" /> : null}</div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(activationHistoryTarget)} onOpenChange={(open) => { if (!open) setActivationHistoryTarget(null); }}>
        <DialogContent className="bg-[oklch(0.12_0_0)] border border-sky-400/35 rounded-none max-w-lg text-white">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-white"><History className="text-sky-300" size={18} />啟用書寄送歷程</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2"><p className="text-sm text-slate-300">帳號：{activationHistoryTarget?.username || activationHistoryTarget?.name || `帳號 #${activationHistoryTarget?.id}`}</p>{isActivationHistoryLoading ? <p className="text-sm text-slate-400">正在載入寄送歷程…</p> : activationHistory?.length ? <div className="max-h-72 space-y-2 overflow-y-auto">{activationHistory.map((delivery) => <div key={delivery.id} className="border border-sky-300/20 bg-sky-500/5 p-3"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-xs text-sky-200">{delivery.certificateNumber}</p><p className="mt-1 text-sm">收件人：{delivery.recipientEmailMasked}</p><p className={`mt-1 inline-flex items-center gap-1 text-xs ${delivery.hasPdfAttachment ? "text-sky-200" : "text-slate-400"}`}><Paperclip size={12} />{delivery.hasPdfAttachment ? "已附加 PDF" : "未含 PDF 附件"}</p><p className="mt-1 text-xs text-slate-400">{new Date(delivery.sentAt).toLocaleString("zh-TW")}</p></div><button type="button" className="btn-secondary text-xs" disabled={resendActivationCertificateMutation.isPending} onClick={() => resendActivationCertificateMutation.mutate({ deliveryId: delivery.id })}><RotateCcw size={13} className="mr-1 inline" />再次寄送</button></div></div>)}</div> : <p className="border border-dashed border-slate-600 p-4 text-sm text-slate-400">尚無寄送紀錄</p>}<p className="text-xs leading-5 text-slate-500">歷程僅顯示遮罩收件信箱與附件狀態；再次寄送時，系統只會在伺服器端解密地址，前端不會取得完整地址</p></div>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); reset(); } }}>
        <DialogContent className="bg-[oklch(0.12_0_0)] border border-[oklch(0.22_0_0)] rounded-none max-w-md text-white">
          <DialogHeader>
            <DialogTitle className="text-white font-bold">新增帳號</DialogTitle>
          </DialogHeader>
          <form noValidate onSubmit={handleSubmit((d) => createMutation.mutate(d), () => toast.error("請先填寫所有標示 * 的必填欄位"))} className="space-y-4 mt-2">
            <div className="border border-sky-300/30 bg-sky-500/10 p-3 text-sm text-sky-100"><p className="font-semibold">系統自動產生帳號</p><p className="mt-1 text-xs leading-5 text-sky-100/80">建立後會依角色產生唯一帳號，並顯示在成功通知與使用者清單中</p></div>
            <div>
              <label className="label-caps mb-1.5 block">姓名 *</label>
              <input aria-label="姓名" aria-invalid={Boolean(errors.name)} className="industrial-input" {...register("name", { required: "請填寫姓名", validate: (value) => Boolean(value.trim()) || "請填寫姓名" })} placeholder="輸入姓名" required />
              {errors.name ? <p role="alert" className="form-field-error mt-1 text-xs">{errors.name.message}</p> : null}
            </div>
            <div>
              <label className="label-caps mb-1.5 block">Email *</label>
              <input type="email" aria-label="Email" aria-invalid={Boolean(errors.email)} className="industrial-input" {...register("email", { required: "請填寫 Email", validate: (value) => /^\S+@\S+\.\S+$/.test(value) || "請填寫有效的 Email" })} placeholder="name@example.com" required />
              {errors.email ? <p role="alert" className="form-field-error mt-1 text-xs">{errors.email.message}</p> : null}
            </div>
            <div>
              <label className="label-caps mb-1.5 block">角色 *</label>
              <select aria-label="角色" aria-invalid={Boolean(errors.role)} className="industrial-input" {...register("role", { required: "請選擇角色" })}>
                <option value="admin">管理員</option>
                <option value="teacher">教師</option>
                <option value="student">學生</option>
              </select>
              {errors.role ? <p role="alert" className="form-field-error mt-1 text-xs">{errors.role.message}</p> : null}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-caps mb-1.5 block">學號</label>
                <input className="industrial-input" {...register("studentId")} placeholder="選填" />
              </div>
              <div>
                <label className="label-caps mb-1.5 block">部門/班級</label>
                <input className="industrial-input" {...register("department")} placeholder="選填" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1" disabled={createMutation.isPending}>
                {createMutation.isPending ? "建立中..." : "建立帳號"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); reset(); }} className="btn-secondary">取消</button>
            </div>
          </form>
          {createMutation.data?.tempPassword && (
            <div className="mt-4 p-3 bg-[oklch(0.16_0_0)] border border-[oklch(0.30_0_0)] rounded-none">
              <p className="label-caps mb-2">臨時密碼已生成</p>
              <p className="text-sm font-mono bg-[oklch(0.10_0_0)] p-2 border border-[oklch(0.22_0_0)] text-[oklch(0.75_0.12_85)]">
                {createMutation.data.tempPassword}
              </p>
              <p className="text-xs text-[oklch(0.55_0_0)] mt-2">請將此密碼分享給使用者，首次登入後可修改密碼</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Show Temp Password Dialog */}
      <Dialog open={!!showTempPassword} onOpenChange={(o) => { if (!o) { setShowTempPassword(null); utils.users.getTempPassword.reset(); } }}>
        <DialogContent className="bg-[oklch(0.12_0_0)] border border-[oklch(0.22_0_0)] rounded-none max-w-md text-white">
          <DialogHeader>
            <DialogTitle className="text-white font-bold">臨時密碼</DialogTitle>
          </DialogHeader>
                          {isTempPasswordLoading ? (
            <div className="mt-2">
              <p className="text-sm text-[oklch(0.55_0_0)]">正在載入臨時密碼...</p>
            </div>
          ) : tempPasswordData?.tempPassword ? (
            <div className="mt-2">
              <p className="label-caps mb-2">帳號：{showTempPassword?.username}</p>
              <p className="text-sm font-mono bg-[oklch(0.10_0_0)] p-2 border border-[oklch(0.22_0_0)] text-[oklch(0.75_0.12_85)]">
                {tempPasswordData.tempPassword}
              </p>
              <p className="text-xs text-[oklch(0.55_0_0)] mt-2">此密碼僅在此視窗顯示；請安全轉交使用者，並提醒其首次登入後立即修改</p>
            </div>
          ) : tempPasswordData?.passwordChanged ? (
            <div className="mt-2 border border-sky-400/30 bg-sky-500/10 p-3 text-sm text-sky-100">
              用戶已更改密碼系統已清除臨時密碼密文，無法再次顯示或寄送
            </div>
          ) : tempPasswordData?.passwordExpired ? (
            <div className="mt-2 border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">
              臨時密碼已於 {tempPasswordData.expiresAt ? new Date(tempPasswordData.expiresAt).toLocaleString("zh-TW", { hour12: false }) : "先前"} 到期請使用重設按鈕產生新的 12 小時臨時密碼
            </div>
          ) : (
            <p className="text-sm text-[oklch(0.55_0_0)]">{tempPasswordError?.message || "無法獲取臨時密碼"}</p>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(founderAccountDetailsTarget)} onOpenChange={(open) => { if (!open) { setFounderAccountDetailsTarget(null); utils.users.founderAccountDetails.reset(); } }}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border border-violet-400/35 bg-[oklch(0.12_0_0)] text-white">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-white"><FileText className="text-violet-300" size={18} />帳號完整管理資料</DialogTitle></DialogHeader>
          {isFounderAccountDetailsLoading ? <p className="py-8 text-center text-sm text-slate-400">正在載入帳號詳細資料…</p> : founderAccountDetailsError ? <p className="border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{founderAccountDetailsError.message || "無法載入帳號詳細資料"}</p> : founderAccountDetails ? <div className="space-y-4 pt-2"><div className="border border-violet-300/25 bg-violet-500/10 p-4"><p className="label-caps text-violet-200">帳號對象</p><p className="mt-1 text-lg font-bold">{founderAccountDetails.name || founderAccountDetails.realName || founderAccountDetailsTarget?.displayName}</p><p className="mt-1 font-mono text-sm text-slate-300">{founderAccountDetails.username || "未設定自訂帳號"} · #{founderAccountDetails.id}</p></div><div className="grid gap-4 sm:grid-cols-2"><dl className="space-y-2 border border-slate-700 bg-slate-950/30 p-4 text-sm"><div><dt className="label-caps">角色與狀態</dt><dd className="mt-1 text-white">{founderAccountDetails.role === "admin" ? "管理者" : founderAccountDetails.role === "teacher" ? "教師" : "學生"} · {founderAccountDetails.isActive ? "啟用" : "停用"}</dd></div><div><dt className="label-caps">帳號分類</dt><dd className="mt-1 text-white">{founderAccountDetails.isFounder ? "創始管理員" : founderAccountDetails.isTestAccount ? "測試帳號" : "正式帳號"}</dd></div><div><dt className="label-caps">登入方式</dt><dd className="mt-1 text-white">{founderAccountDetails.loginMethod || "未記錄"}</dd></div><div><dt className="label-caps">臨時密碼狀態</dt><dd className="mt-1 text-white">{founderAccountDetails.isTemporaryPassword ? `有效至 ${founderAccountDetails.temporaryPasswordExpiresAt ? new Date(founderAccountDetails.temporaryPasswordExpiresAt).toLocaleString("zh-TW", { hour12: false }) : "未記錄"}` : "使用者已完成密碼變更"}</dd></div></dl><dl className="space-y-2 border border-slate-700 bg-slate-950/30 p-4 text-sm"><div><dt className="label-caps">電子郵件</dt><dd className="mt-1 break-all text-white">{founderAccountDetails.email || "未填寫"}</dd></div><div><dt className="label-caps">電話</dt><dd className="mt-1 text-white">{founderAccountDetails.phone || "未填寫"}</dd></div><div><dt className="label-caps">學號</dt><dd className="mt-1 text-white">{founderAccountDetails.studentId || "未填寫"}</dd></div><div><dt className="label-caps">部門／班級</dt><dd className="mt-1 text-white">{founderAccountDetails.department || "未填寫"}</dd></div></dl></div><div className="grid gap-4 sm:grid-cols-2"><dl className="space-y-2 border border-slate-700 bg-slate-950/30 p-4 text-sm"><div><dt className="label-caps">建立時間</dt><dd className="mt-1 text-white">{new Date(founderAccountDetails.createdAt).toLocaleString("zh-TW", { hour12: false })}</dd></div><div><dt className="label-caps">最後登入</dt><dd className="mt-1 text-white">{new Date(founderAccountDetails.lastSignedIn).toLocaleString("zh-TW", { hour12: false })}</dd></div><div><dt className="label-caps">最近資料更新</dt><dd className="mt-1 text-white">{new Date(founderAccountDetails.updatedAt).toLocaleString("zh-TW", { hour12: false })}</dd></div><div><dt className="label-caps">密碼最近變更</dt><dd className="mt-1 text-white">{founderAccountDetails.passwordChangedAt ? new Date(founderAccountDetails.passwordChangedAt).toLocaleString("zh-TW", { hour12: false }) : "未記錄"}</dd></div></dl><dl className="space-y-2 border border-slate-700 bg-slate-950/30 p-4 text-sm"><div><dt className="label-caps">失敗登入次數</dt><dd className="mt-1 text-white">{founderAccountDetails.loginSecurity.attemptCount} 次</dd></div><div><dt className="label-caps">登入鎖定</dt><dd className="mt-1 text-white">{founderAccountDetails.loginSecurity.isLocked ? `鎖定至 ${founderAccountDetails.loginSecurity.lockedUntil ? new Date(founderAccountDetails.loginSecurity.lockedUntil).toLocaleString("zh-TW", { hour12: false }) : "未記錄"}` : "正常"}</dd></div><div><dt className="label-caps">最後失敗紀錄</dt><dd className="mt-1 text-white">{founderAccountDetails.loginSecurity.lastAttemptAt ? new Date(founderAccountDetails.loginSecurity.lastAttemptAt).toLocaleString("zh-TW", { hour12: false }) : "未記錄"}</dd></div></dl></div><p className="border border-amber-400/25 bg-amber-500/10 p-3 text-xs leading-5 text-amber-100">此面板僅供已通過 PIN 驗證的創始管理員使用，並會寫入稽核紀錄為維護帳號安全，密碼、臨時密碼、PIN 碼、通行密鑰與外部識別碼不會在此顯示</p></div> : null}
        </DialogContent>
      </Dialog>
      <AuditPinDialog
        open={tempPasswordPinDialogOpen}
        onOpenChange={(open) => { setTempPasswordPinDialogOpen(open); if (!open) { setPendingTempPasswordUser(null); setPendingFounderAccountDetail(null); } }}
        onSuccess={() => {
          if (pendingTempPasswordUser) setShowTempPassword(pendingTempPasswordUser);
          if (pendingFounderAccountDetail) setFounderAccountDetailsTarget(pendingFounderAccountDetail);
          setPendingTempPasswordUser(null);
          setPendingFounderAccountDetail(null);
        }}
        onVerify={async (pin) => { await verifyPinMutation.mutateAsync({ pin }); }}
      />
    </div>
  );
}
