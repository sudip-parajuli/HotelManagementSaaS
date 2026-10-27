"use client";

import React, { useEffect, useState } from "react";
import {
  Headset,
  MessageSquare,
  Ticket,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  User,
  Building2,
  Calendar,
  Loader2,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { superAdminApi } from "@/lib/api/superadmin";
import { AddonRequest } from "@/lib/types";

type Tab = "tickets" | "impersonation" | "module-requests";

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<Tab>("tickets");
  const [requests, setRequests] = useState<AddonRequest[]>([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [rejectModal, setRejectModal] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    if (activeTab === "module-requests") {
      loadRequests();
    }
  }, [activeTab]);

  const loadRequests = async () => {
    setReqLoading(true);
    try {
      const data = await superAdminApi.getAddonRequests();
      setRequests(data);
    } catch {
      console.error("Failed to load addon requests");
    } finally {
      setReqLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    setActionLoading(id);
    try {
      await superAdminApi.approveAddonRequest(id);
      setRequests(requests.map((r) => (r.id === id ? { ...r, status: "approved" } : r)));
    } catch {
      console.error("Failed to approve request");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: number) => {
    setActionLoading(id);
    try {
      await superAdminApi.rejectAddonRequest(id, rejectReason);
      setRequests(requests.map((r) => (r.id === id ? { ...r, status: "rejected", rejection_reason: rejectReason } : r)));
      setRejectModal(null);
      setRejectReason("");
    } catch {
      console.error("Failed to reject request");
    } finally {
      setActionLoading(null);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "tickets", label: "Support Tickets", icon: Ticket },
    { id: "impersonation", label: "Impersonation Logs", icon: MessageSquare },
    { id: "module-requests", label: "Module Requests", icon: Headset },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 p-6 rounded-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Headset className="h-5 w-5 text-amber-400" />
          Support & Audit
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage support tickets, impersonation sessions, and module addon requests.
        </p>
      </div>

      <div className="flex gap-1 border-b border-slate-800">
        {tabs.map((tab) => (
          <button key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 ${
              activeTab === tab.id
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}>
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "tickets" && (
        <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800/50 rounded-2xl p-8 text-center">
          <Ticket className="h-12 w-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Support ticket system coming soon.</p>
          <p className="text-slate-600 text-xs mt-1">
            Tenants will be able to submit tickets directly from their dashboard.
          </p>
        </div>
      )}

      {activeTab === "impersonation" && (
        <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800/50 rounded-2xl p-8 text-center">
          <p className="text-slate-400 text-sm mb-4">
            View detailed impersonation audit logs with timestamps, admin email, hotel, and reasons.
          </p>
          <a href="/admin/audit-log"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-amber-600/10 text-amber-400 border border-amber-600/20 hover:bg-amber-600/20 transition-all">
            <MessageSquare size={15} />
            Open Audit Logs
          </a>
        </div>
      )}

      {activeTab === "module-requests" && (
        <div className="space-y-4">
          {reqLoading ? (
            <div className="flex items-center justify-center min-h-[30vh]">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800/50 rounded-2xl p-8 text-center">
              <ThumbsUp className="h-10 w-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No module requests found.</p>
              <p className="text-slate-600 text-xs mt-1">Pending tenant requests for addon modules will appear here.</p>
            </div>
          ) : (
            <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800/50 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 bg-slate-900/50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="px-6 py-4">Tenant</th>
                      <th className="px-6 py-4">Module</th>
                      <th className="px-6 py-4">Requested By</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/60 text-sm text-slate-300">
                    {requests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-800/20 transition-all">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-cyan-400" />
                            <span className="font-semibold text-slate-200">{req.tenant_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-white">{req.addon_name}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-slate-500" />
                            <span>{req.requested_by_name || "System"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-slate-500" />
                            {new Date(req.requested_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            req.status === "approved" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" :
                            req.status === "rejected" ? "bg-red-500/15 text-red-400 border border-red-500/20" :
                            req.status === "active" ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20" :
                            "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                          }`}>
                            {req.status === "active" && <CheckCircle2 className="h-2.5 w-2.5" />}
                            {req.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {req.status === "pending" ? (
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleApprove(req.id)} disabled={actionLoading === req.id}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/10 text-emerald-400 border border-emerald-600/20 hover:bg-emerald-600/20 text-[10px] font-medium transition-all disabled:opacity-50">
                                {actionLoading === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ThumbsUp className="h-3 w-3" />}
                                Approve
                              </button>
                              <button onClick={() => setRejectModal(req.id)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-600/10 text-red-400 border border-red-600/20 hover:bg-red-600/20 text-[10px] font-medium transition-all">
                                <ThumbsDown className="h-3 w-3" />
                                Reject
                              </button>
                            </div>
                          ) : req.status === "rejected" && req.rejection_reason ? (
                            <span className="text-[10px] text-slate-500 italic" title={req.rejection_reason}>
                              {req.rejection_reason.length > 30 ? req.rejection_reason.slice(0, 30) + "…" : req.rejection_reason}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-600">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {rejectModal !== null && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-850">
              <h3 className="text-md font-bold text-white">Reject Module Request</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-400">Provide a reason for rejecting this module request.</p>
              <textarea value={rejectReason} rows={3} placeholder="Reason for rejection…"
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-red-500/50 rounded-xl p-3 text-sm text-white outline-none resize-none" />
            </div>
            <div className="px-6 py-4 bg-slate-950/50 border-t border-slate-850 flex justify-end gap-3">
              <button onClick={() => { setRejectModal(null); setRejectReason(""); }}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-medium transition-all">Cancel</button>
              <button onClick={() => handleReject(rejectModal)} disabled={!rejectReason.trim() || actionLoading === rejectModal}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-all disabled:opacity-50">
                {actionLoading === rejectModal && <Loader2 className="h-3 w-3 animate-spin" />}
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
