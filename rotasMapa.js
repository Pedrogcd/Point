// Rotas do mapa do mundo (aba Mundo, MapaMundoInterativo em
// point-amaranth-app.jsx) — funções puras de geometria e migração, sem
// depender de React nem de DOM, no estilo de mapaMundo.js (ver
// rotasMapa.test.js). Uma rota cruza reinos, então é dado do MUNDO (lista
// `rotas` separada, irmã de `kingdoms`), não de um reino.
//
// Convenção de coordenadas: igual mapaMundo.js — tudo normalizado de 0 a 1,
// fração da largura (x) ou da altura (y) da imagem do mapa (MAPA_MUNDO em
// mundo.js), nunca pixel. `caminhoSuave` é a única exceção: devolve pixels
// do viewBox (largura x altura), porque o <path> do SVG (diferente dos
// <polygon>/<circle> do resto do mapa, que usam viewBox 0 a 1) precisa de
// unidades reais pra o traço não ficar fino/grosso desproporcional numa
// imagem não quadrada.

import { MAPA_MUNDO } from "./mundo.js";

export const TIPOS_ROTA = ["terrestre", "ferrovia", "maritima"];
export const TIPO_ROTA_PADRAO = "terrestre";

// Estilo visual de cada tipo — cores que funcionam no tema de pergaminho
// claro do app. Ferrovia é duas linhas sobrepostas (base grossa escura +
// tracejado claro por cima); as outras são uma linha só.
export const ESTILO_ROTA = {
  terrestre: { cor: "#7A4E1D", largura: 3.4, tracejado: "8 6" },
  ferrovia: { corBase: "#2B2116", larguraBase: 6, corTopo: "#F3E9D2", larguraTopo: 2.6, tracejadoTopo: "7 7" },
  maritima: { cor: "#2F6D8F", largura: 3.4, tracejado: "12 5 2 5" },
};

// Fração altura/largura da imagem do mapa — usada pra corrigir distâncias
// envolvendo x E y ao mesmo tempo (RDP, colagem em cidade): x é fração da
// LARGURA e y é fração da ALTURA, unidades diferentes quando a imagem não é
// quadrada; multiplicar y por essa fração converte pra "unidades de x" antes
// de comparar, senão a distância fica distorcida (mais sensível num eixo).
function aspectoDoMapa(mapaMundo = MAPA_MUNDO) {
  const largura = mapaMundo?.largura || 1;
  const altura = mapaMundo?.altura || 1;
  return altura / largura;
}

function paraPixel(ponto, largura, altura) {
  return [ponto.x * largura, ponto.y * altura];
}

function pontoValido(p) {
  return !!p && typeof p.x === "number" && typeof p.y === "number" && Number.isFinite(p.x) && Number.isFinite(p.y);
}

// Curva suave (Catmull-Rom aberta -> Béziers cúbicas) sobre os pontos
// normalizados [{x,y}], devolvendo a string "d" de um <path> em PIXELS do
// viewBox largura x altura. Com 0 ou 1 ponto devolve um "M" sozinho (nada
// pra desenhar); com 2, vira praticamente uma reta (ver fórmula abaixo).
export function caminhoSuave(pontos, largura = MAPA_MUNDO.largura, altura = MAPA_MUNDO.altura) {
  const pts = (Array.isArray(pontos) ? pontos : []).filter(pontoValido);
  if (pts.length === 0) return "";
  const px = pts.map((p) => paraPixel(p, largura, altura));
  if (px.length === 1) return `M ${px[0][0]} ${px[0][1]}`;
  const n = px.length;
  let d = `M ${px[0][0]} ${px[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const a = px[Math.max(0, i - 1)];
    const b = px[i];
    const c = px[i + 1];
    const e = px[Math.min(n - 1, i + 2)];
    const c1x = b[0] + (c[0] - a[0]) / 6;
    const c1y = b[1] + (c[1] - a[1]) / 6;
    const c2x = c[0] - (e[0] - b[0]) / 6;
    const c2y = c[1] - (e[1] - b[1]) / 6;
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${c[0]} ${c[1]}`;
  }
  return d;
}

