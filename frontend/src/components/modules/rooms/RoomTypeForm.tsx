"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { roomsApi } from "@/lib/api/rooms";
import type { RoomType, Property } from "@/lib/types";

interface RoomTypeFormProps {
  roomType: RoomType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const roomTypeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  max_occupancy: z.number().min(1, "Occupancy must be at least 1"),
  base_price_per_night: z.string().min(1, "Base price is required"),
  weekend_price: z.string().optional(),
  extra_person_charge: z.string(),
  property: z.number().min(1, "Property is required"),
  amenity_ids: z.array(z.number()),
});

type RoomTypeFormValues = z.infer<typeof roomTypeSchema>;

export const RoomTypeForm: React.FC<RoomTypeFormProps> = ({
  roomType,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [amenities, setAmenities] = useState<any[]>([]);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<RoomTypeFormValues>({
    resolver: zodResolver(roomTypeSchema),
    defaultValues: {
      name: "",
      description: "",
      max_occupancy: 2,
      base_price_per_night: "",
      weekend_price: "",
      extra_person_charge: "0",
      property: 0,
      amenity_ids: [],
    },
  });

  const selectedAmenities = watch("amenity_ids") || [];

  // Load properties and amenities on mount/open
  useEffect(() => {
    if (!open) return;

    const loadMetadata = async () => {
      setIsLoadingMetadata(true);
      try {
        const [propsRes, amsRes] = await Promise.all([
          roomsApi.listProperties(),
          roomsApi.listAmenities(),
        ]);
        setProperties(propsRes.data.results || []);
        setAmenities(amsRes.data.results || []);

        // Default to first property if properties exist and creating new
        if (propsRes.data.results?.length > 0 && !roomType) {
          setValue("property", propsRes.data.results[0].id);
        }
      } catch (err) {
        console.error("Failed to load form metadata", err);
        toast.error("Failed to load properties or amenities details.");
      } finally {
        setIsLoadingMetadata(false);
      }
    };

    loadMetadata();
  }, [open, roomType, setValue]);

  // Sync form values if editing
  useEffect(() => {
    if (open && roomType) {
      reset({
        name: roomType.name,
        description: roomType.description || "",
        max_occupancy: roomType.max_occupancy,
        base_price_per_night: String(roomType.base_price_per_night),
        weekend_price: roomType.weekend_price ? String(roomType.weekend_price) : "",
        extra_person_charge: String(roomType.extra_person_charge || "0"),
        property: roomType.id, // Assuming it has a property FK in the full model, fallback to 1 if missing
        amenity_ids: [], // Amenities are handled below
      });
      // Wait for properties list to fill and check FK
      // Amenities setup
      if (roomType.id) {
        // Fetch full RoomType details to get loaded amenities
        roomsApi.getRoomType(roomType.id).then((res) => {
          if (res.data.property) {
            setValue("property", typeof res.data.property === "object" ? (res.data.property as any).id : res.data.property);
          }
          if (res.data.amenities) {
            const ids = (res.data.amenities as any[]).map((a) => a.id);
            setValue("amenity_ids", ids);
          }
        }).catch(() => {});
      }
    } else if (open && !roomType) {
      reset({
        name: "",
        description: "",
        max_occupancy: 2,
        base_price_per_night: "",
        weekend_price: "",
        extra_person_charge: "0",
        property: properties[0]?.id || 0,
        amenity_ids: [],
      });
    }
  }, [open, roomType, reset, properties, setValue]);

  const handleAmenityToggle = (id: number) => {
    if (selectedAmenities.includes(id)) {
      setValue(
        "amenity_ids",
        selectedAmenities.filter((x) => x !== id)
      );
    } else {
      setValue("amenity_ids", [...selectedAmenities, id]);
    }
  };

  const onSubmit = async (values: RoomTypeFormValues) => {
    setIsSubmitting(true);
    try {
      if (roomType) {
        await roomsApi.updateRoomType(roomType.id, values);
        toast.success("Room type updated successfully!");
      } else {
        await roomsApi.createRoomType(values);
        toast.success("Room type created successfully!");
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || "An error occurred while saving the room type.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-slate-950 border border-slate-900 text-slate-100 p-6 rounded-xl overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-bold text-white">
            {roomType ? "Edit Room Type" : "Add Room Type"}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            {roomType ? "Update rates and features of this room type." : "Create a new class of hotel/villa rooms."}
          </DialogDescription>
        </DialogHeader>

        {isLoadingMetadata ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            <p className="text-xs text-slate-400">Loading form configuration...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase">Property Selection</Label>
              <select
                {...register("property", { valueAsNumber: true })}
                className="w-full rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-100 p-2.5 outline-none focus:border-cyan-500 transition-colors"
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.city}
                  </option>
                ))}
              </select>
              {errors.property && <p className="text-xs text-rose-500">{errors.property.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label className="text-xs font-bold text-slate-400 uppercase">Name</Label>
                <Input
                  {...register("name")}
                  placeholder="e.g. Deluxe Double Room"
                  className="bg-slate-900 border-slate-800 text-slate-100"
                />
                {errors.name && <p className="text-xs text-rose-500">{errors.name.message}</p>}
              </div>

              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label className="text-xs font-bold text-slate-400 uppercase">Max Occupancy</Label>
                <Input
                  type="number"
                  {...register("max_occupancy", { valueAsNumber: true })}
                  className="bg-slate-900 border-slate-800 text-slate-100"
                />
                {errors.max_occupancy && <p className="text-xs text-rose-500">{errors.max_occupancy.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase">Description</Label>
              <Input
                {...register("description")}
                placeholder="Brief details about style, bed configuration, views..."
                className="bg-slate-900 border-slate-800 text-slate-100"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2 col-span-3 sm:col-span-1">
                <Label className="text-xs font-bold text-slate-400 uppercase">Base Price (NPR)</Label>
                <Input
                  {...register("base_price_per_night")}
                  placeholder="8500"
                  className="bg-slate-900 border-slate-800 text-slate-100"
                />
                {errors.base_price_per_night && (
                  <p className="text-xs text-rose-500">{errors.base_price_per_night.message}</p>
                )}
              </div>

              <div className="space-y-2 col-span-3 sm:col-span-1">
                <Label className="text-xs font-bold text-slate-400 uppercase">Weekend Price (NPR)</Label>
                <Input
                  {...register("weekend_price")}
                  placeholder="9500 (Optional)"
                  className="bg-slate-900 border-slate-800 text-slate-100"
                />
              </div>

              <div className="space-y-2 col-span-3 sm:col-span-1">
                <Label className="text-xs font-bold text-slate-400 uppercase">Extra Person (NPR)</Label>
                <Input
                  {...register("extra_person_charge")}
                  className="bg-slate-900 border-slate-800 text-slate-100"
                />
              </div>
            </div>

            {/* Amenities Checklist */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase">Select Amenities</Label>
              <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto p-3 bg-slate-900/40 rounded-lg border border-slate-900">
                {amenities.map((a) => (
                  <div key={a.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`am-${a.id}`}
                      checked={selectedAmenities.includes(a.id)}
                      onChange={() => handleAmenityToggle(a.id)}
                      className="h-4 w-4 rounded border-slate-800 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
                    />
                    <label htmlFor={`am-${a.id}`} className="text-xs text-slate-300 cursor-pointer">
                      {a.name}
                    </label>
                  </div>
                ))}
                {amenities.length === 0 && (
                  <p className="text-[11px] text-slate-600 col-span-2">No amenities available in catalog</p>
                )}
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-900 mt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold gap-2 shadow-lg shadow-cyan-500/20"
              >
                <Save className="h-4 w-4" />
                {isSubmitting ? "Saving Room Type..." : "Save Room Type"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
