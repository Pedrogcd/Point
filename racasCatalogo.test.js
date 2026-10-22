import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  listaRacas, encontrarRaca, encontrarPrincipal, encontrarSecundaria,
  descritoresDeSelecao, migrarSelecaoRacaLegado, inferirRacaEHabilidadesDeTextoLivre, temDescritor,
  CATALOGO_RACAS, BONUS_GRAU_POR_HABILIDADE, BONUS_GRAU_ESCOLHA_POR_HABILIDADE,
  DESCRITOR_ESCOLHA_POR_HABILIDADE, BONUS_OFICIO_EXTRA_POR_HABILIDADE,
  descritorEscolhidoDoPersonagem,
  bonusGrauDoPersonagem, grauComBonus, comGrausEfetivos,
  oficiosExtrasDoPersonagem, tetoGrauDoPersonagem,
  disciplinasDoPersonagem, oficiosMagicosDoPersonagem, temMagiaInataDoPersonagem, magiasAtivasDoPersonagem,
  temEncaixeExtraDeDisciplina, descritoresDeTransformacaoAtiva,
} from "./racasCatalogo.js";
import { computeMaxSP } from "./engine.js";

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

  it("encontrarSecundaria resolve dentro da raça certa; Humano tem 3, e só Vaga de Disciplina tem o flag disciplina", () => {
    const ningen = encontrarRaca("ningen");
    assert.equal(encontrarSecundaria(ningen, "transformacao").nome, "Transformação");
    const humano = encontrarRaca("humano");
    assert.equal(humano.secundarias.length, 3);
    assert.deepEqual(humano.secundarias.map((s) => s.id), ["vaga-de-disciplina", "homunculo", "goethiano"]);
    assert.equal(encontrarSecundaria(humano, "vaga-de-disciplina").disciplina, true);
    assert.equal(encontrarSecundaria(humano, "homunculo").disciplina, undefined);
    assert.equal(encontrarSecundaria(humano, "goethiano").disciplina, undefined);
  });
});

describe("racasCatalogo — descritoresDeSelecao", () => {
  it("soma descritores de principal + secundária sem duplicar", () => {
    const dragonato = encontrarRaca("dragonato");
    const principal = encontrarPrincipal(dragonato, "texoni"); // descritores: ["blindado"]
    const resultado = descritoresDeSelecao(principal, null);
    assert.deepEqual(resultado, ["blindado"]);
  });

  // 21/10: Leonino e Garras e Presas mudaram de descritores (seção 8.5) —
  // Leonino agora dá "letal" (geral), Garras e Presas dá "desarmado_perfurante"
  // (não mais "desarmado_letal"/"ignora_blindado") — não há mais duplicata
  // real entre os dois, mas o teste continua valendo com os ids novos.
  // 22/10 (docs/revisao/racas-site.json): Leonino também ganhou "+1 SP
  // máximo" (sp_maximo_1).
  it("combina descritores de principal e secundária de raças diferentes", () => {
    const ningen = encontrarRaca("ningen");
    const principal = encontrarPrincipal(ningen, "leonino"); // descritores: ["letal", "sp_maximo_1"]
    const secundaria = encontrarSecundaria(ningen, "garras-e-presas"); // descritores: ["desarmado_perfurante"]
    const resultado = descritoresDeSelecao(principal, secundaria);
    assert.deepEqual(resultado, ["letal", "sp_maximo_1", "desarmado_perfurante"]);
  });

  it("entradas null/undefined não quebram e não entram no resultado", () => {
    assert.deepEqual(descritoresDeSelecao(null, undefined), []);
  });

  it("habilidade sem descritor não adiciona nada", () => {
    const ningen = encontrarRaca("ningen");
    const sentidosAgucados = encontrarSecundaria(ningen, "sentidos-agucados"); // descritores: []
    assert.deepEqual(descritoresDeSelecao(sentidosAgucados), []);
  });
});

