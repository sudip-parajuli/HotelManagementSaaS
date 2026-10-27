"use client";

import React, { useEffect, useState } from "react";
import { Plus, Users, Bed, DollarSign, Edit, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { roomsApi } from "@/lib/api/rooms";
import { RoomTypeForm } from "@/components/modules/rooms/RoomTypeForm";
import type { RoomType } from "@/lib/types";
import { useTranslations, useLocale } from "next-intl";
import { useTransData } from "@/lib/hooks/useTransData";

export default function RoomTypesPage() {
  const t = useTranslations("Rooms");
  const tCommon = useTranslations("Common");
  const tData = useTransData();
  const locale = useLocale();

  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog Controls
  const [selectedType, setSelectedType] = useState<RoomType | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchTypes = async () => {
    setIsLoading(true);
    try {
      const res = await roomsApi.listRoomTypes();
      setRoomTypes(res.data.results || []);
    } catch (err) {
      console.error(err);
      toast.error(locale === "ne" ? "कोठा क्याटलग लोड गर्न असफल भयो।" : "Failed to fetch room types catalog.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const handleEditClick = (type: RoomType) => {
    setSelectedType(type);
    setIsDialogOpen(true);
  };

  const handleAddClick = () => {
    setSelectedType(null);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = async (id: number, name: string) => {
    const confirmationText = locale === "ne"
      ? `के तपाईं निश्चित रूपमा कोठा प्रकार "${tData(name)}" हटाउन चाहनुहुन्छ? यो कार्य फिर्ता गर्न सकिँदैन।`
      : `Are you sure you want to delete the room type "${name}"? This action cannot be undone.`;

    if (!confirm(confirmationText)) {
      return;
    }
    try {
      await roomsApi.deleteRoomType(id);
      toast.success(locale === "ne" ? `कोठा प्रकार "${tData(name)}" सफलतापूर्वक हटाइयो।` : `Room type "${name}" deleted successfully.`);
      fetchTypes();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || (locale === "ne" ? "कोठा प्रकार हटाउन असफल भयो।" : "Failed to delete room type."));
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Navigation & Header */}
      <div className="flex items-center gap-3 text-workspace-400">
        <Link href="/rooms">
          <Button variant="ghost" size="sm" className="h-8 gap-1 hover:text-white px-2">
            <ArrowLeft className="h-4 w-4" />
            {t("back_to_grid") || "Back to grid"}
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{t("room_classes_title")}</h1>
          <p className="text-workspace-400 text-sm">
            {t("room_classes_subtitle")}
          </p>
        </div>

        <Button
          onClick={handleAddClick}
          className="bg-gradient-to-tr from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-semibold gap-2 shadow-lg shadow-brand-500/20"
        >
          <Plus className="h-4 w-4" />
          {t("add_room_class")}
        </Button>
      </div>

      {/* Main Grid display */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-brand-400" />
          <p className="text-sm text-workspace-400 font-medium">{t("loading_catalog")}</p>
        </div>
      ) : roomTypes.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-2xl border border-workspace-900 bg-workspace-950/40 text-workspace-400 space-y-4">
          <div className="p-4 rounded-full bg-workspace-900 text-workspace-500">
            <Bed className="h-10 w-10" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="font-semibold text-foreground">{t("no_classes")}</h3>
            <p className="text-sm">{t("no_classes_desc")}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roomTypes.map((type) => (
            <Card
              key={type.id}
              className="bg-workspace-900/40 border-workspace-800 hover:border-workspace-700/80 transition-all duration-300 flex flex-col group overflow-hidden"
            >
              <CardHeader className="relative pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-bold text-foreground group-hover:text-brand-400 transition-colors">
                      {tData(type.name)}
                    </CardTitle>
                    <CardDescription className="text-workspace-500 text-xs font-semibold uppercase tracking-wider">
                      {type.slug}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="py-0.5 px-2 bg-workspace-950/80 text-workspace-300 border-workspace-800">
                    <Users className="h-3 w-3 mr-1 text-brand-400" />
                    {t("max_guests", { count: type.max_occupancy })}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-4">
                <p className="text-xs text-workspace-400 line-clamp-2 h-8">
                  {type.description || (locale === "ne" ? "कुनै विवरण उपलब्ध छैन।" : "No description provided.")}
                </p>

                {/* Price block breakdown */}
                <div className="grid grid-cols-2 gap-4 rounded-xl border border-workspace-900 bg-workspace-950/40 p-3.5">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-workspace-500 uppercase tracking-wider block">{t("base_price")}</span>
                    <span className="text-sm font-extrabold text-foreground">
                      Rs. {Number(type.base_price_per_night).toLocaleString()}
                    </span>
                  </div>
                  {type.weekend_price && (
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-workspace-500 uppercase tracking-wider block">{t("weekend_rate")}</span>
                      <span className="text-sm font-extrabold text-foreground">
                        Rs. {Number(type.weekend_price).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="space-y-0.5 col-span-2 pt-2 border-t border-workspace-900">
                    <span className="text-[10px] font-bold text-workspace-500 uppercase tracking-wider block">{t("extra_person_charge")}</span>
                    <span className="text-xs font-semibold text-workspace-300">
                      Rs. {Number(type.extra_person_charge || 0).toLocaleString()} / {locale === "ne" ? "पाहुना" : "guest"}
                    </span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="border-t border-workspace-900 bg-workspace-900/10 p-4 flex gap-2 justify-end">
                <Button
                  onClick={() => handleEditClick(type)}
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-workspace-400 hover:text-white"
                >
                  <Edit className="h-3.5 w-3.5" />
                  {tCommon("edit")}
                </Button>
                <Button
                  onClick={() => handleDeleteClick(type.id, type.name)}
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-workspace-500 hover:text-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {tCommon("delete")}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <RoomTypeForm
        roomType={selectedType}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={fetchTypes}
      />
    </div>
  );
}
