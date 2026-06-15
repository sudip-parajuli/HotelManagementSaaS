"use client";

import React, { useEffect, useState } from "react";
import { 
  Clock, 
  ShieldAlert, 
  Search, 
  Loader2, 
  User, 
  Building2, 
  Calendar,
  AlertCircle
} from "lucide-react";
import { superAdminApi } from "@/lib/api/superadmin";

interface AuditLog {
  id: number;
  admin_user: number;
  admin_user_email: string;
  target_tenant: number;
  target_tenant_name: string;
  target_tenant_schema: string;
  started_at: string;
  ended_at: string | null;
  reason: string;
  ip_address: string | null;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const data = await superAdminApi.getAuditLogs();
      setLogs(data.results || []);
    } catch (err) {
      console.error("Failed to load audit logs", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => 
    log.admin_user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.target_tenant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.ip_address && log.ip_address.includes(searchQuery))
  );

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  const calculateDuration = (start: string, end: string | null) => {
    if (!end) return "Active Session";
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 1) return "< 1 min";
    return `${diffMins} min${diffMins > 1 ? "s" : ""}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-amber-500" />
            Impersonation Audit Logs
          </h1>
          <p className="text-slate-400 text-sm">
            Review history of support impersonation sessions and justifications for database schema access.
          </p>
        </div>
      </div>

      {/* Filter and search */}
      <div className="flex bg-slate-900/20 border border-slate-800/60 px-4 py-3 rounded-xl items-center gap-3 max-w-md">
        <Search className="h-4 w-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search by admin email, hotel name, or reason..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent border-none text-sm text-slate-200 outline-none placeholder-slate-500 w-full"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
            <p className="text-slate-500 text-sm">Loading audit logs ledger...</p>
          </div>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center p-12 bg-slate-900/10 border border-slate-800/50 rounded-2xl">
          <p className="text-slate-400 text-sm">No audit logs found matching criteria.</p>
        </div>
      ) : (
        <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800/50 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-900/50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">SIA Administrator</th>
                  <th className="px-6 py-4">Target Hotel</th>
                  <th className="px-6 py-4">Impersonation Reason</th>
                  <th className="px-6 py-4">Session Period</th>
                  <th className="px-6 py-4">IP Address</th>
                  <th className="px-6 py-4">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60 text-sm text-slate-300">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/20 transition-all">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700/60">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                        </div>
                        <span className="font-medium text-white">{log.admin_user_email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-cyan-400" />
                        <div>
                          <p className="font-semibold text-slate-200">{log.target_tenant_name}</p>
                          <p className="text-slate-500 text-[10px] font-mono">{log.target_tenant_schema}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs md:max-w-sm lg:max-w-md">
                      <div className="flex gap-2 items-start bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/50 text-xs">
                        <AlertCircle className="h-4 w-4 text-amber-500/80 shrink-0 mt-0.5" />
                        <span className="text-slate-300 break-words leading-relaxed">{log.reason}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Calendar className="h-3 w-3 text-slate-500" />
                          <span>Start: {formatDateTime(log.started_at)}</span>
                        </div>
                        {log.ended_at && (
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Clock className="h-3 w-3 text-slate-500" />
                            <span>End: {formatDateTime(log.ended_at)}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                      {log.ip_address || "Unknown"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        !log.ended_at 
                          ? "bg-amber-950 text-amber-400 border border-amber-900/30 animate-pulse" 
                          : "bg-slate-800 text-slate-400 border border-slate-700/30"
                      }`}>
                        {calculateDuration(log.started_at, log.ended_at)}
                      </span>
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
