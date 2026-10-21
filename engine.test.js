// Suíte de testes do motor de combate do Point (universo Amaranth).
// Roda com `node --test` (Node >=20, nativo, sem dependências) ou `npm test`.
// Valida engine.js regra por regra contra docs/SISTEMA_MAGIA.md (modelo de
// combate novo, 14/10) e SISTEMA.md (o que não mudou). Usa Math.random
// mockado (t.mock.method) pra ter dados controlados.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PROFICIENCIAS_DEFAULT, PROFICIENCIAS_LIST, PROC_ABILITIES, BASE_ATTACK_TYPES, ACERTOS_POR_TIPO,
  GRADE_VALUE, GRADE_ORDER, STAT_LIST, STAT_BASE_DEFAULTS, STAT_PROF_LINK,
  attrBonus, computeMaxHP, computeMaxSP, computeMaxMana, MANA_MIN, MANA_MAX, quebrarMana, repararMana,
  limiarDaHabilidade, findTriggeredProc, computeStat, computeAcertoTipo,
  rollSuccessDice, migrateBrigaProfKey, defaultAttacksForCharacter,
  temDescritor, limiarAtaque, LIMIAR_SUCESSO, LIMIAR_BLINDADO, rolarComSortudo,
  extraDeManaMagica, diceBaseMagica, diceAtaqueFisico, diceAtaqueMagico,
  diceAtaqueAlquimia, diceAtaqueConstructo,
  contagemOficiosMagicos,
  resolveRolagemDefesa, determinarFerimento, aplicarFerimentos, resolveAtaque,
  resolveAtaqueEmArea, descritoresEfetivosDoAtaque,
  grauQueimadura, resolveQueimadura, LIMIAR_QUEIMADURA, LIMIAR_QUEIMADURA_BLINDADO,
  grauDescritorNumerico, grauPreciso, grauEsmagador, grauEnvenenamento, grauCarga,
  LIMIAR_ENVENENAMENTO, resolveEnvenenamento, resolveCarga, resolveDrenante,
  grauFirme, grauSelado, grauLento, quebrarSP, repararSP,
} from "./engine.js";

const SOCO = BASE_ATTACK_TYPES.find((a) => a.id === "soco");
const ARMA_BRANCA = BASE_ATTACK_TYPES.find((a) => a.id === "arma_branca");

function makeCharacter(overrides = {}) {
  return {
    id: "test",
    atributosGerais: {
      forca: "E", destreza: "E", vigor: "E",
      carisma: "E", manipulacao: "E", compostura: "E",
      inteligencia: "E", perspicacia: "E", resolucao: "E",
    },
    proficiencias: { ...PROFICIENCIAS_DEFAULT },
    statBase: {},
    statTemp: {},
    statLinks: {},
    procs: [],
    descritores: [],
    itens: { armadura: [] },
    ...overrides,
  };
}

function withAttrs(character, attrs) {
  return { ...character, atributosGerais: { ...character.atributosGerais, ...attrs } };
}
function withProfs(character, profs) {
  return { ...character, proficiencias: { ...character.proficiencias, ...profs } };
}
function withDescritores(character, descritores) {
  return { ...character, descritores };
}

// Converte uma sequência de valores de dado (1-10) numa função de Math.random
// que devolve esses valores em ordem, na ordem exata em que o motor os
// consome (dado d = Math.floor(Math.random()*10)+1, então usamos (d-0.5)/10
// pra cair sempre dentro do bucket certo). Lança erro se o motor pedir mais
// dados do que os que foram enfileirados.
function queuedRandom(sequence) {
  let i = 0;
  return () => {
    if (i >= sequence.length) {
      throw new Error(`queuedRandom: pediu mais dados (${i + 1}) do que os ${sequence.length} enfileirados`);
    }
    const v = sequence[i++];
    return (v - 0.5) / 10;
  };
}

function mockDice(t, sequence) {
  t.mock.method(Math, "random", queuedRandom(sequence));
}

// ---------------------------------------------------------------------------
// attrBonus / computeMaxHP / computeMaxSP / computeMaxMana
// ---------------------------------------------------------------------------

describe("attrBonus", () => {
  it("converte grau em bônus E=0, D=1, C=2, B=3, A=4", () => {
    assert.equal(attrBonus("E"), 0);
    assert.equal(attrBonus("D"), 1);
    assert.equal(attrBonus("C"), 2);
    assert.equal(attrBonus("B"), 3);
    assert.equal(attrBonus("A"), 4);
  });
  it("trata grau ausente/inválido como E (bônus 0)", () => {
    assert.equal(attrBonus(undefined), 0);
    assert.equal(attrBonus("Z"), 0);
  });
});

describe("computeMaxHP / computeMaxSP", () => {
  it("HP = 2 + bônus de Vigor", () => {
    assert.equal(computeMaxHP(makeCharacter()), 2); // Vigor E
    assert.equal(computeMaxHP(withAttrs(makeCharacter(), { vigor: "A" })), 6);
  });
  it("Persistente soma +1 no HP máximo e +1 no SP máximo", () => {
    const semPersistente = makeCharacter();
    const comPersistente = { ...makeCharacter(), procs: ["persistente"] };
    assert.equal(computeMaxHP(comPersistente), computeMaxHP(semPersistente) + 1);
    assert.equal(computeMaxSP(comPersistente), computeMaxSP(semPersistente) + 1);
  });
});

describe("computeMaxMana", () => {
  it("usa mp.max salvo, clampado entre MANA_MIN e MANA_MAX", () => {
    assert.equal(computeMaxMana({ mp: { max: 3 } }), 3);
    assert.equal(computeMaxMana({ mp: { max: 0 } }), MANA_MIN);
    assert.equal(computeMaxMana({ mp: { max: 9 } }), MANA_MAX);
  });
  it("sem mp salvo, usa 3 como base", () => {
    assert.equal(computeMaxMana({}), 3);
  });
  it("Magia Inata (disciplinaMagica.magiaInata) soma +1 MP máximo", () => {
    const c = { mp: { max: 3 }, disciplinaMagica: { magiaInata: true } };
    assert.equal(computeMaxMana(c), 4);
  });
  it("Magia Inata não ultrapassa MANA_MAX", () => {
    const c = { mp: { max: 6 }, disciplinaMagica: { magiaInata: true } };
    assert.equal(computeMaxMana(c), MANA_MAX);
  });
});

// Mana quebrada (21/10, docs/ATUALIZACAO_21-10.md item 3).
describe("quebrarMana / repararMana", () => {
  it("quebrarMana tira de current e soma em quebrada", () => {
    const mp = quebrarMana({ current: 3, max: 3, quebrada: 0 }, 1);
    assert.deepEqual(mp, { current: 2, max: 3, quebrada: 1 });
  });
  it("quebrarMana satura em vez de deixar current negativo (sem mana suficiente)", () => {
    const mp = quebrarMana({ current: 1, max: 3, quebrada: 0 }, 2);
    assert.deepEqual(mp, { current: 0, max: 3, quebrada: 1 }); // só quebrou 1, que era o que tinha
  });
  it("quebrarMana aceita quantidade 2 (Constructo)", () => {
    const mp = quebrarMana({ current: 3, max: 3, quebrada: 0 }, 2);
    assert.deepEqual(mp, { current: 1, max: 3, quebrada: 2 });
  });
  it("quebrarMana soma em cima de quebrada já existente (vários encantamentos ativos)", () => {
    const mp = quebrarMana({ current: 2, max: 3, quebrada: 1 }, 1);
    assert.deepEqual(mp, { current: 1, max: 3, quebrada: 2 });
  });
  it("mp sem quebrada/current definidos (ficha antiga) não quebra, conta como 0", () => {
    const mp = quebrarMana({ max: 3 }, 1);
    assert.equal(mp.current, 0); // sem current salvo, conta como 0 disponível
    assert.equal(mp.quebrada, 0); // nada disponível pra quebrar
  });

  it("repararMana devolve pra current e tira de quebrada", () => {
    const mp = repararMana({ current: 1, max: 3, quebrada: 2 }, 1);
    assert.deepEqual(mp, { current: 2, max: 3, quebrada: 1 });
  });
  it("repararMana satura em vez de deixar quebrada negativa", () => {
    const mp = repararMana({ current: 2, max: 3, quebrada: 1 }, 5);
    assert.deepEqual(mp, { current: 3, max: 3, quebrada: 0 }); // só reparou 1, que era o que tinha quebrado
  });
  it("repararMana nunca deixa current passar do teto max - quebrada", () => {
    // current já no teto possível (max - quebrada = 2), reparar não deveria somar além disso
    const mp = repararMana({ current: 2, max: 3, quebrada: 1 }, 1);
    assert.equal(mp.current, 3); // max(3) - quebrada depois de reparar(0) = 3
    assert.equal(mp.quebrada, 0);
  });
  it("quebrar e depois reparar tudo volta ao estado original", () => {
    const quebrado = quebrarMana({ current: 3, max: 3, quebrada: 0 }, 2);
    const reparado = repararMana(quebrado, 2);
    assert.deepEqual(reparado, { current: 3, max: 3, quebrada: 0 });
  });
});

// quebrarSP/repararSP (21/10, docs/ATUALIZACAO_21-10.md seção 7.1, Regra 6):
// mesma matemática de quebrarMana/repararMana — a diferença ("só recupera
// no descanso longo") é de QUANDO repararSP é chamada na UI, não da função
// em si, que não sabe nada sobre "quando" é permitido.
describe("quebrarSP / repararSP", () => {
  it("quebrarSP tira de current e soma em quebrada", () => {
    const sp = quebrarSP({ current: 3, max: 3, quebrada: 0 }, 1);
    assert.deepEqual(sp, { current: 2, max: 3, quebrada: 1 });
  });
  it("quebrarSP satura em vez de deixar current negativo", () => {
    const sp = quebrarSP({ current: 0, max: 3, quebrada: 0 }, 1);
    assert.deepEqual(sp, { current: 0, max: 3, quebrada: 0 });
  });
  it("repararSP devolve pra current e tira de quebrada", () => {
    const sp = repararSP({ current: 1, max: 3, quebrada: 2 }, 2);
    assert.deepEqual(sp, { current: 3, max: 3, quebrada: 0 });
  });
  it("quebrar e depois reparar tudo volta ao estado original", () => {
    const quebrado = quebrarSP({ current: 3, max: 3, quebrada: 0 }, 1);
    const reparado = repararSP(quebrado, 1);
    assert.deepEqual(reparado, { current: 3, max: 3, quebrada: 0 });
  });
});

// ---------------------------------------------------------------------------
// computeStat
// ---------------------------------------------------------------------------

describe("computeStat", () => {
  it("'defesa' não existe mais em STAT_LIST/STAT_BASE_DEFAULTS (21/10: Defesa substitui Resistência Física, a antiga estatística '8+bônus' saiu — ver resolveRolagemDefesa pra Defesa de verdade)", () => {
    assert.equal(STAT_LIST.some((s) => s.key === "defesa"), false);
    assert.equal(STAT_BASE_DEFAULTS.defesa, undefined);
    assert.equal(STAT_PROF_LINK.defesa, undefined);
  });
  it("Resistência Armadura = 8, sem proficiência vinculada (vestígio — sem função mecânica no resolveAtaque novo)", () => {
    const c = makeCharacter();
    assert.equal(computeStat(c, "resistArmadura"), 8);
    assert.equal(computeStat(withProfs(c, { defesaProf: "A" }), "resistArmadura"), 8);
  });
  it("respeita statBase customizado e statTemp", () => {
    const c = { ...makeCharacter(), statBase: { defesa: 10 }, statTemp: { defesa: -2 } };
    assert.equal(computeStat(c, "defesa"), 8); // 10 - 2 + 0(prof)
  });
  it("Resistência Natural não existe mais como estatística (docs/SISTEMA_MAGIA.md item 2)", () => {
    const c = makeCharacter();
    assert.equal(computeStat(c, "resistNaturalFisica"), 0); // chave desconhecida -> 0, sem quebrar
    assert.equal(computeStat(c, "resistNaturalMagica"), 0);
  });
});

