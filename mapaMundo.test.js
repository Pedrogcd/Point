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
  before(async () => {
    const mod = await loadAppModule();
    CidadePaginaView = mod.CidadePaginaView;
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
});
