"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Building2,
  DollarSign,
  Clock,
  Plus,
  TrendingUp,
  Users,
  Sparkles,
  ArrowRight,
  Activity,
  UserCheck,
  XCircle,
  Puzzle,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { superAdminApi } from "@/lib/api/superadmin";
import { SuperAdminMetrics, ModuleRevenueItem } from "@/lib/types";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

const MODULE_ICONS: Record<string, React.ReactNode> = {
  billing: <DollarSign className="h-4 w-4" />,
  analytics: <BarChart3 className="h-4 w-4" />,
  staff: <Users className="h-4 w-4" />,
  payroll: <DollarSign className="h-4 w-4" />,
  inventory: <BarChart3 className="h-4 w-4" />,
  crm: <Users className="h-4 w-4" />,
  rooms: <Building2 className="h-4 w-4" />,
  bookings: <BarChart3 className="h-4 w-4" />,
  frontdesk: <UserCheck className="h-4 w-4" />,
  housekeeping: <BarChart3 className="h-4 w-4" />,
  pos: <DollarSign className="h-4 w-4" />,
  kds: <BarChart3 className="h-4 w-4" />,
  table_mgmt: <BarChart3 className="h-4 w-4" />,
  timed_sessions: <Clock className="h-4 w-4" />,
};

const MODULE_COLORS: Record<string, string> = {
  universal: "#06b6d4",
  hospitality: "#a855f7",
  fnd: "#eab308",
  gaming: "#22c55e",
  coworking: "#3b82f6",
  wellness: "#ec4899",
};