describe("computeAcertoTipo", () => {
  const corpoACorpo = ACERTOS_POR_TIPO.find((e) => e.key === "corpoACorpo");
  const armaDeFogo = ACERTOS_POR_TIPO.find((e) => e.key === "armaDeFogo");

  it("não tem mais entrada 'Mágico' (14/10: sem Proficiência fixa pro pool mágico)", () => {
    assert.equal(ACERTOS_POR_TIPO.find((e) => e.key === "magico"), undefined);
    assert.equal(ACERTOS_POR_TIPO.length, 2);
  });
  it("Corpo a corpo = Destreza + Combate Corpo a Corpo (bônus E=0..A=+4)", () => {
    const c = withProfs(withAttrs(makeCharacter(), { destreza: "C" }), { combateCorpoACorpo: "B" });
    const r = computeAcertoTipo(c, corpoACorpo);
    assert.equal(r.doAtributo, 2); // Destreza C
    assert.equal(r.daProficiencia, 3); // Combate Corpo a Corpo B
    assert.equal(r.total, 5);
  });
  it("Arma de fogo = Destreza + Armas de Fogo", () => {
    const c = withProfs(withAttrs(makeCharacter(), { destreza: "A" }), { armasDeFogo: "D" });
    const r = computeAcertoTipo(c, armaDeFogo);
    assert.equal(r.doAtributo, 4); // Destreza A
    assert.equal(r.daProficiencia, 1); // Armas de Fogo D
    assert.equal(r.total, 5);
  });
  it("tudo em grau E dá Acerto 0 nos dois tipos", () => {
    const c = makeCharacter();
    for (const entrada of ACERTOS_POR_TIPO) {
      assert.equal(computeAcertoTipo(c, entrada).total, 0, entrada.key);
    }
  });
});

// ---------------------------------------------------------------------------
// migrateBrigaProfKey — migração da proficiência "Briga" eliminada
// ---------------------------------------------------------------------------

describe("migrateBrigaProfKey", () => {
  it("converte profKey \"briga\" pra \"combateCorpoACorpo\"", () => {
    const attacks = [{ nome: "Ataque desarmado", profKey: "briga" }, { nome: "Mosquete", profKey: "armasDeFogo" }];
    const migrado = migrateBrigaProfKey(attacks);
    assert.equal(migrado[0].profKey, "combateCorpoACorpo");
    assert.equal(migrado[1].profKey, "armasDeFogo"); // outros ataques não mudam
  });
  it("é idempotente: rodar de novo no resultado não muda nada", () => {
    const attacks = [{ nome: "Ataque desarmado", profKey: "briga" }];
    const uma = migrateBrigaProfKey(attacks);
    const duas = migrateBrigaProfKey(uma);
    assert.deepEqual(duas, uma);
  });
  it("com lista vazia ou ausente, não quebra", () => {
    assert.deepEqual(migrateBrigaProfKey([]), []);
    assert.deepEqual(migrateBrigaProfKey(undefined), []);
  });
});

// ---------------------------------------------------------------------------
// limiarDaHabilidade / findTriggeredProc — mantidas só pra exibição (ver nota
// "órfã" em PROC_ABILITIES no engine.js: resolveAtaque não chama mais
// findTriggeredProc em lugar nenhum).
// ---------------------------------------------------------------------------

describe("limiarDaHabilidade", () => {
  it("limiar = 11 - grau, via proficiência (Manipulação de Mana, ex-Técnica)", () => {
    const golpeCerteiro = PROC_ABILITIES.find((p) => p.id === "golpe_certeiro");
    const c = withProfs(makeCharacter(), { manipulacaoManaProf: "E" });
    assert.equal(limiarDaHabilidade(c, golpeCerteiro), 10);
    assert.equal(limiarDaHabilidade(withProfs(c, { manipulacaoManaProf: "A" }), golpeCerteiro), 6);
  });
  it("limiar = 11 - grau, via atributo", () => {
    const ataquePoderoso = PROC_ABILITIES.find((p) => p.id === "instinto_selvagem");
    const c = withAttrs(makeCharacter(), { forca: "C" });
    assert.equal(limiarDaHabilidade(c, ataquePoderoso), 8);
  });
  it("com múltiplas fontes, usa o melhor (mais baixo) limiar", () => {
    const p = { atributosLimiar: ["forca"], proficienciasLimiar: ["manipulacaoManaProf"] };
    const c = withProfs(withAttrs(makeCharacter(), { forca: "D" }), { manipulacaoManaProf: "A" }); // limiares 9 e 6
    assert.equal(limiarDaHabilidade(c, p), 6);
  });
  it("sem atributo/proficiência de limiar, retorna 10 (padrão)", () => {
    assert.equal(limiarDaHabilidade(makeCharacter(), {}), 10);
  });
});

describe("findTriggeredProc", () => {
  it("retorna null se o personagem não tem a habilidade equipada", () => {
    assert.equal(findTriggeredProc(makeCharacter(), "acerto_proprio", 10, "marcial"), null);
  });
  it("dispara só quando o dado bate o limiar", () => {
    const c = withProfs({ ...makeCharacter(), procs: ["golpe_certeiro"] }, { manipulacaoManaProf: "A" }); // limiar 6
    assert.equal(findTriggeredProc(c, "acerto_proprio", 5, "marcial"), null);
    assert.equal(findTriggeredProc(c, "acerto_proprio", 6, "marcial")?.id, "golpe_certeiro");
  });
  it("respeita restrição de tipo de ataque", () => {
    const c = withProfs({ ...makeCharacter(), procs: ["surto_arcano"] }, { magiasOfensivas: "A" });
    assert.equal(findTriggeredProc(c, "confirmacao_propria", 10, "marcial"), null);
    assert.equal(findTriggeredProc(c, "confirmacao_propria", 10, "magico")?.id, "surto_arcano");
  });
  it("nunca retorna furia_crescente (Mestre do Crítico é tratado à parte)", () => {
    const c = { ...makeCharacter(), procs: ["furia_crescente"] };
    assert.equal(findTriggeredProc(c, "acerto_proprio", 10, "marcial"), null);
  });
});

// ---------------------------------------------------------------------------
// rollSuccessDice / rolarComSortudo
// ---------------------------------------------------------------------------

describe("rollSuccessDice", () => {
  it("sucesso é dado > limiar; 10 natural sempre conta", (t) => {
    mockDice(t, [6, 5, 10, 1]);
    const r = rollSuccessDice(4, 5);
    assert.deepEqual(r.dice, [6, 5, 10, 1]);
    assert.equal(r.successes, 2); // 6 e 10 (5 não é >5, 1 não é >5)
    assert.equal(r.criticos, 1);
    assert.equal(r.superSucesso, false);
  });
  it("3+ sucessos conta como superSucesso", (t) => {
    mockDice(t, [10, 10, 10]);
    const r = rollSuccessDice(3, 5);
    assert.equal(r.successes, 3);
    assert.equal(r.superSucesso, true);
  });
});

describe("rolarComSortudo", () => {
  it("sem o descritor, não re-rola nada", (t) => {
    mockDice(t, [1, 7, 8]);
    const r = rolarComSortudo(3, 5, false);
    assert.deepEqual(r.dice, [1, 7, 8]);
    assert.equal(r.sortudoAplicado, null);
  });
  it("com o descritor, re-rola o PRIMEIRO dado 1 ou 2 (mostra original e novo)", (t) => {
    mockDice(t, [7, 2, 8, /*reroll*/ 9]);
    const r = rolarComSortudo(3, 5, true);
    assert.deepEqual(r.dice, [7, 9, 8]);
    assert.equal(r.sortudoAplicado.indice, 1);
    assert.equal(r.sortudoAplicado.original, 2);
    assert.equal(r.sortudoAplicado.novo, 9);
    assert.equal(r.successes, 3); // 7, 9 e 8 (todos >5 — o 2 virou 9 e passou a contar)
  });
  it("com o descritor mas nenhum dado 1/2, não re-rola", (t) => {
    mockDice(t, [7, 8, 9]);
    const r = rolarComSortudo(3, 5, true);
    assert.deepEqual(r.dice, [7, 8, 9]);
    assert.equal(r.sortudoAplicado, null);
  });
});

// ---------------------------------------------------------------------------
// temDescritor / limiarAtaque
// ---------------------------------------------------------------------------

describe("temDescritor", () => {
  it("checa o array `descritores` de qualquer entidade (personagem ou ataque/magia)", () => {
    assert.equal(temDescritor({ descritores: ["sortudo"] }, "sortudo"), true);
    assert.equal(temDescritor({ descritores: ["sortudo"] }, "letal"), false);
  });
  it("sem array descritores, não quebra", () => {
    assert.equal(temDescritor({}, "sortudo"), false);
    assert.equal(temDescritor(undefined, "sortudo"), false);
  });
});

describe("limiarAtaque", () => {
  it("padrão 6+ (LIMIAR_SUCESSO) sem Blindado", () => {
    const limiar = limiarAtaque({ atacante: makeCharacter(), defensor: makeCharacter(), descritoresAtaque: [] });
    assert.equal(limiar, LIMIAR_SUCESSO);
  });
  it("7+ (LIMIAR_BLINDADO) contra defensor com Blindado, ataque físico", () => {
    const defensor = withDescritores(makeCharacter(), ["blindado"]);
    const limiar = limiarAtaque({ atacante: makeCharacter(), defensor, descritoresAtaque: [] });
    assert.equal(limiar, LIMIAR_BLINDADO);
  });
  it("Blindado vale pra qualquer ataque, físico ou mágico (14/10: Blindado Mágico não existe mais separado)", () => {
    const defensor = withDescritores(makeCharacter(), ["blindado"]);
    const limiarFisico = limiarAtaque({ atacante: makeCharacter(), defensor, descritoresAtaque: [] });
    assert.equal(limiarFisico, LIMIAR_BLINDADO);
    const limiarMagico = limiarAtaque({ atacante: makeCharacter(), defensor, descritoresAtaque: ["magia"] });
    assert.equal(limiarMagico, LIMIAR_BLINDADO);
  });
  it("Perfurante ignora Blindado (negação vence)", () => {
    const defensor = withDescritores(makeCharacter(), ["blindado"]);
    const limiar = limiarAtaque({ atacante: makeCharacter(), defensor, descritoresAtaque: ["perfurante"] });
    assert.equal(limiar, LIMIAR_SUCESSO);
  });
  it("descritor de personagem ignora_blindado (retrocompatibilidade) também ignora Blindado", () => {
    const atacante = withDescritores(makeCharacter(), ["ignora_blindado"]);
    const defensor = withDescritores(makeCharacter(), ["blindado"]);
    const limiar = limiarAtaque({ atacante, defensor, descritoresAtaque: [] });
    assert.equal(limiar, LIMIAR_SUCESSO);
  });
  // Pesado (21/10, docs/ATUALIZACAO_21-10.md seção 5): "os dados de ataque
  // precisam de 7+; não soma com Blindado" — mesmo limiar elevado (7+),
  // nunca 8+/9+.
  it("Pesado eleva o limiar pra 7+, mesmo sem o defensor ter Blindado", () => {
    const limiar = limiarAtaque({ atacante: makeCharacter(), defensor: makeCharacter(), descritoresAtaque: ["pesado"] });
    assert.equal(limiar, LIMIAR_BLINDADO);
  });
  it("Pesado + defensor Blindado não somam: continua só 7+ (não acumula)", () => {
    const defensor = withDescritores(makeCharacter(), ["blindado"]);
    const limiar = limiarAtaque({ atacante: makeCharacter(), defensor, descritoresAtaque: ["pesado"] });
    assert.equal(limiar, LIMIAR_BLINDADO);
  });
  it("Perfurante vence Pesado também (negação sempre vence)", () => {
    const limiar = limiarAtaque({ atacante: makeCharacter(), defensor: makeCharacter(), descritoresAtaque: ["pesado", "perfurante"] });
    assert.equal(limiar, LIMIAR_SUCESSO);
  });
});

