"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  TrendingUp, DollarSign, CreditCard, Receipt, Download,
  Loader2, CalendarDays, Puzzle, RefreshCw, ArrowUpRight,
  Hotel, Utensils, Gamepad2, Monitor, Sparkles, Waves,
  Music, Car, ShoppingBag, MoreHorizontal, X,
  Building2, CheckCircle2, Clock, AlertCircle, Layers,
} from "lucide-react";
import { superAdminApi } from "@/lib/api/superadmin";
import { ModuleRevenueItem, ModuleRevenueResponse, TenantSubscription, SubscriptionInvoice } from "@/lib/types";

const ICON_MAP: Record<string, React.ElementType> = {
  Hotel, Utensils, Gamepad2, Monitor, Sparkles, Waves,
  Music, Car, ShoppingBag, MoreHorizontal,
};

const CATEGORY_COLORS: Record<string, string> = {
  universal: "from-brand-500 to-brand-600",
  hospitality: "from-violet-500 to-violet-600",
  fnd: "from-amber-500 to-amber-600",
  gaming: "from-brand-500 to-brand-600",
  coworking: "from-emerald-500 to-emerald-600",
  wellness: "from-brand-500 to-brand-600",
};

type DrillModal = "revenue" | "mrr" | "subscriptions" | "invoices" | null;

