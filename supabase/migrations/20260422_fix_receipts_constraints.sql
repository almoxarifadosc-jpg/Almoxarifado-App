-- Migration: Fix receipts schema to match UI and remove outdated constraints
-- Date: 2026-04-22

-- 1. Make supplier_type optional (it is not currently in the UI form)
ALTER TABLE public.receipts ALTER COLUMN supplier_type DROP NOT NULL;

-- 2. Make invoice_number optional (it was replaced by 'invoices' array in UI)
ALTER TABLE public.receipts ALTER COLUMN invoice_number DROP NOT NULL;

-- 3. Add any missing columns that the UI expects but might be missing in older versions
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS invoices TEXT[] DEFAULT '{}'::text[];
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS driver TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS load_id TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS invoice_count INTEGER DEFAULT 0;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS updated_by_name TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS author_id UUID;
