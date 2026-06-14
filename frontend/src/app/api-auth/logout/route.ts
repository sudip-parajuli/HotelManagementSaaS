import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import axios from "axios";

const BACKEND_URL = process.env.INTERNAL_BACKEND_URL || "http://127.0.0.1:8000";

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const refreshToken = cookieStore.get("refresh_token")?.value;

  // Even if tokens are missing, we still clear cookies and return OK to be safe
  if (!refreshToken) {
    cookieStore.delete("access_token");
    cookieStore.delete("refresh_token");
    return NextResponse.json({ message: "Successfully logged out (local)." });
  }

  try {
    const host = request.headers.get("host");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (host) {
      headers["Host"] = host;
    }
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    // Call backend to blacklist the token
    await axios.post(
      `${BACKEND_URL}/api/auth/logout/`,
      { refresh: refreshToken },
      { headers, validateStatus: () => true }
    );
  } catch (error) {
    console.error("Logout backend error:", error);
  } finally {
    // Always clear the local cookies
    cookieStore.delete("access_token");
    cookieStore.delete("refresh_token");
  }

  return NextResponse.json({ message: "Successfully logged out." });
}
