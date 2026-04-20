-- Migration: Harden RLS Policies
-- Date: 2026-04-20

-- 1. Hardening news_posts (Only Admins can manage content)
DROP POLICY IF EXISTS "News posts are insertable by authenticated users." ON news_posts;
DROP POLICY IF EXISTS "News posts are updatable by authenticated users." ON news_posts;
DROP POLICY IF EXISTS "News posts are deletable by authenticated users." ON news_posts;

CREATE POLICY "News posts are manageable by admins ONLY." ON news_posts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- 2. Hardening purchase_orders (Only assigned users or admins can update)
DROP POLICY IF EXISTS "Enable update for all authenticated users" ON public.purchase_orders;

CREATE POLICY "Enable update for assigned users or admins" 
ON public.purchase_orders FOR UPDATE 
TO authenticated 
USING (
    (auth.uid() = ANY(assigned_users)) OR 
    (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    ))
);

-- 3. Hardening receipts (Only admins can update/delete records)
DROP POLICY IF EXISTS "Permitir atualização para todos os usuários autenticados" ON receipts;
DROP POLICY IF EXISTS "Permitir exclusão para administradores" ON receipts;

CREATE POLICY "Manage receipts is admin only" 
ON receipts FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
);

-- Note: Keep SELECT for authenticated as everyone needs to see the history
CREATE POLICY "View receipts for all authenticated" 
ON receipts FOR SELECT 
TO authenticated 
USING (true);

-- 4. Hardening operations (Only admins can create/update operations)
DROP POLICY IF EXISTS "Operations are insertable by authenticated users." ON operations;
DROP POLICY IF EXISTS "Operations are updatable by authenticated users." ON operations;
DROP POLICY IF EXISTS "Operations are deletable by authenticated users." ON operations;

CREATE POLICY "Operations management is admin only" 
ON operations FOR ALL 
TO authenticated 
USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
);
