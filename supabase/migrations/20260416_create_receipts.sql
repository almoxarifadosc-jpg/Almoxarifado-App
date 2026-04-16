-- Script para criar a tabela de recebimentos no Supabase

CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number TEXT NOT NULL,
    supplier_type TEXT NOT NULL CHECK (supplier_type IN ('Intercompany', 'Externo')),
    supplier_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Enviado', 'Recebido')),
    observation TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar Realtime para esta tabela
ALTER PUBLICATION supabase_realtime ADD TABLE receipts;

-- Configurar políticas de segurança (RLS) - Ajuste conforme necessário
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura para todos os usuários autenticados" 
ON receipts FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Permitir inserção para todos os usuários autenticados" 
ON receipts FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Permitir atualização para todos os usuários autenticados" 
ON receipts FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Permitir exclusão para administradores" 
ON receipts FOR DELETE 
TO authenticated 
USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));
