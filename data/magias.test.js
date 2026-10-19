// Testes do catálogo de magias (data/magias.js) — ver docs/SISTEMA_MAGIA.md,
// seção "Catálogo de magias". Roda com `node --test` ou `npm test`.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MAGIAS, getMagiaPorId, ENCANTAMENTOS, getEncantamentoPorId, descritoresDeEncantamentosAtivos,
} from "./magias.js";

describe("MAGIAS", () => {
  it("tem as 11 magias do guia + o placeholder Sensor + Chama Mágica, 19/10 (13 entradas)", () => {
    assert.equal(MAGIAS.length, 13);
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

  // Chama Mágica (Pedro, 19/10): primeira magia com o descritor Queimadura.
  it("Chama Mágica tem o descritor 'queimadura' (grau 1, sem N explícito)", () => {
    const chama = getMagiaPorId("chama_magica");
    assert.ok(chama, "Chama Mágica deveria existir no catálogo");
    assert.deepEqual(chama.descritores, ["magia", "queimadura"]);
    assert.equal(chama.feridas, 1);
  });
});

describe("ENCANTAMENTOS", () => {
  it("Encantamento Flamejante concede 'queimadura' e pertence ao ofício Encantamentos", () => {
    const enc = getEncantamentoPorId("encantamento_flamejante");
    assert.ok(enc);
    assert.equal(enc.disciplinaId, "oficio-encantamentos");
    assert.deepEqual(enc.descritoresConcedidos, ["queimadura"]);
  });

  it("getEncantamentoPorId retorna null pra id desconhecido", () => {
    assert.equal(getEncantamentoPorId("inexistente"), null);
  });

  describe("descritoresDeEncantamentosAtivos", () => {
    it("sem encantamentosAtivos, devolve []", () => {
      assert.deepEqual(descritoresDeEncantamentosAtivos({}), []);
    });
    it("com Encantamento Flamejante ativo, devolve ['queimadura']", () => {
      assert.deepEqual(descritoresDeEncantamentosAtivos({ encantamentosAtivos: ["encantamento_flamejante"] }), ["queimadura"]);
    });
    it("dedupe quando dois encantamentos ativos dessem o mesmo descritor", () => {
      // Não há dois ainda no catálogo, mas a função precisa deduplicar se um dia houver.
      const resultado = descritoresDeEncantamentosAtivos({ encantamentosAtivos: ["encantamento_flamejante", "encantamento_flamejante"] });
      assert.deepEqual(resultado, ["queimadura"]);
    });
    it("id desconhecido não quebra e não soma nada", () => {
      assert.deepEqual(descritoresDeEncantamentosAtivos({ encantamentosAtivos: ["inexistente"] }), []);
    });
  });
});
