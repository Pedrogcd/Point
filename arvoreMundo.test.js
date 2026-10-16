// Testes de arvoreMundo.js: montagem da hierarquia do mundo (reinos,
// cidades, pessoas, deuses, mesas, sagas), status das cidades, visibilidade
// por modo (gm/jogador), filtro de busca/pendências e tolerância a dado
// ruim. Alguns testes usam os seeds reais do app (via renderTestUtils.js,
// que compila point-amaranth-app.jsx) pra conferir a estrutura contra
// números conhecidos (6 reinos, 7 deuses, 5 mesas, 51 personagens). Roda com
// `node --test` (Node >=20, nativo) ou `npm test`.

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { loadAppModule } from "./renderTestUtils.js";
import {
  montarArvoreMundo, ehPendencia, filtrarArvore, resumoArvore,
  todosOsIds, idsSecoesApenas, idsAbertosPadrao,
} from "./arvoreMundo.js";

function acharPorId(no, id) {
  if (!no) return null;
  if (no.id === id) return no;
  for (const filho of no.children || []) {
    const achado = acharPorId(filho, id);
    if (achado) return achado;
  }
  return null;
}

function acharPorTipoELabel(no, t, label) {
  if (!no) return null;
  if (no.t === t && no.label === label) return no;
  for (const filho of no.children || []) {
    const achado = acharPorTipoELabel(filho, t, label);
    if (achado) return achado;
  }
  return null;
}

let SEED_KINGDOMS, SEED_GODS, SEED_CHARACTERS, SEED_SAGAS, GRUPOS;

before(async () => {
  const mod = await loadAppModule();
  SEED_KINGDOMS = mod.SEED_KINGDOMS;
  SEED_GODS = mod.SEED_GODS;
  SEED_CHARACTERS = mod.SEED_CHARACTERS;
  SEED_SAGAS = mod.SEED_SAGAS;
  GRUPOS = mod.GRUPOS;
});

describe("montarArvoreMundo — estrutura com os seeds reais do app", () => {
  it("6 reinos, 7 deuses, 5 mesas (+ 'Sem mesa' se houver sobra), sagas e resumo batendo", () => {
    const arvore = montarArvoreMundo({
      kingdoms: SEED_KINGDOMS, gods: SEED_GODS, characters: SEED_CHARACTERS,
      sagas: SEED_SAGAS, grupos: GRUPOS, gm: true,
    });
    const secReinos = arvore.children.find((c) => c.label === "Reinos");
    const secPanteao = arvore.children.find((c) => c.label === "Panteão");
    const secMesas = arvore.children.find((c) => c.label === "Mesas e personagens");
    const secSagas = arvore.children.find((c) => c.label === "Sagas");
    assert.equal(secReinos.children.length, 6);
    assert.equal(secPanteao.children.length, 7);
    // 5 mesas conhecidas (GRUPOS) + no máximo 1 "Sem mesa" extra.
    assert.ok(secMesas.children.length === 5 || secMesas.children.length === 6);
    assert.equal(secSagas.children.length, SEED_SAGAS.length);

    const resumo = resumoArvore(arvore);
    assert.equal(resumo.reino, 6);
    assert.equal(resumo.deus, 7);
    // Personagens das mesas somam o total de SEED_CHARACTERS (todos entram
    // nalguma mesa, nem que seja "Sem mesa").
    assert.equal(resumo.pessoaMesa, SEED_CHARACTERS.length);
    assert.equal(SEED_CHARACTERS.length, 51);
  });

  it("raiz é 'mundo' com label AMARANTH e sub 'Universo de Point'", () => {
    const arvore = montarArvoreMundo({ kingdoms: [], gods: [], characters: [], sagas: [], grupos: [], gm: true });
    assert.equal(arvore.t, "mundo");
    assert.equal(arvore.label, "AMARANTH");
    assert.equal(arvore.sub, "Universo de Point");
    assert.equal(arvore.id, "mundo");
  });
});

