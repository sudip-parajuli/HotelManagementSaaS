"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { modulesApi, BusinessType, AddonModule, TenantInfo } from "@/lib/api/modules";
import { authClient } from "@/lib/api/client";
import {
  Hotel, UtensilsCrossed, Gamepad2, Building2, Sparkles,
  Dices, Mic2, ParkingCircle, Store, Loader2, Check, X,
  ChevronRight, CreditCard, ShoppingCart, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const BUSINESS_ICONS: Record<string, React.ComponentType<any>> = {
  hotel: Hotel,
  restaurant: UtensilsCrossed,
  gaming_cafe: Gamepad2,
  coworking: Building2,
  spa_salon: Sparkles,
  billiards: Dices,
  karaoke: Mic2,
  parking: ParkingCircle,
  other: Store,
};

type Step = "business-type" | "modules" | "billing";

export default function SetupPage() {
  const router = useRouter();
  const { setUser, setFeatures } = useAuthStore();
  const [step, setStep] = useState<Step>("business-type");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [modules, setModules] = useState<AddonModule[]>([]);
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);

  const [selectedBiz, setSelectedBiz] = useState<string | null>(null);
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    Promise.all([
      modulesApi.listBusinessTypes(),
      modulesApi.listModules(),
      modulesApi.getTenantInfo(),
    ])
      .then(([bts, mods, info]) => {
        setBusinessTypes(bts);
        setModules(mods.filter((m) => m.is_active));
        setTenantInfo(info);
        if (info.business_type) {
          setSelectedBiz(info.business_type);
          setSelectedModules(new Set(info.active_modules));
        }
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, []);

  const bizTypes = useMemo(
    () => businessTypes.filter((bt) => bt.key !== "other" || true),
    [businessTypes]
  );

  const recommendedForSelected = useMemo(() => {
    if (!selectedBiz) return new Set<string>();
    const bt = businessTypes.find((b) => b.key === selectedBiz);
    return new Set(bt?.recommended_modules ?? []);
  }, [selectedBiz, businessTypes]);

  const coreModules = useMemo(
    () => modules.filter((m) => m.is_core),
    [modules]
  );

  const nonCoreModules = useMemo(
    () => modules.filter((m) => !m.is_core),
    [modules]
  );

  const activeSelectedModules = useMemo(() => {
    const all = new Set(selectedModules);
    coreModules.forEach((m) => all.add(m.key));
    return Array.from(all);
  }, [selectedModules, coreModules]);

  const totalMonthly = useMemo(() => {
    let total = 0;
    for (const key of activeSelectedModules) {
      const mod = modules.find((m) => m.key === key);
      if (!mod) continue;
      const monthly = parseFloat(mod.price_monthly || "0");
      if (billingCycle === "yearly") {
        const yearly = mod.price_yearly
          ? parseFloat(mod.price_yearly)
          : monthly * 12;
        total += yearly / 12;
      } else {
        total += monthly;
      }
    }
    return total;
  }, [activeSelectedModules, modules, billingCycle]);

  const totalYearly = useMemo(() => {
    let total = 0;
    for (const key of activeSelectedModules) {
      const mod = modules.find((m) => m.key === key);
      if (!mod) continue;
      const monthly = parseFloat(mod.price_monthly || "0");
      total += mod.price_yearly
        ? parseFloat(mod.price_yearly)
        : monthly * 12;
    }
    return total;
  }, [activeSelectedModules, modules]);

  const yearlySavings = totalMonthly * 12 - totalYearly;

  const handleSelectBiz = async (key: string) => {
    setSelectedBiz(key);
    const bt = businessTypes.find((b) => b.key === key);
    if (bt) {
      const rec = new Set(bt.recommended_modules);
      setSelectedModules(rec);
    }
    await modulesApi.updateTenantBusinessType({ business_type: key }).catch(() => {});
    setStep("modules");
  };

  const toggleModule = (key: string) => {
    const next = new Set(selectedModules);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedModules(next);
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const keys = Array.from(activeSelectedModules);
      await modulesApi.activateModules(keys, billingCycle);
      await authClient.get("/features").then((r) => setFeatures(r.data.features ?? []));
      toast.success("Modules activated! You can now use your selected features.");
      router.push("/");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to activate modules");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex h-12 w-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 items-center justify-center mb-4 shadow-lg shadow-cyan-500/20">
            <Hotel className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Welcome to Staywired</h1>
          <p className="text-slate-400 mt-1">Let us set up your workspace in a few steps</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {(["business-type", "modules", "billing"] as Step[]).map((s, i) => (
            <React.Fragment key={s}>
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                step === s
                  ? "bg-cyan-500/20 text-cyan-400"
                  : ["business-type", "modules", "billing"].indexOf(step) > i
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-slate-600"
              )}>
                <div className={cn(
                  "h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold",
                  step === s ? "bg-cyan-500 text-white" :
                  ["business-type", "modules", "billing"].indexOf(step) > i ? "bg-emerald-500 text-white" :
                  "bg-slate-800 text-slate-500"
                )}>
                  {["business-type", "modules", "billing"].indexOf(step) > i ? <Check className="h-3 w-3" /> : i + 1}
                </div>
                <span className={cn(
                  step !== s && ["business-type", "modules", "billing"].indexOf(step) <= i && "hidden sm:inline"
                )}>
                  {s === "business-type" ? "Business Type" : s === "modules" ? "Modules" : "Billing"}
                </span>
              </div>
              {i < 2 && <div className="h-px w-8 bg-slate-800" />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Business Type */}
        {step === "business-type" && (
          <div>
            <h2 className="text-xl font-semibold mb-2">What kind of business do you run?</h2>
            <p className="text-slate-400 mb-6">Select your business type to get recommended modules.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {bizTypes.map((bt) => {
                const Icon = BUSINESS_ICONS[bt.key] || Store;
                return (
                  <button
                    key={bt.key}
                    onClick={() => handleSelectBiz(bt.key)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-5 rounded-xl border transition-all text-center",
                      selectedBiz === bt.key
                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                        : "border-slate-800 bg-slate-900 hover:border-slate-700 text-slate-300 hover:text-white"
                    )}
                  >
                    <Icon className="h-8 w-8" />
                    <span className="font-medium text-sm">{bt.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Module Selection */}
        {step === "modules" && (
          <div>
            <button
              onClick={() => setStep("business-type")}
              className="flex items-center gap-1 text-sm text-slate-400 hover:text-white mb-4 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <h2 className="text-xl font-semibold mb-2">Choose your modules</h2>
            <p className="text-slate-400 mb-6">
              {selectedBiz
                ? `Recommended modules for ${businessTypes.find((b) => b.key === selectedBiz)?.name} are pre-selected.`
                : "Select the modules you need."}
            </p>

            {/* Core modules (always on) */}
            {coreModules.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Included (always active)</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {coreModules.map((mod) => (
                    <Card key={mod.key} className="bg-slate-900 border-slate-800 p-4 flex items-center gap-3 opacity-75">
                      <div className="h-9 w-9 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <Check className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-white">{mod.name}</div>
                        <div className="text-xs text-slate-500 truncate">{mod.description}</div>
                      </div>
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px] whitespace-nowrap">
                        Included
                      </Badge>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended modules */}
            {recommendedForSelected.size > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                  Recommended for {businessTypes.find((b) => b.key === selectedBiz)?.name}
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {nonCoreModules
                    .filter((m) => recommendedForSelected.has(m.key))
                    .map((mod) => (
                      <ModuleCard
                        key={mod.key}
                        mod={mod}
                        selected={activeSelectedModules.includes(mod.key)}
                        onToggle={() => toggleModule(mod.key)}
                        modules={modules}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* More modules */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">More modules</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {nonCoreModules
                  .filter((m) => !recommendedForSelected.has(m.key))
                  .map((mod) => (
                    <ModuleCard
                      key={mod.key}
                      mod={mod}
                      selected={activeSelectedModules.includes(mod.key)}
                      onToggle={() => toggleModule(mod.key)}
                      modules={modules}
                    />
                  ))}
              </div>
            </div>

            {/* Pricing summary */}
            <div className="mt-8 p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-400">
                    Your plan: <span className="text-white font-semibold">{activeSelectedModules.length} modules</span>
                  </div>
                  <div className="text-lg font-bold text-white">
                    NPR {totalMonthly.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/month
                    {billingCycle === "yearly" && (
                      <span className="text-sm font-normal text-emerald-400 ml-2">
                        (NPR {totalYearly.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/year — saves {
                          yearlySavings > 0 ? `NPR ${yearlySavings.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "0"
                        })
                      </span>
                    )}
                  </div>
                </div>
                <Button onClick={() => setStep("billing")}>
                  Continue <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Billing + Confirm */}
        {step === "billing" && (
          <div>
            <button
              onClick={() => setStep("modules")}
              className="flex items-center gap-1 text-sm text-slate-400 hover:text-white mb-4 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <h2 className="text-xl font-semibold mb-2">Billing &amp; confirmation</h2>
            <p className="text-slate-400 mb-6">Choose your billing cycle and confirm your module selection.</p>

            {/* Billing cycle toggle */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={cn(
                  "flex-1 p-4 rounded-xl border text-center transition-all",
                  billingCycle === "monthly"
                    ? "border-cyan-500 bg-cyan-500/10"
                    : "border-slate-800 bg-slate-900 hover:border-slate-700"
                )}
              >
                <CreditCard className="h-5 w-5 mx-auto mb-1" />
                <div className="font-semibold">Monthly</div>
                <div className="text-sm text-slate-400">
                  NPR {totalMonthly.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/mo
                </div>
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={cn(
                  "flex-1 p-4 rounded-xl border text-center transition-all relative",
                  billingCycle === "yearly"
                    ? "border-cyan-500 bg-cyan-500/10"
                    : "border-slate-800 bg-slate-900 hover:border-slate-700"
                )}
              >
                {yearlySavings > 0 && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-[10px] text-white font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                    Save {yearlySavings > 1000
                      ? `NPR ${(yearlySavings / 1000).toFixed(0)}K`
                      : `NPR ${yearlySavings.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
                  </div>
                )}
                <ShoppingCart className="h-5 w-5 mx-auto mb-1" />
                <div className="font-semibold">Yearly</div>
                <div className="text-sm text-slate-400">
                  NPR {totalYearly.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/yr
                </div>
                <div className="text-[10px] text-emerald-400">
                  ({Math.round((1 - totalYearly / (totalMonthly * 12)) * 100)}% off)
                </div>
              </button>
            </div>

            {/* Module summary */}
            <Card className="bg-slate-900 border-slate-800 p-4 mb-6">
              <h3 className="font-semibold text-sm mb-3">
                {activeSelectedModules.length} selected module{activeSelectedModules.length !== 1 ? "s" : ""}
              </h3>
              <div className="space-y-2">
                {modules
                  .filter((m) => activeSelectedModules.includes(m.key))
                  .map((mod) => {
                    const price = billingCycle === "yearly" && mod.price_yearly
                      ? parseFloat(mod.price_yearly) / 12
                      : parseFloat(mod.price_monthly || "0");
                    return (
                      <div key={mod.key} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            mod.is_core ? "bg-emerald-400" : "bg-cyan-400"
                          )} />
                          <span>{mod.name}</span>
                          {mod.is_core && <span className="text-[10px] text-emerald-400 font-medium">Core</span>}
                        </div>
                        <span className="text-slate-400">
                          {price > 0 ? `NPR ${price.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/mo` : "Free"}
                        </span>
                      </div>
                    );
                  })}
              </div>
              <div className="border-t border-slate-800 mt-3 pt-3 flex items-center justify-between font-semibold">
                <span>Total</span>
                <span>
                  {billingCycle === "monthly"
                    ? `NPR ${totalMonthly.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/mo`
                    : `NPR ${totalYearly.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/yr`}
                </span>
              </div>
            </Card>

            {/* Start free trial */}
            <Button
              onClick={handleConfirm}
              disabled={saving}
              className="w-full h-12 text-base"
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Activating...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Start 14-day free trial</>
              )}
            </Button>
            <p className="text-xs text-slate-500 text-center mt-3">
              No payment required for 14 days. You can change modules anytime.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ModuleCard({
  mod,
  selected,
  onToggle,
  modules,
}: {
  mod: AddonModule;
  selected: boolean;
  onToggle: () => void;
  modules: AddonModule[];
}) {
  const missingDeps = (mod.depends_on_keys || []).filter(
    (dep: string) => !modules.find((m) => m.key === dep)
  );
  const depsSatisfied = missingDeps.length === 0;
  const price = parseFloat(mod.price_monthly || "0");

  return (
    <Card
      className={cn(
        "p-4 border transition-all cursor-pointer",
        selected
          ? "border-cyan-500 bg-cyan-500/10"
          : "border-slate-800 bg-slate-900 hover:border-slate-700"
      )}
      onClick={depsSatisfied ? onToggle : undefined}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors",
          selected ? "bg-cyan-500 border-cyan-500" : "border-slate-600",
          !depsSatisfied && "opacity-40"
        )}>
          {selected && <Check className="h-3 w-3 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn("font-medium text-sm", !depsSatisfied && "opacity-40")}>{mod.name}</div>
          <div className={cn("text-xs text-slate-500 line-clamp-1", !depsSatisfied && "opacity-40")}>
            {mod.description}
          </div>
          {price > 0 ? (
            <div className="text-xs text-slate-400 mt-1">
              NPR {price.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/mo
              {mod.price_yearly && `  |  NPR ${parseFloat(mod.price_yearly).toLocaleString("en-IN", { maximumFractionDigits: 0 })}/yr`}
            </div>
          ) : (
            <div className="text-xs text-emerald-400 mt-1">Free</div>
          )}
          {!depsSatisfied && (
            <div className="text-[10px] text-amber-400 mt-1">
              Requires: {missingDeps.join(", ")}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
