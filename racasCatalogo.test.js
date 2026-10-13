import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  listaRacas, encontrarRaca, encontrarPrincipal, encontrarSecundaria,
  descritoresDeSelecao, migrarSelecaoRacaLegado,
} from "./racasCatalogo.js";

describe("racasCatalogo — lookups", () => {
  it("lista as 6 raças do catálogo", () => {
    const racas = listaRacas();
    assert.equal(racas.length, 6);
    assert.deepEqual(racas.map((r) => r.id).sort(), ["dragonato", "elfo", "humano", "ningen", "niosh", "tengou"]);
  });

  it("encontrarRaca resolve por id e devolve null pra id desconhecido ou vazio", () => {
    assert.equal(encontrarRaca("humano").nome, "Humano");
    assert.equal(encontrarRaca("raposa"), null);
    assert.equal(encontrarRaca(null), null);
  });

  it("encontrarPrincipal resolve dentro da raça certa e não acha id de outra raça", () => {
    const niosh = encontrarRaca("niosh");
    assert.equal(encontrarPrincipal(niosh, "descendentes-de-sharkan").nome, "Descendentes de Sharkan");
    assert.equal(encontrarPrincipal(niosh, "leonino"), null); // é da raça ningen, não niosh
    assert.equal(encontrarPrincipal(null, "leonino"), null);
  });

  it("encontrarSecundaria resolve dentro da raça certa; Humano não tem nenhuma (usa Disciplina)", () => {
    const ningen = encontrarRaca("ningen");
    assert.equal(encontrarSecundaria(ningen, "transformacao").nome, "Transformação");
    const humano = encontrarRaca("humano");
    assert.equal(humano.secundarias.length, 0);
    assert.equal(humano.secundariaEhDisciplina, true);
  });
});

describe("racasCatalogo — descritoresDeSelecao", () => {
  it("soma descritores de principal + secundária sem duplicar", () => {
    const dragonato = encontrarRaca("dragonato");
    const principal = encontrarPrincipal(dragonato, "texoni"); // descritores: ["blindado"]
    const resultado = descritoresDeSelecao(principal, null);
    assert.deepEqual(resultado, ["blindado"]);
  });

  it("dedupe quando duas entradas dão o mesmo descritor", () => {
    const ningen = encontrarRaca("ningen");
    const principal = encontrarPrincipal(ningen, "reptiliano"); // descritores: ["blindado"]
    const secundaria = encontrarSecundaria(encontrarRaca("niosh"), "pele-grossa"); // descritores: ["blindado"]
    const resultado = descritoresDeSelecao(principal, secundaria);
    assert.deepEqual(resultado, ["blindado"]);
  });

  it("entradas null/undefined não quebram e não entram no resultado", () => {
    assert.deepEqual(descritoresDeSelecao(null, undefined), []);
  });

  it("habilidade sem descritor não adiciona nada", () => {
    const humano = encontrarRaca("humano");
    const manaFluida = encontrarPrincipal(humano, "mana-fluida"); // descritores: []
    assert.deepEqual(descritoresDeSelecao(manaFluida), []);
  });
});

describe("racasCatalogo — migrarSelecaoRacaLegado", () => {
  it("ficha sem nenhum dos dois esquemas (ex.: a Leona) fica toda null, sem inventar nada", () => {
    const leona = { id: "leona", name: "Leona", race: "Ningen Leonino" };
    const migrado = migrarSelecaoRacaLegado(leona);
    assert.deepEqual(migrado, { raca: null, habilidadePrincipal: null, habilidadeSecundaria: null, disciplinaHumano: null, descritores: [] });
  });

  it("esquema novo já presente (mesmo com valores null) não é tocado", () => {
    const ch = { raca: "humano", habilidadePrincipal: "mana-concentrada", habilidadeSecundaria: null, disciplinaHumano: { nome: "Alquimia", grau: "D" }, descritores: [] };
    assert.deepEqual(migrarSelecaoRacaLegado(ch), ch);
  });

  it("remapeia racaId/habilidadePrincipalId do esquema antigo pro novo", () => {
    const ch = { racaId: "niosh", habilidadePrincipalId: "sharkan", habilidadeSecundariaId: "pele_grossa" };
    const migrado = migrarSelecaoRacaLegado(ch);
    assert.equal(migrado.raca, "niosh");
    assert.equal(migrado.habilidadePrincipal, "descendentes-de-sharkan");
    assert.equal(migrado.habilidadeSecundaria, null); // sem de-para seguro, não migra
    assert.equal(migrado.disciplinaHumano, null);
    assert.deepEqual(migrado.descritores, []);
  });

  it("racaId antigo sem habilidadePrincipalId migra só a raça", () => {
    const migrado = migrarSelecaoRacaLegado({ racaId: "elfo" });
    assert.equal(migrado.raca, "elfo");
    assert.equal(migrado.habilidadePrincipal, null);
  });

  it("habilidadePrincipalId antigo com id que não existe no remapeamento vira null (não quebra)", () => {
    const migrado = migrarSelecaoRacaLegado({ racaId: "humano", habilidadePrincipalId: "id-inventado" });
    assert.equal(migrado.habilidadePrincipal, null);
  });

  it("é idempotente: migrar duas vezes dá o mesmo resultado", () => {
    const ch = { racaId: "dragonato", habilidadePrincipalId: "texoni" };
    const uma = migrarSelecaoRacaLegado(ch);
    const duas = migrarSelecaoRacaLegado(uma);
    assert.deepEqual(uma, duas);
  });
});
