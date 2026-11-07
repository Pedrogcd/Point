// Aba "Jogadores" (07/11, só Mestre): lista os jogadores que entraram na
// Mesa (registros "jogador" em point_mesa_objetos — ver mesa.js), com as
// fichas dadas a cada um e os tokens que colocaram. O Mestre pode
// adicionar, renomear, excluir (com ou sem os tokens) e dar/tirar fichas.
import React, { useEffect, useMemo, useState } from "react";
import { Users, Pencil, Trash2, X as XIcon, Check, Search, UserPlus, Wifi, WifiOff } from "lucide-react";
import {
  criarConexaoMesa, juntarObjeto, tirarObjeto, jogadoresDaMesa, idDoJogador, tokensDoJogador,
  renomearJogador, idsParaExcluirJogador,
} from "./mesa.js";

const PANEL = "#F3E9D2";
const PANEL_2 = "#EADFC0";
const LINE = "#C9B78E";
const PARCHMENT = "#2B2116";
const MUTED = "#6B5D45";
const EMBER = "#A83A2E";
const PURPLE = "#4B3B6B";

const botao = {
  display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 11px", borderRadius: 7, cursor: "pointer",
  border: `1px solid ${LINE}`, background: "#fff", color: PARCHMENT, fontSize: 12.5, fontFamily: "'Spectral', serif",
};

