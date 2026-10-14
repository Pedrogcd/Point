// Suíte de testes do motor de combate do Point (universo Amaranth).
// Roda com `node --test` (Node >=20, nativo, sem dependências) ou `npm test`.
// Valida engine.js regra por regra contra docs/SISTEMA_MAGIA.md (modelo de
// combate novo, 14/10) e SISTEMA.md (o que não mudou). Usa Math.random
// mockado (t.mock.method) pra ter dados controlados.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PROFICIENCIAS_DEFAULT, PROC_ABILITIES, BASE_ATTACK_TYPES, ACERTOS_POR_TIPO,
  attrBonus, computeMaxHP, computeMaxSP, computeMaxMana, MANA_MIN, MANA_MAX,
  limiarDaHabilidade, findTriggeredProc, computeStat, computeAcertoTipo,
  rollSuccessDice, migrateBrigaProfKey, defaultAttacksForCharacter,
  temDescritor, limiarAtaque, LIMIAR_SUCESSO, LIMIAR_BLINDADO, rolarComSortudo,
  extraDeManaMagica, diceBaseMagica, diceAtaqueFisico, diceAtaqueMagico,
  contagemOficiosMagicos,
  resolveRolagemDefesa, determinarFerimento, aplicarFerimentos, resolveAtaque,
  resolveAtaqueEmArea, descritoresEfetivosDoAtaque,
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

// ---------------------------------------------------------------------------
// computeStat
// ---------------------------------------------------------------------------

