import { test } from "node:test";
import assert from "node:assert/strict";
import { textoVisivel, entradasVisiveis, npcVisivel, npcsPorReinoECidade, normalizarModo, MAPA_MUNDO } from "./mundo.js";
import { NPCS, FRONTIER, KATALAO_INFO } from "./mundoDados.js";

test("textoVisivel: string vale para os dois modos", () => {
  assert.equal(textoVisivel("oi", false), "oi");
  assert.equal(textoVisivel("oi", true), "oi");
});
test("textoVisivel: jogador vê pub, GM vê gm quando existe", () => {
  const e = { pub: "público", gm: "segredo" };
  assert.equal(textoVisivel(e, false), "público");
  assert.equal(textoVisivel(e, true), "segredo");
  assert.equal(textoVisivel({ pub: "só pub" }, true), "só pub");
});
test("textoVisivel: entrada só de GM some para o jogador", () => {
  assert.equal(textoVisivel({ gm: "x" }, false), null);
  assert.equal(entradasVisiveis([{ pub: "a" }, { gm: "b" }], false).length, 1);
  assert.equal(entradasVisiveis([{ pub: "a" }, { gm: "b" }], true).length, 2);
});
test("normalizarModo cai em jogador para valores inválidos", () => {
  assert.equal(normalizarModo("gm"), "gm");
  assert.equal(normalizarModo("x"), "jogador");
  assert.equal(normalizarModo(null), "jogador");
});
test("npcVisivel: jogador nunca recebe segredo nem ganchos", () => {
  for (const n of NPCS) {
    const v = npcVisivel(n, false);
    assert.equal(v.segredo, null, n.id);
    assert.deepEqual(v.ganchos, [], n.id);
    assert.ok(v.nome && v.papel, n.id);
  }
});
test("npcVisivel: GM recebe segredo e ganchos quando existem", () => {
  const otto = NPCS.find((n) => n.id === "frontier_otto");
  const v = npcVisivel(otto, true);
  assert.ok(v.segredo && v.segredo.includes("Dragoalma"));
  assert.ok(v.ganchos.length > 0);
});
test("conteúdo de jogador não vaza segredos do mestre", () => {
  const publico = JSON.stringify([
    NPCS.map((n) => npcVisivel(n, false)),
    Object.values(FRONTIER.termos).map((t) => textoVisivel(t, false)),
    Object.values(FRONTIER.distritos).map((t) => textoVisivel(t, false)),
    KATALAO_INFO.casas.map((c) => textoVisivel(c, false)),
    FRONTIER.medos.map((m) => textoVisivel(m, false)),
    FRONTIER.forcas.map((f) => [textoVisivel(f, false), textoVisivel(f.titulo, false)]),
  ]);
  for (const proibido of ["ausência de Dragoalma", "Segredo", "Gancho:", "desvia grão", "chantage", "Van Pendragon, filho de Wyver, cedendo", "GLaDOS", "mal sem sal"]) {
    assert.ok(!publico.includes(proibido), `vazou: ${proibido}`);
  }
});
test("npcsPorReinoECidade agrupa Frontier dentro de Katalão", () => {
  const g = npcsPorReinoECidade(NPCS);
  assert.equal(g.length, 1);
  assert.equal(g[0].reino, "katalao");
  assert.equal(g[0].cidades[0].cidade, "frontier");
  assert.equal(g[0].cidades[0].npcs.length, NPCS.length);
});
test("mapa do mundo tem pino para os seis reinos semente", () => {
  for (const id of ["hetalion", "katalao", "maxis", "suth", "goethia", "amaranth"]) {
    const p = MAPA_MUNDO.pinos[id];
    assert.ok(p && p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100, id);
  }
});
test("distritos do mapa SVG têm texto", () => {
  const ids = [...FRONTIER.mapaSvg.matchAll(/data-region="([^"]+)"/g)].map((m) => m[1]);
  for (const id of ids) assert.ok(FRONTIER.distritos[id], `distrito sem texto: ${id}`);
});