describe("racasCatalogo — migrarSelecaoRacaLegado", () => {
  // 22/10 (pedido do Pedro: "migre fichas existentes, ex. Raiko, pelo nome
  // da habilidade"): ficha sem os dois esquemas estruturados, mas com
  // `race`/`racialAbility` em texto livre, agora infere raça/habilidade em
  // vez de ficar tudo null — ver inferirRacaEHabilidadesDeTextoLivre.
  it("ficha só com texto livre (ex.: a Leona, 'Ningen Leonino') infere raça e principal", () => {
    const leona = { id: "leona", name: "Leona", race: "Ningen Leonino" };
    const migrado = migrarSelecaoRacaLegado(leona);
    assert.equal(migrado.raca, "ningen");
    assert.equal(migrado.habilidadePrincipal, "leonino");
    assert.equal(migrado.habilidadeSecundaria, null);
    assert.deepEqual(migrado.descritores, ["letal", "sp_maximo_1"]);
  });

  it("ficha com texto realmente vazio continua tudo null (não inventa raça)", () => {
    const migrado = migrarSelecaoRacaLegado({ id: "x", name: "X" });
    assert.deepEqual(migrado, { raca: null, habilidadePrincipal: null, habilidadeSecundaria: null, disciplinaHumano: null, descritores: [], bonusGrauEscolha: {}, bonusGrauFixoSuprimido: [] });
  });

  it("esquema novo já presente (mesmo com valores null) não é tocado", () => {
    const ch = { raca: "humano", habilidadePrincipal: "mana-concentrada", habilidadeSecundaria: null, disciplinaHumano: { nome: "Alquimia", grau: "D" }, descritores: [], bonusGrauEscolha: { "mana-concentrada": "investigacao" }, bonusGrauFixoSuprimido: [] };
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
    assert.deepEqual(migrado.bonusGrauEscolha, {});
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

describe("racasCatalogo — inferirRacaEHabilidadesDeTextoLivre (22/10, migração por texto livre)", () => {
  it("Raiko: 'Niosh (Oni, descendente de Arcani)' + racialAbility 'Niosh — Agressividade Oni · Descendente de Arcani' infere principal E secundária", () => {
    const raiko = {
      race: "Niosh (Oni, descendente de Arcani)",
      racialAbility: { name: "Niosh — Agressividade Oni · Descendente de Arcani", description: "" },
    };
    const inferido = inferirRacaEHabilidadesDeTextoLivre(raiko);
    assert.deepEqual(inferido, { raca: "niosh", habilidadePrincipal: "descendentes-de-arcani", habilidadeSecundaria: "agressividade-oni" });
    const migrado = migrarSelecaoRacaLegado(raiko);
    assert.equal(migrado.raca, "niosh");
    assert.equal(migrado.habilidadePrincipal, "descendentes-de-arcani");
    assert.equal(migrado.habilidadeSecundaria, "agressividade-oni");
    assert.deepEqual(migrado.descritores, ["resistente", "reabastecer", "mp_maximo_1", "letal"]);
    // 22/10 (bug da Raiko): o +1 Força fixo de toda Niosh (BONUS_GRAU_FIXO_
    // POR_RACA) fica suprimido nesta migração — a ficha salva não ganha um
    // bônus que nunca modelou antes.
    assert.deepEqual(migrado.bonusGrauFixoSuprimido, [{ tipo: "atributo", chave: "forca" }]);
  });

  it("'Ningen Kitsune' infere Raposa/Kitsune (apelido bate por qualquer metade do nome com /)", () => {
    const ookami = { race: "Ningen Kitsune" };
    assert.deepEqual(inferirRacaEHabilidadesDeTextoLivre(ookami), { raca: "ningen", habilidadePrincipal: "raposa-kitsune", habilidadeSecundaria: null });
  });

  it("'Elfa Radiante' infere Clã Radiante (apelido sem o prefixo 'Clã')", () => {
    const rena = { race: "Elfa Radiante" };
    assert.deepEqual(inferirRacaEHabilidadesDeTextoLivre(rena), { raca: "elfo", habilidadePrincipal: "cla-radiante", habilidadeSecundaria: null });
  });

  it("'Humana (Goethiana)' infere Humano + secundária Goethiano (tolera gênero o/a)", () => {
    const erin = { race: "Humana (Goethiana)" };
    assert.deepEqual(inferirRacaEHabilidadesDeTextoLivre(erin), { raca: "humano", habilidadePrincipal: null, habilidadeSecundaria: "goethiano" });
  });

  it("raça ambígua (duas palavras-chave, ex. 'Niosh (Oni/Elfo)') não migra — devolve null", () => {
    assert.equal(inferirRacaEHabilidadesDeTextoLivre({ race: "Niosh (Oni/Elfo)" }), null);
  });

  it("Dragonato e Tengou nunca batem (a palavra-chave não existe pra eles)", () => {
    assert.equal(inferirRacaEHabilidadesDeTextoLivre({ race: "Dragonato Texoni" }), null);
    assert.equal(inferirRacaEHabilidadesDeTextoLivre({ race: "Demônio (Tengou)" }), null);
  });

  it("texto sem nenhuma palavra-chave de raça devolve null", () => {
    assert.equal(inferirRacaEHabilidadesDeTextoLivre({ race: "Suthence (criada em laboratório)" }), null);
    assert.equal(inferirRacaEHabilidadesDeTextoLivre({}), null);
  });
});

// Checagem automática de deriva: toda habilidade (principal ou secundária, de
// qualquer raça) cujo `efeito` mencione "+1 grau" ou "+1 na proficiência"/
// "+1 nas proficiências" precisa estar em BONUS_GRAU_POR_HABILIDADE (bônus
// fixo) e/ou BONUS_GRAU_ESCOLHA_POR_HABILIDADE (bônus à escolha do jogador —
// ex.: Mana Concentrada, Homúnculo), e vice-versa — se o Pedro editar o
// catálogo de novo (mudar um efeito, trocar uma habilidade) e isso mexer em
// quem dá bônus de grau, o teste quebra aqui em vez de silenciosamente ficar
// desatualizado. Homúnculo aparece nas duas tabelas (Atletismo é fixo,
// Força-ou-Destreza é escolha) — por isso a cobertura usa a UNIÃO dos ids.
describe("racasCatalogo — BONUS_GRAU_POR_HABILIDADE(+ESCOLHA) cobre o catálogo inteiro", () => {
  const todasHabilidades = CATALOGO_RACAS.racas.flatMap((r) => [...r.principais, ...r.secundarias]);
  const mencionamBonusDeGrau = todasHabilidades.filter((h) => /\+1 grau|\+1 na proficiência|\+1 nas proficiências/.test(h.efeito));
  const idsMapeados = new Set([...Object.keys(BONUS_GRAU_POR_HABILIDADE), ...Object.keys(BONUS_GRAU_ESCOLHA_POR_HABILIDADE)]);

  it("toda habilidade cujo efeito menciona bônus de grau está mapeada (fixa ou à escolha)", () => {
    const faltando = mencionamBonusDeGrau.filter((h) => !idsMapeados.has(h.id)).map((h) => h.id);
    assert.deepEqual(faltando, [], `habilidades com "+1 grau"/"+1 na(s) proficiência(s)" no efeito mas sem entrada em nenhuma das duas tabelas: ${faltando.join(", ")}`);
  });

  it("todo id mapeado (nas duas tabelas) existe de verdade no catálogo e seu efeito realmente menciona bônus de grau", () => {
    const idsCatalogo = new Set(todasHabilidades.map((h) => h.id));
    const idsMencionam = new Set(mencionamBonusDeGrau.map((h) => h.id));
    for (const id of idsMapeados) {
      assert.ok(idsCatalogo.has(id), `id mapeado "${id}" não existe mais no catálogo`);
      assert.ok(idsMencionam.has(id), `id mapeado "${id}" existe, mas o efeito dele não menciona mais bônus de grau`);
    }
  });

  // 21/10 (seção 8): "pele-grossa" saiu do bônus fixo (não dá mais +1 grau em
  // Defesa) e "adaptado" entrou (antes "+1 dado" solto, virou bônus de grau
  // de verdade) — fixo continua em 18, só trocou de membro. "homunculo"
  // saiu da tabela de ESCOLHA (o Potente virou descritor, não grau). "mana-
  // fluida"/"mana-estatica"/"descendentes-de-sharkan" entraram na escolha
  // (cada uma com sua própria proficiência à escolha, seção 8.3/8.4).
  // 22/10 (correção confirmada pelo Pedro: a "proficiência à escolha, não-
  // Combate" do racas-site.json é regra geral do Elfo, não só do Clã
  // Corvus — tinha sido perdida numa revisão anterior): os 5 clãs (cla-
  // radiante/noctis/corvus/seasus/natrus) entraram na tabela de ESCOLHA —
  // escolha vai de 4 pra 9. Os 5 clãs JÁ estavam na tabela FIXA (cada um
  // com seu próprio atributo/proficiência fixo) — agora aparecem nas DUAS
  // tabelas de propósito (um bônus fixo do clã + o bônus à escolha de toda
  // a raça), então a união não é mais a soma simples: 18 + 9 − 5 de
  // overlap (os 5 clãs) = 22.
  it("cobertura esperada: 22 habilidades distintas (18 com bônus fixo, 9 à escolha, 5 clãs élficos nas duas tabelas)", () => {
    assert.equal(idsMapeados.size, 22);
    assert.equal(Object.keys(BONUS_GRAU_POR_HABILIDADE).length, 18);
    assert.equal(Object.keys(BONUS_GRAU_ESCOLHA_POR_HABILIDADE).length, 9);
    const overlap = Object.keys(BONUS_GRAU_POR_HABILIDADE).filter((id) => id in BONUS_GRAU_ESCOLHA_POR_HABILIDADE);
    assert.deepEqual(overlap.sort(), ["cla-corvus", "cla-natrus", "cla-noctis", "cla-radiante", "cla-seasus"]);
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

  it("Disciplina 'Ofício Mágico: Magias de guerra' dá +1 em Magias Gerais, Acadêmicos e Tecnologia (pendência 2 de DISCIPLINAS_MAGIA.md, confirmada 14/10)", () => {
    const bonus = bonusGrauDoPersonagem({ disciplinas: [{ disciplinaId: "oficio-magias-de-guerra", habilidadesAtivas: [] }] });
    assert.deepEqual(bonus, { proficiencias: { magiasGerais: 1, academicos: 1, tecnologia: 1 }, atributos: {} });
  });

  it("Disciplinas que não são Magias de guerra não dão bônus de grau nenhum (só contam no pool mágico)", () => {
    const bonus = bonusGrauDoPersonagem({
      disciplinas: [
        { disciplinaId: "oficio-encantamentos", habilidadesAtivas: [] },
        { disciplinaId: "oficio-alquimia", habilidadesAtivas: [] },
        { disciplinaId: "oficio-constructo", habilidadesAtivas: [] },
      ],
    });
    assert.deepEqual(bonus, { proficiencias: {}, atributos: {} });
  });

  it("Magia Inata não dá bônus de grau nenhum (virou só +1d10 fixo e +1 MP, ver engine.js)", () => {
    const bonus = bonusGrauDoPersonagem({ disciplinas: [{ disciplinaId: "magia-inata", habilidadesAtivas: [] }] });
    assert.deepEqual(bonus, { proficiencias: {}, atributos: {} });
  });

  it("Leonino (ningen) dá +1 em Investigação", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "ningen", habilidadePrincipal: "leonino" });
    assert.deepEqual(bonus, { proficiencias: { investigacao: 1 }, atributos: {} });
  });

  it("Descendentes de Sharkan (niosh) não dá bônus de grau PRÓPRIO, mas todo Niosh já tem +1 em Força de raça (14/10, mais tarde — ver BONUS_GRAU_FIXO_POR_RACA)", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "niosh", habilidadePrincipal: "descendentes-de-sharkan" });
    assert.deepEqual(bonus, { proficiencias: {}, atributos: { forca: 1 } });
  });

  it("Descendentes de Sabato (niosh) também tem +1 em Força — vem do bônus de raça (14/10, mais tarde: deixou de ser específico dessa habilidade, ver BONUS_GRAU_FIXO_POR_RACA)", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "niosh", habilidadePrincipal: "descendentes-de-sabato" });
    assert.deepEqual(bonus, { proficiencias: {}, atributos: { forca: 1 } });
  });

  it("todo Niosh tem +1 em Força de raça mesmo sem principal/secundária escolhida (pedido do Pedro: vale pra qualquer Niosh)", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "niosh" });
    assert.deepEqual(bonus, { proficiencias: {}, atributos: { forca: 1 } });
  });

  // 21/10 (docs/ATUALIZACAO_21-10.md + pedido do Pedro): Goethiano perdeu o
  // +1 grau em Vigor de vez — virou +1 HP máximo (descritor "hp_maximo_1",
  // ver engine.test.js:computeMaxHP) + descritores "resistente"/"blindado".
  // Sem bônus de grau nenhum.
  it("Goethiano não dá mais bônus de grau nenhum (21/10)", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "humano", habilidadeSecundaria: "goethiano" });
    assert.deepEqual(bonus, { proficiencias: {}, atributos: {} });
  });

  it("Goethiano não altera mais o Vigor (nem bonusAplicado)", () => {
    const { character, bonusAplicado } = comGrausEfetivos({ raca: "humano", habilidadeSecundaria: "goethiano", atributosGerais: { vigor: "C" } });
    assert.equal(character.atributosGerais.vigor, "C");
    assert.equal(bonusAplicado.atributos.vigor, undefined);
  });

  // 21/10: Homúnculo perdeu a escolha de grau em Força/Destreza — virou "um
  // Potente à escolha" (descritor, ver describe("descritorEscolhidoDoPersonagem")
  // acima), Atletismo continua fixo.
  it("Homúnculo dá +1 fixo em Atletismo, sem bônus de grau à escolha (o Potente agora é descritor)", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "humano", habilidadeSecundaria: "homunculo" });
    assert.deepEqual(bonus, { proficiencias: { atletismo: 1 }, atributos: {} });
  });
  it("Homúnculo não tem mais entrada em BONUS_GRAU_ESCOLHA_POR_HABILIDADE", () => {
    assert.equal(BONUS_GRAU_ESCOLHA_POR_HABILIDADE.homunculo, undefined);
  });

  it("Mana Concentrada sem escolha não dá bônus de grau nenhum", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "humano", habilidadePrincipal: "mana-concentrada" });
    assert.deepEqual(bonus, { proficiencias: {}, atributos: {} });
  });

  it("Mana Concentrada com as duas escolhas de proficiência soma o bônus em cada uma", () => {
    const bonus = bonusGrauDoPersonagem({
      raca: "humano", habilidadePrincipal: "mana-concentrada",
      bonusGrauEscolha: { "mana-concentrada": ["furtividade", "percepcao"] },
    });
    assert.deepEqual(bonus, { proficiencias: { furtividade: 1, percepcao: 1 }, atributos: {} });
  });

  // 21/10: Mana Estática ganhou uma escolha de proficiência PRÓPRIA (1,
  // não-combate) além do descritor Resistente (ver catalogo-racas.json) —
  // antes vinha de BONUS_GRAU_ESCOLHA_POR_RACA (retirado), agora é só dela.
  it("Mana Estática (humano) sem escolha não dá bônus de grau", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "humano", habilidadePrincipal: "mana-estatica" });
    assert.deepEqual(bonus, { proficiencias: {}, atributos: {} });
  });
  it("Mana Estática com escolha de proficiência soma o bônus nela", () => {
    const bonus = bonusGrauDoPersonagem({
      raca: "humano", habilidadePrincipal: "mana-estatica",
      bonusGrauEscolha: { "mana-estatica": ["medicina"] },
    });
    assert.deepEqual(bonus, { proficiencias: { medicina: 1 }, atributos: {} });
  });
  it("Mana Fluida com escolha de proficiência soma o bônus nela (21/10, nova)", () => {
    const bonus = bonusGrauDoPersonagem({
      raca: "humano", habilidadePrincipal: "mana-fluida",
      bonusGrauEscolha: { "mana-fluida": ["politica"] },
    });
    assert.deepEqual(bonus, { proficiencias: { politica: 1 }, atributos: {} });
  });

  // Pele Grossa (21/10, seção 8.4, revisão posterior ao item 1): não dá mais
  // bônus de grau nenhum — virou só o descritor Blindado (ver
  // catalogo-racas.json). O +1 Força de todo Niosh continua intocado
  // (BONUS_GRAU_FIXO_POR_RACA, tabela independente).
  it("Pele Grossa (niosh) não dá bônus de grau nenhum — só o +1 Força de todo Niosh continua valendo", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "niosh", habilidadeSecundaria: "pele-grossa" });
    assert.deepEqual(bonus, { proficiencias: {}, atributos: { forca: 1 } });
  });

  it("Clã Radiante (elfo) dá +1 em Carisma", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "elfo", habilidadePrincipal: "cla-radiante" });
    assert.deepEqual(bonus, { proficiencias: {}, atributos: { carisma: 1 } });
  });

  it("Clã Noctis (elfo) dá +1 em Manipulação", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "elfo", habilidadePrincipal: "cla-noctis" });
    assert.deepEqual(bonus, { proficiencias: {}, atributos: { manipulacao: 1 } });
  });

  it("Clã Corvus (elfo) dá +1 em Furtividade (14/10: Magias Ofensivas saiu, virou +1 ofício mágico extra)", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "elfo", habilidadePrincipal: "cla-corvus" });
    assert.deepEqual(bonus, { proficiencias: { furtividade: 1 }, atributos: {} });
    assert.equal(oficiosExtrasDoPersonagem({ raca: "elfo", habilidadePrincipal: "cla-corvus" }), 1);
  });

  it("Clã Seasus (elfo) dá +1 em Magias Gerais (14/10: Magias Ofensivas/Resistência Mágica saíram, viram +1 ofício mágico extra)", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "elfo", habilidadePrincipal: "cla-seasus" });
    assert.deepEqual(bonus, { proficiencias: { magiasGerais: 1 }, atributos: {} });
    assert.equal(oficiosExtrasDoPersonagem({ raca: "elfo", habilidadePrincipal: "cla-seasus" }), 1);
  });

  it("Clã Natrus (elfo) dá +1 em Sobrevivência (14/10: Resistência Mágica/Blindado Mágico saíram, viram +1 ofício mágico extra)", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "elfo", habilidadePrincipal: "cla-natrus" });
    assert.deepEqual(bonus, { proficiencias: { sobrevivencia: 1 }, atributos: {} });
    assert.equal(oficiosExtrasDoPersonagem({ raca: "elfo", habilidadePrincipal: "cla-natrus" }), 1);
  });

  it("oficiosExtrasDoPersonagem é 0 pra quem não tem Natrus/Corvus/Seasus", () => {
    assert.equal(oficiosExtrasDoPersonagem({ raca: "elfo", habilidadePrincipal: "cla-radiante" }), 0);
    assert.equal(oficiosExtrasDoPersonagem({}), 0);
  });

  it("comGrausEfetivos soma o ofício extra racial em disciplinaMagica.oficiosExtras (base 0 + 1 do Clã Corvus)", () => {
    const { character } = comGrausEfetivos({ raca: "elfo", habilidadePrincipal: "cla-corvus", disciplinaMagica: {} });
    assert.equal(character.disciplinaMagica.oficiosExtras, 1);
  });

  it("comGrausEfetivos soma o ofício extra racial em cima de um oficiosExtras já salvo na ficha", () => {
    const { character } = comGrausEfetivos({ raca: "elfo", habilidadePrincipal: "cla-corvus", disciplinaMagica: { oficiosExtras: 2 } });
    assert.equal(character.disciplinaMagica.oficiosExtras, 3);
  });

  // Conduíte mágico (21/10, docs/ATUALIZACAO_21-10.md item 4): flag global
  // (character.conduiteAtivo) soma +1 ofício, igual os ofícios extras
  // raciais — "só um Conduíte funciona por vez" é automático porque é um
  // único booleano, não uma lista.
  it("conduiteAtivo soma +1 em disciplinaMagica.oficiosExtras", () => {
    const { character } = comGrausEfetivos({ conduiteAtivo: true, disciplinaMagica: {} });
    assert.equal(character.disciplinaMagica.oficiosExtras, 1);
  });
  it("sem conduiteAtivo, não soma nada", () => {
    const { character } = comGrausEfetivos({ disciplinaMagica: {} });
    assert.equal(character.disciplinaMagica.oficiosExtras, 0);
  });
  it("conduiteAtivo soma em cima de ofícios extras raciais e já salvos", () => {
    const { character } = comGrausEfetivos({
      raca: "elfo", habilidadePrincipal: "cla-corvus", conduiteAtivo: true,
      disciplinaMagica: { oficiosExtras: 2 },
    });
    assert.equal(character.disciplinaMagica.oficiosExtras, 4); // 2 salvo + 1 Corvus + 1 Conduíte
  });
});

