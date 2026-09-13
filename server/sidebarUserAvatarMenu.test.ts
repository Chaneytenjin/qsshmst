import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("側邊欄圓形頭像使用者選單", () => {
  it("移除頭像方形框線與自訂圖片，並以預設圓形識別作為唯一可見觸發器", () => {
    const layout = readFileSync("client/src/components/AppLayout.tsx", "utf8");
    const css = readFileSync("client/src/index.css", "utf8");

    expect(layout).toContain('session-sidebar-user-avatar h-9 w-9 shrink-0 overflow-hidden rounded-full');
    expect(layout).toContain('session-sidebar-user-avatar-fallback flex h-full w-full items-center justify-center rounded-full text-xs font-bold');
    expect(layout).not.toContain('user.avatarUrl ? <img');
    expect(layout).not.toContain('session-sidebar-user-avatar w-8 h-8 border');
    expect(css).toContain('.session-sidebar-user-avatar { background: transparent; }');
    expect(css).toContain('.session-sidebar-user-avatar-fallback { background: oklch(0.22 0 0); }');
  });

  it("支援桌面懸停、鍵盤聚焦與觸控點選固定的使用者操作面板", () => {
    const layout = readFileSync("client/src/components/AppLayout.tsx", "utf8");

    expect(layout).toContain('onMouseEnter={() => { if (!mobile) setUserMenuOpen(true); }}');
    expect(layout).toContain('const [userMenuPinned, setUserMenuPinned] = useState(false);');
    expect(layout).toContain('onMouseLeave={() => { if (!mobile && !userMenuPinned) setUserMenuOpen(false); }}');
    expect(layout).toContain('onFocusCapture={() => setUserMenuOpen(true)}');
    expect(layout).toContain('if (userMenuOpen && userMenuPinned)');
    expect(layout).toContain('setUserMenuPinned(true);');
    expect(layout).toContain('setUserMenuPinned(false);');
    expect(layout).toContain('const closeUserMenuOnEscape = (event: KeyboardEvent) => {');
    expect(layout).toContain('if (event.key !== "Escape") return;');
    expect(layout).toContain('closeUserMenuOnOutsidePointerDown');
    expect(layout).toContain('hover:!bg-transparent');
  });

  it("以原始圓滑個人選單呈現操作，並維持深淺主題下的清楚互動", () => {
    const css = readFileSync("client/src/index.css", "utf8");

    expect(css).toContain('border-radius: 1rem;');
    expect(css).toContain('.session-sidebar-user-popover::before { display: none; }');
    expect(css).toContain('border-radius: 0.65rem;');
    expect(css).toContain('.session-sidebar-user-popover-action:hover { background: oklch(0.58 0.10 210 / 0.12); }');
    expect(css).toContain('html:not(.dark) .session-sidebar-user-popover-action:hover { background: oklch(0.82 0.09 210 / 0.42); }');
  });

  it("限制導覽列與行動版側欄只能垂直捲動，同時保留桌面個人選單浮層可見性", () => {
    const layout = readFileSync("client/src/components/AppLayout.tsx", "utf8");

    expect(layout).toContain('session-sidebar hidden lg:flex flex-col');
    expect(layout).not.toContain('session-sidebar hidden overflow-x-hidden lg:flex flex-col');
    expect(layout).toContain('overflow-x-hidden overflow-y-auto overscroll-x-none touch-pan-y py-4');
    expect(layout).toContain('flex w-64 max-w-[85vw] flex-col overflow-x-hidden border-r');
  });

  it("在展開側欄的圓形頭像右側顯示使用者名稱與角色，收合時只保留頭像", () => {
    const layout = readFileSync("client/src/components/AppLayout.tsx", "utf8");

    expect(layout).toContain('session-sidebar-user-details min-w-0 flex-1');
    expect(layout).toContain('session-sidebar-user-name truncate text-sm font-medium');
    expect(layout).toContain('<RoleBadge role={user.role} className="session-sidebar-user-role-badge" />');
    expect(layout).toContain('collapsed ? "justify-center p-1" : "gap-3 -m-2 p-2"');
    expect(layout).toContain('{collapsed ? (');
  });

  it("移除 Logo 方框，收合時只在直接懸停 Logo 圖像或鍵盤聚焦時顯示展開控制", () => {
    const layout = readFileSync("client/src/components/AppLayout.tsx", "utf8");

    expect(layout).toContain('className="brand-logo sidebar-brand-logo h-9 w-9 rounded-full object-cover"');
    expect(layout).toContain('session-sidebar-brand-logo-frame h-10 w-10 overflow-hidden rounded-full');
    expect(layout).toContain('className="brand-logo sidebar-brand-logo h-full w-full rounded-full object-cover"');
    expect(layout).not.toContain('sidebar-brand-logo h-9 w-9 border');
    expect(layout).not.toContain('border border-white/15 bg-[oklch(0.18_0_0)]');
    expect(layout).toContain('sidebar-brand-toggle');
    expect(layout).toContain('group/logo relative h-9 w-9 shrink-0');
    expect(layout).toContain('relative h-10 w-10 shrink-0');
    expect(layout).toContain('opacity-0');
    expect(layout).toContain('group-hover/logo:opacity-100');
    expect(layout).toContain('group-focus-within/logo:opacity-100');
    expect(layout).not.toContain('group-hover:pointer-events-auto group-hover:opacity-100');
  });

  it("在展開側欄時將收合控制放於品牌文字右側，並顯示指定主標與副標", () => {
    const layout = readFileSync("client/src/components/AppLayout.tsx", "utf8");

    expect(layout).toContain('媒體服務隊</p>');
    expect(layout).toContain('清水高中</p>');
    expect(layout).toContain('className="sidebar-brand-toggle flex h-8 w-8 shrink-0 items-center justify-center rounded-md');
    expect(layout).not.toContain('器材、借用與稽核管理');
    expect(layout).not.toContain('媒體服務隊管理系統</p>');
    expect(layout).not.toContain('清水高中媒體服務隊管理系統</p>');
  });

  it("在淺色模式下提高側欄品牌與使用者身分資訊的文字對比", () => {
    const layout = readFileSync("client/src/components/AppLayout.tsx", "utf8");
    const css = readFileSync("client/src/index.css", "utf8");

    expect(layout).toContain('sidebar-brand-title text-white font-bold');
    expect(layout).toContain('className="session-sidebar-user-role-badge"');
    expect(css).toContain('html:not(.dark) .session-sidebar-brand .sidebar-brand-title');
    expect(css).toContain('html:not(.dark) .session-sidebar-user-details .session-sidebar-user-name');
    expect(css).toContain('html:not(.dark) .session-sidebar-user-role-badge');
  });

  it("移除側欄使用者名稱與身分資訊的外層框線與背景，但保留個人選單觸發器", () => {
    const layout = readFileSync("client/src/components/AppLayout.tsx", "utf8");
    const css = readFileSync("client/src/index.css", "utf8");

    expect(layout).toContain("session-sidebar-user-trigger flex w-full items-center");
    expect(css).toContain(".session-sidebar-user-trigger { border: 0 !important; background: transparent !important; box-shadow: none !important; }");
  });

  it("在 PIN 驗證後使用前端路由切換，避免完整重整造成側欄狀態遺失", () => {
    const layout = readFileSync("client/src/components/AppLayout.tsx", "utf8");

    expect(layout).toContain('const [location, setLocation] = useLocation();');
    expect(layout).toContain('setLocation(pendingNavPath);');
    expect(layout).not.toContain('window.location.href = pendingNavPath;');
  });
});
