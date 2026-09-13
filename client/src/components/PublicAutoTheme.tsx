import React, { useEffect } from "react";
import { applyDocumentTheme, getDeviceTheme } from "@/lib/publicTheme";

export function PublicAutoTheme({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncDeviceTheme = () => applyDocumentTheme(document.documentElement, getDeviceTheme(mediaQuery.matches));
    syncDeviceTheme();
    mediaQuery.addEventListener("change", syncDeviceTheme);
    return () => mediaQuery.removeEventListener("change", syncDeviceTheme);
  }, []);

  return <div data-public-theme="system">{children}</div>;
}
