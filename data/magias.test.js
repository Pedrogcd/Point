// Testes do catálogo de magias (data/magias.js) — ver docs/ATUALIZACAO_23-
// 10.md (complementa docs/ATUALIZACAO_21-10.md). Roda com `node --test` ou
// `npm test`.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MAGIAS, getMagiaPorId, ENCANTAMENTOS, getEncantamentoPorId, descritoresDeEncantamentosAtivos,
  CONDUITE_MAGICO, ALQUIMIA, getItemAlquimicoPorId, CONSTRUCTO, getConstructoPorId,
  INVOCACAO, getInvocacaoPorId, descritoresDeInvocacoesAtivas,
  HABILIDADES_CONJUNTAS, getHabilidadeConjuntaPorId, DISCIPLINAS,
  BONUS_GRAU_POR_OFICIO, PASSIVA_POR_OFICIO, getPassivaDoOficio,
  PROFICIENCIAS_DE_OFICIO, getProficienciaDeOficioPorId, getHabilidadeDeOficioPorId,
  periciasDeOficio, periciaDeOficioCobreArma, periciaDeOficioCobreArmadura, escolhaCombateDoSlot, treinoDeOficioNaProficiencia,
} from "./magias.js";
import { PROFICIENCIAS_LIST } from "../engine.js";
import { getArmaPorId } from "./armas.js";
import { getArmaduraPorId } from "./armaduras.js";

