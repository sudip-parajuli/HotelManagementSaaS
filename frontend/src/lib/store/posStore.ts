import { create } from "zustand";

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

interface POSState {
  cartItems: CartItem[];
  tableId: number | null;
  reservationId: number | null;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  setTable: (tableId: number | null) => void;
  setReservation: (reservationId: number | null) => void;
  totalAmount: () => number;
  totalItems: () => number;
}

export const usePOSStore = create<POSState>((set, get) => ({
  cartItems: [],
  tableId: null,
  reservationId: null,

  addItem: (item) =>
    set((state) => {
      const existing = state.cartItems.find((c) => c.id === item.id);
      if (existing) {
        return {
          cartItems: state.cartItems.map((c) =>
            c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
          ),
        };
      }
      return { cartItems: [...state.cartItems, { ...item, quantity: 1 }] };
    }),

  removeItem: (id) =>
    set((state) => ({
      cartItems: state.cartItems.filter((c) => c.id !== id),
    })),

  updateQuantity: (id, quantity) =>
    set((state) => ({
      cartItems:
        quantity <= 0
          ? state.cartItems.filter((c) => c.id !== id)
          : state.cartItems.map((c) => (c.id === id ? { ...c, quantity } : c)),
    })),

  clearCart: () => set({ cartItems: [], tableId: null, reservationId: null }),

  setTable: (tableId) => set({ tableId }),
  setReservation: (reservationId) => set({ reservationId }),

  totalAmount: () =>
    get().cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),

  totalItems: () =>
    get().cartItems.reduce((sum, item) => sum + item.quantity, 0),
}));
