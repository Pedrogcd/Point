// Testes de render do componente Retrato (point-amaranth-app.jsx) — a
// miniatura unificada usada na ficha, nos cards da lista de Personagens, no
// Confronto e na vitrine da Capa. Cobre o bug relatado (card da lista
// mostrando só o ícone de escudo mesmo com imageUrl preenchido) e o
// enquadramento (imagemPos: { y, zoom }).
// Roda com `node --test` (Node >=20, nativo) ou `npm test`.

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadAppModule } from "./renderTestUtils.js";

let Retrato;

before(async () => {
  const mod = await loadAppModule();
  Retrato = mod.Retrato;
});

function render(props) {
  return renderToStaticMarkup(React.createElement(Retrato, props));
}

describe("Retrato", () => {
  it("mostra a imagem (<img>) quando o personagem tem imageUrl — não só o ícone de escudo", () => {
    const html = render({ character: { id: "x", name: "X", imageUrl: "retratos/x.jpg" } });
    assert.ok(html.includes("<img"), "esperava uma tag <img> no HTML renderizado");
    assert.ok(html.includes("retratos/x.jpg"));
  });

  it("cai pro ícone de escudo (sem <img>) quando não há imageUrl", () => {
    const html = render({ character: { id: "x", name: "X", imageUrl: "" } });
    assert.ok(!html.includes("<img"), "não deveria renderizar <img> sem imageUrl");
  });

  it("cai pro ícone de escudo quando o personagem é undefined/null (nunca lança)", () => {
    assert.doesNotThrow(() => render({ character: null }));
    assert.doesNotThrow(() => render({ character: undefined }));
    assert.doesNotThrow(() => render({}));
  });

  it("aplica objectPosition e transform a partir de imagemPos (y/zoom)", () => {
    const html = render({ character: { id: "x", name: "X", imageUrl: "retratos/x.jpg", imagemPos: { y: 20, zoom: 2 } } });
    assert.ok(html.includes("object-position:50% 20%") || html.includes("50% 20%"));
    assert.ok(html.includes("scale(2)"));
  });

  it("sem imagemPos, usa o padrão centralizado (y:50) e sem zoom (sem transform)", () => {
    const html = render({ character: { id: "x", name: "X", imageUrl: "retratos/x.jpg" } });
    assert.ok(html.includes("50% 50%"));
    assert.ok(!html.includes("scale("));
  });

  it("zoom 1 não aplica transform (otimização, visualmente idêntico)", () => {
    const html = render({ character: { id: "x", name: "X", imageUrl: "retratos/x.jpg", imagemPos: { y: 50, zoom: 1 } } });
    assert.ok(!html.includes("scale("));
  });
});