describe("MAGIAS (23/10, docs/ATUALIZACAO_23-10.md seção 3/4/7)", () => {
  it("tem as 12 magias de guerra + Sensor (compartilhado) + Dreno de Mana (Encantamentos) + 3 de Invocação (Lança Longínqua/Chuva de Lâminas/Chama Mágica) = 17 entradas", () => {
    assert.equal(MAGIAS.length, 17);
  });
  it("toda magia tem o descritor 'magia', exceto Lança Longínqua e Chuva de Lâminas (o documento não lista 'Magia' pra elas, só Invocação)", () => {
    const semMagiaExplicita = new Set(["lanca_longinqua", "chuva_de_laminas"]);
    for (const m of MAGIAS) {
      if (semMagiaExplicita.has(m.id)) continue;
      assert.ok(m.descritores.includes("magia"), `${m.nome} deveria ter o descritor "magia"`);
    }
  });
  it("Escudo de Mana não rola (semRolagem) e tem efeito descrito em texto", () => {
    const escudo = getMagiaPorId("escudo_de_mana");
    assert.equal(escudo.semRolagem, true);
    assert.equal(typeof escudo.efeito, "string");
    assert.ok(escudo.efeito.length > 0);
  });
  it("Sensor (23/10) tem custo definido (1 MP), não é mais placeholder, e não pertence a um ofício específico", () => {
    const sensor = getMagiaPorId("sensor");
    assert.equal(sensor.placeholder, undefined);
    assert.equal(sensor.custoMp, 1);
    assert.equal(sensor.disciplinaId, undefined);
  });
  it("Mísseis Mágicos tem ajusteDados +1 (Base mágica + 1 + Ofícios/Inteligência)", () => {
    assert.equal(getMagiaPorId("misseis_magicos").ajusteDados, 1);
  });
  it("magias marcadas 'superficial' no guia têm o campo superficial=true", () => {
    assert.equal(getMagiaPorId("shin").superficial, true);
    assert.equal(getMagiaPorId("misseis_magicos").superficial, true);
    assert.equal(getMagiaPorId("magia_de_guerra_maxis").superficial, true);
    assert.equal(getMagiaPorId("bombardeio_de_mana").superficial, false);
  });
  it("magias 'Em área' têm emArea=true", () => {
    for (const id of ["bombardeio_de_mana", "shin", "magia_de_guerra_maxis", "chuva_de_laminas"]) {
      assert.equal(getMagiaPorId(id).emArea, true, id);
    }
  });
  it("getMagiaPorId retorna null pra id desconhecido", () => {
    assert.equal(getMagiaPorId("inexistente"), null);
  });

  // 23/10: Torrente Mágica ganhou Pesado e baixou de 3 pra 2 MP.
  it("Torrente Mágica: Letal + Pesado, custa 2 MP, 2 ferimentos", () => {
    const t = getMagiaPorId("torrente_magica");
    assert.deepEqual(t.descritores, ["magia", "letal", "pesado"]);
    assert.equal(t.custoMp, 2);
    assert.equal(t.feridas, 2);
  });
  it("Shin: Esmagador 1 (não mais Preciso 2)", () => {
    assert.deepEqual(getMagiaPorId("shin").descritores, ["magia", "em_area", "esmagador_1"]);
  });
  it("Shin-kay: ganhou Esmagador 1", () => {
    assert.deepEqual(getMagiaPorId("shin_kay").descritores, ["magia", "letal", "esmagador_1"]);
  });
  it("Magia de guerra Suth: sem Atrasada 1 (iniciativa não é acompanhada)", () => {
    assert.deepEqual(getMagiaPorId("magia_de_guerra_suth").descritores, ["magia", "preciso_2", "sortudo"]);
  });
  it("Magia de guerra Maxis: ganhou Lento 1", () => {
    assert.ok(getMagiaPorId("magia_de_guerra_maxis").descritores.includes("lento_1"));
  });
  it("Magia de guerra Katalão: sem Sortudo", () => {
    assert.deepEqual(getMagiaPorId("magia_de_guerra_katalao").descritores, ["magia", "perfurante", "letal"]);
  });

  // Chama Mágica (23/10): veio de Magias de guerra pra Invocação.
  it("Chama Mágica pertence a Invocação, tem Queimadura 2 e nenhum ferimento próprio", () => {
    const chama = getMagiaPorId("chama_magica");
    assert.ok(chama, "Chama Mágica deveria existir no catálogo");
    assert.equal(chama.disciplinaId, "oficio-invocacao");
    assert.deepEqual(chama.descritores, ["magia", "queimadura_2"]);
    assert.equal(chama.feridas, 0);
  });
  it("Dreno de Mana pertence a Encantamentos (saiu de Magias de guerra)", () => {
    const dreno = getMagiaPorId("dreno_de_mana");
    assert.equal(dreno.disciplinaId, "oficio-encantamentos");
    assert.deepEqual(dreno.descritores, ["magia", "drenante"]);
  });
  it("Lança Longínqua e Chuva de Lâminas pertencem a Invocação", () => {
    assert.equal(getMagiaPorId("lanca_longinqua").disciplinaId, "oficio-invocacao");
    assert.equal(getMagiaPorId("chuva_de_laminas").disciplinaId, "oficio-invocacao");
  });
});

