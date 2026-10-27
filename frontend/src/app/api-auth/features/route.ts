import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const BACKEND_URL = process.env.INTERNAL_BACKEND_URL || "http://127.0.0.1:8000";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;
  const host = request.headers.get("host");

  async function fetchFeatures(token: string) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (host) headers["Host"] = host;
    return axios.get(`${BACKEND_URL}/api/auth/features/`, {
      headers,
      validateStatus: () => true,
    });
  }

  async function attemptRefresh(refresh: string) {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (host) headers["Host"] = host;
      const res = await axios.post(
        `${BACKEND_URL}/api/auth/refresh/`,
        { refresh },
        { headers, validateStatus: () => true }
      );
      if (res.status === 200) {
        return { access: res.data.access, refresh: res.data.refresh || refresh };
      }
    } catch {}
    return null;
  }

  if (!accessToken) {
    if (refreshToken) {
      const refreshed = await attemptRefresh(refreshToken);
      if (refreshed) {
        const response = await fetchFeatures(refreshed.access);
        if (response.status === 200) {
          const res = NextResponse.json(response.data);
          res.cookies.set("access_token", refreshed.access, {
            httpOnly: true, secure: process.env.NODE_ENV === "production",
            sameSite: "lax", path: "/", maxAge: 15 * 60,
          });
          res.cookies.set("refresh_token", refreshed.refresh, {
            httpOnly: true, secure: process.env.NODE_ENV === "production",
            sameSite: "lax", path: "/", maxAge: 7 * 24 * 60 * 60,
          });
          return res;
        }
      }
    }
    return NextResponse.json({ features: [] });
  }

  try {
    let response = await fetchFeatures(accessToken);
    if (response.status === 401 && refreshToken) {
      const refreshed = await attemptRefresh(refreshToken);
      if (refreshed) {
        response = await fetchFeatures(refreshed.access);
        if (response.status === 200) {
          const res = NextResponse.json(response.data);
          res.cookies.set("access_token", refreshed.access, {
            httpOnly: true, secure: process.env.NODE_ENV === "production",
            sameSite: "lax", path: "/", maxAge: 15 * 60,
          });
          res.cookies.set("refresh_token", refreshed.refresh, {
            httpOnly: true, secure: process.env.NODE_ENV === "production",
            sameSite: "lax", path: "/", maxAge: 7 * 24 * 60 * 60,
          });
          return res;
        }
      }
      return NextResponse.json({ features: [] });
    }
    if (response.status !== 200) {
      return NextResponse.json({ features: [] });
    }
    return NextResponse.json(response.data);
  } catch {
    return NextResponse.json({ features: [] });
  }
}
