// Testes de mapaMundo.js: geometria pura (percentual, bbox, recorte) e
// migração do formato antigo de cidades. Também um smoke test de render da
// aba Mundo (WorldView) com e sem dados de mapa, pra não repetir o bug de
// tela branca. Roda com `node --test` (Node >=20, nativo) ou `npm test`.

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  slugificar, paraPercentual, bboxPoligono, calcularRecorte,
  migrarCidade, migrarCidades, cidadesPosicionadas, personagemDaPessoa,
} from "./mapaMundo.js";
import { loadAppModule } from "./renderTestUtils.js";
import { FRONTIER, NPCS, NPC_GRUPOS } from "./mundoDados.js";

describe("slugificar", () => {
  it("remove acentos, espaços e maiúsculas", () => {
    assert.equal(slugificar("Katalão"), "katalao");
    assert.equal(slugificar("Riviéra"), "riviera");
    assert.equal(slugificar("  Kingsyard  "), "kingsyard");
  });
  it("nunca fica vazio", () => {
    assert.equal(slugificar(""), "cidade");
    assert.equal(slugificar(undefined), "cidade");
  });
});

describe("paraPercentual", () => {
  it("ponto (0.5, 0.5) cai no centro — 50%/50%, igual em qualquer largura de contêiner (é só porcentagem, não pixel)", () => {
    assert.deepEqual(paraPercentual([0.5, 0.5]), { left: "50%", top: "50%" });
  });
  it("(0,0) e (1,1) ficam nos cantos", () => {
    assert.deepEqual(paraPercentual([0, 0]), { left: "0%", top: "0%" });
    assert.deepEqual(paraPercentual([1, 1]), { left: "100%", top: "100%" });
  });
});

describe("bboxPoligono", () => {
  it("calcula a caixa delimitadora de um polígono", () => {
    const bbox = bboxPoligono([[0.1, 0.2], [0.5, 0.1], [0.4, 0.6]]);
    assert.deepEqual(bbox, { minX: 0.1, minY: 0.1, maxX: 0.5, maxY: 0.6, width: 0.4, height: 0.5 });
  });
  it("null com menos de 3 pontos, vazio ou ausente", () => {
    assert.equal(bboxPoligono([[0.1, 0.2]]), null);
    assert.equal(bboxPoligono([]), null);
    assert.equal(bboxPoligono(undefined), null);
  });
});

describe("calcularRecorte", () => {
  it("escala pra caber o polígono + folga, sem deslocar quando já está centralizado", () => {
    const r = calcularRecorte([[0.4, 0.4], [0.6, 0.4], [0.6, 0.6], [0.4, 0.6]], 0.1);
    // bbox 0.2x0.2; folga 10% = 0.02 de cada lado => caixa final 0.24x0.24
    assert.ok(Math.abs(r.scale - 1 / 0.24) < 1e-9, `scale inesperado: ${r.scale}`);
    assert.ok(Math.abs(r.translateX) < 1e-9);
    assert.ok(Math.abs(r.translateY) < 1e-9);
  });
  it("desloca pra centralizar um território que não está no centro da imagem", () => {
    const r = calcularRecorte([[0, 0], [0.2, 0], [0.2, 0.2], [0, 0.2]], 0);
    // centro do bbox é (0.1, 0.1); precisa empurrar 0.5-0.1=0.4 => 40%
    assert.ok(Math.abs(r.translateX - 40) < 1e-9);
    assert.ok(Math.abs(r.translateY - 40) < 1e-9);
  });
  it("null sem polígono válido", () => {
    assert.equal(calcularRecorte(undefined), null);
    assert.equal(calcularRecorte([[0.1, 0.1]]), null);
  });
});

