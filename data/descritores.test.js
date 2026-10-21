import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DESCRITORES, DESCRITORES_POR_ID, TIPOS_DESCRITOR, DESCRITORES_INTERNOS,
  resolverDescritorToken, nomeDoToken, textoComN, marcarDescritoresNoTexto,
} from "./descritores.js";

describe("descritores.json — integridade da tabela", () => {
  it("todo descritor tem os 8 campos esperados e tipo dentro de TIPOS_DESCRITOR", () => {
    for (const d of DESCRITORES) {
      for (const campo of ["id", "nome", "temN", "tipo", "status", "resumo", "regra", "usadoEm", "linkEmTextoLivre"]) {
        assert.ok(campo in d, `${d.id} não tem o campo ${campo}`);
      }
      assert.ok(TIPOS_DESCRITOR.includes(d.tipo), `${d.id} tem tipo fora da lista: ${d.tipo}`);
    }
  });
  it("ids são únicos", () => {
    const ids = DESCRITORES.map((d) => d.id);
    assert.equal(new Set(ids).size, ids.length);
  });
  it("DESCRITORES_POR_ID indexa pelo id certo", () => {
    assert.equal(DESCRITORES_POR_ID.preciso.nome, "Preciso");
    assert.equal(DESCRITORES_POR_ID.letal.nome, "Letal");
  });
});

describe("resolverDescritorToken — tokens internos (campos estruturados)", () => {
  it("token sem N resolve direto (letal, blindado, sortudo, azarado, reabastecer)", () => {
    assert.equal(resolverDescritorToken("letal").descritor.id, "letal");
    assert.equal(resolverDescritorToken("letal").n, null);
    assert.equal(resolverDescritorToken("blindado").descritor.id, "blindado");
    assert.equal(resolverDescritorToken("sortudo").descritor.id, "sortudo");
    assert.equal(resolverDescritorToken("azarado").descritor.id, "azarado");
    assert.equal(resolverDescritorToken("reabastecer").descritor.id, "reabastecer");
  });
  it("token com underscore vira hífen quando o id do glossário usa hífen (em_area, campo_de_mana)", () => {
    assert.equal(resolverDescritorToken("em_area").descritor.id, "em-area");
    assert.equal(resolverDescritorToken("campo_de_mana").descritor.id, "campo-de-mana");
    assert.equal(resolverDescritorToken("potente_forca").descritor.id, "potente-forca");
    assert.equal(resolverDescritorToken("potente_oficio_magico").descritor.id, "potente-oficio");
  });
  it("token com _N extrai o número certo pra descritores com temN", () => {
    assert.deepEqual(resolverDescritorToken("preciso_2"), { descritor: DESCRITORES_POR_ID.preciso, n: 2 });
    assert.deepEqual(resolverDescritorToken("esmagador_1"), { descritor: DESCRITORES_POR_ID.esmagador, n: 1 });
    assert.deepEqual(resolverDescritorToken("queimadura_3"), { descritor: DESCRITORES_POR_ID.queimadura, n: 3 });
    assert.deepEqual(resolverDescritorToken("envenenamento_2"), { descritor: DESCRITORES_POR_ID.envenenamento, n: 2 });
    assert.deepEqual(resolverDescritorToken("carga_2"), { descritor: DESCRITORES_POR_ID.carga, n: 2 });
    assert.deepEqual(resolverDescritorToken("firme_1"), { descritor: DESCRITORES_POR_ID.firme, n: 1 });
    assert.deepEqual(resolverDescritorToken("selado_1"), { descritor: DESCRITORES_POR_ID.selado, n: 1 });
    assert.deepEqual(resolverDescritorToken("lento_1"), { descritor: DESCRITORES_POR_ID.lento, n: 1 });
    assert.deepEqual(resolverDescritorToken("atrasada_1"), { descritor: DESCRITORES_POR_ID.atrasada, n: 1 });
  });
  it("tokens internos (não-glossário) não resolvem — ver DESCRITORES_INTERNOS", () => {
    for (const token of ["hp_maximo_1", "sp_maximo_menos_1", "resiste_a_magia", "desarmado_letal", "desarmado_perfurante", "sortudo_esquiva", "sortudo_fisico", "imune_envenenamento", "ignora_blindado"]) {
      assert.equal(resolverDescritorToken(token), null, token);
      assert.ok(DESCRITORES_INTERNOS[token], `${token} deveria estar em DESCRITORES_INTERNOS`);
    }
  });
  it("token desconhecido devolve null", () => {
    assert.equal(resolverDescritorToken("coisa_que_nao_existe"), null);
    assert.equal(resolverDescritorToken(""), null);
    assert.equal(resolverDescritorToken(null), null);
  });
  it("nomeDoToken monta o nome com o N quando houver", () => {
    assert.equal(nomeDoToken("preciso_2"), "Preciso 2");
    assert.equal(nomeDoToken("letal"), "Letal");
    assert.equal(nomeDoToken("hp_maximo_1"), "+1 HP máximo");
    assert.equal(nomeDoToken("token_desconhecido_xyz"), "token_desconhecido_xyz");
  });
});

