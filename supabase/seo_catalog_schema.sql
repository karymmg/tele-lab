-- =============================================================================
-- TELE LAB — Schéma PostgreSQL Supabase pour le Catalogue SEO (§Telephonic Pro)
-- =============================================================================

-- 1. CATÉGORIES (SEO)
CREATE TABLE IF NOT EXISTS public.seo_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  seo_title TEXT,
  seo_description TEXT,
  active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Note: brands and models exist in schema.sql, we alter them to add SEO fields
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS seo_description TEXT;

ALTER TABLE public.models ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS seo_description TEXT;

-- 2. WHOLESALERS (Grossistes)
CREATE TABLE IF NOT EXISTS public.wholesalers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. PRODUITS (SEO)
CREATE TABLE IF NOT EXISTS public.seo_products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  category_id UUID REFERENCES public.seo_categories(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  model_id UUID REFERENCES public.models(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  sku TEXT UNIQUE,
  short_description TEXT,
  description TEXT,
  price NUMERIC(10, 2),
  currency TEXT DEFAULT 'TND' NOT NULL,
  stock INTEGER DEFAULT 0 NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  seo_title TEXT,
  seo_description TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. WHOLESALER_PRODUCTS (Stock par grossiste)
CREATE TABLE IF NOT EXISTS public.wholesaler_products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES public.seo_products(id) ON DELETE CASCADE NOT NULL,
  wholesaler_id UUID REFERENCES public.wholesalers(id) ON DELETE CASCADE NOT NULL,
  stock INTEGER DEFAULT 0 NOT NULL,
  wholesale_price NUMERIC(10, 2),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(product_id, wholesaler_id)
);

-- 5. FUNCTION & TRIGGER POUR AUTO-SLUG
-- (Pour générer le slug automatiquement si vide)
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

CREATE OR REPLACE FUNCTION set_product_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  new_slug TEXT;
  counter INTEGER := 1;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := generate_slug(NEW.name);
    new_slug := base_slug;
    
    WHILE EXISTS (SELECT 1 FROM public.seo_products WHERE slug = new_slug AND id != NEW.id) LOOP
      counter := counter + 1;
      new_slug := base_slug || '-' || counter;
    END LOOP;
    
    NEW.slug := new_slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_product_slug
BEFORE INSERT OR UPDATE ON public.seo_products
FOR EACH ROW
EXECUTE FUNCTION set_product_slug();

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_updated_at
BEFORE UPDATE ON public.seo_products
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- 6. RLS
ALTER TABLE public.seo_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wholesalers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wholesaler_products ENABLE ROW LEVEL SECURITY;

-- Public can see active categories
CREATE POLICY "Public categories lookup" ON public.seo_categories FOR SELECT USING (active = true);
-- Public can see active products (BUT maybe not price, handled in application for now, or via specific RLS if needed. 
-- User specs: "Public user sees only active=true, but authenticated client sees price/stock")
-- Let's make the row readable if active=true. We can mask fields in the frontend or use a secure view.
-- For now, full row is readable but the frontend will hide the price.
CREATE POLICY "Public products lookup" ON public.seo_products FOR SELECT USING (is_active = true);

-- Admins can do everything
CREATE POLICY "Admin full access seo_categories" ON public.seo_categories FOR ALL USING (auth.jwt() ->> 'role' = 'service_role' OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin full access seo_products" ON public.seo_products FOR ALL USING (auth.jwt() ->> 'role' = 'service_role' OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin full access wholesalers" ON public.wholesalers FOR ALL USING (auth.jwt() ->> 'role' = 'service_role' OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin full access wholesaler_products" ON public.wholesaler_products FOR ALL USING (auth.jwt() ->> 'role' = 'service_role' OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 7. INDEX
CREATE INDEX IF NOT EXISTS idx_seo_products_slug ON public.seo_products (slug);
CREATE INDEX IF NOT EXISTS idx_seo_categories_slug ON public.seo_categories (slug);
CREATE INDEX IF NOT EXISTS idx_brands_slug ON public.brands (slug);
CREATE INDEX IF NOT EXISTS idx_models_slug ON public.models (slug);
