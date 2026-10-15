// Confere a tabela de estatísticas esperada pro Valefor e a Yurity (Grupo
// Hetalion) — dada pelo dossiê separado enviado pelo Pedro em 07/10 — contra
// o motor de verdade (engine.js). Diferente dos outros personagens do Grupo
// Hetalion (que entraram em rascunho, grau E), esses dois vieram com fichas
// 3d10 completas propostas no próprio dossiê.
// Roda com `node --test` (Node >=20, nativo) ou `npm test`.

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { computeMaxHP, MAX_PROCS } from "./engine.js";
import { loadAppModule } from "./renderTestUtils.js";

let SEED_CHARACTERS;

before(async () => {
  const mod = await loadAppModule();
  SEED_CHARACTERS = mod.SEED_CHARACTERS;
});

// HP / MP — Defesa, Resistências e Acerto por tipo saíram em 15/10 junto com
// computeStat/ACERTOS_POR_TIPO/computeAcertoTipo (painéis decorativos
// antigos sem função mecânica desde 14/10, ver engine.js).
const TABELA_ESPERADA = {
  hetalion_valefor: { hp: 3, mp: 3 },
  hetalion_yurity: { hp: 4, mp: 3 },
};

describe("Tabela de estatísticas do Valefor/Yurity (engine.js x dossiê enviado)", () => {
  for (const [id, esperado] of Object.entries(TABELA_ESPERADA)) {
    it(`${id}: HP e MP batem com a tabela do dossiê`, () => {
      const character = SEED_CHARACTERS.find((c) => c.id === id);
      assert.ok(character, `personagem "${id}" não encontrado em SEED_CHARACTERS`);

      assert.equal(computeMaxHP(character), esperado.hp, "HP máximo");
      assert.equal(character.mp?.max, esperado.mp, "MP máximo");
    });
  }

  it("nem Valefor nem Yurity passam de MAX_PROCS (3) procs", () => {
    for (const id of Object.keys(TABELA_ESPERADA)) {
      const character = SEED_CHARACTERS.find((c) => c.id === id);
      assert.ok((character.procs || []).length <= MAX_PROCS, `${id} tem mais de ${MAX_PROCS} procs`);
    }
  });
});
