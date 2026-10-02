// Blindagem do "semear o Supabase a partir do localStorage" (ver
// checkSeedOpportunity/commitSeedFromLocal em storage.js). Funções puras,
// sem depender de localStorage/Supabase/DOM, pra serem testadas isoladas
// (seedGuard.test.js).
//
// Por que isso existe: se a tabela point_kv ficar vazia um dia (limpeza
// acidental, pausa longa do projeto, migração), sem essa blindagem o
// PRÓXIMO VISITANTE que abrisse o site repovoaria o banco silenciosamente
// com o localStorage dele — que pode ser uma cópia velha, e ninguém saberia
// que isso aconteceu. A blindagem tem 3 partes:
//   1. Só propor semear se o localStorage tiver uma quantidade plausível de
//      personagens de verdade, não um estado vazio/corrompido.
//   2. Pedir confirmação explícita antes de gravar, dizendo quantos
//      personagens seriam enviados (ver point-amaranth-app.jsx, o useEffect
//      que chama checkSeedOpportunity + askConfirm).
//   3. Registrar o evento (data + quantidade) pra dar pra investigar depois.

export const MIN_PLAUSIBLE_CHARACTERS = 1;

// Conta quantos personagens "de verdade" existem num JSON de point-characters
// salvo no localStorage. Devolve 0 pra JSON ausente/inválido, não-array, ou
// cheio só de entradas sem id/nome (lixo/placeholder) — nunca lança.
export function countPlausibleCharacters(rawJson) {
  if (!rawJson) return 0;
  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch (e) {
    return 0;
  }
  if (!Array.isArray(parsed)) return 0;
  return parsed.filter((c) => c && typeof c === "object" && c.id && c.name).length;
}

export function isPlausibleSeed(rawJson) {
  return countPlausibleCharacters(rawJson) >= MIN_PLAUSIBLE_CHARACTERS;
}

// Decide se há uma oportunidade de seed a propor ao usuário. Pura — não faz
// nenhuma chamada de rede; quem chama (storage.js) já consultou o Supabase e
// só passa o resultado. `remoteHasCharacters` deve ser `true` também quando a
// consulta falhou (rede caiu, etc.) — falha ao checar é tratada como "tem
// dado", pra nunca propor um seed por engano. Devolve `null` quando não há
// nada a propor (banco já tem personagens, ou o local está vazio/corrompido),
// ou `{ count }` com quantos personagens plausíveis seriam enviados.
export function decideSeedOpportunity({ remoteHasCharacters, localCharactersJson }) {
  if (remoteHasCharacters) return null;
  const count = countPlausibleCharacters(localCharactersJson);
  if (count < MIN_PLAUSIBLE_CHARACTERS) return null;
  return { count };
}

// Registro de auditoria de um seed bem-sucedido — logado no console e
// gravado numa chave de storage (point-seed-log) pra dar pra investigar
// depois quem/quando repovoou o banco.
export function buildSeedLogEntry(seededKeys, characterCount, now = new Date()) {
  return {
    at: now.toISOString(),
    characterCount,
    keys: [...seededKeys],
  };
}
