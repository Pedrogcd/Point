// Smoke test de render do overlay de rotas do mapa (ver rotasMapa.js e
// MapaMundoInterativo em point-amaranth-app.jsx), no estilo de
// mapaMundo.test.js — monta a aba Mundo (WorldView) com várias formas de
// `rotas` (válida, malformada, null, vazia) e confere que nunca lança, nos
// dois modos (gm/jogador). Roda com `node --test` (Node >=20, nativo) ou
// `npm test`.

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadAppModule } from "./renderTestUtils.js";

describe("Overlay de rotas do mapa (WorldView) — renderiza com várias formas de `rotas`", () => {
  let WorldView;
  before(async () => {
    const mod = await loadAppModule();
    WorldView = mod.WorldView;
  });

  const kingdoms = [{
    id: "katalao", name: "Katalão", description: "",
    mapa: { cor: "#C9A227", poligono: [[0.1, 0.2], [0.3, 0.2], [0.3, 0.4], [0.1, 0.4]] },
    cities: [
      { id: "frontier", name: "Frontier", description: "d", x: 0.2, y: 0.3, capital: false },
      { id: "kingsyard", name: "Kingsyard", description: "d", x: 0.6, y: 0.5, capital: true },
    ],
  }];

  function render(rotas, gm) {
    return renderToStaticMarkup(
      React.createElement(WorldView, {
        kingdoms, setKingdoms: () => {}, askConfirm: () => {}, gm,
        rotas, setRotas: () => {},
      })
    );
  }

  it("rota válida (terrestre, ferrovia, marítima) renderiza sem lançar, GM e jogador", () => {
    const rotas = [
      { id: "r1", nome: "Estrada Real", tipo: "terrestre", pontos: [{ x: 0.2, y: 0.3, cidadeId: "frontier" }, { x: 0.4, y: 0.35 }, { x: 0.6, y: 0.5, cidadeId: "kingsyard" }], visivel: true, soMestre: false },
      { id: "r2", nome: "Linha do Vapor", tipo: "ferrovia", pontos: [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.2 }], visivel: true, soMestre: false },
      { id: "r3", nome: "Rota Marítima", tipo: "maritima", pontos: [{ x: 0.7, y: 0.7 }, { x: 0.9, y: 0.8 }], visivel: true, soMestre: true },
    ];
    for (const gm of [false, true]) assert.doesNotThrow(() => render(rotas, gm), `gm=${gm}`);
  });

  it("rota só-mestre e oculta some pro jogador mas aparece pro GM — e nenhum dos dois lança", () => {
    const rotas = [{ id: "r1", nome: "Segredo do mestre", tipo: "terrestre", pontos: [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.2 }], visivel: false, soMestre: true }];
    const htmlJogador = render(rotas, false);
    const htmlGm = render(rotas, true);
    assert.ok(!htmlJogador.includes("Segredo do mestre"));
    assert.ok(htmlGm.length > 0);
  });

  it("rota com 1 ponto só, pontos fora do intervalo ou tipo inválido não derruba a tela (lixo, não passou por migrarRotas ainda)", () => {
    const rotas = [
      { id: "r1", nome: "Incompleta", tipo: "terrestre", pontos: [{ x: 0.1, y: 0.1 }], visivel: true, soMestre: false },
      { id: "r2", nome: "Tipo esquisito", tipo: "voadora", pontos: [{ x: 2, y: -1 }, { x: 0.3, y: 0.3 }], visivel: true, soMestre: false },
      null,
      { pontos: "lixo" },
    ];
    for (const gm of [false, true]) assert.doesNotThrow(() => render(rotas, gm), `gm=${gm}`);
  });

  it("rotas null, undefined ou vazia renderizam sem lançar", () => {
    for (const valor of [null, undefined, []]) {
      for (const gm of [false, true]) assert.doesNotThrow(() => render(valor, gm), `rotas=${JSON.stringify(valor)} gm=${gm}`);
    }
  });

  it("rota com pontos colados em cidade usa o rótulo \"Cidade A → Cidade B\" sem lançar", () => {
    const rotas = [{ id: "r1", nome: "Estrada Real", tipo: "terrestre", pontos: [{ x: 0.2, y: 0.3, cidadeId: "frontier" }, { x: 0.6, y: 0.5, cidadeId: "kingsyard" }], visivel: true, soMestre: false }];
    assert.doesNotThrow(() => render(rotas, true));
  });
});