describe("descritoresEfetivosDoAtaque", () => {
  it("ataque desarmado normal não é letal", () => {
    assert.deepEqual(descritoresEfetivosDoAtaque(makeCharacter(), SOCO), []);
  });
  it("desarmado_letal (descritor de personagem) torna o ataque desarmado letal", () => {
    const atacante = withDescritores(makeCharacter(), ["desarmado_letal"]);
    assert.deepEqual(descritoresEfetivosDoAtaque(atacante, SOCO), ["letal"]);
  });
  it("não duplica 'letal' num ataque que já é letal (ex.: arma branca)", () => {
    const atacante = withDescritores(makeCharacter(), ["desarmado_letal"]);
    assert.deepEqual(descritoresEfetivosDoAtaque(atacante, ARMA_BRANCA), ["letal"]);
  });
  // Queimadura concedida pelo PERSONAGEM (Pedro, 19/10 — Encantamento
  // Flamejante, via racasCatalogo.js:comGrausEfetivos) soma com a do
  // ataque/magia, igual desarmado_letal soma "letal".
  it("Queimadura do personagem (ex.: Encantamento Flamejante) soma nos descritores do ataque", () => {
    const atacante = withDescritores(makeCharacter(), ["queimadura"]);
    assert.deepEqual(descritoresEfetivosDoAtaque(atacante, ARMA_BRANCA), ["letal", "queimadura"]);
  });
  it("sem Queimadura no personagem, não adiciona nada", () => {
    assert.deepEqual(descritoresEfetivosDoAtaque(makeCharacter(), ARMA_BRANCA), ["letal"]);
  });
  it("Queimadura do personagem some com desarmado_letal no mesmo ataque desarmado", () => {
    const atacante = withDescritores(makeCharacter(), ["desarmado_letal", "queimadura"]);
    assert.deepEqual(descritoresEfetivosDoAtaque(atacante, SOCO), ["letal", "queimadura"]);
  });
  it("desarmado_letal não afeta ataques que não são desarmados", () => {
    const atacanteSemLetal = makeCharacter();
    assert.deepEqual(descritoresEfetivosDoAtaque(atacanteSemLetal, ARMA_BRANCA), ["letal"]);
  });
});

// ---------------------------------------------------------------------------
// Base mágica (2d10 + extra de mana) e pools de dados de ataque
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// grauQueimadura / resolveQueimadura — descritor "Queimadura N" (Pedro, 19/10)
// ---------------------------------------------------------------------------

describe("grauQueimadura", () => {
  it("sem o descritor, devolve 0", () => {
    assert.equal(grauQueimadura([]), 0);
    assert.equal(grauQueimadura(["letal", "perfurante"]), 0);
  });
  it("'queimadura' sem número = grau 1", () => {
    assert.equal(grauQueimadura(["queimadura"]), 1);
  });
  it("'queimadura_N' explícito = grau N", () => {
    assert.equal(grauQueimadura(["queimadura_3"]), 3);
  });
  it("soma todas as ocorrências (ex.: ataque + Encantamento Flamejante)", () => {
    assert.equal(grauQueimadura(["queimadura", "queimadura_2"]), 3);
  });
  it("descritores undefined não quebra", () => {
    assert.equal(grauQueimadura(undefined), 0);
  });
});

describe("resolveQueimadura", () => {
  it("sem o descritor Queimadura, devolve null", () => {
    const r = resolveQueimadura({ attacker: makeCharacter(), defender: makeCharacter(), descritoresAtaque: ["letal"], sucessosLiquidosAtaque: 1 });
    assert.equal(r, null);
  });
  it("sem sucesso líquido no ataque principal, devolve null (não rola nada)", () => {
    const r = resolveQueimadura({ attacker: makeCharacter(), defender: makeCharacter(), descritoresAtaque: ["queimadura"], sucessosLiquidosAtaque: 0 });
    assert.equal(r, null);
  });
  it("rola N d10 PRÓPRIOS (grau da Queimadura), sucesso em 8+, cada sucesso é 1 ferimento à parte", (t) => {
    const defender = makeCharacter(); // Vigor E, grau cheio 1
    mockDice(t, [9, 7, 10]); // 3 dados (queimadura_3): 9 e 10 batem 8+, 7 não
    const r = resolveQueimadura({ attacker: makeCharacter(), defender, descritoresAtaque: ["queimadura_3"], sucessosLiquidosAtaque: 1 });
    assert.equal(r.dados, 3);
    assert.equal(r.limiar, LIMIAR_QUEIMADURA);
    assert.equal(r.sucessos, 2);
    assert.equal(r.tipoFerimento, "agravante"); // 2 >= Vigor grau cheio 1
    assert.equal(r.feridas, 2);
  });
  it("sem nenhum sucesso na rolagem de queimadura, sem ferimento (tipoFerimento null, feridas 0)", (t) => {
    mockDice(t, [5]); // 5 não bate 8+
    const r = resolveQueimadura({ attacker: makeCharacter(), defender: makeCharacter(), descritoresAtaque: ["queimadura"], sucessosLiquidosAtaque: 1 });
    assert.equal(r.sucessos, 0);
    assert.equal(r.tipoFerimento, null);
    assert.equal(r.feridas, 0);
  });
  it("superficial quando sucessos de queimadura < Vigor do alvo (grau cheio)", (t) => {
    const defender = withAttrs(makeCharacter(), { vigor: "D" }); // grau cheio 2
    mockDice(t, [9]); // 1 sucesso < 2
    const r = resolveQueimadura({ attacker: makeCharacter(), defender, descritoresAtaque: ["queimadura"], sucessosLiquidosAtaque: 1 });
    assert.equal(r.sucessos, 1);
    assert.equal(r.tipoFerimento, "superficial");
  });
  it("Letal (do mesmo ataque) reduz o Vigor necessário em 1, igual no ataque normal", (t) => {
    const defender = withAttrs(makeCharacter(), { vigor: "D" }); // grau cheio 2, Letal -> necessário 1
    mockDice(t, [9]); // 1 sucesso
    const r = resolveQueimadura({ attacker: makeCharacter(), defender, descritoresAtaque: ["queimadura", "letal"], sucessosLiquidosAtaque: 1 });
    assert.equal(r.tipoFerimento, "agravante"); // 1 >= (2-1)
  });
  it("9+ contra defensor Blindado (em vez de 8+)", (t) => {
    const defenderBlindado = withDescritores(makeCharacter(), ["blindado"]);
    mockDice(t, [8]); // 8 não basta pro Blindado (precisa 9+)
    const r = resolveQueimadura({ attacker: makeCharacter(), defender: defenderBlindado, descritoresAtaque: ["queimadura"], sucessosLiquidosAtaque: 1 });
    assert.equal(r.limiar, LIMIAR_QUEIMADURA_BLINDADO);
    assert.equal(r.sucessos, 0);
  });
  it("Perfurante no ataque ignora o Blindado do alvo (volta a 8+)", (t) => {
    const defenderBlindado = withDescritores(makeCharacter(), ["blindado"]);
    mockDice(t, [8]);
    const r = resolveQueimadura({ attacker: makeCharacter(), defender: defenderBlindado, descritoresAtaque: ["queimadura", "perfurante"], sucessosLiquidosAtaque: 1 });
    assert.equal(r.limiar, LIMIAR_QUEIMADURA);
    assert.equal(r.sucessos, 1);
  });
  it("natural 10 sempre é sucesso na rolagem de queimadura (rollSuccessDice já garante)", (t) => {
    mockDice(t, [10]);
    const r = resolveQueimadura({ attacker: makeCharacter(), defender: makeCharacter(), descritoresAtaque: ["queimadura"], sucessosLiquidosAtaque: 1 });
    assert.equal(r.sucessos, 1);
  });
  // Selado N (armadura, 21/10 — docs/ATUALIZACAO_21-10.md seção 7.2): "a
  // Queimadura... contra você rolam N dados a menos".
  it("Selado N reduz o grau da Queimadura em N dados", (t) => {
    const defenderSelado = withDescritores(makeCharacter(), ["selado_1"]);
    mockDice(t, [9, 7]); // queimadura_2 - selado_1 = 1 dado só
    const r = resolveQueimadura({ attacker: makeCharacter(), defender: defenderSelado, descritoresAtaque: ["queimadura_2"], sucessosLiquidosAtaque: 1 });
    assert.equal(r.dados, 1);
    assert.equal(r.sucessos, 1);
  });
  it("Selado N pode zerar a Queimadura por completo (grau <= 0 vira null)", (t) => {
    const defenderSelado = withDescritores(makeCharacter(), ["selado_2"]);
    const r = resolveQueimadura({ attacker: makeCharacter(), defender: defenderSelado, descritoresAtaque: ["queimadura"], sucessosLiquidosAtaque: 1 });
    assert.equal(r, null);
  });
});

// ---------------------------------------------------------------------------
// Descritores novos (21/10, docs/ATUALIZACAO_21-10.md seção 5): Preciso N,
// Esmagador N, Envenenamento N, Carga N, Drenante.
// ---------------------------------------------------------------------------

describe("grauDescritorNumerico (generaliza grauQueimadura)", () => {
  it("grauPreciso/grauEsmagador/grauEnvenenamento/grauCarga seguem a mesma convenção", () => {
    assert.equal(grauPreciso(["preciso"]), 1);
    assert.equal(grauPreciso(["preciso_2"]), 2);
    assert.equal(grauEsmagador(["esmagador_3"]), 3);
    assert.equal(grauEnvenenamento(["envenenamento_2"]), 2);
    assert.equal(grauCarga(["carga_2"]), 2);
  });
  it("grauFirme/grauSelado/grauLento (armadura, 21/10) seguem a mesma convenção", () => {
    assert.equal(grauFirme(["firme_1"]), 1);
    assert.equal(grauFirme(["firme_2"]), 2);
    assert.equal(grauSelado(["selado_1"]), 1);
    assert.equal(grauLento(["lento_1"]), 1);
    assert.equal(grauFirme([]), 0);
    assert.equal(grauFirme(undefined), 0);
  });
  it("cada descritor só soma as próprias ocorrências, ignora os outros", () => {
    const ds = ["preciso_2", "esmagador_1", "queimadura", "carga_3"];
    assert.equal(grauPreciso(ds), 2);
    assert.equal(grauEsmagador(ds), 1);
    assert.equal(grauQueimadura(ds), 1);
    assert.equal(grauCarga(ds), 3);
    assert.equal(grauEnvenenamento(ds), 0);
  });
  it("grauDescritorNumerico direto funciona pra qualquer nome", () => {
    assert.equal(grauDescritorNumerico(["foo_5"], "foo"), 5);
    assert.equal(grauDescritorNumerico(["foo"], "foo"), 1);
    assert.equal(grauDescritorNumerico([], "foo"), 0);
  });
});

