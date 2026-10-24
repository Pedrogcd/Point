// Testes da migração de personagens (ver personagens.js) — extraída do bloco
// que antes vivia só dentro do useEffect de carregamento em
// point-amaranth-app.jsx, pra poder ser testada isolada e reutilizada também
// na importação de backup (ver normalizar.test.js).
// Roda com `node --test` (Node >=20, nativo, sem dependências) ou `npm test`.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { migrarPersonagem, migrarPersonagens } from "./personagens.js";
import { bonusGrauDoPersonagem, grauComBonus, comGrausEfetivos } from "./racasCatalogo.js";

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

  it("ficha nova (sem attacks) recebe os ataques padrão", () => {
    const migrado = migrarPersonagem({ id: "x", name: "X" });
    const nomes = migrado.attacks.map((a) => a.nome);
    assert.ok(nomes.length >= 3);
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

  it("remove Resistência Natural do statBase (não existe mais no sistema novo)", () => {
    const migrado = migrarPersonagem({
      id: "x", name: "X",
      statBase: { resistNatural: 6, resistNaturalFisica: 6, resistNaturalMagica: 6 },
    });
    assert.equal("resistNatural" in migrado.statBase, false);
    assert.equal("resistNaturalFisica" in migrado.statBase, false);
    assert.equal("resistNaturalMagica" in migrado.statBase, false);
  });

  it("14/10 (docs/MUDANCAS_RACAS_E_MAGIA.md): tecnicaProf/manipulacaoManaProf não existem mais depois da migração", () => {
    const migrado = migrarPersonagem({ id: "x", name: "X", proficiencias: { tecnicaProf: "B" } });
    assert.equal("tecnicaProf" in migrado.proficiencias, false);
    assert.equal("manipulacaoManaProf" in migrado.proficiencias, false);
  });

  it("14/10: magiasOfensivas/resistMagicaProf também somem da ficha migrada", () => {
    const migrado = migrarPersonagem({
      id: "x", name: "X",
      proficiencias: { magiasOfensivas: "B", resistMagicaProf: "A", manipulacaoManaProf: "C" },
    });
    assert.equal("magiasOfensivas" in migrado.proficiencias, false);
    assert.equal("resistMagicaProf" in migrado.proficiencias, false);
    assert.equal("manipulacaoManaProf" in migrado.proficiencias, false);
  });

  // Defesa substitui Resistência Física (21/10, docs/ATUALIZACAO_21-10.md
  // item 1): migração não-destrutiva — a nova Defesa recebe o grau que
  // estava em Resistência Física, só na primeira vez; o grau antigo fica
  // preservado em proficienciasLegado.resistFisicaProf (não apaga).
  describe("21/10: Defesa substitui Resistência Física", () => {
    it("resistFisicaProf não existe mais depois da migração", () => {
      const migrado = migrarPersonagem({ id: "x", name: "X", proficiencias: { resistFisicaProf: "C" } });
      assert.equal("resistFisicaProf" in migrado.proficiencias, false);
    });

    it("a Defesa recebe o grau que estava em Resistência Física (e, 24/10, passa pra Esquiva e Bloqueio)", () => {
      const migrado = migrarPersonagem({ id: "x", name: "X", proficiencias: { resistFisicaProf: "C" } });
      assert.equal(migrado.proficiencias.esquiva, 3);
      assert.equal(migrado.proficiencias.bloqueio, 3);
      assert.equal(migrado.proficienciasLegado.defesaProf, "C");
    });

    it("o grau antigo fica preservado em proficienciasLegado.resistFisicaProf (não apaga)", () => {
      const migrado = migrarPersonagem({ id: "x", name: "X", proficiencias: { resistFisicaProf: "C" } });
      assert.equal(migrado.proficienciasLegado.resistFisicaProf, "C");
    });

    it("sem resistFisicaProf nem defesaProf salvos, Esquiva/Bloqueio ficam no padrão 'E'", () => {
      const migrado = migrarPersonagem({ id: "x", name: "X" });
      assert.equal(migrado.proficiencias.esquiva, 1);
      assert.equal(migrado.proficiencias.bloqueio, 1);
      assert.equal(migrado.proficienciasLegado.resistFisicaProf, undefined);
    });

    it("idempotente: migrar duas vezes não sobrescreve uma Esquiva editada manualmente depois da 1ª migração", () => {
      const primeiraVez = migrarPersonagem({ id: "x", name: "X", proficiencias: { resistFisicaProf: "C" } });
      const editado = { ...primeiraVez, proficiencias: { ...primeiraVez.proficiencias, esquiva: "A" } };
      const segundaVez = migrarPersonagem(editado);
      assert.equal(segundaVez.proficiencias.esquiva, 5);
      assert.equal(segundaVez.proficienciasLegado.resistFisicaProf, "C");
    });

    it("preserva proficienciasLegado já existente de outras migrações", () => {
      const migrado = migrarPersonagem({ id: "x", name: "X", proficienciasLegado: { outraCoisa: "D" }, proficiencias: { resistFisicaProf: "B" } });
      assert.equal(migrado.proficienciasLegado.outraCoisa, "D");
      assert.equal(migrado.proficienciasLegado.resistFisicaProf, "B");
    });
  });

  it("14/10 (docs/DISCIPLINAS_MAGIA.md): disciplinas nasce [null,null,null] pra quem não tinha nada", () => {
    const migrado = migrarPersonagem({ id: "x", name: "X" });
    assert.deepEqual(migrado.disciplinas, [null, null, null]);
  });

  it("disciplinaMagica.tipo 'magia-inata' (13/10, legado) migra pro slot magia-inata", () => {
    const migrado = migrarPersonagem({ id: "x", name: "X", disciplinaMagica: { tipo: "magia-inata" } });
    assert.deepEqual(migrado.disciplinas, [{ disciplinaId: "magia-inata", habilidadesAtivas: [] }, null, null]);
  });

  it("disciplinaMagica.oficiosMagicos (14/10 anterior, legado) migra os ids remapeados pro catálogo novo", () => {
    const migrado = migrarPersonagem({
      id: "x", name: "X",
      disciplinaMagica: { oficiosMagicos: ["magias-de-guerra", "alquimia"], magiasAtivas: ["shin", "tiro_magico"] },
    });
    assert.deepEqual(migrado.disciplinas, [
      { disciplinaId: "oficio-magias-de-guerra", habilidadesAtivas: ["shin", "tiro_magico"] }, // magiasAtivas vai pro ofício com magias
      { disciplinaId: "oficio-alquimia", habilidadesAtivas: [] },
      null,
    ]);
  });

  it("oficiosMagicos + magiaInata (legado) juntos: ofícios primeiro, magia inata depois, até 3 slots", () => {
    const migrado = migrarPersonagem({
      id: "x", name: "X",
      disciplinaMagica: { oficiosMagicos: ["magias-de-guerra", "encantamentos", "alquimia"], magiaInata: true },
    });
    assert.equal(migrado.disciplinas.length, 3);
    assert.deepEqual(migrado.disciplinas.map((d) => d?.disciplinaId), ["oficio-magias-de-guerra", "oficio-encantamentos", "oficio-alquimia"]);
    // magia-inata não coube nos 3 slots (3 ofícios já ocuparam tudo) — fica de fora, registrado no relatório.
  });

  it("Classes (texto livre antigo) cujo nome bate com uma disciplina do catálogo migra automaticamente", () => {
    const migrado = migrarPersonagem({
      id: "x", name: "X",
      classes: [{ name: "Ofício Mágico: Magias de guerra", description: "" }, { name: "Duelista de Estoc", description: "" }],
    });
    // "Duelista de Estoc" não bate com nada do catálogo atual (só disciplinas mágicas) — fica de fora.
    assert.deepEqual(migrado.disciplinas, [{ disciplinaId: "oficio-magias-de-guerra", habilidadesAtivas: [] }, null, null]);
  });

  it("character.disciplinas já no formato novo é normalizado (preenchido/cortado pra 3, disciplinaId desconhecido descartado)", () => {
    const migrado = migrarPersonagem({
      id: "x", name: "X",
      disciplinas: [{ disciplinaId: "magia-inata", habilidadesAtivas: ["shin"] }, { disciplinaId: "sei-la-o-que", habilidadesAtivas: [] }],
    });
    assert.deepEqual(migrado.disciplinas, [{ disciplinaId: "magia-inata", habilidadesAtivas: ["shin"] }, null, null]);
  });

  it("14/10: visivelJogador nasce false (só-GM) pra ficha sem esse campo", () => {
    const migrado = migrarPersonagem({ id: "x", name: "X" });
    assert.equal(migrado.visivelJogador, false);
  });

  it("14/10: preserva visivelJogador=true já salvo (não reseta quem o GM já liberou)", () => {
    const migrado = migrarPersonagem({ id: "x", name: "X", visivelJogador: true });
    assert.equal(migrado.visivelJogador, true);
  });

  it("14/10 (mesmo dia): disciplinaExtraHumano nasce null pra ficha sem esse campo", () => {
    const migrado = migrarPersonagem({ id: "x", name: "X" });
    assert.equal(migrado.disciplinaExtraHumano, null);
  });

  it("14/10 (mesmo dia): preserva um disciplinaExtraHumano já salvo", () => {
    const valor = { disciplinaId: "magia-inata", habilidadesAtivas: ["shin"] };
    const migrado = migrarPersonagem({ id: "x", name: "X", disciplinaExtraHumano: valor });
    assert.deepEqual(migrado.disciplinaExtraHumano, valor);
  });

  it("14/10 (mesmo dia): disciplinaHumano antigo (texto livre) continua preservado, intocado", () => {
    const valor = { nome: "Escola de Magia", grau: "C" };
    // raca precisa estar presente (mesmo null) pra cair no esquema novo de
    // migrarSelecaoRacaLegado — sem isso, a ficha é tratada como do esquema
    // bem antigo (racaId) e disciplinaHumano é zerado ali, não por este campo.
    const migrado = migrarPersonagem({ id: "x", name: "X", raca: "humano", disciplinaHumano: valor });
    assert.deepEqual(migrado.disciplinaHumano, valor);
  });

  it("hp.superficiais nasce em 0 pra ficha sem esse campo", () => {
    const migrado = migrarPersonagem({ id: "x", name: "X" });
    assert.equal(migrado.hp.superficiais, 0);
  });

  it("preserva hp.superficiais já salvo", () => {
    const migrado = migrarPersonagem({ id: "x", name: "X", hp: { current: 3, max: 5, superficiais: 2 } });
    assert.equal(migrado.hp.superficiais, 2);
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
    assert.equal(migrado.proficiencias.esquiva, 2);
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
    assert.deepEqual(migrado.hp, { current: 1, max: 4, superficiais: 0 });
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

describe("migrarPersonagem — imagemPos (enquadramento do retrato)", () => {
  it("ficha salva antes do campo `imagemPos` existir ganha o padrão centralizado/sem zoom", () => {
    const migrado = migrarPersonagem({ id: "x", name: "X" });
    assert.deepEqual(migrado.imagemPos, { y: 50, zoom: 1 });
  });

  it("preserva um imagemPos customizado já salvo", () => {
    const migrado = migrarPersonagem({ id: "x", name: "X", imagemPos: { y: 20, zoom: 2 } });
    assert.deepEqual(migrado.imagemPos, { y: 20, zoom: 2 });
  });

  it("completa campos parciais de um imagemPos salvo incompleto (ex: só y)", () => {
    const migrado = migrarPersonagem({ id: "x", name: "X", imagemPos: { y: 30 } });
    assert.deepEqual(migrado.imagemPos, { y: 30, zoom: 1 });
  });
});

describe("migrarPersonagem — supressão do bônus de grau fixo na inferência por texto livre (22/10, bug da Raiko)", () => {
  it("Raiko (Niosh/Arcani por texto livre): o +1 Força fixo de toda Niosh fica suprimido — base continua C, sem nenhum bônus de grau somando (nada 'aumentando a Força', como pedido)", () => {
    const raiko = {
      id: "raiko", name: "Raiko",
      race: "Niosh (Oni, descendente de Arcani)",
      racialAbility: { name: "Niosh — Agressividade Oni · Descendente de Arcani", description: "" },
      atributosGerais: { forca: "C" },
    };
    const migrado = migrarPersonagem(raiko);
    assert.equal(migrado.raca, "niosh");
    assert.equal(migrado.habilidadePrincipal, "descendentes-de-arcani");
    // Base salva não muda...
    assert.equal(migrado.atributosGerais.forca, 3);
    // ...e o bônus de grau em Força fica zerado (suprimido), não só no teto.
    const bonus = bonusGrauDoPersonagem(migrado);
    assert.equal(bonus.atributos.forca || 0, 0);
    assert.equal(grauComBonus(migrado.atributosGerais.forca, bonus.atributos.forca || 0), 3);
  });

  it("a supressão persiste (fica salva na ficha) e a segunda migração é idempotente", () => {
    const primeira = migrarPersonagem({
      id: "raiko", name: "Raiko",
      race: "Niosh (Oni, descendente de Arcani)",
      racialAbility: { name: "Niosh — Agressividade Oni · Descendente de Arcani", description: "" },
      atributosGerais: { forca: "C" },
    });
    assert.deepEqual(primeira.bonusGrauFixoSuprimido, [{ tipo: "atributo", chave: "forca" }]);
    const segunda = migrarPersonagem(primeira);
    assert.deepEqual(segunda, primeira);
    assert.equal(bonusGrauDoPersonagem(segunda).atributos.forca || 0, 0);
  });

  it("não suprime raça escolhida explicitamente pela UI (character.raca já vem preenchido, não é inferência) — o +1 Força vale normal", () => {
    const migrado = migrarPersonagem({
      id: "x", name: "X", raca: "niosh", habilidadePrincipal: "descendentes-de-arcani",
      atributosGerais: { forca: "C" },
    });
    assert.equal(migrado.atributosGerais.forca, 3);
    assert.equal(bonusGrauDoPersonagem(migrado).atributos.forca, 1);
  });
});

describe("migrarPersonagem — migração dos Encantamentos/Alquimia renomeados (23/10)", () => {
  it("remapeia os 7 ids antigos de encantamentosAtivos pros novos, preservando a mana quebrada", () => {
    const migrado = migrarPersonagem({
      id: "x", name: "X",
      encantamentosAtivos: ["lamina_letal", "ponta_perfurante", "golpe_preciso", "encantamento_flamejante", "pele_encantada", "sorte_encantada", "encantamento_eletrico"],
      mp: { current: 0, max: 3, quebrada: 7 },
    });
    assert.deepEqual(migrado.encantamentosAtivos, [
      "encantamento_letal", "encantamento_perfurante", "encantamento_preciso_1", "encantamento_queimadura_1",
      "encantamento_resistente", "encantamento_sortudo", "encantamento_carga_2",
    ]);
    // mana quebrada não mexe nessa migração (só os ids de ENCANTAMENTOS mudam).
    assert.equal(migrado.mp.quebrada, 7);
  });

  it("um id já no formato novo (ex.: encantamento_drenante) passa intocado", () => {
    const migrado = migrarPersonagem({ id: "x", name: "X", encantamentosAtivos: ["encantamento_drenante"] });
    assert.deepEqual(migrado.encantamentosAtivos, ["encantamento_drenante"]);
  });

  it("remove Antídoto/Elixir Drenante de itensAlquimicosAtivos e devolve a mana que eles tinham quebrado", () => {
    const migrado = migrarPersonagem({
      id: "x", name: "X",
      itensAlquimicosAtivos: ["antidoto", "poção_de_cura", "elixir_drenante"],
      mp: { current: 0, max: 3, quebrada: 2 },
    });
    assert.deepEqual(migrado.itensAlquimicosAtivos, ["poção_de_cura"]);
    assert.equal(migrado.mp.quebrada, 0);
    assert.equal(migrado.mp.current, 2);
  });

  it("é idempotente: migrar duas vezes não muda o resultado", () => {
    const uma = migrarPersonagem({
      id: "x", name: "X",
      encantamentosAtivos: ["pele_encantada"],
      itensAlquimicosAtivos: ["antidoto"],
      mp: { current: 2, max: 3, quebrada: 1 },
    });
    const duas = migrarPersonagem(uma);
    assert.deepEqual(duas, uma);
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

describe("migrarPersonagem — passivaAnterior de Magias de guerra (23/10, segunda parte)", () => {
  it("preserva passivaAnterior e a habilidade de proficiência no slot", () => {
    const ch = migrarPersonagem({ id: "x", name: "X", disciplinas: [{ disciplinaId: "oficio-magias-de-guerra", habilidadesAtivas: ["shin", "proficiencia_armaduras"], passivaAnterior: true }, null, null] });
    assert.equal(ch.disciplinas[0].passivaAnterior, true);
    assert.deepEqual(ch.disciplinas[0].habilidadesAtivas, ["shin", "proficiencia_armaduras"]);
    assert.equal("passivaAnterior" in (migrarPersonagem({ id: "y", name: "Y", disciplinas: [{ disciplinaId: "oficio-alquimia", habilidadesAtivas: [] }] }).disciplinas[0]), false);
  });
});

describe("migrarPersonagem — correção pontual da Raiko (24/10, 3ª volta do bônus de Força fantasma)", () => {
  // Formato da ficha salva no Supabase em 24/10: racialAbility vazio,
  // supressão gravada vazia, Força base D.
  const salva = {
    id: "sp_raiko", name: "Raiko", race: "Niosh (Oni, descendente de Arcani)",
    racialAbility: { name: "", description: "" },
    raca: "niosh", habilidadePrincipal: "descendentes-de-arcani", habilidadeSecundaria: "pele-grossa",
    bonusGrauFixoSuprimido: [],
    atributosGerais: { forca: "D", vigor: "E", carisma: "D" },
  };
  it("suprime o +1 Força de Niosh e devolve a base pra C, marcando a correção", () => {
    const ch = migrarPersonagem(salva);
    assert.deepEqual(ch.bonusGrauFixoSuprimido, [{ tipo: "atributo", chave: "forca" }]);
    assert.equal(ch.atributosGerais.forca, 3);
    assert.equal(ch.correcaoForcaRaiko2410, true);
    assert.equal(bonusGrauDoPersonagem(ch).atributos.forca, undefined);
  });
  it("roda uma vez só: depois da marca, respeita o que estiver salvo", () => {
    const ch = migrarPersonagem({ ...salva, correcaoForcaRaiko2410: true });
    assert.deepEqual(ch.bonusGrauFixoSuprimido, []);
    assert.equal(ch.atributosGerais.forca, 2);
  });
  it("não mexe em outras fichas", () => {
    const ch = migrarPersonagem({ ...salva, id: "outra" });
    assert.equal(ch.atributosGerais.forca, 2);
    assert.equal("correcaoForcaRaiko2410" in ch, false);
  });
});

describe("migrarPersonagem — proficiências de combate 24/10 (docs/ATUALIZACAO_24-10.md seção 0.6)", () => {
  const base = (extra = {}) => ({ id: "x", name: "X", proficiencias: { defesaProf: "D", combateCorpoACorpo: "C", armasDeFogo: "B" }, ...extra });
  it("Esquiva e Bloqueio recebem a antiga Defesa; defesaProf vai pro legado", () => {
    const m = migrarPersonagem(base());
    assert.equal(m.proficiencias.esquiva, 2);
    assert.equal(m.proficiencias.bloqueio, 2);
    assert.equal("defesaProf" in m.proficiencias, false);
    assert.equal(m.proficienciasLegado.defesaProf, "D");
  });
  it("Armas Corpo a Corpo e Armas de Fogo mantêm o valor; Desarmado, Distância, Fortitude e Vontade começam em F", () => {
    const m = migrarPersonagem(base());
    assert.equal(m.proficiencias.combateCorpoACorpo, 3);
    assert.equal(m.proficiencias.armasDeFogo, 4);
    for (const k of ["desarmado", "armasADistancia", "fortitude", "vontade"]) assert.equal(m.proficiencias[k], 0, k);
  });
  it("Magia Ofensiva: base tal que o efetivo = mínimo(C, ofícios antigos) — Encantamentos + Alquimia = 2 ofícios -> base D", () => {
    const m = migrarPersonagem(base({ disciplinas: [{ disciplinaId: "oficio-encantamentos", habilidadesAtivas: [] }, { disciplinaId: "oficio-alquimia", habilidadesAtivas: [] }, null] }));
    assert.equal(m.proficiencias.magiaOfensiva, 2);
  });
  it("Magias de guerra + Conduíte (2 ofícios antigos): fixa +1 e Conduíte +1 já cobrem -> base F, efetivo D", () => {
    const m = migrarPersonagem(base({ conduiteAtivo: true, disciplinas: [{ disciplinaId: "oficio-magias-de-guerra", habilidadesAtivas: [] }, null, null] }));
    assert.equal(m.proficiencias.magiaOfensiva, 0);
    assert.equal(comGrausEfetivos(m).character.proficiencias.magiaOfensiva, 2);
  });
  it("sem ofício nenhum: Magia Ofensiva F", () => {
    assert.equal(migrarPersonagem(base()).proficiencias.magiaOfensiva, 0);
  });
  it("ataque desarmado passa a usar Desarmado", () => {
    const m = migrarPersonagem(base({ attacks: [{ nome: "Ataque desarmado", tipo: "marcial", profKey: "combateCorpoACorpo", ehDesarmado: true }] }));
    assert.equal(m.attacks.find((a) => a.nome === "Ataque desarmado").profKey, "desarmado");
  });
  it("idempotente: segunda migração não mexe (Esquiva editada fica)", () => {
    const m1 = migrarPersonagem(base());
    const m2 = migrarPersonagem({ ...m1, proficiencias: { ...m1.proficiencias, esquiva: "A", desarmado: "C" } });
    assert.equal(m2.proficiencias.esquiva, 5);
    assert.equal(m2.proficiencias.desarmado, 3);
    assert.equal(m2.proficienciasLegado.defesaProf, "D");
  });
  it("preserva escolhaCombate do slot de disciplina", () => {
    const m = migrarPersonagem(base({ disciplinas: [{ disciplinaId: "magia-inata", habilidadesAtivas: [], escolhaCombate: "esquiva" }, null, null] }));
    assert.equal(m.disciplinas[0].escolhaCombate, "esquiva");
  });
});