describe("migrarCidade / migrarCidades — migração do formato antigo", () => {
  it("formato antigo ({name, description}) ganha id, x, y, capital e os campos novos; description migra pra resumo sem perder o texto", () => {
    const nova = migrarCidade({ name: "Kingsyard", description: "Cidade portuária." });
    assert.equal(nova.name, "Kingsyard");
    assert.equal(nova.resumo, "Cidade portuária.");
    assert.equal("description" in nova, false);
    assert.equal(nova.id, "kingsyard");
    assert.equal(nova.x, null);
    assert.equal(nova.y, null);
    assert.equal(nova.capital, false);
    assert.equal(nova.visaoGeral, "");
    assert.equal(nova.imageUrl, "");
    assert.deepEqual(nova.distritos, []);
    assert.deepEqual(nova.pessoas, []);
  });
  it("preserva campos extras (ex: link) e x/y já existentes, sem sobrescrever", () => {
    const c = { id: "frontier", name: "Frontier", resumo: "d", link: "sidepoint/frontier.html", x: 0.3, y: 0.4, capital: true, visaoGeral: "texto", imageUrl: "http://x", distritos: [{ id: "a" }], pessoas: [{ id: "b" }] };
    const nova = migrarCidade(c);
    assert.deepEqual(nova, c);
  });
  it("migrarCidades desempata ids colidentes (nomes iguais sem diferenciar maiúsculas/acento) e preserva o resumo de cada uma", () => {
    const lista = [{ name: "Katalão", description: "a" }, { name: "katalao", description: "b" }];
    const migrada = migrarCidades(lista);
    assert.equal(migrada[0].id, "katalao");
    assert.equal(migrada[1].id, "katalao_2");
    assert.equal(migrada[0].resumo, "a");
    assert.equal(migrada[1].resumo, "b");
  });
  it("é idempotente: migrar de novo o resultado já migrado não muda nada", () => {
    const lista = [{ name: "Mundis", description: "x" }, { id: "frontier", name: "Frontier", description: "y", x: 0.2, y: 0.2 }];
    const uma = migrarCidades(lista);
    const duas = migrarCidades(uma);
    assert.deepEqual(duas, uma);
  });
  it("cidades sem nome não quebram a migração", () => {
    assert.doesNotThrow(() => migrarCidades([{ description: "sem nome" }, null, undefined]));
  });
});

describe("personagemDaPessoa", () => {
  const characters = [{ id: "almah", name: "Almah Mason" }, { id: "kiryu", name: "Kiryu" }];
  it("personagemId válido devolve o personagem certo", () => {
    const pessoa = { id: "p1", nome: "Lorde Otto", personagemId: "almah" };
    assert.equal(personagemDaPessoa(pessoa, characters)?.name, "Almah Mason");
  });
  it("personagemId ausente devolve null", () => {
    assert.equal(personagemDaPessoa({ id: "p1", nome: "Lorde Otto" }, characters), null);
  });
  it("personagemId apontando pra personagem apagado devolve null (sem quebrar)", () => {
    assert.equal(personagemDaPessoa({ id: "p1", nome: "Lorde Otto", personagemId: "fantasma" }, characters), null);
  });
});

describe("cidadesPosicionadas", () => {
  it("filtra só as cidades com x/y numéricos", () => {
    const lista = [{ id: "a", x: 0.1, y: 0.2 }, { id: "b", x: null, y: null }, { id: "c" }];
    assert.deepEqual(cidadesPosicionadas(lista).map((c) => c.id), ["a"]);
  });
});

