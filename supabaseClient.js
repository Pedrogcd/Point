// Cliente Supabase compartilhado — única peça que sabe a URL/chave do projeto.
// storage.js e imageUpload.js importam daqui.
//
// Degrada com graça de propósito: se as variáveis de ambiente não estiverem
// definidas (build sem os secrets configurados, ex: CI de fork, ou um
// checkout local sem .env), `supabase` fica `null` e `supabaseConfigured`
// fica `false` — o resto do app trata isso como "sempre offline" em vez de
// quebrar. `import.meta.env` também não existe fora do Vite (ex: quando os
// testes importam point-amaranth-app.jsx direto, sem bundler) — o `?.`
// evita que isso quebre o import nesse caso.
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env?.VITE_SUPABASE_URL;
const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

export const supabase = supabaseConfigured ? createClient(url, anonKey) : null;
