import { useAuth } from "@/_core/hooks/useAuth";
import { Activity, ArrowUpRight, Cpu, ScanLine, ShieldCheck, Waypoints } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { BrandLogo } from "@/components/BrandLogo";
import { trpc } from "@/lib/trpc";

const systemNodes = [
  { code: "01", icon: ScanLine, title: "掃描借還", description: "掃描、確認、歸還，一站完成", accent: "text-cyan-200" },
  { code: "02", icon: ShieldCheck, title: "安全權限", description: "安全保護與完整操作稽核", accent: "text-emerald-200" },
  { code: "03", icon: Waypoints, title: "異動追蹤", description: "位置、檢驗與電子簽核可追溯", accent: "text-violet-200" },
];

const LOGIN_ROUTE_TRANSITION_KEY = "qingshui-login-route-transition";
const LOGIN_ROUTE_TRANSITION_MS = 160;
const HOME_BOOT_MS = 520;

export default function Home() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [isBooting, setIsBooting] = useState(true);
  const [isRoutingToLogin, setIsRoutingToLogin] = useState(false);
  const maintenanceStatus = trpc.systemMaintenance.status.useQuery(undefined, {
    staleTime: 15_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
  const systemMode = maintenanceStatus.data?.systemMode ?? (maintenanceStatus.data?.maintenanceMode ? "maintenance" : "online");
  const systemStatusLabel = systemMode === "maintenance"
    ? "SYSTEM MAINTENANCE"
    : systemMode === "offline"
      ? "SYSTEM OFFLINE"
      : "SYSTEM ONLINE";

  useEffect(() => {
    if (!loading && user) navigate("/dashboard");
  }, [user, loading]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const bootTimer = window.setTimeout(() => setIsBooting(false), prefersReducedMotion ? 0 : HOME_BOOT_MS);
    return () => window.clearTimeout(bootTimer);
  }, []);

  const handleLoginNavigation = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (isRoutingToLogin) return;
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.sessionStorage.setItem(LOGIN_ROUTE_TRANSITION_KEY, "true");
    setIsRoutingToLogin(true);
    window.setTimeout(() => navigate("/login"), prefersReducedMotion ? 0 : LOGIN_ROUTE_TRANSITION_MS);
  };

  return (
    <div className={`home-device-theme home-device-runtime relative flex min-h-screen flex-col overflow-hidden bg-[#06101d] text-white ${isBooting ? "is-booting" : "is-ready"} ${isRoutingToLogin ? "is-routing-to-login" : ""}`} aria-busy={isBooting || isRoutingToLogin}>
      <div className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[64rem] -translate-x-1/2 rounded-full bg-cyan-400/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-56 -right-20 h-[32rem] w-[32rem] rounded-full bg-indigo-500/15 blur-[110px]" />
      <div className="home-device-boot" role="status" aria-live="polite" aria-label="系統啟動中" data-testid="home-runtime-loader">
        <div className="home-device-boot-orbit" aria-hidden="true"><i /><i /><i /></div>
        <div className="home-device-boot-copy"><span>QSSH // STARTUP SEQUENCE</span><strong>正在初始化媒服管理系統</strong><em>VERIFYING ACCESS MODULES · READYING INTERFACE</em></div>
      </div>
      {isRoutingToLogin && <div className="home-login-route-transition" role="status" aria-live="polite" data-testid="home-login-route-transition"><div className="home-login-route-orbit" aria-hidden="true"><i /><i /></div><div><span>SECURE ACCESS ROUTE</span><strong>正在載入登入介面</strong><em>PREPARING CREDENTIAL GATEWAY</em></div></div>}

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center px-5 py-5 sm:px-8 lg:px-10">
        <div className="home-device-brand-lockup flex items-center gap-3">
          <div className="relative">
            <div className="absolute -inset-1.5 rounded-full bg-cyan-300/30 blur-md" />
            <BrandLogo data-testid="home-brand-logo" className="home-device-brand-logo relative h-14 w-14 rounded-full object-contain" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-wide text-white">清水高中媒體服務隊管理系統</p>
            <p className="home-device-brand-subtitle mt-0.5 font-mono text-[10px] tracking-[0.22em] text-cyan-200/70">QSSH MEDIA SERVICE MANAGEMENT SYSTEM</p>
          </div>
        </div>
      </header>

      <main className="home-device-main relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-5 pb-14 pt-12 sm:px-8 lg:px-10 lg:pb-20 lg:pt-16">
        <div className="grid items-center gap-12 lg:grid-cols-[1.18fr_0.82fr]">
          <section>
            <div className={`home-device-status is-${systemMode} mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 font-mono text-xs tracking-[0.14em] text-cyan-100`} aria-live="polite" data-system-mode={systemMode}>
              <span className="home-device-status-dot h-1.5 w-1.5 rounded-full bg-cyan-200" /><span className="home-device-status-label">{systemStatusLabel}</span>
            </div>
            <p className="home-device-eyebrow font-mono text-xs tracking-[0.28em] text-cyan-200/70">QING SHUI HIGH SCHOOL · MEDIA SERVICE</p>
            <div className="home-reference-stage mt-4">
              <h1 className="home-reference-title" data-testid="home-reference-title" aria-label="清水媒體服務隊第6屆">
                <span className="home-reference-title-primary">清水</span>
                <span className="home-reference-title-secondary">媒體服務隊</span>
                <span className="home-reference-edition-row">
                  <span className="home-reference-edition-accent home-reference-edition-accent--left" aria-hidden="true"><i /><b>✦</b></span>
                  <span className="home-reference-edition">第6屆</span>
                  <span className="home-reference-edition-accent home-reference-edition-accent--right" aria-hidden="true"><b>✦</b><i /></span>
                </span>
              </h1>
              <div className="home-reference-ornaments" aria-hidden="true" data-testid="home-reference-ornaments">
                <span className="home-reference-corner home-reference-corner--top-left" />
                <span className="home-reference-corner home-reference-corner--top-right" />
                <span className="home-reference-corner home-reference-corner--bottom-left" />
                <span className="home-reference-corner home-reference-corner--bottom-right" />
                <span className="home-reference-rec"><i />REC</span>
                <span className="home-reference-battery"><i /><b /><b /><b /></span>
              </div>
            </div>
            <div className="home-device-action-row mt-7 flex flex-wrap gap-3">
              <a href="/login" onClick={handleLoginNavigation} aria-busy={isRoutingToLogin} className="home-device-primary-action inline-flex items-center gap-2 rounded bg-cyan-200 px-5 py-3 text-sm font-black text-[#06101d] transition hover:-translate-y-0.5 hover:bg-white">登入媒服系統 <ArrowUpRight size={16} /></a>
            </div>
            <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3 border-t border-white/10 pt-5">
              <div><p className="home-device-stat-number font-mono text-xl font-bold text-cyan-200">01</p><p className="home-device-stat-label mt-1 text-xs text-slate-400">即時器材狀態</p></div>
              <div><p className="home-device-stat-number font-mono text-xl font-bold text-cyan-200">02</p><p className="home-device-stat-label mt-1 text-xs text-slate-400">安全檢驗流程</p></div>
              <div><p className="home-device-stat-number font-mono text-xl font-bold text-cyan-200">03</p><p className="home-device-stat-label mt-1 text-xs text-slate-400">完整軌跡追蹤</p></div>
            </div>
          </section>

          <aside className="home-device-panel home-device-introduction-panel relative overflow-hidden rounded-2xl border border-cyan-100/20 bg-slate-950/45 p-5 pb-4 shadow-[0_0_60px_rgba(56,189,248,0.13)] backdrop-blur sm:p-6 sm:pb-5">
            <div className="absolute right-0 top-0 h-28 w-28 bg-cyan-300/10 blur-3xl" />
            <div className="home-device-intro-header relative flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2"><Cpu size={18} className="home-device-intro-icon text-cyan-200" /><span className="home-device-intro-title font-mono text-xs tracking-[0.18em] text-cyan-100">SYSTEM INTRODUCTION</span></div>
              <Activity size={17} className="text-emerald-300" />
            </div>
            <div className="relative divide-y divide-white/10">
              {systemNodes.map(({ code, icon: Icon, title, description, accent }) => (
                <div key={code} className="home-device-intro-card group flex min-h-[5.75rem] items-center gap-4 py-5 last:pb-4">
                  <span className="home-device-code shrink-0 font-mono text-xs text-slate-500">{code}</span>
                  <Icon className={`home-device-intro-node-icon h-5 w-5 shrink-0 ${accent}`} size={19} aria-hidden="true" />
                  <div><p className="home-device-card-title font-bold text-white">{title}</p><p className="home-device-card-description mt-1 text-sm leading-6 text-slate-400">{description}</p></div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </main>

      <footer className="home-device-footer relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-3 border-t border-white/10 px-6 py-6 font-mono text-[10px] tracking-[0.14em] text-slate-500 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-2 sm:px-8 sm:py-4 lg:px-10">
        <span className="home-device-copyright inline-flex items-center gap-1.5 justify-self-start text-[10px] tracking-[0.1em] text-slate-400 sm:col-start-1">
          <span aria-hidden="true" className="home-device-copyright-symbol text-[11px] leading-none text-slate-300" style={{fontSize: '15px', paddingTop: '5px'}}>©</span>
          <span>2026 清水高中媒體服務隊</span>
        </span>
        <span className="home-device-version mt-0.5 justify-self-center sm:col-start-3 sm:mt-0 sm:justify-self-end">SYSTEM VERSION · V2.0</span>
      </footer>
    </div>
  );
}
