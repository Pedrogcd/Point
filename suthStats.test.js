// Confere a tabela de estatísticas esperada pelas 15 fichas do Grupo Suth
// (dada pelo documento de conversão) contra o motor de verdade (engine.js) —
// e o limite de 3 procs por ficha (MAX_PROCS), pra todas as 15.
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

// Armadura null = personagem sem item de armadura (mostrado como "–" na UI).
// HP / MP — Defesa, Resistência Armadura e Acerto por tipo saíram em 15/10
// junto com computeStat/ACERTOS_POR_TIPO/computeAcertoTipo (painéis
// decorativos antigos sem função mecânica desde 14/10, ver engine.js).
const TABELA_ESPERADA = {
  suth_emphes: { armadura: null, hp: 5, mp: 3 },
  suth_velmira: { armadura: null, hp: 2, mp: 3 },
  suth_victoria: { armadura: 8, hp: 6, mp: 3 },
  suth_valeria: { armadura: 8, hp: 5, mp: 3 },
  suth_mars: { armadura: 8, hp: 6, mp: 3 },
  suth_zero: { armadura: null, hp: 5, mp: 3 },
  suth_kirilia: { armadura: 8, hp: 4, mp: 3 },
  suth_galantia: { armadura: 8, hp: 5, mp: 3 },
  suth_kyubei: { armadura: null, hp: 4, mp: 3 },
  suth_draguna: { armadura: null, hp: 6, mp: 3 },
  fate: { armadura: 8, hp: 3, mp: 3 },
  suth_athena: { armadura: 8, hp: 4, mp: 3 },
  suth_azula: { armadura: null, hp: 4, mp: 5 },
  suth_farron: { armadura: 8, hp: 4, mp: 3 },
  suth_athermis: { armadura: null, hp: 4, mp: 3 },
};

describe("Tabela de estatísticas do Grupo Suth (engine.js x documento de conversão)", () => {
  for (const [id, esperado] of Object.entries(TABELA_ESPERADA)) {
    it(`${id}: Armadura, HP e MP batem com a tabela esperada`, () => {
      const character = SEED_CHARACTERS.find((c) => c.id === id);
      assert.ok(character, `personagem "${id}" não encontrado em SEED_CHARACTERS`);

      const temArmadura = (character.itens?.armadura || []).length > 0;
      if (esperado.armadura === null) {
        assert.equal(temArmadura, false, "esperava personagem SEM armadura equipada");
      } else {
        assert.equal(temArmadura, true, "esperava personagem COM armadura equipada");
      }

      assert.equal(computeMaxHP(character), esperado.hp, "HP máximo");
      assert.equal(character.mp?.max, esperado.mp, "MP máximo");
    });
  }

  it("nenhuma das 15 fichas do Suth passa de MAX_PROCS (3) procs", () => {
    for (const id of Object.keys(TABELA_ESPERADA)) {
      const character = SEED_CHARACTERS.find((c) => c.id === id);
      assert.ok((character.procs || []).length <= MAX_PROCS, `${id} tem mais de ${MAX_PROCS} procs`);
    }
  });
});