// Equipamento defensivo (21/10, docs/ATUALIZACAO_21-10.md seção 7 — ver
// data/armaduras.js). comGrausEfetivos é o único ponto que transforma
// character.equipamento em descritores/bônus de verdade — testado aqui em
// vez de duplicar a cobertura de data/armaduras.test.js.
describe("racasCatalogo — comGrausEfetivos com equipamento (armadura)", () => {
  it("soma os descritores da armadura equipada em character.descritores", () => {
    const { character } = comGrausEfetivos({ equipamento: { armaduraId: "armadura_media" } });
    assert.deepEqual(character.descritores, ["resistente", "blindado"]);
  });

  it("não duplica um descritor que o personagem já tinha (dedupe)", () => {
    const { character } = comGrausEfetivos({ descritores: ["resistente"], equipamento: { armaduraId: "armadura_media" } });
    assert.deepEqual(character.descritores, ["resistente", "blindado"]);
  });

  it("Potente Força (armadura de poder base): +1 grau em Força, teto C", () => {
    const { character, bonusAplicado } = comGrausEfetivos({
      atributosGerais: { forca: "D" }, equipamento: { armaduraId: "armadura_de_poder_base" },
    });
    assert.equal(character.atributosGerais.forca, "C");
    assert.equal(bonusAplicado.atributos.forca, 1);
  });

  it("Potente Força não sobe além de C", () => {
    const { character } = comGrausEfetivos({
      atributosGerais: { forca: "C" }, equipamento: { armaduraId: "armadura_de_poder_base" },
    });
    assert.equal(character.atributosGerais.forca, "C");
  });

  it("Potente Destreza (exoesqueleto): +1 grau em Destreza, teto C", () => {
    const { character } = comGrausEfetivos({
      atributosGerais: { destreza: "D" }, equipamento: { armaduraId: "exoesqueleto" },
    });
    assert.equal(character.atributosGerais.destreza, "C");
  });

  it("Potente ofício mágico (armadura catalisadora): +1 em disciplinaMagica.oficiosExtras, soma com o Conduíte", () => {
    const { character } = comGrausEfetivos({
      conduiteAtivo: true, disciplinaMagica: {}, equipamento: { armaduraId: "armadura_catalisadora" },
    });
    assert.equal(character.disciplinaMagica.oficiosExtras, 2); // 1 Conduíte + 1 armadura
  });

  it("bonusDefesaEquipamento e penalidadeDefesaSemPericia ficam anexados no character efetivo", () => {
    const { character } = comGrausEfetivos({
      equipamento: { armaduraId: "armadura_de_placas_completa", temPericiaArmadura: false },
    });
    assert.equal(character.penalidadeDefesaSemPericia, 1); // placas sem perícia
    assert.equal(character.bonusDefesaEquipamento, 0); // placas não dá bônus de Defesa
  });
  it("bonusDefesaEquipamento soma o +1 de peças que dão bônus (ex. Vestimenta rúnica)", () => {
    const { character } = comGrausEfetivos({ equipamento: { armaduraId: "vestimenta_runica" } });
    assert.equal(character.bonusDefesaEquipamento, 1);
  });

  it("sem equipamento nenhum, penalidadeDefesaSemPericia e bonusDefesaEquipamento são 0", () => {
    const { character } = comGrausEfetivos({});
    assert.equal(character.penalidadeDefesaSemPericia, 0);
    assert.equal(character.bonusDefesaEquipamento, 0);
  });

  it("mana ativa condicional: Campo de Mana da Armadura de mana só entra com manaAtivaArmadura", () => {
    const semMana = comGrausEfetivos({ equipamento: { armaduraId: "armadura_de_mana" } }).character;
    assert.ok(!(semMana.descritores || []).includes("campo_de_mana"));
    const comMana = comGrausEfetivos({ equipamento: { armaduraId: "armadura_de_mana", manaAtivaArmadura: true } }).character;
    assert.ok((comMana.descritores || []).includes("campo_de_mana"));
  });
});

