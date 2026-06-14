import React from "react";
import { Leaf, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MenuItem } from "@/lib/types";

interface MenuItemCardProps {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
}

export function MenuItemCard({ item, onAdd }: MenuItemCardProps) {
  return (
    <Card className="group overflow-hidden bg-slate-900/60 border-slate-800 backdrop-blur-md hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/5 transition-all duration-300 flex flex-col h-full">
      <CardContent className="p-4 flex-1 flex flex-col">
        {/* Title & Badge indicators */}
        <div className="flex justify-between items-start gap-2 mb-1.5">
          <h3 className="font-semibold text-slate-100 group-hover:text-cyan-400 transition-colors line-clamp-1">
            {item.name}
          </h3>
          <div className="flex gap-1 flex-shrink-0 mt-0.5">
            {item.is_vegetarian && (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-1.5 py-0 hover:bg-emerald-500/20" variant="outline">
                <Leaf className="h-3 w-3 mr-0.5 fill-current" />
                Veg
              </Badge>
            )}
            {item.is_vegan && (
              <Badge className="bg-green-500/10 text-green-400 border-green-500/20 px-1.5 py-0 hover:bg-green-500/20" variant="outline">
                Vegan
              </Badge>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-400 line-clamp-2 mb-3 flex-1">
          {item.description || "No description provided."}
        </p>

        {/* Prep time & Allergens */}
        <div className="space-y-2 mb-1">
          <div className="flex items-center text-xs text-slate-400 gap-1.5">
            <Clock className="h-3.5 w-3.5 text-cyan-500" />
            <span>{item.prep_time_minutes} mins prep</span>
          </div>

          {item.contains_allergens && item.contains_allergens.length > 0 && (
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
              <div className="flex flex-wrap gap-1">
                {item.contains_allergens.map((allergen) => (
                  <span
                    key={allergen}
                    className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/15 font-medium"
                  >
                    {allergen}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 border-t border-slate-900 bg-slate-950/40 flex items-center justify-between gap-4">
        <div>
          <span className="text-xs text-slate-500 block">Price</span>
          <span className="font-bold text-slate-100">
            Rs. {parseFloat(item.price).toFixed(2)}
          </span>
        </div>

        <Button
          onClick={() => onAdd(item)}
          disabled={!item.is_available}
          size="sm"
          className="bg-cyan-600 text-white hover:bg-cyan-500 transition-all shadow-md shadow-cyan-600/20"
        >
          {item.is_available ? "Add" : "Sold Out"}
        </Button>
      </CardFooter>
    </Card>
  );
}
