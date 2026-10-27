"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  ShoppingBag, Plus, Loader2, Package, RefreshCw, DollarSign,
  Edit2, ToggleLeft, ToggleRight, Trash2, ChevronRight,
  CheckCircle2, XCircle,
} from "lucide-react";
import { superAdminApi } from "@/lib/api/superadmin";
import { AddonModule } from "@/lib/types";
import { toast } from "sonner";

const CATEGORY_OPTIONS = [
  { value: "universal", label: "Universal" },
  { value: "hospitality", label: "Hospitality" },
  { value: "fnd", label: "Food & Beverage" },
  { value: "gaming", label: "Gaming" },
  { value: "coworking", label: "Co-Working" },
  { value: "wellness", label: "Wellness & Spa" },
];

const CATEGORY_COLORS: Record<string, string> = {
  universal: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  hospitality: "bg-violet-500/15 text-violet-400 border-violet-500/20",
  fnd: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  gaming: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  coworking: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  wellness: "bg-pink-500/15 text-pink-400 border-pink-500/20",
};

const BUSINESS_TYPE_OPTIONS = [
  { key: "hotel", name: "Hotel" },
  { key: "restaurant", name: "Restaurant" },
  { key: "gaming_cafe", name: "Gaming Cafe" },
  { key: "coworking", name: "Co-Working Space" },
  { key: "spa_salon", name: "Spa & Salon" },
  { key: "billiards", name: "Billiards / Pool Hall" },
  { key: "karaoke", name: "Karaoke" },
  { key: "parking", name: "Parking" },
  { key: "retail", name: "Retail" },
  { key: "other", name: "Other" },
];

type PageTab = "catalog" | "requests";

