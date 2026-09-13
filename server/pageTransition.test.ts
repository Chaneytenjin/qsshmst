import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PAGE_TRANSITION_DURATION_MS, shouldRunPageTransition } from "../client/src/lib/pageTransition";

describe("全站頁面切換過場", () => {
  it("僅在已切換路由且未要求減少動態時啟動短暫過場", () => {
    expect(PAGE_TRANSITION_DURATION_MS).toBe(240);
    expect(shouldRunPageTransition(false, false)).toBe(false);
    expect(shouldRunPageTransition(true, true)).toBe(false);
    expect(shouldRunPageTransition(true, false)).toBe(true);
  });

  it("將路由包覆在共用過場容器並保留圓滑通知介面", () => {
    const app = readFileSync(resolve(import.meta.dirname, "../client/src/App.tsx"), "utf8");
    expect(app).toContain("<PageTransition><Router /></PageTransition>");
    expect(app).toContain('borderRadius: "1rem"');
  });
});
