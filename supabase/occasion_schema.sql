-- =============================================================================
-- TELE LAB — Schéma PostgreSQL pour le Marché de l'Occasion & Analytics
-- =============================================================================

-- 1. MISE À JOUR DE LA TABLE PROFILES (POUR LA VÉRIFICATION D'IDENTITÉ)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cin_number TEXT,
ADD COLUMN IF NOT EXISTS cin_date DATE;

-- 2. MISE À JOUR DE LA TABLE SHOP_PRODUCTS (POUR LES VUES)
ALTER TABLE public.shop_products
ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0 NOT NULL;

-- 3. TABLE DES ANNONCES D'OCCASION
CREATE TABLE IF NOT EXISTS public.occasion_products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('PC', 'Téléphone', 'Console')) NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  description TEXT NOT NULL,
  condition TEXT NOT NULL, -- e.g., 'Comme neuf', 'Bon état', 'Acceptable'
  price NUMERIC(10, 2) NOT NULL,
  whatsapp_number TEXT NOT NULL,
  photos TEXT[] NOT NULL, -- Array de URLs d'images (3 minimum géré côté client)
  views INTEGER DEFAULT 0 NOT NULL,
  status TEXT CHECK (status IN ('active', 'pending', 'sold', 'rejected')) DEFAULT 'active' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_occasion_products_type ON public.occasion_products (type);
CREATE INDEX IF NOT EXISTS idx_occasion_products_status ON public.occasion_products (status);

-- 4. TABLE POUR LES STATISTIQUES GLOBAL (SITE VISITS)
CREATE TABLE IF NOT EXISTS public.site_visits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  visit_date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  visitors_count INTEGER DEFAULT 1 NOT NULL
);

-- 5. FONCTIONS RPC (POUR L'ANALYTICS)

-- Fonction pour incrémenter les vues d'un produit (Neuf ou Occasion)
CREATE OR REPLACE FUNCTION increment_product_views(p_id UUID, p_is_occasion BOOLEAN)
RETURNS void AS $$
BEGIN
  IF p_is_occasion THEN
    UPDATE public.occasion_products SET views = views + 1 WHERE id = p_id;
  ELSE
    UPDATE public.shop_products SET views = views + 1 WHERE id = p_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour logger une visite sur le site
CREATE OR REPLACE FUNCTION log_site_visit()
RETURNS void AS $$
BEGIN
  INSERT INTO public.site_visits (visit_date, visitors_count)
  VALUES (CURRENT_DATE, 1)
  ON CONFLICT (visit_date)
  DO UPDATE SET visitors_count = public.site_visits.visitors_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. SÉCURITÉ ROW LEVEL SECURITY (RLS) SUR LES OCCASIONS
ALTER TABLE public.occasion_products ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut voir les occasions actives
CREATE POLICY "Public occasion lookup"
  ON public.occasion_products
  FOR SELECT
  USING (status = 'active' OR auth.jwt() ->> 'role' = 'service_role' OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') OR seller_id = auth.uid());

-- Les utilisateurs authentifiés peuvent créer des annonces
CREATE POLICY "Users can insert occasion"
  ON public.occasion_products
  FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

-- Les vendeurs peuvent modifier leurs propres annonces (pour marquer comme vendu, etc.)
CREATE POLICY "Sellers can update their occasions"
  ON public.occasion_products
  FOR UPDATE
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- Les admins ont tous les droits
CREATE POLICY "Admin full access occasions"
  ON public.occasion_products
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'service_role' OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role' OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 7. CONFIGURATION DU BUCKET STORAGE POUR LES PHOTOS D'OCCASION
-- Remarque : Si vous n'avez pas activé l'API Storage, cette partie peut nécessiter la console Supabase.
-- Normalement, on crée un bucket "telelab_uploads" avec accès public.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('telelab_uploads', 'telelab_uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Policies pour permettre l'upload aux utilisateurs connectés et la lecture à tous
CREATE POLICY "Public read uploads" ON storage.objects FOR SELECT USING (bucket_id = 'telelab_uploads');
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'telelab_uploads' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete their own uploads" ON storage.objects FOR DELETE USING (bucket_id = 'telelab_uploads' AND auth.uid() = owner);
