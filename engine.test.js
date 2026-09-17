// Suíte de testes do motor de combate do Point (universo Amaranth).
// Roda com `node --test` (Node >=20, nativo, sem dependências) ou `npm test`.
// Valida engine.js regra por regra contra SISTEMA.md e CONTEXTO.md. Usa
// Math.random mockado (t.mock.method) pra ter dados controlados — exceto nos
// testes de balanceamento estatístico, que rodam com aleatoriedade real e
// muitas amostras.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PROFICIENCIAS_DEFAULT, PROC_ABILITIES, BASE_ATTACK_TYPES,
  attrBonus, computeMaxHP, computeMaxSP, limiarDaHabilidade, findTriggeredProc,
  resolveAttack, computeStat, rollSuccessDice,
} from "./engine.js";

const SOCO = BASE_ATTACK_TYPES.find((a) => a.id === "soco");
const ARMA_BRANCA = BASE_ATTACK_TYPES.find((a) => a.id === "arma_branca");
const SHIN = BASE_ATTACK_TYPES.find((a) => a.id === "shin");

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
function withArmadura(character) {
  return { ...character, itens: { armadura: ["Armadura física"] } };
}

// Converte uma sequência de valores de dado (1-10) numa função de Math.random
// que devolve esses valores em ordem, na ordem exata em que o motor os
// consome (dado d = Math.floor(Math.random()*10)+1, então usamos (d-0.5)/10
// pra cair sempre dentro do bucket certo). Lança erro se o motor pedir mais
// dados do que os que foram enfileirados — isso normalmente indica que a
// ordem de consumo de Math.random no motor mudou e o teste precisa ser revisto.
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
// attrBonus / computeMaxHP / computeMaxSP
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

// ---------------------------------------------------------------------------
// computeStat
// ---------------------------------------------------------------------------

describe("computeStat", () => {
  it("Defesa = 8 + Proficiência de Defesa", () => {
    const c = makeCharacter();
    assert.equal(computeStat(c, "defesa"), 8); // defesaProf E = +0
    assert.equal(computeStat(withProfs(c, { defesaProf: "C" }), "defesa"), 10); // +2
  });
  it("Resistência Armadura = 8, sem proficiência vinculada", () => {
    const c = makeCharacter();
    assert.equal(computeStat(c, "resistArmadura"), 8);
    // proficiências de combate não afetam a Resistência Armadura
    assert.equal(computeStat(withProfs(c, { defesaProf: "A", resistFisicaProf: "A" }), "resistArmadura"), 8);
  });
  it("Resistência Natural Física = 6 + Proficiência de Resistência Física", () => {
    const c = makeCharacter();
    assert.equal(computeStat(c, "resistNaturalFisica"), 6);
    assert.equal(computeStat(withProfs(c, { resistFisicaProf: "A" }), "resistNaturalFisica"), 10);
  });
  it("Resistência Natural Mágica = 6 + Proficiência de Resistência Mágica", () => {
    const c = makeCharacter();
    assert.equal(computeStat(c, "resistNaturalMagica"), 6);
    assert.equal(computeStat(withProfs(c, { resistMagicaProf: "B" }), "resistNaturalMagica"), 9);
  });
  it("respeita statBase customizado e statTemp", () => {
    const c = { ...makeCharacter(), statBase: { defesa: 10 }, statTemp: { defesa: -2 } };
    assert.equal(computeStat(c, "defesa"), 8); // 10 - 2 + 0(prof)
  });
  it("acerto soma o vínculo padrão de Destreza", () => {
    const c = withAttrs(makeCharacter(), { destreza: "D" });
    assert.equal(computeStat(c, "acerto"), 1); // base 0 + bônus D (+1)
  });
});

// ---------------------------------------------------------------------------
// limiarDaHabilidade
// ---------------------------------------------------------------------------

