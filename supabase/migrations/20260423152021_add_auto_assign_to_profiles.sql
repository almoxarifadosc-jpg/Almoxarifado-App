-- Migration to add is_auto_assign to profiles
-- Date: 2026-04-23

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_auto_assign BOOLEAN DEFAULT FALSE;

-- Document for documentation
COMMENT ON COLUMN public.profiles.is_auto_assign IS 'If true, the user is automatically added to all new purchase orders';
