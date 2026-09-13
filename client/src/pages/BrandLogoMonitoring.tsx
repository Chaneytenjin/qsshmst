import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatAuditActor } from "@/lib/utils";
import { AlertTriangle, ArrowRightLeft, MonitorSmartphone, PauseCircle, PlayCircle, RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

type DeviceFilter = "mobile" | "tablet" | "desktop" | "unknown" | "";

const deviceLabels: Record<Exclude<DeviceFilter, "">, string> = {
  mobile: "手機",
  tablet: "平板",
  desktop: "桌面",
  unknown: "未知",
};

const stageLabels: Record<"initial" | "retry" | "fallback", string> = {
  initial: "初次載入失敗",
  retry: "重試失敗",
  fallback: "啟用文字備援",
};

const outcomeLabels = { switched: "已切換備援圖片", text_fallback: "已顯示文字備援" } as const;

export default function BrandLogoMonitoring() {
  const utils = trpc.useUtils();
  const [deviceFilter, setDeviceFilter] = useState<DeviceFilter>("");
  const [page, setPage] = useState(1);
  const pageSize = 30;
  const { data, isLoading, error, refetch, isFetching } = trpc.brandLogoMonitoring.list.useQuery({
    deviceClass: deviceFilter || undefined,
    page,
    pageSize,
  });
  const { data: summary24h, isLoading: summaryLoading } = trpc.brandLogoMonitoring.summary24h.useQuery(undefined, { refetchInterval: 60_000 });
  const setMonitoring = trpc.brandLogoMonitoring.setAlertThreshold.useMutation({
    onSuccess: async (nextStatus) => {
      await Promise.all([refetch(), utils.brandLogoMonitoring.summary24h.invalidate()]);
      toast.success(nextStatus.isEnabled ? "Logo 異常監測已恢復" : "Logo 異常監測已暫時關閉；新異常不會記錄或通知 ");
    },
    onError: (mutationError) => toast.error(mutationError.message || "無法更新 Logo 異常監測狀態"),
  });

  const setFilter = (value: DeviceFilter) => {
    setDeviceFilter(value);
    setPage(1);
  };

  return (
    <div className="animate-fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">Logo 異常監測</h1>
          <p className="page-subtitle">BRAND ASSET HEALTH</p>
        </div>
        <button type="button" className="btn-secondary text-xs" onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCw size={13} className={isFetching ? "mr-1 inline animate-spin" : "mr-1 inline"} />重新整理
        </button>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="brutalist-card p-4">
          <p className="label-caps">已記錄異常事件</p>
          <p className="mt-2 text-3xl font-black text-white">{data?.total ?? 0}</p>
          <p className="mt-1 text-xs text-[oklch(0.58_0_0)]">依目前裝置篩選條件統計</p>
        </div>
        <div className="brutalist-card p-4">
          <p className="label-caps">監測規則</p>
          <p className="mt-2 flex items-center gap-2 text-sm font-medium text-white"><ShieldAlert size={16} className="text-[oklch(0.72_0.13_210)]" />最終備援時會通知系統擁有者</p>
          <p className="mt-1 text-xs text-[oklch(0.58_0_0)]">{summary24h?.alert?.isEnabled === false ? "目前已暫時關閉；新異常不會記錄或通知" : "初次失敗、重試失敗與備援啟用均會保留可稽核紀錄"}</p>
        </div>
        <div className="brutalist-card p-4" aria-label="近 24 小時 Logo 異常摘要">
          <p className="label-caps">近 24 小時異常</p>
          <p className="mt-2 text-3xl font-black text-[oklch(0.82_0.12_25)]">{summaryLoading ? "—" : summary24h?.total ?? 0}</p>
          <p className="mt-1 text-xs text-[oklch(0.58_0_0)]">已切換 {summary24h?.switched ?? 0} 次 · 文字備援 {summary24h?.textFallback ?? 0} 次</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <label className="text-xs text-[oklch(0.62_0_0)]">
          裝置類型
          <select
            aria-label="篩選 Logo 異常裝置類型"
            className="industrial-input mt-1 min-w-40 text-sm"
            value={deviceFilter}
            onChange={(event) => setFilter(event.target.value as DeviceFilter)}
          >
            <option value="">全部裝置</option>
            <option value="mobile">手機</option>
            <option value="tablet">平板</option>
            <option value="desktop">桌面</option>
            <option value="unknown">未知</option>
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-3"><p className="text-xs text-[oklch(0.55_0_0)]">僅創始管理員可查看與控制本頁資料</p><button type="button" className={summary24h?.alert?.isEnabled === false ? "inline-flex items-center gap-2 border border-emerald-300/60 bg-emerald-300/10 px-3 py-2 text-xs font-bold text-emerald-100 hover:bg-emerald-300/20" : "inline-flex items-center gap-2 border border-amber-300/60 bg-amber-300/10 px-3 py-2 text-xs font-bold text-amber-100 hover:bg-amber-300/20"} disabled={summaryLoading || setMonitoring.isPending || !summary24h?.alert} onClick={() => summary24h?.alert && setMonitoring.mutate({ thresholdCount: summary24h.alert.thresholdCount, isEnabled: !summary24h.alert.isEnabled })}>{summary24h?.alert?.isEnabled === false ? <PlayCircle size={15} /> : <PauseCircle size={15} />}{setMonitoring.isPending ? "更新中…" : summary24h?.alert?.isEnabled === false ? "恢復異常監測" : "暫時關閉異常監測"}</button></div>
      </div>

      {isLoading ? (
        <div className="space-y-3" data-testid="brand-logo-monitoring-loading">
          {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-16 w-full" />)}
        </div>
      ) : error ? (
        <div className="rounded-md border border-[oklch(0.55_0.16_25)] bg-[oklch(0.18_0.04_25)] px-5 py-8 text-center" role="alert">
          <AlertTriangle className="mx-auto mb-3 text-[oklch(0.82_0.1_25)]" size={24} />
          <p className="font-medium text-[oklch(0.9_0.1_25)]">Logo 異常紀錄載入失敗</p>
          <p className="mt-1 text-sm text-[oklch(0.7_0.06_25)]">{error.message || "請稍後重試"}</p>
          <button type="button" className="btn-secondary mt-4 text-xs" onClick={() => void refetch()}>重試載入</button>
        </div>
      ) : data?.events.length ? (
        <div className="brutalist-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table min-w-[1080px]">
              <thead>
                <tr>
                  <th>發生時間</th>
                  <th>裝置</th>
                  <th>階段</th>
                  <th>頁面</th>
                  <th>來源</th>
                  <th>備援切換狀態</th>
                  <th>回報者</th>
                </tr>
              </thead>
              <tbody>
                {data.events.map((event) => {
                  const reporter = event.reporterRealName || event.reporterName || event.reporterUsername ? formatAuditActor({ realName: event.reporterRealName || event.reporterName, username: event.reporterUsername }) : "未登入訪客";
                  return (
                    <tr key={event.id}>
                      <td className="whitespace-nowrap text-xs">{new Date(event.reportedAt).toLocaleString("zh-TW", { dateStyle: "medium", timeStyle: "short" })}</td>
                      <td><span className="inline-flex items-center gap-1"><MonitorSmartphone size={13} />{deviceLabels[event.deviceClass]}</span><span className="ml-1 text-xs text-[oklch(0.52_0_0)]">{event.viewportWidth ? `${event.viewportWidth}px` : ""}</span></td>
                      <td>{stageLabels[event.failureStage]}</td>
                      <td className="font-mono text-xs">{event.pagePath}</td>
                      <td className="max-w-72 truncate font-mono text-xs" title={event.failedSrc}>{event.failedSrc}</td>
                      <td><div className="flex min-w-56 flex-col gap-1"><span className={event.recoveryOutcome === "text_fallback" ? "inline-flex items-center gap-1 text-amber-200" : event.recoveryOutcome === "switched" ? "inline-flex items-center gap-1 text-emerald-200" : "text-[oklch(0.55_0_0)]"}>{event.recoveryOutcome === "switched" && <ArrowRightLeft size={13} />}{event.recoveryOutcome ? outcomeLabels[event.recoveryOutcome] : "舊版紀錄未提供"}</span>{event.fallbackSrc && <span className="max-w-56 truncate font-mono text-xs text-[oklch(0.58_0_0)]" title={event.fallbackSrc}>→ {event.fallbackSrc}</span>}</div></td>
                      <td>{reporter}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[oklch(0.22_0_0)] px-4 py-3 text-sm">
              <span className="text-[oklch(0.6_0_0)]">第 {data.page} / {data.totalPages} 頁</span>
              <div className="flex gap-2">
                <button type="button" className="btn-secondary text-xs" disabled={data.page <= 1} onClick={() => setPage((current) => current - 1)}>上一頁</button>
                <button type="button" className="btn-secondary text-xs" disabled={data.page >= data.totalPages} onClick={() => setPage((current) => current + 1)}>下一頁</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-[oklch(0.3_0_0)] px-5 py-12 text-center">
          <MonitorSmartphone className="mx-auto mb-3 text-[oklch(0.45_0_0)]" size={28} />
          <p className="font-medium text-white">尚無 Logo 載入異常紀錄</p>
          <p className="mt-1 text-sm text-[oklch(0.58_0_0)]">系統會在 Logo 初次載入、重試或備援階段失敗時自動記錄</p>
        </div>
      )}
    </div>
  );
}