describe("racasCatalogo — disciplinas (docs/DISCIPLINAS_MAGIA.md, 14/10)", () => {
  it("disciplinasDoPersonagem filtra slots vazios (null)", () => {
    const ch = { disciplinas: [{ disciplinaId: "magia-inata", habilidadesAtivas: ["shin"] }, null, null] };
    assert.deepEqual(disciplinasDoPersonagem(ch), [{ disciplinaId: "magia-inata", habilidadesAtivas: ["shin"] }]);
  });

  it("disciplinasDoPersonagem sem character.disciplinas não quebra, devolve []", () => {
    assert.deepEqual(disciplinasDoPersonagem({}), []);
    assert.deepEqual(disciplinasDoPersonagem(null), []);
  });

  // 4º encaixe (14/10, mesmo dia): "Vaga de Disciplina" do Humano (secundária
  // com `disciplina: true` no catálogo, id "vaga-de-disciplina") vira um
  // encaixe de Disciplina de verdade, INDEPENDENTE dos 3 normais — pedido
  // explícito do Pedro, ver CONTEXTO.md.
  describe("4º encaixe extra (Vaga de Disciplina do Humano)", () => {
    it("temEncaixeExtraDeDisciplina é true só quando a secundária ESCOLHIDA tem o flag disciplina", () => {
      assert.equal(temEncaixeExtraDeDisciplina({ raca: "humano", habilidadeSecundaria: "vaga-de-disciplina" }), true);
      assert.equal(temEncaixeExtraDeDisciplina({ raca: "humano", habilidadeSecundaria: "homunculo" }), false);
      assert.equal(temEncaixeExtraDeDisciplina({ raca: "elfo", habilidadeSecundaria: "resistencia-a-dor" }), false);
      assert.equal(temEncaixeExtraDeDisciplina({}), false);
    });

    it("disciplinasDoPersonagem inclui disciplinaExtraHumano quando a secundária é Vaga de Disciplina", () => {
      const ch = {
        raca: "humano", habilidadeSecundaria: "vaga-de-disciplina",
        disciplinas: [{ disciplinaId: "oficio-magias-de-guerra", habilidadesAtivas: [] }, null, null],
        disciplinaExtraHumano: { disciplinaId: "magia-inata", habilidadesAtivas: ["shin"] },
      };
      assert.deepEqual(disciplinasDoPersonagem(ch), [
        { disciplinaId: "oficio-magias-de-guerra", habilidadesAtivas: [] },
        { disciplinaId: "magia-inata", habilidadesAtivas: ["shin"] },
      ]);
    });

    it("é de verdade um 4º encaixe: os 3 normais cheios + o extra dão 4 disciplinas efetivas", () => {
      const ch = {
        raca: "humano", habilidadeSecundaria: "vaga-de-disciplina",
        disciplinas: [
          { disciplinaId: "oficio-magias-de-guerra", habilidadesAtivas: [] },
          { disciplinaId: "oficio-alquimia", habilidadesAtivas: [] },
          { disciplinaId: "oficio-encantamentos", habilidadesAtivas: [] },
        ],
        disciplinaExtraHumano: { disciplinaId: "oficio-constructo", habilidadesAtivas: [] },
      };
      assert.equal(disciplinasDoPersonagem(ch).length, 4);
      assert.deepEqual(oficiosMagicosDoPersonagem(ch), ["oficio-magias-de-guerra", "oficio-alquimia", "oficio-encantamentos", "oficio-constructo"]);
    });

    it("disciplinaExtraHumano fica ignorado (não lido) quando a secundária NÃO é Vaga de Disciplina, mesmo com dado salvo", () => {
      // Dado preservado (ex: jogador trocou de secundária depois de escolher
      // uma disciplina extra) — mas não conta mais, igual o resto do app
      // nunca apaga dado, só para de usar.
      const ch = {
        raca: "humano", habilidadeSecundaria: "homunculo",
        disciplinas: [null, null, null],
        disciplinaExtraHumano: { disciplinaId: "magia-inata", habilidadesAtivas: ["shin"] },
      };
      assert.deepEqual(disciplinasDoPersonagem(ch), []);
      assert.equal(temMagiaInataDoPersonagem(ch), false);
    });

    it("sem disciplinaExtraHumano preenchido (null), mesmo com a secundária certa, não adiciona nada", () => {
      const ch = { raca: "humano", habilidadeSecundaria: "vaga-de-disciplina", disciplinas: [null, null, null], disciplinaExtraHumano: null };
      assert.deepEqual(disciplinasDoPersonagem(ch), []);
    });
  });

  it("oficiosMagicosDoPersonagem conta só as disciplinas tipo oficio-magico, não Magia Inata", () => {
    const ch = {
      disciplinas: [
        { disciplinaId: "oficio-magias-de-guerra", habilidadesAtivas: [] },
        { disciplinaId: "magia-inata", habilidadesAtivas: [] },
        { disciplinaId: "oficio-alquimia", habilidadesAtivas: [] },
      ],
    };
    assert.deepEqual(oficiosMagicosDoPersonagem(ch), ["oficio-magias-de-guerra", "oficio-alquimia"]);
  });

  it("oficiosMagicosDoPersonagem ignora um disciplinaId desconhecido (não quebra)", () => {
    assert.deepEqual(oficiosMagicosDoPersonagem({ disciplinas: [{ disciplinaId: "sei-la-o-que", habilidadesAtivas: [] }] }), []);
  });

  it("temMagiaInataDoPersonagem é true só quando Magia Inata está num dos slots", () => {
    assert.equal(temMagiaInataDoPersonagem({ disciplinas: [{ disciplinaId: "magia-inata", habilidadesAtivas: [] }] }), true);
    assert.equal(temMagiaInataDoPersonagem({ disciplinas: [{ disciplinaId: "oficio-magias-de-guerra", habilidadesAtivas: [] }] }), false);
    assert.equal(temMagiaInataDoPersonagem({}), false);
  });

  it("magiasAtivasDoPersonagem junta as magias equipadas de TODAS as disciplinas, sem duplicar", () => {
    const ch = {
      disciplinas: [
        { disciplinaId: "oficio-magias-de-guerra", habilidadesAtivas: ["shin", "tiro_magico"] },
        { disciplinaId: "magia-inata", habilidadesAtivas: ["tiro_magico", "shin_kay"] },
      ],
    };
    assert.deepEqual(magiasAtivasDoPersonagem(ch), ["shin", "tiro_magico", "shin_kay"]);
  });

  it("comGrausEfetivos deriva disciplinaMagica inteiro a partir de character.disciplinas", () => {
    const ch = {
      raca: "elfo", habilidadePrincipal: "cla-corvus",
      disciplinas: [
        { disciplinaId: "oficio-magias-de-guerra", habilidadesAtivas: ["shin"] },
        { disciplinaId: "magia-inata", habilidadesAtivas: ["tiro_magico"] },
      ],
    };
    const { character } = comGrausEfetivos(ch);
    assert.deepEqual(character.disciplinaMagica, {
      oficiosMagicos: ["oficio-magias-de-guerra"],
      oficiosExtras: 1, // Clã Corvus
      magiaInata: true,
      magiasAtivas: ["shin", "tiro_magico"],
    });
  });

  it("Resistência à Dor (elfo secundária) dá +1 em Resolução — trocou de '+1 dado' pontual pra grau permanente", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "elfo", habilidadeSecundaria: "resistencia-a-dor" });
    assert.deepEqual(bonus, { proficiencias: {}, atributos: { resolucao: 1 } });
  });

  it("Arte e Tradição (elfo secundária) dá +1 em Etiqueta, Atuação e Malandragem", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "elfo", habilidadeSecundaria: "arte-e-tradicao" });
    assert.deepEqual(bonus, { proficiencias: { etiqueta: 1, atuacao: 1, malandragem: 1 }, atributos: {} });
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

  it("habilidade com bônus à escolha (ex.: Mana Fluida) sem escolha feita não dá bônus nenhum", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "humano", habilidadePrincipal: "mana-fluida" });
    assert.deepEqual(bonus, { proficiencias: {}, atributos: {} });
  });

  // 21/10 (docs/ATUALIZACAO_21-10.md seção 8): BONUS_GRAU_ESCOLHA_POR_RACA
  // (bônus racial único, "todo tipo de elfo/humano") foi RETIRADO —
  // bonusGrauEscolhaRaca não é mais lido em lugar nenhum, mesmo com um valor
  // salvo (campo legado). Mana Concentrada/Fluida/Estática (Humano) ganharam
  // escolhas PRÓPRIAS no lugar — ver describe("Mana Concentrada...") abaixo.
  it("bonusGrauEscolhaRaca não tem mais nenhum efeito (campo legado, retirado em 21/10)", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "elfo", bonusGrauEscolhaRaca: "sobrevivencia" });
    assert.deepEqual(bonus, { proficiencias: {}, atributos: {} });
  });
  it("Niosh: bonusGrauEscolhaRaca não afeta nada, mas o bônus FIXO de Força continua valendo (tabelas independentes)", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "niosh", bonusGrauEscolhaRaca: "sobrevivencia" });
    assert.deepEqual(bonus, { proficiencias: {}, atributos: { forca: 1 } });
  });
});

