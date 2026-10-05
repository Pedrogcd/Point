// Testes do módulo pessoasReino.js: semeadura idempotente, mesclagem de
// overrides do GM, agrupamento (com e sem estrutura), relações e o layout em
// gerações da árvore genealógica.
// Roda com `node --test` (Node >=20, nativo, sem dependências) ou `npm test`.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  TIPOS_RELACAO, infoTipoRelacao, reporPessoasDoReino, mesclarPessoasComOverride,
  gruposDoReino, relacoesDoPersonagem, itensVisiveis, geracoesDaGenealogia,
} from "./pessoasReino.js";

const PESSOAS_SUTH = {
  estrutura: {
    titulo: "Pilares do Império",
    grupos: [
      { id: "imperadora", nome: "Pilar da Imperadora", funcao: "Lei", membros: [
        { personagemId: "suth_velmira", cargo: "Conselheira", ordem: 2 },
        { personagemId: "suth_emphes", cargo: "Imperadora", ordem: 1 },
        { nomeLivre: "Hujimo Bunis", cargo: "Especialista em portais", ordem: 3, nota: "Dossiê pendente" },
      ] },
      { id: "santa", nome: "Pilar da Santa", funcao: "Guerra", membros: [
        { personagemId: "fate", cargo: "Próxima Santa", ordem: 1 },
      ] },
    ],
  },
  relacoes: [
    { de: "suth_velmira", para: "suth_emphes", tipo: "hierarquia", rotulo: "antecessora no trono" },
    { de: "suth_emphes", para: "fate", tipo: "aliança", rotulo: "secreto", soMestre: true },
  ],
  genealogias: [
    {
      id: "imperial", titulo: "Linhagem imperial",
      nos: [{ id: "velmira", personagemId: "suth_velmira" }, { id: "emphes", personagemId: "suth_emphes" }],
      ligacoes: [{ pais: ["velmira"], filho: "emphes", tipo: "mãe e filha" }],
    },
  ],
};

describe("reporPessoasDoReino", () => {
  it("semeia reino.pessoas em quem ainda não tem", () => {
    const reinos = [{ id: "suth", name: "Suth" }, { id: "katalao", name: "Katalão" }];
    const resultado = reporPessoasDoReino(reinos, [{ reinoId: "suth", pessoas: PESSOAS_SUTH }]);
    assert.equal(resultado.find((r) => r.id === "suth").pessoas, PESSOAS_SUTH);
    assert.equal(resultado.find((r) => r.id === "katalao").pessoas, undefined);
  });

  it("é idempotente: não sobrescreve quem já tem pessoas (mesmo um objeto diferente/editado)", () => {
    const pessoasJaEditadas = { estrutura: { titulo: "Editado pelo GM", grupos: [] }, relacoes: [], genealogias: [] };
    const reinos = [{ id: "suth", name: "Suth", pessoas: pessoasJaEditadas }];
    const resultado = reporPessoasDoReino(reinos, [{ reinoId: "suth", pessoas: PESSOAS_SUTH }]);
    assert.equal(resultado[0].pessoas, pessoasJaEditadas);
  });

  it("devolve a mesma referência quando nada muda", () => {
    const reinos = [{ id: "katalao", name: "Katalão" }];
    const resultado = reporPessoasDoReino(reinos, [{ reinoId: "suth", pessoas: PESSOAS_SUTH }]);
    assert.equal(resultado, reinos);
  });

  it("reino sem semente correspondente continua funcionando (sem pessoas)", () => {
    const reinos = [{ id: "goethia", name: "Goethia" }];
    const resultado = reporPessoasDoReino(reinos, [{ reinoId: "suth", pessoas: PESSOAS_SUTH }]);
    assert.equal(resultado[0].pessoas, undefined);
  });
});

