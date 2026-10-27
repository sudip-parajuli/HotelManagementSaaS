"use client";

import React, { useEffect, useState } from "react";
import {
  FileText, Calendar, Download, RefreshCw, AlertCircle, CheckCircle2, Loader2, ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { analyticsApi } from "@/lib/api/analytics";
import type { ReportExport } from "@/lib/types";
import { useTranslations, useLocale } from "next-intl";
import { useTransData } from "@/lib/hooks/useTransData";

const REPORTS_LIST = [
  { id: "daily_revenue", name: "Daily Revenue Report", formats: ["pdf"] },
  { id: "occupancy", name: "Occupancy Analysis Report", formats: ["pdf"] },
  { id: "guest_ledger", name: "Active Guest Ledger Folio", formats: ["pdf"] },
  { id: "staff_attendance", name: "Staff Attendance Ledger", formats: ["excel"] },
  { id: "inventory_consumption", name: "Inventory Consumption Report", formats: ["excel"] },
  { id: "profit_loss", name: "Profit & Loss Summary (P&L)", formats: ["excel"] },
  { id: "nepal_vat", name: "Nepal Tax / VAT Sales Register", formats: ["pdf"] },
  { id: "payroll", name: "Payroll Settlement Summary", formats: ["excel"] },
];

export default function ReportsConsole() {
  const t = useTranslations("Analytics");
  const tData = useTransData();
  const locale = useLocale();

  const getReportName = (id: string, currentLocale: string) => {
    const dictionary: Record<string, Record<string, string>> = {
      en: {
        daily_revenue: "Daily Revenue Report",
        occupancy: "Occupancy Analysis Report",
        guest_ledger: "Active Guest Ledger Folio",
        staff_attendance: "Staff Attendance Ledger",
        inventory_consumption: "Inventory Consumption Report",
        profit_loss: "Profit & Loss Summary (P&L)",
        nepal_vat: "Nepal Tax / VAT Sales Register",
        payroll: "Payroll Settlement Summary",
      },
      ne: {
        daily_revenue: "दैनिक राजस्व रिपोर्ट",
        occupancy: "कोठा ओगटिएको विश्लेषण रिपोर्ट",
        guest_ledger: "सक्रिय पाहुना लेजर फोलियो",
        staff_attendance: "कर्मचारी उपस्थिति लेजर",
        inventory_consumption: "इन्भेन्टरी खपत रिपोर्ट",
        profit_loss: "नाफा र नोक्सान सारांश (P&L)",
        nepal_vat: "नेपाल कर / भ्याट बिक्री खाता",
        payroll: "पेरोल फर्छ्यौट सारांश",
      }
    };
    return dictionary[currentLocale]?.[id] || dictionary["en"]?.[id] || id;
  };

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [reportType, setReportType] = useState("daily_revenue");
  const [format, setFormat] = useState<"pdf" | "excel">("pdf");

  const [exportsList, setExportsList] = useState<ReportExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Set default format based on chosen report type formats list
  useEffect(() => {
    const rep = REPORTS_LIST.find((r) => r.id === reportType);
    if (rep && !rep.formats.includes(format)) {
      setFormat(rep.formats[0] as "pdf" | "excel");
    }
  }, [reportType]);

  const ensureArray = <T,>(data: any): T[] => {
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && Array.isArray(data.results)) {
      return data.results;
    }
    return [];
  };

  const fetchExports = async () => {
    try {
      const res = await analyticsApi.listReports();
      setExportsList(ensureArray<ReportExport>(res.data));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExports();
    
    // Set up active poller for pending exports
    const interval = setInterval(() => {
      const hasPending = exportsList.some((e) => e.status === "pending");
      if (hasPending) {
        fetchExports();
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [exportsList]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      await analyticsApi.generateReport({
        report_type: reportType,
        format,
        start_date: startDate,
        end_date: endDate,
      });
      fetchExports();
    } catch (err) {
      console.error(err);
      alert(locale === "ne" ? "पृष्ठभूमि रिपोर्ट कार्य सुरु गर्न असफल भयो।" : "Failed to initiate background report task.");
    } finally {
      setGenerating(false);
    }
  };

  const selectedReport = REPORTS_LIST.find((r) => r.id === reportType);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <FileText className="h-6 w-6 text-cyan-400" />
          {t("reports_title")}
        </h1>
        <p className="text-slate-400 text-xs mt-0.5">
          {t("reports_subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generator Console Form */}
        <Card className="bg-slate-900/60 border-slate-800 lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-white">{locale === "ne" ? "रिपोर्ट निर्माण कार्यक्षेत्र" : "Generate Report Workspace"}</CardTitle>
            <CardDescription className="text-[10px] text-slate-400">
              {locale === "ne" ? "प्यारामिटरहरू कन्फिगर गर्नुहोस् र सुरक्षित PDF वा स्प्रेडसिट कम्पाइलर सक्रिय गर्नुहोस्।" : "Configure parameters and trigger a secure PDF or spreadsheet compiler."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">{locale === "ne" ? "रिपोर्ट प्रकार" : "Report Ledger Type"}</Label>
                <Select value={reportType} onValueChange={(val) => val && setReportType(val)}>
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-white rounded-lg text-xs">
                    <SelectValue placeholder={locale === "ne" ? "रिपोर्ट प्रकार छनौट गर्नुहोस्" : "Select report type"}>
                      {(value) => value ? getReportName(value, locale) : (locale === "ne" ? "रिपोर्ट प्रकार छनौट गर्नुहोस्" : "Select report type")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-slate-900 text-white">
                    {REPORTS_LIST.map((r) => (
                      <SelectItem key={r.id} value={r.id} className="text-xs focus:bg-cyan-500 focus:text-slate-950">
                        {getReportName(r.id, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400">{locale === "ne" ? "सुरु मिति" : "Start Date"}</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-white rounded-lg text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400">{locale === "ne" ? "अन्तिम मिति" : "End Date"}</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-white rounded-lg text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">{locale === "ne" ? "निर्यात ढाँचा" : "Export Format"}</Label>
                <Select
                  value={format}
                  onValueChange={(val) => (val === "pdf" || val === "excel") && setFormat(val)}
                  disabled={!selectedReport}
                >
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-white rounded-lg text-xs">
                    <SelectValue>
                      {(value) => {
                        if (value === "pdf") return locale === "ne" ? "PDF कागजात (.pdf)" : "PDF Document (.pdf)";
                        if (value === "excel") return locale === "ne" ? "स्प्रेडसिट (.xlsx)" : "Spreadsheet (.xlsx)";
                        return value || "";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-slate-900 text-white">
                    {selectedReport?.formats.includes("pdf") && (
                      <SelectItem value="pdf" className="text-xs focus:bg-cyan-500 focus:text-slate-950">{locale === "ne" ? "PDF कागजात (.pdf)" : "PDF Document (.pdf)"}</SelectItem>
                    )}
                    {selectedReport?.formats.includes("excel") && (
                      <SelectItem value="excel" className="text-xs focus:bg-cyan-500 focus:text-slate-950">{locale === "ne" ? "स्प्रेडसिट (.xlsx)" : "Spreadsheet (.xlsx)"}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                disabled={generating}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold text-xs py-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    {locale === "ne" ? "कम्पाइलर सुरु हुँदैछ..." : "Initializing Compiler..."}
                  </>
                ) : (
                  locale === "ne" ? "कागजात कम्पाइल गर्नुहोस्" : "Compile Document"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Audit / Export Logs Table */}
        <Card className="bg-slate-900/60 border-slate-800 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <div>
              <CardTitle className="text-sm font-semibold text-white">{locale === "ne" ? "उत्पादित कागजात सूची" : "Generated Documents Cache"}</CardTitle>
              <CardDescription className="text-[10px] text-slate-400">
                {locale === "ne" ? "पृष्ठभूमिमा चलिरहेको फाइल कम्पाइलर स्थिति। फाइल लिङ्कहरू ७ दिनमा समाप्त हुनेछन्।" : "Polls background Celery files compiler status. Direct links expire in 7 days."}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchExports} className="border-slate-800 text-slate-400 hover:text-white">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-20 flex items-center justify-center text-slate-400 text-xs">{locale === "ne" ? "रेकर्डहरू लोड हुँदैछ..." : "Loading logs..."}</div>
            ) : exportsList.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs text-center">
                <FileText className="h-8 w-8 opacity-20" />
                <span>{locale === "ne" ? "यो विधाका लागि अहिलेसम्म कुनै कागजात निर्यात गरिएको छैन।" : "No exported documents registered for this schema yet."}</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                      <th className="py-3 px-2">{locale === "ne" ? "सिर्जना गरिएको" : "Created"}</th>
                      <th className="py-3 px-2">{locale === "ne" ? "रिपोर्ट विवरण" : "Report Details"}</th>
                      <th className="py-3 px-2">{locale === "ne" ? "ढाँचा" : "Format"}</th>
                      <th className="py-3 px-2">{locale === "ne" ? "अवधि" : "Range"}</th>
                      <th className="py-3 px-2 text-center">{locale === "ne" ? "स्थिति" : "Status"}</th>
                      <th className="py-3 px-2 text-right">{locale === "ne" ? "कार्यहरू" : "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exportsList.map((exp) => {
                      const dateStr = new Date(exp.created_at).toLocaleDateString(locale === "ne" ? "ne-NP" : undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      return (
                        <tr key={exp.id} className="border-b border-slate-900/60 hover:bg-slate-950/20">
                          <td className="py-3 px-2 text-slate-400 font-medium">{dateStr}</td>
                          <td className="py-3 px-2">
                            <span className="font-semibold text-white text-[12px]">{getReportName(exp.report_type, locale)}</span>
                          </td>
                          <td className="py-3 px-2 font-mono">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              exp.format === "pdf" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            }`}>
                              {exp.format}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-slate-400 font-mono text-[10.5px]">
                            {exp.start_date} → {exp.end_date}
                          </td>
                          <td className="py-3 px-2 text-center">
                            {exp.status === "pending" ? (
                              <span className="inline-flex items-center gap-1.5 text-cyan-400 font-semibold bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded text-[10px]">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                {locale === "ne" ? "प्रशोधन हुँदै" : "Processing"}
                              </span>
                            ) : exp.status === "completed" ? (
                              <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px]">
                                <CheckCircle2 className="h-3 w-3" />
                                {locale === "ne" ? "तयार छ" : "Ready"}
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1.5 text-rose-400 font-semibold bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded text-[10px] cursor-help"
                                title={exp.error_message || "Unknown compile exception"}
                              >
                                <AlertCircle className="h-3 w-3" />
                                {locale === "ne" ? "असफल" : "Failed"}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-right">
                            {exp.status === "completed" && exp.file_path ? (
                              <a
                                href={exp.file_path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center h-7 px-3 rounded-md border border-slate-800 bg-transparent text-cyan-400 hover:text-cyan-300 hover:bg-slate-900 font-semibold text-[11px] transition-colors"
                              >
                                <Download className="h-3 w-3 mr-1" />
                                {locale === "ne" ? "फाइल डाउनलोड" : "Get File"}
                              </a>
                            ) : (
                              <Button size="sm" variant="outline" className="h-7 border-slate-800 text-slate-600 cursor-not-allowed" disabled>
                                <Download className="h-3 w-3 mr-1" />
                                {locale === "ne" ? "अनुपलब्ध" : "Unavailable"}
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