// Mana Concentrada (Humano, 21/10): "duas proficiências, que podem ser a
// mesma" — BONUS_GRAU_ESCOLHA_POR_HABILIDADE agora é um ARRAY de escolhas
// independentes, character.bonusGrauEscolha[habId] um array de valores.
describe("bonusGrauDoPersonagem — escolha múltipla (Mana Concentrada, 21/10)", () => {
  it("duas proficiências DIFERENTES somam cada uma +1", () => {
    const bonus = bonusGrauDoPersonagem({
      raca: "humano", habilidadePrincipal: "mana-concentrada",
      bonusGrauEscolha: { "mana-concentrada": ["academicos", "medicina"] },
    });
    assert.deepEqual(bonus, { proficiencias: { academicos: 1, medicina: 1 }, atributos: {} });
  });
  it("a MESMA proficiência escolhida nas duas soma +2 (\"podem ser a mesma\")", () => {
    const bonus = bonusGrauDoPersonagem({
      raca: "humano", habilidadePrincipal: "mana-concentrada",
      bonusGrauEscolha: { "mana-concentrada": ["academicos", "academicos"] },
    });
    assert.deepEqual(bonus, { proficiencias: { academicos: 2 }, atributos: {} });
  });
  it("só a primeira escolhida: só ela soma", () => {
    const bonus = bonusGrauDoPersonagem({
      raca: "humano", habilidadePrincipal: "mana-concentrada",
      bonusGrauEscolha: { "mana-concentrada": ["academicos"] },
    });
    assert.deepEqual(bonus, { proficiencias: { academicos: 1 }, atributos: {} });
  });
  it("proficiência de Combate não é uma opção válida (ignorada)", () => {
    assert.ok(!BONUS_GRAU_ESCOLHA_POR_HABILIDADE["mana-concentrada"][0].opcoes.includes("defesaProf"));
  });
  it("sem nada escolhido, não dá bônus nenhum", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "humano", habilidadePrincipal: "mana-concentrada" });
    assert.deepEqual(bonus, { proficiencias: {}, atributos: {} });
  });
});

