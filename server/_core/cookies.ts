import type { CookieOptions, Request } from "express";

export function getSessionCookieOptions(
  _req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  // const hostname = req.hostname;
  // const shouldSetDomain =
  //   hostname &&
  //   !LOCAL_HOSTS.has(hostname) &&
  //   !isIpAddress(hostname) &&
  //   hostname !== "127.0.0.1" &&
  //   hostname !== "::1";

  // const domain =
  //   shouldSetDomain && !hostname.startsWith(".")
  //     ? `.${hostname}`
  //     : shouldSetDomain
  //       ? hostname
  //       : undefined;

  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    // 自訂帳密登入一律以 Secure + SameSite=None 寫入工作階段 Cookie。
    // 清除時必須使用相同屬性；否則 Chrome 會拒絕不帶 Secure 的
    // SameSite=None Set-Cookie，導致本機登出後舊工作階段仍然存在。
    secure: true,
  };
}
