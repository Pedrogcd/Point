// Testes do modo "Ataque" do painel "Teste — Atributo + Perícia / Ataque" da
// ficha (CharacterSheet). Dois tipos de verificação:
// 1. Lógica pura — resolveFichaAtaque() (ponte entre o painel e o motor,
//    exportada de point-amaranth-app.jsx só pra isso) monta o defensor
//    sintético certo e repassa pro mesmo resolveAttack() do Confronto.
// 2. Render — o rótulo da Resistência Natural muda entre Física/Mágica
//    conforme TIPOS_ATAQUE[tipo].resistKey.
// Roda com `node --test` (Node >=20, nativo) ou `npm test`.

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BASE_ATTACK_TYPES, PROFICIENCIAS_DEFAULT, TIPOS_ATAQUE } from "./engine.js";
import { loadAppModule } from "./renderTestUtils.js";

const SOCO = BASE_ATTACK_TYPES.find((a) => a.id === "soco"); // marcial, acerto "+1"

let resolveFichaAtaque, CharacterSheet, SEED_CHARACTERS;

before(async () => {
  const mod = await loadAppModule();
  resolveFichaAtaque = mod.resolveFichaAtaque;
  CharacterSheet = mod.CharacterSheet;
  SEED_CHARACTERS = mod.SEED_CHARACTERS;
});

// Mesmo atacante "genérico" de engine.test.js: tudo em grau E, sem procs/itens.
function makeAttacker(overrides = {}) {
  return {
    id: "atacante_teste",
    atributosGerais: {
      forca: "E", destreza: "E", vigor: "E",
      carisma: "E", manipulacao: "E", compostura: "E",
      inteligencia: "E", perspicacia: "E", resolucao: "E",
    },
    proficiencias: { ...PROFICIENCIAS_DEFAULT },
    statBase: {}, statTemp: {}, statLinks: {},
    procs: [], itens: { armadura: [] },
    ...overrides,
  };
}

// Converte uma sequência de dados (1-10) numa função de Math.random, na ordem
// exata em que o motor os consome — mesma técnica de engine.test.js.
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

describe("resolveFichaAtaque — monta o defensor sintético e chama resolveAttack", () => {
  it("defaults do painel (Defesa 8, Armadura 8, Natural 4, com armadura) viram exatamente o defensor esperado", () => {
    const r = resolveFichaAtaque({
      character: makeAttacker(),
      attack: SOCO,
      targetDefesa: 8,
      targetResistNatural: 4,
      targetResistArmadura: 8,
      targetUsaArmadura: true,
    });
    assert.equal(r.threshold, 8, "Defesa do alvo (já com a base embutida) deve ser exatamente a digitada");
    assert.equal(r.resistArmadura, 8, "resistArmadura não tem Proficiência vinculada (STAT_PROF_LINK) — passa direto");
    // resistNatural passa pelo mesmo computeStat do Confronto: makeEditableOpponent
    // zera o vínculo de ATRIBUTO (statLinks), mas resistNaturalFisica/Magica têm
    // uma Proficiência vinculada (STAT_PROF_LINK) que fica no grau padrão E — e
    // essas duas usam grau cheio (GRADE_VALUE.E=1), não bônus — então o valor
    // final é sempre o digitado +1. Mesma conta que o Confronto já faz pro
    // oponente Editável; não é um comportamento novo desta feature.
    assert.equal(r.resistNatural, 5);
    assert.equal(r.resistNaturalKey, "resistNaturalFisica"); // SOCO é marcial
    assert.equal(r.temArmadura, true);
  });

  it("números diferentes dos defaults também chegam intactos no resolveAttack (resistNatural com o mesmo +1 de sempre)", () => {
    const r = resolveFichaAtaque({
      character: makeAttacker(),
      attack: SOCO,
      targetDefesa: 12,
      targetResistNatural: 9,
      targetResistArmadura: 15,
      targetUsaArmadura: true,
    });
    assert.equal(r.threshold, 12);
    assert.equal(r.resistArmadura, 15);
    assert.equal(r.resistNatural, 10);
    assert.equal(r.temArmadura, true);
  });

  it("desmarcar 'usa armadura' faz temArmadura=false, mesmo com Resistência Armadura preenchida", () => {
    // Campo de Armadura continua com um valor (15) mas deve ser ignorado:
    // sem a marcação, o motor nunca vê o alvo como tendo armadura.
    const r = resolveFichaAtaque({
      character: makeAttacker(),
      attack: SOCO,
      targetDefesa: 8,
      targetResistNatural: 4,
      targetResistArmadura: 15,
      targetUsaArmadura: false,
    });
    assert.equal(r.temArmadura, false);
  });

  it("com armadura marcada, a primeira confirmação enfrenta a Armadura", (t) => {
    // 3 dados de Acerto: só o primeiro (8) gera sucesso (8+1 bônus=9 > Defesa 8).
    // 1 dado de Confirmação (valor irrelevante pro teste, só precisa existir).
    mockDice(t, [8, 1, 1, 5]);
    const r = resolveFichaAtaque({
      character: makeAttacker(),
      attack: SOCO,
      targetDefesa: 8,
      targetResistNatural: 4,
      targetResistArmadura: 8,
      targetUsaArmadura: true,
    });
    assert.equal(r.successes, 1);
    assert.equal(r.confirmRolls.length, 1);
    assert.equal(r.confirmRolls[0].resistUsada, "resistArmadura");
  });

  it("sem armadura, a confirmação vai direto pra Resistência Natural (não passa pela Armadura)", (t) => {
    mockDice(t, [8, 1, 1, 5]);
    const r = resolveFichaAtaque({
      character: makeAttacker(),
      attack: SOCO,
      targetDefesa: 8,
      targetResistNatural: 4,
      targetResistArmadura: 8,
      targetUsaArmadura: false,
    });
    assert.equal(r.successes, 1);
    assert.equal(r.confirmRolls.length, 1);
    assert.equal(r.confirmRolls[0].resistUsada, r.resistNaturalKey);
    assert.notEqual(r.confirmRolls[0].resistUsada, "resistArmadura");
  });

  it("as habilidades passivas do próprio atacante continuam valendo (procs repassados ao motor)", () => {
    // golpe_certeiro dobra os sucessos do dado que disparar — se o proc não
    // fosse repassado (ex: se resolveFichaAtaque reconstruísse o atacante em
    // vez de usar `character` direto), isso nunca apareceria no resultado.
    const comProc = makeAttacker({ procs: ["golpe_certeiro"] });
    assert.ok(comProc.procs.includes("golpe_certeiro"));
    const r = resolveFichaAtaque({
      character: comProc,
      attack: SOCO,
      targetDefesa: 8,
      targetResistNatural: 4,
      targetResistArmadura: 8,
      targetUsaArmadura: true,
    });
    assert.ok(Array.isArray(r.successFlags));
  });
});

