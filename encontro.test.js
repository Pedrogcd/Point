// Testes do painel de Encontro (ver encontro.js — função pura, sem React/
// storage). Roda com `node --test` (Node >=20, nativo) ou `npm test`.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  criarEncontro, criarCombatentePersonagem, criarCombatenteAvulso,
  adicionarCombatente, removerCombatente, atualizarCombatente, reordenar,
  alternarEstado, alternarAcaoGasta, proximoTurno, registrarRolagemManutencao,
  registrarAcao, normalizarEncontro, ESTADOS_COMBATE, LIMIAR_MANUTENCAO_PADRAO,
} from "./encontro.js";

function encontroCom3() {
  let e = criarEncontro();
  e = adicionarCombatente(e, criarCombatentePersonagem("a", "aliados"));
  e = adicionarCombatente(e, criarCombatentePersonagem("b", "aliados"));
  e = adicionarCombatente(e, criarCombatenteAvulso({ nome: "Goblin", lado: "inimigos", defesa: 7, hp: 2, mp: 0, sp: 0 }));
  return e;
}

describe("criarEncontro", () => {
  it("começa na rodada 1, fase manutenção, sem combatentes", () => {
    const e = criarEncontro();
    assert.equal(e.rodada, 1);
    assert.equal(e.fase, "manutencao");
    assert.equal(e.turnoIdx, 0);
    assert.deepEqual(e.ordem, []);
    assert.deepEqual(e.combatentes, {});
    assert.equal(e.limiarManutencao, LIMIAR_MANUTENCAO_PADRAO);
    assert.deepEqual(e.registro, []);
  });
});

describe("adicionarCombatente / removerCombatente / atualizarCombatente", () => {
  it("adiciona combatentes de personagem e avulso, mantendo a ordem de declaração", () => {
    const e = encontroCom3();
    assert.equal(e.ordem.length, 3);
    assert.equal(Object.keys(e.combatentes).length, 3);
  });

  it("remover um combatente que vem ANTES do que tem a vez decrementa turnoIdx", () => {
    let e = encontroCom3();
    e = { ...e, turnoIdx: 2 }; // vez do 3º (o avulso)
    const idPrimeiro = e.ordem[0];
    e = removerCombatente(e, idPrimeiro);
    assert.equal(e.ordem.length, 2);
    assert.equal(e.turnoIdx, 1); // continua apontando pro avulso, agora na posição 1
  });

  it("remover o último combatente da lista não deixa turnoIdx estourar o índice", () => {
    let e = encontroCom3();
    e = { ...e, turnoIdx: 2 };
    const idUltimo = e.ordem[2];
    e = removerCombatente(e, idUltimo);
    assert.equal(e.ordem.length, 2);
    assert.equal(e.turnoIdx, 1);
  });

  it("remover id inexistente não muda nada", () => {
    const e = encontroCom3();
    const e2 = removerCombatente(e, "fantasma");
    assert.deepEqual(e2, e);
  });

  it("atualizarCombatente mescla o patch (ex: nota)", () => {
    let e = encontroCom3();
    const id = e.ordem[0];
    e = atualizarCombatente(e, id, { nota: "está sangrando" });
    assert.equal(e.combatentes[id].nota, "está sangrando");
  });

  it("atualizarCombatente em id inexistente não lança, não muda nada", () => {
    const e = encontroCom3();
    assert.doesNotThrow(() => atualizarCombatente(e, "fantasma", { nota: "x" }));
  });
});

describe("reordenar", () => {
  it("troca com o vizinho de cima/baixo", () => {
    const ordem = ["a", "b", "c"];
    assert.deepEqual(reordenar(ordem, "b", "cima"), ["b", "a", "c"]);
    assert.deepEqual(reordenar(ordem, "b", "baixo"), ["a", "c", "b"]);
  });

  it("no limite (primeiro pra cima, último pra baixo) não faz nada", () => {
    const ordem = ["a", "b", "c"];
    assert.deepEqual(reordenar(ordem, "a", "cima"), ordem);
    assert.deepEqual(reordenar(ordem, "c", "baixo"), ordem);
  });

  it("id inexistente devolve a ordem igual", () => {
    const ordem = ["a", "b"];
    assert.deepEqual(reordenar(ordem, "fantasma", "cima"), ordem);
  });
});

