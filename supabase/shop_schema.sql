-- =============================================================================
-- TELE LAB — Schéma PostgreSQL Supabase pour la Boutique (Shop)
-- =============================================================================

-- 1. CATÉGORIES DE PRODUITS
CREATE TABLE IF NOT EXISTS public.shop_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT, -- URL de l'icône ou nom de l'icône Lucide
  active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. PRODUITS DE LA BOUTIQUE
CREATE TABLE IF NOT EXISTS public.shop_products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  category_id UUID REFERENCES public.shop_categories(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  stock INTEGER DEFAULT 0 NOT NULL,
  image_url TEXT,
  active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. INDEX POUR PERFORMANCES DE RECHERCHE RAPIDE
CREATE INDEX IF NOT EXISTS idx_shop_products_category ON public.shop_products (category_id);
CREATE INDEX IF NOT EXISTS idx_shop_products_active ON public.shop_products (active);

-- 4. SÉCURITÉ ROW LEVEL SECURITY (RLS)
ALTER TABLE public.shop_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;

-- Lecture publique autorisée pour le catalogue en ligne
CREATE POLICY "Public categories lookup"
  ON public.shop_categories
  FOR SELECT
  USING (true);

CREATE POLICY "Public products lookup"
  ON public.shop_products
  FOR SELECT
  USING (true);

-- Les mises à jour administratives (seuls les admins peuvent insérer/modifier/supprimer)
CREATE POLICY "Admin full access categories"
  ON public.shop_categories
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'service_role' OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role' OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin full access products"
  ON public.shop_products
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'service_role' OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role' OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 5. DONNÉES INITIALES (SEED)
INSERT INTO public.shop_categories (id, name, icon) VALUES
  ('4b18c6df-6325-4fc1-a95c-9c71e21b2bb1', 'Cages & Coques', 'Smartphone'),
  ('33f5d506-8d61-4fa3-9f5e-1cdff17122a2', 'Chargeurs', 'BatteryCharging'),
  ('072049e2-8b4b-4fc2-a50d-d45674c93f0b', 'Câbles', 'Cable'),
  ('df2006ed-604f-4d32-9b25-2bfa9d012117', 'Anti-casse (Films)', 'Shield'),
  ('bc9277d7-fde0-47b8-80f0-c5ef61ed8127', 'AirPods & Écouteurs', 'Headphones'),
  ('b09c5dbf-9b19-4cb5-8d51-3ec7d23d8c47', 'Enceintes (Speakers)', 'Speaker')
ON CONFLICT DO NOTHING;
