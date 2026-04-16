-- Script para atualizar a tabela de perfis com categorias de usuário

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Ventisol';

-- Atualizar usuários existentes que não possuem categoria
UPDATE public.profiles SET category = 'Ventisol' WHERE category IS NULL;

-- Garantir que as categorias permitidas sejam consistentes (opcional, via CHECK)
-- ALTER TABLE public.profiles ADD CONSTRAINT check_category CHECK (category IN ('Ventisol', 'Bemplas', 'Recebimento'));
