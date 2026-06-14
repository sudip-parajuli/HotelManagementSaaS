import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import axios from "axios";

const BACKEND_URL = process.env.INTERNAL_BACKEND_URL || "http://127.0.0.1:8000";

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await request.json();
    const host = request.headers.get("host");
    const cookieStore = cookies();
    const currentAccessToken = cookieStore.get("access_token")?.value;

    if (!currentAccessToken) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${currentAccessToken}`,
    };
    if (host) {
      headers["Host"] = host;
    }

    // Call the Django backend impersonate endpoint
    const response = await axios.post(
      `${BACKEND_URL}/api/admin/tenants/${tenantId}/impersonate/`,
      {},
      { headers, validateStatus: () => true }
    );

    if (response.status !== 200) {
      return NextResponse.json(response.data, { status: response.status });
    }

    const { access, refresh, tenant_name, schema_name } = response.data;

    // Save the current admin tokens to temporary backup cookies
    const currentRefreshToken = cookieStore.get("refresh_token")?.value;

    cookieStore.set("original_access_token", currentAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60, // 1 hour backup
    });

    if (currentRefreshToken) {
      cookieStore.set("original_refresh_token", currentRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60, // 1 hour backup
      });
    }

    // Set the new impersonated tokens
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

    // Also set a non-httpOnly cookie so the client can easily detect if impersonation is active
    cookieStore.set("impersonated_tenant_name", tenant_name, {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60, // 1 hour
    });

    return NextResponse.json({ success: true, tenant_name, schema_name });
  } catch (error: any) {
    console.error("Impersonation route error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const cookieStore = cookies();
    const originalAccess = cookieStore.get("original_access_token")?.value;
    const originalRefresh = cookieStore.get("original_refresh_token")?.value;

    // Clear impersonation indicator
    cookieStore.delete("impersonated_tenant_name");

    if (originalAccess) {
      // Restore the original superadmin tokens
      cookieStore.set("access_token", originalAccess, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 15 * 60,
      });

      if (originalRefresh) {
        cookieStore.set("refresh_token", originalRefresh, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60,
        });
      } else {
        cookieStore.delete("refresh_token");
      }

      cookieStore.delete("original_access_token");
      cookieStore.delete("original_refresh_token");

      return NextResponse.json({ success: true, restored: true });
    } else {
      // No backup found, perform full logout
      cookieStore.delete("access_token");
      cookieStore.delete("refresh_token");
      cookieStore.delete("original_access_token");
      cookieStore.delete("original_refresh_token");

      return NextResponse.json({ success: true, restored: false });
    }
  } catch (error: any) {
    console.error("Stop impersonation route error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
