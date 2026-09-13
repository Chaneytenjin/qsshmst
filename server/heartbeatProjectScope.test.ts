import { afterEach, describe, expect, it, vi } from "vitest";
import { createHeartbeatJob } from "./_core/heartbeat";

describe("專案級 Heartbeat 背景工作", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("在獨立模式未設定外部排程服務時安全拒絕，而不偽造平台憑證", async () => {
    globalThis.fetch = vi.fn() as typeof fetch;

    await expect(createHeartbeatJob({
      name: "gmail-offline-command-test",
      cron: "0 * * * * *",
      path: "/api/scheduled/gmailOfflineCommand",
      description: "test",
    }, "")).rejects.toThrow("Heartbeat service URL is not configured");

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
