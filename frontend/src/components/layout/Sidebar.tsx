"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Hotel,
  LayoutDashboard,
  Bed,
  CalendarCheck,
  UserCheck,
  UtensilsCrossed,
  Paintbrush,
  FileText,
  Users,
  Package,
  TrendingUp,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/authStore";
import { useTranslations } from "next-intl";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, key: "dashboard" },
  { label: "Rooms", href: "/rooms", icon: Bed, key: "rooms" },
  { label: "Bookings", href: "/bookings", icon: CalendarCheck, key: "bookings" },
  { label: "Front Desk", href: "/frontdesk", icon: UserCheck, key: "frontdesk" },
  { label: "Restaurant / POS", href: "/pos", icon: UtensilsCrossed, key: "pos" },
  { label: "Housekeeping", href: "/housekeeping", icon: Paintbrush, key: "housekeeping" },
  { label: "Billing", href: "/billing", icon: FileText, key: "billing" },
  { label: "CRM & Loyalty", href: "/crm", icon: Award, key: "crm" },
  { label: "Staff & HR", href: "/staff", icon: Users, key: "staff" },
  { label: "Inventory", href: "/inventory", icon: Package, key: "inventory" },
  { label: "Analytics", href: "/analytics", icon: TrendingUp, key: "analytics" },
  { label: "Reports Console", href: "/analytics/reports", icon: FileText, key: "reports" },
  { label: "Super Admin", href: "/superadmin", icon: ShieldCheck, roles: ["SUPER_ADMIN"], key: "superadmin" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const t = useTranslations("Sidebar");

  const visibleItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(item.roles[0]))
  );

  return (
    <aside
      className={cn(
        "flex flex-col h-screen sticky top-0 bg-slate-950 border-r border-slate-900 transition-all duration-300",
        collapsed ? "w-[64px]" : "w-[220px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-slate-900">
        <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Hotel className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <span className="font-bold text-sm tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            SIA HMS
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-2">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const translatedLabel = t(item.key);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                isActive
                  ? "bg-cyan-500/10 text-cyan-400"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
              )}
              title={collapsed ? translatedLabel : undefined}
            >
              <Icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300")} />
              {!collapsed && <span className="truncate">{translatedLabel}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-slate-900 p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-900 transition-all"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
