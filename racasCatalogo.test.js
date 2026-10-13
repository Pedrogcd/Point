import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  listaRacas, encontrarRaca, encontrarPrincipal, encontrarSecundaria,
  descritoresDeSelecao, migrarSelecaoRacaLegado,
  CATALOGO_RACAS, BONUS_GRAU_POR_HABILIDADE, bonusGrauDoPersonagem, grauComBonus, comGrausEfetivos,
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
    const principal = encontrarPrincipal(ningen, "leonino"); // descritores: ["desarmado_letal"]
    const secundaria = encontrarSecundaria(ningen, "garras-e-presas"); // descritores: ["desarmado_letal", "ignora_blindado"]
    const resultado = descritoresDeSelecao(principal, secundaria);
    assert.deepEqual(resultado, ["desarmado_letal", "ignora_blindado"]);
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

// Checagem automática de deriva: toda habilidade (principal ou secundária, de
// qualquer raça) cujo `efeito` mencione "+1 grau" ou "+1 na proficiência"/
// "+1 nas proficiências" precisa estar em BONUS_GRAU_POR_HABILIDADE, e
// vice-versa — se o Pedro editar o catálogo de novo (mudar um efeito, trocar
// uma habilidade) e isso mexer em quem dá bônus de grau, o teste quebra aqui
// em vez de silenciosamente ficar desatualizado.
describe("racasCatalogo — BONUS_GRAU_POR_HABILIDADE cobre o catálogo inteiro", () => {
  const todasHabilidades = CATALOGO_RACAS.racas.flatMap((r) => [...r.principais, ...r.secundarias]);
  const mencionamBonusDeGrau = todasHabilidades.filter((h) => /\+1 grau|\+1 na proficiência|\+1 nas proficiências/.test(h.efeito));

  it("toda habilidade cujo efeito menciona bônus de grau está mapeada", () => {
    const faltando = mencionamBonusDeGrau.filter((h) => !BONUS_GRAU_POR_HABILIDADE[h.id]).map((h) => h.id);
    assert.deepEqual(faltando, [], `habilidades com "+1 grau"/"+1 na(s) proficiência(s)" no efeito mas sem entrada em BONUS_GRAU_POR_HABILIDADE: ${faltando.join(", ")}`);
  });

  it("todo id mapeado existe de verdade no catálogo e seu efeito realmente menciona bônus de grau", () => {
    const idsCatalogo = new Set(todasHabilidades.map((h) => h.id));
    const idsMencionam = new Set(mencionamBonusDeGrau.map((h) => h.id));
    for (const id of Object.keys(BONUS_GRAU_POR_HABILIDADE)) {
      assert.ok(idsCatalogo.has(id), `id mapeado "${id}" não existe mais no catálogo`);
      assert.ok(idsMencionam.has(id), `id mapeado "${id}" existe, mas o efeito dele não menciona mais bônus de grau`);
    }
  });

  it("cobertura esperada: 10 habilidades (7 principais + 3 secundárias — confirmado em 13/10)", () => {
    assert.equal(Object.keys(BONUS_GRAU_POR_HABILIDADE).length, 10);
  });
});

describe("racasCatalogo — grauComBonus", () => {
  it("soma passos normalmente abaixo do teto", () => {
    assert.equal(grauComBonus("E", 1), "D");
    assert.equal(grauComBonus("D", 1), "C");
  });

  it("não passa do teto C, mesmo com vários passos", () => {
    assert.equal(grauComBonus("E", 5), "C");
    assert.equal(grauComBonus("D", 2), "C");
  });

  it("grau já C ou acima não muda (nem sobe nem desce)", () => {
    assert.equal(grauComBonus("C", 1), "C");
    assert.equal(grauComBonus("B", 1), "B");
    assert.equal(grauComBonus("A", 1), "A");
  });

  it("sem passos (0/undefined), devolve o grau base", () => {
    assert.equal(grauComBonus("D", 0), "D");
    assert.equal(grauComBonus("D", undefined), "D");
  });

  it("grau base ausente conta como E", () => {
    assert.equal(grauComBonus(undefined, 1), "D");
  });
});