// Homúnculo (Humano, 21/10): "um Potente à escolha" — descritor, não grau.
describe("descritorEscolhidoDoPersonagem (21/10, Homúnculo)", () => {
  it("devolve o descritor escolhido quando válido", () => {
    const ch = { raca: "humano", habilidadeSecundaria: "homunculo", descritorEscolha: { homunculo: "potente_forca" } };
    assert.deepEqual(descritorEscolhidoDoPersonagem(ch), ["potente_forca"]);
  });
  it("sem escolha feita, devolve []", () => {
    const ch = { raca: "humano", habilidadeSecundaria: "homunculo" };
    assert.deepEqual(descritorEscolhidoDoPersonagem(ch), []);
  });
  it("valor fora de opcoes é ignorado", () => {
    const ch = { raca: "humano", habilidadeSecundaria: "homunculo", descritorEscolha: { homunculo: "blindado" } };
    assert.deepEqual(descritorEscolhidoDoPersonagem(ch), []);
  });
  it("habilidade sem entrada em DESCRITOR_ESCOLHA_POR_HABILIDADE não quebra", () => {
    assert.deepEqual(descritorEscolhidoDoPersonagem({ raca: "humano", habilidadePrincipal: "mana-concentrada" }), []);
  });
});

describe("racasCatalogo — tetoGrauDoPersonagem", () => {
  it("habilidade sem teto declarado não aparece no resultado (usa o default C em comGrausEfetivos)", () => {
    const tetos = tetoGrauDoPersonagem({ raca: "ningen", habilidadePrincipal: "leonino" });
    assert.deepEqual(tetos, { proficiencias: {}, atributos: {} });
  });

  it("Goethiano não tem mais teto nenhum (21/10: não dá bônus de grau, virou +1 HP + Resistente + Blindado)", () => {
    const tetos = tetoGrauDoPersonagem({ raca: "humano", habilidadeSecundaria: "goethiano" });
    assert.deepEqual(tetos, { proficiencias: {}, atributos: {} });
  });

  it("Pele Grossa não tem mais teto nenhum (21/10: não dá bônus de grau, virou só Blindado)", () => {
    const tetos = tetoGrauDoPersonagem({ raca: "niosh", habilidadeSecundaria: "pele-grossa" });
    assert.deepEqual(tetos, { proficiencias: {}, atributos: {} });
  });
});

