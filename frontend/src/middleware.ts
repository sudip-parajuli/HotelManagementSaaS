import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0];

  // Resolve subdomain
  let subdomain: string | null = null;
  if (hostname.endsWith(".localhost")) {
    const parts = hostname.split(".");
    if (parts.length > 1) {
      subdomain = parts[0];
    }
  } else if (hostname.endsWith(".siaenterprises.com.np")) {
    const base = ".siaenterprises.com.np";
    subdomain = hostname.substring(0, hostname.length - base.length);
  }

  const hasAccessToken = request.cookies.has("access_token");
  const hasRefreshToken = request.cookies.has("refresh_token");
  const isAuthenticated = hasAccessToken || hasRefreshToken;

  // Normalize path to exclude trailing slash (except for root path itself)
  const cleanPath = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;

  // Paths that do not require authentication
  const isPublicPath =
    cleanPath === "/login" ||
    cleanPath === "/register" ||
    cleanPath.startsWith("/book") ||
    cleanPath.startsWith("/_next") ||
    cleanPath.startsWith("/api-auth") ||
    cleanPath === "/favicon.ico";

  // 1. PUBLIC DOMAIN ROUTING (No subdomain)
  if (!subdomain) {
    // If accessing root page '/'
    if (cleanPath === "/") {
      return NextResponse.rewrite(new URL("/landing/", request.url));
    }
    
    // Allow public pages & superadmin paths
    if (isPublicPath || cleanPath === "/landing" || cleanPath.startsWith("/superadmin")) {
      return NextResponse.next();
    }

    // Protect all other routes
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login/", request.url));
    }
    
    return NextResponse.next();
  }

  // 2. TENANT SUBDOMAIN ROUTING
  // Redirect to main domain if trying to register on a subdomain
  if (cleanPath === "/register") {
    const mainHost = host.includes("localhost") ? "localhost:3000" : "siaenterprises.com.np";
    return NextResponse.redirect(new URL(`http://${mainHost}/register/`, request.url));
  }

  // If trying to access landing page directly on a subdomain, redirect to root
  if (cleanPath === "/landing") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Redirect to login if trying to access a protected path without authentication
  if (!isAuthenticated && !isPublicPath) {
    return NextResponse.redirect(new URL("/login/", request.url));
  }

  // Redirect to dashboard (/) if authenticated and trying to access login or register page
  if (isAuthenticated && (cleanPath === "/login" || cleanPath === "/register")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (regular backend proxy)
     * - static (static files)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     */
    "/((?!api|static|_next/static|_next/image).*)",
  ],
};
