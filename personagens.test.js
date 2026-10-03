// Testes da migração de personagens (ver personagens.js) — extraída do bloco
// que antes vivia só dentro do useEffect de carregamento em
// point-amaranth-app.jsx, pra poder ser testada isolada e reutilizada também
// na importação de backup (ver normalizar.test.js).
// Roda com `node --test` (Node >=20, nativo, sem dependências) ou `npm test`.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { migrarPersonagem, migrarPersonagens } from "./personagens.js";

describe("migrarPersonagem", () => {
  it("ficha salva antes do campo `abilities` existir ganha array vazio, não undefined", () => {
    const ch = { id: "sp_leon", name: "Leon Winters" };
    const migrado = migrarPersonagem(ch);
    assert.deepEqual(migrado.abilities, []);
  });

  it("preserva `abilities` já preenchido", () => {
    const abilities = [{ name: "Resumo de Poder", grade: "B", description: "..." }];
    const migrado = migrarPersonagem({ id: "x", name: "X", abilities });
    assert.deepEqual(migrado.abilities, abilities);
  });

  it("renomeia 'Soco' -> 'Ataque desarmado' e 'Mosquetão' -> 'Mosquete' (atualizando valores)", () => {
    const ch = {
      id: "x", name: "X",
      attacks: [{ nome: "Soco" }, { nome: "Mosquetão", acerto: "velho" }],
    };
    const migrado = migrarPersonagem(ch);
    const nomes = migrado.attacks.map((a) => a.nome);
    assert.ok(nomes.includes("Ataque desarmado"));
    assert.ok(nomes.includes("Mosquete"));
    const mosquete = migrado.attacks.find((a) => a.nome === "Mosquete");
    assert.notEqual(mosquete.acerto, "velho");
  });

  it("remove 'Chute' (redundante com Ataque desarmado)", () => {
    const migrado = migrarPersonagem({ id: "x", name: "X", attacks: [{ nome: "Chute" }] });
    assert.ok(!migrado.attacks.some((a) => a.nome === "Chute"));
  });

  it("ficha nova (sem attacks) recebe os 4 ataques padrão", () => {
    const migrado = migrarPersonagem({ id: "x", name: "X" });
    const nomes = migrado.attacks.map((a) => a.nome);
    assert.ok(nomes.length >= 4);
    assert.ok(nomes.includes("Ataque desarmado"));
  });

  it("ficha fechada (fichaFechada: true) não ganha ataques padrão repostos", () => {
    const migrado = migrarPersonagem({ id: "x", name: "X", fichaFechada: true, attacks: [] });
    assert.deepEqual(migrado.attacks, []);
  });

  it("Almah Mason não ganha 'Ataque desarmado' de volta (pedido específico)", () => {
    const migrado = migrarPersonagem({ id: "almah", name: "Almah Mason" });
    assert.ok(!migrado.attacks.some((a) => a.nome === "Ataque desarmado"));
  });

  it("corrige Defesa/Resistência Armadura no valor padrão antigo, não mexe em valor editado", () => {
    const padraoAntigo = migrarPersonagem({ id: "x", name: "X", statBase: { defesa: 0, resistArmadura: 7 } });
    assert.notEqual(padraoAntigo.statBase.defesa, 0);
    assert.notEqual(padraoAntigo.statBase.resistArmadura, 7);
    const editado = migrarPersonagem({ id: "x", name: "X", statBase: { defesa: 99, resistArmadura: 99 } });
    assert.equal(editado.statBase.defesa, 99);
    assert.equal(editado.statBase.resistArmadura, 99);
  });

  it("divide resistNatural (campo antigo único) em resistNaturalFisica/resistNaturalMagica", () => {
    const migrado = migrarPersonagem({ id: "x", name: "X", statBase: { resistNatural: 6 } });
    assert.equal("resistNatural" in migrado.statBase, false);
    assert.ok(typeof migrado.statBase.resistNaturalFisica === "number" || typeof migrado.statBase.resistNaturalFisica === "string");
    assert.equal(migrado.statBase.resistNaturalFisica, migrado.statBase.resistNaturalMagica);
  });

  it("adiciona 'Armadura física' em quem não tem nenhuma armadura cadastrada", () => {
    const migrado = migrarPersonagem({ id: "x", name: "X", itens: { usaveis: [], principais: [] } });
    assert.ok(migrado.itens.armadura.includes("Armadura física"));
  });

  it("não sobrescreve armadura já cadastrada", () => {
    const migrado = migrarPersonagem({ id: "x", name: "X", itens: { armadura: ["Cota de malha"] } });
    assert.deepEqual(migrado.itens.armadura, ["Cota de malha"]);
  });

  it("converte atributos do formato antigo (percepção/agilidade/...) pro novo", () => {
    const migrado = migrarPersonagem({
      id: "x", name: "X",
      attributes: { forca: "C", percepcao: "B", agilidade: "D", resistencia: "A", inteligencia: "E", determinacao: "C" },
    });
    assert.equal(migrado.attributes.destreza, "B");
    assert.equal(migrado.attributes.tecnica, "D");
    assert.equal(migrado.attributes.resistFisica, "A");
    assert.equal(migrado.attributes.resistMagica, "A");
    assert.equal(migrado.attributes.magia, "E");
    assert.equal(migrado.attributes.sorte, "C");
  });

  it("não mexe em atributos já no formato novo", () => {
    const attrs = { forca: "C", magia: "D", destreza: "B", tecnica: "D", sorte: "C", defesaAttr: "D", resistFisica: "A", resistMagica: "A" };
    const migrado = migrarPersonagem({ id: "x", name: "X", attributes: attrs });
    assert.deepEqual(migrado.attributes, attrs);
  });

  it("remove a proficiência 'briga' (eliminada do sistema)", () => {
    const migrado = migrarPersonagem({ id: "x", name: "X", proficiencias: { briga: "C", esquiva: "D" } });
    assert.equal("briga" in migrado.proficiencias, false);
    assert.equal(migrado.proficiencias.esquiva, "D");
  });

  it("preenche grupo/racialAbility/classes ausentes com defaults", () => {
    const migrado = migrarPersonagem({ id: "sp_leon", name: "Leon Winters" });
    assert.equal(migrado.grupo, "aurora"); // id "sp_" -> Grupo Aurora
    assert.deepEqual(migrado.racialAbility, { name: "", description: "" });
    assert.equal(migrado.classes.length, 2);
  });

  it("ficha sem hp/mp/sp (backup incompleto ou formato bem antigo) ganha defaults, não undefined", () => {
    const migrado = migrarPersonagem({ id: "x", name: "X" });
    assert.equal(typeof migrado.hp.max, "number");
    assert.equal(migrado.hp.current, migrado.hp.max);
    assert.deepEqual(migrado.mp, { current: 3, max: 3 });
    assert.equal(typeof migrado.sp.max, "number");
    assert.equal(migrado.sp.current, migrado.sp.max);
  });

  it("preserva hp/mp/sp já salvos, mesmo com HP atual reduzido (não reseta pra o máximo)", () => {
    const ch = { id: "x", name: "X", hp: { current: 1, max: 4 }, mp: { current: 0, max: 3 }, sp: { current: 2, max: 3 } };
    const migrado = migrarPersonagem(ch);
    assert.deepEqual(migrado.hp, { current: 1, max: 4 });
    assert.deepEqual(migrado.mp, { current: 0, max: 3 });
    assert.deepEqual(migrado.sp, { current: 2, max: 3 });
  });

  it("HP máximo default considera Vigor (atributosGerais) já migrado", () => {
    const altoVigor = migrarPersonagem({ id: "x", name: "X", atributosGerais: { vigor: "A" } });
    const baixoVigor = migrarPersonagem({ id: "y", name: "Y", atributosGerais: { vigor: "E" } });
    assert.ok(altoVigor.hp.max > baixoVigor.hp.max);
  });

  it("é idempotente: migrar duas vezes não muda o resultado", () => {
    const original = { id: "sp_leon", name: "Leon Winters", attacks: [{ nome: "Soco" }] };
    const uma = migrarPersonagem(original);
    const duas = migrarPersonagem(uma);
    assert.deepEqual(uma, duas);
  });
});

describe("migrarPersonagens", () => {
  it("migra uma lista inteira", () => {
    const migrados = migrarPersonagens([{ id: "a", name: "A" }, { id: "b", name: "B" }]);
    assert.equal(migrados.length, 2);
    assert.deepEqual(migrados[0].abilities, []);
    assert.deepEqual(migrados[1].abilities, []);
  });

  it("lista ausente/inválida vira array vazio, não quebra", () => {
    assert.deepEqual(migrarPersonagens(undefined), []);
    assert.deepEqual(migrarPersonagens(null), []);
  });
});
