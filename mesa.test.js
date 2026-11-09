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
  const personagens = [{ id: "b", name: "Bruna", imageUrl: "x.jpg", visivelJogador: true }, { id: "a", name: "Almah", visivelJogador: true }];
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

describe("separadores do 'Falar como' (07/11)", async () => {
  const { identidadesDaMesa, gruposDeIdentidades } = await import("./mesa.js");
  it("fichas por reino (Outra/sem reino por último) e NPCs por local", () => {
    const personagens = [
      { id: "1", name: "Zed", faction: "Goethia" }, { id: "2", name: "Ana", faction: "Hetalion" },
      { id: "3", name: "Bia", faction: "Outra" }, { id: "4", name: "Caio", faction: "Goethia" }, { id: "5", name: "Dan" },
    ];
    const npcs = [{ id: "v", nome: "Irmã Veyla", local: "Frontier (Katalão)" }];
    const g = gruposDeIdentidades(identidadesDaMesa({ personagens, npcs, gm: true }));
    assert.deepEqual(g.map((x) => x.rotulo), ["Mestre", "Fichas — Goethia", "Fichas — Hetalion", "Fichas — Outra", "Fichas — Sem reino", "NPCs — Frontier (Katalão)"]);
    assert.deepEqual(g[1].itens.map((i) => i.nome), ["Caio", "Zed"]);
  });
});

describe("névoa de guerra (07/11)", async () => {
  const { retanguloDeArraste, camadasDeNevoa } = await import("./mesa.js");
  it("retângulo normalizado em qualquer direção e recortado na mesa; pequeno demais = null", () => {
    assert.deepEqual(retanguloDeArraste([300, 200], [100, 50]), { x: 100, y: 50, w: 200, h: 150 });
    assert.deepEqual(retanguloDeArraste([-50, -50], [100, 100]), { x: 0, y: 0, w: 100, h: 100 });
    assert.equal(retanguloDeArraste([10, 10], [12, 300]), null);
  });
  it("camadas de névoa só com nevoa/revelado, na ordem", () => {
    const c = camadasDeNevoa([{ id: "a", tipo: "revelado", ordem: 3 }, { id: "b", tipo: "traco", ordem: 1 }, { id: "c", tipo: "nevoa", ordem: 2 }]);
    assert.deepEqual(c.map((x) => x.id), ["c", "a"]);
  });
});

describe("névoa com formas (07/11)", async () => {
  const { formaDaNevoa, encaixarPonto, circuloDeArraste, fecharPoligono } = await import("./mesa.js");
  it("forma padrão é retângulo (objetos antigos)", () => {
    assert.equal(formaDaNevoa({ tipo: "nevoa", x: 0 }), "retangulo");
    assert.equal(formaDaNevoa({ forma: "poligono" }), "poligono");
  });
  it("encaixar ponto na grade, só se ligado", () => {
    assert.deepEqual(encaixarPonto([104, 36], 70), [70, 70]);
    assert.deepEqual(encaixarPonto([104, 36], 70, false), [104, 36]);
  });
  it("círculo pelo centro e raio; pequeno = null", () => {
    assert.deepEqual(circuloDeArraste([100, 100], [130, 140]), { cx: 100, cy: 100, r: 50 });
    assert.equal(circuloDeArraste([0, 0], [2, 2]), null);
  });
  it("polígono: tira duplicados (duplo clique) e exige 3 pontos com área", () => {
    assert.deepEqual(fecharPoligono([[0, 0], [100, 0], [100, 100], [100, 100]]), [[0, 0], [100, 0], [100, 100]]);
    assert.equal(fecharPoligono([[0, 0], [100, 0]]), null);
    assert.equal(fecharPoligono([[0, 0], [50, 0], [100, 0]]), null); // colinear: sem área
  });
});

describe("camadas das imagens (07/11)", async () => {
  const { camadaDaImagem, imagensDaCamada } = await import("./mesa.js");
  const objs = [
    { id: "m", tipo: "imagem", camada: "mapa" }, { id: "t", tipo: "imagem", camada: "token" },
    { id: "v", tipo: "imagem" }, { id: "g", tipo: "imagem", camada: "gm" }, { id: "x", tipo: "traco" },
  ];
  it("sem camada (antigos) conta como Jogadores", () => {
    assert.equal(camadaDaImagem({}), "token");
  });
  it("camada do Mestre só aparece pro Mestre", () => {
    assert.deepEqual(imagensDaCamada(objs, "gm", true).map((o) => o.id), ["g"]);
    assert.deepEqual(imagensDaCamada(objs, "gm", false), []);
    assert.deepEqual(imagensDaCamada(objs, "token", false).map((o) => o.id), ["t", "v"]);
  });
});

