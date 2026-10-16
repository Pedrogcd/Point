// Normalização de estado — função única usada tanto no carregamento normal do
// app (via storage.js) quanto na importação de um backup (ver backup.js e
// handleImportFile em point-amaranth-app.jsx). Garante que os dois caminhos
// aplicam exatamente as mesmas migrações de formato antigo -> novo (cidades e
// personagens), pra um backup salvo antes de uma migração existir não ficar
// com campos em branco ou quebrar a UI quando restaurado. Não duplique esta
// lógica nos dois lugares — chame normalizarEstado.

import { migrarCidades } from "./mapaMundo.js";
import { migrarPersonagens } from "./personagens.js";
import { migrarRotas } from "./rotasMapa.js";
import { normalizarEncontro } from "./encontro.js";

function isPlainObject(v) {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

// cidadesOverrides: { [cidadeId]: { campo: valor } } — guardado à parte
// (ver cidadeOverrides.js), não dentro de kingdoms. Qualquer formato
// inesperado (array, string, chave que não aponta pra um objeto) some sem
// quebrar nada — mesma blindagem já aplicada aos outros campos.
function normalizarCidadesOverrides(valor) {
  if (!isPlainObject(valor)) return {};
  const normalizado = {};
  for (const [cidadeId, campos] of Object.entries(valor)) {
    if (isPlainObject(campos)) normalizado[cidadeId] = campos;
  }
  return normalizado;
}

// pessoasOverrides: { [reinoId]: { campo: valor } } — mesma forma e mesma
// blindagem de normalizarCidadesOverrides, mas pra "Pessoas do reino" (ver
// pessoasReino.js).
function normalizarPessoasOverrides(valor) {
  if (!isPlainObject(valor)) return {};
  const normalizado = {};
  for (const [reinoId, campos] of Object.entries(valor)) {
    if (isPlainObject(campos)) normalizado[reinoId] = campos;
  }
  return normalizado;
}

// npcsOverrides: { [npcId]: { campo: valor } } — mesma forma/blindagem,
// pros NPCs de mundo editáveis pelo GM (ver npcOverrides.js, 14/10).
function normalizarNpcsOverrides(valor) {
  if (!isPlainObject(valor)) return {};
  const normalizado = {};
  for (const [npcId, campos] of Object.entries(valor)) {
    if (isPlainObject(campos)) normalizado[npcId] = campos;
  }
  return normalizado;
}

export function normalizarEstado(state) {
  const characters = migrarPersonagens(state?.characters);
  const kingdoms = (Array.isArray(state?.kingdoms) ? state.kingdoms : []).map((rk) => ({
    ...rk, cities: migrarCidades(rk?.cities),
  }));
  const gods = Array.isArray(state?.gods) ? state.gods : [];
  const sagas = Array.isArray(state?.sagas) ? state.sagas : [];
  const objectives = Array.isArray(state?.objectives) ? state.objectives : [];
  const cidadesOverrides = normalizarCidadesOverrides(state?.cidadesOverrides);
  const pessoasOverrides = normalizarPessoasOverrides(state?.pessoasOverrides);
  const npcsOverrides = normalizarNpcsOverrides(state?.npcsOverrides);
  // Rotas do mapa (ver rotasMapa.js) — dado do MUNDO, não de um reino
  // (cruzam reinos), então ficam numa lista irmã de `kingdoms`, não dentro
  // de cada reino. migrarRotas nunca lança: lixo vira [] sem derrubar a tela.
  const rotas = migrarRotas(state?.rotas);
  // Encontro (painel de combate do Confronto, ver encontro.js) — objeto
  // único (não lista/mapa por id); normalizarEncontro já trata ausente/
  // lixo como "nenhum encontro em andamento", tolerante como os demais.
  const encontro = normalizarEncontro(state?.encontro);
  return { characters, kingdoms, gods, sagas, objectives, cidadesOverrides, pessoasOverrides, npcsOverrides, rotas, encontro };
}
