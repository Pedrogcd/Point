// Testes de cidadeOverrides.js — merge original+override, idempotência de
// "restaurar" (apagar a chave devolve o original) e normalização de item de
// lista pro formulário de edição. Roda com `node --test` ou `npm test`.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mesclarCidadeComOverride, normalizarItemLista, paraItemLista, CAMPOS_MESCLAVEIS } from "./cidadeOverrides.js";

function cidadeDeExemplo() {
  return {
    id: "frontier", nome: "Frontier", subtitulo: "A cidade sem lugar para quem chega",
    conceito: { pub: "<p>Original.</p>" },
    ficha: [["Onde", "Nordeste de Katalão"]],
    chegada: [["As torres", "Texto original."]],
    estetica: ["Aldeia europeia antiga"],
    medos: [{ pub: "Medo original." }],
    forcas: [{ titulo: "Força", pub: "x" }], // campo não mesclável — nunca deve mudar
  };
}

describe("mesclarCidadeComOverride", () => {
  it("sem override, devolve a cidade original intacta", () => {
    const original = cidadeDeExemplo();
    const mesclada = mesclarCidadeComOverride(original, {});
    assert.deepEqual(mesclada, original);
  });

  it("sem override (undefined/null), ainda funciona", () => {
    const original = cidadeDeExemplo();
    assert.deepEqual(mesclarCidadeComOverride(original, undefined), original);
    assert.deepEqual(mesclarCidadeComOverride(original, null), original);
  });

  it("campo com override substitui o original por inteiro", () => {
    const original = cidadeDeExemplo();
    const mesclada = mesclarCidadeComOverride(original, { subtitulo: "Novo subtítulo" });
    assert.equal(mesclada.subtitulo, "Novo subtítulo");
  });

  it("campo sem override permanece com o valor original (não sobrescreve por engano)", () => {
    const original = cidadeDeExemplo();
    const mesclada = mesclarCidadeComOverride(original, { subtitulo: "Novo" });
    assert.deepEqual(mesclada.conceito, original.conceito);
    assert.deepEqual(mesclada.ficha, original.ficha);
  });

  it("restaurar original = apagar a chave do override -> volta exatamente ao original", () => {
    const original = cidadeDeExemplo();
    const comOverride = { subtitulo: "Editado" };
    const mescladaEditada = mesclarCidadeComOverride(original, comOverride);
    assert.equal(mescladaEditada.subtitulo, "Editado");
    const { subtitulo, ...semSubtitulo } = comOverride; // simula "restaurar": apaga a chave
    const mescladaRestaurada = mesclarCidadeComOverride(original, semSubtitulo);
    assert.equal(mescladaRestaurada.subtitulo, original.subtitulo);
    assert.deepEqual(mescladaRestaurada, original);
  });

  it("campos não mesclaváveis (forcas, distritos, mapaSvg, termos, gm) nunca são tocados pelo override", () => {
    const original = cidadeDeExemplo();
    const override = { subtitulo: "x", ficha: [["Y", "Z"]], forcas: [{ titulo: "Ignorado" }] };
    const mesclada = mesclarCidadeComOverride(original, override);
    // "forcas" não está em CAMPOS_MESCLAVEIS — mesmo vindo no objeto de override, é ignorado.
    assert.deepEqual(mesclada.forcas, original.forcas);
    assert.ok(!CAMPOS_MESCLAVEIS.includes("forcas"));
  });

  it("todos os campos mescláveis substituem quando presentes no override", () => {
    const original = cidadeDeExemplo();
    const override = {
      subtitulo: "s", conceito: { pub: "c" }, ficha: [["a", "b"]],
      chegada: [["t", "d"]], estetica: ["e"], medos: [{ pub: "m" }],
    };
    const mesclada = mesclarCidadeComOverride(original, override);
    for (const campo of CAMPOS_MESCLAVEIS) assert.deepEqual(mesclada[campo], override[campo]);
  });

  it("cidade original ausente (removida/null) não quebra, devolve null/undefined", () => {
    assert.equal(mesclarCidadeComOverride(null, { subtitulo: "x" }), null);
    assert.equal(mesclarCidadeComOverride(undefined, { subtitulo: "x" }), undefined);
  });
});

describe("normalizarItemLista / paraItemLista — ida e volta", () => {
  it("string simples -> visível, sem segredo", () => {
    assert.deepEqual(normalizarItemLista("Aldeia europeia"), { texto: "Aldeia europeia", soMestre: false });
  });

  it("{pub} -> visível, mesmo tendo um gm junto (prioriza pub)", () => {
    assert.deepEqual(normalizarItemLista({ pub: "público", gm: "segredo" }), { texto: "público", soMestre: false });
  });

  it("{gm} sem pub -> só mestre", () => {
    assert.deepEqual(normalizarItemLista({ gm: "só mestre sabe" }), { texto: "só mestre sabe", soMestre: true });
  });

  it("item vazio/nulo não quebra", () => {
    assert.deepEqual(normalizarItemLista(null), { texto: "", soMestre: false });
    assert.deepEqual(normalizarItemLista(undefined), { texto: "", soMestre: false });
    assert.deepEqual(normalizarItemLista({}), { texto: "", soMestre: false });
  });

  it("paraItemLista(soMestre: false) produz {pub}", () => {
    assert.deepEqual(paraItemLista({ texto: "visível a todos", soMestre: false }), { pub: "visível a todos" });
  });

  it("paraItemLista(soMestre: true) produz {gm}, sem pub", () => {
    const item = paraItemLista({ texto: "segredo", soMestre: true });
    assert.deepEqual(item, { gm: "segredo" });
    assert.equal("pub" in item, false);
  });

  it("ida e volta (normalizar -> paraItemLista) preserva texto e segredo", () => {
    for (const original of ["texto simples", { pub: "p" }, { gm: "g" }]) {
      const normalizado = normalizarItemLista(original);
      const devolta = paraItemLista(normalizado);
      assert.deepEqual(normalizarItemLista(devolta), normalizado);
    }
  });
});
