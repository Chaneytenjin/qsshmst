import React, { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, BarChart3, Boxes, MapPin, RefreshCw, Route, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";

const trendConfig = {
  changes: { label: "異動次數", color: "oklch(0.72 0.14 210)" },
  equipmentCount: { label: "涉及器材", color: "oklch(0.77 0.14 155)" },
} satisfies ChartConfig;

const distributionConfig = {
  changes: { label: "位置相關異動", color: "oklch(0.78 0.14 72)" },
} satisfies ChartConfig;

const PIE_COLORS = ["oklch(0.72 0.14 210)", "oklch(0.76 0.14 155)", "oklch(0.78 0.14 72)", "oklch(0.68 0.16 20)", "oklch(0.70 0.12 290)", "oklch(0.74 0.12 40)"];

function currentMonthInput() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}`;
}

function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-");
  return `${year} 年 ${Number(monthNumber)} 月`;
}

export default function LocationAuditReport() {
  const [month, setMonth] = useState(currentMonthInput);
  const [equipmentId, setEquipmentId] = useState<number | undefined>(() => {
    const value = new URLSearchParams(window.location.search).get("equipmentId");
    const parsed = value ? Number(value) : undefined;
    return parsed !== undefined && Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  });
  const [location, setLocation] = useState("");
  const queryInput = useMemo(() => ({ month, ...(equipmentId ? { equipmentId } : {}), ...(location ? { location } : {}) }), [month, equipmentId, location]);
  const { data: equipmentList } = trpc.equipment.list.useQuery({});
  const { data: report, isLoading, error, refetch, isFetching } = trpc.equipment.getMonthlyLocationAuditSummary.useQuery(queryInput);

  const locationOptions = useMemo(() => Array.from(new Set([...(equipmentList ?? []).map((item: any) => item.location).filter(Boolean), ...(report?.locationBreakdown ?? []).map((item) => item.location)])).sort((a, b) => a.localeCompare(b, "zh-Hant")), [equipmentList, report?.locationBreakdown]);
  const topEquipment = report?.equipmentBreakdown.slice(0, 8) ?? [];
  const topLocations = report?.locationBreakdown.slice(0, 6) ?? [];
  const selectedMonthLabel = formatMonth(month);

  return (
    <main className="location-audit-report mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:px-8" aria-labelledby="location-audit-report-title">
      <section className="border border-cyan-300/25 bg-[oklch(0.13_0.01_225)] p-5 shadow-[0_18px_54px_oklch(0.05_0_0/0.35)] sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="label-caps text-cyan-200">EQUIPMENT LOCATION AUDIT · 12-MONTH VIEW</p>
            <h1 id="location-audit-report-title" className="mt-2 flex items-center gap-3 text-2xl font-black tracking-tight text-white sm:text-3xl"><BarChart3 className="text-cyan-200" size={29} />位置異動月度稽核</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[oklch(0.73_0.03_225)]">以選定月份為中心呈現跨器材與跨存放位置的異動彙總；趨勢圖保留前 12 個月的可比較範圍，協助辨識頻繁調度的器材與位置</p>
          </div>
          <button type="button" onClick={() => void refetch()} disabled={isFetching} className="inline-flex items-center justify-center gap-2 border border-cyan-200/60 bg-cyan-200/10 px-4 py-2.5 text-sm font-bold text-cyan-50 transition-colors hover:bg-cyan-200/20 disabled:cursor-wait disabled:opacity-60"><RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />重新載入</button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <label className="block"><span className="label-caps">稽核月份</span><input aria-label="稽核月份" type="month" value={month} onChange={(event) => setMonth(event.target.value || currentMonthInput())} className="industrial-input mt-2 w-full" /></label>
          <label className="block"><span className="label-caps">指定器材</span><select aria-label="指定器材" value={equipmentId ?? "all"} onChange={(event) => setEquipmentId(event.target.value === "all" ? undefined : Number(event.target.value))} className="industrial-input mt-2 w-full"><option value="all">所有器材</option>{(equipmentList ?? []).map((item: any) => <option key={item.id} value={item.id}>{item.name}{item.qrCodeId ? ` · ${item.qrCodeId}` : ""}</option>)}</select></label>
          <label className="block"><span className="label-caps">相關存放位置</span><select aria-label="相關存放位置" value={location || "all"} onChange={(event) => setLocation(event.target.value === "all" ? "" : event.target.value)} className="industrial-input mt-2 w-full"><option value="all">所有位置</option>{locationOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
        </div>
      </section>

      {error ? <section role="alert" className="mt-6 flex flex-wrap items-center justify-between gap-4 border border-rose-300/55 bg-rose-950/30 p-5 text-rose-100"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 shrink-0" size={20} /><div><p className="font-bold">月度稽核報表載入失敗</p><p className="mt-1 text-sm text-rose-200">{error.message || "請確認網路連線後重試"}</p></div></div><button type="button" onClick={() => void refetch()} className="border border-rose-200/60 px-3 py-2 text-sm font-bold hover:bg-rose-200/10">重試</button></section> : null}

      {isLoading ? <div className="mt-6 grid gap-5 lg:grid-cols-3"><div className="h-28 animate-pulse bg-[oklch(0.16_0.01_225)]" /><div className="h-28 animate-pulse bg-[oklch(0.16_0.01_225)]" /><div className="h-28 animate-pulse bg-[oklch(0.16_0.01_225)]" /><div className="h-72 animate-pulse bg-[oklch(0.16_0.01_225)] lg:col-span-2" /><div className="h-72 animate-pulse bg-[oklch(0.16_0.01_225)]" /></div> : report ? <>
        {(report.anomalousEquipment?.length ?? 0) > 0 ? <section role="alert" className="mt-6 border border-amber-300/55 bg-amber-950/30 p-5 text-amber-50"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 shrink-0 text-amber-200" size={22} /><div><h2 className="font-bold">器材位置異動達異常門檻</h2><p className="mt-1 text-sm text-amber-100">本月任一器材位置異動達 {report.locationMovementAlertThreshold} 次即列為異常，系統已通知管理員</p><p className="mt-2 text-sm">{report.anomalousEquipment.map((item) => `${item.equipmentName}（${item.changes} 次）`).join("、")}</p></div></div></section> : null}
        <section className="mt-6 grid gap-4 md:grid-cols-3" aria-label={`${selectedMonthLabel}稽核摘要`}>
          <div className="border border-cyan-300/25 bg-[oklch(0.15_0.01_225)] p-5"><p className="label-caps">當月異動</p><p className="mt-2 flex items-end gap-2 text-4xl font-black text-white"><Route className="mb-1 text-cyan-200" size={25} />{report.totalChanges}</p><p className="mt-2 text-xs text-[oklch(0.67_0.03_225)]">{selectedMonthLabel}內符合條件的紀錄</p></div>
          <div className="border border-emerald-300/25 bg-[oklch(0.15_0.01_225)] p-5"><p className="label-caps">涉及器材</p><p className="mt-2 flex items-end gap-2 text-4xl font-black text-white"><Boxes className="mb-1 text-emerald-200" size={25} />{report.equipmentCount}</p><p className="mt-2 text-xs text-[oklch(0.67_0.03_225)]">至少有一筆位置異動的器材</p></div>
          <div className="border border-amber-300/25 bg-[oklch(0.15_0.01_225)] p-5"><p className="label-caps">關聯位置</p><p className="mt-2 flex items-end gap-2 text-4xl font-black text-white"><MapPin className="mb-1 text-amber-200" size={25} />{report.locationCount}</p><p className="mt-2 text-xs text-[oklch(0.67_0.03_225)]">出發或到達的存放位置</p></div>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.8fr)]">
          <article className="border border-cyan-300/25 bg-[oklch(0.14_0.01_225)] p-5"><div><h2 className="flex items-center gap-2 font-bold text-white"><TrendingUp size={18} className="text-cyan-200" />近 12 個月異動趨勢</h2><p className="label-caps mt-1">MONTHLY MOVEMENT &amp; EQUIPMENT COVERAGE</p></div><ChartContainer config={trendConfig} className="mt-5 h-72 w-full"><LineChart accessibilityLayer data={report.monthlyTrend} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} /><ChartTooltip content={<ChartTooltipContent />} /><ChartLegend content={<ChartLegendContent />} /><Line type="monotone" dataKey="changes" stroke="var(--color-changes)" strokeWidth={2.6} dot={{ r: 2.5, fill: "var(--color-changes)" }} activeDot={{ r: 5 }} /><Line type="monotone" dataKey="equipmentCount" stroke="var(--color-equipmentCount)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} /></LineChart></ChartContainer></article>
          <article className="border border-amber-300/25 bg-[oklch(0.14_0.01_225)] p-5"><div><h2 className="flex items-center gap-2 font-bold text-white"><MapPin size={18} className="text-amber-200" />位置分布</h2><p className="label-caps mt-1">ARRIVAL &amp; DEPARTURE TOUCHPOINTS</p></div>{topLocations.length ? <ChartContainer config={distributionConfig} className="mt-4 h-72 w-full"><PieChart accessibilityLayer><ChartTooltip content={<ChartTooltipContent nameKey="location" />} /><Pie data={topLocations} dataKey="changes" nameKey="location" innerRadius={46} outerRadius={84} paddingAngle={2}>{topLocations.map((entry, index) => <Cell key={entry.location} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}</Pie><ChartLegend content={<ChartLegendContent nameKey="location" />} /></PieChart></ChartContainer> : <div className="mt-6 border border-dashed border-[oklch(0.32_0.03_225)] p-8 text-center text-sm text-[oklch(0.67_0.03_225)]">此篩選條件下尚無位置異動紀錄</div>}</article>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-2">
          <article className="border border-emerald-300/25 bg-[oklch(0.14_0.01_225)] p-5"><div><h2 className="flex items-center gap-2 font-bold text-white"><Boxes size={18} className="text-emerald-200" />器材異動排行</h2><p className="label-caps mt-1">TOP EQUIPMENT BY SELECTED-MONTH MOVEMENTS</p></div>{topEquipment.length ? <ChartContainer config={distributionConfig} className="mt-5 h-72 w-full"><BarChart accessibilityLayer data={topEquipment} layout="vertical" margin={{ top: 6, right: 16, left: 16, bottom: 0 }}><CartesianGrid horizontal={false} strokeDasharray="3 3" /><XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} /><YAxis type="category" dataKey="equipmentName" width={100} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="changes" fill="var(--color-changes)" radius={[0, 3, 3, 0]} /></BarChart></ChartContainer> : <div className="mt-6 border border-dashed border-[oklch(0.32_0.03_225)] p-8 text-center text-sm text-[oklch(0.67_0.03_225)]">選定月份沒有器材異動</div>}</article>
          <article className="border border-violet-300/25 bg-[oklch(0.14_0.01_225)] p-5"><div><h2 className="flex items-center gap-2 font-bold text-white"><MapPin size={18} className="text-violet-200" />位置流向明細</h2><p className="label-caps mt-1">INCOMING / OUTGOING LOCATION ACTIVITY</p></div>{report.locationBreakdown.length ? <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[32rem] text-left text-sm"><thead className="border-b border-white/10 text-xs uppercase tracking-wider text-[oklch(0.62_0.03_225)]"><tr><th className="pb-3 font-semibold">位置</th><th className="pb-3 text-right font-semibold">相關異動</th><th className="pb-3 text-right font-semibold">流入</th><th className="pb-3 text-right font-semibold">流出</th><th className="pb-3 text-right font-semibold">器材</th></tr></thead><tbody>{report.locationBreakdown.map((entry) => <tr key={entry.location} className="border-b border-white/5 text-[oklch(0.86_0.02_225)]"><td className="py-3 font-medium text-white">{entry.location}</td><td className="py-3 text-right font-mono">{entry.changes}</td><td className="py-3 text-right"><span className="inline-flex items-center gap-1 text-emerald-200"><ArrowDownLeft size={13} />{entry.incomingCount}</span></td><td className="py-3 text-right"><span className="inline-flex items-center gap-1 text-amber-200"><ArrowUpRight size={13} />{entry.outgoingCount}</span></td><td className="py-3 text-right font-mono">{entry.equipmentCount}</td></tr>)}</tbody></table></div> : <div className="mt-6 border border-dashed border-[oklch(0.32_0.03_225)] p-8 text-center text-sm text-[oklch(0.67_0.03_225)]">選定月份沒有可彙整的位置流向</div>}</article>
        </section>
      </> : null}
    </main>
  );
}
