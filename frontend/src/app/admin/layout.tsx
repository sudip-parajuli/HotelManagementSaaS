"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AdminNavbar } from "@/components/layout/AdminNavbar";
import { useAuthStore } from "@/lib/store/authStore";
import { authClient } from "@/lib/api/client";
import { Loader2, ShieldAlert } from "lucide-react";
import { NextIntlClientProvider } from "next-intl";

import enMessages from "../../../messages/en.json";
import neMessages from "../../../messages/ne.json";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, setUser, clearAuth } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Hydrate user profile on mount
    authClient
      .get("/me")
      .then((res) => {
        const profile = res.data;
        setUser(profile);
        if (profile.role !== "SUPER_ADMIN") {
          router.replace("/login");
        } else {
          setAuthorized(true);
        }
      })
      .catch(() => {
        clearAuth();
        router.replace("/login");
      })
      .finally(() => setLoading(false));
  }, [setUser, clearAuth, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-workspace-950 text-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20 animate-pulse">
            <ShieldAlert className="h-6 w-6 text-white" />
          </div>
          <div className="flex items-center gap-2 text-workspace-400">
            <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
            <span className="text-sm font-medium">Loading admin panel...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !authorized) {
    return null;
  }

  const locale = user.preferred_language || "en";
  const messages = locale === "ne" ? neMessages : enMessages;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="flex h-screen bg-workspace-950 text-workspace-100 overflow-hidden">
        <AdminSidebar />
        <div className="min-w-0 flex-1 flex flex-col overflow-hidden">
          <AdminNavbar />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </NextIntlClientProvider>
  );
}
