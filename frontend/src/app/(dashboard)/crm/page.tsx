"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { crmApi } from "@/lib/api/crm";
import { Search, Plus, Filter, Tag, Send, Activity, User, Phone, MapPin, Mail, ClipboardList, Loader2, Trash2 } from "lucide-react";
import type { GuestTag, Campaign, GuestActivity } from "@/lib/types";
import { useTranslations, useLocale } from "next-intl";
import { useTransData } from "@/lib/hooks/useTransData";

export default function CRMPage() {
  const [activeTab, setActiveTab] = useState<"guests" | "tags" | "campaigns">("guests");
  const [guests, setGuests] = useState<any[]>([]);
  const [tags, setTags] = useState<GuestTag[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activities, setActivities] = useState<GuestActivity[]>([]);
  
  const t = useTranslations("CRM");
  const tData = useTransData();
  const locale = useLocale();

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("all");

  // Selected Guest detail drawer
  const [selectedGuest, setSelectedGuest] = useState<any | null>(null);

  // New Tag form
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3182ce");

  // New Campaign form
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [campName, setCampName] = useState("");
  const [campType, setCampType] = useState<"birthday" | "anniversary" | "winback" | "promotion">("promotion");
  const [campMessage, setCampMessage] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tagRes, campRes] = await Promise.all([
        crmApi.listTags(),
        crmApi.listCampaigns(),
      ]);
      setTags(tagRes.data.results);
      setCampaigns(campRes.data.results);

      if (activeTab === "guests") {
        const params: Record<string, any> = {};
        if (search) params.search = search;
        if (tagFilter !== "all") params.tags = tagFilter;
        const guestRes = await crmApi.listGuests(params);
        setGuests(guestRes.data.results);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, search, tagFilter]);

  // Load guest activities
  const loadGuestActivities = async (guest: any) => {
    setSelectedGuest(guest);
    try {
      const res = await crmApi.listActivities({ guest: guest.id });
      setActivities(res.data.results);
    } catch (err) {
      console.error(err);
    }
  };

  // Add Tag to guest
  const handleAddTagToGuest = async (tagId: number) => {
    if (!selectedGuest) return;
    try {
      const updated = await crmApi.tagGuest(selectedGuest.id, tagId);
      loadGuestActivities(updated.data);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Remove Tag from guest
  const handleRemoveTagFromGuest = async (tagId: number) => {
    if (!selectedGuest) return;
    try {
      const updated = await crmApi.untagGuest(selectedGuest.id, tagId);
      loadGuestActivities(updated.data);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Create Tag
  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName) return;
    try {
      await crmApi.createTag({ name: newTagName, color: newTagColor });
      setNewTagName("");
      setIsTagModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to create tag. Check if duplicate name exists.");
    }
  };

  // Delete Tag
  const handleDeleteTag = async (id: number) => {
    const confirmMsg = locale === "ne" ? "के तपाईं यो सेगमेन्ट ट्याग हटाउन चाहनुहुन्छ?" : "Are you sure you want to delete this segment tag?";
    if (!confirm(confirmMsg)) return;
    try {
      await crmApi.deleteTag(id);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Create Campaign
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campName || !campMessage) return;
    try {
      await crmApi.createCampaign({
        name: campName,
        campaign_type: campType,
        message_template: campMessage,
        status: "draft",
      });
      setCampName("");
      setCampMessage("");
      setIsCampaignModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Dispatch Campaign
  const handleDispatchCampaign = async (id: number) => {
    const confirmMsg = locale === "ne" ? "के तपाईं लक्षित ग्राहकहरूलाई यो SMS प्रसारण पठाउन चाहनुहुन्छ?" : "Confirm SMS broadcast dispatch to targeted customer list?";
    if (!confirm(confirmMsg)) return;
    setLoading(true);
    try {
      const res = await crmApi.dispatchCampaign(id);
      alert(res.data.message);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("SMS dispatch failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white tracking-tight">{t("title")}</h1>
          <p className="text-slate-400 text-sm">{t("subtitle")}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        {(["guests", "tags", "campaigns"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setSelectedGuest(null);
            }}
            className={`py-3 px-6 text-sm font-semibold border-b-2 transition-all capitalize ${
              activeTab === tab
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            {tab === "guests" ? t("guests") : tab === "tags" ? (locale === "ne" ? "ट्यागहरू" : "Tags") : (locale === "ne" ? "SMS अभियानहरू" : "SMS Campaigns")}
          </button>
        ))}
      </div>

      {activeTab === "guests" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Guests List */}
          <Card className="bg-slate-900/60 border-slate-800 lg:col-span-2">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-sm font-semibold text-white">{t("guests")}</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                      placeholder={t("search_guest")}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 bg-slate-950 border-slate-800 text-white w-52 text-xs h-9 rounded-xl"
                    />
                  </div>
                  <Select value={tagFilter} onValueChange={(val) => setTagFilter(val || "all")}>
                    <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-300 w-36 text-xs h-9 rounded-xl">
                      <Filter className="h-3.5 w-3.5 text-slate-500 mr-2" />
                      <SelectValue placeholder={locale === "ne" ? "फिल्टर ट्याग" : "Filter Tag"}>
                        {(value) => {
                          if (value === "all") return locale === "ne" ? "सबै ट्यागहरू" : "All Tags";
                          const tg = tags.find((t) => t.id.toString() === value);
                          return tg ? tg.name : value;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 border-slate-900 text-white">
                      <SelectItem value="all">{locale === "ne" ? "सबै ट्यागहरू" : "All Tags"}</SelectItem>
                      {tags.map((tg) => (
                        <SelectItem key={tg.id} value={tg.id.toString()}>
                          {tg.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-slate-300 text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-left font-medium tracking-wider">
                    <tr>
                      <th className="p-4">{locale === "ne" ? "पाहुना प्रोफाइल" : "Guest Profile"}</th>
                      <th className="p-4 text-center">{locale === "ne" ? "बसाई" : "Stays"}</th>
                      <th className="p-4 text-right">{locale === "ne" ? "कुल खर्च" : "Total Spend"}</th>
                      <th className="p-4 text-right">{locale === "ne" ? "औसत बसाई" : "Avg Stay"}</th>
                      <th className="p-4">{locale === "ne" ? "लोयल्टी स्तर" : "Loyalty Tier"}</th>
                      <th className="p-4">{locale === "ne" ? "ट्यागहरू" : "Tags"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="text-center p-8 text-slate-500">
                          {locale === "ne" ? "पाहुना विवरणहरू लोड हुँदैछ..." : "Loading guests portfolios..."}
                        </td>
                      </tr>
                    ) : guests.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center p-8 text-slate-500">
                          {locale === "ne" ? "कुनै पाहुना फेला परेन।" : "No guest profiles matched search criteria."}
                        </td>
                      </tr>
                    ) : (
                      guests.map((g) => (
                        <tr
                          key={g.id}
                          onClick={() => loadGuestActivities(g)}
                          className={`hover:bg-slate-900/40 transition-colors cursor-pointer ${
                            selectedGuest?.id === g.id ? "bg-slate-900/70 border-l-2 border-cyan-500" : ""
                          }`}
                        >
                          <td className="p-4">
                            <div>
                              <p className="font-semibold text-slate-200">{g.full_name}</p>
                              <p className="text-[10px] text-slate-500">{g.phone}</p>
                            </div>
                          </td>
                          <td className="p-4 text-center font-medium text-slate-200">{g.total_stays}</td>
                          <td className="p-4 text-right font-mono font-semibold text-white">
                            {locale === "ne" ? "रु " : "Rs. "}
                            {Number(g.total_spend).toLocaleString()}
                          </td>
                          <td className="p-4 text-right font-medium text-slate-200">
                            {g.average_stay_nights} {locale === "ne" ? "रात" : "nights"}
                          </td>
                          <td className="p-4">
                            <Badge className="bg-purple-950/40 text-purple-400 border-purple-500/20 border text-[10px] font-semibold">
                              {tData(g.loyalty_tier)} ({g.loyalty_points} pts)
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1">
                              {g.tags?.map((tg: any) => (
                                <span
                                  key={tg.id}
                                  className="px-2 py-0.5 rounded-full text-[9px] font-semibold text-slate-950"
                                  style={{ backgroundColor: tg.color }}
                                >
                                  {tg.name}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Guest Detail Drawer */}
          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader className="border-b border-slate-850 pb-4">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <User className="h-4 w-4 text-cyan-400" />
                {locale === "ne" ? "पाहुना पोर्टफोलियो सारांश" : "Guest Portfolio Summary"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-5">
              {selectedGuest ? (
                <>
                  {/* Basic Profile */}
                  <div className="space-y-2.5 text-xs">
                    <h3 className="font-semibold text-slate-200 text-sm">{selectedGuest.full_name}</h3>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Phone className="h-3.5 w-3.5 text-slate-500" />
                      <span>{selectedGuest.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Mail className="h-3.5 w-3.5 text-slate-500" />
                      <span>{selectedGuest.email || (locale === "ne" ? "इमेल छैन" : "No Email")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <MapPin className="h-3.5 w-3.5 text-slate-500" />
                      <span>{tData(selectedGuest.nationality || "Nepalese")}</span>
                    </div>
                  </div>

                  {/* Segment Tags */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">
                      {locale === "ne" ? "ग्राहक ट्यागहरू" : "Customer Tags"}
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {selectedGuest.tags?.map((tg: any) => (
                        <Badge
                          key={tg.id}
                          onClick={() => handleRemoveTagFromGuest(tg.id)}
                          className="hover:bg-rose-500 hover:text-slate-950 transition-colors cursor-pointer text-[9px]"
                          style={{ backgroundColor: tg.color, color: "#000" }}
                        >
                          {tg.name} x
                        </Badge>
                      ))}
                      {tags.filter(tg => !selectedGuest.tags?.some((gt: any) => gt.id === tg.id)).map((tg) => (
                        <button
                          key={tg.id}
                          onClick={() => handleAddTagToGuest(tg.id)}
                          className="px-2.5 py-0.5 rounded-full border border-slate-700 hover:border-cyan-500 text-[9px] hover:text-cyan-400 text-slate-400 transition-all"
                        >
                          + {tg.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Activity History Logs */}
                  <div className="space-y-3">
                    <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide flex items-center gap-1">
                      <Activity className="h-3.5 w-3.5 text-cyan-400" />
                      {locale === "ne" ? "पाहुना गतिविधि लग" : "Guest Activity Ledger"}
                    </label>
                    <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                      {activities.length === 0 ? (
                        <p className="text-[10px] text-slate-500 text-center py-4">
                          {locale === "ne" ? "गतिविधि रेकर्डहरू छैनन्।" : "No logged history for guest."}
                        </p>
                      ) : (
                        activities.map((act) => (
                          <div key={act.id} className="bg-slate-950 p-2.5 rounded-lg border border-slate-900 space-y-1 text-[11px]">
                            <div className="flex justify-between font-semibold text-slate-300">
                              <span className="text-cyan-400 capitalize">{tData(act.activity_type_display)}</span>
                              <span className="text-[9px] text-slate-600 font-mono">
                                {new Date(act.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-slate-400 leading-relaxed">{act.description}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-16 text-slate-500 flex flex-col items-center gap-2">
                  <ClipboardList className="h-8 w-8 text-slate-600" />
                  <p className="text-xs">
                    {locale === "ne" 
                      ? "पाहुनाको ट्याग र गतिविधि लग हेर्नका लागि सूचीबाट छनौट गर्नुहोस्।" 
                      : "Select a guest from the portfolio grid to view active tags and logs history."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "tags" && (
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="flex flex-row justify-between items-center pb-4 border-b border-slate-855">
            <div>
              <CardTitle className="text-sm font-semibold text-white">{locale === "ne" ? "सेगमेन्ट ट्यागहरू" : "Segment Tags"}</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                {locale === "ne" 
                  ? "होटलमा पाहुनाहरूको वर्गीकरणका लागि सेगमेन्ट ट्यागहरू सिर्जना गर्नुहोस् (उदा. VIP पाहुना, कारपोरेट पाहुना)।" 
                  : "Create classification tags to label VIPs, blacklisted profiles, and corporate guest groups."}
              </CardDescription>
            </div>
            <Button onClick={() => setIsTagModalOpen(true)} className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold text-xs h-8 rounded-xl">
              <Plus className="h-3.5 w-3.5 mr-1" /> {locale === "ne" ? "ट्याग थप्नुहोस्" : "Create Tag"}
            </Button>
            <Dialog open={isTagModalOpen} onOpenChange={setIsTagModalOpen}>
              <DialogContent className="bg-slate-950 border-slate-900 text-white">
                <DialogHeader>
                  <DialogTitle className="text-white flex items-center gap-1.5">
                    <Tag className="h-5 w-5 text-cyan-400" />
                    {locale === "ne" ? "सेगमेन्ट ट्याग सिर्जना गर्नुहोस्" : "Add Segment Tag"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateTag} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400">{locale === "ne" ? "ट्याग नाम" : "Tag Name"}</label>
                    <Input
                      placeholder="e.g. VIP Member, Blacklist"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-white"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400">{locale === "ne" ? "रङ कोड (Hex Color)" : "Hex Color"}</label>
                    <Input
                      type="color"
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-white h-10 w-full"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold">
                    {locale === "ne" ? "ट्याग सुरक्षित गर्नुहोस्" : "Save Tag"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {tags.map((tg) => (
                <div key={tg.id} className="bg-slate-950 p-3 rounded-xl border border-slate-900 flex justify-between items-center group">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: tg.color }} />
                    <span className="text-xs font-semibold text-slate-200">{tg.name}</span>
                  </div>
                  <button onClick={() => handleDeleteTag(tg.id)} className="text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "campaigns" && (
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="flex flex-row justify-between items-center pb-4 border-b border-slate-855">
            <div>
              <CardTitle className="text-sm font-semibold text-white">
                {locale === "ne" ? "SMS अभियानहरू (SMS Campaigns)" : "SMS Broadcast Campaigns"}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                {locale === "ne" 
                  ? "नयाँ अफर वा अभियानहरू पाहुनाहरूका मोबाइलमा SparrowSMS मार्फत पठाउनुहोस्।" 
                  : "Dispatch targeted SMS promotions, greetings, and surveys via SparrowSMS."}
              </CardDescription>
            </div>
            <Button onClick={() => setIsCampaignModalOpen(true)} className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold text-xs h-8 rounded-xl">
              <Plus className="h-3.5 w-3.5 mr-1" /> {locale === "ne" ? "अभियान सिर्जना गर्नुहोस्" : "Create Campaign"}
            </Button>
            <Dialog open={isCampaignModalOpen} onOpenChange={setIsCampaignModalOpen}>
              <DialogContent className="bg-slate-950 border-slate-900 text-white">
                <DialogHeader>
                  <DialogTitle className="text-white flex items-center gap-1.5">
                    <Send className="h-5 w-5 text-cyan-400" />
                    {locale === "ne" ? "नयाँ SMS अभियान" : "New SMS Campaign"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateCampaign} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400">{locale === "ne" ? "अभियानको नाम" : "Campaign Name"}</label>
                    <Input
                      placeholder="e.g. Pokhara Monsoon Festival Offer"
                      value={campName}
                      onChange={(e) => setCampName(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-white"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400">{locale === "ne" ? "अभियान प्रकार" : "Campaign Type"}</label>
                    <Select value={campType} onValueChange={(val: any) => setCampType(val)}>
                      <SelectTrigger className="bg-slate-950 border-slate-800 text-white text-xs">
                        <SelectValue placeholder="Select Type">
                          {(value) => {
                            if (value === "birthday") return locale === "ne" ? "जन्मदिन अभियान" : "Birthday Campaign";
                            if (value === "anniversary") return locale === "ne" ? "वार्षिकोत्सव अभियान" : "Anniversary Campaign";
                            if (value === "winback") return locale === "ne" ? "पुनः आकर्षित अफर" : "Winback Offer";
                            if (value === "promotion") return locale === "ne" ? "सामान्य प्रवर्द्धन अफर" : "Generic Promotional Offer";
                            return value || "";
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-slate-950 border-slate-900 text-white">
                        <SelectItem value="birthday">Birthday Campaign</SelectItem>
                        <SelectItem value="anniversary">Anniversary Campaign</SelectItem>
                        <SelectItem value="winback">Winback Offer</SelectItem>
                        <SelectItem value="promotion">Generic Promotional Offer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400">{locale === "ne" ? "SMS सन्देश" : "SMS message template"}</label>
                    <Input
                      placeholder="e.g. Welcome back to Pokhara! Enjoy 20% off room charges using code COZY..."
                      value={campMessage}
                      onChange={(e) => setCampMessage(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-white"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold">
                    {locale === "ne" ? "अभियान सुरक्षित गर्नुहोस्" : "Create Campaign"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-slate-300 text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-left font-medium tracking-wider">
                  <tr>
                    <th className="p-4">{locale === "ne" ? "अभियानको नाम" : "Campaign Name"}</th>
                    <th className="p-4">{locale === "ne" ? "प्रकार" : "Type"}</th>
                    <th className="p-4">{locale === "ne" ? "सन्देश ढाँचा" : "Message Template"}</th>
                    <th className="p-4">{locale === "ne" ? "स्थिति" : "Status"}</th>
                    <th className="p-4 text-center">{locale === "ne" ? "कार्यहरू" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center p-8 text-slate-500">
                        {locale === "ne" ? "कुनै SMS अभियानहरू दर्ता छैनन्।" : "No SMS campaigns templates created."}
                      </td>
                    </tr>
                  ) : (
                    campaigns.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-4 font-semibold text-slate-200">{c.name}</td>
                        <td className="p-4 capitalize">{tData(c.campaign_type_display || c.campaign_type)}</td>
                        <td className="p-4 max-w-sm truncate text-slate-400">{c.message_template}</td>
                        <td className="p-4">
                          <Badge className={c.status === "sent" ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-500/10 text-slate-400"}>
                            {tData(c.status_display || c.status)}
                          </Badge>
                        </td>
                        <td className="p-4 text-center">
                          {c.status !== "sent" && (
                            <Button
                              onClick={() => handleDispatchCampaign(c.id)}
                              className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold text-[10px] px-3 py-1 h-7 rounded-lg"
                            >
                              <Send className="h-3 w-3 mr-1" /> {locale === "ne" ? "प्रसारण" : "Broadcast"}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