describe("ENCANTAMENTOS (23/10, docs/ATUALIZACAO_23-10.md seção 4)", () => {
  it("getEncantamentoPorId retorna null pra id desconhecido", () => {
    assert.equal(getEncantamentoPorId("inexistente"), null);
  });

  // 14 encantamentos: Letal/Perfurante/Preciso 1/Esmagador 1/Queimadura 1/
  // Carga 2/Drenante/Sortudo/Resistente/Firme 1/Selado 1/Potente Força/
  // Potente Destreza/Veloz. Perícia Encantada fica à parte (não concede
  // descritor).
  it("tem 14 'Encantamento: X' + Perícia Encantada = 15 entradas, todos do ofício Encantamentos, custando 1 mana quebrada", () => {
    assert.equal(ENCANTAMENTOS.length, 15);
    for (const enc of ENCANTAMENTOS) {
      assert.equal(enc.disciplinaId, "oficio-encantamentos", enc.id);
      assert.equal(enc.custoManaQuebrada, 1, enc.id);
    }
  });

  it("ids são únicos", () => {
    const ids = ENCANTAMENTOS.map((e) => e.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("Encantamento: Resistente (era Pele Encantada/Blindado) concede 'resistente', não 'blindado'", () => {
    const enc = getEncantamentoPorId("encantamento_resistente");
    assert.ok(enc);
    assert.deepEqual(enc.descritoresConcedidos, ["resistente"]);
  });

  it("Encantamento: Preciso 1 (era Golpe Preciso/Preciso 2) concede 'preciso_1'", () => {
    assert.deepEqual(getEncantamentoPorId("encantamento_preciso_1").descritoresConcedidos, ["preciso_1"]);
  });

  it("os 6 encantamentos 'fortes' (Resistente, Potente Força, Potente Destreza, Selado, Sortudo, Drenante) têm custoSpQuebrado:true; os demais não", () => {
    const fortes = ["encantamento_resistente", "encantamento_potente_forca", "encantamento_potente_destreza", "encantamento_selado_1", "encantamento_sortudo", "encantamento_drenante"];
    for (const id of fortes) assert.equal(getEncantamentoPorId(id).custoSpQuebrado, true, id);
    for (const enc of ENCANTAMENTOS) {
      if (!fortes.includes(enc.id)) assert.notEqual(enc.custoSpQuebrado, true, enc.id);
    }
  });

  it("Perícia Encantada não concede descritor (dá perícia, não mecanizado)", () => {
    const pericia = getEncantamentoPorId("pericia_encantada");
    assert.ok(pericia);
    assert.equal(pericia.descritoresConcedidos, undefined);
  });

  it("novos encantamentos 23/10 existem: Esmagador 1, Firme 1, Selado 1, Potente Força, Potente Destreza, Veloz", () => {
    assert.deepEqual(getEncantamentoPorId("encantamento_esmagador_1").descritoresConcedidos, ["esmagador_1"]);
    assert.deepEqual(getEncantamentoPorId("encantamento_firme_1").descritoresConcedidos, ["firme_1"]);
    assert.deepEqual(getEncantamentoPorId("encantamento_selado_1").descritoresConcedidos, ["selado_1"]);
    assert.deepEqual(getEncantamentoPorId("encantamento_potente_forca").descritoresConcedidos, ["potente_forca"]);
    assert.deepEqual(getEncantamentoPorId("encantamento_potente_destreza").descritoresConcedidos, ["potente_destreza"]);
    assert.deepEqual(getEncantamentoPorId("encantamento_veloz").descritoresConcedidos, ["veloz"]);
  });

  describe("descritoresDeEncantamentosAtivos", () => {
    it("sem encantamentosAtivos, devolve []", () => {
      assert.deepEqual(descritoresDeEncantamentosAtivos({}), []);
    });
    it("com Encantamento: Queimadura 1 ativo, devolve ['queimadura_1']", () => {
      assert.deepEqual(descritoresDeEncantamentosAtivos({ encantamentosAtivos: ["encantamento_queimadura_1"] }), ["queimadura_1"]);
    });
    it("dedupe quando dois encantamentos ativos dessem o mesmo descritor", () => {
      const resultado = descritoresDeEncantamentosAtivos({ encantamentosAtivos: ["encantamento_queimadura_1", "encantamento_queimadura_1"] });
      assert.deepEqual(resultado, ["queimadura_1"]);
    });
    it("id desconhecido não quebra e não soma nada", () => {
      assert.deepEqual(descritoresDeEncantamentosAtivos({ encantamentosAtivos: ["inexistente"] }), []);
    });
  });
});

describe("CONDUITE_MAGICO", () => {
  it("existe como objeto de exibição único (sem instâncias — o estado é character.conduiteAtivo)", () => {
    assert.equal(CONDUITE_MAGICO.id, "conduite_magico");
    assert.equal(typeof CONDUITE_MAGICO.descricao, "string");
  });
});

describe("ALQUIMIA (23/10, docs/ATUALIZACAO_23-10.md seção 5)", () => {
  // 20 - Antídoto (apagado) - Elixir Drenante (foi pra Habilidades Conjuntas) = 18
  it("tem 18 habilidades (Antídoto saiu, Elixir Drenante virou conjunta)", () => {
    assert.equal(ALQUIMIA.length, 18);
    assert.equal(getItemAlquimicoPorId("antidoto"), null);
    assert.equal(getItemAlquimicoPorId("elixir_drenante"), null);
  });
  it("ids são únicos", () => {
    const ids = ALQUIMIA.map((i) => i.id);
    assert.equal(new Set(ids).size, ids.length);
  });
  it("todo item pertence ao ofício Alquimia e custa 1 mana quebrada", () => {
    for (const item of ALQUIMIA) {
      assert.equal(item.disciplinaId, "oficio-alquimia", item.id);
      assert.equal(item.custoManaQuebrada, 1, item.id);
    }
  });
  it("todo item é 'Ataque' (rola, tem descritores) ou 'Suporte' (semRolagem, tem efeito em texto)", () => {
    for (const item of ALQUIMIA) {
      if (item.tipo === "Ataque") {
        assert.ok(Array.isArray(item.descritores) && item.descritores.includes("magia"), `${item.id} deveria ter descritores com 'magia'`);
      } else if (item.tipo === "Suporte") {
        assert.equal(item.semRolagem, true, item.id);
        assert.ok(typeof item.efeito === "string" && item.efeito.length > 0, item.id);
      } else {
        assert.fail(`${item.id} tem tipo desconhecido: ${item.tipo}`);
      }
    }
  });
  it("Bomba Incendiária tem Queimadura 3 e nenhum ferimento próprio (só a queimadura causa dano)", () => {
    const bomba = getItemAlquimicoPorId("bomba_incendiaria");
    assert.ok(bomba.descritores.includes("queimadura_3"));
    assert.equal(bomba.feridas, 0);
  });
  it("Bomba Tóxica tem Envenenamento 2", () => {
    assert.ok(getItemAlquimicoPorId("bomba_toxica").descritores.includes("envenenamento_2"));
  });
  it("Bomba de Fumaça concede Azarado (não mais Blindado)", () => {
    assert.deepEqual(getItemAlquimicoPorId("bomba_de_fumaca").descritoresConcedidos, ["azarado"]);
  });
  it("Elixir de Mana concede Reabastecer", () => {
    assert.deepEqual(getItemAlquimicoPorId("elixir_de_mana").descritoresConcedidos, ["reabastecer"]);
  });
  it("Elixir de Vigor concede Resistente (não mais 'próximo ferimento vira superficial')", () => {
    assert.deepEqual(getItemAlquimicoPorId("elixir_de_vigor").descritoresConcedidos, ["resistente"]);
  });
  it("Frasco de Gosma concede Lento 1 (não mais 'prioridade -1')", () => {
    assert.deepEqual(getItemAlquimicoPorId("frasco_de_gosma").descritoresConcedidos, ["lento_1"]);
  });
  it("Ácido Corrosivo concede o descritor Corrosivo (pro selo/pop-up; efeito em terceiros, não mecanizado)", () => {
    assert.deepEqual(getItemAlquimicoPorId("acido_corrosivo").descritoresConcedidos, ["corrosivo"]);
  });
  it("getItemAlquimicoPorId retorna null pra id desconhecido", () => {
    assert.equal(getItemAlquimicoPorId("inexistente"), null);
  });
});

describe("CONSTRUCTO (23/10, docs/ATUALIZACAO_23-10.md seção 6)", () => {
  it("tem os 7 constructos da planilha (sem contar Conduíte, compartilhado)", () => {
    assert.equal(CONSTRUCTO.length, 7);
  });
  it("ids são únicos", () => {
    const ids = CONSTRUCTO.map((c) => c.id);
    assert.equal(new Set(ids).size, ids.length);
  });
  it("todo constructo pertence ao ofício Constructo, custa 2 mana quebrada e tem pelo menos 2 funções + 1 magia única", () => {
    for (const c of CONSTRUCTO) {
      assert.equal(c.disciplinaId, "oficio-constructo", c.id);
      assert.equal(c.custoManaQuebrada, 2, c.id); // exceção à regra de 1 por habilidade
      assert.ok(c.funcoes.length >= 2, c.id);
      assert.ok(typeof c.magiaUnica === "string" && c.magiaUnica.length > 0, c.id);
      assert.ok(c.integridade >= 1, c.id);
    }
  });
  it("Golem Guardião e Armadura Animada têm Contínuo Blindado + Resistente (23/10, ganharam Resistente)", () => {
    assert.deepEqual(getConstructoPorId("golem_guardiao").descritoresConcedidos, ["blindado", "resistente"]);
    assert.deepEqual(getConstructoPorId("armadura_animada").descritoresConcedidos, ["blindado", "resistente"]);
  });
  it("Arma Viva: só Letal (não mais Letal+Perfurante)", () => {
    assert.deepEqual(getConstructoPorId("arma_viva").descritoresConcedidos, ["letal"]);
  });
  it("getConstructoPorId retorna null pra id desconhecido", () => {
    assert.equal(getConstructoPorId("inexistente"), null);
  });
});

describe("INVOCACAO (23/10, docs/ATUALIZACAO_23-10.md seção 7, novo)", () => {
  it("tem as 3 habilidades de invocação (toggle, mana quebrada) — Invocar Arma, Escudo Invocado, Arma de Brasa", () => {
    assert.equal(INVOCACAO.length, 3);
    for (const i of INVOCACAO) {
      assert.equal(i.disciplinaId, "oficio-invocacao", i.id);
      assert.equal(i.custoManaQuebrada, 1, i.id);
    }
  });
  it("ids são únicos", () => {
    const ids = INVOCACAO.map((i) => i.id);
    assert.equal(new Set(ids).size, ids.length);
  });
  it("Escudo Invocado concede Firme 1", () => {
    assert.deepEqual(getInvocacaoPorId("escudo_invocado").descritoresConcedidos, ["firme_1"]);
  });
  it("Arma de Brasa concede Queimadura 1", () => {
    assert.deepEqual(getInvocacaoPorId("arma_de_brasa").descritoresConcedidos, ["queimadura_1"]);
  });
  it("getInvocacaoPorId retorna null pra id desconhecido", () => {
    assert.equal(getInvocacaoPorId("inexistente"), null);
  });

  describe("descritoresDeInvocacoesAtivas", () => {
    it("sem invocacoesAtivas, devolve []", () => {
      assert.deepEqual(descritoresDeInvocacoesAtivas({}), []);
    });
    it("com Escudo Invocado ativo, devolve ['firme_1']", () => {
      assert.deepEqual(descritoresDeInvocacoesAtivas({ invocacoesAtivas: ["escudo_invocado"] }), ["firme_1"]);
    });
    it("Invocar Arma (sem descritoresConcedidos) não soma nada", () => {
      assert.deepEqual(descritoresDeInvocacoesAtivas({ invocacoesAtivas: ["invocar_arma"] }), []);
    });
  });
});

describe("HABILIDADES_CONJUNTAS (23/10, docs/ATUALIZACAO_23-10.md seção 8)", () => {
  it("tem 7 habilidades (Elixir Drenante entrou, veio de Alquimia), cada uma exigindo exatamente 2 ofícios", () => {
    assert.equal(HABILIDADES_CONJUNTAS.length, 7);
    for (const h of HABILIDADES_CONJUNTAS) {
      assert.equal(h.oficiosExigidos.length, 2, h.id);
      assert.equal(h.custoManaQuebrada, 1, h.id);
    }
  });
  it("ids são únicos", () => {
    const ids = HABILIDADES_CONJUNTAS.map((h) => h.id);
    assert.equal(new Set(ids).size, ids.length);
  });
  it("Elixir Drenante exige Alquimia + Encantamentos e concede Drenante", () => {
    const elixir = getHabilidadeConjuntaPorId("elixir_drenante");
    assert.ok(elixir);
    assert.deepEqual(elixir.oficiosExigidos.slice().sort(), ["oficio-alquimia", "oficio-encantamentos"]);
    assert.deepEqual(elixir.descritoresConcedidos, ["drenante"]);
  });
  it("Círculo mágico só existe aqui (não duplicado em MAGIAS nem ENCANTAMENTOS)", () => {
    assert.ok(getHabilidadeConjuntaPorId("circulo_magico"));
    assert.equal(getMagiaPorId("circulo_magico"), null);
    assert.equal(getEncantamentoPorId("circulo_magico"), null);
  });
  it("getHabilidadeConjuntaPorId retorna null pra id desconhecido", () => {
    assert.equal(getHabilidadeConjuntaPorId("inexistente"), null);
  });
});

describe("DISCIPLINAS", () => {
  it("nenhuma das 5 de ofício mágico tem mais o campo 'vazia'", () => {
    for (const id of ["oficio-encantamentos", "oficio-alquimia", "oficio-constructo", "oficio-invocacao", "oficio-magias-de-guerra"]) {
      const d = DISCIPLINAS.find((x) => x.id === id);
      assert.ok(d, id);
      assert.equal("vazia" in d, false, id);
    }
  });
  it("tem as 6 disciplinas (5 ofícios mágicos + Magia Inata), incluindo a nova Invocação", () => {
    assert.equal(DISCIPLINAS.length, 6);
    assert.ok(DISCIPLINAS.find((d) => d.id === "oficio-invocacao"));
  });
});

// 23/10 (docs/ATUALIZACAO_23-10.md seção 2b): 3 proficiências fixas por
// ofício (+1 grau cada, sem escolha) + a passiva de Invocação (que também é
// um +1 grau, teto C, sempre ativa).
describe("BONUS_GRAU_POR_OFICIO (23/10, proficiências dos ofícios)", () => {
  it("24/10: os 5 ofícios têm exatamente 3 fixas, a primeira de Combate", () => {
    const combate = new Set(PROFICIENCIAS_LIST.filter((p) => p.categoria === "combate").map((p) => p.key));
    for (const id of ["oficio-magias-de-guerra", "oficio-encantamentos", "oficio-alquimia", "oficio-constructo", "oficio-invocacao"]) {
      const lista = BONUS_GRAU_POR_OFICIO[id];
      assert.equal(lista.length, 3, id);
      assert.equal(lista.filter((b) => combate.has(b.chave)).length, 1, id);
      assert.ok(combate.has(lista[0].chave), id);
    }
  });
  it("24/10: fixas de cada ofício (seção 2b)", () => {
    const chaves = (id) => BONUS_GRAU_POR_OFICIO[id].map((b) => b.chave);
    assert.deepEqual(chaves("oficio-magias-de-guerra"), ["magiaOfensiva", "magiasGerais", "politica"]);
    assert.deepEqual(chaves("oficio-encantamentos"), ["vontade", "magiasGerais", "oficio"]);
    assert.deepEqual(chaves("oficio-alquimia"), ["fortitude", "medicina", "oficio"]);
    assert.deepEqual(chaves("oficio-constructo"), ["magiaOfensiva", "tecnologia", "oficio"]);
    assert.deepEqual(chaves("oficio-invocacao"), ["combateCorpoACorpo", "magiasGerais", "atletismo"]);
  });
  it("escolhaCombateDoSlot só aceita chave da lista válida", () => {
    assert.equal(escolhaCombateDoSlot({ escolhaCombate: "esquiva" }, ["esquiva"]), "esquiva");
    assert.equal(escolhaCombateDoSlot({ escolhaCombate: "atletismo" }, ["esquiva"]), null);
    assert.equal(escolhaCombateDoSlot({}, ["esquiva"]), null);
  });
  it("Conduíte e Magia Inata não têm entrada (não dão proficiências)", () => {
    assert.equal(BONUS_GRAU_POR_OFICIO["magia-inata"], undefined);
    assert.equal(BONUS_GRAU_POR_OFICIO["conduite_magico"], undefined);
  });
});

describe("PASSIVA_POR_OFICIO / getPassivaDoOficio", () => {
  it("as 5 passivas existem, com texto não-vazio", () => {
    for (const id of ["oficio-magias-de-guerra", "oficio-encantamentos", "oficio-alquimia", "oficio-constructo", "oficio-invocacao"]) {
      const p = getPassivaDoOficio(id);
      assert.ok(p, id);
      assert.ok(p.texto.length > 0, id);
    }
  });
  it("só a de Magias de guerra (Treino em todas as armas) é mecanizada; 24/10: a de Invocação (armas invocadas treinadas) não", () => {
    assert.equal(PASSIVA_POR_OFICIO["oficio-invocacao"].mecanizada, false);
    assert.equal(PASSIVA_POR_OFICIO["oficio-magias-de-guerra"].mecanizada, true);
    assert.equal(PASSIVA_POR_OFICIO["oficio-magias-de-guerra"].alternativa.mecanizada, false);
    assert.equal(PASSIVA_POR_OFICIO["oficio-encantamentos"].mecanizada, false);
    assert.equal(PASSIVA_POR_OFICIO["oficio-alquimia"].mecanizada, false);
    assert.equal(PASSIVA_POR_OFICIO["oficio-constructo"].mecanizada, false);
  });
  it("getPassivaDoOficio retorna null pra id desconhecido", () => {
    assert.equal(getPassivaDoOficio("inexistente"), null);
  });
});

describe("PROFICIENCIAS_DE_OFICIO / periciasDeOficio (23/10, segunda parte)", () => {
  const mdg = (extra = {}) => ({ disciplinaId: "oficio-magias-de-guerra", habilidadesAtivas: [], ...extra });
  const invocacao = (habs = []) => ({ disciplinaId: "oficio-invocacao", habilidadesAtivas: habs });
  const alquimia = (habs = []) => ({ disciplinaId: "oficio-alquimia", habilidadesAtivas: habs });
  const pistola = getArmaPorId("arma_de_fogo_curta");
  const espada = getArmaPorId("lamina");
  const placas = getArmaduraPorId("armadura_de_placas_completa");
  const escudo = getArmaduraPorId("escudo_leve");

  it("uma habilidade por ofício: Armaduras (Magias de guerra), Armas de Fogo (Alquimia), Armas (Invocação)", () => {
    assert.equal(PROFICIENCIAS_DE_OFICIO.length, 3);
    assert.equal(getProficienciaDeOficioPorId("proficiencia_armaduras").disciplinaId, "oficio-magias-de-guerra");
    assert.equal(getProficienciaDeOficioPorId("proficiencia_armas_de_fogo").disciplinaId, "oficio-alquimia");
    assert.equal(getProficienciaDeOficioPorId("proficiencia_armas").disciplinaId, "oficio-invocacao");
  });
  it("getHabilidadeDeOficioPorId acha magia e habilidade de proficiência; ids não colidem com MAGIAS", () => {
    assert.equal(getHabilidadeDeOficioPorId("shin").nome, "Shin");
    assert.equal(getHabilidadeDeOficioPorId("proficiencia_armas").nome, "Treino em Armas");
    for (const p of PROFICIENCIAS_DE_OFICIO) assert.equal(getMagiaPorId(p.id), null);
  });
  it("sem ofício nenhum, nenhuma perícia", () => {
    const p = periciasDeOficio([]);
    assert.equal(periciaDeOficioCobreArma(p, espada), false);
    assert.equal(periciaDeOficioCobreArmadura(p, placas), false);
  });
  it("passiva de Magias de guerra: todas as armas, mas não armaduras", () => {
    const p = periciasDeOficio([mdg()]);
    assert.equal(periciaDeOficioCobreArma(p, espada), true);
    assert.equal(periciaDeOficioCobreArma(p, pistola), true);
    assert.equal(periciaDeOficioCobreArmadura(p, placas), false);
  });
  it("Proficiência em Armaduras (Magias de guerra) cobre armaduras e escudos", () => {
    const p = periciasDeOficio([mdg({ habilidadesAtivas: ["shin", "proficiencia_armaduras"] })]);
    assert.equal(periciaDeOficioCobreArmadura(p, placas), true);
    assert.equal(periciaDeOficioCobreArmadura(p, escudo), true);
  });
  it("Proficiência em Armas de Fogo (Alquimia) só cobre a família Armas de fogo", () => {
    const p = periciasDeOficio([alquimia(["proficiencia_armas_de_fogo"])]);
    assert.equal(periciaDeOficioCobreArma(p, pistola), true);
    assert.equal(periciaDeOficioCobreArma(p, espada), false);
  });
  it("habilidade de proficiência fora do ofício dono não conta", () => {
    const p = periciasDeOficio([alquimia(["proficiencia_armas"])]);
    assert.equal(periciaDeOficioCobreArma(p, espada), false);
  });
  it("passiva anterior de Magias de guerra só vale com outra fonte de proficiência em todas as armas", () => {
    const sozinha = periciasDeOficio([mdg({ passivaAnterior: true })]);
    assert.equal(sozinha.passivaAnteriorMagiasDeGuerra, false);
    assert.equal(periciaDeOficioCobreArma(sozinha, espada), true); // escolha não vale: volta pra armas
    const comInvocacao = periciasDeOficio([mdg({ passivaAnterior: true }), invocacao(["proficiencia_armas"])]);
    assert.equal(comInvocacao.outraFonteArmas, true);
    assert.equal(comInvocacao.passivaAnteriorMagiasDeGuerra, true);
    assert.equal(periciaDeOficioCobreArma(comInvocacao, espada), true); // continua coberta pela Invocação
  });
  it("Armas de Fogo basta como 'outra fonte' pra passiva anterior (24/10) — e aí só armas de fogo ficam cobertas", () => {
    const p = periciasDeOficio([mdg({ passivaAnterior: true }), alquimia(["proficiencia_armas_de_fogo"])]);
    assert.equal(p.passivaAnteriorMagiasDeGuerra, true);
    assert.equal(periciaDeOficioCobreArma(p, pistola), true);
    assert.equal(periciaDeOficioCobreArma(p, espada), false);
  });
});

describe("Treino em Armas cobre Armas, Desarmado e Armas de Fogo (27/10)", () => {
  it("Treino em Armas (Invocação): as três proficiências de arma", () => {
    const p = periciasDeOficio([{ disciplinaId: "oficio-invocacao", habilidadesAtivas: ["proficiencia_armas"] }]);
    for (const k of ["combateCorpoACorpo", "desarmado", "armasDeFogo"]) assert.equal(treinoDeOficioNaProficiencia(p, k), true, k);
    assert.equal(treinoDeOficioNaProficiencia(p, "esquiva"), false);
  });
  it("passiva de Magias de guerra (Treino em todas as armas): as mesmas três", () => {
    const p = periciasDeOficio([{ disciplinaId: "oficio-magias-de-guerra", habilidadesAtivas: [] }]);
    assert.equal(treinoDeOficioNaProficiencia(p, "desarmado"), true);
  });
  it("Treino em Armas de Fogo (Alquimia): só Armas de Fogo", () => {
    const p = periciasDeOficio([{ disciplinaId: "oficio-alquimia", habilidadesAtivas: ["proficiencia_armas_de_fogo"] }]);
    assert.equal(treinoDeOficioNaProficiencia(p, "armasDeFogo"), true);
    assert.equal(treinoDeOficioNaProficiencia(p, "combateCorpoACorpo"), false);
    assert.equal(treinoDeOficioNaProficiencia(p, "desarmado"), false);
  });
});
