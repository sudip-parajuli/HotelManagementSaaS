import React, { useState, useMemo } from "react";
import { Search, UtensilsCrossed, Coffee, Pizza, Wine, IceCream, Salad, Check, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MenuItemCard } from "./MenuItemCard";
import type { MenuCategory, MenuItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useTranslations, useLocale } from "next-intl";
import { useTransData } from "@/lib/hooks/useTransData";

// Icon mapping dictionary
const iconMap: Record<string, React.ComponentType<any>> = {
  coffee: Coffee,
  pizza: Pizza,
  wine: Wine,
  icecream: IceCream,
  salad: Salad,
  drinks: Wine,
  dessert: IceCream,
  utensils: UtensilsCrossed,
};

interface MenuPanelProps {
  categories: MenuCategory[];
  onAddItem: (item: MenuItem) => void;
}

export function MenuPanel({ categories, onAddItem }: MenuPanelProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [vegOnly, setVegOnly] = useState(false);
  const [veganOnly, setVeganOnly] = useState(false);

  const t = useTranslations("POS");
  const tData = useTransData();
  const locale = useLocale();

  const categoriesList = useMemo<MenuCategory[]>(() => {
    if (Array.isArray(categories)) return categories;
    if (categories && typeof categories === "object" && Array.isArray((categories as any).results)) {
      return (categories as any).results;
    }
    return [];
  }, [categories]);

  // Flatten items for global search or filter by category
  const filteredItems = useMemo(() => {
    let items: MenuItem[] = [];

    if (selectedCategoryId === null) {
      // Show all items from active categories
      categoriesList.forEach((cat) => {
        if (cat.items) {
          items.push(...cat.items);
        }
      });
    } else {
      const selectedCat = categoriesList.find((cat) => cat.id === selectedCategoryId);
      if (selectedCat && selectedCat.items) {
        items.push(...selectedCat.items);
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q)
      );
    }

    // Filter by Veg/Vegan
    if (vegOnly) {
      items = items.filter((item) => item.is_vegetarian);
    }
    if (veganOnly) {
      items = items.filter((item) => item.is_vegan);
    }

    // De-duplicate items by ID
    const seen = new Set<number>();
    return items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [categoriesList, selectedCategoryId, searchQuery, vegOnly, veganOnly]);

  const renderCategoryIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName.toLowerCase()] || UtensilsCrossed;
    return <IconComponent className="h-4 w-4" />;
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Search & Filter Header */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-workspace-500" />
          <Input
            placeholder={t("search_placeholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-workspace-900/60 border-workspace-800 text-workspace-100 placeholder-workspace-500 focus-visible:ring-brand-500"
          />
        </div>

        {/* Diet Toggles */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVegOnly(!vegOnly)}
            className={cn(
              "border-workspace-800 transition-all font-medium text-xs",
              vegOnly
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-400"
                : "bg-workspace-900/60 text-workspace-400 hover:bg-slate-850 hover:text-workspace-100"
            )}
          >
            {vegOnly && <Check className="h-3 w-3 mr-1" />}
            {locale === "ne" ? "शाकाहारी मात्र" : "Veg Only"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVeganOnly(!veganOnly)}
            className={cn(
              "border-workspace-800 transition-all font-medium text-xs",
              veganOnly
                ? "bg-green-500/15 border-green-500/30 text-green-400 hover:bg-green-500/20 hover:text-green-400"
                : "bg-workspace-900/60 text-workspace-400 hover:bg-slate-850 hover:text-workspace-100"
            )}
          >
            {veganOnly && <Check className="h-3 w-3 mr-1" />}
            {locale === "ne" ? "विगन मात्र" : "Vegan"}
          </Button>
        </div>
      </div>

      {/* Category Pills Slider */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedCategoryId(null)}
          className={cn(
            "rounded-full px-4 border-workspace-800 font-medium text-xs whitespace-nowrap",
            selectedCategoryId === null
              ? "bg-brand-600 text-white hover:bg-brand-500 border-brand-600/30"
              : "bg-workspace-900/60 text-workspace-300 hover:bg-slate-850"
          )}
        >
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          {locale === "ne" ? "सबै सामग्री" : "All Items"}
        </Button>
        {categoriesList.map((cat) => (
          <Button
            key={cat.id}
            variant="outline"
            size="sm"
            onClick={() => setSelectedCategoryId(cat.id)}
            className={cn(
              "rounded-full px-4 border-workspace-800 font-medium text-xs whitespace-nowrap flex items-center gap-1.5",
              selectedCategoryId === cat.id
                ? "bg-brand-600 text-white hover:bg-brand-500 border-brand-600/30"
                : "bg-workspace-900/60 text-workspace-300 hover:bg-slate-850"
            )}
          >
            {renderCategoryIcon(cat.icon || "utensils")}
            {tData(cat.name)}
          </Button>
        ))}
      </div>

      {/* Items Grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 border border-dashed border-workspace-800 rounded-xl bg-workspace-950/20">
            <UtensilsCrossed className="h-10 w-10 text-workspace-600 mb-2" />
            <p className="text-sm text-workspace-400 font-medium">
              {locale === "ne" ? "कुनै मेनु सामग्री फेला परेन" : "No menu items found"}
            </p>
            <p className="text-xs text-workspace-500">
              {locale === "ne"
                ? "कृपया फिल्टर वा खोज क्वेरी समायोजन गर्ने प्रयास गर्नुहोस्।"
                : "Try adjusting your filters or search query."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <div key={item.id} className="h-full">
                <MenuItemCard item={item} onAdd={onAddItem} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
