"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  ArrowLeft,
  Users,
  BedDouble,
  CreditCard,
  ShieldCheck,
  Activity,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Globe,
  Mail,
  Phone,
  CalendarDays,
  Loader2,
  PlusCircle,
  Ban,
  BadgeCheck,
  ReceiptText,
  Unlock,
  Lock,
  ExternalLink,
  RefreshCw,
  Puzzle,
  ToggleLeft,
  ToggleRight,
  Layers,
} from "lucide-react";
import { superAdminApi } from "@/lib/api/superadmin";
import {
  Tenant,
  TenantSubscription,
  SubscriptionInvoice,
  TenantFeaturesResponse,
  TenantFeatureItem,
  TenantUsage,
  AddonModule,
  TenantModuleSubAdmin,
} from "@/lib/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  active:    "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  trial:     "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  past_due:  "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  cancelled: "bg-zinc-500/15 text-zinc-400 border border-zinc-500/30",
  suspended: "bg-red-500/15 text-red-400 border border-red-500/30",
};

const INVOICE_BADGE: Record<string, string> = {
  paid:    "bg-emerald-500/15 text-emerald-400",
  pending: "bg-amber-500/15 text-amber-400",
  failed:  "bg-red-500/15 text-red-400",
};

function fmt(date?: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function UsageBar({ used, limit }: { used: number; limit: number | null }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const color = pct > 85 ? "bg-red-500" : pct > 60 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-zinc-400">
        <span>{used} used</span>
        <span>{limit ?? "∞"} limit</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-700 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${limit ? pct : 0}%` }} />
      </div>
      <p className="text-right text-xs text-zinc-500">{limit ? `${pct}%` : "Unlimited"}</p>
    </div>
  );
}

// ─── Tab Definitions ────────────────────────────────────────────────────────

type Tab = "overview" | "usage" | "features" | "modules" | "billing" | "support";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "overview",  label: "Overview",  icon: <Building2 size={15} /> },
  { id: "usage",     label: "Usage",     icon: <Activity size={15} /> },
  { id: "features",  label: "Features",  icon: <Zap size={15} /> },
  { id: "modules",   label: "Modules",   icon: <Layers size={15} /> },
  { id: "billing",   label: "Billing",   icon: <CreditCard size={15} /> },
  { id: "support",   label: "Support",   icon: <ShieldCheck size={15} /> },
];

// ─── Main Component ─────────────────────────────────────────────────────────

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = Number(params.id);

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [subscription, setSubscription] = useState<TenantSubscription | null>(null);
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [features, setFeatures] = useState<TenantFeaturesResponse | null>(null);
  const [usage, setUsage] = useState<TenantUsage | null>(null);
  const [addonCatalog, setAddonCatalog] = useState<AddonModule[]>([]);
  const [moduleSubs, setModuleSubs] = useState<TenantModuleSubAdmin[]>([]);
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Grant Feature Modal
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantKey, setGrantKey] = useState("");
  const [grantReason, setGrantReason] = useState("");
  const [grantExpiry, setGrantExpiry] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, sub, inv, feat, usg, cat, modSubs] = await Promise.allSettled([
        superAdminApi.getTenant(tenantId),
        superAdminApi.getSubscriptionByTenant(tenantId),
        superAdminApi.getInvoicesByTenant(tenantId),
        superAdminApi.getTenantFeatures(tenantId),
        superAdminApi.getTenantUsage(tenantId),
        superAdminApi.getAddonCatalog(),
        superAdminApi.getTenantModuleSubscriptions(tenantId),
      ]);
      if (t.status === "fulfilled") setTenant(t.value);
      else setError("Tenant not found.");
      if (sub.status === "fulfilled") setSubscription(sub.value);
      if (inv.status === "fulfilled") setInvoices(inv.value);
      if (feat.status === "fulfilled") setFeatures(feat.value);
      if (usg.status === "fulfilled") setUsage(usg.value);
      if (cat.status === "fulfilled") setAddonCatalog(cat.value);
      if (modSubs.status === "fulfilled") setModuleSubs(modSubs.value);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleSuspendActivate = async () => {
    if (!tenant) return;
    setActionLoading("toggle");
    try {
      if (tenant.is_active) await superAdminApi.suspendTenant(tenantId);
      else await superAdminApi.activateTenant(tenantId);
      await loadAll();
    } finally {
      setActionLoading(null);
    }
  };

  const handleImpersonate = async () => {
    setActionLoading("impersonate");
    try {
      await superAdminApi.impersonateTenant(tenantId, "SuperAdmin direct access from tenant detail");
      router.push("/");
    } catch {
      setActionLoading(null);
    }
  };

  const handleGrantFeature = async () => {
    if (!grantKey.trim()) return;
    setActionLoading("grant");
    try {
      await superAdminApi.grantFeature(tenantId, grantKey.trim(), grantReason, grantExpiry || undefined);
      setShowGrantModal(false);
      setGrantKey(""); setGrantReason(""); setGrantExpiry("");
      const feat = await superAdminApi.getTenantFeatures(tenantId);
      setFeatures(feat);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeFeature = async (item: TenantFeatureItem) => {
    setActionLoading(`revoke-${item.key}`);
    try {
      await superAdminApi.revokeFeature(tenantId, item.key);
      const feat = await superAdminApi.getTenantFeatures(tenantId);
      setFeatures(feat);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleModule = async (addon: AddonModule, isGranted: boolean) => {
    const key = `toggle-${addon.key}`;
    setToggleLoading(key);
    try {
      if (isGranted) {
        await superAdminApi.revokeFeature(tenantId, addon.key);
      } else {
        await superAdminApi.grantFeature(tenantId, addon.key, `Toggled from admin panel`);
      }
      const feat = await superAdminApi.getTenantFeatures(tenantId);
      setFeatures(feat);
    } finally {
      setToggleLoading(null);
    }
  };

  const handleActivateModule = async (moduleKey: string) => {
    setActionLoading(`mod-activate-${moduleKey}`);
    try {
      await superAdminApi.activateTenantModule(tenantId, moduleKey);
      const subs = await superAdminApi.getTenantModuleSubscriptions(tenantId);
      setModuleSubs(subs);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivateModule = async (moduleKey: string) => {
    setActionLoading(`mod-deactivate-${moduleKey}`);
    try {
      await superAdminApi.deactivateTenantModule(tenantId, moduleKey);
      const subs = await superAdminApi.getTenantModuleSubscriptions(tenantId);
      setModuleSubs(subs);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkPaid = async (invoiceId: number) => {
    const ref = prompt("Enter payment reference:");
    if (!ref) return;
    setActionLoading(`pay-${invoiceId}`);
    try {
      await superAdminApi.markInvoicePaid(invoiceId, ref);
      const inv = await superAdminApi.getInvoicesByTenant(tenantId);
      setInvoices(inv);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-indigo-400" size={36} />
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="text-red-400" size={40} />
        <p className="text-zinc-400">{error ?? "Tenant not found."}</p>
        <Link href="/admin/tenants" className="text-indigo-400 hover:underline text-sm">← Back to Tenants</Link>
      </div>
    );
  }

  const subStatus = subscription?.status ?? "unknown";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-16">

      {/* ── Header ── */}
      <div className="border-b border-zinc-800 bg-zinc-900/60 px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <Link href="/admin/tenants" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 mb-4 transition-colors">
            <ArrowLeft size={14} /> Back to Tenants
          </Link>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                <Building2 className="text-indigo-400" size={22} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{tenant.name}</h1>
                <p className="text-sm text-zinc-500 font-mono">{tenant.schema_name}</p>
              </div>
              <span className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[subStatus] ?? "bg-zinc-700 text-zinc-400"}`}>
                {subStatus}
              </span>
              {!tenant.is_active && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/30">
                  Suspended
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleImpersonate}
                disabled={actionLoading === "impersonate"}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 hover:bg-violet-600/30 transition-all disabled:opacity-50"
              >
                {actionLoading === "impersonate" ? <Loader2 size={13} className="animate-spin" /> : <ExternalLink size={13} />}
                Impersonate
              </button>
              <button
                onClick={handleSuspendActivate}
                disabled={actionLoading === "toggle"}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-all disabled:opacity-50 ${
                  tenant.is_active
                    ? "bg-red-600/15 border-red-500/30 text-red-400 hover:bg-red-600/25"
                    : "bg-emerald-600/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/25"
                }`}
              >
                {actionLoading === "toggle" ? <Loader2 size={13} className="animate-spin" /> : tenant.is_active ? <Ban size={13} /> : <BadgeCheck size={13} />}
                {tenant.is_active ? "Suspend" : "Activate"}
              </button>
              <button onClick={loadAll} className="p-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-all">
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="border-b border-zinc-800 bg-zinc-900/40 px-6">
        <div className="max-w-6xl mx-auto flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.id
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tenant Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Tenant Details</h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { icon: <Mail size={14} />, label: "Email", value: tenant.contact_email },
                    { icon: <Phone size={14} />, label: "Phone", value: tenant.contact_phone ?? "—" },
                    { icon: <Globe size={14} />, label: "Schema", value: tenant.schema_name },
                    { icon: <CalendarDays size={14} />, label: "Created", value: fmt(tenant.created_on) },
                    { icon: <CalendarDays size={14} />, label: "Onboarded", value: fmt(tenant.onboarded_at) },
                    { icon: <BadgeCheck size={14} />, label: "Status", value: tenant.is_active ? "Active" : "Suspended" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-start gap-2.5">
                      <span className="mt-0.5 text-zinc-500">{row.icon}</span>
                      <div>
                        <dt className="text-xs text-zinc-500 mb-0.5">{row.label}</dt>
                        <dd className="text-sm text-zinc-200 font-medium">{row.value}</dd>
                      </div>
                    </div>
                  ))}
                </dl>
                {tenant.notes && (
                  <div className="mt-4 pt-4 border-t border-zinc-800">
                    <p className="text-xs text-zinc-500 mb-1">Internal Notes</p>
                    <p className="text-sm text-zinc-300">{tenant.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Subscription Summary */}
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Subscription</h2>
                {subscription ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-zinc-500">Plan</p>
                      <p className="text-lg font-bold text-white mt-0.5">{subscription.plan_details.name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-zinc-800/60 p-3">
                        <p className="text-xs text-zinc-500">Period Start</p>
                        <p className="text-sm font-medium mt-0.5">{fmt(subscription.current_period_start)}</p>
                      </div>
                      <div className="rounded-lg bg-zinc-800/60 p-3">
                        <p className="text-xs text-zinc-500">Next Billing</p>
                        <p className="text-sm font-medium mt-0.5">{fmt(subscription.next_billing_date)}</p>
                      </div>
                    </div>
                    {subscription.trial_ends_at && (
                      <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
                        <Clock size={14} /> Trial ends {fmt(subscription.trial_ends_at)}
                      </div>
                    )}
                    <div className="pt-2">
                      <p className="text-xs text-zinc-500 mb-1">Monthly Price</p>
                      <p className="text-2xl font-bold text-indigo-400">
                        Rs. {Number(subscription.plan_details.price_monthly).toLocaleString()}
                        <span className="text-sm font-normal text-zinc-500">/mo</span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-zinc-500 text-sm">No subscription found.</p>
                )}
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Quick Stats</h2>
                <div className="space-y-2">
                  {usage && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400 flex items-center gap-1.5"><BedDouble size={13}/> Rooms</span>
                        <span className="font-medium">{usage.rooms_used} / {usage.rooms_limit ?? "∞"}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400 flex items-center gap-1.5"><Users size={13}/> Staff</span>
                        <span className="font-medium">{usage.staff_used} / {usage.staff_limit ?? "∞"}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400 flex items-center gap-1.5"><ReceiptText size={13}/> Invoices</span>
                    <span className="font-medium">{invoices.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400 flex items-center gap-1.5"><Zap size={13}/> Features</span>
                    <span className="font-medium">{features?.features.filter((f) => f.in_plan || f.manually_granted).length ?? "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* USAGE */}
        {activeTab === "usage" && (
          <div className="max-w-2xl space-y-6">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-6">Resource Usage vs. Plan Limits</h2>
              {usage ? (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <BedDouble size={16} className="text-indigo-400" />
                      <span className="font-medium text-sm">Rooms</span>
                    </div>
                    <UsageBar used={usage.rooms_used} limit={usage.rooms_limit} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Users size={16} className="text-violet-400" />
                      <span className="font-medium text-sm">Staff Members</span>
                    </div>
                    <UsageBar used={usage.staff_used} limit={usage.staff_limit} />
                  </div>
                  <div className="pt-4 border-t border-zinc-800">
                    <p className="text-xs text-zinc-500">Plan: <span className="text-zinc-300 font-medium">{usage.plan ?? "—"}</span></p>
                    <p className="text-xs text-zinc-500 mt-1">Subscription Status: <span className={`font-medium ${usage.status === "active" ? "text-emerald-400" : "text-amber-400"}`}>{usage.status ?? "—"}</span></p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-500">
                  <Activity size={32} className="mx-auto mb-2 opacity-40" />
                  <p>Usage data unavailable</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* FEATURES */}
        {activeTab === "features" && (
          <div className="space-y-6">
            {/* Module Marketplace */}
            {addonCatalog.length > 0 && (
              <div>
                <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <Puzzle size={16} className="text-indigo-400" />
                  Module Marketplace
                  <span className="text-xs font-normal text-zinc-500">— Toggle modules on/off for this tenant</span>
                </h2>
                <p className="text-xs text-zinc-500 mb-4">
                  Plan: <span className="text-zinc-300 font-medium">{features?.plan ?? "—"}</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {addonCatalog.filter((m) => m.is_active).map((addon) => {
                    const featItem = features?.features?.find((f) => f.key === addon.key);
                    const isGranted = featItem?.in_plan || featItem?.manually_granted || false;
                    const loadingKey = `toggle-${addon.key}`;
                    const isToggling = toggleLoading === loadingKey;
                    return (
                      <div
                        key={addon.id}
                        className={`rounded-xl border p-4 transition-all ${
                          isGranted
                            ? "bg-emerald-900/10 border-emerald-700/30"
                            : "bg-zinc-900/30 border-zinc-800 hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-zinc-200 truncate">{addon.name}</p>
                            <p className="text-[10px] font-mono text-zinc-500 mt-0.5">{addon.key}</p>
                          </div>
                          <button
                            onClick={() => handleToggleModule(addon, isGranted)}
                            disabled={isToggling}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all flex-shrink-0 ${
                              isGranted ? "bg-emerald-500" : "bg-zinc-700"
                            }`}
                          >
                            {isToggling ? (
                              <Loader2 size={10} className="animate-spin text-white mx-auto" />
                            ) : (
                              <span
                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-all ${
                                  isGranted ? "translate-x-[18px]" : "translate-x-[2px]"
                                }`}
                              />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-zinc-500 line-clamp-2 mb-2">{addon.description}</p>
                        {featItem?.in_plan && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            <CheckCircle2 size={8} /> In Plan
                          </span>
                        )}
                        {featItem?.manually_granted && !featItem?.in_plan && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            <Unlock size={8} /> Granted
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Advanced Feature Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-zinc-400">All Feature Keys</h3>
                <button
                  onClick={() => setShowGrantModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/30 transition-all"
                >
                  <PlusCircle size={14} /> Grant Custom Feature
                </button>
              </div>

              {features?.features && features.features.length > 0 ? (
                <div className="rounded-xl border border-zinc-800 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-900/80">
                        <th className="text-left px-4 py-3 text-xs text-zinc-500 font-semibold uppercase tracking-wider">Feature Key</th>
                        <th className="text-center px-4 py-3 text-xs text-zinc-500 font-semibold uppercase tracking-wider">In Plan</th>
                        <th className="text-center px-4 py-3 text-xs text-zinc-500 font-semibold uppercase tracking-wider">Manual Grant</th>
                        <th className="text-left px-4 py-3 text-xs text-zinc-500 font-semibold uppercase tracking-wider">Expires</th>
                        <th className="text-left px-4 py-3 text-xs text-zinc-500 font-semibold uppercase tracking-wider">Reason</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {features.features.map((f) => (
                        <tr key={f.key} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                          <td className="px-4 py-3 font-mono text-indigo-300 font-medium">{f.key}</td>
                          <td className="px-4 py-3 text-center">
                            {f.in_plan
                              ? <CheckCircle2 size={16} className="text-emerald-400 mx-auto" />
                              : <XCircle size={16} className="text-zinc-600 mx-auto" />}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {f.manually_granted
                              ? <Unlock size={15} className="text-amber-400 mx-auto" />
                              : <Lock size={15} className="text-zinc-700 mx-auto" />}
                          </td>
                          <td className="px-4 py-3 text-zinc-400 text-xs">{fmt(f.grant_expires_at)}</td>
                          <td className="px-4 py-3 text-zinc-400 text-xs max-w-[180px] truncate">{f.grant_reason || "—"}</td>
                          <td className="px-4 py-3">
                            {f.manually_granted && (
                              <button
                                onClick={() => handleRevokeFeature(f)}
                                disabled={actionLoading === `revoke-${f.key}`}
                                className="text-xs px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
                              >
                                {actionLoading === `revoke-${f.key}` ? <Loader2 size={11} className="animate-spin" /> : "Revoke"}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-zinc-600 rounded-xl border border-zinc-800">
                  <Zap size={32} className="mx-auto mb-2 opacity-40" />
                  <p>No features defined yet.</p>
                </div>
              )}
            </div>

            {/* Grant Feature Modal */}
            {showGrantModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl">
                  <h3 className="text-lg font-bold text-white mb-4">Grant Feature Access</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Feature Key *</label>
                      <input
                        value={grantKey}
                        onChange={(e) => setGrantKey(e.target.value)}
                        placeholder="e.g. payroll, crm, analytics"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Reason</label>
                      <textarea
                        value={grantReason}
                        onChange={(e) => setGrantReason(e.target.value)}
                        placeholder="Why is this feature being granted?"
                        rows={2}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Expires At (optional)</label>
                      <input
                        type="date"
                        value={grantExpiry}
                        onChange={(e) => setGrantExpiry(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowGrantModal(false)}
                      className="flex-1 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleGrantFeature}
                      disabled={!grantKey.trim() || actionLoading === "grant"}
                      className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {actionLoading === "grant" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      Grant Access
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* BILLING */}
        {activeTab === "billing" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-white">Invoice History</h2>
              <span className="text-sm text-zinc-500">{invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</span>
            </div>

            {invoices.length > 0 ? (
              <div className="rounded-xl border border-zinc-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/80">
                      <th className="text-left px-4 py-3 text-xs text-zinc-500 font-semibold uppercase tracking-wider">Invoice</th>
                      <th className="text-left px-4 py-3 text-xs text-zinc-500 font-semibold uppercase tracking-wider">Plan</th>
                      <th className="text-left px-4 py-3 text-xs text-zinc-500 font-semibold uppercase tracking-wider">Period</th>
                      <th className="text-right px-4 py-3 text-xs text-zinc-500 font-semibold uppercase tracking-wider">Amount</th>
                      <th className="text-center px-4 py-3 text-xs text-zinc-500 font-semibold uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-3 text-zinc-400 font-mono text-xs">#{inv.id.toString().padStart(5, "0")}</td>
                        <td className="px-4 py-3 text-zinc-300">{inv.plan_name}</td>
                        <td className="px-4 py-3 text-zinc-400 text-xs">{fmt(inv.period_start)} – {fmt(inv.period_end)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-white">Rs. {Number(inv.amount).toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${INVOICE_BADGE[inv.status] ?? "bg-zinc-700"}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {inv.status === "pending" && (
                            <button
                              onClick={() => handleMarkPaid(inv.id)}
                              disabled={actionLoading === `pay-${inv.id}`}
                              className="text-xs px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                            >
                              {actionLoading === `pay-${inv.id}` ? <Loader2 size={11} className="animate-spin" /> : "Mark Paid"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-zinc-600 rounded-xl border border-zinc-800">
                <ReceiptText size={32} className="mx-auto mb-2 opacity-40" />
                <p>No invoices found for this tenant.</p>
              </div>
            )}
          </div>
        )}

        {/* MODULES */}
        {activeTab === "modules" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Layers size={16} className="text-indigo-400" />
                Module Subscriptions
              </h2>
              <span className="text-sm text-zinc-500">{moduleSubs.length} active</span>
            </div>

            {moduleSubs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {moduleSubs.map((sub) => {
                  const addon = addonCatalog.find((a) => a.key === sub.module_key);
                  const isLoadingAct =
                    actionLoading === `mod-activate-${sub.module_key}` ||
                    actionLoading === `mod-deactivate-${sub.module_key}`;
                  const isActive = sub.status === "active";
                  return (
                    <div
                      key={sub.id}
                      className={`rounded-xl border p-5 transition-all ${
                        isActive
                          ? "bg-emerald-900/10 border-emerald-700/30"
                          : "bg-zinc-900/30 border-zinc-800"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-white">{addon?.name || sub.module_name}</p>
                          <p className="text-[10px] font-mono text-zinc-500 mt-0.5">{sub.module_key}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          isActive
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                            : "bg-red-500/15 text-red-400 border border-red-500/20"
                        }`}>
                          {sub.status}
                        </span>
                      </div>

                      <div className="space-y-1.5 mb-4 text-xs text-zinc-500">
                        <div className="flex justify-between">
                          <span>Billing</span>
                          <span className="text-zinc-300 capitalize">{sub.billing_cycle}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Price at activation</span>
                          <span className="text-zinc-300">Rs. {Number(sub.price_at_activation).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Activated</span>
                          <span className="text-zinc-300">{fmt(sub.activated_at)}</span>
                        </div>
                        {sub.next_billing_date && (
                          <div className="flex justify-between">
                            <span>Next billing</span>
                            <span className="text-zinc-300">{fmt(sub.next_billing_date)}</span>
                          </div>
                        )}
                        {sub.cancelled_at && (
                          <div className="flex justify-between">
                            <span>Cancelled</span>
                            <span className="text-red-300">{fmt(sub.cancelled_at)}</span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() =>
                          isActive
                            ? handleDeactivateModule(sub.module_key)
                            : handleActivateModule(sub.module_key)
                        }
                        disabled={isLoadingAct}
                        className={`w-full flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-all disabled:opacity-50 ${
                          isActive
                            ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                        }`}
                      >
                        {isLoadingAct ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : isActive ? (
                          <ToggleLeft size={13} />
                        ) : (
                          <ToggleRight size={13} />
                        )}
                        {isActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-zinc-600 rounded-xl border border-zinc-800">
                <Layers size={32} className="mx-auto mb-2 opacity-40" />
                <p>No module subscriptions yet.</p>
                <p className="text-xs mt-1">Activate modules via the Features tab or the tenant's own settings.</p>
              </div>
            )}

            {/* Catalog quick reference */}
            {addonCatalog.length > 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Available Modules (Catalog)</h3>
                <div className="flex flex-wrap gap-2">
                  {addonCatalog.filter((m) => m.is_active).map((mod) => {
                    const isActive = moduleSubs.some((s) => s.module_key === mod.key && s.status === "active");
                    return (
                      <span
                        key={mod.key}
                        className={`text-xs px-2 py-0.5 rounded-full border ${
                          isActive
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : "border-zinc-700 text-zinc-500"
                        }`}
                      >
                        {mod.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SUPPORT */}
        {activeTab === "support" && (
          <div className="max-w-2xl space-y-6">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Support Actions</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleImpersonate}
                  disabled={actionLoading === "impersonate"}
                  className="flex items-center gap-2 p-4 rounded-xl border border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10 text-left transition-all group"
                >
                  <ExternalLink className="text-violet-400 group-hover:scale-110 transition-transform" size={18} />
                  <div>
                    <p className="text-sm font-medium text-violet-300">Impersonate Tenant</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Log in as this hotel's account</p>
                  </div>
                </button>

                <button
                  onClick={handleSuspendActivate}
                  disabled={actionLoading === "toggle"}
                  className={`flex items-center gap-2 p-4 rounded-xl border text-left transition-all group ${
                    tenant.is_active
                      ? "border-red-500/20 bg-red-500/5 hover:bg-red-500/10"
                      : "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10"
                  }`}
                >
                  {tenant.is_active
                    ? <Ban className="text-red-400 group-hover:scale-110 transition-transform" size={18} />
                    : <BadgeCheck className="text-emerald-400 group-hover:scale-110 transition-transform" size={18} />}
                  <div>
                    <p className={`text-sm font-medium ${tenant.is_active ? "text-red-300" : "text-emerald-300"}`}>
                      {tenant.is_active ? "Suspend Account" : "Reactivate Account"}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {tenant.is_active ? "Block all access to this tenant" : "Restore access for this tenant"}
                    </p>
                  </div>
                </button>
              </div>

              <div className="border-t border-zinc-800 pt-4">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Account Timeline</h3>
                <div className="space-y-2">
                  {[
                    { label: "Account Created", value: fmt(tenant.created_on) },
                    { label: "Onboarded At", value: fmt(tenant.onboarded_at) },
                    { label: "Subscription Since", value: fmt(subscription?.created_at) },
                    { label: "Current Period End", value: fmt(subscription?.current_period_end) },
                    ...(subscription?.cancelled_at ? [{ label: "Cancelled At", value: fmt(subscription.cancelled_at) }] : []),
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-zinc-500">{label}</span>
                      <span className="text-zinc-300 font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={16} />
                <div className="text-sm">
                  <p className="font-medium text-amber-300">Impersonation Warning</p>
                  <p className="text-zinc-400 mt-1 text-xs">
                    All impersonation sessions are logged with timestamps and recorded in the audit trail.
                    Use responsibly and only when required for support.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