describe("limiarDaHabilidade", () => {
  it("limiar = 11 - grau, via proficiência", () => {
    const golpeCerteiro = PROC_ABILITIES.find((p) => p.id === "golpe_certeiro");
    const c = withProfs(makeCharacter(), { tecnicaProf: "E" });
    assert.equal(limiarDaHabilidade(c, golpeCerteiro), 10);
    assert.equal(limiarDaHabilidade(withProfs(c, { tecnicaProf: "A" }), golpeCerteiro), 6);
  });
  it("limiar = 11 - grau, via atributo", () => {
    const ataquePoderoso = PROC_ABILITIES.find((p) => p.id === "instinto_selvagem");
    const c = withAttrs(makeCharacter(), { forca: "C" });
    assert.equal(limiarDaHabilidade(c, ataquePoderoso), 8);
  });
  it("com múltiplas fontes, usa o melhor (mais baixo) limiar", () => {
    const p = { atributosLimiar: ["forca"], proficienciasLimiar: ["tecnicaProf"] };
    const c = withProfs(withAttrs(makeCharacter(), { forca: "D" }), { tecnicaProf: "A" }); // limiares 9 e 6
    assert.equal(limiarDaHabilidade(c, p), 6);
  });
  it("sem atributo/proficiência de limiar, retorna 10 (padrão)", () => {
    assert.equal(limiarDaHabilidade(makeCharacter(), {}), 10);
  });
});

// ---------------------------------------------------------------------------
// findTriggeredProc
// ---------------------------------------------------------------------------

