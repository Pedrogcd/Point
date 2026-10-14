// Testes de npcOverrides.js — mesmo padrão de cidadeOverrides.test.js.
// Roda com `node --test` (Node >=20, nativo) ou `npm test`.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CAMPOS_MESCLAVEIS_NPC, mesclarNpcComOverride } from "./npcOverrides.js";

const NPC_ORIGINAL = {
  id: "frontier_veyla",
  nome: "Irmã Veyla",
  papel: "Sacerdotisa da catedral",
  grupo: "gov",
  img: null,
  reino: "katalao",
  cidade: "frontier",
  kv: { Raça: "Humana, mana fluida", Deus: "Dragoalma" },
  texto: "As orações de passagem pararam de funcionar...",
  gm: { segredo: "É a ponte para a missão de Dragoalma.", ganchos: ["Pede a forasteiros..."] },
};

describe("npcOverrides — mesclarNpcComOverride", () => {
  it("sem override (undefined/null), devolve o original intacto", () => {
    assert.deepEqual(mesclarNpcComOverride(NPC_ORIGINAL, undefined), NPC_ORIGINAL);
    assert.deepEqual(mesclarNpcComOverride(NPC_ORIGINAL, null), NPC_ORIGINAL);
  });

  it("npc nulo/ausente devolve ele mesmo (não quebra)", () => {
    assert.equal(mesclarNpcComOverride(null, { nome: "X" }), null);
    assert.equal(mesclarNpcComOverride(undefined, { nome: "X" }), undefined);
  });

  it("override de um campo só muda esse campo, preserva o resto", () => {
    const mesclado = mesclarNpcComOverride(NPC_ORIGINAL, { nome: "Irmã Veyla (revisada)" });
    assert.equal(mesclado.nome, "Irmã Veyla (revisada)");
    assert.equal(mesclado.papel, NPC_ORIGINAL.papel);
    assert.deepEqual(mesclado.gm, NPC_ORIGINAL.gm);
  });

  it("override de img (upload de retrato)", () => {
    const mesclado = mesclarNpcComOverride(NPC_ORIGINAL, { img: "mundo/npcs/veyla.jpg" });
    assert.equal(mesclado.img, "mundo/npcs/veyla.jpg");
  });

  it("override de gm substitui o sub-objeto inteiro (segredo/ganchos), não mescla item a item", () => {
    const mesclado = mesclarNpcComOverride(NPC_ORIGINAL, { gm: { segredo: "Segredo novo", ganchos: [] } });
    assert.deepEqual(mesclado.gm, { segredo: "Segredo novo", ganchos: [] });
  });

  it("campo fora de CAMPOS_MESCLAVEIS_NPC no override é ignorado", () => {
    const mesclado = mesclarNpcComOverride(NPC_ORIGINAL, { id: "outro_id", reino: "goethia" });
    assert.equal(mesclado.id, NPC_ORIGINAL.id);
    assert.equal(mesclado.reino, NPC_ORIGINAL.reino);
  });

  it("override com formato inválido (string, array) é tratado como vazio, não quebra", () => {
    assert.deepEqual(mesclarNpcComOverride(NPC_ORIGINAL, "x"), NPC_ORIGINAL);
    assert.deepEqual(mesclarNpcComOverride(NPC_ORIGINAL, []), NPC_ORIGINAL);
  });

  it("CAMPOS_MESCLAVEIS_NPC cobre exatamente os campos editáveis esperados", () => {
    assert.deepEqual([...CAMPOS_MESCLAVEIS_NPC].sort(), ["gm", "img", "nome", "papel", "texto"]);
  });
});
