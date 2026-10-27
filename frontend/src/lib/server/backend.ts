import "server-only";

/** Never override the HTTP Host used by a hosted backend's routing layer. */
export function backendHeaders(host: string | null): Record<string, string> {
  const secret = process.env.STAYWIRED_PROXY_SECRET;
  if (!host) return {};
  if (secret) return { "X-Staywired-Host": host.split(":")[0], "X-Staywired-Proxy-Secret": secret };
  // Preserve existing Docker/subdomain routing during local development.
  return process.env.NODE_ENV === "production" ? {} : { Host: host };
}
