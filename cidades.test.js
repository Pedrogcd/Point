// Testes do módulo cidades.js: reposição idempotente das cidades semente
// (ex: Frontier, em Katalão) em quem já tinha point-kingdoms salvo.
// Roda com `node --test` (Node >=20, nativo, sem dependências) ou `npm test`.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { reporCidadesSemente, idsCidadesSemente } from "./cidades.js";

const FRONTIER = {
  id: "frontier",
  name: "Frontier",
  description: "Cidade grande na fronteira nordeste, colada em Hoshon (Maxis).",
  link: "sidepoint/frontier.html",
};

const SEMENTES = [
  { id: "hetalion", name: "Hetalion", description: "", cities: [{ name: "Novolar", description: "Comunidade ningen." }] },
  { id: "katalao", name: "Katalão", description: "", cities: [FRONTIER] },
  { id: "maxis", name: "Maxis Power", description: "", cities: [] },
];

// point-kingdoms "salvo antes" de Frontier existir.
function reinosSalvos() {
  return [
    { id: "hetalion", name: "Hetalion", description: "Editada pelo usuário", cities: [{ name: "Novolar", description: "x" }] },
    { id: "katalao", name: "Katalão", description: "Katalão editado", cities: [{ name: "Capital", description: "y" }] },
    { id: "maxis", name: "Maxis Power", description: "", cities: [{ name: "Hoshon", description: "z" }] },
  ];
}

function katalao(reinos) {
  return reinos.find((k) => k.id === "katalao");
}

describe("idsCidadesSemente", () => {
  it("lista só as cidades semente com id", () => {
    assert.deepEqual(idsCidadesSemente(SEMENTES), ["frontier"]);
  });
});

describe("reporCidadesSemente", () => {
  it("adiciona Frontier em Katalão quando falta", () => {
    const out = reporCidadesSemente(reinosSalvos(), SEMENTES, []);
    const cidades = katalao(out).cities;
    assert.equal(cidades.length, 2);
    assert.equal(cidades[0].name, "Capital");
    assert.deepEqual(cidades[1], FRONTIER);
    assert.equal(katalao(out).description, "Katalão editado");
  });

  it("não duplica quando já existe pelo id", () => {
    const reinos = reinosSalvos();
    katalao(reinos).cities.push({ id: "frontier", name: "Frontier (renomeada)", description: "minha", link: "sidepoint/frontier.html" });
    const out = reporCidadesSemente(reinos, SEMENTES, []);
    assert.equal(out, reinos, "nada mudou → mesmo array");
    assert.equal(katalao(out).cities.length, 2);
  });

  it("não duplica quando existe pelo nome e completa id e link sem mexer na descrição", () => {
    const reinos = reinosSalvos();
    katalao(reinos).cities.push({ name: "frontier", description: "Descrição que o usuário escreveu" });
    const out = reporCidadesSemente(reinos, SEMENTES, []);
    const cidades = katalao(out).cities;
    assert.equal(cidades.length, 2);
    assert.deepEqual(cidades[1], {
      name: "frontier",
      description: "Descrição que o usuário escreveu",
      id: "frontier",
      link: "sidepoint/frontier.html",
    });
    // não muta a entrada
    assert.equal(katalao(reinos).cities[1].link, undefined);
  });

  it("respeita a lista de removidas", () => {
    const reinos = reinosSalvos();
    const out = reporCidadesSemente(reinos, SEMENTES, ["frontier"]);
    assert.equal(out, reinos);
    assert.equal(katalao(out).cities.length, 1);
  });

  it("lista de removidas inválida é tratada como vazia", () => {
    const out = reporCidadesSemente(reinosSalvos(), SEMENTES, null);
    assert.equal(katalao(out).cities.length, 2);
  });

  it("é idempotente: rodar duas vezes dá o mesmo resultado", () => {
    const uma = reporCidadesSemente(reinosSalvos(), SEMENTES, []);
    const duas = reporCidadesSemente(uma, SEMENTES, []);
    assert.equal(duas, uma);
    assert.deepEqual(duas, uma);

    const reinosNome = reinosSalvos();
    katalao(reinosNome).cities.push({ name: "Frontier", description: "d" });
    const a = reporCidadesSemente(reinosNome, SEMENTES, []);
    const b = reporCidadesSemente(a, SEMENTES, []);
    assert.equal(b, a);
  });

  it("não mexe em outros reinos", () => {
    const reinos = reinosSalvos();
    const out = reporCidadesSemente(reinos, SEMENTES, []);
    for (const id of ["hetalion", "maxis"]) {
      assert.equal(out.find((k) => k.id === id), reinos.find((k) => k.id === id));
    }
    // Novolar (semente sem id) não é reposta mesmo se faltar.
    const semNovolar = reinosSalvos();
    semNovolar[0].cities = [];
    const out2 = reporCidadesSemente(semNovolar, SEMENTES, []);
    assert.deepEqual(out2[0].cities, []);
  });

  it("não cria o reino se ele não existe nos dados salvos", () => {
    const reinos = reinosSalvos().filter((k) => k.id !== "katalao");
    const out = reporCidadesSemente(reinos, SEMENTES, []);
    assert.equal(out, reinos);
  });
});
