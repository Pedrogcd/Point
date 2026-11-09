// Arquétipos como disciplinas (04/11, docs/revisao/ATUALIZACAO_04-11.md).
// Fonte de verdade: data/arquetipos.json (8 arquétipos × 3 variações = 24
// disciplinas, cada uma com 6 habilidades). Tudo provisório — textos e
// números ficam SÓ no JSON; este arquivo apenas monta, a partir dele:
//   - DISCIPLINAS_ARQUETIPO: uma entrada por variação, no mesmo formato de
//     data/magias.js:DISCIPLINAS (ocupa 1 slot de disciplina; somada lá);
//   - BONUS_GRAU_POR_ARQUETIPO: as 3 fixas (fixaCombate + outrasFixas),
//     traduzidas de nome pra chave de engine.js:PROFICIENCIAS_LIST — o +1
//     grau, a escolha livre de Combate e o teto 3 são aplicados em
//     racasCatalogo.js:bonusGrauDoPersonagem, igual aos ofícios;
//   - as habilidades do personagem pra exibir na ficha (cartões), com as
//     gerais do arquétipo uma vez só quando há duas variações dele, e o
//     custo interpretado (MP, SP ou "1x por cena").
// Nada de efeito de combate é automatizado aqui (spec, tarefa 5).
import ARQUETIPOS_DATA from "./arquetipos.json" with { type: "json" };
import { PROFICIENCIAS_LIST } from "../engine.js";

export const ARQUETIPOS = ARQUETIPOS_DATA;

export const TIPO_DISCIPLINA_ARQUETIPO = "arquetipo";

