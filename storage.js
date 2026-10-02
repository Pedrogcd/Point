// Camada de armazenamento do Point. O resto do app só conhece esta
// interface (get/set assíncronos) — quem muda é só este arquivo.
//
// Interface (igual desde a versão localStorage-only, de propósito — é o
// que permitiu trocar o backend sem mexer em point-amaranth-app.jsx):
//   storage.get(key) -> Promise<{ value: string } | undefined>
//   storage.set(key, value: string) -> Promise<void>
//
// Sem login (ver CONTEXTO.md — o app não exige mais autenticação; a RLS do
// Supabase já libera insert/update/delete pro papel "anon"). Estratégia
// (Supabase como fonte de verdade entre aparelhos, localStorage como cache
// offline):
//   - get(key): tenta o Supabase primeiro (pra sincronizar com o que outro
//     aparelho salvou); se der certo, atualiza o cache local e devolve esse
//     valor. Se o Supabase falhar (sem rede, offline, não configurado, RLS,
//     tabela ainda não criada) ou não tiver a chave, cai pro cache local —
//     é isso que deixa o app abrir offline.
//   - set(key, value): grava no cache local SEMPRE (vira o fallback pra
//     próxima leitura offline) e tenta gravar no Supabase sempre que
//     estiver configurado — sem checar sessão nenhuma.
//   - checkSeedOpportunity() / commitSeedFromLocal(): substituem o antigo
//     seedFromLocalIfEmpty(), que semeava o Supabase a partir do localStorage
//     silenciosamente sempre que uma chave estivesse faltando lá. Isso virou
//     um risco depois que a escrita passou a não exigir login: se a tabela
//     ficasse vazia por engano, o PRÓXIMO VISITANTE repovoaria o banco sem
//     ninguém saber. Agora o fluxo é em duas etapas — checkSeedOpportunity()
//     só CONSULTA (não escreve) se vale propor um seed (ver seedGuard.js:
//     só quando o Supabase não tem point-characters E o localStorage tem uma
//     quantidade plausível), e commitSeedFromLocal() só deve ser chamado
//     depois que o usuário confirmou explicitamente (ver o useEffect em
//     point-amaranth-app.jsx que pede confirmação via askConfirm). Continua
//     nunca sobrescrevendo o que já está no Supabase, idempotente.
import { supabase } from "./supabaseClient.js";
import { countPlausibleCharacters, decideSeedOpportunity, buildSeedLogEntry } from "./seedGuard.js";

const KEY_PREFIX = "point-";
const TABLE = "point_kv";
const CHARACTERS_KEY = "point-characters";
const SEED_LOG_KEY = "point-seed-log";
const SEED_LOG_MAX_ENTRIES = 20;

function hasLocalStorage() {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch (e) {
    return false;
  }
}

function readLocal(key) {
  if (!hasLocalStorage()) return undefined;
  const value = window.localStorage.getItem(key);
  return value === null ? undefined : { value };
}

function writeLocal(key, value) {
  if (!hasLocalStorage()) return;
  window.localStorage.setItem(key, value);
}

export const storage = {
  async get(key) {
    if (supabase) {
      try {
        const { data, error } = await supabase.from(TABLE).select("value").eq("key", key).maybeSingle();
        if (!error && data) {
          const value = JSON.stringify(data.value);
          writeLocal(key, value);
          return { value };
        }
      } catch (e) {
        // offline, projeto fora do ar, tabela ainda não criada etc. — cai pro cache local
      }
    }
    return readLocal(key);
  },

  async set(key, value) {
    writeLocal(key, value);
    if (!supabase) return;
    try {
      await supabase.from(TABLE).upsert({ key, value: JSON.parse(value), updated_at: new Date().toISOString() });
    } catch (e) {
      // escrita no Supabase falhou (rede caiu, etc.) — o cache local já foi salvo acima,
      // então nada se perde localmente, mas essa mudança específica não sincroniza até
      // a próxima escrita bem-sucedida dessa mesma chave. Sem fila de retry por enquanto.
    }
  },
};

// Só CONSULTA — nunca escreve. Devolve null quando não há nada a propor
// (Supabase não configurado, sem localStorage, point-characters já existe no
// banco, ou o localStorage está vazio/corrompido), ou { count } com quantos
// personagens plausíveis seriam enviados. Quem chama decide se pede
// confirmação ao usuário antes de chamar commitSeedFromLocal().
export async function checkSeedOpportunity() {
  if (!supabase || !hasLocalStorage()) return null;
  let remoteHasCharacters = true; // falha ao checar conta como "tem dado" — nunca propõe por engano
  try {
    const { data, error } = await supabase.from(TABLE).select("key").eq("key", CHARACTERS_KEY).maybeSingle();
    remoteHasCharacters = Boolean(error) || Boolean(data);
  } catch (e) {
    remoteHasCharacters = true;
  }
  const localCharactersJson = window.localStorage.getItem(CHARACTERS_KEY);
  return decideSeedOpportunity({ remoteHasCharacters, localCharactersJson });
}

// Sobe pro Supabase todas as chaves "point-*" que existirem no localStorage
// mas ainda não existirem lá — só deve ser chamada depois que o usuário
// confirmou explicitamente (ver checkSeedOpportunity, chamado antes pra
// decidir se vale pedir confirmação). Nunca sobrescreve o que já está salvo
// no Supabase, idempotente. Registra o evento (console + point-seed-log) pra
// dar pra investigar depois quem/quando repovoou o banco.
export async function commitSeedFromLocal() {
  if (!supabase || !hasLocalStorage()) return [];

  const localKeys = Object.keys(window.localStorage).filter((k) => k.startsWith(KEY_PREFIX) && k !== SEED_LOG_KEY);
  const seededKeys = [];
  for (const key of localKeys) {
    try {
      const { data, error } = await supabase.from(TABLE).select("key").eq("key", key).maybeSingle();
      if (error || data) continue; // já existe no Supabase (ou erro ao checar) — não mexe
      const local = window.localStorage.getItem(key);
      if (local === null) continue;
      await supabase.from(TABLE).upsert({ key, value: JSON.parse(local) });
      seededKeys.push(key);
    } catch (e) {
      // essa chave não subiu — segue pras outras, tenta de novo na próxima abertura do app
    }
  }
  if (seededKeys.length > 0) await logSeedEvent(seededKeys);
  return seededKeys;
}

async function logSeedEvent(seededKeys) {
  const characterCount = countPlausibleCharacters(window.localStorage.getItem(CHARACTERS_KEY));
  const entry = buildSeedLogEntry(seededKeys, characterCount);
  console.info(`[Point] Banco estava vazio — ${characterCount} personagem(ns) enviado(s) do localStorage pro Supabase em ${entry.at}.`, entry);
  try {
    let log = [];
    const raw = readLocal(SEED_LOG_KEY);
    if (raw?.value) {
      try { log = JSON.parse(raw.value); } catch (e) { log = []; }
    }
    if (!Array.isArray(log)) log = [];
    log.push(entry);
    if (log.length > SEED_LOG_MAX_ENTRIES) log = log.slice(-SEED_LOG_MAX_ENTRIES);
    await storage.set(SEED_LOG_KEY, JSON.stringify(log));
  } catch (e) {
    // falha ao registrar o log não pode travar o app nem desfazer o seed já feito
  }
}
