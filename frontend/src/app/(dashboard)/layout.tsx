"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { useAuthStore } from "@/lib/store/authStore";
import { authClient } from "@/lib/api/client";
import { superAdminApi } from "@/lib/api/superadmin";
import { Hotel, Loader2, RefreshCw } from "lucide-react";
import { NextIntlClientProvider } from "next-intl";

import enMessages from "../../../messages/en.json";
import neMessages from "../../../messages/ne.json";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  if (match) return decodeURIComponent(match[2]);
  return null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, setUser, clearAuth } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [impersonatedName, setImpersonatedName] = useState<string | null>(null);
  const [impersonatedReason, setImpersonatedReason] = useState<string | null>(null);
  const [stoppingImpersonation, setStoppingImpersonation] = useState(false);

  useEffect(() => {
    // Check for active impersonation indicator cookie
    const activeImpersonation = getCookie("impersonated_tenant_name");
    setImpersonatedName(activeImpersonation);

    const activeReason = getCookie("impersonated_tenant_reason");
    setImpersonatedReason(activeReason);

    // Hydrate user profile on mount
    authClient
      .get("/me")
      .then((res) => {
        setUser(res.data);
      })
      .catch(() => {
        clearAuth();
        router.replace("/login");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleStopImpersonating = async () => {
    setStoppingImpersonation(true);
    try {
      const res = await superAdminApi.stopImpersonating();
      if (res.success) {
        // Redirect back to the super admin panel
        window.location.href = "/superadmin";
      }
    } catch (err) {
      console.error("Failed to stop impersonating", err);
      alert("Failed to revert session.");
    } finally {
      setStoppingImpersonation(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 animate-pulse">
            <Hotel className="h-6 w-6 text-white" />
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">Loading workspace...</span>
          </div>
        </div>
      </div>
    );
  }

  const locale = user?.preferred_language || "en";
  const messages = locale === "ne" ? neMessages : enMessages;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Impersonation Warning Banner */}
          {impersonatedName && (
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-6 py-2.5 flex items-center justify-between text-xs font-semibold shadow-md animate-in slide-in-from-top duration-300 relative z-10 border-b border-orange-500/20">
              <div className="flex items-center gap-2">
                <span className="bg-white/20 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-extrabold text-white">
                  Impersonation Context Active
                </span>
                <span>
                  SIA Enterprises support is currently viewing this account as <strong className="text-white underline">{impersonatedName}</strong>
                  {impersonatedReason && (
                    <span className="text-amber-100 ml-2">
                      (Reason: <span className="italic">{impersonatedReason}</span>)
                    </span>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={handleStopImpersonating}
                disabled={stoppingImpersonation}
                className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-900 font-bold px-3 py-1 rounded-lg transition-all shadow-sm disabled:opacity-50"
              >
                {stoppingImpersonation ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Stop Impersonating"
                )}
              </button>
            </div>
          )}

          <Navbar />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </NextIntlClientProvider>
  );
}