function slug(texto) {
  return String(texto || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Nome da proficiência no JSON ("Armas", "Magias Gerais"...) -> chave do
// motor. null se o nome não existir (testado em arquetipos.test.js).
export function chaveDaProficiencia(nome) {
  const alvo = slug(nome);
  return PROFICIENCIAS_LIST.find((p) => slug(p.label) === alvo)?.key || null;
}

export function idDaVariacao(arquetipo, variacao) {
  return `arquetipo-${slug(arquetipo)}-${slug(variacao)}`;
}

function fixasDaVariacao(v) {
  return [v.fixaCombate, ...(v.outrasFixas || [])];
}

export const DISCIPLINAS_ARQUETIPO = ARQUETIPOS.flatMap((a) => (a.variacoes || []).map((v) => ({
  id: idDaVariacao(a.arquetipo, v.variacao),
  nome: `${a.arquetipo}: ${v.variacao}`,
  tipo: TIPO_DISCIPLINA_ARQUETIPO,
  arquetipo: a.arquetipo,
  variacao: v.variacao,
  temMagias: false,
  // 04/11: habilidades desbloqueadas aos poucos (ids em
  // slot.habilidadesAtivas, ver idDaHabilidade) — até as 6 da variação.
  habilidadesMax: (v.habilidades || []).length,
  bonusTexto: `Escolha: +1 grau numa proficiência de Combate à escolha. Fixas: ${fixasDaVariacao(v).join(", ")}, +1 grau cada (teto 3). Recurso: ${v.recurso}. Passiva: ${v.passiva}`,
  descricao: `${v.foco}. ${v.conceito}`,
})));

export const BONUS_GRAU_POR_ARQUETIPO = Object.fromEntries(ARQUETIPOS.flatMap((a) => (a.variacoes || []).map((v) => [
  idDaVariacao(a.arquetipo, v.variacao),
  fixasDaVariacao(v).map((nome) => ({ tipo: "proficiencia", chave: chaveDaProficiencia(nome), nome })).filter((b) => b.chave),
])));

// Dados completos da variação (passiva, fraqueza, descritores, habilidades).
export function getVariacaoPorId(id) {
  for (const a of ARQUETIPOS) {
    for (const v of a.variacoes || []) {
      if (idDaVariacao(a.arquetipo, v.variacao) === id) return v;
    }
  }
  return null;
}

export function ehDisciplinaDeArquetipo(id) {
  return !!BONUS_GRAU_POR_ARQUETIPO[id];
}

// "1 MP" -> { mp: 1 }; "1 SP" -> { sp: 1 }; "1x por cena" -> { porCena: true }.
// 06/11 (Maestria de Estilo): "0 MP (1ª vez da cena); depois 1 MP" ->
// { mp: 1, primeiraGratis: "cena" } e "0 MP (1ª vez do turno); 2 MP para
// repetir" -> { mp: 2, primeiraGratis: "turno" } — o primeiro uso da
// cena/turno sai de graça, os seguintes custam o MP.
// Qualquer outro texto: {} (só exibe).
export function custoDaHabilidade(custo) {
  const t = String(custo || "").trim().toLowerCase();
  const gratis = /^0\s*mp\s*\(1ª vez d[ao] (cena|turno)\)[;,]?\s*(?:depois\s*)?(\d+)\s*mp/.exec(t);
  if (gratis) return { mp: parseInt(gratis[2], 10), primeiraGratis: gratis[1] };
  // 09/11 (Resistir à Dor): custo E limite — "1 SP (1x por cena)".
  const comLimite = /^(\d+)\s*(mp|sp)\s*\(1x por cena\)$/.exec(t);
  if (comLimite) return { [comLimite[2]]: parseInt(comLimite[1], 10), porCena: true };
  if (/por cena/.test(t)) return { porCena: true };
  const m = /^(\d+)\s*(mp|sp)$/.exec(t);
  if (m) return { [m[2]]: parseInt(m[1], 10) };
  return {};
}

// "geral" | "compartilhada" | "unica" — a tag do cartão.
export function tagDaHabilidade(h) {
  if (h.geral) return "geral";
  if (/^compartilhada/i.test(h.origem || "")) return "compartilhada";
  return "unica";
}

// Id de uma habilidade dentro da variação (o que fica salvo em
// slot.habilidadesAtivas quando ela é desbloqueada).
export function idDaHabilidade(h) {
  return slug(h?.nome);
}

// 06/11 (Modal): habilidades com que a variação já começa, lidas da
// passiva no JSON ("Começa com a habilidade Maestria de Estilo, ...") — só
// valem nomes que existem entre as habilidades da variação. Devolve ids.
export function habilidadesIniciaisDaVariacao(disciplinaId) {
  const v = getVariacaoPorId(disciplinaId);
  if (!v) return [];
  const m = /come[cç]a com a habilidade ([^,.;]+)/i.exec(v.passiva || "");
  if (!m) return [];
  const alvo = slug(m[1]);
  return (v.habilidades || []).filter((h) => idDaHabilidade(h) === alvo).map(idDaHabilidade);
}

// 06/11 e 07/11: habilidades renomeadas/substituídas (id antigo -> novo),
// pra migrar slots salvos (personagens.js:migrarDisciplinas).
export const HABILIDADES_ARQUETIPO_RENOMEADAS = {
  "postura-agil": "postura-veloz",
  "troca-fluida": "postura-de-fogo",
  // 07/11 (Guerreiro Poder): Golpe Devastador foi substituído por Mãos Fortes.
  "golpe-devastador": "maos-fortes",
  // 09/11, segunda rodada (Guerreiro Preciso): Contragolpe foi substituído por Borrão.
  "contragolpe": "borrao",
};

// 09/11 (3ª e 4ª rodadas): trocas que só valem numa variação (o mesmo id
// continua existindo em outra — ex.: Empurrão segue no Protetor Muralha).
export const HABILIDADES_RENOMEADAS_POR_VARIACAO = {
  "arquetipo-guerreiro-poder": { empurrao: "poder" },
  "arquetipo-barbaro-furia": { "golpe-descontrolado": "tudo-ou-nada" },
};

// 09/11 (3ª rodada): habilidades passivas que dão grau quando desbloqueadas
// — Guerreiro Poder, "Poder": +1 grau em Força (teto 3, o padrão de
// racasCatalogo.js:comGrausEfetivos).
export const BONUS_GRAU_POR_HABILIDADE_ARQUETIPO = {
  "arquetipo-guerreiro-poder": { poder: [{ tipo: "atributo", chave: "forca" }] },
};

// Habilidades das disciplinas de arquétipo do personagem (lista de slots
// já resolvida, ver racasCatalogo.js:disciplinasDoPersonagem), na ordem dos
// slots. Gerais do mesmo arquétipo aparecem uma vez só (spec, regra 2).
// `chave` identifica a habilidade pro controle de "1x por cena".
// 04/11 (pedido do Pedro): o arquétipo não vem com todas as habilidades —
// elas são desbloqueadas com o tempo (ids em slot.habilidadesAtivas). Por
// padrão só devolve as desbloqueadas; uma geral conta como desbloqueada se
// estiver marcada em qualquer variação do mesmo arquétipo. `todas: true`
// devolve todas, com `desbloqueada` em cada uma.
export function habilidadesDeArquetipoDoPersonagem(slots, { todas = false } = {}) {
  const lista = (slots || []).filter(Boolean);
  const geraisDesbloqueadas = new Set();
  for (const slot of lista) {
    const v = getVariacaoPorId(slot.disciplinaId);
    if (!v) continue;
    for (const h of v.habilidades || []) {
      if (h.geral && (slot.habilidadesAtivas || []).includes(idDaHabilidade(h))) geraisDesbloqueadas.add(`${slug(v.arquetipo)}:${idDaHabilidade(h)}`);
    }
  }
  const out = [];
  const vistas = new Set();
  for (const slot of lista) {
    const v = getVariacaoPorId(slot.disciplinaId);
    if (!v) continue;
    for (const h of v.habilidades || []) {
      const chave = h.geral ? `${slug(v.arquetipo)}:${idDaHabilidade(h)}` : `${slot.disciplinaId}:${idDaHabilidade(h)}`;
      if (vistas.has(chave)) continue;
      const desbloqueada = h.geral ? geraisDesbloqueadas.has(chave) : (slot.habilidadesAtivas || []).includes(idDaHabilidade(h));
      if (!desbloqueada && !todas) continue;
      vistas.add(chave);
      out.push({ ...h, chave, desbloqueada, arquetipo: v.arquetipo, variacao: v.variacao, disciplinaId: slot.disciplinaId, tag: tagDaHabilidade(h), custoInfo: custoDaHabilidade(h.custo) });
    }
  }
  return out;
}