describe("status das cidades", () => {
  function reinoComCidade(cidade) {
    return { id: "r1", name: "Reino 1", cities: [cidade] };
  }
  function statusDaUnicaCidade(cidade) {
    const arvore = montarArvoreMundo({ kingdoms: [reinoComCidade(cidade)], gods: [], characters: [], sagas: [], grupos: [], gm: true });
    const reino = arvore.children[0].children[0];
    const secCidades = reino.children.find((c) => c.label === "Cidades");
    return secCidades.children[0];
  }

  it("documentada === false vira 'esboco', mesmo com resumo preenchido", () => {
    const n = statusDaUnicaCidade({ id: "c1", name: "C", resumo: "Tem texto", documentada: false });
    assert.equal(n.status, "esboco");
  });

  it("resumo vazio (sem documentada marcado) vira 'vazio'", () => {
    const n = statusDaUnicaCidade({ id: "c1", name: "C", resumo: "" });
    assert.equal(n.status, "vazio");
  });

  it("resumo preenchido e documentada ausente/true vira 'ok'", () => {
    assert.equal(statusDaUnicaCidade({ id: "c1", name: "C", resumo: "Um texto." }).status, "ok");
    assert.equal(statusDaUnicaCidade({ id: "c1", name: "C", resumo: "Um texto.", documentada: true }).status, "ok");
  });

  it("capital vira sub 'Capital' e aparece como tag", () => {
    const n = statusDaUnicaCidade({ id: "c1", name: "C", resumo: "x", capital: true });
    assert.equal(n.sub, "Capital");
  });

  it("reino sem cidades: seção com count 0 e empty, sem lançar", () => {
    const arvore = montarArvoreMundo({ kingdoms: [{ id: "r1", name: "R", cities: [] }], gods: [], characters: [], sagas: [], grupos: [], gm: true });
    const secCidades = arvore.children[0].children[0].children.find((c) => c.label === "Cidades");
    assert.equal(secCidades.count, 0);
    assert.equal(secCidades.empty, "Nenhuma cidade cadastrada");
    assert.ok(ehPendencia(secCidades));
  });
});

describe("visão do jogador esconde soMestre e ficha fechada, e NÃO conta", () => {
  const characters = [
    { id: "p1", name: "Visível", faction: "Reino X", fichaFechada: false, grupo: "c" },
    { id: "p2", name: "Secreta", faction: "Reino X", fichaFechada: true, grupo: "c" },
  ];
  const kingdoms = [{
    id: "rx", name: "Reino X", cities: [],
    pessoas: {
      estrutura: {
        titulo: "Conselho",
        grupos: [{
          id: "g1", nome: "Conselho", funcao: "",
          membros: [
            { personagemId: "p1", cargo: "Membro", ordem: 0 },
            { personagemId: "p1", cargo: "Secreto", ordem: 1, soMestre: true },
            { nomeLivre: "NPC sem ficha", cargo: "Guarda", ordem: 2 },
          ],
        }],
      },
      relacoes: [],
      genealogias: [{ id: "gen1", titulo: "Família X", nos: [
        { id: "n1", nome: "A" },
        { id: "n2", nome: "B (segredo)", soMestre: true },
      ], ligacoes: [] }],
    },
  }];
  const grupos = [{ id: "c", label: "Grupo C", subtitulo: "" }];

  it("jogador: personagem com fichaFechada não aparece na mesa, nem é contado", () => {
    const arvore = montarArvoreMundo({ kingdoms, gods: [], characters, sagas: [], grupos, gm: false });
    const mesa = arvore.children.find((c) => c.label === "Mesas e personagens").children[0];
    assert.equal(mesa.children.length, 1);
    assert.equal(mesa.children[0].label, "Visível");
    const resumo = resumoArvore(arvore);
    assert.equal(resumo.pessoaMesa, 1);
  });

  it("gm: vê os dois personagens da mesa, o secreto marcado", () => {
    const arvore = montarArvoreMundo({ kingdoms, gods: [], characters, sagas: [], grupos, gm: true });
    const mesa = arvore.children.find((c) => c.label === "Mesas e personagens").children[0];
    assert.equal(mesa.children.length, 2);
    const secreto = mesa.children.find((p) => p.secret);
    assert.ok(secreto);
    assert.equal(secreto.label, "Secreta");
  });

  it("jogador: membro soMestre de organização não aparece no grupo interno", () => {
    const arvore = montarArvoreMundo({ kingdoms, gods: [], characters, sagas: [], grupos, gm: false });
    const org = acharPorTipoELabel(arvore, "org", "Conselho");
    assert.equal(org.children.length, 2); // p1 normal + nomeLivre, não o soMestre
    assert.ok(!org.children.some((p) => p.secret));
  });

  it("gm: vê o membro soMestre da organização, marcado secret", () => {
    const arvore = montarArvoreMundo({ kingdoms, gods: [], characters, sagas: [], grupos, gm: true });
    const org = acharPorTipoELabel(arvore, "org", "Conselho");
    assert.equal(org.children.length, 3);
    assert.equal(org.children.filter((p) => p.secret).length, 1);
  });

  it("genealogia: contagem de pessoas respeita soMestre (jogador vê menos)", () => {
    const comoJogador = montarArvoreMundo({ kingdoms, gods: [], characters, sagas: [], grupos, gm: false });
    const comoGm = montarArvoreMundo({ kingdoms, gods: [], characters, sagas: [], grupos, gm: true });
    const genJogador = acharPorTipoELabel(comoJogador, "gen", "Família X");
    const genGm = acharPorTipoELabel(comoGm, "gen", "Família X");
    assert.equal(genJogador.sub, "1 pessoa");
    assert.equal(genGm.sub, "2 pessoas");
  });
});

