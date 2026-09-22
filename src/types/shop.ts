export interface ShopCategory {
  id: string;
  name: string;
  slug?: string;
  icon?: string;
  active: boolean;
  createdAt: string;
}

export interface ShopProduct {
  id: string;
  categoryId: string;
  name: string;
  slug?: string;
  description?: string;
  price: number;
  stock: number;
  imageUrl?: string;
  active: boolean;
  createdAt: string;
  views?: number;
}
