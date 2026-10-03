// Normalização de estado — função única usada tanto no carregamento normal do
// app (via storage.js) quanto na importação de um backup (ver backup.js e
// handleImportFile em point-amaranth-app.jsx). Garante que os dois caminhos
// aplicam exatamente as mesmas migrações de formato antigo -> novo (cidades e
// personagens), pra um backup salvo antes de uma migração existir não ficar
// com campos em branco ou quebrar a UI quando restaurado. Não duplique esta
// lógica nos dois lugares — chame normalizarEstado.

import { migrarCidades } from "./mapaMundo.js";
import { migrarPersonagens } from "./personagens.js";

export function normalizarEstado(state) {
  const characters = migrarPersonagens(state?.characters);
  const kingdoms = (Array.isArray(state?.kingdoms) ? state.kingdoms : []).map((rk) => ({
    ...rk, cities: migrarCidades(rk?.cities),
  }));
  const gods = Array.isArray(state?.gods) ? state.gods : [];
  const sagas = Array.isArray(state?.sagas) ? state.sagas : [];
  const objectives = Array.isArray(state?.objectives) ? state.objectives : [];
  return { characters, kingdoms, gods, sagas, objectives };
}
