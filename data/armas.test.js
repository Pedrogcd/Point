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

describe("descritoresEfetivosArma (27/10: sem treino escolhe 1 dos 2, treinado usa os dois)", () => {
  const lamina = getArmaPorId("lamina"); // letal / sortudo
  const laminaPesada = getArmaPorId("lamina_pesada"); // letal / esmagador_1 + pesado
  it("sem treino: só o Descritor 1 por padrão", () => {
    assert.deepEqual(descritoresEfetivosArma(lamina, false), ["letal"]);
  });
  it("sem treino: escolhendo o 2, só o Descritor 2", () => {
    assert.deepEqual(descritoresEfetivosArma(lamina, false, 2), ["sortudo"]);
  });
  it("treinado: os dois, independente da escolha", () => {
    assert.deepEqual(descritoresEfetivosArma(lamina, true), ["letal", "sortudo"]);
    assert.deepEqual(descritoresEfetivosArma(lamina, true, 2), ["letal", "sortudo"]);
  });
  it("Pesado (o extra) entra sempre, junto do escolhido", () => {
    assert.deepEqual(descritoresEfetivosArma(laminaPesada, false, 2), ["esmagador_1", "pesado"]);
    assert.deepEqual(descritoresEfetivosArma(laminaPesada, true), ["letal", "esmagador_1", "pesado"]);
  });
  it("escolha inválida cai no Descritor 1; arma nula devolve []", () => {
    assert.deepEqual(descritoresEfetivosArma(lamina, false, 7), ["letal"]);
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
