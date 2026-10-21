// Testes do catálogo de tipos de armadura (data/armaduras.js) — ver
// docs/ATUALIZACAO_21-10.md seção 7. Roda com `node --test` ou `npm test`.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ARMADURAS, getArmaduraPorId, armadurasDoSlot,
  descritoresDeEquipamentoDefensivo, bonusDefesaDeEquipamento,
  penalidadeDefesaSemPericiaDoPersonagem,
} from "./armaduras.js";

describe("ARMADURAS", () => {
  it("tem os 12 tipos da planilha", () => {
    assert.equal(ARMADURAS.length, 12);
  });

  it("ids são únicos", () => {
    const ids = ARMADURAS.map((a) => a.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("todo tipo tem slot armadura, escudo ou acessorio", () => {
    for (const a of ARMADURAS) {
      assert.ok(["armadura", "escudo", "acessorio"].includes(a.slot), a.id);
    }
  });

  it("9 armaduras, 2 escudos, 1 acessório", () => {
    assert.equal(armadurasDoSlot("armadura").length, 9);
    assert.equal(armadurasDoSlot("escudo").length, 2);
    assert.equal(armadurasDoSlot("acessorio").length, 1);
  });

  it("toda peça 'pesada' concede lento_1 (as 4 com Pesado na planilha)", () => {
    const pesadas = ["armadura_de_placas_completa", "armadura_de_poder_base", "exoesqueleto", "armadura_catalisadora"];
    for (const id of pesadas) {
      assert.ok(getArmaduraPorId(id).descritoresConcedidos.includes("lento_1"), id);
    }
  });

  it("as 3 peças 'mágicas' que exigem mana ativa (custoManaAtivar > 0): armadura de mana, escudo de mana, chifre de mana", () => {
    for (const id of ["armadura_de_mana", "escudo_de_mana", "chifre_de_mana"]) {
      assert.ok(getArmaduraPorId(id).custoManaAtivar > 0, id);
    }
    // Vestimenta rúnica é mágica mas NÃO exige mana ativa (planilha: "pode ser sempre ativa").
    assert.equal(getArmaduraPorId("vestimenta_runica").custoManaAtivar, 0);
  });

  it("getArmaduraPorId retorna null pra id desconhecido", () => {
    assert.equal(getArmaduraPorId("inexistente"), null);
  });
});

describe("descritoresDeEquipamentoDefensivo", () => {
  it("sem equipamento, devolve []", () => {
    assert.deepEqual(descritoresDeEquipamentoDefensivo({}), []);
  });

  it("armadura passiva (sem custoManaAtivar) vale sempre que equipada", () => {
    const character = { equipamento: { armaduraId: "armadura_media" } };
    assert.deepEqual(descritoresDeEquipamentoDefensivo(character), ["resistente", "blindado"]);
  });

  it("peça com custoManaAtivar > 0 só conta com a mana ativa correspondente", () => {
    const semMana = { equipamento: { armaduraId: "armadura_de_mana", manaAtivaArmadura: false } };
    assert.deepEqual(descritoresDeEquipamentoDefensivo(semMana), []);
    const comMana = { equipamento: { armaduraId: "armadura_de_mana", manaAtivaArmadura: true } };
    assert.deepEqual(descritoresDeEquipamentoDefensivo(comMana), ["campo_de_mana"]);
  });

  it("soma armadura + escudo + acessório, sem duplicar descritor repetido", () => {
    const character = {
      equipamento: {
        armaduraId: "armadura_de_poder_base",
        escudoId: "escudo_leve",
        acessorioId: "chifre_de_mana", manaAtivaAcessorio: true,
      },
    };
    const resultado = descritoresDeEquipamentoDefensivo(character);
    assert.deepEqual(resultado, ["resistente", "potente_forca", "lento_1", "firme_1", "campo_de_mana"]);
  });

  it("id desconhecido não quebra e não soma nada", () => {
    assert.deepEqual(descritoresDeEquipamentoDefensivo({ equipamento: { armaduraId: "inexistente" } }), []);
  });
});

describe("bonusDefesaDeEquipamento", () => {
  it("soma o bônus de Defesa de cada peça equipada", () => {
    const character = { equipamento: { armaduraId: "vestimenta_runica", escudoId: "escudo_leve" } };
    assert.equal(bonusDefesaDeEquipamento(character), 1); // +1 da vestimenta, 0 do escudo
  });
  it("sem equipamento, devolve 0", () => {
    assert.equal(bonusDefesaDeEquipamento({}), 0);
  });
});

describe("penalidadeDefesaSemPericiaDoPersonagem", () => {
  it("peça que exige perícia (periciaFamilia != null) sem temPericia conta 1 penalidade", () => {
    const character = { equipamento: { armaduraId: "armadura_de_placas_completa", temPericiaArmadura: false } };
    assert.equal(penalidadeDefesaSemPericiaDoPersonagem(character), 1);
  });
  it("com temPericia marcado, não penaliza", () => {
    const character = { equipamento: { armaduraId: "armadura_de_placas_completa", temPericiaArmadura: true } };
    assert.equal(penalidadeDefesaSemPericiaDoPersonagem(character), 0);
  });
  it("peça que NÃO exige perícia (ex. Armadura leve) nunca penaliza", () => {
    const character = { equipamento: { armaduraId: "armadura_leve", temPericiaArmadura: false } };
    assert.equal(penalidadeDefesaSemPericiaDoPersonagem(character), 0);
  });
  it("armadura E escudo sem perícia somam (-2)", () => {
    const character = {
      equipamento: {
        armaduraId: "armadura_de_placas_completa", temPericiaArmadura: false,
        escudoId: "escudo_leve", temPericiaEscudo: false,
      },
    };
    assert.equal(penalidadeDefesaSemPericiaDoPersonagem(character), 2);
  });
});
