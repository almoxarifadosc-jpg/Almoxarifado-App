-- Migration: Add Super Admin Role
-- Date: 2026-04-20

-- 1. Add is_super_admin column to profiles if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

-- 2. Initialize the specified email as super admin
-- We also ensure they are a normal admin
UPDATE public.profiles 
SET is_super_admin = true, is_admin = true 
WHERE email = 'almoxarifado.sc@ventisol.com.br';

-- 3. Update RLS policies for profiles to prevent unauthorized role elevation
-- Only super admins should be able to change is_admin or is_super_admin for others

-- First, drop existing update policy to replace it
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;

-- Users can still update their own name/email (if they want), but NOT roles
CREATE POLICY "Users can update own profile (safely)" ON public.profiles
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND (
      -- If the user is NOT a super admin, they cannot change their administrative flags
      (
        (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()) = true
      ) OR (
        -- They can update their record if the admin flags match what's currently there
        is_admin = (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) AND
        is_super_admin = (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid())
      )
    )
  );

-- Allow super admins to manage everyone's roles
CREATE POLICY "Super admins can manage all profiles" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true
    )
  );
