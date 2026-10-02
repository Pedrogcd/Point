// Mundo — funções puras para o conteúdo fixo de reinos e cidades (ver
// mundoDados.js), sem React, testáveis em mundo.test.js.
//
// Convenção dos dados: um texto pode ser uma string (igual para todos) ou um
// objeto { pub, gm }. O modo Jogador mostra só `pub`; o modo GM mostra `gm`
// quando existir, senão `pub`. Uma entrada só com `gm` some no modo Jogador.

export const MODOS_VISAO = ["jogador", "gm"];
export const MODO_PADRAO = "jogador";
export const CHAVE_MODO = "point-modo-visao";

export function normalizarModo(valor) {
  return MODOS_VISAO.includes(valor) ? valor : MODO_PADRAO;
}

export function textoVisivel(entrada, gm) {
  if (entrada == null) return null;
  if (typeof entrada === "string") return entrada;
  if (gm && entrada.gm != null) return entrada.gm;
  return entrada.pub ?? null;
}

// Filtra uma lista de entradas { pub, gm, ... } deixando só as visíveis no modo.
export function entradasVisiveis(lista, gm) {
  return (lista || []).filter((e) => textoVisivel(e, gm) != null);
}

// NPC como deve aparecer no modo: no GM, mescla o que existe em `npc.gm`
// (papel, kv, texto) e expõe segredo/ganchos; no Jogador, só a parte pública.
export function npcVisivel(npc, gm) {
  if (!npc) return null;
  const base = { id: npc.id, nome: npc.nome, papel: npc.papel, grupo: npc.grupo, img: npc.img || null, reino: npc.reino, cidade: npc.cidade, kv: { ...(npc.kv || {}) }, texto: npc.texto || "", segredo: null, ganchos: [] };
  if (!gm || !npc.gm) return base;
  const g = npc.gm;
  return {
    ...base,
    papel: g.papel || base.papel,
    kv: g.kv ? { ...g.kv } : base.kv,
    texto: g.texto || base.texto,
    segredo: g.segredo || null,
    ganchos: Array.isArray(g.ganchos) ? [...g.ganchos] : [],
  };
}

// Agrupa NPCs por reino e cidade, na ordem em que aparecem nos dados.
export function npcsPorReinoECidade(npcs) {
  const reinos = [];
  for (const n of npcs || []) {
    let r = reinos.find((x) => x.reino === n.reino);
    if (!r) { r = { reino: n.reino, cidades: [] }; reinos.push(r); }
    let c = r.cidades.find((x) => x.cidade === n.cidade);
    if (!c) { c = { cidade: n.cidade, npcs: [] }; r.cidades.push(c); }
    c.npcs.push(n);
  }
  return reinos;
}

// Posição (em % da imagem) do rótulo de cada reino no mapa do mundo.
export const MAPA_MUNDO = {
  imagem: "mundo/mapa-mundo.jpg",
  largura: 1024,
  altura: 768,
  pinos: {
    maxis: { x: 15, y: 3 },
    katalao: { x: 7, y: 26 },
    amaranth: { x: 53, y: 27 },
    suth: { x: 88, y: 7 },
    goethia: { x: 83, y: 65 },
    hetalion: { x: 23, y: 79 },
  },
};