describe("reino sem cidades e sem pessoas", () => {
  it("não quebra, e a seção de pessoas vira pendência vazia", () => {
    const arvore = montarArvoreMundo({ kingdoms: [{ id: "vazio", name: "Vazio" }], gods: [], characters: [], sagas: [], grupos: [], gm: true });
    const reino = arvore.children[0].children[0];
    const secCidades = reino.children.find((c) => c.label === "Cidades");
    const secPessoas = reino.children.find((c) => c.label === "Pessoas");
    const secGen = reino.children.find((c) => c.label === "Árvores genealógicas");
    assert.equal(secCidades.count, 0);
    assert.equal(secPessoas.count, 0);
    assert.equal(secPessoas.empty, "Sem pessoas registradas");
    assert.equal(secGen.count, 0);
    assert.ok(ehPendencia(secPessoas));
  });
});

describe("fallback por afiliação (reino sem `pessoas` estruturado)", () => {
  it("agrupa personagens com a mesma faction por affiliation, vira 'org' com membros", () => {
    const characters = [
      { id: "a", name: "A", faction: "Reino Y", affiliation: "Guarda" },
      { id: "b", name: "B", faction: "Reino Y", affiliation: "Guarda" },
      { id: "c", name: "C", faction: "Reino Y" },
      { id: "d", name: "D", faction: "Outro Reino" },
    ];
    const kingdoms = [{ id: "ry", name: "Reino Y", cities: [] }];
    const arvore = montarArvoreMundo({ kingdoms, gods: [], characters, sagas: [], grupos: [], gm: true });
    const secPessoas = arvore.children[0].children[0].children.find((c) => c.label === "Pessoas");
    assert.ok(secPessoas.children.length >= 2); // "Guarda" + "Outros" (sem afiliação)
    const guarda = secPessoas.children.find((g) => g.label === "Guarda");
    assert.equal(guarda.children.length, 2);
    assert.ok(guarda.children.every((p) => p.ficha === true));
  });

  it("reino sem pessoas e sem personagens com essa faction: seção vazia, não quebra", () => {
    const arvore = montarArvoreMundo({ kingdoms: [{ id: "rz", name: "Reino Z", cities: [] }], gods: [], characters: [{ id: "x", name: "X", faction: "Outro" }], sagas: [], grupos: [], gm: true });
    const secPessoas = arvore.children[0].children[0].children.find((c) => c.label === "Pessoas");
    assert.equal(secPessoas.children.length, 0);
    assert.equal(secPessoas.empty, "Sem pessoas registradas");
  });
});

