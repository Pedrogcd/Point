// Árvore do mundo (aba Mundo > Árvore) — monta, a partir dos dados do app, a
// hierarquia completa do RPG (reinos, cidades, pessoas, deuses, mesas de
// personagens, sagas) num formato de nó genérico que a UI (ArvoreMundoView em
// point-amaranth-app.jsx) só precisa percorrer e renderizar. Função pura, sem
// React nem DOM — pra poder ser testada isolada (ver arvoreMundo.test.js).
//
// VISIBILIDADE: `gm` decide ANTES de contar — um personagem com fichaFechada,
// um membro de organização com soMestre, ou um nó de genealogia soMestre não
// entram na árvore nem nos contadores quando gm=false (nunca revela algo
// escondido através de uma contagem). Reaproveita gruposDoReino/itensVisiveis
// de pessoasReino.js (mesma função que a aba Pessoas já usa) e
// grupoDoPersonagem de sidepoint.js — não duplica essa lógica aqui.
//
// Formato do nó: { id, t, label, sub, count, status, secret, ficha,
// personagemId, empty, alvo, children, hit }. `alvo` é um descritor de
// navegação puro (ex: { tipo: "reino", reinoId }) — quem decide o que fazer
// com ele é a camada React (não há callback aqui, só dados).
import { gruposDoReino, itensVisiveis } from "./pessoasReino.js";
import { grupoDoPersonagem } from "./sidepoint.js";

export const ID_RAIZ = "mundo";

function arr(x) {
  return Array.isArray(x) ? x : [];
}

function statusCidade(cidade) {
  if (cidade?.documentada === false) return "esboco";
  const resumo = typeof cidade?.resumo === "string" ? cidade.resumo.trim() : "";
  if (!resumo) return "vazio";
  return "ok";
}

function montarCidades(reino, reinoId) {
  const cities = arr(reino?.cities);
  const children = cities.map((c, i) => ({
    id: `cidade:${reinoId}:${i}:${c?.id || ""}`,
    t: "cidade",
    label: c?.name || "",
    sub: c?.capital ? "Capital" : undefined,
    status: statusCidade(c),
    alvo: { tipo: "cidade", reinoId, cidadeId: c?.id },
  }));
  return {
    id: `sec:cidades:${reinoId}`,
    t: "grupo",
    label: "Cidades",
    count: children.length,
    children,
    ...(children.length === 0 ? { empty: "Nenhuma cidade cadastrada" } : {}),
  };
}

function montarPessoaOrg(m, reinoId, grupoId, idx) {
  const personagem = m?.personagem || null;
  const ficha = !!personagem;
  const label = ficha ? personagem.name || "" : m?.nomeLivre || "Personagem removido";
  const chave = m?.personagemId || m?.nomeLivre || String(idx);
  return {
    id: `pessoa:org:${reinoId}:${grupoId}:${idx}:${chave}`,
    t: "pessoa",
    label,
    sub: m?.cargo || undefined,
    ficha,
    personagemId: ficha ? personagem.id : undefined,
    secret: !!m?.soMestre,
    alvo: ficha ? { tipo: "ficha", personagemId: personagem.id } : undefined,
  };
}

function montarOrg(grupo, reinoId, gm) {
  const membrosVisiveis = itensVisiveis(grupo?.membros, gm);
  const children = membrosVisiveis.map((m, i) => montarPessoaOrg(m, reinoId, grupo?.id ?? "x", i));
  return {
    id: `org:${reinoId}:${grupo?.id ?? ""}`,
    t: "org",
    label: grupo?.nome || "",
    sub: grupo?.funcao || undefined,
    count: children.length,
    children,
  };
}

function montarPessoasReino(reino, characters, reinoId, gm) {
  const pessoas = reino?.pessoas;
  const titulo = pessoas?.estrutura?.titulo || "Pessoas";
  const grupos = gruposDoReino(pessoas, characters, reino?.name);
  const children = grupos.map((g) => montarOrg(g, reinoId, gm));
  return {
    id: `sec:pessoas:${reinoId}`,
    t: "grupo",
    label: titulo,
    count: children.length,
    children,
    ...(children.length === 0 ? { empty: "Sem pessoas registradas" } : {}),
  };
}