describe("racasCatalogo — comGrausEfetivos", () => {
  it("sem bônus de grau nenhum, não clona proficiencias/atributosGerais (mas disciplinaMagica é sempre recalculado)", () => {
    const ch = { proficiencias: { investigacao: "E" }, atributosGerais: { forca: "E" } };
    const { character, bonusAplicado } = comGrausEfetivos(ch);
    assert.equal(character.proficiencias, ch.proficiencias); // não clonou à toa
    assert.equal(character.atributosGerais, ch.atributosGerais); // não clonou à toa
    assert.deepEqual(character.disciplinaMagica, { oficiosMagicos: [], oficiosExtras: 0, magiaInata: false, magiasAtivas: [] });
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

  // Encantamento Flamejante (Pedro, 19/10 — ver data/magias.js:ENCANTAMENTOS/
  // descritoresDeEncantamentosAtivos): character.encantamentosAtivos some os
  // descritores concedidos em character.descritores, pra
  // engine.js:descritoresEfetivosDoAtaque aplicar Queimadura em qualquer
  // ataque do personagem.
  it("sem encantamento ativo, descritores não muda (mesma referência)", () => {
    const ch = { descritores: ["sortudo"], proficiencias: {}, atributosGerais: {} };
    const { character } = comGrausEfetivos(ch);
    assert.equal(character.descritores, ch.descritores);
  });

  it("Encantamento Flamejante ativo soma 'queimadura' em character.descritores", () => {
    const ch = { descritores: ["sortudo"], encantamentosAtivos: ["encantamento_flamejante"], proficiencias: {}, atributosGerais: {} };
    const { character } = comGrausEfetivos(ch);
    assert.deepEqual(character.descritores, ["sortudo", "queimadura"]);
  });

  it("Encantamento Flamejante ativo também soma com bônus de grau de raça presentes", () => {
    const ch = {
      raca: "ningen", habilidadePrincipal: "leonino",
      descritores: [], encantamentosAtivos: ["encantamento_flamejante"],
      proficiencias: { investigacao: "E" }, atributosGerais: {},
    };
    const { character } = comGrausEfetivos(ch);
    assert.equal(character.proficiencias.investigacao, "D");
    assert.deepEqual(character.descritores, ["queimadura"]);
  });

  it("encantamentoId desconhecido não quebra e não soma nada", () => {
    const ch = { descritores: [], encantamentosAtivos: ["inexistente"], proficiencias: {}, atributosGerais: {} };
    const { character } = comGrausEfetivos(ch);
    assert.deepEqual(character.descritores, []);
  });
});

describe("racasCatalogo — temDescritor", () => {
  it("true quando o descritor está em character.descritores", () => {
    assert.equal(temDescritor({ descritores: ["sortudo", "blindado"] }, "sortudo"), true);
  });

  it("false quando o descritor não está presente", () => {
    assert.equal(temDescritor({ descritores: ["blindado"] }, "sortudo"), false);
  });

  it("personagem sem descritores (ou sem o campo) não quebra, devolve false", () => {
    assert.equal(temDescritor({ descritores: [] }, "sortudo"), false);
    assert.equal(temDescritor({}, "sortudo"), false);
    assert.equal(temDescritor(null, "sortudo"), false);
    assert.equal(temDescritor(undefined, "sortudo"), false);
  });
});

// ---------------------------------------------------------------------------
// Seção 8 (21/10, docs/ATUALIZACAO_21-10.md): Humano/Niosh/Ningen/Elfo
// revisados. Integração fim-a-fim via comGrausEfetivos + o catálogo de
// verdade (catalogo-racas.json), pra pegar erro de digitação nos ids de
// descritor que os testes unitários de cada mecanismo (engine.test.js,
// describe("bonusGrauDoPersonagem — escolha múltipla")) não pegariam.
// ---------------------------------------------------------------------------

// `character.descritores` NUNCA é derivado dinamicamente por comGrausEfetivos
// a partir de habilidadePrincipal/habilidadeSecundaria — é um SNAPSHOT
// calculado por descritoresDeSelecao() e gravado na ficha no momento da
// ESCOLHA (ver point-amaranth-app.jsx, função `escolher` do picker de raça).
// Os testes abaixo simulam esse snapshot pra testar comGrausEfetivos de
// ponta a ponta, igual uma ficha de verdade chegaria até ele.
function comHabilidade(raca, principalId, secundariaId, extra = {}) {
  const racaInfo = encontrarRaca(raca);
  const principal = encontrarPrincipal(racaInfo, principalId);
  const secundaria = encontrarSecundaria(racaInfo, secundariaId);
  const descritores = descritoresDeSelecao(principal, secundaria);
  return { raca, habilidadePrincipal: principalId, habilidadeSecundaria: secundariaId, descritores, ...extra };
}

describe("Seção 8 — Humano revisado (21/10)", () => {
  it("Mana Concentrada: Veloz + SP+1 (texto) + 2 escolhas de proficiência", () => {
    const { character } = comGrausEfetivos(comHabilidade("humano", "mana-concentrada", null, {
      bonusGrauEscolha: { "mana-concentrada": ["investigacao", "medicina"] },
    }));
    assert.ok(character.descritores.includes("veloz"));
    assert.equal(character.proficiencias.investigacao, "D");
    assert.equal(character.proficiencias.medicina, "D");
  });
  it("Mana Fluida: Reabastecer + escolha de proficiência", () => {
    const { character } = comGrausEfetivos(comHabilidade("humano", "mana-fluida", null, {
      bonusGrauEscolha: { "mana-fluida": ["politica"] },
    }));
    assert.ok(character.descritores.includes("reabastecer"));
    assert.equal(character.proficiencias.politica, "D");
  });
  it("Mana Estática: Resistente + hp_maximo_1 + escolha de proficiência", () => {
    const { character } = comGrausEfetivos(comHabilidade("humano", "mana-estatica", null, {
      bonusGrauEscolha: { "mana-estatica": ["medicina"] },
    }));
    assert.ok(character.descritores.includes("resistente"));
    assert.ok(character.descritores.includes("hp_maximo_1"));
    assert.equal(character.proficiencias.medicina, "D");
  });
  it("Homúnculo: Resistente sempre + sp_maximo_menos_1 + Atletismo fixo + Potente à escolha", () => {
    const { character } = comGrausEfetivos(comHabilidade("humano", null, "homunculo", {
      descritorEscolha: { homunculo: "potente_destreza" },
    }));
    assert.ok(character.descritores.includes("resistente"));
    assert.ok(character.descritores.includes("sp_maximo_menos_1"));
    assert.ok(character.descritores.includes("potente_destreza"));
    assert.equal(character.proficiencias.atletismo, "D");
    assert.equal(computeMaxSP(character), 2); // 3 base - 1 (Homúnculo)
  });
  it("Goethiano: Resistente + Blindado, sem HP (21/10, revisado de novo)", () => {
    const { character } = comGrausEfetivos(comHabilidade("humano", null, "goethiano"));
    assert.deepEqual(character.descritores, ["resistente", "blindado"]);
  });
});

describe("Seção 8 — Niosh revisado (21/10)", () => {
  it("Descendentes de Sharkan: Resistente + Imune a Envenenamento + escolha Física", () => {
    const { character } = comGrausEfetivos(comHabilidade("niosh", "descendentes-de-sharkan", null, {
      bonusGrauEscolha: { "descendentes-de-sharkan": ["atletismo"] },
    }));
    assert.ok(character.descritores.includes("resistente"));
    assert.ok(character.descritores.includes("imune_envenenamento"));
    assert.equal(character.proficiencias.atletismo, "D");
  });
  it("Descendentes de Arcani: Resistente + Reabastecer + mp_maximo_1, sem Resiste a Magia (21/10, 22/10)", () => {
    const { character } = comGrausEfetivos(comHabilidade("niosh", "descendentes-de-arcani", null));
    assert.deepEqual(character.descritores, ["resistente", "reabastecer", "mp_maximo_1"]);
  });
  it("Descendentes de Sabato: Resistente + Potente Força + hp_maximo_1, sem sortudo_fisico (21/10)", () => {
    const { character } = comGrausEfetivos(comHabilidade("niosh", "descendentes-de-sabato", null));
    assert.deepEqual(character.descritores, ["resistente", "potente_forca", "hp_maximo_1"]);
  });
  it("Agressividade Oni: Letal geral (não mais ignora_blindado)", () => {
    const { character } = comGrausEfetivos(comHabilidade("niosh", null, "agressividade-oni"));
    assert.deepEqual(character.descritores, ["letal"]);
  });
  it("Pele Grossa: só Blindado, sem bônus de grau (21/10)", () => {
    const { character, bonusAplicado } = comGrausEfetivos(comHabilidade("niosh", null, "pele-grossa"));
    assert.ok(character.descritores.includes("blindado"));
    assert.equal(bonusAplicado.proficiencias.defesaProf, undefined);
  });
  it("Adaptado: 3 proficiências de verdade (21/10, antes era '+1 dado' sem mecanismo)", () => {
    const { character } = comGrausEfetivos(comHabilidade("niosh", null, "adaptado"));
    assert.equal(character.proficiencias.sobrevivencia, "D");
    assert.equal(character.proficiencias.atletismo, "D");
    assert.equal(character.proficiencias.furtividade, "D");
  });
});

describe("Seção 8 — Ningen revisado (21/10)", () => {
  it("Coelho/Bode: sortudo_esquiva + sp_maximo_1 (não mais salto/faro, 21/10, 22/10)", () => {
    const { character } = comGrausEfetivos(comHabilidade("ningen", "coelho-bode", null));
    assert.deepEqual(character.descritores, ["sortudo_esquiva", "sp_maximo_1"]);
  });
  it("Leonino/Reptiliano/Lobo-Canino: Letal geral (não mais desarmado_letal); Leonino e Lobo também ganharam +1 SP (22/10)", () => {
    const leonino = comGrausEfetivos(comHabilidade("ningen", "leonino", null)).character;
    assert.deepEqual(leonino.descritores, ["letal", "sp_maximo_1"]);
    const reptiliano = comGrausEfetivos(comHabilidade("ningen", "reptiliano", null)).character;
    assert.deepEqual(reptiliano.descritores, ["resistente", "letal"]);
    const lobo = comGrausEfetivos(comHabilidade("ningen", "lobo-canino", null)).character;
    assert.deepEqual(lobo.descritores, ["letal", "sp_maximo_1"]);
  });
  it("Garras e Presas: desarmado_perfurante (não mais desarmado_letal/ignora_blindado)", () => {
    const { character } = comGrausEfetivos(comHabilidade("ningen", null, "garras-e-presas"));
    assert.deepEqual(character.descritores, ["desarmado_perfurante"]);
  });
});

describe("Seção 8 — Elfo revisado (21/10)", () => {
  it("Clã Radiante/Noctis perderam o Sortudo incondicional, ganharam Reabastecer", () => {
    const radiante = comGrausEfetivos(comHabilidade("elfo", "cla-radiante", null)).character;
    assert.deepEqual(radiante.descritores, ["reabastecer"]);
    const noctis = comGrausEfetivos(comHabilidade("elfo", "cla-noctis", null)).character;
    assert.deepEqual(noctis.descritores, ["reabastecer"]);
  });
  it("Clã Natrus ganhou Reabastecer", () => {
    const { character } = comGrausEfetivos(comHabilidade("elfo", "cla-natrus", null));
    assert.deepEqual(character.descritores, ["reabastecer"]);
  });
  // 22/10, correção: a proficiência à escolha é regra GERAL do Elfo (vale
  // pros 5 clãs, não só o Corvus) — ver BONUS_GRAU_ESCOLHA_POR_HABILIDADE.
  // O campo antigo `bonusGrauEscolhaRaca` (bônus racial solto, fora de
  // qualquer habilidade) continua um no-op legado; o bônus de verdade
  // agora é por habilidade, em `character.bonusGrauEscolha["cla-corvus"]`,
  // igual qualquer outra escolha de habilidade.
  it("bonusGrauEscolhaRaca (campo antigo) continua um no-op legado", () => {
    const { character } = comGrausEfetivos(comHabilidade("elfo", "cla-corvus", null, { bonusGrauEscolhaRaca: "medicina" }));
    assert.equal(character.proficiencias?.medicina, undefined);
  });
  it("Clã Corvus (e os outros 4 clãs) tem +1 grau numa proficiência à escolha, não-Combate (regra geral do Elfo)", () => {
    const { character } = comGrausEfetivos(comHabilidade("elfo", "cla-corvus", null, {
      bonusGrauEscolha: { "cla-corvus": ["medicina"] },
    }));
    assert.equal(character.proficiencias?.medicina, "D"); // E -> D
    assert.ok(character.proficiencias?.furtividade); // bônus fixo do Corvus continua valendo junto
  });
  it("Resistência à Dor continua igual (mantido, 21/10)", () => {
    const { character } = comGrausEfetivos(comHabilidade("elfo", null, "resistencia-a-dor"));
    assert.deepEqual(character.descritores, ["resistente"]);
  });
});

// Transformação (Ningen, 21/10): Potente Força/Destreza só enquanto ativa.
describe("descritoresDeTransformacaoAtiva", () => {
  it("sem a secundária Transformação escolhida, nunca ativa", () => {
    assert.deepEqual(descritoresDeTransformacaoAtiva({ transformadoAtivo: true }), []);
  });
  it("com a secundária escolhida mas transformadoAtivo false, não concede nada", () => {
    assert.deepEqual(descritoresDeTransformacaoAtiva({ habilidadeSecundaria: "transformacao", transformadoAtivo: false }), []);
  });
  it("com a secundária escolhida e transformadoAtivo true, concede os dois Potentes", () => {
    assert.deepEqual(
      descritoresDeTransformacaoAtiva({ habilidadeSecundaria: "transformacao", transformadoAtivo: true }),
      ["potente_forca", "potente_destreza"],
    );
  });
  it("wired em comGrausEfetivos: Potente Força/Destreza bumpam atributos quando transformado", () => {
    const { character } = comGrausEfetivos({
      raca: "ningen", habilidadeSecundaria: "transformacao", transformadoAtivo: true,
      atributosGerais: { forca: "D", destreza: "D" },
    });
    assert.equal(character.atributosGerais.forca, "C");
    assert.equal(character.atributosGerais.destreza, "C");
  });
});
