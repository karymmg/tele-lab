-- =============================================================================
-- MIGRATION: Add cost_price to shop_products + driver_id to shop_orders
-- =============================================================================

-- 1. Add cost_price column to shop_products
ALTER TABLE public.shop_products 
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,3) DEFAULT 0;

-- 2. Add driver_id to shop_orders for delivery assignment
ALTER TABLE public.shop_orders 
  ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL;

-- 3. Add driver_name to shop_orders (for display when driver is deleted)
ALTER TABLE public.shop_orders 
  ADD COLUMN IF NOT EXISTS driver_name TEXT;
