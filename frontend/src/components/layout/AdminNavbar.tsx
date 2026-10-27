"use client";
import { ThemeToggle } from "@/components/theme/ThemeProvider";
import React from "react";
import { Bell, LogOut, Settings, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LanguageToggle } from "./LanguageToggle";
import { useTranslations } from "next-intl";

interface AdminNavbarProps {
  title?: string;
}

export function AdminNavbar({ title }: AdminNavbarProps) {
  const { user, logout } = useAuth();
  const t = useTranslations("Navbar");

  return (
    <header className="h-16 flex items-center justify-between px-3 sm:px-6 border-b border-workspace-900 bg-workspace-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-brand-400" />
        <h1 className="text-sm sm:text-base font-semibold text-workspace-200 tracking-tight">
          {title ?? "Staywired"}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <LanguageToggle />

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-workspace-900 border border-workspace-800 hover:border-workspace-700 transition-all outline-none"
          >
            <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-brand-500 to-brand-600 flex items-center justify-center text-xs font-bold text-white shadow-md shadow-brand-500/20">
              {user?.first_name?.charAt(0).toUpperCase() ?? "A"}
            </div>
            <div className="hidden sm:flex flex-col items-start">
              <span className="text-xs font-semibold text-workspace-200 leading-none">
                {user?.first_name} {user?.last_name}
              </span>
              <span className="text-[10px] font-medium mt-0.5 px-1.5 py-0.5 rounded-full border bg-brand-500/10 text-brand-400 border-brand-500/20">
                Platform administrator
              </span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-52 bg-workspace-900 border-workspace-800 text-workspace-200"
          >
            <DropdownMenuLabel className="text-workspace-400 text-xs">
              {user?.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-workspace-800" />
            <DropdownMenuItem
              className="hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 cursor-pointer gap-2"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
              {t("sign_out")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
