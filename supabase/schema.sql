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
--   3. point_personagens — uma linha por ficha, com Realtime (29/10).
--
-- Regra de acesso nos dois: QUALQUER UM pode ler e escrever (o app não exige
-- login — ver CONTEXTO.md, "Por que tiramos a exigência de login"). As
-- políticas liberam os papéis anon e authenticated igualmente; não há
-- distinção de "mestre" no banco.

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
drop policy if exists "point_kv insert" on public.point_kv;
create policy "point_kv insert"
  on public.point_kv for insert
  to anon, authenticated
  with check (true);

drop policy if exists "point_kv update autenticado" on public.point_kv;
drop policy if exists "point_kv update" on public.point_kv;
create policy "point_kv update"
  on public.point_kv for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "point_kv delete autenticado" on public.point_kv;
drop policy if exists "point_kv delete" on public.point_kv;
create policy "point_kv delete"
  on public.point_kv for delete
  to anon, authenticated
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
drop policy if exists "retratos insert" on storage.objects;
create policy "retratos insert"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'retratos');

drop policy if exists "retratos update autenticado" on storage.objects;
drop policy if exists "retratos update" on storage.objects;
create policy "retratos update"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'retratos')
  with check (bucket_id = 'retratos');

drop policy if exists "retratos delete autenticado" on storage.objects;
drop policy if exists "retratos delete" on storage.objects;
create policy "retratos delete"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'retratos');
-- ---------------------------------------------------------------------
-- 3. Fichas em tempo real (29/10) — uma linha por ficha
-- ---------------------------------------------------------------------
-- Antes as fichas viviam todas em point_kv ("point-characters"), num array
-- único regravado inteiro a cada alteração: quem salvava por último apagava
-- a mudança do outro, e ninguém via nada sem recarregar. Agora cada ficha
-- é uma linha; o app manda só os campos de topo que mudaram, pela função
-- point_personagem_patch (data || patch), e o Realtime avisa todas as telas.
-- "point-characters" em point_kv fica como estava (cópia antiga, só
-- leitura de migração: o primeiro acesso da versão nova copia as fichas de
-- lá pra cá quando esta tabela está vazia).

create table if not exists public.point_personagens (
  id text primary key,
  data jsonb not null,
  ordem double precision not null default 0,
  updated_at timestamptz not null default now(),
  updated_by text
);

alter table public.point_personagens enable row level security;

drop policy if exists "point_personagens select" on public.point_personagens;
create policy "point_personagens select" on public.point_personagens for select to anon, authenticated using (true);
drop policy if exists "point_personagens insert" on public.point_personagens;
create policy "point_personagens insert" on public.point_personagens for insert to anon, authenticated with check (true);
drop policy if exists "point_personagens update" on public.point_personagens;
create policy "point_personagens update" on public.point_personagens for update to anon, authenticated using (true) with check (true);
drop policy if exists "point_personagens delete" on public.point_personagens;
create policy "point_personagens delete" on public.point_personagens for delete to anon, authenticated using (true);

drop trigger if exists point_personagens_set_updated_at on public.point_personagens;
create trigger point_personagens_set_updated_at
  before update on public.point_personagens
  for each row
  execute function public.point_kv_set_updated_at();

-- Grava os campos alterados de uma ficha, mesclando com o que já está no
-- banco (insere se ainda não existir). Campo com valor null = apagar.
create or replace function public.point_personagem_patch(p_id text, p_patch jsonb, p_ordem double precision default null, p_cliente text default null)
returns void
language plpgsql
security invoker
as $$
declare
  v_set jsonb;
  v_del text[];
begin
  -- Só campos de topo: valor null no patch = apagar aquele campo (nulls
  -- dentro dos campos ficam como estão).
  select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) into v_set
    from jsonb_each(p_patch) as e(k, v) where v <> 'null'::jsonb;
  select coalesce(array_agg(k), '{}'::text[]) into v_del
    from jsonb_each(p_patch) as e(k, v) where v = 'null'::jsonb;
  insert into public.point_personagens (id, data, ordem, updated_by)
  values (p_id, v_set, coalesce(p_ordem, extract(epoch from now()) * 1000), p_cliente)
  on conflict (id) do update
    set data = (public.point_personagens.data || v_set) - v_del,
        updated_by = excluded.updated_by;
end;
$$;

grant execute on function public.point_personagem_patch(text, jsonb, double precision, text) to anon, authenticated;

-- Realtime: avisa as telas abertas quando uma ficha ou uma chave muda.
alter table public.point_personagens replica identity full;
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'point_personagens') then
    alter publication supabase_realtime add table public.point_personagens;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'point_kv') then
    alter publication supabase_realtime add table public.point_kv;
  end if;
end;
$$;
