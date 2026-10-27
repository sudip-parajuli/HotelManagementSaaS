import { backendHeaders } from "@/lib/server/backend";
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const BACKEND_URL = process.env.INTERNAL_BACKEND_URL || "http://127.0.0.1:8000";

async function fetchProfile(accessToken: string, host: string | null) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
  if (host) {
    Object.assign(headers, backendHeaders(host));
  }
  return axios.get(`${BACKEND_URL}/api/auth/me/`, {
    headers,
    validateStatus: () => true,
  });
}

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;
  const host = request.headers.get("host");

  // Helper to build a response with cookies set
  async function getProfileResponse(access: string): Promise<NextResponse | null> {
    let response = await fetchProfile(access, host);
    if (response.status === 401 && refreshToken) {
      const refreshRes = await attemptRefresh(host, refreshToken);
      if (refreshRes) {
        response = await fetchProfile(refreshRes.access, host);
        const res = NextResponse.json(response.data);
        setTokenCookies(res, refreshRes.access, refreshRes.refresh);
        return res;
      }
      return null;
    }
    if (response.status !== 200) {
      return NextResponse.json(response.data, { status: response.status });
    }
    return NextResponse.json(response.data);
  }

  if (!accessToken) {
    if (refreshToken) {
      const refreshRes = await attemptRefresh(host, refreshToken);
      if (refreshRes) {
        const response = await fetchProfile(refreshRes.access, host);
        if (response.status === 200) {
          const res = NextResponse.json(response.data);
          setTokenCookies(res, refreshRes.access, refreshRes.refresh);
          return res;
        }
      }
    }
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED", detail: {} },
      { status: 401 }
    );
  }

  try {
    const result = await getProfileResponse(accessToken);
    if (result) return result;
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED", detail: {} },
      { status: 401 }
    );
  } catch (error) {
    console.error("Profile route error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", code: "SERVER_ERROR", detail: {} },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  let accessToken = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;
  const host = request.headers.get("host");

  if (!accessToken && refreshToken) {
    const refreshRes = await attemptRefresh(host, refreshToken);
    if (refreshRes) {
      accessToken = refreshRes.access;
    }
  }

  if (!accessToken) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED", detail: {} },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    };
    if (host) {
      Object.assign(headers, backendHeaders(host));
    }

    let response = await axios.put(`${BACKEND_URL}/api/auth/me/`, body, {
      headers,
      validateStatus: () => true,
    });

    if (response.status === 401 && refreshToken) {
      const refreshRes = await attemptRefresh(host, refreshToken);
      if (refreshRes) {
        headers["Authorization"] = `Bearer ${refreshRes.access}`;
        response = await axios.put(`${BACKEND_URL}/api/auth/me/`, body, {
          headers,
          validateStatus: () => true,
        });
      }
    }

    if (response.status !== 200) {
      return NextResponse.json(response.data, { status: response.status });
    }

    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Profile PUT route error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", code: "SERVER_ERROR", detail: {} },
      { status: 500 }
    );
  }
}

async function attemptRefresh(
  host: string | null,
  refreshToken: string
): Promise<{ access: string; refresh: string } | null> {
  try {
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

    if (response.status === 200) {
      const { access, refresh } = response.data;
      return { access, refresh: refresh || refreshToken };
    }
  } catch (error) {
    console.error("Attempt refresh failed:", error);
  }
  return null;
}

function setTokenCookies(
  res: NextResponse,
  access: string,
  refresh: string
) {
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
}
