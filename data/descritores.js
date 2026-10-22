// Fonte única dos descritores do Point (21/10) — ver data/descritores.json
// (tabela cheia: id, nome, temN, tipo, status, resumo, regra, usadoEm,
// linkEmTextoLivre). Este arquivo só tem lógica pura (sem JSX/React), pra
// poder ser testado com node --test igual engine.js: resolução de token
// interno -> descritor do glossário, substituição do "N" na regra/resumo, e
// a detecção automática de nomes de descritor em texto corrido.
import DESCRITORES_DATA from "./descritores.json" with { type: "json" };

export const DESCRITORES = DESCRITORES_DATA.descritores;
export const TIPOS_DESCRITOR = ["Ataque", "Efeito extra", "Defesa", "Teste", "Mana", "Prioridade", "Condição", "Duração"];
export const DESCRITORES_POR_ID = Object.fromEntries(DESCRITORES.map((d) => [d.id, d]));

// snake_case interno (como os catálogos guardam hoje — character.descritores,
// arma.descritor1/2, magia.descritores, armadura.descritoresConcedidos; ex.
// "preciso_2", "em_area") -> id kebab-case do glossário. Não é um simples
// underscore->hífen (ex. potente_oficio_magico -> potente-oficio), por isso
// o mapa é explícito.
const ALIAS_BASE = {
  magia: "magia", em_area: "em-area", preciso: "preciso", esmagador: "esmagador",
  perfurante: "perfurante", letal: "letal", pesado: "pesado", queimadura: "queimadura",
  envenenamento: "envenenamento", carga: "carga", drenante: "drenante",
  repulsivo: "repulsivo", corrosivo: "corrosivo", blindado: "blindado",
  resistente: "resistente", firme: "firme", selado: "selado",
  campo_de_mana: "campo-de-mana", potente_forca: "potente-forca",
  potente_destreza: "potente-destreza", potente_oficio_magico: "potente-oficio",
  sortudo: "sortudo", azarado: "azarado", reabastecer: "reabastecer",
  veloz: "veloz", lento: "lento", atrasada: "atrasada", continuo: "continuo",
};

// Marcadores de PERSONAGEM que não são descritores do glossário — mecanismos
// internos que concedem um descritor real de forma condicional (ex.:
// "desarmado_letal" dá Letal só nos ataques desarmados) ou efeitos legados/
// retrocompatíveis sem entrada própria na tabela. Não aparecem na aba
// Descritores nem no pop-up "Ver na aba Descritores".
export const DESCRITORES_INTERNOS = {
  resiste_a_magia: { label: "Resiste a Magia", descricao: "Ao se defender de um ataque com o descritor Magia: rola 1 dado a menos e tem 1 sucesso sempre garantido." },
  desarmado_letal: { label: "Desarmado Letal", descricao: "Seus ataques desarmados são tratados como armas letais e contam como arma branca para habilidades." },
  desarmado_perfurante: { label: "Desarmado Perfurante", descricao: "Seus ataques desarmados ganham Perfurante (ignoram Blindado)." },
  sortudo_esquiva: { label: "Sortudo (esquiva)", descricao: "Como o Sortudo, mas só vale ao esquivar (defesa por Destreza): o primeiro dado que sair 1 ou 2 é re-rolado automaticamente, uma vez." },
  sortudo_fisico: { label: "Sortudo (físico)", descricao: "Como o Sortudo, mas só vale em rolagens de ataque físico (não mágico): o primeiro dado que sair 1 ou 2 é re-rolado automaticamente, uma vez." },
  imune_envenenamento: { label: "Imune a Envenenamento", descricao: "O descritor Envenenamento não tem nenhum efeito contra você." },
  ignora_blindado: { label: "Ignora Blindado", descricao: "Seus ataques físicos ignoram o efeito Blindado do alvo (retrocompatibilidade — nenhuma raça concede isso hoje)." },
  hp_maximo_1: { label: "+1 HP máximo", descricao: "Soma +1 ao HP máximo do personagem." },
  sp_maximo_menos_1: { label: "-1 SP máximo", descricao: "Subtrai 1 do SP máximo do personagem." },
  sp_maximo_1: { label: "+1 SP máximo", descricao: "Soma +1 ao SP máximo do personagem." },
  mp_maximo_1: { label: "+1 MP máximo", descricao: "Soma +1 ao MP máximo do personagem (até o teto de 6)." },
};

// Recebe um token interno (ex. "preciso_2", "em_area", "hp_maximo_1") e
// devolve { descritor, n } — descritor é a entrada do glossário e n é o
// número extraído (null se o descritor não tem N) — ou null se o token não
// corresponde a nenhum descritor do glossário (ver DESCRITORES_INTERNOS
// pros marcadores internos).
export function resolverDescritorToken(token) {
  if (!token || typeof token !== "string") return null;
  if (ALIAS_BASE[token]) {
    const d = DESCRITORES_POR_ID[ALIAS_BASE[token]];
    return d ? { descritor: d, n: null } : null;
  }
  const m = /^(.+)_(\d+)$/.exec(token);
  if (m) {
    const base = ALIAS_BASE[m[1]];
    const d = base ? DESCRITORES_POR_ID[base] : null;
    if (d && d.temN) return { descritor: d, n: Number(m[2]) };
  }
  return null;
}

// Nome pra exibir um token (com o N, se houver) — "preciso_2" -> "Preciso 2".
export function nomeDoToken(token) {
  const resolvido = resolverDescritorToken(token);
  if (resolvido) return resolvido.n != null ? `${resolvido.descritor.nome} ${resolvido.n}` : resolvido.descritor.nome;
  if (DESCRITORES_INTERNOS[token]) return DESCRITORES_INTERNOS[token].label;
  return token;
}

