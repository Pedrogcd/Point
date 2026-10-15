// Testes de rotasMapa.js: geometria pura (curva, simplificação RDP,
// colagem em cidade) e migração/visibilidade de rotas do mapa do mundo.
// Roda com `node --test` (Node >=20, nativo) ou `npm test`.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  TIPOS_ROTA, TIPO_ROTA_PADRAO, ESTILO_ROTA,
  caminhoSuave, simplificarTraco, grudarNaCidade,
  normalizarRota, migrarRotas, rotasVisiveis, rotuloRota,
} from "./rotasMapa.js";

describe("caminhoSuave", () => {
  it("sem pontos devolve string vazia", () => {
    assert.equal(caminhoSuave([]), "");
    assert.equal(caminhoSuave(undefined), "");
  });

  it("um ponto só vira um M sozinho (sem C — nada pra curvar)", () => {
    const d = caminhoSuave([{ x: 0.5, y: 0.5 }], 1000, 800);
    assert.equal(d, "M 500 400");
    assert.ok(!d.includes("C"));
  });

  it("dois pontos: M + um C (curva quase reta, pontos de controle entre os dois)", () => {
    const d = caminhoSuave([{ x: 0, y: 0 }, { x: 1, y: 0 }], 1000, 1000);
    assert.match(d, /^M 0 0 C /);
    const partes = d.split(" ");
    assert.equal(partes[0], "M");
    assert.equal(partes[3], "C");
    // ponto final da curva é o segundo ponto, em pixels (1000,0)
    assert.equal(partes[partes.length - 2], "1000");
    assert.equal(partes[partes.length - 1], "0");
  });

  it("converte pra pixels usando largura/altura passados (não normalizado)", () => {
    const d = caminhoSuave([{ x: 0.25, y: 0.5 }, { x: 0.75, y: 0.5 }], 2000, 1000);
    assert.ok(d.startsWith("M 500 500"));
  });

  it("ignora pontos inválidos (sem x/y numéricos) em vez de lançar", () => {
    assert.doesNotThrow(() => caminhoSuave([{ x: 0.1, y: 0.2 }, null, { foo: "bar" }, { x: 0.5, y: 0.5 }]));
  });

  it("três pontos geram dois comandos C (um segmento por par consecutivo)", () => {
    const d = caminhoSuave([{ x: 0, y: 0 }, { x: 0.5, y: 0 }, { x: 1, y: 0 }], 1000, 1000);
    assert.equal((d.match(/C /g) || []).length, 2);
  });
});

describe("simplificarTraco (Ramer-Douglas-Peucker)", () => {
  it("uma linha reta com muitos pontos colineares reduz a só os 2 extremos", () => {
    const pontos = Array.from({ length: 20 }, (_, i) => ({ x: i / 19, y: 0.3 }));
    const simplificado = simplificarTraco(pontos, 0.004, 1);
    assert.equal(simplificado.length, 2);
    assert.deepEqual(simplificado[0], { x: 0, y: 0.3 });
    assert.deepEqual(simplificado[simplificado.length - 1], { x: 1, y: 0.3 });
  });

  it("um traço com um desvio real (zigue-zague) mantém o ponto do meio", () => {
    const pontos = [
      { x: 0, y: 0 }, { x: 0.25, y: 0.001 }, { x: 0.5, y: 0.2 }, { x: 0.75, y: 0.001 }, { x: 1, y: 0 },
    ];
    const simplificado = simplificarTraco(pontos, 0.01, 1);
    assert.ok(simplificado.length >= 3, `esperava manter o pico do meio, ficou com ${simplificado.length} pontos`);
    assert.ok(simplificado.some((p) => Math.abs(p.x - 0.5) < 1e-9));
  });

  it("2 pontos ou menos devolve como está (nada pra simplificar)", () => {
    assert.deepEqual(simplificarTraco([{ x: 0, y: 0 }]), [{ x: 0, y: 0 }]);
    assert.deepEqual(simplificarTraco([{ x: 0, y: 0 }, { x: 1, y: 1 }]), [{ x: 0, y: 0 }, { x: 1, y: 1 }]);
    assert.deepEqual(simplificarTraco([]), []);
  });

  it("tolerância maior simplifica mais (eps alto reduz até um zigue-zague pequeno a 2 pontos)", () => {
    const pontos = [{ x: 0, y: 0 }, { x: 0.5, y: 0.02 }, { x: 1, y: 0 }];
    const comEpsPequeno = simplificarTraco(pontos, 0.001, 1);
    const comEpsGrande = simplificarTraco(pontos, 0.5, 1);
    assert.equal(comEpsPequeno.length, 3);
    assert.equal(comEpsGrande.length, 2);
  });
});

