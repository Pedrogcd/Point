// Catálogo de raças/habilidades raciais — fonte única: catalogo-racas.json.
// Funções puras (sem React), usadas pela UI (point-amaranth-app.jsx) e pela
// migração de fichas antigas (personagens.js); testadas em racasCatalogo.test.js.
import catalogo from "./catalogo-racas.json" with { type: "json" };
import { GRADE_ORDER, PROFICIENCIAS_LIST } from "./engine.js";

export const CATALOGO_RACAS = catalogo;

export function listaRacas() {
  return catalogo.racas;
}

export function encontrarRaca(racaId) {
  if (!racaId) return null;
  return catalogo.racas.find((r) => r.id === racaId) || null;
}

export function encontrarPrincipal(raca, principalId) {
  if (!raca || !principalId) return null;
  return raca.principais.find((p) => p.id === principalId) || null;
}

export function encontrarSecundaria(raca, secundariaId) {
  if (!raca || !secundariaId) return null;
  return raca.secundarias.find((s) => s.id === secundariaId) || null;
}

// União sem duplicar dos descritores das entradas ativas (habilidade principal
// e/ou secundária escolhidas). Disciplina (Humano) não carrega descritor no
// catálogo, então nunca entra aqui — ainda não há regra ligada a eles (só
// armazenamento), por pedido do Pedro.
export function descritoresDeSelecao(...entradas) {
  const vistos = new Set();
  const resultado = [];
  for (const entrada of entradas) {
    for (const d of entrada?.descritores || []) {
      if (!vistos.has(d)) {
        vistos.add(d);
        resultado.push(d);
      }
    }
  }
  return resultado;
}

// Checa se o personagem tem um descritor ativo (vindo de `character.descritores`
// — já é a união sem duplicar das habilidades principal/secundária escolhidas,
// ver descritoresDeSelecao). Existe pra não repetir `(character?.descritores ||
// []).includes(id)` em todo lugar que precisa checar um descritor específico
// (ex.: Sortudo, Ignora Blindado) — hoje é só esse `includes`, mas é o ponto
// único pra outras fontes de descritor (ex.: armadura dando Blindado) entrarem
// no futuro sem precisar caçar cada chamada.
export function temDescritor(character, id) {
  return (character?.descritores || []).includes(id);
}

// Remapeamento do esquema antigo (racaId/habilidadePrincipalId/habilidadeSecundariaId,
// enviado nos PRs #30/#31) pro novo (raca/habilidadePrincipal) — os ids de
// habilidade principal mudaram de formato (ex.: "sharkan" -> "descendentes-de-sharkan").
// A raça usa o mesmo id nos dois esquemas, sem remapeamento. A secundária antiga
// não migra: o conceito mudou (antes era só "outra habilidade principal da
// mesma raça", decorativa e neutra; agora é uma lista própria e distinta,
// secundarias[]) — não existe de-para seguro entre os dois.
export const REMAPEAMENTO_HABILIDADE_PRINCIPAL_LEGADO = {
  mana_concentrada: "mana-concentrada",
  mana_fluida: "mana-fluida",
  mana_estatica: "mana-estatica",
  sharkan: "descendentes-de-sharkan",
  arcani: "descendentes-de-arcani",
  sabato: "descendentes-de-sabato",
  coelho_bode: "coelho-bode",
  leonino: "leonino",
  reptiliano: "reptiliano",
  lobo_canino: "lobo-canino",
  urso: "urso",
  radiante: "cla-radiante",
  noctis: "cla-noctis",
  corvus: "cla-corvus",
  seasus: "cla-seasus",
  natrus: "cla-natrus",
  texoni: "texoni",
  kutrefas: "kutrefas",
  terramak: "terramak",
  kurlav: "kurlav",
  haxos: "haxos",
  anjo: "anjo",
  demonio: "demonio",
  fada: "fada",
};

// Resolve os 6 campos novos (raca/habilidadePrincipal/habilidadeSecundaria/
// disciplinaHumano/descritores/bonusGrauEscolha) a partir de uma ficha que pode
// já estar no esquema novo, no esquema antigo (racaId/...Id), ou em nenhum dos
// dois (ficha anterior a qualquer um dos dois sistemas).
export function migrarSelecaoRacaLegado(ch) {
  if (ch.raca !== undefined) {
    return {
      raca: ch.raca,
      habilidadePrincipal: ch.habilidadePrincipal ?? null,
      habilidadeSecundaria: ch.habilidadeSecundaria ?? null,
      disciplinaHumano: ch.disciplinaHumano ?? null,
      descritores: ch.descritores ?? [],
      bonusGrauEscolha: ch.bonusGrauEscolha ?? {},
    };
  }
  const racaId = ch.racaId ?? null;
  const principalIdLegado = ch.habilidadePrincipalId ?? null;
  const habilidadePrincipal = principalIdLegado
    ? (REMAPEAMENTO_HABILIDADE_PRINCIPAL_LEGADO[principalIdLegado] || null)
    : null;
  return { raca: racaId, habilidadePrincipal, habilidadeSecundaria: null, disciplinaHumano: null, descritores: [], bonusGrauEscolha: {} };
}

