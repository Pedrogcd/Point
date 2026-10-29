// Sincronização em tempo real entre pessoas (29/10, pedido do Pedro: "é para
// ser um site de operação simultânea entre pessoas").
//
// Antes: as 51 fichas viviam numa ÚNICA linha do Supabase (point_kv,
// chave "point-characters") e cada alteração regravava o array inteiro —
// ninguém via a mudança do outro sem recarregar, e quem salvava por último
// apagava a alteração de quem salvou antes (mesmo em fichas diferentes).
//
// Agora: tabela point_personagens, UMA LINHA POR FICHA (ver
// supabase/schema.sql). Cada alteração manda só os campos de topo que
// mudaram, via a função point_personagem_patch, que faz `data || patch` no
// banco — duas pessoas mexendo em campos diferentes da mesma ficha não se
// apagam. O Realtime do Supabase avisa todas as telas abertas na hora.
//
// Este arquivo tem duas partes:
//   1. Funções PURAS (diff/mescla), testadas em sincronizacao.test.js.
//   2. O adaptador do Supabase (carregar, enviar, apagar, assinar), que só
//      roda com o cliente configurado.

// ---------------------------------------------------------------------
// 1. Funções puras
// ---------------------------------------------------------------------

const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Campos de topo que mudaram de `anterior` pra `atual`. Campo que sumiu vai
// como null (o `||` do Postgres não apaga chave; null é o "apagado" aqui).
// Sem `anterior` (ficha nova), devolve a ficha inteira.
export function diffPersonagem(anterior, atual) {
  if (!atual) return {};
  if (!anterior) return { ...atual };
  const patch = {};
  for (const chave of Object.keys(atual)) {
    if (!igual(anterior[chave], atual[chave])) patch[chave] = atual[chave];
  }
  for (const chave of Object.keys(anterior)) {
    if (!(chave in atual)) patch[chave] = null;
  }
  return patch;
}

// Compara as fichas atuais (array) com o último estado confirmado do banco
// (`snapshot`: Map id -> ficha). Devolve o que precisa subir.
export function diffPersonagens(snapshot, personagens) {
  const alterados = [];
  const ids = new Set();
  for (const p of personagens || []) {
    if (!p?.id) continue;
    ids.add(p.id);
    const patch = diffPersonagem(snapshot.get(p.id), p);
    if (Object.keys(patch).length > 0) alterados.push({ id: p.id, patch, novo: !snapshot.has(p.id) });
  }
  const removidos = [...snapshot.keys()].filter((id) => !ids.has(id));
  return { alterados, removidos };
}

// Aplica um patch (com null = apagar campo) em cima de uma ficha.
export function aplicarPatch(base, patch) {
  const out = { ...(base || {}) };
  for (const [chave, valor] of Object.entries(patch || {})) {
    if (valor === null) delete out[chave];
    else out[chave] = valor;
  }
  return out;
}

// Linha que chegou do banco (Realtime ou recarga): `{ id, data, ordem }`.
// Mantém por cima o que esta tela ainda não enviou (diferença entre a ficha
// local e o snapshot antigo) — assim uma edição em andamento não é
// atropelada pela mudança de outra pessoa. Devolve o novo array e atualiza
// `snapshot` (Map) e `ordens` (Map id -> ordem) no lugar.
export function aplicarLinhaRemota(personagens, snapshot, ordens, linha) {
  if (!linha?.id || !linha.data) return personagens;
  const { id, data } = linha;
  if (linha.ordem != null) ordens.set(id, linha.ordem);
  const local = personagens.find((p) => p.id === id);
  const pendente = local ? diffPersonagem(snapshot.get(id), local) : {};
  snapshot.set(id, data);
  const novo = aplicarPatch(data, pendente);
  if (local) {
    if (igual(local, novo)) return personagens;
    return personagens.map((p) => (p.id === id ? novo : p));
  }
  // Ficha nova vinda de outra pessoa: entra na posição da `ordem`.
  const ordemNova = ordens.get(id) ?? Infinity;
  const idx = personagens.findIndex((p) => (ordens.get(p.id) ?? Infinity) > ordemNova);
  if (idx === -1) return [...personagens, novo];
  return [...personagens.slice(0, idx), novo, ...personagens.slice(idx)];
}