describe("borracha por área (07/11)", async () => {
  const { tracoTocaRetangulo } = await import("./mesa.js");
  const area = { x: 100, y: 100, w: 100, h: 100 };
  it("traço com ponto dentro da área", () => {
    assert.equal(tracoTocaRetangulo([[0, 0], [150, 150]], area), true);
  });
  it("traço que só atravessa a área (pontos fora)", () => {
    assert.equal(tracoTocaRetangulo([[50, 150], [250, 150]], area), true);
  });
  it("traço longe da área", () => {
    assert.equal(tracoTocaRetangulo([[0, 0], [50, 300]], area), false);
  });
});

describe("jogadores e tokens de personagem (07/11)", async () => {
  const { identidadesDaMesa, gruposDeIdentidades, idDoJogador, fichasDoJogador, tokenDePersonagem, podeMoverImagem } = await import("./mesa.js");
  const personagens = [
    { id: "a", name: "Almah", faction: "Suth", visivelJogador: true },
    { id: "s", name: "Segredo", faction: "Suth", visivelJogador: false },
    { id: "k", name: "Kiryu", faction: "Hetalion", visivelJogador: false },
  ];
  it("jogador não vê ficha 'só GM', a não ser que seja dele; as dele vêm primeiro", () => {
    const g = gruposDeIdentidades(identidadesDaMesa({ personagens, minhas: ["k"] }));
    assert.deepEqual(g.map((x) => x.rotulo), ["Minhas fichas", "Fichas — Suth"]);
    assert.deepEqual(g.flatMap((x) => x.itens.map((i) => i.nome)), ["Kiryu", "Almah"]);
  });
  it("registro do jogador pelo nome (sem acento/maiúscula)", () => {
    assert.equal(idDoJogador("Pedro Álvares"), "jogador:pedro-alvares");
    const objs = [{ id: "jogador:ana", tipo: "jogador", nome: "Ana", fichas: ["k"] }];
    assert.deepEqual(fichasDoJogador(objs, "ana"), ["k"]);
    assert.deepEqual(fichasDoJogador(objs, "Bia"), []);
  });
  it("token de ficha guarda fichaId, nome e retrato", () => {
    const t = tokenDePersonagem({ id: "t1", ficha: { id: "a", name: "Almah", imageUrl: "x.jpg" }, x: 0, y: 0, tamanho: 70, dono: "Ana" });
    assert.equal(t.fichaId, "a"); assert.equal(t.nome, "Almah"); assert.equal(t.url, "x.jpg"); assert.equal(t.redondo, true);
  });
  it("quem move: Mestre na camada ativa; jogador só os dele ou de ficha dele", () => {
    const meu = { camada: "token", dono: "Ana" };
    const daFicha = { camada: "token", fichaId: "k" };
    const outro = { camada: "token", dono: "Bia" };
    assert.equal(podeMoverImagem(meu, { gm: false, eu: "ana" }), true);
    assert.equal(podeMoverImagem(daFicha, { gm: false, eu: "Ana", minhas: ["k"] }), true);
    assert.equal(podeMoverImagem(outro, { gm: false, eu: "Ana" }), false);
    assert.equal(podeMoverImagem({ camada: "mapa" }, { gm: true, camadaAtiva: "token" }), false);
  });
});

describe("aba Jogadores do Mestre (07/11)", async () => {
  const { tokensDoJogador, renomearJogador, idsParaExcluirJogador } = await import("./mesa.js");
  const ana = { id: "jogador:ana", tipo: "jogador", nome: "Ana", fichas: ["k"] };
  const objs = [ana, { id: "jogador:bia", tipo: "jogador", nome: "Bia", fichas: [] },
    { id: "t1", tipo: "imagem", dono: "ana" }, { id: "t2", tipo: "imagem", dono: "Bia" }, { id: "t3", tipo: "imagem" }];
  it("tokens do jogador pelo nome (sem diferença de maiúscula)", () => {
    assert.deepEqual(tokensDoJogador(objs, "Ana").map((t) => t.id), ["t1"]);
  });
  it("renomear: registro novo com as fichas, apaga o antigo e passa os tokens", () => {
    const r = renomearJogador(objs, ana, "Ana Clara");
    assert.deepEqual(r.apagar, ["jogador:ana"]);
    assert.equal(r.salvar[0].id, "jogador:ana-clara");
    assert.deepEqual(r.salvar[0].fichas, ["k"]);
    assert.equal(r.salvar[1].dono, "Ana Clara");
  });
  it("renomear pra nome de outro jogador ou vazio: recusa", () => {
    assert.equal(renomearJogador(objs, ana, "bia"), null);
    assert.equal(renomearJogador(objs, ana, "  "), null);
  });
  it("excluir com e sem tokens", () => {
    assert.deepEqual(idsParaExcluirJogador(objs, ana), ["jogador:ana"]);
    assert.deepEqual(idsParaExcluirJogador(objs, ana, { comTokens: true }), ["jogador:ana", "t1"]);
  });
});