describe("mesclarPessoasComOverride", () => {
  it("sem override, devolve o original", () => {
    const mesclado = mesclarPessoasComOverride(PESSOAS_SUTH, {});
    assert.deepEqual(mesclado, PESSOAS_SUTH);
  });

  it("override substitui o campo por inteiro (relacoes), sem tocar os outros", () => {
    const novasRelacoes = [{ de: "a", para: "b", tipo: "rivalidade", rotulo: "novo" }];
    const mesclado = mesclarPessoasComOverride(PESSOAS_SUTH, { relacoes: novasRelacoes });
    assert.equal(mesclado.relacoes, novasRelacoes);
    assert.equal(mesclado.estrutura, PESSOAS_SUTH.estrutura);
    assert.equal(mesclado.genealogias, PESSOAS_SUTH.genealogias);
  });

  it("original null/undefined (reino sem pessoas) não quebra, usa defaults vazios", () => {
    const mesclado = mesclarPessoasComOverride(null, {});
    assert.deepEqual(mesclado, { estrutura: null, relacoes: [], genealogias: [] });
  });
});

describe("gruposDoReino", () => {
  it("com estrutura: agrupa por grupo, ordena membros por `ordem`, resolve personagemId", () => {
    const characters = [
      { id: "suth_emphes", name: "Emphes Alpha", faction: "Suth" },
      { id: "suth_velmira", name: "Velmira Alpha", faction: "Suth" },
      { id: "fate", name: "Fate, A Indomável", faction: "Suth" },
    ];
    const grupos = gruposDoReino(PESSOAS_SUTH, characters, "Suth");
    assert.equal(grupos.length, 2);
    const imperadora = grupos.find((g) => g.id === "imperadora");
    // ordenado por `ordem`: emphes(1), velmira(2), hujimo(3) — não na ordem do array original
    assert.deepEqual(imperadora.membros.map((m) => m.personagemId || m.nomeLivre), ["suth_emphes", "suth_velmira", "Hujimo Bunis"]);
    assert.equal(imperadora.membros[0].personagem.name, "Emphes Alpha");
  });

  it("membro com personagemId que não existe mais (ficha apagada) resolve pra personagem: null, não quebra", () => {
    const grupos = gruposDoReino(PESSOAS_SUTH, [], "Suth");
    const imperadora = grupos.find((g) => g.id === "imperadora");
    assert.equal(imperadora.membros.find((m) => m.personagemId === "suth_emphes").personagem, null);
  });

  it("membro nomeLivre (sem ficha) nunca tenta resolver personagem", () => {
    const grupos = gruposDoReino(PESSOAS_SUTH, [], "Suth");
    const imperadora = grupos.find((g) => g.id === "imperadora");
    const hujimo = imperadora.membros.find((m) => m.nomeLivre === "Hujimo Bunis");
    assert.equal(hujimo.personagem, null);
    assert.equal(hujimo.nota, "Dossiê pendente");
  });

  it("sem estrutura: agrupa quem tem a faction do reino pela afiliação", () => {
    const characters = [
      { id: "a", name: "A", faction: "Goethia", affiliation: "Guarda do Tzar" },
      { id: "b", name: "B", faction: "Goethia", affiliation: "Guarda do Tzar" },
      { id: "c", name: "C", faction: "Goethia", affiliation: "Templo de Erin" },
      { id: "d", name: "D", faction: "Suth" }, // de outro reino, não entra
    ];
    const grupos = gruposDoReino(null, characters, "Goethia");
    assert.equal(grupos.length, 2);
    const guarda = grupos.find((g) => g.nome === "Guarda do Tzar");
    assert.equal(guarda.membros.length, 2);
  });

  it("sem estrutura e sem ninguém com a faction do reino: lista vazia (reino sem dados continua OK)", () => {
    const grupos = gruposDoReino(null, [{ id: "a", name: "A", faction: "Outro" }], "Goethia");
    assert.deepEqual(grupos, []);
  });

  it("reino sem characters nenhum não lança (guarda x || [])", () => {
    assert.doesNotThrow(() => gruposDoReino(null, undefined, "Goethia"));
    assert.doesNotThrow(() => gruposDoReino(undefined, undefined, undefined));
  });
});

