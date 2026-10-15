// Testes do layout da árvore genealógica (ver arvoreLayout.js — função pura,
// sem React/DOM). Roda com `node --test` (Node >=20, nativo) ou `npm test`.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  layoutGenealogia, agruparUnioes, ligacoesVisiveis,
  CARTAO_LARGURA, CARTAO_ALTURA, GAP_FAMILIAS, LINHA_ALTURA, MARGEM,
} from "./arvoreLayout.js";

function porId(layout) {
  return new Map(layout.nos.map((n) => [n.id, n]));
}

describe("layoutGenealogia", () => {
  it("(a) casal com 2 filhos: filhos na linha abaixo, centrados sob o casal", () => {
    const nos = [{ id: "pai" }, { id: "mae" }, { id: "f1" }, { id: "f2" }];
    const ligacoes = [
      { pais: ["pai", "mae"], filho: "f1", tipo: "filho" },
      { pais: ["pai", "mae"], filho: "f2", tipo: "filho" },
    ];
    const layout = layoutGenealogia(nos, ligacoes);
    const n = porId(layout);
    assert.equal(n.get("pai").geracao, 0);
    assert.equal(n.get("mae").geracao, 0);
    assert.equal(n.get("f1").geracao, 1);
    assert.equal(n.get("f2").geracao, 1);
    // casal lado a lado na mesma linha y
    assert.equal(n.get("pai").y, n.get("mae").y);
    // filhos uma linha abaixo
    assert.equal(n.get("f1").y, n.get("pai").y + LINHA_ALTURA);
    assert.equal(n.get("f2").y, n.get("pai").y + LINHA_ALTURA);
    // centro do casal (média dos dois) bate com o centro dos filhos
    const centroPai = n.get("pai").x + CARTAO_LARGURA / 2;
    const centroMae = n.get("mae").x + CARTAO_LARGURA / 2;
    const centroCasal = (centroPai + centroMae) / 2;
    const centroF1 = n.get("f1").x + CARTAO_LARGURA / 2;
    const centroF2 = n.get("f2").x + CARTAO_LARGURA / 2;
    const centroFilhos = (centroF1 + centroF2) / 2;
    assert.ok(Math.abs(centroCasal - centroFilhos) < 0.001, `centro do casal (${centroCasal}) deveria bater com o centro dos filhos (${centroFilhos})`);
  });

  it("(b) cônjuge sem pais (que não é filho de ninguém na árvore) fica na mesma linha do parceiro", () => {
    const nos = [{ id: "avo" }, { id: "pai" }, { id: "conjuge_de_fora" }, { id: "neto" }];
    const ligacoes = [
      { pais: ["avo"], filho: "pai", tipo: "filho" },
      { pais: ["pai", "conjuge_de_fora"], filho: "neto", tipo: "filho" },
    ];
    const layout = layoutGenealogia(nos, ligacoes);
    const n = porId(layout);
    assert.equal(n.get("pai").geracao, 1);
    assert.equal(n.get("conjuge_de_fora").geracao, 1, "cônjuge devia subir pra geração do parceiro, não ficar na 0");
    assert.equal(n.get("pai").y, n.get("conjuge_de_fora").y);
  });

  it("(c) nenhum par de cartões da mesma linha se sobrepõe, numa árvore com vários irmãos e netos", () => {
    const nos = [
      { id: "p1" }, { id: "p2" },
      { id: "f1" }, { id: "f2" }, { id: "f3" }, { id: "f4" }, { id: "f5" },
      { id: "n1" }, { id: "n2" }, { id: "n3" },
    ];
    const ligacoes = [
      { pais: ["p1", "p2"], filho: "f1", tipo: "filho" },
      { pais: ["p1", "p2"], filho: "f2", tipo: "filho" },
      { pais: ["p1", "p2"], filho: "f3", tipo: "filho" },
      { pais: ["p1", "p2"], filho: "f4", tipo: "filho" },
      { pais: ["p1", "p2"], filho: "f5", tipo: "filho" },
      { pais: ["f1"], filho: "n1", tipo: "filho" },
      { pais: ["f1"], filho: "n2", tipo: "filho" },
      { pais: ["f2"], filho: "n3", tipo: "filho" },
    ];
    const layout = layoutGenealogia(nos, ligacoes);
    const porLinha = new Map();
    for (const no of layout.nos) {
      if (!porLinha.has(no.y)) porLinha.set(no.y, []);
      porLinha.get(no.y).push(no);
    }
    for (const [, nosNaLinha] of porLinha) {
      const ordenados = nosNaLinha.slice().sort((a, b) => a.x - b.x);
      for (let i = 1; i < ordenados.length; i++) {
        const direitaAnterior = ordenados[i - 1].x + CARTAO_LARGURA;
        assert.ok(ordenados[i].x >= direitaAnterior, `cartões ${ordenados[i - 1].id} e ${ordenados[i].id} se sobrepõem (x=${ordenados[i - 1].x} vs ${ordenados[i].x})`);
      }
    }
  });

  it("(d) ligação soMestre e o nó soMestre somem na visão do jogador (via ligacoesVisiveis)", () => {
    const nosCompletos = [{ id: "pai" }, { id: "filho" }, { id: "segredo", soMestre: true }];
    const ligacoesCompletas = [
      { pais: ["pai"], filho: "filho", tipo: "filho" },
      { pais: ["pai"], filho: "segredo", tipo: "filho ilegítimo", soMestre: true },
    ];
    // visão do jogador: nó soMestre já some antes de chegar aqui (itensVisiveis no chamador)
    const nosJogador = nosCompletos.filter((n) => !n.soMestre);
    const ligsJogador = ligacoesCompletas.filter((l) => !l.soMestre);
    const visJogador = ligacoesVisiveis(nosJogador, ligsJogador);
    const layoutJogador = layoutGenealogia(nosJogador, visJogador);
    assert.equal(layoutJogador.nos.length, 2);
    assert.ok(!layoutJogador.nos.some((n) => n.id === "segredo"));

    // visão do GM: tudo aparece
    const visGm = ligacoesVisiveis(nosCompletos, ligacoesCompletas);
    const layoutGm = layoutGenealogia(nosCompletos, visGm);
    assert.equal(layoutGm.nos.length, 3);
  });

  it("(d-bis) um pai oculto some SÓ dessa ligação — ligação sobrevive com o(s) pai(s) visível(is) restante(s)", () => {
    const nosVisiveis = [{ id: "mae" }, { id: "filho" }]; // "pai" (soMestre) já foi filtrado
    const ligacoes = [{ pais: ["pai", "mae"], filho: "filho", tipo: "filho" }];
    const visiveis = ligacoesVisiveis(nosVisiveis, ligacoes);
    assert.equal(visiveis.length, 1);
    assert.deepEqual(visiveis[0].pais, ["mae"]);
    const layout = layoutGenealogia(nosVisiveis, visiveis);
    assert.equal(layout.nos.find((n) => n.id === "filho").geracao, 1);
  });

  it("(d-ter) ligação sem NENHUM pai visível some inteira (não fica uma linha solta)", () => {
    const nosVisiveis = [{ id: "filho" }]; // os dois pais eram soMestre
    const ligacoes = [{ pais: ["pai_oculto", "mae_oculta"], filho: "filho", tipo: "filho" }];
    const visiveis = ligacoesVisiveis(nosVisiveis, ligacoes);
    assert.deepEqual(visiveis, []);
  });

  it("(e) ciclo nos dados não trava (filho é pai do próprio pai)", () => {
    const nos = [{ id: "a" }, { id: "b" }];
    const ligacoes = [{ pais: ["a"], filho: "b" }, { pais: ["b"], filho: "a" }];
    assert.doesNotThrow(() => layoutGenealogia(nos, ligacoes));
  });

  it("(e) id inexistente nas ligações (pai ou filho) não trava, é ignorado", () => {
    const nos = [{ id: "a" }];
    assert.doesNotThrow(() => layoutGenealogia(nos, [{ pais: ["fantasma"], filho: "a" }]));
    assert.doesNotThrow(() => layoutGenealogia(nos, [{ pais: ["a"], filho: "fantasma" }]));
  });

  it("(e) nos/ligações ausentes, null ou lixo não travam — guarda (x || [])", () => {
    assert.doesNotThrow(() => layoutGenealogia(undefined, undefined));
    assert.doesNotThrow(() => layoutGenealogia(null, null));
    assert.deepEqual(layoutGenealogia(undefined, undefined).nos, []);
    assert.doesNotThrow(() => layoutGenealogia([null, { id: "a" }, "lixo", { nomeSemId: true }], [null, "lixo", { pais: "não é array", filho: "a" }]));
  });

  it("nó isolado (nunca aparece em nenhuma ligação) vira um cartão sozinho na geração 0", () => {
    const layout = layoutGenealogia([{ id: "solo" }], []);
    assert.equal(layout.nos.length, 1);
    assert.equal(layout.nos[0].geracao, 0);
  });

  it("pai único: a união ainda é formada (sem exigir casal)", () => {
    const layout = layoutGenealogia([{ id: "mae" }, { id: "filho" }], [{ pais: ["mae"], filho: "filho" }]);
    assert.equal(layout.unioes.length, 1);
    assert.deepEqual(layout.unioes[0].pais, ["mae"]);
  });

  it("largura e altura cobrem todos os cartões (nenhum nó fica fora dos limites devolvidos)", () => {
    const nos = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    const ligacoes = [{ pais: ["a"], filho: "b" }, { pais: ["a"], filho: "c" }, { pais: ["b"], filho: "d" }];
    const layout = layoutGenealogia(nos, ligacoes);
    for (const no of layout.nos) {
      assert.ok(no.x >= 0 && no.x + CARTAO_LARGURA <= layout.largura, `nó ${no.id} fora da largura`);
      assert.ok(no.y >= 0 && no.y + CARTAO_ALTURA <= layout.altura, `nó ${no.id} fora da altura`);
    }
  });

  it("opcoes permite customizar constantes (ex: margem)", () => {
    const layout = layoutGenealogia([{ id: "a" }], [], { margem: 100 });
    assert.equal(layout.nos[0].x, 100);
    assert.equal(layout.nos[0].y, 100);
  });
});

