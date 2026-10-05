// Testes do módulo suth.js: atualização idempotente da ficha do Fate e
// preenchimento não destrutivo do reino Suth.
// Roda com `node --test` (Node >=20, nativo, sem dependências) ou `npm test`.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { aplicarFichaSuthDoFate, preencherReinoSuth } from "./suth.js";

const FICHA_NOVA_FATE = {
  id: "fate",
  grupo: "suth",
  imageUrl: "retratos-suth/fate.jpg",
  xp: 999,
  name: "Fate, A Indomável",
  epithet: "A Indomável · Próxima Santa de Suth",
  history: "História nova vinda do documento de Suth.",
};

describe("aplicarFichaSuthDoFate", () => {
  it("atualiza o conteúdo do Fate preservando id/grupo/imageUrl/xp existentes", () => {
    const existentes = [
      { id: "almah", name: "Almah Mason", grupo: "c" },
      { id: "fate", name: "Fate, A Indomável (ficha antiga)", epithet: "Próxima Santa de Suth", grupo: "c", imageUrl: "", xp: 0 },
    ];
    const resultado = aplicarFichaSuthDoFate(existentes, FICHA_NOVA_FATE);
    const fate = resultado.find((c) => c.id === "fate");
    assert.equal(fate.grupo, "c"); // NÃO reclassificado — fica no Grupo C
    assert.equal(fate.imageUrl, ""); // mantido o que já existia
    assert.equal(fate.xp, 0); // mantido o que já existia
    assert.equal(fate.history, "História nova vinda do documento de Suth."); // conteúdo atualizado
    assert.equal(fate.fichaSuthAplicada, true);
    // o resto da lista não é afetado
    assert.equal(resultado.find((c) => c.id === "almah").name, "Almah Mason");
  });

  it("preserva imageUrl/xp/grupo não vazios que o jogador já tinha configurado", () => {
    const existentes = [{ id: "fate", grupo: "c", imageUrl: "retratos/fate-customizado.jpg", xp: 42 }];
    const resultado = aplicarFichaSuthDoFate(existentes, FICHA_NOVA_FATE);
    const fate = resultado[0];
    assert.equal(fate.imageUrl, "retratos/fate-customizado.jpg");
    assert.equal(fate.xp, 42);
    assert.equal(fate.grupo, "c");
  });

  it("é idempotente: aplicar duas vezes não muda nada na segunda vez", () => {
    const existentes = [{ id: "fate", grupo: "c", imageUrl: "", xp: 0 }];
    const primeira = aplicarFichaSuthDoFate(existentes, FICHA_NOVA_FATE);
    const segunda = aplicarFichaSuthDoFate(primeira, FICHA_NOVA_FATE);
    assert.deepEqual(segunda, primeira);
  });

  it("não faz nada se o personagem com esse id não existir", () => {
    const existentes = [{ id: "almah", grupo: "c" }];
    const resultado = aplicarFichaSuthDoFate(existentes, FICHA_NOVA_FATE);
    assert.deepEqual(resultado, existentes);
  });
});

const DADOS_SUTH = {
  id: "suth",
  description: "Império matriarcal de castas e dogmas religiosos.",
  visaoGeral: "Texto de visão geral.",
  pilares: [{ id: "imperadora", nome: "Pilar da Imperadora" }],
  rebeliao: { titulo: "A Rebelião da Parteira", texto: "..." },
  economia: ["Item 1"],
  relacoes: [{ reino: "Goethia", tipo: "Rivalidade", texto: "..." }],
  glossario: [{ termo: "Guerreira/o", texto: "..." }],
  notasDoMestre: ["Nota 1"],
  cities: [{ id: "suth_holly", name: "Holly Suth" }],
};

describe("preencherReinoSuth", () => {
  it("preenche o reino só enquanto a descrição ainda contiver '[Rascunho'", () => {
    const reinos = [
      { id: "suth", name: "Suth", description: "Texto antigo. [Rascunho — refine comigo quando quiser.]", cities: [] },
      { id: "katalao", name: "Katalão", description: "Outro reino. [Rascunho]", cities: [] },
    ];
    const resultado = preencherReinoSuth(reinos, DADOS_SUTH);
    const suth = resultado.find((r) => r.id === "suth");
    assert.equal(suth.description, DADOS_SUTH.description);
    assert.equal(suth.visaoGeral, DADOS_SUTH.visaoGeral);
    assert.deepEqual(suth.pilares, DADOS_SUTH.pilares);
    assert.deepEqual(suth.rebeliao, DADOS_SUTH.rebeliao);
    assert.deepEqual(suth.economia, DADOS_SUTH.economia);
    assert.deepEqual(suth.relacoes, DADOS_SUTH.relacoes);
    assert.deepEqual(suth.glossario, DADOS_SUTH.glossario);
    assert.deepEqual(suth.notasDoMestre, DADOS_SUTH.notasDoMestre);
    // cities é ignorado de propósito (coberto por reporCidadesSemente)
    assert.deepEqual(suth.cities, []);
    // outro reino não é afetado
    assert.equal(resultado.find((r) => r.id === "katalao").visaoGeral, undefined);
  });

  it("não sobrescreve uma descrição já editada pelo GM (sem '[Rascunho')", () => {
    const reinos = [{ id: "suth", name: "Suth", description: "O Pedro já escreveu a descrição definitiva aqui.", cities: [] }];
    const resultado = preencherReinoSuth(reinos, DADOS_SUTH);
    assert.equal(resultado, reinos); // mesma referência: nada mudou
    assert.equal(resultado[0].visaoGeral, undefined);
  });

  it("é idempotente: preencher duas vezes não muda nada na segunda vez", () => {
    const reinos = [{ id: "suth", name: "Suth", description: "Texto antigo. [Rascunho]", cities: [] }];
    const primeira = preencherReinoSuth(reinos, DADOS_SUTH);
    const segunda = preencherReinoSuth(primeira, DADOS_SUTH);
    assert.equal(segunda, primeira); // mesma referência na segunda chamada
  });

  it("devolve a mesma referência quando o reino Suth não está na lista", () => {
    const reinos = [{ id: "katalao", description: "[Rascunho]", cities: [] }];
    const resultado = preencherReinoSuth(reinos, DADOS_SUTH);
    assert.equal(resultado, reinos);
  });
});
