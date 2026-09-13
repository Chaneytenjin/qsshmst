import React from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getVisibleNavigationItems } from "@/lib/navigationState";
import { SYSTEM_MANAGEMENT_ITEMS } from "@/lib/systemManagementNavigation";
import { ArrowUpRight, LockKeyhole, Settings } from "lucide-react";
import { Link } from "wouter";

export default function SystemManagementOverview() {
  const { user } = useAuth();
  if (!user) return null;

  const visibleItems = getVisibleNavigationItems(SYSTEM_MANAGEMENT_ITEMS, user.role, user.isFounder);

  return (
    <section className="system-management-overview space-y-6" data-testid="system-management-overview">
      <header className="border-b border-border pb-5">
        <div className="flex items-start gap-3">
          <span className="system-management-overview-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-300/40 bg-cyan-300/10 text-cyan-200" aria-hidden="true">
            <Settings size={21} />
          </span>
          <div>
            <p className="label-caps">SYSTEM MANAGEMENT</p>
            <h1 className="page-title mt-1">系統管理</h1>
            <p className="page-subtitle normal-case tracking-normal">集中管理系統安全、維護、帳號與營運追蹤功能</p>
          </div>
        </div>
      </header>

      <section aria-labelledby="system-management-entry-title">
        <div className="mb-4 flex items-center gap-2">
          <h2 id="system-management-entry-title" className="system-management-overview-section-heading text-lg font-black">管理功能</h2>
          <span className="system-management-overview-count text-sm text-muted-foreground">{visibleItems.length} 項可用功能</span>
        </div>
        <div className="system-management-overview-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path}>
                <a className="system-management-overview-card group block h-full rounded-2xl border p-5 transition-[transform,box-shadow,border-color,background-color] duration-180 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2">
                  <div className="system-management-overview-card-content flex h-full flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <span className="system-management-overview-card-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border" aria-hidden="true"><Icon size={20} /></span>
                      <div className="system-management-overview-card-action flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold"><span>進入</span><ArrowUpRight size={14} className="transition-transform duration-180 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></div>
                    </div>
                    <h3 className="system-management-overview-card-title mt-5 flex items-center gap-2 text-lg font-black">{item.label}{item.founderOnly && <LockKeyhole size={14} className="text-amber-300" aria-label="僅創始管理員" />}</h3>
                    <p className="system-management-overview-card-description mt-2 text-sm leading-6">{item.description}</p>
                  </div>
                </a>
              </Link>
            );
          })}
        </div>
      </section>
    </section>
  );
}
