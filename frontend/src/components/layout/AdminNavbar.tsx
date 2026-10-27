"use client";
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
    <header className="h-16 flex items-center justify-between px-6 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-purple-400" />
        <h1 className="text-base font-semibold text-slate-200 tracking-tight">
          {title ?? "SaaS Platform Management"}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <LanguageToggle />

        <Button
          variant="ghost"
          size="icon"
          className="text-slate-400 hover:text-white hover:bg-slate-900 relative"
          aria-label="System Alerts"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
        </Button>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all outline-none"
          >
            <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-purple-500 to-pink-600 flex items-center justify-center text-xs font-bold text-white shadow-md shadow-purple-500/20">
              {user?.first_name?.charAt(0).toUpperCase() ?? "A"}
            </div>
            <div className="hidden sm:flex flex-col items-start">
              <span className="text-xs font-semibold text-slate-200 leading-none">
                {user?.first_name} {user?.last_name}
              </span>
              <span className="text-[10px] font-medium mt-0.5 px-1.5 py-0.5 rounded-full border bg-purple-500/10 text-purple-400 border-purple-500/20">
                SaaS Administrator
              </span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-52 bg-slate-900 border-slate-800 text-slate-200"
          >
            <DropdownMenuLabel className="text-slate-400 text-xs">
              {user?.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-800" />
            <DropdownMenuItem className="hover:bg-slate-800 cursor-pointer gap-2">
              <Settings className="h-4 w-4 text-slate-400" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-800" />
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
