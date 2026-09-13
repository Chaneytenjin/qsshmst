import React, { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Mail, Plus, Power, Send, Trash2, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function formatTime(value: Date | string) {
  return new Date(value).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
}

export default function SystemAlertEmailRecipients() {
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [label, setLabel] = useState("");
  const alertEmail = trpc.systemAlertEmail.list.useQuery();
  const createRecipient = trpc.systemAlertEmail.createRecipient.useMutation({
    onSuccess: async () => {
      setEmail("");
      setLabel("");
      await utils.systemAlertEmail.list.invalidate();
      toast.success("已新增系統異常收件信箱");
    },
    onError: (error) => toast.error(error.message),
  });
  const setRecipientActive = trpc.systemAlertEmail.setRecipientActive.useMutation({
    onSuccess: () => utils.systemAlertEmail.list.invalidate(),
    onError: (error) => toast.error(error.message),
  });
  const deleteRecipient = trpc.systemAlertEmail.deleteRecipient.useMutation({
    onSuccess: () => {
      utils.systemAlertEmail.list.invalidate();
      toast.success("已刪除收件信箱");
    },
    onError: (error) => toast.error(error.message),
  });
  const sendTest = trpc.systemAlertEmail.sendTest.useMutation({
    onSuccess: async (result) => {
      await utils.systemAlertEmail.list.invalidate();
      if (result.recipients === 0) {
        toast.error("請先新增並啟用至少一個收件信箱");
      } else if (result.success) {
        toast.success(`測試通知已寄出：${result.sent} 封`);
      } else {
        toast.error(`測試通知完成，但有 ${result.failed} 封寄送失敗`);
      }
    },
    onError: (error) => toast.error(`測試寄送失敗：${error.message}`),
  });

  const submitRecipient = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createRecipient.mutate({ email, label: label || undefined });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="page-title">系統異常郵件通知</h1>
          <p className="page-subtitle">SYSTEM ALERT EMAIL RECIPIENTS</p>
        </div>
        <Button onClick={() => sendTest.mutate()} disabled={sendTest.isPending}>
          <Send className="mr-2" size={16} />
          {sendTest.isPending ? "寄送測試中…" : "傳送測試信"}
        </Button>
      </div>

      <Card className="border-amber-400/30 bg-amber-400/5">
        <CardContent className="flex gap-3 pt-6 text-sm text-amber-100">
          <AlertTriangle className="mt-0.5 shrink-0 text-amber-300" size={18} />
          <p>僅限創始管理員維護啟用的信箱會在系統偵測到已接入的異常時，收到由管理員 Gmail 寄出的通知；同類事件會在 15 分鐘內自動略過重複寄送</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mail size={18} />新增收件信箱</CardTitle>
          <CardDescription>建議使用可由管理團隊共同查看的信箱，避免通知遺漏</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-[1fr_220px_auto]" onSubmit={submitRecipient}>
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="alert-recipient-email">電子郵件</label>
              <Input id="alert-recipient-email" type="email" autoComplete="email" placeholder="alerts@example.edu.tw" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="alert-recipient-label">備註名稱</label>
              <Input id="alert-recipient-label" placeholder="資訊組" value={label} onChange={(event) => setLabel(event.target.value)} maxLength={128} />
            </div>
            <Button className="self-end" type="submit" disabled={createRecipient.isPending}>
              <Plus className="mr-2" size={16} />{createRecipient.isPending ? "新增中…" : "新增信箱"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>收件人清單</CardTitle>
          <CardDescription>停用後會保留設定與紀錄，但不再接收新的異常通知</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {alertEmail.isLoading ? <p className="p-6 text-sm text-muted-foreground">載入收件人中…</p> : alertEmail.error ? <p className="p-6 text-sm text-red-300">載入失敗：{alertEmail.error.message}</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>收件信箱</TableHead><TableHead>備註</TableHead><TableHead>狀態</TableHead><TableHead>更新時間</TableHead><TableHead className="text-right">管理</TableHead></TableRow></TableHeader>
              <TableBody>
                {alertEmail.data?.recipients.length ? alertEmail.data.recipients.map((recipient) => (
                  <TableRow key={recipient.id}>
                    <TableCell className="font-medium">{recipient.email}</TableCell>
                    <TableCell>{recipient.label || "—"}</TableCell>
                    <TableCell><span className={recipient.isActive ? "inline-flex items-center gap-1 text-emerald-400" : "inline-flex items-center gap-1 text-muted-foreground"}>{recipient.isActive ? <CheckCircle2 size={15} /> : <Power size={15} />}{recipient.isActive ? "啟用" : "停用"}</span></TableCell>
                    <TableCell>{formatTime(recipient.updatedAt)}</TableCell>
                    <TableCell className="text-right"><div className="flex justify-end gap-3"><Switch aria-label={`${recipient.isActive ? "停用" : "啟用"} ${recipient.email}`} checked={recipient.isActive} disabled={setRecipientActive.isPending} onCheckedChange={(isActive) => setRecipientActive.mutate({ id: recipient.id, isActive })} /><Button variant="ghost" size="icon" aria-label={`刪除 ${recipient.email}`} disabled={deleteRecipient.isPending} onClick={() => { if (window.confirm(`確定要刪除 ${recipient.email} 嗎？`)) deleteRecipient.mutate({ id: recipient.id }); }}><Trash2 className="text-red-300" size={16} /></Button></div></TableCell>
                  </TableRow>
                )) : <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">尚未設定任何異常通知收件信箱</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader><CardTitle>最近寄送紀錄</CardTitle><CardDescription>保留最近 30 筆系統異常通知的寄送結果</CardDescription></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>時間</TableHead><TableHead>收件信箱</TableHead><TableHead>主旨</TableHead><TableHead>結果</TableHead><TableHead>說明</TableHead></TableRow></TableHeader>
            <TableBody>
              {alertEmail.data?.deliveries.length ? alertEmail.data.deliveries.map((delivery) => (
                <TableRow key={delivery.id}>
                  <TableCell>{formatTime(delivery.createdAt)}</TableCell><TableCell>{delivery.recipientEmail}</TableCell><TableCell>{delivery.subject}</TableCell>
                  <TableCell>{delivery.status === "sent" ? <span className="inline-flex items-center gap-1 text-emerald-400"><CheckCircle2 size={15} />已寄出</span> : delivery.status === "suppressed" ? <span className="inline-flex items-center gap-1 text-amber-300"><AlertTriangle size={15} />已略過</span> : <span className="inline-flex items-center gap-1 text-red-300"><XCircle size={15} />失敗</span>}</TableCell>
                  <TableCell className="max-w-xs break-words text-xs text-muted-foreground">{delivery.errorDetail || "—"}</TableCell>
                </TableRow>
              )) : <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">尚無寄送紀錄</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