describe("agruparUnioes", () => {
  it("ligações com o mesmo conjunto de pais (em qualquer ordem) viram UMA união com vários filhos", () => {
    const ligacoes = [
      { pais: ["a", "b"], filho: "f1", tipo: "x" },
      { pais: ["b", "a"], filho: "f2", tipo: "y" },
    ];
    const unioes = agruparUnioes(ligacoes.map((l) => ({ ...l, tracejado: false, soMestre: false })));
    assert.equal(unioes.length, 1);
    assert.equal(unioes[0].filhos.length, 2);
  });

  it("conjuntos de pais diferentes viram uniões diferentes", () => {
    const ligacoes = [{ pais: ["a"], filho: "f1" }, { pais: ["c"], filho: "f2" }].map((l) => ({ ...l, tipo: "", tracejado: false, soMestre: false }));
    const unioes = agruparUnioes(ligacoes);
    assert.equal(unioes.length, 2);
  });
});

describe("ligacoesVisiveis", () => {
  it("mantém ligação cujo filho e pelo menos um pai estão em nosVisiveis", () => {
    const nos = [{ id: "a" }, { id: "b" }];
    const ligs = [{ pais: ["a"], filho: "b" }];
    assert.deepEqual(ligacoesVisiveis(nos, ligs), [{ pais: ["a"], filho: "b" }]);
  });

  it("nos/ligacoes ausentes não lançam", () => {
    assert.doesNotThrow(() => ligacoesVisiveis(undefined, undefined));
    assert.deepEqual(ligacoesVisiveis(undefined, undefined), []);
  });
});