describe("Aba Mundo (WorldView) — renderiza com e sem dados de mapa", () => {
  let WorldView;
  before(async () => {
    const mod = await loadAppModule();
    WorldView = mod.WorldView;
  });

  function render(kingdoms) {
    return renderToStaticMarkup(
      React.createElement(WorldView, { kingdoms, setKingdoms: () => {}, askConfirm: () => {}, gm: false })
    );
  }

  it("reino sem campo mapa renderiza sem lançar (não desenha overlay)", () => {
    const kingdoms = [{ id: "hetalion", name: "Hetalion", description: "", cities: [] }];
    assert.doesNotThrow(() => render(kingdoms));
  });

  it("reino com mapa.poligono vazio (ainda não traçado) renderiza sem lançar", () => {
    const kingdoms = [{ id: "katalao", name: "Katalão", description: "", mapa: { cor: "#C9A227", poligono: [] }, cities: [] }];
    assert.doesNotThrow(() => render(kingdoms));
  });

  it("reino com mapa.poligono e cidades posicionadas renderiza sem lançar", () => {
    const kingdoms = [{
      id: "katalao", name: "Katalão", description: "",
      mapa: { cor: "#C9A227", poligono: [[0.1, 0.2], [0.3, 0.2], [0.3, 0.4], [0.1, 0.4]] },
      cities: [{ id: "frontier", name: "Frontier", description: "d", x: 0.2, y: 0.3, capital: false }],
    }];
    assert.doesNotThrow(() => render(kingdoms));
  });

  it("renderiza mesmo com cidade ainda sem x/y (não posicionada)", () => {
    const kingdoms = [{
      id: "katalao", name: "Katalão", description: "",
      mapa: { cor: "#C9A227", poligono: [[0, 0], [1, 0], [1, 1]] },
      cities: [{ id: "kingsyard", name: "Kingsyard", description: "", x: null, y: null, capital: false }],
    }];
    assert.doesNotThrow(() => render(kingdoms));
  });

  it("os seis reinos semente (alguns com mapa, outros sem) renderizam juntos sem lançar", () => {
    const kingdoms = [
      { id: "hetalion", name: "Hetalion", description: "", cities: [{ name: "Novolar", description: "" }] },
      {
        id: "katalao", name: "Katalão", description: "",
        mapa: { cor: "#C9A227", poligono: [[0.05, 0.1], [0.3, 0.05], [0.28, 0.4], [0.05, 0.42]] },
        cities: [{ id: "katalao_cidade", name: "Katalão", description: "", x: 0.15, y: 0.2, capital: true }],
      },
      { id: "maxis", name: "Maxis Power", description: "", cities: [] },
      { id: "suth", name: "Suth", description: "", cities: [] },
      { id: "goethia", name: "Goethia", description: "", cities: [] },
      { id: "amaranth", name: "Amaranth/Omem", description: "", cities: [] },
    ];
    assert.doesNotThrow(() => render(kingdoms));
  });
});

