import React from "react";
import { BarChart3, FileText } from "lucide-react";
import { Link } from "wouter";

type SystemReportSection = "statistics" | "created";

const ITEMS: Array<{ key: SystemReportSection; href: string; label: string; description: string; icon: typeof BarChart3 }> = [
  { key: "statistics", href: "/system-reports/reading-statistics", label: "已發布報告閱讀統計", description: "查看報告閱讀與附件下載情形", icon: BarChart3 },
  { key: "created", href: "/system-reports/created-reports", label: "已建立的報告", description: "管理草稿、已發布與已封存報告", icon: FileText },
];

export function SystemReportSubnav({ active }: { active?: SystemReportSection }) {
  return (
    <nav className="system-reports-subnav grid gap-3 sm:grid-cols-2" aria-label="系統報告子頁">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = item.key === active;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={`system-reports-subnav-link group flex min-w-0 items-start gap-3 rounded-xl border p-4 transition-colors ${isActive ? "active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="system-reports-subnav-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
              <Icon size={17} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{item.label}</span>
              <span className="system-reports-subnav-description mt-1 block text-xs leading-5">{item.description}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function SystemReportBackLink() {
  return (
    <Link href="/system-reports" className="system-reports-back-link inline-flex items-center gap-2 text-sm font-semibold">
      <span aria-hidden="true">←</span>
      返回系統報告
    </Link>
  );
}