describe("alternarEstado", () => {
  it("liga um estado válido (exatamente as palavras do catálogo)", () => {
    const c = criarCombatentePersonagem("a");
    const c2 = alternarEstado(c, "ENVENENAMENTO");
    assert.deepEqual(c2.estados, ["ENVENENAMENTO"]);
  });

  it("clicar de novo desliga", () => {
    const c = criarCombatentePersonagem("a");
    const c2 = alternarEstado(alternarEstado(c, "CHAMAS"), "CHAMAS");
    assert.deepEqual(c2.estados, []);
  });

  it("os 4 estados pedidos existem, com essas palavras exatas", () => {
    const ids = ESTADOS_COMBATE.map((e) => e.id);
    assert.deepEqual(ids, ["ENVENENAMENTO", "DESACELERAÇÃO", "IMPACTO", "CHAMAS"]);
  });

  it("estado desconhecido não altera o combatente", () => {
    const c = criarCombatentePersonagem("a");
    assert.deepEqual(alternarEstado(c, "PARALISIA"), c);
  });
});

describe("alternarAcaoGasta", () => {
  it("risca e desfaz Movimento/Ação/B.Ação/Reação", () => {
    let c = criarCombatentePersonagem("a");
    assert.equal(c.acoesGastas.movimento, false);
    c = alternarAcaoGasta(c, "movimento");
    assert.equal(c.acoesGastas.movimento, true);
    c = alternarAcaoGasta(c, "movimento");
    assert.equal(c.acoesGastas.movimento, false);
  });

  it("chave inválida não muda nada", () => {
    const c = criarCombatentePersonagem("a");
    assert.deepEqual(alternarAcaoGasta(c, "voo"), c);
  });
});

describe("proximoTurno", () => {
  it("na Manutenção, 'Iniciar turno' só troca de fase — mesma vez, mesma rodada", () => {
    const e = encontroCom3();
    const e2 = proximoTurno(e);
    assert.equal(e2.fase, "turno");
    assert.equal(e2.turnoIdx, 0);
    assert.equal(e2.rodada, 1);
  });

  it("no Turno, 'Encerrar turno' reseta ações gastas do atual e passa a vez (volta pra Manutenção)", () => {
    let e = encontroCom3();
    const idAtual = e.ordem[0];
    e = atualizarCombatente(e, idAtual, { acoesGastas: { movimento: true, acao: true, bAcao: false, reacao: false } });
    e = proximoTurno(e); // -> turno
    e = proximoTurno(e); // -> encerra, passa pro próximo
    assert.equal(e.fase, "manutencao");
    assert.equal(e.turnoIdx, 1);
    assert.equal(e.rodada, 1);
    assert.deepEqual(e.combatentes[idAtual].acoesGastas, { movimento: false, acao: false, bAcao: false, reacao: false });
  });

  it("encerrar o ÚLTIMO combatente incrementa a rodada e volta pro primeiro", () => {
    let e = encontroCom3();
    e = { ...e, turnoIdx: 2, fase: "turno" };
    e = proximoTurno(e);
    assert.equal(e.fase, "manutencao");
    assert.equal(e.turnoIdx, 0);
    assert.equal(e.rodada, 2);
  });

  it("encontro sem combatentes não lança, não muda nada", () => {
    const e = criarEncontro();
    assert.deepEqual(proximoTurno(e), e);
  });
});

describe("registrarRolagemManutencao", () => {
  it("conta sucessos (dado > limiar)", () => {
    const r = registrarRolagemManutencao([1, 6, 10, 5], 5);
    assert.equal(r.sucessos, 2); // 6 e 10 batem (>5); 1 e 5 não
    assert.deepEqual(r.resultados.map((x) => x.sucesso), [false, true, true, false]);
  });

  it("usa o limiar padrão (5, ou seja sucesso em 6+) se não passado", () => {
    const r = registrarRolagemManutencao([6, 5]);
    assert.equal(r.sucessos, 1);
  });

  it("lista vazia ou ausente não lança, devolve 0 sucessos", () => {
    assert.equal(registrarRolagemManutencao([]).sucessos, 0);
    assert.doesNotThrow(() => registrarRolagemManutencao(undefined));
    assert.equal(registrarRolagemManutencao(undefined).sucessos, 0);
  });
});

