// Mesa (07/11, pedido do Pedro: "uma aba no site onde é uma região para
// jogar o rpg, seguindo a ideia do roll20" — grid, chat com "falar como"
// personagem e retratinho, dados que todos veem, imagens e desenho no
// tabuleiro que todos veem).
//
// Duas partes, igual sincronizacao.js:
//   1. Funções PURAS (comando de dados, rolagem, mensagens, objetos do
//      tabuleiro, simplificação do traço), testadas em mesa.test.js.
//   2. A conexão: Supabase (tabelas point_mesa_mensagens e
//      point_mesa_objetos, com Realtime — ver supabase/schema.sql) ou, sem
//      Supabase configurado, modo local (localStorage + BroadcastChannel,
//      que sincroniza abas do mesmo navegador).

// ---------------------------------------------------------------------
// 1. Funções puras
// ---------------------------------------------------------------------

import { grauNumero, aplicarFerimentos } from "./engine.js";

export const MESA_LARGURA = 3000;
export const MESA_ALTURA = 2000;
export const GRADE_PADRAO = 70;
export const MAX_MENSAGENS = 300;
export const MAX_DADOS = 30;
// Sucesso padrão do sistema 3d10: 6+ (10 natural sempre sucesso).
export const ALVO_PADRAO = 6;

export const CORES_DESENHO = ["#2B2116", "#A83A2E", "#4A6B96", "#2F8577", "#A9762C", "#F3E9D2"];

export function novoId(prefixo = "m") {
  const aleatorio = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return prefixo ? `${prefixo}-${aleatorio}` : aleatorio;
}

// "/r 5", "/r 5d10", "/roll 4d10 7+", "/r 3 alvo 8" -> { dados, alvo, rotulo }.
// Qualquer outro texto: null (é fala comum). O rótulo é o resto do texto
// depois do comando ("/r 5 Ataque de espada" -> rotulo "Ataque de espada").
export function parseComandoRolagem(texto) {
  const m = /^\/(?:r|roll|rolar)\s+(\d+)(?:\s*d10)?(?:\s+(?:alvo\s*)?(\d+)\+?(?=\s|$))?\s*(.*)$/i.exec(String(texto || "").trim());
  if (!m) return null;
  const dados = Math.min(MAX_DADOS, Math.max(1, parseInt(m[1], 10)));
  const alvo = m[2] ? Math.min(10, Math.max(2, parseInt(m[2], 10))) : ALVO_PADRAO;
  return { dados, alvo, rotulo: (m[3] || "").trim() };
}

// 09/11 (Pedro): o seletor do chat vai de 2+ a 10+ (antes parava em 6+),
// pra rolagens como a do Leve (5+). Mesmo intervalo do "/r N alvo".
export const ALVOS_DE_ROLAGEM = [2, 3, 4, 5, 6, 7, 8, 9, 10];
// Rola N d10; sucesso quando o dado >= alvo (10 sempre conta). `aleatorio`
// é injetável pra teste.
export function rolarDados(dados, alvo = ALVO_PADRAO, aleatorio = Math.random) {
  const n = Math.min(MAX_DADOS, Math.max(1, Math.floor(dados) || 1));
  const faces = Array.from({ length: n }, () => Math.floor(aleatorio() * 10) + 1);
  const sucessos = faces.filter((d) => d === 10 || d >= alvo).length;
  return { faces, alvo, sucessos, criticos: faces.filter((d) => d === 10).length };
}

// Quem fala no chat: { id, nome, img, tipo: "mestre" | "ficha" | "npc" }.
// Jogador: só as fichas. Mestre: "Mestre (narrador)", fichas e NPCs do
// mundo. `resolverImagem` transforma caminho relativo em URL (assetUrl).
export const AUTOR_MESTRE = { id: "mestre", nome: "Mestre", img: null, tipo: "mestre" };

// 07/11 (Pedro): cada identidade ganha `grupo` — de onde ela é — pra o
// "Falar como" mostrar separadores: fichas pelo reino (faction) e NPCs pela
// cidade/local (`local`, montado pelo app). Ordem: Mestre, fichas por reino
// (A-Z, "Outra"/sem reino por último), NPCs por local (A-Z).
const SEM_REINO = "Sem reino";
function reinoDaFicha(p) {
  const f = String(p?.faction || "").trim();
  return !f || f === "—" ? SEM_REINO : f;
}
function pesoDoGrupo(grupo) {
  return grupo === GRUPO_VOCE ? -2 : grupo === GRUPO_MINHAS ? -1 : grupo === "Outra" ? 1 : grupo === SEM_REINO ? 2 : 0;
}

// `minhas` (07/11): ids das fichas atribuídas ao jogador desta tela — vêm
// primeiro, no grupo "Minhas fichas". Jogador só vê fichas visíveis pra
// jogadores (visivelJogador, igual à aba Personagens) ou atribuídas a ele.
export const GRUPO_MINHAS = "Minhas fichas";
// `eu` (08/11): o jogador sempre pode falar como ele mesmo (grupo
// "Você", primeiro da lista) — antes, sem ficha nenhuma, ele caía em
// "Mestre".
export const GRUPO_VOCE = "Você";
export function identidadesDaMesa({ personagens = [], npcs = [], gm = false, resolverImagem = (x) => x, minhas = [], eu = "" } = {}) {
  const porGrupoENome = (a, b) => (pesoDoGrupo(a.grupo) - pesoDoGrupo(b.grupo))
    || a.grupo.localeCompare(b.grupo, "pt-BR") || a.nome.localeCompare(b.nome, "pt-BR");
  const minhasSet = new Set(minhas || []);
  const fichas = (personagens || [])
    .filter((p) => p?.id && p.name && (gm || p.visivelJogador || minhasSet.has(p.id)))
    .map((p) => ({
      id: `ficha:${p.id}`, nome: p.name, img: p.imageUrl ? resolverImagem(p.imageUrl) : null, tipo: "ficha",
      grupo: minhasSet.has(p.id) ? GRUPO_MINHAS : reinoDaFicha(p),
    }))
    .sort(porGrupoENome);
  if (!gm) {
    const id = idDoJogador(eu);
    return id ? [{ id, nome: String(eu).trim(), img: null, tipo: "jogador", grupo: GRUPO_VOCE }, ...fichas] : fichas;
  }
  const doMundo = (npcs || [])
    .filter((n) => n?.id && n.nome)
    .map((n) => ({ id: `npc:${n.id}`, nome: n.nome, img: n.img ? resolverImagem(n.img) : null, tipo: "npc", grupo: n.local || "Mundo" }))
    .sort(porGrupoENome);
  return [{ ...AUTOR_MESTRE, grupo: "Mestre" }, ...fichas, ...doMundo];
}

