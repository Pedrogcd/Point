// Painel de Encontro (sub-aba "Encontro" do Confronto, GM-only) — funções
// puras de dados, sem depender de React/storage, pra poder ser testadas
// isoladas (ver encontro.test.js). point-amaranth-app.jsx importa deste
// módulo; não duplique esta lógica lá.
//
// Combatente = referência a um personagem (por id — HP/MP/SP, Defesa e
// Resistência Física continuam sendo os da FICHA, lidos/gravados pelo mesmo
// caminho de sempre, onUpdateCharacter/updateCharacterFields — nunca
// duplicados aqui) OU um inimigo avulso, que guarda os próprios números
// (nome, defesa, hp/mp/sp) dentro do encontro, porque não existe ficha pra
// ele:
//   { id, tipo: "personagem", personagemId, lado, acoesGastas, estados, nota }
//   { id, tipo: "avulso", nome, lado, defesa, hp, mp, sp, acoesGastas, estados, nota }
//
// Encontro = { id, rodada, fase: "manutencao"|"turno", turnoIdx, ordem,
//              combatentes: { [id]: Combatente }, limiarManutencao, registro }
// `ordem` é a lista de ids na ordem de turno; `turnoIdx` aponta pra quem tem
// a vez agora DENTRO de `ordem`. Cada combatente passa pela própria
// Manutenção (MP vazio rola 1d10, sucesso recupera 1) e depois pelo próprio
// Turno (Movimento/Ação/B.Ação) antes de passar a vez — ver CORE_RULES.rodada
// em point-amaranth-app.jsx.

// Sucesso na rolagem de Manutenção (MP vazio): a engine não define um
// limiar PRÓPRIO pra essa rolagem específica em CORE_RULES.rodada — só diz
// "rola 1d10, sucesso recupera 1 MP". Usamos o mesmo limiar geral de
// sucesso do resto do sistema (LIMIAR_SUCESSO em engine.js: dado > 5, ou
// seja, 6+) como padrão, mas deixamos editável por encontro (ver
// `limiarManutencao`) — reportado como pendência pro Pedro confirmar.
export const LIMIAR_MANUTENCAO_PADRAO = 5;

export const LADOS = ["aliados", "inimigos"];

// Estados de combate — exatamente as palavras que as habilidades do
// catálogo usam (ver ABILITIES_CATALOG em point-amaranth-app.jsx). Não há
// limite de quantos um combatente pode acumular ao mesmo tempo (o material
// não define um) e nenhum efeito mecânico automático: são marcadores pro
// GM lembrar o que está ativo, aplicados/removidos à mão (liga/desliga).
export const ESTADOS_COMBATE = [
  { id: "ENVENENAMENTO", label: "Envenenamento", cor: "#4A7A4E" },
  { id: "DESACELERAÇÃO", label: "Desaceleração", cor: "#4A6B96" },
  { id: "IMPACTO", label: "Impacto", cor: "#A9762C" },
  { id: "CHAMAS", label: "Chamas", cor: "#A83A2E" },
];
const ESTADOS_VALIDOS = new Set(ESTADOS_COMBATE.map((e) => e.id));

const ACOES = ["movimento", "acao", "bAcao", "reacao"];

const MAX_REGISTRO = 14;

function acoesGastasVazias() {
  return { movimento: false, acao: false, bAcao: false, reacao: false };
}

// Só existe UM encontro em andamento por vez (painel singleton, não uma
// lista de encontros salvos) — por isso o id é fixo, não gerado por
// Date.now()/Math.random(): um id variável quebraria a pureza de
// normalizarEncontro (duas normalizações independentes do mesmo backup
// precisam dar o mesmo resultado, ver encontro.test.js).
const ID_ENCONTRO = "encontro_atual";

export function criarEncontro() {
  return {
    id: ID_ENCONTRO,
    rodada: 1,
    fase: "manutencao",
    turnoIdx: 0,
    ordem: [],
    combatentes: {},
    limiarManutencao: LIMIAR_MANUTENCAO_PADRAO,
    registro: [],
  };
}

// Combatente de personagem (ficha existente) — HP/MP/SP/Defesa/RN nunca
// entram aqui, só a referência; quem desenha o cartão busca tudo isso ao
// vivo em `characters` via computeMaxHP/computeMaxSP/computeMaxMana/
// computeStat (ver point-amaranth-app.jsx), nunca recalculado à mão.
export function criarCombatentePersonagem(personagemId, lado = "aliados") {
  return {
    id: `cb_${personagemId}_${Date.now().toString(36)}`,
    tipo: "personagem",
    personagemId,
    lado: LADOS.includes(lado) ? lado : "aliados",
    acoesGastas: acoesGastasVazias(),
    estados: [],
    nota: "",
  };
}

