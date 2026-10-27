"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Bed, CalendarCheck, UserCheck, DollarSign,
  TrendingUp, Activity, Clock, Gamepad2, UtensilsCrossed,
  Users, Package, ArrowRight, Timer,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/lib/store/authStore";
import { modulesApi, TenantInfo } from "@/lib/api/modules";
import { apiClient } from "@/lib/api/client";
import Link from "next/link";
import { frontdeskApi, TodayStatsResponse } from "@/lib/api/frontdesk";

const QUICK_LINKS: Record<string, { href: string; icon: React.ReactNode; label: string }> = {
  rooms: { href: "/rooms", icon: <Bed className="h-4 w-4" />, label: "Room Status" },
  bookings: { href: "/bookings", icon: <CalendarCheck className="h-4 w-4" />, label: "Bookings" },
  frontdesk: { href: "/frontdesk", icon: <UserCheck className="h-4 w-4" />, label: "Front Desk" },
  pos: { href: "/pos", icon: <UtensilsCrossed className="h-4 w-4" />, label: "Restaurant POS" },
  housekeeping: { href: "/housekeeping", icon: <Activity className="h-4 w-4" />, label: "Housekeeping" },
  billing: { href: "/billing", icon: <DollarSign className="h-4 w-4" />, label: "Billing" },
  crm: { href: "/crm", icon: <Users className="h-4 w-4" />, label: "CRM" },
  staff: { href: "/staff", icon: <Users className="h-4 w-4" />, label: "Staff & HR" },
  inventory: { href: "/inventory", icon: <Package className="h-4 w-4" />, label: "Inventory" },
  timed_sessions: { href: "/sessions", icon: <Timer className="h-4 w-4" />, label: "Timed Sessions" },
};

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [time, setTime] = useState(new Date());
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [operations, setOperations] = useState<TodayStatsResponse | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (user?.role === "SUPER_ADMIN") {
      const isImpersonating = document.cookie.includes("impersonated_tenant_name");
      if (!isImpersonating) {
        router.replace("/admin");
        return;
      }
    }

    modulesApi.getTenantInfo()
      .then(async (info) => {
        setTenantInfo(info);
        if (info.active_modules.some(key => ["rooms", "bookings", "frontdesk"].includes(key))) {
          try { const response = await frontdeskApi.getTodayStats(); setOperations(response.data); }
          catch { setLoadError(true); }
        }
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [user, router]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeModules = tenantInfo?.active_modules ?? [];
  const bizType = tenantInfo?.business_type_name ?? "Business";
  const hasModule = (key: string) => activeModules.includes(key);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          <p className="text-workspace-400 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const quickLinks = activeModules
    .filter((k) => QUICK_LINKS[k])
    .map((k) => QUICK_LINKS[k]);

  const translateTime = () => {
    const hours = time.getHours();
    if (hours < 12) return "Good morning";
    if (hours < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {loadError && <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-400"><span>Some workspace data could not be loaded. Check your connection and try again.</span><button className="rounded-lg border border-amber-400/30 px-3 py-1.5 hover:bg-amber-500/10" onClick={() => window.location.reload()}>Retry</button></div>}
      {/* Header */}
      <div className="flex flex-wrap gap-4 items-start justify-between rounded-2xl border border-border bg-secondary/50 p-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[.15em] text-muted-foreground">{tenantInfo?.name || "Your hospitality workspace"}</p>
          <h1 className="text-3xl font-normal font-serif text-foreground tracking-tight">
            {translateTime()},{" "}
            <span className="bg-gradient-to-r from-brand-400 to-brand-400 bg-clip-text text-transparent">
              {user?.first_name ?? "Manager"}
            </span>
          </h1>
          <p className="text-workspace-400 text-sm">
            {bizType} &mdash; {activeModules.length} module{activeModules.length !== 1 ? "s" : ""} active
            {tenantInfo?.monthly_total && ` · NPR ${parseFloat(tenantInfo.monthly_total).toLocaleString("en-IN", { maximumFractionDigits: 0 })}/mo`}
          </p>
        </div>
        <div className="flex items-center gap-2 text-workspace-400 bg-workspace-900 border border-workspace-800 rounded-xl px-4 py-2.5">
          <Clock className="h-4 w-4 text-brand-400" />
          <span className="font-mono text-sm font-medium text-workspace-300">
            {time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-workspace-900/40 border border-workspace-800/60 hover:border-brand-500/40 hover:bg-workspace-900/60 transition-all group"
          >
            <span className="text-brand-400 group-hover:scale-110 transition-transform">{link.icon}</span>
            <span className="text-xs font-medium text-workspace-300 group-hover:text-foreground truncate">{link.label}</span>
            <ArrowRight className="h-3 w-3 text-workspace-600 group-hover:text-brand-400 ml-auto transition-all" />
          </Link>
        ))}
      </div>

      {/* Module-specific widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hotel-style stats */}
        {hasModule("rooms") && (
          <DashboardStatCard
            title="Room Overview"
            icon={<Bed className="h-4 w-4" />}
            value={operations ? `${operations.occupancy_rate}%` : "--"}
            description="Current occupancy from your property's front desk"
            href="/rooms"
          />
        )}

        {hasModule("bookings") && (
          <DashboardStatCard
            title="Arriving today"
            icon={<CalendarCheck className="h-4 w-4" />}
            value={operations ? String(operations.arrivals.length) : "--"}
            description="Confirmed arrivals expected today"
            href="/bookings"
          />
        )}

        {hasModule("frontdesk") && (
          <DashboardStatCard
            title="Guests in house"
            icon={<UserCheck className="h-4 w-4" />}
            value={operations ? String(operations.in_house.length) : "--"}
            description={operations ? `${operations.departures.length} departures today · guests currently in-house shown above` : "Today's arrivals, departures, and in-house guests"}
            href="/frontdesk"
          />
        )}

        {/* Timed Sessions stats for gaming/coworking/spa */}
        {hasModule("timed_sessions") && (
          <DashboardStatCard
            title="Active Sessions"
            icon={<Timer className="h-4 w-4" />}
            value="Open"
            description="Monitor and manage timed sessions across units"
            href="/sessions"
          />
        )}

        {/* Restaurant POS */}
        {hasModule("pos") && (
          <DashboardStatCard
            title="Restaurant POS"
            icon={<UtensilsCrossed className="h-4 w-4" />}
            value="Open"
            description="Active orders, table status, and daily revenue"
            href="/pos"
          />
        )}

        {/* Inventory */}
        {hasModule("inventory") && (
          <DashboardStatCard
            title="Inventory Status"
            icon={<Package className="h-4 w-4" />}
            value="Open"
            description="Stock levels, reorder alerts, and purchase orders"
            href="/inventory"
          />
        )}

        {/* Staff */}
        {hasModule("staff") && (
          <DashboardStatCard
            title="Staff Overview"
            icon={<Users className="h-4 w-4" />}
            value="Open"
            description="Attendance, shifts, and payroll-ready data"
            href="/staff"
          />
        )}

        {/* Billing */}
        {hasModule("billing") && (
          <DashboardStatCard
            title="Billing & Invoicing"
            icon={<DollarSign className="h-4 w-4" />}
            value="Open"
            description="Recent invoices, payments, and IRD compliance"
            href="/billing"
          />
        )}
      </div>

      {/* Monthly cost summary */}
      {tenantInfo?.monthly_total && parseFloat(tenantInfo.monthly_total) > 0 && (
        <Card className="bg-workspace-900/60 border-workspace-800">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 shadow-md">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-workspace-400 font-medium">Current Monthly Spend</p>
                <p className="text-xl font-bold text-foreground">
                  NPR {parseFloat(tenantInfo.monthly_total).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
            <Link
              href="/settings/modules"
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
            >
              Manage Modules <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DashboardStatCard({
  title,
  icon,
  value,
  description,
  href,
}: {
  title: string;
  icon: React.ReactNode;
  value: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="bg-workspace-900/60 border-workspace-800 hover:border-brand-500/30 hover:bg-workspace-900/80 transition-all group cursor-pointer h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-medium text-workspace-400 uppercase tracking-wider flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <ArrowRight className="h-3.5 w-3.5 text-workspace-600 group-hover:text-brand-400 transition-all" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{value}</div>
          <p className="text-xs text-workspace-500 mt-1">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
