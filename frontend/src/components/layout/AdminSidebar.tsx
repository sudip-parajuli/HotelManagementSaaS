"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
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
        "flex flex-col h-screen sticky top-0 bg-slate-950 border-r border-slate-900 transition-all duration-300 z-50",
        collapsed ? "w-[64px]" : "w-[240px]"
      )}
    >
      {/* Brand Logo */}
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-slate-900">
        <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-gradient-to-tr from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
          <ShieldAlert className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <span className="font-bold text-sm tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            SaaS Admin
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
                  ? "bg-purple-500/10 text-purple-400"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
              )}
              title={collapsed ? translatedLabel : undefined}
            >
              <Icon
                className={cn(
                  "h-4 w-4 flex-shrink-0",
                  isActive ? "text-purple-400" : "text-slate-500 group-hover:text-slate-300"
                )}
              />
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
