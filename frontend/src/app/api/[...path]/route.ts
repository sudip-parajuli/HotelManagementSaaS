import { NextRequest, NextResponse } from "next/server";
import { backendHeaders } from "@/lib/server/backend";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function proxy(request: NextRequest, { params }: { params: { path: string[] } }) {
  const base = process.env.INTERNAL_BACKEND_URL || "http://127.0.0.1:8000";
  const origin = request.headers.get("origin");
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }
  const segments = params.path;
  if (segments.some(segment => !segment || segment === "." || segment === ".." || /[\\/]/.test(segment))) {
    return NextResponse.json({ error: "Invalid API path." }, { status: 400 });
  }
  const url = new URL(`${base.replace(/\/$/, "")}/api/${segments.map(encodeURIComponent).join("/")}/`);
  url.search = request.nextUrl.search;
  const headers = new Headers(backendHeaders(request.headers.get("host")));
  for (const key of ["content-type", "cookie", "authorization", "accept", "accept-language", "x-csrftoken"]) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
  try {
    const response = await fetch(url, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(),
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(55000),
    });
    const outputHeaders = new Headers();
    for (const key of ["content-type", "content-disposition", "retry-after", "allow", "www-authenticate"]) {
      const value = response.headers.get(key);
      if (value) outputHeaders.set(key, value);
    }
    outputHeaders.set("cache-control", "no-store");
    return new Response(response.body, { status: response.status, headers: outputHeaders });
  } catch {
    return NextResponse.json({ error: "The hotel API is temporarily unavailable. Please retry." }, { status: 502 });
  }
}

export { proxy as GET, proxy as HEAD, proxy as OPTIONS, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
