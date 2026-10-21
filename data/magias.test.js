// Testes do catálogo de magias (data/magias.js) — ver docs/SISTEMA_MAGIA.md,
// seção "Catálogo de magias". Roda com `node --test` ou `npm test`.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MAGIAS, getMagiaPorId, ENCANTAMENTOS, getEncantamentoPorId, descritoresDeEncantamentosAtivos,
  CONDUITE_MAGICO, ALQUIMIA, getItemAlquimicoPorId, CONSTRUCTO, getConstructoPorId,
  HABILIDADES_CONJUNTAS, getHabilidadeConjuntaPorId, DISCIPLINAS,
} from "./magias.js";

describe("MAGIAS", () => {
  it("tem as 11 magias do guia + o placeholder Sensor + Chama Mágica (19/10) + Descarga Elétrica/Dreno de Mana (21/10) = 15 entradas", () => {
    assert.equal(MAGIAS.length, 15);
  });
  it("toda magia tem o descritor 'magia'", () => {
    for (const m of MAGIAS) {
      assert.ok(m.descritores.includes("magia"), `${m.nome} deveria ter o descritor "magia"`);
    }
  });
  it("Escudo de Mana não rola (semRolagem) e tem efeito descrito em texto", () => {
    const escudo = getMagiaPorId("escudo_de_mana");
    assert.equal(escudo.semRolagem, true);
    assert.equal(typeof escudo.efeito, "string");
    assert.ok(escudo.efeito.length > 0);
  });
  it("Sensor é placeholder, sem custo/pool fechados no guia", () => {
    const sensor = getMagiaPorId("sensor");
    assert.equal(sensor.placeholder, true);
    assert.equal(sensor.custoMp, null);
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
    for (const id of ["bombardeio_de_mana", "shin", "magia_de_guerra_maxis"]) {
      assert.equal(getMagiaPorId(id).emArea, true, id);
    }
  });
  it("getMagiaPorId retorna null pra id desconhecido", () => {
    assert.equal(getMagiaPorId("inexistente"), null);
  });

  // Chama Mágica (Pedro, 19/10): primeira magia com o descritor Queimadura.
  it("Chama Mágica tem o descritor 'queimadura' (grau 1, sem N explícito)", () => {
    const chama = getMagiaPorId("chama_magica");
    assert.ok(chama, "Chama Mágica deveria existir no catálogo");
    assert.deepEqual(chama.descritores, ["magia", "queimadura"]);
    assert.equal(chama.feridas, 1);
  });
});

