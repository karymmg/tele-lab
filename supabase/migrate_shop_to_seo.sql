-- =============================================================================
-- MIGRATION: UPGRADE EXISTING SHOP TO SEO CATALOG
-- =============================================================================

-- 1. ALTER shop_categories to add SEO fields
ALTER TABLE public.shop_categories ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE public.shop_categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.shop_categories ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE public.shop_categories ADD COLUMN IF NOT EXISTS seo_description TEXT;

-- 1.5 ALTER brands and models to add SEO fields
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS seo_description TEXT;

ALTER TABLE public.models ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS seo_description TEXT;

-- 2. ALTER shop_products to add SEO & Catalog fields
ALTER TABLE public.shop_products ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE public.shop_products ADD COLUMN IF NOT EXISTS sku TEXT UNIQUE;
ALTER TABLE public.shop_products ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE public.shop_products ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TND' NOT NULL;
ALTER TABLE public.shop_products ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE public.shop_products ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE public.shop_products ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL;
ALTER TABLE public.shop_products ADD COLUMN IF NOT EXISTS model_id UUID REFERENCES public.models(id) ON DELETE SET NULL;
ALTER TABLE public.shop_products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL;

-- 3. FUNCTION & TRIGGER POUR AUTO-SLUG
CREATE OR REPLACE FUNCTION generate_slug(title TEXT)
RETURNS TEXT AS $$
DECLARE
  slug TEXT;
BEGIN
  -- Convert to lowercase, replace spaces and special characters with hyphens
  slug := lower(regexp_replace(regexp_replace(title, '[^a-zA-Z0-9\s-]', '', 'g'), '[\s-]+', '-', 'g'));
  RETURN slug;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_shop_product_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  new_slug TEXT;
  counter INTEGER := 1;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := generate_slug(NEW.name);
    new_slug := base_slug;
    
    WHILE EXISTS (SELECT 1 FROM public.shop_products WHERE slug = new_slug AND id != NEW.id) LOOP
      counter := counter + 1;
      new_slug := base_slug || '-' || counter;
    END LOOP;
    
    NEW.slug := new_slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_shop_category_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  new_slug TEXT;
  counter INTEGER := 1;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := generate_slug(NEW.name);
    new_slug := base_slug;
    
    WHILE EXISTS (SELECT 1 FROM public.shop_categories WHERE slug = new_slug AND id != NEW.id) LOOP
      counter := counter + 1;
      new_slug := base_slug || '-' || counter;
    END LOOP;
    
    NEW.slug := new_slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS trigger_set_shop_product_slug ON public.shop_products;
CREATE TRIGGER trigger_set_shop_product_slug
BEFORE INSERT OR UPDATE ON public.shop_products
FOR EACH ROW
EXECUTE FUNCTION set_shop_product_slug();

DROP TRIGGER IF EXISTS trigger_set_shop_category_slug ON public.shop_categories;
CREATE TRIGGER trigger_set_shop_category_slug
BEFORE INSERT OR UPDATE ON public.shop_categories
FOR EACH ROW
EXECUTE FUNCTION set_shop_category_slug();

-- Fix existing data slugs (if any are NULL)
UPDATE public.shop_categories SET slug = generate_slug(name) WHERE slug IS NULL;
UPDATE public.shop_products SET slug = generate_slug(name) WHERE slug IS NULL;
UPDATE public.brands SET slug = generate_slug(name) WHERE slug IS NULL;
UPDATE public.models SET slug = generate_slug(name) WHERE slug IS NULL;

-- 4. WHOLESALERS (Grossistes)
CREATE TABLE IF NOT EXISTS public.wholesalers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. WHOLESALER_PRODUCTS (Stock par grossiste)
CREATE TABLE IF NOT EXISTS public.wholesaler_products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES public.shop_products(id) ON DELETE CASCADE NOT NULL,
  wholesaler_id UUID REFERENCES public.wholesalers(id) ON DELETE CASCADE NOT NULL,
  stock INTEGER DEFAULT 0 NOT NULL,
  wholesale_price NUMERIC(10, 2),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(product_id, wholesaler_id)
);

-- RLS
ALTER TABLE public.wholesalers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wholesaler_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access wholesalers" ON public.wholesalers;
CREATE POLICY "Admin full access wholesalers" ON public.wholesalers FOR ALL USING (auth.jwt() ->> 'role' = 'service_role' OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admin full access wholesaler_products" ON public.wholesaler_products;
CREATE POLICY "Admin full access wholesaler_products" ON public.wholesaler_products FOR ALL USING (auth.jwt() ->> 'role' = 'service_role' OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
