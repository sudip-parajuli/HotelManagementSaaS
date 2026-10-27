"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { crmApi } from "@/lib/api/crm";
import { BadgeCent, Award, ArrowUpRight, ArrowDownRight, Search, ClipboardList, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { LoyaltyAccount, LoyaltyTransaction } from "@/lib/types";
import { useTranslations, useLocale } from "next-intl";
import { useTransData } from "@/lib/hooks/useTransData";

export default function LoyaltyPage() {
  const [accounts, setAccounts] = useState<LoyaltyAccount[]>([]);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const t = useTranslations("CRM");
  const tData = useTransData();
  const locale = useLocale();

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (search) params.search = search;

      const [accRes, txRes] = await Promise.all([
        crmApi.listLoyaltyAccounts(params),
        crmApi.listLoyaltyTransactions(),
      ]);

      setAccounts(accRes.data.results);
      setTransactions(txRes.data.results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const getTierBadgeColor = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case "platinum":
        return "bg-slate-100 text-slate-900 border-slate-200";
      case "gold":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "silver":
        return "bg-slate-400/10 text-slate-300 border-slate-400/20";
      case "bronze":
      default:
        return "bg-amber-900/10 text-amber-600 border-amber-950/20";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {locale === "ne" ? "लोयल्टी र पुरस्कार" : "Loyalty & Rewards"}
          </h1>
          <p className="text-slate-400 text-sm">
            {locale === "ne"
              ? "स्तर श्रेणी स्थिति, अङ्क सन्तुलन पानाहरू र लेनदेन अङ्क अडिट लगहरू ट्र्याक गर्नुहोस्।"
              : "Track tier ranks status, point balances sheets, and transactional points audit logs."}
          </p>
        </div>
      </div>

      {/* Tiers Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { name: locale === "ne" ? "कास्य स्तर (Bronze Tier)" : "Bronze Tier", range: locale === "ne" ? "० - ४९९ अङ्क" : "0 - 499 pts", count: accounts.filter((a) => a.tier === "bronze").length, color: "from-amber-900/40 to-amber-900/20 border-amber-900/50 text-amber-500" },
          { name: locale === "ne" ? "चाँदी स्तर (Silver Tier)" : "Silver Tier", range: locale === "ne" ? "५०० - १४९९ अङ्क" : "500 - 1499 pts", count: accounts.filter((a) => a.tier === "silver").length, color: "from-slate-700/40 to-slate-800/20 border-slate-700/50 text-slate-300" },
          { name: locale === "ne" ? "सुन स्तर (Gold Tier)" : "Gold Tier", range: locale === "ne" ? "१५०० - ४९९९ अङ्क" : "1500 - 4999 pts", count: accounts.filter((a) => a.tier === "gold").length, color: "from-amber-600/40 to-amber-600/20 border-amber-600/50 text-amber-400" },
          { name: locale === "ne" ? "प्लाटिनम स्तर (Platinum Tier)" : "Platinum Tier", range: locale === "ne" ? "५०००+ अङ्क" : "5000+ pts", count: accounts.filter((a) => a.tier === "platinum").length, color: "from-slate-100/20 to-slate-300/10 border-slate-200/25 text-slate-100" },
        ].map((tier) => (
          <Card key={tier.name} className={`bg-gradient-to-br ${tier.color} border overflow-hidden`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                {tier.name}
                <Award className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {locale === "ne" ? `${tier.count} खाताहरू` : `${tier.count} Accounts`}
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-1">
                {locale === "ne" ? "आवश्यक:" : "Required:"} {tier.range}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accounts Table */}
        <Card className="bg-slate-900/60 border-slate-800 lg:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-sm font-semibold text-white">
                  {locale === "ne" ? "लोयल्टी खाताहरूको बही" : "Loyalty Accounts Ledger"}
                </CardTitle>
                <CardDescription className="text-[11px] text-slate-500">
                  {locale === "ne" ? "अङ्क सन्तुलन सहित दर्ता भएका पाहुनाहरूको सूची।" : "List of registered guests with points balances."}
                </CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  placeholder={locale === "ne" ? "खाताहरू खोज्नुहोस्..." : "Search accounts..."}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-slate-950 border-slate-800 text-white w-52 text-xs h-9 rounded-xl"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-slate-300 text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-left">
                  <tr>
                    <th className="p-4">{locale === "ne" ? "ग्राहक" : "Customer"}</th>
                    <th className="p-4">{t("phone")}</th>
                    <th className="p-4">{t("tier")}</th>
                    <th className="p-4 text-right">{locale === "ne" ? "अङ्क सन्तुलन" : "Points Balance"}</th>
                    <th className="p-4">{locale === "ne" ? "स्तर अद्यावधिक गरिएको" : "Rank Updated"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="text-center p-8 text-slate-500">
                        {locale === "ne" ? "लोयल्टी खाताहरू लोड हुँदैछ..." : "Loading accounts ledger..."}
                      </td>
                    </tr>
                  ) : accounts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center p-8 text-slate-500">
                        {locale === "ne" ? "कुनै सक्रिय खाता फेला परेन।" : "No active accounts matches found."}
                      </td>
                    </tr>
                  ) : (
                    accounts.map((acc) => (
                      <tr key={acc.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-4 font-semibold text-slate-200">{acc.guest?.full_name}</td>
                        <td className="p-4 font-mono text-slate-400">{acc.guest?.phone}</td>
                        <td className="p-4">
                          <Badge className={`${getTierBadgeColor(acc.tier)} border text-[10px] uppercase font-semibold`}>
                            {tData(acc.tier_display || acc.tier)}
                          </Badge>
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-purple-400">
                          {acc.points_balance} {locale === "ne" ? "अङ्क" : "pts"}
                        </td>
                        <td className="p-4 text-slate-500">{new Date(acc.tier_updated_at).toLocaleDateString(locale === "ne" ? "ne-NP" : "en-US")}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Transactions ledger */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <BadgeCent className="h-4 w-4 text-purple-400" />
              {locale === "ne" ? "अङ्क लेखापरीक्षण इतिहास" : "Points Audit History"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
            {transactions.length === 0 ? (
              <div className="text-center py-16 text-slate-500 flex flex-col items-center gap-2">
                <ClipboardList className="h-8 w-8 text-slate-600" />
                <p className="text-xs">{locale === "ne" ? "हालसम्म कुनै अङ्क समायोजन भएको छैन।" : "No points adjustments have occurred yet."}</p>
              </div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="bg-slate-950 p-3 rounded-xl border border-slate-900 space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-200">{tx.guest_name || (locale === "ne" ? "पाहुना खाता" : "Guest Account")}</span>
                    <span className="text-[10px] text-slate-500">{new Date(tx.created_at).toLocaleDateString(locale === "ne" ? "ne-NP" : "en-US")}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">{tData(tx.description)}</p>
                  <div className="flex justify-between items-center pt-1.5 border-t border-slate-900/80">
                    <span className="text-[9px] uppercase font-semibold text-slate-500">{tData(tx.transaction_type)}</span>
                    <span className={`font-mono font-bold flex items-center gap-0.5 ${tx.points > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {tx.points > 0 ? (
                        <>
                          <ArrowUpRight className="h-3.5 w-3.5" /> +{tx.points} {locale === "ne" ? "अङ्क" : "pts"}
                        </>
                      ) : (
                        <>
                          <ArrowDownRight className="h-3.5 w-3.5" /> {tx.points} {locale === "ne" ? "अङ्क" : "pts"}
                        </>
                      )}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