// Separadores do "Falar como": [{ rotulo, itens }] na ordem das identidades.
// Rótulo: "Mestre", "Fichas — Hetalion", "NPCs — Frontier".
export function gruposDeIdentidades(identidades) {
  const grupos = [];
  for (const i of identidades || []) {
    const rotulo = i.tipo === "mestre" ? "Mestre" : i.tipo === "jogador" ? GRUPO_VOCE : i.grupo === GRUPO_MINHAS ? GRUPO_MINHAS : `${i.tipo === "npc" ? "NPCs" : "Fichas"} — ${i.grupo || SEM_REINO}`;
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.rotulo === rotulo) ultimo.itens.push(i);
    else grupos.push({ rotulo, itens: [i] });
  }
  return grupos;
}

// Névoa de guerra (07/11): objetos "nevoa" (cobre) e "revelado" (abre um
// buraco), aplicados na ordem — o mais novo vale por cima. Só retângulos
// { x, y, w, h }. Normaliza um retângulo arrastado em qualquer direção e
// recorta na mesa; devolve null se ficar pequeno demais.
export function retanguloDeArraste([x1, y1], [x2, y2], minimo = 8) {
  const x = Math.max(0, Math.min(x1, x2));
  const y = Math.max(0, Math.min(y1, y2));
  const w = Math.min(MESA_LARGURA, Math.max(x1, x2)) - x;
  const h = Math.min(MESA_ALTURA, Math.max(y1, y2)) - y;
  return w >= minimo && h >= minimo ? { x, y, w, h } : null;
}

// 07/11 (Pedro: "linhas e retas que se conectam e formas" pra criar as
// zonas que os personagens veem): além do retângulo, névoa em círculo e em
// polígono (pontos clicados um a um). Campo `forma` no objeto:
//   retangulo { x, y, w, h } (padrão, inclusive os antigos sem `forma`)
//   circulo   { cx, cy, r }
//   poligono  { pontos: [[x, y], ...] }
export function formaDaNevoa(o) {
  return o?.forma === "circulo" || o?.forma === "poligono" ? o.forma : "retangulo";
}

// Encaixa um ponto no canto mais próximo da grade (pra contornar salas).
export function encaixarPonto([x, y], tamanho, ligado = true) {
  if (!ligado || !tamanho) return [x, y];
  return [encaixarNaGrade(x, tamanho), encaixarNaGrade(y, tamanho)];
}

export function circuloDeArraste([x1, y1], [x2, y2], minimo = 8) {
  const r = Math.hypot(x2 - x1, y2 - y1);
  return r >= minimo ? { cx: x1, cy: y1, r: Math.round(r * 10) / 10 } : null;
}

export function pontosPerto([x1, y1], [x2, y2], tolerancia) {
  return Math.hypot(x2 - x1, y2 - y1) <= tolerancia;
}

// Fecha um polígono: tira pontos repetidos em sequência (o duplo clique
// gera dois) e o último se ele voltou ao primeiro; precisa de 3 pontos e
// alguma área. Devolve os pontos ou null.
export function fecharPoligono(pontos, tolerancia = 1) {
  const limpos = [];
  for (const p of pontos || []) {
    if (!limpos.length || !pontosPerto(limpos[limpos.length - 1], p, tolerancia)) limpos.push([p[0], p[1]]);
  }
  if (limpos.length > 3 && pontosPerto(limpos[0], limpos[limpos.length - 1], tolerancia)) limpos.pop();
  if (limpos.length < 3) return null;
  let area = 0;
  for (let i = 0; i < limpos.length; i++) {
    const [ax, ay] = limpos[i];
    const [bx, by] = limpos[(i + 1) % limpos.length];
    area += ax * by - bx * ay;
  }
  return Math.abs(area) / 2 >= 16 ? limpos : null;
}

// Camadas das imagens (07/11, pedido do Pedro: "layer de mapa, layer do
// jogador e layer de gm"), no estilo do Roll20:
//   mapa  — fundo (mapas, cenário); fica embaixo de tudo.
//   token — Jogadores: tokens e imagens que todos veem (valor antigo mantido).
//   gm    — só o Mestre vê (notas, armadilhas, inimigos escondidos); os
//           jogadores nem recebem pra desenhar.
export const CAMADAS_IMAGEM = [
  { id: "mapa", nome: "Mapa" },
  { id: "token", nome: "Jogadores" },
  { id: "gm", nome: "Mestre" },
];
export function camadaDaImagem(o) {
  return o?.camada === "mapa" || o?.camada === "gm" ? o.camada : "token";
}
// Imagens de uma camada que esta tela pode ver (a camada do Mestre some
// pra quem não é Mestre).
export function imagensDaCamada(objetos, camada, gm) {
  if (camada === "gm" && !gm) return [];
  return (objetos || []).filter((o) => o.tipo === "imagem" && camadaDaImagem(o) === camada);
}

// Borracha por área (07/11): um traço é apagado se algum ponto dele cai no
// retângulo ou se algum segmento cruza o retângulo.
function segmentosCruzam([ax, ay], [bx, by], [cx, cy], [dx, dy]) {
  const d = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
  if (d === 0) return false;
  const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / d;
  const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}
export function tracoTocaRetangulo(pontos, { x, y, w, h }) {
  const pts = pontos || [];
  const dentro = ([px, py]) => px >= x && px <= x + w && py >= y && py <= y + h;
  if (pts.some(dentro)) return true;
  const lados = [[[x, y], [x + w, y]], [[x + w, y], [x + w, y + h]], [[x + w, y + h], [x, y + h]], [[x, y + h], [x, y]]];
  for (let i = 1; i < pts.length; i++) {
    if (lados.some(([a, b]) => segmentosCruzam(pts[i - 1], pts[i], a, b))) return true;
  }
  return false;
}

// ---- Jogadores e tokens de personagem (07/11) ----------------------
// Sem login: cada navegador diz quem é (nome do jogador, salvo no
// localStorage). Os jogadores ficam registrados como objetos "jogador" da
// mesa — { id: "jogador:<slug>", nome, fichas: [ids de ficha] } — e o
// Mestre atribui fichas a eles.
export function slugJogador(nome) {
  return String(nome || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
export function idDoJogador(nome) {
  const s = slugJogador(nome);
  return s ? `jogador:${s}` : null;
}
export function jogadoresDaMesa(objetos) {
  return (objetos || []).filter((o) => o.tipo === "jogador").sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));
}
export function fichasDoJogador(objetos, nome) {
  const id = idDoJogador(nome);
  return (objetos || []).find((o) => o.id === id)?.fichas || [];
}

// Aba Jogadores do Mestre (07/11): tokens de cada jogador, renomear e
// excluir. Funções puras que devolvem o que salvar/apagar.
export function tokensDoJogador(objetos, nome) {
  const s = slugJogador(nome);
  return (objetos || []).filter((o) => o.tipo === "imagem" && o.dono && slugJogador(o.dono) === s);
}

