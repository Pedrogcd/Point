// Endereço direto pra uma ficha (08/11, pedido do Pedro: "Abrir ficha
// completa" da Mesa abre em outra aba do navegador). Formato:
// <endereço do site>#ficha=<id>. O app lê o hash ao abrir e vai direto
// pra ficha (ver point-amaranth-app.jsx).
export function linkDaFicha(enderecoAtual, id) {
  const base = String(enderecoAtual || "").split("#")[0];
  return `${base}#ficha=${encodeURIComponent(id)}`;
}

export function fichaDoHash(hash) {
  const m = /(?:^#|&)ficha=([^&]+)/.exec(String(hash || ""));
  if (!m) return null;
  try { return decodeURIComponent(m[1]) || null; } catch (e) { return null; }
}
