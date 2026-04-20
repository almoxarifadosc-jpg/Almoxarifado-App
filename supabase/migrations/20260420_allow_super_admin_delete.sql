-- Migration: Allow Super Admins to delete closed OPs
-- Date: 2026-04-20

DROP POLICY IF EXISTS "Enable delete for admins" ON public.purchase_orders;

CREATE POLICY "Enable delete for super admins or admins with open OPs" 
ON public.purchase_orders FOR DELETE 
TO authenticated 
USING (
    -- Permite se for Super Admin (mesmo Baixada)
    (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true
    ))
    OR
    -- Ou se for Admin normal mas a OP ainda não estiver baixada
    (
        status != 'Baixada' AND
        (EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        ))
    )
);
