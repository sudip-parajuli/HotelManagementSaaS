"use client";

import React, { useEffect, useState } from "react";
import {
  TrendingUp, Bed, DollarSign, Landmark, Utensils, Users, Calendar, ArrowRight, RefreshCw, AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { analyticsApi } from "@/lib/api/analytics";
import type { DailyMetric, TodaySnapshot } from "@/lib/types";
import {
  AreaChart, Area, BarChart, Bar, Cell, PieChart, Pie, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

const COLORS_PIE = ["#06b6d4", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#3b82f6"];

export default function AnalyticsDashboard() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  
  const [metrics, setMetrics] = useState<DailyMetric[]>([]);
  const [today, setToday] = useState<TodaySnapshot | null>(null);
  const [topItems, setTopItems] = useState<Array<{ name: string; category: string; quantity: number; revenue: number }>>([]);
  const [sources, setSources] = useState<Array<{ source: string; count: number }>>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggeringAgg, setTriggeringAgg] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [snapRes, topRes, sourceRes] = await Promise.all([
        analyticsApi.getDashboardSummary(),
        analyticsApi.getTopMenuItems({ start_date: startDate, end_date: endDate }),
        analyticsApi.getGuestSources({ start_date: startDate, end_date: endDate }),
      ]);
      setMetrics(snapRes.data.metrics);
      setToday(snapRes.data.today);
      setTopItems(topRes.data);
      setSources(sourceRes.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch analytics datasets. Please verify database connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const handleForceAggregate = async () => {
    setTriggeringAgg(true);
    try {
      await analyticsApi.calculateMetrics();
      alert("Successfully triggered metrics compilation for yesterday's operations!");
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Could not compile daily aggregates.");
    } finally {
      setTriggeringAgg(false);
    }
  };

  // Compute stats over range
  const totalRangeRevenue = metrics.reduce((acc, m) => acc + parseFloat(m.total_revenue), 0);
  const avgOccupancy = metrics.length > 0
    ? metrics.reduce((acc, m) => acc + parseFloat(m.occupancy_rate), 0) / metrics.length
    : 0;
  const avgADR = metrics.length > 0
    ? metrics.reduce((acc, m) => acc + parseFloat(m.adr), 0) / metrics.length
    : 0;
  const avgRevPAR = metrics.length > 0
    ? metrics.reduce((acc, m) => acc + parseFloat(m.revpar), 0) / metrics.length
    : 0;
  const totalGuests = metrics.reduce((acc, m) => acc + m.total_guests, 0);

  // Chart formatting helpers
  const revenueChartData = metrics.map((m) => ({
    date: m.date,
    Rooms: parseFloat(m.room_revenue),
    Restaurant: parseFloat(m.restaurant_revenue),
    Other: parseFloat(m.other_revenue),
  }));

  const pieChartData = sources.map((s) => ({
    name: s.source.replace("_", " ").toUpperCase(),
    value: s.count,
  }));

  const barChartData = topItems.map((item) => ({
    name: item.name,
    Sales: item.revenue,
    Qty: item.quantity,
  }));

  // Heatmap rendering: get opacity based on occupancy rate
  const getHeatmapColor = (rateStr: string) => {
    const rate = parseFloat(rateStr);
    if (rate === 0) return "bg-slate-900 border-slate-800 text-slate-600";
    if (rate < 25) return "bg-sky-950 border-sky-900 text-sky-400";
    if (rate < 50) return "bg-sky-900 border-sky-800 text-sky-300";
    if (rate < 75) return "bg-sky-700 border-sky-600 text-sky-100";
    return "bg-sky-500 border-sky-400 text-slate-950 font-bold";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-cyan-400" />
            Operations Analytics Dashboard
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">
            Monitor occupancy metrics, ADR, RevPAR, food orders, and booking acquisitions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleForceAggregate}
            disabled={triggeringAgg}
            className="border-slate-800 text-slate-300 hover:bg-slate-900"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${triggeringAgg ? "animate-spin" : ""}`} />
            Force Re-aggregate
          </Button>
          <Button
            size="sm"
            onClick={fetchData}
            className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Date Filters Card */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex flex-col md:flex-row md:items-end gap-4 shadow-lg">
        <div className="grid grid-cols-2 gap-4 flex-1">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-950 border-slate-800 text-white rounded-lg text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">End Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-950 border-slate-800 text-white rounded-lg text-xs"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-slate-800 text-slate-400 hover:text-white"
            onClick={() => {
              const start = new Date();
              start.setDate(start.getDate() - 7);
              setStartDate(start.toISOString().split("T")[0]);
              setEndDate(new Date().toISOString().split("T")[0]);
            }}
          >
            7 Days
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-slate-800 text-slate-400 hover:text-white"
            onClick={() => {
              const start = new Date();
              start.setDate(start.getDate() - 30);
              setStartDate(start.toISOString().split("T")[0]);
              setEndDate(new Date().toISOString().split("T")[0]);
            }}
          >
            30 Days
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-slate-800 text-slate-400 hover:text-white"
            onClick={() => {
              const start = new Date();
              start.setDate(start.getDate() - 90);
              setStartDate(start.toISOString().split("T")[0]);
              setEndDate(new Date().toISOString().split("T")[0]);
            }}
          >
            90 Days
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-center gap-3 text-rose-400">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            title: "Average Occupancy",
            value: `${avgOccupancy.toFixed(1)}%`,
            desc: today ? `Today: ${today.occupancy_rate.toFixed(1)}%` : "N/A",
            icon: Bed,
            color: "from-cyan-500 to-cyan-600",
            glow: "shadow-cyan-500/20",
          },
          {
            title: "Average ADR",
            value: `Rs. ${avgADR.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            desc: today ? `Today: Rs. ${today.adr.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "N/A",
            icon: DollarSign,
            color: "from-emerald-500 to-emerald-600",
            glow: "shadow-emerald-500/20",
          },
          {
            title: "Average RevPAR",
            value: `Rs. ${avgRevPAR.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            desc: today ? `Today: Rs. ${today.revpar.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "N/A",
            icon: Landmark,
            color: "from-purple-500 to-purple-600",
            glow: "shadow-purple-500/20",
          },
          {
            title: "Total Revenue",
            value: `Rs. ${totalRangeRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            desc: today ? `Today: Rs. ${today.total_revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "N/A",
            icon: DollarSign,
            color: "from-amber-500 to-amber-600",
            glow: "shadow-amber-500/20",
          },
          {
            title: "Restaurant Covers",
            value: `${metrics.reduce((acc, m) => acc + m.restaurant_covers, 0)}`,
            desc: today ? `Today: ${today.restaurant_covers} served` : "N/A",
            icon: Utensils,
            color: "from-rose-500 to-rose-600",
            glow: "shadow-rose-500/20",
          },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <Card key={idx} className="bg-slate-900/60 border-slate-800 hover:border-slate-700 transition-all group overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  {card.title}
                </CardTitle>
                <div className={`p-1.5 rounded-lg bg-gradient-to-br ${card.color} shadow-md ${card.glow} group-hover:scale-105 transition-transform duration-200`}>
                  <Icon className="h-3.5 w-3.5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-extrabold text-white tracking-tight">{card.value}</div>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">{card.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Stacked Area Chart */}
        <Card className="bg-slate-900/60 border-slate-800 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-cyan-400" />
              Revenue Stream Breakdown
            </CardTitle>
            <CardDescription className="text-[10px] text-slate-400">
              Visualizes room billing, restaurant charges, and extras stack over the period.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {loading ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">Loading metrics...</div>
            ) : metrics.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">No revenue data found.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChartData}>
                  <defs>
                    <linearGradient id="colorRooms" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPOS" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorOther" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={9} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "8px", fontSize: "11px" }}
                    itemStyle={{ color: "#ffffff" }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: "10px", color: "#94a3b8" }} />
                  <Area type="monotone" dataKey="Rooms" stroke="#06b6d4" fillOpacity={1} fill="url(#colorRooms)" stackId="1" />
                  <Area type="monotone" dataKey="Restaurant" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorPOS)" stackId="1" />
                  <Area type="monotone" dataKey="Other" stroke="#f59e0b" fillOpacity={1} fill="url(#colorOther)" stackId="1" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Occupancy Calendar Heatmap Grid */}
        <Card className="bg-slate-900/60 border-slate-800 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-cyan-400" />
              Occupancy Heatmap
            </CardTitle>
            <CardDescription className="text-[10px] text-slate-400">
              Color intensity indicates daily occupancy levels.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[220px] flex items-center justify-center text-slate-400 text-xs">Loading...</div>
            ) : metrics.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-slate-500 text-xs">No metrics log.</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-7 gap-1.5">
                  {metrics.slice(-28).map((m, idx) => {
                    const d = new Date(m.date);
                    return (
                      <div
                        key={idx}
                        className={`aspect-square rounded flex flex-col items-center justify-center border text-[9px] transition-all cursor-help ${getHeatmapColor(m.occupancy_rate)}`}
                        title={`Date: ${m.date}\nOccupancy: ${parseFloat(m.occupancy_rate).toFixed(1)}%\nADR: Rs. ${parseFloat(m.adr).toFixed(0)}`}
                      >
                        <span>{d.getDate()}</span>
                        <span className="text-[6.5px] opacity-75">{parseFloat(m.occupancy_rate).toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
                {/* Legend bar */}
                <div className="flex justify-between items-center text-[8.5px] text-slate-400 pt-2 border-t border-slate-800">
                  <span>0% (Empty)</span>
                  <div className="flex gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-slate-900 border border-slate-800"></span>
                    <span className="w-2.5 h-2.5 rounded bg-sky-950 border border-sky-900"></span>
                    <span className="w-2.5 h-2.5 rounded bg-sky-900 border border-sky-800"></span>
                    <span className="w-2.5 h-2.5 rounded bg-sky-700 border border-sky-600"></span>
                    <span className="w-2.5 h-2.5 rounded bg-sky-500 border border-sky-400"></span>
                  </div>
                  <span>100% (Full)</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sub-panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Acquisition Pie Chart */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-1.5">
              <Users className="h-4 w-4 text-cyan-400" />
              Booking Acquisitions
            </CardTitle>
            <CardDescription className="text-[10px] text-slate-400">
              Acquisition channels distribution logic over the selected range.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[240px] flex items-center justify-center">
            {loading ? (
              <div className="text-slate-400 text-xs">Loading...</div>
            ) : pieChartData.length === 0 ? (
              <div className="text-slate-500 text-xs">No channels log recorded.</div>
            ) : (
              <div className="w-full h-full flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "8px", fontSize: "11px" }}
                        itemStyle={{ color: "#ffffff" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Legend details */}
                <div className="space-y-1.5 flex-1 w-full text-xs text-slate-400">
                  {pieChartData.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-950/40 p-2 rounded-lg border border-slate-900/55">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS_PIE[idx % COLORS_PIE.length] }}></span>
                        <span className="font-semibold text-slate-300">{item.name}</span>
                      </div>
                      <span className="font-mono">{item.value} reservation(s)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Restaurant Menu Items */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-1.5">
              <Utensils className="h-4 w-4 text-cyan-400" />
              Top Menu Sales Products
            </CardTitle>
            <CardDescription className="text-[10px] text-slate-400">
              Analyzes revenue performance of top restaurant kitchen orders.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[240px]">
            {loading ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">Loading...</div>
            ) : barChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">No restaurant orders.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" fontSize={9} tickLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={8.5} tickLine={false} width={80} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "8px", fontSize: "11px" }}
                    itemStyle={{ color: "#ffffff" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "10px" }} />
                  <Bar dataKey="Sales" fill="#ec4899" radius={[0, 4, 4, 0]} name="Revenue (NPR)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
