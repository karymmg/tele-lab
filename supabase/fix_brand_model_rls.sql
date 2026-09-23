-- Run once in Supabase SQL Editor to allow admins to manage catalog brands/models.
-- The public SELECT policies keep product names and references available to visitors.
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public brands lookup" ON public.brands;
CREATE POLICY "Public brands lookup" ON public.brands FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin full access brands" ON public.brands;
CREATE POLICY "Admin full access brands" ON public.brands FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role' OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role' OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Public models lookup" ON public.models;
CREATE POLICY "Public models lookup" ON public.models FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin full access models" ON public.models;
CREATE POLICY "Admin full access models" ON public.models FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role' OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role' OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
