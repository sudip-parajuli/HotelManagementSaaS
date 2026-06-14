"use client";

import React, { useEffect, useState } from "react";
import { 
  DollarSign, 
  Settings, 
  Layers, 
  Check, 
  Loader2, 
  HelpCircle,
  TrendingUp,
  X,
  Plus
} from "lucide-react";
import { superAdminApi } from "@/lib/api/superadmin";
import { SubscriptionPlan } from "@/lib/types";

const ALL_AVAILABLE_FEATURES = [
  { key: "payroll", name: "Payroll Gating", description: "Nepal SSF and income tax slabs payslip builders" },
  { key: "crm", name: "CRM & Loyalty", description: "Loyalty point system, guest campaign tagging" },
  { key: "analytics", name: "Advanced Analytics", description: "Recharts heatmaps, daily metric summaries" },
  { key: "pos", name: "POS Ordering", description: "Interactive restaurant order panels & KDS WebSocket feeds" },
  { key: "inventory", name: "Inventory Management", description: "Recipe stock deductions, GRN purchase orders" },
];

export default function SubscriptionsManager() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [priceMonthly, setPriceMonthly] = useState("0");
  const [priceYearly, setPriceYearly] = useState("0");
  const [maxRooms, setMaxRooms] = useState(0);
  const [maxStaff, setMaxStaff] = useState(0);
  const [maxRestaurants, setMaxRestaurants] = useState(0);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = () => {
    setLoading(true);
    superAdminApi.getPlans()
      .then(setPlans)
      .catch((err) => console.error("Failed to load plans", err))
      .finally(() => setLoading(false));
  };

  const startEdit = (plan: SubscriptionPlan) => {
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
    if (!editingPlan) return;

    setEditLoading(true);
    try {
      const payload: Partial<SubscriptionPlan> = {
        name,
        price_monthly: priceMonthly,
        price_yearly: priceYearly,
        max_rooms: maxRooms,
        max_staff_users: maxStaff,
        max_restaurants: maxRestaurants,
        features: selectedFeatures,
      };

      await superAdminApi.updatePlan(editingPlan.id, payload);
      setEditingPlan(null);
      loadPlans();
    } catch (err) {
      console.error("Failed to update plan", err);
      alert("Failed to update plan properties.");
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 backdrop-blur-md border border-slate-800/60 p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Layers className="h-6 w-6 text-cyan-400" />
            SaaS Subscription Plans
          </h1>
          <p className="text-slate-400 text-sm">
            Configure room limits, restaurant POS counts, staff bounds, and toggle active module feature gates.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
            <p className="text-slate-500 text-sm">Loading SaaS tier pricing...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-slate-900/30 backdrop-blur-md border border-slate-800/50 rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">{plan.name}</h3>
                    <span className="text-xs text-slate-500 font-mono">slug: {plan.slug}</span>
                  </div>
                  <button
                    onClick={() => startEdit(plan)}
                    className="p-2 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all"
                    title="Edit Plan Config"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </div>

                {/* Price block */}
                <div className="border-y border-slate-850/60 py-3">
                  <div className="text-2xl font-black text-white">
                    Rs. {parseFloat(plan.price_monthly).toLocaleString()}
                    <span className="text-xs text-slate-500 font-normal"> / month</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Rs. {parseFloat(plan.price_yearly).toLocaleString()} / year (save 10%)
                  </div>
                </div>

                {/* Limits list */}
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Max Rooms Capacity:</span>
                    <span className="font-semibold">{plan.max_rooms} rooms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Max Staff Users:</span>
                    <span className="font-semibold">{plan.max_staff_users} users</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Max Restaurants:</span>
                    <span className="font-semibold">{plan.max_restaurants} POS outlets</span>
                  </div>
                </div>

                {/* Features divider */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Feature Modules Gated
                  </h4>
                  <div className="space-y-1.5">
                    {ALL_AVAILABLE_FEATURES.map((feat) => {
                      const isEnabled = plan.features?.includes(feat.key);
                      return (
                        <div key={feat.key} className="flex items-center gap-2 text-xs">
                          <div className={`h-4 w-4 rounded-full flex items-center justify-center border ${
                            isEnabled 
                              ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" 
                              : "bg-slate-950/60 border-slate-900 text-slate-700"
                          }`}>
                            {isEnabled && <Check className="h-2.5 w-2.5" />}
                          </div>
                          <span className={isEnabled ? "text-slate-300 font-medium" : "text-slate-500 line-through"}>
                            {feat.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editingPlan && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-850">
              <h3 className="text-md font-bold text-white flex items-center gap-2">
                <Settings className="h-4 w-4 text-cyan-400" />
                Edit Subscription Tier: {editingPlan.name}
              </h3>
              <button
                onClick={() => setEditingPlan(null)}
                className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-850 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal form */}
            <form onSubmit={handleSave}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Plan Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-3 py-2 text-sm text-white outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5" />
                      Monthly Price (NPR)
                    </label>
                    <input
                      type="number"
                      required
                      value={priceMonthly}
                      onChange={(e) => setPriceMonthly(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-3 py-2 text-sm font-mono text-white outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5" />
                      Yearly Price (NPR)
                    </label>
                    <input
                      type="number"
                      required
                      value={priceYearly}
                      onChange={(e) => setPriceYearly(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-3 py-2 text-sm font-mono text-white outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Max Rooms Limit
                    </label>
                    <input
                      type="number"
                      required
                      value={maxRooms}
                      onChange={(e) => setMaxRooms(parseInt(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-3 py-2 text-sm font-mono text-white outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Max Staff Limit
                    </label>
                    <input
                      type="number"
                      required
                      value={maxStaff}
                      onChange={(e) => setMaxStaff(parseInt(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-3 py-2 text-sm font-mono text-white outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Max POS Outlets
                    </label>
                    <input
                      type="number"
                      required
                      value={maxRestaurants}
                      onChange={(e) => setMaxRestaurants(parseInt(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-3 py-2 text-sm font-mono text-white outline-none"
                    />
                  </div>
                </div>

                {/* Features checklists */}
                <div className="border-t border-slate-850 pt-4 space-y-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Gated Modules Availability
                  </label>
                  <div className="space-y-2">
                    {ALL_AVAILABLE_FEATURES.map((feat) => {
                      const checked = selectedFeatures.includes(feat.key);
                      return (
                        <div
                          key={feat.key}
                          onClick={() => handleFeatureToggle(feat.key)}
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
                          <div>
                            <p className="text-xs font-semibold">{feat.name}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{feat.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal footer */}
              <div className="px-6 py-4 bg-slate-950/50 border-t border-slate-850 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  disabled={editLoading}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-medium transition-all shadow-md shadow-cyan-600/10"
                >
                  {editLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
