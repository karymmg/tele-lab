import { useState, useEffect } from "react";
import { RepairRequest, RepairType, PaymentStatus, StatusHistoryEntry } from "@/types/telelab";
import { RepairStatusKey } from "@/utils/status";
import { computePricing } from "@/utils/pricing";
import { supabase } from "@/services/supabase/client";

export interface Driver {
  id: string;
  name: string;
  phone: string;
  zone: string;
}

// Convert from DB format to Frontend format
function mapRepairRequest(dbReq: any): RepairRequest {
  return {
    id: dbReq.id,
    trackingNumber: dbReq.tracking_number,
    createdAt: dbReq.created_at,
    confirmedAt: dbReq.status === "confirmed" ? dbReq.created_at : undefined, // simplified
    repairType: dbReq.repair_type as RepairType,
    brand: dbReq.brand,
    model: dbReq.model,
    problem: dbReq.problem,
    problemDescription: dbReq.description,
    photos: [],
    customer: {
      firstName: dbReq.customer_name.split(" ")[0] || "",
      lastName: dbReq.customer_name.split(" ").slice(1).join(" ") || "",
      phone: dbReq.customer_phone,
      email: dbReq.customer_email || "",
    },
    address: {
      address: dbReq.address || "",
      governorate: dbReq.governorate || "",
      city: dbReq.city || "",
      zone: dbReq.zone || "",
      complement: dbReq.address_complement || "",
      latitude: dbReq.latitude,
      longitude: dbReq.longitude
    },
    status: dbReq.status as RepairStatusKey,
    statusHistory: (dbReq.repair_status_history || []).map((h: any) => ({
      status: h.status,
      timestamp: h.created_at,
      note: h.note,
      changedBy: h.changed_by
    })),
    price: dbReq.price,
    depositAmount: dbReq.deposit_amount,
    remainingAmount: dbReq.remaining_amount,
    paymentStatus: dbReq.payment_status as PaymentStatus,
    driverId: dbReq.driver_id,
    technicianName: dbReq.technician_name,
  };
}

// Local cache for synchronous components that haven't been updated yet
let cachedRequests: RepairRequest[] = [];
let cachedDrivers: Driver[] = [];
const EVENT_NAME = "tele_lab_store_update";

function notifyUpdate() {
  window.dispatchEvent(new Event(EVENT_NAME));
}

// Supabase Realtime subscriptions
supabase
  .channel("public:repair_requests")
  .on("postgres_changes", { event: "*", schema: "public", table: "repair_requests" }, async () => {
    await fetchAllFromSupabase();
  })
  .subscribe();

supabase
  .channel("public:drivers")
  .on("postgres_changes", { event: "*", schema: "public", table: "drivers" }, async () => {
    await fetchDriversFromSupabase();
  })
  .subscribe();

async function fetchAllFromSupabase() {
  const { data } = await supabase.from("repair_requests").select("*, repair_status_history(*)").order("created_at", { ascending: false });
  if (data) {
    cachedRequests = data.map(mapRepairRequest);
    notifyUpdate();
  }
}

async function fetchDriversFromSupabase() {
  const { data } = await supabase.from("drivers").select("*").order("created_at", { ascending: true });
  if (data) {
    cachedDrivers = data.map(d => ({
      id: d.id,
      name: d.name,
      phone: d.phone,
      zone: d.zone
    }));
    notifyUpdate();
  }
}

// Initial fetch
fetchAllFromSupabase();
fetchDriversFromSupabase();

export function generateTrackingNumber(count: number): string {
  const currentYear = new Date().getFullYear();
  const padded = String(count + 187).padStart(6, "0");
  return `TL-${currentYear}-${padded}`;
}

