// Testes do catálogo de tipos de arma física (data/armas.js) — ver
// docs/ATUALIZACAO_21-10.md item 6. Roda com `node --test` ou `npm test`.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ARMAS, getArmaPorId, descritoresEfetivosArma, profKeyDaArma, treinadoNaArma } from "./armas.js";

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

describe("profKeyDaArma / treinadoNaArma (24/10, docs/ATUALIZACAO_24-10.md seções 0.1-0.2)", () => {
  it("família define a proficiência: Arma de fogo, Distância, resto Corpo a Corpo", () => {
    assert.equal(profKeyDaArma(getArmaPorId("arma_de_fogo_curta")), "armasDeFogo");
    assert.equal(profKeyDaArma(getArmaPorId("arma_de_arco")), "armasADistancia");
    assert.equal(profKeyDaArma(getArmaPorId("lamina")), "combateCorpoACorpo");
    assert.equal(profKeyDaArma(getArmaPorId("haste")), "combateCorpoACorpo");
  });
  it("treinado com grau E+ na proficiência da arma; grau F não é treinado", () => {
    const arco = getArmaPorId("arma_de_arco");
    assert.equal(treinadoNaArma({ proficiencias: { armasADistancia: "E" } }, arco), true);
    assert.equal(treinadoNaArma({ proficiencias: { armasADistancia: "F" } }, arco), false);
    assert.equal(treinadoNaArma({ proficiencias: {} }, arco), false);
  });
  it("Treino de ofício conta mesmo com grau F", () => {
    assert.equal(treinadoNaArma({ proficiencias: { armasDeFogo: "F" } }, getArmaPorId("arma_de_fogo_curta"), true), true);
  });
});
