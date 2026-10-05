// Testes de render dos componentes da aba "Pessoas" (point-amaranth-app.jsx):
// card de membro (clicável com ficha, cinza "dossiê pendente" sem ficha),
// chip de relação e a árvore genealógica em SVG — mais a varredura de que
// todo personagemId usado em DADOS_PESSOAS_SUTH existe de verdade em
// SEED_CHARACTERS.
// Roda com `node --test` (Node >=20, nativo) ou `npm test`.

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadAppModule } from "./renderTestUtils.js";

let CardMembroReino, LinhaRelacao, ArvoreGenealogica, SEED_CHARACTERS, DADOS_PESSOAS_SUTH, DADOS_PESSOAS_GOETHIA;

before(async () => {
  const mod = await loadAppModule();
  CardMembroReino = mod.CardMembroReino;
  LinhaRelacao = mod.LinhaRelacao;
  ArvoreGenealogica = mod.ArvoreGenealogica;
  SEED_CHARACTERS = mod.SEED_CHARACTERS;
  DADOS_PESSOAS_SUTH = mod.DADOS_PESSOAS_SUTH;
  DADOS_PESSOAS_GOETHIA = mod.DADOS_PESSOAS_GOETHIA;
});

describe("CardMembroReino", () => {
  it("membro com ficha renderiza como <button> clicável", () => {
    const personagem = { id: "suth_emphes", name: "Emphes Alpha", epithet: "A Sombra Escarlate", imageUrl: "" };
    const html = renderToStaticMarkup(React.createElement(CardMembroReino, { membro: { personagemId: "suth_emphes", personagem, cargo: "Imperadora" }, onAbrirFicha: () => {} }));
    assert.ok(html.includes("<button"), "card com ficha deveria ser um <button>");
    assert.ok(html.includes("Emphes Alpha"));
    assert.ok(html.includes("Imperadora"));
  });

  it("membro sem ficha (nomeLivre) NÃO é clicável — cai no card cinza 'dossiê pendente'", () => {
    const html = renderToStaticMarkup(React.createElement(CardMembroReino, { membro: { nomeLivre: "Hujimo Bunis", cargo: "Especialista", nota: "Dossiê pendente" }, onAbrirFicha: () => {} }));
    assert.ok(!html.includes("<button"), "card sem ficha não deveria ser um <button>");
    assert.ok(html.includes("Hujimo Bunis"));
    assert.ok(html.includes("Dossiê pendente"));
  });

  it("membro com personagemId mas ficha apagada (personagem: null) também cai no card cinza, não lança", () => {
    assert.doesNotThrow(() => renderToStaticMarkup(React.createElement(CardMembroReino, { membro: { personagemId: "sumiu", personagem: null, cargo: "X" }, onAbrirFicha: () => {} })));
  });
});

describe("LinhaRelacao", () => {
  it("renderiza os dois chips e o rótulo do tipo de relação", () => {
    const characters = [{ id: "a", name: "Pessoa A" }, { id: "b", name: "Pessoa B" }];
    const html = renderToStaticMarkup(React.createElement(LinhaRelacao, { relacao: { de: "a", para: "b", tipo: "mentoria", rotulo: "ensinou tudo" }, characters, onAbrirFicha: () => {} }));
    assert.ok(html.includes("Pessoa A"));
    assert.ok(html.includes("Pessoa B"));
    assert.ok(html.includes("Mentoria"));
    assert.ok(html.includes("ensinou tudo"));
  });

  it("chip de personagem inexistente aparece desabilitado (disabled), não lança", () => {
    const html = renderToStaticMarkup(React.createElement(LinhaRelacao, { relacao: { de: "fantasma", para: "b", tipo: "hierarquia" }, characters: [{ id: "b", name: "B" }], onAbrirFicha: () => {} }));
    assert.ok(html.includes("disabled"));
  });
});

