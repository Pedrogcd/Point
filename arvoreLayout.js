// Layout da árvore genealógica (aba Pessoas do reino) — função pura, sem
// React/DOM, que calcula POSIÇÃO (x, y por geração, com cônjuges lado a
// lado e sobreposição resolvida); o desenho em si (SVG, animação, seleção)
// fica em ArvoreGenealogica/NoGenealogia (point-amaranth-app.jsx). Os
// DADOS da genealogia (nos/ligacoes) não mudam aqui — ver pessoasReino.js
// pro formato de `reino.pessoas.genealogias`.
//
// Convenção de coordenadas: pixels, x/y = canto superior esquerdo do
// cartão (igual ao x/y que o <foreignObject> espera).

export const CARTAO_LARGURA = 184;
export const CARTAO_ALTURA = 62;
export const GAP_CONJUGES = 24;
export const GAP_FAMILIAS = 40;
export const MARGEM = 28;
export const LINHA_ALTURA = 150;
// Passo entre irmãos (unidades-filhas de uma mesma união) distribuídos
// simetricamente em torno do ponto médio dos pais: largura do cartão + gap
// de cônjuges + uma folga extra, pedido explicitamente no desenho.
export const PASSO_IRMAOS = CARTAO_LARGURA + GAP_CONJUGES + 16;
const MAX_ITERACOES_GERACAO = 14;
const PASSADAS_RELAXAMENTO = 4;

function idValido(id, idsValidos) {
  return typeof id === "string" && !!id && idsValidos.has(id);
}

// Uma rota (ligação) que referencia um nó que não existe mais, ou com
// `pais`/`filho` ausentes, nunca derruba o layout — ela só é descartada.
// `nos` já deve vir filtrado pra quem a tela atual pode ver (ver
// `nosELigacoesVisiveis` abaixo), então um `pai` ou `filho` fora desse
// conjunto também é tratado como "não existe" aqui.
function ligacoesValidas(ligacoes, idsValidos) {
  return (Array.isArray(ligacoes) ? ligacoes : [])
    .filter((l) => l && idValido(l.filho, idsValidos))
    .map((l) => ({
      filho: l.filho,
      tipo: l.tipo || "",
      tracejado: !!l.tracejado,
      soMestre: !!l.soMestre,
      pais: [...new Set((Array.isArray(l.pais) ? l.pais : []).filter((p) => idValido(p, idsValidos)))],
    }));
}

// Agrupa ligações em "uniões": mesmo CONJUNTO de pais (ordem não importa
// pra agrupar, mas a ordem de declaração dos pais dentro da união é
// preservada — vem da primeira ligação que criou o grupo). Ligação com
// nenhum pai válido não forma união (não tem de onde pendurar a linha) e é
// descartada do layout.
export function agruparUnioes(ligacoes) {
  const porChave = new Map();
  const ordemChaves = [];
  for (const l of ligacoes) {
    if (l.pais.length === 0) continue;
    const chave = l.pais.slice().sort().join("\u0001");
    if (!porChave.has(chave)) {
      porChave.set(chave, { pais: l.pais.slice(), filhos: [] });
      ordemChaves.push(chave);
    }
    porChave.get(chave).filhos.push({ id: l.filho, tipo: l.tipo, tracejado: l.tracejado, soMestre: l.soMestre });
  }
  return ordemChaves.map((chave) => porChave.get(chave));
}

function indiceDeclaracao(nos) {
  const idx = new Map();
  nos.forEach((n, i) => { if (n && typeof n.id === "string") idx.set(n.id, i); });
  return idx;
}