export default function AddonMarketplacePage() {
  const [tab, setTab] = useState<PageTab>("catalog");
  const [catalog, setCatalog] = useState<AddonModule[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [allModules, setAllModules] = useState<AddonModule[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAddon, setEditingAddon] = useState<AddonModule | null>(null);
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cat, reqs] = await Promise.allSettled([
        superAdminApi.getAddonCatalog(),
        superAdminApi.getAddonRequests(),
      ]);
      if (cat.status === "fulfilled") {
        setCatalog(cat.value);
        setAllModules(cat.value);
      }
      if (reqs.status === "fulfilled") setRequests(reqs.value);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleSave = async (form: any) => {
    setSaving(true);
    try {
      if (editingAddon) {
        await superAdminApi.updateAddon(editingAddon.id, form);
        toast.success("Module updated");
      } else {
        await superAdminApi.createAddon(form);
        toast.success("Module created");
      }
      setShowModal(false);
      setEditingAddon(null);
      await loadAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id: number) => {
    setActionLoading(`approve-${id}`);
    try {
      await superAdminApi.approveAddonRequest(id);
      await loadAll();
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    setActionLoading(`reject-${id}`);
    try {
      await superAdminApi.rejectAddonRequest(id, reason);
      await loadAll();
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = requests.filter((r: any) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShoppingBag className="text-indigo-400" size={22} />
            Module Catalog
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Manage the module catalog, pricing, and dependencies.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadAll} className="p-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white transition-all">
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => { setEditingAddon(null); setShowModal(true); }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all"
          >
            <Plus size={15} /> New Module
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-zinc-800">
        {(["catalog", "requests"] as PageTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all capitalize ${
              tab === t
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t === "catalog" ? <Package size={14} /> : <ChevronRight size={14} />}
            {t === "catalog" ? "Catalog" : "Requests"}
            {t === "requests" && pendingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-amber-500 text-white font-bold">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-indigo-400" size={32} />
        </div>
      ) : tab === "catalog" ? (
        <CatalogTab
          catalog={catalog}
          allModules={allModules}
          onEdit={(m) => { setEditingAddon(m); setShowModal(true); }}
          onRefresh={loadAll}
        />
      ) : (
        <RequestsTab
          requests={requests}
          actionLoading={actionLoading}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      {showModal && (
        <ModuleFormModal
          initial={editingAddon}
          allModules={allModules}
          onClose={() => { setShowModal(false); setEditingAddon(null); }}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  );
}

function CatalogTab({
  catalog, allModules, onEdit, onRefresh,
}: {
  catalog: AddonModule[];
  allModules: AddonModule[];
  onEdit: (m: AddonModule) => void;
  onRefresh: () => void;
}) {
  const grouped = catalog.reduce<Record<string, AddonModule[]>>((acc, m) => {
    const cat = m.category || "universal";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(m);
    return acc;
  }, {});

  if (catalog.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-600 rounded-xl border border-zinc-800">
        <Package size={40} className="mx-auto mb-3 opacity-40" />
        <p className="font-medium">No modules in the catalog yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([cat, mods]) => (
        <div key={cat}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
            {CATEGORY_OPTIONS.find((o) => o.value === cat)?.label || cat}
            <span className="ml-2 text-zinc-600 font-normal">({mods.length})</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {mods.map((addon) => (
              <div
                key={addon.id}
                className={`rounded-xl border p-5 transition-all hover:border-zinc-600 ${
                  addon.is_active
                    ? "border-zinc-800 bg-zinc-900/40"
                    : "border-zinc-800/50 bg-zinc-900/20 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CATEGORY_COLORS[addon.category] ?? ""}`}>
                    {CATEGORY_OPTIONS.find((o) => o.value === addon.category)?.label || addon.category}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {addon.is_core && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-semibold">CORE</span>
                    )}
                    {addon.is_active
                      ? <ToggleRight size={16} className="text-emerald-400" />
                      : <ToggleLeft size={16} className="text-zinc-600" />}
                    <button
                      onClick={() => onEdit(addon)}
                      className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-500 hover:text-zinc-200 transition-all"
                    >
                      <Edit2 size={13} />
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold text-white mt-2">
                  {addon.icon_name && <span className="mr-1.5 text-lg">{addon.icon_name}</span>}
                  {addon.name}
                </h3>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">{addon.key}</p>
                <p className="text-sm text-zinc-400 mt-2 leading-relaxed line-clamp-2">{addon.description}</p>

                <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center gap-4 text-xs flex-wrap">
                  <div className="flex items-center gap-1 text-zinc-400">
                    <DollarSign size={11} className="text-indigo-400" />
                    <span className="font-semibold text-white">
                      {addon.price_monthly ? `NPR ${Number(addon.price_monthly).toLocaleString()}` : "Free"}
                    </span>
                    {addon.price_monthly && <span>/mo</span>}
                  </div>
                  {addon.price_yearly && (
                    <span className="text-zinc-500">
                      NPR {Number(addon.price_yearly).toLocaleString()}/yr
                    </span>
                  )}
                  {addon.depends_on_keys && addon.depends_on_keys.length > 0 && (
                    <span className="text-zinc-500">
                      Depends: {addon.depends_on_keys.join(", ")}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function RequestsTab({
  requests, actionLoading, onApprove, onReject,
}: {
  requests: any[];
  actionLoading: string | null;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}) {
  const fmt = (d?: string | null) => d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";

  const STATUS_BADGE: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
    approved: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
    rejected: "bg-red-500/15 text-red-400 border border-red-500/20",
    active: "bg-blue-500/15 text-blue-400 border border-blue-500/20",
  };

  if (requests.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-600 rounded-xl border border-zinc-800">
        <Package size={40} className="mx-auto mb-3 opacity-40" />
        <p className="font-medium">No add-on requests yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/80">
            {["Tenant", "Add-on", "Requested By", "Date", "Status", "Actions"].map((h) => (
              <th key={h} className="text-left px-4 py-3 text-xs text-zinc-500 font-semibold uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {requests.map((req) => (
            <tr key={req.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
              <td className="px-4 py-3 font-medium text-white">{req.tenant_name}</td>
              <td className="px-4 py-3">
                <p className="text-zinc-200">{req.addon_name}</p>
                {req.message && <p className="text-xs text-zinc-500 mt-0.5 max-w-[200px] truncate" title={req.message}>{req.message}</p>}
              </td>
              <td className="px-4 py-3 text-zinc-400 text-xs">{req.requested_by_name || "—"}</td>
              <td className="px-4 py-3 text-zinc-500 text-xs">{fmt(req.requested_at)}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[req.status] ?? ""}`}>{req.status}</span>
                {req.rejection_reason && <p className="text-xs text-red-400 mt-1 max-w-[150px] truncate" title={req.rejection_reason}>{req.rejection_reason}</p>}
              </td>
              <td className="px-4 py-3">
                {req.status === "pending" && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => onApprove(req.id)} disabled={actionLoading === `approve-${req.id}`}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-50">
                      {actionLoading === `approve-${req.id}` ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                      Approve
                    </button>
                    <button onClick={() => onReject(req.id)} disabled={actionLoading === `reject-${req.id}`}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50">
                      {actionLoading === `reject-${req.id}` ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} />}
                      Reject
                    </button>
                  </div>
                )}
                {req.status !== "pending" && (
                  <div className="text-xs text-zinc-600">
                    {req.reviewed_by_name && <p>By {req.reviewed_by_name}</p>}
                    <p>{fmt(req.reviewed_at)}</p>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ModuleFormModal({
  initial, allModules, onClose, onSave, saving,
}: {
  initial: AddonModule | null;
  allModules: AddonModule[];
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  saving: boolean;
}) {
  const [form, setForm] = useState<any>(() => {
    if (initial) {
      return {
        key: initial.key,
        name: initial.name,
        description: initial.description,
        icon_name: initial.icon_name || "",
        category: initial.category,
        price_monthly: initial.price_monthly ?? "",
        price_yearly: initial.price_yearly ?? "",
        is_core: initial.is_core,
        is_active: initial.is_active,
        depends_on: initial.depends_on_keys || [],
        recommended_for: initial.recommended_for || [],
      };
    }
    return {
      key: "", name: "", description: "", icon_name: "",
      category: "universal", price_monthly: "", price_yearly: "",
      is_core: false, is_active: true,
      depends_on: [] as string[], recommended_for: [] as string[],
    };
  });

  const handleChange = (field: string, value: any) =>
    setForm((f: any) => ({ ...f, [field]: value }));

  const toggleArray = (field: string, value: string) => {
    setForm((f: any) => ({
      ...f,
      [field]: f[field].includes(value)
        ? f[field].filter((v: string) => v !== value)
        : [...f[field], value],
    }));
  };

  const otherModules = allModules.filter((m) => m.key !== form.key);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-white mb-5">
          {initial ? "Edit Module" : "Create Module"}
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Key (slug) *</label>
              <input value={form.key} onChange={(e) => handleChange("key", e.target.value)}
                placeholder="e.g. timed_sessions" disabled={!!initial}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 disabled:opacity-50" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Name *</label>
              <input value={form.name} onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Display name" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500" />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">Description *</label>
            <textarea value={form.description} onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Describe what this module provides..." rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Icon Name (Lucide)</label>
              <input value={form.icon_name} onChange={(e) => handleChange("icon_name", e.target.value)}
                placeholder="e.g. Gamepad2, Hotel, Utensils"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500" />
              <p className="text-[10px] text-zinc-600 mt-0.5">Use camelCase name from lucide-react</p>
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Category</label>
              <select value={form.category} onChange={(e) => handleChange("category", e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Monthly Price (NPR)</label>
              <input type="number" value={form.price_monthly} onChange={(e) => handleChange("price_monthly", e.target.value)}
                placeholder="0.00" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Yearly Price (NPR)</label>
              <input type="number" value={form.price_yearly} onChange={(e) => handleChange("price_yearly", e.target.value)}
                placeholder="0.00 (optional)" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500" />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div onClick={() => handleChange("is_core", !form.is_core)}
                className={`w-10 h-5 rounded-full transition-all ${form.is_core ? "bg-indigo-600" : "bg-zinc-700"} relative`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.is_core ? "left-5" : "left-0.5"}`} />
              </div>
              <span className="text-sm text-zinc-300">Core Module</span>
            </label>
            {form.is_core && (
              <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                Core modules cannot be deactivated by tenants
              </span>
            )}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div onClick={() => handleChange("is_active", !form.is_active)}
                className={`w-10 h-5 rounded-full transition-all ${form.is_active ? "bg-emerald-600" : "bg-zinc-700"} relative`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.is_active ? "left-5" : "left-0.5"}`} />
              </div>
              <span className="text-sm text-zinc-300">{form.is_active ? "Active" : "Inactive"}</span>
            </label>
          </div>

          {/* Depends On */}
          <div>
            <label className="text-xs text-zinc-400 block mb-1.5">Depends On (multi-select)</label>
            <div className="flex flex-wrap gap-1.5">
              {otherModules.map((m) => (
                <button key={m.key} type="button" onClick={() => toggleArray("depends_on", m.key)}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-all ${
                    form.depends_on.includes(m.key)
                      ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                      : "border-zinc-700 text-zinc-500 hover:text-zinc-300"
                  }`}>
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          {/* Recommended For */}
          <div>
            <label className="text-xs text-zinc-400 block mb-1.5">Recommended For (business types)</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {BUSINESS_TYPE_OPTIONS.map((bt) => (
                <label key={bt.key} className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={form.recommended_for.includes(bt.key)}
                    onChange={() => toggleArray("recommended_for", bt.key)}
                    className="rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500"
                  />
                  {bt.name}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all text-sm">
            Cancel
          </button>
          <button onClick={() => onSave(form)}
            disabled={!form.key || !form.name || saving}
            className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {initial ? "Save Changes" : "Create Module"}
          </button>
        </div>
      </div>
    </div>
  );
}