describe("nó de pessoa carrega personagemId", () => {
  it("membro de organização com personagemId resolvido: ficha true, personagemId setado, alvo de ficha", () => {
    const kingdoms = [{
      id: "r1", name: "R1", cities: [],
      pessoas: { estrutura: { titulo: "T", grupos: [{ id: "g", nome: "G", membros: [{ personagemId: "p1", cargo: "X", ordem: 0 }] }] }, relacoes: [], genealogias: [] },
    }];
    const characters = [{ id: "p1", name: "Fulano" }];
    const arvore = montarArvoreMundo({ kingdoms, gods: [], characters, sagas: [], grupos: [], gm: true });
    const pessoa = acharPorTipoELabel(arvore, "pessoa", "Fulano");
    assert.equal(pessoa.ficha, true);
    assert.equal(pessoa.personagemId, "p1");
    assert.deepEqual(pessoa.alvo, { tipo: "ficha", personagemId: "p1" });
  });

  it("membro com nomeLivre: ficha false, sem personagemId nem alvo", () => {
    const kingdoms = [{
      id: "r1", name: "R1", cities: [],
      pessoas: { estrutura: { titulo: "T", grupos: [{ id: "g", nome: "G", membros: [{ nomeLivre: "NPC", cargo: "X", ordem: 0 }] }] }, relacoes: [], genealogias: [] },
    }];
    const arvore = montarArvoreMundo({ kingdoms, gods: [], characters: [], sagas: [], grupos: [], gm: true });
    const pessoa = acharPorTipoELabel(arvore, "pessoa", "NPC");
    assert.equal(pessoa.ficha, false);
    assert.equal(pessoa.personagemId, undefined);
    assert.equal(pessoa.alvo, undefined);
  });

  it("personagem de mesa sempre carrega personagemId e alvo de ficha", () => {
    const characters = [{ id: "m1", name: "Membro da mesa", grupo: "c" }];
    const grupos = [{ id: "c", label: "Grupo C" }];
    const arvore = montarArvoreMundo({ kingdoms: [], gods: [], characters, sagas: [], grupos, gm: true });
    const pessoa = acharPorTipoELabel(arvore, "pessoa", "Membro da mesa");
    assert.equal(pessoa.personagemId, "m1");
    assert.deepEqual(pessoa.alvo, { tipo: "ficha", personagemId: "m1" });
  });
});

describe("ehPendencia", () => {
  it("cidade esboço/vazio, pessoa sem ficha, grupo com count 0 são pendência", () => {
    assert.ok(ehPendencia({ t: "cidade", status: "esboco" }));
    assert.ok(ehPendencia({ t: "cidade", status: "vazio" }));
    assert.ok(ehPendencia({ t: "pessoa", ficha: false }));
    assert.ok(ehPendencia({ t: "grupo", count: 0 }));
  });
  it("cidade ok, pessoa com ficha, grupo com count > 0, org/mesa com count 0 não são pendência", () => {
    assert.ok(!ehPendencia({ t: "cidade", status: "ok" }));
    assert.ok(!ehPendencia({ t: "pessoa", ficha: true }));
    assert.ok(!ehPendencia({ t: "grupo", count: 2 }));
    assert.ok(!ehPendencia({ t: "org", count: 0 }));
    assert.ok(!ehPendencia({ t: "mesa", count: 0 }));
  });
  it("tolerante a nó undefined/null", () => {
    assert.equal(ehPendencia(null), false);
    assert.equal(ehPendencia(undefined), false);
  });
});

describe("filtrarArvore", () => {
  const arvore = {
    id: "mundo", t: "mundo", label: "AMARANTH", children: [
      { id: "s1", t: "grupo", label: "Reinos", count: 1, children: [
        { id: "r1", t: "reino", label: "Katalão", children: [] },
      ] },
      { id: "s2", t: "grupo", label: "Panteão", count: 1, children: [
        { id: "d1", t: "deus", label: "Kronos", sub: "Tempo" },
      ] },
    ],
  };

  it("busca que não casa com nada devolve null", () => {
    assert.equal(filtrarArvore(arvore, "xyz-nao-existe", false), null);
  });

  it("busca por label marca hit e preserva o caminho até a raiz", () => {
    const r = filtrarArvore(arvore, "Kronos", false);
    assert.ok(r);
    const deus = acharPorId(r, "d1");
    assert.ok(deus);
    assert.equal(deus.hit, true);
  });

  it("busca por `sub` também casa (ex: domínio do deus)", () => {
    const r = filtrarArvore(arvore, "tempo", false);
    assert.ok(acharPorId(r, "d1"));
  });

  it("sem termo e sem pendências: devolve a árvore inteira, sem nada marcado hit", () => {
    const r = filtrarArvore(arvore, "", false);
    assert.deepEqual(todosOsIds(r), todosOsIds(arvore));
    assert.equal(r.hit, false);
    const deus = acharPorId(r, "d1");
    assert.equal(deus.hit, false);
  });

  it("tolerante a nó null", () => {
    assert.equal(filtrarArvore(null, "x", false), null);
  });
});

