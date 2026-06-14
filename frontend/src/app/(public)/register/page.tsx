"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import axios from "axios";

// A small subcomponent that uses searchParams inside Suspense to avoid deopting Next.js page into CSR
function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlan = searchParams?.get("plan") || "starter";

  // Form State
  const [name, setName] = useState("");
  const [schemaName, setSchemaName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [planSlug, setPlanSlug] = useState(initialPlan);
  const [contactPhone, setContactPhone] = useState("");

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const onboardingSteps = [
    "Validating subdomain availability...",
    "Allocating isolated PostgreSQL database schema...",
    "Running database migrations & structural seed...",
    "Creating Property Manager administrator credentials...",
    "Redirecting to your hotel portal..."
  ];

  // Derive schema name and subdomain prefix on hotel name change
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

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (submitting && currentStep < onboardingSteps.length - 1) {
      // Rotate steps for user feedback
      timer = setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
      }, 4000);
    }
    return () => clearTimeout(timer);
  }, [submitting, currentStep]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(false);
    
    if (!name || !schemaName || !subdomain || !adminEmail || !adminPassword) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    setCurrentStep(0);

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

      // Call public onboarding view
      // Axios call directly to backend proxy route
      const res = await axios.post("/api/public/onboard/", payload);
      const data = res.data;

      toast.success("Hotel database schema initialized successfully!");
      setCurrentStep(onboardingSteps.length - 1);

      // Wait 1.5s then redirect to tenant domain login
      setTimeout(() => {
        const port = window.location.port ? `:${window.location.port}` : "";
        const redirectUrl = `http://${data.domain}${port}/login/`;
        window.location.href = redirectUrl;
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || err.message || "Failed to onboard hotel schema.");
      setSubmitting(false);
    }
  };

  if (submitting) {
    return (
      <div className="bg-slate-900/40 backdrop-blur-md border border-cyan-500/25 p-8 rounded-2xl shadow-2xl text-center space-y-6 max-w-md mx-auto animate-in zoom-in duration-300">
        <div className="flex justify-center">
          <div className="relative flex items-center justify-center">
            <div className="h-16 w-16 border-4 border-t-cyan-500 border-r-cyan-500 border-slate-900 rounded-full animate-spin" />
            <Database className="h-6 w-6 text-cyan-400 absolute" />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-bold text-white tracking-tight">Compiling Your Schema...</h3>
          <p className="text-slate-400 text-xs leading-relaxed min-h-[32px] transition-all duration-300">
            {onboardingSteps[currentStep]}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-1.5 rounded-full transition-all duration-500" 
            style={{ width: `${((currentStep + 1) / onboardingSteps.length) * 100}%` }}
          />
        </div>

        <p className="text-[10px] text-slate-500">
          Isolated environments setup typically takes 15-20 seconds.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-200 transition-all"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Landing Page
      </Link>

      {/* Form Card */}
      <div className="bg-slate-900/30 backdrop-blur-md border border-slate-900 p-8 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 h-40 w-40 bg-gradient-to-br from-cyan-500/5 to-transparent blur-3xl rounded-full" />

        <div className="border-b border-slate-900 pb-5 mb-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-400" />
            Create Your Hotel Workspace
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Fill in the registration details to provision your isolated tenant schema.
          </p>
        </div>

        {error && (
          <div className="bg-rose-950/20 border border-rose-500/20 p-4 rounded-xl text-rose-400 text-xs mb-6 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Row: Hotel Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Hotel Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Annapurna Royal Resort"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder-slate-600 transition-all"
            />
          </div>

          {/* Row: Auto-derived Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-cyan-400" />
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
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-2.5 text-sm font-mono text-cyan-400 outline-none placeholder-slate-700 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-cyan-400" />
                Subdomain Prefix
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  required
                  placeholder="e.g. annapurna"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-xl pl-4 pr-24 py-2.5 text-sm font-mono text-blue-450 outline-none placeholder-slate-750 transition-all"
                />
                <span className="absolute right-3 text-[10px] font-mono text-slate-500">.localhost</span>
              </div>
            </div>
          </div>

          {/* Row: Subscription Plan */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Subscription Plan Tier
            </label>
            <select
              value={planSlug}
              onChange={(e) => setPlanSlug(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none transition-all"
            >
              <option value="starter" className="bg-slate-950 text-slate-200">
                Starter Class — Rs. 10,000/month (Up to 20 rooms limit)
              </option>
              <option value="professional" className="bg-slate-950 text-slate-200">
                Professional Class — Rs. 25,000/month (Up to 100 rooms limit)
              </option>
              <option value="enterprise" className="bg-slate-950 text-slate-200">
                Enterprise Class — Rs. 60,000/month (Unlimited rooms limit)
              </option>
            </select>
          </div>

          {/* Title: Admin Credentials */}
          <div className="border-t border-slate-900 pt-5 mt-2 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-cyan-400" />
              Primary Administrator Credentials
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  Admin Email (Username) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. manager@hotel.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder-slate-600 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Admin Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="e.g. SecurePassword123!"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder-slate-650 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5" />
                Contact Phone Number
              </label>
              <input
                type="text"
                placeholder="e.g. +977-9800000000"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder-slate-600 transition-all"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-lg shadow-cyan-500/20"
          >
            Create Hotel Workspace
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function RegisterTenant() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 py-12 px-6">
      <Suspense fallback={
        <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
          <p className="text-slate-400 text-xs font-medium">Loading wizard assets...</p>
        </div>
      }>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
