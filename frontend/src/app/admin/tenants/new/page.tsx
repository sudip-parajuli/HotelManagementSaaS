"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Building2,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Database,
  Globe,
  User,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Gamepad2,
  Utensils,
  Timer,
  ParkingCircle,
  Mic,
  Circle,
  Briefcase,
  CreditCard,
  ShoppingCart,
  Receipt, BarChart3, Calendar, Layers, Clock,
  Users, Monitor, Package, Grid3X3,
  Heart, Wallet, DoorOpen, SprayCan,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { superAdminApi } from "@/lib/api/superadmin";
import { SubscriptionPlan, AddonModule } from "@/lib/types";
import { modulesApi } from "@/lib/api/modules";

const MODULE_ICONS: Record<string, React.ReactNode> = {
  billing: <Receipt className="h-4 w-4" />, analytics: <BarChart3 className="h-4 w-4" />,
  staff: <Users className="h-4 w-4" />, payroll: <Wallet className="h-4 w-4" />,
  inventory: <Package className="h-4 w-4" />, crm: <Heart className="h-4 w-4" />,
  rooms: <DoorOpen className="h-4 w-4" />, bookings: <Calendar className="h-4 w-4" />,
  frontdesk: <Layers className="h-4 w-4" />, housekeeping: <SprayCan className="h-4 w-4" />,
  pos: <Utensils className="h-4 w-4" />, kds: <Monitor className="h-4 w-4" />,
  table_mgmt: <Grid3X3 className="h-4 w-4" />, timed_sessions: <Timer className="h-4 w-4" />,
};

const BUSINESS_OPTIONS = [
  { key: "hotel", name: "Hotel / Resort", icon: <Building2 className="h-5 w-5" /> },
  { key: "restaurant", name: "Restaurant / Café", icon: <Utensils className="h-5 w-5" /> },
  { key: "gaming_cafe", name: "Gaming Café", icon: <Gamepad2 className="h-5 w-5" /> },
  { key: "coworking", name: "Co-working Space", icon: <Building2 className="h-5 w-5" /> },
  { key: "spa_salon", name: "Spa / Salon", icon: <Sparkles className="h-5 w-5" /> },
  { key: "billiards", name: "Billiards / Snooker", icon: <Circle className="h-5 w-5" /> },
  { key: "karaoke", name: "Karaoke Venue", icon: <Mic className="h-5 w-5" /> },
  { key: "parking", name: "Parking", icon: <ParkingCircle className="h-5 w-5" /> },
  { key: "other", name: "Other Business", icon: <Briefcase className="h-5 w-5" /> },
];

