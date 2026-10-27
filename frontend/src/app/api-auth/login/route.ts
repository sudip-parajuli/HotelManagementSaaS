import { backendHeaders } from "@/lib/server/backend";
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const BACKEND_URL = process.env.INTERNAL_BACKEND_URL || "http://127.0.0.1:8000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const host = request.headers.get("host");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (host) {
      Object.assign(headers, backendHeaders(host));
    }

    const response = await axios.post(`${BACKEND_URL}/api/auth/login/`, body, {
      headers,
      validateStatus: () => true,
    });

    if (response.status !== 200) {
      return NextResponse.json(response.data, { status: response.status });
    }

    const { access, refresh, user } = response.data;

    const res = NextResponse.json({ user });
    for (const key of ["original_access_token", "original_refresh_token", "impersonated_tenant_name", "impersonated_tenant_reason"]) res.cookies.delete(key);


    res.cookies.set("access_token", access, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
    });

    res.cookies.set("refresh_token", refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return res;
  } catch (error: any) {
    console.error("Login route error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", code: "SERVER_ERROR", detail: {} },
      { status: 500 }
    );
  }
}
