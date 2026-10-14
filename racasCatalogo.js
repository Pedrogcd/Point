// Catálogo de raças/habilidades raciais — fonte única: catalogo-racas.json.
// Funções puras (sem React), usadas pela UI (point-amaranth-app.jsx) e pela
// migração de fichas antigas (personagens.js); testadas em racasCatalogo.test.js.
import catalogo from "./catalogo-racas.json" with { type: "json" };
import { GRADE_ORDER, PROFICIENCIAS_LIST } from "./engine.js";
import { DISCIPLINAS, getDisciplinaPorId } from "./data/magias.js";

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
  goethiano: [{ tipo: "atributo", chave: "vigor", teto: "A" }],
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
  // "resistMagicaProf"/"magiasOfensivas" saíram do catálogo em 14/10 (docs/
  // MUDANCAS_RACAS_E_MAGIA.md) — as habilidades que bonificavam essas chaves
  // perderam essa parte do bônus (ver tabela "Raças" do documento). Goethiano
  // e Pele Grossa ganharam `teto: "A"` (sem teto C) nesse mesmo documento.
  "mana-estatica": [
    { tipo: "proficiencia", chave: "resistFisicaProf" },
  ],
  "pele-grossa": [
    { tipo: "proficiencia", chave: "resistFisicaProf", teto: "A" },
  ],
  "cla-radiante": [{ tipo: "atributo", chave: "carisma" }],
  "cla-noctis": [{ tipo: "atributo", chave: "manipulacao" }],
  "cla-corvus": [
    { tipo: "proficiencia", chave: "furtividade" },
  ],
  "cla-seasus": [
    { tipo: "proficiencia", chave: "magiasGerais" },
  ],
  "cla-natrus": [
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

// Bônus de grau à escolha concedido pela RAÇA em si, não por uma habilidade
// principal/secundária específica — novo em 14/10 (docs/MUDANCAS_RACAS_E_
// MAGIA.md, mencionado nas linhas de Clã Corvus e Mana Estática: "todo tipo
// de elfo"/"todo tipo de humano" ganha +1 grau, teto C, numa proficiência
// não-combate à escolha, valendo pra qualquer personagem dessa raça,
// independente de qual principal/secundária escolheu). Guardado numa chave
// só por personagem, `character.bonusGrauEscolhaRaca` (não precisa de id de
// habilidade, já que é por raça).
export const BONUS_GRAU_ESCOLHA_POR_RACA = {
  elfo: { tipo: "proficiencia", opcoes: PROFICIENCIAS_LIST.filter((p) => p.categoria !== "combate").map((p) => p.key) },
  humano: { tipo: "proficiencia", opcoes: PROFICIENCIAS_LIST.filter((p) => p.categoria !== "combate").map((p) => p.key) },
};

// Habilidades que concedem "ofícios mágicos extras" (docs/MUDANCAS_RACAS_E_
// MAGIA.md: "Campo 'ofícios extras' para raças e habilidades") — soma na
// contagem de Ofícios Mágicos (engine.js:contagemOficiosMagicos) SEM contar
// contra o limite de 3 disciplinas escolhidas pelo jogador.
export const BONUS_OFICIO_EXTRA_POR_HABILIDADE = {
  "cla-natrus": 1,
  "cla-corvus": 1,
  "cla-seasus": 1,
};

// Disciplinas (docs/DISCIPLINAS_MAGIA.md, 14/10): até 3 slots por personagem
// (character.disciplinas, array de até 3 `{ disciplinaId, habilidadesAtivas }`
// ou `null` pra slot vazio — mesmo padrão posicional de `character.procs`).
// Substitui o antigo `disciplinaMagica.oficiosMagicos`/`magiaInata` (checkbox
// solto, 14/10 anterior) — agora esses dois são DERIVADOS daqui, nunca mais
// guardados direto na ficha (ver comGrausEfetivos). Troca o antigo painel
// "Classes" (2 caixas de texto livre) na ficha.
export function disciplinasDoPersonagem(character) {
  return (character?.disciplinas || []).filter(Boolean);
}

// Ids das disciplinas do tipo "oficio-magico" escolhidas (conta 1 cada no
// pool de ataque mágico/recuperação de mana — engine.js:contagemOficiosMagicos).
// Magia Inata (tipo "magia-inata") nunca entra aqui.
export function oficiosMagicosDoPersonagem(character) {
  return disciplinasDoPersonagem(character)
    .map((d) => getDisciplinaPorId(d.disciplinaId))
    .filter((def) => def?.tipo === "oficio-magico")
    .map((def) => def.id);
}

export function temMagiaInataDoPersonagem(character) {
  return disciplinasDoPersonagem(character).some((d) => d.disciplinaId === "magia-inata");
}

// União das magias equipadas em TODAS as disciplinas do personagem (cada
// disciplina tem seu próprio limite de 3 — ver DISCIPLINAS em
// data/magias.js — mas o seletor de conjuração do painel Magia mostra o
// total disponível, sem precisar saber de qual disciplina veio cada uma).
export function magiasAtivasDoPersonagem(character) {
  const vistas = new Set();
  const resultado = [];
  for (const d of disciplinasDoPersonagem(character)) {
    for (const magiaId of d.habilidadesAtivas || []) {
      if (!vistas.has(magiaId)) {
        vistas.add(magiaId);
        resultado.push(magiaId);
      }
    }
  }
  return resultado;
}

// Soma os "ofícios extras" das habilidades ATIVAS do personagem (mesmo
// critério de bonusGrauDoPersonagem: principal + secundária).
export function oficiosExtrasDoPersonagem(character) {
  const raca = encontrarRaca(character?.raca);
  const principal = encontrarPrincipal(raca, character?.habilidadePrincipal);
  const secundaria = encontrarSecundaria(raca, character?.habilidadeSecundaria);
  let total = 0;
  for (const hab of [principal, secundaria]) {
    if (hab && BONUS_OFICIO_EXTRA_POR_HABILIDADE[hab.id]) total += BONUS_OFICIO_EXTRA_POR_HABILIDADE[hab.id];
  }
  return total;
}

// Teto (grau máximo) de cada bônus de grau, por chave — default "C" quando
// uma habilidade não especifica `teto` em BONUS_GRAU_POR_HABILIDADE. Função
// separada de bonusGrauDoPersonagem de propósito: aquela função já é testada
// com deepEqual exato contra números de passos simples (sem teto misturado
// junto) — mudar sua forma quebraria esses testes à toa.
export function tetoGrauDoPersonagem(character) {
  const raca = encontrarRaca(character?.raca);
  const principal = encontrarPrincipal(raca, character?.habilidadePrincipal);
  const secundaria = encontrarSecundaria(raca, character?.habilidadeSecundaria);
  const resultado = { proficiencias: {}, atributos: {} };
  for (const hab of [principal, secundaria]) {
    if (!hab) continue;
    const bonus = BONUS_GRAU_POR_HABILIDADE[hab.id];
    if (!bonus) continue;
    for (const b of bonus) {
      if (!b.teto) continue;
      const alvo = b.tipo === "atributo" ? resultado.atributos : resultado.proficiencias;
      const atualIdx = GRADE_ORDER.indexOf(alvo[b.chave] || "C");
      const novoIdx = GRADE_ORDER.indexOf(b.teto);
      if (novoIdx > atualIdx) alvo[b.chave] = b.teto;
    }
  }
  return resultado;
}

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
  // Bônus de grau à escolha da RAÇA em si (não de uma habilidade específica)
  // — ver BONUS_GRAU_ESCOLHA_POR_RACA.
  const escolhaRaca = BONUS_GRAU_ESCOLHA_POR_RACA[character?.raca];
  if (escolhaRaca) {
    const chave = character?.bonusGrauEscolhaRaca;
    if (chave && escolhaRaca.opcoes.includes(chave)) {
      const alvo = escolhaRaca.tipo === "atributo" ? resultado.atributos : resultado.proficiencias;
      alvo[chave] = (alvo[chave] || 0) + 1;
    }
  }
  // Disciplinas (docs/DISCIPLINAS_MAGIA.md, 14/10): ter "Ofício Mágico:
  // Magias de guerra" entre os até 3 slots de disciplina mantém o +1 grau em
  // Magias Gerais que o antigo "Ofício Mágico" já dava. As outras disciplinas
  // vazias (Encantamentos, Alquimia, Constructo — ver data/magias.js:
  // DISCIPLINAS) não dão bônus de grau nenhum, só contam como dado no pool
  // mágico (ver engine.js:contagemOficiosMagicos). Magia Inata não dá bônus
  // de grau nenhum — vira +1d10 fixo nas rolagens de magia e +1 MP (ver
  // engine.js:diceAtaqueMagico/computeMaxMana).
  if (oficiosMagicosDoPersonagem(character).includes("oficio-magias-de-guerra")) {
    resultado.proficiencias.magiasGerais = (resultado.proficiencias.magiasGerais || 0) + 1;
  }
  return resultado;
}

