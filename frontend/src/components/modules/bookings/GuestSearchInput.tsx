"use client";

import React, { useState, useEffect } from "react";
import { Search, Plus, User, Phone, Mail, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { bookingsApi } from "@/lib/api/bookings";
import type { GuestProfile } from "@/lib/types";

interface GuestSearchInputProps {
  onSelect: (guest: GuestProfile) => void;
  onAddNew: (searchQuery: string) => void;
}

export const GuestSearchInput: React.FC<GuestSearchInputProps> = ({ onSelect, onAddNew }) => {
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
          placeholder="Search guest by name or phone number..."
          className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-600 rounded-lg pl-10 h-10 w-full"
          onFocus={() => setIsOpen(true)}
        />
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
      </div>

      {isOpen && query.trim().length >= 2 && (
        <div className="absolute z-50 w-full rounded-xl border border-slate-900 bg-slate-950 p-2 shadow-2xl space-y-1 max-h-[260px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-6 gap-2 text-slate-400 text-xs font-medium">
              <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
              Searching guest ledger...
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
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-900 cursor-pointer group transition-colors"
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-sm text-slate-200 group-hover:text-white">
                      {guest.first_name} {guest.last_name}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
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
                  <User className="h-4 w-4 text-slate-600 group-hover:text-cyan-400" />
                </div>
              ))}

              <div className="border-t border-slate-900/60 pt-1">
                <Button
                  onClick={() => {
                    onAddNew(query);
                    setIsOpen(false);
                  }}
                  variant="ghost"
                  className="w-full justify-start text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/5 h-9 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create profile for "{query}"
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
