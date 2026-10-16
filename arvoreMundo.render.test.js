// Smoke test de render da Árvore do mundo (WorldView > sub-aba Árvore, ver
// arvoreMundo.js pros dados puros). Roda com `node --test` (Node >=20,
// nativo) ou `npm test`.

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadAppModule } from "./renderTestUtils.js";
import { montarArvoreMundo } from "./arvoreMundo.js";

let WorldView, ArvoreMundoView, NoArvoreMundo, SEED_KINGDOMS, SEED_GODS, SEED_CHARACTERS, SEED_SAGAS, GRUPOS;

before(async () => {
  const mod = await loadAppModule();
  WorldView = mod.WorldView;
  ArvoreMundoView = mod.ArvoreMundoView;
  NoArvoreMundo = mod.NoArvoreMundo;
  SEED_KINGDOMS = mod.SEED_KINGDOMS;
  SEED_GODS = mod.SEED_GODS;
  SEED_CHARACTERS = mod.SEED_CHARACTERS;
  SEED_SAGAS = mod.SEED_SAGAS;
  GRUPOS = mod.GRUPOS;
});

// NoArvoreMundo é testado DIRETO (não só via ArvoreMundoView) porque, por
// padrão, só a raiz/seções/reinos vêm abertos (ver idsAbertosPadrao em
// arvoreMundo.js) — cidades, pessoas e mesas ficam fechadas até o usuário
// clicar ou buscar. renderToStaticMarkup não simula clique, então sem isso
// esses testes "passariam" sem nunca chegar a renderizar o conteúdo que
// querem checar (retrato, etiqueta de status etc.) — mesmo lição do bug do
// LADOS no Encontro (ver encontro.render.test.js).
function renderForcado(n, characters) {
  return renderToStaticMarkup(
    React.createElement(NoArvoreMundo, {
      n, profundidade: 0, forced: true, abertos: new Set(), onToggle: () => {}, onNavegar: () => {},
      characters: characters || [],
    })
  );
}

describe("ArvoreMundoView — renderiza sem lançar", () => {
  it("com dados vazios (nenhum reino/deus/personagem/saga)", () => {
    assert.doesNotThrow(() => renderToStaticMarkup(
      React.createElement(ArvoreMundoView, {
        kingdoms: [], gods: [], characters: [], sagas: [], grupos: [], gm: true,
        onAbrirReino: () => {}, onAbrirCidade: () => {}, onAbrirFicha: () => {},
        onAbrirDeuses: () => {}, onAbrirSagas: () => {}, onAbrirPessoasDoReino: () => {},
      })
    ));
  });

  it("com os seeds reais do app, modo GM — mostra o texto 'AMARANTH' e os contadores", () => {
    const html = renderToStaticMarkup(
      React.createElement(ArvoreMundoView, {
        kingdoms: SEED_KINGDOMS, gods: SEED_GODS, characters: SEED_CHARACTERS, sagas: SEED_SAGAS, grupos: GRUPOS, gm: true,
        onAbrirReino: () => {}, onAbrirCidade: () => {}, onAbrirFicha: () => {},
        onAbrirDeuses: () => {}, onAbrirSagas: () => {}, onAbrirPessoasDoReino: () => {},
      })
    );
    assert.ok(html.includes("AMARANTH"));
    assert.ok(html.includes("Árvore hierárquica do mundo de Point"));
    assert.ok(html.includes("Reinos"));
    assert.ok(html.includes("Panteão"));
    assert.ok(html.includes("Mesas e personagens"));
    assert.ok(html.includes("Sagas"));
  });

  it("com os seeds reais do app, modo Jogador — não lança", () => {
    assert.doesNotThrow(() => renderToStaticMarkup(
      React.createElement(ArvoreMundoView, {
        kingdoms: SEED_KINGDOMS, gods: SEED_GODS, characters: SEED_CHARACTERS, sagas: SEED_SAGAS, grupos: GRUPOS, gm: false,
        onAbrirReino: () => {}, onAbrirCidade: () => {}, onAbrirFicha: () => {},
        onAbrirDeuses: () => {}, onAbrirSagas: () => {}, onAbrirPessoasDoReino: () => {},
      })
    ));
  });

  it("sem callbacks de navegação (undefined) não lança ao renderizar", () => {
    assert.doesNotThrow(() => renderToStaticMarkup(
      React.createElement(ArvoreMundoView, { kingdoms: SEED_KINGDOMS, gods: SEED_GODS, characters: SEED_CHARACTERS, sagas: SEED_SAGAS, grupos: GRUPOS, gm: true })
    ));
  });

  it("personagem com imageUrl renderiza uma <img> (Retrato); sem imageUrl, o ponto glyph", () => {
    const comImagem = [{ id: "p1", name: "Com Foto", grupo: "c", imageUrl: "retratos/p1.jpg" }];
    const semImagem = [{ id: "p2", name: "Sem Foto", grupo: "c" }];
    const grupos = [{ id: "c", label: "Grupo C", subtitulo: "" }];

    const arvoreComImagem = montarArvoreMundo({ kingdoms: [], gods: [], characters: comImagem, sagas: [], grupos, gm: true });
    const htmlComImagem = renderForcado(arvoreComImagem, comImagem);
    assert.ok(htmlComImagem.includes("<img"));
    assert.ok(htmlComImagem.includes("retratos/p1.jpg"));

    const arvoreSemImagem = montarArvoreMundo({ kingdoms: [], gods: [], characters: semImagem, sagas: [], grupos, gm: true });
    const htmlSemImagem = renderForcado(arvoreSemImagem, semImagem);
    assert.ok(!htmlSemImagem.includes("<img"));
    assert.ok(htmlSemImagem.includes("g-pessoa"));
  });

  it("pessoa de organização (reino.pessoas) com personagem com imageUrl também mostra Retrato", () => {
    const characters = [{ id: "p1", name: "Conselheira", imageUrl: "retratos/p1.jpg" }];
    const kingdoms = [{
      id: "r1", name: "R1", cities: [],
      pessoas: { estrutura: { titulo: "Conselho", grupos: [{ id: "g", nome: "Conselho", membros: [{ personagemId: "p1", cargo: "Membro", ordem: 0 }] }] }, relacoes: [], genealogias: [] },
    }];
    const arvore = montarArvoreMundo({ kingdoms, gods: [], characters, sagas: [], grupos: [], gm: true });
    const html = renderForcado(arvore, characters);
    assert.ok(html.includes("<img"));
    assert.ok(html.includes("Conselheira"));
  });

  it("cidade em esboço e cidade sem texto renderizam as etiquetas certas", () => {
    const kingdoms = [{
      id: "r1", name: "R1",
      cities: [
        { id: "c1", name: "Esboço", resumo: "tem texto", documentada: false },
        { id: "c2", name: "Vazia", resumo: "" },
        { id: "c3", name: "Capital aqui", resumo: "ok", capital: true },
      ],
    }];
    const arvore = montarArvoreMundo({ kingdoms, gods: [], characters: [], sagas: [], grupos: [], gm: true });
    const html = renderForcado(arvore);
    assert.ok(html.includes("Esboço"));
    assert.ok(html.includes("Sem texto"));
    assert.ok(html.includes("Capital"));
  });

  it("ArvoreMundoView com seeds reais, forçando a busca a abrir tudo (termo vazio no clique de uma cidade) — sem lançar", () => {
    // Sanity extra: reconstrói a mesma árvore que o componente montaria e
    // confirma, via NoArvoreMundo forçado, que ela é totalmente renderizável
    // de ponta a ponta com o dado de verdade do app (não só com fixtures
    // pequenas feitas à mão).
    const arvore = montarArvoreMundo({ kingdoms: SEED_KINGDOMS, gods: SEED_GODS, characters: SEED_CHARACTERS, sagas: SEED_SAGAS, grupos: GRUPOS, gm: true });
    assert.doesNotThrow(() => renderForcado(arvore, SEED_CHARACTERS));
  });
});

