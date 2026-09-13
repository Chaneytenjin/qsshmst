export type IpGeolocation = {
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  asn: string | null;
  isp: string | null;
  organization: string | null;
  domain: string | null;
  source: "ipwho.is" | "local-network" | "unavailable";
  resolvedAt: Date;
};

type IpWhoIsResponse = {
  success?: boolean;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  timezone?: { id?: string | null };
  connection?: { asn?: number | string | null; isp?: string | null; org?: string | null; domain?: string | null };
};

export function isPrivateOrReservedIp(address: string) {
  const ip = address.trim().replace(/^::ffff:/i, "");
  if (!ip || ip === "unknown" || ip === "::1" || ip === "0.0.0.0") return true;
  if (ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("169.254.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  return /^f[cd]/i.test(ip);
}

/**
 * Resolves a coarse network location. The result is an IP-derived estimate, never a precise physical location.
 * Any lookup error is intentionally converted to an "unavailable" value so that login succeeds normally.
 */
export async function resolveIpGeolocation(ipAddress: string | null | undefined): Promise<IpGeolocation> {
  const resolvedAt = new Date();
  const ip = ipAddress?.trim() ?? "";
  if (isPrivateOrReservedIp(ip)) {
    return { country: null, region: null, city: null, timezone: null, asn: null, isp: null, organization: null, domain: null, source: "local-network", resolvedAt };
  }

  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(2_000),
    });
    if (!response.ok) throw new Error(`IP location lookup failed with ${response.status}`);
    const data = await response.json() as IpWhoIsResponse;
    if (!data.success) throw new Error("IP location provider returned an unsuccessful response");
    return {
      country: data.country?.trim() || null,
      region: data.region?.trim() || null,
      city: data.city?.trim() || null,
      timezone: data.timezone?.id?.trim() || null,
      asn: data.connection?.asn === undefined || data.connection?.asn === null ? null : String(data.connection.asn).trim() || null,
      isp: data.connection?.isp?.trim() || null,
      organization: data.connection?.org?.trim() || null,
      domain: data.connection?.domain?.trim() || null,
      source: "ipwho.is",
      resolvedAt,
    };
  } catch (error) {
    console.warn("[IpGeolocation] Lookup unavailable", { ipAddress: ip, message: error instanceof Error ? error.message : String(error) });
    return { country: null, region: null, city: null, timezone: null, asn: null, isp: null, organization: null, domain: null, source: "unavailable", resolvedAt };
  }
}

export function formatIpLocation(location: Pick<IpGeolocation, "country" | "region" | "city" | "source">) {
  if (location.source === "local-network") return "內部或保留網路位址";
  const parts = [location.city, location.region, location.country].filter((part): part is string => Boolean(part));
  return parts.length ? parts.join("，") : "位置暫時無法取得";
}
