// Testes do catálogo de tipos de arma física (data/armas.js) — ver
// docs/ATUALIZACAO_21-10.md item 6. Roda com `node --test` ou `npm test`.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ARMAS, getArmaPorId, descritoresEfetivosArma } from "./armas.js";

describe("ARMAS", () => {
  it("tem os 17 tipos da planilha", () => {
    assert.equal(ARMAS.length, 17);
  });

  it("ids são únicos", () => {
    const ids = ARMAS.map((a) => a.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("toda arma tem descritor1, alcance e feridas>=1", () => {
    for (const a of ARMAS) {
      assert.ok(typeof a.descritor1 === "string" && a.descritor1.length > 0, a.id);
      assert.ok(["mesma_zona", "uma_zona_adiante", "longo"].includes(a.alcance), a.id);
      assert.ok(a.feridas >= 1, a.id);
    }
  });

  it("extra só é null ou 'pesado'", () => {
    for (const a of ARMAS) {
      assert.ok(a.extra === null || a.extra === "pesado", a.id);
    }
  });

  it("toda arma 'pesada' causa 2 feridas (5 tipos: lâmina/contundente/haste pesada, arma de fogo longa, arma de mecanismo)", () => {
    const pesadas = ARMAS.filter((a) => a.extra === "pesado");
    assert.equal(pesadas.length, 5);
    for (const a of pesadas) {
      assert.equal(a.feridas, 2, a.id);
    }
  });

  it("toda arma 'superficial' causa só 1 ferida (nunca pesada)", () => {
    const superficiais = ARMAS.filter((a) => a.superficial);
    for (const a of superficiais) {
      assert.equal(a.feridas, 1, a.id);
      assert.notEqual(a.extra, "pesado", a.id);
    }
  });

  it("getArmaPorId retorna null pra id desconhecido", () => {
    assert.equal(getArmaPorId("inexistente"), null);
  });
});

describe("descritoresEfetivosArma", () => {
  it("sem perícia, só o Descritor 1 (e o extra 'pesado', se houver)", () => {
    const lamina = getArmaPorId("lamina");
    assert.deepEqual(descritoresEfetivosArma(lamina, false), ["letal"]);
  });

  it("com perícia, Descritor 1 + Descritor 2", () => {
    const lamina = getArmaPorId("lamina");
    assert.deepEqual(descritoresEfetivosArma(lamina, true), ["letal", "sortudo"]);
  });

  it("arma pesada soma 'pesado' com ou sem perícia", () => {
    const laminaPesada = getArmaPorId("lamina_pesada");
    assert.deepEqual(descritoresEfetivosArma(laminaPesada, false), ["letal", "pesado"]);
    assert.deepEqual(descritoresEfetivosArma(laminaPesada, true), ["letal", "esmagador_1", "pesado"]);
  });

  it("arma nula devolve []", () => {
    assert.deepEqual(descritoresEfetivosArma(null, true), []);
  });
});