// Geração de cada nó: todo mundo começa em 0; a cada passada, pra cada
// união, os pais são igualados ao maior entre eles (cônjuges sempre na
// mesma linha, mesmo que um venha de uma linhagem mais "funda") e os
// filhos ficam pelo menos uma linha abaixo. Como o alvo de um pai nunca é
// menor que o valor atual dele (é o máximo de um conjunto que o inclui),
// a geração de cada nó só cresce — converge sempre, daí o limite de
// passadas ser só uma rede de segurança contra ciclo nos dados.
function calcularGeracoes(idsValidos, unioes) {
  const geracao = new Map([...idsValidos].map((id) => [id, 0]));
  for (let iter = 0; iter < MAX_ITERACOES_GERACAO; iter++) {
    let mudou = false;
    for (const uniao of unioes) {
      const g = Math.max(0, ...uniao.pais.map((p) => geracao.get(p) ?? 0));
      for (const p of uniao.pais) {
        if ((geracao.get(p) ?? 0) !== g) { geracao.set(p, g); mudou = true; }
      }
      for (const filho of uniao.filhos) {
        if (!idsValidos.has(filho.id)) continue;
        const alvo = g + 1;
        if ((geracao.get(filho.id) ?? 0) < alvo) { geracao.set(filho.id, alvo); mudou = true; }
      }
    }
    if (!mudou) break;
  }
  return geracao;
}

// União-find sobre os pais de cada união: quem casa (ou forma uma cadeia
// de recasamentos — A com B, A com C) vira uma "unidade" só, posicionada
// lado a lado, na ordem em que os nós foram declarados em `nos`.
function criarUnidades(idsValidos, unioes, idxDeclaracao) {
  const parent = new Map([...idsValidos].map((id) => [id, id]));
  function find(x) {
    let raiz = x;
    while (parent.get(raiz) !== raiz) raiz = parent.get(raiz);
    while (parent.get(x) !== raiz) { const prox = parent.get(x); parent.set(x, raiz); x = prox; }
    return raiz;
  }
  function unir(a, b) {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }
  for (const uniao of unioes) {
    for (let i = 1; i < uniao.pais.length; i++) unir(uniao.pais[0], uniao.pais[i]);
  }
  const grupos = new Map();
  for (const id of idsValidos) {
    const raiz = find(id);
    if (!grupos.has(raiz)) grupos.set(raiz, []);
    grupos.get(raiz).push(id);
  }
  const unidadesPorMembro = new Map();
  const unidades = [];
  for (const membros of grupos.values()) {
    const ordenados = membros.slice().sort((a, b) => (idxDeclaracao.get(a) ?? 0) - (idxDeclaracao.get(b) ?? 0));
    const unidade = { id: ordenados.join("+"), membros: ordenados };
    unidades.push(unidade);
    for (const m of ordenados) unidadesPorMembro.set(m, unidade);
  }
  return { unidades, unidadesPorMembro };
}

function larguraUnidade(unidade) {
  return unidade.membros.length * CARTAO_LARGURA + (unidade.membros.length - 1) * GAP_CONJUGES;
}

// Centro x absoluto de UM membro dentro da unidade, a partir do centro x
// da unidade inteira (os membros ficam lado a lado, rigidamente, dentro
// dela — só a unidade inteira se move durante o relaxamento).
function membroX(unidade, centerXUnidade, membroId) {
  const i = unidade.membros.indexOf(membroId);
  const esquerda = centerXUnidade - larguraUnidade(unidade) / 2;
  return esquerda + i * (CARTAO_LARGURA + GAP_CONJUGES) + CARTAO_LARGURA / 2;
}

// Dentro de uma linha, ordena as unidades pelo alvo de x e empurra as que
// se sobrepõem pra direita, mantendo a folga `GAP_FAMILIAS` — nunca deixa
// duas unidades da mesma linha se tocarem.
function resolverSobreposicao(unidadesNaLinha, centerX) {
  const ordenadas = unidadesNaLinha.slice().sort((a, b) => centerX.get(a.id) - centerX.get(b.id));
  let direitaAnterior = -Infinity;
  for (const u of ordenadas) {
    const largura = larguraUnidade(u);
    let esquerda = centerX.get(u.id) - largura / 2;
    if (esquerda < direitaAnterior + GAP_FAMILIAS) esquerda = direitaAnterior + GAP_FAMILIAS;
    centerX.set(u.id, esquerda + largura / 2);
    direitaAnterior = esquerda + largura;
  }
}

