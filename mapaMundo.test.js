// Testes de mapaMundo.js: geometria pura (percentual, bbox, recorte) e
// migração do formato antigo de cidades. Também um smoke test de render da
// aba Mundo (WorldView) com e sem dados de mapa, pra não repetir o bug de
// tela branca. Roda com `node --test` (Node >=20, nativo) ou `npm test`.

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  slugificar, paraPercentual, bboxPoligono, calcularRecorte,
  migrarCidade, migrarCidades, cidadesPosicionadas,
} from "./mapaMundo.js";
import { loadAppModule } from "./renderTestUtils.js";

describe("slugificar", () => {
  it("remove acentos, espaços e maiúsculas", () => {
    assert.equal(slugificar("Katalão"), "katalao");
    assert.equal(slugificar("Riviéra"), "riviera");
    assert.equal(slugificar("  Kingsyard  "), "kingsyard");
  });
  it("nunca fica vazio", () => {
    assert.equal(slugificar(""), "cidade");
    assert.equal(slugificar(undefined), "cidade");
  });
});

describe("paraPercentual", () => {
  it("ponto (0.5, 0.5) cai no centro — 50%/50%, igual em qualquer largura de contêiner (é só porcentagem, não pixel)", () => {
    assert.deepEqual(paraPercentual([0.5, 0.5]), { left: "50%", top: "50%" });
  });
  it("(0,0) e (1,1) ficam nos cantos", () => {
    assert.deepEqual(paraPercentual([0, 0]), { left: "0%", top: "0%" });
    assert.deepEqual(paraPercentual([1, 1]), { left: "100%", top: "100%" });
  });
});

describe("bboxPoligono", () => {
  it("calcula a caixa delimitadora de um polígono", () => {
    const bbox = bboxPoligono([[0.1, 0.2], [0.5, 0.1], [0.4, 0.6]]);
    assert.deepEqual(bbox, { minX: 0.1, minY: 0.1, maxX: 0.5, maxY: 0.6, width: 0.4, height: 0.5 });
  });
  it("null com menos de 3 pontos, vazio ou ausente", () => {
    assert.equal(bboxPoligono([[0.1, 0.2]]), null);
    assert.equal(bboxPoligono([]), null);
    assert.equal(bboxPoligono(undefined), null);
  });
});

describe("calcularRecorte", () => {
  it("escala pra caber o polígono + folga, sem deslocar quando já está centralizado", () => {
    const r = calcularRecorte([[0.4, 0.4], [0.6, 0.4], [0.6, 0.6], [0.4, 0.6]], 0.1);
    // bbox 0.2x0.2; folga 10% = 0.02 de cada lado => caixa final 0.24x0.24
    assert.ok(Math.abs(r.scale - 1 / 0.24) < 1e-9, `scale inesperado: ${r.scale}`);
    assert.ok(Math.abs(r.translateX) < 1e-9);
    assert.ok(Math.abs(r.translateY) < 1e-9);
  });
  it("desloca pra centralizar um território que não está no centro da imagem", () => {
    const r = calcularRecorte([[0, 0], [0.2, 0], [0.2, 0.2], [0, 0.2]], 0);
    // centro do bbox é (0.1, 0.1); precisa empurrar 0.5-0.1=0.4 => 40%
    assert.ok(Math.abs(r.translateX - 40) < 1e-9);
    assert.ok(Math.abs(r.translateY - 40) < 1e-9);
  });
  it("null sem polígono válido", () => {
    assert.equal(calcularRecorte(undefined), null);
    assert.equal(calcularRecorte([[0.1, 0.1]]), null);
  });
});

