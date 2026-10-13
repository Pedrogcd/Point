// Ícones SVG inline (24x24, traço 1.75px, cantos arredondados, currentColor) pra
// raças e habilidades raciais do Point. Sem libs externas, sem referência a
// personagem/marca existente — formas genéricas e simbólicas. Uma chave por
// valor de `icone` em catalogo-racas.json (31 no total: 6 raças + 24
// principais + "neutro", compartilhado pelas 15 secundárias que usam esse
// mesmo valor). Nome/cor/descrição/efeito vêm só do catálogo (racasCatalogo.js)
// — este módulo cobre só o desenho.
const BASE = { viewBox: "0 0 24 24", width: 20, height: 20, fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round" };

function Svg({ children, ...props }) {
  return (
    <svg {...BASE} {...props} aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

/* --- Raças (6) --- */
function IconFiguraHumana(p) { return <Svg {...p}><circle cx="12" cy="7.5" r="3.25" /><path d="M5.5 19.5c0-4.14 2.91-7 6.5-7s6.5 2.86 6.5 7" /></Svg>; }
function IconChifresOni(p) { return <Svg {...p}><path d="M9 11c-1.6-2.8-1.3-6.3.3-8.5M15 11c1.6-2.8 1.3-6.3-.3-8.5M7.5 12.5a5 5 0 0 1 9 0" /></Svg>; }
function IconPegadaPata(p) { return <Svg {...p}><ellipse cx="12" cy="16.5" rx="4.4" ry="3.4" /><ellipse cx="7" cy="9.3" rx="1.7" ry="2.2" transform="rotate(-18 7 9.3)" /><ellipse cx="12" cy="7.3" rx="1.8" ry="2.3" /><ellipse cx="17" cy="9.3" rx="1.7" ry="2.2" transform="rotate(18 17 9.3)" /></Svg>; }
function IconFolhaPontiaguda(p) { return <Svg {...p}><path d="M12 3c4 3 6 7.5 4.3 12.3C14.8 19.6 12 21 12 21s-2.8-1.4-4.3-5.7C6 11.5 8 7 12 3Z" /><path d="M12 6v12" /></Svg>; }
function IconEscama(p) { return <Svg {...p}><path d="M12 4c3.5 2 5.5 5.3 5.5 8.8 0 3-2.3 5.6-5.5 6.7-3.2-1.1-5.5-3.7-5.5-6.7C6.5 9.3 8.5 6 12 4Z" /></Svg>; }
function IconAsas(p) { return <Svg {...p}><path d="M11.5 13c-2-5-5.3-7.4-8.7-6.9 1 3.9 2.9 7.8 8.7 8.9Z" /><path d="M12.5 13c2-5 5.3-7.4 8.7-6.9-1 3.9-2.9 7.8-8.7 8.9Z" /></Svg>; }

/* --- Humano (principais) --- */
function IconPontosConvergindo(p) { return <Svg {...p}><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="4.5" r="1.1" fill="currentColor" stroke="none" /><circle cx="19.5" cy="12" r="1.1" fill="currentColor" stroke="none" /><circle cx="12" cy="19.5" r="1.1" fill="currentColor" stroke="none" /><circle cx="4.5" cy="12" r="1.1" fill="currentColor" stroke="none" /><path d="M12 6.2v4.3M17.8 12h-4.3M12 17.8v-4.3M6.2 12h4.3" /></Svg>; }
function IconGotaOnda(p) { return <Svg {...p}><path d="M12 3.5c3 4 5 7.2 5 10a5 5 0 0 1-10 0c0-2.8 2-6 5-10Z" /><path d="M8.3 14.5c1 1 2.4-1 3.4 0s2.4 1 3.4 0" /></Svg>; }
function IconLosangoSolido(p) { return <Svg {...p}><path d="M12 3l6 9-6 9-6-9Z" fill="currentColor" stroke="none" /></Svg>; }

/* --- Niosh (principais) --- */
function IconBocaDentes(p) { return <Svg {...p}><path d="M4 9c2.6 5 5 7 8 7s5.4-2 8-7" /><path d="M6.5 9.3l1.4 2 1.4-2 1.4 2 1.4-2 1.4 2 1.4-2 1.4 2 1.4-2" /></Svg>; }
function IconOlhoEspiral(p) { return <Svg {...p}><path d="M3.5 12c2.8-3.5 6-5.2 8.5-5.2s5.7 1.7 8.5 5.2c-2.8 3.5-6 5.2-8.5 5.2S6.3 15.5 3.5 12Z" /><path d="M12 9.7a2.3 2.3 0 1 1-1.7 3.7" /></Svg>; }
function IconGarraTresRiscos(p) { return <Svg {...p}><path d="M6 5l3 14M12 4.5l2 15M18 5l-3 14" /></Svg>; }

/* --- Ningen (principais) --- */
function IconOrelhasLongas(p) { return <Svg {...p}><path d="M8.7 20.5c-1-4.6-1.3-10.2.2-14.8.6-1.9 2.4-1.9 3 0" /><path d="M15.3 20.5c1-4.6 1.3-10.2-.2-14.8-.6-1.9-2.4-1.9-3 0" /></Svg>; }
function IconJuba(p) { return <Svg {...p}><circle cx="12" cy="13" r="4" /><path d="M12 13V3M15.2 11 19 6M8.8 11 5 6M16.6 13.8 21.5 11.5M7.4 13.8 2.5 11.5M14.4 16.4 17 21M9.6 16.4 7 21" /></Svg>; }
function IconOlhoPupilaFendida(p) { return <Svg {...p}><path d="M3.5 12c2.8-4 6.2-6 8.5-6s5.7 2 8.5 6c-2.8 4-6.2 6-8.5 6s-5.7-2-8.5-6Z" /><path d="M12 8.5v7" strokeWidth={2.25} /></Svg>; }
function IconLoboUivando(p) { return <Svg {...p}><path d="M4 18c1-5 4-9 7-12l1 3 3-2c1.5 1.5 1 3.5-.5 5l3 1c0 2-1.5 3.5-3.5 4-2 .5-6 1.5-10 1Z" /><circle cx="9.3" cy="12.2" r="0.6" fill="currentColor" stroke="none" /></Svg>; }
function IconPataLarga(p) { return <Svg {...p}><path d="M6 15.5a6 4.4 0 0 1 12 0c0 3-2.5 5.5-6 5.5s-6-2.5-6-5.5Z" /><circle cx="7.3" cy="7.8" r="1.4" /><circle cx="10.6" cy="5.3" r="1.4" /><circle cx="13.4" cy="5.3" r="1.4" /><circle cx="16.7" cy="7.8" r="1.4" /></Svg>; }

/* --- Elfo (principais) --- */
function IconSol(p) { return <Svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 3v2.4M12 18.6V21M21 12h-2.4M5.4 12H3M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7M18.4 18.4l-1.7-1.7M7.3 7.3 5.6 5.6" /></Svg>; }
function IconLuaCrescente(p) { return <Svg {...p}><path d="M15 4a9 9 0 1 0 0 16c-5-1-8-5-8-8s3-7 8-8Z" /></Svg>; }
function IconGotaSanguePena(p) { return <Svg {...p}><path d="M10 3.5c2 3 3.3 5.5 3.3 7.6a3.3 3.3 0 1 1-6.6 0c0-2.1 1.3-4.6 3.3-7.6Z" /><path d="M16 9c2 .3 3.6 1.8 4 3.8-1.6.5-3-.1-4-1.3M16 9v9" /></Svg>; }
function IconCirculoQuatro(p) { return <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5v17M3.5 12h17" /></Svg>; }
function IconFolha(p) { return <Svg {...p}><path d="M12 4c4.5 2 7 5.8 7 9.3 0 4.3-3.1 7.2-7 7.7-3.9-.5-7-3.4-7-7.7C5 9.8 7.5 6 12 4Z" /><path d="M12 7.5v12.8" /></Svg>; }

/* --- Dragonato (principais) --- */
function IconEscamaMetalica(p) { return <Svg {...p}><path d="M12 4c3.3 1.9 5.2 5 5.2 8.4 0 2.9-2.1 5.3-5.2 6.3-3.1-1-5.2-3.4-5.2-6.3C6.8 9 8.7 5.9 12 4Z" /><path d="M12 7.3c1.9 1.6 3 3.6 3 5.6" /></Svg>; }
function IconGotaVeneno(p) { return <Svg {...p}><path d="M12 4c2.6 3.6 4.3 6.4 4.3 8.8a4.3 4.3 0 1 1-8.6 0C7.7 10.4 9.4 7.6 12 4Z" /><circle cx="16.8" cy="7.5" r="0.9" fill="currentColor" stroke="none" /><circle cx="18.3" cy="10.3" r="0.6" fill="currentColor" stroke="none" /></Svg>; }
function IconChama(p) { return <Svg {...p}><path d="M12 3.5c1.6 2.8 3.8 4.9 3.8 8.3a3.8 3.8 0 0 1-7.6 0c0-1.1.3-2 .8-2.9-.1 1.2.3 2 1.1 2.4-.4-2.4.2-5.1 1.9-7.8Z" /></Svg>; }
function IconMontanha(p) { return <Svg {...p}><path d="M3 18l5.5-9 3 4.5 2-3L20 18Z" /></Svg>; }
function IconPunho(p) { return <Svg {...p}><path d="M8 11V8.3a1.6 1.6 0 1 1 3.2 0V11M11.2 11V7.6a1.6 1.6 0 1 1 3.2 0V11M14.4 11.3V8.6a1.6 1.6 0 1 1 3.2 0v5.7c0 3-2.2 5.2-5.3 5.2h-1.1c-2.7 0-4.4-1-5.6-2.9L4 13.8c-.5-.8-.3-1.7.5-2.1.7-.4 1.5-.1 2 .5l1.5 1.8" /></Svg>; }

/* --- Tengou (principais) --- */
function IconHalo(p) { return <Svg {...p}><ellipse cx="12" cy="9" rx="6" ry="2.2" /><ellipse cx="12" cy="9" rx="3.6" ry="1.1" /></Svg>; }
function IconPequenosChifres(p) { return <Svg {...p}><path d="M9 9c-.6-2.4-.2-4.7 1-6.3M15 9c.6-2.4.2-4.7-1-6.3M7.8 10.5a4.6 4.6 0 0 1 8.4 0" /></Svg>; }
function IconAsaLibelula(p) { return <Svg {...p}><path d="M12 12c0-5 3-9 7-9 1 4-1 8-7 9Z" /><path d="M12 12c0-5-3-9-7-9-1 4 1 8 7 9Z" /><path d="M13 8.5c1.5-.3 3-.2 4.3.4M11 8.5c-1.5-.3-3-.2-4.3.4" /></Svg>; }

/* --- Neutro (secundárias — todas as 15 usam esta chave, sem cor própria) --- */
function IconNeutro(p) { return <Svg {...p}><rect x="9.2" y="9.2" width="5.6" height="5.6" rx="1.1" transform="rotate(45 12 12)" /></Svg>; }

export const ICONES = {
  "figura-humana": IconFiguraHumana,
  "chifres-oni": IconChifresOni,
  "pegada-pata": IconPegadaPata,
  "folha-pontiaguda": IconFolhaPontiaguda,
  escama: IconEscama,
  asas: IconAsas,
  "pontos-convergindo": IconPontosConvergindo,
  "gota-onda": IconGotaOnda,
  "losango-solido": IconLosangoSolido,
  "boca-dentes": IconBocaDentes,
  "olho-espiral": IconOlhoEspiral,
  "garra-tres-riscos": IconGarraTresRiscos,
  "orelhas-longas": IconOrelhasLongas,
  juba: IconJuba,
  "olho-pupila-fendida": IconOlhoPupilaFendida,
  "lobo-uivando": IconLoboUivando,
  "pata-larga": IconPataLarga,
  sol: IconSol,
  "lua-crescente": IconLuaCrescente,
  "gota-sangue-pena": IconGotaSanguePena,
  "circulo-quatro": IconCirculoQuatro,
  folha: IconFolha,
  "escama-metalica": IconEscamaMetalica,
  "gota-veneno": IconGotaVeneno,
  chama: IconChama,
  montanha: IconMontanha,
  punho: IconPunho,
  halo: IconHalo,
  "pequenos-chifres": IconPequenosChifres,
  "asa-libelula": IconAsaLibelula,
  neutro: IconNeutro,
};

// Acessor seguro: cai pro ícone neutro se a chave não existir no catálogo
// (não deveria acontecer — os 31 valores de `icone` do JSON têm todos uma
// chave aqui — mas evita tela branca se o catálogo ganhar um valor novo).
export function iconePara(chave) {
  return ICONES[chave] || ICONES.neutro;
}

// Clareia uma cor hex em `percent` pontos de luminosidade HSL — deriva a
// variante "modo escuro" sem hardcodear os valores à mão. O Point não tem
// tema escuro hoje; isto existe pronto pra quando/se houver.
export function clarearHex(hex, percent) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  let hDeg = 0, s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) hDeg = ((g - b) / d) % 6; else if (max === g) hDeg = (b - r) / d + 2; else hDeg = (r - g) / d + 4;
    hDeg *= 60; if (hDeg < 0) hDeg += 360;
  }
  const l2 = Math.min(1, l + percent / 100);
  const c = (1 - Math.abs(2 * l2 - 1)) * s;
  const x = c * (1 - Math.abs(((hDeg / 60) % 2) - 1));
  const m = l2 - c / 2;
  let r2, g2, b2;
  if (hDeg < 60) { r2 = c; g2 = x; b2 = 0; }
  else if (hDeg < 120) { r2 = x; g2 = c; b2 = 0; }
  else if (hDeg < 180) { r2 = 0; g2 = c; b2 = x; }
  else if (hDeg < 240) { r2 = 0; g2 = x; b2 = c; }
  else if (hDeg < 300) { r2 = x; g2 = 0; b2 = c; }
  else { r2 = c; g2 = 0; b2 = x; }
  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`;
}