describe("resumoArvore / todosOsIds / idsSecoesApenas / idsAbertosPadrao", () => {
  it("resumoArvore tolera árvore vazia sem lançar", () => {
    const vazio = montarArvoreMundo({ kingdoms: [], gods: [], characters: [], sagas: [], grupos: [], gm: true });
    assert.doesNotThrow(() => resumoArvore(vazio));
    const r = resumoArvore(vazio);
    assert.equal(r.reino, 0);
    assert.equal(r.pendencias, 4); // as 4 seções do topo, todas com count 0
  });

  it("todosOsIds inclui a raiz e todo mundo embaixo, sem duplicar a estrutura", () => {
    const vazio = montarArvoreMundo({ kingdoms: [], gods: [], characters: [], sagas: [], grupos: [], gm: true });
    const ids = todosOsIds(vazio);
    assert.ok(ids.includes("mundo"));
    assert.equal(ids.length, 1 + vazio.children.length);
  });

  it("idsSecoesApenas pega só as 4 seções do topo; idsAbertosPadrao também abre os reinos", () => {
    const arvore = montarArvoreMundo({ kingdoms: [{ id: "r1", name: "R1" }], gods: [], characters: [], sagas: [], grupos: [], gm: true });
    const secoes = idsSecoesApenas(arvore);
    assert.equal(secoes.size, 4);
    assert.ok(!secoes.has("reino:r1"));
    const padrao = idsAbertosPadrao(arvore);
    assert.ok(padrao.has("reino:r1"));
    assert.equal(padrao.size, 5);
  });

  it("tolerante a raiz null/undefined", () => {
    assert.deepEqual(todosOsIds(null), []);
    assert.equal(idsSecoesApenas(null).size, 0);
    assert.equal(idsAbertosPadrao(undefined).size, 0);
  });
});

describe("tolerância a dado ruim", () => {
  it("montarArvoreMundo sem nenhum argumento não lança", () => {
    assert.doesNotThrow(() => montarArvoreMundo());
    assert.doesNotThrow(() => montarArvoreMundo({}));
  });

  it("kingdoms/gods/characters/sagas/grupos como null/string/número não lançam", () => {
    for (const lixo of [null, undefined, "x", 42, {}]) {
      assert.doesNotThrow(() => montarArvoreMundo({ kingdoms: lixo, gods: lixo, characters: lixo, sagas: lixo, grupos: lixo, gm: true }));
    }
  });

  it("ids repetidos entre cidades/membros não lançam (ids do nó ficam únicos por índice)", () => {
    const kingdoms = [{
      id: "r1", name: "R1",
      cities: [{ id: "dup", name: "Um" }, { id: "dup", name: "Dois" }],
    }];
    assert.doesNotThrow(() => {
      const arvore = montarArvoreMundo({ kingdoms, gods: [], characters: [], sagas: [], grupos: [], gm: true });
      const secCidades = arvore.children[0].children[0].children.find((c) => c.label === "Cidades");
      const ids = secCidades.children.map((c) => c.id);
      assert.equal(new Set(ids).size, ids.length);
    });
  });

  it("personagem referenciado por personagemId que não existe mais vira ficha:false", () => {
    const kingdoms = [{
      id: "r1", name: "R1", cities: [],
      pessoas: { estrutura: { titulo: "T", grupos: [{ id: "g", nome: "G", membros: [{ personagemId: "fantasma", cargo: "X", ordem: 0 }] }] }, relacoes: [], genealogias: [] },
    }];
    assert.doesNotThrow(() => {
      const arvore = montarArvoreMundo({ kingdoms, gods: [], characters: [], sagas: [], grupos: [], gm: true });
      const pessoa = acharPorTipoELabel(arvore, "pessoa", "Personagem removido");
      assert.equal(pessoa.ficha, false);
    });
  });
});