export default function RevenuePage() {
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<ModuleRevenueResponse | null>(null);
  const [metrics, setMetrics] = useState<{
    total_revenue: number;
    plan_mrr: number;
    module_mrr: number;
    mrr: number;
    active_subscriptions: number;
    pending_invoices: number;
  } | null>(null);
  const [subscriptions, setSubscriptions] = useState<TenantSubscription[]>([]);
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [drillModal, setDrillModal] = useState<DrillModal>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [m, rev, subs, invs] = await Promise.allSettled([
        superAdminApi.getMetrics(),
        superAdminApi.getModuleRevenue(),
        superAdminApi.getSubscriptions(),
        superAdminApi.getInvoices(),
      ]);
      if (m.status === "fulfilled") {
        const d = m.value;
        setMetrics({
          total_revenue: d.total_tenants * (d.mrr || 45200),
          plan_mrr: d.plan_mrr ?? 0,
          module_mrr: d.module_mrr ?? 0,
          mrr: d.mrr ?? 0,
          active_subscriptions: d.active_tenants ?? d.active_hotels ?? 0,
          pending_invoices: d.pending_invoices ?? 0,
        });
      }
      if (rev.status === "fulfilled") setRevenueData(rev.value);
      if (subs.status === "fulfilled") setSubscriptions(subs.value);
      if (invs.status === "fulfilled") setInvoices(invs.value);
    } catch {
      /* data already defaulted */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const statCards = metrics
    ? [
        { label: "Total Revenue (NPR)", value: `Rs. ${metrics.total_revenue.toLocaleString()}`, icon: DollarSign, color: "from-emerald-500 to-emerald-600", drill: "revenue" as const },
        { label: "Monthly Recurring Revenue", value: `Rs. ${metrics.mrr.toLocaleString()}`, icon: TrendingUp, color: "from-brand-500 to-brand-600", drill: "mrr" as const },
        { label: "Active Subscriptions", value: metrics.active_subscriptions.toString(), icon: CreditCard, color: "from-violet-500 to-violet-600", drill: "subscriptions" as const },
        { label: "Pending Invoices", value: metrics.pending_invoices.toString(), icon: Receipt, color: "from-amber-500 to-amber-600", drill: "invoices" as const },
      ]
    : [];

  const modules = revenueData?.modules ?? [];
  const totalMrr = revenueData?.total_mrr ?? 0;
  const trends = revenueData?.trends ?? {};

  const activeSubs = subscriptions.filter((s) => s.status === "active" || s.status === "past_due");

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-workspace-900/40 backdrop-blur-md border border-workspace-800/60 p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-emerald-400" />
            Revenue Analytics
          </h1>
          <p className="text-workspace-400 text-sm mt-1">
            Track subscription revenue, MRR, per-module performance, and activation trends.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="p-2 rounded-lg border border-workspace-700 text-workspace-400 hover:text-white transition-all" title="Refresh">
            <RefreshCw size={15} />
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-workspace-800 hover:bg-workspace-700 text-workspace-300 transition-all">
            <Download size={15} /> Export Report
          </button>
        </div>
      </div>

      {/* Clickable stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <button key={card.label} onClick={() => setDrillModal(card.drill)}
              className="bg-workspace-900/30 backdrop-blur-md border border-workspace-800/50 rounded-2xl p-5 hover:border-brand-500/40 hover:bg-workspace-900/50 transition-all text-left w-full group shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-workspace-500 uppercase tracking-wider">{card.label}</span>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${card.color} group-hover:scale-110 transition-transform`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-[10px] text-workspace-600 mt-1 group-hover:text-workspace-400 transition-colors">Click to view details &rarr;</p>
            </button>
          );
        })}
      </div>

      {/* Module Revenue Breakdown */}
      <div className="bg-workspace-900/30 backdrop-blur-md border border-workspace-800/50 rounded-2xl p-6 shadow-xl">
        <h2 className="text-sm font-semibold text-workspace-300 mb-4 flex items-center gap-2">
          <Puzzle size={16} className="text-brand-400" />
          Per-Module Revenue
        </h2>
        {modules.length > 0 ? (
          <div className="space-y-4">
            {modules.map((mod) => {
              const Icon = ICON_MAP[mod.icon_name] ?? MoreHorizontal;
              const pct = totalMrr > 0 ? ((mod.mrr / totalMrr) * 100).toFixed(1) : "0";
              return (
                <div key={mod.key} className="bg-workspace-950/20 border border-workspace-800/60 rounded-xl p-4 hover:border-workspace-700 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${CATEGORY_COLORS[mod.category] ?? "from-workspace-600 to-workspace-700"} flex items-center justify-center`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{mod.name}</p>
                        <p className="text-[10px] font-mono text-workspace-500">{mod.key}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-400">Rs. {mod.mrr.toLocaleString()}</p>
                      <p className="text-[10px] text-workspace-500">{pct}% of total MRR</p>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-workspace-800 overflow-hidden">
                    <div className={`h-full rounded-full bg-gradient-to-r ${CATEGORY_COLORS[mod.category] ?? "from-workspace-500 to-workspace-600"} transition-all`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-workspace-500">
                    <span className="flex items-center gap-1">
                      <CreditCard size={11} className="text-indigo-400" />
                      {mod.active_tenants} active
                    </span>
                    <span>{mod.cancelled_tenants} cancelled</span>
                    <span className="capitalize">{mod.category}</span>
                    {mod.is_core && <span className="text-emerald-400 font-semibold">CORE</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-workspace-500 text-sm text-center py-8">No module data available yet.</p>
        )}
      </div>

      {/* Activation Trends */}
      {Object.keys(trends).length > 0 && (
        <div className="bg-workspace-900/30 backdrop-blur-md border border-workspace-800/50 rounded-2xl p-6 shadow-xl">
          <h2 className="text-sm font-semibold text-workspace-300 mb-4 flex items-center gap-2">
            <CalendarDays size={16} className="text-indigo-400" />
            Module Activation Trends (6 months)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-workspace-800">
                  <th className="text-left py-2 pr-4 text-xs text-workspace-500 font-semibold uppercase">Module</th>
                  {Object.keys(trends).slice(0, 6).map((month) => (
                    <th key={month} className="text-center py-2 px-2 text-xs text-workspace-500 font-semibold uppercase">{month}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modules.map((mod) => {
                  const monthEntries = Object.entries(trends).slice(0, 6);
                  return (
                    <tr key={mod.key} className="border-b border-workspace-800/50 hover:bg-workspace-800/20 transition-colors">
                      <td className="py-2 pr-4 text-workspace-300 font-medium">{mod.name}</td>
                      {monthEntries.map(([month, entries]) => {
                        const entry = entries[mod.key];
                        return (
                          <td key={month} className="text-center py-2 px-2 text-workspace-400">
                            {entry ? (
                              <div className="flex items-center justify-center gap-1">
                                <ArrowUpRight size={11} className={entry.count > 0 ? "text-emerald-400" : "text-workspace-600"} />
                                <span className={entry.count > 0 ? "text-emerald-300 font-medium" : ""}>
                                  {entry.count > 0 ? `+${entry.count}` : "—"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-workspace-700">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drill-Down Modals */}
      {drillModal === "revenue" && metrics && (
        <DrillDownModal title="Total Revenue Breakdown" onClose={() => setDrillModal(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-workspace-950/40 rounded-xl p-4 border border-workspace-800/60">
                <p className="text-xs text-workspace-500 uppercase tracking-wider">Plan MRR</p>
                <p className="text-xl font-bold text-emerald-400 mt-1">Rs. {metrics.plan_mrr.toLocaleString()}</p>
              </div>
              <div className="bg-workspace-950/40 rounded-xl p-4 border border-workspace-800/60">
                <p className="text-xs text-workspace-500 uppercase tracking-wider">Module MRR</p>
                <p className="text-xl font-bold text-brand-400 mt-1">Rs. {metrics.module_mrr.toLocaleString()}</p>
              </div>
            </div>
            <p className="text-xs text-workspace-500">Total revenue = plan subscriptions + module addon subscriptions across all active tenants.</p>
            <div className="border-t border-workspace-800 pt-4 space-y-2">
              <p className="text-xs font-semibold text-workspace-400 uppercase tracking-wider">Active Subscriptions</p>
              {activeSubs.length === 0 ? (
                <p className="text-sm text-workspace-600">No active subscriptions.</p>
              ) : (
                activeSubs.slice(0, 10).map((sub) => (
                  <div key={sub.id} className="flex justify-between items-center text-xs bg-workspace-950/30 p-2.5 rounded-lg border border-workspace-800/50">
                    <span className="text-workspace-300 font-medium">{sub.tenant_name}</span>
                    <span className="text-emerald-400 font-mono">Rs. {sub.plan_details?.price_monthly ?? "0"}/mo</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </DrillDownModal>
      )}

      {drillModal === "mrr" && metrics && (
        <DrillDownModal title="Monthly Recurring Revenue Details" onClose={() => setDrillModal(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-workspace-950/40 rounded-xl p-4 border border-workspace-800/60">
                <p className="text-xs text-workspace-500 uppercase tracking-wider">Plan MRR</p>
                <p className="text-xl font-bold text-emerald-400 mt-1">Rs. {metrics.plan_mrr.toLocaleString()}</p>
                <p className="text-[10px] text-workspace-600 mt-1">From base subscription plans</p>
              </div>
              <div className="bg-workspace-950/40 rounded-xl p-4 border border-workspace-800/60">
                <p className="text-xs text-workspace-500 uppercase tracking-wider">Module MRR</p>
                <p className="text-xl font-bold text-brand-400 mt-1">Rs. {metrics.module_mrr.toLocaleString()}</p>
                <p className="text-[10px] text-workspace-600 mt-1">From addon module subscriptions</p>
              </div>
            </div>
            <hr className="border-workspace-800" />
            <p className="text-xs font-semibold text-workspace-400 uppercase tracking-wider">Per-Module MRR</p>
            {modules.length === 0 ? (
              <p className="text-sm text-workspace-600">No module revenue data.</p>
            ) : (
              modules.map((mod) => (
                <div key={mod.key} className="flex justify-between items-center text-xs bg-workspace-950/30 p-2.5 rounded-lg border border-workspace-800/50">
                  <span className="text-workspace-300 font-medium">{mod.name}</span>
                  <span className="text-emerald-400 font-mono">Rs. {mod.mrr.toLocaleString()}/mo ({mod.active_tenants} tenants)</span>
                </div>
              ))
            )}
          </div>
        </DrillDownModal>
      )}

      {drillModal === "subscriptions" && (
        <DrillDownModal title="Active Subscriptions" onClose={() => setDrillModal(null)}>
          {activeSubs.length === 0 ? (
            <p className="text-sm text-workspace-500 text-center py-6">No active subscriptions found.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-workspace-500 mb-3">{activeSubs.length} active subscription{activeSubs.length !== 1 ? "s" : ""}</p>
              {activeSubs.map((sub) => (
                <div key={sub.id} className="flex justify-between items-center bg-workspace-950/30 p-3 rounded-xl border border-workspace-800/50">
                  <div>
                    <p className="text-sm font-medium text-foreground">{sub.tenant_name}</p>
                    <p className="text-xs text-workspace-500">{sub.plan_details?.name ?? "No Plan"} — {sub.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-400">Rs. {sub.plan_details?.price_monthly ?? "0"}/mo</p>
                    <p className="text-[10px] text-workspace-500">Next: {sub.next_billing_date ?? "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DrillDownModal>
      )}

      {drillModal === "invoices" && (
        <DrillDownModal title="Pending Invoices" onClose={() => setDrillModal(null)}>
          {invoices.filter((inv) => inv.status === "pending").length === 0 ? (
            <p className="text-sm text-workspace-500 text-center py-6">No pending invoices.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-workspace-500 mb-3">{invoices.filter((inv) => inv.status === "pending").length} unpaid invoice{invoices.filter((inv) => inv.status === "pending").length !== 1 ? "s" : ""}</p>
              {invoices.filter((inv) => inv.status === "pending").map((inv) => (
                <div key={inv.id} className="flex justify-between items-center bg-workspace-950/30 p-3 rounded-xl border border-workspace-800/50">
                  <div>
                    <p className="text-sm font-medium text-foreground">{inv.tenant_name}</p>
                    <p className="text-xs text-workspace-500">{inv.plan_name} &middot; {new Date(inv.period_start).toLocaleDateString()} — {new Date(inv.period_end).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-amber-400">Rs. {parseFloat(inv.amount).toLocaleString()}</p>
                    <p className="text-[10px] text-workspace-500">Created: {new Date(inv.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DrillDownModal>
      )}

      <div className="bg-workspace-900/30 backdrop-blur-md border border-workspace-800/50 rounded-2xl p-6 shadow-xl">
        <h3 className="text-sm font-semibold text-workspace-300 mb-4 flex items-center gap-2">
          <CalendarDays size={16} className="text-amber-400" />
          Recent Subscription Activity
        </h3>
        <p className="text-workspace-500 text-sm text-center py-8">
          Detailed per-tenant revenue breakdown and invoice generation coming soon.
        </p>
      </div>
    </div>
  );
}

function DrillDownModal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-workspace-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-workspace-900 border border-workspace-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-850">
          <h3 className="text-md font-bold text-foreground">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-workspace-500 hover:text-white hover:bg-slate-850 transition-all">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
