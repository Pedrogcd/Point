// Testes das funções puras da Mesa (mesa.js).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseComandoRolagem, rolarDados, identidadesDaMesa, mensagemDeFala, mensagemDeRolagem,
  juntarMensagem, juntarObjeto, tirarObjeto, configDaMesa, encaixarNaGrade, simplificarPontos,
  caminhoDoTraco, linhaParaObjeto, linhaParaMensagem, AUTOR_MESTRE, MAX_DADOS, GRADE_PADRAO,
  criarConexaoMesa,
} from "./mesa.js";

describe("parseComandoRolagem", () => {
  it("/r 5, /r 5d10, alvo e rótulo", () => {
    assert.deepEqual(parseComandoRolagem("/r 5"), { dados: 5, alvo: 6, rotulo: "" });
    assert.deepEqual(parseComandoRolagem("/r 4d10 7+ Ataque de espada"), { dados: 4, alvo: 7, rotulo: "Ataque de espada" });
    assert.deepEqual(parseComandoRolagem("/roll 3 alvo 8"), { dados: 3, alvo: 8, rotulo: "" });
  });
  it("texto comum não é comando; limita a quantidade de dados", () => {
    assert.equal(parseComandoRolagem("olá, taverneiro"), null);
    assert.equal(parseComandoRolagem("/r 999").dados, MAX_DADOS);
  });
});

describe("rolarDados", () => {
  it("conta sucessos >= alvo e 10 sempre", () => {
    const seq = [0.05, 0.55, 0.95, 0.65]; // 1, 6, 10, 7
    let i = 0;
    const r = rolarDados(4, 7, () => seq[i++]);
    assert.deepEqual(r.faces, [1, 6, 10, 7]);
    assert.equal(r.sucessos, 2);
    assert.equal(r.criticos, 1);
  });
});

describe("identidadesDaMesa", () => {
  const personagens = [{ id: "b", name: "Bruna", imageUrl: "x.jpg" }, { id: "a", name: "Almah" }];
  const npcs = [{ id: "veyla", nome: "Irmã Veyla", img: "mundo/retratos/veyla.jpg" }];
  it("jogador: só fichas, em ordem alfabética", () => {
    assert.deepEqual(identidadesDaMesa({ personagens, npcs }).map((x) => x.nome), ["Almah", "Bruna"]);
  });
  it("mestre: Mestre + fichas + NPCs, imagem resolvida", () => {
    const ids = identidadesDaMesa({ personagens, npcs, gm: true, resolverImagem: (p) => `/Point/${p}` });
    assert.deepEqual(ids.map((x) => x.nome), ["Mestre", "Almah", "Bruna", "Irmã Veyla"]);
    assert.equal(ids.at(-1).img, "/Point/mundo/retratos/veyla.jpg");
  });
});

describe("mensagens", () => {
  it("fala vazia não vira mensagem; fala e rolagem guardam o autor", () => {
    assert.equal(mensagemDeFala(AUTOR_MESTRE, "   "), null);
    const f = mensagemDeFala({ id: "ficha:a", nome: "Almah", img: null, tipo: "ficha" }, " Oi ");
    assert.equal(f.texto, "Oi");
    assert.equal(f.autor.nome, "Almah");
    const r = mensagemDeRolagem(AUTOR_MESTRE, { faces: [6], alvo: 6, sucessos: 1 }, { rotulo: "Percepção", gm: true });
    assert.equal(r.tipo, "rolagem");
    assert.equal(r.texto, "Percepção");
  });
  it("juntarMensagem não duplica e ordena por criação", () => {
    const a = { id: "1", criado_em: "2026-11-07T10:00:00Z" };
    const b = { id: "2", criado_em: "2026-11-07T09:00:00Z" };
    const lista = juntarMensagem(juntarMensagem([], a), b);
    assert.deepEqual(lista.map((m) => m.id), ["2", "1"]);
    assert.equal(juntarMensagem(lista, a), lista);
  });
});

describe("objetos do tabuleiro", () => {
  it("juntar substitui pelo id e ordena; tirar remove", () => {
    let l = juntarObjeto([], { id: "x", ordem: 2 });
    l = juntarObjeto(l, { id: "y", ordem: 1 });
    l = juntarObjeto(l, { id: "x", ordem: 3, novo: true });
    assert.deepEqual(l.map((o) => o.id), ["y", "x"]);
    assert.equal(l[1].novo, true);
    assert.deepEqual(tirarObjeto(l, "y").map((o) => o.id), ["x"]);
  });
  it("config padrão: grade ligada, tamanho padrão", () => {
    assert.deepEqual(configDaMesa([]), { grade: true, tamanhoGrade: GRADE_PADRAO });
    assert.deepEqual(configDaMesa([{ id: "config", grade: false, tamanhoGrade: 50 }]), { grade: false, tamanhoGrade: 50 });
  });
  it("encaixar na grade", () => {
    assert.equal(encaixarNaGrade(104, 70), 70);
    assert.equal(encaixarNaGrade(106, 70), 140);
  });
  it("simplificar traço mantém as pontas e tira pontos colineares", () => {
    const pts = [[0, 0], [1, 0.1], [2, 0], [3, 0.05], [10, 0]];
    const s = simplificarPontos(pts, 1);
    assert.deepEqual(s, [[0, 0], [10, 0]]);
    assert.equal(caminhoDoTraco(s), "M0,0 L10,0");
  });
  it("linha do banco vira objeto/mensagem", () => {
    assert.deepEqual(linhaParaObjeto({ id: "t1", tipo: "traco", ordem: 5, data: { cor: "#000", pontos: [[1, 2]] } }),
      { cor: "#000", pontos: [[1, 2]], id: "t1", tipo: "traco", ordem: 5 });
    assert.equal(linhaParaMensagem({ id: "1", tipo: "fala", autor: { nome: "A" }, texto: "oi" }).texto, "oi");
  });
});

describe("conexão local (sem Supabase)", () => {
  it("guarda mensagens e objetos e devolve ao carregar", async () => {
    const memoria = new Map();
    globalThis.localStorage = { getItem: (k) => memoria.get(k) ?? null, setItem: (k, v) => memoria.set(k, v) };
    const c = criarConexaoMesa(null);
    assert.equal(c.modo, "local");
    await c.enviarMensagem({ id: "1", criado_em: "2026-11-07T10:00:00Z", tipo: "fala", texto: "oi" });
    await c.salvarObjeto({ id: "img", tipo: "imagem", ordem: 1 });
    let s = await c.carregar();
    assert.equal(s.mensagens.length, 1);
    assert.equal(s.objetos.length, 1);
    await c.apagarObjeto("img");
    await c.limparMensagens();
    s = await c.carregar();
    assert.deepEqual(s, { mensagens: [], objetos: [] });
    delete globalThis.localStorage;
  });
});