describe("WorldView — sub-aba Árvore (toggle Mapa/Árvore, formulários de montagem do encontro não afetados)", () => {
  it("renderiza com visão Mapa por padrão, sem lançar, GM e Jogador", () => {
    for (const gm of [true, false]) {
      assert.doesNotThrow(() => renderToStaticMarkup(
        React.createElement(WorldView, {
          kingdoms: SEED_KINGDOMS, setKingdoms: () => {}, askConfirm: () => {}, gm,
          characters: SEED_CHARACTERS,
          cidadesOverrides: {}, setCidadesOverrides: () => {},
          pessoasOverrides: {}, setPessoasOverrides: () => {},
          npcsOverrides: {}, onEditarCampoNpc: () => {}, onRestaurarCampoNpc: () => {},
          onAbrirFicha: () => {}, rotas: [], setRotas: () => {},
          gods: SEED_GODS, sagas: SEED_SAGAS, onAbrirDeuses: () => {}, onAbrirSagas: () => {},
        })
      ), `gm=${gm}`);
    }
  });

  it("mostra o botão da sub-aba Árvore", () => {
    const html = renderToStaticMarkup(
      React.createElement(WorldView, {
        kingdoms: SEED_KINGDOMS, setKingdoms: () => {}, askConfirm: () => {}, gm: true,
        characters: SEED_CHARACTERS,
        cidadesOverrides: {}, setCidadesOverrides: () => {},
        pessoasOverrides: {}, setPessoasOverrides: () => {},
        npcsOverrides: {}, onEditarCampoNpc: () => {}, onRestaurarCampoNpc: () => {},
        onAbrirFicha: () => {}, rotas: [], setRotas: () => {},
        gods: SEED_GODS, sagas: SEED_SAGAS, onAbrirDeuses: () => {}, onAbrirSagas: () => {},
      })
    );
    assert.ok(html.includes("Árvore"));
    assert.ok(html.includes("Mapa"));
  });

  it("sem kingdoms/gods/sagas (undefined) não lança", () => {
    assert.doesNotThrow(() => renderToStaticMarkup(
      React.createElement(WorldView, {
        kingdoms: [], setKingdoms: () => {}, askConfirm: () => {}, gm: true,
        characters: [],
        cidadesOverrides: {}, setCidadesOverrides: () => {},
        pessoasOverrides: {}, setPessoasOverrides: () => {},
        npcsOverrides: {}, onEditarCampoNpc: () => {}, onRestaurarCampoNpc: () => {},
        onAbrirFicha: () => {}, rotas: [], setRotas: () => {},
      })
    ));
  });
});