// Layout completo — recebe `nos`/`ligacoes` JÁ visíveis (ver
// `nosELigacoesVisiveis`) e devolve as posições prontas pro desenho:
//   { nos: [{ id, x, y, geracao }], unioes: [{ pais, filhos }], largura, altura }
// `unioes` carrega os ids de pais/filhos — quem desenha busca x/y de cada
// um no mapa `nos` devolvido. Tolerante a dados ruins (id inexistente,
// ciclo, lista vazia) — nunca lança, só ignora o que não dá pra desenhar.
export function layoutGenealogia(nos, ligacoes, opcoes) {
  const o = {
    cartaoLargura: CARTAO_LARGURA, cartaoAltura: CARTAO_ALTURA, gapConjuges: GAP_CONJUGES,
    gapFamilias: GAP_FAMILIAS, margem: MARGEM, linhaAltura: LINHA_ALTURA, passoIrmaos: PASSO_IRMAOS,
    ...(opcoes || {}),
  };
  const listaNos = (Array.isArray(nos) ? nos : []).filter((n) => n && typeof n.id === "string" && n.id);
  const idsValidos = new Set(listaNos.map((n) => n.id));
  if (idsValidos.size === 0) return { nos: [], unioes: [], largura: o.margem * 2, altura: o.margem * 2 };

  const ligsValidas = ligacoesValidas(ligacoes, idsValidos);
  const unioes = agruparUnioes(ligsValidas);
  const idxDeclaracao = indiceDeclaracao(listaNos);
  const geracao = calcularGeracoes(idsValidos, unioes);
  const { unidades, unidadesPorMembro } = criarUnidades(idsValidos, unioes, idxDeclaracao);

  // Geração de uma unidade: todos os membros já convergem pra mesma
  // (cônjuges na mesma linha); por segurança (dado malformado/ciclo), usa
  // o maior valor entre os membros em vez de assumir igualdade perfeita.
  const geracaoPorUnidade = new Map(unidades.map((u) => [u.id, Math.max(0, ...u.membros.map((m) => geracao.get(m) ?? 0))]));

  const porLinha = new Map();
  for (const u of unidades) {
    const g = geracaoPorUnidade.get(u.id);
    if (!porLinha.has(g)) porLinha.set(g, []);
    porLinha.get(g).push(u);
  }
  const linhasAsc = [...porLinha.keys()].sort((a, b) => a - b);
  for (const g of linhasAsc) {
    porLinha.get(g).sort((a, b) => (idxDeclaracao.get(a.membros[0]) ?? 0) - (idxDeclaracao.get(b.membros[0]) ?? 0));
  }

  // X inicial: unidades na ordem de declaração, da esquerda pra direita.
  const centerX = new Map();
  for (const g of linhasAsc) {
    let cursor = o.margem;
    for (const u of porLinha.get(g)) {
      const largura = larguraUnidade(u);
      centerX.set(u.id, cursor + largura / 2);
      cursor += largura + o.gapFamilias;
    }
  }

  function midXDosPais(uniao) {
    const xs = uniao.pais
      .map((p) => {
        const u = unidadesPorMembro.get(p);
        return u ? membroX(u, centerX.get(u.id), p) : null;
      })
      .filter((v) => v !== null);
    return xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length;
  }

  function passeTopoBaixo() {
    for (const g of linhasAsc) {
      const unidadesNaLinha = porLinha.get(g);
      const alvos = new Map(); // unidade.id -> soma de alvos propostos (pra média se >1 união propuser)
      const contagens = new Map();
      for (const uniao of unioes) {
        const midX = midXDosPais(uniao);
        if (midX === null) continue;
        const filhasAqui = [];
        const vistos = new Set();
        for (const f of uniao.filhos) {
          const u = unidadesPorMembro.get(f.id);
          if (!u || vistos.has(u.id) || geracaoPorUnidade.get(u.id) !== g) continue;
          vistos.add(u.id);
          filhasAqui.push(u);
        }
        if (filhasAqui.length === 0) continue;
        filhasAqui.sort((a, b) => (idxDeclaracao.get(a.membros[0]) ?? 0) - (idxDeclaracao.get(b.membros[0]) ?? 0));
        const k = filhasAqui.length;
        filhasAqui.forEach((u, i) => {
          const alvo = midX - ((k - 1) / 2) * o.passoIrmaos + i * o.passoIrmaos;
          alvos.set(u.id, (alvos.get(u.id) || 0) + alvo);
          contagens.set(u.id, (contagens.get(u.id) || 0) + 1);
        });
      }
      for (const [id, soma] of alvos) centerX.set(id, soma / contagens.get(id));
      resolverSobreposicao(unidadesNaLinha, centerX);
    }
  }

  function passeBaixoCima() {
    for (let i = linhasAsc.length - 1; i >= 0; i--) {
      const g = linhasAsc[i];
      const unidadesNaLinha = porLinha.get(g);
      for (const u of unidadesNaLinha) {
        const filhosUnidades = new Set();
        for (const uniao of unioes) {
          if (!uniao.pais.some((p) => u.membros.includes(p))) continue;
          for (const f of uniao.filhos) {
            const uf = unidadesPorMembro.get(f.id);
            if (uf) filhosUnidades.add(uf);
          }
        }
        if (filhosUnidades.size === 0) continue;
        const xs = [...filhosUnidades].map((uf) => centerX.get(uf.id));
        centerX.set(u.id, xs.reduce((a, b) => a + b, 0) / xs.length);
      }
      resolverSobreposicao(unidadesNaLinha, centerX);
    }
  }

  // 4 passadas de relaxamento (topo->baixo seguido de baixo->topo cada
  // uma) — converge rápido pra árvores do tamanho de uma genealogia de
  // RPG (dezenas de nós); não precisa de critério de parada antecipada.
  for (let i = 0; i < PASSADAS_RELAXAMENTO; i++) {
    passeTopoBaixo();
    passeBaixoCima();
  }

  // Normaliza pra margem: desloca tudo em x pra a unidade mais à esquerda
  // encostar em `margem`.
  let minEsquerda = Infinity, maxDireita = -Infinity;
  for (const u of unidades) {
    const largura = larguraUnidade(u);
    const esquerda = centerX.get(u.id) - largura / 2;
    minEsquerda = Math.min(minEsquerda, esquerda);
    maxDireita = Math.max(maxDireita, esquerda + largura);
  }
  const deslocX = o.margem - minEsquerda;
  for (const u of unidades) centerX.set(u.id, centerX.get(u.id) + deslocX);

  const maxGeracao = linhasAsc.length === 0 ? 0 : linhasAsc[linhasAsc.length - 1];
  const nosPosicionados = listaNos.map((n) => {
    const u = unidadesPorMembro.get(n.id);
    const g = geracaoPorUnidade.get(u.id) ?? 0;
    const cx = u ? membroX(u, centerX.get(u.id), n.id) : o.margem + o.cartaoLargura / 2;
    return { id: n.id, x: cx - o.cartaoLargura / 2, y: o.margem + g * o.linhaAltura, geracao: g };
  });

  return {
    nos: nosPosicionados,
    unioes: unioes.map((u) => ({ pais: u.pais, filhos: u.filhos })),
    largura: maxDireita + deslocX + o.margem,
    altura: o.margem * 2 + maxGeracao * o.linhaAltura + o.cartaoAltura,
  };
}

// Recorta as ligações pro que a tela atual pode mostrar — além do
// `soMestre` da PRÓPRIA ligação (já tratado por itensVisiveis no chamador),
// um pai que esteja oculto (nó soMestre, filtrado de `nosVisiveis`) some da
// lista de pais dessa ligação; se não sobrar NENHUM pai visível, a ligação
// inteira some (não faz sentido mostrar uma linha solta sem nenhuma ponta).
// `filho` fora de `nosVisiveis` também descarta a ligação.
export function ligacoesVisiveis(nosVisiveis, ligacoes) {
  const idsVisiveis = new Set((Array.isArray(nosVisiveis) ? nosVisiveis : []).map((n) => n?.id).filter(Boolean));
  return (Array.isArray(ligacoes) ? ligacoes : [])
    .filter((l) => l && idsVisiveis.has(l.filho))
    .map((l) => ({ ...l, pais: (Array.isArray(l.pais) ? l.pais : []).filter((p) => idsVisiveis.has(p)) }))
    .filter((l) => l.pais.length > 0);
}
