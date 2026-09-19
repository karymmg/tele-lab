import { useState, useEffect } from "react";
import { supabase } from "@/services/supabase/client";
import { useAuth } from "@/services/auth";

// ─── Types ───────────────────────────────────────────────────────────────────
export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  isOccasion: boolean;
}

export interface ShopOrder {
  id: string;
  orderNumber: string;
  userId: string | null;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerCity: string;
  customerGovernorate: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Internal Cache ──────────────────────────────────────────────────────────
let cachedOrders: ShopOrder[] = [];
const ORDER_EVENT_NAME = "tele_lab_orders_update";

function notifyOrderUpdate() {
  window.dispatchEvent(new Event(ORDER_EVENT_NAME));
}

function mapOrder(dbOrder: any): ShopOrder {
  return {
    id: dbOrder.id,
    orderNumber: dbOrder.order_number,
    userId: dbOrder.user_id,
    customerName: dbOrder.customer_name,
    customerPhone: dbOrder.customer_phone,
    customerAddress: dbOrder.customer_address || "",
    customerCity: dbOrder.customer_city || "",
    customerGovernorate: dbOrder.customer_governorate || "",
    items: dbOrder.items || [],
    totalAmount: dbOrder.total_amount,
    status: dbOrder.status as OrderStatus,
    notes: dbOrder.notes || "",
    createdAt: dbOrder.created_at,
    updatedAt: dbOrder.updated_at,
  };
}

// ─── Data Fetching ───────────────────────────────────────────────────────────
async function fetchAllOrders() {
  const { data } = await supabase
    .from("shop_orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (data) {
    cachedOrders = data.map(mapOrder);
    notifyOrderUpdate();
  }
}

// Realtime subscription
supabase
  .channel("public:shop_orders")
  .on("postgres_changes", { event: "*", schema: "public", table: "shop_orders" }, async () => {
    await fetchAllOrders();
  })
  .subscribe();

// Initial fetch
fetchAllOrders();

// ─── Order Number Generator ──────────────────────────────────────────────────
function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `CMD-${year}${month}${day}-${rand}`;
}

// ─── Store ───────────────────────────────────────────────────────────────────
export const orderStore = {
  getAll(): ShopOrder[] {
    return cachedOrders;
  },

  async createOrder(data: {
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    customerCity: string;
    customerGovernorate: string;
    items: OrderItem[];
    totalAmount: number;
    userId?: string | null;
    notes?: string;
  }): Promise<ShopOrder | null> {
    const orderNumber = generateOrderNumber();

    const { data: inserted, error } = await supabase
      .from("shop_orders")
      .insert({
        order_number: orderNumber,
        user_id: data.userId || null,
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        customer_address: data.customerAddress,
        customer_city: data.customerCity,
        customer_governorate: data.customerGovernorate,
        items: data.items,
        total_amount: data.totalAmount,
        status: "pending",
        notes: data.notes || "",
      })
      .select()
      .single();

    if (error || !inserted) {
      console.error("Failed to create order:", error);
      return null;
    }

    return mapOrder(inserted);
  },

  async updateStatus(id: string, newStatus: OrderStatus) {
    const { error } = await supabase
      .from("shop_orders")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      console.error("Failed to update order status:", error);
      throw error;
    }
  },

  async deleteOrder(id: string) {
    const { error } = await supabase
      .from("shop_orders")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Failed to delete order:", error);
      throw error;
    }

    cachedOrders = cachedOrders.filter((o) => o.id !== id);
    notifyOrderUpdate();
  },
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

/** All orders — for admin dashboard */
export function useShopOrders() {
  const [orders, setOrders] = useState<ShopOrder[]>(() => orderStore.getAll());

  useEffect(() => {
    function handleUpdate() {
      setOrders(orderStore.getAll());
    }
    window.addEventListener(ORDER_EVENT_NAME, handleUpdate);
    return () => {
      window.removeEventListener(ORDER_EVENT_NAME, handleUpdate);
    };
  }, []);

  return orders;
}

/** Current user's orders — for client dashboard */
export function useMyOrders() {
  const { user } = useAuth();
  const [myOrders, setMyOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setMyOrders([]);
      setLoading(false);
      return;
    }

    async function fetchMine() {
      setLoading(true);
      const { data, error } = await supabase
        .from("shop_orders")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setMyOrders(data.map(mapOrder));
      }
      setLoading(false);
    }

    fetchMine();

    function handleUpdate() {
      fetchMine();
    }
    window.addEventListener(ORDER_EVENT_NAME, handleUpdate);
    return () => {
      window.removeEventListener(ORDER_EVENT_NAME, handleUpdate);
    };
  }, [user?.id]);

  return { myOrders, loading };
}
