import { afterEach, describe, expect, it, vi } from "vitest";
import { formatIpLocation, resolveIpGeolocation } from "./ipGeolocation";

describe("IP geolocation", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("不會將私有或回送 IP 送往外部位置服務", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const location = await resolveIpGeolocation("192.168.1.9");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(location).toMatchObject({ source: "local-network", city: null });
    expect(formatIpLocation(location)).toBe("內部或保留網路位址");
  });

  it("將公開 IP 的國家、地區、城市與時區轉換為可顯示的網路位置", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, country: "United States", region: "California", city: "San Jose", timezone: { id: "America/Los_Angeles" }, connection: { asn: 15169, isp: "Google LLC", org: "Google LLC", domain: "google.com" } }),
    }));

    const location = await resolveIpGeolocation("8.8.8.8");
    expect(location).toMatchObject({ source: "ipwho.is", country: "United States", region: "California", city: "San Jose", timezone: "America/Los_Angeles", asn: "15169", isp: "Google LLC", organization: "Google LLC", domain: "google.com" });
    expect(formatIpLocation(location)).toBe("San Jose，California，United States");
  });

  it("地理位置服務無法使用時回傳可預期狀態而不拋出登入錯誤", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unavailable")));

    await expect(resolveIpGeolocation("198.51.100.7")).resolves.toMatchObject({ source: "unavailable", city: null });
  });
});
