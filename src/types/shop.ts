export interface ShopCategory {
  id: string;
  name: string;
  icon?: string;
  active: boolean;
  createdAt: string;
}

export interface ShopProduct {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  imageUrl?: string;
  active: boolean;
  createdAt: string;
}