describe("CidadePaginaView — página da cidade nas três abas", () => {
  let CidadePaginaView;
  let SEED_KINGDOMS;
  before(async () => {
    const mod = await loadAppModule();
    CidadePaginaView = mod.CidadePaginaView;
    SEED_KINGDOMS = mod.SEED_KINGDOMS;
  });

  const characters = [{ id: "almah", name: "Almah Mason" }];

  // Cidade vazia — exatamente como as 11 sementes de Katalão nascem: sem
  // distritos, sem pessoas, sem imagem. É o caso que não pode "parecer quebrado".
  const cidadeVazia = { id: "kingsyard", name: "Kingsyard", resumo: "", visaoGeral: "", imageUrl: "", distritos: [], pessoas: [] };
  // Cidade cheia — com distrito, e uma pessoa de interesse COM vínculo válido
  // e outra com personagemId inválido (apagado), lado a lado.
  const cidadeCheia = {
    id: "frontier", name: "Frontier", resumo: "resumo curto", visaoGeral: "texto longo", imageUrl: "",
    distritos: [{ id: "d1", nome: "Vila Nova", descricao: "desc", notas: "notas" }],
    pessoas: [
      { id: "p1", nome: "Lorde Otto", papel: "Regente", descricao: "d", faccao: "Brennard", imageUrl: "", personagemId: "almah" },
      { id: "p2", nome: "Fantasma", papel: "?", descricao: "d", faccao: "", imageUrl: "", personagemId: "apagado_ha_tempos" },
    ],
  };
  function kingdomsCom(cidade) {
    return [{ id: "katalao", name: "Katalão", description: "", cities: [cidade] }];
  }
  function render(cidade, aba) {
    return renderToStaticMarkup(
      React.createElement(CidadePaginaView, {
        kingdoms: kingdomsCom(cidade), setKingdoms: () => {}, reinoId: "katalao", cidadeId: cidade.id, abaInicial: aba,
        characters, askConfirm: () => {}, onVoltarMundo: () => {}, onVoltarReino: () => {}, onAbrirFicha: () => {},
      })
    );
  }

  for (const aba of ["geral", "distritos", "pessoas"]) {
    it(`cidade vazia — aba ${aba} renderiza sem lançar`, () => {
      assert.doesNotThrow(() => render(cidadeVazia, aba));
    });
    it(`cidade cheia — aba ${aba} renderiza sem lançar`, () => {
      assert.doesNotThrow(() => render(cidadeCheia, aba));
    });
  }

  it("estado vazio de distritos mostra texto convidativo e botão de adicionar, não área em branco", () => {
    const html = render(cidadeVazia, "distritos");
    assert.ok(html.includes("Nenhum distrito cadastrado"));
    assert.ok(html.includes("Adicionar distrito"));
  });
  it("estado vazio de pessoas mostra texto convidativo e botão de adicionar", () => {
    const html = render(cidadeVazia, "pessoas");
    assert.ok(html.includes("Nenhuma pessoa de interesse cadastrada"));
    assert.ok(html.includes("Adicionar pessoa"));
  });

  it("pessoa com personagemId válido mostra o botão Abrir ficha", () => {
    const soComVinculo = { ...cidadeCheia, pessoas: [cidadeCheia.pessoas[0]] };
    const html = render(soComVinculo, "pessoas");
    assert.ok(html.includes("Abrir ficha"));
  });
  it("pessoa com personagemId inválido (personagem apagado) renderiza sem erro e sem o botão Abrir ficha", () => {
    const soSemVinculo = { ...cidadeCheia, pessoas: [cidadeCheia.pessoas[1]] };
    assert.doesNotThrow(() => render(soSemVinculo, "pessoas"));
    const html = render(soSemVinculo, "pessoas");
    assert.ok(!html.includes("Abrir ficha"));
  });

  it("cidade inexistente (removida nesse meio tempo) não quebra — mostra aviso e botão de voltar", () => {
    const kingdoms = [{ id: "katalao", name: "Katalão", description: "", cities: [] }];
    assert.doesNotThrow(() => renderToStaticMarkup(
      React.createElement(CidadePaginaView, {
        kingdoms, setKingdoms: () => {}, reinoId: "katalao", cidadeId: "nao-existe", abaInicial: "geral",
        characters, askConfirm: () => {}, onVoltarMundo: () => {}, onVoltarReino: () => {}, onAbrirFicha: () => {},
      })
    ));
  });

  // Bug real (PR #14, antes do merge): a aba "Visão geral" ficava em branco
  // pra toda cidade que só tinha `resumo` (migrado de `description`) e ainda
  // não tinha `visaoGeral` escrito — parecia defeito, não campo a preencher.
  describe("aba Visão geral — nunca em branco quando a cidade tem algum texto", () => {
    it("cidade só com resumo: mostra esse texto (não fica em branco)", () => {
      const cidade = { id: "x", name: "X", resumo: "Resumo curto de verdade.", visaoGeral: "", distritos: [], pessoas: [] };
      const html = render(cidade, "geral");
      assert.ok(html.includes("Resumo curto de verdade."));
    });

    it("cidade com resumo e visaoGeral: mostra os dois, resumo como abertura e visaoGeral abaixo", () => {
      const cidade = { id: "x", name: "X", resumo: "Abertura.", visaoGeral: "Corpo mais longo.", distritos: [], pessoas: [] };
      const html = render(cidade, "geral");
      assert.ok(html.includes("Abertura."));
      assert.ok(html.includes("Corpo mais longo."));
      assert.ok(html.indexOf("Abertura.") < html.indexOf("Corpo mais longo."));
    });

    it("cidade sem texto nenhum: mostra o estado vazio convidativo", () => {
      const cidade = { id: "x", name: "X", resumo: "", visaoGeral: "", distritos: [], pessoas: [] };
      const html = render(cidade, "geral");
      assert.ok(html.includes("Nenhum texto ainda"));
    });

    it("cidade com `link` (guia dos jogadores, ex: Frontier): mostra o botão de abrir o guia", () => {
      const cidade = { id: "frontier", name: "Frontier", resumo: "r", visaoGeral: "", link: "sidepoint/frontier.html", distritos: [], pessoas: [] };
      const html = render(cidade, "geral");
      assert.ok(html.includes("Abrir guia dos jogadores"));
    });
  });

  // Auditoria pedida depois do bug acima: nenhum campo de texto de nenhuma
  // cidade semente (as 11 de Katalão, inclusive Frontier) pode ficar sem
  // aparecer em NENHUMA das três abas — isso seria perda de conteúdo real.
  it("nenhuma cidade semente (SEED_KINGDOMS) tem texto preenchido que a página não exiba em alguma aba", () => {
    const falhas = [];
    for (const reino of SEED_KINGDOMS) {
      for (const cidade of reino.cities || []) {
        const htmlCombinado = ["geral", "distritos", "pessoas"]
          .map((aba) => renderToStaticMarkup(
            React.createElement(CidadePaginaView, {
              kingdoms: [{ ...reino, cities: [cidade] }], setKingdoms: () => {}, reinoId: reino.id, cidadeId: cidade.id, abaInicial: aba,
              characters, askConfirm: () => {}, onVoltarMundo: () => {}, onVoltarReino: () => {}, onAbrirFicha: () => {},
            })
          ))
          .join("\n");
        for (const campo of ["resumo", "visaoGeral", "link"]) {
          const valor = cidade[campo];
          if (typeof valor === "string" && valor.trim() && !htmlCombinado.includes(valor)) {
            falhas.push(`${reino.name} > ${cidade.name}: campo "${campo}" tem texto mas não aparece em nenhuma aba`);
          }
        }
        for (const d of cidade.distritos || []) {
          for (const campo of ["nome", "descricao", "notas"]) {
            const valor = d[campo];
            if (typeof valor === "string" && valor.trim() && !htmlCombinado.includes(valor)) {
              falhas.push(`${reino.name} > ${cidade.name}: distrito "${d.nome || d.id}" campo "${campo}" não aparece em nenhuma aba`);
            }
          }
        }
        for (const p of cidade.pessoas || []) {
          for (const campo of ["nome", "papel", "descricao", "faccao"]) {
            const valor = p[campo];
            if (typeof valor === "string" && valor.trim() && !htmlCombinado.includes(valor)) {
              falhas.push(`${reino.name} > ${cidade.name}: pessoa "${p.nome || p.id}" campo "${campo}" não aparece em nenhuma aba`);
            }
          }
        }
      }
    }
    assert.deepEqual(falhas, []);
  });
});