describe("sussurro (08/11)", async () => {
  const { mensagemDeFala, mensagemVisivel, destinosDeSussurro, parseSussurro, rotuloDoDestino } = await import("./mesa.js");
  const jogadores = [{ id: "jogador:ana", nome: "Ana" }, { id: "jogador:ana-clara", nome: "Ana Clara" }, { id: "jogador:bia", nome: "Bia" }];
  const autorAna = { id: "ficha:k", nome: "Kiryu", tipo: "ficha" };
  it("mensagem pública: todos veem", () => {
    const m = mensagemDeFala(autorAna, "oi", { jogador: "Ana" });
    assert.equal(m.para, null);
    assert.equal(mensagemVisivel(m, { eu: "Bia" }), true);
  });
  it("sussurro da Ana pro Mestre: Ana e Mestre veem, Bia não", () => {
    const m = mensagemDeFala(autorAna, "segredo", { jogador: "Ana", para: "mestre" });
    assert.equal(m.autor.jogador, "Ana");
    assert.equal(mensagemVisivel(m, { gm: true }), true);
    assert.equal(mensagemVisivel(m, { eu: "ana" }), true);
    assert.equal(mensagemVisivel(m, { eu: "Bia" }), false);
    assert.equal(mensagemVisivel(m, { eu: "" }), false);
  });
  it("sussurro do Mestre pra Bia: só Bia (e o Mestre)", () => {
    const m = mensagemDeFala({ id: "mestre", nome: "Mestre", tipo: "mestre" }, "psst", { gm: true, para: "jogador:bia" });
    assert.equal(mensagemVisivel(m, { eu: "Bia" }), true);
    assert.equal(mensagemVisivel(m, { eu: "Ana" }), false);
  });
  it("opções do 'Para:' e comando /w com nome com espaço", () => {
    assert.deepEqual(destinosDeSussurro(jogadores, { eu: "Ana" }).map((d) => d.id), ["", "mestre", "jogador:ana-clara", "jogador:bia"]);
    assert.deepEqual(destinosDeSussurro(jogadores, { gm: true }).map((d) => d.id), ["", "mestre", "jogador:ana", "jogador:ana-clara", "jogador:bia"]);
    assert.deepEqual(parseSussurro("/w Ana Clara vem cá", jogadores), { para: "jogador:ana-clara", texto: "vem cá" });
    assert.deepEqual(parseSussurro("/w mestre posso roubar?", jogadores), { para: "mestre", texto: "posso roubar?" });
    assert.equal(parseSussurro("/w Zé oi", jogadores), null);
    assert.equal(rotuloDoDestino("jogador:bia", jogadores), "Bia");
  });
});

describe("jogador fala como ele mesmo (08/11)", async () => {
  const { identidadesDaMesa, gruposDeIdentidades } = await import("./mesa.js");
  it("sem ficha nenhuma: só 'Você' (nunca Mestre)", () => {
    const ids = identidadesDaMesa({ personagens: [{ id: "x", name: "Oculto" }], eu: "Bia" });
    assert.deepEqual(ids.map((i) => [i.nome, i.tipo]), [["Bia", "jogador"]]);
    assert.deepEqual(gruposDeIdentidades(ids).map((g) => g.rotulo), ["Você"]);
  });
  it("com fichas: 'Você' primeiro, depois 'Minhas fichas'", () => {
    const g = gruposDeIdentidades(identidadesDaMesa({ personagens: [{ id: "k", name: "Kiryu" }], eu: "Ana", minhas: ["k"] }));
    assert.deepEqual(g.map((x) => x.rotulo), ["Você", "Minhas fichas"]);
  });
});

describe("rolar da ficha (08/11)", async () => {
  const { dadosDaFicha } = await import("./mesa.js");
  it("soma Atributo + Proficiência (+ extra), mínimo 1", () => {
    const f = { atributosGerais: { destreza: 4 }, proficiencias: { combateCorpoACorpo: 2 } };
    assert.deepEqual(dadosDaFicha(f, "destreza", "combateCorpoACorpo"), { atributo: 4, proficiencia: 2, total: 6 });
    assert.equal(dadosDaFicha(f, "destreza", "combateCorpoACorpo", 2).total, 8);
    assert.equal(dadosDaFicha({ atributosGerais: { forca: 0 }, proficiencias: { armas: 0 } }, "forca", "armas").total, 1);
  });
});
