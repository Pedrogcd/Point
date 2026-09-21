// Autenticação do mestre — e-mail/senha via Supabase Auth. Sem Supabase
// configurado (ver supabaseClient.js), tudo aqui vira no-op / "sempre
// deslogado", pra não quebrar o app em modo leitura.
import { supabase, supabaseConfigured } from "./supabaseClient.js";

export const auth = {
  configured: supabaseConfigured,

  async signIn(email, password) {
    if (!supabase) throw new Error("Supabase não configurado.");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.session;
  },

  async signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
  },

  async getSession() {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session ?? null;
  },

  // Chama callback(session) agora (com a sessão atual) e de novo a cada
  // login/logout/refresh de token. Devolve uma função pra cancelar a
  // inscrição (usar no cleanup de um useEffect).
  onAuthStateChange(callback) {
    if (!supabase) {
      callback(null);
      return () => {};
    }
    const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
    return () => data.subscription.unsubscribe();
  },
};