describe("textoComN — substitui o N solto no resumo/regra", () => {
  it("troca N isolado pelo número", () => {
    assert.equal(textoComN("rola N dados a menos", 2), "rola 2 dados a menos");
    assert.equal(textoComN("Rola N d10 extras a 8+", 3), "Rola 3 d10 extras a 8+");
  });
  it("não troca N dentro de outra palavra", () => {
    assert.equal(textoComN("Não é uma Nova palavra", 2), "Não é uma Nova palavra");
  });
  it("n null ou undefined devolve o texto original", () => {
    assert.equal(textoComN("rola N dados a menos", null), "rola N dados a menos");
    assert.equal(textoComN("rola N dados a menos", undefined), "rola N dados a menos");
  });
});

describe("marcarDescritoresNoTexto — detecção em texto corrido", () => {
  it("texto sem nenhum descritor devolve array de 1 string igual ao original", () => {
    assert.deepEqual(marcarDescritoresNoTexto("Um texto qualquer sem nada de especial."), ["Um texto qualquer sem nada de especial."]);
  });
  it("reconhece o nome com número (Preciso 2)", () => {
    const partes = marcarDescritoresNoTexto("O ataque ganha Preciso 2 contra esquiva.");
    assert.deepEqual(partes, [
      "O ataque ganha ",
      { descritorId: "preciso", n: 2, texto: "Preciso 2" },
      " contra esquiva.",
    ]);
  });
  it("reconhece o nome sem número (Letal)", () => {
    const partes = marcarDescritoresNoTexto("Essa arma é Letal.");
    assert.deepEqual(partes, ["Essa arma é ", { descritorId: "letal", n: null, texto: "Letal" }, "."]);
  });
  it("reconhece vários nomes com número (Queimadura 3, Atrasada 1, Prioridade -1)", () => {
    assert.deepEqual(marcarDescritoresNoTexto("Dá Queimadura 3 no alvo."), [
      "Dá ", { descritorId: "queimadura", n: 3, texto: "Queimadura 3" }, " no alvo.",
    ]);
    assert.deepEqual(marcarDescritoresNoTexto("O alvo fica Atrasada 1 nessa ação."), [
      "O alvo fica ", { descritorId: "atrasada", n: 1, texto: "Atrasada 1" }, " nessa ação.",
    ]);
    assert.deepEqual(marcarDescritoresNoTexto("Todos na zona ficam Prioridade -1."), [
      "Todos na zona ficam ", { descritorId: "prioridade-menos-1", n: null, texto: "Prioridade -1" }, ".",
    ]);
  });
  it("reconhece nome composto (Potente Força)", () => {
    assert.deepEqual(marcarDescritoresNoTexto("Concede Potente Força enquanto ativo."), [
      "Concede ", { descritorId: "potente-forca", n: null, texto: "Potente Força" }, " enquanto ativo.",
    ]);
  });
  it("é insensível a acento (Continuo sem acento, Forca sem cedilha)", () => {
    assert.deepEqual(marcarDescritoresNoTexto("Fica Continuo 2 nessa cena."), [
      "Fica ", { descritorId: "continuo", n: 2, texto: "Continuo 2" }, " nessa cena.",
    ]);
    assert.deepEqual(marcarDescritoresNoTexto("Concede Potente Forca ao usuário."), [
      "Concede ", { descritorId: "potente-forca", n: null, texto: "Potente Forca" }, " ao usuário.",
    ]);
  });
  it("não confunde Preciso dentro de outra palavra (Impreciso, Precisosa)", () => {
    assert.deepEqual(marcarDescritoresNoTexto("O tiro saiu Impreciso dessa vez."), ["O tiro saiu Impreciso dessa vez."]);
    assert.deepEqual(marcarDescritoresNoTexto("Precisosa não é uma palavra real."), ["Precisosa não é uma palavra real."]);
  });
  it("não vira link em texto corrido se vier em minúscula, mesmo que linkEmTextoLivre seja true", () => {
    assert.deepEqual(marcarDescritoresNoTexto("essa arma é letal contra blindados."), ["essa arma é letal contra blindados."]);
  });
  it("descritores com linkEmTextoLivre:false não são marcados em texto corrido, mesmo com inicial maiúscula", () => {
    assert.deepEqual(marcarDescritoresNoTexto("Esse ataque é Magia e também é Em área."), ["Esse ataque é Magia e também é Em área."]);
    assert.deepEqual(marcarDescritoresNoTexto("O alvo fica Pesado e bem Veloz, mas Resistente."), ["O alvo fica Pesado e bem Veloz, mas Resistente."]);
  });
  it("não deixa dois achados que se sobrepõem colidirem", () => {
    const partes = marcarDescritoresNoTexto("Ganha Letal e Preciso 2 ao mesmo tempo.");
    assert.deepEqual(partes, [
      "Ganha ", { descritorId: "letal", n: null, texto: "Letal" },
      " e ", { descritorId: "preciso", n: 2, texto: "Preciso 2" },
      " ao mesmo tempo.",
    ]);
  });
  it("texto vazio ou nulo devolve array com o próprio valor", () => {
    assert.deepEqual(marcarDescritoresNoTexto(""), [""]);
    assert.deepEqual(marcarDescritoresNoTexto(null), [null]);
    assert.deepEqual(marcarDescritoresNoTexto(undefined), [undefined]);
  });
});
