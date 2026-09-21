-- Point (universo Amaranth) — schema do Supabase
--
-- Rode este arquivo inteiro no SQL Editor do Supabase (Dashboard do projeto
-- → SQL Editor → New query → cola tudo → Run). É seguro rodar mais de uma
-- vez (idempotente: usa "if not exists" e "drop policy if exists" antes de
-- recriar), então não tem problema rodar de novo se mudar alguma coisa aqui.
--
-- O que isso cria:
--   1. point_kv       — tabela chave/valor, espelha as chaves que o app já
--                        salvava no localStorage (point-characters,
--                        point-kingdoms, point-gods, point-sagas,
--                        point-objectives, point-hp-reset-v1).
--   2. bucket "retratos" — Storage pra imagens de personagem.
--
-- Regra de acesso nos dois: QUALQUER UM pode ler (o app funciona em modo
-- leitura sem login); só um usuário autenticado (o mestre, logado com
-- e-mail/senha) pode escrever.

-- ---------------------------------------------------------------------
-- 1. Tabela chave/valor
-- ---------------------------------------------------------------------

create table if not exists public.point_kv (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.point_kv enable row level security;

drop policy if exists "point_kv leitura pública" on public.point_kv;
create policy "point_kv leitura pública"
  on public.point_kv for select
  to anon, authenticated
  using (true);

drop policy if exists "point_kv insert autenticado" on public.point_kv;
create policy "point_kv insert autenticado"
  on public.point_kv for insert
  to authenticated
  with check (true);

drop policy if exists "point_kv update autenticado" on public.point_kv;
create policy "point_kv update autenticado"
  on public.point_kv for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "point_kv delete autenticado" on public.point_kv;
create policy "point_kv delete autenticado"
  on public.point_kv for delete
  to authenticated
  using (true);

-- Mantém updated_at em dia sozinho a cada UPDATE (o app também manda o
-- valor dele, mas isso cobre qualquer escrita futura que esqueça).
create or replace function public.point_kv_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists point_kv_set_updated_at on public.point_kv;
create trigger point_kv_set_updated_at
  before update on public.point_kv
  for each row
  execute function public.point_kv_set_updated_at();

-- ---------------------------------------------------------------------
-- 2. Bucket de imagens (retratos de personagem)
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('retratos', 'retratos', true)
on conflict (id) do update set public = true;

drop policy if exists "retratos leitura pública" on storage.objects;
create policy "retratos leitura pública"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'retratos');

drop policy if exists "retratos insert autenticado" on storage.objects;
create policy "retratos insert autenticado"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'retratos');

drop policy if exists "retratos update autenticado" on storage.objects;
create policy "retratos update autenticado"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'retratos')
  with check (bucket_id = 'retratos');

drop policy if exists "retratos delete autenticado" on storage.objects;
create policy "retratos delete autenticado"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'retratos');
