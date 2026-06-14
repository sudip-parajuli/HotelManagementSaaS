import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import axios from "axios";

const BACKEND_URL = process.env.INTERNAL_BACKEND_URL || "http://127.0.0.1:8000";

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const refreshToken = cookieStore.get("refresh_token")?.value;

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
      headers["Host"] = host;
    }

    const response = await axios.post(
      `${BACKEND_URL}/api/auth/refresh/`,
      { refresh: refreshToken },
      { headers, validateStatus: () => true }
    );

    if (response.status !== 200) {
      // If refresh fails, clear cookies
      cookieStore.delete("access_token");
      cookieStore.delete("refresh_token");
      return NextResponse.json(response.data, { status: response.status });
    }

    const { access, refresh } = response.data;

    cookieStore.set("access_token", access, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60, // 15 minutes
    });

    if (refresh) {
      cookieStore.set("refresh_token", refresh, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Refresh route error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", code: "SERVER_ERROR", detail: {} },
      { status: 500 }
    );
  }
}
