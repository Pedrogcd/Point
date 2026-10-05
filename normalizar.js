// Normalização de estado — função única usada tanto no carregamento normal do
// app (via storage.js) quanto na importação de um backup (ver backup.js e
// handleImportFile em point-amaranth-app.jsx). Garante que os dois caminhos
// aplicam exatamente as mesmas migrações de formato antigo -> novo (cidades e
// personagens), pra um backup salvo antes de uma migração existir não ficar
// com campos em branco ou quebrar a UI quando restaurado. Não duplique esta
// lógica nos dois lugares — chame normalizarEstado.

import { migrarCidades } from "./mapaMundo.js";
import { migrarPersonagens } from "./personagens.js";

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
  return { characters, kingdoms, gods, sagas, objectives, cidadesOverrides, pessoasOverrides };
}