describe("resolveEnvenenamento", () => {
  it("sem o descritor Envenenamento, devolve null", () => {
    const r = resolveEnvenenamento({ descritoresAtaque: ["letal"], sucessosLiquidosAtaque: 1 });
    assert.equal(r, null);
  });
  it("sem sucesso líquido no ataque principal, devolve null", () => {
    const r = resolveEnvenenamento({ descritoresAtaque: ["envenenamento_2"], sucessosLiquidosAtaque: 0 });
    assert.equal(r, null);
  });
  it("rola N d10 a 7+, ignora Blindado e defesa — `defender` só entra pra checar Selado, nunca pro limiar", (t) => {
    mockDice(t, [7, 6]); // envenenamento_2: 7 bate 7+, 6 não
    const r = resolveEnvenenamento({ descritoresAtaque: ["envenenamento_2"], sucessosLiquidosAtaque: 1 });
    assert.equal(r.dados, 2);
    assert.equal(r.sucessos, 1);
  });
  // Selado N (armadura, 21/10): "o Envenenamento... contra você rolam N
  // dados a menos" — mesmo desconto de resolveQueimadura.
  it("Selado N reduz o grau do Envenenamento em N dados", (t) => {
    const defenderSelado = withDescritores(makeCharacter(), ["selado_1"]);
    mockDice(t, [10]); // envenenamento_2 - selado_1 = 1 dado só
    const r = resolveEnvenenamento({ defender: defenderSelado, descritoresAtaque: ["envenenamento_2"], sucessosLiquidosAtaque: 1 });
    assert.equal(r.dados, 1);
  });
  it("Selado N pode zerar o Envenenamento por completo (grau <= 0 vira null)", (t) => {
    const defenderSelado = withDescritores(makeCharacter(), ["selado_3"]);
    const r = resolveEnvenenamento({ defender: defenderSelado, descritoresAtaque: ["envenenamento_2"], sucessosLiquidosAtaque: 1 });
    assert.equal(r, null);
  });
  it("com >=1 sucesso, aplica EXATAMENTE 1 ferimento (nunca mais, não importa quantos sucessos)", (t) => {
    mockDice(t, [10, 10, 10]); // envenenamento_3: 3 sucessos
    const r = resolveEnvenenamento({ descritoresAtaque: ["envenenamento_3"], sucessosLiquidosAtaque: 1, limiteAtual: 0, feridasAtuais: 0 });
    assert.equal(r.sucessos, 3);
    assert.equal(r.aplicouFerimento, true);
    assert.equal(r.feridasDepois, 1); // 1 só, mesmo com 3 sucessos
  });
  it("sem nenhum sucesso, não aplica ferimento nem atualiza o limite", (t) => {
    mockDice(t, [1, 1]); // 2 dados (envenenamento_2), nenhum bate 7+
    const r = resolveEnvenenamento({ descritoresAtaque: ["envenenamento_2"], sucessosLiquidosAtaque: 1, limiteAtual: 1, feridasAtuais: 0 });
    assert.equal(r.aplicouFerimento, false);
    assert.equal(r.limiteDepois, 1);
    assert.equal(r.feridasDepois, 0);
  });
  it("limite = maior N de veneno já recebido (sobe com sucesso de um N maior)", (t) => {
    mockDice(t, [10, 10, 10]); // envenenamento_3, sucesso
    const r = resolveEnvenenamento({ descritoresAtaque: ["envenenamento_3"], sucessosLiquidosAtaque: 1, limiteAtual: 1, feridasAtuais: 1 });
    assert.equal(r.limiteDepois, 3); // max(1, 3)
    assert.equal(r.aplicouFerimento, true); // 1 ferida atual < 3 do novo limite
    assert.equal(r.feridasDepois, 2);
  });
  it("já no limite: sucesso não aplica ferimento ('nada acontece')", (t) => {
    mockDice(t, [10]); // envenenamento_1, sucesso
    const r = resolveEnvenenamento({ descritoresAtaque: ["envenenamento_1"], sucessosLiquidosAtaque: 1, limiteAtual: 1, feridasAtuais: 1 });
    assert.equal(r.aplicouFerimento, false);
    assert.equal(r.feridasDepois, 1);
  });
});

describe("resolveCarga", () => {
  it("sem o descritor Carga, devolve null", () => {
    const r = resolveCarga({ defender: makeCharacter(), descritoresAtaque: ["letal"], sucessosLiquidosAtaque: 1, cargasAtuais: 0 });
    assert.equal(r, null);
  });
  it("sem sucesso líquido no ataque principal, devolve null", () => {
    const r = resolveCarga({ defender: makeCharacter(), descritoresAtaque: ["carga_2"], sucessosLiquidosAtaque: 0, cargasAtuais: 0 });
    assert.equal(r, null);
  });
  it("cada sucesso líquido do ataque principal vira 1 carga — sem dado extra nenhum", () => {
    const r = resolveCarga({ defender: makeCharacter(), descritoresAtaque: ["carga_3"], sucessosLiquidosAtaque: 2, cargasAtuais: 0 });
    assert.equal(r.cargasAntes, 0);
    assert.equal(r.cargasAdicionadas, 2);
    assert.equal(r.cargasDepois, 2);
    assert.equal(r.descarregou, false);
  });
  it("ao chegar no N do ataque que carregou, descarrega: N dados a 6+, sem defesa", (t) => {
    const defender = makeCharacter(); // Vigor E, grau cheio 1
    mockDice(t, [7, 1]); // descarga de carga_2: 7 sucesso, 1 não
    const r = resolveCarga({ defender, descritoresAtaque: ["carga_2"], sucessosLiquidosAtaque: 2, cargasAtuais: 0 });
    assert.equal(r.descarregou, true);
    assert.equal(r.cargasDepois, 0); // zera ao descarregar
    assert.equal(r.descarga.dados, 2);
    assert.equal(r.descarga.sucessos, 1);
    assert.equal(r.descarga.tipoFerimento, "agravante"); // 1 >= Vigor grau cheio 1
    assert.equal(r.descarga.feridas, 1);
  });
  it("cargas de ataques anteriores somam até bater o N do ataque atual", (t) => {
    mockDice(t, [1, 1]); // descarga de carga_2 (2 dados, sem sucesso)
    const r = resolveCarga({ defender: makeCharacter(), descritoresAtaque: ["carga_2"], sucessosLiquidosAtaque: 1, cargasAtuais: 1 });
    assert.equal(r.cargasAntes, 1);
    assert.equal(r.cargasAdicionadas, 1);
    assert.equal(r.descarregou, true); // 1+1 = 2 >= grau 2
  });
  it("Letal/Resistente do ataque que descarrega valem na descarga, igual no ataque normal", (t) => {
    const defender = withAttrs(makeCharacter(), { vigor: "D" }); // grau cheio 2, Letal -> necessário 1
    mockDice(t, [7]); // 1 sucesso na descarga
    const r = resolveCarga({ defender, descritoresAtaque: ["carga_1", "letal"], sucessosLiquidosAtaque: 1, cargasAtuais: 0 });
    assert.equal(r.descarga.tipoFerimento, "agravante"); // 1 >= (2-1)
  });
});

describe("resolveDrenante", () => {
  it("sem o descritor Drenante, devolve null", () => {
    assert.equal(resolveDrenante({ descritoresAtaque: ["letal"], sucessosLiquidosAtaque: 1 }), null);
  });
  it("sem sucesso líquido, devolve null", () => {
    assert.equal(resolveDrenante({ descritoresAtaque: ["drenante"], sucessosLiquidosAtaque: 0 }), null);
  });
  it("com >=1 sucesso líquido e o alvo com mana, sinaliza 1 mana roubada do alvo e 1 recuperada pelo atacante", () => {
    const defender = { mp: { current: 2, max: 3 } };
    const r = resolveDrenante({ defender, descritoresAtaque: ["drenante"], sucessosLiquidosAtaque: 1 });
    assert.deepEqual(r, { aplicou: true, manaRoubadaDoAlvo: 1, manaRecuperadaPeloAtacante: 1 });
  });
  // 21/10 (armadura, docs/ATUALIZACAO_21-10.md): decisão anterior
  // ("provisório: atacante recupera mesmo assim") foi substituída — agora
  // sem mana no alvo, o atacante não recupera nada.
  it("com o alvo sem mana (mp.current=0), o atacante não recupera nada", () => {
    const defender = { mp: { current: 0, max: 3 } };
    const r = resolveDrenante({ defender, descritoresAtaque: ["drenante"], sucessosLiquidosAtaque: 1 });
    assert.deepEqual(r, { aplicou: true, manaRoubadaDoAlvo: 0, manaRecuperadaPeloAtacante: 0 });
  });
  it("sem defender nenhum (mp ausente), trata como sem mana — não recupera nada", () => {
    const r = resolveDrenante({ descritoresAtaque: ["drenante"], sucessosLiquidosAtaque: 1 });
    assert.deepEqual(r, { aplicou: true, manaRoubadaDoAlvo: 0, manaRecuperadaPeloAtacante: 0 });
  });
  // Selado N (armadura, seção 7.2): "o Drenante não funciona contra você".
  it("com o alvo Selado, o Drenante não funciona nem um pouco (mesmo com mana)", () => {
    const defender = { mp: { current: 2, max: 3 }, descritores: ["selado_1"] };
    const r = resolveDrenante({ defender, descritoresAtaque: ["drenante"], sucessosLiquidosAtaque: 1 });
    assert.deepEqual(r, { aplicou: false, bloqueadoPorSelado: true, manaRoubadaDoAlvo: 0, manaRecuperadaPeloAtacante: 0 });
  });
});

describe("extraDeManaMagica / diceBaseMagica", () => {
  it("extra = mana gasta ACIMA do custo da magia, mínimo 0", () => {
    assert.equal(extraDeManaMagica(3, 1), 2);
    assert.equal(extraDeManaMagica(1, 1), 0);
    assert.equal(extraDeManaMagica(1, 3), 0); // nunca negativo
    assert.equal(extraDeManaMagica(undefined, undefined), 0);
  });
  it("Base mágica = 2d10 + extra, nunca lê atributo da ficha", () => {
    assert.equal(diceBaseMagica(1, 1), 2);
    assert.equal(diceBaseMagica(3, 1), 4);
  });
});

describe("diceAtaqueFisico", () => {
  it("pool = grau do atributo + grau da proficiência + ajuste da arma", () => {
    const attacker = withProfs(withAttrs(makeCharacter(), { destreza: "C" }), { combateCorpoACorpo: "B" });
    // destreza C=3 + combateCorpoACorpo B=4 + ajusteDados(soco)=1 = 8
    assert.equal(diceAtaqueFisico(attacker, "destreza", "combateCorpoACorpo", 1), 8);
  });
  it("tudo em E = 1+1 = 2, sem ajuste", () => {
    assert.equal(diceAtaqueFisico(makeCharacter(), "destreza", "combateCorpoACorpo", 0), 2);
  });
  it("nunca fica negativo mesmo com ajuste bem negativo", () => {
    assert.equal(diceAtaqueFisico(makeCharacter(), "destreza", "combateCorpoACorpo", -10), 0);
  });
});

describe("contagemOficiosMagicos", () => {
  it("soma a quantidade de ofícios conhecidos + ofícios extras", () => {
    const c = { disciplinaMagica: { oficiosMagicos: ["magias-de-guerra", "alquimia"], oficiosExtras: 1 } };
    assert.equal(contagemOficiosMagicos(c), 3);
  });
  it("sem disciplinaMagica, retorna 0", () => {
    assert.equal(contagemOficiosMagicos({}), 0);
  });
});

describe("diceAtaqueMagico", () => {
  it("pool (fonte 'oficios', padrão) = Base mágica (2d10+extra) + contagem de Ofícios + ajuste da magia", () => {
    const attacker = { disciplinaMagica: { oficiosMagicos: ["magias-de-guerra", "alquimia", "constructo"] } }; // 3 ofícios
    // manaGasta=2, custoMagia=1 -> extra=1 -> base=3; +3(ofícios) = 6
    assert.equal(diceAtaqueMagico(attacker, 2, 1, "oficios", 0), 6);
  });
  it("pool (fonte 'inteligencia') = Base mágica + grau de Inteligência + ajuste da magia", () => {
    const attacker = withAttrs(makeCharacter(), { inteligencia: "B" }); // grau 4
    // manaGasta=2, custoMagia=1 -> extra=1 -> base=3; +4(inteligência) = 7
    assert.equal(diceAtaqueMagico(attacker, 2, 1, "inteligencia", 0), 7);
  });
  it("Mísseis Mágicos (ajusteDados +1): Base mágica + 1 + Ofícios/Inteligência", () => {
    const attacker = makeCharacter(); // sem ofícios, sem disciplinaMagica
    // manaGasta=1, custoMagia=1 -> extra=0 -> base=2; +0(ofícios) +1(ajuste) = 3
    assert.equal(diceAtaqueMagico(attacker, 1, 1, "oficios", 1), 3);
  });
  it("Magia Inata soma +1 dado fixo, não conta como ofício", () => {
    const attacker = { disciplinaMagica: { magiaInata: true } };
    // manaGasta=1, custoMagia=1 -> extra=0 -> base=2; +0(ofícios) +1(magia inata) = 3
    assert.equal(diceAtaqueMagico(attacker, 1, 1, "oficios", 0), 3);
  });
});

