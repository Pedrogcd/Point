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

export function identidadesDaMesa({ personagens = [], npcs = [], gm = false, resolverImagem = (x) => x } = {}) {
  const fichas = (personagens || [])
    .filter((p) => p?.id && p.name)
    .map((p) => ({ id: `ficha:${p.id}`, nome: p.name, img: p.imageUrl ? resolverImagem(p.imageUrl) : null, tipo: "ficha" }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  if (!gm) return fichas;
  const doMundo = (npcs || [])
    .filter((n) => n?.id && n.nome)
    .map((n) => ({ id: `npc:${n.id}`, nome: n.nome, img: n.img ? resolverImagem(n.img) : null, tipo: "npc" }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  return [AUTOR_MESTRE, ...fichas, ...doMundo];
}

function autorResumido(autor) {
  const a = autor || AUTOR_MESTRE;
  return { id: a.id, nome: a.nome, img: a.img || null, tipo: a.tipo || "ficha" };
}

export function mensagemDeFala(autor, texto, { gm = false, agora = new Date() } = {}) {
  const t = String(texto || "").trim();
  if (!t) return null;
  return { id: novoId(""), criado_em: agora.toISOString(), tipo: "fala", autor: autorResumido(autor), texto: t.slice(0, 2000), rolagem: null, gm: !!gm };
}

export function mensagemDeRolagem(autor, rolagem, { rotulo = "", gm = false, agora = new Date() } = {}) {
  return { id: novoId(""), criado_em: agora.toISOString(), tipo: "rolagem", autor: autorResumido(autor), texto: String(rotulo || "").slice(0, 200), rolagem, gm: !!gm };
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
// imagem: { url, x, y, w, h, camada: "mapa" | "token" }
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

export function configDaMesa(objetos) {
  const c = (objetos || []).find((o) => o.id === "config") || {};
  return { grade: c.grade !== false, tamanhoGrade: Number(c.tamanhoGrade) > 10 ? Number(c.tamanhoGrade) : GRADE_PADRAO };
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
  return { id: linha.id, criado_em: linha.criado_em, tipo: linha.tipo, autor: linha.autor, texto: linha.texto || "", rolagem: linha.rolagem || null, gm: !!linha.gm };
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