// Renomear muda o id (vem do nome): cria o registro novo com as mesmas
// fichas, apaga o antigo e passa os tokens dele pro nome novo. null se o
// nome for vazio ou já for de outro jogador.
export function renomearJogador(objetos, jogador, novoNome) {
  const nome = String(novoNome || "").trim().slice(0, 40);
  const idNovo = idDoJogador(nome);
  if (!idNovo || !jogador) return null;
  if (idNovo !== jogador.id && (objetos || []).some((o) => o.id === idNovo)) return null;
  const salvar = [{ ...jogador, id: idNovo, nome }, ...tokensDoJogador(objetos, jogador.nome).map((t) => ({ ...t, dono: nome }))];
  return { salvar, apagar: idNovo === jogador.id ? [] : [jogador.id] };
}

// Excluir: apaga o registro; com `comTokens`, também os tokens que ele
// colocou na mesa.
export function idsParaExcluirJogador(objetos, jogador, { comTokens = false } = {}) {
  if (!jogador) return [];
  return [jogador.id, ...(comTokens ? tokensDoJogador(objetos, jogador.nome).map((t) => t.id) : [])];
}

// Token de personagem: imagem na camada (padrão Jogadores) ligada a uma
// ficha (fichaId) ou NPC (npcId), ou avatar de um jogador (só dono).
// `dono` = nome do jogador que colocou (ele pode mover).
export function tokenDePersonagem({ id, ficha, npc, avatarUrl, dono = null, x, y, tamanho, camada = "token", ordem = 0, resolverImagem = (u) => u }) {
  const base = { id, tipo: "imagem", camada, ordem, x, y, w: tamanho, h: tamanho, dono: dono || null, redondo: true };
  if (ficha) return { ...base, fichaId: ficha.id, nome: ficha.name, url: ficha.imageUrl ? resolverImagem(ficha.imageUrl) : null };
  if (npc) return { ...base, npcId: npc.id, nome: npc.nome, url: npc.img ? resolverImagem(npc.img) : null };
  return { ...base, nome: dono || "Avatar", url: avatarUrl || null };
}

// Quem pode mover uma imagem: o Mestre, só as da camada ativa; o jogador,
// só tokens da camada Jogadores que ele colocou (dono) ou de fichas
// atribuídas a ele.
export function podeMoverImagem(o, { gm, camadaAtiva, eu, minhas = [] }) {
  if (gm) return camadaDaImagem(o) === camadaAtiva;
  if (camadaDaImagem(o) !== "token") return false;
  if (eu && o.dono && slugJogador(o.dono) === slugJogador(eu)) return true;
  return !!o.fichaId && (minhas || []).includes(o.fichaId);
}

// Rolar da ficha (08/11): dados = grau do Atributo + grau da Proficiência
// (+ extra), igual ao painel Teste da ficha. `efetivo` é a ficha com os
// bônus já aplicados (racasCatalogo.js:comGrausEfetivos). Mínimo 1 dado.
export function dadosDaFicha(efetivo, atributo, proficiencia, extra = 0) {
  const a = grauNumero(efetivo?.atributosGerais?.[atributo]);
  const p = grauNumero(efetivo?.proficiencias?.[proficiencia]);
  return { atributo: a, proficiencia: p, total: Math.max(1, a + p + (Number(extra) || 0)) };
}

// Lembrar por ficha (09/11): a última combinação Atributo + Proficiência
// (e extras) de cada ficha, guardada no aparelho. Chaves inválidas caem no
// padrão.
export const ESCOLHA_FICHA_PADRAO = { atributo: "destreza", proficiencia: "combateCorpoACorpo", extra: 0 };
export function escolhaDaFicha(mapa, fichaId, { atributos = null, proficiencias = null } = {}) {
  const salva = (mapa && typeof mapa === "object" && fichaId != null ? mapa[fichaId] : null) || {};
  const ok = (lista, v) => typeof v === "string" && (!lista || lista.includes(v));
  const extra = Math.max(0, Math.min(10, Math.round(Number(salva.extra) || 0)));
  return {
    atributo: ok(atributos, salva.atributo) ? salva.atributo : ESCOLHA_FICHA_PADRAO.atributo,
    proficiencia: ok(proficiencias, salva.proficiencia) ? salva.proficiencia : ESCOLHA_FICHA_PADRAO.proficiencia,
    extra,
  };
}
export function guardarEscolhaDaFicha(mapa, fichaId, escolha) {
  const base = mapa && typeof mapa === "object" ? mapa : {};
  if (fichaId == null) return base;
  return { ...base, [fichaId]: { atributo: escolha.atributo, proficiencia: escolha.proficiencia, extra: Number(escolha.extra) || 0 } };
}

export function camadasDeNevoa(objetos) {
  return (objetos || []).filter((o) => o.tipo === "nevoa" || o.tipo === "revelado").sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
}

// `jogador` (07/11): nome do jogador que mandou (vazio pro Mestre) — pra
// saber quem pode ver o sussurro que ele mandou e pra quem responder.
function autorResumido(autor, jogador) {
  const a = autor || AUTOR_MESTRE;
  return { id: a.id, nome: a.nome, img: a.img || null, tipo: a.tipo || "ficha", ...(jogador ? { jogador } : {}) };
}

// Sussurro (08/11): `para` — null (todos), "mestre" ou "jogador:<slug>".
export function mensagemDeFala(autor, texto, { gm = false, agora = new Date(), para = null, jogador = null } = {}) {
  const t = String(texto || "").trim();
  if (!t) return null;
  return { id: novoId(""), criado_em: agora.toISOString(), tipo: "fala", autor: autorResumido(autor, jogador), texto: t.slice(0, 2000), rolagem: null, gm: !!gm, para: para || null };
}

export function mensagemDeRolagem(autor, rolagem, { rotulo = "", gm = false, agora = new Date(), para = null, jogador = null } = {}) {
  return { id: novoId(""), criado_em: agora.toISOString(), tipo: "rolagem", autor: autorResumido(autor, jogador), texto: String(rotulo || "").slice(0, 200), rolagem, gm: !!gm, para: para || null };
}

// Quem vê uma mensagem: sem `para`, todo mundo. Sussurro: o Mestre vê
// todos (pra acompanhar a mesa); o jogador vê os que mandou e os que são
// pra ele. Atenção: é só na tela — o banco não esconde (sem login).
export function mensagemVisivel(m, { gm = false, eu = "" } = {}) {
  if (!m?.para) return true;
  if (gm) return true;
  const meu = slugJogador(eu);
  if (!meu) return false;
  if (m.autor?.jogador && slugJogador(m.autor.jogador) === meu) return true;
  return m.para === `jogador:${meu}`;
}

// Opções do "Para:" — Todos, Mestre (jogador) e cada jogador (menos eu).
export function destinosDeSussurro(jogadores, { gm = false, eu = "" } = {}) {
  const meu = slugJogador(eu);
  const lista = [{ id: "", nome: "Todos" }];
  // Pro Mestre, "mestre" é "só eu": nota ou rolagem secreta.
  lista.push(gm ? { id: "mestre", nome: "Só eu (secreto)" } : { id: "mestre", nome: "Mestre (sussurro)" });
  for (const j of jogadores || []) {
    if (slugJogador(j.nome) !== meu) lista.push({ id: j.id, nome: `${j.nome} (sussurro)` });
  }
  return lista;
}

