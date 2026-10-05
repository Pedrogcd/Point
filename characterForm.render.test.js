// Testes de "smoke" de render: pegam os componentes de verdade de
// point-amaranth-app.jsx (via renderTestUtils.js) e garantem que eles não
// lançam exceção ao renderizar — é o tipo de teste que teria pego o bug das
// 6 fichas do Grupo Aurora sem o campo `abilities` quebrando o CharacterForm
// (e o Confronto) com tela branca.
// Roda com `node --test` (Node >=20, nativo) ou `npm test`.

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadAppModule } from "./renderTestUtils.js";

let CharacterForm, CompareView, CharacterSheet, SEED_CHARACTERS;

before(async () => {
  const mod = await loadAppModule();
  CharacterForm = mod.CharacterForm;
  CompareView = mod.CompareView;
  CharacterSheet = mod.CharacterSheet;
  SEED_CHARACTERS = mod.SEED_CHARACTERS;
});

function renderCharacterForm(initial) {
  return renderToStaticMarkup(
    React.createElement(CharacterForm, { initial, onSave: () => {}, onCancel: () => {} })
  );
}

function renderCharacterSheet(character, initialTestPanelMode) {
  return renderToStaticMarkup(
    React.createElement(CharacterSheet, { character, onBack: () => {}, initialTestPanelMode })
  );
}

const SUTH_IDS = [
  "suth_emphes", "suth_velmira", "suth_victoria", "suth_valeria", "suth_mars", "suth_zero",
  "suth_kirilia", "suth_galantia", "suth_kyubei", "suth_draguna", "suth_athena", "suth_azula",
  "suth_farron", "suth_athermis",
];

const GOETHIA_IDS = [
  "goethia_giovana", "goethia_krish", "goethia_victor", "goethia_skuld", "goethia_zed",
  "goethia_hildr", "goethia_mustafar", "goethia_suzane", "goethia_paulao", "goethia_mistake",
];

describe("CharacterForm — render de todos os personagens semente", () => {
  it("SEED_CHARACTERS tem os 43 personagens (13 Grupo C + 6 Aurora + 14 Suth + 10 Goethia)", () => {
    assert.equal(SEED_CHARACTERS.length, 43);
    assert.equal(SEED_CHARACTERS.filter((c) => c.id.startsWith("sp_")).length, 6);
    assert.equal(SEED_CHARACTERS.filter((c) => c.id.startsWith("suth_")).length, 14);
    assert.equal(SEED_CHARACTERS.filter((c) => c.id.startsWith("goethia_")).length, 10);
  });

  for (const nome of ["almah", "kiryu", "fate", "boda", "leona", "ookami", "kutrefas", "vientra", "sombra", "rena", "erin", "minerva", "mercurio"]) {
    it(`renderiza sem lançar — Grupo C: ${nome}`, () => {
      const character = SEED_CHARACTERS.find((c) => c.id === nome);
      assert.ok(character, `personagem semente "${nome}" não encontrado em SEED_CHARACTERS`);
      assert.doesNotThrow(() => renderCharacterForm(character));
    });
  }

  for (const id of ["sp_leon", "sp_merkel", "sp_raiko", "sp_akira", "sp_k", "sp_ishran"]) {
    it(`renderiza sem lançar — Grupo Aurora: ${id}`, () => {
      const character = SEED_CHARACTERS.find((c) => c.id === id);
      assert.ok(character, `personagem semente "${id}" não encontrado em SEED_CHARACTERS`);
      assert.doesNotThrow(() => renderCharacterForm(character));
    });
  }

  for (const id of SUTH_IDS) {
    it(`renderiza sem lançar — Grupo Suth: ${id}`, () => {
      const character = SEED_CHARACTERS.find((c) => c.id === id);
      assert.ok(character, `personagem semente "${id}" não encontrado em SEED_CHARACTERS`);
      assert.doesNotThrow(() => renderCharacterForm(character));
    });
  }

  for (const id of GOETHIA_IDS) {
    it(`renderiza sem lançar — Grupo Goethia: ${id}`, () => {
      const character = SEED_CHARACTERS.find((c) => c.id === id);
      assert.ok(character, `personagem semente "${id}" não encontrado em SEED_CHARACTERS`);
      assert.doesNotThrow(() => renderCharacterForm(character));
    });
  }

  it("renderiza uma ficha sem o campo abilities (simula o que está salvo hoje no Supabase)", () => {
    // As 6 fichas do Aurora nunca tiveram abilities — withFichaDefaults foi
    // corrigido para preencher o default, mas o que já está salvo no banco
    // (sem a migração rodar antes do teste) ainda pode não ter o campo.
    const leon = SEED_CHARACTERS.find((c) => c.id === "sp_leon");
    const semAbilities = { ...leon };
    delete semAbilities.abilities;
    assert.equal("abilities" in semAbilities, false);
    assert.doesNotThrow(() => renderCharacterForm(semAbilities));
  });

  it("renderiza uma ficha com abilities null (outra forma de dado ausente/corrompido)", () => {
    const merkel = SEED_CHARACTERS.find((c) => c.id === "sp_merkel");
    assert.doesNotThrow(() => renderCharacterForm({ ...merkel, abilities: null }));
  });
});