describe("registrarAcao", () => {
  it("acrescenta no topo (mais recente primeiro)", () => {
    let e = criarEncontro();
    e = registrarAcao(e, "Rodada 1 começou");
    e = registrarAcao(e, "Fulano atacou");
    assert.equal(e.registro.length, 2);
    assert.equal(e.registro[0].texto, "Fulano atacou");
  });

  it("mantém só as últimas 14 entradas", () => {
    let e = criarEncontro();
    for (let i = 0; i < 20; i++) e = registrarAcao(e, `ação ${i}`);
    assert.equal(e.registro.length, 14);
    assert.equal(e.registro[0].texto, "ação 19");
  });

  it("texto vazio não acrescenta nada", () => {
    const e = criarEncontro();
    assert.deepEqual(registrarAcao(e, ""), e);
  });
});

describe("normalizarEncontro", () => {
  it("null/undefined/lixo não lança, devolve um encontro vazio válido", () => {
    for (const lixo of [null, undefined, "x", 42, [], true]) {
      assert.doesNotThrow(() => normalizarEncontro(lixo));
      const e = normalizarEncontro(lixo);
      assert.equal(e.rodada, 1);
      assert.equal(e.fase, "manutencao");
      assert.deepEqual(e.ordem, []);
    }
  });

  it("combatente de personagem sem personagemId é descartado", () => {
    const bruto = { combatentes: { x: { tipo: "personagem" } }, ordem: ["x"] };
    const e = normalizarEncontro(bruto);
    assert.deepEqual(e.combatentes, {});
    assert.deepEqual(e.ordem, []);
  });

  it("combatente avulso com hp/mp/sp ausentes ou negativos vira default seguro", () => {
    const bruto = { combatentes: { y: { tipo: "avulso", nome: "Lobo", hp: { current: -5, max: -1 } } }, ordem: ["y"] };
    const e = normalizarEncontro(bruto);
    assert.equal(e.combatentes.y.hp.max, 1);
    assert.equal(e.combatentes.y.hp.current, 0);
  });

  it("estados inválidos (não são um dos 4) são filtrados fora", () => {
    const bruto = { combatentes: { x: { tipo: "personagem", personagemId: "almah", estados: ["ENVENENAMENTO", "LIXO"] } }, ordem: ["x"] };
    const e = normalizarEncontro(bruto);
    assert.deepEqual(e.combatentes.x.estados, ["ENVENENAMENTO"]);
  });

  it("ordem com id que não existe em combatentes é descartado; id em combatentes ausente de ordem é acrescentado", () => {
    const bruto = {
      ordem: ["fantasma", "x"],
      combatentes: { x: { tipo: "personagem", personagemId: "a" }, y: { tipo: "personagem", personagemId: "b" } },
    };
    const e = normalizarEncontro(bruto);
    assert.ok(e.ordem.includes("x"));
    assert.ok(e.ordem.includes("y"));
    assert.ok(!e.ordem.includes("fantasma"));
  });

  it("turnoIdx fora do intervalo é limitado aos limites válidos", () => {
    const bruto = {
      ordem: ["x", "y"],
      combatentes: { x: { tipo: "personagem", personagemId: "a" }, y: { tipo: "personagem", personagemId: "b" } },
      turnoIdx: 99,
    };
    assert.equal(normalizarEncontro(bruto).turnoIdx, 1);
    assert.equal(normalizarEncontro({ ...bruto, turnoIdx: -3 }).turnoIdx, 0);
  });

  it("é idempotente (normalizar de novo não muda nada)", () => {
    const e = encontroComDoisCombatentes();
    const once = normalizarEncontro(e);
    const twice = normalizarEncontro(once);
    assert.deepEqual(once, twice);
  });

  it("registro mantém só até 14 entradas e descarta itens sem texto", () => {
    const registro = Array.from({ length: 20 }, (_, i) => ({ texto: `log ${i}` }));
    registro.push(null, { semTexto: true });
    const e = normalizarEncontro({ registro });
    assert.equal(e.registro.length, 14);
  });
});

function encontroComDoisCombatentes() {
  let e = criarEncontro();
  e = adicionarCombatente(e, criarCombatentePersonagem("a"));
  e = adicionarCombatente(e, criarCombatenteAvulso({ nome: "Orc" }));
  return e;
}