// Ficha apagada por outra pessoa.
export function removerLinhaRemota(personagens, snapshot, ordens, id) {
  snapshot.delete(id);
  ordens.delete(id);
  return personagens.some((p) => p.id === id) ? personagens.filter((p) => p.id !== id) : personagens;
}

// Recarga completa (ao reconectar): aplica todas as linhas e remove as
// fichas que estavam no snapshot mas sumiram do banco.
export function aplicarRecarga(personagens, snapshot, ordens, linhas) {
  let out = personagens;
  const ids = new Set((linhas || []).map((l) => l.id));
  for (const id of [...snapshot.keys()]) {
    if (!ids.has(id)) out = removerLinhaRemota(out, snapshot, ordens, id);
  }
  for (const linha of linhas || []) out = aplicarLinhaRemota(out, snapshot, ordens, linha);
  return out;
}

// ---------------------------------------------------------------------
// 2. Adaptador do Supabase
// ---------------------------------------------------------------------

export const TABELA_PERSONAGENS = "point_personagens";

// Identificador desta aba (vai em updated_by — só pra diagnóstico).
export const ID_CLIENTE = `c-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;

// Lê todas as fichas da tabela, na ordem. null = não deu pra ler (sem
// Supabase, offline, tabela ainda não criada) — quem chama cai no modo
// antigo (cache local, sem sincronizar). [] = tabela vazia.
export async function carregarPersonagensRemotos(supabase) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from(TABELA_PERSONAGENS).select("id, data, ordem").order("ordem", { ascending: true });
    if (error || !Array.isArray(data)) return null;
    return data;
  } catch (e) {
    return null;
  }
}

// Sobe os campos alterados de uma ficha (insere se ainda não existir).
export async function enviarPatchPersonagem(supabase, id, patch, ordem) {
  const { error } = await supabase.rpc("point_personagem_patch", {
    p_id: id, p_patch: patch, p_ordem: ordem ?? null, p_cliente: ID_CLIENTE,
  });
  if (error) throw error;
}

export async function apagarPersonagemRemoto(supabase, id) {
  const { error } = await supabase.from(TABELA_PERSONAGENS).delete().eq("id", id);
  if (error) throw error;
}

// Assina as mudanças em tempo real: fichas (point_personagens) e as outras
// chaves compartilhadas (point_kv — reinos, deuses, encontro etc.).
// `aoReconectar` roda a cada conexão confirmada (a primeira e as que voltam
// depois de cair) — pra recarregar o que pode ter mudado entre a carga
// inicial e a assinatura, ou enquanto a conexão estava fora. Devolve uma
// função que cancela.
export function assinarMudancas(supabase, { aoMudarPersonagem, aoApagarPersonagem, aoMudarChave, aoReconectar, aoMudarStatus }) {
  if (!supabase) return () => {};
  const canal = supabase
    .channel("point-ao-vivo")
    .on("postgres_changes", { event: "*", schema: "public", table: TABELA_PERSONAGENS }, (payload) => {
      if (payload.eventType === "DELETE") {
        const id = payload.old?.id;
        if (id) aoApagarPersonagem?.(id);
      } else if (payload.new?.id) {
        aoMudarPersonagem?.(payload.new);
      }
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "point_kv" }, (payload) => {
      if (payload.new?.key) aoMudarChave?.(payload.new.key, payload.new.value);
    })
    .subscribe((status) => {
      aoMudarStatus?.(status);
      if (status === "SUBSCRIBED") aoReconectar?.();
    });
  return () => { supabase.removeChannel(canal); };
}
