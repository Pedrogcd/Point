// Mapa interativo dos reinos (aba Mundo) — funções puras de geometria e
// migração, sem depender de React nem de DOM, pra poder ser testadas
// isoladas (ver mapaMundo.test.js). point-amaranth-app.jsx importa deste
// módulo pra desenhar o overlay de SVG sobre o mapa do mundo.
//
// Convenção de coordenadas: TUDO normalizado de 0 a 1, fração da largura (x)
// ou da altura (y) da imagem do mapa — nunca pixel. A imagem estica conforme
// a tela; coordenada em pixel desgrudaria dela no celular.

// Remove acentos e símbolos pra virar um id estável e legível. Não garante
// unicidade sozinha — ver migrarCidades, que desempata colisões.
export function slugificar(nome) {
  return (
    String(nome || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "cidade"
  );
}

// Converte um ponto normalizado [x,y] (0 a 1) em porcentagem de CSS, pra
// posicionar um elemento absoluto sobre a imagem do mapa. Funciona em
// qualquer largura de contêiner porque é só porcentagem — não há pixel aqui.
export function paraPercentual(ponto) {
  const [x, y] = Array.isArray(ponto) ? ponto : [0, 0];
  return { left: `${(Number(x) || 0) * 100}%`, top: `${(Number(y) || 0) * 100}%` };
}

// Caixa delimitadora (bounding box) de um polígono normalizado. null se o
// polígono não existir ou tiver menos de 3 pontos (não fecha uma área).
export function bboxPoligono(poligono) {
  if (!Array.isArray(poligono) || poligono.length < 3) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of poligono) {
    const [x, y] = Array.isArray(p) ? p : [0, 0];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

// Enquadramento (transform/scale) pra "recortar" num território sem recortar
// a imagem de verdade: pensado pra ser aplicado como
// `transform: scale(s) translate(tx%, ty%)` (transform-origin padrão, centro)
// no contêiner que envolve a imagem, o SVG e os marcadores de cidade — todos
// escalam e se movem juntos, então nada desalinha. `folga` é a margem
// (fração da própria caixa) somada de cada lado antes de calcular a escala.
export function calcularRecorte(poligono, folga = 0.08) {
  const bbox = bboxPoligono(poligono);
  if (!bbox) return null;
  const larguraFolga = bbox.width * folga;
  const alturaFolga = bbox.height * folga;
  const minX = Math.max(0, bbox.minX - larguraFolga);
  const minY = Math.max(0, bbox.minY - alturaFolga);
  const maxX = Math.min(1, bbox.maxX + larguraFolga);
  const maxY = Math.min(1, bbox.maxY + alturaFolga);
  const largura = Math.max(maxX - minX, 0.001);
  const altura = Math.max(maxY - minY, 0.001);
  const scale = 1 / Math.max(largura, altura);
  const centroX = (minX + maxX) / 2;
  const centroY = (minY + maxY) / 2;
  return {
    scale,
    translateX: (0.5 - centroX) * 100,
    translateY: (0.5 - centroY) * 100,
  };
}

// Converte uma cidade do formato antigo ({name, description}) pro novo
// ({id, name, x, y, capital, resumo, visaoGeral, imageUrl, distritos,
// pessoas}), sem perder nenhum campo já existente (ex: link) — só completa o
// que falta. `description` virou `resumo` (o texto curto de sempre, usado no
// modal/hover do mapa) — o conteúdo migra, o campo antigo some depois de
// migrado. `visaoGeral` fica vazio pro usuário preencher. Uma cidade que já
// está no formato novo passa praticamente intacta (idempotente). `idsExistentes`
// evita colisão de id dentro do mesmo reino (muta o Set recebido).
export function migrarCidade(cidade, idsExistentes = new Set()) {
  const c = { ...(cidade || {}) };
  if (typeof c.x !== "number") c.x = null;
  if (typeof c.y !== "number") c.y = null;
  if (typeof c.capital !== "boolean") c.capital = false;
  if (typeof c.resumo !== "string") c.resumo = typeof c.description === "string" ? c.description : "";
  delete c.description;
  if (typeof c.visaoGeral !== "string") c.visaoGeral = "";
  if (typeof c.imageUrl !== "string") c.imageUrl = "";
  if (typeof c.subtitulo !== "string") c.subtitulo = "";
  if (!Array.isArray(c.distritos)) c.distritos = [];
  if (!Array.isArray(c.pessoas)) c.pessoas = [];
  if (!c.id) {
    const base = slugificar(c.name);
    let id = base;
    let i = 2;
    while (idsExistentes.has(id)) id = `${base}_${i++}`;
    c.id = id;
  }
  idsExistentes.add(c.id);
  return c;
}

// Resolve o personagem vinculado a uma pessoa de interesse, se houver. Um
// `personagemId` ausente ou apontando pra um personagem que foi apagado
// devolve null — tratado igual: vínculo ausente, sem quebrar nada.
export function personagemDaPessoa(pessoa, characters) {
  if (!pessoa?.personagemId) return null;
  return (Array.isArray(characters) ? characters : []).find((c) => c.id === pessoa.personagemId) || null;
}

// Migra a lista inteira de cidades de um reino, preservando ordem e nunca
// perdendo nome/descrição/campos extras. Idempotente: uma cidade já migrada
// (com id e x/y numéricos ou null) passa pelo mesmo processo sem mudar —
// rodar de novo com o resultado anterior dá o mesmo resultado.
export function migrarCidades(cidades) {
  const idsExistentes = new Set();
  return (Array.isArray(cidades) ? cidades : []).map((c) => migrarCidade(c, idsExistentes));
}

// Só as cidades já posicionadas (com x/y numéricos) — as outras existem nos
// dados mas ainda não aparecem no mapa, esperando o modo de edição.
export function cidadesPosicionadas(cidades) {
  return (Array.isArray(cidades) ? cidades : []).filter((c) => typeof c?.x === "number" && typeof c?.y === "number");
}