describe("ArvoreGenealogica", () => {
  const genealogia = {
    id: "g1", titulo: "Teste",
    nos: [{ id: "mae", personagemId: "a" }, { id: "filho", personagemId: "b" }, { id: "sobrinho", nome: "Sem ficha" }],
    ligacoes: [
      { pais: ["mae"], filho: "filho", tipo: "mãe e filho" },
      { pais: ["mae"], filho: "sobrinho", tipo: "tia e sobrinho", tracejado: true },
    ],
  };
  const characters = [{ id: "a", name: "Mãe" }, { id: "b", name: "Filho" }];

  it("renderiza um <svg> com um <foreignObject> por nó", () => {
    const html = renderToStaticMarkup(React.createElement(ArvoreGenealogica, { genealogia, characters, onAbrirFicha: () => {} }));
    assert.ok(html.includes("<svg"));
    assert.equal((html.match(/foreignObject/g) || []).length, genealogia.nos.length * 2); // abre+fecha cada um
  });

  it("ligação tracejada usa stroke-dasharray; ligação normal não", () => {
    const html = renderToStaticMarkup(React.createElement(ArvoreGenealogica, { genealogia, characters, onAbrirFicha: () => {} }));
    assert.ok(html.includes("stroke-dasharray"));
  });

  it("nó sem ficha (nome livre) aparece sem lançar, sem link", () => {
    assert.doesNotThrow(() => renderToStaticMarkup(React.createElement(ArvoreGenealogica, { genealogia, characters, onAbrirFicha: () => {} })));
  });

  it("genealogia vazia (nos/ligacoes ausentes) não lança", () => {
    assert.doesNotThrow(() => renderToStaticMarkup(React.createElement(ArvoreGenealogica, { genealogia: { id: "vazia", titulo: "Vazia" }, characters: [], onAbrirFicha: () => {} })));
  });
});

function idsReferenciados(dadosPessoas) {
  const referenciados = new Set();
  for (const grupo of dadosPessoas.estrutura.grupos) {
    for (const m of grupo.membros) if (m.personagemId) referenciados.add(m.personagemId);
  }
  for (const r of dadosPessoas.relacoes) { referenciados.add(r.de); referenciados.add(r.para); }
  for (const gen of dadosPessoas.genealogias) {
    for (const n of gen.nos) if (n.personagemId) referenciados.add(n.personagemId);
  }
  return referenciados;
}

describe("Varredura de ids — DADOS_PESSOAS_SUTH x SEED_CHARACTERS", () => {
  it("todo personagemId referenciado em estrutura/relacoes/genealogias existe em SEED_CHARACTERS", () => {
    const idsConhecidos = new Set(SEED_CHARACTERS.map((c) => c.id));
    const referenciados = idsReferenciados(DADOS_PESSOAS_SUTH);
    assert.ok(referenciados.size > 0, "deveria haver pelo menos um id referenciado");
    for (const id of referenciados) {
      assert.ok(idsConhecidos.has(id), `personagemId "${id}" referenciado em DADOS_PESSOAS_SUTH não existe em SEED_CHARACTERS`);
    }
  });
});

describe("Varredura de ids — DADOS_PESSOAS_GOETHIA x SEED_CHARACTERS", () => {
  it("todo personagemId referenciado em estrutura/relacoes/genealogias existe em SEED_CHARACTERS", () => {
    const idsConhecidos = new Set(SEED_CHARACTERS.map((c) => c.id));
    const referenciados = idsReferenciados(DADOS_PESSOAS_GOETHIA);
    assert.ok(referenciados.size > 0, "deveria haver pelo menos um id referenciado");
    for (const id of referenciados) {
      assert.ok(idsConhecidos.has(id), `personagemId "${id}" referenciado em DADOS_PESSOAS_GOETHIA não existe em SEED_CHARACTERS`);
    }
  });

  it("inclui referências cross-reino (Erin do Grupo C, Kiryu, Fate, Emphes Alpha de Suth)", () => {
    const referenciados = idsReferenciados(DADOS_PESSOAS_GOETHIA);
    for (const id of ["erin", "kiryu", "fate", "suth_emphes"]) {
      assert.ok(referenciados.has(id), `esperava encontrar a referência cross-reino "${id}"`);
    }
  });
});
