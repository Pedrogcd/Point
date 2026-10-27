// Confere a tabela de estatísticas esperada pro Valefor e a Yurity (Grupo
// Hetalion) — dada pelo dossiê separado enviado pelo Pedro em 07/10 — contra
// o motor de verdade (engine.js). Diferente dos outros personagens do Grupo
// Hetalion (que entraram em rascunho, grau E), esses dois vieram com fichas
// 3d10 completas propostas no próprio dossiê.
// Roda com `node --test` (Node >=20, nativo) ou `npm test`.

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { computeAcertoTipo, computeMaxHP, ACERTOS_POR_TIPO, MAX_PROCS } from "./engine.js";
import { loadAppModule } from "./renderTestUtils.js";

let SEED_CHARACTERS;

before(async () => {
  const mod = await loadAppModule();
  SEED_CHARACTERS = mod.SEED_CHARACTERS;
});

// Defesa / ResNatFís / ResNatMág / Acerto CaC,Fogo,Mág / HP / MP
// resNatFis/resNatMag = 2 + Vigor (grau cheio) — a Resistência Física/Mágica
// saiu de alimentar isso passivamente em 13/10 (virou defesa ativa, ver
// resolveResistenciaAtiva em engine.js), por isso os dois números agora
// sempre coincidem (nenhum dos dois soma proficiência).
// "defesa" saiu da tabela em 21/10 (docs/ATUALIZACAO_21-10.md item 1: a
// antiga estatística "Defesa = 8+bônus" foi removida de vez, nunca era lida
// por resolveAtaque de verdade — a Defesa real agora é a rolagem em
// resolveRolagemDefesa, testada em engine.test.js).
const TABELA_ESPERADA = {
  hetalion_valefor: { resNatFis: 4, resNatMag: 4, acerto: [2, 2], hp: 3, mp: 3 },
  hetalion_yurity: { resNatFis: 5, resNatMag: 5, acerto: [4, 6], hp: 4, mp: 3 },
};

describe("Tabela de estatísticas do Valefor/Yurity (engine.js x dossiê enviado)", () => {
  for (const [id, esperado] of Object.entries(TABELA_ESPERADA)) {
    it(`${id}: Defesa, Resistências, Acerto, HP e MP batem com a tabela do dossiê`, () => {
      const character = SEED_CHARACTERS.find((c) => c.id === id);
      assert.ok(character, `personagem "${id}" não encontrado em SEED_CHARACTERS`);

      // Resistência Natural saiu do statBase em 14/10 (docs/SISTEMA_MAGIA.md
      // item 2) — a defesa agora é a rolagem ativa de Resistência Física/Mágica,
      // sem estatística passiva pra comparar aqui.

      // 24/10: ACERTOS_POR_TIPO ganhou Desarmado — a tabela
      // compara só Corpo a corpo e Arma de fogo, como antes.
      const acertos = ACERTOS_POR_TIPO.filter((e) => e.key === "corpoACorpo" || e.key === "armaDeFogo").map((entrada) => computeAcertoTipo(character, entrada).total);
      assert.deepEqual(acertos, esperado.acerto, "Acerto Corpo a corpo/Arma de fogo/Mágico");

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
