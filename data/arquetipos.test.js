// Testes dos arquétipos como disciplinas (04/11, docs/revisao/ATUALIZACAO_04-11.md).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ARQUETIPOS, DISCIPLINAS_ARQUETIPO, BONUS_GRAU_POR_ARQUETIPO, chaveDaProficiencia, idDaVariacao,
  getVariacaoPorId, custoDaHabilidade, tagDaHabilidade, habilidadesDeArquetipoDoPersonagem, idDaHabilidade,
} from "./arquetipos.js";
import { DISCIPLINAS, getDisciplinaPorId } from "./magias.js";
import { bonusGrauDoPersonagem, comGrausEfetivos } from "../racasCatalogo.js";
import { migrarPersonagem } from "../personagens.js";
import { PROFICIENCIAS_LIST } from "../engine.js";

describe("dados (data/arquetipos.json)", () => {
  it("8 arquétipos × 3 variações = 24 disciplinas, cada uma com 6 habilidades (2 gerais)", () => {
    assert.equal(ARQUETIPOS.length, 8);
    assert.equal(DISCIPLINAS_ARQUETIPO.length, 24);
    for (const a of ARQUETIPOS) {
      assert.equal(a.variacoes.length, 3, a.arquetipo);
      for (const v of a.variacoes) {
        assert.equal(v.habilidades.length, 6, v.variacao);
        assert.equal(v.habilidades.filter((h) => h.geral).length, 2, v.variacao);
      }
    }
  });
  it("toda proficiência citada (fixaCombate + outrasFixas) existe no motor — inclusive Magias Gerais", () => {
    for (const a of ARQUETIPOS) {
      for (const v of a.variacoes) {
        for (const nome of [v.fixaCombate, ...v.outrasFixas]) assert.ok(chaveDaProficiencia(nome), `${v.variacao}: ${nome}`);
        const combate = PROFICIENCIAS_LIST.find((p) => p.key === chaveDaProficiencia(v.fixaCombate));
        assert.equal(combate.categoria, "combate", `${v.variacao}: fixaCombate`);
        assert.equal(BONUS_GRAU_POR_ARQUETIPO[idDaVariacao(a.arquetipo, v.variacao)].length, 3, v.variacao);
      }
    }
    assert.equal(chaveDaProficiencia("Magias Gerais"), "magiasGerais");
    assert.equal(chaveDaProficiencia("Armas"), "combateCorpoACorpo");
  });
  it("ids únicos e encontrados em DISCIPLINAS (ofícios continuam lá)", () => {
    const ids = DISCIPLINAS_ARQUETIPO.map((d) => d.id);
    assert.equal(new Set(ids).size, 24);
    assert.equal(getDisciplinaPorId("arquetipo-guerreiro-arcano-runico").variacao, "Rúnico");
    assert.ok(DISCIPLINAS.find((d) => d.id === "oficio-magias-de-guerra"));
  });
});

describe("custo e tag", () => {
  it("custoDaHabilidade", () => {
    assert.deepEqual(custoDaHabilidade("1 MP"), { mp: 1 });
    assert.deepEqual(custoDaHabilidade("2 MP"), { mp: 2 });
    assert.deepEqual(custoDaHabilidade("1 SP"), { sp: 1 });
    assert.deepEqual(custoDaHabilidade("1x por cena"), { porCena: true });
  });
  it("tagDaHabilidade", () => {
    assert.equal(tagDaHabilidade({ geral: true, origem: "Geral do arquétipo" }), "geral");
    assert.equal(tagDaHabilidade({ geral: false, origem: "Compartilhada com Protetor Muralha" }), "compartilhada");
    assert.equal(tagDaHabilidade({ geral: false, origem: "Única" }), "unica");
  });
});