// Alquimia/Constructo (21/10, docs/ATUALIZACAO_21-10.md seção 4.1/4.2).
describe("diceAtaqueAlquimia", () => {
  it("pool (fonte 'oficios', padrão) = Destreza + contagem de Ofícios, SEM Base mágica", () => {
    const attacker = withAttrs({ disciplinaMagica: { oficiosMagicos: ["magias-de-guerra", "alquimia"] } }, { destreza: "C" }); // destreza 3 + 2 ofícios
    assert.equal(diceAtaqueAlquimia(attacker, "oficios", 0), 5);
  });
  it("pool (fonte 'inteligencia') = Destreza + grau de Inteligência", () => {
    const attacker = withAttrs(makeCharacter(), { destreza: "C", inteligencia: "B" }); // 3 + 4
    assert.equal(diceAtaqueAlquimia(attacker, "inteligencia", 0), 7);
  });
  it("não soma Magia Inata nem Base mágica alguma — só Destreza + ofícios/Inteligência + ajuste", () => {
    const attacker = { disciplinaMagica: { magiaInata: true } }; // tudo em E (destreza 1, 0 ofícios)
    assert.equal(diceAtaqueAlquimia(attacker, "oficios", 2), 3); // 1 + 0 + 2(ajuste)
  });
});

describe("diceAtaqueConstructo", () => {
  it("pool = 2 (Base mágica fixa, sem mana extra) + ofícios do dono", () => {
    const dono = { disciplinaMagica: { oficiosMagicos: ["magias-de-guerra", "alquimia", "constructo"] } };
    assert.equal(diceAtaqueConstructo(dono), 5); // 2 + 3
  });
  it("sem ofícios, fica só a Base mágica fixa (2)", () => {
    assert.equal(diceAtaqueConstructo({}), 2);
  });
  it("ajusteDados soma por cima", () => {
    assert.equal(diceAtaqueConstructo({}, 3), 5);
  });
});

// ---------------------------------------------------------------------------
// resolveRolagemDefesa
// ---------------------------------------------------------------------------

describe("resolveRolagemDefesa", () => {
  it("Defesa + Atributo Geral escolhido, contra ataque físico (21/10: Defesa substitui Resistência Física)", (t) => {
    const defensor = withProfs(withAttrs(makeCharacter(), { vigor: "C" }), { defesaProf: "B" }); // 3+4=7 dados
    mockDice(t, [1, 1, 1, 1, 1, 1, 1]);
    const r = resolveRolagemDefesa({ defensor, defesaAtributo: "vigor" });
    assert.equal(r.totalDice, 7);
    assert.equal(r.profKey, "defesaProf");
  });
  it("14/10: contra ataque mágico também é só Defesa (Resistência Mágica não existe mais)", (t) => {
    const defensor = withProfs(makeCharacter(), { defesaProf: "A" });
    mockDice(t, [1, 1, 1, 1, 1, 1]); // vigor E(1) + defesaProf A(5) = 6
    const r = resolveRolagemDefesa({ defensor, defesaAtributo: "vigor", ehMagia: true });
    assert.equal(r.profKey, "defesaProf");
    assert.equal(r.totalDice, 6);
  });
  // Preciso N (21/10, substitui o antigo Saturante — Saturante = Preciso 2):
  // penaliza quem esquiva (defesaAtributo "destreza").
  it("Preciso N: -N dados (mín. 0) só quando a defesa usa Destreza como base (esquivar)", (t) => {
    const defensor = withAttrs(makeCharacter(), { destreza: "D" }); // destreza D(2) + defesaProf E(1) = 3
    mockDice(t, [1]); // 3-2=1 dado
    const r = resolveRolagemDefesa({ defensor, defesaAtributo: "destreza", descritoresAtaque: ["preciso_2"] });
    assert.equal(r.totalDice, 1);
  });
  it("Preciso N não reduz nada se a defesa não usar Destreza", (t) => {
    const defensor = withAttrs(makeCharacter(), { vigor: "D" });
    mockDice(t, [1, 1, 1]);
    const r = resolveRolagemDefesa({ defensor, defesaAtributo: "vigor", descritoresAtaque: ["preciso_2"] });
    assert.equal(r.totalDice, 3); // vigor D(2) + defesaProf E(1), sem redução
  });
  it("Preciso N nunca deixa o pool negativo", (t) => {
    const defensor = makeCharacter(); // destreza E(1) + defesaProf E(1) = 2
    mockDice(t, [1]); // rollSuccessDice sempre rola ao menos 1 dado, mesmo com totalDice=0
    const r = resolveRolagemDefesa({ defensor, defesaAtributo: "destreza", descritoresAtaque: ["preciso_2"] });
    assert.equal(r.totalDice, 0);
  });
  // Esmagador N (21/10, contrapartida do Preciso): penaliza quem bloqueia
  // (defesaAtributo "forca"), e só quem bloqueia.
  it("Esmagador N: -N dados (mín. 0) só quando a defesa usa Força como base (bloquear)", (t) => {
    const defensor = withAttrs(makeCharacter(), { forca: "D" }); // forca D(2) + defesaProf E(1) = 3
    mockDice(t, [1]); // 3-2=1 dado
    const r = resolveRolagemDefesa({ defensor, defesaAtributo: "forca", descritoresAtaque: ["esmagador_2"] });
    assert.equal(r.totalDice, 1);
  });
  it("Esmagador N não reduz nada se a defesa usar Destreza (esquivar)", (t) => {
    const defensor = withAttrs(makeCharacter(), { destreza: "D" });
    mockDice(t, [1, 1, 1]);
    const r = resolveRolagemDefesa({ defensor, defesaAtributo: "destreza", descritoresAtaque: ["esmagador_2"] });
    assert.equal(r.totalDice, 3);
  });
  it("Preciso e Esmagador no mesmo ataque: cada um só penaliza a defesa que combina com ele, nunca os dois juntos", (t) => {
    const descritoresAtaque = ["preciso_1", "esmagador_3"];
    const defensorDestreza = withAttrs(makeCharacter(), { destreza: "D" }); // destreza D(2)+defesaProf E(1)=3, -1 (preciso_1) = 2
    mockDice(t, [1, 1]);
    const rEsquiva = resolveRolagemDefesa({ defensor: defensorDestreza, defesaAtributo: "destreza", descritoresAtaque });
    assert.equal(rEsquiva.totalDice, 2);
    const defensorForca = withAttrs(makeCharacter(), { forca: "D" }); // forca D(2)+defesaProf E(1)=3, -3 (esmagador_3) = 0
    mockDice(t, [1]);
    const rBloqueio = resolveRolagemDefesa({ defensor: defensorForca, defesaAtributo: "forca", descritoresAtaque });
    assert.equal(rBloqueio.totalDice, 0);
  });
  // Firme N (escudo, 21/10, docs/ATUALIZACAO_21-10.md seção 7.2): "só ao
  // bloquear. Tira N dados... e considera N sucessos como garantidos."
  // Descritor do DEFENSOR (equipamento), não do ataque.
  it("Firme N: tira N dados e soma N sucessos garantidos, só ao bloquear (Força)", (t) => {
    const defensor = withDescritores(withAttrs(makeCharacter(), { forca: "C" }), ["firme_1"]); // forca C(3)+defesaProf E(1)=4, -1=3
    mockDice(t, [1, 1, 1]); // nenhum sucesso natural
    const r = resolveRolagemDefesa({ defensor, defesaAtributo: "forca" });
    assert.equal(r.totalDice, 3);
    assert.equal(r.firmeGarantidos, 1);
    assert.equal(r.successes, 1); // 0 naturais + 1 garantido
  });
  it("Firme N não se aplica ao esquivar (Destreza)", (t) => {
    const defensor = withDescritores(withAttrs(makeCharacter(), { destreza: "C" }), ["firme_2"]);
    mockDice(t, [1, 1, 1, 1]); // forca... digo destreza C(3)+defesaProf E(1)=4, sem redução
    const r = resolveRolagemDefesa({ defensor, defesaAtributo: "destreza" });
    assert.equal(r.totalDice, 4);
    assert.equal(r.firmeGarantidos, 0);
  });
  // Lento N (armadura Pesada, 21/10): "-N dados em ações físicas (ataque
  // físico e esquiva)" — aqui só a esquiva; bloqueio não é afetado.
  it("Lento N: -N dados só na esquiva (Destreza), não no bloqueio", (t) => {
    const defensorEsquiva = withDescritores(withAttrs(makeCharacter(), { destreza: "C" }), ["lento_1"]); // 3+1=4, -1=3
    mockDice(t, [1, 1, 1]);
    const rEsquiva = resolveRolagemDefesa({ defensor: defensorEsquiva, defesaAtributo: "destreza" });
    assert.equal(rEsquiva.totalDice, 3);
    const defensorBloqueio = withDescritores(withAttrs(makeCharacter(), { forca: "C" }), ["lento_1"]); // sem redução
    mockDice(t, [1, 1, 1, 1]);
    const rBloqueio = resolveRolagemDefesa({ defensor: defensorBloqueio, defesaAtributo: "forca" });
    assert.equal(rBloqueio.totalDice, 4);
  });
  // Bônus de Defesa da armadura equipada (21/10, Regra 2) e penalidade por
  // falta de perícia (21/10, Regra 4) — ambos já vêm somados/anexados no
  // defensor por racasCatalogo.js:comGrausEfetivos; engine.js só consome.
  it("bonusDefesaEquipamento soma dados na defesa, qualquer atributo", (t) => {
    const defensor = { ...makeCharacter(), bonusDefesaEquipamento: 1 }; // destreza E(1)+defesaProf E(1)+1=3
    mockDice(t, [1, 1, 1]);
    const r = resolveRolagemDefesa({ defensor, defesaAtributo: "destreza" });
    assert.equal(r.totalDice, 3);
  });
  it("penalidadeDefesaSemPericia tira dados na defesa, qualquer atributo", (t) => {
    const defensor = { ...makeCharacter(), penalidadeDefesaSemPericia: 1 }; // destreza E(1)+defesaProf E(1)-1=1
    mockDice(t, [1]);
    const r = resolveRolagemDefesa({ defensor, defesaAtributo: "destreza" });
    assert.equal(r.totalDice, 1);
  });
  it("defensor Sortudo aplica o re-roll na própria rolagem de defesa", (t) => {
    const defensor = withDescritores(withAttrs(makeCharacter(), { vigor: "C" }), ["sortudo"]); // 3+1=4 dados
    mockDice(t, [7, 1, 8, 9, /*reroll do 1*/ 10]);
    const r = resolveRolagemDefesa({ defensor, defesaAtributo: "vigor" });
    assert.equal(r.sortudoAplicado.original, 1);
    assert.equal(r.sortudoAplicado.novo, 10);
  });
  it("14/10: Resiste a Magia rola 1 dado a menos contra ataque com descritor Magia", (t) => {
    const defensor = withDescritores(withAttrs(makeCharacter(), { vigor: "C" }), ["resiste_a_magia"]); // 3+1=4 dados, -1 = 3
    mockDice(t, [1, 1, 1]);
    const r = resolveRolagemDefesa({ defensor, defesaAtributo: "vigor", ehMagia: true });
    assert.equal(r.totalDice, 3);
    assert.equal(r.resisteAMagia, true);
  });
  it("14/10: Resiste a Magia não reduz dados contra ataque sem o descritor Magia", (t) => {
    const defensor = withDescritores(withAttrs(makeCharacter(), { vigor: "C" }), ["resiste_a_magia"]); // 3+1=4 dados, sem redução
    mockDice(t, [1, 1, 1, 1]);
    const r = resolveRolagemDefesa({ defensor, defesaAtributo: "vigor" });
    assert.equal(r.totalDice, 4);
    assert.equal(r.resisteAMagia, false);
  });
  it("14/10: Resiste a Magia garante ao menos 1 sucesso mesmo sem nenhum dado acertar", (t) => {
    const defensor = withDescritores(withAttrs(makeCharacter(), { vigor: "C" }), ["resiste_a_magia"]); // 3+1-1=3 dados
    mockDice(t, [1, 1, 1]); // nenhum sucesso natural
    const r = resolveRolagemDefesa({ defensor, defesaAtributo: "vigor", ehMagia: true });
    assert.equal(r.successes, 1);
  });
  // totalDiceManual (14/10, painel Teste — abas Ataque/Magia, pedido do
  // Pedro: "em vez de perguntar o vigor e atributo de defesa do alvo,
  // apenas dê a opção de quantos dados o jogador defensor rola") — pula o
  // cálculo por atributo+proficiência quando informado.
  it("totalDiceManual ignora atributo/proficiência/Preciso e usa o número direto", (t) => {
    const defensor = withAttrs(makeCharacter(), { vigor: "A", destreza: "A" }); // ignorado
    mockDice(t, [1, 1, 1]);
    const r = resolveRolagemDefesa({ defensor, defesaAtributo: "destreza", descritoresAtaque: ["preciso_2"], totalDiceManual: 3 });
    assert.equal(r.totalDice, 3);
  });
  it("totalDiceManual negativo clampa em 0 (rollSuccessDice ainda rola 1 dado)", (t) => {
    const defensor = makeCharacter();
    mockDice(t, [1]);
    const r = resolveRolagemDefesa({ defensor, totalDiceManual: -5 });
    assert.equal(r.totalDice, 0);
  });
  it("totalDiceManual ainda aplica Resiste a Magia por cima (-1 dado)", (t) => {
    const defensor = withDescritores(makeCharacter(), ["resiste_a_magia"]);
    mockDice(t, [1, 1]);
    const r = resolveRolagemDefesa({ defensor, totalDiceManual: 3, ehMagia: true });
    assert.equal(r.totalDice, 2);
    assert.equal(r.resisteAMagia, true);
  });
});

