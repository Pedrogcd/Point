// Testes do modo "Ataque" do painel "Teste — Atributo + Perícia / Ataque /
// Magia" da ficha (CharacterSheet). Dois tipos de verificação:
// 1. Lógica pura — resolveFichaAtaque() (ponte entre o painel e o motor,
//    exportada de point-amaranth-app.jsx só pra isso) monta o defensor
//    sintético certo e repassa pro mesmo resolveAtaque() do Confronto
//    (docs/SISTEMA_MAGIA.md, 13/10 — substitui o antigo resolveAttack();
//    docs/MUDANCAS_RACAS_E_MAGIA.md, 14/10 — Blindado Mágico/Resistência
//    Mágica saíram, Resiste a Magia entrou).
// 2. Render — o painel Ataque monta sem quebrar com um ataque mágico ou
//    físico selecionado.
// Roda com `node --test` (Node >=20, nativo) ou `npm test`.

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BASE_ATTACK_TYPES, PROFICIENCIAS_DEFAULT, GRADE_VALUE } from "./engine.js";
import { loadAppModule } from "./renderTestUtils.js";

const SOCO = BASE_ATTACK_TYPES.find((a) => a.id === "soco"); // marcial, ajusteDados 1, desarmado
const ARMA_BRANCA = BASE_ATTACK_TYPES.find((a) => a.id === "arma_branca"); // marcial, letal

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
    procs: [], itens: { armadura: [] }, descritores: [],
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

describe("resolveFichaAtaque — monta o defensor sintético e chama resolveAtaque", () => {
  it("defaults do painel (alvo tudo em grau E, defesa por Vigor) viram o defensor esperado", (t) => {
    // Ataque: destreza E(1) + combateCorpoACorpo E(1) + ajusteDados(soco)=1 = 3 dados.
    // Defesa: vigor E(1) + defesaProf E(1) = 2 dados.
    mockDice(t, [7, 1, 1, /*defesa*/ 1, 1]);
    const r = resolveFichaAtaque({ character: makeAttacker(), attack: SOCO });
    assert.equal(r.rolagemAtaque.dice.length, 3);
    assert.equal(r.rolagemDefesa.dice.length, 2);
    assert.equal(r.rolagemDefesa.profKey, "defesaProf"); // SOCO é marcial
  });

  it("graus diferentes no alvo mudam o pool de dados da defesa", (t) => {
    mockDice(t, [7, 1, 1, /*defesa: vigor C(3)+defesaProf B(4)=7*/ 1, 1, 1, 1, 1, 1, 1]);
    const r = resolveFichaAtaque({
      character: makeAttacker(), attack: SOCO,
      targetVigorGrau: "C", targetDefesaProfGrau: "B",
    });
    assert.equal(r.rolagemDefesa.dice.length, 7);
  });

  it("targetDefesaAtributo diferente de Vigor usa o grau escolhido pra defesa, mas Vigor continua valendo pro ferimento", (t) => {
    // Defesa usa Destreza B(4) em vez de Vigor; defesaProf E(1) = 5 dados.
    mockDice(t, [7, 1, 1, /*defesa*/ 1, 1, 1, 1, 1]);
    const r = resolveFichaAtaque({
      character: makeAttacker(), attack: SOCO,
      targetDefesaAtributo: "destreza", targetDefesaAtributoGrau: "B", targetVigorGrau: "A",
    });
    assert.equal(r.rolagemDefesa.dice.length, 5);
  });

  it("Blindado eleva o limiar do ataque físico pra 7+", (t) => {
    mockDice(t, [6, 1, 1, /*defesa*/ 1, 1]); // 6 não bate 7+
    const r = resolveFichaAtaque({ character: makeAttacker(), attack: SOCO, targetBlindado: true });
    assert.equal(r.rolagemAtaque.successes, 0);
  });

  it("14/10: Resiste a Magia não afeta ataque marcial (só reduz dados/garante sucesso contra ataque com descritor Magia)", (t) => {
    mockDice(t, [7, 1, 1, /*defesa: vigor E(1)+defesaProf E(1)=2, sem redução*/ 1, 1]);
    const r = resolveFichaAtaque({ character: makeAttacker(), attack: SOCO, targetResisteAMagia: true });
    assert.equal(r.rolagemDefesa.dice.length, 2);
  });

  it("ferimento agravante quando sucessos líquidos >= Vigor do alvo (grau cheio)", (t) => {
    mockDice(t, [7, 1, 1, /*defesa sem sucesso*/ 1, 1]); // 1 sucesso líquido, Vigor E = 1
    const r = resolveFichaAtaque({ character: makeAttacker(), attack: SOCO });
    assert.equal(r.tipoFerimento, "agravante");
  });

  it("Letal (arma branca) reduz o Vigor necessário em 1", (t) => {
    // Vigor do alvo D(grau cheio 2); 1 sucesso líquido não bateria sem Letal.
    mockDice(t, [7, 1, 1, /*defesa*/ 1, 1]);
    const r = resolveFichaAtaque({ character: makeAttacker(), attack: ARMA_BRANCA, targetVigorGrau: "D" });
    assert.equal(r.tipoFerimento, "agravante"); // Letal: precisa só 1 (2-1), não 2
  });

  it("desarmado_letal (descritor de personagem) torna o soco letal mesmo sem a arma ter o descritor", (t) => {
    const atacanteLetal = makeAttacker({ descritores: ["desarmado_letal"] });
    // defesa: vigor D(2) + defesaProf E(1) = 3 dados
    mockDice(t, [7, 1, 1, /*defesa*/ 1, 1, 1]);
    const r = resolveFichaAtaque({ character: atacanteLetal, attack: SOCO, targetVigorGrau: "D" });
    assert.equal(r.letal, true);
    assert.equal(r.tipoFerimento, "agravante"); // mesmo raciocínio do teste de Letal acima
  });
});

describe("Painel Ataque — monta sem quebrar com ataques físicos diferentes", () => {
  function characterComAtaque(atk) {
    const base = SEED_CHARACTERS.find((c) => c.id === "almah");
    return { ...base, attacks: [atk] };
  }
  function renderAtaqueMode(character) {
    return renderToStaticMarkup(
      React.createElement(CharacterSheet, { character, onBack: () => {}, initialTestPanelMode: "ataque" })
    );
  }

  it("renderiza com um ataque marcial (soco)", () => {
    const html = renderAtaqueMode(characterComAtaque(SOCO));
    assert.ok(html.includes("Ataque desarmado") || html.length > 0);
  });

  it("renderiza com um ataque marcial letal (arma branca)", () => {
    const html = renderAtaqueMode(characterComAtaque(ARMA_BRANCA));
    assert.ok(html.length > 0);
  });

  it("modo Magia também renderiza sem quebrar", () => {
    const base = SEED_CHARACTERS.find((c) => c.id === "almah");
    const html = renderToStaticMarkup(
      React.createElement(CharacterSheet, { character: base, onBack: () => {}, initialTestPanelMode: "magia" })
    );
    assert.ok(html.length > 0);
  });
});