// "/w Nome mensagem" ou "/w mestre mensagem" -> { para, texto } (o nome
// mais longo que bate ganha, pra nomes com espaço). null se não for /w ou
// se o nome não existir.
export function parseSussurro(texto, jogadores) {
  const m = /^\/(?:w|s|sussurro)\s+(.+)$/i.exec(String(texto || "").trim());
  if (!m) return null;
  const resto = m[1];
  const baixo = resto.toLowerCase();
  const candidatos = [{ id: "mestre", nome: "mestre" }, { id: "mestre", nome: "gm" }, ...(jogadores || []).map((j) => ({ id: j.id, nome: j.nome }))]
    .sort((a, b) => b.nome.length - a.nome.length);
  for (const c of candidatos) {
    const n = c.nome.toLowerCase();
    if (baixo.startsWith(n) && (baixo.length === n.length || /\s/.test(baixo[n.length]))) {
      return { para: c.id, texto: resto.slice(n.length).trim() };
    }
  }
  return null;
}

export function rotuloDoDestino(para, jogadores) {
  if (!para) return "";
  if (para === "mestre") return "Mestre";
  return (jogadores || []).find((j) => j.id === para)?.nome || para.replace(/^jogador:/, "");
}

// Junta uma mensagem (Realtime ou envio local) na lista: sem duplicar pelo
// id, em ordem de criação, guardando só as últimas MAX_MENSAGENS.
export function juntarMensagem(lista, msg) {
  if (!msg?.id) return lista;
  if ((lista || []).some((m) => m.id === msg.id)) return lista;
  const nova = [...(lista || []), msg].sort((a, b) => String(a.criado_em).localeCompare(String(b.criado_em)));
  return nova.length > MAX_MENSAGENS ? nova.slice(-MAX_MENSAGENS) : nova;
}

// Objetos do tabuleiro: { id, tipo: "imagem" | "traco" | "config", ordem, ... }.
// imagem: { url, x, y, w, h, camada: "mapa" | "token" | "gm" }
// traco:  { pontos: [[x, y], ...], cor, largura }
// config: id "config" — { grade: boolean, tamanhoGrade: number }
export function juntarObjeto(lista, obj) {
  if (!obj?.id) return lista;
  const sem = (lista || []).filter((o) => o.id !== obj.id);
  return [...sem, obj].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
}

export function tirarObjeto(lista, id) {
  return (lista || []).some((o) => o.id === id) ? lista.filter((o) => o.id !== id) : lista;
}

export const METROS_POR_QUADRADO_PADRAO = 1.5;
export function configDaMesa(objetos) {
  const c = (objetos || []).find((o) => o.id === "config" || o.tipo === "config") || {};
  const metros = Number(c.metrosPorQuadrado);
  return {
    grade: c.grade !== false,
    tamanhoGrade: Number(c.tamanhoGrade) > 10 ? Number(c.tamanhoGrade) : GRADE_PADRAO,
    metrosPorQuadrado: metros > 0 ? metros : METROS_POR_QUADRADO_PADRAO,
  };
}

// Encaixa uma posição na grade (canto do quadrado).
export function encaixarNaGrade(valor, tamanho) {
  if (!tamanho) return valor;
  return Math.round(valor / tamanho) * tamanho;
}

// Ramer–Douglas–Peucker pra não guardar centenas de pontos por traço.
export function simplificarPontos(pontos, tolerancia = 1.5) {
  const pts = (pontos || []).filter((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]));
  if (pts.length <= 2) return pts;
  const manter = new Array(pts.length).fill(false);
  manter[0] = true;
  manter[pts.length - 1] = true;
  const pilha = [[0, pts.length - 1]];
  while (pilha.length) {
    const [ini, fim] = pilha.pop();
    const [x1, y1] = pts[ini];
    const [x2, y2] = pts[fim];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const comprimento = Math.hypot(dx, dy) || 1;
    let maior = -1;
    let idx = -1;
    for (let i = ini + 1; i < fim; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / comprimento;
      if (d > maior) { maior = d; idx = i; }
    }
    if (maior > tolerancia && idx > 0) {
      manter[idx] = true;
      pilha.push([ini, idx], [idx, fim]);
    }
  }
  return pts.filter((_, i) => manter[i]).map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
}

export function caminhoDoTraco(pontos) {
  const pts = pontos || [];
  if (!pts.length) return "";
  if (pts.length === 1) return `M${pts[0][0]},${pts[0][1]} l0.1,0`;
  return pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
}

// Linha do banco -> objeto do app (e vice-versa). As tabelas guardam o
// objeto inteiro em `data` (jsonb).
export function linhaParaObjeto(linha) {
  if (!linha?.id) return null;
  return { ...(linha.data || {}), id: linha.id, tipo: linha.tipo || linha.data?.tipo, ordem: linha.ordem ?? linha.data?.ordem ?? 0 };
}

export function linhaParaMensagem(linha) {
  if (!linha?.id) return null;
  return { id: linha.id, criado_em: linha.criado_em, tipo: linha.tipo, autor: linha.autor, texto: linha.texto || "", rolagem: linha.rolagem || null, gm: !!linha.gm, para: linha.para || null };
}

// ---------------------------------------------------------------------
// 2. Conexão (Supabase ou local)
// ---------------------------------------------------------------------

export const TABELA_MENSAGENS = "point_mesa_mensagens";
export const TABELA_OBJETOS = "point_mesa_objetos";
const CHAVE_LOCAL_MENSAGENS = "point-mesa-mensagens";
const CHAVE_LOCAL_OBJETOS = "point-mesa-objetos";

function lerLocal(chave) {
  try { return JSON.parse(localStorage.getItem(chave) || "[]"); } catch (e) { return []; }
}
function gravarLocal(chave, valor) {
  try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) { /* cheio ou bloqueado: segue só na memória */ }
}

// Devolve { modo, carregar, enviarMensagem, limparMensagens, salvarObjeto,
// apagarObjeto, assinar }. `assinar({ aoMensagem, aoApagarMensagens,
// aoObjeto, aoApagarObjeto, aoStatus })` devolve a função que cancela.
export function criarConexaoMesa(supabase) {
  if (supabase) return conexaoSupabase(supabase);
  return conexaoLocal();
}