// ---------------------------------------------------------------------------
// determinarFerimento / aplicarFerimentos
// ---------------------------------------------------------------------------

describe("determinarFerimento", () => {
  it("sem sucesso líquido, sem ferimento", () => {
    assert.equal(determinarFerimento({ sucessosLiquidos: 0, vigorGrauCheio: 1 }), null);
  });
  it("agravante quando sucessos líquidos >= Vigor (grau cheio)", () => {
    assert.equal(determinarFerimento({ sucessosLiquidos: 3, vigorGrauCheio: 3 }), "agravante");
  });
  it("superficial quando sucessos líquidos < Vigor", () => {
    assert.equal(determinarFerimento({ sucessosLiquidos: 2, vigorGrauCheio: 3 }), "superficial");
  });
  it("Letal reduz o Vigor necessário em 1 (mínimo 1)", () => {
    assert.equal(determinarFerimento({ sucessosLiquidos: 2, vigorGrauCheio: 3, letal: true }), "agravante");
    assert.equal(determinarFerimento({ sucessosLiquidos: 1, vigorGrauCheio: 1, letal: true }), "agravante"); // mínimo 1, não 0
  });
  it("superficialForcado sempre causa superficial, mesmo com sucessos líquidos altos", () => {
    assert.equal(determinarFerimento({ sucessosLiquidos: 10, vigorGrauCheio: 1, superficialForcado: true }), "superficial");
  });
  it("Vigor em grau F (0): sem Letal, qualquer sucesso líquido > 0 já é agravante (vigorNecessario=0)", () => {
    assert.equal(determinarFerimento({ sucessosLiquidos: 1, vigorGrauCheio: 0 }), "agravante");
  });
  it("Vigor em grau F (0) com Letal: ainda cai no piso de 1 (igual Vigor E), não fica negativo", () => {
    assert.equal(determinarFerimento({ sucessosLiquidos: 1, vigorGrauCheio: 0, letal: true }), "agravante");
  });
  // Resistente (21/10, docs/ATUALIZACAO_21-10.md seção 2 + pedido do Pedro):
  // soma +1 ao Vigor necessário. Não acumula (é booleano). Anula Letal.
  describe("Resistente (21/10)", () => {
    it("soma +1 ao Vigor necessário", () => {
      assert.equal(determinarFerimento({ sucessosLiquidos: 1, vigorGrauCheio: 1, resistente: true }), "superficial"); // precisaria de 2
      assert.equal(determinarFerimento({ sucessosLiquidos: 2, vigorGrauCheio: 1, resistente: true }), "agravante");
    });
    it("Letal e Resistente juntos se anulam — volta pro Vigor normal (nem +1 nem -1)", () => {
      assert.equal(determinarFerimento({ sucessosLiquidos: 1, vigorGrauCheio: 1, letal: true, resistente: true }), "agravante"); // Vigor normal = 1
      assert.equal(determinarFerimento({ sucessosLiquidos: 1, vigorGrauCheio: 2, letal: true, resistente: true }), "superficial"); // Vigor normal = 2
    });
    it("sem Letal, Resistente sozinho não deixa o Vigor necessário menor que o normal", () => {
      assert.equal(determinarFerimento({ sucessosLiquidos: 1, vigorGrauCheio: 1, resistente: true }), "superficial");
    });
  });
});

// ---------------------------------------------------------------------------
// Grau F (14/10, docs/DISCIPLINAS_MAGIA.md e pedido do Pedro): selecionável
// abaixo de E em qualquer Atributo Geral/Proficiência, reduz em exatamente 1
// o dado daquele componente nos pools que somam atributo+proficiência direto
// (GRADE_VALUE.F = 0, um a menos que E = 1). Ponto crítico testado aqui: como
// 0 é falsy em JS, todo cálculo precisa usar `?? 1` (nullish coalescing) em
// vez de `|| 1` — senão F silenciosamente vira E (bug que esses testes
// pegariam de volta se alguém reintroduzir `|| 1` por engano).
// ---------------------------------------------------------------------------

describe("Grau F — abaixo de E, reduz 1 dado (14/10)", () => {
  it("GRADE_VALUE.F é 0, um a menos que GRADE_VALUE.E (1)", () => {
    assert.equal(GRADE_VALUE.F, 0);
    assert.equal(GRADE_VALUE.E, 1);
  });
  it("GRADE_ORDER começa em F, abaixo de E", () => {
    assert.deepEqual(GRADE_ORDER, ["F", "E", "D", "C", "B", "A"]);
  });

  it("diceAtaqueFisico: atributo F reduz exatamente 1 dado comparado a E (resto igual)", () => {
    const comE = withProfs(withAttrs(makeCharacter(), { destreza: "E" }), { combateCorpoACorpo: "C" });
    const comF = withProfs(withAttrs(makeCharacter(), { destreza: "F" }), { combateCorpoACorpo: "C" });
    const poolE = diceAtaqueFisico(comE, "destreza", "combateCorpoACorpo", 0);
    const poolF = diceAtaqueFisico(comF, "destreza", "combateCorpoACorpo", 0);
    assert.equal(poolE - poolF, 1);
    assert.equal(poolF, 3); // destreza F(0) + combateCorpoACorpo C(3)
  });
  it("diceAtaqueFisico: proficiência F reduz exatamente 1 dado comparado a E", () => {
    const comE = withProfs(makeCharacter(), { combateCorpoACorpo: "E" });
    const comF = withProfs(makeCharacter(), { combateCorpoACorpo: "F" });
    assert.equal(diceAtaqueFisico(comE, "destreza", "combateCorpoACorpo", 0) - diceAtaqueFisico(comF, "destreza", "combateCorpoACorpo", 0), 1);
  });
  it("diceAtaqueFisico: os dois em F nunca fica negativo (piso em 0)", () => {
    const attacker = withProfs(withAttrs(makeCharacter(), { destreza: "F" }), { combateCorpoACorpo: "F" });
    assert.equal(diceAtaqueFisico(attacker, "destreza", "combateCorpoACorpo", 0), 0);
  });

  it("diceAtaqueMagico (fonte inteligencia): Inteligência F reduz exatamente 1 dado comparado a E", (t) => {
    const comE = withAttrs(makeCharacter(), { inteligencia: "E" });
    const comF = withAttrs(makeCharacter(), { inteligencia: "F" });
    assert.equal(
      diceAtaqueMagico(comE, 1, 1, "inteligencia", 0) - diceAtaqueMagico(comF, 1, 1, "inteligencia", 0),
      1
    );
  });

  it("resolveRolagemDefesa: Defesa em E dá 2 dados (vigor E + prof E)", (t) => {
    const comE = withProfs(makeCharacter(), { defesaProf: "E" });
    mockDice(t, [1, 1]);
    const rE = resolveRolagemDefesa({ defensor: comE, defesaAtributo: "vigor" });
    assert.equal(rE.totalDice, 2);
  });
  it("resolveRolagemDefesa: Defesa em F dá 1 dado a menos (vigor E + prof F = 1)", (t) => {
    const comF = withProfs(makeCharacter(), { defesaProf: "F" });
    mockDice(t, [1]);
    const rF = resolveRolagemDefesa({ defensor: comF, defesaAtributo: "vigor" });
    assert.equal(rF.totalDice, 1); // vigor E(1) + defesaProf F(0)
  });

  it("resolveAtaque: defensor com Vigor F faz qualquer sucesso líquido virar agravante", (t) => {
    const attacker = withProfs(withAttrs(makeCharacter(), { destreza: "A" }), { combateCorpoACorpo: "A" }); // 5+5=10 dados
    const defender = withAttrs(makeCharacter(), { vigor: "F" }); // defesa: vigor F(0) + defesaProf E(1) = 1 dado
    mockDice(t, [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, /*defesa*/ 1]); // ataque: 10 sucessos; defesa: nenhum
    const totalDiceAtaque = diceAtaqueFisico(attacker, "destreza", "combateCorpoACorpo", 0);
    const r = resolveAtaque({ attacker, defender, totalDiceAtaque, defesaAtributo: "vigor" });
    assert.equal(r.tipoFerimento, "agravante");
  });

  it("attrBonus(F) fica no mesmo piso de attrBonus(E) — 0, não negativo (não mexe em HP/MP/stats derivados)", () => {
    assert.equal(attrBonus("F"), 0);
    assert.equal(attrBonus("E"), 0);
  });

  it("painel de Teste (ficha): grau F de atributo ou perícia reduz 1 dado do pool, igual aos outros componentes do cálculo (mesma fórmula de diceAtaqueFisico)", () => {
    // Regressão específica do bug `|| 1`: GRADE_VALUE.F é 0 (falsy) — qualquer
    // ponto do código que ainda usasse `GRADE_VALUE[grau] || 1` trataria F
    // como E silenciosamente. Cobre a fórmula usada no painel de Teste da
    // ficha (point-amaranth-app.jsx) replicando o mesmo cálculo aqui.
    const poolComE = (GRADE_VALUE.E ?? 1) + (GRADE_VALUE.C ?? 1);
    const poolComF = (GRADE_VALUE.F ?? 1) + (GRADE_VALUE.C ?? 1);
    assert.equal(poolComE - poolComF, 1);
  });
});

describe("aplicarFerimentos", () => {
  it("agravante reduz 1 HP de verdade", () => {
    const hp = aplicarFerimentos({ current: 3, max: 5, superficiais: 0 }, "agravante");
    assert.equal(hp.current, 2);
    assert.equal(hp.superficiais, 0);
  });
  it("superficial não reduz HP, só marca", () => {
    const hp = aplicarFerimentos({ current: 3, max: 5, superficiais: 0 }, "superficial");
    assert.equal(hp.current, 3);
    assert.equal(hp.superficiais, 1);
  });
  it("com todos os pontos restantes já marcados como superficial, o próximo ferimento vira agravante", () => {
    const hp = aplicarFerimentos({ current: 3, max: 5, superficiais: 3 }, "superficial");
    assert.equal(hp.current, 2); // virou agravante
    assert.equal(hp.superficiais, 2); // clampado ao novo current
  });
  it("quantidade > 1 aplica o mesmo ferimento várias vezes", () => {
    const hp = aplicarFerimentos({ current: 3, max: 5, superficiais: 0 }, "agravante", 2);
    assert.equal(hp.current, 1);
  });
  it("current nunca fica negativo", () => {
    const hp = aplicarFerimentos({ current: 1, max: 5, superficiais: 0 }, "agravante", 5);
    assert.equal(hp.current, 0);
  });
});

// ---------------------------------------------------------------------------
// resolveAtaque — integração: ataque vs defesa vs ferimento
// ---------------------------------------------------------------------------

