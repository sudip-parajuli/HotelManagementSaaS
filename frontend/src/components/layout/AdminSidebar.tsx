"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  Leaf,
  LayoutDashboard,
  Building2,
  CreditCard,
  Puzzle,
  TrendingUp,
  Headset,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const adminNavItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, key: "dashboard" },
  { label: "Tenants", href: "/admin/tenants", icon: Building2, key: "tenants" },
  { label: "Subscriptions & Plans", href: "/admin/subscriptions", icon: CreditCard, key: "subscriptions" },
  { label: "Add-on Marketplace", href: "/admin/addons", icon: Puzzle, key: "addons" },
  { label: "Revenue", href: "/admin/revenue", icon: TrendingUp, key: "revenue" },
  { label: "Support & Audit", href: "/admin/support", icon: Headset, key: "support" },
  { label: "System Health", href: "/admin/system", icon: Activity, key: "system" },
  { label: "Settings", href: "/admin/settings", icon: Settings, key: "settings" },
];

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const t = useTranslations("AdminSidebar");

  return (
    <aside
      className={cn(
        "flex flex-col h-screen sticky top-0 bg-workspace-950 border-r border-workspace-900 transition-all duration-300 z-50",
        collapsed ? "w-[64px] shrink-0" : "w-[64px] md:w-[240px] shrink-0"
      )}
    >
      {/* Brand Logo */}
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-workspace-900">
        <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-gradient-to-tr from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
          <Leaf className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <span className="hidden md:inline font-bold text-sm tracking-tight bg-gradient-to-r text-foreground">
            Staywired
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-2">
        {adminNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          const translatedLabel = t(item.key);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                isActive
                  ? "bg-brand-500/10 text-brand-400"
                  : "text-workspace-400 hover:text-workspace-100 hover:bg-workspace-900"
              )}
              title={translatedLabel} aria-label={translatedLabel}
            >
              <Icon
                className={cn(
                  "h-4 w-4 flex-shrink-0",
                  isActive ? "text-brand-400" : "text-workspace-500 group-hover:text-workspace-300"
                )}
              />
              {!collapsed && <span className="hidden md:inline truncate">{translatedLabel}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-workspace-900 p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-2 rounded-lg text-workspace-500 hover:text-workspace-300 hover:bg-workspace-900 transition-all"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
