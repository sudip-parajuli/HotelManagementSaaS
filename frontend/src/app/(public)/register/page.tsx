"use client";

import { ThemeToggle } from "@/components/theme/ThemeProvider";
import React, { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Building2, 
  ArrowLeft, 
  Loader2, 
  Database, 
  Globe, 
  User, 
  ShieldCheck, 
  Smartphone,
  Sparkles,
  ArrowRight,
  Check,
  ChevronRight,
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
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import axios from "axios";
import { cn } from "@/lib/utils";

// ─── Shared module data (mirrors landing page) ───
const MODULES = [
  { key: "billing", name: "Billing & Invoicing", price: 500, cat: "universal", core: true, desc: "IRD-ready invoices, 10% SC + 13% VAT." },
  { key: "analytics", name: "Analytics & Reports", price: 500, cat: "universal", core: true, desc: "Revenue/occupancy/ADR trends, PDF/Excel exports." },
  { key: "rooms", name: "Room Management", price: 800, cat: "hospitality", core: false, desc: "Room types, floor layouts, status grid." },
  { key: "bookings", name: "Booking Engine", price: 1000, cat: "hospitality", core: false, desc: "Online reservations, availability calendar." },
  { key: "frontdesk", name: "Front Desk Ops", price: 600, cat: "hospitality", core: false, desc: "Check-in/out, guest folio, arrivals board." },
  { key: "housekeeping", name: "Housekeeping", price: 500, cat: "hospitality", core: false, desc: "Cleaning schedules, task assignment, lost & found." },
  { key: "pos", name: "Restaurant POS", price: 800, cat: "fnd", core: false, desc: "Menu, modifiers, KDS integration, table service." },
  { key: "kds", name: "Kitchen Display", price: 400, cat: "fnd", core: false, desc: "Real-time KOT routing, station prep tracking." },
  { key: "table_mgmt", name: "Table Management", price: 300, cat: "fnd", core: false, desc: "Table status lifecycle, floor plan coordinates." },
  { key: "timed_sessions", name: "Timed Sessions", price: 700, cat: "universal", core: false, desc: "Session billing for gaming, coworking, spas." },
  { key: "staff", name: "Staff & HR", price: 800, cat: "universal", core: false, desc: "Employee records, shifts, attendance, payroll-ready." },
  { key: "payroll", name: "Nepalese Payroll", price: 1200, cat: "universal", core: false, desc: "TDS tax, SSF contributions, salary slips." },
  { key: "inventory", name: "Inventory Mgmt", price: 700, cat: "universal", core: false, desc: "Suppliers, PO cycles, stock movements, recipe cost %." },
  { key: "crm", name: "CRM & Loyalty", price: 600, cat: "universal", core: false, desc: "Guest profiles, SMS campaigns, loyalty points." },
];

const CORE_KEYS = new Set(MODULES.filter((m) => m.core).map((m) => m.key));

const BUSINESS_RECOMMENDED: Record<string, string[]> = {
  hotel: ["rooms", "bookings", "frontdesk", "housekeeping", "pos", "kds", "table_mgmt", "staff", "payroll", "inventory", "crm"],
  restaurant: ["rooms", "bookings", "pos", "kds", "table_mgmt", "staff", "inventory", "crm"],
  gaming_cafe: ["timed_sessions", "pos", "kds", "staff", "crm", "inventory"],
  coworking: ["timed_sessions", "staff", "crm", "inventory"],
  spa_salon: ["timed_sessions", "staff", "crm", "inventory", "housekeeping"],
  billiards: ["timed_sessions", "pos", "staff", "crm"],
  karaoke: ["timed_sessions", "pos", "staff", "crm", "inventory"],
  parking: ["staff", "crm"],
  other: [],
};

const BUSINESS_LABELS: Record<string, { name: string; icon: React.ReactNode; title: string; nameLabel: string; namePlaceholder: string }> = {
  hotel: { name: "Hotel / Resort", icon: <Building2 className="h-5 w-5" />, title: "Create Your Hotel Workspace", nameLabel: "Hotel / Property Name", namePlaceholder: "e.g. Annapurna Royal Resort" },
  restaurant: { name: "Restaurant / Café", icon: <Utensils className="h-5 w-5" />, title: "Create Your Restaurant Workspace", nameLabel: "Restaurant / Café Name", namePlaceholder: "e.g. Himalayan Kitchen" },
  gaming_cafe: { name: "Gaming Café", icon: <Gamepad2 className="h-5 w-5" />, title: "Create Your Gaming Café Workspace", nameLabel: "Café Name", namePlaceholder: "e.g. Cyber Arena Gaming" },
  coworking: { name: "Co-working Space", icon: <Building2 className="h-5 w-5" />, title: "Create Your Coworking Workspace", nameLabel: "Space Name", namePlaceholder: "e.g. WorkHub Coworking" },
  spa_salon: { name: "Spa / Salon", icon: <Sparkles className="h-5 w-5" />, title: "Create Your Spa & Salon Workspace", nameLabel: "Spa / Salon Name", namePlaceholder: "e.g. Serenity Wellness Spa" },
  billiards: { name: "Billiards / Snooker", icon: <Circle className="h-5 w-5" />, title: "Create Your Billiards Workspace", nameLabel: "Venue Name", namePlaceholder: "e.g. Rack & Roll Billiards" },
  karaoke: { name: "Karaoke Venue", icon: <Mic className="h-5 w-5" />, title: "Create Your Karaoke Workspace", nameLabel: "Venue Name", namePlaceholder: "e.g. SingStar Karaoke" },
  parking: { name: "Parking", icon: <ParkingCircle className="h-5 w-5" />, title: "Create Your Parking Workspace", nameLabel: "Parking Name", namePlaceholder: "e.g. CitySecure Parking" },
  other: { name: "Other Business", icon: <Briefcase className="h-5 w-5" />, title: "Create Your Business Workspace", nameLabel: "Business Name", namePlaceholder: "e.g. My Business" },
};

const MODULE_ICONS: Record<string, React.ReactNode> = {
  billing: <Receipt className="h-4 w-4" />, analytics: <BarChart3 className="h-4 w-4" />,
  staff: <Users className="h-4 w-4" />, payroll: <Wallet className="h-4 w-4" />,
  inventory: <Package className="h-4 w-4" />, crm: <Heart className="h-4 w-4" />,
  rooms: <DoorOpen className="h-4 w-4" />, bookings: <Calendar className="h-4 w-4" />,
  frontdesk: <Layers className="h-4 w-4" />, housekeeping: <SprayCan className="h-4 w-4" />,
  pos: <Utensils className="h-4 w-4" />, kds: <Monitor className="h-4 w-4" />,
  table_mgmt: <Grid3X3 className="h-4 w-4" />, timed_sessions: <Timer className="h-4 w-4" />,
};

type Step = "account" | "modules" | "confirm";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessType = searchParams?.get("business_type") || "hotel";
  const biz = BUSINESS_LABELS[businessType] ?? BUSINESS_LABELS.hotel;
  const recommended = new Set(BUSINESS_RECOMMENDED[businessType] ?? []);

  const [step, setStep] = useState<Step>("account");

  // Account fields
  const [name, setName] = useState("");
  const [schemaName, setSchemaName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Module selection
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const progressSteps = [
    "Validating subdomain availability...",
    "Allocating isolated PostgreSQL database schema...",
    "Running database migrations & structural seed...",
    "Activating your selected modules...",
    "Creating administrator credentials...",
    "Redirecting to your portal...",
  ];

  // On mount, pre-select recommended modules
  useEffect(() => {
    const initial = new Set(recommended);
    CORE_KEYS.forEach((k) => initial.add(k));
    setSelectedModules(initial);
  }, [businessType]);

  const handleNameChange = (val: string) => {
    setName(val);
    const slugified = val.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
    setSchemaName(slugified);
    const sub = val.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 20);
    setSubdomain(sub);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (submitting && currentProgress < progressSteps.length - 1) {
      timer = setTimeout(() => setCurrentProgress((p) => p + 1), 3500);
    }
    return () => clearTimeout(timer);
  }, [submitting, currentProgress]);

  // Price computation
  const totalMonthly = useMemo(() => {
    let total = 0;
    Array.from(selectedModules).forEach((key) => {
      const mod = MODULES.find((m) => m.key === key);
      if (!mod) return;
      total += billingCycle === "yearly" ? mod.price : mod.price;
    });
    return total;
  }, [selectedModules, billingCycle]);

  const totalYearly = useMemo(() => {
    let total = 0;
    Array.from(selectedModules).forEach((key) => {
      const mod = MODULES.find((m) => m.key === key);
      if (!mod) return;
      total += mod.price * (billingCycle === "yearly" ? 10 : 12);
    });
    return total;
  }, [selectedModules, billingCycle]);

  const yearlySavings = useMemo(() => {
    const monthlyTotal = (() => {
      let t = 0;
      Array.from(selectedModules).forEach((key) => {
        const mod = MODULES.find((m) => m.key === key);
        if (mod) t += mod.price;
      });
      return t;
    })();
    return monthlyTotal * 12 - totalYearly;
  }, [selectedModules, totalYearly]);

  const toggleModule = (key: string) => {
    if (CORE_KEYS.has(key)) return;
    setSelectedModules((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSubmit = async () => {
    setError(null);
    if (!name || !schemaName || !subdomain || !adminEmail || !adminPassword) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    setCurrentProgress(0);

    try {
      const payload = {
        name,
        schema_name: schemaName,
        subdomain,
        admin_email: adminEmail,
        admin_password: adminPassword,
        contact_phone: contactPhone,
        business_type: businessType,
        modules: Array.from(selectedModules),
        billing_cycle: billingCycle,
      };

      const res = await axios.post("/api/public/onboard/", payload);
      const data = res.data;

      toast.success("Workspace created!");
      setCurrentProgress(progressSteps.length - 1);

      setTimeout(() => {
        const port = window.location.port ? `:${window.location.port}` : "";
        window.location.href = `http://${data.domain}${port}/login/`;
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || err.message || "Failed to onboard workspace.");
      setSubmitting(false);
    }
  };

  // ─── Progress screen ───
  if (submitting) {
    return (
      <div className="bg-workspace-900/40 backdrop-blur-md border border-brand-500/25 p-8 rounded-2xl shadow-2xl text-center space-y-6 max-w-md mx-auto animate-in zoom-in duration-300">
        <div className="flex justify-center">
          <div className="relative flex items-center justify-center">
            <div className="h-16 w-16 border-4 border-t-cyan-500 border-r-cyan-500 border-workspace-900 rounded-full animate-spin" />
            <Database className="h-6 w-6 text-brand-400 absolute" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-foreground tracking-tight">Compiling Your Workspace...</h3>
          <p className="text-workspace-400 text-xs leading-relaxed min-h-[32px] transition-all duration-300">{progressSteps[currentProgress]}</p>
        </div>
        <div className="w-full bg-workspace-950 rounded-full h-1.5 overflow-hidden">
          <div className="bg-gradient-to-r from-brand-500 to-brand-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${((currentProgress + 1) / progressSteps.length) * 100}%` }} />
        </div>
        <p className="text-[10px] text-workspace-500">Setting up your isolated environment...</p>
      </div>
    );
  }

  const isModuleStepValid = selectedModules.size > 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-workspace-500 hover:text-workspace-200 transition-all">
        <ArrowLeft className="h-4 w-4" /> Back to Landing Page
      </Link>

      <div className="bg-workspace-900/30 backdrop-blur-md border border-workspace-900 p-8 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 h-40 w-40 bg-gradient-to-br from-brand-500/5 to-transparent blur-3xl rounded-full" />

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {(["account", "modules", "confirm"] as Step[]).map((s, i) => (
            <React.Fragment key={s}>
              <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors",
                step === s ? "bg-brand-500/20 text-brand-400" : ["account", "modules", "confirm"].indexOf(step) > i ? "bg-emerald-500/20 text-emerald-400" : "text-workspace-600"
              )}>
                <div className={cn(
                  "h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold",
                  step === s ? "bg-brand-500 text-white" : ["account", "modules", "confirm"].indexOf(step) > i ? "bg-emerald-500 text-white" : "bg-workspace-800 text-workspace-500"
                )}>
                  {["account", "modules", "confirm"].indexOf(step) > i ? <Check className="h-2.5 w-2.5" /> : i + 1}
                </div>
                <span className={cn(step !== s && ["account", "modules", "confirm"].indexOf(step) <= i && "hidden sm:inline")}>
                  {s === "account" ? "Account" : s === "modules" ? "Modules" : "Confirm"}
                </span>
              </div>
              {i < 2 && <div className="h-px w-6 bg-workspace-800" />}
            </React.Fragment>
          ))}
        </div>

        {error && (
          <div className="bg-rose-950/20 border border-rose-500/20 p-4 rounded-xl text-rose-400 text-xs mb-6 font-medium">{error}</div>
        )}

        {/* ──────── Step 1: Account Info ──────── */}
        {step === "account" && (
          <div>
            <div className="border-b border-workspace-900 pb-5 mb-6">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-brand-400" /> {biz.title}
              </h2>
              <p className="text-workspace-400 text-xs mt-1">First, tell us about your business.</p>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-500/5 border border-brand-500/10 text-brand-400 text-xs font-semibold mb-5">
              {biz.icon} {biz.name}
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-workspace-400 uppercase tracking-wider">{biz.nameLabel} *</label>
                <input type="text" required placeholder={biz.namePlaceholder} value={name} onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-workspace-950 border border-workspace-800 focus:border-brand-500/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder-workspace-600 transition-all" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-workspace-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5 text-brand-400" /> Schema Name
                  </label>
                  <input type="text" required pattern="^[a-z][a-z0-9_]{2,62}$" title="Lowercase letters, numbers, underscores (3-63 chars)"
                    placeholder="e.g. my_business" value={schemaName}
                    onChange={(e) => setSchemaName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    className="w-full bg-workspace-950 border border-workspace-800 focus:border-brand-500/50 rounded-xl px-4 py-2.5 text-sm font-mono text-brand-400 outline-none placeholder-workspace-700 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-workspace-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-brand-400" /> Subdomain Prefix
                  </label>
                  <div className="relative flex items-center">
                    <input type="text" required placeholder="e.g. mybusiness" value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                      className="w-full bg-workspace-950 border border-workspace-800 focus:border-brand-500/50 rounded-xl pl-4 pr-24 py-2.5 text-sm font-mono outline-none placeholder-workspace-700 transition-all text-workspace-200" />
                    <span className="absolute right-3 text-[10px] font-mono text-workspace-500">.localhost</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-workspace-900 pt-4 space-y-4">
                <h3 className="text-xs font-bold text-workspace-400 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-brand-400" /> Administrator Credentials
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-workspace-400 uppercase tracking-wider flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Admin Email *</label>
                    <input type="email" required placeholder="e.g. manager@business.com" value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full bg-workspace-950 border border-workspace-800 focus:border-brand-500/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder-workspace-600 transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-workspace-400 uppercase tracking-wider">Password *</label>
                    <input type="password" required placeholder="SecurePassword123!" value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full bg-workspace-950 border border-workspace-800 focus:border-brand-500/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder-workspace-600 transition-all" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-workspace-400 uppercase tracking-wider flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" /> Contact Phone</label>
                  <input type="text" placeholder="+977-9800000000" value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full bg-workspace-950 border border-workspace-800 focus:border-brand-500/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder-workspace-600 transition-all" />
                </div>
              </div>
            </div>

            <button onClick={() => setStep("modules")}
              className="w-full mt-6 flex items-center justify-center gap-2 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-lg shadow-brand-500/20">
              Next: Select Modules <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ──────── Step 2: Module Selection ──────── */}
        {step === "modules" && (
          <div>
            <button onClick={() => setStep("account")} className="flex items-center gap-1 text-sm text-workspace-400 hover:text-white mb-4 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <div className="border-b border-workspace-900 pb-4 mb-5">
              <h2 className="text-lg font-bold text-foreground">Choose Your Modules</h2>
              <p className="text-workspace-400 text-xs mt-1">Recommended modules for {biz.name} are pre-selected. Toggle any you want.</p>
            </div>

            {/* Core modules (always on) */}
            <div className="mb-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-workspace-500 mb-2">Always Included (Core)</h3>
              <div className="space-y-2">
                {MODULES.filter((m) => m.core).map((mod) => (
                  <div key={mod.key} className="bg-workspace-900/60 border border-workspace-800 rounded-xl px-4 py-3 flex items-center gap-3 opacity-70">
                    <div className="h-7 w-7 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">{mod.name}</div>
                      <div className="text-[11px] text-workspace-500 truncate">{mod.desc}</div>
                    </div>
                    <span className="text-xs text-workspace-500 font-medium whitespace-nowrap">NPR {mod.price}/mo</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended modules */}
            {recommended.size > 0 && (
              <div className="mb-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-workspace-500 mb-2">Recommended for {biz.name}</h3>
                <div className="space-y-2">
                  {MODULES.filter((m) => !m.core && recommended.has(m.key)).map((mod) => (
                    <ModuleToggle key={mod.key} mod={mod} selected={selectedModules.has(mod.key)} onToggle={() => toggleModule(mod.key)} />
                  ))}
                </div>
              </div>
            )}

            {/* Other modules */}
            <div className="mb-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-workspace-500 mb-2">Additional Modules</h3>
              <div className="space-y-2">
                {MODULES.filter((m) => !m.core && !recommended.has(m.key)).map((mod) => (
                  <ModuleToggle key={mod.key} mod={mod} selected={selectedModules.has(mod.key)} onToggle={() => toggleModule(mod.key)} />
                ))}
              </div>
            </div>

            {/* Pricing summary + continue */}
            <div className="mt-6 p-4 rounded-xl bg-workspace-900 border border-workspace-800">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-workspace-400">{selectedModules.size} module{selectedModules.size !== 1 ? "s" : ""} selected</div>
                  <div className="text-xl font-bold text-white">
                    NPR {totalMonthly.toLocaleString("en-IN", { maximumFractionDigits: 0 })}<span className="text-xs text-workspace-500 font-normal">/mo</span>
                  </div>
                </div>
                <button onClick={() => setStep("confirm")}
                  className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all">
                  Review <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ──────── Step 3: Confirm ──────── */}
        {step === "confirm" && (
          <div>
            <button onClick={() => setStep("modules")} className="flex items-center gap-1 text-sm text-workspace-400 hover:text-white mb-4 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <div className="border-b border-workspace-900 pb-4 mb-5">
              <h2 className="text-lg font-bold text-foreground">Review & Confirm</h2>
              <p className="text-workspace-400 text-xs mt-1">Choose your billing cycle and confirm.</p>
            </div>

            {/* Billing cycle */}
            <div className="flex gap-3 mb-5">
              <button onClick={() => setBillingCycle("monthly")} className={cn(
                "flex-1 p-4 rounded-xl border text-center transition-all",
                billingCycle === "monthly" ? "border-brand-500 bg-brand-500/10" : "border-workspace-800 bg-workspace-900 hover:border-workspace-700"
              )}>
                <CreditCard className="h-5 w-5 mx-auto mb-1 text-brand-400" />
                <div className="font-semibold text-sm">Monthly</div>
                <div className="text-xs text-workspace-400">NPR {totalMonthly.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/mo</div>
              </button>
              <button onClick={() => setBillingCycle("yearly")} className={cn(
                "flex-1 p-4 rounded-xl border text-center transition-all relative",
                billingCycle === "yearly" ? "border-brand-500 bg-brand-500/10" : "border-workspace-800 bg-workspace-900 hover:border-workspace-700"
              )}>
                {yearlySavings > 0 && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-[10px] text-white font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                    Save NPR {(yearlySavings / 1000).toFixed(0)}K
                  </div>
                )}
                <ShoppingCart className="h-5 w-5 mx-auto mb-1 text-brand-400" />
                <div className="font-semibold text-sm">Yearly</div>
                <div className="text-xs text-workspace-400">NPR {totalYearly.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/yr</div>
                <div className="text-[10px] text-emerald-400">({Math.round((1 - totalYearly / (totalMonthly * 12)) * 100)}% off)</div>
              </button>
            </div>

            {/* Selected modules summary */}
            <div className="bg-workspace-900 border border-workspace-800 rounded-xl p-4 mb-5">
              <h3 className="font-semibold text-sm mb-3 text-foreground">{selectedModules.size} module{selectedModules.size !== 1 ? "s" : ""}</h3>
              <div className="space-y-2">
                {MODULES.filter((m) => selectedModules.has(m.key)).map((mod) => {
                  const price = billingCycle === "yearly" ? mod.price * 10 / 12 : mod.price;
                  return (
                    <div key={mod.key} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className={cn("h-1.5 w-1.5 rounded-full", mod.core ? "bg-emerald-400" : "bg-brand-400")} />
                        <span className="text-workspace-200">{mod.name}</span>
                        {mod.core && <span className="text-[10px] text-emerald-400 font-medium">Core</span>}
                      </div>
                      <span className="text-workspace-400">NPR {price.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/mo</span>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-workspace-800 mt-3 pt-3 flex items-center justify-between font-semibold">
                <span className="text-foreground">Total</span>
                <span className="text-foreground">
                  {billingCycle === "monthly"
                    ? `NPR ${totalMonthly.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/mo`
                    : `NPR ${(totalYearly / 12).toLocaleString("en-IN", { maximumFractionDigits: 0 })}/mo (billed yearly)`}
                </span>
              </div>
            </div>

            <button onClick={handleSubmit}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-lg shadow-brand-500/20">
              <Sparkles className="h-4 w-4" /> Create {biz.name} Workspace
            </button>
            <p className="text-[10px] text-workspace-500 text-center mt-2">14-day free trial. No payment required.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ModuleToggle({ mod, selected, onToggle }: { mod: typeof MODULES[0]; selected: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all",
      selected ? "border-brand-500/40 bg-brand-500/5" : "border-workspace-800 bg-workspace-900/40 hover:border-workspace-700"
    )}>
      <div className={cn(
        "h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
        selected ? "bg-brand-500 border-brand-500" : "border-workspace-600"
      )}>
        {selected && <Check className="h-3 w-3 text-white" />}
      </div>
      <div className="h-7 w-7 rounded-lg bg-workspace-800 flex items-center justify-center flex-shrink-0">
        {MODULE_ICONS[mod.key] ?? <Package className="h-4 w-4 text-workspace-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground">{mod.name}</div>
        <div className="text-[11px] text-workspace-500 truncate">{mod.desc}</div>
      </div>
      <span className="text-xs text-workspace-400 font-medium whitespace-nowrap">NPR {mod.price}/mo</span>
    </div>
  );
}

export default function RegisterTenant() {
  return (
    <div className="min-h-screen bg-background text-workspace-100 py-12 px-6">
      <div className="fixed right-5 top-5 z-50"><ThemeToggle /></div>
      <Suspense fallback={
        <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-brand-400" />
          <p className="text-workspace-400 text-xs font-medium">Loading...</p>
        </div>
      }>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