describe("resolveAtaque", () => {
  it("sucessos líquidos = sucessos do atacante - sucessos da defesa (mínimo 0)", (t) => {
    const attacker = makeCharacter();
    const defender = makeCharacter();
    // ataque: 3 dados, 2 sucessos (7,8,1); defesa: 2 dados, 1 sucesso (9,1)
    mockDice(t, [7, 8, 1, /*defesa*/ 9, 1]);
    const r = resolveAtaque({ attacker, defender, tipoAtaque: "marcial", totalDiceAtaque: 3, defesaAtributo: "vigor" });
    assert.equal(r.rolagemAtaque.successes, 2);
    assert.equal(r.rolagemDefesa.successes, 1);
    assert.equal(r.sucessosLiquidos, 1);
  });
  it("defesa nunca deixa os sucessos líquidos negativos", (t) => {
    mockDice(t, [6, /*defesa*/ 9, 9]);
    const r = resolveAtaque({ attacker: makeCharacter(), defender: makeCharacter(), tipoAtaque: "marcial", totalDiceAtaque: 1, defesaAtributo: "vigor" });
    assert.equal(r.sucessosLiquidos, 0);
    assert.equal(r.tipoFerimento, null);
    assert.equal(r.feridas, 0);
  });
  it("ferimento agravante quando sucessos líquidos >= Vigor do defensor", (t) => {
    const defender = makeCharacter(); // Vigor E = grau cheio 1
    mockDice(t, [7, /*defesa sem sucesso*/ 1, 1]);
    const r = resolveAtaque({ attacker: makeCharacter(), defender, tipoAtaque: "marcial", totalDiceAtaque: 1, defesaAtributo: "vigor" });
    assert.equal(r.sucessosLiquidos, 1);
    assert.equal(r.tipoFerimento, "agravante"); // 1 >= Vigor grau cheio 1
    assert.equal(r.feridas, 1);
  });
  it("Letal: reduz o Vigor necessário, pode virar agravante que seria superficial", (t) => {
    const defender = withAttrs(makeCharacter(), { vigor: "D" }); // grau cheio 2
    // defesa: vigor D(2) + defesaProf E(1) = 3 dados
    mockDice(t, [7, /*defesa*/ 1, 1, 1]); // sucessosLiquidos = 1
    const semLetal = resolveAtaque({ attacker: makeCharacter(), defender, tipoAtaque: "marcial", totalDiceAtaque: 1, defesaAtributo: "vigor" });
    assert.equal(semLetal.tipoFerimento, "superficial"); // 1 < 2
    const restore = Math.random;
    Math.random = queuedRandom([7, 1, 1, 1]);
    try {
      const comLetal = resolveAtaque({ attacker: makeCharacter(), defender, tipoAtaque: "marcial", totalDiceAtaque: 1, descritoresAtaque: ["letal"], defesaAtributo: "vigor" });
      assert.equal(comLetal.tipoFerimento, "agravante"); // 1 >= (2-1)
    } finally {
      Math.random = restore;
    }
  });
  it("magia marcada 'superficial' sempre causa ferimento superficial", (t) => {
    const defender = makeCharacter(); // Vigor E = 1, qualquer sucesso líquido já bateria agravante
    mockDice(t, [7, /*defesa*/ 1, 1]);
    const r = resolveAtaque({ attacker: makeCharacter(), defender, tipoAtaque: "marcial", totalDiceAtaque: 1, defesaAtributo: "vigor", superficial: true });
    assert.equal(r.tipoFerimento, "superficial");
  });
  it("respeita o número de feridas do ataque/magia quando causa ferimento", (t) => {
    mockDice(t, [7, /*defesa*/ 1, 1]);
    const r = resolveAtaque({ attacker: makeCharacter(), defender: makeCharacter(), tipoAtaque: "marcial", totalDiceAtaque: 1, defesaAtributo: "vigor", feridas: 2 });
    assert.equal(r.feridas, 2);
  });
  it("Blindado eleva o limiar do atacante pra 7+", (t) => {
    const defender = withDescritores(makeCharacter(), ["blindado"]);
    mockDice(t, [7, /*defesa*/ 1, 1]); // 7 não bate 7+ (precisa >6, ou seja 7 conta — checar limiar exato)
    const r = resolveAtaque({ attacker: makeCharacter(), defender, tipoAtaque: "marcial", totalDiceAtaque: 1, defesaAtributo: "vigor" });
    assert.equal(r.limiar, LIMIAR_BLINDADO);
    assert.equal(r.rolagemAtaque.successes, 1); // 7 > 6 (LIMIAR_BLINDADO) ainda é sucesso
  });
  it("Blindado bloqueia um dado 6 (que passaria no limiar padrão)", (t) => {
    const defender = withDescritores(makeCharacter(), ["blindado"]);
    mockDice(t, [6, /*defesa*/ 1, 1]);
    const r = resolveAtaque({ attacker: makeCharacter(), defender, tipoAtaque: "marcial", totalDiceAtaque: 1, defesaAtributo: "vigor" });
    assert.equal(r.rolagemAtaque.successes, 0); // 6 não é >6
  });
  it("atacante Sortudo (próprio ou do ataque) aplica o re-roll na rolagem de ataque", (t) => {
    mockDice(t, [1, /*reroll*/ 9, /*defesa*/ 1, 1]);
    const r = resolveAtaque({ attacker: makeCharacter(), defender: makeCharacter(), tipoAtaque: "marcial", totalDiceAtaque: 1, descritoresAtaque: ["sortudo"], defesaAtributo: "vigor" });
    assert.equal(r.rolagemAtaque.sortudoAplicado.novo, 9);
  });
  // sortudo_fisico (14/10, Descendentes de Sabato, pedido do Pedro: "ganhe o
  // descritor sortudo para ataques físicos") — versão restrita do Sortudo
  // normal que só vale quando o ataque NÃO tem o descritor "magia".
  it("atacante com sortudo_fisico aplica o re-roll num ataque FÍSICO (sem descritor magia)", (t) => {
    const attacker = withDescritores(makeCharacter(), ["sortudo_fisico"]);
    mockDice(t, [1, /*reroll*/ 9, /*defesa*/ 1, 1]);
    const r = resolveAtaque({ attacker, defender: makeCharacter(), tipoAtaque: "marcial", totalDiceAtaque: 1, descritoresAtaque: [], defesaAtributo: "vigor" });
    assert.equal(r.rolagemAtaque.sortudoAplicado.novo, 9);
  });
  it("atacante com sortudo_fisico NÃO re-rola num ataque MÁGICO (descritor magia presente)", (t) => {
    const attacker = withDescritores(makeCharacter(), ["sortudo_fisico"]);
    mockDice(t, [1, /*defesa*/ 1, 1]); // sem reroll — só 3 dados consumidos
    const r = resolveAtaque({ attacker, defender: makeCharacter(), tipoAtaque: "magico", totalDiceAtaque: 1, descritoresAtaque: ["magia"], defesaAtributo: "vigor" });
    assert.equal(r.rolagemAtaque.sortudoAplicado, null);
    assert.deepEqual(r.rolagemAtaque.dice, [1]);
  });
  it("sortudo normal (não o _fisico) continua valendo em ataque mágico também", (t) => {
    const attacker = withDescritores(makeCharacter(), ["sortudo"]);
    mockDice(t, [1, /*reroll*/ 9, /*defesa*/ 1, 1]);
    const r = resolveAtaque({ attacker, defender: makeCharacter(), tipoAtaque: "magico", totalDiceAtaque: 1, descritoresAtaque: ["magia"], defesaAtributo: "vigor" });
    assert.equal(r.rolagemAtaque.sortudoAplicado.novo, 9);
  });
  // limiarOverride / totalDiceDefesaManual (14/10, painel Teste — abas
  // Ataque/Magia, pedido do Pedro): a aba Magia ganhou um "Limiar de
  // sucesso" manual (pula limiarAtaque) e as abas Ataque/Magia passaram a
  // pedir "quantos dados o defensor rola" direto em vez de atributo de
  // defesa (ver resolveRolagemDefesa:totalDiceManual).
  it("limiarOverride ignora o cálculo automático de Blindado/Perfurante", (t) => {
    const defender = withDescritores(makeCharacter(), ["blindado"]); // normalmente forçaria limiar 6 (7+)
    mockDice(t, [6, /*defesa*/ 1, 1]);
    const r = resolveAtaque({ attacker: makeCharacter(), defender, totalDiceAtaque: 1, defesaAtributo: "vigor", limiarOverride: 5 });
    assert.equal(r.limiar, 5);
    assert.equal(r.rolagemAtaque.successes, 1); // 6 > 5, sucesso (não precisaria de 7+)
  });
  it("totalDiceDefesaManual repassa pra resolveRolagemDefesa (bypassa atributo/proficiência do alvo)", (t) => {
    const defender = withAttrs(makeCharacter(), { vigor: "A" }); // ignorado
    mockDice(t, [7, /*defesa*/ 1]);
    const r = resolveAtaque({ attacker: makeCharacter(), defender, totalDiceAtaque: 1, defesaAtributo: "vigor", totalDiceDefesaManual: 1 });
    assert.equal(r.rolagemDefesa.totalDice, 1);
  });

  // Queimadura (Pedro, 19/10) — resolveAtaque chama resolveQueimadura por
  // cima da resolução normal, sem misturar os sucessos dos dois.
  it("sem o descritor Queimadura, result.queimadura é null", (t) => {
    mockDice(t, [7, /*defesa*/ 1, 1]);
    const r = resolveAtaque({ attacker: makeCharacter(), defender: makeCharacter(), totalDiceAtaque: 1, defesaAtributo: "vigor" });
    assert.equal(r.queimadura, null);
  });
  it("com Queimadura e sucesso líquido >=1, rola a queimadura separada (ferimentos à parte)", (t) => {
    const defender = makeCharacter(); // Vigor E, grau cheio 1
    mockDice(t, [7, /*defesa*/ 1, 1, /*queimadura*/ 9]);
    const r = resolveAtaque({
      attacker: makeCharacter(), defender, totalDiceAtaque: 1,
      descritoresAtaque: ["queimadura"], defesaAtributo: "vigor",
    });
    assert.equal(r.sucessosLiquidos, 1);
    assert.equal(r.tipoFerimento, "agravante");
    assert.equal(r.feridas, 1);
    assert.ok(r.queimadura);
    assert.equal(r.queimadura.dados, 1);
    assert.equal(r.queimadura.sucessos, 1);
    assert.equal(r.queimadura.tipoFerimento, "agravante");
    assert.equal(r.queimadura.feridas, 1);
  });
  it("sem sucesso líquido no ataque principal (defesa cancela tudo), Queimadura não dispara", (t) => {
    mockDice(t, [6, /*defesa*/ 9, 9]); // sucessosLiquidos = 0, nenhum dado extra de queimadura consumido
    const r = resolveAtaque({
      attacker: makeCharacter(), defender: makeCharacter(), totalDiceAtaque: 1,
      descritoresAtaque: ["queimadura"], defesaAtributo: "vigor",
    });
    assert.equal(r.sucessosLiquidos, 0);
    assert.equal(r.queimadura, null);
  });

  // Descritores novos (21/10) wired no resultado de resolveAtaque.
  it("result.resistente reflete o descritor do defensor", (t) => {
    const defender = withDescritores(makeCharacter(), ["resistente"]);
    mockDice(t, [7, /*defesa*/ 1, 1]);
    const r = resolveAtaque({ attacker: makeCharacter(), defender, totalDiceAtaque: 1, defesaAtributo: "vigor" });
    assert.equal(r.resistente, true);
    assert.equal(r.tipoFerimento, "superficial"); // Vigor necessário 1+1=2, só 1 sucesso líquido
  });
  it("result.envenenamento/carga/drenante são wired e null quando o ataque não tem o descritor", (t) => {
    mockDice(t, [7, /*defesa*/ 1, 1]);
    const r = resolveAtaque({ attacker: makeCharacter(), defender: makeCharacter(), totalDiceAtaque: 1, defesaAtributo: "vigor" });
    assert.equal(r.envenenamento, null);
    assert.equal(r.carga, null);
    assert.equal(r.drenante, null);
  });
  it("Drenante: wired no resultado quando o ataque tem o descritor, houve sucesso líquido e o alvo tem mana", (t) => {
    mockDice(t, [7, /*defesa*/ 1, 1]);
    const defender = { ...makeCharacter(), mp: { current: 2, max: 3 } };
    const r = resolveAtaque({
      attacker: makeCharacter(), defender, totalDiceAtaque: 1,
      descritoresAtaque: ["drenante"], defesaAtributo: "vigor",
    });
    assert.deepEqual(r.drenante, { aplicou: true, manaRoubadaDoAlvo: 1, manaRecuperadaPeloAtacante: 1 });
  });
  it("Carga: wired e passa cargasAtuais/cargasDepois corretamente", (t) => {
    mockDice(t, [7, /*defesa*/ 1, 1, /*descarga carga_1*/ 10]);
    const r = resolveAtaque({
      attacker: makeCharacter(), defender: makeCharacter(), totalDiceAtaque: 1,
      descritoresAtaque: ["carga_1"], defesaAtributo: "vigor", cargasAtuais: 0,
    });
    assert.equal(r.carga.descarregou, true); // 1 sucesso líquido >= carga_1
    assert.equal(r.carga.cargasDepois, 0);
  });
  it("Envenenamento: wired e respeita limiteAtual/feridasAtuais passados", (t) => {
    mockDice(t, [7, /*defesa*/ 1, 1, /*envenenamento_1*/ 10]);
    const r = resolveAtaque({
      attacker: makeCharacter(), defender: makeCharacter(), totalDiceAtaque: 1,
      descritoresAtaque: ["envenenamento_1"], defesaAtributo: "vigor",
      envenenamentoLimiteAtual: 0, envenenamentoFeridasAtuais: 0,
    });
    assert.equal(r.envenenamento.aplicouFerimento, true);
    assert.equal(r.envenenamento.limiteDepois, 1);
  });
});

