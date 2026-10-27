"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Building2,
  ExternalLink,
  ShieldAlert,
  Eye,
  Loader2,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  Globe,
  Database,
  X,
  AlertTriangle,
  Puzzle,
  Tag
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { superAdminApi } from "@/lib/api/superadmin";
import { Tenant } from "@/lib/types";

const BUSINESS_LABELS: Record<string, { name: string; color: string }> = {
  hotel: { name: "Hotel", color: "bg-brand-500/15 text-brand-400 border-brand-500/20" },
  restaurant: { name: "Restaurant", color: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  gaming_cafe: { name: "Gaming Cafe", color: "bg-brand-500/15 text-brand-400 border-brand-500/20" },
  coworking: { name: "Co-working", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  spa_salon: { name: "Spa & Salon", color: "bg-brand-500/15 text-brand-400 border-brand-500/20" },
  billiards: { name: "Billiards", color: "bg-violet-500/15 text-violet-400 border-violet-500/20" },
  karaoke: { name: "Karaoke", color: "bg-rose-500/15 text-rose-400 border-rose-500/20" },
  parking: { name: "Parking", color: "bg-workspace-500/15 text-workspace-400 border-workspace-500/20" },
  retail: { name: "Retail", color: "bg-orange-500/15 text-orange-400 border-orange-500/20" },
  other: { name: "Other", color: "bg-workspace-500/15 text-workspace-400 border-workspace-500/20" },
};

export default function TenantsDirectory() {
  const workspaceDialog = useRef<HTMLDialogElement>(null);
  const [loadError, setLoadError] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const [impersonatingTenantId, setImpersonatingTenantId] = useState<number | null>(null);
  const [impersonationReason, setImpersonationReason] = useState("");
  const [showImpersonateModal, setShowImpersonateModal] = useState(false);
  useEffect(() => { if (showImpersonateModal) workspaceDialog.current?.showModal(); }, [showImpersonateModal]);

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = () => {
    setLoading(true);
    setLoadError(false);
    superAdminApi.getTenants()
      .then(setTenants)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  };

  const handleToggleActive = async (tenant: Tenant) => {
    setActionLoading(tenant.id);
    try {
      if (tenant.is_active) {
        await superAdminApi.suspendTenant(tenant.id);
      } else {
        await superAdminApi.activateTenant(tenant.id);
      }
      loadTenants();
    } catch (err) {
      toast.error("Could not update this property. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleImpersonateClick = (tenantId: number) => {
    setImpersonatingTenantId(tenantId);
    setImpersonationReason("");
    setShowImpersonateModal(true);
  };

  const handleConfirmImpersonate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!impersonatingTenantId) return;
    if (!impersonationReason.trim()) return;

    const tenantId = impersonatingTenantId;
    setShowImpersonateModal(false);
    setActionLoading(tenantId);
    try {
      const res = await superAdminApi.impersonateTenant(tenantId, impersonationReason);
      if (res.success) {
        window.location.href = "/";
      }
    } catch (err: any) {
      toast.error("Could not open the property workspace. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredTenants = tenants.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.schema_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.contact_email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.business_type_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-workspace-900/40 backdrop-blur-md border border-workspace-800/60 p-6 rounded-2xl">
        <div>
          <h1 className="text-3xl font-normal font-serif tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="h-6 w-6 text-brand-400" />
            Property directory
          </h1>
          <p className="text-workspace-400 text-sm">
            Your hospitality businesses, connected. Manage access and open a property workspace.
          </p>
        </div>
        <Link
          href="/admin/tenants/new"
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-medium text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-brand-500/20 transition-all w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Add property
        </Link>
      </div>

      <div className="flex bg-workspace-900/20 border border-workspace-800/60 px-4 py-3 rounded-xl items-center gap-3 max-w-md">
        <Search className="h-4 w-4 text-workspace-500" />
        <input
          aria-label="Search properties"
          type="search"
          placeholder="Search properties, email or business type…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent border-none text-sm text-workspace-200 outline-none placeholder-workspace-500 w-full"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
            <p className="text-workspace-500 text-sm">Loading properties…</p>
          </div>
        </div>
      ) : loadError ? (<div role="alert" className="rounded-xl border border-border bg-card p-10 text-center"><h2 className="text-xl text-foreground">Properties could not be loaded</h2><p className="text-muted-foreground my-3">Check your connection and try again.</p><button type="button" onClick={loadTenants} className="rounded-lg bg-brand-500 px-4 py-2 text-white">Try again</button></div>) : filteredTenants.length === 0 ? (
        <div className="text-center p-12 bg-workspace-900/10 border border-workspace-800/50 rounded-2xl">
          <p className="text-workspace-400 text-sm">No properties match your search.</p>
        </div>
      ) : (
        <section aria-label="Properties" className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {filteredTenants.map(tenant => {
            const business = tenant.business_type_key ? BUSINESS_LABELS[tenant.business_type_key] : null;
            return <article key={tenant.id} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4"><span className="rounded-xl bg-secondary text-primary p-3"><Building2 size={25} /></span><span className={`rounded-full px-3 py-1 text-xs font-medium ${tenant.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>{tenant.is_active ? "Active" : "Suspended"}</span></div>
              <h2 className="font-serif text-2xl mt-5 text-foreground">{tenant.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">{business?.name || tenant.business_type_name || "Hospitality business"}</p>
              <div className="my-5 py-4 border-y border-border space-y-2 text-sm"><p className="break-all text-muted-foreground">{tenant.contact_email || "No contact email added"}</p>{tenant.contact_phone && <p className="text-muted-foreground">{tenant.contact_phone}</p>}<p className="flex gap-2 items-center text-foreground"><Puzzle size={15} className="text-brand-400" />{tenant.active_module_count ?? 0} active modules</p></div>
              <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={() => handleImpersonateClick(tenant.id)} disabled={actionLoading !== null || !tenant.is_active} className="flex items-center gap-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 text-sm disabled:opacity-50">{actionLoading === tenant.id ? <Loader2 size={15} className="animate-spin" /> : <ExternalLink size={15} />}Open workspace</button><Link href={`/admin/tenants/${tenant.id}`} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted">Manage property</Link><button type="button" onClick={() => { if (window.confirm(`${tenant.is_active ? "Suspend access to" : "Activate"} ${tenant.name}?`)) void handleToggleActive(tenant); }} disabled={actionLoading !== null} className="text-xs text-muted-foreground underline underline-offset-4 disabled:opacity-50">{tenant.is_active ? "Suspend" : "Activate"}</button></div>
            </article>;
          })}
        </section>
      )}

      {showImpersonateModal && (
        <dialog ref={workspaceDialog} onCancel={() => setShowImpersonateModal(false)} aria-labelledby="workspace-dialog-title" className="fixed inset-0 m-auto bg-transparent w-full max-w-md p-4 backdrop:bg-black/40 backdrop:backdrop-blur-sm">
          <div className="bg-workspace-900 border border-workspace-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-workspace-850">
              <h3 id="workspace-dialog-title" className="text-md font-bold text-foreground flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                Open property workspace
              </h3>
              <button aria-label="Close workspace dialog" onClick={() => setShowImpersonateModal(false)} className="p-1 rounded-lg text-workspace-500 hover:text-white hover:bg-workspace-850 transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleConfirmImpersonate}>
              <div className="p-6 space-y-4">
                <div className="flex gap-2.5 bg-amber-950/20 border border-amber-900/30 p-3.5 rounded-xl text-xs text-amber-400">
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5">Audited Admin Action</span>
                    You can view and change this property's records. Your reason will appear in the activity history.
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="workspace-reason" className="text-xs font-semibold text-workspace-400">Reason for opening</label>
                  <textarea id="workspace-reason" autoFocus required rows={3} value={impersonationReason}
                    onChange={(e) => setImpersonationReason(e.target.value)}
                    placeholder="Enter reason (e.g. debugging payroll discrepancy, checking reservation ledger...)"
                    className="w-full bg-workspace-950 border border-workspace-800 focus:border-brand-500/50 rounded-xl px-3 py-2 text-xs text-foreground outline-none placeholder-workspace-600 resize-none"
                  />
                </div>
              </div>
              <div className="px-6 py-4 bg-workspace-950/50 border-t border-workspace-850 flex justify-end gap-3">
                <button type="button" onClick={() => setShowImpersonateModal(false)}
                  className="px-4 py-2 rounded-xl text-muted-foreground hover:text-foreground text-xs font-medium transition-all">Cancel</button>
                <button type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium transition-all shadow-md shadow-brand-600/10">Open workspace</button>
              </div>
            </form>
          </div>
        </dialog>
      )}
    </div>
  );
}
