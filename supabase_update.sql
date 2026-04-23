-- SQL para atualizar a tabela de recebimentos no Supabase

-- Adicionar colunas para detalhes de divergência
ALTER TABLE receipts 
ADD COLUMN IF NOT EXISTS divergence_observation TEXT,
ADD COLUMN IF NOT EXISTS divergence_photo_url TEXT;

-- Nota: Se houver uma constraint de CHECK no campo 'status', você pode precisar atualizá-la.
-- Na maioria das configurações simples, o campo é apenas TEXT.
-- Se houver erro de violação de constraint ao mudar para 'Divergente' ou 'Concluído', execute:
-- ALTER TABLE receipts DROP CONSTRAINT IF EXISTS receipts_status_check;
-- ALTER TABLE receipts ADD CONSTRAINT receipts_status_check CHECK (status IN ('Pendente', 'Enviado', 'Recebido', 'Divergente', 'Concluído'));
