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

  // A migração de statBase (Defesa/Resistência Armadura padrão antigo,
  // remoção de Resistência Natural) saiu em 15/10 junto com o painel
  // "Estatísticas de Combate"/STAT_LIST (ver engine.js) — fichas antigas
  // mantêm o que já estava salvo em `ch.statBase`, só não é mais migrado.
  it("preserva statBase de fichas antigas sem migrar (campo não lido por nada hoje)", () => {
    const migrado = migrarPersonagem({ id: "x", name: "X", statBase: { defesa: 0, resistArmadura: 7, resistNatural: 6 } });
    assert.deepEqual(migrado.statBase, { defesa: 0, resistArmadura: 7, resistNatural: 6 });
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
