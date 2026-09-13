import { describe, expect, it } from "vitest";
import { createScrollRetentionController } from "../client/src/lib/scrollRetention";

describe("側欄捲動位置保存", () => {
  it("保存使用者捲動位置並在側欄重新掛載後還原", () => {
    const retention = createScrollRetentionController();
    const originalNavigation = { scrollTop: 248 };
    const remountedNavigation = { scrollTop: 0 };

    retention.save(originalNavigation);
    retention.restore(remountedNavigation);

    expect(retention.getScrollTop()).toBe(248);
    expect(remountedNavigation.scrollTop).toBe(248);
  });

  it("不保存負數捲動位置，避免重新掛載時產生非預期回彈", () => {
    const retention = createScrollRetentionController();
    retention.save({ scrollTop: -12 });

    expect(retention.getScrollTop()).toBe(0);
  });
});
