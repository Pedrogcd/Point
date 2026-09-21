// Camada de armazenamento do Point — isolada de propósito. O resto do app só
// conhece esta interface (get/set assíncronos); hoje ela guarda tudo no
// localStorage do navegador, mas pode ser trocada por outro backend (ex:
// Supabase) reescrevendo só este arquivo, sem tocar em point-amaranth-app.jsx.
//
// Interface:
//   storage.get(key) -> Promise<{ value: string } | undefined>
//   storage.set(key, value: string) -> Promise<void>
//
// O formato de retorno do get (objeto { value } em vez do valor cru) é o
// mesmo que a API window.storage do Claude usava — mantido assim de propósito
// pra não precisar mexer na lógica de migração que já dependia dele.

function hasLocalStorage() {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch (e) {
    return false;
  }
}

export const storage = {
  async get(key) {
    if (!hasLocalStorage()) return undefined;
    const value = window.localStorage.getItem(key);
    if (value === null) return undefined;
    return { value };
  },

  async set(key, value) {
    if (!hasLocalStorage()) return;
    window.localStorage.setItem(key, value);
  },
};
