import { BrandLogo } from "@/components/BrandLogo";
import { trpc } from "@/lib/trpc";
import { BrowserQRCodeReader } from "@zxing/browser";
import { BadgeCheck, Camera, CircleStop, FileSearch, Loader2, Search, ShieldAlert, TriangleAlert } from "lucide-react";
import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";

function formatDate(value: Date | string) {
  return new Date(value).toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false });
}

function extractVerificationValue(value: string) {
  try {
    const url = new URL(value);
    return url.searchParams.get("code") || url.searchParams.get("certificateNumber") || value;
  } catch {
    return value;
  }
}

export default function CertificateVerify() {
  const initialCode = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("code") || "";
  const [value, setValue] = useState(initialCode);
  const [submittedValue, setSubmittedValue] = useState(initialCode);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerControlsRef = useRef<{ stop: () => void } | null>(null);
  const lookup = useMemo(() => submittedValue.startsWith("QSM-ACT-") ? { certificateNumber: submittedValue } : { code: submittedValue || "pending" }, [submittedValue]);
  const verification = trpc.activationCertificates.verify.useQuery(lookup, { enabled: Boolean(submittedValue), retry: false });

  useEffect(() => {
    if (!scannerOpen || !videoRef.current) return;
    let active = true;
    const start = async () => {
      try {
        setScannerError(null);
        const reader = new BrowserQRCodeReader();
        const controls = await reader.decodeFromConstraints({ video: { facingMode: { ideal: "environment" } } }, videoRef.current!, (result) => {
          if (!active || !result) return;
          const scannedValue = extractVerificationValue(result.getText());
          setValue(scannedValue);
          setSubmittedValue(scannedValue);
          setScannerOpen(false);
        });
        scannerControlsRef.current = controls;
        if (!active) controls.stop();
      } catch (error) {
        if (!active) return;
        const name = error instanceof Error ? error.name : "";
        setScannerError(name === "NotAllowedError" ? "未取得相機權限，請允許瀏覽器使用鏡頭後再試" : "無法啟動鏡頭掃描，請確認使用 HTTPS、相機可用，或改用手動輸入");
      }
    };
    void start();
    return () => {
      active = false;
      scannerControlsRef.current?.stop();
      scannerControlsRef.current = null;
    };
  }, [scannerOpen]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmittedValue(extractVerificationValue(value.trim()));
  };

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-white sm:px-8">
      <section className="mx-auto w-full max-w-2xl border border-[oklch(0.25_0_0)] bg-[oklch(0.12_0_0)] p-6 shadow-2xl sm:p-9">
        <div className="flex items-center gap-3 border-b border-[oklch(0.23_0_0)] pb-6">
          <BrandLogo className="h-11 w-11 border border-white/15 object-cover" />
          <div><p className="label-caps">QINGSHUI HIGH SCHOOL · MEDIA SQUAD</p><h1 className="mt-1 text-xl font-bold">啟用書文件驗證</h1></div>
        </div>
        <p className="mt-6 text-sm leading-6 text-slate-300">掃描啟用書上的 QR Code 會自動帶入驗證碼；亦可手動輸入完整啟用書編號驗證結果不會揭露帳號、姓名或其他個人資料</p>
        <form onSubmit={submit} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="certificate-query">QR 驗證碼或啟用書編號</label>
          <input id="certificate-query" value={value} onChange={(event) => setValue(event.target.value)} className="industrial-input flex-1 font-mono text-sm" placeholder="QSM-ACT-… 或 QR 驗證碼" autoComplete="off" />
          <button type="submit" className="btn-primary whitespace-nowrap" disabled={!value.trim()}><Search size={15} className="mr-1 inline" />驗證文件</button>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setScannerOpen((open) => !open)} className="inline-flex items-center gap-2 border border-sky-300/30 bg-sky-400/10 px-3 py-2 text-sm font-semibold text-sky-100 transition-colors hover:bg-sky-400/20">
            {scannerOpen ? <CircleStop size={16} /> : <Camera size={16} />}{scannerOpen ? "停止鏡頭掃描" : "使用手機鏡頭掃描 QR Code"}
          </button>
          <span className="text-xs text-slate-400">掃描後會自動驗證；不支援相機時可繼續使用手動輸入</span>
        </div>
        {scannerOpen && <div className="mt-4 overflow-hidden border border-sky-300/30 bg-black"><video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline /><div className="border-t border-sky-300/20 px-3 py-2 text-xs text-sky-100">請將啟用書上的 QR Code 置於鏡頭中央</div></div>}
        {scannerError && <div className="mt-3 flex items-start gap-2 border border-amber-300/30 bg-amber-500/10 p-3 text-sm text-amber-100"><TriangleAlert size={17} className="mt-0.5 shrink-0" />{scannerError}</div>}
        {verification.isLoading && <div className="mt-6 flex items-center gap-2 border border-sky-300/20 bg-sky-500/5 p-4 text-sm text-sky-100"><Loader2 size={16} className="animate-spin" />正在驗證文件…</div>}
        {verification.isError && <div className="mt-6 flex items-start gap-3 border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100"><ShieldAlert size={18} className="mt-0.5 shrink-0" />目前無法完成驗證，請稍後再試</div>}
        {verification.data?.isValid && <div className="mt-6 border border-emerald-300/35 bg-emerald-500/10 p-5"><div className="flex items-center gap-3"><BadgeCheck className="text-emerald-300" size={28} /><div><p className="font-bold text-emerald-100">文件驗證通過</p><p className="mt-1 text-xs text-emerald-200/80">此文件由清水高中媒體服務隊管理系統產生</p></div></div><dl className="mt-5 grid gap-3 border-t border-emerald-300/20 pt-4 text-sm sm:grid-cols-2"><div><dt className="label-caps">文件類型</dt><dd className="mt-1">{verification.data.documentType}</dd></div><div><dt className="label-caps">發行時間</dt><dd className="mt-1">{formatDate(verification.data.issuedAt)}</dd></div><div className="sm:col-span-2"><dt className="label-caps">啟用書編號</dt><dd className="mt-1 break-all font-mono text-sky-200">{verification.data.certificateNumber}</dd></div></dl></div>}
        {verification.data && !verification.data.isValid && verification.data.status === "not_found" && <div className="mt-6 flex items-start gap-3 border border-amber-300/30 bg-amber-500/10 p-4 text-sm text-amber-100"><FileSearch size={18} className="mt-0.5 shrink-0" />找不到有效的啟用書紀錄請確認文件編號或掃描正確的 QR Code</div>}
        {verification.data && !verification.data.isValid && verification.data.status !== "not_found" && <div className="mt-6 border border-red-300/35 bg-red-500/10 p-5 text-red-100"><div className="flex items-start gap-3"><ShieldAlert size={22} className="mt-0.5 shrink-0" /><div><p className="font-bold">此文件已{verification.data.status === "revoked" ? "撤銷" : "失效"}</p><p className="mt-1 text-sm text-red-100/80">文件編號：<span className="font-mono">{verification.data.certificateNumber}</span></p>{verification.data.reason && <p className="mt-3 border-l-2 border-red-300/60 pl-3 text-sm leading-6">原因：{verification.data.reason}</p>}</div></div></div>}
        <div className="mt-8 border-t border-[oklch(0.23_0_0)] pt-5 text-xs text-slate-500"><Link href="/" className="hover:text-slate-300">返回系統首頁</Link></div>
      </section>
    </main>
  );
}
