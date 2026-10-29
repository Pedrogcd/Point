// Testes do catálogo de tipos de arma física (data/armas.js) — ver
// docs/ATUALIZACAO_21-10.md item 6. Roda com `node --test` ou `npm test`.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ARMAS, getArmaPorId, descritoresEfetivosArma, normalizarDescritoresArma, profKeyDaArma, treinadoNaArma } from "./armas.js";

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

  it("extra só é null, 'pesado' ou 'arma_de_fogo' (29/10)", () => {
    for (const a of ARMAS) {
      assert.ok(a.extra === null || a.extra === "pesado" || a.extra === "arma_de_fogo", a.id);
    }
  });

  it("toda arma 'pesada' causa 2 feridas (4 tipos: lâmina/contundente/haste pesada, arma de mecanismo)", () => {
    const pesadas = ARMAS.filter((a) => a.extra === "pesado");
    assert.equal(pesadas.length, 4);
    for (const a of pesadas) {
      assert.equal(a.feridas, 2, a.id);
    }
  });

  it("29/10: as 3 armas de fogo têm o descritor Arma de fogo (na longa, no lugar do Pesado) e 2 feridas", () => {
    const fogo = ARMAS.filter((a) => a.familia === "Arma de fogo");
    assert.equal(fogo.length, 3);
    for (const a of fogo) {
      assert.equal(a.extra, "arma_de_fogo", a.id);
      assert.equal(a.feridas, 2, a.id);
      assert.ok(descritoresEfetivosArma(a, []).includes("arma_de_fogo"), a.id);
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

describe("descritoresEfetivosArma (28/10: usa os marcados — um ou os dois)", () => {
  const lamina = getArmaPorId("lamina"); // letal / sortudo
  const laminaPesada = getArmaPorId("lamina_pesada"); // letal / esmagador_1 + pesado
  it("padrão: só o Descritor 1", () => {
    assert.deepEqual(descritoresEfetivosArma(lamina), ["letal"]);
  });
  it("29/10: lista vazia = nenhum descritor (só o Pesado, se houver)", () => {
    assert.deepEqual(descritoresEfetivosArma(lamina, []), []);
    assert.deepEqual(descritoresEfetivosArma(getArmaPorId("lamina_pesada"), []), ["pesado"]);
  });
  it("só o 2, ou os dois", () => {
    assert.deepEqual(descritoresEfetivosArma(lamina, [2]), ["sortudo"]);
    assert.deepEqual(descritoresEfetivosArma(lamina, [1, 2]), ["letal", "sortudo"]);
  });
  it("Pesado entra sempre", () => {
    assert.deepEqual(descritoresEfetivosArma(laminaPesada, [2]), ["esmagador_1", "pesado"]);
  });
  it("arma nula devolve []", () => {
    assert.deepEqual(descritoresEfetivosArma(null, [1, 2]), []);
  });
});

describe("normalizarDescritoresArma (28/10)", () => {
  const lamina = getArmaPorId("lamina");
  it("lista nova é respeitada; valor antigo 1/2 (27/10) vira lista", () => {
    assert.deepEqual(normalizarDescritoresArma([2, 1], lamina), [1, 2]);
    assert.deepEqual(normalizarDescritoresArma(2, lamina), [2]);
    assert.deepEqual(normalizarDescritoresArma(undefined, lamina), [1]);
  });
  it("29/10: lista salva vale como está — vazia fica vazia, inválidos saem", () => {
    assert.deepEqual(normalizarDescritoresArma([], lamina), []);
    assert.deepEqual(normalizarDescritoresArma([7], lamina), []);
  });
});

describe("profKeyDaArma / treinadoNaArma (24/10, docs/ATUALIZACAO_24-10.md seções 0.1-0.2)", () => {
  it("família define a proficiência: Arma de fogo, Distância, resto Corpo a Corpo", () => {
    assert.equal(profKeyDaArma(getArmaPorId("arma_de_fogo_curta")), "armasDeFogo");
    assert.equal(profKeyDaArma(getArmaPorId("arma_de_arco")), "combateCorpoACorpo"); // 27/10: Distância usa Armas
    assert.equal(profKeyDaArma(getArmaPorId("lamina")), "combateCorpoACorpo");
    assert.equal(profKeyDaArma(getArmaPorId("haste")), "combateCorpoACorpo");
  });
  it("treinado com grau E+ na proficiência da arma; grau F não é treinado", () => {
    const arco = getArmaPorId("arma_de_arco");
    assert.equal(treinadoNaArma({ proficiencias: { combateCorpoACorpo: "E" } }, arco), true);
    assert.equal(treinadoNaArma({ proficiencias: { combateCorpoACorpo: "F" } }, arco), false);
    assert.equal(treinadoNaArma({ proficiencias: {} }, arco), false);
  });
  it("Treino de ofício conta mesmo com grau F", () => {
    assert.equal(treinadoNaArma({ proficiencias: { armasDeFogo: "F" } }, getArmaPorId("arma_de_fogo_curta"), true), true);
  });
});
