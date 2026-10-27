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
  Gamepad2,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/authStore";
import { useTranslations } from "next-intl";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<any>;
  key: string;
  featureKey?: string;
}

const ALL_FEATURES = "__all__";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, key: "dashboard" },
  { label: "Rooms", href: "/rooms", icon: Bed, key: "rooms", featureKey: "rooms" },
  { label: "Bookings", href: "/bookings", icon: CalendarCheck, key: "bookings", featureKey: "bookings" },
  { label: "Front Desk", href: "/frontdesk", icon: UserCheck, key: "frontdesk", featureKey: "frontdesk" },
  { label: "Restaurant / POS", href: "/pos", icon: UtensilsCrossed, key: "pos", featureKey: "pos" },
  { label: "Housekeeping", href: "/housekeeping", icon: Paintbrush, key: "housekeeping", featureKey: "housekeeping" },
  { label: "Billing", href: "/billing", icon: FileText, key: "billing", featureKey: "billing" },
  { label: "CRM & Loyalty", href: "/crm", icon: Award, key: "crm", featureKey: "crm" },
  { label: "Staff & HR", href: "/staff", icon: Users, key: "staff", featureKey: "staff" },
  { label: "Inventory", href: "/inventory", icon: Package, key: "inventory", featureKey: "inventory" },
  { label: "Analytics", href: "/analytics", icon: TrendingUp, key: "analytics", featureKey: "analytics" },
  { label: "Reports Console", href: "/analytics/reports", icon: FileText, key: "reports", featureKey: "analytics" },
  { label: "Sessions", href: "/sessions", icon: Gamepad2, key: "sessions", featureKey: "timed_sessions" },
  { label: "Settings", href: "/settings/modules", icon: Settings, key: "settings" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const features = useAuthStore((s) => s.features);
  const t = useTranslations("Sidebar");

  const hasFeature = (item: NavItem): boolean => {
    if (!item.featureKey) return true;
    return features.includes(item.featureKey);
  };

  const visibleItems = navItems.filter(hasFeature);

  return (
    <aside
      className={cn(
        "flex flex-col flex-shrink-0 h-screen sticky top-0 bg-slate-950 border-r border-slate-900 transition-all duration-300",
        collapsed ? "w-[64px]" : "w-[64px] md:w-[220px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-slate-900">
        <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Hotel className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <span className="hidden md:inline font-bold text-sm tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Staywired
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
              title={translatedLabel}
              aria-label={translatedLabel}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300")} />
              {!collapsed && <span className="hidden md:inline truncate">{translatedLabel}</span>}
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
