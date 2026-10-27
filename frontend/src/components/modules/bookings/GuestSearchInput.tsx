"use client";

import React, { useState, useEffect } from "react";
import { Search, Plus, User, Phone, Mail, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { bookingsApi } from "@/lib/api/bookings";
import type { GuestProfile } from "@/lib/types";
import { useTranslations, useLocale } from "next-intl";

interface GuestSearchInputProps {
  onSelect: (guest: GuestProfile) => void;
  onAddNew: (searchQuery: string) => void;
}

export const GuestSearchInput: React.FC<GuestSearchInputProps> = ({ onSelect, onAddNew }) => {
  const t = useTranslations("Bookings");
  const locale = useLocale();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GuestProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await bookingsApi.searchGuests(query);
        setResults(res.data.results || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  return (
    <div className="relative w-full space-y-2">
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          placeholder={t("guest_search_placeholder")}
          className="bg-workspace-900 border-workspace-800 text-workspace-100 placeholder:text-workspace-600 rounded-lg pl-10 h-10 w-full"
          onFocus={() => setIsOpen(true)}
        />
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-workspace-500" />
      </div>

      {isOpen && query.trim().length >= 2 && (
        <div className="absolute z-50 w-full rounded-xl border border-workspace-900 bg-workspace-950 p-2 shadow-2xl space-y-1 max-h-[260px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-6 gap-2 text-workspace-400 text-xs font-medium">
              <Loader2 className="h-4 w-4 animate-spin text-brand-400" />
              {locale === "ne" ? "खोजिँदैछ..." : "Searching guest ledger..."}
            </div>
          ) : (
            <>
              {results.map((guest) => (
                <div
                  key={guest.id}
                  onClick={() => {
                    onSelect(guest);
                    setIsOpen(false);
                    setQuery("");
                  }}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-workspace-900 cursor-pointer group transition-colors"
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-sm text-workspace-200 group-hover:text-white">
                      {guest.first_name} {guest.last_name}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-workspace-500">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {guest.phone}
                      </span>
                      {guest.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {guest.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <User className="h-4 w-4 text-workspace-600 group-hover:text-brand-400" />
                </div>
              ))}

              <div className="border-t border-workspace-900/60 pt-1">
                <Button
                  onClick={() => {
                    onAddNew(query);
                    setIsOpen(false);
                  }}
                  variant="ghost"
                  className="w-full justify-start text-xs font-semibold text-brand-400 hover:text-brand-300 hover:bg-brand-500/5 h-9 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  {locale === "ne" ? `"${query}" को लागि नयाँ प्रोफाइल सिर्जना गर्नुहोस्` : `Create profile for "${query}"`}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