export default function SuperAdminDashboard() {
  const [metrics, setMetrics] = useState<SuperAdminMetrics | null>(null);
  const [moduleRevenue, setModuleRevenue] = useState<ModuleRevenueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      superAdminApi.getMetrics(),
      superAdminApi.getModuleRevenue(),
    ])
      .then(([m, rev]) => {
        setMetrics(m);
        setModuleRevenue(rev.modules ?? []);
      })
      .catch((err) => console.error("Failed to load admin metrics", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          <p className="text-workspace-400 text-sm">Aggregating platform metrics...</p>
        </div>
      </div>
    );
  }

  const totalModuleMrr = moduleRevenue.reduce((sum, m) => sum + m.mrr, 0);

  const topModules = [...moduleRevenue]
    .sort((a, b) => b.active_tenants - a.active_tenants)
    .slice(0, 6);

  const cards = [
    {
      title: "Total Active Tenants",
      value: metrics.active_tenants,
      description: `Out of ${metrics.total_tenants} onboarded`,
      icon: Building2,
      color: "from-brand-500 to-brand-600",
    },
    {
      title: "Monthly Recurring Revenue",
      value: `NPR ${(metrics.mrr || 0).toLocaleString()}`,
      description: `Plan: NPR ${(metrics.plan_mrr || 0).toLocaleString()} | Modules: NPR ${(metrics.module_mrr || 0).toLocaleString()}`,
      icon: DollarSign,
      color: "from-brand-500 to-brand-600",
    },
    {
      title: "Trial Tenants",
      value: metrics.trial_tenants,
      description: `${metrics.trial_ending_soon} ending in 3 days`,
      icon: Clock,
      color: "from-amber-500 to-orange-600",
    },
    {
      title: "Module-Level MRR",
      value: `NPR ${totalModuleMrr.toLocaleString()}`,
      description: `From ${moduleRevenue.length} active modules`,
      icon: Puzzle,
      color: "from-emerald-500 to-teal-600",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-workspace-900/40 backdrop-blur-md border border-workspace-800/60 p-6 rounded-2xl">
        <div>
          <h1 className="text-3xl font-normal font-serif tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-brand-400" />
            Platform Overview
          </h1>
          <p className="text-workspace-400 text-sm">
            Monitor tenants, module adoption, subscription billing, and system health.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            href="/admin/tenants/new"
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-medium text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 transition-all w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Onboard New Tenant
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-workspace-900/30 backdrop-blur-md border border-workspace-800/50 p-6 rounded-2xl flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-workspace-700 transition-all"
            >
              <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-br opacity-5 group-hover:opacity-10 blur-xl rounded-full transition-all" />
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-workspace-400 uppercase tracking-wider">{card.title}</p>
                  <h3 className="text-3xl font-normal font-serif text-foreground tracking-tight mt-1.5">{card.value}</h3>
                </div>
                <div className={`p-2 rounded-xl bg-gradient-to-tr ${card.color} text-white shadow-md`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="text-workspace-500 text-xs mt-4">{card.description}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Growth */}
        <div className="lg:col-span-2 bg-workspace-900/30 backdrop-blur-md border border-workspace-800/50 p-6 rounded-2xl shadow-xl">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-brand-400" />
            Monthly Revenue Growth
          </h2>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.growth_data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px", color: "#f8fafc", fontSize: "12px" }}
                  formatter={(value: any) => [`NPR ${Number(value).toLocaleString()}`, "Revenue"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Modules by Adoption */}
        <div className="bg-workspace-900/30 backdrop-blur-md border border-workspace-800/50 p-6 rounded-2xl shadow-xl">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
            <Puzzle className="h-5 w-5 text-brand-400" />
            Top Modules by Adoption
          </h2>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topModules} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} width={90} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px", color: "#f8fafc", fontSize: "11px" }}
                  formatter={(value: any) => [`${value} tenants`, "Active"]}
                />
                <Bar dataKey="active_tenants" radius={[0, 4, 4, 0]} fill="#a855f7" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Module Adoption Table */}
      {moduleRevenue.length > 0 && (
        <div className="bg-workspace-900/30 backdrop-blur-md border border-workspace-800/50 p-6 rounded-2xl shadow-xl">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-brand-400" />
            Module Adoption &amp; Revenue
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-workspace-800 text-workspace-400 font-semibold text-xs uppercase tracking-wider">
                  <th className="pb-3 pl-2">Module</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Price</th>
                  <th className="pb-3">Active Tenants</th>
                  <th className="pb-3">MRR</th>
                  <th className="pb-3 pr-2">% of Total MRR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-workspace-900 text-workspace-300">
                {moduleRevenue.map((mod) => {
                  const pct = totalModuleMrr > 0 ? ((mod.mrr / totalModuleMrr) * 100).toFixed(1) : "0";
                  return (
                    <tr key={mod.key} className="hover:bg-workspace-900/40 transition-colors">
                      <td className="py-3 pl-2 font-medium text-foreground flex items-center gap-2">
                        <span className="text-brand-400">{MODULE_ICONS[mod.key]}</span>
                        {mod.name}
                        {mod.is_core && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold">CORE</span>}
                      </td>
                      <td className="py-3 text-xs capitalize">{mod.category}</td>
                      <td className="py-3 text-xs">NPR {parseFloat(mod.price_monthly || "0").toLocaleString()}/mo</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-workspace-800 overflow-hidden">
                            <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min((mod.active_tenants / metrics.total_tenants) * 100, 100)}%` }} />
                          </div>
                          <span className="text-xs">{mod.active_tenants}</span>
                        </div>
                      </td>
                      <td className="py-3 text-xs font-medium text-foreground">NPR {mod.mrr.toLocaleString()}</td>
                      <td className="py-3 pr-2 text-xs text-workspace-400">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tenant Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-workspace-900/30 backdrop-blur-md border border-workspace-800/50 p-6 rounded-2xl shadow-xl">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-brand-400" />
            Tenant Health
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-workspace-800 text-workspace-400 font-semibold text-xs uppercase tracking-wider">
                  <th className="pb-3 pl-2">Tenant</th>
                  <th className="pb-3">Plan</th>
                  <th className="pb-3">Days Active</th>
                  <th className="pb-3">Last Login</th>
                  <th className="pb-3">Health</th>
                  <th className="pb-3 pr-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-workspace-900 text-workspace-300">
                {metrics.tenant_health && metrics.tenant_health.length > 0 ? (
                  metrics.tenant_health.map((tenant) => {
                    const healthColor = tenant.activity_status === "healthy" ? "bg-emerald-500 text-emerald-400 border-emerald-500/20"
                      : tenant.activity_status === "low_activity" ? "bg-amber-500 text-amber-400 border-amber-500/20"
                      : "bg-rose-500 text-rose-400 border-rose-500/20";
                    const healthLabel = tenant.activity_status === "healthy" ? "Healthy"
                      : tenant.activity_status === "low_activity" ? "Low Activity" : "At Risk";
                    return (
                      <tr key={tenant.id} className="hover:bg-workspace-900/40 transition-colors">
                        <td className="py-3 pl-2 font-medium text-foreground">{tenant.name}</td>
                        <td className="py-3">
                          <span className="text-workspace-400 text-xs bg-workspace-900 border border-workspace-800 px-2 py-0.5 rounded-full capitalize">
                            {tenant.plan} ({tenant.status})
                          </span>
                        </td>
                        <td className="py-3 text-xs">{tenant.days_since_signup} days</td>
                        <td className="py-3 text-xs text-workspace-400">{tenant.last_active}</td>
                        <td className="py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${healthColor}`}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", tenant.activity_status === "healthy" ? "bg-emerald-500" : tenant.activity_status === "low_activity" ? "bg-amber-500" : "bg-rose-500")} />
                            {healthLabel}
                          </span>
                        </td>
                        <td className="py-3 pr-2 text-right">
                          <Link href={`/admin/tenants?id=${tenant.id}`} className="inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 font-semibold">
                            Manage <ArrowRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={6} className="py-8 text-center text-workspace-500 text-xs">No tenants onboarded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Events */}
        <div className="bg-workspace-900/30 backdrop-blur-md border border-workspace-800/50 p-6 rounded-2xl shadow-xl flex flex-col h-[380px]">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-brand-400" />
            Activity Feed
          </h2>
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {metrics.recent_events && metrics.recent_events.length > 0 ? (
              metrics.recent_events.map((event) => {
                const iconBg = event.type === "signup" ? "bg-brand-500/10 text-brand-400"
                  : event.type === "payment" ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-brand-500/10 text-brand-400";
                const date = new Date(event.timestamp);
                return (
                  <div key={event.id} className="flex gap-3 items-start text-xs border-b border-workspace-900 pb-3 last:border-0 last:pb-0">
                    <div className={cn("p-1.5 rounded-lg flex-shrink-0", iconBg)}>
                      {event.type === "signup" ? <Plus className="h-3.5 w-3.5" />
                        : event.type === "impersonation" ? <UserCheck className="h-3.5 w-3.5" />
                        : <DollarSign className="h-3.5 w-3.5" />}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-workspace-200 font-medium">{event.message}</p>
                      <span className="text-[10px] text-workspace-500 block font-medium">
                        {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; {date.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-workspace-500 text-xs text-center py-12">No recent platform activity.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