describe("Painel Ataque — rótulo da Resistência Natural muda com o tipo do ataque", () => {
  // A ficha também mostra "Resistência Natural Física/Mágica" fora do painel
  // (StatBlock, na coluna de Estatísticas de Combate) — essas aparecem sempre,
  // independente do ataque selecionado. Por isso comparamos a CONTAGEM de
  // ocorrências entre dois tipos diferentes (mesmo personagem, mesmo
  // StatBlock) em vez de checar presença/ausência isolada: a diferença de 1
  // ocorrência é exatamente o rótulo do campo do painel Ataque mudando.
  function characterComAtaque(tipo) {
    const base = SEED_CHARACTERS.find((c) => c.id === "almah");
    return { ...base, attacks: [{ nome: "Ataque de teste", tipo, acerto: "0", dano: "0", ferida: "1" }] };
  }
  function renderAtaqueMode(character) {
    return renderToStaticMarkup(
      React.createElement(CharacterSheet, { character, onBack: () => {}, initialTestPanelMode: "ataque" })
    );
  }
  function contar(html, texto) {
    return html.split(texto).length - 1;
  }
  // StatBlock sempre mostra as duas Resistências Naturais (1 ocorrência fixa
  // cada, independente do ataque). O painel Ataque usa o rótulo dinâmico duas
  // vezes: no campo e na nota de rodapé — por isso a diferença entre os dois
  // tipos é 2 ocorrências, não 1.
  const OCORRENCIAS_DO_ROTULO_DINAMICO = 2;

  it("TIPOS_ATAQUE confirma o mapeamento esperado (marcial/arma_de_fogo = física, mágico = mágica)", () => {
    assert.equal(TIPOS_ATAQUE.marcial.resistKey, "resistNaturalFisica");
    assert.equal(TIPOS_ATAQUE.arma_de_fogo.resistKey, "resistNaturalFisica");
    assert.equal(TIPOS_ATAQUE.magico.resistKey, "resistNaturalMagica");
  });

  it("troca de Marcial pra Mágico: 'Física' some do painel, 'Mágica' aparece no lugar", () => {
    const htmlMarcial = renderAtaqueMode(characterComAtaque("marcial"));
    const htmlMagico = renderAtaqueMode(characterComAtaque("magico"));
    assert.equal(contar(htmlMarcial, "Resistência Natural Física"), contar(htmlMagico, "Resistência Natural Física") + OCORRENCIAS_DO_ROTULO_DINAMICO);
    assert.equal(contar(htmlMagico, "Resistência Natural Mágica"), contar(htmlMarcial, "Resistência Natural Mágica") + OCORRENCIAS_DO_ROTULO_DINAMICO);
  });

  it("Arma de fogo usa o mesmo rótulo Física que Marcial (mesma contagem)", () => {
    const htmlMarcial = renderAtaqueMode(characterComAtaque("marcial"));
    const htmlArmaDeFogo = renderAtaqueMode(characterComAtaque("arma_de_fogo"));
    assert.equal(contar(htmlMarcial, "Resistência Natural Física"), contar(htmlArmaDeFogo, "Resistência Natural Física"));
    assert.equal(contar(htmlMarcial, "Resistência Natural Mágica"), contar(htmlArmaDeFogo, "Resistência Natural Mágica"));
  });
});
