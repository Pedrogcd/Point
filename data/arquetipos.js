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
// Qualquer outro texto: {} (só exibe).
export function custoDaHabilidade(custo) {
  const t = String(custo || "").trim().toLowerCase();
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
