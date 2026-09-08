-- ============================================================
-- MIGRATION: Add auth_email and username to profiles table
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Add the missing columns
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS auth_email TEXT,
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- 2. Backfill auth_email for ALL existing users
-- Each user's auth_email should be the email from auth.users
UPDATE public.profiles p
SET auth_email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND p.auth_email IS NULL;

-- 3. Verify: show all profiles with their auth_email
SELECT id, phone, email, auth_email, username, role
FROM public.profiles;
