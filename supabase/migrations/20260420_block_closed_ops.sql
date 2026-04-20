-- Migration: Block updates and deletes on closed OPs
-- Date: 2026-04-20

-- 1. Hardening purchase_orders (Block any update or delete if status is 'Baixada')
DROP POLICY IF EXISTS "Enable update for assigned users or admins" ON public.purchase_orders;

CREATE POLICY "Enable update for assigned users or admins" 
ON public.purchase_orders FOR UPDATE 
TO authenticated 
USING (
    status != 'Baixada' AND (
      (auth.uid() = ANY(assigned_users)) OR 
      (EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE profiles.id = auth.uid() AND profiles.is_admin = true
      ))
    )
);

-- Separate policy for admins to un-close a card if absolutely necessary? 
-- The user said "None", but usually admins Need an escape hatch. 
-- However, I will strictly follow "Nenhuma alteração" for now.

DROP POLICY IF EXISTS "Enable delete for admins" ON public.purchase_orders;
CREATE POLICY "Enable delete for admins" 
ON public.purchase_orders FOR DELETE 
TO authenticated 
USING (
    status != 'Baixada' AND
    (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    ))
);
