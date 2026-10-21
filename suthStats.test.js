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

// Armadura / ResNatFís / ResNatMág / Acerto CaC,Fogo,Mág / HP / MP
// Armadura null = personagem sem item de armadura (mostrado como "–" na UI).
// "defesa" saiu da tabela em 21/10 (docs/ATUALIZACAO_21-10.md item 1: a
// antiga estatística "Defesa = 8+bônus" foi removida de vez, nunca era lida
// por resolveAtaque de verdade — a Defesa real agora é a rolagem em
// resolveRolagemDefesa, testada em engine.test.js).
// resNatFis/resNatMag = 2 + Vigor (grau cheio) — a Resistência Física/Mágica
// saiu de alimentar isso passivamente em 13/10 (virou defesa ativa, ver
// resolveResistenciaAtiva em engine.js), por isso os dois números agora
// sempre coincidem por personagem (nenhum dos dois soma mais proficiência).
const TABELA_ESPERADA = {
  suth_emphes: { armadura: null, resNatFis: 5, resNatMag: 5, acerto: [3, 1], hp: 5, mp: 3 },
  suth_velmira: { armadura: null, resNatFis: 3, resNatMag: 3, acerto: [0, 0], hp: 2, mp: 3 },
  suth_victoria: { armadura: 8, resNatFis: 7, resNatMag: 7, acerto: [2, 0], hp: 6, mp: 3 },
  suth_valeria: { armadura: 8, resNatFis: 6, resNatMag: 6, acerto: [4, 2], hp: 5, mp: 3 },
  suth_mars: { armadura: 8, resNatFis: 7, resNatMag: 7, acerto: [4, 2], hp: 6, mp: 3 },
  suth_zero: { armadura: null, resNatFis: 5, resNatMag: 5, acerto: [0, 0], hp: 5, mp: 3 },
  suth_kirilia: { armadura: 8, resNatFis: 5, resNatMag: 5, acerto: [6, 3], hp: 4, mp: 3 },
  suth_galantia: { armadura: 8, resNatFis: 6, resNatMag: 6, acerto: [3, 2], hp: 5, mp: 3 },
  suth_kyubei: { armadura: null, resNatFis: 5, resNatMag: 5, acerto: [6, 4], hp: 4, mp: 3 },
  suth_draguna: { armadura: null, resNatFis: 7, resNatMag: 7, acerto: [2, 2], hp: 6, mp: 3 },
  fate: { armadura: 8, resNatFis: 4, resNatMag: 4, acerto: [8, 4], hp: 3, mp: 3 },
  suth_athena: { armadura: 8, resNatFis: 5, resNatMag: 5, acerto: [6, 3], hp: 4, mp: 3 },
  suth_azula: { armadura: null, resNatFis: 4, resNatMag: 4, acerto: [1, 1], hp: 4, mp: 5 },
  suth_farron: { armadura: 8, resNatFis: 5, resNatMag: 5, acerto: [6, 3], hp: 4, mp: 3 },
  suth_athermis: { armadura: null, resNatFis: 4, resNatMag: 4, acerto: [4, 3], hp: 4, mp: 3 },
};

describe("Tabela de estatísticas do Grupo Suth (engine.js x documento de conversão)", () => {
  for (const [id, esperado] of Object.entries(TABELA_ESPERADA)) {
    it(`${id}: Armadura, Resistências, Acerto, HP e MP batem com a tabela esperada`, () => {
      const character = SEED_CHARACTERS.find((c) => c.id === id);
      assert.ok(character, `personagem "${id}" não encontrado em SEED_CHARACTERS`);

      const temArmadura = (character.itens?.armadura || []).length > 0;
      if (esperado.armadura === null) {
        assert.equal(temArmadura, false, "esperava personagem SEM armadura equipada");
      } else {
        assert.equal(temArmadura, true, "esperava personagem COM armadura equipada");
        assert.equal(computeStat(character, "resistArmadura"), esperado.armadura, "Resistência Armadura");
      }
      // Resistência Natural saiu do statBase em 14/10 (docs/SISTEMA_MAGIA.md
      // item 2) — a defesa agora é a rolagem ativa de Resistência Física/Mágica,
      // sem estatística passiva pra comparar aqui.

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