describe("ENCANTAMENTOS", () => {
  it("Encantamento Flamejante concede 'queimadura' e pertence ao ofício Encantamentos", () => {
    const enc = getEncantamentoPorId("encantamento_flamejante");
    assert.ok(enc);
    assert.equal(enc.disciplinaId, "oficio-encantamentos");
    assert.deepEqual(enc.descritoresConcedidos, ["queimadura"]);
  });

  it("getEncantamentoPorId retorna null pra id desconhecido", () => {
    assert.equal(getEncantamentoPorId("inexistente"), null);
  });

  // 21/10 (docs/ATUALIZACAO_21-10.md item 4): 8 encantamentos no total —
  // Flamejante (19/10) + Lâmina Letal/Ponta Perfurante/Golpe Preciso/
  // Pele Encantada/Sorte Encantada/Encantamento Elétrico/Encantamento
  // Drenante.
  it("tem 8 encantamentos, todos do ofício Encantamentos, custando 1 mana quebrada", () => {
    assert.equal(ENCANTAMENTOS.length, 8);
    for (const enc of ENCANTAMENTOS) {
      assert.equal(enc.disciplinaId, "oficio-encantamentos", enc.id);
      assert.equal(enc.custoManaQuebrada, 1, enc.id);
      assert.ok(enc.descritoresConcedidos.length > 0, enc.id);
    }
  });

  it("ids são únicos", () => {
    const ids = ENCANTAMENTOS.map((e) => e.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("Pele Encantada concede 'blindado' (único que afeta o usuário como DEFENSOR, não os ataques dele)", () => {
    assert.deepEqual(getEncantamentoPorId("pele_encantada").descritoresConcedidos, ["blindado"]);
  });

  describe("descritoresDeEncantamentosAtivos", () => {
    it("sem encantamentosAtivos, devolve []", () => {
      assert.deepEqual(descritoresDeEncantamentosAtivos({}), []);
    });
    it("com Encantamento Flamejante ativo, devolve ['queimadura']", () => {
      assert.deepEqual(descritoresDeEncantamentosAtivos({ encantamentosAtivos: ["encantamento_flamejante"] }), ["queimadura"]);
    });
    it("dedupe quando dois encantamentos ativos dessem o mesmo descritor", () => {
      // Não há dois ainda no catálogo, mas a função precisa deduplicar se um dia houver.
      const resultado = descritoresDeEncantamentosAtivos({ encantamentosAtivos: ["encantamento_flamejante", "encantamento_flamejante"] });
      assert.deepEqual(resultado, ["queimadura"]);
    });
    it("id desconhecido não quebra e não soma nada", () => {
      assert.deepEqual(descritoresDeEncantamentosAtivos({ encantamentosAtivos: ["inexistente"] }), []);
    });
  });
});

describe("CONDUITE_MAGICO (21/10)", () => {
  it("existe como objeto de exibição único (sem instâncias — o estado é character.conduiteAtivo)", () => {
    assert.equal(CONDUITE_MAGICO.id, "conduite_magico");
    assert.equal(typeof CONDUITE_MAGICO.descricao, "string");
  });
});

describe("ALQUIMIA (21/10, docs/ATUALIZACAO_21-10.md seção 4.1)", () => {
  it("tem as 20 habilidades da planilha (sem contar Conduíte, compartilhado)", () => {
    assert.equal(ALQUIMIA.length, 20);
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
  it("getItemAlquimicoPorId retorna null pra id desconhecido", () => {
    assert.equal(getItemAlquimicoPorId("inexistente"), null);
  });
});

describe("CONSTRUCTO (21/10, docs/ATUALIZACAO_21-10.md seção 4.2)", () => {
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
  it("getConstructoPorId retorna null pra id desconhecido", () => {
    assert.equal(getConstructoPorId("inexistente"), null);
  });
});

describe("HABILIDADES_CONJUNTAS (21/10, docs/ATUALIZACAO_21-10.md item 4)", () => {
  it("tem as 6 habilidades da planilha, cada uma exigindo exatamente 2 ofícios", () => {
    assert.equal(HABILIDADES_CONJUNTAS.length, 6);
    for (const h of HABILIDADES_CONJUNTAS) {
      assert.equal(h.oficiosExigidos.length, 2, h.id);
      assert.equal(h.custoManaQuebrada, 1, h.id);
    }
  });
  it("ids são únicos", () => {
    const ids = HABILIDADES_CONJUNTAS.map((h) => h.id);
    assert.equal(new Set(ids).size, ids.length);
  });
  it("getHabilidadeConjuntaPorId retorna null pra id desconhecido", () => {
    assert.equal(getHabilidadeConjuntaPorId("inexistente"), null);
  });
});

// 21/10: Encantamentos/Alquimia/Constructo deixaram de ser disciplinas
// vazias (continuam sem bônus de grau, mas já têm habilidades de verdade).
describe("DISCIPLINAS — Encantamentos/Alquimia/Constructo não são mais vazias (21/10)", () => {
  it("nenhuma das 3 tem mais o campo 'vazia'", () => {
    for (const id of ["oficio-encantamentos", "oficio-alquimia", "oficio-constructo"]) {
      const d = DISCIPLINAS.find((x) => x.id === id);
      assert.ok(d, id);
      assert.equal("vazia" in d, false, id);
    }
  });
});