describe("relacoesDoPersonagem", () => {
  it("encontra relações nas duas direções (de e para)", () => {
    const rel = relacoesDoPersonagem(PESSOAS_SUTH.relacoes, "suth_emphes");
    assert.equal(rel.length, 2);
    assert.equal(rel.find((r) => r.direcao === "para").outroId, "suth_velmira");
    assert.equal(rel.find((r) => r.direcao === "de").outroId, "fate");
  });

  it("personagem sem relações devolve lista vazia", () => {
    assert.deepEqual(relacoesDoPersonagem(PESSOAS_SUTH.relacoes, "suth_zero"), []);
  });
});

describe("itensVisiveis (sigilo por item)", () => {
  it("GM vê tudo; Jogador não vê itens soMestre:true", () => {
    assert.equal(itensVisiveis(PESSOAS_SUTH.relacoes, true).length, 2);
    assert.equal(itensVisiveis(PESSOAS_SUTH.relacoes, false).length, 1);
  });
  it("item sem soMestre é sempre visível", () => {
    assert.deepEqual(itensVisiveis([{ a: 1 }], false), [{ a: 1 }]);
  });
});

describe("TIPOS_RELACAO / infoTipoRelacao", () => {
  it("tem os 6 tipos pedidos", () => {
    const ids = TIPOS_RELACAO.map((t) => t.id);
    assert.deepEqual(ids.sort(), ["alianca", "criacao", "familia", "hierarquia", "mentoria", "rivalidade"].sort());
  });
  it("tipo desconhecido não lança, devolve um fallback", () => {
    assert.doesNotThrow(() => infoTipoRelacao("inexistente"));
    assert.equal(infoTipoRelacao(undefined).label, "Relação");
  });
});

describe("geracoesDaGenealogia", () => {
  it("nó sem ligação como filho fica na geração 0; filho fica uma geração abaixo do maior pai", () => {
    const nos = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const ligacoes = [{ pais: ["a"], filho: "b" }, { pais: ["b"], filho: "c" }];
    const geracoes = geracoesDaGenealogia(nos, ligacoes);
    assert.deepEqual(geracoes.map((g) => g.geracao), [0, 1, 2]);
    assert.deepEqual(geracoes[0].nos, ["a"]);
    assert.deepEqual(geracoes[2].nos, ["c"]);
  });

  it("filho com dois pais de gerações diferentes fica abaixo do mais profundo (maior geração)", () => {
    const nos = [{ id: "avo" }, { id: "pai" }, { id: "mae" }, { id: "filho" }];
    const ligacoes = [
      { pais: ["avo"], filho: "pai" }, // pai: geração 1
      { pais: ["pai", "mae"], filho: "filho" }, // mae: geração 0, pai: geração 1 -> filho: geração 2
    ];
    const geracoes = geracoesDaGenealogia(nos, ligacoes);
    const geracaoDoFilho = geracoes.find((g) => g.nos.includes("filho")).geracao;
    assert.equal(geracaoDoFilho, 2);
  });

  it("ligações tracejadas (criação/mentoria) ainda participam do cálculo de geração — o campo é só visual", () => {
    const nos = [{ id: "criadora" }, { id: "criacao" }];
    const ligacoes = [{ pais: ["criadora"], filho: "criacao", tracejado: true }];
    const geracoes = geracoesDaGenealogia(nos, ligacoes);
    assert.equal(geracoes.find((g) => g.nos.includes("criacao")).geracao, 1);
  });

  it("dados malformados (ligação apontando pra nó inexistente) não lança nem entra em loop infinito", () => {
    const nos = [{ id: "a" }];
    const ligacoes = [{ pais: ["inexistente"], filho: "a" }];
    assert.doesNotThrow(() => geracoesDaGenealogia(nos, ligacoes));
  });

  it("nós/ligações ausentes não lança (guarda x || [])", () => {
    assert.doesNotThrow(() => geracoesDaGenealogia(undefined, undefined));
    assert.deepEqual(geracoesDaGenealogia(undefined, undefined), []);
  });
});