// Distância perpendicular do ponto `p` até a RETA que passa por `a` e `b`
// (fórmula padrão de RDP — não é a distância até o segmento, até a reta
// infinita mesmo, que é o que o algoritmo clássico usa).
function distanciaPerpendicular(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const den = Math.hypot(dx, dy);
  if (den === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / den;
}

// Ramer-Douglas-Peucker: reduz um traço com muitos pontos (ex: capturado
// ponto a ponto durante um arrasto "à mão livre") aos pontos que realmente
// definem a forma, dentro da tolerância `eps`. Os pontos X/Y são corrigidos
// pela proporção da imagem antes de medir distância (ver aspectoDoMapa) —
// a MESMA correção usada por grudarNaCidade, pra não distorcer o resultado
// num mapa não quadrado.
export function simplificarTraco(pontos, eps = 0.004, aspecto = aspectoDoMapa()) {
  const pts = (Array.isArray(pontos) ? pontos : []).filter(pontoValido).map((p) => ({ x: p.x, y: p.y }));
  if (pts.length <= 2) return pts;
  const corrigidos = pts.map((p) => ({ x: p.x, y: p.y * aspecto }));
  const manter = new Array(pts.length).fill(false);
  manter[0] = true;
  manter[pts.length - 1] = true;
  (function rdp(inicio, fim) {
    let maiorDist = 0, indiceMaior = -1;
    for (let i = inicio + 1; i < fim; i++) {
      const d = distanciaPerpendicular(corrigidos[i], corrigidos[inicio], corrigidos[fim]);
      if (d > maiorDist) { maiorDist = d; indiceMaior = i; }
    }
    if (maiorDist > eps && indiceMaior !== -1) {
      manter[indiceMaior] = true;
      rdp(inicio, indiceMaior);
      rdp(indiceMaior, fim);
    }
  })(0, pts.length - 1);
  return pts.filter((_, i) => manter[i]);
}

// Cola um ponto na cidade mais próxima, se ela estiver dentro do raio
// (default 0.025, unidades normalizadas com y corrigido pela proporção da
// imagem — mesma correção de simplificarTraco). `cidades` é uma lista plana
// { id, x, y } (de todos os reinos — uma rota pode cruzar vários). Sem
// cidade dentro do raio, devolve o PONTO ORIGINAL (sem cidadeId).
export function grudarNaCidade(ponto, cidades, raio = 0.025, aspecto = aspectoDoMapa()) {
  if (!pontoValido(ponto)) return ponto;
  let melhor = null, melhorDist = Infinity;
  for (const c of (Array.isArray(cidades) ? cidades : [])) {
    if (typeof c?.x !== "number" || typeof c?.y !== "number" || !c.id) continue;
    const dx = c.x - ponto.x;
    const dy = (c.y - ponto.y) * aspecto;
    const d = Math.hypot(dx, dy);
    if (d < melhorDist) { melhorDist = d; melhor = c; }
  }
  if (melhor && melhorDist <= raio) {
    return { x: melhor.x, y: melhor.y, cidadeId: melhor.id };
  }
  return ponto;
}

function normalizarPontoRota(p) {
  if (!pontoValido(p)) return null;
  const x = Math.min(1, Math.max(0, p.x));
  const y = Math.min(1, Math.max(0, p.y));
  const ponto = { x, y };
  if (typeof p.cidadeId === "string" && p.cidadeId) ponto.cidadeId = p.cidadeId;
  return ponto;
}

// Normaliza (ou descarta) uma única rota — tipo inválido vira o padrão,
// pontos fora do intervalo/numéricos são descartados, e uma rota com menos
// de 2 pontos (não dá pra desenhar uma linha) devolve null, pra
// migrarRotas filtrar fora sem derrubar a tela. `idsExistentes` evita
// colisão de id (muta o Set recebido, mesmo padrão de migrarCidade).
export function normalizarRota(rota, idsExistentes = new Set()) {
  if (!rota || typeof rota !== "object") return null;
  const pontos = (Array.isArray(rota.pontos) ? rota.pontos : []).map(normalizarPontoRota).filter(Boolean);
  if (pontos.length < 2) return null;
  const tipo = TIPOS_ROTA.includes(rota.tipo) ? rota.tipo : TIPO_ROTA_PADRAO;
  let id = typeof rota.id === "string" && rota.id ? rota.id : `rota_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  if (idsExistentes.has(id)) {
    const base = id;
    let i = 2;
    while (idsExistentes.has(id)) id = `${base}_${i++}`;
  }
  idsExistentes.add(id);
  return {
    id,
    nome: typeof rota.nome === "string" ? rota.nome : "",
    tipo,
    pontos,
    visivel: typeof rota.visivel === "boolean" ? rota.visivel : true,
    soMestre: typeof rota.soMestre === "boolean" ? rota.soMestre : false,
  };
}

// Migra a lista inteira — tolerante a qualquer lixo (null, não-array, item
// que não é objeto, pontos faltando/fora do intervalo): nunca lança, só
// descarta o que não dá pra salvar. Idempotente, mesmo espírito de
// migrarCidades.
export function migrarRotas(rotas) {
  const idsExistentes = new Set();
  return (Array.isArray(rotas) ? rotas : []).map((r) => normalizarRota(r, idsExistentes)).filter(Boolean);
}

// Visibilidade por modo (mesmo mecanismo gm/jogador do resto do app —
// normalizarModo/CHAVE_MODO em mundo.js): jogador só vê rota visivel e não
// soMestre; GM vê todas, inclusive ocultas/só-mestre (pra poder editá-las).
// `r &&` filtra lixo (null/undefined na lista) antes de ler os campos —
// mesma blindagem tolerante do resto do módulo, pra uma rota quebrada nunca
// derrubar a tela mesmo se chegar aqui antes de passar por migrarRotas.
export function rotasVisiveis(rotas, gm) {
  return (Array.isArray(rotas) ? rotas : []).filter((r) => r && (gm || (r.visivel && !r.soMestre)));
}

// "Cidade A → Cidade B" a partir das cidades coladas nas pontas da rota —
// null se nenhuma ponta estiver colada em cidade nenhuma (rota livre).
export function rotuloRota(rota, cidades) {
  const pontos = rota?.pontos || [];
  if (pontos.length === 0) return null;
  const nomeCidade = (id) => (Array.isArray(cidades) ? cidades : []).find((c) => c.id === id)?.name || null;
  const a = pontos[0]?.cidadeId ? nomeCidade(pontos[0].cidadeId) : null;
  const b = pontos[pontos.length - 1]?.cidadeId ? nomeCidade(pontos[pontos.length - 1].cidadeId) : null;
  if (a && b) return `${a} → ${b}`;
  if (a) return `${a} → ?`;
  if (b) return `? → ${b}`;
  return null;
}