function conexaoSupabase(supabase) {
  return {
    modo: "online",
    async carregar() {
      const [m, o] = await Promise.all([
        supabase.from(TABELA_MENSAGENS).select("*").order("criado_em", { ascending: false }).limit(MAX_MENSAGENS),
        supabase.from(TABELA_OBJETOS).select("*").order("ordem", { ascending: true }),
      ]);
      if (m.error || o.error) throw (m.error || o.error);
      return {
        mensagens: (m.data || []).map(linhaParaMensagem).filter(Boolean).reverse(),
        objetos: (o.data || []).map(linhaParaObjeto).filter(Boolean),
      };
    },
    async enviarMensagem(msg) {
      const { error } = await supabase.from(TABELA_MENSAGENS).insert({
        id: msg.id, criado_em: msg.criado_em, tipo: msg.tipo, autor: msg.autor, texto: msg.texto, rolagem: msg.rolagem, gm: msg.gm,
        ...(msg.para ? { para: msg.para } : {}),
      });
      if (error) throw error;
    },
    async limparMensagens() {
      const { error } = await supabase.from(TABELA_MENSAGENS).delete().gte("criado_em", "1970-01-01");
      if (error) throw error;
    },
    async salvarObjeto(obj) {
      const { id, tipo, ordem, ...resto } = obj;
      const { error } = await supabase.from(TABELA_OBJETOS).upsert({ id, tipo, ordem: ordem ?? 0, data: { ...resto, tipo } });
      if (error) throw error;
    },
    async apagarObjeto(id) {
      const { error } = await supabase.from(TABELA_OBJETOS).delete().eq("id", id);
      if (error) throw error;
    },
    assinar({ aoMensagem, aoApagarMensagem, aoObjeto, aoApagarObjeto, aoStatus, aoReconectar }) {
      const canal = supabase
        .channel("point-mesa")
        .on("postgres_changes", { event: "*", schema: "public", table: TABELA_MENSAGENS }, (payload) => {
          if (payload.eventType === "DELETE") { if (payload.old?.id) aoApagarMensagem?.(payload.old.id); }
          else { const msg = linhaParaMensagem(payload.new); if (msg) aoMensagem?.(msg); }
        })
        .on("postgres_changes", { event: "*", schema: "public", table: TABELA_OBJETOS }, (payload) => {
          if (payload.eventType === "DELETE") { if (payload.old?.id) aoApagarObjeto?.(payload.old.id); }
          else { const obj = linhaParaObjeto(payload.new); if (obj) aoObjeto?.(obj); }
        })
        .subscribe((status) => {
          aoStatus?.(status);
          if (status === "SUBSCRIBED") aoReconectar?.();
        });
      return () => { supabase.removeChannel(canal); };
    },
  };
}

function conexaoLocal() {
  const temCanal = typeof BroadcastChannel !== "undefined";
  // Canal aberto só pelo tempo de mandar o aviso (um canal aberto à toa
  // segura o processo do Node nos testes); quem ouve abre o seu em assinar.
  const avisar = (evento) => {
    if (!temCanal) return;
    try { const c = new BroadcastChannel("point-mesa"); c.postMessage(evento); c.close(); } catch (e) { /* ignora */ }
  };
  return {
    modo: "local",
    async carregar() {
      return { mensagens: lerLocal(CHAVE_LOCAL_MENSAGENS), objetos: lerLocal(CHAVE_LOCAL_OBJETOS) };
    },
    async enviarMensagem(msg) {
      gravarLocal(CHAVE_LOCAL_MENSAGENS, juntarMensagem(lerLocal(CHAVE_LOCAL_MENSAGENS), msg));
      avisar({ tipo: "mensagem", msg });
    },
    async limparMensagens() {
      const ids = lerLocal(CHAVE_LOCAL_MENSAGENS).map((m) => m.id);
      gravarLocal(CHAVE_LOCAL_MENSAGENS, []);
      ids.forEach((id) => avisar({ tipo: "apagarMensagem", id }));
    },
    async salvarObjeto(obj) {
      gravarLocal(CHAVE_LOCAL_OBJETOS, juntarObjeto(lerLocal(CHAVE_LOCAL_OBJETOS), obj));
      avisar({ tipo: "objeto", obj });
    },
    async apagarObjeto(id) {
      gravarLocal(CHAVE_LOCAL_OBJETOS, tirarObjeto(lerLocal(CHAVE_LOCAL_OBJETOS), id));
      avisar({ tipo: "apagarObjeto", id });
    },
    assinar({ aoMensagem, aoApagarMensagem, aoObjeto, aoApagarObjeto, aoStatus }) {
      aoStatus?.("LOCAL");
      if (!temCanal) return () => {};
      const canal = new BroadcastChannel("point-mesa");
      const ouvir = (e) => {
        const ev = e.data || {};
        if (ev.tipo === "mensagem") aoMensagem?.(ev.msg);
        else if (ev.tipo === "apagarMensagem") aoApagarMensagem?.(ev.id);
        else if (ev.tipo === "objeto") aoObjeto?.(ev.obj);
        else if (ev.tipo === "apagarObjeto") aoApagarObjeto?.(ev.id);
      };
      canal.addEventListener("message", ouvir);
      return () => { canal.removeEventListener("message", ouvir); canal.close(); };
    },
  };
}