// Mapeamento manual (não vem do catalogo-racas.json) de quais habilidades dão
// +1 grau PERMANENTE numa proficiência ou atributo — pedido do Pedro: "coloque
// na ficha pintado de azul... mostrar que o crescimento da perícia é devido a
// uma habilidade". É DISTINTO dos vários "+1 dado"/"+1d10" condicionais que
// outras partes do `efeito` também descrevem (esses valem só numa rolagem
// específica, não mudam o grau salvo — fora do escopo daqui).
//
// Curado à mão, não derivado de `bonus[]`, porque esse array do catálogo é
// incompleto pra esse fim — ex.: "Descendentes de Sabato" só tem "+1 grau em
// Força" no `efeito`, nunca em `bonus[]`. Toda entrada aqui foi conferida
// contra o `efeito` de cada uma das habilidades do catálogo em 13/10 (catálogo
// "2026-10-11" v3 — Elfo reescrito com vários bônus de grau novos, e
// Resistência Física/Resistência Mágica entraram como proficiências que
// também recebem esse bônus, igual qualquer outra): essas 22 habilidades
// mencionam "+1 grau" ou "+1 na(s) proficiência(s)" — 21 têm uma chave FIXA
// (tabela abaixo) e 2 (Mana Concentrada, Homúnculo) deixam a escolha pro
// jogador (ver BONUS_GRAU_ESCOLHA_POR_HABILIDADE); Homúnculo tem as duas
// coisas ao mesmo tempo (Atletismo é fixo, Força-ou-Destreza é escolha). Se o
// catálogo mudar nomes de raça/efeito de novo, conferir aqui também
// (racasCatalogo.test.js tem uma checagem automática: toda habilidade cujo
// `efeito` contenha essas frases-chave precisa estar numa das duas tabelas, e
// vice-versa).
export const BONUS_GRAU_POR_HABILIDADE = {
  "descendentes-de-sabato": [{ tipo: "atributo", chave: "forca" }],
  goethiano: [{ tipo: "atributo", chave: "vigor" }],
  homunculo: [{ tipo: "proficiencia", chave: "atletismo" }],
  "coelho-bode": [{ tipo: "proficiencia", chave: "sobrevivencia" }],
  leonino: [{ tipo: "proficiencia", chave: "investigacao" }],
  reptiliano: [{ tipo: "proficiencia", chave: "intimidacao" }],
  "lobo-canino": [{ tipo: "proficiencia", chave: "lideranca" }],
  "raposa-kitsune": [
    { tipo: "proficiencia", chave: "intuicao" },
    { tipo: "proficiencia", chave: "malandragem" },
  ],
  "sentidos-agucados": [
    { tipo: "atributo", chave: "perspicacia" },
    { tipo: "proficiencia", chave: "intuicao" },
  ],
  "camuflagem-animal": [
    { tipo: "proficiencia", chave: "furtividade" },
    { tipo: "proficiencia", chave: "sobrevivencia" },
  ],
  "escamas-fortes": [{ tipo: "atributo", chave: "forca" }],
  "corpo-resistente": [{ tipo: "atributo", chave: "vigor" }],
  "mana-estatica": [
    { tipo: "proficiencia", chave: "resistFisicaProf" },
    { tipo: "proficiencia", chave: "resistMagicaProf" },
  ],
  "pele-grossa": [
    { tipo: "proficiencia", chave: "resistFisicaProf" },
    { tipo: "proficiencia", chave: "resistMagicaProf" },
  ],
  "cla-radiante": [{ tipo: "atributo", chave: "carisma" }],
  "cla-noctis": [{ tipo: "atributo", chave: "manipulacao" }],
  "cla-corvus": [
    { tipo: "proficiencia", chave: "furtividade" },
    { tipo: "proficiencia", chave: "magiasOfensivas" },
  ],
  "cla-seasus": [
    { tipo: "proficiencia", chave: "magiasOfensivas" },
    { tipo: "proficiencia", chave: "magiasGerais" },
    { tipo: "proficiencia", chave: "resistMagicaProf" },
  ],
  "cla-natrus": [
    { tipo: "proficiencia", chave: "resistMagicaProf" },
    { tipo: "proficiencia", chave: "sobrevivencia" },
  ],
  "resistencia-a-dor": [{ tipo: "atributo", chave: "resolucao" }],
  "arte-e-tradicao": [
    { tipo: "proficiencia", chave: "etiqueta" },
    { tipo: "proficiencia", chave: "atuacao" },
    { tipo: "proficiencia", chave: "malandragem" },
  ],
};

// Habilidades cujo bônus de grau é à ESCOLHA do jogador (pedido confirmado em
// 13/10) — a chave concreta não vem do catálogo, é guardada por personagem em
// `character.bonusGrauEscolha[habilidadeId]` (preenchida pela UI em
// CharacterForm). `opcoes` restringe o que é um valor válido: Mana Concentrada
// aceita qualquer proficiência do catálogo ("uma proficiência à sua
// escolha"); Homúnculo só Força ou Destreza ("+1 grau em Força ou Destreza").
export const BONUS_GRAU_ESCOLHA_POR_HABILIDADE = {
  "mana-concentrada": { tipo: "proficiencia", opcoes: PROFICIENCIAS_LIST.map((p) => p.key) },
  homunculo: { tipo: "atributo", opcoes: ["forca", "destreza"] },
};