// Inimigo avulso: sem ficha, os números moram no próprio encontro.
export function criarCombatenteAvulso({ nome, lado = "inimigos", defesa = 8, hp = 3, mp = 0, sp = 0 } = {}) {
  return {
    id: `cb_avulso_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    tipo: "avulso",
    nome: nome && String(nome).trim() ? String(nome).trim() : "Inimigo",
    lado: LADOS.includes(lado) ? lado : "inimigos",
    defesa: Number.isFinite(defesa) ? defesa : 8,
    hp: { current: Number.isFinite(hp) ? hp : 3, max: Number.isFinite(hp) ? hp : 3 },
    mp: { current: Number.isFinite(mp) ? mp : 0, max: Number.isFinite(mp) ? mp : 0 },
    sp: { current: Number.isFinite(sp) ? sp : 0, max: Number.isFinite(sp) ? sp : 0 },
    acoesGastas: acoesGastasVazias(),
    estados: [],
    nota: "",
  };
}

export function adicionarCombatente(encontro, combatente) {
  if (!combatente || !combatente.id) return encontro;
  return {
    ...encontro,
    combatentes: { ...encontro.combatentes, [combatente.id]: combatente },
    ordem: encontro.ordem.includes(combatente.id) ? encontro.ordem : [...encontro.ordem, combatente.id],
  };
}

// Remove um combatente do encontro — se ele tinha a vez (ou vinha antes na
// ordem), ajusta `turnoIdx` pra continuar apontando pra quem deveria ter a
// vez, sem pular ninguém nem estourar o índice.
export function removerCombatente(encontro, id) {
  const idx = encontro.ordem.indexOf(id);
  if (idx === -1) return encontro;
  const ordem = encontro.ordem.filter((x) => x !== id);
  const { [id]: _removido, ...combatentes } = encontro.combatentes;
  let turnoIdx = encontro.turnoIdx;
  if (idx < turnoIdx) turnoIdx -= 1;
  turnoIdx = ordem.length === 0 ? 0 : Math.min(turnoIdx, ordem.length - 1);
  return { ...encontro, ordem, combatentes, turnoIdx };
}

export function atualizarCombatente(encontro, id, patch) {
  if (!encontro.combatentes[id]) return encontro;
  return { ...encontro, combatentes: { ...encontro.combatentes, [id]: { ...encontro.combatentes[id], ...patch } } };
}

// Troca a posição de um combatente com o vizinho (ordem de turno manual,
// "Subir"/"Descer" na gaveta do selecionado) — nos limites, não faz nada.
export function reordenar(ordem, id, direcao) {
  const lista = Array.isArray(ordem) ? ordem.slice() : [];
  const i = lista.indexOf(id);
  if (i === -1) return lista;
  const j = direcao === "cima" ? i - 1 : i + 1;
  if (j < 0 || j >= lista.length) return lista;
  [lista[i], lista[j]] = [lista[j], lista[i]];
  return lista;
}

// Liga/desliga um estado de combate num combatente (botão liga/desliga ->
// vira chip no cartão). Devolve um combatente NOVO (imutável).
export function alternarEstado(combatente, estadoId) {
  if (!ESTADOS_VALIDOS.has(estadoId)) return combatente;
  const estados = combatente.estados || [];
  const estadosNovos = estados.includes(estadoId) ? estados.filter((e) => e !== estadoId) : [...estados, estadoId];
  return { ...combatente, estados: estadosNovos };
}

// Risca/desfaz o recurso gasto (Movimento/Ação/B.Ação/Reação) do turno do
// combatente — ver ACOES acima.
export function alternarAcaoGasta(combatente, acaoKey) {
  if (!ACOES.includes(acaoKey)) return combatente;
  const acoesGastas = combatente.acoesGastas || acoesGastasVazias();
  return { ...combatente, acoesGastas: { ...acoesGastas, [acaoKey]: !acoesGastas[acaoKey] } };
}

// Avança a barra de rodada (botão principal): na Manutenção, "Iniciar
// turno" só troca de fase pro MESMO combatente (continua sendo a vez
// dele); no Turno, "Encerrar turno" reseta os recursos gastos dele, passa
// a vez pro próximo da `ordem` e volta pra Manutenção — encerrar o ÚLTIMO
// da lista incrementa a rodada e volta pro primeiro.
export function proximoTurno(encontro) {
  if (encontro.ordem.length === 0) return encontro;
  if (encontro.fase !== "turno") {
    return { ...encontro, fase: "turno" };
  }
  const idAtual = encontro.ordem[encontro.turnoIdx];
  const combatentes = encontro.combatentes[idAtual]
    ? { ...encontro.combatentes, [idAtual]: { ...encontro.combatentes[idAtual], acoesGastas: acoesGastasVazias() } }
    : encontro.combatentes;
  const ultimo = encontro.turnoIdx >= encontro.ordem.length - 1;
  return {
    ...encontro,
    combatentes,
    fase: "manutencao",
    turnoIdx: ultimo ? 0 : encontro.turnoIdx + 1,
    rodada: ultimo ? encontro.rodada + 1 : encontro.rodada,
  };
}

// Conta sucessos de uma rolagem de Manutenção JÁ FEITA (`vals`: um d10 por
// MP vazio, rolado por quem chama — esta função não rola dado, só
// interpreta o resultado, pra poder ser testada sem aleatoriedade).
export function registrarRolagemManutencao(vals, limiar = LIMIAR_MANUTENCAO_PADRAO) {
  const resultados = (Array.isArray(vals) ? vals : []).map((valor) => ({ valor, sucesso: valor > limiar }));
  const sucessos = resultados.filter((r) => r.sucesso).length;
  return { resultados, sucessos };
}

// Acrescenta uma linha ao registro (mais recente primeiro — "em destaque"
// na UI é o primeiro item), mantendo só as últimas MAX_REGISTRO.
export function registrarAcao(encontro, texto) {
  if (!texto) return encontro;
  const item = { id: `log_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, texto, ts: Date.now() };
  return { ...encontro, registro: [item, ...(encontro.registro || [])].slice(0, MAX_REGISTRO) };
}

