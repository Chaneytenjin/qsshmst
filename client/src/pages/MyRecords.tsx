import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { StatusBadge } from "@/components/StatusBadge";
import { History, AlertTriangle } from "lucide-react";
import { Link } from "wouter";

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit", year: "2-digit" });
}

function isOverdue(expectedReturnAt: Date | string, status: string) {
  if (status !== "active") return false;
  return new Date(expectedReturnAt) < new Date();
}

export default function MyRecords() {
  const [statusFilter, setStatusFilter] = useState("");

  const { data: records, isLoading } = trpc.borrowRecords.myList.useQuery({
    status: statusFilter || undefined,
  });

  return (
    <div className="animate-fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">我的借用記錄</h1>
          <p className="page-subtitle">MY BORROW RECORDS</p>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex gap-1 mb-6 flex-wrap">
        {[
          { value: "", label: "全部" },
          { value: "active", label: "借出中" },
          { value: "overdue", label: "逾期" },
          { value: "returned", label: "已歸還" },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`px-3 py-2 text-xs font-semibold tracking-widest uppercase border transition-all ${
              statusFilter === opt.value
                ? "bg-white text-black border-white"
                : "bg-transparent text-[oklch(0.55_0_0)] border-[oklch(0.25_0_0)] hover:border-[oklch(0.45_0_0)] hover:text-white"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Overdue Warning */}
      {records && records.some((r: any) => r.status === "overdue") && (
        <div className="flex items-center gap-3 p-4 mb-5 border border-[oklch(0.60_0.20_15)] bg-[oklch(0.60_0.20_15)/0.08]">
          <AlertTriangle size={16} className="text-[oklch(0.60_0.20_15)] flex-shrink-0" />
          <p className="text-sm text-[oklch(0.75_0_0)]">
            您有 <span className="font-bold text-[oklch(0.60_0.20_15)]">{records.filter((r: any) => r.status === "overdue").length}</span> 筆逾期未還的器材，請盡快歸還並聯繫管理人員
          </p>
        </div>
      )}

      {/* Table */}
      <div className="brutalist-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-[oklch(0.30_0_0)] border-t-white animate-spin mx-auto mb-3" />
            <p className="label-caps">載入中</p>
          </div>
        ) : !records || records.length === 0 ? (
          <div className="empty-state">
            <History size={32} className="mb-3 opacity-30" />
            <p className="text-white font-bold mb-2">尚無借用記錄</p>
            <Link href="/browse">
              <a className="btn-primary text-xs">前往瀏覽器材</a>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>器材</th>
                  <th>數量</th>
                  <th>借出日期</th>
                  <th>應還日期</th>
                  <th>實際歸還</th>
                  <th>狀態</th>
                  <th>備註</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec: any) => {
                  const overdue = isOverdue(rec.expectedReturnAt, rec.status);
                  return (
                    <tr key={rec.id}>
                      <td>
                        <p className="text-white text-sm font-medium">{rec.equipmentName}</p>
                        <p className="label-caps">#{rec.id}</p>
                      </td>
                      <td><span className="font-mono text-white">{rec.quantity}</span></td>
                      <td><span className="text-sm text-[oklch(0.70_0_0)]">{formatDate(rec.borrowedAt)}</span></td>
                      <td>
                        <span className={`text-sm font-medium ${overdue ? "text-[oklch(0.60_0.20_15)]" : "text-[oklch(0.70_0_0)]"}`}>
                          {formatDate(rec.expectedReturnAt)}
                          {overdue && <AlertTriangle size={11} className="inline ml-1" />}
                        </span>
                      </td>
                      <td>
                        <span className="text-sm text-[oklch(0.55_0_0)]">
                          {rec.actualReturnAt ? formatDate(rec.actualReturnAt) : "—"}
                        </span>
                      </td>
                      <td><StatusBadge status={rec.status} /></td>
                      <td>
                        <span className="text-xs text-[oklch(0.40_0_0)] max-w-28 truncate block">
                          {rec.returnNote ?? "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