// ---- Planos (09/11): abas da Mesa ----------------------------------
// Cada plano é um tabuleiro próprio (mapa, tokens, desenhos, névoa e grade).
// O plano "principal" sempre existe; objetos antigos sem `cena` são dele.
// Plano: { id: "cena:<chave>", tipo: "cena", nome, ordem }.
// Onde estão os jogadores: { id: "estado", tipo: "estado", cenaJogadores }
// (plano de todos) e, por jogador, `cena` no objeto "jogador" (exceção).
export const CENA_PRINCIPAL = "principal";
export const TIPOS_DO_TABULEIRO = ["imagem", "traco", "nevoa", "revelado", "config"];
export function cenaDoObjeto(o) {
  return o?.cena || CENA_PRINCIPAL;
}
export function idDaCena(chave) {
  return `cena:${chave}`;
}
export function cenasDaMesa(objetos) {
  const salvas = (objetos || []).filter((o) => o.tipo === "cena" && typeof o.id === "string" && o.id.startsWith("cena:"));
  const chave = (o) => o.id.slice(5);
  const principal = salvas.find((o) => chave(o) === CENA_PRINCIPAL);
  const outras = salvas.filter((o) => chave(o) !== CENA_PRINCIPAL)
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || String(a.nome).localeCompare(String(b.nome), "pt-BR"));
  return [
    { id: CENA_PRINCIPAL, nome: principal?.nome || "Principal", principal: true },
    ...outras.map((o) => ({ id: chave(o), nome: o.nome || "Plano", ordem: o.ordem ?? 0, oculto: !!o.oculto })),
  ];
}
// Só os objetos do tabuleiro deste plano (o resto — jogadores, planos,
// estado — passa direto).
export function objetosDaCena(objetos, cena) {
  return (objetos || []).filter((o) => !TIPOS_DO_TABULEIRO.includes(o.tipo) || cenaDoObjeto(o) === cena);
}
export function idDaConfig(cena) {
  return !cena || cena === CENA_PRINCIPAL ? "config" : `config:${cena}`;
}
// Objeto novo do tabuleiro ganha o plano em que foi criado.
export function comCena(obj, cena) {
  if (!obj || !TIPOS_DO_TABULEIRO.includes(obj.tipo) || obj.cena) return obj;
  return cena && cena !== CENA_PRINCIPAL ? { ...obj, cena } : obj;
}
export function estadoDaMesa(objetos) {
  return (objetos || []).find((o) => o.id === "estado") || { id: "estado", tipo: "estado", ordem: -9998 };
}
// Plano em que um jogador está: o dele (se o Mestre separou), senão o de
// todos, senão o principal. Plano apagado cai no principal.
export function cenaDoJogador(objetos, nome) {
  // Plano oculto (09/11) não recebe jogador: quem estava lá volta.
  const existe = new Set(cenasDaMesa(objetos).filter((c) => !c.oculto).map((c) => c.id));
  const id = idDoJogador(nome);
  const proprio = (objetos || []).find((o) => o.id === id)?.cena;
  if (proprio && existe.has(proprio)) return proprio;
  const geral = estadoDaMesa(objetos).cenaJogadores;
  return geral && existe.has(geral) ? geral : CENA_PRINCIPAL;
}
export function jogadoresNaCena(objetos, cena) {
  return jogadoresDaMesa(objetos).filter((j) => cenaDoJogador(objetos, j.nome) === cena);
}
// Mover um jogador: se for pro plano de todos, tira a exceção.
export function moverJogadorDeCena(objetos, jogador, cena) {
  const geral = cenaDoJogador([...(objetos || []).filter((o) => o.tipo !== "jogador")], "");
  const { cena: _velha, ...resto } = jogador;
  return cena === geral ? resto : { ...resto, cena };
}
// Levar todos: muda o plano de todos e tira as exceções. Devolve o que
// salvar.
export function levarTodosParaCena(objetos, cena) {
  const estado = { ...estadoDaMesa(objetos), cenaJogadores: cena };
  const jogadores = jogadoresDaMesa(objetos).filter((j) => j.cena).map(({ cena: _c, ...resto }) => resto);
  return [estado, ...jogadores];
}
// Apagar um plano: ids de tudo que é dele (objetos + o próprio plano) e
// os jogadores/estado que precisam voltar pro principal.
export function apagarCena(objetos, cena) {
  if (!cena || cena === CENA_PRINCIPAL) return { apagar: [], salvar: [] };
  const apagar = [
    ...(objetos || []).filter((o) => TIPOS_DO_TABULEIRO.includes(o.tipo) && cenaDoObjeto(o) === cena).map((o) => o.id),
    idDaCena(cena),
    ...(objetos || []).filter((o) => o.id === `camera:${cena}`).map((o) => o.id),
  ];
  const salvar = [];
  const estado = estadoDaMesa(objetos);
  if (estado.cenaJogadores === cena) salvar.push({ ...estado, cenaJogadores: CENA_PRINCIPAL });
  jogadoresDaMesa(objetos).filter((j) => j.cena === cena).forEach(({ cena: _c, ...resto }) => salvar.push(resto));
  return { apagar, salvar };
}

// ---- Planos: reordenar, duplicar, esconder, câmera (09/11) --------
// Reordenar: tira `deId` e põe na posição de `paraId`. O Principal fica
// sempre primeiro. Devolve os objetos de plano que mudaram de ordem.
export function reordenarCenas(objetos, deId, paraId) {
  const cenas = cenasDaMesa(objetos).filter((c) => !c.principal);
  const de = cenas.findIndex((c) => c.id === deId);
  const para = cenas.findIndex((c) => c.id === paraId);
  if (de < 0 || para < 0 || de === para) return [];
  const lista = [...cenas];
  const [movida] = lista.splice(de, 1);
  lista.splice(para, 0, movida);
  return lista
    .map((c, i) => ({ c, ordem: i + 1 }))
    .filter(({ c, ordem }) => c.ordem !== ordem)
    .map(({ c, ordem }) => ({ ...(objetos || []).find((o) => o.id === idDaCena(c.id)), ordem }));
}
// Duplicar: plano novo logo depois do original, com cópia de tudo o que é
// do tabuleiro (ids novos). Devolve { chave, salvar }.
export function duplicarCena(objetos, cena, gerarId = novoId) {
  const origem = cenasDaMesa(objetos).find((c) => c.id === cena);
  if (!origem) return { chave: null, salvar: [] };
  const chave = gerarId("c");
  const plano = { id: idDaCena(chave), tipo: "cena", nome: `${origem.nome} (cópia)`.slice(0, 40), ordem: (origem.ordem ?? 0) + 0.5, oculto: !!origem.oculto };
  const copias = (objetos || [])
    .filter((o) => TIPOS_DO_TABULEIRO.includes(o.tipo) && cenaDoObjeto(o) === cena)
    .map((o) => ({ ...o, id: o.tipo === "config" ? idDaConfig(chave) : gerarId(o.id.split("-")[0] || "i"), cena: chave }));
  return { chave, salvar: [plano, ...copias] };
}
// Câmera (09/11): o Mestre "puxa" a visão dos jogadores daquele plano —
// guarda o centro e o zoom; cada tela ajusta ao próprio tamanho.
export function idDaCamera(cena) {
  return `camera:${cena || CENA_PRINCIPAL}`;
}
export function cameraDaCena(objetos, cena) {
  return (objetos || []).find((o) => o.id === idDaCamera(cena)) || null;
}
export function camParaTela(camera, tamanho) {
  if (!camera || !tamanho?.w) return null;
  const zoom = Math.min(3, Math.max(0.15, Number(camera.zoom) || 1));
  const [cx, cy] = camera.centro || [0, 0];
  return { zoom, x: cx - tamanho.w / 2 / zoom, y: cy - tamanho.h / 2 / zoom };
}

// ---- Régua (09/11) ---------------------------------------------------
// Distância em linha reta, em quadrados (1 casa decimal) e metros
// (1 quadrado = config.metrosPorQuadrado, padrão 1,5 m). Com grade, as
// pontas encaixam no centro do quadrado.
export function centroDoQuadrado([x, y], tamanho) {
  if (!tamanho) return [x, y];
  return [Math.floor(x / tamanho) * tamanho + tamanho / 2, Math.floor(y / tamanho) * tamanho + tamanho / 2];
}
export function medirDistancia(a, b, { tamanhoGrade, metrosPorQuadrado = METROS_POR_QUADRADO_PADRAO } = {}) {
  const px = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const quadrados = Math.round((px / (tamanhoGrade || GRADE_PADRAO)) * 10) / 10;
  const metros = Math.round(quadrados * metrosPorQuadrado * 10) / 10;
  return { quadrados, metros };
}
export function textoDistancia({ quadrados, metros }) {
  const n = (v) => String(v).replace(".", ",");
  return `${n(quadrados)} ${quadrados === 1 ? "quadrado" : "quadrados"} · ${n(metros)} m`;
}

