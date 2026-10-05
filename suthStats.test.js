// Confere a tabela de estatísticas esperada pelas 15 fichas do Grupo Suth
// (dada pelo documento de conversão) contra o motor de verdade (engine.js) —
// e o limite de 3 procs por ficha (MAX_PROCS), pra todas as 15.
// Roda com `node --test` (Node >=20, nativo) ou `npm test`.

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { computeStat, computeAcertoTipo, computeMaxHP, ACERTOS_POR_TIPO, MAX_PROCS } from "./engine.js";
import { loadAppModule } from "./renderTestUtils.js";

let SEED_CHARACTERS;

before(async () => {
  const mod = await loadAppModule();
  SEED_CHARACTERS = mod.SEED_CHARACTERS;
});

// Defesa / Armadura / ResNatFís / ResNatMág / Acerto CaC,Fogo,Mág / HP / MP
// Armadura null = personagem sem item de armadura (mostrado como "–" na UI).
const TABELA_ESPERADA = {
  suth_emphes: { defesa: 10, armadura: null, resNatFis: 7, resNatMag: 8, acerto: [3, 1, 1], hp: 5, mp: 3 },
  suth_velmira: { defesa: 8, armadura: null, resNatFis: 4, resNatMag: 4, acerto: [0, 0, 0], hp: 2, mp: 3 },
  suth_victoria: { defesa: 8, armadura: 8, resNatFis: 11, resNatMag: 8, acerto: [2, 0, 0], hp: 6, mp: 3 },
  suth_valeria: { defesa: 10, armadura: 8, resNatFis: 9, resNatMag: 10, acerto: [4, 2, 1], hp: 5, mp: 3 },
  suth_mars: { defesa: 11, armadura: 8, resNatFis: 11, resNatMag: 10, acerto: [4, 2, 1], hp: 6, mp: 3 },
  suth_zero: { defesa: 9, armadura: null, resNatFis: 8, resNatMag: 9, acerto: [0, 0, 4], hp: 5, mp: 3 },
  suth_kirilia: { defesa: 11, armadura: 8, resNatFis: 8, resNatMag: 6, acerto: [6, 3, 0], hp: 4, mp: 3 },
  suth_galantia: { defesa: 10, armadura: 8, resNatFis: 11, resNatMag: 8, acerto: [3, 2, 0], hp: 5, mp: 3 },
  suth_kyubei: { defesa: 12, armadura: null, resNatFis: 7, resNatMag: 8, acerto: [6, 4, 0], hp: 4, mp: 3 },
  suth_draguna: { defesa: 10, armadura: null, resNatFis: 12, resNatMag: 10, acerto: [2, 2, 0], hp: 6, mp: 3 },
  fate: { defesa: 12, armadura: 8, resNatFis: 7, resNatMag: 6, acerto: [8, 4, 0], hp: 3, mp: 3 },
  suth_athena: { defesa: 11, armadura: 8, resNatFis: 8, resNatMag: 8, acerto: [6, 3, 0], hp: 4, mp: 3 },
  suth_azula: { defesa: 10, armadura: null, resNatFis: 7, resNatMag: 9, acerto: [1, 1, 3], hp: 4, mp: 5 },
  suth_farron: { defesa: 10, armadura: 8, resNatFis: 7, resNatMag: 7, acerto: [6, 3, 2], hp: 4, mp: 3 },
  suth_athermis: { defesa: 11, armadura: null, resNatFis: 6, resNatMag: 7, acerto: [4, 3, 0], hp: 4, mp: 3 },
};

describe("Tabela de estatísticas do Grupo Suth (engine.js x documento de conversão)", () => {
  for (const [id, esperado] of Object.entries(TABELA_ESPERADA)) {
    it(`${id}: Defesa, Armadura, Resistências, Acerto, HP e MP batem com a tabela esperada`, () => {
      const character = SEED_CHARACTERS.find((c) => c.id === id);
      assert.ok(character, `personagem "${id}" não encontrado em SEED_CHARACTERS`);

      assert.equal(computeStat(character, "defesa"), esperado.defesa, "Defesa");
      const temArmadura = (character.itens?.armadura || []).length > 0;
      if (esperado.armadura === null) {
        assert.equal(temArmadura, false, "esperava personagem SEM armadura equipada");
      } else {
        assert.equal(temArmadura, true, "esperava personagem COM armadura equipada");
        assert.equal(computeStat(character, "resistArmadura"), esperado.armadura, "Resistência Armadura");
      }
      assert.equal(computeStat(character, "resistNaturalFisica"), esperado.resNatFis, "Resistência Natural Física");
      assert.equal(computeStat(character, "resistNaturalMagica"), esperado.resNatMag, "Resistência Natural Mágica");

      const acertos = ACERTOS_POR_TIPO.map((entrada) => computeAcertoTipo(character, entrada).total);
      assert.deepEqual(acertos, esperado.acerto, "Acerto Corpo a corpo/Arma de fogo/Mágico");

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
