"use client";

import React from "react";
import { 
  Sparkles, 
  Check, 
  ArrowRight, 
  ShieldCheck, 
  Building2, 
  TrendingUp, 
  Utensils, 
  Calendar, 
  Layers, 
  Coins, 
  Clock, 
  Users 
} from "lucide-react";
import Link from "next/link";

export default function SaasLandingPage() {
  const features = [
    {
      icon: <Calendar className="h-6 w-6 text-cyan-400" />,
      title: "Dynamic Stay Builder & Ledger",
      desc: "Live rooms status grid, check-in wizards, and guest reservation logs built to scale.",
    },
    {
      icon: <Utensils className="h-6 w-6 text-emerald-400" />,
      title: "Integrated Restaurant POS",
      desc: "Order taking, KDS pipelines, and cash checkouts or room charges integrated seamlessly.",
    },
    {
      icon: <Coins className="h-6 w-6 text-amber-400" />,
      title: "Nepalese Localized Payroll",
      desc: "TDS-compliant calculations and SSF-structured payslip configurations built for Nepal.",
    },
    {
      icon: <Layers className="h-6 w-6 text-purple-400" />,
      title: "Housekeeping Task Boards",
      desc: "Real-time room status updates, bulk cleaner assignment, and maintenance workflow log.",
    },
    {
      icon: <TrendingUp className="h-6 w-6 text-blue-400" />,
      title: "fonepay, eSewa & Khalti POS",
      desc: "Direct integration with major Nepalese payment networks for lightning fast checkouts.",
    },
    {
      icon: <ShieldCheck className="h-6 w-6 text-rose-400" />,
      title: "Tenant Schema Isolation",
      desc: "Every hotel gets its own fully isolated PostgreSQL database schema for top-tier security.",
    },
  ];

  const plans = [
    {
      name: "Starter Class",
      slug: "starter",
      price: "Rs. 10,000",
      period: "per month",
      rooms: "Up to 20 rooms",
      desc: "Perfect for boutique stays and local lodges starting their digital journey.",
      features: [
        "Stay Builder & Calendar Grid",
        "Guest Ledger Profile Directory",
        "Front Desk Walk-In Wizards",
        "Cash & Card Billing Invoices",
        "1 Tenant Schema Environment",
      ],
      popular: false,
      cta: "Start 14-Day Free Trial",
    },
    {
      name: "Professional Class",
      slug: "professional",
      price: "Rs. 25,000",
      period: "per month",
      rooms: "Up to 100 rooms",
      desc: "Designed for busy commercial hotels seeking full POS and housekeeping automation.",
      features: [
        "Everything in Starter Class",
        "Restaurant POS & KDS Panels",
        "Housekeeping Management Boards",
        "eSewa, Khalti & Fonepay Checkouts",
        "Automated PDF Operations Reports",
      ],
      popular: true,
      cta: "Start 14-Day Free Trial",
    },
    {
      name: "Enterprise Class",
      slug: "enterprise",
      price: "Rs. 60,000",
      period: "per month",
      rooms: "Unlimited rooms",
      desc: "Engineered for luxury resorts and multi-property groups requiring deep payroll and compliance.",
      features: [
        "Everything in Professional Class",
        "Nepal TDS & SSF Localized Payroll",
        "Multi-Property Console Navigation",
        "Custom Host Subdomain Mapping",
        "Priority 24/7 Dedicated SLA Support",
      ],
      popular: false,
      cta: "Contact Enterprise Sales",
    },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Header / Navbar */}
      <header className="border-b border-slate-900 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/20">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="font-extrabold text-white text-lg tracking-wider">
              SIA <span className="text-cyan-400">HMS</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-400">
            <a href="#about" className="hover:text-white transition-all">About Us</a>
            <a href="#features" className="hover:text-white transition-all">Features</a>
            <a href="#pricing" className="hover:text-white transition-all">Pricing Plans</a>
          </nav>

          <div className="flex items-center gap-4">
            <a 
              href="/login/" 
              className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 transition-all"
            >
              Sign In
            </a>
            <Link 
              href="/register/" 
              className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 text-xs font-bold px-4 py-2 rounded-xl shadow-md shadow-cyan-500/10 transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-28 px-6 overflow-hidden">
        {/* Glow Spheres */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] bg-gradient-to-br from-cyan-500/10 to-transparent blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 h-[400px] w-[400px] bg-gradient-to-br from-blue-600/10 to-transparent blur-[150px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-8 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-950/20 text-cyan-400 text-[10px] font-bold uppercase tracking-wider animate-pulse">
            <Sparkles className="h-3.5 w-3.5" />
            Next-Gen Hotel Operations Engine
          </div>

          <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-white via-slate-200 to-slate-500 bg-clip-text text-transparent tracking-tight leading-tight">
            Nepal's Premier SaaS Engine <br />
            for Modern Hospitality
          </h1>

          <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            SIA HMS provides isolated tenant database schemas, live room-stay builder grids, integrated kitchen POS, housekeeping boards, and locally-compliant TDS/SSF payroll for Nepalese enterprises.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/register/"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-sm px-8 py-3 rounded-xl shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02]"
            >
              Start Your Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#pricing"
              className="w-full sm:w-auto flex items-center justify-center py-3 px-8 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900/50 transition-all text-sm font-semibold"
            >
              View Pricing tiers
            </a>
          </div>

          {/* Quick Mockup Placeholder */}
          <div className="pt-12">
            <div className="bg-slate-900/20 border border-slate-800/80 p-3 rounded-2xl shadow-2xl relative overflow-hidden backdrop-blur-sm max-w-4xl mx-auto">
              <div className="bg-slate-950 rounded-xl overflow-hidden aspect-[16/9] border border-slate-900 flex flex-col justify-between p-6 text-left relative">
                {/* Simulated Glass Panel Interface */}
                <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500/60" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/60" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/60" />
                    <span className="text-[10px] text-slate-600 font-mono ml-4">himalayan-oasis.localhost:3000/dashboard</span>
                  </div>
                  <div className="h-4 w-28 bg-slate-900 rounded" />
                </div>
                
                <div className="grid grid-cols-3 gap-4 py-6 flex-1">
                  <div className="bg-slate-900/40 border border-slate-800/60 p-4 rounded-xl flex flex-col justify-between">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Occupancy Rate</span>
                    <span className="text-3xl font-black text-cyan-400">84.2%</span>
                    <span className="text-[9px] text-emerald-400">▲ +12% vs last week</span>
                  </div>
                  <div className="bg-slate-900/40 border border-slate-800/60 p-4 rounded-xl flex flex-col justify-between">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Today's Revenue</span>
                    <span className="text-3xl font-black text-emerald-400">Rs. 1,45,000</span>
                    <span className="text-[9px] text-slate-500">14 check-ins processed</span>
                  </div>
                  <div className="bg-slate-900/40 border border-slate-800/60 p-4 rounded-xl flex flex-col justify-between">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Kitchen Covers</span>
                    <span className="text-3xl font-black text-purple-400">58 plates</span>
                    <span className="text-[9px] text-purple-400">KDS Active queue: 2</span>
                  </div>
                </div>

                <div className="h-6 w-full bg-slate-900/40 border border-slate-900 rounded-lg flex items-center px-3 justify-between text-[9px] text-slate-500">
                  <span>SIA Hotel Management Software Engine v2.4</span>
                  <span>System Environment: Isolated Postgres Schema</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="py-24 border-t border-slate-900/60 bg-slate-950/40 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">About SIA Enterprises</span>
            <h2 className="text-3xl font-bold text-white tracking-tight leading-tight">
              Empowering Hospitality with Localized Nepalese Software Solutions
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Founded at the heart of Nepal, SIA Enterprises specializes in building enterprise-grade software systems that solve operational inefficiencies for local businesses. Our Multi-Tenant Hotel Engine combines global technology standards with specific local integrations, making property management simple, isolated, and compliant.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <span className="text-2xl font-extrabold text-white">100%</span>
                <p className="text-[11px] text-slate-500">Postgres Schema Isolation</p>
              </div>
              <div className="space-y-1">
                <span className="text-2xl font-extrabold text-white">Localized</span>
                <p className="text-[11px] text-slate-500">TDS & SSF Payroll Ready</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Our Core Commitments</h4>
            <div className="space-y-3">
              {[
                "Strict Data Isolation: Tenants never share schema databases, ensuring data confidentiality.",
                "Zero Downtime Deployment: Multi-tenant routing resolves dynamic subdomains instantly.",
                "Nepal Payments Ecosystem: Ready-to-go integrations with eSewa, Khalti, and Fonepay gateway merchants.",
                "Reliable Offline Support: Standalone DB setups optimized to recover from erratic connectivity issues.",
              ].map((commitment, idx) => (
                <div key={idx} className="flex gap-2.5 items-start text-xs text-slate-300">
                  <div className="h-4 w-4 rounded bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-3 w-3 text-cyan-400" />
                  </div>
                  <p>{commitment}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="py-24 border-t border-slate-900/60 px-6 relative">
        <div className="max-w-5xl mx-auto space-y-16">
          <div className="text-center space-y-3 max-w-xl mx-auto">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Comprehensive Ecosystem</span>
            <h2 className="text-3xl font-bold text-white tracking-tight">Everything you need to automate operations</h2>
            <p className="text-slate-400 text-xs md:text-sm">
              SIA HMS integrates all modules of a modern hotel into a single glassmorphic interface.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feat, idx) => (
              <div 
                key={idx} 
                className="bg-slate-900/20 border border-slate-800/50 p-6 rounded-2xl hover:border-slate-700/80 transition-all group backdrop-blur-sm hover:scale-[1.01]"
              >
                <div className="p-3 bg-slate-950 border border-slate-900 rounded-xl w-fit group-hover:scale-105 transition-all">
                  {feat.icon}
                </div>
                <h3 className="text-sm font-bold text-white mt-5 mb-2">{feat.title}</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Grid Section */}
      <section id="pricing" className="py-24 border-t border-slate-900/60 bg-slate-950/40 px-6">
        <div className="max-w-5xl mx-auto space-y-16">
          <div className="text-center space-y-3 max-w-xl mx-auto">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Pricing Plans</span>
            <h2 className="text-3xl font-bold text-white tracking-tight">Simple transparent pricing for every scale</h2>
            <p className="text-slate-400 text-xs md:text-sm">
              Choose the tier that matches your property size. Cancel or upgrade anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, idx) => (
              <div 
                key={idx} 
                className={`rounded-2xl p-6 flex flex-col justify-between backdrop-blur-md relative overflow-hidden border ${
                  plan.popular 
                    ? "bg-slate-900/40 border-cyan-500/40 shadow-xl shadow-cyan-500/5" 
                    : "bg-slate-900/10 border-slate-800/60"
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold uppercase tracking-wider text-[8px] px-3 py-1 rounded-bl-lg">
                    Most Popular
                  </div>
                )}
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-white">{plan.name}</h3>
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">{plan.rooms}</p>
                  </div>

                  <div className="flex items-baseline gap-1.5 py-2">
                    <span className="text-3xl font-black text-white">{plan.price}</span>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">{plan.period}</span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed min-h-[36px]">{plan.desc}</p>

                  <div className="h-px bg-slate-900" />

                  <ul className="space-y-3 text-[11px] text-slate-300">
                    {plan.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-cyan-400 flex-shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-8">
                  <Link
                    href={`/register/?plan=${plan.slug}`}
                    className={`w-full flex items-center justify-center py-2.5 rounded-xl font-bold text-xs transition-all ${
                      plan.popular
                        ? "bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/15 hover:scale-[1.01]"
                        : "bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-950 bg-slate-950 py-12 px-6 text-center text-xs text-slate-600">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex justify-center items-center gap-2">
            <div className="h-6 w-6 rounded bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center border border-cyan-400/20">
              <Building2 className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-extrabold text-white text-xs tracking-wider">
              SIA <span className="text-cyan-400">HMS</span>
            </span>
          </div>
          <p>© {new Date().getFullYear()} SIA Enterprises Pvt. Ltd. All rights reserved.</p>
          <p className="text-[10px] text-slate-700">Kathmandu, Nepal | info@siaenterprises.com.np</p>
        </div>
      </footer>
    </div>
  );
}
