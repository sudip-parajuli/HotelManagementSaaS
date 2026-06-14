"use client";

import React, { useEffect, useState } from "react";
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
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { superAdminApi } from "@/lib/api/superadmin";
import { SubscriptionPlan } from "@/lib/types";

export default function OnboardTenant() {
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  
  // Form state
  const [name, setName] = useState("");
  const [schemaName, setSchemaName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [planSlug, setPlanSlug] = useState("starter");
  const [contactPhone, setContactPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    superAdminApi.getPlans()
      .then((data) => {
        setPlans(data);
        if (data.length > 0) {
          // Default to first public plan slug or 'starter'
          const defaultPlan = data.find((p) => p.is_active && p.is_public) || data[0];
          setPlanSlug(defaultPlan.slug);
        }
      })
      .catch((err) => console.error("Failed to load plans", err))
      .finally(() => setPlansLoading(false));
  }, []);

  // Sync schema name and subdomain on hotel name change
  const handleNameChange = (val: string) => {
    setName(val);
    const slugified = val
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
    
    setSchemaName(slugified);

    const sub = val
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .substring(0, 20);
    setSubdomain(sub);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        name,
        schema_name: schemaName,
        subdomain,
        admin_email: adminEmail,
        admin_password: adminPassword,
        plan_slug: planSlug,
        contact_phone: contactPhone
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
        <div className="bg-slate-900/40 backdrop-blur-md border border-cyan-500/20 p-8 rounded-2xl shadow-2xl text-center space-y-6 relative overflow-hidden">
          {/* Glowing decorations */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-[80%] bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
          
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
              <CheckCircle2 className="h-8 w-8 text-cyan-400" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Hotel Onboarded Successfully!</h2>
            <p className="text-slate-400 text-sm">
              The isolated schema environment has been compiled, migrated, and seeded.
            </p>
          </div>

          {/* Details list */}
          <div className="bg-slate-950/50 border border-slate-900 rounded-xl p-5 text-left space-y-3 font-mono text-xs text-slate-300">
            <div className="flex justify-between border-b border-slate-900 pb-2">
              <span className="text-slate-500">Hotel Name:</span>
              <span className="font-semibold text-white">{submitSuccess.name}</span>
            </div>
            <div className="flex justify-between border-b border-slate-900 pb-2">
              <span className="text-slate-500">Database Schema:</span>
              <span className="text-cyan-400">{submitSuccess.schema_name}</span>
            </div>
            <div className="flex justify-between border-b border-slate-900 pb-2">
              <span className="text-slate-500">Routing Domain:</span>
              <span className="text-blue-400">{submitSuccess.domain}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Assigned Plan:</span>
              <span className="text-emerald-400 font-semibold">{submitSuccess.plan}</span>
            </div>
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <a
              href={`http://${submitSuccess.domain}:3000/login`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-medium text-sm py-2.5 rounded-xl transition-all shadow-md shadow-cyan-500/20"
            >
              Go to Hotel Login Portal
            </a>
            <Link
              href="/superadmin/tenants"
              className="w-full flex items-center justify-center py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 transition-all text-sm font-medium"
            >
              Back to Directory
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        href="/superadmin/tenants"
        className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-200 transition-all"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Tenants Directory
      </Link>

      {/* Form Card */}
      <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800/50 p-8 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 h-40 w-40 bg-gradient-to-br from-cyan-500/5 to-transparent blur-3xl rounded-full" />
        
        <div className="border-b border-slate-800/60 pb-5 mb-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-400" />
            Hotel Onboarding Wizard
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Fill in the details below to programmatically spin up an isolated postgres tenant schema and generate primary administrator credentials.
          </p>
        </div>

        {error && (
          <div className="bg-rose-950/20 border border-rose-800/40 p-4 rounded-xl text-rose-400 text-xs mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Row: Hotel Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Hotel Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Annapurna Royal Resort"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              disabled={submitting}
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder-slate-600 transition-all"
            />
          </div>

          {/* Row: Auto-derived Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="h-3 w-3 text-cyan-400" />
                Schema Name
              </label>
              <input
                type="text"
                required
                pattern="^[a-z][a-z0-9_]{2,62}$"
                title="Must start with a letter and contain only lowercase letters, numbers, and underscores (3-63 chars)"
                placeholder="e.g. annapurna_royal"
                value={schemaName}
                onChange={(e) => setSchemaName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                disabled={submitting}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-2.5 text-sm font-mono text-cyan-400 outline-none placeholder-slate-700 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="h-3 w-3 text-cyan-400" />
                Subdomain Prefix
              </label>
              <input
                type="text"
                required
                placeholder="e.g. annapurna"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                disabled={submitting}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-2.5 text-sm font-mono text-blue-400 outline-none placeholder-slate-750 transition-all"
              />
            </div>
          </div>

          {/* Row: Subscription Plan */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Subscription Plan Tier
            </label>
            {plansLoading ? (
              <div className="flex items-center gap-2 py-2.5 text-xs text-slate-500">
                <Loader2 className="h-3 w-3 animate-spin text-cyan-500" />
                Fetching pricing plans...
              </div>
            ) : (
              <select
                value={planSlug}
                onChange={(e) => setPlanSlug(e.target.value)}
                disabled={submitting}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none transition-all"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.slug} className="bg-slate-950 text-slate-200">
                    {p.name} — Rs.{parseFloat(p.price_monthly).toLocaleString()}/month ({p.max_rooms} rooms limit)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Title: Admin Credentials */}
          <div className="border-t border-slate-800/40 pt-5 mt-2 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-cyan-400" />
              Property Manager Administrator Credentials
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="h-3 w-3" />
                  Admin Email (Username)
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. manager@hotel.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  disabled={submitting}
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder-slate-600 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Admin Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="e.g. SecurePassword123!"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  disabled={submitting}
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder-slate-650 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="h-3 w-3" />
                Contact Phone Number
              </label>
              <input
                type="text"
                placeholder="e.g. +977-9800000000"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                disabled={submitting}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder-slate-600 transition-all"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:from-slate-800 disabled:to-slate-900 disabled:text-slate-500 text-white font-medium text-sm py-3 rounded-xl transition-all shadow-lg shadow-cyan-500/10"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Spinning up isolated DB schema & migrating (may take up to 30s)...
              </>
            ) : (
              "Initialize SaaS Tenant Database"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