// Aplica `passos` graus de bônus a partir de `grauBase`, com teto configurável
// (padrão "C") — regra do Pedro: "aumentos de proficiência e atributo de raça
// são +1 grau, com teto C". Algumas habilidades (14/10, docs/MUDANCAS_RACAS_E_
// MAGIA.md: Goethiano em Vigor, Pele Grossa em Resistência Física) passaram a
// não ter teto C — sobem até A. Grau já no teto (ou acima) não sobe mais por
// esse bônus (nem desce).
export function grauComBonus(grauBase, passos, teto = "C") {
  const base = grauBase || "E";
  if (!passos) return base;
  const baseIdx = Math.max(0, GRADE_ORDER.indexOf(base));
  const tetoIdx = GRADE_ORDER.indexOf(teto);
  if (baseIdx >= tetoIdx) return base;
  return GRADE_ORDER[Math.min(tetoIdx, baseIdx + passos)];
}

// Devolve `{ character, bonusAplicado }`: uma cópia do personagem com
// proficiencias/atributosGerais já no grau EFETIVO (base + bônus racial, com
// teto — ver tetoGrauDoPersonagem) e `disciplinaMagica` já montado a partir
// de `character.disciplinas` (oficiosMagicos/magiaInata/magiasAtivas — ver
// oficiosMagicosDoPersonagem/temMagiaInataDoPersonagem/magiasAtivasDoPersonagem
// — mais oficiosExtras, base salva + bônus racial de oficiosExtrasDoPersonagem)
// — é isso que deve ir pra qualquer cálculo de dado (ataques, testes, barras
// da ficha, pool mágico), nunca o personagem cru. `bonusAplicado` dá, por
// chave, o número de passos REALMENTE aplicados (já descontado o teto — ex.:
// uma habilidade que daria +1 num grau já no teto não aplica nada) — é o que
// a UI usa pra saber quantos segmentos pintar de azul na barrinha.
// `disciplinaMagica` é sempre recalculado (nunca devolve o mesmo objeto
// salvo na ficha) porque é inteiramente derivado de `character.disciplinas`,
// nunca mais lido direto — por isso, diferente de antes, esta função não
// devolve mais o mesmo `character` por referência quando não há bônus de
// grau/ofício extra (só proficiencias/atributosGerais continuam sem clonar
// nesse caso).
export function comGrausEfetivos(character) {
  if (!character) return { character, bonusAplicado: { proficiencias: {}, atributos: {} } };
  const bonus = bonusGrauDoPersonagem(character);
  const oficiosExtrasRaciais = oficiosExtrasDoPersonagem(character);
  const disciplinaMagica = {
    ...(character.disciplinaMagica || {}),
    oficiosMagicos: oficiosMagicosDoPersonagem(character),
    oficiosExtras: (character.disciplinaMagica?.oficiosExtras || 0) + oficiosExtrasRaciais,
    magiaInata: temMagiaInataDoPersonagem(character),
    magiasAtivas: magiasAtivasDoPersonagem(character),
  };
  const bonusAplicado = { proficiencias: {}, atributos: {} };
  const semBonusDeGrau = Object.keys(bonus.proficiencias).length === 0 && Object.keys(bonus.atributos).length === 0;
  if (semBonusDeGrau) {
    return { character: { ...character, disciplinaMagica }, bonusAplicado };
  }
  const tetos = tetoGrauDoPersonagem(character);
  const proficiencias = { ...character.proficiencias };
  for (const [chave, passos] of Object.entries(bonus.proficiencias)) {
    const baseIdx = Math.max(0, GRADE_ORDER.indexOf(proficiencias[chave] || "E"));
    const novoGrau = grauComBonus(proficiencias[chave], passos, tetos.proficiencias[chave] || "C");
    proficiencias[chave] = novoGrau;
    bonusAplicado.proficiencias[chave] = GRADE_ORDER.indexOf(novoGrau) - baseIdx;
  }
  const atributosGerais = { ...character.atributosGerais };
  for (const [chave, passos] of Object.entries(bonus.atributos)) {
    const baseIdx = Math.max(0, GRADE_ORDER.indexOf(atributosGerais[chave] || "E"));
    const novoGrau = grauComBonus(atributosGerais[chave], passos, tetos.atributos[chave] || "C");
    atributosGerais[chave] = novoGrau;
    bonusAplicado.atributos[chave] = GRADE_ORDER.indexOf(novoGrau) - baseIdx;
  }
  return { character: { ...character, proficiencias, atributosGerais, disciplinaMagica }, bonusAplicado };
}
