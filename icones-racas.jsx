// Ícones SVG inline (24x24, traço 1.75px, cantos arredondados, currentColor) para
// raças e habilidades raciais principais do Point. Sem libs externas, sem
// referência a personagem/marca existente — formas genéricas e simbólicas.
// `RACAS`/`HABILIDADES_RACIAIS` são os mapas por id consultados em
// point-amaranth-app.jsx (ver character.racaId/habilidadePrincipalId).
const BASE = { viewBox: "0 0 24 24", width: 20, height: 20, fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round" };

function Svg({ children, ...props }) {
  return (
    <svg {...BASE} {...props} aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

/* --- Raças (6) --- */
export function IconHumano(p) { return <Svg {...p}><circle cx="12" cy="7.5" r="3.25" /><path d="M5.5 19.5c0-4.14 2.91-7 6.5-7s6.5 2.86 6.5 7" /></Svg>; }
export function IconNiosh(p) { return <Svg {...p}><path d="M9 11c-1.6-2.8-1.3-6.3.3-8.5M15 11c1.6-2.8 1.3-6.3-.3-8.5M7.5 12.5a5 5 0 0 1 9 0" /></Svg>; }
export function IconNingen(p) { return <Svg {...p}><ellipse cx="12" cy="15" rx="4.5" ry="3.75" /><ellipse cx="7.3" cy="8.3" rx="1.5" ry="1.9" transform="rotate(-20 7.3 8.3)" /><ellipse cx="10.9" cy="6" rx="1.5" ry="1.9" transform="rotate(-6 10.9 6)" /><ellipse cx="14.5" cy="6.2" rx="1.5" ry="1.9" transform="rotate(8 14.5 6.2)" /><ellipse cx="17.3" cy="8.8" rx="1.5" ry="1.9" transform="rotate(22 17.3 8.8)" /></Svg>; }
export function IconElfo(p) { return <Svg {...p}><path d="M12 3c4 3 6 7.5 4.3 12.3C14.8 19.6 12 21 12 21s-2.8-1.4-4.3-5.7C6 11.5 8 7 12 3Z" /><path d="M12 6v12" /></Svg>; }
export function IconDragonato(p) { return <Svg {...p}><path d="M12 4c3.5 2 5.5 5.3 5.5 8.8 0 3-2.3 5.6-5.5 6.7-3.2-1.1-5.5-3.7-5.5-6.7C6.5 9.3 8.5 6 12 4Z" /></Svg>; }
export function IconTengou(p) { return <Svg {...p}><path d="M11.5 13c-2-5-5.3-7.4-8.7-6.9 1 3.9 2.9 7.8 8.7 8.9Z" /><path d="M12.5 13c2-5 5.3-7.4 8.7-6.9-1 3.9-2.9 7.8-8.7 8.9Z" /></Svg>; }

/* --- Humano --- */
export function IconManaConcentrada(p) { return <Svg {...p}><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="4.5" r="1.1" fill="currentColor" stroke="none" /><circle cx="19.5" cy="12" r="1.1" fill="currentColor" stroke="none" /><circle cx="12" cy="19.5" r="1.1" fill="currentColor" stroke="none" /><circle cx="4.5" cy="12" r="1.1" fill="currentColor" stroke="none" /><path d="M12 6.2v4.3M17.8 12h-4.3M12 17.8v-4.3M6.2 12h4.3" /></Svg>; }
export function IconManaFluida(p) { return <Svg {...p}><path d="M12 3.5c3 4 5 7.2 5 10a5 5 0 0 1-10 0c0-2.8 2-6 5-10Z" /><path d="M8.3 14.5c1 1 2.4-1 3.4 0s2.4 1 3.4 0" /></Svg>; }
export function IconManaEstatica(p) { return <Svg {...p}><path d="M12 3l6 9-6 9-6-9Z" fill="currentColor" stroke="none" /></Svg>; }

/* --- Niosh --- */
export function IconSharkan(p) { return <Svg {...p}><path d="M4 9c2.6 5 5 7 8 7s5.4-2 8-7" /><path d="M6.5 9.3l1.4 2 1.4-2 1.4 2 1.4-2 1.4 2 1.4-2 1.4 2 1.4-2" /></Svg>; }
export function IconArcani(p) { return <Svg {...p}><path d="M3.5 12c2.8-3.5 6-5.2 8.5-5.2s5.7 1.7 8.5 5.2c-2.8 3.5-6 5.2-8.5 5.2S6.3 15.5 3.5 12Z" /><path d="M12 9.7a2.3 2.3 0 1 1-1.7 3.7" /></Svg>; }
export function IconSabato(p) { return <Svg {...p}><path d="M6 5l3 14M12 4.5l2 15M18 5l-3 14" /></Svg>; }

/* --- Ningen --- */
export function IconCoelhoBode(p) { return <Svg {...p}><path d="M8.7 20.5c-1-4.6-1.3-10.2.2-14.8.6-1.9 2.4-1.9 3 0" /><path d="M15.3 20.5c1-4.6 1.3-10.2-.2-14.8-.6-1.9-2.4-1.9-3 0" /></Svg>; }
export function IconLeonino(p) { return <Svg {...p}><circle cx="12" cy="13" r="4" /><path d="M12 13V3M15.2 11 19 6M8.8 11 5 6M16.6 13.8 21.5 11.5M7.4 13.8 2.5 11.5M14.4 16.4 17 21M9.6 16.4 7 21" /></Svg>; }
export function IconReptiliano(p) { return <Svg {...p}><path d="M3.5 12c2.8-4 6.2-6 8.5-6s5.7 2 8.5 6c-2.8 4-6.2 6-8.5 6s-5.7-2-8.5-6Z" /><path d="M12 8.5v7" strokeWidth={2.25} /></Svg>; }
export function IconLoboCanino(p) { return <Svg {...p}><path d="M4 18c1-5 4-9 7-12l1 3 3-2c1.5 1.5 1 3.5-.5 5l3 1c0 2-1.5 3.5-3.5 4-2 .5-6 1.5-10 1Z" /><circle cx="9.3" cy="12.2" r="0.6" fill="currentColor" stroke="none" /></Svg>; }
export function IconUrso(p) { return <Svg {...p}><path d="M6 15.5a6 4.4 0 0 1 12 0c0 3-2.5 5.5-6 5.5s-6-2.5-6-5.5Z" /><circle cx="7.3" cy="7.8" r="1.4" /><circle cx="10.6" cy="5.3" r="1.4" /><circle cx="13.4" cy="5.3" r="1.4" /><circle cx="16.7" cy="7.8" r="1.4" /></Svg>; }

/* --- Elfo --- */
export function IconRadiante(p) { return <Svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 3v2.4M12 18.6V21M21 12h-2.4M5.4 12H3M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7M18.4 18.4l-1.7-1.7M7.3 7.3 5.6 5.6" /></Svg>; }
export function IconNoctis(p) { return <Svg {...p}><path d="M15 4a9 9 0 1 0 0 16c-5-1-8-5-8-8s3-7 8-8Z" /></Svg>; }
export function IconCorvus(p) { return <Svg {...p}><path d="M10 3.5c2 3 3.3 5.5 3.3 7.6a3.3 3.3 0 1 1-6.6 0c0-2.1 1.3-4.6 3.3-7.6Z" /><path d="M16 9c2 .3 3.6 1.8 4 3.8-1.6.5-3-.1-4-1.3M16 9v9" /></Svg>; }
export function IconSeasus(p) { return <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5v17M3.5 12h17" /></Svg>; }
export function IconNatrus(p) { return <Svg {...p}><path d="M12 4c4.5 2 7 5.8 7 9.3 0 4.3-3.1 7.2-7 7.7-3.9-.5-7-3.4-7-7.7C5 9.8 7.5 6 12 4Z" /><path d="M12 7.5v12.8" /></Svg>; }

/* --- Dragonato --- */
export function IconTexoni(p) { return <Svg {...p}><path d="M12 4c3.3 1.9 5.2 5 5.2 8.4 0 2.9-2.1 5.3-5.2 6.3-3.1-1-5.2-3.4-5.2-6.3C6.8 9 8.7 5.9 12 4Z" /><path d="M12 7.3c1.9 1.6 3 3.6 3 5.6" /></Svg>; }
export function IconKutrefas(p) { return <Svg {...p}><path d="M12 4c2.6 3.6 4.3 6.4 4.3 8.8a4.3 4.3 0 1 1-8.6 0C7.7 10.4 9.4 7.6 12 4Z" /><circle cx="16.8" cy="7.5" r="0.9" fill="currentColor" stroke="none" /><circle cx="18.3" cy="10.3" r="0.6" fill="currentColor" stroke="none" /></Svg>; }
export function IconTerramak(p) { return <Svg {...p}><path d="M12 3.5c1.6 2.8 3.8 4.9 3.8 8.3a3.8 3.8 0 0 1-7.6 0c0-1.1.3-2 .8-2.9-.1 1.2.3 2 1.1 2.4-.4-2.4.2-5.1 1.9-7.8Z" /></Svg>; }
export function IconKurlav(p) { return <Svg {...p}><path d="M3 18l5.5-9 3 4.5 2-3L20 18Z" /></Svg>; }
export function IconHaxos(p) { return <Svg {...p}><path d="M8 11V8.3a1.6 1.6 0 1 1 3.2 0V11M11.2 11V7.6a1.6 1.6 0 1 1 3.2 0V11M14.4 11.3V8.6a1.6 1.6 0 1 1 3.2 0v5.7c0 3-2.2 5.2-5.3 5.2h-1.1c-2.7 0-4.4-1-5.6-2.9L4 13.8c-.5-.8-.3-1.7.5-2.1.7-.4 1.5-.1 2 .5l1.5 1.8" /></Svg>; }

/* --- Tengou --- */
export function IconAnjo(p) { return <Svg {...p}><ellipse cx="12" cy="9" rx="6" ry="2.2" /><ellipse cx="12" cy="9" rx="3.6" ry="1.1" /></Svg>; }
export function IconDemonio(p) { return <Svg {...p}><path d="M9 9c-.6-2.4-.2-4.7 1-6.3M15 9c.6-2.4.2-4.7-1-6.3M7.8 10.5a4.6 4.6 0 0 1 8.4 0" /></Svg>; }
export function IconFada(p) { return <Svg {...p}><path d="M12 12c0-5 3-9 7-9 1 4-1 8-7 9Z" /><path d="M12 12c0-5-3-9-7-9-1 4 1 8 7 9Z" /><path d="M13 8.5c1.5-.3 3-.2 4.3.4M11 8.5c-1.5-.3-3-.2-4.3.4" /></Svg>; }

export const RACAS = {
  humano: { label: "Humano", Icon: IconHumano, cor: "#5B6B7F" },
  niosh: { label: "Niosh", Icon: IconNiosh, cor: "#B5472F" },
  ningen: { label: "Ningen", Icon: IconNingen, cor: "#A8742A" },
  elfo: { label: "Elfo", Icon: IconElfo, cor: "#3B8F7A" },
  dragonato: { label: "Dragonato", Icon: IconDragonato, cor: "#6B4FA0" },
  tengou: { label: "Tengou", Icon: IconTengou, cor: "#C8A24A" },
};

export const HABILIDADES_RACIAIS = {
  mana_concentrada: { racaId: "humano", label: "Mana Concentrada", Icon: IconManaConcentrada, cor: "#2E9E5B" },
  mana_fluida: { racaId: "humano", label: "Mana Fluida", Icon: IconManaFluida, cor: "#2F6FDE" },
  mana_estatica: { racaId: "humano", label: "Mana Estática", Icon: IconManaEstatica, cor: "#D23B3B" },
  sharkan: { racaId: "niosh", label: "Sharkan", Icon: IconSharkan, cor: "#8A8420" },
  arcani: { racaId: "niosh", label: "Arcani", Icon: IconArcani, cor: "#C0309B" },
  sabato: { racaId: "niosh", label: "Sabato", Icon: IconSabato, cor: "#8E1F3A" },
  coelho_bode: { racaId: "ningen", label: "Coelho/Bode", Icon: IconCoelhoBode, cor: "#B88A3E" },
  leonino: { racaId: "ningen", label: "Leonino", Icon: IconLeonino, cor: "#D08B1E" },
  reptiliano: { racaId: "ningen", label: "Reptiliano", Icon: IconReptiliano, cor: "#1F8A70" },
  lobo_canino: { racaId: "ningen", label: "Lobo/Canino", Icon: IconLoboCanino, cor: "#5E7C9A" },
  urso: { racaId: "ningen", label: "Urso", Icon: IconUrso, cor: "#8B5A2B" },
  radiante: { racaId: "elfo", label: "Radiante", Icon: IconRadiante, cor: "#E0A800" },
  noctis: { racaId: "elfo", label: "Noctis", Icon: IconNoctis, cor: "#4B4FC4" },
  corvus: { racaId: "elfo", label: "Corvus", Icon: IconCorvus, cor: "#A1122B" },
  seasus: { racaId: "elfo", label: "Seasus", Icon: IconSeasus, cor: "#14A3A8" },
  natrus: { racaId: "elfo", label: "Natrus", Icon: IconNatrus, cor: "#3F8F3A" },
  texoni: { racaId: "dragonato", label: "Texoni", Icon: IconTexoni, cor: "#6C7A89" },
  kutrefas: { racaId: "dragonato", label: "Kutrefas", Icon: IconKutrefas, cor: "#7B3FBF" },
  terramak: { racaId: "dragonato", label: "Terramak", Icon: IconTerramak, cor: "#D9481C" },
  kurlav: { racaId: "dragonato", label: "Kurlav", Icon: IconKurlav, cor: "#7A5C3A" },
  haxos: { racaId: "dragonato", label: "Haxos", Icon: IconHaxos, cor: "#C2A13A" },
  anjo: { racaId: "tengou", label: "Anjo", Icon: IconAnjo, cor: "#B89B3A" },
  demonio: { racaId: "tengou", label: "Demônio", Icon: IconDemonio, cor: "#B5173A" },
  fada: { racaId: "tengou", label: "Fada", Icon: IconFada, cor: "#D14FA0" },
};

// Clareia uma cor hex em `percent` pontos de luminosidade HSL — deriva a
// variante "modo escuro" sem hardcodear 23 valores à mão. O Point não tem
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