describe("racasCatalogo — bonusGrauDoPersonagem", () => {
  it("personagem sem raça escolhida não dá bônus nenhum", () => {
    assert.deepEqual(bonusGrauDoPersonagem({}), { proficiencias: {}, atributos: {} });
  });

  it("Leonino (ningen) dá +1 em Investigação", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "ningen", habilidadePrincipal: "leonino" });
    assert.deepEqual(bonus, { proficiencias: { investigacao: 1 }, atributos: {} });
  });

  it("Descendentes de Sharkan (niosh) dá +1 em Força — vem só do efeito, não do bonus[] do catálogo", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "niosh", habilidadePrincipal: "descendentes-de-sharkan" });
    assert.deepEqual(bonus, { proficiencias: {}, atributos: { forca: 1 } });
  });

  it("habilidade com dois bônus (Raposa/Kitsune) soma os dois", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "ningen", habilidadePrincipal: "raposa-kitsune" });
    assert.deepEqual(bonus, { proficiencias: { intuicao: 1, malandragem: 1 }, atributos: {} });
  });

  it("principal + secundária que bonificam a mesma chave somam (ex.: duas fontes de Sobrevivência)", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "ningen", habilidadePrincipal: "coelho-bode", habilidadeSecundaria: "camuflagem-animal" });
    assert.equal(bonus.proficiencias.sobrevivencia, 2); // coelho-bode +1, camuflagem-animal +1
    assert.equal(bonus.proficiencias.furtividade, 1);
  });

  it("habilidade sem bônus de grau (ex.: Mana Fluida) não aparece no resultado", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "humano", habilidadePrincipal: "mana-fluida" });
    assert.deepEqual(bonus, { proficiencias: {}, atributos: {} });
  });
});

describe("racasCatalogo — comGrausEfetivos", () => {
  it("sem bônus nenhum, devolve o mesmo personagem por referência", () => {
    const ch = { proficiencias: { investigacao: "E" }, atributosGerais: { forca: "E" } };
    const { character, bonusAplicado } = comGrausEfetivos(ch);
    assert.equal(character, ch); // mesma referência, não clonou à toa
    assert.deepEqual(bonusAplicado, { proficiencias: {}, atributos: {} });
  });

  it("Leonino com Investigação em E: ficha efetiva mostra D, bonusAplicado=1", () => {
    const ch = { raca: "ningen", habilidadePrincipal: "leonino", proficiencias: { investigacao: "E" }, atributosGerais: {} };
    const { character, bonusAplicado } = comGrausEfetivos(ch);
    assert.equal(character.proficiencias.investigacao, "D");
    assert.equal(bonusAplicado.proficiencias.investigacao, 1);
    assert.equal(ch.proficiencias.investigacao, "E"); // original não foi mutado
  });

  it("quando o teto já impede o bônus (grau já C), bonusAplicado fica 0", () => {
    const ch = { raca: "ningen", habilidadePrincipal: "leonino", proficiencias: { investigacao: "C" }, atributosGerais: {} };
    const { character, bonusAplicado } = comGrausEfetivos(ch);
    assert.equal(character.proficiencias.investigacao, "C");
    assert.equal(bonusAplicado.proficiencias.investigacao, 0);
  });

  it("personagem sem character (null/undefined) não quebra", () => {
    const { character, bonusAplicado } = comGrausEfetivos(null);
    assert.equal(character, null);
    assert.deepEqual(bonusAplicado, { proficiencias: {}, atributos: {} });
  });

  it("mantém todos os outros campos do personagem intactos", () => {
    const ch = { id: "x", name: "X", raca: "ningen", habilidadePrincipal: "leonino", proficiencias: { investigacao: "E" }, atributosGerais: {}, hp: { current: 3, max: 3 } };
    const { character } = comGrausEfetivos(ch);
    assert.equal(character.id, "x");
    assert.equal(character.name, "X");
    assert.deepEqual(character.hp, { current: 3, max: 3 });
  });
});
