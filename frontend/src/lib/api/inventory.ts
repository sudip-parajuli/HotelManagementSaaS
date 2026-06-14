import { apiClient } from "./client";
import type {
  Category,
  InventoryItem,
  Supplier,
  PurchaseOrder,
  StockMovement,
  Recipe,
} from "../types";

export interface CreateItemPayload {
  category_id: number;
  name: string;
  sku: string;
  unit: string;
  reorder_level: number;
  max_stock: number;
  cost_price: string;
  is_perishable: boolean;
  expiry_tracking: boolean;
}

export interface AdjustStockPayload {
  quantity: number;
  notes?: string;
  movement_type?: string;
}

export interface ReceivePOPayload {
  items: Array<{
    po_item_id?: number;
    item_id?: number;
    received_qty: number;
  }>;
}

export interface CreatePOPayload {
  supplier_id: number;
  expected_date?: string | null;
  notes?: string;
  items: Array<{
    item_id: number;
    quantity: number;
    unit_price: number;
  }>;
}

export const inventoryApi = {
  // Categories
  getCategories: () => apiClient.get<Category[]>("/inventory/categories/"),
  createCategory: (data: { name: string; parent_id?: number | null }) =>
    apiClient.post<Category>("/inventory/categories/", data),

  // Items
  getItems: (params?: { category?: number; search?: string }) =>
    apiClient.get<InventoryItem[]>("/inventory/items/", { params }),
  createItem: (data: CreateItemPayload) =>
    apiClient.post<InventoryItem>("/inventory/items/", data),
  updateItem: (itemId: number, data: Partial<CreateItemPayload>) =>
    apiClient.patch<InventoryItem>(`/inventory/items/${itemId}/`, data),
  adjustStock: (itemId: number, data: AdjustStockPayload) =>
    apiClient.post<InventoryItem>(`/inventory/items/${itemId}/adjust/`, data),

  // Suppliers
  getSuppliers: () => apiClient.get<Supplier[]>("/inventory/suppliers/"),
  createSupplier: (data: Omit<Supplier, "id">) =>
    apiClient.post<Supplier>("/inventory/suppliers/", data),

  // Purchase Orders
  getPOs: (params?: { supplier?: number; status?: string }) =>
    apiClient.get<PurchaseOrder[]>("/inventory/purchase-orders/", { params }),
  getPO: (poId: number) =>
    apiClient.get<PurchaseOrder>(`/inventory/purchase-orders/${poId}/`),
  createPO: (data: CreatePOPayload) =>
    apiClient.post<PurchaseOrder>("/inventory/purchase-orders/", data),
  receivePO: (poId: number, data: ReceivePOPayload) =>
    apiClient.post<PurchaseOrder>(`/inventory/purchase-orders/${poId}/receive/`, data),

  // Stock Movements
  getMovements: (params?: { item?: number; start_date?: string; end_date?: string }) =>
    apiClient.get<StockMovement[]>("/inventory/movements/", { params }),

  // Recipes
  getRecipes: (params?: { menu_item?: number }) =>
    apiClient.get<Recipe[]>("/inventory/recipes/", { params }),
  createRecipe: (data: { menu_item_id: number; ingredient_id: number; quantity_per_serving: number; unit: string }) =>
    apiClient.post<Recipe>("/inventory/recipes/", data),
};
