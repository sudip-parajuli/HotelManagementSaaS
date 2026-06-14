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

export default function RoomTypesPage() {
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
      toast.error("Failed to fetch room types catalog.");
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
    if (!confirm(`Are you sure you want to delete the room type "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await roomsApi.deleteRoomType(id);
      toast.success(`Room type "${name}" deleted successfully.`);
      fetchTypes();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to delete room type.");
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Navigation & Header */}
      <div className="flex items-center gap-3 text-slate-400">
        <Link href="/rooms">
          <Button variant="ghost" size="sm" className="h-8 gap-1 hover:text-white px-2">
            <ArrowLeft className="h-4 w-4" />
            Back to grid
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white tracking-tight">Room Classes</h1>
          <p className="text-slate-400 text-sm">
            Configure hotel room classifications, occupancies, and rates.
          </p>
        </div>

        <Button
          onClick={handleAddClick}
          className="bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold gap-2 shadow-lg shadow-cyan-500/20"
        >
          <Plus className="h-4 w-4" />
          Add Room Class
        </Button>
      </div>

      {/* Main Grid display */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
          <p className="text-sm text-slate-400 font-medium">Loading room types catalog...</p>
        </div>
      ) : roomTypes.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-2xl border border-slate-900 bg-slate-950/40 text-slate-400 space-y-4">
          <div className="p-4 rounded-full bg-slate-900 text-slate-500">
            <Bed className="h-10 w-10" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="font-semibold text-white">No room classes created</h3>
            <p className="text-sm">Create room types to set up prices and define layouts.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roomTypes.map((type) => (
            <Card
              key={type.id}
              className="bg-slate-900/40 border-slate-800 hover:border-slate-700/80 transition-all duration-300 flex flex-col group overflow-hidden"
            >
              <CardHeader className="relative pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">
                      {type.name}
                    </CardTitle>
                    <CardDescription className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                      {type.slug}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="py-0.5 px-2 bg-slate-950/80 text-slate-300 border-slate-800">
                    <Users className="h-3 w-3 mr-1 text-cyan-400" />
                    Max: {type.max_occupancy}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-4">
                <p className="text-xs text-slate-400 line-clamp-2 h-8">
                  {type.description || "No description provided."}
                </p>

                {/* Price block breakdown */}
                <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-900 bg-slate-950/40 p-3.5">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Base Price</span>
                    <span className="text-sm font-extrabold text-white">
                      Rs. {Number(type.base_price_per_night).toLocaleString()}
                    </span>
                  </div>
                  {type.weekend_price && (
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Weekend Rate</span>
                      <span className="text-sm font-extrabold text-white">
                        Rs. {Number(type.weekend_price).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="space-y-0.5 col-span-2 pt-2 border-t border-slate-900">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Extra Person Charge</span>
                    <span className="text-xs font-semibold text-slate-300">
                      Rs. {Number(type.extra_person_charge || 0).toLocaleString()} / guest
                    </span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="border-t border-slate-900 bg-slate-900/10 p-4 flex gap-2 justify-end">
                <Button
                  onClick={() => handleEditClick(type)}
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-slate-400 hover:text-white"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  onClick={() => handleDeleteClick(type.id, type.name)}
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-slate-500 hover:text-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
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
