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
//   - seedFromLocalIfEmpty(): roda uma vez na abertura do app. Para cada
//     chave "point-*" que existir no localStorage mas ainda não existir no
//     Supabase, sobe o valor local — nunca sobrescreve o que já está no
//     Supabase. Idempotente, seguro rodar em toda abertura.
import { supabase } from "./supabaseClient.js";

const KEY_PREFIX = "point-";
const TABLE = "point_kv";

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

export async function seedFromLocalIfEmpty() {
  if (!supabase || !hasLocalStorage()) return;

  const localKeys = Object.keys(window.localStorage).filter((k) => k.startsWith(KEY_PREFIX));
  for (const key of localKeys) {
    try {
      const { data, error } = await supabase.from(TABLE).select("key").eq("key", key).maybeSingle();
      if (error || data) continue; // já existe no Supabase (ou erro ao checar) — não mexe
      const local = window.localStorage.getItem(key);
      if (local === null) continue;
      await supabase.from(TABLE).upsert({ key, value: JSON.parse(local) });
    } catch (e) {
      // essa chave não subiu — segue pras outras, tenta de novo na próxima abertura do app
    }
  }
}
