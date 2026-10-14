import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  listaRacas, encontrarRaca, encontrarPrincipal, encontrarSecundaria,
  descritoresDeSelecao, migrarSelecaoRacaLegado, temDescritor,
  CATALOGO_RACAS, BONUS_GRAU_POR_HABILIDADE, BONUS_GRAU_ESCOLHA_POR_HABILIDADE,
  BONUS_GRAU_ESCOLHA_POR_RACA, BONUS_OFICIO_EXTRA_POR_HABILIDADE,
  bonusGrauDoPersonagem, grauComBonus, comGrausEfetivos,
  oficiosExtrasDoPersonagem, tetoGrauDoPersonagem,
  disciplinasDoPersonagem, oficiosMagicosDoPersonagem, temMagiaInataDoPersonagem, magiasAtivasDoPersonagem,
  temEncaixeExtraDeDisciplina,
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
    assert.deepEqual(migrado, { raca: null, habilidadePrincipal: null, habilidadeSecundaria: null, disciplinaHumano: null, descritores: [], bonusGrauEscolha: {} });
  });

  it("esquema novo já presente (mesmo com valores null) não é tocado", () => {
    const ch = { raca: "humano", habilidadePrincipal: "mana-concentrada", habilidadeSecundaria: null, disciplinaHumano: { nome: "Alquimia", grau: "D" }, descritores: [], bonusGrauEscolha: { "mana-concentrada": "investigacao" } };
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

  it("cobertura esperada: 22 habilidades distintas (21 com bônus fixo, 2 à escolha, Homúnculo nas duas — catálogo v3, 13/10)", () => {
    assert.equal(idsMapeados.size, 22);
    assert.equal(Object.keys(BONUS_GRAU_POR_HABILIDADE).length, 21);
    assert.equal(Object.keys(BONUS_GRAU_ESCOLHA_POR_HABILIDADE).length, 2);
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

  it("Disciplina 'Ofício Mágico: Magias de guerra' dá +1 em Magias Gerais (mantém o bônus do antigo Ofício Mágico)", () => {
    const bonus = bonusGrauDoPersonagem({ disciplinas: [{ disciplinaId: "oficio-magias-de-guerra", habilidadesAtivas: [] }] });
    assert.deepEqual(bonus, { proficiencias: { magiasGerais: 1 }, atributos: {} });
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

  it("Descendentes de Sharkan (niosh) NÃO dá bônus de grau (perdeu o +1 em Força na atualização de 13/10)", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "niosh", habilidadePrincipal: "descendentes-de-sharkan" });
    assert.deepEqual(bonus, { proficiencias: {}, atributos: {} });
  });

  it("Descendentes de Sabato (niosh) dá +1 em Força — vem só do efeito, não do bonus[] do catálogo", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "niosh", habilidadePrincipal: "descendentes-de-sabato" });
    assert.deepEqual(bonus, { proficiencias: {}, atributos: { forca: 1 } });
  });

  it("Goethiano (secundária humana) dá +1 em Vigor", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "humano", habilidadeSecundaria: "goethiano" });
    assert.deepEqual(bonus, { proficiencias: {}, atributos: { vigor: 1 } });
  });

  it("Goethiano sobe Vigor até A, sem teto C (14/10)", () => {
    const { character, bonusAplicado } = comGrausEfetivos({ raca: "humano", habilidadeSecundaria: "goethiano", atributosGerais: { vigor: "C" } });
    assert.equal(character.atributosGerais.vigor, "B");
    assert.equal(bonusAplicado.atributos.vigor, 1);
  });

  it("Homúnculo dá +1 fixo em Atletismo mesmo sem escolha de Força/Destreza feita", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "humano", habilidadeSecundaria: "homunculo" });
    assert.deepEqual(bonus, { proficiencias: { atletismo: 1 }, atributos: {} });
  });

  it("Homúnculo soma também o bônus à escolha quando o jogador escolheu Força", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "humano", habilidadeSecundaria: "homunculo", bonusGrauEscolha: { homunculo: "forca" } });
    assert.deepEqual(bonus, { proficiencias: { atletismo: 1 }, atributos: { forca: 1 } });
  });

  it("Homúnculo com escolha em Destreza bonifica destreza, não força", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "humano", habilidadeSecundaria: "homunculo", bonusGrauEscolha: { homunculo: "destreza" } });
    assert.deepEqual(bonus, { proficiencias: { atletismo: 1 }, atributos: { destreza: 1 } });
  });

  it("Homúnculo com escolha fora das opções válidas (ex.: vigor) ignora a escolha", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "humano", habilidadeSecundaria: "homunculo", bonusGrauEscolha: { homunculo: "vigor" } });
    assert.deepEqual(bonus, { proficiencias: { atletismo: 1 }, atributos: {} });
  });

  it("Mana Concentrada sem escolha não dá bônus de grau nenhum", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "humano", habilidadePrincipal: "mana-concentrada" });
    assert.deepEqual(bonus, { proficiencias: {}, atributos: {} });
  });

  it("Mana Concentrada com escolha de proficiência soma o bônus nela", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "humano", habilidadePrincipal: "mana-concentrada", bonusGrauEscolha: { "mana-concentrada": "furtividade" } });
    assert.deepEqual(bonus, { proficiencias: { furtividade: 1 }, atributos: {} });
  });

  it("Mana Estática (humano) dá +1 em Resistência Física, teto C (14/10: Resistência Mágica saiu)", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "humano", habilidadePrincipal: "mana-estatica" });
    assert.deepEqual(bonus, { proficiencias: { resistFisicaProf: 1 }, atributos: {} });
    const { character } = comGrausEfetivos({ raca: "humano", habilidadePrincipal: "mana-estatica", proficiencias: { resistFisicaProf: "C" } });
    assert.equal(character.proficiencias.resistFisicaProf, "C"); // teto C, não sobe mais
  });

  it("Pele Grossa (niosh) dá +1 em Resistência Física sem teto C, até A (14/10: Resistência Mágica saiu)", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "niosh", habilidadeSecundaria: "pele-grossa" });
    assert.deepEqual(bonus, { proficiencias: { resistFisicaProf: 1 }, atributos: {} });
    const { character } = comGrausEfetivos({ raca: "niosh", habilidadeSecundaria: "pele-grossa", proficiencias: { resistFisicaProf: "C" } });
    assert.equal(character.proficiencias.resistFisicaProf, "B"); // sem teto C
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

  it("habilidade sem bônus de grau (ex.: Mana Fluida) não aparece no resultado", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "humano", habilidadePrincipal: "mana-fluida" });
    assert.deepEqual(bonus, { proficiencias: {}, atributos: {} });
  });

  it("Elfo com bonusGrauEscolhaRaca válido (não-combate) soma o bônus — 'todo tipo de elfo' (14/10)", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "elfo", bonusGrauEscolhaRaca: "sobrevivencia" });
    assert.deepEqual(bonus, { proficiencias: { sobrevivencia: 1 }, atributos: {} });
  });

  it("Humano com bonusGrauEscolhaRaca válido soma o bônus — 'todo tipo de humano' (14/10)", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "humano", bonusGrauEscolhaRaca: "academicos" });
    assert.deepEqual(bonus, { proficiencias: { academicos: 1 }, atributos: {} });
  });

  it("bonusGrauEscolhaRaca com uma proficiência de Combate é inválido (ignorado) — só não-combate", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "elfo", bonusGrauEscolhaRaca: "resistFisicaProf" });
    assert.deepEqual(bonus, { proficiencias: {}, atributos: {} });
  });

  it("bonusGrauEscolhaRaca sem escolha feita ainda não dá bônus nenhum", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "elfo" });
    assert.deepEqual(bonus, { proficiencias: {}, atributos: {} });
  });

  it("raças sem bônus-à-escolha racial (ex.: Niosh) ignoram bonusGrauEscolhaRaca", () => {
    const bonus = bonusGrauDoPersonagem({ raca: "niosh", bonusGrauEscolhaRaca: "sobrevivencia" });
    assert.deepEqual(bonus, { proficiencias: {}, atributos: {} });
  });
});

describe("racasCatalogo — tetoGrauDoPersonagem", () => {
  it("habilidade sem teto declarado não aparece no resultado (usa o default C em comGrausEfetivos)", () => {
    const tetos = tetoGrauDoPersonagem({ raca: "ningen", habilidadePrincipal: "leonino" });
    assert.deepEqual(tetos, { proficiencias: {}, atributos: {} });
  });

  it("Goethiano (teto A) aparece no atributos.vigor", () => {
    const tetos = tetoGrauDoPersonagem({ raca: "humano", habilidadeSecundaria: "goethiano" });
    assert.deepEqual(tetos, { proficiencias: {}, atributos: { vigor: "A" } });
  });

  it("Pele Grossa (teto A) aparece em proficiencias.resistFisicaProf", () => {
    const tetos = tetoGrauDoPersonagem({ raca: "niosh", habilidadeSecundaria: "pele-grossa" });
    assert.deepEqual(tetos, { proficiencias: { resistFisicaProf: "A" }, atributos: {} });
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
