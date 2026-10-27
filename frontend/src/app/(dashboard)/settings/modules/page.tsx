"use client";

import React, { useEffect, useState, useMemo } from "react";
import { modulesApi, AddonModule, TenantInfo } from "@/lib/api/modules";
import { Loader2, Check, Plus, X, ShoppingCart, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const CATEGORY_LABELS: Record<string, string> = {
  universal: "Universal",
  hospitality: "Hospitality",
  fnd: "Food & Beverage",
  gaming: "Gaming",
  coworking: "Co-Working",
  wellness: "Wellness & Spa",
};

export default function ModulesSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<AddonModule[]>([]);
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);

  const fetchData = () => {
    setLoading(true);
    Promise.all([modulesApi.listModules(), modulesApi.getTenantInfo()])
      .then(([mods, info]) => {
        setModules(mods.filter((m) => m.is_active));
        setTenantInfo(info);
      })
      .catch(() => toast.error("Failed to load modules"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const activeModuleKeys = useMemo(
    () => new Set(tenantInfo?.active_modules ?? []),
    [tenantInfo]
  );

  const coreModuleKeys = useMemo(
    () => new Set(modules.filter((m) => m.is_core).map((m) => m.key)),
    [modules]
  );

  const activeModules = useMemo(
    () => modules.filter((m) => activeModuleKeys.has(m.key)),
    [modules, activeModuleKeys]
  );

  const availableModules = useMemo(
    () => modules.filter((m) => !activeModuleKeys.has(m.key) && !m.is_core),
    [modules, activeModuleKeys]
  );

  const groupedAvailable = useMemo(() => {
    const groups: Record<string, AddonModule[]> = {};
    for (const mod of availableModules) {
      const cat = mod.category || "universal";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(mod);
    }
    return groups;
  }, [availableModules]);

  const handleRemove = async (key: string) => {
    if (coreModuleKeys.has(key)) {
      toast.error("Core modules cannot be removed");
      return;
    }
    setRemoving(key);
    try {
      await modulesApi.deactivateModule(key);
      toast.success("Module deactivated");
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to deactivate");
    } finally {
      setRemoving(null);
    }
  };

  const handleAdd = async (key: string) => {
    setAdding(key);
    try {
      await modulesApi.activateModules([key]);
      toast.success("Module activated");
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to activate");
    } finally {
      setAdding(null);
    }
  };

  if (loading && !tenantInfo) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Modules &amp; Features</h1>
          <p className="text-sm text-slate-400">Manage your active modules and browse available add-ons.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">

          {/* Active modules */}
          <section>
            <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-400" />
              Active Modules ({activeModules.length})
            </h2>
            {activeModules.length === 0 ? (
              <Card className="bg-slate-900 border-slate-800 p-6 text-center text-slate-500">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active modules yet. Browse available modules below.</p>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {activeModules.map((mod) => (
                  <Card key={mod.key} className="bg-slate-900 border-slate-800 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{mod.name}</span>
                          {mod.is_core && (
                            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px]">
                              Core
                            </Badge>
                          )}
                          <StatusBadge status={tenantInfo?.subscriptions.find((s) => s.module_key === mod.key)?.status} />
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{mod.description}</div>
                        <div className="text-xs text-slate-400 mt-1">
                          NPR {parseFloat(mod.price_monthly || "0").toLocaleString("en-IN", { maximumFractionDigits: 0 })}/mo
                        </div>
                      </div>
                      {!mod.is_core && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 flex-shrink-0"
                          onClick={() => handleRemove(mod.key)}
                          disabled={removing === mod.key}
                        >
                          {removing === mod.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Available modules grouped by category */}
          <section>
            <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Plus className="h-4 w-4 text-cyan-400" />
              Available Modules
            </h2>
            {Object.keys(groupedAvailable).length === 0 ? (
              <Card className="bg-slate-900 border-slate-800 p-6 text-center text-slate-500">
                <p className="text-sm">All available modules are already activated.</p>
              </Card>
            ) : (
              Object.entries(groupedAvailable).map(([cat, mods]) => (
                <div key={cat} className="mb-6">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    {CATEGORY_LABELS[cat] || cat}
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {mods.map((mod) => (
                      <Card key={mod.key} className="bg-slate-900 border-slate-800 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm">{mod.name}</div>
                            <div className="text-xs text-slate-500 line-clamp-1">{mod.description}</div>
                            <div className="text-xs text-slate-400 mt-1">
                              NPR {parseFloat(mod.price_monthly || "0").toLocaleString("en-IN", { maximumFractionDigits: 0 })}/mo
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleAdd(mod.key)}
                            disabled={adding === mod.key}
                          >
                            {adding === mod.key ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <><Plus className="h-3.5 w-3.5 mr-1" /> Add</>
                            )}
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        </div>

        {/* Billing summary sidebar */}
        <div>
          <Card className="bg-slate-900 border-slate-800 p-4 sticky top-20">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-cyan-400" />
              Billing Summary
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Monthly total</span>
                <span className="font-semibold">
                  NPR {parseFloat(tenantInfo?.monthly_total || "0").toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Active modules</span>
                <span>{activeModules.length}</span>
              </div>

              {(tenantInfo?.subscriptions ?? []).length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> Active subs
                  </span>
                  <span>{tenantInfo?.subscriptions.filter((s) => s.status === "active").length || 0}</span>
                </div>
              )}
            </div>

            <div className="border-t border-slate-800 mt-4 pt-4 space-y-2">
              {activeModules.map((mod) => {
                const sub = tenantInfo?.subscriptions.find((s) => s.module_key === mod.key);
                return (
                  <div key={mod.key} className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">{mod.name}</span>
                    <span className="text-slate-400">
                      NPR {parseFloat(sub?.price || mod.price_monthly || "0").toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      <span className="text-slate-600">/{sub?.billing_cycle === "yearly" ? "yr" : "mo"}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const colors: Record<string, string> = {
    active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    trial: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    suspended: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return (
    <Badge variant="outline" className={cn(
      "text-[10px] capitalize",
      colors[status || ""] || "bg-slate-500/20 text-slate-400"
    )}>
      {status || "unknown"}
    </Badge>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