describe("computeStat", () => {
  it("Defesa = 8 + bônus (E=0..A=+4) da Proficiência de Defesa", () => {
    const c = makeCharacter();
    assert.equal(computeStat(c, "defesa"), 8); // defesaProf E = +0
    assert.equal(computeStat(withProfs(c, { defesaProf: "C" }), "defesa"), 10); // +2
    assert.equal(computeStat(withProfs(c, { defesaProf: "A" }), "defesa"), 12); // +4
  });
  it("Resistência Armadura = 8, sem proficiência vinculada (vestígio — sem função mecânica no resolveAtaque novo)", () => {
    const c = makeCharacter();
    assert.equal(computeStat(c, "resistArmadura"), 8);
    assert.equal(computeStat(withProfs(c, { defesaProf: "A", resistFisicaProf: "A" }), "resistArmadura"), 8);
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
  it("desarmado_letal não afeta ataques que não são desarmados", () => {
    const atacanteSemLetal = makeCharacter();
    assert.deepEqual(descritoresEfetivosDoAtaque(atacanteSemLetal, ARMA_BRANCA), ["letal"]);
  });
});

// ---------------------------------------------------------------------------
// Base mágica (2d10 + extra de mana) e pools de dados de ataque
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// resolveRolagemDefesa
// ---------------------------------------------------------------------------

describe("resolveRolagemDefesa", () => {
  it("Resistência Física + Atributo Geral escolhido, contra ataque físico", (t) => {
    const defensor = withProfs(withAttrs(makeCharacter(), { vigor: "C" }), { resistFisicaProf: "B" }); // 3+4=7 dados
    mockDice(t, [1, 1, 1, 1, 1, 1, 1]);
    const r = resolveRolagemDefesa({ defensor, defesaAtributo: "vigor" });
    assert.equal(r.totalDice, 7);
    assert.equal(r.profKey, "resistFisicaProf");
  });
  it("14/10: contra ataque mágico também é só Resistência Física (Resistência Mágica não existe mais)", (t) => {
    const defensor = withProfs(makeCharacter(), { resistFisicaProf: "A" });
    mockDice(t, [1, 1, 1, 1, 1, 1]); // vigor E(1) + resistFisicaProf A(5) = 6
    const r = resolveRolagemDefesa({ defensor, defesaAtributo: "vigor", ehMagia: true });
    assert.equal(r.profKey, "resistFisicaProf");
    assert.equal(r.totalDice, 6);
  });
  it("Saturante: -2 dados (mín. 0) só quando a defesa usa Destreza como base", (t) => {
    const defensor = withAttrs(makeCharacter(), { destreza: "D" }); // destreza D(2) + resistFisicaProf E(1) = 3
    mockDice(t, [1]); // 3-2=1 dado
    const r = resolveRolagemDefesa({ defensor, defesaAtributo: "destreza", saturante: true });
    assert.equal(r.totalDice, 1);
  });
  it("Saturante não reduz nada se a defesa não usar Destreza", (t) => {
    const defensor = withAttrs(makeCharacter(), { vigor: "D" });
    mockDice(t, [1, 1, 1]);
    const r = resolveRolagemDefesa({ defensor, defesaAtributo: "vigor", saturante: true });
    assert.equal(r.totalDice, 3); // vigor D(2) + resistFisicaProf E(1), sem redução
  });
  it("Saturante nunca deixa o pool negativo", (t) => {
    const defensor = makeCharacter(); // destreza E(1) + resistFisicaProf E(1) = 2
    mockDice(t, [1]); // rollSuccessDice sempre rola ao menos 1 dado, mesmo com totalDice=0
    const r = resolveRolagemDefesa({ defensor, defesaAtributo: "destreza", saturante: true });
    assert.equal(r.totalDice, 0);
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
    // defesa: vigor D(2) + resistFisicaProf E(1) = 3 dados
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
});

// ---------------------------------------------------------------------------
// resolveAtaqueEmArea — "Em área": rola uma vez, cada alvo defende por si
// ---------------------------------------------------------------------------

describe("resolveAtaqueEmArea", () => {
  it("rola o ataque uma única vez e aplica contra a defesa de cada alvo", (t) => {
    const alvo1 = makeCharacter(); // defesa: vigor E(1)+resistFisicaProf E(1) = 2 dados
    const alvo2 = withAttrs(makeCharacter(), { vigor: "C" }); // defesa: vigor C(3)+resistFisicaProf E(1) = 4 dados
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
  it("defesaAtributoPorDefensor escolhe o atributo de defesa individualmente", (t) => {
    const alvo1 = withAttrs(makeCharacter(), { vigor: "B" });
    const alvo2 = withAttrs(makeCharacter(), { destreza: "B" });
    mockDice(t, [7, /*defesa alvo1 (vigor B=4 + resistFisicaProf E=1 = 5)*/ 1, 1, 1, 1, 1, /*defesa alvo2 (destreza B=4+1=5)*/ 1, 1, 1, 1, 1]);
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

describe("fichas do Grupo Aurora (Sidepoint)", () => {
  const corpoACorpo = ACERTOS_POR_TIPO.find((e) => e.key === "corpoACorpo");
  const armaDeFogo = ACERTOS_POR_TIPO.find((e) => e.key === "armaDeFogo");

  const AURORA = [
    {
      nome: "Leon Winters",
      atributosGerais: { destreza: "C", vigor: "E" },
      proficiencias: { combateCorpoACorpo: "C", armasDeFogo: "E", defesaProf: "D" },
      procs: ["golpe_certeiro", "reflexo_agil", "persistente"],
      esperado: { defesa: 9, acerto: [4, 2], hp: 3, sp: 4 },
    },
    {
      nome: "Merkel Winters",
      atributosGerais: { destreza: "D", vigor: "D" },
      proficiencias: { combateCorpoACorpo: "C", armasDeFogo: "E", defesaProf: "D" },
      procs: ["persistente", "instinto_selvagem", "furia_crescente"],
      esperado: { defesa: 9, acerto: [3, 1], hp: 4, sp: 4 },
    },
    {
      nome: "Raiko",
      atributosGerais: { destreza: "E", vigor: "D" },
      proficiencias: { combateCorpoACorpo: "D", armasDeFogo: "E", defesaProf: "E" },
      procs: ["golpe_penetrante", "furia_crescente", "instinto_selvagem"],
      esperado: { defesa: 8, acerto: [1, 0], hp: 3, sp: 3 },
    },
    {
      nome: "Akira Cagliostro",
      atributosGerais: { destreza: "C", vigor: "E" },
      proficiencias: { combateCorpoACorpo: "E", armasDeFogo: "E", defesaProf: "D" },
      procs: ["reflexo_agil", "golpe_certeiro", "persistente"],
      esperado: { defesa: 9, acerto: [2, 2], hp: 3, sp: 4 },
    },
    {
      nome: "K (Kanny)",
      atributosGerais: { destreza: "C", vigor: "E" },
      proficiencias: { combateCorpoACorpo: "D", armasDeFogo: "D", defesaProf: "E" },
      procs: ["reflexo_agil", "golpe_certeiro", "furia_crescente"],
      esperado: { defesa: 8, acerto: [3, 3], hp: 2, sp: 3 },
    },
    {
      nome: "Mevil Ishran",
      atributosGerais: { destreza: "E", vigor: "D" },
      proficiencias: { combateCorpoACorpo: "D", armasDeFogo: "E", defesaProf: "D" },
      procs: ["persistente", "blindagem_reativa", "fortaleza_viva"],
      esperado: { defesa: 9, acerto: [1, 0], hp: 4, sp: 4 },
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
      assert.equal(computeStat(c, "defesa"), ficha.esperado.defesa, "Defesa");
      assert.equal(computeAcertoTipo(c, corpoACorpo).total, ficha.esperado.acerto[0], "Acerto corpo a corpo");
      assert.equal(computeAcertoTipo(c, armaDeFogo).total, ficha.esperado.acerto[1], "Acerto arma de fogo");
      assert.equal(computeMaxHP(c), ficha.esperado.hp, "HP máximo");
      assert.equal(computeMaxSP(c), ficha.esperado.sp, "SP máximo");
    });
  }
});
