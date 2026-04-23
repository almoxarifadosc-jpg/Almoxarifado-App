-- Migration: Enable Realtime for core tables
-- Date: 2026-04-23

-- Add tables to the supabase_realtime publication
-- This enables the "postgres_changes" listeners in the frontend

BEGIN;
  -- Remove existing if exists to avoid errors (not all Supabase projects have this publication by default)
  -- But usually, it exists. The safer way is to add specifically:
  
  ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_orders;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.operations;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.receipts;
COMMIT;
