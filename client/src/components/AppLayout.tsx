import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { getVisibleNavigationItems, isNavigationPathActive } from "@/lib/navigationState";
import { readSidebarCollapsed, writeSidebarCollapsed } from "@/lib/sidebarPreference";
import { createScrollRetentionController } from "@/lib/scrollRetention";
import { isAuditCenterPath, SYSTEM_MANAGEMENT_ITEMS, SYSTEM_MANAGEMENT_OVERVIEW_PATH, SYSTEM_MANAGEMENT_PATHS } from "@/lib/systemManagementNavigation";
import { RoleBadge } from "./StatusBadge";
import { AuditPinDialog } from "./AuditPinDialog";
import { SystemReportDialog } from "./SystemReportDialog";
import { SystemReportNotification } from "./SystemReportNotification";
import { BorrowReturnReminderDialog } from "./BorrowReturnReminderDialog";
import { ReimbursementNotificationDialog } from "./ReimbursementNotificationDialog";
import { BrandLogo } from "./BrandLogo";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  History,
  LogOut,
  Menu,
  X,
  BookOpen,
  Settings,
  QrCode,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  Megaphone,
  ReceiptText,
  Moon,
  Sun,
  Monitor,
  CalendarDays,
  ClipboardPenLine,
  Podcast,
} from "lucide-react";

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  roles: string[];
}

interface NavItemWithFounder extends NavItem {
  founderOnly?: boolean;
}