describe("resolveAtaque — Queimadura concedida pelo personagem (Encantamento Flamejante, 19/10)", () => {
  it("character.descritores com 'queimadura' NÃO entra automaticamente — quem chama precisa montar descritoresAtaque via descritoresEfetivosDoAtaque", (t) => {
    // resolveAtaque é agnóstico a quem monta descritoresAtaque (docs/
    // SISTEMA_MAGIA.md) — a soma do descritor de PERSONAGEM acontece em
    // descritoresEfetivosDoAtaque (ver describe acima), não dentro de
    // resolveAtaque. Este teste documenta essa fronteira.
    const attacker = withDescritores(makeCharacter(), ["queimadura"]);
    mockDice(t, [7, /*defesa*/ 1, 1]); // sem dado extra de queimadura: descritoresAtaque não foi passado
    const r = resolveAtaque({ attacker, defender: makeCharacter(), totalDiceAtaque: 1, defesaAtributo: "vigor" });
    assert.equal(r.queimadura, null);
  });
});

// ---------------------------------------------------------------------------
// resolveAtaqueEmArea — "Em área": rola uma vez, cada alvo defende por si
// ---------------------------------------------------------------------------

describe("resolveAtaqueEmArea", () => {
  it("rola o ataque uma única vez e aplica contra a defesa de cada alvo", (t) => {
    const alvo1 = makeCharacter(); // defesa: vigor E(1)+defesaProf E(1) = 2 dados
    const alvo2 = withAttrs(makeCharacter(), { vigor: "C" }); // defesa: vigor C(3)+defesaProf E(1) = 4 dados
    mockDice(t, [7, 8, /*defesa alvo1*/ 1, 1, /*defesa alvo2*/ 1, 1, 1, 1]);
    const r = resolveAtaqueEmArea({
      attacker: makeCharacter(), defenders: [alvo1, alvo2], tipoAtaque: "marcial",
      totalDiceAtaque: 2, defesaAtributo: "vigor",
    });
    assert.equal(r.rolagemAtaqueBase.successes, 2); // mesma rolagem reaproveitada
    assert.equal(r.resultados.length, 2);
    assert.equal(r.resultados[0].sucessosAtaque, 2);
    assert.equal(r.resultados[1].sucessosAtaque, 2);
  });
  it("cada alvo tem seu próprio limiar (Blindado individual)", (t) => {
    const alvoBlindado = withDescritores(makeCharacter(), ["blindado"]);
    const alvoNormal = makeCharacter();
    mockDice(t, [6, /*defesa alvoBlindado*/ 1, 1, /*defesa alvoNormal*/ 1, 1]);
    const r = resolveAtaqueEmArea({
      attacker: makeCharacter(), defenders: [alvoBlindado, alvoNormal], tipoAtaque: "marcial",
      totalDiceAtaque: 1, defesaAtributo: "vigor",
    });
    assert.equal(r.resultados[0].sucessosAtaque, 0); // 6 não bate 7+ pro Blindado
    assert.equal(r.resultados[1].sucessosAtaque, 1); // 6 bate 6+ pro normal
  });
  it("Queimadura (19/10) é resolvida por alvo, a partir dos sucessos líquidos de cada um", (t) => {
    const alvo1 = makeCharacter(); // Vigor E, defesa 2 dados
    const alvo2 = withAttrs(makeCharacter(), { vigor: "D" }); // Vigor D (grau cheio 2), defesa 3 dados
    mockDice(t, [
      7, // ataque base, 1 sucesso
      /*defesa alvo1*/ 1, 1,
      /*queimadura alvo1*/ 9,
      /*defesa alvo2*/ 1, 1, 1,
      /*queimadura alvo2*/ 9,
    ]);
    const r = resolveAtaqueEmArea({
      attacker: makeCharacter(), defenders: [alvo1, alvo2], tipoAtaque: "marcial",
      totalDiceAtaque: 1, defesaAtributo: "vigor", descritoresAtaque: ["queimadura"],
    });
    assert.ok(r.resultados[0].queimadura);
    assert.equal(r.resultados[0].queimadura.sucessos, 1);
    assert.equal(r.resultados[0].queimadura.tipoFerimento, "agravante"); // 1 >= Vigor grau cheio 1
    assert.ok(r.resultados[1].queimadura);
    assert.equal(r.resultados[1].queimadura.sucessos, 1);
    assert.equal(r.resultados[1].queimadura.tipoFerimento, "superficial"); // 1 < Vigor grau cheio 2
  });
  it("defesaAtributoPorDefensor escolhe o atributo de defesa individualmente", (t) => {
    const alvo1 = withAttrs(makeCharacter(), { vigor: "B" });
    const alvo2 = withAttrs(makeCharacter(), { destreza: "B" });
    mockDice(t, [7, /*defesa alvo1 (vigor B=4 + defesaProf E=1 = 5)*/ 1, 1, 1, 1, 1, /*defesa alvo2 (destreza B=4+1=5)*/ 1, 1, 1, 1, 1]);
    const r = resolveAtaqueEmArea({
      attacker: makeCharacter(), defenders: [alvo1, alvo2], tipoAtaque: "marcial",
      totalDiceAtaque: 1, defesaAtributoPorDefensor: (d) => (d === alvo1 ? "vigor" : "destreza"),
    });
    assert.equal(r.resultados[0].rolagemDefesa.totalDice, 5);
    assert.equal(r.resultados[1].rolagemDefesa.totalDice, 5);
  });
});

// ---------------------------------------------------------------------------
// defaultAttacksForCharacter / BASE_ATTACK_TYPES
// ---------------------------------------------------------------------------

describe("defaultAttacksForCharacter", () => {
  it("retorna Ataque desarmado, Arma branca e Revólver", () => {
    const nomes = defaultAttacksForCharacter().map((a) => a.nome);
    assert.deepEqual(nomes, ["Ataque desarmado", "Arma branca", "Revólver"]);
  });
  it("ataques desarmados não são letais por padrão; os outros dois são", () => {
    const [desarmado, armaBranca, revolver] = defaultAttacksForCharacter();
    assert.equal(desarmado.descritores.includes("letal"), false);
    assert.equal(armaBranca.descritores.includes("letal"), true);
    assert.equal(revolver.descritores.includes("letal"), true);
  });
});

// ---------------------------------------------------------------------------
// Fichas do Grupo Aurora (Sidepoint) — confere Defesa/Acerto/HP/SP (Resistência
// Natural saiu da ficha em 14/10, não é mais testada aqui).
// ---------------------------------------------------------------------------

// 21/10: a antiga estatística "defesa" (computeStat, fórmula "8 + bônus")
// saiu de STAT_LIST/STAT_BASE_DEFAULTS/STAT_PROF_LINK (docs/ATUALIZACAO_21-10.md
// item 1, "remova a fórmula antiga Defesa = 8+bônus e o painel antigo de
// Defesa") — por isso os valores "esperado.defesa" abaixo (que já refletiam
// essa fórmula morta, nunca lida por resolveAtaque de verdade) saíram do
// teste junto. A Defesa de verdade agora é a rolagem em resolveRolagemDefesa
// (ver describe acima), que já usa defesaProf.
describe("fichas do Grupo Aurora (Sidepoint)", () => {
  const corpoACorpo = ACERTOS_POR_TIPO.find((e) => e.key === "corpoACorpo");
  const armaDeFogo = ACERTOS_POR_TIPO.find((e) => e.key === "armaDeFogo");

  const AURORA = [
    {
      nome: "Leon Winters",
      atributosGerais: { destreza: "C", vigor: "E" },
      proficiencias: { combateCorpoACorpo: "C", armasDeFogo: "E", defesaProf: "D" },
      procs: ["golpe_certeiro", "reflexo_agil", "persistente"],
      esperado: { acerto: [4, 2], hp: 3, sp: 4 },
    },
    {
      nome: "Merkel Winters",
      atributosGerais: { destreza: "D", vigor: "D" },
      proficiencias: { combateCorpoACorpo: "C", armasDeFogo: "E", defesaProf: "D" },
      procs: ["persistente", "instinto_selvagem", "furia_crescente"],
      esperado: { acerto: [3, 1], hp: 4, sp: 4 },
    },
    {
      nome: "Raiko",
      atributosGerais: { destreza: "E", vigor: "D" },
      proficiencias: { combateCorpoACorpo: "D", armasDeFogo: "E", defesaProf: "E" },
      procs: ["golpe_penetrante", "furia_crescente", "instinto_selvagem"],
      esperado: { acerto: [1, 0], hp: 3, sp: 3 },
    },
    {
      nome: "Akira Cagliostro",
      atributosGerais: { destreza: "C", vigor: "E" },
      proficiencias: { combateCorpoACorpo: "E", armasDeFogo: "E", defesaProf: "D" },
      procs: ["reflexo_agil", "golpe_certeiro", "persistente"],
      esperado: { acerto: [2, 2], hp: 3, sp: 4 },
    },
    {
      nome: "K (Kanny)",
      atributosGerais: { destreza: "C", vigor: "E" },
      proficiencias: { combateCorpoACorpo: "D", armasDeFogo: "D", defesaProf: "E" },
      procs: ["reflexo_agil", "golpe_certeiro", "furia_crescente"],
      esperado: { acerto: [3, 3], hp: 2, sp: 3 },
    },
    {
      nome: "Mevil Ishran",
      atributosGerais: { destreza: "E", vigor: "D" },
      proficiencias: { combateCorpoACorpo: "D", armasDeFogo: "E", defesaProf: "D" },
      procs: ["persistente", "blindagem_reativa", "fortaleza_viva"],
      esperado: { acerto: [1, 0], hp: 4, sp: 4 },
    },
  ];

  for (const ficha of AURORA) {
    it(`${ficha.nome}: Defesa, Acerto por tipo e HP/SP batem com a ficha`, () => {
      const c = makeCharacter({
        atributosGerais: { ...makeCharacter().atributosGerais, ...ficha.atributosGerais },
        proficiencias: { ...PROFICIENCIAS_DEFAULT, ...ficha.proficiencias },
        procs: ficha.procs,
        sp: { max: 3 }, // no arquivo de sementes, sp.max salvo é sempre 3 — computeMaxSP soma o +1 do Persistente
      });
      assert.equal(computeAcertoTipo(c, corpoACorpo).total, ficha.esperado.acerto[0], "Acerto corpo a corpo");
      assert.equal(computeAcertoTipo(c, armaDeFogo).total, ficha.esperado.acerto[1], "Acerto arma de fogo");
      assert.equal(computeMaxHP(c), ficha.esperado.hp, "HP máximo");
      assert.equal(computeMaxSP(c), ficha.esperado.sp, "SP máximo");
    });
  }
});
