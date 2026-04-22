-- Migration: Add load types and link to receipts
-- Date: 2026-04-22

-- 1. Create load_types table
CREATE TABLE IF NOT EXISTS public.load_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#3b82f6',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add load_type column to receipts
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS load_type TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS load_type_color TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id);

-- 3. Enable RLS on load_types
ALTER TABLE public.load_types ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for load_types
DROP POLICY IF EXISTS "Enable read for authenticated" ON public.load_types;
CREATE POLICY "Enable read for authenticated" 
ON public.load_types FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Enable insert for super admins" ON public.load_types;
CREATE POLICY "Enable insert for super admins" 
ON public.load_types FOR INSERT 
TO authenticated 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND (profiles.is_super_admin = true OR profiles.email = 'almoxarifado.sc@ventisol.com.br')
    )
);

-- 5. Insert initial load types (optional, but helpful)
INSERT INTO public.load_types (name) VALUES 
('Componentes'), ('Matéria Prima'), ('Produto Acabado'), ('Embalagens')
ON CONFLICT (name) DO NOTHING;