// Soma os bônus de grau das habilidades ATIVAS do personagem (principal +
// secundária — Disciplina do Humano não dá bônus de grau, não tem entrada no
// catálogo pra isso). Duas habilidades podem bonificar a mesma chave — os
// passos somam antes de aplicar o teto (ver grauComBonus). Quando a habilidade
// tem bônus à escolha (BONUS_GRAU_ESCOLHA_POR_HABILIDADE) e o jogador ainda não
// escolheu (ou escolheu algo fora de `opcoes`), esse bônus simplesmente não
// soma nada — não há valor "padrão" que faça sentido escolher por ele.
export function bonusGrauDoPersonagem(character) {
  const raca = encontrarRaca(character?.raca);
  const principal = encontrarPrincipal(raca, character?.habilidadePrincipal);
  const secundaria = encontrarSecundaria(raca, character?.habilidadeSecundaria);
  const resultado = { proficiencias: {}, atributos: {} };
  for (const hab of [principal, secundaria]) {
    if (!hab) continue;
    const bonus = BONUS_GRAU_POR_HABILIDADE[hab.id];
    if (bonus) {
      for (const b of bonus) {
        const alvo = b.tipo === "atributo" ? resultado.atributos : resultado.proficiencias;
        alvo[b.chave] = (alvo[b.chave] || 0) + 1;
      }
    }
    const escolha = BONUS_GRAU_ESCOLHA_POR_HABILIDADE[hab.id];
    if (escolha) {
      const chave = character?.bonusGrauEscolha?.[hab.id];
      if (chave && escolha.opcoes.includes(chave)) {
        const alvo = escolha.tipo === "atributo" ? resultado.atributos : resultado.proficiencias;
        alvo[chave] = (alvo[chave] || 0) + 1;
      }
    }
  }
  return resultado;
}

// Aplica `passos` graus de bônus a partir de `grauBase`, com teto em C — regra
// do Pedro: "aumentos de proficiência e atributo de raça são +1 grau, com
// teto C". Grau já C ou acima não sobe mais por esse bônus (nem desce).
export function grauComBonus(grauBase, passos) {
  const base = grauBase || "E";
  if (!passos) return base;
  const baseIdx = Math.max(0, GRADE_ORDER.indexOf(base));
  const tetoIdx = GRADE_ORDER.indexOf("C");
  if (baseIdx >= tetoIdx) return base;
  return GRADE_ORDER[Math.min(tetoIdx, baseIdx + passos)];
}

// Devolve `{ character, bonusAplicado }`: uma cópia do personagem com
// proficiencias/atributosGerais já no grau EFETIVO (base + bônus racial, com
// teto C) — é isso que deve ir pra qualquer cálculo de dado (ataques, testes,
// barras da ficha), nunca o personagem cru. `bonusAplicado` dá, por chave, o
// número de passos REALMENTE aplicados (já descontado o teto — ex.: uma
// habilidade que daria +1 num grau já C não aplica nada) — é o que a UI usa
// pra saber quantos segmentos pintar de azul na barrinha.
// Sem nenhum bônus, devolve o mesmo `character` por referência (sem clonar),
// pra não forçar re-render à toa em componentes que comparam por referência.
export function comGrausEfetivos(character) {
  if (!character) return { character, bonusAplicado: { proficiencias: {}, atributos: {} } };
  const bonus = bonusGrauDoPersonagem(character);
  const bonusAplicado = { proficiencias: {}, atributos: {} };
  if (Object.keys(bonus.proficiencias).length === 0 && Object.keys(bonus.atributos).length === 0) {
    return { character, bonusAplicado };
  }
  const proficiencias = { ...character.proficiencias };
  for (const [chave, passos] of Object.entries(bonus.proficiencias)) {
    const baseIdx = Math.max(0, GRADE_ORDER.indexOf(proficiencias[chave] || "E"));
    const novoGrau = grauComBonus(proficiencias[chave], passos);
    proficiencias[chave] = novoGrau;
    bonusAplicado.proficiencias[chave] = GRADE_ORDER.indexOf(novoGrau) - baseIdx;
  }
  const atributosGerais = { ...character.atributosGerais };
  for (const [chave, passos] of Object.entries(bonus.atributos)) {
    const baseIdx = Math.max(0, GRADE_ORDER.indexOf(atributosGerais[chave] || "E"));
    const novoGrau = grauComBonus(atributosGerais[chave], passos);
    atributosGerais[chave] = novoGrau;
    bonusAplicado.atributos[chave] = GRADE_ORDER.indexOf(novoGrau) - baseIdx;
  }
  return { character: { ...character, proficiencias, atributosGerais }, bonusAplicado };
}
