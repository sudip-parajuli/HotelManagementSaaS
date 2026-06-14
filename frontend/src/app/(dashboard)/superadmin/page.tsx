"use client";

import React, { useEffect, useState } from "react";
import { 
  Building2, 
  DollarSign, 
  Clock, 
  FileText, 
  Plus, 
  TrendingUp, 
  Users, 
  Sparkles,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import { superAdminApi } from "@/lib/api/superadmin";
import { SuperAdminMetrics } from "@/lib/types";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

export default function SuperAdminDashboard() {
  const [metrics, setMetrics] = useState<SuperAdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    superAdminApi.getMetrics()
      .then(setMetrics)
      .catch((err) => console.error("Failed to load super admin metrics", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <p className="text-slate-400 text-sm">Aggregating platform metrics...</p>
        </div>
      </div>
    );
  }

  // Cards configuration
  const cards = [
    {
      title: "Monthly Recurring Revenue",
      value: `NPR ${(metrics.mrr || 0).toLocaleString()}`,
      description: "Active subscription billing recurring",
      icon: DollarSign,
      color: "from-cyan-500 to-blue-600",
      glow: "shadow-cyan-500/10",
    },
    {
      title: "Active Hotels",
      value: metrics.active_hotels,
      description: "Isolated tenant DB schemas active",
      icon: Building2,
      color: "from-emerald-500 to-teal-600",
      glow: "shadow-emerald-500/10",
    },
    {
      title: "Trial Accounts",
      value: metrics.trial_hotels,
      description: "On trial periods (14 days)",
      icon: Clock,
      color: "from-amber-500 to-orange-600",
      glow: "shadow-amber-500/10",
    },
    {
      title: "Pending Invoices",
      value: metrics.pending_invoices,
      description: "Awaiting Nepal payment gateway",
      icon: FileText,
      color: "from-purple-500 to-pink-600",
      glow: "shadow-purple-500/10",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 backdrop-blur-md border border-slate-800/60 p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-cyan-400" />
            SaaS Super Admin Platform
          </h1>
          <p className="text-slate-400 text-sm">
            Monitor and manage multi-tenant property databases, subscription billing tiers, and system health.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            href="/superadmin/tenants/new"
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-medium text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Onboard New Hotel
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`bg-slate-900/30 backdrop-blur-md border border-slate-800/50 p-6 rounded-2xl flex flex-col justify-between shadow-lg ${card.glow} relative overflow-hidden group hover:border-slate-700 transition-all`}
            >
              {/* Background gradient decorative glow */}
              <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-br opacity-5 group-hover:opacity-10 blur-xl rounded-full transition-all" />

              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {card.title}
                  </p>
                  <h3 className="text-2xl font-bold text-white tracking-tight mt-1.5">
                    {card.value}
                  </h3>
                </div>
                <div className={`p-2 rounded-xl bg-gradient-to-tr ${card.color} text-white shadow-md`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="text-slate-500 text-xs mt-4 flex items-center gap-1">
                <span>{card.description}</span>
              </p>
            </div>
          );
        })}
      </div>

      {/* Revenue growth and quick links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Growth chart */}
        <div className="lg:col-span-2 bg-slate-900/30 backdrop-blur-md border border-slate-800/50 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-cyan-400" />
              SaaS Monthly Revenue Growth
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Visual ledger of subscription payments completed over the last 12 months.
            </p>
          </div>

          <div className="h-[280px] w-full mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.growth_data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: "8px",
                    color: "#f8fafc",
                    fontSize: "12px",
                  }}
                  formatter={(value: any) => [`Rs. ${Number(value).toLocaleString()}`, "Revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Super admin quick shortcuts panel */}
        <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800/50 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-400" />
              Quick Console Navigation
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Operate global settings and access database states.
            </p>
          </div>

          <div className="space-y-3 mt-6 flex-1 flex flex-col justify-center">
            <Link
              href="/superadmin/tenants"
              className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 hover:bg-slate-800/50 border border-slate-800 hover:border-slate-700 transition-all text-sm text-slate-300 hover:text-white group"
            >
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="font-semibold">Hotels Directory</p>
                  <p className="text-slate-500 text-xs">Manage databases & impersonations</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-cyan-400 transform group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              href="/superadmin/subscriptions"
              className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 hover:bg-slate-800/50 border border-slate-800 hover:border-slate-700 transition-all text-sm text-slate-300 hover:text-white group"
            >
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-amber-400" />
                <div>
                  <p className="font-semibold">SaaS Subscription Plans</p>
                  <p className="text-slate-500 text-xs">Edit plans, room limits & features</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-cyan-400 transform group-hover:translate-x-1 transition-all" />
            </Link>
          </div>

          <div className="text-center text-[10px] text-slate-600 mt-6 pt-4 border-t border-slate-900">
            SIA HMS Core Engine • Version 1.0.0 (Nepali Dark Theme)
          </div>
        </div>
      </div>
    </div>
  );
}
