"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { posApi } from "@/lib/api/pos";
import { useTranslations, useLocale } from "next-intl";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { TrendingUp, TrendingDown, Package, ShoppingBag, Award } from "lucide-react";

interface SalesInsightsData {
  period_days: number;
  since: string;
  revenue: { total: string; orders: number; avg_order_value: string };
  by_order_type: Array<{ order_type: string; count: number; revenue: string }>;
  top_items: Array<{ name: string; category: string; qty_sold: number; revenue: string }>;
  kds_performance: { avg_accept_time_seconds: number | null; avg_cook_time_seconds: number | null };
  discounts: { total_discounted: string };
}

const COLORS = ["#06b6d4", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];

export default function POSSalesInsightsPage() {
  const t = useTranslations("POS");
  const locale = useLocale();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<SalesInsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const res = await posApi.getSalesInsights(days);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [days]);

  const formatTime = (seconds: number | null) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">{t("sales_insights")}</h1>
          <p className="text-slate-400 text-sm">
            {locale === "ne" ? "३० दिनको बिक्रम र गतिविधि विश्लेषण" : "Last 30-day revenue & activity analysis"}
          </p>
        </div>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-36 bg-slate-950 border-slate-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-950 border-slate-900">
            <SelectItem value="7">7 days</SelectItem>
            <SelectItem value="30">30 days</SelectItem>
            <SelectItem value="60">60 days</SelectItem>
            <SelectItem value="90">90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-400">Loading insights...</div>
      ) : data ? (
        <>
          {/* Top Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-slate-900/60 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-slate-400 uppercase flex items-center gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  {locale === "ne" ? "कुल बिक्री" : "Total Sales"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  NPR {Number(data.revenue.total).toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/60 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-slate-400 uppercase flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5" />
                  {locale === "ne" ? "कुल अर्डर" : "Total Orders"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{data.revenue.orders}</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/60 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-slate-400 uppercase flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5" />
                  {locale === "ne" ? "औसत अर्डर" : "Avg Order"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  NPR {Number(data.revenue.avg_order_value).toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/60 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-slate-400 uppercase">
                  {locale === "ne" ? "KDS औसत समय" : "KDS Cycle Time"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-xs text-slate-400">
                  {locale === "ne" ? "स्वीकृति:" : "Accept:"} {formatTime(data.kds_performance.avg_accept_time_seconds)}
                </div>
                <div className="text-xs text-slate-400">
                  {locale === "ne" ? "अधिकांश:" : "Cook:"} {formatTime(data.kds_performance.avg_cook_time_seconds)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales by Order Type */}
            <Card className="bg-slate-900/60 border-slate-800">
              <CardHeader>
                <CardTitle className="text-sm text-white">
                  {locale === "ne" ? "विक्री प्रकार अनुसार" : "Sales by Order Type"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.by_order_type}>
                      <XAxis dataKey="order_type" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b" }}
                        labelStyle={{ color: "#cbd5e0" }}
                        formatter={((value: number, name: string) => [
                          `NPR ${Number(value).toLocaleString()}`,
                          name === "revenue" ? (locale === "ne" ? "राजस्व" : "Revenue") : (locale === "ne" ? "आदेश" : "Orders")
                        ]) as any}
                      />
                      <Bar dataKey="revenue" fill="#06b6d4" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top Items Pie */}
            <Card className="bg-slate-900/60 border-slate-800">
              <CardHeader>
                <CardTitle className="text-sm text-white">
                  {locale === "ne" ? "अग्रशील वस्तुहरू" : "Top Selling Items"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.top_items.slice(0, 5)}
                        dataKey="qty_sold"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(props: any) => `${props.name} (${props.qty_sold})`}
                      >
                        {data.top_items.slice(0, 5).map((_, i) => (
                          <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b" }}
                        formatter={((value: number) => [`${value} sold`, "Quantity"]) as any}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Items Table */}
          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader>
              <CardTitle className="text-sm text-white">
                {locale === "ne" ? "शीर्ष १० विक्री वस्तुहरू" : "Top 10 Selling Items"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-xs text-slate-300">
                <thead className="border-b border-slate-800">
                  <tr className="text-slate-400">
                    <th className="text-left pb-2">#</th>
                    <th className="text-left pb-2">{locale === "ne" ? "वस्तु" : "Item"}</th>
                    <th className="text-left pb-2">{locale === "ne" ? "श्रेणी" : "Category"}</th>
                    <th className="text-right pb-2">{locale === "ne" ? "परिमाण" : "Qty"}</th>
                    <th className="text-right pb-2">{locale === "ne" ? "राजस्व" : "Revenue"}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_items.map((item, idx) => (
                    <tr key={item.name} className="border-b border-slate-900/50">
                      <td className="py-2">{idx + 1}</td>
                      <td className="py-2 font-medium text-slate-200">{item.name}</td>
                      <td className="py-2 text-slate-400">{item.category}</td>
                      <td className="py-2 text-right font-mono">{item.qty_sold}</td>
                      <td className="py-2 text-right font-mono">NPR {Number(item.revenue).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="text-center py-8 text-slate-400">No data available.</div>
      )}
    </div>
  );
}