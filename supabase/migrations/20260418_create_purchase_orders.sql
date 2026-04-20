-- Migration to create and fix purchase_orders table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number TEXT NOT NULL,
    supplier_name TEXT NOT NULL,
    product_location TEXT,
    date DATE NOT NULL,
    total_amount NUMERIC DEFAULT 0,
    items JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Processado', 'Recusado', 'Baixada')),
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Signature and Conference fields
    is_signed BOOLEAN DEFAULT FALSE,
    signed_at TIMESTAMPTZ,
    signed_by_name TEXT,
    signature_url TEXT,
    conferred_by_id UUID REFERENCES public.profiles(id),
    conferred_by_name TEXT,
    conferred_at TIMESTAMPTZ,
    assigned_users UUID[]
);

-- Ensure columns exist if table already existed partially
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS is_signed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS signed_by_name TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS signature_url TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS conferred_by_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS conferred_by_name TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS conferred_at TIMESTAMPTZ;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS assigned_users UUID[];

-- Enable RLS
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.purchase_orders;
DROP POLICY IF EXISTS "Enable insert for all authenticated users" ON public.purchase_orders;
DROP POLICY IF EXISTS "Enable update for all authenticated users" ON public.purchase_orders;
DROP POLICY IF EXISTS "Enable delete for admins" ON public.purchase_orders;

CREATE POLICY "Enable read access for all authenticated users" 
ON public.purchase_orders FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Enable insert for all authenticated users" 
ON public.purchase_orders FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Enable update for all authenticated users" 
ON public.purchase_orders FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Enable delete for admins" 
ON public.purchase_orders FOR DELETE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_number ON public.purchase_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);
