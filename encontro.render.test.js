// Smoke test de render do painel de Encontro (CompareView > sub-aba
// Encontro, ver encontro.js pros dados puros). Roda com `node --test`
// (Node >=20, nativo) ou `npm test`.

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadAppModule } from "./renderTestUtils.js";
import {
  criarEncontro, criarCombatentePersonagem, criarCombatenteAvulso, adicionarCombatente,
} from "./encontro.js";

let CompareView, EncontroPainel, AdicionarCombatente, AdicionarAvulso, SEED_CHARACTERS;

before(async () => {
  const mod = await loadAppModule();
  CompareView = mod.CompareView;
  EncontroPainel = mod.EncontroPainel;
  AdicionarCombatente = mod.AdicionarCombatente;
  AdicionarAvulso = mod.AdicionarAvulso;
  SEED_CHARACTERS = mod.SEED_CHARACTERS;
});

// AdicionarCombatente/AdicionarAvulso só aparecem dentro de EncontroPainel
// depois de um clique (estado interno, useState) — renderToStaticMarkup não
// simula clique, então testamos os dois formulários direto aqui também,
// senão um erro de referência (ex: usar algo não importado) só apareceria
// num navegador de verdade, nunca em `npm test`.
describe("AdicionarCombatente / AdicionarAvulso (formulários de montagem do encontro)", () => {
  it("AdicionarCombatente renderiza sem lançar, agrupado por GRUPOS, excluindo quem já foi adicionado", () => {
    const jaAdicionados = new Set([SEED_CHARACTERS[0].id]);
    assert.doesNotThrow(() => renderToStaticMarkup(
      React.createElement(AdicionarCombatente, { characters: SEED_CHARACTERS, jaAdicionados, onAdicionar: () => {}, onFechar: () => {} })
    ));
  });

  it("AdicionarCombatente com characters vazio não lança", () => {
    assert.doesNotThrow(() => renderToStaticMarkup(
      React.createElement(AdicionarCombatente, { characters: [], jaAdicionados: new Set(), onAdicionar: () => {}, onFechar: () => {} })
    ));
  });

  it("AdicionarAvulso renderiza os campos (nome, Defesa, HP, MP, SP) e os dois lados sem lançar", () => {
    const html = renderToStaticMarkup(React.createElement(AdicionarAvulso, { onAdicionar: () => {}, onFechar: () => {} }));
    assert.ok(html.includes("Defesa"));
    assert.ok(html.includes("aliados"));
    assert.ok(html.includes("inimigos"));
  });
});

describe("EncontroPainel", () => {
  it("renderiza sem lançar com encontro vazio (nenhum combatente)", () => {
    const encontro = criarEncontro();
    assert.doesNotThrow(() => renderToStaticMarkup(
      React.createElement(EncontroPainel, { characters: SEED_CHARACTERS, onUpdateCharacter: () => {}, askConfirm: () => {}, encontro, setEncontro: () => {} })
    ));
  });

  it("renderiza sem lançar com combatentes de personagem e avulso, em rodada/turno avançados", () => {
    let encontro = criarEncontro();
    encontro = adicionarCombatente(encontro, criarCombatentePersonagem(SEED_CHARACTERS[0].id, "aliados"));
    encontro = adicionarCombatente(encontro, criarCombatenteAvulso({ nome: "Goblin", lado: "inimigos", defesa: 7, hp: 2, mp: 1, sp: 0 }));
    encontro = { ...encontro, rodada: 3, fase: "turno", turnoIdx: 1 };
    const html = renderToStaticMarkup(
      React.createElement(EncontroPainel, { characters: SEED_CHARACTERS, onUpdateCharacter: () => {}, askConfirm: () => {}, encontro, setEncontro: () => {} })
    );
    assert.ok(html.includes("RODADA 3"));
    assert.ok(html.includes("Goblin"));
  });

  it("combatente de personagem com ficha apagada (personagemId não existe mais) não lança", () => {
    let encontro = criarEncontro();
    encontro = adicionarCombatente(encontro, criarCombatentePersonagem("fantasma", "aliados"));
    assert.doesNotThrow(() => renderToStaticMarkup(
      React.createElement(EncontroPainel, { characters: SEED_CHARACTERS, onUpdateCharacter: () => {}, askConfirm: () => {}, encontro, setEncontro: () => {} })
    ));
  });

  it("encontro com estados aplicados renderiza os chips sem lançar", () => {
    let encontro = criarEncontro();
    let combatente = criarCombatenteAvulso({ nome: "Orc" });
    combatente = { ...combatente, estados: ["ENVENENAMENTO", "CHAMAS"] };
    encontro = adicionarCombatente(encontro, combatente);
    const html = renderToStaticMarkup(
      React.createElement(EncontroPainel, { characters: SEED_CHARACTERS, onUpdateCharacter: () => {}, askConfirm: () => {}, encontro, setEncontro: () => {} })
    );
    assert.ok(html.includes("Envenenamento"));
    assert.ok(html.includes("Chamas"));
  });

  it("registro com várias entradas renderiza sem lançar", () => {
    let encontro = criarEncontro();
    encontro = { ...encontro, registro: [{ id: "1", texto: "Rodada 1 começou", ts: 1 }, { id: "2", texto: "Fulano atacou", ts: 2 }] };
    assert.doesNotThrow(() => renderToStaticMarkup(
      React.createElement(EncontroPainel, { characters: SEED_CHARACTERS, onUpdateCharacter: () => {}, askConfirm: () => {}, encontro, setEncontro: () => {} })
    ));
  });
});

describe("CompareView — sub-aba Encontro é GM-only", () => {
  it("gm=true mostra o botão da sub-aba Encontro", () => {
    const html = renderToStaticMarkup(
      React.createElement(CompareView, { characters: SEED_CHARACTERS, onUpdateCharacter: () => {}, gm: true, askConfirm: () => {}, encontro: criarEncontro(), setEncontro: () => {} })
    );
    assert.ok(html.includes("Encontro"));
  });

  it("gm=false NÃO mostra o botão da sub-aba Encontro", () => {
    const html = renderToStaticMarkup(
      React.createElement(CompareView, { characters: SEED_CHARACTERS, onUpdateCharacter: () => {}, gm: false, askConfirm: () => {}, encontro: criarEncontro(), setEncontro: () => {} })
    );
    assert.ok(!html.includes("Encontro"));
  });

  it("sem characters (lista vazia) não lança", () => {
    assert.doesNotThrow(() => renderToStaticMarkup(
      React.createElement(CompareView, { characters: [], onUpdateCharacter: () => {}, gm: true, askConfirm: () => {}, encontro: criarEncontro(), setEncontro: () => {} })
    ));
  });

  it("encontro ausente/undefined não lança (defensivo — App sempre passa um encontro normalizado)", () => {
    assert.doesNotThrow(() => renderToStaticMarkup(
      React.createElement(CompareView, { characters: SEED_CHARACTERS, onUpdateCharacter: () => {}, gm: true, askConfirm: () => {}, encontro: criarEncontro(), setEncontro: () => {} })
    ));
  });
});
