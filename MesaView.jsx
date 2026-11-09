// Aba "Mesa" (07/11) — região pra jogar: tabuleiro com grade, imagens e
// desenho (todos veem), e um chat à direita com "falar como" (retratinho do
// personagem na mensagem) e rolagem de dados que todos veem.
//
// Referências de interação: Roll20 (chat com seletor "falar como" no pé e
// cartões de rolagem), Owlbear Rodeo (barra de ferramentas enxuta flutuando
// sobre o mapa) e Foundry VTT (retrato do falante na mensagem). A lógica
// (comandos, rolagem, mensagens, objetos) e a conexão em tempo real ficam
// em mesa.js; aqui é só a tela.
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  MousePointer2, Hand, Pencil, Eraser, ImagePlus, Map as MapIcon, Grid3x3, ZoomIn, ZoomOut, Maximize,
  Trash2, Send, Dices, Plus, Minus, Wifi, WifiOff, Crown,
  CloudFog, Cloud, CloudOff, Eye, Square, Circle, Pentagon, Magnet, Undo2, Check, X as XIcon, Users, Layers,
  UserPlus, UserRound, ExternalLink, Lock, Reply, ScrollText, Flag, PencilLine,
} from "lucide-react";
import {
  MESA_LARGURA, MESA_ALTURA, CORES_DESENHO, ALVO_PADRAO, MAX_DADOS, AUTOR_MESTRE,
  novoId, parseComandoRolagem, rolarDados, identidadesDaMesa, mensagemDeFala, mensagemDeRolagem,
  juntarMensagem, juntarObjeto, tirarObjeto, configDaMesa, encaixarNaGrade, simplificarPontos,
  caminhoDoTraco, criarConexaoMesa, gruposDeIdentidades, retanguloDeArraste, camadasDeNevoa,
  formaDaNevoa, encaixarPonto, circuloDeArraste, pontosPerto, fecharPoligono,
  CAMADAS_IMAGEM, camadaDaImagem, imagensDaCamada, tracoTocaRetangulo,
  idDoJogador, jogadoresDaMesa, fichasDoJogador, tokenDePersonagem, podeMoverImagem,
  mensagemVisivel, destinosDeSussurro, parseSussurro, rotuloDoDestino, dadosDaFicha, escolhaDaFicha, guardarEscolhaDaFicha,
  CENA_PRINCIPAL, cenasDaMesa, objetosDaCena, idDaCena, idDaConfig, comCena, estadoDaMesa,
  cenaDoJogador, jogadoresNaCena, moverJogadorDeCena, levarTodosParaCena, apagarCena,
} from "./mesa.js";
import { ATRIBUTOS_GERAIS_LIST, PROFICIENCIAS_LIST, grauNumero } from "./engine.js";
import { comGrausEfetivos } from "./racasCatalogo.js";

// Uma forma de névoa (retângulo, círculo ou polígono) como elemento SVG.
function FormaNevoa({ n, ...props }) {
  const forma = formaDaNevoa(n);
  if (forma === "circulo") return <circle cx={n.cx} cy={n.cy} r={n.r} {...props} />;
  if (forma === "poligono") return <polygon points={(n.pontos || []).map((p) => p.join(",")).join(" ")} {...props} />;
  return <rect x={n.x} y={n.y} width={n.w} height={n.h} {...props} />;
}
import { uploadImagemMesa } from "./imageUpload.js";

// Mesma paleta do app (point-amaranth-app.jsx).
const PANEL = "#F3E9D2";
const PANEL_2 = "#EADFC0";
const LINE = "#C9B78E";
const PARCHMENT = "#2B2116";
const MUTED = "#6B5D45";
const BRASS = "#A9762C";
const EMBER = "#A83A2E";
const PURPLE = "#4B3B6B";
const MESA_FUNDO = "#E4D7B5";
const CHAVE_AUTOR = "point-mesa-autor";
const CHAVE_ROLAGEM_FICHA = "point-mesa-rolagem-ficha";
const CHAVE_CENA = "point-mesa-cena";
const CHAVE_JOGADOR = "point-mesa-jogador";

function iniciais(nome) {
  return String(nome || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function Avatar({ autor, tamanho = 34 }) {
  const cor = autor?.tipo === "mestre" ? PURPLE : autor?.tipo === "npc" ? BRASS : autor?.tipo === "jogador" ? "#2F8577" : LINE;
  const [falhou, setFalhou] = useState(false);
  const base = {
    width: tamanho, height: tamanho, borderRadius: "50%", flexShrink: 0, border: `2px solid ${cor}`,
    background: autor?.tipo === "mestre" ? PURPLE : PANEL_2, display: "flex", alignItems: "center", justifyContent: "center",
    overflow: "hidden", color: autor?.tipo === "mestre" ? PANEL : MUTED, fontFamily: "'Cinzel', serif", fontSize: tamanho * 0.36, fontWeight: 700,
  };
  if (autor?.tipo === "mestre") return <div style={base} title="Mestre"><Crown size={tamanho * 0.5} /></div>;
  if (autor?.img && !falhou) {
    return <div style={base}><img src={autor.img} alt="" onError={() => setFalhou(true)} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>;
  }
  return <div style={base}>{iniciais(autor?.nome)}</div>;
}

function BotaoFerramenta({ ativo, titulo, onClick, children, perigo }) {
  return (
    <button
      type="button" title={titulo} aria-label={titulo} aria-pressed={!!ativo} onClick={onClick}
      style={{
        width: 38, height: 38, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        border: `1px solid ${ativo ? PURPLE : "transparent"}`, background: ativo ? PURPLE : "transparent",
        color: ativo ? PANEL : perigo ? EMBER : PARCHMENT, transition: "background 0.12s",
      }}
    >
      {children}
    </button>
  );
}

const barraFlutuante = {
  position: "absolute", background: `${PANEL}F2`, border: `1px solid ${LINE}`, borderRadius: 10,
  boxShadow: "0 4px 14px #00000026", padding: 4, display: "flex", gap: 2, zIndex: 2,
};

function hora(iso) {
  try { return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; }
}

function CartaoRolagem({ r }) {
  return (
    <div style={{ marginTop: 4, padding: "8px 10px", borderRadius: 8, background: PANEL, border: `1px solid ${LINE}` }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {(r.faces || []).map((d, i) => {
          const sucesso = d === 10 || d >= r.alvo;
          return (
            <span key={i} style={{
              width: 26, height: 26, borderRadius: 5, display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, fontWeight: 700,
              background: d === 10 ? PURPLE : sucesso ? BRASS : "transparent", color: sucesso ? PANEL : MUTED,
              border: `1px solid ${sucesso ? "transparent" : LINE}`,
            }}>{d}</span>
          );
        })}
      </div>
      <div style={{ marginTop: 6, display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontFamily: "'Cinzel', serif", fontSize: 17, fontWeight: 700, color: r.sucessos ? BRASS : MUTED }}>
          {r.sucessos} {r.sucessos === 1 ? "sucesso" : "sucessos"}
        </span>
        <span style={{ fontSize: 10.5, color: MUTED, fontFamily: "'IBM Plex Mono', monospace" }}>{(r.faces || []).length}d10 · {r.alvo}+</span>
      </div>
    </div>
  );
}

// Sussurro (08/11): borda roxa tracejada, cadeado e "de quem pra quem";
// "responder" já escolhe o destino de volta.
function Mensagem({ m, rotuloPara, onResponder }) {
  const sussurro = !!m.para;
  return (
    <div style={{
      display: "flex", gap: 8, padding: "7px 10px", animation: "mesaEntrada 0.25s ease",
      ...(sussurro ? { margin: "3px 8px", borderRadius: 10, border: `1.5px dashed ${PURPLE}88`, background: `${PURPLE}0D` } : {}),
    }}>
      <Avatar autor={m.autor} />
      <div style={{ minWidth: 0, flex: 1 }}>
        {sussurro && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: PURPLE, fontWeight: 700, marginBottom: 2 }}>
            <Lock size={11} /> Sussurro{m.autor?.jogador ? ` de ${m.autor.jogador}` : ""} para {rotuloPara}
            {onResponder && (
              <button type="button" onClick={onResponder} style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 3, border: "none", background: "transparent", color: PURPLE, cursor: "pointer", fontSize: 10.5 }}>
                <Reply size={11} /> responder
              </button>
            )}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 12.5, fontWeight: 700, color: m.autor?.tipo === "mestre" ? PURPLE : PARCHMENT }}>{m.autor?.nome || "?"}</span>
          <span style={{ fontSize: 9.5, color: MUTED, fontFamily: "'IBM Plex Mono', monospace" }}>{hora(m.criado_em)}</span>
        </div>
        {m.tipo === "rolagem" ? (
          <>
            {m.texto && <div style={{ fontSize: 12, color: PARCHMENT, fontStyle: "italic" }}>{m.texto}</div>}
            {m.rolagem && <CartaoRolagem r={m.rolagem} />}
          </>
        ) : (
          <div style={{ fontSize: 13, color: PARCHMENT, lineHeight: 1.45, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{m.texto}</div>
        )}
      </div>
    </div>
  );
}

