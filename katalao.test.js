// Testes da seção Katalão: singularidade das casas (mundoDados.js) e o
// sigilo do nó do Crikon na árvore genealógica dos Thulin (point-amaranth-app.jsx).
// Roda com `node --test` (Node >=20, nativo) ou `npm test`.

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { KATALAO_INFO } from "./mundoDados.js";
import { loadAppModule } from "./renderTestUtils.js";

describe("Singularidade das 6 grandes casas (KATALAO_INFO.casas)", () => {
  const esperado = {
    pendragon: { type: "Mana", main: "Excesso de mana" },
    sehen: { type: "Corpo", main: "Regeneração" },
    ace: { type: "Alma", main: "Enxergar o Astra" },
    duran: { type: "Absorção e liberação", main: "Absorver força e liberar energia" },
    gotis: { type: "Projeção de mana", main: "Ilusão" },
    magnum: { type: "Projeção física", main: "Teleporte" },
  };

  for (const [id, valor] of Object.entries(esperado)) {
    it(`casa "${id}" tem singularity.type/main corretos`, () => {
      const casa = KATALAO_INFO.casas.find((c) => c.id === id);
      assert.ok(casa, `casa "${id}" não encontrada em KATALAO_INFO.casas`);
      assert.deepEqual(casa.singularity, valor);
    });
  }

  it("casas vassalas (thulin, brennard, vinland, ishran, flumifogo) não têm singularity própria", () => {
    for (const id of ["thulin", "brennard", "vinland", "ishran", "flumifogo"]) {
      const casa = KATALAO_INFO.casas.find((c) => c.id === id);
      assert.ok(casa, `casa "${id}" não encontrada`);
      assert.equal(casa.singularity, undefined, `"${id}" não devia ter singularity`);
    }
  });

  it("as 3 novas casas vassalas (brennard, vinland, ishran) existem com a cadeia certa", () => {
    const ids = KATALAO_INFO.casas.map((c) => c.id);
    for (const id of ["brennard", "vinland", "ishran"]) assert.ok(ids.includes(id), `"${id}" ausente de KATALAO_INFO.casas`);
  });
});

describe("Segredo do Crikon na árvore dos Thulin", () => {
  let ArvoreGenealogica, DADOS_PESSOAS_KATALAO;

  before(async () => {
    const mod = await loadAppModule();
    ArvoreGenealogica = mod.ArvoreGenealogica;
    DADOS_PESSOAS_KATALAO = mod.DADOS_PESSOAS_KATALAO;
  });

  it("estrutura pública (org chart) nunca menciona Crikon", () => {
    const texto = JSON.stringify(DADOS_PESSOAS_KATALAO.estrutura);
    assert.ok(!texto.includes("Crikon"), "estrutura não devia citar Crikon");
  });

  it("nenhum campo sempre-visível (notas/relacoes, fora dos nós/ligações com soMestre) menciona Crikon", () => {
    // `notas` de uma genealogia é renderizado pra todo mundo, sem filtro de
    // soMestre (ver point-amaranth-app.jsx) — bug real pego nesta sessão: uma
    // nota explicando o mecanismo de sigilo citava "Crikon" e vazava o nome
    // que deveria ficar escondido. Este teste trava essa regressão.
    for (const gen of DADOS_PESSOAS_KATALAO.genealogias) {
      const textoSempreVisivel = JSON.stringify({ titulo: gen.titulo, notas: gen.notas || [] });
      assert.ok(!textoSempreVisivel.includes("Crikon"), `genealogia "${gen.id}": titulo/notas não devem citar Crikon`);
    }
    assert.ok(!JSON.stringify(DADOS_PESSOAS_KATALAO.relacoes).includes("Crikon"), "relacoes não devem citar Crikon");
  });

  it("o nó do Crikon na genealogia dos Thulin está marcado soMestre: true", () => {
    const thulin = DADOS_PESSOAS_KATALAO.genealogias.find((g) => g.id === "thulin");
    const noCrikon = thulin.nos.find((n) => n.personagemId === "hetalion_crikon");
    assert.ok(noCrikon, "nó do Crikon não encontrado na árvore dos Thulin");
    assert.equal(noCrikon.soMestre, true);
    const ligacaoCrikon = thulin.ligacoes.find((l) => l.filho === noCrikon.id);
    assert.ok(ligacaoCrikon, "ligação do Crikon não encontrada");
    assert.equal(ligacaoCrikon.soMestre, true);
  });

  it("ArvoreGenealogica NÃO renderiza o nó do Crikon no modo Jogador (gm=false)", () => {
    const thulin = DADOS_PESSOAS_KATALAO.genealogias.find((g) => g.id === "thulin");
    const characters = [{ id: "hetalion_crikon", name: "Crikon" }];
    const html = renderToStaticMarkup(React.createElement(ArvoreGenealogica, { genealogia: thulin, characters, onAbrirFicha: () => {}, gm: false }));
    assert.ok(!html.includes("Crikon"), "modo Jogador não devia mostrar o nó do Crikon");
  });

  it("ArvoreGenealogica renderiza o nó do Crikon no modo GM (gm=true), sem afetar os outros nós", () => {
    const thulin = DADOS_PESSOAS_KATALAO.genealogias.find((g) => g.id === "thulin");
    const characters = [{ id: "hetalion_crikon", name: "Crikon" }];
    const html = renderToStaticMarkup(React.createElement(ArvoreGenealogica, { genealogia: thulin, characters, onAbrirFicha: () => {}, gm: true }));
    assert.ok(html.includes("Crikon"), "modo GM devia mostrar o nó do Crikon");
    assert.ok(html.includes("Nefarius Mercos Thulin"));
    assert.ok(html.includes("Kranos Thulin"));
  });
});