describe("na ficha", () => {
  const slot = (id, extra = {}) => ({ disciplinaId: id, habilidadesAtivas: [], ...extra });
  it("+1 nas 3 fixas + escolha livre de Combate; teto 3", () => {
    const ch = { disciplinas: [slot("arquetipo-guerreiro-modal", { escolhaCombate: "esquiva" })], proficiencias: { combateCorpoACorpo: 3 } };
    assert.deepEqual(bonusGrauDoPersonagem(ch).proficiencias, { combateCorpoACorpo: 1, atletismo: 1, intuicao: 1, esquiva: 1 });
    assert.equal(comGrausEfetivos(ch).character.proficiencias.combateCorpoACorpo, 3); // já no teto
  });
  it("duas variações do mesmo arquétipo: gerais aparecem uma vez só (10 habilidades, não 12)", () => {
    const hs = habilidadesDeArquetipoDoPersonagem([slot("arquetipo-guerreiro-modal"), slot("arquetipo-guerreiro-poder")], { todas: true });
    assert.equal(hs.length, 10);
    assert.equal(hs.filter((h) => h.nome === "Guarda Alta").length, 1);
  });
  it("04/11: começa sem nenhuma habilidade; só as desbloqueadas aparecem", () => {
    assert.equal(habilidadesDeArquetipoDoPersonagem([slot("arquetipo-guerreiro-modal")]).length, 0);
    const hs = habilidadesDeArquetipoDoPersonagem([slot("arquetipo-guerreiro-modal", { habilidadesAtivas: [idDaHabilidade({ nome: "Postura Ofensiva" }), idDaHabilidade({ nome: "Guarda Alta" })] })]);
    assert.deepEqual(hs.map((h) => h.nome).sort(), ["Guarda Alta", "Postura Ofensiva"]);
  });
  it("04/11: geral desbloqueada numa variação vale pra outra do mesmo arquétipo (uma vez só)", () => {
    const hs = habilidadesDeArquetipoDoPersonagem([
      slot("arquetipo-guerreiro-modal", { habilidadesAtivas: [idDaHabilidade({ nome: "Guarda Alta" })] }),
      slot("arquetipo-guerreiro-poder"),
    ]);
    assert.deepEqual(hs.map((h) => h.nome), ["Guarda Alta"]);
  });
  it("04/11: a migração não corta as habilidades desbloqueadas em 3 (vai até as 6)", () => {
    const ids = getVariacaoPorId("arquetipo-guerreiro-modal").habilidades.map(idDaHabilidade);
    const m = migrarPersonagem({ id: "x", name: "X", disciplinas: [slot("arquetipo-guerreiro-modal", { habilidadesAtivas: ids }), null, null] });
    assert.equal(m.disciplinas[0].habilidadesAtivas.length, 6);
  });
  it("slot de arquétipo sobrevive à migração da ficha", () => {
    const m = migrarPersonagem({ id: "x", name: "X", disciplinas: [slot("arquetipo-ladino-gatuno", { escolhaCombate: "esquiva" }), null, null] });
    assert.equal(m.disciplinas[0].disciplinaId, "arquetipo-ladino-gatuno");
    assert.equal(m.disciplinas[0].escolhaCombate, "esquiva");
  });
  it("getVariacaoPorId devolve os dados do JSON", () => {
    assert.equal(getVariacaoPorId("arquetipo-guerreiro-arcano-rúnico"), null);
    assert.equal(getVariacaoPorId("arquetipo-guerreiro-arcano-runico").fixaCombate, "Armas");
  });
});

describe("Mago: ofícios mágicos como arquétipo (04/11)", () => {
  it("os 5 ofícios e a Magia Inata ficam no arquétipo Mago, com nome 'Mago: <variação>'", async () => {
    const { DISCIPLINAS, nomeDaDisciplina, ARQUETIPO_MAGO } = await import("./magias.js");
    const mago = DISCIPLINAS.filter((d) => d.arquetipo === ARQUETIPO_MAGO);
    assert.equal(mago.length, 6);
    assert.equal(nomeDaDisciplina(DISCIPLINAS.find((d) => d.id === "oficio-encantamentos")), "Mago: Encantamentos");
    assert.equal(nomeDaDisciplina(DISCIPLINAS.find((d) => d.id === "magia-inata")), "Mago: Magia Inata");
    assert.equal(nomeDaDisciplina(DISCIPLINAS.find((d) => d.id === "arquetipo-guerreiro-modal")), "Guerreiro: Modal");
    for (const d of mago) assert.ok(d.foco, d.id);
  });
});
