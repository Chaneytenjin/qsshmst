export const SIDEBAR_COLLAPSED_STORAGE_KEY = "qingshui-sidebar-collapsed";

export function readSidebarCollapsed(storage: Pick<Storage, "getItem"> | undefined): boolean {
  return storage?.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true";
}

export function writeSidebarCollapsed(storage: Pick<Storage, "setItem">, collapsed: boolean): void {
  storage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(collapsed));
}
