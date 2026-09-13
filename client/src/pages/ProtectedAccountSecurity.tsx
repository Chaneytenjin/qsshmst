import React, { useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { AuditPinDialog } from "@/components/AuditPinDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, LockKeyhole, ShieldCheck, ShieldAlert, UsersRound } from "lucide-react";

const AUDIT_PIN_SESSION_KEY = "qingshui-audit-pin-verified-at";
const PIN_VALIDITY_MS = 30 * 60 * 1000;

function hasValidAuditPinSession() {
  if (typeof window === "undefined") return false;
  const verifiedAt = Number(window.sessionStorage.getItem(AUDIT_PIN_SESSION_KEY));
  return Number.isFinite(verifiedAt) && Date.now() - verifiedAt < PIN_VALIDITY_MS;
}

const permissions = [
  ["學生", "查看器材、提交借用與個人報帳", "不可進行管理或稽核"],
  ["教師", "管理器材、分類、借用審核與報帳審核", "不可刪除分類、管理帳號或查看稽核"],
  ["管理員", "帳號、器材、分類、付款與營運管理", "不可查看創始帳號敏感安全內容"],
  ["創始管理員", "所有管理權限、稽核中心、IP 黑名單與受保護帳號摘要", "須通過稽核認證 PIN 後方可查看敏感稽核資料"],
] as const;

export default function ProtectedAccountSecurity() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [pinVerified, setPinVerified] = useState(hasValidAuditPinSession);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const verifyPin = trpc.auditPin.verify.useMutation();
  const overview = trpc.protectedAccountSecurity.overview.useQuery(undefined, {
    enabled: Boolean(user?.isFounder && pinVerified),
    refetchInterval: 60_000,
  });

  const account = overview.data?.account;
  const security = overview.data?.loginSecurity;
  const loginPinSecurity = overview.data?.loginPinSecurity;
  const auditPinSecurity = overview.data?.auditPinSecurity;
  const loginSummary = overview.data?.loginSummary;
  const protectionItems = useMemo(() => [
    { label: "創始管理員身分", value: account?.isFounder ? "已受保護" : "未識別", active: Boolean(account?.isFounder) },
    { label: "登入 PIN", value: account?.hasLoginPin ? "已完成唯一初始設定" : "待下次登入初始設定", active: Boolean(account?.hasLoginPin) },
    { label: "稽核認證 PIN", value: account?.hasAuditPin ? "已完成唯一初始設定" : "待下次登入初始設定", active: Boolean(account?.hasAuditPin) },
    { label: "登入 PIN 鎖定", value: loginPinSecurity?.isLocked ? `鎖定中（${loginPinSecurity.remainingSeconds} 秒）` : "正常", active: !loginPinSecurity?.isLocked },
    { label: "稽核 PIN 鎖定", value: auditPinSecurity?.isLocked ? `鎖定中（${auditPinSecurity.remainingSeconds} 秒）` : "正常", active: !auditPinSecurity?.isLocked },
    { label: "雙因素驗證器", value: account?.twoFactorEnabled ? "已啟用" : "未啟用", active: Boolean(account?.twoFactorEnabled) },
  ], [account?.hasAuditPin, account?.hasLoginPin, account?.isFounder, account?.twoFactorEnabled, auditPinSecurity?.isLocked, auditPinSecurity?.remainingSeconds, loginPinSecurity?.isLocked, loginPinSecurity?.remainingSeconds]);

  if (!pinVerified) {
    return (
      <div className="container py-8">
        <Card className="mx-auto max-w-2xl border-amber-400/40 bg-[oklch(0.16_0.03_85)]">
          <CardHeader><CardTitle className="flex items-center gap-2 text-amber-100"><LockKeyhole size={20} />受保護帳號安全摘要</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-amber-100/80">此頁包含創始管理員的登入安全與受保護操作紀錄請先完成稽核認證 PIN 驗證</p>
            <Button className="mt-5" onClick={() => setPinDialogOpen(true)}>驗證稽核認證 PIN</Button>
          </CardContent>
        </Card>
        <AuditPinDialog open={pinDialogOpen} onOpenChange={setPinDialogOpen} onVerify={async (pin) => { await verifyPin.mutateAsync({ pin }); }} onSuccess={() => { window.sessionStorage.setItem(AUDIT_PIN_SESSION_KEY, String(Date.now())); setPinVerified(true); void utils.protectedAccountSecurity.overview.invalidate(); }} />
      </div>
    );
  }

  return (
    <div className="container space-y-7 py-8">
      <section className="border border-sky-400/35 bg-[linear-gradient(135deg,oklch(0.16_0.04_230),oklch(0.11_0_0))] p-6">
        <p className="label-caps text-sky-200">FOUNDER SECURITY CONTROL</p>
        <h1 className="mt-2 flex items-center gap-3 text-3xl font-bold text-white"><ShieldCheck className="text-sky-300" />受保護帳號安全摘要</h1>
        <p className="mt-2 text-sm text-[oklch(0.72_0_0)]">登入 PIN 與稽核認證 PIN 只會在創始管理員下次登入時進行一次性初始設定；設定完成後，系統不提供任何設定、重設或變更入口兩組 PIN 的雜湊、失敗計數與鎖定狀態均獨立保存</p>
      </section>

      {overview.isLoading ? <div className="h-56 animate-pulse bg-muted" /> : overview.error ? <Card className="border-red-400/45"><CardContent className="py-8 text-red-200">安全摘要載入失敗：{overview.error.message}</CardContent></Card> : <>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {protectionItems.map((item) => <Card key={item.label} className="border-white/10 bg-card"><CardContent className="pt-5"><p className="text-xs text-muted-foreground">{item.label}</p><p className={item.active ? "mt-2 text-lg font-bold text-emerald-400" : "mt-2 text-lg font-bold text-amber-300"}>{item.value}</p></CardContent></Card>)}
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><KeyRound size={18} />登入安全狀態</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><div className="flex justify-between gap-4"><span className="text-muted-foreground">受保護帳號</span><span>{account?.realName || account?.name || account?.username || "—"}</span></div><div className="flex justify-between gap-4"><span className="text-muted-foreground">最近登入</span><span>{loginSummary?.lastLoginAt ? new Date(loginSummary.lastLoginAt).toLocaleString("zh-TW") : "—"}</span></div><div className="flex justify-between gap-4"><span className="text-muted-foreground">近期登入成功／失敗</span><span className="font-mono">{loginSummary?.successful ?? 0}／{loginSummary?.failed ?? 0}</span></div><div className="flex justify-between gap-4"><span className="text-muted-foreground">帳密登入失敗計數</span><span className="font-mono">{security?.attemptCount ?? 0}</span></div></CardContent></Card>
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert size={18} />創始管理員操作保護稽核</CardTitle></CardHeader><CardContent>{overview.data?.protectedOperations.length ? <div className="max-h-56 space-y-2 overflow-y-auto">{overview.data.protectedOperations.map((entry) => <div key={entry.id} className="border-b border-border pb-2 text-sm last:border-0"><div className="flex justify-between gap-3"><span className="font-medium">{entry.action}</span><span className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString("zh-TW")}</span></div><p className="mt-1 text-xs text-muted-foreground">{entry.entityName || entry.entityType}</p></div>)}</div> : <p className="text-sm text-muted-foreground">尚無可顯示的受保護操作紀錄</p>}</CardContent></Card>
        </section>

        <Card><CardHeader><CardTitle className="flex items-center gap-2"><UsersRound size={18} />管理操作權限檢視表</CardTitle></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[42rem] text-left text-sm"><thead className="border-b border-border text-xs text-muted-foreground"><tr><th className="px-3 py-2">角色</th><th className="px-3 py-2">可執行管理操作</th><th className="px-3 py-2">保護邊界</th></tr></thead><tbody>{permissions.map(([role, capability, boundary]) => <tr key={role} className="border-b border-border/70 last:border-0"><td className="px-3 py-3"><Badge variant="outline">{role}</Badge></td><td className="px-3 py-3">{capability}</td><td className="px-3 py-3 text-muted-foreground">{boundary}</td></tr>)}</tbody></table></CardContent></Card>
      </>}
    </div>
  );
}
