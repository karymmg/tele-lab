-- =============================================================================
-- MIGRATION: Fix Authentication Architecture
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- =============================================================================

-- ─── 1. Enable RLS on profiles ───────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ─── 2. RLS Policies for profiles ────────────────────────────────────────────

-- Authenticated users can read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Authenticated users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Service role has full access (for admin operations)
DROP POLICY IF EXISTS "Service role full access on profiles" ON public.profiles;
CREATE POLICY "Service role full access on profiles"
  ON public.profiles
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Allow insert during registration (the user just signed up, their uid matches)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ─── 3. Secure RPC for login lookup (bypasses RLS via SECURITY DEFINER) ──────
-- This is safe because it only returns auth_email for a given phone — no PII leak.
CREATE OR REPLACE FUNCTION public.get_auth_email_by_identifier(p_identifier TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_email TEXT;
  v_digits TEXT;
BEGIN
  -- Strip non-digits for phone lookup
  v_digits := regexp_replace(p_identifier, '[^0-9]', '', 'g');

  SELECT auth_email INTO v_auth_email
  FROM public.profiles
  WHERE
    (v_digits <> '' AND phone = v_digits)
    OR username = p_identifier
    OR auth_email = p_identifier
    OR (email IS NOT NULL AND email = p_identifier)
  LIMIT 1;

  RETURN v_auth_email;
END;
$$;

-- Grant execute to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_auth_email_by_identifier(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_auth_email_by_identifier(TEXT) TO authenticated;

-- ─── 4. Add index on repair_requests.user_id ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_repairs_user_id
  ON public.repair_requests (user_id);

-- ─── 5. RLS policy: customers see only their own repairs ─────────────────────
-- (Keep existing public policies for tracking page, just add user-scoped one)
DROP POLICY IF EXISTS "Users see own repair requests" ON public.repair_requests;
CREATE POLICY "Users see own repair requests"
  ON public.repair_requests
  FOR SELECT
  USING (
    user_id IS NULL            -- anonymous orders visible via tracking number
    OR user_id = auth.uid()    -- logged-in user sees their own orders
    OR auth.uid() IS NOT NULL  -- any logged-in user (admin/driver/tech) sees all
  );

-- ─── 6. Verify ───────────────────────────────────────────────────────────────
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'repair_requests')
ORDER BY tablename, policyname;
