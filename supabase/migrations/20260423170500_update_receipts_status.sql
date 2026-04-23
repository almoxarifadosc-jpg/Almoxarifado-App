-- Migration to update receipts status and add missing columns
-- Date: 2026-04-23

-- 1. Drop existing constraint
ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_status_check;

-- 2. Add new constraint with additional statuses
ALTER TABLE public.receipts ADD CONSTRAINT receipts_status_check 
CHECK (status IN ('Pendente', 'Enviado', 'Recebido', 'Conferido', 'Divergente'));

-- 3. Add photos column if we want to support multiple photos, but for now the user asked for "um campo foto"
-- Actually, the current table already has `image_url`. The user said "campo foto" (singular).
-- I'll stick with image_url but improve the handling.

COMMENT ON COLUMN public.receipts.status IS 'Status da carga: Pendente, Enviado, Recebido, Conferido ou Divergente';