// Pop-up do token (07/11): duplo clique num token de personagem mostra a
// ficha resumida (retrato, recursos, atributos e proficiências de combate,
// com os bônus já aplicados) e um botão pra abrir a ficha completa. NPC:
// só o que é público. Ficha "só GM" de outra pessoa: jogador vê só o nome.
function PopupToken({ token, personagens, npcs, gm, minhas, resolverImagem, onAbrirFicha, onFechar }) {
  const ficha = token.fichaId ? (personagens || []).find((p) => p.id === token.fichaId) : null;
  const npc = token.npcId ? (npcs || []).find((n) => n.id === token.npcId) : null;
  const podeVerFicha = !!ficha && (gm || ficha.visivelJogador || (minhas || []).includes(ficha.id));
  const efetivo = useMemo(() => (podeVerFicha ? comGrausEfetivos(ficha).character : null), [podeVerFicha, ficha]);
  const nome = ficha?.name || npc?.nome || token.nome || "Token";
  const img = ficha?.imageUrl ? resolverImagem(ficha.imageUrl) : npc?.img ? resolverImagem(npc.img) : token.url;
  const recurso = (rotulo, r, cor) => (r ? (
    <div style={{ flex: 1, padding: "6px 8px", borderRadius: 8, background: PANEL_2, textAlign: "center" }}>
      <div style={{ fontSize: 10, color: MUTED, fontFamily: "'IBM Plex Mono', monospace" }}>{rotulo}</div>
      <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, color: cor, fontSize: 16 }}>{r.current ?? "?"}/{r.max ?? "?"}</div>
    </div>
  ) : null);
  const grade = (lista, valores) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "3px 10px", fontSize: 12 }}>
      {lista.map((a) => (
        <div key={a.key} style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px dotted ${LINE}` }}>
          <span style={{ color: MUTED }}>{a.label}</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: PARCHMENT, fontWeight: 700 }}>{grauNumero(valores?.[a.key])}</span>
        </div>
      ))}
    </div>
  );
  return (
    <div role="dialog" aria-label={`Ficha de ${nome}`} onPointerDown={(e) => e.stopPropagation()} onClick={onFechar}
      style={{ position: "absolute", inset: 0, background: "#00000040", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(520px, 92%)", maxHeight: "88%", overflowY: "auto", background: PANEL, borderRadius: 12, border: `1px solid ${LINE}`, boxShadow: "0 12px 40px #00000055", padding: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Avatar autor={{ nome, img, tipo: npc ? "npc" : "ficha" }} tamanho={64} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 19, fontWeight: 700, color: PARCHMENT }}>{nome}</div>
            <div style={{ fontSize: 12, color: MUTED, fontStyle: "italic" }}>
              {podeVerFicha ? [ficha.epithet, ficha.race || ficha.raca, ficha.faction].filter((x) => x && x !== "—").join(" · ")
                : npc ? [npc.papel, npc.local].filter(Boolean).join(" · ") : token.dono ? `Avatar de ${token.dono}` : ""}
            </div>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" style={{ border: "none", background: "transparent", cursor: "pointer", color: MUTED }}><XIcon size={20} /></button>
        </div>
        {podeVerFicha && (
          <>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              {recurso("HP", ficha.hp, EMBER)}{recurso("MP", ficha.mp, "#4A6B96")}{recurso("SP", ficha.sp, "#2F8577")}
            </div>
            <div style={{ fontSize: 10.5, color: PURPLE, fontWeight: 700, margin: "12px 0 4px", letterSpacing: 0.6 }}>ATRIBUTOS</div>
            {grade(ATRIBUTOS_GERAIS_LIST, efetivo?.atributosGerais)}
            <div style={{ fontSize: 10.5, color: PURPLE, fontWeight: 700, margin: "12px 0 4px", letterSpacing: 0.6 }}>PROFICIÊNCIAS DE COMBATE</div>
            {grade(PROFICIENCIAS_LIST.filter((p) => p.categoria === "combate"), efetivo?.proficiencias)}
            {onAbrirFicha && (
              <button type="button" onClick={() => onAbrirFicha(ficha.id)}
                style={{ marginTop: 14, width: "100%", padding: "8px 12px", borderRadius: 8, border: "none", background: PURPLE, color: PANEL, cursor: "pointer", fontFamily: "'Cinzel', serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <ExternalLink size={15} /> Abrir ficha completa
              </button>
            )}
          </>
        )}
        {npc && !ficha && npc.texto && <p style={{ fontSize: 13, color: PARCHMENT, lineHeight: 1.5, marginTop: 12 }}>{npc.texto}</p>}
        {ficha && !podeVerFicha && <p style={{ fontSize: 12, color: MUTED, fontStyle: "italic", marginTop: 12 }}>Ficha guardada pelo Mestre.</p>}
      </div>
    </div>
  );
}

// Planos (09/11): abas acima do tabuleiro. O Mestre troca de plano, cria,
// renomeia, apaga e diz onde cada jogador está; o jogador só vê o nome do
// plano em que está (quando há mais de um).
function BarraDePlanos({ gm, cenas, cenaAtual, cenaJogadores, objetos, jogadores, aoVer, aoNova, aoRenomear, aoExcluir, aoMoverJogador, aoLevarTodos }) {
  const [aberto, setAberto] = useState(false);
  const atual = cenas.find((c) => c.id === cenaAtual) || cenas[0];
  if (!gm) {
    if (cenas.length < 2) return null;
    return (
      <div aria-label="Plano atual" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: MUTED, padding: "0 4px" }}>
        <Layers size={13} /> Plano: <strong style={{ color: PARCHMENT }}>{atual?.nome}</strong>
      </div>
    );
  }
  const aqui = jogadoresNaCena(objetos, cenaAtual);
  const aba = (ativa) => ({
    display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, whiteSpace: "nowrap",
    border: `1px solid ${ativa ? PURPLE : LINE}`, background: ativa ? PURPLE : PANEL, color: ativa ? PANEL : PARCHMENT,
    fontFamily: "'Spectral', serif", fontSize: 12.5, cursor: "pointer",
  });
  const mini = { border: `1px solid ${LINE}`, background: PANEL, color: PARCHMENT, borderRadius: 8, padding: "5px 8px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12 };
  return (
    <div style={{ position: "relative" }}>
      <div role="tablist" aria-label="Planos da mesa" style={{ display: "flex", alignItems: "center", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
        {cenas.map((c) => {
          const n = jogadoresNaCena(objetos, c.id).length;
          return (
            <button key={c.id} type="button" role="tab" aria-selected={c.id === cenaAtual} onClick={() => aoVer(c.id)} onDoubleClick={() => aoRenomear(c)}
              title={`${c.nome}${c.id === cenaJogadores ? " — plano dos jogadores" : ""} (duplo clique renomeia)`} style={aba(c.id === cenaAtual)}>
              {c.id === cenaJogadores && <Flag size={12} aria-label="plano dos jogadores" />}
              {c.nome}
              {n > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 11, opacity: 0.85 }}><Users size={11} />{n}</span>}
            </button>
          );
        })}
        <button type="button" onClick={aoNova} title="Novo plano" aria-label="Novo plano" style={mini}><Plus size={14} /></button>
        <span style={{ flex: 1 }} />
        <button type="button" onClick={() => setAberto((v) => !v)} aria-expanded={aberto} title="Onde estão os jogadores" style={mini}>
          <Users size={14} /> Neste plano: {aqui.length}
        </button>
        <button type="button" onClick={() => aoRenomear(atual)} title="Renomear este plano" aria-label="Renomear este plano" style={mini}><PencilLine size={14} /></button>
        {!atual?.principal && (
          <button type="button" onClick={() => aoExcluir(atual)} title="Apagar este plano" aria-label="Apagar este plano" style={{ ...mini, color: EMBER }}><Trash2 size={14} /></button>
        )}
      </div>
      {aberto && (
        <div role="dialog" aria-label="Jogadores por plano" style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, zIndex: 20, width: 300, maxWidth: "calc(100vw - 32px)", background: PANEL, border: `1px solid ${LINE}`, borderRadius: 10, boxShadow: "0 8px 24px #2B211633", padding: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <strong style={{ fontFamily: "'Cinzel', serif", fontSize: 13 }}>Jogadores por plano</strong>
            <button type="button" onClick={() => setAberto(false)} aria-label="Fechar" style={{ border: "none", background: "transparent", cursor: "pointer", color: MUTED }}><XIcon size={14} /></button>
          </div>
          <button type="button" onClick={() => aoLevarTodos(cenaAtual)} style={{ ...mini, width: "100%", justifyContent: "center", background: PURPLE, color: PANEL, border: "none", marginBottom: 8 }}>
            <Flag size={13} /> Levar todos para “{atual?.nome}”
          </button>
          {jogadores.length === 0 && <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>Nenhum jogador entrou na mesa ainda.</p>}
          {jogadores.map((j) => (
            <label key={j.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 12.5, padding: "3px 0" }}>
              <span>{j.nome}</span>
              <select aria-label={`Plano de ${j.nome}`} value={cenaDoJogador(objetos, j.nome)} onChange={(e) => aoMoverJogador(j, e.target.value)}
                style={{ border: `1px solid ${LINE}`, borderRadius: 6, background: "#FFF8E8", fontSize: 12, padding: "2px 4px", maxWidth: 160 }}>
                {cenas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MesaView({ gm, personagens, npcs, resolverImagem, supabase, onAbrirFicha }) {
  const conexao = useMemo(() => criarConexaoMesa(supabase), [supabase]);
  const [mensagens, setMensagens] = useState([]);
  const [objetos, setObjetos] = useState([]);
  const [status, setStatus] = useState(conexao.modo === "local" ? "LOCAL" : "CONECTANDO");
  const [erro, setErro] = useState(null);
  const [carregado, setCarregado] = useState(false);

  // ---- carga + tempo real
  useEffect(() => {
    let vivo = true;
    async function recarregar() {
      try {
        const s = await conexao.carregar();
        if (!vivo) return;
        setCarregado(true);
        setMensagens((atual) => s.mensagens.reduce(juntarMensagem, atual.filter((m) => s.mensagens.some((x) => x.id === m.id) || m._pendente)));
        setObjetos(s.objetos);
      } catch (e) {
        if (vivo) setErro("Não deu pra carregar a mesa. Confira a conexão.");
      }
    }
    recarregar();
    const parar = conexao.assinar({
      aoMensagem: (msg) => setMensagens((l) => juntarMensagem(l, msg)),
      aoApagarMensagem: (id) => setMensagens((l) => l.filter((m) => m.id !== id)),
      aoObjeto: (obj) => setObjetos((l) => juntarObjeto(l, obj)),
      aoApagarObjeto: (id) => setObjetos((l) => tirarObjeto(l, id)),
      aoStatus: (s) => setStatus(s),
      aoReconectar: () => recarregar(),
    });
    return () => { vivo = false; parar(); };
  }, [conexao]);

  async function tentar(promessa) {
    try { await promessa; setErro(null); } catch (e) { setErro("Falhou ao enviar pra mesa — tente de novo."); }
  }

  // ---- quem é você (jogador, sem login — 07/11)
  const [eu, setEu] = useState(() => { try { return localStorage.getItem(CHAVE_JOGADOR) || ""; } catch (e) { return ""; } });
  const [nomeDigitado, setNomeDigitado] = useState("");
  const jogadores = jogadoresDaMesa(objetos);
  // Se o Mestre excluiu este jogador (aba Jogadores), o nome salvo aqui
  // deixa de valer e a Mesa pergunta de novo quem é.
  const euValido = !!eu && (!carregado || jogadores.some((j) => j.id === idDoJogador(eu)));
  const minhas = gm || !euValido ? [] : fichasDoJogador(objetos, eu);
  function entrarComo(nome) {
    const limpo = String(nome || "").trim().slice(0, 40);
    const id = idDoJogador(limpo);
    if (!id) return;
    setEu(limpo);
    try { localStorage.setItem(CHAVE_JOGADOR, limpo); } catch (e) { /* ignora */ }
    if (!objetos.some((o) => o.id === id)) salvar({ id, tipo: "jogador", ordem: -5000, nome: limpo, fichas: [] });
  }

  // ---- planos (09/11): abas da Mesa. O Mestre olha qualquer plano; cada
  // jogador vê só o plano em que o Mestre o colocou.
  const cenas = cenasDaMesa(objetos);
  const [cenaVista, setCenaVista] = useState(() => { try { return localStorage.getItem(CHAVE_CENA) || CENA_PRINCIPAL; } catch (e) { return CENA_PRINCIPAL; } });
  const cenaAtual = gm
    ? (cenas.some((c) => c.id === cenaVista) ? cenaVista : CENA_PRINCIPAL)
    : cenaDoJogador(objetos, euValido ? eu : "");
  const objetosCena = useMemo(() => objetosDaCena(objetos, cenaAtual), [objetos, cenaAtual]);
  function verCena(id) {
    setCenaVista(id);
    try { localStorage.setItem(CHAVE_CENA, id); } catch (e) { /* ignora */ }
  }
  function novaCena() {
    const nome = (window.prompt("Nome do novo plano:", `Plano ${cenas.length + 1}`) || "").trim().slice(0, 40);
    if (!nome) return;
    const chave = novoId("c");
    salvar({ id: idDaCena(chave), tipo: "cena", nome, ordem: Math.max(0, ...cenas.map((c) => c.ordem ?? 0)) + 1 });
    verCena(chave);
  }
  function renomearCena(c) {
    const nome = (window.prompt("Novo nome do plano:", c.nome) || "").trim().slice(0, 40);
    if (!nome || nome === c.nome) return;
    const salvo = objetos.find((o) => o.id === idDaCena(c.id));
    salvar({ ...(salvo || { id: idDaCena(c.id), tipo: "cena", ordem: c.principal ? -1 : c.ordem }), nome });
  }
  function excluirCena(c) {
    if (c.principal) return;
    if (!window.confirm(`Apagar o plano "${c.nome}" com tudo o que está nele (mapa, tokens, desenhos, névoa)? Quem estiver lá volta pro principal.`)) return;
    const r = apagarCena(objetos, c.id);
    r.salvar.forEach(salvar);
    r.apagar.forEach(apagar);
    verCena(CENA_PRINCIPAL);
  }
  function moverJogador(j, cena) { salvar(moverJogadorDeCena(objetos, j, cena)); }
  function levarTodos(cena) { levarTodosParaCena(objetos, cena).forEach(salvar); }
  const cenaJogadores = cenaDoJogador(objetos.filter((o) => o.tipo !== "jogador"), "");

  // ---- identidades ("falar como")
  const identidades = useMemo(
    () => identidadesDaMesa({ personagens, npcs, gm, resolverImagem, minhas, eu: euValido ? eu : "" }),
    [personagens, npcs, gm, resolverImagem, minhas.join(","), euValido, eu], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const [autorId, setAutorId] = useState(() => { try { return localStorage.getItem(CHAVE_AUTOR) || ""; } catch (e) { return ""; } });
  // Jogador nunca cai em "Mestre" (08/11): sem identidade nenhuma, fala
  // como "Jogador".
  const autor = identidades.find((i) => i.id === autorId) || identidades[0]
    || (gm ? AUTOR_MESTRE : { id: "jogador", nome: "Jogador", img: null, tipo: "jogador" });
  function escolherAutor(id) {
    setAutorId(id);
    try { localStorage.setItem(CHAVE_AUTOR, id); } catch (e) { /* ignora */ }
  }

  // ---- chat
  const [texto, setTexto] = useState("");
  const [qtdDados, setQtdDados] = useState(3);
  const [alvo, setAlvo] = useState(ALVO_PADRAO);
  const listaRef = useRef(null);
  useEffect(() => {
    const el = listaRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mensagens.length]);

  // Sussurro (08/11): "Para:" (Todos, Mestre/"Só eu", cada jogador) ou o
  // comando "/w Nome mensagem". Jogador sem nome válido não sussurra.
  const [paraId, setParaId] = useState("");
  const destinos = destinosDeSussurro(jogadores, { gm, eu: euValido ? eu : "" });
  const paraAtual = destinos.some((d) => d.id === paraId) ? paraId : "";
  const opcoesMsg = (para) => ({ gm, para: para || null, jogador: gm ? null : (euValido ? eu : null) });
  function publicar(msg) {
    if (!msg) return;
    setMensagens((l) => juntarMensagem(l, msg));
    tentar(conexao.enviarMensagem(msg));
  }
  function enviarTexto() {
    let t = texto.trim();
    if (!t) return;
    let para = paraAtual;
    if (/^\/(?:w|s|sussurro)\s/i.test(t)) {
      const sus = parseSussurro(t, jogadores);
      if (!sus || !sus.texto) { setErro("Sussurro: use /w Nome mensagem (nome de um jogador da lista, ou mestre)."); return; }
      if (!gm && sus.para !== "mestre" && !euValido) return;
      para = sus.para;
      t = sus.texto;
    }
    const cmd = parseComandoRolagem(t);
    if (cmd) publicar(mensagemDeRolagem(autor, rolarDados(cmd.dados, cmd.alvo), { rotulo: cmd.rotulo, ...opcoesMsg(para) }));
    else publicar(mensagemDeFala(autor, t, opcoesMsg(para)));
    setTexto("");
  }
  // Rolar da ficha (08/11): quando quem fala é uma ficha, escolhe Atributo
  // + Proficiência dela (com os bônus) e rola no chat com o rótulo.
  const fichaQueFala = autor?.tipo === "ficha" ? (personagens || []).find((p) => `ficha:${p.id}` === autor.id) : null;
  const fichaEfetiva = useMemo(() => (fichaQueFala ? comGrausEfetivos(fichaQueFala).character : null), [fichaQueFala]);
  // Lembrar por ficha (09/11): cada ficha volta com a última combinação.
  const [escolhasFicha, setEscolhasFicha] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CHAVE_ROLAGEM_FICHA) || "{}") || {}; } catch (e) { return {}; }
  });
  const escolhaAtual = escolhaDaFicha(escolhasFicha, fichaQueFala?.id, {
    atributos: ATRIBUTOS_GERAIS_LIST.map((a) => a.key),
    proficiencias: PROFICIENCIAS_LIST.map((p) => p.key),
  });
  const atribFicha = escolhaAtual.atributo;
  const profFicha = escolhaAtual.proficiencia;
  const extraFicha = escolhaAtual.extra;
  function mudarEscolhaFicha(parcial) {
    if (!fichaQueFala) return;
    setEscolhasFicha((m) => {
      const novo = guardarEscolhaDaFicha(m, fichaQueFala.id, { ...escolhaDaFicha(m, fichaQueFala.id), ...parcial });
      try { localStorage.setItem(CHAVE_ROLAGEM_FICHA, JSON.stringify(novo)); } catch (e) { /* ignora */ }
      return novo;
    });
  }
  const setAtribFicha = (v) => mudarEscolhaFicha({ atributo: v });
  const setProfFicha = (v) => mudarEscolhaFicha({ proficiencia: v });
  const setExtraFicha = (v) => mudarEscolhaFicha({ extra: v });
  const contaFicha = fichaEfetiva ? dadosDaFicha(fichaEfetiva, atribFicha, profFicha, extraFicha) : null;
  function rolarDaFicha() {
    if (!contaFicha) return;
    const rotulo = `${ATRIBUTOS_GERAIS_LIST.find((a) => a.key === atribFicha)?.label} + ${PROFICIENCIAS_LIST.find((p) => p.key === profFicha)?.label}${extraFicha ? ` + ${extraFicha} extra` : ""}`;
    publicar(mensagemDeRolagem(autor, rolarDados(contaFicha.total, alvo), { rotulo, ...opcoesMsg(paraAtual) }));
  }
  function rolar() {
    publicar(mensagemDeRolagem(autor, rolarDados(qtdDados, alvo), opcoesMsg(paraAtual)));
  }
  function responderA(m) {
    if (gm) setParaId(m.autor?.jogador ? idDoJogador(m.autor.jogador) : "");
    else setParaId(m.autor?.jogador && idDoJogador(m.autor.jogador) !== idDoJogador(eu) ? idDoJogador(m.autor.jogador) : "mestre");
  }
  const mensagensVisiveis = mensagens.filter((m) => mensagemVisivel(m, { gm, eu: euValido ? eu : "" }));

  // ---- tabuleiro: câmera
  const areaRef = useRef(null);
  const [tamanho, setTamanho] = useState({ w: 0, h: 0 });
  const [cam, setCam] = useState({ x: 0, y: 0, zoom: 0.5 });
  useEffect(() => {
    const el = areaRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(([e]) => setTamanho({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  function paraMundo(ev) {
    const r = areaRef.current.getBoundingClientRect();
    return [cam.x + (ev.clientX - r.left) / cam.zoom, cam.y + (ev.clientY - r.top) / cam.zoom];
  }
  function zoomEm(fator, centro) {
    setCam((c) => {
      const zoom = Math.min(3, Math.max(0.15, c.zoom * fator));
      const [cx, cy] = centro || [c.x + tamanho.w / 2 / c.zoom, c.y + tamanho.h / 2 / c.zoom];
      return { zoom, x: cx - (cx - c.x) * (c.zoom / zoom), y: cy - (cy - c.y) * (c.zoom / zoom) };
    });
  }
  function enquadrar() {
    const zoom = Math.min(tamanho.w / MESA_LARGURA, tamanho.h / MESA_ALTURA);
    setCam({ zoom, x: -(tamanho.w / zoom - MESA_LARGURA) / 2, y: -(tamanho.h / zoom - MESA_ALTURA) / 2 });
  }
  const enquadrouRef = useRef(false);
  useEffect(() => {
    if (!enquadrouRef.current && tamanho.w > 100) { enquadrouRef.current = true; enquadrar(); }
  }, [tamanho.w]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return undefined;
    function roda(ev) {
      ev.preventDefault();
      const r = el.getBoundingClientRect();
      setCam((c) => {
        const zoom = Math.min(3, Math.max(0.15, c.zoom * (ev.deltaY < 0 ? 1.12 : 1 / 1.12)));
        const cx = c.x + (ev.clientX - r.left) / c.zoom;
        const cy = c.y + (ev.clientY - r.top) / c.zoom;
        return { zoom, x: cx - (ev.clientX - r.left) / zoom, y: cy - (ev.clientY - r.top) / zoom };
      });
    }
    el.addEventListener("wheel", roda, { passive: false });
    return () => el.removeEventListener("wheel", roda);
  }, []);

  // ---- tabuleiro: ferramentas
  const config = configDaMesa(objetosCena);
  const [ferramenta, setFerramenta] = useState("mover");
  const [cor, setCor] = useState(CORES_DESENHO[1]);
  const [largura, setLargura] = useState(5);
  const [selecionadoId, setSelecionadoId] = useState(null);
  const [tracoAtual, setTracoAtual] = useState(null);
  // Névoa (07/11): retângulo sendo arrastado com a ferramenta "nevoa"
  // (cobrir) ou "revelar" (abrir buraco) — só o Mestre.
  const [retanguloAtual, setRetanguloAtual] = useState(null);
  // 07/11: forma da névoa (retângulo, círculo ou polígono clicado ponto a
  // ponto), ímã na grade e o polígono em construção.
  const [formaNevoa, setFormaNevoa] = useState("retangulo");
  const [imaNevoa, setImaNevoa] = useState(true);
  const [poligonoAtual, setPoligonoAtual] = useState(null); // { modo, pontos }
  const [cursorMundo, setCursorMundo] = useState(null);
  // 07/11: borracha por área — retângulo arrastado com a borracha.
  const [areaApagar, setAreaApagar] = useState(null); // { inicio, fim }
  const gestoRef = useRef(null);
  const imagens = objetosCena.filter((o) => o.tipo === "imagem");
  // Camadas (07/11): Mapa, Jogadores ("token") e Mestre ("gm", só o Mestre
  // vê). O Mestre mexe só nas imagens da camada ativa, como no Roll20 —
  // assim não arrasta o mapa sem querer ao mover um token.
  const [camadaAtiva, setCamadaAtiva] = useState("token");
  const mapas = imagensDaCamada(objetosCena, "mapa", gm);
  const tokens = imagensDaCamada(objetosCena, "token", gm);
  const imagensMestre = imagensDaCamada(objetosCena, "gm", gm);
  const tracos = objetosCena.filter((o) => o.tipo === "traco");
  const nevoas = camadasDeNevoa(objetosCena);
  const selecionado = imagens.find((o) => o.id === selecionadoId) || null;
  const proximaOrdem = () => (objetos.reduce((m, o) => Math.max(m, o.ordem ?? 0), 0) + 1);
  const podeMexer = (o) => podeMoverImagem(o, { gm, camadaAtiva, eu, minhas });
  // Tokens de personagem (07/11): painel pra colocar, pop-up no duplo
  // clique, painel do Mestre pra atribuir fichas aos jogadores.
  const [painel, setPainel] = useState(null); // null | "token" | "jogadores"
  const [buscaToken, setBuscaToken] = useState("");
  const [tokenAberto, setTokenAberto] = useState(null);
  function centroDaTela() {
    return [cam.x + tamanho.w / 2 / cam.zoom, cam.y + tamanho.h / 2 / cam.zoom];
  }
  function colocarToken({ ficha, npc, avatarUrl }) {
    const t = config.tamanhoGrade;
    const [cx, cy] = centroDaTela();
    const camada = gm && camadaAtiva !== "mapa" ? camadaAtiva : "token";
    const obj = tokenDePersonagem({
      id: novoId("i"), ficha, npc, avatarUrl, dono: gm ? null : eu, tamanho: t, camada, ordem: proximaOrdem(),
      x: encaixarNaGrade(cx - t / 2, t), y: encaixarNaGrade(cy - t / 2, t), resolverImagem,
    });
    salvar(obj);
    if (gm) setCamadaAtiva(camada);
    setFerramenta("mover");
    setPainel(null);
    setTimeout(() => setSelecionadoId(obj.id), 0);
  }
  function atribuirFicha(jogador, fichaId, ligar) {
    const fichas = new Set(jogador.fichas || []);
    if (ligar) fichas.add(fichaId); else fichas.delete(fichaId);
    salvar({ ...jogador, fichas: [...fichas] });
  }
  useEffect(() => { setSelecionadoId(null); }, [camadaAtiva, cenaAtual]);

  function salvar(objCru) {
    const obj = comCena(objCru, cenaAtual);
    setObjetos((l) => juntarObjeto(l, obj));
    tentar(conexao.salvarObjeto(obj));
  }
  function apagar(id) {
    setObjetos((l) => tirarObjeto(l, id));
    if (selecionadoId === id) setSelecionadoId(null);
    tentar(conexao.apagarObjeto(id));
  }

  function aoApertar(ev) {
    if (ev.button === 1 || ferramenta === "mao") {
      gestoRef.current = { tipo: "pan", inicio: [ev.clientX, ev.clientY], cam };
      ev.currentTarget.setPointerCapture(ev.pointerId);
      return;
    }
    if (gm && (ferramenta === "nevoa" || ferramenta === "revelar")) {
      if (ev.button !== 0) return;
      const p = pontoDaNevoa(ev);
      if (formaNevoa === "poligono") {
        // Clique a clique: cada clique é um vértice; clicar no primeiro
        // ponto (ou duplo clique / Enter) fecha a forma.
        const atual = poligonoAtual && poligonoAtual.modo === ferramenta ? poligonoAtual : { modo: ferramenta, pontos: [] };
        if (atual.pontos.length >= 3 && pontosPerto(p, atual.pontos[0], 14 / cam.zoom)) { concluirPoligono(atual); return; }
        setPoligonoAtual({ ...atual, pontos: [...atual.pontos, p] });
        return;
      }
      ev.currentTarget.setPointerCapture(ev.pointerId);
      setRetanguloAtual({ inicio: p, fim: p, modo: ferramenta, forma: formaNevoa });
      gestoRef.current = { tipo: "retangulo" };
      return;
    }
    if (ferramenta === "borracha") {
      // Clique num traço apaga só ele (ver aoClicarTraco); arrastar no
      // fundo marca uma área e apaga todos os traços que ela toca.
      if (ev.button !== 0) return;
      ev.currentTarget.setPointerCapture(ev.pointerId);
      const p = paraMundo(ev);
      setAreaApagar({ inicio: p, fim: p });
      gestoRef.current = { tipo: "apagarArea" };
      return;
    }
    if (ferramenta === "lapis") {
      ev.currentTarget.setPointerCapture(ev.pointerId);
      setTracoAtual([paraMundo(ev)]);
      gestoRef.current = { tipo: "desenho" };
      return;
    }
    if (ferramenta === "mover") {
      setSelecionadoId(null);
      gestoRef.current = { tipo: "pan", inicio: [ev.clientX, ev.clientY], cam };
      ev.currentTarget.setPointerCapture(ev.pointerId);
    }
  }
  // Duplo clique num token abre o pop-up. Detectado aqui (dois toques no
  // mesmo token em 350 ms) porque, num token que pode ser arrastado, o
  // primeiro toque captura o ponteiro e o navegador não entrega o
  // "dblclick" ao token.
  const ultimoToqueRef = useRef(null);
  function aoApertarImagem(ev, o) {
    if (ferramenta !== "mover" || ev.button !== 0) return;
    ev.stopPropagation();
    if (o.redondo) {
      const agora = Date.now();
      const ultimo = ultimoToqueRef.current;
      ultimoToqueRef.current = { id: o.id, t: agora };
      if (ultimo && ultimo.id === o.id && agora - ultimo.t < 350) {
        ultimoToqueRef.current = null;
        gestoRef.current = null;
        setTokenAberto(o);
        return;
      }
    }
    if (!podeMexer(o)) return;
    setSelecionadoId(o.id);
    const [x, y] = paraMundo(ev);
    gestoRef.current = { tipo: "arrastar", id: o.id, dx: x - o.x, dy: y - o.y, original: o };
    areaRef.current.setPointerCapture?.(ev.pointerId);
  }
  function aoApertarAlca(ev, o) {
    ev.stopPropagation();
    gestoRef.current = { tipo: "redimensionar", id: o.id, original: o, proporcao: o.h / o.w };
    areaRef.current.setPointerCapture?.(ev.pointerId);
  }
  function aoMover(ev) {
    const g = gestoRef.current;
    if (poligonoAtual) setCursorMundo(pontoDaNevoa(ev));
    if (!g) return;
    if (g.tipo === "pan") {
      const [x0, y0] = g.inicio;
      setCam({ ...g.cam, x: g.cam.x - (ev.clientX - x0) / g.cam.zoom, y: g.cam.y - (ev.clientY - y0) / g.cam.zoom });
    } else if (g.tipo === "desenho") {
      const p = paraMundo(ev);
      setTracoAtual((t) => (t ? [...t, p] : [p]));
    } else if (g.tipo === "apagarArea") {
      const p = paraMundo(ev);
      setAreaApagar((a) => (a ? { ...a, fim: p } : a));
    } else if (g.tipo === "retangulo") {
      const p = pontoDaNevoa(ev);
      setRetanguloAtual((r) => (r ? { ...r, fim: p } : r));
    } else if (g.tipo === "arrastar") {
      const [x, y] = paraMundo(ev);
      setObjetos((l) => l.map((o) => (o.id === g.id ? { ...o, x: x - g.dx, y: y - g.dy } : o)));
    } else if (g.tipo === "redimensionar") {
      const [x] = paraMundo(ev);
      const w = Math.max(20, x - g.original.x);
      setObjetos((l) => l.map((o) => (o.id === g.id ? { ...o, w, h: w * g.proporcao } : o)));
    }
  }
  function aoSoltar() {
    const g = gestoRef.current;
    gestoRef.current = null;
    if (!g) return;
    if (g.tipo === "apagarArea") {
      const area = areaApagar ? retanguloDeArraste(areaApagar.inicio, areaApagar.fim, 4 / cam.zoom) : null;
      setAreaApagar(null);
      if (area) tracos.filter((t) => tracoTocaRetangulo(t.pontos, area)).forEach((t) => apagar(t.id));
      return;
    }
    if (g.tipo === "retangulo") {
      const atual = retanguloAtual;
      setRetanguloAtual(null);
      if (!atual) return;
      const tipo = atual.modo === "revelar" ? "revelado" : "nevoa";
      if (atual.forma === "circulo") {
        const c = circuloDeArraste(atual.inicio, atual.fim);
        if (c) salvar({ id: novoId("n"), tipo, forma: "circulo", ordem: proximaOrdem(), ...c });
      } else {
        const r = retanguloDeArraste(atual.inicio, atual.fim);
        if (r) salvar({ id: novoId("n"), tipo, forma: "retangulo", ordem: proximaOrdem(), ...r });
      }
      return;
    }
    if (g.tipo === "desenho" && tracoAtual) {
      const pontos = simplificarPontos(tracoAtual, 1.2 / cam.zoom);
      setTracoAtual(null);
      if (pontos.length) salvar({ id: novoId("t"), tipo: "traco", ordem: proximaOrdem(), pontos, cor, largura });
    } else if (g.tipo === "arrastar" || g.tipo === "redimensionar") {
      const o = objetos.find((x) => x.id === g.id);
      if (!o) return;
      let final = o;
      if (camadaDaImagem(o) !== "mapa" && config.grade && g.tipo === "arrastar") {
        final = { ...o, x: encaixarNaGrade(o.x, config.tamanhoGrade), y: encaixarNaGrade(o.y, config.tamanhoGrade) };
      }
      if (final.x !== g.original.x || final.y !== g.original.y || final.w !== g.original.w) salvar(final);
    }
  }
  function aoClicarTraco(ev, t) {
    if (ferramenta !== "borracha") return;
    ev.stopPropagation();
    apagar(t.id);
  }

  // ---- imagens (Mestre)
  const arquivoRef = useRef(null);
  const camadaNovaRef = useRef("token");
  const [enviando, setEnviando] = useState(false);
  function pedirImagem(camada) {
    camadaNovaRef.current = camada;
    arquivoRef.current?.click();
  }
  async function aoEscolherArquivo(ev) {
    const arquivo = ev.target.files?.[0];
    ev.target.value = "";
    if (!arquivo) return;
    setEnviando(true);
    try {
      const { url, width, height } = await uploadImagemMesa(arquivo);
      const pedido = camadaNovaRef.current;
      if (pedido === "avatar") { colocarToken({ avatarUrl: url }); return; }
      // "mapa" = mapa de fundo inteiro; "mapa-peca" = imagem pequena na
      // camada do mapa (árvore, móvel...); "token"/"gm" = tamanho de token.
      const camada = pedido === "mapa-peca" ? "mapa" : pedido;
      let w;
      let x;
      let y;
      if (pedido === "mapa") {
        w = MESA_LARGURA; x = 0; y = 0;
      } else {
        w = config.tamanhoGrade * 2;
        const cx = cam.x + tamanho.w / 2 / cam.zoom;
        const cy = cam.y + tamanho.h / 2 / cam.zoom;
        x = encaixarNaGrade(cx - w / 2, config.tamanhoGrade);
        y = encaixarNaGrade(cy - w / 2, config.tamanhoGrade);
      }
      const h = w * (height / width || 1);
      const ordem = camada === "mapa" ? -1000 + mapas.length : proximaOrdem();
      const obj = { id: novoId("i"), tipo: "imagem", ordem, url, x, y, w, h, camada };
      salvar(obj);
      setCamadaAtiva(camada);
      setFerramenta("mover");
      setTimeout(() => setSelecionadoId(obj.id), 0);
    } catch (e) {
      setErro(e.message || "Falhou ao enviar a imagem.");
    } finally {
      setEnviando(false);
    }
  }

  function pontoDaNevoa(ev) {
    return encaixarPonto(paraMundo(ev), config.tamanhoGrade, imaNevoa && config.grade);
  }
  function concluirPoligono(atual = poligonoAtual) {
    const pontos = atual ? fecharPoligono(atual.pontos, 2 / cam.zoom) : null;
    setPoligonoAtual(null);
    setCursorMundo(null);
    if (pontos) salvar({ id: novoId("n"), tipo: atual.modo === "revelar" ? "revelado" : "nevoa", forma: "poligono", ordem: proximaOrdem(), pontos });
  }
  function desfazerUltimaNevoa() {
    const ultima = nevoas[nevoas.length - 1];
    if (ultima) apagar(ultima.id);
  }
  // Trocar de ferramenta ou de forma cancela o polígono em construção.
  useEffect(() => { setPoligonoAtual(null); setCursorMundo(null); }, [ferramenta, formaNevoa]);
  // Polígono: Enter fecha, Esc cancela, Backspace tira o último ponto.
  useEffect(() => {
    if (!poligonoAtual) return undefined;
    function tecla(ev) {
      const alvoTag = ev.target?.tagName;
      if (alvoTag === "INPUT" || alvoTag === "TEXTAREA" || alvoTag === "SELECT") return;
      if (ev.key === "Enter") { ev.preventDefault(); concluirPoligono(); }
      else if (ev.key === "Escape") { setPoligonoAtual(null); setCursorMundo(null); }
      else if (ev.key === "Backspace") {
        ev.preventDefault();
        setPoligonoAtual((pa) => (pa && pa.pontos.length > 1 ? { ...pa, pontos: pa.pontos.slice(0, -1) } : null));
      }
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  function cobrirTudo() {
    nevoas.forEach((n) => apagar(n.id));
    salvar({ id: novoId("n"), tipo: "nevoa", forma: "retangulo", ordem: proximaOrdem(), x: 0, y: 0, w: MESA_LARGURA, h: MESA_ALTURA });
  }
  function tirarTodaNevoa() {
    if (nevoas.length && window.confirm("Tirar toda a névoa do tabuleiro? Os jogadores vão ver tudo.")) nevoas.forEach((n) => apagar(n.id));
  }

  function mudarConfig(mudanca) {
    salvar({ id: idDaConfig(cenaAtual), tipo: "config", ordem: -9999, ...config, ...mudanca });
  }

  // Delete/Backspace apaga a imagem selecionada.
  useEffect(() => {
    function tecla(ev) {
      if (!selecionado || !podeMexer(selecionado)) return;
      const alvoTag = ev.target?.tagName;
      if (alvoTag === "INPUT" || alvoTag === "TEXTAREA" || alvoTag === "SELECT") return;
      if (ev.key === "Delete" || ev.key === "Backspace") { ev.preventDefault(); apagar(selecionado.id); }
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const viewBox = `${cam.x} ${cam.y} ${Math.max(1, tamanho.w) / cam.zoom} ${Math.max(1, tamanho.h) / cam.zoom}`;
  const cursor = ferramenta === "lapis" || ferramenta === "nevoa" || ferramenta === "revelar" ? "crosshair" : ferramenta === "mao" ? (gestoRef.current ? "grabbing" : "grab") : ferramenta === "borracha" ? "crosshair" : "default";
  const online = status === "SUBSCRIBED";

  function desenharImagem(o) {
    const sel = o.id === selecionadoId;
    if (o.redondo) {
      const r = Math.min(o.w, o.h) / 2;
      const cx = o.x + o.w / 2;
      const cy = o.y + o.h / 2;
      const mexe = ferramenta === "mover" && podeMexer(o);
      const clipId = `clip-${o.id}`;
      const borda = camadaDaImagem(o) === "gm" ? PURPLE : o.npcId ? BRASS : o.dono ? "#2F8577" : PANEL;
      return (
        <g key={o.id} opacity={camadaDaImagem(o) === "gm" ? 0.85 : 1}
          pointerEvents={ferramenta === "mover" ? "visiblePainted" : "none"}
          style={{ cursor: mexe ? "move" : "pointer" }}
          onPointerDown={(ev) => aoApertarImagem(ev, o)}
        >
          <defs><clipPath id={clipId}><circle cx={cx} cy={cy} r={r} /></clipPath></defs>
          <circle cx={cx} cy={cy} r={r} fill={PANEL_2} />
          {o.url
            ? <image href={o.url} x={cx - r} y={cy - r} width={r * 2} height={r * 2} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clipId})`} />
            : <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={r * 0.8} fontFamily="'Cinzel', serif" fontWeight={700} fill={MUTED}>{iniciais(o.nome)}</text>}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={sel ? PURPLE : borda} strokeWidth={Math.max(3, r * 0.09)} />
          {o.nome && (
            <g pointerEvents="none">
              <rect x={cx - Math.max(r, o.nome.length * r * 0.17)} y={cy + r + 2} width={Math.max(r, o.nome.length * r * 0.17) * 2} height={r * 0.5} rx={r * 0.12} fill="#2B2116CC" />
              <text x={cx} y={cy + r + 2 + r * 0.25} textAnchor="middle" dominantBaseline="central" fontSize={r * 0.3} fontFamily="'Spectral', serif" fill={PANEL}>{o.nome}</text>
            </g>
          )}
          {sel && (
            <rect
              x={o.x + o.w - 7 / cam.zoom} y={o.y + o.h - 7 / cam.zoom} width={14 / cam.zoom} height={14 / cam.zoom}
              fill={PANEL} stroke={PURPLE} strokeWidth={2 / cam.zoom} style={{ cursor: "nwse-resize" }}
              onPointerDown={(ev) => aoApertarAlca(ev, o)}
            />
          )}
        </g>
      );
    }
    return (
      <g key={o.id}>
        <image
          href={o.url} x={o.x} y={o.y} width={o.w} height={o.h} preserveAspectRatio="none"
          opacity={camadaDaImagem(o) === "gm" ? 0.8 : 1}
          pointerEvents={ferramenta === "mover" && podeMexer(o) ? "visiblePainted" : "none"}
          style={{ cursor: ferramenta === "mover" && podeMexer(o) ? "move" : "inherit" }}
          onPointerDown={(ev) => aoApertarImagem(ev, o)}
        />
        {camadaDaImagem(o) === "gm" && !sel && (
          <rect x={o.x} y={o.y} width={o.w} height={o.h} fill="none" stroke={PURPLE} strokeWidth={1.5 / cam.zoom} strokeDasharray={`${3 / cam.zoom} ${3 / cam.zoom}`} pointerEvents="none" />
        )}
        {sel && (
          <>
            <rect x={o.x} y={o.y} width={o.w} height={o.h} fill="none" stroke={PURPLE} strokeWidth={2 / cam.zoom} strokeDasharray={`${6 / cam.zoom} ${4 / cam.zoom}`} pointerEvents="none" />
            <rect
              x={o.x + o.w - 7 / cam.zoom} y={o.y + o.h - 7 / cam.zoom} width={14 / cam.zoom} height={14 / cam.zoom}
              fill={PANEL} stroke={PURPLE} strokeWidth={2 / cam.zoom} style={{ cursor: "nwse-resize" }}
              onPointerDown={(ev) => aoApertarAlca(ev, o)}
            />
          </>
        )}
      </g>
    );
  }

  return (
    <div className="mesa-layout" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 12, height: "calc(100vh - 210px)", minHeight: 560 }}>
      <style>{`
        @keyframes mesaEntrada { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        @media (max-width: 900px) { .mesa-layout { grid-template-columns: 1fr !important; height: auto !important; } .mesa-tabuleiro { height: 62vh; flex: none !important; } .mesa-chat { height: 70vh; } }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, minHeight: 0, minWidth: 0 }}>
      <BarraDePlanos
        gm={gm} cenas={cenas} cenaAtual={cenaAtual} cenaJogadores={cenaJogadores} objetos={objetos} jogadores={jogadores}
        aoVer={verCena} aoNova={novaCena} aoRenomear={renomearCena} aoExcluir={excluirCena}
        aoMoverJogador={moverJogador} aoLevarTodos={levarTodos}
      />
      {/* Tabuleiro */}
      <div
        ref={areaRef} className="mesa-tabuleiro"
        onPointerDown={aoApertar} onPointerMove={aoMover} onPointerUp={aoSoltar} onPointerCancel={aoSoltar}
        onDoubleClick={() => { if (poligonoAtual) concluirPoligono(); }}
        style={{ position: "relative", flex: 1, minHeight: 0, borderRadius: 10, overflow: "hidden", border: `1px solid ${LINE}`, background: "#CDBF9C", cursor, touchAction: "none", userSelect: "none" }}
      >
        <svg width="100%" height="100%" viewBox={viewBox} style={{ display: "block" }}>
          <defs>
            <pattern id="mesa-grade" width={config.tamanhoGrade} height={config.tamanhoGrade} patternUnits="userSpaceOnUse">
              <path d={`M ${config.tamanhoGrade} 0 L 0 0 0 ${config.tamanhoGrade}`} fill="none" stroke="#2B211633" strokeWidth={1.2} />
            </pattern>
          </defs>
          <rect x={0} y={0} width={MESA_LARGURA} height={MESA_ALTURA} fill={MESA_FUNDO} />
          {mapas.map(desenharImagem)}
          {config.grade && <rect x={0} y={0} width={MESA_LARGURA} height={MESA_ALTURA} fill="url(#mesa-grade)" pointerEvents="none" />}
          <rect x={0} y={0} width={MESA_LARGURA} height={MESA_ALTURA} fill="none" stroke="#2B211655" strokeWidth={3} pointerEvents="none" />
          {tracos.map((t) => (
            <path
              key={t.id} d={caminhoDoTraco(t.pontos)} fill="none" stroke={t.cor} strokeWidth={t.largura} strokeLinecap="round" strokeLinejoin="round"
              style={{ cursor: ferramenta === "borracha" ? "pointer" : "inherit" }}
              pointerEvents={ferramenta === "borracha" ? "stroke" : "none"}
              onPointerDown={(ev) => aoClicarTraco(ev, t)}
            />
          ))}
          {areaApagar && (() => {
            const area = retanguloDeArraste(areaApagar.inicio, areaApagar.fim, 0);
            if (!area) return null;
            const alvos = tracos.filter((t) => tracoTocaRetangulo(t.pontos, area));
            return (
              <g pointerEvents="none">
                {alvos.map((t) => (
                  <path key={`x-${t.id}`} d={caminhoDoTraco(t.pontos)} fill="none" stroke={EMBER} strokeOpacity={0.55} strokeWidth={(t.largura || 5) + 6 / cam.zoom} strokeLinecap="round" strokeLinejoin="round" />
                ))}
                <rect x={area.x} y={area.y} width={area.w} height={area.h} fill={`${EMBER}18`} stroke={EMBER} strokeWidth={2 / cam.zoom} strokeDasharray={`${8 / cam.zoom} ${5 / cam.zoom}`} />
              </g>
            );
          })()}
          {tracoAtual && <path d={caminhoDoTraco(tracoAtual)} fill="none" stroke={cor} strokeWidth={largura} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} pointerEvents="none" />}
          {tokens.map(desenharImagem)}
          {/* Névoa: máscara com os retângulos na ordem (cobrir = branco,
              revelar = preto). Jogador: opaca, esconde tudo embaixo; Mestre:
              semitransparente, pra ver o que está coberto. */}
          {nevoas.length > 0 && (
            <>
              <mask id="mesa-nevoa" maskUnits="userSpaceOnUse" x={0} y={0} width={MESA_LARGURA} height={MESA_ALTURA}>
                <rect x={0} y={0} width={MESA_LARGURA} height={MESA_ALTURA} fill="black" />
                {nevoas.map((n) => <FormaNevoa key={n.id} n={n} fill={n.tipo === "revelado" ? "black" : "white"} />)}
              </mask>
              <rect
                x={0} y={0} width={MESA_LARGURA} height={MESA_ALTURA} mask="url(#mesa-nevoa)" pointerEvents="none"
                fill={gm ? "#2B2116" : "#1E1A14"} opacity={gm ? 0.42 : 1} data-nevoa="1"
              />
            </>
          )}
          {retanguloAtual && (() => {
            const revelar = retanguloAtual.modo === "revelar";
            const estilo = {
              pointerEvents: "none", fill: revelar ? "#F3E9D255" : "#2B211655", stroke: revelar ? BRASS : PARCHMENT,
              strokeWidth: 2 / cam.zoom, strokeDasharray: `${8 / cam.zoom} ${5 / cam.zoom}`,
            };
            if (retanguloAtual.forma === "circulo") {
              const c = circuloDeArraste(retanguloAtual.inicio, retanguloAtual.fim, 0);
              return c ? <circle cx={c.cx} cy={c.cy} r={c.r} style={estilo} /> : null;
            }
            const r = retanguloDeArraste(retanguloAtual.inicio, retanguloAtual.fim, 0);
            return r ? <rect x={r.x} y={r.y} width={r.w} height={r.h} style={estilo} /> : null;
          })()}
          {poligonoAtual && poligonoAtual.pontos.length > 0 && (() => {
            const revelar = poligonoAtual.modo === "revelar";
            const corLinha = revelar ? BRASS : PARCHMENT;
            const pts = cursorMundo ? [...poligonoAtual.pontos, cursorMundo] : poligonoAtual.pontos;
            const perto = cursorMundo && poligonoAtual.pontos.length >= 3 && pontosPerto(cursorMundo, poligonoAtual.pontos[0], 14 / cam.zoom);
            return (
              <g pointerEvents="none">
                {pts.length >= 3 && <polygon points={pts.map((p) => p.join(",")).join(" ")} fill={revelar ? "#F3E9D244" : "#2B211644"} stroke="none" />}
                <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={corLinha} strokeWidth={2.5 / cam.zoom} strokeDasharray={`${8 / cam.zoom} ${5 / cam.zoom}`} />
                {poligonoAtual.pontos.map((p, i) => (
                  <circle key={i} cx={p[0]} cy={p[1]} r={(i === 0 ? (perto ? 11 : 8) : 5) / cam.zoom}
                    fill={i === 0 ? (perto ? PURPLE : PANEL) : corLinha} stroke={PURPLE} strokeWidth={2 / cam.zoom} />
                ))}
              </g>
            );
          })()}
          {/* Camada do Mestre: por cima da névoa, só na tela do Mestre. */}
          {imagensMestre.map(desenharImagem)}
        </svg>

        {/* Ferramentas (vertical, à esquerda) */}
        <div style={{ ...barraFlutuante, top: 10, left: 10, flexDirection: "column" }} onPointerDown={(e) => e.stopPropagation()}>
          <BotaoFerramenta titulo="Selecionar e mover (arraste o fundo pra mover a tela)" ativo={ferramenta === "mover"} onClick={() => setFerramenta("mover")}><MousePointer2 size={18} /></BotaoFerramenta>
          <BotaoFerramenta titulo="Mover a tela" ativo={ferramenta === "mao"} onClick={() => setFerramenta("mao")}><Hand size={18} /></BotaoFerramenta>
          <BotaoFerramenta titulo="Desenhar" ativo={ferramenta === "lapis"} onClick={() => setFerramenta("lapis")}><Pencil size={18} /></BotaoFerramenta>
          <BotaoFerramenta titulo="Borracha: clique num traço, ou arraste pra apagar uma área" ativo={ferramenta === "borracha"} onClick={() => setFerramenta("borracha")}><Eraser size={18} /></BotaoFerramenta>
          <div style={{ height: 1, background: LINE, margin: "3px 4px" }} />
          <BotaoFerramenta titulo={gm ? "Colocar token de personagem" : "Colocar meu token (ficha ou avatar)"} ativo={painel === "token"} onClick={() => setPainel(painel === "token" ? null : "token")}><UserPlus size={18} /></BotaoFerramenta>
          {gm && <BotaoFerramenta titulo="Jogadores e fichas atribuídas" ativo={painel === "jogadores"} onClick={() => setPainel(painel === "jogadores" ? null : "jogadores")}><Users size={18} /></BotaoFerramenta>}
          {gm && (
            <>
              <div style={{ height: 1, background: LINE, margin: "3px 4px" }} />
              <BotaoFerramenta titulo={`Adicionar imagem na camada ${CAMADAS_IMAGEM.find((c) => c.id === camadaAtiva)?.nome}`} onClick={() => pedirImagem(camadaAtiva === "mapa" ? "mapa-peca" : camadaAtiva)}><ImagePlus size={18} /></BotaoFerramenta>
              <BotaoFerramenta titulo="Adicionar mapa de fundo" onClick={() => pedirImagem("mapa")}><MapIcon size={18} /></BotaoFerramenta>
              <BotaoFerramenta titulo="Névoa: cobrir uma área" ativo={ferramenta === "nevoa"} onClick={() => setFerramenta("nevoa")}><CloudFog size={18} /></BotaoFerramenta>
              <BotaoFerramenta titulo="Névoa: revelar uma área (o que os personagens veem)" ativo={ferramenta === "revelar"} onClick={() => setFerramenta("revelar")}><Eye size={18} /></BotaoFerramenta>
              <BotaoFerramenta titulo={config.grade ? "Esconder grade" : "Mostrar grade"} ativo={config.grade} onClick={() => mudarConfig({ grade: !config.grade })}><Grid3x3 size={18} /></BotaoFerramenta>
              <BotaoFerramenta
                titulo="Limpar todos os desenhos" perigo
                onClick={() => { if (tracos.length && window.confirm(`Apagar os ${tracos.length} desenhos do tabuleiro pra todos?`)) tracos.forEach((t) => apagar(t.id)); }}
              ><Trash2 size={18} /></BotaoFerramenta>
            </>
          )}
          <input ref={arquivoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={aoEscolherArquivo} />
        </div>

        {/* Paleta do lápis */}
        {ferramenta === "lapis" && (
          <div style={{ ...barraFlutuante, top: 10, left: 62, alignItems: "center", padding: "6px 8px", gap: 6 }} onPointerDown={(e) => e.stopPropagation()}>
            {CORES_DESENHO.map((c) => (
              <button
                key={c} type="button" title="Cor" aria-label={`Cor ${c}`} aria-pressed={c === cor} onClick={() => setCor(c)}
                style={{ width: 22, height: 22, borderRadius: "50%", background: c, cursor: "pointer", border: c === cor ? `3px solid ${PURPLE}` : `1px solid ${LINE}` }}
              />
            ))}
            <div style={{ width: 1, alignSelf: "stretch", background: LINE }} />
            {[3, 5, 10].map((l) => (
              <button key={l} type="button" title={`Espessura ${l}`} aria-pressed={l === largura} onClick={() => setLargura(l)}
                style={{ width: 26, height: 26, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: l === largura ? PANEL_2 : "transparent", border: `1px solid ${l === largura ? LINE : "transparent"}` }}>
                <span style={{ width: l + 2, height: l + 2, borderRadius: "50%", background: cor }} />
              </button>
            ))}
          </div>
        )}

        {/* Ações de névoa (Mestre) */}
        {gm && (ferramenta === "nevoa" || ferramenta === "revelar") && (
          <div style={{ ...barraFlutuante, top: 10, left: 62, alignItems: "center", padding: "4px 6px", gap: 4 }} onPointerDown={(e) => e.stopPropagation()}>
            <BotaoFerramenta titulo="Forma: retângulo (arraste)" ativo={formaNevoa === "retangulo"} onClick={() => setFormaNevoa("retangulo")}><Square size={17} /></BotaoFerramenta>
            <BotaoFerramenta titulo="Forma: círculo (arraste do centro pra fora)" ativo={formaNevoa === "circulo"} onClick={() => setFormaNevoa("circulo")}><Circle size={17} /></BotaoFerramenta>
            <BotaoFerramenta titulo="Forma: polígono (clique ponto a ponto; clique no primeiro ponto, duplo clique ou Enter fecha)" ativo={formaNevoa === "poligono"} onClick={() => setFormaNevoa("poligono")}><Pentagon size={17} /></BotaoFerramenta>
            <BotaoFerramenta titulo={imaNevoa ? "Encaixar na grade: ligado" : "Encaixar na grade: desligado"} ativo={imaNevoa && config.grade} onClick={() => setImaNevoa((v) => !v)}><Magnet size={17} /></BotaoFerramenta>
            <div style={{ width: 1, alignSelf: "stretch", background: LINE, margin: "0 2px" }} />
            <span style={{ fontSize: 11, color: MUTED, padding: "0 6px", maxWidth: 280, lineHeight: 1.3 }}>
              {poligonoAtual
                ? `${poligonoAtual.pontos.length} ponto${poligonoAtual.pontos.length === 1 ? "" : "s"} · clique no 1º ponto, duplo clique ou Enter fecha · Backspace volta · Esc cancela`
                : `${formaNevoa === "poligono" ? "Clique ponto a ponto" : "Arraste"} pra ${ferramenta === "nevoa" ? "cobrir" : "revelar"} · jogadores não veem o que está coberto`}
            </span>
            {poligonoAtual && (
              <>
                <BotaoFerramenta titulo="Fechar a forma (Enter)" onClick={() => concluirPoligono()}><Check size={17} /></BotaoFerramenta>
                <BotaoFerramenta titulo="Cancelar (Esc)" onClick={() => { setPoligonoAtual(null); setCursorMundo(null); }}><XIcon size={17} /></BotaoFerramenta>
              </>
            )}
            <div style={{ width: 1, alignSelf: "stretch", background: LINE, margin: "0 2px" }} />
            <BotaoFerramenta titulo="Desfazer a última névoa" onClick={desfazerUltimaNevoa}><Undo2 size={17} /></BotaoFerramenta>
            <BotaoFerramenta titulo="Cobrir a mesa toda" onClick={cobrirTudo}><Cloud size={17} /></BotaoFerramenta>
            <BotaoFerramenta titulo="Tirar toda a névoa" perigo onClick={tirarTodaNevoa}><CloudOff size={17} /></BotaoFerramenta>
          </div>
        )}

        {/* Camada ativa (Mestre) — como no Roll20: as imagens novas entram
            nela e só as dela podem ser movidas. */}
        {gm && (
          <div style={{ ...barraFlutuante, top: 10, right: 10, alignItems: "center", padding: 4, gap: 2 }} onPointerDown={(e) => e.stopPropagation()} role="group" aria-label="Camada ativa">
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, color: MUTED, padding: "0 6px" }}><Layers size={14} /> Camada</span>
            {CAMADAS_IMAGEM.map((c) => {
              const ativa = camadaAtiva === c.id;
              const Icone = c.id === "mapa" ? MapIcon : c.id === "gm" ? Crown : Users;
              return (
                <button
                  key={c.id} type="button" aria-pressed={ativa} onClick={() => setCamadaAtiva(c.id)}
                  title={c.id === "gm" ? "Camada do Mestre: só você vê" : c.id === "mapa" ? "Camada do mapa (fundo)" : "Camada dos jogadores (todos veem)"}
                  style={{
                    display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 7, cursor: "pointer",
                    border: `1px solid ${ativa ? PURPLE : "transparent"}`, background: ativa ? PURPLE : "transparent",
                    color: ativa ? PANEL : PARCHMENT, fontSize: 12, fontFamily: "'Spectral', serif",
                  }}
                >
                  <Icone size={14} /> {c.nome}
                </button>
              );
            })}
          </div>
        )}

        {/* Imagem selecionada */}
        {selecionado && ferramenta === "mover" && podeMexer(selecionado) && (
          <div style={{ ...barraFlutuante, bottom: 60, left: "50%", transform: "translateX(-50%)", alignItems: "center" }} onPointerDown={(e) => e.stopPropagation()}>
            <BotaoFerramenta titulo="Diminuir" onClick={() => salvar({ ...selecionado, w: Math.max(20, selecionado.w - config.tamanhoGrade), h: Math.max(20, selecionado.w - config.tamanhoGrade) * (selecionado.h / selecionado.w) })}><Minus size={16} /></BotaoFerramenta>
            <BotaoFerramenta titulo="Aumentar" onClick={() => salvar({ ...selecionado, w: selecionado.w + config.tamanhoGrade, h: (selecionado.w + config.tamanhoGrade) * (selecionado.h / selecionado.w) })}><Plus size={16} /></BotaoFerramenta>
            {gm && (
              <>
                <div style={{ width: 1, alignSelf: "stretch", background: LINE, margin: "0 2px" }} />
                <span style={{ fontSize: 10.5, color: MUTED, padding: "0 4px" }}>Mover pra:</span>
                {CAMADAS_IMAGEM.filter((c) => c.id !== camadaDaImagem(selecionado)).map((c) => (
                  <button
                    key={c.id} type="button" title={`Mover pra camada ${c.nome}`}
                    onClick={() => {
                      const id = selecionado.id;
                      salvar({ ...selecionado, camada: c.id, ordem: c.id === "mapa" ? -1000 + mapas.length : proximaOrdem() });
                      setCamadaAtiva(c.id);
                      setTimeout(() => setSelecionadoId(id), 0);
                    }}
                    style={{ padding: "5px 9px", borderRadius: 7, border: `1px solid ${LINE}`, background: "#fff", cursor: "pointer", fontSize: 11.5, color: PARCHMENT, fontFamily: "'Spectral', serif" }}
                  >{c.nome}</button>
                ))}
                <div style={{ width: 1, alignSelf: "stretch", background: LINE, margin: "0 2px" }} />
              </>
            )}
            <BotaoFerramenta titulo="Excluir (Delete)" perigo onClick={() => apagar(selecionado.id)}><Trash2 size={16} /></BotaoFerramenta>
          </div>
        )}

        {/* Zoom e grade */}
        <div style={{ ...barraFlutuante, bottom: 10, right: 10, alignItems: "center" }} onPointerDown={(e) => e.stopPropagation()}>
          {gm && config.grade && (
            <>
              <BotaoFerramenta titulo="Grade menor" onClick={() => mudarConfig({ tamanhoGrade: Math.max(30, config.tamanhoGrade - 10) })}><Minus size={14} /></BotaoFerramenta>
              <span style={{ fontSize: 10.5, color: MUTED, fontFamily: "'IBM Plex Mono', monospace", minWidth: 40, textAlign: "center" }} title="Tamanho do quadrado da grade">▦ {config.tamanhoGrade}</span>
              <BotaoFerramenta titulo="Grade maior" onClick={() => mudarConfig({ tamanhoGrade: Math.min(200, config.tamanhoGrade + 10) })}><Plus size={14} /></BotaoFerramenta>
              <div style={{ width: 1, alignSelf: "stretch", background: LINE, margin: "0 2px" }} />
            </>
          )}
          <BotaoFerramenta titulo="Afastar" onClick={() => zoomEm(1 / 1.2)}><ZoomOut size={16} /></BotaoFerramenta>
          <span style={{ fontSize: 10.5, color: MUTED, fontFamily: "'IBM Plex Mono', monospace", minWidth: 38, textAlign: "center" }}>{Math.round(cam.zoom * 100)}%</span>
          <BotaoFerramenta titulo="Aproximar" onClick={() => zoomEm(1.2)}><ZoomIn size={16} /></BotaoFerramenta>
          <BotaoFerramenta titulo="Ver a mesa inteira" onClick={enquadrar}><Maximize size={16} /></BotaoFerramenta>
        </div>

        {/* Painel: colocar token */}
        {painel === "token" && (
          <div style={{ ...barraFlutuante, top: 10, left: 62, flexDirection: "column", alignItems: "stretch", padding: 10, gap: 6, width: 280, maxHeight: "75%", overflowY: "auto" }} onPointerDown={(e) => e.stopPropagation()}>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 12.5, color: PURPLE, fontWeight: 700 }}>{gm ? "Colocar token de personagem" : "Colocar meu token"}</div>
            {gm ? (
              <>
                <input value={buscaToken} onChange={(e) => setBuscaToken(e.target.value)} placeholder="Buscar ficha ou NPC…" aria-label="Buscar personagem"
                  style={{ padding: "6px 8px", borderRadius: 7, border: `1px solid ${LINE}`, background: "#fff", fontSize: 13 }} />
                {gruposDeIdentidades(identidades.filter((i) => i.tipo !== "mestre" && i.nome.toLowerCase().includes(buscaToken.trim().toLowerCase()))).map((g) => (
                  <div key={g.rotulo}>
                    <div style={{ fontSize: 10, color: MUTED, margin: "4px 0 2px", letterSpacing: 0.5 }}>{g.rotulo.toUpperCase()}</div>
                    {g.itens.map((i) => (
                      <button key={i.id} type="button"
                        onClick={() => colocarToken(i.tipo === "npc" ? { npc: (npcs || []).find((n) => `npc:${n.id}` === i.id) } : { ficha: (personagens || []).find((p) => `ficha:${p.id}` === i.id) })}
                        style={itemLista}><Avatar autor={i} tamanho={24} /> {i.nome}</button>
                    ))}
                  </div>
                ))}
              </>
            ) : (
              <>
                {identidades.filter((i) => i.grupo === "Minhas fichas").length === 0 && (
                  <div style={{ fontSize: 11.5, color: MUTED, fontStyle: "italic" }}>O Mestre ainda não te deu uma ficha. Você pode usar um avatar.</div>
                )}
                {identidades.filter((i) => i.grupo === "Minhas fichas").map((i) => (
                  <button key={i.id} type="button" onClick={() => colocarToken({ ficha: (personagens || []).find((p) => `ficha:${p.id}` === i.id) })} style={itemLista}>
                    <Avatar autor={i} tamanho={24} /> {i.nome}
                  </button>
                ))}
                <button type="button" onClick={() => pedirImagem("avatar")} style={{ ...itemLista, justifyContent: "center", background: PANEL_2 }}>
                  <UserRound size={16} /> Usar uma imagem como avatar
                </button>
              </>
            )}
          </div>
        )}

        {/* Painel do Mestre: jogadores e fichas atribuídas */}
        {gm && painel === "jogadores" && (
          <div style={{ ...barraFlutuante, top: 10, left: 62, flexDirection: "column", alignItems: "stretch", padding: 10, gap: 8, width: 320, maxHeight: "75%", overflowY: "auto" }} onPointerDown={(e) => e.stopPropagation()}>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 12.5, color: PURPLE, fontWeight: 700 }}>Jogadores</div>
            <div style={{ fontSize: 11, color: MUTED }}>Cada jogador entra na Mesa com o nome. Dê a ele as fichas que ele controla: ele pode colocar o token, mover e abrir a ficha.</div>
            {jogadores.length === 0 && <div style={{ fontSize: 11.5, color: MUTED, fontStyle: "italic" }}>Ninguém entrou ainda.</div>}
            {jogadores.map((j) => (
              <div key={j.id} style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: 8, background: "#fff" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <strong style={{ fontSize: 13 }}>{j.nome}</strong>
                  <button type="button" title={`Remover ${j.nome}`} onClick={() => { if (window.confirm(`Remover ${j.nome} da lista de jogadores?`)) apagar(j.id); }}
                    style={{ border: "none", background: "transparent", color: EMBER, cursor: "pointer" }}><Trash2 size={14} /></button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, margin: "6px 0" }}>
                  {(j.fichas || []).map((fid) => {
                    const f = (personagens || []).find((p) => p.id === fid);
                    return (
                      <span key={fid} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 12, background: PANEL_2, fontSize: 11.5 }}>
                        {f?.name || fid}
                        <button type="button" aria-label={`Tirar ${f?.name || fid} de ${j.nome}`} onClick={() => atribuirFicha(j, fid, false)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, color: MUTED }}><XIcon size={12} /></button>
                      </span>
                    );
                  })}
                </div>
                <select value="" aria-label={`Dar ficha a ${j.nome}`} onChange={(e) => { if (e.target.value) atribuirFicha(j, e.target.value, true); }}
                  style={{ width: "100%", padding: "4px 6px", borderRadius: 6, border: `1px solid ${LINE}`, fontSize: 12 }}>
                  <option value="">+ dar uma ficha…</option>
                  {[...(personagens || [])].filter((p) => p?.id && p.name && !(j.fichas || []).includes(p.id)).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            ))}
            <div style={{ display: "flex", gap: 6 }}>
              <input value={nomeDigitado} onChange={(e) => setNomeDigitado(e.target.value)} placeholder="Adicionar jogador pelo nome" aria-label="Novo jogador"
                style={{ flex: 1, padding: "5px 8px", borderRadius: 7, border: `1px solid ${LINE}`, fontSize: 12.5 }} />
              <button type="button" onClick={() => { const id = idDoJogador(nomeDigitado); if (id && !objetos.some((o) => o.id === id)) salvar({ id, tipo: "jogador", ordem: -5000, nome: nomeDigitado.trim(), fichas: [] }); setNomeDigitado(""); }}
                style={{ padding: "5px 10px", borderRadius: 7, border: "none", background: PURPLE, color: PANEL, cursor: "pointer", fontSize: 12 }}>Adicionar</button>
            </div>
          </div>
        )}

        {tokenAberto && (
          <PopupToken
            token={tokenAberto} personagens={personagens} npcs={npcs} gm={gm} minhas={minhas} resolverImagem={resolverImagem}
            onAbrirFicha={onAbrirFicha} onFechar={() => setTokenAberto(null)}
          />
        )}

        {/* Quem é você (jogador, primeira vez) */}
        {!gm && !euValido && (
          <div onPointerDown={(e) => e.stopPropagation()} style={{ position: "absolute", inset: 0, background: "#2B2116AA", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 6 }}>
            <form onSubmit={(e) => { e.preventDefault(); entrarComo(nomeDigitado); }}
              style={{ width: "min(380px, 92%)", background: PANEL, borderRadius: 12, padding: 18, border: `1px solid ${LINE}`, boxShadow: "0 12px 40px #00000066" }}>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: 18, color: PURPLE, fontWeight: 700 }}>Quem é você?</div>
              <p style={{ fontSize: 12.5, color: MUTED, margin: "6px 0 12px" }}>Seu nome de jogador, pra o Mestre te dar suas fichas. Fica salvo neste navegador.</p>
              {jogadores.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                  {jogadores.map((j) => (
                    <button key={j.id} type="button" onClick={() => entrarComo(j.nome)} style={{ padding: "5px 12px", borderRadius: 16, border: `1px solid ${LINE}`, background: "#fff", cursor: "pointer", fontSize: 13 }}>{j.nome}</button>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 6 }}>
                <input autoFocus value={nomeDigitado} onChange={(e) => setNomeDigitado(e.target.value)} placeholder="Seu nome" aria-label="Seu nome"
                  style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: `1px solid ${LINE}`, fontSize: 14 }} />
                <button type="submit" style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: PURPLE, color: PANEL, cursor: "pointer", fontFamily: "'Cinzel', serif" }}>Entrar</button>
              </div>
            </form>
          </div>
        )}

        {/* Status */}
        <div style={{ ...barraFlutuante, bottom: 10, left: 10, alignItems: "center", gap: 6, padding: "4px 10px", fontSize: 11, color: online ? "#2F8577" : MUTED }}>
          {online ? <Wifi size={13} /> : <WifiOff size={13} />}
          {online ? "Ao vivo — todos veem" : status === "LOCAL" ? "Modo local (só este navegador)" : "Conectando…"}
          {enviando && <span style={{ color: BRASS }}>· enviando imagem…</span>}
        </div>
        {erro && (
          <div role="alert" style={{ ...barraFlutuante, bottom: 54, left: 10, padding: "6px 10px", fontSize: 11.5, color: EMBER }}>{erro}</div>
        )}
      </div>
      </div>

      {/* Chat */}
      <div className="mesa-chat" style={{ display: "flex", flexDirection: "column", borderRadius: 10, border: `1px solid ${LINE}`, background: `${PANEL}CC`, overflow: "hidden", minHeight: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderBottom: `1px solid ${LINE}` }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 13, letterSpacing: 1, color: PURPLE, fontWeight: 700 }}>CHAT DA MESA</span>
          {!gm && eu && (
            <button type="button" title="Trocar de jogador" onClick={() => { setEu(""); try { localStorage.removeItem(CHAVE_JOGADOR); } catch (e) { /* ignora */ } }}
              style={{ fontSize: 11, color: MUTED, background: "transparent", border: "none", cursor: "pointer" }}>
              Você: <strong style={{ color: PARCHMENT }}>{eu}</strong> (trocar)
            </button>
          )}
          {gm && mensagens.length > 0 && (
            <button type="button" onClick={() => { if (window.confirm("Apagar todo o chat pra todos?")) { setMensagens([]); tentar(conexao.limparMensagens()); } }}
              style={{ fontSize: 10.5, color: EMBER, background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Cinzel', serif" }}>
              Limpar
            </button>
          )}
        </div>

        <div ref={listaRef} style={{ flex: 1, overflowY: "auto", padding: "4px 0" }} aria-live="polite">
          {mensagensVisiveis.length === 0 ? (
            <div style={{ padding: 20, fontSize: 12, color: MUTED, fontStyle: "italic", textAlign: "center" }}>
              Nada por aqui ainda. Escolha quem fala no pé do chat e mande a primeira mensagem — ou role os dados.
            </div>
          ) : mensagensVisiveis.map((m) => (
            <Mensagem key={m.id} m={m} rotuloPara={m.para ? (m.para === "mestre" && !m.autor?.jogador ? "o Mestre (só ele)" : rotuloDoDestino(m.para, jogadores)) : ""}
              onResponder={m.para ? () => responderA(m) : undefined} />
          ))}
        </div>

        <div style={{ borderTop: `1px solid ${LINE}`, padding: 10, display: "flex", flexDirection: "column", gap: 8, background: PANEL }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: MUTED }}>
            <Avatar autor={autor} tamanho={28} />
            <span style={{ whiteSpace: "nowrap" }}>Falar como</span>
            <select
              value={autor.id} onChange={(e) => escolherAutor(e.target.value)} aria-label="Falar como"
              style={{ flex: 1, minWidth: 0, padding: "5px 6px", borderRadius: 6, border: `1px solid ${LINE}`, background: "#fff", color: PARCHMENT, fontFamily: "'Spectral', serif", fontSize: 13 }}
            >
              {gruposDeIdentidades(identidades).map((g) => (
                <optgroup key={g.rotulo} label={g.rotulo}>
                  {g.itens.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: paraAtual ? PURPLE : MUTED }}>
            <span style={{ width: 28, display: "flex", justifyContent: "center" }}>{paraAtual ? <Lock size={15} /> : <Users size={15} />}</span>
            <span style={{ whiteSpace: "nowrap" }}>Para</span>
            <select
              value={paraAtual} onChange={(e) => setParaId(e.target.value)} aria-label="Para"
              style={{ flex: 1, minWidth: 0, padding: "5px 6px", borderRadius: 6, border: `1px solid ${paraAtual ? PURPLE : LINE}`, background: paraAtual ? `${PURPLE}0D` : "#fff", color: PARCHMENT, fontFamily: "'Spectral', serif", fontSize: 13 }}
            >
              {destinos.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </label>
          <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
            <textarea
              value={texto} onChange={(e) => setTexto(e.target.value)} rows={2} aria-label="Mensagem"
              placeholder={paraAtual
                ? `Sussurrar para ${destinos.find((d) => d.id === paraAtual)?.nome.replace(/ \((sussurro|secreto)\)$/, "")}… (só vocês veem)`
                : `Falar como ${autor.nome}… (Enter envia, /r 5 rola, /w Nome sussurra)`}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarTexto(); } }}
              style={{ flex: 1, resize: "none", padding: "7px 9px", borderRadius: 8, border: `1px solid ${paraAtual ? PURPLE : LINE}`, background: "#fff", color: PARCHMENT, fontFamily: "'Spectral', serif", fontSize: 13.5 }}
            />
            <button type="button" onClick={enviarTexto} title="Enviar" aria-label="Enviar"
              style={{ width: 40, height: 40, borderRadius: 8, border: "none", background: PURPLE, color: PANEL, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Send size={17} />
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: MUTED }}>
            <Dices size={16} color={BRASS} />
            <button type="button" aria-label="Menos dados" onClick={() => setQtdDados((n) => Math.max(1, n - 1))} style={passo}>−</button>
            <span style={{ minWidth: 42, textAlign: "center", fontFamily: "'IBM Plex Mono', monospace", color: PARCHMENT, fontSize: 13 }}>{qtdDados}d10</span>
            <button type="button" aria-label="Mais dados" onClick={() => setQtdDados((n) => Math.min(MAX_DADOS, n + 1))} style={passo}>+</button>
            <select value={alvo} onChange={(e) => setAlvo(Number(e.target.value))} aria-label="Sucesso a partir de" title="Sucesso a partir de"
              style={{ padding: "4px 4px", borderRadius: 6, border: `1px solid ${LINE}`, background: "#fff", fontSize: 12, color: PARCHMENT }}>
              {[6, 7, 8, 9].map((a) => <option key={a} value={a}>{a}+</option>)}
            </select>
            <button type="button" onClick={rolar}
              style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", background: `linear-gradient(180deg, #8B6914, ${BRASS})`, color: "#fff", fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 12.5 }}>
              Rolar
            </button>
          </div>
          {contaFicha && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: MUTED, flexWrap: "wrap", paddingTop: 6, borderTop: `1px dashed ${LINE}` }}>
              <ScrollText size={15} color={PURPLE} />
              <span style={{ whiteSpace: "nowrap" }}>Da ficha</span>
              <select value={atribFicha} onChange={(e) => setAtribFicha(e.target.value)} aria-label="Atributo da ficha" style={seletorFicha}>
                {ATRIBUTOS_GERAIS_LIST.map((a) => <option key={a.key} value={a.key}>{a.label} ({grauNumero(fichaEfetiva.atributosGerais?.[a.key])})</option>)}
              </select>
              <span>+</span>
              <select value={profFicha} onChange={(e) => setProfFicha(e.target.value)} aria-label="Proficiência da ficha" style={seletorFicha}>
                {[["combate", "Combate"], ["fisica", "Física"], ["social", "Social"], ["mental", "Mental"]].map(([cat, nome]) => (
                  <optgroup key={cat} label={nome}>
                    {PROFICIENCIAS_LIST.filter((p) => p.categoria === cat).map((p) => <option key={p.key} value={p.key}>{p.label} ({grauNumero(fichaEfetiva.proficiencias?.[p.key])})</option>)}
                  </optgroup>
                ))}
              </select>
              <span title="Dados extras">+</span>
              <input type="number" min={0} max={10} value={extraFicha} onChange={(e) => setExtraFicha(Math.max(0, Math.min(10, Number(e.target.value) || 0)))} aria-label="Dados extras da ficha"
                style={{ width: 42, padding: "4px 4px", borderRadius: 6, border: `1px solid ${LINE}`, fontSize: 12 }} />
              <button type="button" onClick={rolarDaFicha} title={`Rolar ${contaFicha.total}d10 (${alvo}+)`}
                style={{ marginLeft: "auto", padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: PURPLE, color: PANEL, fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 12 }}>
                Rolar {contaFicha.total}d10
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const passo = {
  width: 24, height: 24, borderRadius: 6, border: `1px solid ${LINE}`, background: "#fff", color: PARCHMENT, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0,
};

const itemLista = {
  display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "5px 6px", borderRadius: 7, border: "1px solid transparent",
  background: "transparent", cursor: "pointer", fontSize: 13, color: PARCHMENT, textAlign: "left", fontFamily: "'Spectral', serif",
};

const seletorFicha = {
  padding: "4px 4px", borderRadius: 6, border: `1px solid ${LINE}`, background: "#fff", fontSize: 12, color: PARCHMENT, maxWidth: 130,
};
