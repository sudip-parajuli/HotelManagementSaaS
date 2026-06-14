"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { Loader2 } from "lucide-react";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.role !== "SUPER_ADMIN") {
        router.replace("/");
      } else {
        setAuthorized(true);
      }
    }
  }, [user, router]);

  if (!user || !authorized) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          <span className="text-sm text-slate-400">Verifying administrator credentials...</span>
        </div>
      </div>
    );
  }

  return <div className="p-6 space-y-6 max-w-7xl mx-auto">{children}</div>;
}