export const repairStore = {
  getDrivers(): Driver[] {
    return cachedDrivers;
  },
  
  async addDriver(name: string, phone: string, zone: string) {
    await supabase.from("drivers").insert({ name, phone, zone });
  },

  async deleteDriver(id: string) {
    await supabase.from("drivers").delete().eq("id", id);
  },

  getAll(): RepairRequest[] {
    return cachedRequests;
  },

  getByTracking(trackingNumber: string): RepairRequest | undefined {
    const clean = trackingNumber.trim().toUpperCase();
    return cachedRequests.find((r) => r.trackingNumber.toUpperCase() === clean);
  },

  getByPhone(phone: string): RepairRequest[] {
    const clean = phone.replace(/[\s\-\+]/g, "");
    return cachedRequests.filter((r) => r.customer.phone.replace(/[\s\-\+]/g, "").includes(clean));
  },

  create(data: Omit<RepairRequest, "id" | "trackingNumber" | "createdAt" | "status" | "statusHistory" | "paymentStatus">) {
    const trackingNumber = generateTrackingNumber(cachedRequests.length);
    const now = new Date().toISOString();

    const statusHistory: StatusHistoryEntry[] = [
      {
        status: "new",
        timestamp: now,
        note: "Demande créée en ligne par le client",
        changedBy: "Client",
      },
    ];

    // Fire and forget to Supabase
    supabase.from("repair_requests").insert({
      tracking_number: trackingNumber,
      repair_type: data.repairType,
      brand: data.brand,
      model: data.model,
      problem: data.problem,
      description: data.problemDescription,
      status: "new",
      customer_name: `${data.customer.firstName} ${data.customer.lastName}`,
      customer_phone: data.customer.phone,
      customer_email: data.customer.email,
      address: data.address.address,
      governorate: data.address.governorate,
      city: data.address.city,
      zone: data.address.zone,
      address_complement: data.address.complement,
      latitude: data.address.latitude,
      longitude: data.address.longitude,
      payment_status: "unpaid",
    }).select("id").single().then(({ data: insertedReq, error }) => {
      if (error || !insertedReq) {
        console.error("Failed to insert repair request:", error);
        return;
      }
      supabase.from("repair_status_history").insert({
        repair_request_id: insertedReq.id,
        status: "new",
        note: "Demande créée en ligne par le client",
        changed_by: "Client"
      }).then(() => fetchAllFromSupabase());
    });

    // Optimistic return
    return {
      ...data,
      id: "temp-" + Date.now(),
      trackingNumber,
      createdAt: now,
      status: "new" as RepairStatusKey,
      statusHistory,
      paymentStatus: "unpaid" as PaymentStatus,
    };
  },

  async updateStatus(id: string, newStatus: RepairStatusKey, note?: string, changedBy: string = "Admin Tele Lab") {
    const req = cachedRequests.find(r => r.id === id);
    if (!req) return;
    const historyEntry = { status: newStatus, timestamp: new Date().toISOString(), note, changedBy };
    const newHistory = [...req.statusHistory, historyEntry];
    await supabase.from("repair_requests").update({ status: newStatus }).eq("id", id);
    await supabase.from("repair_status_history").insert({
      repair_request_id: id,
      status: newStatus,
      note,
      changed_by: changedBy
    });
    return { ...req, status: newStatus, statusHistory: newHistory };
  },

  async updatePrice(id: string, price: number) {
    const req = cachedRequests.find(r => r.id === id);
    if (!req) return;
    const pricing = computePricing(price);
    const newStatus = req.status === "new" ? "price_confirmed" : req.status;
    const note = `Prix fixé à ${price} DT (Acompte 30%: ${pricing.deposit} DT, Solde 70%: ${pricing.remaining} DT)`;
    const changedBy = "Admin Tele Lab";
    const historyEntry = {
      status: newStatus,
      timestamp: new Date().toISOString(),
      note,
      changedBy,
    };
    const newHistory = [...req.statusHistory, historyEntry];
    await supabase.from("repair_requests").update({
      price: pricing.total,
      deposit_amount: pricing.deposit,
      remaining_amount: pricing.remaining,
      status: newStatus
    }).eq("id", id);
    await supabase.from("repair_status_history").insert({
      repair_request_id: id,
      status: newStatus,
      note,
      changed_by: changedBy
    });
  },

  async assignDriver(id: string, driverName: string, driverId?: string) {
    const req = cachedRequests.find(r => r.id === id);
    if (!req) return;
    const isReturn = ["repair_ready", "driver_assigned_return", "return_in_delivery"].includes(req.status);
    const newStatus: RepairStatusKey = isReturn ? "driver_assigned_return" : "driver_assigned_pickup";
    const note = `Livreur ${driverName} assigné pour la course`;
    const changedBy = "Admin Tele Lab";
    const historyEntry = {
      status: newStatus,
      timestamp: new Date().toISOString(),
      note,
      changedBy,
    };
    const newHistory = [...req.statusHistory, historyEntry];
    await supabase.from("repair_requests").update({ driver_id: driverId, status: newStatus }).eq("id", id);
    await supabase.from("repair_status_history").insert({
      repair_request_id: id,
      status: newStatus,
      note,
      changed_by: changedBy
    });
  },

  async assignTechnician(id: string, technicianName: string) {
    const req = cachedRequests.find(r => r.id === id);
    if (!req) return;
    const note = `Technicien ${technicianName} en charge du dossier`;
    const changedBy = "Admin Tele Lab";
    const historyEntry = {
      status: req.status,
      timestamp: new Date().toISOString(),
      note,
      changedBy,
    };
    const newHistory = [...req.statusHistory, historyEntry];
    await supabase.from("repair_requests").update({ technician_name: technicianName }).eq("id", id);
    await supabase.from("repair_status_history").insert({
      repair_request_id: id,
      status: req.status,
      note,
      changed_by: changedBy
    });
  },

  async recordPayment(id: string, paymentType: "deposit" | "full") {
    const req = cachedRequests.find(r => r.id === id);
    if (!req) return;
    const newPaymentStatus = paymentType === "deposit" ? "deposit_paid" : "fully_paid";
    const note = paymentType === "deposit"
              ? `Acompte de 30% (${req.depositAmount ?? 0} DT) encaissé.`
              : `Solde final de 70% (${req.remainingAmount ?? 0} DT) encaissé. Totalité réglée.`;
    const changedBy = "Livreur / Caisse";
    const historyEntry = {
      status: req.status,
      timestamp: new Date().toISOString(),
      note,
      changedBy,
    };
    const newHistory = [...req.statusHistory, historyEntry];
    await supabase.from("repair_requests").update({ payment_status: newPaymentStatus }).eq("id", id);
    await supabase.from("repair_status_history").insert({
      repair_request_id: id,
      status: req.status,
      note,
      changed_by: changedBy
    });
  },
};

export function useRepairRequests() {
  const [requests, setRequests] = useState<RepairRequest[]>(() => repairStore.getAll());
  
  useEffect(() => {
    function handleUpdate() {
      setRequests(repairStore.getAll());
    }
    window.addEventListener(EVENT_NAME, handleUpdate);
    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
    };
  }, []);

  return requests;
}

export function useDrivers() {
  const [drivers, setDrivers] = useState<Driver[]>(() => repairStore.getDrivers());
  
  useEffect(() => {
    function handleUpdate() {
      setDrivers(repairStore.getDrivers());
    }
    window.addEventListener(EVENT_NAME, handleUpdate);
    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
    };
  }, []);

  return drivers;
}