// ---- Ordem de turno / iniciativa (09/11) -----------------------------
// Regra (Pedro, 09/11): ficha rola sucessos (6+) de Atributo + Proficiência
// que o Mestre escolhe na hora (padrão Destreza + Percepção); Veloz soma +1
// no resultado; empate: maior Destreza, depois ficha (PC) antes de NPC/nome
// livre. NPC e nome livre: o Mestre digita o valor. Um objeto por plano:
// { id: "iniciativa:<plano>", tipo: "iniciativa", entradas: [{ id, nome,
//   img, valor, tokenId, fichaId, veloz, desempate }], vez, rodada }.
export function idDaIniciativa(cena) {
  return `iniciativa:${cena || CENA_PRINCIPAL}`;
}
export function iniciativaDaCena(objetos, cena) {
  const o = (objetos || []).find((x) => x.id === idDaIniciativa(cena));
  return o || { id: idDaIniciativa(cena), tipo: "iniciativa", ordem: -9996, entradas: [], vez: null, rodada: 1 };
}
export function ordenarIniciativa(entradas) {
  const des = (e) => (Number.isFinite(Number(e.desempate)) && e.desempate !== null ? Number(e.desempate) : -1);
  return (entradas || []).map((e, i) => ({ e, i }))
    .sort((a, b) => (Number(b.e.valor) || 0) - (Number(a.e.valor) || 0)
      || des(b.e) - des(a.e)
      || (b.e.fichaId ? 1 : 0) - (a.e.fichaId ? 1 : 0)
      || a.i - b.i)
    .map(({ e }) => e);
}
export function adicionarNaIniciativa(ini, entrada) {
  if (entrada.tokenId && ini.entradas.some((e) => e.tokenId === entrada.tokenId)) return ini;
  const nova = {
    id: entrada.id, nome: entrada.nome || "?", img: entrada.img || null, valor: Number(entrada.valor) || 0,
    tokenId: entrada.tokenId || null, fichaId: entrada.fichaId || null, veloz: !!entrada.veloz,
    desempate: entrada.desempate ?? null,
  };
  const entradas = ordenarIniciativa([...ini.entradas, nova]);
  return { ...ini, entradas, vez: ini.vez ?? null };
}
export function valorNaIniciativa(ini, id, valor) {
  return { ...ini, entradas: ordenarIniciativa(ini.entradas.map((e) => (e.id === id ? { ...e, valor: Number(valor) || 0 } : e))) };
}
export function tirarDaIniciativa(ini, id) {
  const lista = ini.entradas;
  const i = lista.findIndex((e) => e.id === id);
  if (i < 0) return ini;
  const entradas = lista.filter((e) => e.id !== id);
  let vez = ini.vez;
  if (vez === id) vez = entradas.length ? entradas[i % entradas.length].id : null;
  return { ...ini, entradas, vez };
}
// Avança (+1) ou volta (-1) a vez; ao passar do último, nova rodada.
export function passarVez(ini, passo = 1) {
  const lista = ini.entradas;
  if (!lista.length) return { ...ini, vez: null };
  const i = lista.findIndex((e) => e.id === ini.vez);
  if (i < 0) return { ...ini, vez: lista[passo > 0 ? 0 : lista.length - 1].id, rodada: ini.rodada || 1 };
  let j = i + passo;
  let rodada = ini.rodada || 1;
  if (j >= lista.length) { j = 0; rodada += 1; }
  if (j < 0) { j = lista.length - 1; rodada = Math.max(1, rodada - 1); }
  return { ...ini, vez: lista[j].id, rodada };
}
export function limparIniciativa(ini) {
  return { ...ini, entradas: [], vez: null, rodada: 1 };
}

// ---- Vida no token (09/11) -------------------------------------------
// hp da ficha = { current, max, superficiais }. Devolve os pontos para a
// barra: "inteiro", "quebrado" (superficial) ou "perdido" (agravante).
export function pontosDeVida(hp) {
  const max = Math.max(0, Math.round(Number(hp?.max) || 0));
  if (!max) return [];
  const atual = Math.max(0, Math.min(max, Math.round(Number(hp?.current ?? max))));
  const quebrados = Math.max(0, Math.min(atual, Math.round(Number(hp?.superficiais) || 0)));
  return Array.from({ length: max }, (_, i) => (i >= atual ? "perdido" : i >= atual - quebrados ? "quebrado" : "inteiro"));
}
// Quem vê a vida de um token: o Mestre vê todas; o jogador, só a das
// fichas dele.
export function podeVerVida(o, { gm, minhas = [] }) {
  if (!o?.fichaId) return false;
  return !!gm || (minhas || []).includes(o.fichaId);
}

// ---- Animação de dados (09/11) ---------------------------------------
// Só anima rolagem nova (chegou depois que a Mesa abriu e é recente).
export function deveAnimarRolagem(msg, { abertaEm, agora = Date.now(), janela = 8000 }) {
  if (!msg?.rolagem) return false;
  const t = Date.parse(msg.criado_em);
  if (!Number.isFinite(t)) return !!msg._pendente;
  return t >= abertaEm - 1000 && agora - t < janela;
}

// Veloz liga/desliga na entrada: +1/−1 no valor (09/11).
export function velozNaIniciativa(ini, id, veloz) {
  return {
    ...ini,
    entradas: ordenarIniciativa(ini.entradas.map((e) => {
      if (e.id !== id || !!e.veloz === !!veloz) return e;
      return { ...e, veloz: !!veloz, valor: (Number(e.valor) || 0) + (veloz ? 1 : -1) };
    })),
  };
}
export const INICIATIVA_PADRAO = { atributo: "destreza", proficiencia: "percepcao" };
// Rola a iniciativa das entradas com ficha. `fichaDe(entrada)` devolve a
// ficha EFETIVA (com bônus — comGrausEfetivos) ou null. Devolve a nova
// iniciativa e um resumo por ficha para o chat.
export function rolarIniciativa(ini, { fichaDe, atributo = INICIATIVA_PADRAO.atributo, proficiencia = INICIATIVA_PADRAO.proficiencia, aleatorio = Math.random } = {}) {
  const resumo = [];
  const entradas = ini.entradas.map((e) => {
    const ficha = fichaDe ? fichaDe(e) : null;
    if (!ficha) return e;
    const conta = dadosDaFicha(ficha, atributo, proficiencia);
    const r = rolarDados(conta.total, ALVO_PADRAO, aleatorio);
    const veloz = (ficha.descritores || []).includes("veloz") || !!e.veloz;
    const valor = r.sucessos + (veloz ? 1 : 0);
    const desempate = grauNumero(ficha.atributosGerais?.destreza);
    resumo.push({ nome: e.nome, dados: conta.total, faces: r.faces, sucessos: r.sucessos, veloz, valor });
    return { ...e, valor, veloz, desempate };
  });
  return { ini: { ...ini, entradas: ordenarIniciativa(entradas), vez: null, rodada: 1 }, resumo };
}
export function textoDaIniciativa(resumo, rotulo) {
  if (!resumo.length) return "";
  const partes = resumo.map((r) => `${r.nome} ${r.valor}${r.veloz ? " (Veloz +1)" : ""} [${r.faces.join(" ")}]`);
  return `Iniciativa (${rotulo}): ${partes.join(" · ")}`;
}

