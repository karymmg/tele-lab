import { RepairStatusKey } from "@/utils/status";

export type RepairType = "hardware" | "software";

export type PaymentStatus = "unpaid" | "deposit_paid" | "fully_paid";

export interface CustomerInfo {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
}

export interface AddressInfo {
  governorate: string;
  city: string;
  zone: string;
  address: string;
  complement?: string;
  latitude?: number;
  longitude?: number;
}

export interface StatusHistoryEntry {
  status: RepairStatusKey;
  timestamp: string;
  note?: string;
  changedBy: string;
}

export interface RepairRequest {
  id: string;
  trackingNumber: string;
  createdAt: string;
  confirmedAt?: string;
  completedAt?: string;
  
  repairType: RepairType;
  brand: string;
  model: string;
  problem: string;
  problemDescription?: string;
  photos: string[]; // base64 data URLs or storage paths
  
  customer: CustomerInfo;
  address: AddressInfo;
  
  status: RepairStatusKey;
  statusHistory: StatusHistoryEntry[];
  
  price?: number; // Total in DT
  depositAmount?: number; // 30%
  remainingAmount?: number; // 70%
  paymentStatus: PaymentStatus;
  
  driverId?: string;
  driverName?: string;
  technicianId?: string;
  technicianName?: string;
  internalNotes?: string;
}

export interface BrandReference {
  id: string;
  name: string;
  popularModels: string[];
}

export interface ProblemReference {
  id: string;
  nameFr: string;
  nameAr: string;
  type: "hardware" | "software" | "both";
  icon: string;
}
