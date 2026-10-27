import { backendHeaders } from "@/lib/server/backend";
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const BACKEND_URL = process.env.INTERNAL_BACKEND_URL || "http://127.0.0.1:8000";

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;

  if (!refreshToken) {
    const res = NextResponse.json({ message: "Successfully logged out (local)." });
    res.cookies.delete("access_token");
    res.cookies.delete("refresh_token");
    for (const key of ["original_access_token", "original_refresh_token", "impersonated_tenant_name", "impersonated_tenant_reason"]) res.cookies.delete(key);

    return res;
  }

  try {
    const host = request.headers.get("host");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (host) {
      Object.assign(headers, backendHeaders(host));
    }
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    await axios.post(
      `${BACKEND_URL}/api/auth/logout/`,
      { refresh: refreshToken },
      { headers, validateStatus: () => true }
    );
  } catch (error) {
    console.error("Logout backend error:", error);
  }

  const res = NextResponse.json({ message: "Successfully logged out." });
  res.cookies.delete("access_token");
  res.cookies.delete("refresh_token");
    for (const key of ["original_access_token", "original_refresh_token", "impersonated_tenant_name", "impersonated_tenant_reason"]) res.cookies.delete(key);
  return res;
}
