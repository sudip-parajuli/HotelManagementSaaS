import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import axios from "axios";

const BACKEND_URL = process.env.INTERNAL_BACKEND_URL || "http://127.0.0.1:8000";

async function fetchProfile(accessToken: string, host: string | null) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
  if (host) {
    headers["Host"] = host;
  }
  return axios.get(`${BACKEND_URL}/api/auth/me/`, {
    headers,
    validateStatus: () => true,
  });
}

export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  let accessToken = cookieStore.get("access_token")?.value;
  const refreshToken = cookieStore.get("refresh_token")?.value;
  const host = request.headers.get("host");

  if (!accessToken) {
    // If we have a refresh token, try to refresh first
    if (refreshToken) {
      const refreshed = await attemptRefresh(host, refreshToken);
      if (refreshed) {
        accessToken = cookieStore.get("access_token")?.value;
      }
    }
    
    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED", detail: {} },
        { status: 401 }
      );
    }
  }

  try {
    let response = await fetchProfile(accessToken, host);

    // If token expired, try silent refresh
    if (response.status === 401 && refreshToken) {
      const refreshed = await attemptRefresh(host, refreshToken);
      if (refreshed) {
        const newAccessToken = cookieStore.get("access_token")?.value;
        if (newAccessToken) {
          response = await fetchProfile(newAccessToken, host);
        }
      }
    }

    if (response.status !== 200) {
      return NextResponse.json(response.data, { status: response.status });
    }

    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Profile route error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", code: "SERVER_ERROR", detail: {} },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const cookieStore = cookies();
  let accessToken = cookieStore.get("access_token")?.value;
  const refreshToken = cookieStore.get("refresh_token")?.value;
  const host = request.headers.get("host");

  if (!accessToken) {
    if (refreshToken) {
      const refreshed = await attemptRefresh(host, refreshToken);
      if (refreshed) {
        accessToken = cookieStore.get("access_token")?.value;
      }
    }
    
    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED", detail: {} },
        { status: 401 }
      );
    }
  }

  try {
    const body = await request.json();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    };
    if (host) {
      headers["Host"] = host;
    }

    let response = await axios.put(`${BACKEND_URL}/api/auth/me/`, body, {
      headers,
      validateStatus: () => true,
    });

    if (response.status === 401 && refreshToken) {
      const refreshed = await attemptRefresh(host, refreshToken);
      if (refreshed) {
        const newAccessToken = cookieStore.get("access_token")?.value;
        if (newAccessToken) {
          headers["Authorization"] = `Bearer ${newAccessToken}`;
          response = await axios.put(`${BACKEND_URL}/api/auth/me/`, body, {
            headers,
            validateStatus: () => true,
          });
        }
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

async function attemptRefresh(host: string | null, refreshToken: string): Promise<boolean> {
  try {
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

    if (response.status === 200) {
      const { access, refresh } = response.data;
      const cookieStore = cookies();
      cookieStore.set("access_token", access, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 15 * 60,
      });
      if (refresh) {
        cookieStore.set("refresh_token", refresh, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60,
        });
      }
      return true;
    }
  } catch (error) {
    console.error("Attempt refresh failed:", error);
  }
  return false;
}