const NAV_ITEMS: NavItemWithFounder[] = [
  { label: "總覽", path: "/dashboard", icon: LayoutDashboard, roles: ["admin", "teacher", "student"] },
  { label: "器材管理", path: "/equipment", icon: Package, roles: ["admin", "teacher"] },
  { label: "器材瀏覽", path: "/browse", icon: BookOpen, roles: ["student"] },
  { label: "借用申請審核", path: "/requests", icon: ClipboardList, roles: ["admin", "teacher"] },
  { label: "借用記錄", path: "/records", icon: History, roles: ["admin", "teacher"] },
  { label: "我的申請", path: "/my-requests", icon: ClipboardList, roles: ["student"] },
  { label: "我的借用記錄", path: "/my-records", icon: History, roles: ["student"] },
  { label: "報帳", path: "/reimbursements", icon: ReceiptText, roles: ["admin", "teacher", "student"] },
  { label: "媒服行事曆", path: "/media-calendar", icon: CalendarDays, roles: ["admin", "teacher", "student"] },
  { label: "企劃申請", path: "/media-project-proposals", icon: ClipboardPenLine, roles: ["admin", "teacher", "student"] },
  { label: "Podcast", path: "/podcasts", icon: Podcast, roles: ["admin", "teacher", "student"] },
  { label: "器材借用（QR／Barcode）", path: "/qrcode-borrow-return", icon: QrCode, roles: ["admin", "teacher"] },
  { label: "系統報告", path: "/system-reports", icon: Megaphone, roles: ["admin", "teacher"] },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

const LOGOUT_TRANSITION_DURATION_MS = 1_800;
const IDLE_LOGOUT_TIMEOUT_MS = 30 * 60 * 1_000;
const SYSTEM_MODE_SYNC_INTERVAL_MS = 5_000;

function formatSystemModeCountdown(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1_000));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0 ? `${hours} 小時 ${minutes} 分 ${seconds} 秒` : `${minutes} 分 ${seconds} 秒`;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth();
  const { themeMode, setThemeMode } = useTheme();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return readSidebarCollapsed(window.localStorage);
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userMenuPinned, setUserMenuPinned] = useState(false);
  const userMenuAnchorRef = useRef<HTMLDivElement | null>(null);
  const desktopNavigationScrollRef = useRef(createScrollRetentionController());
  const mobileNavigationScrollRef = useRef(createScrollRetentionController());
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutStage, setLogoutStage] = useState<"securing" | "returning">("securing");
  const [logoutReason, setLogoutReason] = useState<"manual" | "idle" | "system">("manual");
  const [systemLogoutMode, setSystemLogoutMode] = useState<"maintenance" | "offline" | null>(null);
  const [systemNoticeNow, setSystemNoticeNow] = useState(() => Date.now());
  const logoutStartedAtRef = useRef<number | null>(null);
  const systemEvictionStartedRef = useRef(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pendingNavPath, setPendingNavPath] = useState<string | null>(null);
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      setLogoutStage("returning");
      const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const elapsed = Date.now() - (logoutStartedAtRef.current ?? Date.now());
      const remainingTransition = prefersReducedMotion ? 0 : Math.max(0, LOGOUT_TRANSITION_DURATION_MS - elapsed);
      window.setTimeout(() => {
        window.location.assign("/");
      }, remainingTransition);
    },
    onError: () => {
      logoutStartedAtRef.current = null;
      setIsLoggingOut(false);
    },
  });
  const verifyPinMutation = trpc.auditPin.verify.useMutation();
  const systemStatus = trpc.systemMaintenance.status.useQuery(undefined, {
    staleTime: SYSTEM_MODE_SYNC_INTERVAL_MS,
    refetchInterval: SYSTEM_MODE_SYNC_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    writeSidebarCollapsed(window.localStorage, desktopCollapsed);
  }, [desktopCollapsed]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const closeUserMenuOnOutsidePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !userMenuAnchorRef.current?.contains(event.target)) {
        setUserMenuOpen(false);
        setUserMenuPinned(false);
      }
    };
    document.addEventListener("pointerdown", closeUserMenuOnOutsidePointerDown);
    return () => document.removeEventListener("pointerdown", closeUserMenuOnOutsidePointerDown);
  }, [userMenuOpen]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const closeUserMenuOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setUserMenuOpen(false);
      setUserMenuPinned(false);
    };
    document.addEventListener("keydown", closeUserMenuOnEscape);
    return () => document.removeEventListener("keydown", closeUserMenuOnEscape);
  }, [userMenuOpen]);

  if (!user) return null;

  const visibleItems = getVisibleNavigationItems(NAV_ITEMS, user.role, user.isFounder);
  const visibleSystemManagementItems = user.role === "admin"
    ? getVisibleNavigationItems(SYSTEM_MANAGEMENT_ITEMS, user.role, user.isFounder)
    : [];
  const isSystemManagementActive = isNavigationPathActive(location, SYSTEM_MANAGEMENT_OVERVIEW_PATH) || visibleSystemManagementItems.some((item) => item.path === "/audit-center/login" ? isAuditCenterPath(location) : isNavigationPathActive(location, item.path));

  const closeMobileMenu = () => setMobileOpen(false);
  const toggleDesktopSidebar = () => setDesktopCollapsed((current) => !current);
  const recordNavigationScroll = useCallback((mobile: boolean, element: HTMLElement) => {
    (mobile ? mobileNavigationScrollRef : desktopNavigationScrollRef).current.save(element);
  }, []);
  const restoreNavigationScroll = useCallback((mobile: boolean, element: HTMLElement | null) => {
    if (!element) return;
    const controller = (mobile ? mobileNavigationScrollRef : desktopNavigationScrollRef).current;
    controller.restore(element);
    window.requestAnimationFrame(() => {
      if (element.isConnected) controller.restore(element);
    });
  }, []);

  const SidebarContent = ({ collapsed = false, mobile = false }: { collapsed?: boolean; mobile?: boolean }) => (
    <div className="flex flex-col h-full min-w-0">
      <div className={`session-sidebar-brand border-b ${collapsed ? "p-3" : "px-5 py-5"}`}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-3">
            <div className="group/logo relative h-9 w-9 shrink-0">
              <BrandLogo
                className="brand-logo sidebar-brand-logo h-9 w-9 rounded-full object-cover"
              />
            <button
              type="button"
              onClick={toggleDesktopSidebar}
              className={`sidebar-brand-toggle absolute inset-0 z-10 flex items-center justify-center rounded-full text-[oklch(0.55_0_0)] hover:bg-[oklch(0.12_0.02_220_/_0.86)] hover:text-white transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${mobile ? "" : "pointer-events-none opacity-0 group-hover/logo:pointer-events-auto group-hover/logo:opacity-100 group-focus-within/logo:pointer-events-auto group-focus-within/logo:opacity-100"}`}
              aria-label="展開側邊選單"
              aria-controls="desktop-navigation"
              aria-expanded={false}
              title="展開側邊選單"
            >
              <PanelLeftOpen size={18} />
            </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0">
              <div className="session-sidebar-brand-logo-frame h-10 w-10 overflow-hidden rounded-full">
                <BrandLogo
                  className="brand-logo sidebar-brand-logo h-full w-full rounded-full object-cover"
                />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="sidebar-brand-title text-white font-bold text-sm leading-tight truncate">媒體服務隊</p>
              <p className="label-caps mt-0.5 truncate">清水高中</p>
            </div>
            {!mobile && (
              <button
                type="button"
                onClick={toggleDesktopSidebar}
                className="sidebar-brand-toggle flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[oklch(0.55_0_0)] hover:bg-[oklch(0.18_0_0)] hover:text-white transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="收合側邊選單"
                aria-controls="desktop-navigation"
                aria-expanded={true}
                title="收合側邊選單"
              >
                <PanelLeftClose size={18} />
              </button>
            )}
            {mobile && (
              <button
                type="button"
                onClick={closeMobileMenu}
                className="h-8 w-8 flex items-center justify-center text-[oklch(0.55_0_0)] hover:bg-[oklch(0.18_0_0)] hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="關閉選單"
                aria-controls="mobile-navigation"
                aria-expanded={true}
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
      </div>

      <nav
        ref={(element) => restoreNavigationScroll(mobile, element)}
        onScroll={(event) => recordNavigationScroll(mobile, event.currentTarget)}
        className="flex-1 overflow-x-hidden overflow-y-auto overscroll-x-none touch-pan-y py-4"
        aria-label="主要導覽"
      >
        {!collapsed && <p className="label-caps px-5 mb-3">選單</p>}
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = isNavigationPathActive(location, item.path);
          const requiresPin = item.founderOnly && ["/login-audit", "/database-maintenance"].includes(item.path);
          const itemClassName = `sidebar-item ${collapsed ? "justify-center px-0" : ""} ${isActive ? "active" : ""}`;
          const labelClassName = collapsed ? "sr-only" : "flex-1";

          if (requiresPin) {
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => {
                  setPendingNavPath(item.path);
                  setPinDialogOpen(true);
                }}
                className={`w-full text-left ${itemClassName}`}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={15} strokeWidth={isActive ? 2 : 1.5} />
                <span className={labelClassName}>{item.label}</span>
              </button>
            );
          }

          return (
            <Link key={item.path} href={item.path}>
              <a
                className={itemClassName}
                onClick={closeMobileMenu}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={15} strokeWidth={isActive ? 2 : 1.5} />
                <span className={labelClassName}>{item.label}</span>
              </a>
            </Link>
          );
        })}

        {visibleSystemManagementItems.length > 0 && (
          <div className="mt-1">
            <Link href={SYSTEM_MANAGEMENT_OVERVIEW_PATH}>
              <a
                className={`sidebar-item ${collapsed ? "justify-center px-0" : ""} ${isSystemManagementActive ? "active" : ""}`}
                onClick={closeMobileMenu}
                aria-label="系統管理"
                aria-current={isNavigationPathActive(location, SYSTEM_MANAGEMENT_OVERVIEW_PATH) ? "page" : undefined}
                title={collapsed ? "系統管理" : undefined}
              >
                <Settings size={15} strokeWidth={isSystemManagementActive ? 2 : 1.5} />
                <span className={collapsed ? "sr-only" : "flex-1"}>系統管理</span>
              </a>
            </Link>
          </div>
        )}
      </nav>

      <div className={`session-sidebar-footer border-t ${collapsed ? "p-3" : "p-4"}`}>
        <div className={`session-sidebar-announcement-section mb-3 border-b pb-3 ${collapsed ? "" : ""}`}>
          <SystemReportNotification collapsed={collapsed} />
        </div>
        <div
          ref={userMenuAnchorRef}
          className="session-sidebar-user-menu-anchor"
          onMouseEnter={() => { if (!mobile) setUserMenuOpen(true); }}
          onMouseLeave={() => { if (!mobile && !userMenuPinned) setUserMenuOpen(false); }}
          onFocusCapture={() => setUserMenuOpen(true)}
          onBlurCapture={(event) => {
            const nextFocusedElement = event.relatedTarget;
            if (!userMenuPinned && (!(nextFocusedElement instanceof Node) || !event.currentTarget.contains(nextFocusedElement))) {
              setUserMenuOpen(false);
            }
          }}
        >
          <button
            type="button"
            className={`session-sidebar-user-trigger flex w-full items-center text-left transition-colors hover:!bg-transparent focus:outline-none ${collapsed ? "justify-center p-1" : "gap-3 -m-2 p-2"}`}
            onClick={() => {
              if (userMenuOpen && userMenuPinned) {
                setUserMenuOpen(false);
                setUserMenuPinned(false);
                return;
              }
              setUserMenuOpen(true);
              setUserMenuPinned(true);
            }}
            aria-label="使用者選單"
            aria-controls={mobile ? "mobile-user-actions" : "desktop-user-actions"}
            aria-expanded={userMenuOpen}
            title="使用者選單"
          >
            <div className="session-sidebar-user-avatar h-9 w-9 shrink-0 overflow-hidden rounded-full">
              <span className="session-sidebar-user-avatar-fallback flex h-full w-full items-center justify-center rounded-full text-xs font-bold">{(user.name ?? "U").charAt(0).toUpperCase()}</span>
            </div>
            {collapsed ? (
              <span className="sr-only">{user.name ?? "使用者"}的使用者選單</span>
            ) : (
              <>
                <div className="session-sidebar-user-details min-w-0 flex-1">
                  <p className="session-sidebar-user-name truncate text-sm font-medium">{user.name ?? "使用者"}</p>
                  <RoleBadge role={user.role} className="session-sidebar-user-role-badge" />
                </div>
              </>
            )}
          </button>
          {userMenuOpen && <div id={mobile ? "mobile-user-actions" : "desktop-user-actions"} data-testid="sidebar-user-popover" className={`session-sidebar-user-popover ${mobile ? "session-sidebar-user-popover-mobile" : ""}`} role="group" aria-label="使用者選單操作">
            <div className="session-sidebar-user-menu-section" data-user-menu-item="theme">
              <p className="session-sidebar-user-menu-title">主題</p>
              <div className="session-sidebar-theme-mode-group" role="group" aria-label="主題選擇">
                <button type="button" onClick={() => setThemeMode?.("light")} className={`session-sidebar-theme-mode ${themeMode === "light" ? "is-active" : ""}`} aria-label="淺色主題" aria-pressed={themeMode === "light"}><Sun size={13} /><span>淺色</span></button>
                <button type="button" onClick={() => setThemeMode?.("dark")} className={`session-sidebar-theme-mode ${themeMode === "dark" ? "is-active" : ""}`} aria-label="深色主題" aria-pressed={themeMode === "dark"}><Moon size={13} /><span>深色</span></button>
                <button type="button" onClick={() => setThemeMode?.("system")} className={`session-sidebar-theme-mode ${themeMode === "system" ? "is-active" : ""}`} aria-label="跟隨系統主題" aria-pressed={themeMode === "system"}><Monitor size={13} /><span>自動</span></button>
              </div>
            </div>
            <Link href="/profile">
              <a className="session-sidebar-user-action session-sidebar-user-popover-action" data-user-menu-item="settings" onClick={() => { setUserMenuOpen(false); setUserMenuPinned(false); closeMobileMenu(); }} aria-label="個人設定"><Settings size={14} /><span>個人設定</span></a>
            </Link>
            <button type="button" onClick={() => beginLogout()} disabled={logoutMutation.isPending || isLoggingOut} className="session-sidebar-user-action session-sidebar-user-popover-action" data-user-menu-item="logout" aria-label="登出"><LogOut size={14} /><span>登出</span></button>
          </div>}
        </div>
      </div>
    </div>
  );

  const handlePinVerifySuccess = () => {
    if (pendingNavPath) {
      if (pendingNavPath.startsWith("/audit-center/") || pendingNavPath === "/database-maintenance") {
        window.sessionStorage.setItem("qingshui-audit-pin-verified-at", Date.now().toString());
      }
      setLocation(pendingNavPath);
      setPendingNavPath(null);
      closeMobileMenu();
    }
  };

  const beginLogout = useCallback((reason: "manual" | "idle" | "system" = "manual", restrictedSystemMode: "maintenance" | "offline" | null = null) => {
    if (isLoggingOut) return;
    setUserMenuOpen(false);
    setUserMenuPinned(false);
    closeMobileMenu();
    logoutStartedAtRef.current = Date.now();
    setLogoutStage("securing");
    setLogoutReason(reason);
    setSystemLogoutMode(restrictedSystemMode);
    setIsLoggingOut(true);
    logoutMutation.mutate(reason === "system" && restrictedSystemMode ? { reason, systemMode: restrictedSystemMode } : { reason });
  }, [isLoggingOut, logoutMutation]);

  useEffect(() => {
    const systemMode = systemStatus.data?.systemMode ?? (systemStatus.data?.maintenanceMode ? "maintenance" : "online");
    if (user.isFounder || systemMode === "online") {
      systemEvictionStartedRef.current = false;
      return;
    }
    if (systemEvictionStartedRef.current || isLoggingOut) return;
    systemEvictionStartedRef.current = true;
    beginLogout("system", systemMode);
  }, [beginLogout, isLoggingOut, systemStatus.data?.maintenanceMode, systemStatus.data?.systemMode, user.isFounder]);

  const scheduledFor = systemStatus.data?.scheduledFor ? new Date(systemStatus.data.scheduledFor).getTime() : null;
  const showSystemModeNotice = Boolean(systemStatus.data?.isScheduled && scheduledFor && scheduledFor > systemNoticeNow);
  const scheduledSystemMode = systemStatus.data?.scheduledMode === "offline" ? "offline" : "maintenance";
  useEffect(() => {
    if (!showSystemModeNotice) return;
    const timer = window.setInterval(() => setSystemNoticeNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [showSystemModeNotice]);

  useEffect(() => {
    if (isLoggingOut) return;

    let inactivityTimer: number | null = null;
    const stopInactivityTimer = () => {
      if (inactivityTimer === null) return;
      window.clearTimeout(inactivityTimer);
      inactivityTimer = null;
    };
    const startInactivityTimer = () => {
      inactivityTimer = window.setTimeout(() => {
        inactivityTimer = null;
        beginLogout("idle");
      }, IDLE_LOGOUT_TIMEOUT_MS);
    };
    const restartInactivityTimerAfterActivity = () => {
      stopInactivityTimer();
      startInactivityTimer();
    };
    const activityEvents: Array<keyof WindowEventMap> = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart", "touchmove", "focus"];
    const handleVisibilityActivity = () => {
      if (document.visibilityState === "visible") restartInactivityTimerAfterActivity();
    };

    startInactivityTimer();
    activityEvents.forEach((eventName) => window.addEventListener(eventName, restartInactivityTimerAfterActivity, { passive: true }));
    document.addEventListener("visibilitychange", handleVisibilityActivity);
    return () => {
      stopInactivityTimer();
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, restartInactivityTimerAfterActivity));
      document.removeEventListener("visibilitychange", handleVisibilityActivity);
    };
  }, [beginLogout, isLoggingOut]);

  return (
    <div className="session-shell flex h-screen overflow-hidden">
      {isLoggingOut && <div className="logout-transition" role="status" aria-live="assertive" aria-label={logoutReason === "system" ? (systemLogoutMode === "offline" ? "系統離線中，工作階段已安全結束" : "系統維護中，工作階段已安全結束") : "正在安全登出並返回主畫面"} data-testid="logout-transition" data-logout-stage={logoutStage} data-logout-reason={logoutReason} data-system-mode={systemLogoutMode ?? undefined}><div className="logout-transition-grid" aria-hidden="true" /><div className="logout-transition-scanline" aria-hidden="true" /><div className="logout-transition-orbit logout-transition-orbit-one" aria-hidden="true" /><div className="logout-transition-orbit logout-transition-orbit-two" aria-hidden="true" /><div className="logout-transition-core"><BrandLogo className="h-14 w-14 object-cover" alt="清水媒體服務隊第 6 屆 Logo" /><p>{logoutStage === "securing" ? (logoutReason === "system" ? (systemLogoutMode === "offline" ? "系統離線中，正在安全結束工作階段" : "系統維護中，正在安全結束工作階段") : logoutReason === "idle" ? "閒置逾時，正在安全登出" : "安全登出中") : logoutReason === "system" ? (systemLogoutMode === "offline" ? "系統離線中" : "系統維護中") : "工作階段已結束"}</p><span>{logoutStage === "securing" ? (logoutReason === "system" ? `${systemLogoutMode === "offline" ? "SYSTEM OFFLINE" : "SYSTEM MAINTENANCE"} · SECURING SESSION` : logoutReason === "idle" ? "IDLE TIMEOUT · SECURING SESSION" : "SECURING SESSION TERMINATION") : "RETURNING TO SYSTEM HOME"}</span><div className="logout-transition-progress" aria-hidden="true"><i /></div></div></div>}
      <aside
        id="desktop-navigation"
        className={`session-sidebar hidden lg:flex flex-col border-r flex-shrink-0 transition-[width] duration-200 ease-out ${desktopCollapsed ? "w-16" : "w-56"}`}
        aria-label="桌面側邊選單"
      >
        <SidebarContent collapsed={desktopCollapsed} />
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 cursor-default"
            aria-label="關閉選單遮罩"
            onClick={closeMobileMenu}
          />
          <aside
            id="mobile-navigation"
            className="session-sidebar relative z-10 flex w-64 max-w-[85vw] flex-col overflow-x-hidden border-r"
          >
            <SidebarContent mobile />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="session-mobile-header lg:hidden flex items-center justify-between px-4 py-3 border-b">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="text-[oklch(0.55_0_0)] hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="開啟選單"
            aria-controls="mobile-navigation"
            aria-expanded={mobileOpen}
          >
            <Menu size={20} />
          </button>
          <div className="flex min-w-0 items-center gap-2">
            <BrandLogo
              data-testid="mobile-brand-logo"
              className="brand-logo h-7 w-7 flex-shrink-0 border border-white/15 object-cover"
            />
            <span className="truncate text-white text-sm font-bold tracking-wide">清水高中媒體服務隊管理系統</span>
          </div>
          <div className="w-5 flex-shrink-0" />
        </header>

        <main className="session-main flex-1 overflow-y-auto p-6 lg:p-8">
          {showSystemModeNotice && scheduledFor && <section className={`system-mode-notice system-mode-notice--${scheduledSystemMode} mb-5`} role="status" aria-live="polite" data-testid="system-mode-notice" data-system-mode={scheduledSystemMode}>
            <div className="min-w-0"><p className="font-mono text-xs font-bold tracking-[0.12em]">{scheduledSystemMode === "offline" ? "SYSTEM OFFLINE NOTICE" : "SYSTEM MAINTENANCE NOTICE"}</p><p className="mt-1 text-sm font-semibold">系統將於 {new Date(scheduledFor).toLocaleString("zh-TW")} 啟用{scheduledSystemMode === "offline" ? "離線" : "維護"}模式</p></div>
            <div className="shrink-0 text-right"><span className="block text-xs text-muted-foreground">即將安全登出</span><strong className="font-mono text-sm">{formatSystemModeCountdown(scheduledFor - systemNoticeNow)}</strong></div>
          </section>}
          {children}
        </main>
      </div>

      <AuditPinDialog
        open={pinDialogOpen}
        onOpenChange={setPinDialogOpen}
        onSuccess={handlePinVerifySuccess}
        onVerify={async (pin) => {
          await verifyPinMutation.mutateAsync({ pin });
        }}
      />
      <SystemReportDialog />
      <ReimbursementNotificationDialog />
      <BorrowReturnReminderDialog />
    </div>
  );
}