function numOuPadrao(v, padrao) {
  return typeof v === "number" && Number.isFinite(v) ? v : padrao;
}

function normalizarCombatente(id, c) {
  if (!c || typeof c !== "object") return null;
  const lado = LADOS.includes(c.lado) ? c.lado : "aliados";
  const acoesGastasBrutas = c.acoesGastas && typeof c.acoesGastas === "object" ? c.acoesGastas : {};
  const acoesGastas = { movimento: !!acoesGastasBrutas.movimento, acao: !!acoesGastasBrutas.acao, bAcao: !!acoesGastasBrutas.bAcao, reacao: !!acoesGastasBrutas.reacao };
  const estados = (Array.isArray(c.estados) ? c.estados : []).filter((e) => ESTADOS_VALIDOS.has(e));
  const nota = typeof c.nota === "string" ? c.nota : "";
  const base = { id, lado, acoesGastas, estados, nota };
  if (c.tipo === "avulso") {
    const hpMax = Math.max(1, numOuPadrao(c.hp?.max, 3));
    const mpMax = Math.max(0, numOuPadrao(c.mp?.max, 0));
    const spMax = Math.max(0, numOuPadrao(c.sp?.max, 0));
    return {
      ...base,
      tipo: "avulso",
      nome: typeof c.nome === "string" && c.nome.trim() ? c.nome.trim() : "Inimigo",
      defesa: numOuPadrao(c.defesa, 8),
      hp: { current: Math.max(0, Math.min(numOuPadrao(c.hp?.current, hpMax), hpMax)), max: hpMax },
      mp: { current: Math.max(0, Math.min(numOuPadrao(c.mp?.current, mpMax), mpMax)), max: mpMax },
      sp: { current: Math.max(0, Math.min(numOuPadrao(c.sp?.current, spMax), spMax)), max: spMax },
    };
  }
  // tipo "personagem" (ou qualquer outro valor — cai no default seguro):
  // sem personagemId válido não dá pra desenhar o cartão, descarta.
  if (typeof c.personagemId !== "string" || !c.personagemId) return null;
  return { ...base, tipo: "personagem", personagemId: c.personagemId };
}

// Migra um encontro salvo (storage/backup) pro formato atual — tolerante a
// qualquer lixo (null, campos faltando, tipos errados): nunca lança, cai
// pros defaults de criarEncontro() no que não der pra aproveitar.
export function normalizarEncontro(encontro) {
  const base = criarEncontro();
  if (!encontro || typeof encontro !== "object") return base;

  const combatentesBrutos = encontro.combatentes && typeof encontro.combatentes === "object" && !Array.isArray(encontro.combatentes) ? encontro.combatentes : {};
  const combatentes = {};
  for (const [id, c] of Object.entries(combatentesBrutos)) {
    const normalizado = normalizarCombatente(id, c);
    if (normalizado) combatentes[id] = normalizado;
  }
  const idsValidos = new Set(Object.keys(combatentes));
  const ordem = (Array.isArray(encontro.ordem) ? encontro.ordem : []).filter((id) => idsValidos.has(id));
  for (const id of idsValidos) if (!ordem.includes(id)) ordem.push(id);

  const rodada = Number.isInteger(encontro.rodada) && encontro.rodada >= 1 ? encontro.rodada : 1;
  const fase = encontro.fase === "turno" ? "turno" : "manutencao";
  let turnoIdx = Number.isInteger(encontro.turnoIdx) ? encontro.turnoIdx : 0;
  turnoIdx = ordem.length === 0 ? 0 : Math.min(Math.max(0, turnoIdx), ordem.length - 1);
  const limiarManutencao = numOuPadrao(encontro.limiarManutencao, LIMIAR_MANUTENCAO_PADRAO);
  const registro = (Array.isArray(encontro.registro) ? encontro.registro : [])
    .filter((r) => r && typeof r.texto === "string")
    .map((r) => ({ id: typeof r.id === "string" && r.id ? r.id : `log_${Math.random().toString(36).slice(2, 8)}`, texto: r.texto, ts: numOuPadrao(r.ts, Date.now()) }))
    .slice(0, MAX_REGISTRO);

  return {
    id: typeof encontro.id === "string" && encontro.id ? encontro.id : base.id,
    rodada, fase, turnoIdx, ordem, combatentes, limiarManutencao, registro,
  };
}
