"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bed, CalendarCheck, UserCheck, DollarSign,
  TrendingUp, Activity, ArrowUp, ArrowDown, Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/lib/store/authStore";

const statCards = [
  {
    title: "Occupancy Rate",
    value: "78%",
    change: "+4.1%",
    positive: true,
    icon: Bed,
    color: "from-cyan-500 to-cyan-600",
    glow: "shadow-cyan-500/20",
  },
  {
    title: "Today's Arrivals",
    value: "8",
    change: "3 pending",
    positive: true,
    icon: CalendarCheck,
    color: "from-emerald-500 to-emerald-600",
    glow: "shadow-emerald-500/20",
  },
  {
    title: "In-House Guests",
    value: "31",
    change: "-2 from yesterday",
    positive: false,
    icon: UserCheck,
    color: "from-violet-500 to-violet-600",
    glow: "shadow-violet-500/20",
  },
  {
    title: "Today's Revenue",
    value: "Rs. 45,800",
    change: "+12.3% vs yesterday",
    positive: true,
    icon: DollarSign,
    color: "from-amber-500 to-amber-600",
    glow: "shadow-amber-500/20",
  },
];

const recentActivity = [
  { time: "10:45 AM", event: "Check-in: Ramesh Sharma — Room 201", type: "checkin" },
  { time: "10:12 AM", event: "New booking: 2 nights, Room Type: Deluxe", type: "booking" },
  { time: "09:58 AM", event: "Check-out: Priya Rana — Room 105", type: "checkout" },
  { time: "09:30 AM", event: "Housekeeping completed: Rooms 201, 202", type: "housekeeping" },
  { time: "09:00 AM", event: "POS Order #1042 — Table 3, Rs. 2,400", type: "pos" },
];

const activityColors: Record<string, string> = {
  checkin: "bg-emerald-500",
  checkout: "bg-rose-500",
  booking: "bg-cyan-500",
  housekeeping: "bg-amber-500",
  pos: "bg-violet-500",
};

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    if (user?.role === "SUPER_ADMIN") {
      const isImpersonating = document.cookie.includes("impersonated_tenant_name");
      if (!isImpersonating) {
        router.replace("/superadmin");
      }
    }
  }, [user, router]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Good {time.getHours() < 12 ? "Morning" : time.getHours() < 17 ? "Afternoon" : "Evening"},{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {user?.first_name ?? "Manager"}
            </span>
          </h1>
          <p className="text-slate-400 text-sm">
            Here's what's happening at your hotel today.
          </p>
        </div>
        <div className="flex items-center gap-2 text-slate-400 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5">
          <Clock className="h-4 w-4 text-cyan-400" />
          <span className="font-mono text-sm font-medium text-slate-300">
            {time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card
              key={i}
              className="bg-slate-900/60 border-slate-800 hover:border-slate-700 transition-all duration-200 group overflow-hidden"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color} shadow-md ${stat.glow} group-hover:scale-110 transition-transform duration-200`}>
                  <Icon className="h-3.5 w-3.5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${stat.positive ? "text-emerald-400" : "text-rose-400"}`}>
                  {stat.positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {stat.change}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Room Status */}
        <Card className="bg-slate-900/60 border-slate-800 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <Bed className="h-4 w-4 text-cyan-400" />
              Room Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Available", count: 12, total: 40, color: "bg-emerald-500" },
              { label: "Occupied", count: 22, total: 40, color: "bg-cyan-500" },
              { label: "Dirty", count: 4, total: 40, color: "bg-amber-500" },
              { label: "Maintenance", count: 2, total: 40, color: "bg-rose-500" },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>{item.label}</span>
                  <span className="font-medium text-slate-300">{item.count} rooms</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{ width: `${(item.count / item.total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity Feed */}
        <Card className="bg-slate-900/60 border-slate-800 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-start gap-3 group">
                <div className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${activityColors[item.type]}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300 group-hover:text-white transition-colors truncate">
                    {item.event}
                  </p>
                </div>
                <span className="text-xs text-slate-500 flex-shrink-0">{item.time}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Upcoming Arrivals teaser */}
        <Card className="bg-slate-900/60 border-slate-800 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-cyan-400" />
              Week Ahead — Arrivals Forecast
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-20">
              {[8, 12, 6, 15, 9, 11, 7].map((val, i) => {
                const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                const isToday = i === 0;
                return (
                  <div key={i} className="flex flex-col items-center gap-1 flex-1">
                    <div
                      className={`w-full rounded-t-sm transition-all duration-300 ${isToday ? "bg-gradient-to-t from-cyan-600 to-cyan-400" : "bg-slate-700 hover:bg-slate-600"}`}
                      style={{ height: `${(val / 15) * 100}%` }}
                    />
                    <span className={`text-[10px] font-medium ${isToday ? "text-cyan-400" : "text-slate-500"}`}>
                      {days[i]}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