// Unificação pedida depois do bug acima: clicar numa cidade (mapa ou "Abrir
// cidade" na aba Cidades) deve levar ao dossiê completo (CidadeView, lendo
// mundoDados.js) quando existir um pra aquele id, e à página leve
// (CidadePaginaView) quando não existir. kingdom.cities[] é só geografia —
// não duplicamos nem migramos o conteúdo de mundoDados.js pra lá.
describe("CidadeView — dossiê completo (Frontier) e confidencialidade mestre/jogador", () => {
  let CidadeView, NpcDetalhe, MundoPopup, CIDADE_INFO_CARREGADO;
  before(async () => {
    const mod = await loadAppModule();
    CidadeView = mod.CidadeView;
    NpcDetalhe = mod.NpcDetalhe;
    MundoPopup = mod.MundoPopup;
    CIDADE_INFO_CARREGADO = mod.CIDADE_INFO;
  });

  function renderCidade(aba, gm) {
    return renderToStaticMarkup(
      React.createElement(CidadeView, {
        cidade: FRONTIER, gm, nomeReino: "Katalão", abaInicial: aba,
        onVoltar: () => {}, onVoltarMundo: () => {}, onAcao: () => {},
      })
    );
  }
  function renderNpc(npcId, gm) {
    return renderToStaticMarkup(React.createElement(NpcDetalhe, { npcId, gm, onAcao: () => {} }));
  }
  function renderPopup(acao, gm) {
    return renderToStaticMarkup(React.createElement(MundoPopup, { acao, gm, onClose: () => {}, onAcao: () => {} }));
  }

  it("Frontier tem dossiê (CIDADE_INFO); as outras 10 cidades semente de Katalão não têm", () => {
    assert.ok(CIDADE_INFO_CARREGADO.frontier);
    const semDossie = ["katalao_cidade", "kingsyard", "mundis", "riviera", "atlarin", "atlas", "promet", "kil", "pompeia", "tengov"];
    for (const id of semDossie) assert.ok(!CIDADE_INFO_CARREGADO[id], `${id} não devia ter dossiê`);
  });

  it("cidade COM dossiê renderiza o dossiê completo, sem lançar, em toda aba e nos dois modos", () => {
    for (const aba of ["geral", "distritos", "personagens", "forcas", "mestre"]) {
      for (const gm of [false, true]) assert.doesNotThrow(() => renderCidade(aba, gm), `aba=${aba} gm=${gm}`);
    }
  });

  it("abaInicial abre direto na aba certa — é o mesmo mecanismo que os botões do modal do mapa usam", () => {
    assert.ok(renderCidade("geral", false).includes("O conceito"));
    assert.ok(renderCidade("distritos", false).includes("Os campos de cevada")); // título de um distrito
    assert.ok(renderCidade("personagens", false).includes("Lorde Otto Brennard"));
    assert.ok(renderCidade("forcas", true).includes("Rubrasol"));
  });

  it("nada de mundoDados.js ficou inacessível: cada campo de texto de Frontier aparece em alguma aba (ou no popup de distrito/termo)", () => {
    const htmlCidade = ["geral", "distritos", "personagens", "forcas", "mestre"].map((aba) => renderCidade(aba, true)).join("\n");
    for (const [, valor] of FRONTIER.ficha) {
      const texto = typeof valor === "string" ? valor : (valor.gm || valor.pub);
      assert.ok(htmlCidade.includes(texto), `ficha não aparece: ${texto}`);
    }
    for (const [titulo] of FRONTIER.chegada) assert.ok(htmlCidade.includes(titulo), `chegada não aparece: ${titulo}`);
    for (const e of FRONTIER.estetica) assert.ok(htmlCidade.includes(e), `estética não aparece: ${e}`);
    for (const m of FRONTIER.medos) assert.ok(htmlCidade.includes(m.gm || m.pub), `medo não aparece: ${m.gm || m.pub}`);
    for (const f of FRONTIER.forcas) {
      const titulo = typeof f.titulo === "string" ? f.titulo : (f.titulo.gm || f.titulo.pub);
      assert.ok(htmlCidade.includes(titulo), `força não aparece: ${titulo}`);
    }
    for (const npc of NPCS) assert.ok(htmlCidade.includes(npc.nome), `NPC não aparece: ${npc.nome}`);
    assert.ok(htmlCidade.includes(FRONTIER.gm.boatos[0]));
    assert.ok(htmlCidade.includes(FRONTIER.gm.gatilhos[0]));
    assert.ok(htmlCidade.includes(FRONTIER.gm.entregadores[0][1]));
    // Distritos e termos têm o título na aba, mas o corpo (pub/gm) só aparece
    // no popup — testa que nenhum fica inacessível por ali também.
    for (const [id, d] of Object.entries(FRONTIER.distritos)) {
      const htmlPopup = renderPopup({ tipo: "distrito", id }, true);
      assert.ok(htmlPopup.includes(d.gm || d.pub), `distrito sem corpo no popup: ${id}`);
    }
    for (const [id, t] of Object.entries(FRONTIER.termos)) {
      const htmlPopup = renderPopup({ tipo: "termo", id }, true);
      assert.ok(htmlPopup.includes(t.gm || t.pub), `termo sem corpo no popup: ${id}`);
    }
  });

  describe("confidencialidade — nada só-mestre aparece no modo jogador (o ponto mais importante)", () => {
    it("Visão geral: medos e ficha com valor só-mestre não aparecem pro jogador", () => {
      const html = renderCidade("geral", false);
      for (const m of FRONTIER.medos) {
        if (m.gm && m.gm !== m.pub) assert.ok(!html.includes(m.gm), `vazou medo gm: ${m.gm}`);
      }
      for (const [, valor] of FRONTIER.ficha) {
        if (valor && typeof valor === "object" && valor.gm && valor.gm !== valor.pub) {
          assert.ok(!html.includes(valor.gm), `vazou ficha gm: ${valor.gm}`);
        }
      }
    });

    it("Forças: título/rótulo/texto só-mestre (ex: 'A Balança') não aparecem pro jogador", () => {
      const html = renderCidade("forcas", false);
      for (const f of FRONTIER.forcas) {
        if (f.gm && f.gm !== f.pub) assert.ok(!html.includes(f.gm), `vazou força gm: ${f.gm}`);
        if (f.titulo?.gm && f.titulo.gm !== f.titulo.pub) assert.ok(!html.includes(f.titulo.gm), `vazou título gm: ${f.titulo.gm}`);
        if (f.rotulo?.gm && f.rotulo.gm !== f.rotulo.pub) assert.ok(!html.includes(f.rotulo.gm), `vazou rótulo gm: ${f.rotulo.gm}`);
      }
    });

    it("Distritos: corpo só-mestre não aparece pro jogador no popup", () => {
      for (const [id, d] of Object.entries(FRONTIER.distritos)) {
        if (d.gm && d.gm !== d.pub) {
          const html = renderPopup({ tipo: "distrito", id }, false);
          assert.ok(!html.includes(d.gm), `vazou distrito gm: ${id}`);
        }
      }
    });

    it("Termos (glossário): corpo só-mestre não aparece pro jogador no popup", () => {
      for (const [id, t] of Object.entries(FRONTIER.termos)) {
        if (t.gm && t.gm !== t.pub) {
          const html = renderPopup({ tipo: "termo", id }, false);
          assert.ok(!html.includes(t.gm), `vazou termo gm: ${id}`);
        }
      }
    });

    it("A aba 'Mesa do mestre' nem aparece na lista de abas pro jogador", () => {
      assert.ok(!renderCidade("geral", false).includes("Mesa do mestre"));
    });

    it("Mesa do mestre (entregadores/gatilhos/boatos) não aparece em NENHUMA aba pro jogador, mesmo pedindo abaInicial='mestre'", () => {
      for (const aba of ["geral", "distritos", "personagens", "forcas", "mestre"]) {
        const html = renderCidade(aba, false);
        for (const texto of FRONTIER.gm.gatilhos) assert.ok(!html.includes(texto), `vazou gatilho (aba ${aba})`);
        for (const texto of FRONTIER.gm.boatos) assert.ok(!html.includes(texto), `vazou boato (aba ${aba})`);
        for (const [a, b] of FRONTIER.gm.entregadores) { assert.ok(!html.includes(a)); assert.ok(!html.includes(b)); }
      }
    });

    it("Mesa do mestre aparece pro mestre (prova que o teste acima não passa só por nunca renderizar nada)", () => {
      const html = renderCidade("mestre", true);
      assert.ok(html.includes(FRONTIER.gm.boatos[0]));
      assert.ok(html.includes(FRONTIER.gm.gatilhos[0]));
      assert.ok(html.includes(FRONTIER.gm.entregadores[0][1]));
    });

    it("NPCs: segredo, ganchos e texto/kv/papel só-mestre nunca aparecem pro jogador — campo a campo, pros 18 NPCs", () => {
      // Só é "segredo" se a versão gm tiver conteúdo que a pub (a que o
      // jogador realmente vê) não tem — se gm for só uma reformulação mais
      // curta que já está contida na pub (ex: Berta: kv.Família pub "...que
      // nasceram na cidade" / gm "...que nasceram"), não é vazamento nenhum.
      const sóNaVersaoGm = (pubTexto, gmTexto) => gmTexto && gmTexto !== pubTexto && !(pubTexto || "").includes(gmTexto);
      for (const npc of NPCS) {
        const html = renderNpc(npc.id, false);
        if (npc.gm?.segredo) assert.ok(!html.includes(npc.gm.segredo), `vazou segredo de ${npc.id}`);
        for (const gancho of npc.gm?.ganchos || []) assert.ok(!html.includes(gancho), `vazou gancho de ${npc.id}`);
        if (sóNaVersaoGm(npc.texto, npc.gm?.texto)) assert.ok(!html.includes(npc.gm.texto), `vazou texto gm de ${npc.id}`);
        if (sóNaVersaoGm(npc.papel, npc.gm?.papel)) assert.ok(!html.includes(npc.gm.papel), `vazou papel gm de ${npc.id}`);
        for (const [k, v] of Object.entries(npc.gm?.kv || {})) {
          if (sóNaVersaoGm(npc.kv?.[k], v)) assert.ok(!html.includes(v), `vazou kv gm (${k}) de ${npc.id}`);
        }
      }
    });

    it("NPCs: segredo e ganchos aparecem pro mestre quando existem (prova que o teste acima não é vazio)", () => {
      const comSegredo = NPCS.filter((n) => n.gm?.segredo);
      assert.ok(comSegredo.length > 0, "nenhum NPC de teste tem segredo — fixture ruim");
      for (const npc of comSegredo) {
        assert.ok(renderNpc(npc.id, true).includes(npc.gm.segredo), `segredo de ${npc.id} não aparece pro mestre`);
      }
    });

    it("NPC_GRUPOS: rótulo de grupo só-mestre ('crime'→'Crime') não aparece pro jogador", () => {
      assert.ok(!renderCidade("personagens", false).includes("Crime"));
      assert.ok(renderCidade("personagens", true).includes("Crime"));
      assert.ok(NPC_GRUPOS.crime.gm === "Crime"); // confere a fixture antes de confiar no teste acima
    });
  });

  describe("CidadePaginaView — aviso de 'sem dossiê completo' só aparece quando realmente não há dossiê", () => {
    let CidadePaginaView;
    before(async () => {
      const mod = await loadAppModule();
      CidadePaginaView = mod.CidadePaginaView;
    });
    function renderPagina(cidade) {
      return renderToStaticMarkup(
        React.createElement(CidadePaginaView, {
          kingdoms: [{ id: "katalao", name: "Katalão", cities: [cidade] }], setKingdoms: () => {},
          reinoId: "katalao", cidadeId: cidade.id, abaInicial: "geral",
          characters: [], askConfirm: () => {}, onVoltarMundo: () => {}, onVoltarReino: () => {}, onAbrirFicha: () => {},
        })
      );
    }
    it("cidade sem dossiê mostra o aviso", () => {
      const html = renderPagina({ id: "kingsyard", name: "Kingsyard", resumo: "", visaoGeral: "", distritos: [], pessoas: [] });
      assert.ok(html.includes("ainda não tem um dossiê completo"));
    });
    it("se o id coincidir com um dossiê existente, o aviso não aparece (blindagem defensiva)", () => {
      const html = renderPagina({ id: "frontier", name: "Frontier", resumo: "", visaoGeral: "", distritos: [], pessoas: [] });
      assert.ok(!html.includes("ainda não tem um dossiê completo"));
    });
  });
});