describe("grudarNaCidade", () => {
  const cidades = [
    { id: "kingsyard", x: 0.2, y: 0.3 },
    { id: "frontier", x: 0.6, y: 0.6 },
  ];

  it("ponto dentro do raio cola na cidade mais próxima (recebe cidadeId e as coordenadas exatas dela)", () => {
    const r = grudarNaCidade({ x: 0.205, y: 0.302 }, cidades, 0.025, 1);
    assert.deepEqual(r, { x: 0.2, y: 0.3, cidadeId: "kingsyard" });
  });

  it("ponto fora do raio de QUALQUER cidade devolve o ponto original, sem cidadeId", () => {
    const ponto = { x: 0.9, y: 0.9 };
    const r = grudarNaCidade(ponto, cidades, 0.025, 1);
    assert.equal(r, ponto); // mesmo objeto, não um novo com cidadeId
    assert.ok(!("cidadeId" in r));
  });

  it("cola na mais próxima, não na primeira da lista", () => {
    const r = grudarNaCidade({ x: 0.59, y: 0.59 }, cidades, 0.05, 1);
    assert.equal(r.cidadeId, "frontier");
  });

  it("sem cidades (lista vazia/ausente) devolve o ponto original", () => {
    assert.deepEqual(grudarNaCidade({ x: 0.1, y: 0.1 }, [], 0.025, 1), { x: 0.1, y: 0.1 });
    assert.deepEqual(grudarNaCidade({ x: 0.1, y: 0.1 }, undefined, 0.025, 1), { x: 0.1, y: 0.1 });
  });

  it("ponto inválido devolve ele mesmo sem lançar", () => {
    assert.doesNotThrow(() => grudarNaCidade(null, cidades, 0.025, 1));
    assert.equal(grudarNaCidade(null, cidades, 0.025, 1), null);
  });

  it("usa o aspecto pra corrigir a distância em y (cidade só perto em y corrigido entra no raio)", () => {
    // aspecto 0.5: diferença de 0.04 em y vira 0.02 corrigido — entra no raio 0.025.
    const r = grudarNaCidade({ x: 0.2, y: 0.34 }, cidades, 0.025, 0.5);
    assert.equal(r.cidadeId, "kingsyard");
    // sem correção (aspecto 1), a mesma diferença de 0.04 em y não entraria no raio 0.025.
    const semGruda = grudarNaCidade({ x: 0.2, y: 0.34 }, cidades, 0.025, 1);
    assert.ok(!("cidadeId" in semGruda));
  });
});

describe("normalizarRota / migrarRotas", () => {
  it("rota válida passa praticamente intacta", () => {
    const r = normalizarRota({ id: "r1", nome: "Estrada Real", tipo: "terrestre", pontos: [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.5 }], visivel: true, soMestre: false });
    assert.equal(r.id, "r1");
    assert.equal(r.nome, "Estrada Real");
    assert.equal(r.tipo, "terrestre");
    assert.equal(r.pontos.length, 2);
  });

  it("tipo inválido vira o padrão (terrestre), não descarta a rota", () => {
    const r = normalizarRota({ id: "r2", tipo: "aerea", pontos: [{ x: 0, y: 0 }, { x: 1, y: 1 }] });
    assert.equal(r.tipo, TIPO_ROTA_PADRAO);
  });

  it("menos de 2 pontos descarta a rota inteira (null)", () => {
    assert.equal(normalizarRota({ id: "r3", pontos: [{ x: 0.5, y: 0.5 }] }), null);
    assert.equal(normalizarRota({ id: "r4", pontos: [] }), null);
    assert.equal(normalizarRota({ id: "r5" }), null);
  });

  it("ponto fora de 0-1 é grampeado (clamp), não descartado sozinho", () => {
    const r = normalizarRota({ id: "r6", pontos: [{ x: -0.5, y: 2 }, { x: 0.5, y: 0.5 }] });
    assert.deepEqual(r.pontos[0], { x: 0, y: 1 });
  });

  it("ponto com x/y não numérico é descartado (os outros pontos válidos continuam)", () => {
    const r = normalizarRota({ id: "r7", pontos: [{ x: "foo", y: 0.1 }, { x: 0.2, y: 0.2 }, { x: 0.4, y: 0.4 }] });
    assert.equal(r.pontos.length, 2);
  });

  it("migrarRotas tolera lixo total: null, não-array, item null, item sem pontos — nunca lança", () => {
    assert.deepEqual(migrarRotas(null), []);
    assert.deepEqual(migrarRotas(undefined), []);
    assert.deepEqual(migrarRotas("não é uma lista"), []);
    assert.doesNotThrow(() => migrarRotas([null, 42, "lixo", {}, { pontos: null }, { pontos: [{ x: 0.1, y: 0.1 }] }]));
    const resultado = migrarRotas([null, 42, "lixo", {}, { pontos: null }, { pontos: [{ x: 0.1, y: 0.1 }] }]);
    assert.deepEqual(resultado, []); // nenhum item tinha 2+ pontos válidos
  });

  it("migrarRotas mantém as rotas válidas junto com o lixo descartado, e desempata ids colididos", () => {
    const resultado = migrarRotas([
      null,
      { id: "dup", pontos: [{ x: 0, y: 0 }, { x: 0.2, y: 0.2 }] },
      { id: "dup", pontos: [{ x: 0.5, y: 0.5 }, { x: 0.6, y: 0.6 }] },
      { pontos: [{ x: 0.1 }] }, // y ausente — rota inteira descartada
    ]);
    assert.equal(resultado.length, 2);
    assert.equal(resultado[0].id, "dup");
    assert.notEqual(resultado[1].id, "dup");
  });

  it("rota criada pelo GM (já com id de verdade) nunca tem o id trocado ao migrar de novo — idempotente", () => {
    const original = { id: "rota_gm_123", nome: "Rota do GM", tipo: "maritima", pontos: [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.9 }], visivel: true, soMestre: false };
    const primeiraMigracao = migrarRotas([original]);
    const segundaMigracao = migrarRotas(primeiraMigracao);
    assert.deepEqual(primeiraMigracao, segundaMigracao);
    assert.equal(segundaMigracao[0].id, "rota_gm_123");
  });
});

