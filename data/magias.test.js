// Testes do catálogo de magias (data/magias.js) — ver docs/SISTEMA_MAGIA.md,
// seção "Catálogo de magias". Roda com `node --test` ou `npm test`.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MAGIAS, getMagiaPorId } from "./magias.js";

describe("MAGIAS", () => {
  it("tem as 11 magias do guia + o placeholder Sensor (12 entradas)", () => {
    assert.equal(MAGIAS.length, 12);
  });
  it("toda magia tem o descritor 'magia'", () => {
    for (const m of MAGIAS) {
      assert.ok(m.descritores.includes("magia"), `${m.nome} deveria ter o descritor "magia"`);
    }
  });
  it("Escudo de Mana não rola (semRolagem) e tem efeito descrito em texto", () => {
    const escudo = getMagiaPorId("escudo_de_mana");
    assert.equal(escudo.semRolagem, true);
    assert.equal(typeof escudo.efeito, "string");
    assert.ok(escudo.efeito.length > 0);
  });
  it("Sensor é placeholder, sem custo/pool fechados no guia", () => {
    const sensor = getMagiaPorId("sensor");
    assert.equal(sensor.placeholder, true);
    assert.equal(sensor.custoMp, null);
  });
  it("Mísseis Mágicos tem ajusteDados +1 (Base mágica + 1 + Ofícios/Inteligência)", () => {
    assert.equal(getMagiaPorId("misseis_magicos").ajusteDados, 1);
  });
  it("magias marcadas 'superficial' no guia têm o campo superficial=true", () => {
    assert.equal(getMagiaPorId("shin").superficial, true);
    assert.equal(getMagiaPorId("misseis_magicos").superficial, true);
    assert.equal(getMagiaPorId("magia_de_guerra_maxis").superficial, true);
    assert.equal(getMagiaPorId("bombardeio_de_mana").superficial, false);
  });
  it("magias 'Em área' têm emArea=true", () => {
    for (const id of ["bombardeio_de_mana", "shin", "magia_de_guerra_maxis"]) {
      assert.equal(getMagiaPorId(id).emArea, true, id);
    }
  });
  it("getMagiaPorId retorna null pra id desconhecido", () => {
    assert.equal(getMagiaPorId("inexistente"), null);
  });
});
