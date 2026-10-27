"use client";

import React, { useEffect, useState } from "react";
import { 
  DollarSign, 
  Settings, 
  Layers, 
  Check, 
  Loader2, 
  X,
  Package,
  Plus,
  Building2,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { superAdminApi } from "@/lib/api/superadmin";
import { modulesApi } from "@/lib/api/modules";
import { SubscriptionPlan, AddonModule, TenantSubscription } from "@/lib/types";

const CATEGORY_COLORS: Record<string, string> = {
  universal: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  hospitality: "bg-violet-500/15 text-violet-400 border-violet-500/20",
  fnd: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  gaming: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  coworking: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  wellness: "bg-pink-500/15 text-pink-400 border-pink-500/20",
};

export default function SubscriptionsManager() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [tenantSubs, setTenantSubs] = useState<TenantSubscription[]>([]);
  const [allModules, setAllModules] = useState<AddonModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [createMode, setCreateMode] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  const [name, setName] = useState("");
  const [priceMonthly, setPriceMonthly] = useState("0");
  const [priceYearly, setPriceYearly] = useState("0");
  const [maxRooms, setMaxRooms] = useState(0);
  const [maxStaff, setMaxStaff] = useState(0);
  const [maxRestaurants, setMaxRestaurants] = useState(0);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      superAdminApi.getPlans(),
      superAdminApi.getSubscriptions(),
      modulesApi.listModules(),
    ])
      .then(([plansData, subsData, modulesData]) => {
        setPlans(plansData);
        setTenantSubs(subsData);
        setAllModules(modulesData);
      })
      .catch((err) => console.error("Failed to load data", err))
      .finally(() => setLoading(false));
  };

  const openCreate = () => {
    setEditingPlan(null);
    setCreateMode(true);
    setName("");
    setPriceMonthly("0");
    setPriceYearly("0");
    setMaxRooms(0);
    setMaxStaff(0);
    setMaxRestaurants(0);
    setSelectedFeatures([]);
  };

  const startEdit = (plan: SubscriptionPlan) => {
    setCreateMode(false);
    setEditingPlan(plan);
    setName(plan.name);
    setPriceMonthly(plan.price_monthly);
    setPriceYearly(plan.price_yearly);
    setMaxRooms(plan.max_rooms);
    setMaxStaff(plan.max_staff_users);
    setMaxRestaurants(plan.max_restaurants);
    setSelectedFeatures(plan.features || []);
  };

  const handleFeatureToggle = (key: string) => {
    if (selectedFeatures.includes(key)) {
      setSelectedFeatures(selectedFeatures.filter((f) => f !== key));
    } else {
      setSelectedFeatures([...selectedFeatures, key]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      if (createMode) {
        await superAdminApi.createPlan({
          name,
          price_monthly: priceMonthly,
          price_yearly: priceYearly,
          max_rooms: maxRooms,
          max_staff_users: maxStaff,
          max_restaurants: maxRestaurants,
          features: selectedFeatures,
        });
      } else if (editingPlan) {
        await superAdminApi.updatePlan(editingPlan.id, {
          name,
          price_monthly: priceMonthly,
          price_yearly: priceYearly,
          max_rooms: maxRooms,
          max_staff_users: maxStaff,
          max_restaurants: maxRestaurants,
          features: selectedFeatures,
        });
      }
      setEditingPlan(null);
      setCreateMode(false);
      loadData();
    } catch (err) {
      console.error("Failed to save plan", err);
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 backdrop-blur-md border border-slate-800/60 p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Layers className="h-6 w-6 text-cyan-400" />
            Subscription Plans
          </h1>
          <p className="text-slate-400 text-sm">
            Configure pricing, limits, and feature gates per plan. Features map to addon module keys.
          </p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-medium text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 transition-all">
          <Plus className="h-4 w-4" />
          Create Plan
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
            <p className="text-slate-500 text-sm">Loading plans & module catalog...</p>
          </div>
        </div>
      ) : (
        <>
          {plans.length === 0 ? (
            <div className="text-center p-12 bg-slate-900/10 border border-slate-800/50 rounded-2xl">
              <Layers className="h-10 w-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">No subscription plans found.</p>
              <p className="text-slate-600 text-xs mt-1 mb-4">Create your first plan to start offering subscriptions.</p>
              <button onClick={openCreate}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-medium transition-all">
                <Plus className="h-3.5 w-3.5" />
                Create First Plan
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div key={plan.id}
                  className="bg-slate-900/30 backdrop-blur-md border border-slate-800/50 rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-bold text-white tracking-tight">{plan.name}</h3>
                        <span className="text-xs text-slate-500 font-mono">slug: {plan.slug}</span>
                      </div>
                      <button onClick={() => startEdit(plan)}
                        className="p-2 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all"
                        title="Edit Plan">
                        <Settings className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="border-y border-slate-850/60 py-3">
                      <div className="text-2xl font-black text-white">
                        Rs. {parseFloat(plan.price_monthly).toLocaleString()}
                        <span className="text-xs text-slate-500 font-normal"> / month</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Rs. {parseFloat(plan.price_yearly).toLocaleString()} / year
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Max Rooms:</span>
                        <span className="font-semibold">{plan.max_rooms}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Max Staff:</span>
                        <span className="font-semibold">{plan.max_staff_users}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Max POS Outlets:</span>
                        <span className="font-semibold">{plan.max_restaurants}</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Included Modules ({allModules.filter((m) => plan.features?.includes(m.key)).length})
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {allModules.filter((m) => m.is_active).slice(0, 8).map((mod) => {
                          const isEnabled = plan.features?.includes(mod.key);
                          return (
                            <span key={mod.key}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${
                                isEnabled
                                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                                  : "bg-slate-950/60 text-slate-600 border-slate-800"
                              }`}>
                              {isEnabled && <Check className="h-2.5 w-2.5" />}
                              {mod.key}
                            </span>
                          );
                        })}
                        {allModules.filter((m) => m.is_active).length > 8 && (
                          <span className="text-[10px] text-slate-500">+{allModules.filter((m) => m.is_active).length - 8} more</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tenant Subscriptions Section */}
          <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800/50 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-800/80">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-400" />
                Tenant Subscriptions ({tenantSubs.length})
              </h2>
            </div>
            {tenantSubs.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-slate-500 text-sm">No tenant subscriptions yet.</p>
                <p className="text-slate-600 text-xs mt-1">Subscriptions are created when tenants onboard.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 bg-slate-900/50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="px-6 py-4">Tenant</th>
                      <th className="px-6 py-4">Plan</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Next Billing</th>
                      <th className="px-6 py-4">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/60 text-sm text-slate-300">
                    {tenantSubs.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-800/20 transition-all">
                        <td className="px-6 py-4 font-medium text-white">{sub.tenant_name}</td>
                        <td className="px-6 py-4">{sub.plan_details?.name ?? "—"}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            sub.status === "active" ? "bg-emerald-950 text-emerald-400 border border-emerald-900/30" :
                            sub.status === "trial" ? "bg-cyan-950 text-cyan-400 border border-cyan-900/30" :
                            sub.status === "past_due" ? "bg-amber-950 text-amber-400 border border-amber-900/30" :
                            sub.status === "cancelled" ? "bg-rose-950 text-rose-400 border border-rose-900/30" :
                            "bg-slate-950 text-slate-500 border border-slate-800"
                          }`}>
                            {sub.status === "active" && <Check className="h-3 w-3" />}
                            {sub.status === "past_due" && <AlertCircle className="h-3 w-3" />}
                            {sub.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400">
                          {sub.next_billing_date ? new Date(sub.next_billing_date).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-6 py-4 font-mono text-emerald-400 font-semibold">
                          Rs. {sub.plan_details?.price_monthly ?? "0"}/mo
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {(editingPlan || createMode) && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-850">
              <h3 className="text-md font-bold text-white flex items-center gap-2">
                <Settings className="h-4 w-4 text-cyan-400" />
                {createMode ? "Create Plan" : `Edit: ${editingPlan?.name}`}
              </h3>
              <button onClick={() => { setEditingPlan(null); setCreateMode(false); }}
                className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-850 transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Plan Name</label>
                    <input type="text" required value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-3 py-2 text-sm text-white outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5" /> Monthly Price (NPR)
                    </label>
                    <input type="number" required value={priceMonthly}
                      onChange={(e) => setPriceMonthly(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-3 py-2 text-sm font-mono text-white outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5" /> Yearly Price (NPR)
                    </label>
                    <input type="number" required value={priceYearly}
                      onChange={(e) => setPriceYearly(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-3 py-2 text-sm font-mono text-white outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Max Rooms</label>
                    <input type="number" required value={maxRooms}
                      onChange={(e) => setMaxRooms(parseInt(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-3 py-2 text-sm font-mono text-white outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Max Staff</label>
                    <input type="number" required value={maxStaff}
                      onChange={(e) => setMaxStaff(parseInt(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-3 py-2 text-sm font-mono text-white outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Max POS Outlets</label>
                    <input type="number" required value={maxRestaurants}
                      onChange={(e) => setMaxRestaurants(parseInt(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-3 py-2 text-sm font-mono text-white outline-none" />
                  </div>
                </div>

                <div className="border-t border-slate-850 pt-4 space-y-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-purple-400" />
                    Module Feature Gates
                  </label>
                  <p className="text-[10px] text-slate-500">Modules included in this plan will be auto-activated for subscribing tenants.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {allModules.filter((m) => m.is_active).map((mod) => {
                      const checked = selectedFeatures.includes(mod.key);
                      const catColor = CATEGORY_COLORS[mod.category] || "bg-slate-500/15 text-slate-400";
                      return (
                        <div key={mod.key} onClick={() => handleFeatureToggle(mod.key)}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                            checked
                              ? "bg-cyan-500/5 border-cyan-500/30 text-white"
                              : "bg-slate-950/20 border-slate-900 text-slate-400 hover:border-slate-850"
                          }`}
                        >
                          <div className={`mt-0.5 h-4.5 w-4.5 rounded flex items-center justify-center border ${
                            checked ? "bg-cyan-600 border-cyan-500 text-white" : "border-slate-800"
                          }`}>
                            {checked && <Check className="h-3 w-3" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold">{mod.name}</p>
                            <span className={`inline-block mt-0.5 text-[9px] px-1.5 py-0.5 rounded-full font-medium border ${catColor}`}>
                              {mod.category}
                            </span>
                            {mod.is_core && <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/20">CORE</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-950/50 border-t border-slate-850 flex justify-end gap-3">
                <button type="button" onClick={() => { setEditingPlan(null); setCreateMode(false); }} disabled={editLoading}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-medium transition-all">Cancel</button>
                <button type="submit" disabled={editLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-medium transition-all shadow-md shadow-cyan-600/10">
                  {editLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                  {createMode ? "Create Plan" : "Save Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
