-- =============================================================================
-- TELE LAB — Schéma PostgreSQL Supabase Complet (Conforme au Cahier des charges §50)
-- =============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TYPES ENUM
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('customer', 'admin', 'technician', 'driver');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE repair_type_enum AS ENUM ('hardware', 'software');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status_enum AS ENUM ('unpaid', 'deposit_paid', 'fully_paid');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES / UTILISATEURS
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role user_role NOT NULL DEFAULT 'customer',
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. MARQUES DE TÉLÉPHONES (§12 & §50)
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. MODÈLES DE TÉLÉPHONES (§12 & §50)
CREATE TABLE IF NOT EXISTS public.models (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(brand_id, name)
);

-- 6. PROBLÈMES DE RÉPARATION RÉFÉRENCÉS (§13 & §50)
CREATE TABLE IF NOT EXISTS public.repair_problems (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name_fr TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  type TEXT CHECK (type IN ('hardware', 'software', 'both')) NOT NULL DEFAULT 'both',
  active BOOLEAN DEFAULT true NOT NULL
);

-- 7. DEMANDES DE RÉPARATION (§18, §19, §50)
CREATE TABLE IF NOT EXISTS public.repair_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tracking_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Appareil & Panne
  repair_type repair_type_enum NOT NULL DEFAULT 'hardware',
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  problem TEXT NOT NULL,
  description TEXT,
  
  -- Coordonnées Client & Collecte
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  address TEXT NOT NULL,
  governorate TEXT,
  city TEXT,
  zone TEXT,
  address_complement TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  
  -- Workflow & Statut (§70)
  status TEXT NOT NULL DEFAULT 'new',
  
  -- Tarifs & Paiements 30/70 (§56)
  price NUMERIC(10, 2),
  deposit_amount NUMERIC(10, 2),
  remaining_amount NUMERIC(10, 2),
  payment_status payment_status_enum NOT NULL DEFAULT 'unpaid',
  
  -- Staff assigné
  driver_name TEXT,
  driver_phone TEXT,
  technician_name TEXT,
  internal_notes TEXT,
  
  -- Horodatages
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- 8. PHOTOS DES APPAREILS (§14 & §51)
CREATE TABLE IF NOT EXISTS public.repair_photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  repair_request_id UUID REFERENCES public.repair_requests(id) ON DELETE CASCADE NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 9. HISTORIQUE D'AUDIT DES STATUTS (§49 & §50)
CREATE TABLE IF NOT EXISTS public.repair_status_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  repair_request_id UUID REFERENCES public.repair_requests(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 10. INDEX POUR PERFORMANCES DE RECHERCHE RAPIDE (§20)
CREATE INDEX IF NOT EXISTS idx_repairs_tracking ON public.repair_requests (tracking_number);
CREATE INDEX IF NOT EXISTS idx_repairs_phone ON public.repair_requests (customer_phone);
CREATE INDEX IF NOT EXISTS idx_repairs_status ON public.repair_requests (status);

-- 11. SÉCURITÉ ROW LEVEL SECURITY (RLS)
ALTER TABLE public.repair_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_status_history ENABLE ROW LEVEL SECURITY;

-- Lecture publique autorisée pour la page de tracking (par Tracking Number ou Phone)
CREATE POLICY "Public tracking lookup"
  ON public.repair_requests
  FOR SELECT
  USING (true);

-- Création publique autorisée depuis le formulaire client
CREATE POLICY "Public repair creation"
  ON public.repair_requests
  FOR INSERT
  WITH CHECK (true);

-- Les mises à jour administratives (ou service role)
CREATE POLICY "Admin full access"
  ON public.repair_requests
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role' OR auth.uid() IS NOT NULL);

-- 12. DONNÉES INITIALES (SEED)
INSERT INTO public.brands (name) VALUES
  ('Apple'), ('Samsung'), ('Xiaomi'), ('Huawei'), ('Google Pixel'), ('Oppo'), ('Infinix'), ('Honor')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.repair_problems (name_fr, name_ar, type) VALUES
  ('Écran fissuré / cassé / affichage noir', 'شاشة مكسورة / عرض تالف', 'hardware'),
  ('Batterie (décharge rapide / gonflée)', 'مشكلة البطارية (نفاد سريع أو انتفاخ)', 'hardware'),
  ('Connecteur de charge / Ne charge plus', 'منفذ الشحن / لا يشحن', 'hardware'),
  ('Tactile ne répond plus ou bug', 'اللمس لا يستجيب', 'hardware'),
  ('Caméra avant ou arrière', 'الكاميرا الأمامية أو الخلفية', 'hardware'),
  ('Tombé dans l''eau / Désoxydation liquide', 'سقوط في الماء / أضرار السوائل', 'hardware'),
  ('Blocage sur logo / Bootloop', 'عالق على الشعار / لا يقلع', 'software'),
  ('Réinitialisation / Déblocage compte', 'إعادة ضبط / فك قفل الحساب', 'software')
ON CONFLICT DO NOTHING;