describe("migrarCidade / migrarCidades — migração do formato antigo", () => {
  it("formato antigo ({name, description}) ganha id, x, y e capital sem perder nome nem descrição", () => {
    const nova = migrarCidade({ name: "Kingsyard", description: "Cidade portuária." });
    assert.equal(nova.name, "Kingsyard");
    assert.equal(nova.description, "Cidade portuária.");
    assert.equal(nova.id, "kingsyard");
    assert.equal(nova.x, null);
    assert.equal(nova.y, null);
    assert.equal(nova.capital, false);
  });
  it("preserva campos extras (ex: link) e x/y já existentes, sem sobrescrever", () => {
    const c = { id: "frontier", name: "Frontier", description: "d", link: "sidepoint/frontier.html", x: 0.3, y: 0.4, capital: true };
    const nova = migrarCidade(c);
    assert.deepEqual(nova, c);
  });
  it("migrarCidades desempata ids colidentes (nomes iguais sem diferenciar maiúsculas/acento)", () => {
    const lista = [{ name: "Katalão", description: "a" }, { name: "katalao", description: "b" }];
    const migrada = migrarCidades(lista);
    assert.equal(migrada[0].id, "katalao");
    assert.equal(migrada[1].id, "katalao_2");
    assert.equal(migrada[0].description, "a");
    assert.equal(migrada[1].description, "b");
  });
  it("é idempotente: migrar de novo o resultado já migrado não muda nada", () => {
    const lista = [{ name: "Mundis", description: "x" }, { id: "frontier", name: "Frontier", description: "y", x: 0.2, y: 0.2 }];
    const uma = migrarCidades(lista);
    const duas = migrarCidades(uma);
    assert.deepEqual(duas, uma);
  });
  it("cidades sem nome não quebram a migração", () => {
    assert.doesNotThrow(() => migrarCidades([{ description: "sem nome" }, null, undefined]));
  });
});

describe("cidadesPosicionadas", () => {
  it("filtra só as cidades com x/y numéricos", () => {
    const lista = [{ id: "a", x: 0.1, y: 0.2 }, { id: "b", x: null, y: null }, { id: "c" }];
    assert.deepEqual(cidadesPosicionadas(lista).map((c) => c.id), ["a"]);
  });
});

describe("Aba Mundo (WorldView) — renderiza com e sem dados de mapa", () => {
  let WorldView;
  before(async () => {
    const mod = await loadAppModule();
    WorldView = mod.WorldView;
  });

  function render(kingdoms) {
    return renderToStaticMarkup(
      React.createElement(WorldView, { kingdoms, setKingdoms: () => {}, askConfirm: () => {}, gm: false })
    );
  }

  it("reino sem campo mapa renderiza sem lançar (não desenha overlay)", () => {
    const kingdoms = [{ id: "hetalion", name: "Hetalion", description: "", cities: [] }];
    assert.doesNotThrow(() => render(kingdoms));
  });

  it("reino com mapa.poligono vazio (ainda não traçado) renderiza sem lançar", () => {
    const kingdoms = [{ id: "katalao", name: "Katalão", description: "", mapa: { cor: "#C9A227", poligono: [] }, cities: [] }];
    assert.doesNotThrow(() => render(kingdoms));
  });

  it("reino com mapa.poligono e cidades posicionadas renderiza sem lançar", () => {
    const kingdoms = [{
      id: "katalao", name: "Katalão", description: "",
      mapa: { cor: "#C9A227", poligono: [[0.1, 0.2], [0.3, 0.2], [0.3, 0.4], [0.1, 0.4]] },
      cities: [{ id: "frontier", name: "Frontier", description: "d", x: 0.2, y: 0.3, capital: false }],
    }];
    assert.doesNotThrow(() => render(kingdoms));
  });

  it("renderiza mesmo com cidade ainda sem x/y (não posicionada)", () => {
    const kingdoms = [{
      id: "katalao", name: "Katalão", description: "",
      mapa: { cor: "#C9A227", poligono: [[0, 0], [1, 0], [1, 1]] },
      cities: [{ id: "kingsyard", name: "Kingsyard", description: "", x: null, y: null, capital: false }],
    }];
    assert.doesNotThrow(() => render(kingdoms));
  });

  it("os seis reinos semente (alguns com mapa, outros sem) renderizam juntos sem lançar", () => {
    const kingdoms = [
      { id: "hetalion", name: "Hetalion", description: "", cities: [{ name: "Novolar", description: "" }] },
      {
        id: "katalao", name: "Katalão", description: "",
        mapa: { cor: "#C9A227", poligono: [[0.05, 0.1], [0.3, 0.05], [0.28, 0.4], [0.05, 0.42]] },
        cities: [{ id: "katalao_cidade", name: "Katalão", description: "", x: 0.15, y: 0.2, capital: true }],
      },
      { id: "maxis", name: "Maxis Power", description: "", cities: [] },
      { id: "suth", name: "Suth", description: "", cities: [] },
      { id: "goethia", name: "Goethia", description: "", cities: [] },
      { id: "amaranth", name: "Amaranth/Omem", description: "", cities: [] },
    ];
    assert.doesNotThrow(() => render(kingdoms));
  });
});