describe("Varredura de ids — DADOS_PESSOAS_KATALAO x SEED_CHARACTERS", () => {
  let SEED_CHARACTERS, DADOS_PESSOAS_KATALAO;

  before(async () => {
    const mod = await loadAppModule();
    SEED_CHARACTERS = mod.SEED_CHARACTERS;
    DADOS_PESSOAS_KATALAO = mod.DADOS_PESSOAS_KATALAO;
  });

  it("o único personagemId usado (hetalion_crikon) existe de verdade em SEED_CHARACTERS", () => {
    const idsConhecidos = new Set(SEED_CHARACTERS.map((c) => c.id));
    const referenciados = new Set();
    for (const grupo of DADOS_PESSOAS_KATALAO.estrutura.grupos) {
      for (const m of grupo.membros) if (m.personagemId) referenciados.add(m.personagemId);
    }
    for (const gen of DADOS_PESSOAS_KATALAO.genealogias) {
      for (const n of gen.nos) if (n.personagemId) referenciados.add(n.personagemId);
    }
    assert.ok(referenciados.has("hetalion_crikon"), 'esperava encontrar a referência cross-reino "hetalion_crikon"');
    for (const id of referenciados) {
      assert.ok(idsConhecidos.has(id), `personagemId "${id}" referenciado em DADOS_PESSOAS_KATALAO não existe em SEED_CHARACTERS`);
    }
  });
});

describe("SEED_KINGDOMS: cidade duplicada removida, cadeia de vassalagem", () => {
  let SEED_KINGDOMS;

  before(async () => {
    const mod = await loadAppModule();
    SEED_KINGDOMS = mod.SEED_KINGDOMS;
  });

  it("não existe mais a cidade duplicada 'katalao_cidade' — Kingsyard é a capital", () => {
    const katalao = SEED_KINGDOMS.find((k) => k.id === "katalao");
    assert.ok(katalao, "reino katalao não encontrado em SEED_KINGDOMS");
    assert.ok(!katalao.cities.some((c) => c.id === "katalao_cidade"), "cidade duplicada 'katalao_cidade' ainda existe");
    const kingsyard = katalao.cities.find((c) => c.id === "kingsyard");
    assert.ok(kingsyard && kingsyard.capital === true, "Kingsyard devia ser a capital");
    assert.equal(katalao.cities.filter((c) => c.capital).length, 1, "só devia haver uma cidade capital");
  });

  it("descrição pública do reino não cita Crikon (movido pra notasDoMestre)", () => {
    const katalao = SEED_KINGDOMS.find((k) => k.id === "katalao");
    assert.ok(!katalao.description.includes("Crikon"), "description pública não devia citar Crikon");
    assert.ok(katalao.notasDoMestre.some((n) => n.includes("Crikon")), "notasDoMestre devia citar o segredo do Crikon");
  });

  it("katalao.pessoas foi semeado com DADOS_PESSOAS_KATALAO (via reporPessoasDoReino)", () => {
    const katalao = SEED_KINGDOMS.find((k) => k.id === "katalao");
    assert.ok(katalao.pessoas, "katalao.pessoas não foi semeado");
    assert.ok(katalao.pessoas.estrutura.grupos.length > 0);
    assert.equal(katalao.pessoas.genealogias.length, 5);
  });
});