// ---- Dano no token (09/11) -------------------------------------------
// O Mestre aplica ferimento direto no token de ficha; grava no hp da ficha
// com a regra de sempre (engine.js:aplicarFerimentos — com todos os pontos
// quebrados, o superficial vira agravante). "tirarQuebrado" e
// "recuperarPonto" são correções manuais (desfazem 1 superficial / 1
// agravante), não uma regra de cura.
export function ferimentoNoHp(hp, acao) {
  const max = Math.max(0, Number(hp?.max) || 0);
  const base = { ...hp, current: Math.max(0, Math.min(max, Number(hp?.current ?? max))), superficiais: Math.max(0, Number(hp?.superficiais) || 0) };
  if (acao === "superficial" || acao === "agravante") return aplicarFerimentos(base, acao, 1);
  if (acao === "tirarQuebrado") return { ...base, superficiais: Math.max(0, base.superficiais - 1) };
  if (acao === "recuperarPonto") return { ...base, current: Math.min(max, base.current + 1) };
  return base;
}
export function textoDoFerimento(nome, acao, antes, depois) {
  const vida = `vida ${depois.current}/${depois.max}${depois.superficiais ? `, ${depois.superficiais} ${depois.superficiais === 1 ? "quebrado" : "quebrados"}` : ""}`;
  if (acao === "superficial") {
    const virou = depois.current < antes.current;
    return virou
      ? `${nome} sofreu 1 ferimento superficial — virou agravante (todos os pontos já estavam quebrados) (${vida}).`
      : `${nome} sofreu 1 ferimento superficial (${vida}).`;
  }
  if (acao === "agravante") return `${nome} sofreu 1 ferimento agravante (${vida}).`;
  if (acao === "tirarQuebrado") return `${nome}: 1 ponto quebrado desfeito (${vida}).`;
  if (acao === "recuperarPonto") return `${nome}: 1 ponto de vida recuperado (${vida}).`;
  return "";
}

// ---- Condições no token (09/11) --------------------------------------
// Marcadores visuais que o Mestre liga/desliga; não mexem em regra.
export const CONDICOES = [
  { id: "envenenado", nome: "Envenenado", letra: "V", cor: "#4C8A3A" },
  { id: "sangrando", nome: "Sangrando", letra: "S", cor: "#A83A2E" },
  { id: "queimando", nome: "Queimando", letra: "Q", cor: "#D9682A" },
  { id: "carregado", nome: "Carregado (Carga)", letra: "C", cor: "#3F6FB0" },
  { id: "atordoado", nome: "Atordoado", letra: "A", cor: "#7A5BA8" },
  { id: "caido", nome: "Caído", letra: "↓", cor: "#6B5D45" },
  { id: "marcado", nome: "Marcado", letra: "M", cor: "#A9762C" },
];
export function condicoesDoToken(o) {
  const ids = new Set(o?.condicoes || []);
  return CONDICOES.filter((c) => ids.has(c.id));
}
export function alternarCondicao(o, id) {
  const atuais = o?.condicoes || [];
  const condicoes = atuais.includes(id) ? atuais.filter((x) => x !== id) : [...atuais, id];
  return { ...o, condicoes };
}

// ---- Macros de rolagem por ficha (09/11) -----------------------------
// Um objeto por ficha: { id: "macros:<fichaId>", tipo: "macros", fichaId,
// macros: [{ id, nome, atributo, proficiencia, extra }] }. O Mestre edita
// as de qualquer ficha; o jogador, as das fichas dele.
export function idDosMacros(fichaId) {
  return `macros:${fichaId}`;
}
export function macrosDaFicha(objetos, fichaId) {
  const o = (objetos || []).find((x) => x.id === idDosMacros(fichaId));
  return o || { id: idDosMacros(fichaId), tipo: "macros", ordem: -9995, fichaId, macros: [] };
}
export function adicionarMacro(obj, macro) {
  const nome = String(macro.nome || "").trim().slice(0, 40);
  if (!nome) return obj;
  const novo = { id: macro.id, nome, atributo: macro.atributo, proficiencia: macro.proficiencia, extra: Math.max(0, Math.min(10, Number(macro.extra) || 0)) };
  return { ...obj, macros: [...(obj.macros || []).filter((m) => m.nome.toLowerCase() !== nome.toLowerCase()), novo].slice(-12) };
}
export function tirarMacro(obj, id) {
  return { ...obj, macros: (obj.macros || []).filter((m) => m.id !== id) };
}
export function podeEditarMacros(fichaId, { gm, minhas = [] }) {
  return !!fichaId && (!!gm || (minhas || []).includes(fichaId));
}

// ---- Re-rolar um dado (09/11) ----------------------------------------
// Clicar num dado de uma rolagem do chat rola só ele de novo. O banco não
// edita mensagens (só cria/apaga), então sai uma mensagem NOVA com a
// rolagem atualizada e o registro do que mudou ({ indice, de, para }) —
// todo mundo vê. Pode re-rolar: o Mestre (qualquer rolagem) e o jogador
// (as rolagens que ele mesmo mandou).
export function podeRerrolar(m, { gm = false, eu = "" } = {}) {
  if (m?.tipo !== "rolagem" || !Array.isArray(m.rolagem?.faces) || !m.rolagem.faces.length) return false;
  if (gm) return true;
  const meu = slugJogador(eu);
  return !!meu && !!m.autor?.jogador && slugJogador(m.autor.jogador) === meu;
}
export function rerrolarDado(rolagem, indice, aleatorio = Math.random) {
  const faces = [...(rolagem?.faces || [])];
  if (indice < 0 || indice >= faces.length) return rolagem;
  const de = faces[indice];
  const para = Math.floor(aleatorio() * 10) + 1;
  faces[indice] = para;
  const alvo = rolagem.alvo ?? ALVO_PADRAO;
  return {
    ...rolagem, faces, alvo,
    sucessos: faces.filter((d) => d === 10 || d >= alvo).length,
    criticos: faces.filter((d) => d === 10).length,
    rerrolagem: { indice, de, para },
  };
}
export function mensagemDeRerrolagem(m, indice, { gm = false, porMestre = false, aleatorio = Math.random, agora = new Date() } = {}) {
  const rolagem = rerrolarDado(m.rolagem, indice, aleatorio);
  const r = rolagem.rerrolagem;
  if (!r) return null;
  const base = String(m.texto || "").replace(/^Re-rolagem[^—]*—\s*/, "");
  const rotulo = `Re-rolagem do dado ${r.indice + 1} (${r.de} → ${r.para})${porMestre ? " pelo Mestre" : ""}${base ? ` — ${base}` : ""}`;
  return mensagemDeRolagem(m.autor, rolagem, { rotulo, gm, agora, para: m.para || null, jogador: m.autor?.jogador || null });
}