describe("CharacterSheet — painel Teste/Ataque nos dois modos, todos os personagens semente", () => {
  const todosOsIds = [
    "almah", "kiryu", "fate", "boda", "leona", "ookami", "kutrefas", "vientra", "sombra", "rena", "erin", "minerva", "mercurio",
    "sp_leon", "sp_merkel", "sp_raiko", "sp_akira", "sp_k", "sp_ishran",
    ...SUTH_IDS, ...GOETHIA_IDS,
  ];

  for (const id of todosOsIds) {
    it(`renderiza sem lançar no modo Teste — ${id}`, () => {
      const character = SEED_CHARACTERS.find((c) => c.id === id);
      assert.ok(character, `personagem semente "${id}" não encontrado em SEED_CHARACTERS`);
      assert.doesNotThrow(() => renderCharacterSheet(character, "teste"));
    });

    it(`renderiza sem lançar no modo Ataque — ${id}`, () => {
      const character = SEED_CHARACTERS.find((c) => c.id === id);
      assert.doesNotThrow(() => renderCharacterSheet(character, "ataque"));
    });
  }
});

describe("Confronto (CompareView) — personagem do Aurora selecionado", () => {
  it("renderiza sem lançar com um personagem do Aurora como seleção inicial (A)", () => {
    // aId (seleção A) inicia como characters[0]?.id — colocar um personagem
    // do Aurora na frente da lista reproduz o crash relatado (ch.abilities
    // desprotegido no painel de estatísticas do Confronto).
    const aurora = SEED_CHARACTERS.find((c) => c.id === "sp_leon");
    const resto = SEED_CHARACTERS.filter((c) => c.id !== "sp_leon");
    const characters = [aurora, ...resto];
    assert.doesNotThrow(() => {
      renderToStaticMarkup(React.createElement(CompareView, { characters, onUpdateCharacter: () => {} }));
    });
  });

  it("renderiza sem lançar pra cada um dos 6 personagens do Aurora como seleção inicial", () => {
    for (const id of ["sp_leon", "sp_merkel", "sp_raiko", "sp_akira", "sp_k", "sp_ishran"]) {
      const aurora = SEED_CHARACTERS.find((c) => c.id === id);
      const resto = SEED_CHARACTERS.filter((c) => c.id !== id);
      const characters = [aurora, ...resto];
      assert.doesNotThrow(
        () => renderToStaticMarkup(React.createElement(CompareView, { characters, onUpdateCharacter: () => {} })),
        `Confronto quebrou com ${id} selecionado`
      );
    }
  });

  it("renderiza sem lançar pra cada um dos 14 personagens do Suth como seleção inicial", () => {
    for (const id of SUTH_IDS) {
      const suth = SEED_CHARACTERS.find((c) => c.id === id);
      const resto = SEED_CHARACTERS.filter((c) => c.id !== id);
      const characters = [suth, ...resto];
      assert.doesNotThrow(
        () => renderToStaticMarkup(React.createElement(CompareView, { characters, onUpdateCharacter: () => {} })),
        `Confronto quebrou com ${id} selecionado`
      );
    }
  });

  it("renderiza sem lançar pra cada um dos 10 personagens do Goethia como seleção inicial", () => {
    for (const id of GOETHIA_IDS) {
      const goethia = SEED_CHARACTERS.find((c) => c.id === id);
      const resto = SEED_CHARACTERS.filter((c) => c.id !== id);
      const characters = [goethia, ...resto];
      assert.doesNotThrow(
        () => renderToStaticMarkup(React.createElement(CompareView, { characters, onUpdateCharacter: () => {} })),
        `Confronto quebrou com ${id} selecionado`
      );
    }
  });
});
