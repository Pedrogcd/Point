// Testes da lógica pura de rolagemAnimada.js (duracaoRolagem/faceDoDado) —
// a parte "quando e como revelar" da rolagem animada do painel de Teste/
// Ataque/Magia e do DuelRoller. Não testa React nem animação de verdade
// (isso é conferido manualmente no navegador — ver relatório da tarefa);
// só a matemática/regra de apresentação que os componentes consultam.
// Roda com `node --test` (Node >=20, nativo) ou `npm test`.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { duracaoRolagem, faceDoDado } from "./rolagemAnimada.js";

describe("rolagemAnimada — duracaoRolagem", () => {
  it("dado 0 (primeiro): 1000ms (1s de tumble, sem atraso)", () => {
    assert.equal(duracaoRolagem(0, false), 1000);
  });

  it("cada posição seguinte soma 140ms (0.14s) de atraso", () => {
    assert.equal(duracaoRolagem(1, false), 1140);
    assert.equal(duracaoRolagem(2, false), 1280);
    assert.equal(duracaoRolagem(4, false), 1560);
  });

  it("reduzido (prefers-reduced-motion): sempre 0, não importa o índice", () => {
    assert.equal(duracaoRolagem(0, true), 0);
    assert.equal(duracaoRolagem(1, true), 0);
    assert.equal(duracaoRolagem(9, true), 0);
  });

  it("índice negativo não gera duração negativa (clampa em 0)", () => {
    assert.equal(duracaoRolagem(-1, false), 1000);
    assert.equal(duracaoRolagem(-5, false), 1000);
  });
});

describe("rolagemAnimada — faceDoDado", () => {
  it("10 natural é sempre crítico, não importa o limiar", () => {
    assert.equal(faceDoDado(10, 5), "crit");
    assert.equal(faceDoDado(10, 0), "crit");
    assert.equal(faceDoDado(10, 9), "crit");
  });

  it("dado acima do limiar (e não 10) é sucesso (win)", () => {
    assert.equal(faceDoDado(6, 5), "win");
    assert.equal(faceDoDado(9, 5), "win");
  });

  it("dado igual ou abaixo do limiar (e não é 1) é normal", () => {
    assert.equal(faceDoDado(5, 5), "normal");
    assert.equal(faceDoDado(3, 5), "normal");
  });

  it("dado 1 (e não é sucesso) é \"one\"", () => {
    assert.equal(faceDoDado(1, 5), "one");
  });

  it("borda: limiar 0 faz até o dado 1 contar como sucesso — sucesso tem prioridade sobre \"one\"", () => {
    assert.equal(faceDoDado(1, 0), "win");
  });

  it("mesma regra de recomputeRoll: d === 10 || d > limiar conta como sucesso", () => {
    const limiar = 5;
    for (let d = 1; d <= 10; d++) {
      const esperaSucesso = d === 10 || d > limiar;
      const face = faceDoDado(d, limiar);
      assert.equal(face === "crit" || face === "win", esperaSucesso, `dado ${d} com limiar ${limiar}`);
    }
  });
});
