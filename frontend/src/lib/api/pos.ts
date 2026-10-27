import { apiClient } from "./client";
import type { Order, CreateOrderPayload, KOT, OrderItem, OrderItemStatus } from "../types";

export interface AddOrderItemsPayload {
  items: Array<{
    menu_item_id: number;
    quantity: number;
    modifiers?: Record<string, any>;
    notes?: string;
  }>;
}

export interface PaymentPayload {
  payment_method: "cash" | "card" | "room" | "esewa" | "khalti" | "fonepay";
  reservation_id?: number; // required for room charge
}

export const posApi = {
  getActiveOrders: () => apiClient.get<Order[]>("/pos/orders/active/"),
  getOrders: () => apiClient.get<Order[]>("/pos/orders/"),
  getOrder: (id: number) => apiClient.get<Order>(`/pos/orders/${id}/`),
  createOrder: (data: CreateOrderPayload) => apiClient.post<Order>("/pos/orders/", data),
  addOrderItems: (orderId: number, data: AddOrderItemsPayload) =>
    apiClient.post<Order>(`/pos/orders/${orderId}/items/`, data),
  updateOrderItemStatus: (orderId: number, itemId: number, status: OrderItemStatus) =>
    apiClient.put<OrderItem>(`/pos/orders/${orderId}/update_item/`, { item_id: itemId, status }),
  payOrder: (orderId: number, data: PaymentPayload) =>
    apiClient.post<Order>(`/pos/orders/${orderId}/pay/`, data),
  voidOrder: (orderId: number, voidReason: string) =>
    apiClient.post<Order>(`/pos/orders/${orderId}/void/`, { void_reason: voidReason }),

  // KOT endpoints
  getKOTs: (station?: string) => {
    const params = station ? { station } : {};
    return apiClient.get<KOT[]>("/pos/kots/", { params });
  },
  completeKOT: (kotId: number) => apiClient.post<KOT>(`/pos/kots/${kotId}/done/`),
  acceptKOT: (kotId: number) => apiClient.post<KOT>(`/pos/kots/${kotId}/accept/`),
  servedKOT: (kotId: number) => apiClient.post<KOT>(`/pos/kots/${kotId}/served/`),

  // Sales insights endpoint
  getSalesInsights: (days?: number) =>
    apiClient.get<{
      period_days: number;
      since: string;
      revenue: { total: string; orders: number; avg_order_value: string };
      by_order_type: Array<{ order_type: string; count: number; revenue: string }>;
      top_items: Array<{ name: string; category: string; qty_sold: number; revenue: string }>;
      kds_performance: { avg_accept_time_seconds: number | null; avg_cook_time_seconds: number | null };
      discounts: { total_discounted: string };
    }>("/pos/insights/", { params: { days } }),
};
