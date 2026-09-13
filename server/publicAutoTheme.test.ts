import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { applyDocumentTheme, getDeviceTheme } from "../client/src/lib/publicTheme";

describe("公開頁自動主題", () => {
  it("只依裝置偏好決定公開頁主題", () => {
    expect(getDeviceTheme(false)).toBe("light");
    expect(getDeviceTheme(true)).toBe("dark");
  });

  it("切換根節點主題時不寫入使用者主題偏好", () => {
    const classes = new Set<string>();
    const root = {
      classList: {
        toggle: (name: string, enabled: boolean) => enabled ? classes.add(name) : classes.delete(name),
      },
      dataset: {} as DOMStringMap,
    };

    applyDocumentTheme(root, "dark");
    expect(classes.has("dark")).toBe(true);
    expect(root.dataset.appliedTheme).toBe("dark");
    applyDocumentTheme(root, "light");
    expect(classes.has("dark")).toBe(false);
    expect(root.dataset.appliedTheme).toBe("light");
  });

  it("僅將首頁與登入頁包入公開頁自動主題邊界", () => {
    const app = readFileSync(resolve(import.meta.dirname, "../client/src/App.tsx"), "utf8");
    expect(app).toContain('<PublicAutoTheme><Home /></PublicAutoTheme>');
    expect(app).toContain('<PublicAutoTheme><Login /></PublicAutoTheme>');
    expect(app).toContain('<ProtectedRoute component={Dashboard} />');
  });
});
