"use client";

import React, { useEffect, useState } from "react";
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
  Database
} from "lucide-react";
import Link from "next/link";
import { superAdminApi } from "@/lib/api/superadmin";
import { Tenant } from "@/lib/types";

export default function TenantsDirectory() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = () => {
    setLoading(true);
    superAdminApi.getTenants()
      .then(setTenants)
      .catch((err) => console.error("Failed to load tenants", err))
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
      console.error("Failed to toggle tenant state", err);
      alert("Action failed to complete.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleImpersonate = async (tenantId: number) => {
    setActionLoading(tenantId);
    try {
      const res = await superAdminApi.impersonateTenant(tenantId);
      if (res.success) {
        // Redirect to homepage of dashboard to show impersonated data
        window.location.href = "/";
      }
    } catch (err: any) {
      console.error("Failed to impersonate", err);
      alert(err.response?.data?.error || "Failed to trigger impersonation.");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredTenants = tenants.filter((t) => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.schema_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.contact_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 backdrop-blur-md border border-slate-800/60 p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Building2 className="h-6 w-6 text-cyan-400" />
            Hotels Directory
          </h1>
          <p className="text-slate-400 text-sm">
            View active database schemas, suspend delinquent accounts, and enter impersonation context.
          </p>
        </div>
        <Link
          href="/superadmin/tenants/new"
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-medium text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 transition-all w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Onboard New Hotel
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex bg-slate-900/20 border border-slate-800/60 px-4 py-3 rounded-xl items-center gap-3 max-w-md">
        <Search className="h-4 w-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search by hotel name, schema, or contact email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent border-none text-sm text-slate-200 outline-none placeholder-slate-500 w-full"
        />
      </div>

      {/* Grid/Table of Tenants */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
            <p className="text-slate-500 text-sm">Loading tenants list...</p>
          </div>
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="text-center p-12 bg-slate-900/10 border border-slate-800/50 rounded-2xl">
          <p className="text-slate-400 text-sm">No onboarded hotels found matching criteria.</p>
        </div>
      ) : (
        <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800/50 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-900/50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Hotel Name</th>
                  <th className="px-6 py-4">Database Schema</th>
                  <th className="px-6 py-4">Contact Info</th>
                  <th className="px-6 py-4">Current Plan</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60 text-sm text-slate-300">
                {filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-slate-800/20 transition-all">
                    <td className="px-6 py-4 font-semibold text-white">
                      {tenant.name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-400 font-mono text-xs">
                        <Database className="h-3.5 w-3.5 text-cyan-400" />
                        {tenant.schema_name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-300">{tenant.contact_email}</div>
                      {tenant.contact_phone && (
                        <div className="text-[10px] text-slate-500 mt-0.5">{tenant.contact_phone}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-950 text-cyan-400 border border-cyan-800/30">
                        {tenant.subscription_plan || "Starter"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          tenant.is_active
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-900/30"
                            : "bg-rose-950 text-rose-400 border border-rose-900/30"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${tenant.is_active ? "bg-emerald-400" : "bg-rose-400"}`} />
                        {tenant.is_active ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {/* Impersonate button */}
                        <button
                          onClick={() => handleImpersonate(tenant.id)}
                          disabled={actionLoading !== null}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-600 hover:bg-cyan-700 text-white transition-all shadow-md shadow-cyan-600/10"
                          title="Enter Impersonation Context"
                        >
                          {actionLoading === tenant.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                          Impersonate
                        </button>

                        {/* Suspend/Activate toggle */}
                        <button
                          onClick={() => handleToggleActive(tenant)}
                          disabled={actionLoading !== null}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            tenant.is_active
                              ? "bg-slate-900/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white"
                          }`}
                        >
                          {tenant.is_active ? (
                            <>
                              <ToggleRight className="h-4 w-4 text-rose-500" />
                              Suspend
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="h-4 w-4" />
                              Activate
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
