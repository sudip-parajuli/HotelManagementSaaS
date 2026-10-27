import { backendHeaders } from "@/lib/server/backend";
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const BACKEND_URL = process.env.INTERNAL_BACKEND_URL || "http://127.0.0.1:8000";

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get("refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.json(
      { error: "Refresh token not found", code: "NO_REFRESH_TOKEN", detail: {} },
      { status: 401 }
    );
  }

  try {
    const host = request.headers.get("host");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (host) {
      Object.assign(headers, backendHeaders(host));
    }

    const response = await axios.post(
      `${BACKEND_URL}/api/auth/refresh/`,
      { refresh: refreshToken },
      { headers, validateStatus: () => true }
    );

    if (response.status !== 200) {
      const res = NextResponse.json(response.data, { status: response.status });
      res.cookies.delete("access_token");
      res.cookies.delete("refresh_token");
      return res;
    }

    const { access, refresh } = response.data;
    const res = NextResponse.json({ success: true });

    res.cookies.set("access_token", access, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
    });

    if (refresh) {
      res.cookies.set("refresh_token", refresh, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });
    }

    return res;
  } catch (error) {
    console.error("Refresh route error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", code: "SERVER_ERROR", detail: {} },
      { status: 500 }
    );
  }
}
