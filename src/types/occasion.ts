export type OccasionType = "PC" | "Téléphone" | "Console";
export type OccasionStatus = "active" | "pending" | "sold" | "rejected";

export interface OccasionProduct {
  id: string;
  sellerId: string;
  type: OccasionType;
  brand: string;
  model: string;
  description: string;
  condition: string;
  price: number;
  whatsappNumber: string;
  photos: string[];
  views: number;
  status: OccasionStatus;
  createdAt: string;
}

export interface SiteVisit {
  id: string;
  visitDate: string;
  visitorsCount: number;
}