function montarGenealogias(reino, reinoId, gm) {
  const genealogias = arr(reino?.pessoas?.genealogias);
  const children = genealogias.map((g, i) => {
    const nosVisiveis = itensVisiveis(arr(g?.nos), gm);
    const n = nosVisiveis.length;
    return {
      id: `gen:${reinoId}:${i}:${g?.id || ""}`,
      t: "gen",
      label: g?.titulo || "",
      sub: `${n} pessoa${n === 1 ? "" : "s"}`,
      alvo: { tipo: "pessoas", reinoId },
    };
  });
  return {
    id: `sec:genealogias:${reinoId}`,
    t: "grupo",
    label: "Árvores genealógicas",
    count: children.length,
    children,
    ...(children.length === 0 ? { empty: "Nenhuma árvore genealógica cadastrada" } : {}),
  };
}

function montarReino(reino, characters, gm) {
  const reinoId = reino?.id || "";
  return {
    id: `reino:${reinoId}`,
    t: "reino",
    label: reino?.name || "",
    alvo: { tipo: "reino", reinoId },
    children: [
      montarCidades(reino, reinoId),
      montarPessoasReino(reino, characters, reinoId, gm),
      montarGenealogias(reino, reinoId, gm),
    ],
  };
}

function montarMesas(grupos, characters, gm) {
  const gruposArr = arr(grupos);
  const idsConhecidos = new Set(gruposArr.map((g) => g.id));
  const porGrupo = new Map(gruposArr.map((g) => [g.id, []]));
  const semMesa = [];
  for (const c of arr(characters)) {
    const gid = grupoDoPersonagem(c);
    if (idsConhecidos.has(gid)) porGrupo.get(gid).push(c);
    else semMesa.push(c);
  }
  const nodes = gruposArr.map((g) => montarMesa(g.id, g.label || g.nome || "", g.subtitulo, porGrupo.get(g.id), gm));
  if (semMesa.length > 0) nodes.push(montarMesa("__sem_mesa__", "Sem mesa", undefined, semMesa, gm));
  return nodes;
}

function montarMesa(grupoId, label, sub, personagens, gm) {
  const visiveis = arr(personagens).filter((c) => gm || !c?.fichaFechada);
  const children = visiveis.map((c, i) => ({
    id: `pessoa:mesa:${grupoId}:${i}:${c?.id || ""}`,
    t: "pessoa",
    label: c?.name || "",
    sub: c?.faction || undefined,
    ficha: true,
    personagemId: c?.id,
    secret: !!c?.fichaFechada,
    alvo: c?.id ? { tipo: "ficha", personagemId: c.id } : undefined,
  }));
  return {
    id: `mesa:${grupoId}`,
    t: "mesa",
    label,
    sub: sub || undefined,
    count: children.length,
    children,
    ...(children.length === 0 ? { empty: "Nenhum personagem nesta mesa" } : {}),
  };
}

export function montarArvoreMundo({ kingdoms, gods, characters, sagas, grupos, gm } = {}) {
  const isGm = !!gm;
  const charsArr = arr(characters);

  const reinos = arr(kingdoms).map((reino) => montarReino(reino, charsArr, isGm));
  const deuses = arr(gods).map((d) => ({
    id: `deus:${d?.id || ""}`,
    t: "deus",
    label: d?.name || "",
    sub: d?.domain || undefined,
    alvo: { tipo: "deuses" },
  }));
  const mesas = montarMesas(grupos, charsArr, isGm);
  const sagasNos = arr(sagas).map((s) => ({
    id: `saga:${s?.id || ""}`,
    t: "saga",
    label: s?.title || "",
    sub: s?.status || undefined,
    alvo: { tipo: "sagas" },
  }));

  const secReinos = {
    id: "sec:reinos", t: "grupo", label: "Reinos", count: reinos.length, children: reinos,
    ...(reinos.length === 0 ? { empty: "Nenhum reino cadastrado" } : {}),
  };
  const secPanteao = {
    id: "sec:panteao", t: "grupo", label: "Panteão", count: deuses.length, children: deuses,
    ...(deuses.length === 0 ? { empty: "Nenhuma divindade cadastrada" } : {}),
  };
  const secMesas = {
    id: "sec:mesas", t: "grupo", label: "Mesas e personagens", count: mesas.length, children: mesas,
    ...(mesas.length === 0 ? { empty: "Nenhuma mesa cadastrada" } : {}),
  };
  const secSagas = {
    id: "sec:sagas", t: "grupo", label: "Sagas", count: sagasNos.length, children: sagasNos,
    ...(sagasNos.length === 0 ? { empty: "Nenhuma saga cadastrada" } : {}),
  };

  return {
    id: ID_RAIZ, t: "mundo", label: "AMARANTH", sub: "Universo de Point",
    children: [secReinos, secPanteao, secMesas, secSagas],
  };
}