describe("findTriggeredProc", () => {
  it("retorna null se o personagem não tem a habilidade equipada", () => {
    assert.equal(findTriggeredProc(makeCharacter(), "acerto_proprio", 10, "marcial"), null);
  });
  it("dispara só quando o dado bate o limiar", () => {
    const c = withProfs({ ...makeCharacter(), procs: ["golpe_certeiro"] }, { tecnicaProf: "A" }); // limiar 6
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
  it("com dois procs elegíveis no mesmo dado, vence o de maior prioridade", () => {
    // golpe_certeiro (prioridade 2) vs instinto_selvagem (prioridade 1), ambos elegíveis em marcial
    const c = withAttrs(
      withProfs({ ...makeCharacter(), procs: ["golpe_certeiro", "instinto_selvagem"] }, { tecnicaProf: "A" }),
      { forca: "A" }
    );
    assert.equal(findTriggeredProc(c, "acerto_proprio", 6, "marcial")?.id, "golpe_certeiro");
  });
});

// ---------------------------------------------------------------------------
// rollSuccessDice (testes fora de combate)
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

// ---------------------------------------------------------------------------
// resolveAttack — Acerto, crítico, Confirmação (mecânica base, sem habilidades)
// ---------------------------------------------------------------------------

describe("resolveAttack — Acerto e Confirmação básicos", () => {
  it("sucesso no Acerto é dado + bônus > Defesa do alvo (estritamente maior)", (t) => {
    const attacker = makeCharacter();
    const defender = makeCharacter(); // Defesa 8
    // Ataque desarmado: acertoBonus = destreza(0) + briga(0) + manual(+1) = 1
    mockDice(t, [7, 1, 1, /*confirm*/ 1]); // 7+1=8, não é >8 → falha
    const r1 = resolveAttack({ attacker, defender, attack: SOCO });
    assert.equal(r1.successes, 0);
  });
  it("8 no dado bate a Defesa 8 (8+1=9>8)", (t) => {
    const attacker = makeCharacter();
    const defender = makeCharacter();
    mockDice(t, [8, 1, 1, 5]);
    const r = resolveAttack({ attacker, defender, attack: SOCO });
    assert.equal(r.successes, 1);
  });
  it("crítico é 10 natural: soma +1 ao próprio dado e +1 na Confirmação gerada", (t) => {
    const attacker = makeCharacter();
    const defender = makeCharacter();
    mockDice(t, [10, 1, 1, /*confirm*/ 1]);
    const r = resolveAttack({ attacker, defender, attack: SOCO });
    assert.equal(r.successFlags[0].isCrit, true);
    assert.equal(r.successes, 1);
    // confirmBonus base (danoAttr forca E=0 + danoProf briga E=0 + manual dano "0"=0) = 0, +1 de crítico
    assert.equal(r.confirmRolls[0].veioDeCritico, true);
    assert.equal(r.confirmRolls[0].confirmBonus, 1);
  });
  it("Confirmação: 1d10 + bônus de dano por sucesso, contra a Resistência Natural (sem armadura)", (t) => {
    const attacker = withAttrs(makeCharacter(), { forca: "C" }); // danoAttrBonus +2
    const defender = makeCharacter(); // resistNaturalFisica 6, sem armadura
    mockDice(t, [8, 1, 1, /*confirm*/ 3]);
    const r = resolveAttack({ attacker, defender, attack: SOCO });
    // confirmBonusBase = forca(+2) + briga(0) + manual dano(0) = 2; total = 3+2 = 5 >= 6? não
    assert.equal(r.confirmRolls[0].confirmBonus, 2);
    assert.equal(r.confirmRolls[0].total, 5);
    assert.equal(r.confirmRolls[0].passou, false);
    assert.equal(r.feridaValor, 0);
  });
  it("Marcial escala: ferida = confirmações bem-sucedidas × ferida do ataque", (t) => {
    const attacker = withProfs(makeCharacter(), { briga: "A" }); // acertoProf +4, danoProf +4
    const defender = makeCharacter();
    // 2 sucessos no Acerto (dice 6 e 6: 6+1+4=11>8), 1 falha (die 1)
    mockDice(t, [6, 6, 1, /*confirm x2*/ 9, 9]);
    const r = resolveAttack({ attacker, defender, attack: SOCO });
    assert.equal(r.successes, 2);
    assert.equal(r.confirmedHits, 2);
    assert.equal(r.feridaValor, 2); // 2 confirmações × 1 de ferida (soco)
  });
  it("Arma de fogo/Mágico: ferida fixa, não escala com o número de confirmações", (t) => {
    const attacker = withProfs(makeCharacter(), { magiasOfensivas: "A" });
    const defender = makeCharacter();
    // shin: acerto "+3" fixo + profBonus(+4) = +7 — die baixo já garante sucesso
    mockDice(t, [3, 1, 1, /*confirm*/ 9]);
    const r = resolveAttack({ attacker, defender, attack: SHIN });
    assert.equal(r.successes, 1);
    assert.equal(r.feridaValor, 1); // ferida fixa do Shin, não multiplica
  });
  it("ataque com Acerto fixo (\"2S\") não rola dados de Acerto, vai direto pra Confirmação", (t) => {
    const attacker = makeCharacter();
    const defender = makeCharacter();
    const bombardeio = BASE_ATTACK_TYPES.find((a) => a.id === "bombardeio_de_mana");
    mockDice(t, [/*confirm x2*/ 9, 9]);
    const r = resolveAttack({ attacker, defender, attack: bombardeio });
    assert.equal(r.semRolagemDeAcerto, true);
    assert.equal(r.dice.length, 0);
    assert.equal(r.successes, 2);
  });
});

// ---------------------------------------------------------------------------
// Camadas de defesa: Escudo de Mana → Armadura → Resistência Natural
// ---------------------------------------------------------------------------

describe("camadas de defesa", () => {
  it("confirmações checam Escudo de Mana, depois Armadura, depois Resistência Natural, nessa ordem", (t) => {
    const attacker = withProfs(withAttrs(makeCharacter(), {}), { briga: "A" }); // danoProf +4
    const defender = withArmadura(
      withProfs({ ...makeCharacter(), procs: ["escudo_de_mana"] }, { magiasOfensivas: "C" }) // escudo = 8+2 = 10
    );
    // 3 sucessos no Acerto (briga A dá acertoBonus 4+1=5; defesa 8; die 6: 6+5=11>8)
    mockDice(t, [6, 6, 6, /*confirm x3*/ 9, 9, 9]);
    const r = resolveAttack({ attacker, defender, attack: SOCO });
    assert.equal(r.successes, 3);
    // confirmBonusBase = danoAttr forca(0) + danoProf briga(+4) = 4; total = 9+4 = 13 em cada uma
    assert.equal(r.confirmRolls[0].resistUsada, "escudoDeMana");
    assert.equal(r.confirmRolls[0].resistValor, 10);
    assert.equal(r.confirmRolls[1].resistUsada, "resistArmadura");
    assert.equal(r.confirmRolls[1].resistValor, 8);
    assert.equal(r.confirmRolls[2].resistUsada, "resistNaturalFisica");
    assert.equal(r.confirmRolls[2].resistValor, 6);
  });
  it("sem Escudo de Mana e sem Armadura, vai direto pra Resistência Natural", (t) => {
    const attacker = makeCharacter();
    const defender = makeCharacter();
    mockDice(t, [8, 1, 1, 9]);
    const r = resolveAttack({ attacker, defender, attack: SOCO });
    assert.equal(r.confirmRolls[0].resistUsada, "resistNaturalFisica");
  });
});

// ---------------------------------------------------------------------------
// As 11 Habilidades Passivas de Combate
// ---------------------------------------------------------------------------

describe("Habilidades Passivas de Combate", () => {
  it("Mestre do Crítico (furia_crescente): reduz o limiar de crítico em 1 (9+ em vez de 10)", (t) => {
    const attacker = { ...makeCharacter(), procs: ["furia_crescente"] };
    const defender = makeCharacter();
    mockDice(t, [9, 1, 1, /*confirm*/ 1]);
    const r = resolveAttack({ attacker, defender, attack: SOCO });
    assert.equal(r.successFlags[0].isCrit, true);
    assert.equal(r.successFlags[0].mestreCriticoUsado, true);
  });
  it("sem Mestre do Crítico, 9 não é crítico", (t) => {
    const attacker = makeCharacter();
    const defender = makeCharacter();
    mockDice(t, [9, 1, 1, 1]);
    const r = resolveAttack({ attacker, defender, attack: SOCO });
    assert.equal(r.successFlags[0].isCrit, false);
  });

  it("Golpe Preciso (golpe_certeiro): dado que bate o limiar de Técnica conta como 2 sucessos, uma vez por ataque", (t) => {
    const attacker = withProfs({ ...makeCharacter(), procs: ["golpe_certeiro"] }, { tecnicaProf: "A" }); // limiar 6
    const defender = makeCharacter();
    mockDice(t, [8, 1, 1, /*confirm x2*/ 9, 9]);
    const r = resolveAttack({ attacker, defender, attack: SOCO });
    assert.equal(r.successFlags[0].golpeCerteiroDispara, true);
    assert.equal(r.successFlags[0].sucessosGerados, 2);
    assert.equal(r.successes, 2);
  });

  it("Giro Defensivo (fortaleza_viva): dado de Confirmação inimiga que bate o limiar é re-rolado uma vez", (t) => {
    const attacker = makeCharacter();
    const defender = withProfs({ ...makeCharacter(), procs: ["fortaleza_viva"] }, { tecnicaProf: "A" }); // limiar 6
    mockDice(t, [8, 1, 1, /*confirm dRolado*/ 7, /*reroll*/ 3]);
    const r = resolveAttack({ attacker, defender, attack: SOCO });
    assert.equal(r.confirmRolls[0].rerolado, true);
    assert.equal(r.confirmRolls[0].dadoOriginal, 7);
    assert.equal(r.confirmRolls[0].die, 3);
  });

  it("Potencial Mágico Ofensivo (surto_arcano): em Mágico, dado de Confirmação que bate limiar soma +1 no Dano", (t) => {
    const attacker = withProfs({ ...makeCharacter(), procs: ["surto_arcano"] }, { magiasOfensivas: "A" }); // limiar 6
    const defender = makeCharacter();
    mockDice(t, [2, 1, 1, /*confirm*/ 7]);
    const r = resolveAttack({ attacker, defender, attack: SHIN });
    assert.equal(r.confirmRolls[0].procAtacante?.id, "surto_arcano");
    // confirmBonusBase = danoProf magiasOfensivas(+4) + manual dano shin("+1")=1 => 5; +1 do surto_arcano = 6
    assert.equal(r.confirmRolls[0].confirmBonus, 6);
  });

  it("Borrão (reflexo_agil): dado de Acerto inimigo que bate o limiar é re-rolado uma vez", (t) => {
    const attacker = makeCharacter();
    const defender = withProfs({ ...makeCharacter(), procs: ["reflexo_agil"] }, { tecnicaProf: "A" }); // limiar 6
    // Os 3 dados do Acerto são pré-rolados em lote (die1, die2, die3) e só DEPOIS
    // vem uma segunda passada checando re-rolagens — por isso a re-rolagem do die1
    // é o 4º valor da fila, não o 2º.
    mockDice(t, [/*die1*/ 7, /*die2*/ 1, /*die3*/ 1, /*reroll do die1*/ 2]);
    const r = resolveAttack({ attacker, defender, attack: SOCO });
    assert.equal(r.successFlags[0].rerolado, true);
    assert.equal(r.successFlags[0].dadoOriginal, 7);
    assert.equal(r.dice[0], 2);
  });

  it("Ataque Poderoso (instinto_selvagem): em Marcial, dado de Acerto que bate limiar de Força concede IMPACTO", (t) => {
    const attacker = withAttrs({ ...makeCharacter(), procs: ["instinto_selvagem"] }, { forca: "A" }); // limiar 6
    const defender = makeCharacter();
    mockDice(t, [8, 1, 1, /*impacto dBase*/ 5, /*confirm*/ 9]);
    const r = resolveAttack({ attacker, defender, attack: SOCO });
    assert.equal(r.successFlags[0].procAtacante?.id, "instinto_selvagem");
    assert.equal(r.impactoRoll.instancias, 1);
    assert.equal(r.impactoRoll.bonus, 1); // tabela: 5 cai em 5-7 => +1
  });
  it("não dispara Ataque Poderoso em ataques que não são Marciais", (t) => {
    const attacker = withAttrs({ ...makeCharacter(), procs: ["instinto_selvagem"] }, { forca: "A" });
    const defender = makeCharacter();
    mockDice(t, [7, 1, 1, /*confirm*/ 9]); // Shin é mágico: profBonus alto garante sucesso com die baixo
    const r = resolveAttack({ attacker, defender, attack: SHIN });
    assert.equal(r.successFlags[0].procAtacante, null);
    assert.equal(r.impactoRoll, null);
  });

  it("Mestre em Armadura (blindagem_reativa): a Armadura só quebra na segunda vez que for superada", (t) => {
    const attacker = withProfs(makeCharacter(), { briga: "A" }); // danoProf +4
    const defender = withArmadura({ ...makeCharacter(), procs: ["blindagem_reativa"] });
    mockDice(t, [6, 6, 1, /*confirm x2*/ 9, 9]);
    const r = resolveAttack({ attacker, defender, attack: SOCO });
    assert.equal(r.confirmRolls[0].resistUsada, "resistArmadura");
    assert.equal(r.confirmRolls[0].blindada, true); // primeira, ainda não quebrou
    assert.equal(r.confirmRolls[1].resistUsada, "resistArmadura");
    assert.equal(r.confirmRolls[1].blindada, false); // segunda, quebrou
  });
  it("sem Mestre em Armadura, a Armadura quebra na primeira vez que for superada", (t) => {
    const attacker = withProfs(makeCharacter(), { briga: "A" });
    const defender = withArmadura(makeCharacter());
    mockDice(t, [6, 6, 1, 9, 9]);
    const r = resolveAttack({ attacker, defender, attack: SOCO });
    assert.equal(r.confirmRolls[0].blindada, false);
    assert.equal(r.confirmRolls[1].resistUsada, "resistNaturalFisica"); // armadura já quebrou na 1ª
  });

  it("Escudo de Mana (escudo_de_mana): camada extra de 8 + Magias Ofensivas antes da Armadura", (t) => {
    const defender = withProfs({ ...makeCharacter(), procs: ["escudo_de_mana"] }, { magiasOfensivas: "B" });
    assert.equal(computeStat(defender, "defesa"), 8); // confirma que não mexe em Defesa
    const attacker = makeCharacter();
    mockDice(t, [8, 1, 1, /*confirm*/ 9]);
    const r = resolveAttack({ attacker, defender, attack: SOCO });
    assert.equal(r.confirmRolls[0].resistUsada, "escudoDeMana");
    assert.equal(r.confirmRolls[0].resistValor, 11); // 8 + bônus B (+3)
  });

  it("Golpe Penetrante (golpe_penetrante): ignora Resistência Armadura e soma bônus de Técnica na Confirmação", (t) => {
    const attacker = withProfs({ ...makeCharacter(), procs: ["golpe_penetrante"] }, { tecnicaProf: "A" }); // +2
    const defender = withArmadura(makeCharacter()); // tem armadura, mas deve ser ignorada
    mockDice(t, [8, 1, 1, /*confirm*/ 5]);
    const r = resolveAttack({ attacker, defender, attack: SOCO });
    assert.equal(r.confirmRolls[0].resistUsada, "resistNaturalFisica"); // pulou a Armadura
    assert.equal(r.confirmRolls[0].confirmBonus, 2); // só o bônus de Técnica A (+2), sem outros bônus
  });
  it("bônus do Golpe Penetrante: +1 com Técnica C/B, +2 (total) com Técnica A", (t) => {
    const casos = [["E", 0], ["C", 1], ["B", 1], ["A", 2]];
    for (const [grau, esperado] of casos) {
      const attacker = withProfs({ ...makeCharacter(), procs: ["golpe_penetrante"] }, { tecnicaProf: grau });
      const defender = withArmadura(makeCharacter());
      // isolado: mocka só o suficiente pra este cálculo, num teste próprio
      const restore = Math.random;
      Math.random = queuedRandom([8, 1, 1, 5]);
      try {
        const r = resolveAttack({ attacker, defender, attack: SOCO });
        assert.equal(r.confirmRolls[0].confirmBonus, esperado, `Técnica ${grau}`);
      } finally {
        Math.random = restore;
      }
    }
  });

  it("Persistente (persistente): +1 HP máximo e +1 SP máximo — já coberto acima", () => {
    // ver describe("computeMaxHP / computeMaxSP") — Persistente não participa do resolveAttack.
    assert.ok(PROC_ABILITIES.find((p) => p.id === "persistente"));
  });

  it("Magia Pyro (toque_flamejante): em Mágico, dado de Acerto que bate limiar de Magias Ofensivas concede CHAMAS", (t) => {
    const attacker = withProfs({ ...makeCharacter(), procs: ["toque_flamejante"] }, { magiasOfensivas: "A" }); // limiar 6
    const defender = makeCharacter();
    mockDice(t, [6, 1, 1, /*confirm*/ 5, /*chamas*/ 7]);
    const r = resolveAttack({ attacker, defender, attack: SHIN });
    assert.equal(r.successFlags[0].procAtacante?.concedeEfeito, "chamas");
    assert.equal(r.chamasRolls.length, 1);
    assert.equal(r.chamasRolls[0].passou, true);
  });
});

// ---------------------------------------------------------------------------
// Os 6 status effects
// ---------------------------------------------------------------------------

describe("Status effects", () => {
  it("IMPACTO: tabela 1-4 nada, 5-7 +1, 8-9 +2, 10 +3, somado na Confirmação", (t) => {
    const casos = [[3, 0], [6, 1], [9, 2], [10, 3]];
    const attack = { ...SOCO, efeito: "impacto" };
    for (const [dBase, esperado] of casos) {
      const restore = Math.random;
      Math.random = queuedRandom([8, 1, 1, dBase, 9]);
      try {
        const r = resolveAttack({ attacker: makeCharacter(), defender: makeCharacter(), attack });
        assert.equal(r.impactoRoll.bonus, esperado, `dBase ${dBase}`);
      } finally {
        Math.random = restore;
      }
    }
  });

  it("DESACELERAÇÃO: 1d10 antes do Acerto reduz a Defesa do alvo pros 3 dados dessa rolagem", (t) => {
    const attack = { ...SOCO, efeito: "desaceleração" };
    // dBase=6 (tabela 5-7 => reducao 1): threshold efetivo 8-1=7
    mockDice(t, [7, 1, 1, /*desaceleração dBase*/ 6, /*confirm*/ 9]);
    const r = resolveAttack({ attacker: makeCharacter(), defender: makeCharacter(), attack });
    assert.equal(r.desaceleracaoRoll.reducao, 1);
    assert.equal(r.successFlags[0].thresholdEfetivo, 7);
    assert.equal(r.successFlags[0].success, true); // 7+1=8 > 7
  });

  it("ENRAIZAMENTO: sem tabela — só o(s) primeiro(s) dado(s) enfrentam Defesa -2", (t) => {
    const attack = { ...SOCO, efeito: "enraizamento" };
    mockDice(t, [7, 7, 1, /*confirm do único sucesso (die1)*/ 5]);
    const r = resolveAttack({ attacker: makeCharacter(), defender: makeCharacter(), attack });
    assert.equal(r.successFlags[0].enraizamentoAplicado, true);
    assert.equal(r.successFlags[0].thresholdEfetivo, 6); // 8-2
    assert.equal(r.successFlags[0].success, true); // 7+1=8 > 6
    assert.equal(r.successFlags[1].enraizamentoAplicado, false);
    assert.equal(r.successFlags[1].thresholdEfetivo, 8);
    assert.equal(r.successFlags[1].success, false); // 7+1=8, não é > 8
  });

  it("ACELERAÇÃO: cada sucesso dá +1 ao dado seguinte; falha zera a cadeia", (t) => {
    const attack = { ...SOCO, acerto: "0", efeito: "aceleração" };
    mockDice(t, [9, 8, 6, /*confirm dos 2 sucessos (die1, die2)*/ 5, 5]);
    const r = resolveAttack({ attacker: makeCharacter(), defender: makeCharacter(), attack });
    assert.equal(r.successFlags[0].aceleracaoBonusEsteDado, 0);
    assert.equal(r.successFlags[0].success, true);
    assert.equal(r.successFlags[1].aceleracaoBonusEsteDado, 1); // sucesso anterior +1
    assert.equal(r.successFlags[1].success, true);
    assert.equal(r.successFlags[2].aceleracaoBonusEsteDado, 2); // sucesso anterior +1 de novo
    assert.equal(r.successFlags[2].success, false); // 6+0+0+2=8, não é >8
  });

  it("CHAMAS: rolagem de confirmação independente, sem bônus, contra a Resistência do tipo do ataque", (t) => {
    const attack = { ...SOCO, efeito: "chamas" };
    mockDice(t, [8, 1, 1, /*confirm*/ 9, /*chamas*/ 7]);
    const r = resolveAttack({ attacker: makeCharacter(), defender: makeCharacter(), attack });
    assert.equal(r.chamasRolls.length, 1);
    assert.equal(r.chamasRolls[0].resistValor, 6); // resistNaturalFisica (ataque marcial)
    assert.equal(r.chamasRolls[0].passou, true);
    // marcial escala: 1 confirmação × 1 ferida + 1 de Chamas = 2
    assert.equal(r.feridaValor, 2);
  });

  it("ENVENENAMENTO: igual Chamas, mas sempre contra a Resistência Natural MÁGICA, mesmo em ataque Marcial", (t) => {
    const attack = { ...SOCO, efeito: "envenenamento" };
    const defender = withProfs(makeCharacter(), { resistMagicaProf: "A" }); // resistNaturalMagica = 10 (bem mais alta que a Física = 6)
    mockDice(t, [8, 1, 1, /*confirm*/ 9, /*envenenamento*/ 9]);
    const r = resolveAttack({ attacker: makeCharacter(), defender, attack });
    assert.equal(r.envenenamentoRolls[0].resistValor, 10);
    assert.equal(r.envenenamentoRolls[0].passou, false); // 9 não bate 10 (e não é crítico)
  });
});

// ---------------------------------------------------------------------------
// Balanceamento estatístico (aleatoriedade real, muitas amostras)
// ---------------------------------------------------------------------------

describe("balanceamento estatístico", () => {
  function simulate(defenderTemArmadura, n) {
    const attacker = makeCharacter();
    const defender = withAttrs(makeCharacter(), {});
    if (defenderTemArmadura) Object.assign(defender, withArmadura(defender));
    let hits = 0;
    for (let i = 0; i < n; i++) {
      const r = resolveAttack({ attacker, defender, attack: SOCO });
      if (r.feridaValor > 0) hits++;
    }
    return hits / n;
  }

  it("tudo em grau E, ataque desarmado vs armadura: ~25% de chance de causar ferimento", () => {
    const p = simulate(true, 20000);
    // CONTEXTO.md documenta 25-27% medido por simulação — margem generosa pra não ficar flaky.
    assert.ok(p > 0.18 && p < 0.34, `esperado ~0.25 (18%-34%), obtido ${p}`);
  });

  it("tudo em grau E, ataque desarmado sem armadura: ~40% de chance de causar ferimento", () => {
    const p = simulate(false, 20000);
    assert.ok(p > 0.32 && p < 0.48, `esperado ~0.40 (32%-48%), obtido ${p}`);
  });
});