describe("rotasVisiveis", () => {
  const rotas = [
    { id: "a", visivel: true, soMestre: false },
    { id: "b", visivel: false, soMestre: false },
    { id: "c", visivel: true, soMestre: true },
    { id: "d", visivel: false, soMestre: true },
  ];

  it("jogador (gm=false) só vê visivel && !soMestre", () => {
    const ids = rotasVisiveis(rotas, false).map((r) => r.id);
    assert.deepEqual(ids, ["a"]);
  });

  it("GM vê todas, inclusive ocultas e só-mestre", () => {
    const ids = rotasVisiveis(rotas, true).map((r) => r.id);
    assert.deepEqual(ids, ["a", "b", "c", "d"]);
  });

  it("lista ausente/inválida não lança, devolve vazio", () => {
    assert.deepEqual(rotasVisiveis(null, true), []);
    assert.deepEqual(rotasVisiveis(undefined, false), []);
  });
});

describe("rotuloRota", () => {
  const cidades = [{ id: "a", name: "Kingsyard" }, { id: "b", name: "Frontier" }];

  it("as duas pontas coladas em cidade viram 'A → B'", () => {
    const rota = { pontos: [{ x: 0.1, y: 0.1, cidadeId: "a" }, { x: 0.5, y: 0.5 }, { x: 0.9, y: 0.9, cidadeId: "b" }] };
    assert.equal(rotuloRota(rota, cidades), "Kingsyard → Frontier");
  });

  it("só uma ponta colada vira 'A → ?' ou '? → B'", () => {
    assert.equal(rotuloRota({ pontos: [{ x: 0.1, y: 0.1, cidadeId: "a" }, { x: 0.9, y: 0.9 }] }, cidades), "Kingsyard → ?");
    assert.equal(rotuloRota({ pontos: [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.9, cidadeId: "b" }] }, cidades), "? → Frontier");
  });

  it("nenhuma ponta colada devolve null (rota livre, sem cidades nas pontas)", () => {
    assert.equal(rotuloRota({ pontos: [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.9 }] }, cidades), null);
  });

  it("rota sem pontos ou nula devolve null sem lançar", () => {
    assert.doesNotThrow(() => rotuloRota({ pontos: [] }, cidades));
    assert.doesNotThrow(() => rotuloRota(null, cidades));
    assert.equal(rotuloRota(null, cidades), null);
  });
});

describe("constantes exportadas", () => {
  it("TIPOS_ROTA tem os 3 tipos esperados, sem 'aerea'", () => {
    assert.deepEqual(TIPOS_ROTA, ["terrestre", "ferrovia", "maritima"]);
  });
  it("ESTILO_ROTA tem entrada pros 3 tipos", () => {
    for (const tipo of TIPOS_ROTA) assert.ok(ESTILO_ROTA[tipo], `falta estilo pro tipo ${tipo}`);
  });
});