export default function JogadoresView({ supabase, personagens }) {
  const conexao = useMemo(() => criarConexaoMesa(supabase), [supabase]);
  const [objetos, setObjetos] = useState([]);
  const [carregado, setCarregado] = useState(false);
  const [status, setStatus] = useState(conexao.modo === "local" ? "LOCAL" : "CONECTANDO");
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState("");
  const [novo, setNovo] = useState("");
  const [editando, setEditando] = useState(null); // { id, nome }
  const [excluindo, setExcluindo] = useState(null); // { jogador, comTokens }

  useEffect(() => {
    let vivo = true;
    async function recarregar() {
      try {
        const s = await conexao.carregar();
        if (vivo) { setObjetos(s.objetos); setCarregado(true); }
      } catch (e) {
        if (vivo) setErro("Não deu pra carregar os jogadores. Confira a conexão.");
      }
    }
    recarregar();
    const parar = conexao.assinar({
      aoObjeto: (obj) => setObjetos((l) => juntarObjeto(l, obj)),
      aoApagarObjeto: (id) => setObjetos((l) => tirarObjeto(l, id)),
      aoStatus: (s) => setStatus(s),
      aoReconectar: () => recarregar(),
    });
    return () => { vivo = false; parar(); };
  }, [conexao]);

  async function tentar(promessa) {
    try { await promessa; setErro(null); } catch (e) { setErro("Falhou ao salvar — tente de novo."); }
  }
  function salvar(obj) { setObjetos((l) => juntarObjeto(l, obj)); tentar(conexao.salvarObjeto(obj)); }
  function apagar(id) { setObjetos((l) => tirarObjeto(l, id)); tentar(conexao.apagarObjeto(id)); }

  const jogadores = jogadoresDaMesa(objetos);
  const filtrados = jogadores.filter((j) => j.nome.toLowerCase().includes(busca.trim().toLowerCase()));
  const fichasOrdenadas = useMemo(
    () => [...(personagens || [])].filter((p) => p?.id && p.name).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [personagens],
  );
  const nomeDaFicha = (id) => fichasOrdenadas.find((p) => p.id === id)?.name || "(ficha apagada)";

  function adicionar() {
    const nome = novo.trim().slice(0, 40);
    const id = idDoJogador(nome);
    if (!id) return;
    if (objetos.some((o) => o.id === id)) { setErro(`Já existe um jogador chamado "${nome}".`); return; }
    salvar({ id, tipo: "jogador", ordem: -5000, nome, fichas: [] });
    setNovo("");
  }
  function confirmarRenomear() {
    const j = jogadores.find((x) => x.id === editando?.id);
    const r = j ? renomearJogador(objetos, j, editando.nome) : null;
    if (!r) { setErro("Nome vazio ou já usado por outro jogador."); return; }
    r.salvar.forEach(salvar);
    r.apagar.forEach(apagar);
    setEditando(null);
  }
  function confirmarExcluir() {
    idsParaExcluirJogador(objetos, excluindo.jogador, { comTokens: excluindo.comTokens }).forEach(apagar);
    setExcluindo(null);
  }
  function mudarFicha(j, fichaId, ligar) {
    const fichas = new Set(j.fichas || []);
    if (ligar) fichas.add(fichaId); else fichas.delete(fichaId);
    salvar({ ...j, fichas: [...fichas] });
  }

  const online = status === "SUBSCRIBED";
  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
        <h2 style={{ fontFamily: "'Cinzel', serif", color: PURPLE, margin: 0, display: "flex", alignItems: "center", gap: 8, fontSize: 20 }}>
          <Users size={20} /> Jogadores {carregado && <span style={{ fontSize: 13, color: MUTED, fontFamily: "'Spectral', serif" }}>· {jogadores.length} {jogadores.length === 1 ? "cadastrado" : "cadastrados"}</span>}
        </h2>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: online ? "#2F8577" : MUTED }}>
          {online ? <Wifi size={13} /> : <WifiOff size={13} />} {online ? "Ao vivo" : status === "LOCAL" ? "Modo local (só este navegador)" : "Conectando…"}
        </span>
      </div>
      <p style={{ fontSize: 13, color: MUTED, margin: "0 0 14px", lineHeight: 1.5 }}>
        São os nomes que as pessoas usaram ao entrar na aba Mesa como Jogador. Aqui você vê quem existe, dá as fichas de cada um e apaga entradas repetidas ou erradas. Quem for excluído volta a ver "Quem é você?" ao abrir a Mesa.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <label style={{ ...botao, flex: "1 1 220px", cursor: "text" }}>
          <Search size={14} color={MUTED} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar jogador" aria-label="Buscar jogador"
            style={{ border: "none", outline: "none", flex: 1, fontSize: 13, background: "transparent" }} />
        </label>
        <form onSubmit={(e) => { e.preventDefault(); adicionar(); }} style={{ display: "flex", gap: 6, flex: "1 1 280px" }}>
          <input value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Nome do novo jogador" aria-label="Nome do novo jogador"
            style={{ flex: 1, padding: "6px 10px", borderRadius: 7, border: `1px solid ${LINE}`, fontSize: 13 }} />
          <button type="submit" style={{ ...botao, background: PURPLE, color: PANEL, border: "none" }}><UserPlus size={14} /> Adicionar</button>
        </form>
      </div>

      {erro && <div role="alert" style={{ padding: "8px 12px", borderRadius: 8, background: `${EMBER}14`, color: EMBER, fontSize: 12.5, marginBottom: 12 }}>{erro}</div>}

      {carregado && jogadores.length === 0 && (
        <div style={{ padding: 24, textAlign: "center", color: MUTED, fontStyle: "italic", border: `1px dashed ${LINE}`, borderRadius: 10 }}>
          Ninguém entrou na Mesa como jogador ainda.
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {filtrados.map((j) => {
          const tokens = tokensDoJogador(objetos, j.nome);
          const emEdicao = editando?.id === j.id;
          return (
            <div key={j.id} style={{ padding: 12, borderRadius: 10, border: `1px solid ${LINE}`, background: `${PANEL}CC` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {emEdicao ? (
                  <form onSubmit={(e) => { e.preventDefault(); confirmarRenomear(); }} style={{ display: "flex", gap: 6, flex: 1 }}>
                    <input autoFocus value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} aria-label={`Novo nome de ${j.nome}`}
                      style={{ flex: 1, padding: "5px 8px", borderRadius: 7, border: `1px solid ${PURPLE}`, fontSize: 14 }} />
                    <button type="submit" style={botao}><Check size={14} /> Salvar</button>
                    <button type="button" onClick={() => setEditando(null)} style={botao}><XIcon size={14} /> Cancelar</button>
                  </form>
                ) : (
                  <>
                    <strong style={{ fontFamily: "'Cinzel', serif", fontSize: 16, color: PARCHMENT, flex: 1 }}>{j.nome}</strong>
                    <span style={{ fontSize: 11.5, color: MUTED }}>{(j.fichas || []).length} ficha{(j.fichas || []).length === 1 ? "" : "s"} · {tokens.length} token{tokens.length === 1 ? "" : "s"} na mesa</span>
                    <button type="button" onClick={() => setEditando({ id: j.id, nome: j.nome })} style={botao} aria-label={`Renomear ${j.nome}`}><Pencil size={13} /> Renomear</button>
                    <button type="button" onClick={() => setExcluindo({ jogador: j, comTokens: false })} style={{ ...botao, color: EMBER, borderColor: `${EMBER}66` }} aria-label={`Excluir ${j.nome}`}><Trash2 size={13} /> Excluir</button>
                  </>
                )}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginTop: 8 }}>
                <span style={{ fontSize: 11, color: MUTED }}>Fichas:</span>
                {(j.fichas || []).length === 0 && <span style={{ fontSize: 11.5, color: MUTED, fontStyle: "italic" }}>nenhuma</span>}
                {(j.fichas || []).map((fid) => (
                  <span key={fid} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 14, background: PANEL_2, fontSize: 12 }}>
                    {nomeDaFicha(fid)}
                    <button type="button" aria-label={`Tirar ${nomeDaFicha(fid)} de ${j.nome}`} onClick={() => mudarFicha(j, fid, false)}
                      style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, color: MUTED, display: "flex" }}><XIcon size={12} /></button>
                  </span>
                ))}
                <select value="" aria-label={`Dar ficha a ${j.nome}`} onChange={(e) => { if (e.target.value) mudarFicha(j, e.target.value, true); }}
                  style={{ padding: "4px 6px", borderRadius: 7, border: `1px solid ${LINE}`, fontSize: 12, background: "#fff" }}>
                  <option value="">+ dar uma ficha…</option>
                  {fichasOrdenadas.filter((p) => !(j.fichas || []).includes(p.id)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
          );
        })}
        {carregado && jogadores.length > 0 && filtrados.length === 0 && (
          <div style={{ fontSize: 12.5, color: MUTED, fontStyle: "italic" }}>Nenhum jogador com esse nome.</div>
        )}
      </div>

      {excluindo && (() => {
        const n = tokensDoJogador(objetos, excluindo.jogador.nome).length;
        return (
          <div role="dialog" aria-label={`Excluir ${excluindo.jogador.nome}`} onClick={() => setExcluindo(null)}
            style={{ position: "fixed", inset: 0, background: "#00000055", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: "min(420px, 92%)", background: PANEL, borderRadius: 12, padding: 18, border: `1px solid ${LINE}` }}>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: 17, color: EMBER, fontWeight: 700 }}>Excluir {excluindo.jogador.nome}?</div>
              <p style={{ fontSize: 13, color: PARCHMENT, lineHeight: 1.5 }}>
                O jogador sai da lista e perde as fichas dadas a ele. Se ele abrir a Mesa de novo, vai precisar dizer quem é.
              </p>
              {n > 0 && (
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: PARCHMENT, marginBottom: 12 }}>
                  <input type="checkbox" checked={excluindo.comTokens} onChange={(e) => setExcluindo({ ...excluindo, comTokens: e.target.checked })} />
                  {n === 1 ? "Também apagar o token que ele colocou na mesa" : `Também apagar os ${n} tokens que ele colocou na mesa`}
                </label>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" onClick={() => setExcluindo(null)} style={botao}>Cancelar</button>
                <button type="button" onClick={confirmarExcluir} style={{ ...botao, background: EMBER, color: "#fff", border: "none" }}><Trash2 size={13} /> Excluir</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
