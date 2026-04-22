-- Migration: Add sequence column to purchase_orders
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS sequence INTEGER;
