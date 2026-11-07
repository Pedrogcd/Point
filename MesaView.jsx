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
  Trash2, Send, Dices, ArrowUpToLine, ArrowDownToLine, Plus, Minus, Wifi, WifiOff, Crown,
  CloudFog, Cloud, CloudOff, Eye, Square, Circle, Pentagon, Magnet, Undo2, Check, X as XIcon,
} from "lucide-react";
import {
  MESA_LARGURA, MESA_ALTURA, CORES_DESENHO, ALVO_PADRAO, MAX_DADOS, AUTOR_MESTRE,
  novoId, parseComandoRolagem, rolarDados, identidadesDaMesa, mensagemDeFala, mensagemDeRolagem,
  juntarMensagem, juntarObjeto, tirarObjeto, configDaMesa, encaixarNaGrade, simplificarPontos,
  caminhoDoTraco, criarConexaoMesa, gruposDeIdentidades, retanguloDeArraste, camadasDeNevoa,
  formaDaNevoa, encaixarPonto, circuloDeArraste, pontosPerto, fecharPoligono,
} from "./mesa.js";

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

function iniciais(nome) {
  return String(nome || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function Avatar({ autor, tamanho = 34 }) {
  const cor = autor?.tipo === "mestre" ? PURPLE : autor?.tipo === "npc" ? BRASS : LINE;
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

function Mensagem({ m }) {
  return (
    <div style={{ display: "flex", gap: 8, padding: "7px 10px", animation: "mesaEntrada 0.25s ease" }}>
      <Avatar autor={m.autor} />
      <div style={{ minWidth: 0, flex: 1 }}>
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

export default function MesaView({ gm, personagens, npcs, resolverImagem, supabase }) {
  const conexao = useMemo(() => criarConexaoMesa(supabase), [supabase]);
  const [mensagens, setMensagens] = useState([]);
  const [objetos, setObjetos] = useState([]);
  const [status, setStatus] = useState(conexao.modo === "local" ? "LOCAL" : "CONECTANDO");
  const [erro, setErro] = useState(null);

  // ---- carga + tempo real
  useEffect(() => {
    let vivo = true;
    async function recarregar() {
      try {
        const s = await conexao.carregar();
        if (!vivo) return;
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

  // ---- identidades ("falar como")
  const identidades = useMemo(
    () => identidadesDaMesa({ personagens, npcs, gm, resolverImagem }),
    [personagens, npcs, gm, resolverImagem],
  );
  const [autorId, setAutorId] = useState(() => { try { return localStorage.getItem(CHAVE_AUTOR) || ""; } catch (e) { return ""; } });
  const autor = identidades.find((i) => i.id === autorId) || identidades[0] || AUTOR_MESTRE;
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

  function publicar(msg) {
    if (!msg) return;
    setMensagens((l) => juntarMensagem(l, msg));
    tentar(conexao.enviarMensagem(msg));
  }
  function enviarTexto() {
    const t = texto.trim();
    if (!t) return;
    const cmd = parseComandoRolagem(t);
    if (cmd) publicar(mensagemDeRolagem(autor, rolarDados(cmd.dados, cmd.alvo), { rotulo: cmd.rotulo, gm }));
    else publicar(mensagemDeFala(autor, t, { gm }));
    setTexto("");
  }
  function rolar() {
    publicar(mensagemDeRolagem(autor, rolarDados(qtdDados, alvo), { gm }));
  }

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
  const config = configDaMesa(objetos);
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
  const gestoRef = useRef(null);
  const imagens = objetos.filter((o) => o.tipo === "imagem");
  const mapas = imagens.filter((o) => o.camada === "mapa");
  const tokens = imagens.filter((o) => o.camada !== "mapa");
  const tracos = objetos.filter((o) => o.tipo === "traco");
  const nevoas = camadasDeNevoa(objetos);
  const selecionado = imagens.find((o) => o.id === selecionadoId) || null;
  const proximaOrdem = () => (objetos.reduce((m, o) => Math.max(m, o.ordem ?? 0), 0) + 1);
  const podeMexer = (o) => gm || o.camada !== "mapa";

  function salvar(obj) {
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
  function aoApertarImagem(ev, o) {
    if (ferramenta !== "mover" || ev.button !== 0) return;
    ev.stopPropagation();
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
      if (o.camada !== "mapa" && config.grade && g.tipo === "arrastar") {
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
      const camada = camadaNovaRef.current;
      let w;
      let x;
      let y;
      if (camada === "mapa") {
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
      setSelecionadoId(obj.id);
      setFerramenta("mover");
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
    salvar({ id: "config", tipo: "config", ordem: -9999, ...config, ...mudanca });
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
  const cursor = ferramenta === "lapis" || ferramenta === "nevoa" || ferramenta === "revelar" ? "crosshair" : ferramenta === "mao" ? (gestoRef.current ? "grabbing" : "grab") : ferramenta === "borracha" ? "not-allowed" : "default";
  const online = status === "SUBSCRIBED";

  function desenharImagem(o) {
    const sel = o.id === selecionadoId;
    return (
      <g key={o.id}>
        <image
          href={o.url} x={o.x} y={o.y} width={o.w} height={o.h} preserveAspectRatio="none"
          style={{ cursor: ferramenta === "mover" && podeMexer(o) ? "move" : "inherit" }}
          onPointerDown={(ev) => aoApertarImagem(ev, o)}
        />
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
        @media (max-width: 900px) { .mesa-layout { grid-template-columns: 1fr !important; height: auto !important; } .mesa-tabuleiro { height: 62vh; } .mesa-chat { height: 70vh; } }
      `}</style>

      {/* Tabuleiro */}
      <div
        ref={areaRef} className="mesa-tabuleiro"
        onPointerDown={aoApertar} onPointerMove={aoMover} onPointerUp={aoSoltar} onPointerCancel={aoSoltar}
        onDoubleClick={() => { if (poligonoAtual) concluirPoligono(); }}
        style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: `1px solid ${LINE}`, background: "#CDBF9C", cursor, touchAction: "none", userSelect: "none" }}
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
        </svg>

        {/* Ferramentas (vertical, à esquerda) */}
        <div style={{ ...barraFlutuante, top: 10, left: 10, flexDirection: "column" }} onPointerDown={(e) => e.stopPropagation()}>
          <BotaoFerramenta titulo="Selecionar e mover (arraste o fundo pra mover a tela)" ativo={ferramenta === "mover"} onClick={() => setFerramenta("mover")}><MousePointer2 size={18} /></BotaoFerramenta>
          <BotaoFerramenta titulo="Mover a tela" ativo={ferramenta === "mao"} onClick={() => setFerramenta("mao")}><Hand size={18} /></BotaoFerramenta>
          <BotaoFerramenta titulo="Desenhar" ativo={ferramenta === "lapis"} onClick={() => setFerramenta("lapis")}><Pencil size={18} /></BotaoFerramenta>
          <BotaoFerramenta titulo="Apagar um traço (clique nele)" ativo={ferramenta === "borracha"} onClick={() => setFerramenta("borracha")}><Eraser size={18} /></BotaoFerramenta>
          {gm && (
            <>
              <div style={{ height: 1, background: LINE, margin: "3px 4px" }} />
              <BotaoFerramenta titulo="Adicionar token/imagem" onClick={() => pedirImagem("token")}><ImagePlus size={18} /></BotaoFerramenta>
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

        {/* Imagem selecionada */}
        {selecionado && ferramenta === "mover" && podeMexer(selecionado) && (
          <div style={{ ...barraFlutuante, top: 10, left: "50%", transform: "translateX(-50%)", alignItems: "center" }} onPointerDown={(e) => e.stopPropagation()}>
            <BotaoFerramenta titulo="Diminuir" onClick={() => salvar({ ...selecionado, w: Math.max(20, selecionado.w - config.tamanhoGrade), h: Math.max(20, selecionado.w - config.tamanhoGrade) * (selecionado.h / selecionado.w) })}><Minus size={16} /></BotaoFerramenta>
            <BotaoFerramenta titulo="Aumentar" onClick={() => salvar({ ...selecionado, w: selecionado.w + config.tamanhoGrade, h: (selecionado.w + config.tamanhoGrade) * (selecionado.h / selecionado.w) })}><Plus size={16} /></BotaoFerramenta>
            {gm && (
              <BotaoFerramenta
                titulo={selecionado.camada === "mapa" ? "Virar token (fica por cima do desenho)" : "Mandar pro fundo (vira mapa)"}
                onClick={() => salvar({ ...selecionado, camada: selecionado.camada === "mapa" ? "token" : "mapa", ordem: selecionado.camada === "mapa" ? proximaOrdem() : -1000 + mapas.length })}
              >{selecionado.camada === "mapa" ? <ArrowUpToLine size={16} /> : <ArrowDownToLine size={16} />}</BotaoFerramenta>
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

      {/* Chat */}
      <div className="mesa-chat" style={{ display: "flex", flexDirection: "column", borderRadius: 10, border: `1px solid ${LINE}`, background: `${PANEL}CC`, overflow: "hidden", minHeight: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderBottom: `1px solid ${LINE}` }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 13, letterSpacing: 1, color: PURPLE, fontWeight: 700 }}>CHAT DA MESA</span>
          {gm && mensagens.length > 0 && (
            <button type="button" onClick={() => { if (window.confirm("Apagar todo o chat pra todos?")) { setMensagens([]); tentar(conexao.limparMensagens()); } }}
              style={{ fontSize: 10.5, color: EMBER, background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Cinzel', serif" }}>
              Limpar
            </button>
          )}
        </div>

        <div ref={listaRef} style={{ flex: 1, overflowY: "auto", padding: "4px 0" }} aria-live="polite">
          {mensagens.length === 0 ? (
            <div style={{ padding: 20, fontSize: 12, color: MUTED, fontStyle: "italic", textAlign: "center" }}>
              Nada por aqui ainda. Escolha quem fala no pé do chat e mande a primeira mensagem — ou role os dados.
            </div>
          ) : mensagens.map((m) => <Mensagem key={m.id} m={m} />)}
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
          <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
            <textarea
              value={texto} onChange={(e) => setTexto(e.target.value)} rows={2} aria-label="Mensagem"
              placeholder={`Falar como ${autor.nome}… (Enter envia, /r 5 rola 5d10)`}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarTexto(); } }}
              style={{ flex: 1, resize: "none", padding: "7px 9px", borderRadius: 8, border: `1px solid ${LINE}`, background: "#fff", color: PARCHMENT, fontFamily: "'Spectral', serif", fontSize: 13.5 }}
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
        </div>
      </div>
    </div>
  );
}

const passo = {
  width: 24, height: 24, borderRadius: 6, border: `1px solid ${LINE}`, background: "#fff", color: PARCHMENT, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0,
};
