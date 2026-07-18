-- ============================================================================
-- PADRÃO CONSULTORA (para quem JÁ rodou tipo_pessoa_consultora.sql)
--
-- 1) Torna 'consultora' o valor padrão de people.person_type.
-- 2) Reclassifica os cadastros antigos que foram auto-marcados como 'cliente'
--    (na primeira migração) para 'consultora'.
--
-- ATENÇÃO: rode UMA ÚNICA VEZ. O UPDATE converte TODOS os 'cliente' atuais em
-- 'consultora'. Se depois disso você marcar alguém como Cliente manualmente,
-- NÃO rode este arquivo de novo (senão ele reverteria essa marcação).
--
-- COMO USAR: cole no SQL Editor do Supabase e execute.
-- ============================================================================

-- 1) Novo valor padrão da coluna
alter table public.people
  alter column person_type set default 'consultora';

-- 2) Reclassifica os antigos genéricos (auto-marcados como 'cliente')
update public.people
   set person_type = 'consultora'
 where person_type = 'cliente';