export default function OnboardTenant() {
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [allModules, setAllModules] = useState<AddonModule[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  const [name, setName] = useState("");
  const [schemaName, setSchemaName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [businessType, setBusinessType] = useState("hotel");
  const [planSlug, setPlanSlug] = useState("");
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      superAdminApi.getPlans(),
      modulesApi.listModules(),
    ]).then(([plansData, modulesData]) => {
      setPlans(plansData);
      setAllModules(modulesData);
      if (plansData.length > 0) {
        const defaultPlan = plansData.find((p) => p.is_active && p.is_public) || plansData[0];
        setPlanSlug(defaultPlan.slug);
      }
    }).catch((err) => console.error("Failed to load data", err))
    .finally(() => setPlansLoading(false));
  }, []);

  const coreModuleKeys = useMemo(
    () => new Set(allModules.filter((m) => m.is_core).map((m) => m.key)),
    [allModules]
  );

  useEffect(() => {
    const initial = new Set(coreModuleKeys);
    allModules.forEach((m) => {
      if (m.recommended_for.includes(businessType)) {
        initial.add(m.key);
      }
    });
    setSelectedModules(initial);
  }, [businessType, allModules, coreModuleKeys]);

  const handleNameChange = (val: string) => {
    setName(val);
    const slugified = val.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
    setSchemaName(slugified);
    const sub = val.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 20);
    setSubdomain(sub);
  };

  const toggleModule = (key: string) => {
    if (coreModuleKeys.has(key)) return;
    setSelectedModules((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload: any = {
        name,
        schema_name: schemaName,
        subdomain,
        admin_email: adminEmail,
        admin_password: adminPassword,
        contact_phone: contactPhone,
        business_type: businessType,
        plan_slug: planSlug,
      };

      const res = await superAdminApi.createTenant(payload);
      setSubmitSuccess(res);
    } catch (err: any) {
      console.error("Failed to onboard tenant", err);
      setError(err.response?.data?.error || err.message || "Failed to complete onboarding.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="max-w-xl mx-auto space-y-6 animate-in zoom-in duration-300">
        <div className="bg-workspace-900/40 backdrop-blur-md border border-brand-500/20 p-8 rounded-2xl shadow-2xl text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-[80%] bg-gradient-to-r from-transparent via-brand-500 to-transparent" />
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-brand-500/10 flex items-center justify-center border border-brand-500/30 shadow-lg shadow-brand-500/10">
              <CheckCircle2 className="h-8 w-8 text-brand-400" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground tracking-tight">Tenant Onboarded Successfully!</h2>
            <p className="text-workspace-400 text-sm">The isolated schema environment has been compiled, migrated, and seeded.</p>
          </div>
          <div className="bg-workspace-950/50 border border-workspace-900 rounded-xl p-5 text-left space-y-3 font-mono text-xs text-workspace-300">
            <div className="flex justify-between border-b border-workspace-900 pb-2">
              <span className="text-workspace-500">Tenant Name:</span>
              <span className="font-semibold text-foreground">{submitSuccess.name}</span>
            </div>
            <div className="flex justify-between border-b border-workspace-900 pb-2">
              <span className="text-workspace-500">Database Schema:</span>
              <span className="text-brand-400">{submitSuccess.schema_name}</span>
            </div>
            <div className="flex justify-between border-b border-workspace-900 pb-2">
              <span className="text-workspace-500">Routing Domain:</span>
              <span className="text-brand-400">{submitSuccess.domain}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-workspace-500">Assigned Plan:</span>
              <span className="text-emerald-400 font-semibold">{submitSuccess.plan}</span>
            </div>
          </div>
          <div className="pt-4 flex flex-col gap-3">
            <Link href="/admin/tenants" className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-medium text-sm py-2.5 rounded-xl transition-all shadow-md shadow-brand-500/20">
              Back to Tenants Directory
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/admin/tenants" className="inline-flex items-center gap-2 text-xs font-medium text-workspace-500 hover:text-workspace-200 transition-all">
        <ArrowLeft className="h-4 w-4" />
        Back to Tenants Directory
      </Link>

      <form onSubmit={handleSubmit}>
        <div className="bg-workspace-900/30 backdrop-blur-md border border-workspace-800/50 p-8 rounded-2xl shadow-xl relative overflow-hidden space-y-6">
          <div className="absolute top-0 right-0 h-40 w-40 bg-gradient-to-br from-brand-500/5 to-transparent blur-3xl rounded-full" />

          <div className="border-b border-workspace-800/60 pb-5">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-400" />
              Tenant Onboarding Wizard
            </h2>
            <p className="text-workspace-400 text-xs mt-1">
              Spin up an isolated PostgreSQL tenant schema with business-type-specific module activation.
            </p>
          </div>

          {error && (
            <div className="bg-rose-950/20 border border-rose-800/40 p-4 rounded-xl text-rose-400 text-xs">{error}</div>
          )}

          {/* Business Type */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-workspace-400 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-brand-400" /> Business Type
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {BUSINESS_OPTIONS.map((biz) => (
                <button key={biz.key} type="button" onClick={() => setBusinessType(biz.key)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all ${
                    businessType === biz.key
                      ? "border-brand-500/50 bg-brand-500/10 text-brand-300"
                      : "border-workspace-800 bg-workspace-900/60 text-workspace-400 hover:border-workspace-700"
                  }`}
                >
                  {biz.icon}
                  <span className="text-center leading-tight">{biz.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tenant Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-workspace-400 uppercase tracking-wider">Tenant / Business Name</label>
            <input type="text" required placeholder="e.g. Cyber Arena Gaming" value={name}
              onChange={(e) => handleNameChange(e.target.value)} disabled={submitting}
              className="w-full bg-workspace-950/80 border border-workspace-800 focus:border-brand-500/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder-workspace-600 transition-all"
            />
          </div>

          {/* Schema + Subdomain */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-workspace-400 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-brand-400" /> Schema Name
              </label>
              <input type="text" required pattern="^[a-z][a-z0-9_]{2,62}$"
                title="Must start with a letter and contain only lowercase letters, numbers, underscores (3-63 chars)"
                placeholder="e.g. cyber_arena_gaming" value={schemaName}
                onChange={(e) => setSchemaName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                disabled={submitting}
                className="w-full bg-workspace-950/80 border border-workspace-800 focus:border-brand-500/50 rounded-xl px-4 py-2.5 text-sm font-mono text-brand-400 outline-none placeholder-workspace-700 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-workspace-400 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-brand-400" /> Subdomain Prefix
              </label>
              <input type="text" required placeholder="e.g. cyberarena" value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                disabled={submitting}
                className="w-full bg-workspace-950/80 border border-workspace-800 focus:border-brand-500/50 rounded-xl px-4 py-2.5 text-sm font-mono text-brand-400 outline-none placeholder-slate-750 transition-all"
              />
            </div>
          </div>

          {/* Plan */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-workspace-400 uppercase tracking-wider">Subscription Plan</label>
            {plansLoading ? (
              <div className="flex items-center gap-2 py-2.5 text-xs text-workspace-500">
                <Loader2 className="h-3 w-3 animate-spin text-brand-500" /> Fetching pricing plans...
              </div>
            ) : (
              <select value={planSlug} onChange={(e) => setPlanSlug(e.target.value)} disabled={submitting}
                className="w-full bg-workspace-950/80 border border-workspace-800 focus:border-brand-500/50 rounded-xl px-4 py-2.5 text-sm text-workspace-200 outline-none transition-all"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.slug} className="bg-workspace-950 text-workspace-200">
                    {p.name} — Rs.{parseFloat(p.price_monthly).toLocaleString()}/mo
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Modules */}
          {allModules.length > 0 && (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-workspace-400 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-brand-400" /> Modules to Activate
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {allModules.filter((m) => m.is_active).map((mod) => {
                  const isCore = coreModuleKeys.has(mod.key);
                  const selected = selectedModules.has(mod.key);
                  return (
                    <button key={mod.key} type="button" onClick={() => toggleModule(mod.key)}
                      disabled={isCore}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                        selected
                          ? "border-brand-500/40 bg-brand-500/5 text-brand-300"
                          : "border-workspace-800 bg-workspace-900/40 text-workspace-400 hover:border-workspace-700"
                      } ${isCore ? "opacity-70 cursor-not-allowed" : ""}`}
                    >
                      <span className="text-brand-400">{MODULE_ICONS[mod.key]}</span>
                      <span className="truncate">{mod.name}</span>
                      {isCore && <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold ml-auto">CORE</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Admin Credentials */}
          <div className="border-t border-workspace-800/40 pt-5 space-y-4">
            <h3 className="text-xs font-bold text-workspace-400 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-brand-400" /> Administrator Credentials
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-workspace-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Admin Email
                </label>
                <input type="email" required placeholder="e.g. manager@business.com" value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)} disabled={submitting}
                  className="w-full bg-workspace-950/80 border border-workspace-800 focus:border-brand-500/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder-workspace-600 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-workspace-400 uppercase tracking-wider">Admin Password</label>
                <input type="password" required placeholder="SecurePassword123!" value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)} disabled={submitting}
                  className="w-full bg-workspace-950/80 border border-workspace-800 focus:border-brand-500/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder-slate-650 transition-all"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-workspace-400 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5" /> Contact Phone
              </label>
              <input type="text" placeholder="+977-9800000000" value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)} disabled={submitting}
                className="w-full bg-workspace-950/80 border border-workspace-800 focus:border-brand-500/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder-workspace-600 transition-all"
              />
            </div>
          </div>

          <button type="submit" disabled={submitting}
            className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 disabled:from-workspace-800 disabled:to-workspace-900 disabled:text-workspace-500 text-white font-medium text-sm py-3 rounded-xl transition-all shadow-lg shadow-brand-500/10"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Spinning up isolated DB schema & migrating...</>
            ) : (
              "Initialize Tenant Database"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