// Pendência: cidade em esboço ou sem texto, grupo (seção) sem itens, pessoa
// de organização sem ficha. Mesas/orgs vazios não contam — só a estrutura
// (seção) em si sendo zero é sinal de algo faltando.
export function ehPendencia(n) {
  if (!n) return false;
  return (
    n.status === "esboco" ||
    n.status === "vazio" ||
    (n.t === "pessoa" && n.ficha === false) ||
    (n.t === "grupo" && (n.count || 0) === 0)
  );
}

// Filtro de busca + "só pendências", recursivo: devolve uma cópia da árvore
// só com o que casa (ou que tem descendente que casa), marcando `hit` em
// quem bateu a busca. `null` quando nada sobra. Não mexe em visibilidade
// (soMestre) — isso já foi decidido em montarArvoreMundo, antes de chegar
// aqui.
export function filtrarArvore(n, termo, soPendencias) {
  if (!n) return null;
  const q = (termo || "").trim().toLowerCase();
  const filhosOriginais = n.children || [];
  const filhosFiltrados = filhosOriginais.map((c) => filtrarArvore(c, q, soPendencias)).filter(Boolean);
  const bateBusca = !q || `${n.label || ""} ${n.sub || ""}`.toLowerCase().includes(q);
  const passaPendencia = !soPendencias || ehPendencia(n);
  const manter = (bateBusca && passaPendencia) || filhosFiltrados.length > 0;
  if (!manter) return null;
  const children = filhosFiltrados.length > 0 || filhosOriginais.length === 0 ? filhosFiltrados : [];
  return { ...n, children, hit: !!q && bateBusca };
}

// Resumo pro topo da tela: Reinos, Cidades, Divindades, Personagens (só os
// das mesas, sem contar quem também aparece como pessoa de organização de
// um reino), Grupos internos (nós "org"), Pendências.
export function resumoArvore(raiz) {
  const c = { reino: 0, cidade: 0, deus: 0, org: 0, pessoaMesa: 0, pendencias: 0 };
  function andar(n, dentroDeMesa) {
    if (!n) return;
    if (n.t === "reino") c.reino++;
    if (n.t === "cidade") c.cidade++;
    if (n.t === "deus") c.deus++;
    if (n.t === "org") c.org++;
    const emMesa = dentroDeMesa || n.t === "mesa";
    if (n.t === "pessoa" && emMesa) c.pessoaMesa++;
    if (n.t !== "mundo" && ehPendencia(n)) c.pendencias++;
    for (const filho of n.children || []) andar(filho, emMesa);
  }
  andar(raiz, false);
  return c;
}

// Todos os ids da árvore, em pré-ordem — usado por "Expandir tudo".
export function todosOsIds(n, acc = []) {
  if (!n) return acc;
  acc.push(n.id);
  for (const filho of n.children || []) todosOsIds(filho, acc);
  return acc;
}

// Ids abertos por padrão: raiz (sempre forçada via profundidade 0 na UI, não
// precisa estar aqui), as 4 seções do topo, e cada reino dentro da seção
// "Reinos" (que é sempre a primeira). "Recolher" usa só idsSecoesApenas.
export function idsSecoesApenas(raiz) {
  const ids = new Set();
  for (const secao of raiz?.children || []) ids.add(secao.id);
  return ids;
}

export function idsAbertosPadrao(raiz) {
  const ids = idsSecoesApenas(raiz);
  const secReinos = (raiz?.children || [])[0];
  for (const reino of secReinos?.children || []) ids.add(reino.id);
  return ids;
}
