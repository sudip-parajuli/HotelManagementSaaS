import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
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
      // Forward the host header so django-tenants can identify the correct tenant schema
      headers["Host"] = host;
    }

    // Call the Django backend login endpoint
    const response = await axios.post(`${BACKEND_URL}/api/auth/login/`, body, {
      headers,
      validateStatus: () => true, // Handle errors gracefully
    });

    if (response.status !== 200) {
      return NextResponse.json(response.data, { status: response.status });
    }

    const { access, refresh, user } = response.data;

    // Set httpOnly cookies for access and refresh tokens
    const cookieStore = cookies();

    cookieStore.set("access_token", access, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60, // 15 minutes
    });

    cookieStore.set("refresh_token", refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error("Login route error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", code: "SERVER_ERROR", detail: {} },
      { status: 500 }
    );
  }
}