// Substitui o "N" solto (maiúsculo, palavra isolada) por um número — usado
// no resumo/regra do pop-up quando o descritor tem grau (Preciso 2,
// Queimadura 3, Firme 1...).
export function textoComN(texto, n) {
  if (n == null || !texto) return texto;
  return texto.replace(/(?<![A-Za-zÀ-ÖØ-öø-ÿ])N(?![A-Za-zÀ-ÖØ-öø-ÿ])/g, String(n));
}

// --- Detecção automática em texto corrido ---------------------------------

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Variantes (maiúsculas+minúsculas, acentuadas ou não) de cada letra-base —
// usadas pra montar uma classe de caracteres por posição do nome, pra
// "sem diferenciar acento" valer nos dois sentidos: o nome do glossário já
// vem acentuado ("Em área"), mas o texto bate também sem acento ("Em area").
const VARIANTES_POR_BASE = {
  a: "aàáâãäAÀÁÂÃÄ", e: "eèéêëEÈÉÊË", i: "iìíîïIÌÍÎÏ", o: "oòóôõöOÒÓÔÕÖ",
  u: "uùúûüUÙÚÛÜ", c: "cçCÇ", n: "nñNÑ",
};
// Só as variantes maiúsculas de cada base — pra exigir "inicial maiúscula
// como no glossário" na primeira letra do nome, sem travar em qual acento.
const VARIANTES_MAIUSCULA_POR_BASE = {
  a: "AÀÁÂÃÄ", e: "EÈÉÊË", i: "IÌÍÎÏ", o: "OÒÓÔÕÖ", u: "UÙÚÛÜ", c: "CÇ",
};
// char (de qualquer caixa/acento) -> letra-base, pra achar a entrada certa
// nos dois mapas acima a partir de um caractere do PRÓPRIO nome (que já
// pode vir acentuado, ex. o "á" de "área").
const BASE_POR_CHAR = {};
for (const [base, variantes] of Object.entries(VARIANTES_POR_BASE)) {
  for (const v of variantes) BASE_POR_CHAR[v.toLowerCase()] = base;
}
const LIMITE_LETRA = "A-Za-zÀ-ÖØ-öø-ÿ";

function construirRegexNomeDescritor(descritor) {
  const nome = descritor.nome;
  let padrao = "";
  for (let i = 0; i < nome.length; i++) {
    const ch = nome[i];
    const base = BASE_POR_CHAR[ch.toLowerCase()];
    if (i === 0) {
      const variantes = base ? VARIANTES_MAIUSCULA_POR_BASE[base] : null;
      padrao += variantes ? `[${variantes}]` : escapeRegExp(ch);
    } else {
      const variantes = base ? VARIANTES_POR_BASE[base] : null;
      padrao += variantes ? `[${variantes}]` : escapeRegExp(ch);
    }
  }
  const limiteAntes = `(?<![${LIMITE_LETRA}])`;
  const limiteDepois = descritor.temN
    ? `(?:\\s+(-?\\d+))?(?![${LIMITE_LETRA}0-9])`
    : `(?![${LIMITE_LETRA}])`;
  return new RegExp(`${limiteAntes}${padrao}${limiteDepois}`, "g");
}

// Descritores elegíveis pra link em texto corrido (linkEmTextoLivre: true),
// do nome mais longo pro mais curto — evita que um nome mais curto "ganhe"
// de um mais longo que o contém (ex. nenhum caso hoje, mas protege o
// futuro).
const CANDIDATOS_TEXTO_LIVRE = DESCRITORES
  .filter((d) => d.linkEmTextoLivre)
  .slice()
  .sort((a, b) => b.nome.length - a.nome.length);

// Recebe um texto solto (efeito de habilidade, descrição de magia, etc.) e
// devolve um array de "partes": strings (texto comum) e objetos
// { descritorId, n, texto } (o trecho que bate com um nome do glossário,
// com a inicial maiúscula como no glossário — ver CANDIDATOS_TEXTO_LIVRE).
// Só descritores com linkEmTextoLivre:true entram aqui; os demais (Magia,
// Em área, Pesado, Veloz, Resistente) só viram componente quando vêm de um
// campo estruturado (ver resolverDescritorToken), nunca por este caminho.
export function marcarDescritoresNoTexto(texto) {
  if (!texto || typeof texto !== "string") return [texto];
  const achados = [];
  for (const d of CANDIDATOS_TEXTO_LIVRE) {
    const re = construirRegexNomeDescritor(d);
    let m;
    while ((m = re.exec(texto))) {
      achados.push({ start: m.index, end: m.index + m[0].length, descritorId: d.id, n: m[1] != null ? Number(m[1]) : null });
    }
  }
  if (achados.length === 0) return [texto];
  achados.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
  const escolhidos = [];
  let cursor = 0;
  for (const a of achados) {
    if (a.start < cursor) continue; // sobreposição — já coberto por um achado anterior (mais longo ou mais à esquerda)
    escolhidos.push(a);
    cursor = a.end;
  }
  const partes = [];
  let pos = 0;
  for (const a of escolhidos) {
    if (a.start > pos) partes.push(texto.slice(pos, a.start));
    partes.push({ descritorId: a.descritorId, n: a.n, texto: texto.slice(a.start, a.end) });
    pos = a.end;
  }
  if (pos < texto.length) partes.push(texto.slice(pos));
  return partes;
}
