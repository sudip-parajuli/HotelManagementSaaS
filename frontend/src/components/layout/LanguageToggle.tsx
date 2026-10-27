"use client";

import React from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { authClient } from "@/lib/api/client";
import { toast } from "sonner";

export function LanguageToggle() {
  const { user, setUser } = useAuthStore();
  const currentLang = user?.preferred_language || "en";

  const handleToggle = async (lang: "en" | "ne") => {
    if (lang === currentLang) return;
    try {
      const res = await authClient.put("/me", { preferred_language: lang });
      setUser(res.data);
      toast.success(lang === "ne" ? "भाषा नेपालीमा परिवर्तन भयो" : "Language changed to English");
    } catch (err) {
      console.error(err);
      toast.error("Failed to change language");
    }
  };

  return (
    <div className="flex items-center gap-1 bg-workspace-900 border border-workspace-800 rounded-full p-0.5 shadow-inner">
      <button
        type="button"
        onClick={() => handleToggle("en")}
        className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-all ${
          currentLang === "en"
            ? "bg-brand-500 text-workspace-950 shadow-sm shadow-brand-500/20"
            : "text-workspace-400 hover:text-white"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => handleToggle("ne")}
        className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-all ${
          currentLang === "ne"
            ? "bg-brand-500 text-workspace-950 shadow-sm shadow-brand-500/20"
            : "text-workspace-400 hover:text-white"
        }`}
      >
        नेपाली
      </button>
    </div>
  );
}
