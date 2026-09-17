// Motor de combate do Point (universo Amaranth) — extraído de point-amaranth-app.jsx
// pra poder ser testado com Node puro, sem depender de React/JSX/ícones.
// point-amaranth-app.jsx importa deste módulo — esta é a fonte única da lógica
// de regras. Não duplique estas funções de volta no jsx.
//
// Ver SISTEMA.md para as regras em prosa, e CONTEXTO.md para o "porquê" de
// cada decisão de design (ex: por que as defensivas re-rolam em vez de anular).

export const GRADE_VALUE = { E: 1, D: 2, C: 3, B: 4, A: 5 };
export const GRADE_ORDER = ["E", "D", "C", "B", "A"];

// Atributos de Combate — ESVAZIADO de propósito: Magia, Técnica, Sorte, Defesa,
// Resistência Física e Resistência Mágica saíram de aqui. Magia se dividiu em
// duas Proficiências (Magias Ofensivas pro ataque, Magias Gerais no Mental);
// Defesa/Resistência Física/Resistência Mágica agora são só as Proficiências de
// Combate com o mesmo nome; Sorte foi removida (não tem substituto ainda);
// Técnica também foi removida (as habilidades que usavam ela como limiar vão
// ganhar outro atributo/proficiência depois - por enquanto ficam sem limiar
// especial, seguindo o padrão normal).
export const ATTR_LIST = [];

// Atributos Gerais — Físicos, Sociais e Mentais, adaptados de Vampiro: A Máscara
// (V5). Força e Destreza MUDARAM pra cá (saíram dos Atributos de Combate acima -
// essa era a duplicação "paralela" que existia antes, agora substituída de vez).
// Vigor (Stamina) é novo, não existia antes do sistema Mascarade.
export const ATRIBUTOS_GERAIS_LIST = [
  { key: "forca", label: "Força", categoria: "fisica" },
  { key: "destreza", label: "Destreza", categoria: "fisica" },
  { key: "vigor", label: "Vigor", categoria: "fisica" },
  { key: "carisma", label: "Carisma", categoria: "social" },
  { key: "manipulacao", label: "Manipulação", categoria: "social" },
  { key: "compostura", label: "Compostura", categoria: "social" },
  { key: "inteligencia", label: "Inteligência", categoria: "mental" },
  { key: "perspicacia", label: "Perspicácia", categoria: "mental" },
  { key: "resolucao", label: "Resolução", categoria: "mental" },
];

export const ATRIBUTOS_GERAIS_DEFAULT = {
  forca: "E", destreza: "E", vigor: "E",
  carisma: "E", manipulacao: "E", compostura: "E",
  inteligencia: "E", perspicacia: "E", resolucao: "E",
};

// Atributos que "moraram" nos Atributos de Combate mas agora vivem nos Atributos
// Gerais (Força, Destreza) — usado pra ler o grau certo independente de onde o
// resto do código está procurando.
export const ATRIBUTOS_GERAIS_KEYS = new Set(ATRIBUTOS_GERAIS_LIST.map((a) => a.key));
export function getAttrGrade(character, key) {
  if (ATRIBUTOS_GERAIS_KEYS.has(key)) return character?.atributosGerais?.[key];
  return character?.attributes?.[key];
}

// Proficiências — perícias adaptadas de Vampiro: A Máscara (V5), traduzidas e
// organizadas nas 3 categorias do livro (Física, Social, Mental). Usam o mesmo
// grau E–A dos atributos.
export const PROFICIENCIAS_LIST = [
  // Combate — perícias usadas nos cálculos de combate (somam com o atributo correspondente)
  { key: "briga", label: "Briga", categoria: "combate" },
  { key: "armasDeFogo", label: "Armas de Fogo", categoria: "combate" },
  { key: "combateCorpoACorpo", label: "Combate Corpo a Corpo", categoria: "combate" },
  { key: "magiasOfensivas", label: "Magias Ofensivas", categoria: "combate" },
  { key: "defesaProf", label: "Defesa", categoria: "combate" },
  { key: "resistFisicaProf", label: "Resistência Física", categoria: "combate" },
  { key: "resistMagicaProf", label: "Resistência Mágica", categoria: "combate" },
  { key: "tecnicaProf", label: "Técnica", categoria: "combate" },
  // Física (não-combate)
  { key: "atletismo", label: "Atletismo", categoria: "fisica" },
  { key: "oficio", label: "Ofício", categoria: "fisica" },
  { key: "conducao", label: "Condução", categoria: "fisica" },
  { key: "roubo", label: "Roubo", categoria: "fisica" },
  { key: "furtividade", label: "Furtividade", categoria: "fisica" },
  { key: "sobrevivencia", label: "Sobrevivência", categoria: "fisica" },
  { key: "empatiaAnimal", label: "Empatia Animal", categoria: "social" },
  { key: "etiqueta", label: "Etiqueta", categoria: "social" },
  { key: "intuicao", label: "Intuição", categoria: "social" },
  { key: "intimidacao", label: "Intimidação", categoria: "social" },
  { key: "lideranca", label: "Liderança", categoria: "social" },
  { key: "atuacao", label: "Atuação", categoria: "social" },
  { key: "persuasao", label: "Persuasão", categoria: "social" },
  { key: "malandragem", label: "Malandragem", categoria: "social" },
  { key: "subterfugio", label: "Subterfúgio", categoria: "social" },
  { key: "academicos", label: "Acadêmicos", categoria: "mental" },
  { key: "percepcao", label: "Percepção", categoria: "mental" },
  { key: "financas", label: "Finanças", categoria: "mental" },
  { key: "investigacao", label: "Investigação", categoria: "mental" },
  { key: "medicina", label: "Medicina", categoria: "mental" },
  { key: "ocultismo", label: "Ocultismo", categoria: "mental" },
  { key: "magiasGerais", label: "Magias Gerais", categoria: "mental" },
  { key: "politica", label: "Política", categoria: "mental" },
  { key: "ciencia", label: "Ciência", categoria: "mental" },
  { key: "tecnologia", label: "Tecnologia", categoria: "mental" },
];

export const PROFICIENCIAS_DEFAULT = PROFICIENCIAS_LIST.reduce((acc, p) => ({ ...acc, [p.key]: "E" }), {});

export const STAT_LIST = [
  { key: "acerto", label: "Acerto" },
  { key: "defesa", label: "Defesa" },
  { key: "resistArmadura", label: "Resistência Armadura" },
  { key: "resistNaturalFisica", label: "Resistência Natural Física" },
  { key: "resistNaturalMagica", label: "Resistência Natural Mágica" },
  { key: "geral", label: "Geral" },
];

// Vínculo padrão sugerido entre atributo e estatística de combate — o grau do
// atributo (E=0 a A=+4) soma automaticamente na estatística vinculada.
// Isso é uma SUGESTÃO ajustável por ficha (não uma regra confirmada no material
// original) — dá pra reatribuir por personagem em "Vínculos de atributo".
export const DEFAULT_STAT_LINKS = {
  acerto: ["destreza"],
  defesa: [],
  resistArmadura: [],
  resistNaturalFisica: [],
  resistNaturalMagica: [],
  geral: [],
};

export const STAT_BASE_DEFAULTS = { acerto: 0, defesa: 8, resistArmadura: 8, resistNaturalFisica: 6, resistNaturalMagica: 6, geral: 0 };

// Catálogo NOVO de Habilidades Passivas de Combate — substitui o sistema antigo
// (as 92 habilidades ficam arquivadas na aba Habilidades, só como referência).
// Cada uma dispara sozinha, olhando um dado que JÁ foi rolado (Acerto ou
// Confirmação) contra um limiar definido por um atributo do dono da habilidade
// (o mesmo limiar usado pro crítico: 11 - grau do atributo => E=10, D=9, C=8,
// B=7, A=6). Se dois procs poderiam disparar no mesmo dado, só o de maior
// "prioridade" ativa. Cada ficha só pode ter até 2 dessas equipadas, e a
// Singularidade conta como a terceira habilidade "ativa" do personagem.
export const PROC_ABILITIES = [
  {
    id: "furia_crescente",
    nome: "Mestre do Crítico",
    gatilho: "acerto_proprio",
    // Sem atributo/proficiência de limiar - o efeito agora é um -1 flat no valor
    // necessário pra critico (pedido explicito: um limiar variável por atributo
    // seria forte demais aqui).
    prioridade: 3,
    reduzCriticoEm: 1,
    efeito: "Reduz em 1 o valor necessário pra tirar crítico no Acerto (crítico com 9+ em vez de só 10) — vale pra TODOS os críticos da rolagem. Lembrando: um crítico soma +1 ao próprio dado antes de comparar com a Defesa do alvo (não é sucesso automático), e também soma +1 na Confirmação que aquele sucesso gerar.",
  },
  {
    id: "golpe_certeiro",
    nome: "Golpe Preciso",
    gatilho: "acerto_proprio",
    proficienciaLimiar: "tecnicaProf",
    prioridade: 2,
    efeito: "Quando um dado do seu Acerto bate o limiar da sua Proficiência de Técnica, esse dado conta como 2 sucessos em vez de 1 — só pode disparar uma vez por ataque.",
  },
  {
    id: "fortaleza_viva",
    nome: "Giro Defensivo",
    gatilho: "confirmacao_recebida",
    proficienciaLimiar: "tecnicaProf",
    prioridade: 2,
    efeito: "Quando um dado de Confirmação inimiga contra você bate o limiar da sua Proficiência de Técnica, esse dado é re-rolado uma vez — vale o novo valor.",
  },
  {
    id: "surto_arcano",
    nome: "Potencial Mágico Ofensivo",
    gatilho: "confirmacao_propria",
    proficienciaLimiar: "magiasOfensivas",
    prioridade: 2,
    restricaoTipo: "magico",
    efeito: "Em ataques Mágicos, quando um dado da sua Confirmação bate o limiar da sua Proficiência de Magias Ofensivas, soma +1 no Dano dessa confirmação.",
  },
  {
    id: "reflexo_agil",
    nome: "Borrão",
    gatilho: "acerto_recebido",
    proficienciaLimiar: "tecnicaProf",
    prioridade: 1,
    efeito: "Quando um dado do Acerto inimigo contra você bate o limiar da sua Proficiência de Técnica, esse dado é re-rolado uma vez — vale o novo valor.",
  },
  {
    id: "instinto_selvagem",
    nome: "Ataque Poderoso",
    gatilho: "acerto_proprio",
    atributoLimiar: "forca",
    prioridade: 1,
    restricaoTipo: "marcial",
    concedeEfeito: "impacto",
    efeito: "Em ataques Marciais, quando um dado do seu Acerto bate o limiar de Força, soma mais uma instância de IMPACTO ao ataque (mesmo se ele já tiver) — lembrando que várias instâncias de IMPACTO não rolam vários dados: cada instância extra só soma +1 no dado de IMPACTO antes de checar a tabela.",
  },
  {
    id: "blindagem_reativa",
    nome: "Mestre em Armadura",
    gatilho: "passivo_armadura",
    efeito: "Sempre ativa (não precisa bater limiar de dado): sua Armadura só quebra depois de ser superada pela SEGUNDA vez, em vez da primeira.",
  },
  {
    id: "escudo_de_mana",
    nome: "Escudo de Mana",
    gatilho: "passivo_escudo_mana",
    efeito: "Sempre ativa (não precisa bater limiar de dado): cria uma camada extra ANTES da Armadura, valendo 8 + bônus da Proficiência de Magias Ofensivas. As confirmações checam o Escudo de Mana primeiro — a primeira que igualar/superar o rompe (igual uma Armadura) — só depois disso passam a checar a Armadura de verdade (se houver) e por fim a Resistência Natural.",
  },
  {
    id: "golpe_penetrante",
    nome: "Golpe Penetrante",
    gatilho: "passivo_ignora_armadura",
    efeito: "Sempre ativa (não precisa bater limiar de dado): seus ataques físicos ignoram a Resistência Armadura do alvo — as confirmações vão direto pra Resistência Natural, mesmo que o alvo tenha armadura equipada. Além disso, com sua Proficiência de Técnica em grau C ou mais, soma +1 na Confirmação de dano; sendo grau A, soma mais +1 (total +2).",
  },
  {
    id: "persistente",
    nome: "Persistente",
    gatilho: "passivo_recurso",
    efeito: "Sempre ativa (não precisa bater limiar de dado): soma +1 no HP máximo e +1 no SP máximo.",
  },
  {
    id: "toque_flamejante",
    nome: "Magia Pyro",
    gatilho: "acerto_proprio",
    proficienciaLimiar: "magiasOfensivas",
    prioridade: 1,
    restricaoTipo: "magico",
    concedeEfeito: "chamas",
    efeito: "Em ataques Mágicos, quando um dado do seu Acerto bate o limiar da sua Proficiência de Magias Ofensivas, soma mais uma instância de CHAMAS à magia (mesmo se ela já tiver) — lembrando que várias instâncias de CHAMAS rolam um 1d10 de confirmação A MAIS cada (sem bônus, ferida 1), diferente do IMPACTO que só soma no mesmo dado.",
  },
];

// Categoriza cada Habilidade Passiva de Combate pela área que ela afeta, direto
// a partir do gatilho: acerto_proprio -> Ataque, confirmacao_propria -> Confirmação
// de Dano, acerto_recebido -> Defesa, confirmacao_recebida/passivo_armadura -> Resistência.
export function categoriaDaHabilidade(p) {
  if (p.gatilho === "acerto_proprio" || p.gatilho === "passivo_ignora_armadura") return "ataque";
  if (p.gatilho === "confirmacao_propria") return "confirmacao";
  if (p.gatilho === "acerto_recebido") return "defesa";
  if (p.gatilho === "confirmacao_recebida" || p.gatilho?.startsWith("passivo_")) return "resistencia";
  return "ataque";
}

// Mesma lista de PROC_ABILITIES, mas agrupada por categoria (Ataque, Confirmação de
// Dano, Defesa, Resistência) — usada em todo lugar que lista as habilidades, pra
// sempre aparecerem juntas as do mesmo tipo.
export const CATEGORIA_ORDEM = ["ataque", "confirmacao", "defesa", "resistencia"];
export const PROC_ABILITIES_AGRUPADAS = [...PROC_ABILITIES].sort(
  (a, b) => CATEGORIA_ORDEM.indexOf(categoriaDaHabilidade(a)) - CATEGORIA_ORDEM.indexOf(categoriaDaHabilidade(b))
);

// Tipos de Ataque — define automaticamente qual atributo entra no Acerto e qual
// entra no Dano (confirmação). Substitui o antigo par zona+atributoBase.
export const TIPOS_ATAQUE = {
  marcial: { label: "Marcial", acertoAttr: "destreza", danoAttr: "forca", resistKey: "resistNaturalFisica" },
  arma_de_fogo: { label: "Arma de fogo", acertoAttr: "destreza", danoAttr: null, resistKey: "resistNaturalFisica" },
  // Mágico não soma mais atributo nenhum no Dano - a Magia (atributo) foi dividida:
  // o lado de ataque virou a Proficiência "Magias Ofensivas" (já entra via profKey
  // do próprio ataque), e o lado geral virou a Proficiência Mental "Magias Gerais".
  magico: { label: "Mágico", acertoAttr: null, danoAttr: null, resistKey: "resistNaturalMagica" },
};

// Catálogo de Tipos de Ataque Base — formas de atacar em sua forma genérica,
// sem estar ligadas a nenhum personagem específico. Um personagem "aprende" um
// destes e ele vira uma entrada na sua tabela de Ataques (podendo variar os
// bônus manuais, se fizer sentido narrativamente).
// Campos: tipo (marcial/arma_de_fogo/magico — define os atributos automaticamente),
// acerto (bônus manual no Acerto), dano (bônus manual na rolagem de Confirmação, 1 por
// sucesso), ferida (valor fixo por confirmação bem-sucedida).
export const BASE_ATTACK_TYPES = [
  {
    id: "soco", profKey: "briga",
    nome: "Ataque desarmado",
    categoria: "Corpo a corpo — desarmado",
    caracteristicas: ["físico", "corpo a corpo"],
    tipo: "marcial",
    acerto: "+1",
    dano: "0",
    ferida: "1",
    descricao: "Ataque desarmado básico (soco, chute, etc). Acerto: 3d10 +1 + bônus de Destreza vs Defesa do alvo, gera sucessos. Confirmação: para cada sucesso, rola 1d10 + Força vs Resistência Física do alvo — a ferida final é a quantidade de confirmações que passaram (1 por confirmação, por ser Marcial).",
  },
  {
    id: "arma_branca", profKey: "combateCorpoACorpo",
    nome: "Arma branca",
    categoria: "Corpo a corpo — arma",
    caracteristicas: ["físico", "corpo a corpo"],
    tipo: "marcial",
    acerto: "0",
    dano: "+1",
    ferida: "1",
    descricao: "Arma branca comum (espada, adaga, etc). Acerto: Destreza, sem bônus/penalidade. Confirmação: 1d10 + Força + 1 (bônus da arma) vs Resistência Física — a ferida final é a quantidade de confirmações que passaram (1 por confirmação, por ser Marcial).",
  },
  {
    id: "arma_branca_pesada", profKey: "combateCorpoACorpo",
    nome: "Arma branca pesada",
    categoria: "Corpo a corpo — arma",
    caracteristicas: ["físico", "corpo a corpo"],
    tipo: "marcial",
    acerto: "-1",
    dano: "+2",
    ferida: "1",
    descricao: "Arma branca de duas mãos — menos precisa, mais confirmação. Acerto: Destreza -1. Confirmação: 1d10 + Força + 2 vs Resistência Física — a ferida final é a quantidade de confirmações que passaram (1 por confirmação, por ser Marcial).",
  },
  {
    id: "mosquetao", profKey: "armasDeFogo",
    nome: "Mosquete",
    categoria: "À distância",
    caracteristicas: ["físico", "longa distância"],
    tipo: "arma_de_fogo",
    tipoAtaque: "Distância, carga 1",
    acerto: "-1",
    dano: "+4",
    ferida: "2",
    descricao: "Arma de fogo de longa distância, carrega antes de atirar. Acerto: Destreza -1. Confirmação: 1d10 + 4 (valor da arma, sem somar atributo) vs Resistência Física. 2 de ferimento por confirmação.",
  },
  {
    id: "revolver", profKey: "armasDeFogo",
    nome: "Revólver",
    categoria: "À distância",
    caracteristicas: ["físico", "longa distância"],
    tipo: "arma_de_fogo",
    tipoAtaque: "Distância (alcance 6), carga",
    acerto: "0",
    dano: "+2",
    ferida: "2",
    descricao: "Arma de fogo curta, sem precisar mudar de zona pra usar. Acerto: Destreza. Confirmação: 1d10 + 2 (valor da arma, sem somar atributo) vs Resistência Física. 2 de ferimento por confirmação.",
  },
  {
    id: "morteiro_pesado", profKey: "armasDeFogo",
    nome: "Morteiro pesado",
    categoria: "À distância — área",
    caracteristicas: ["físico", "longa distância"],
    tipo: "arma_de_fogo",
    tipoAtaque: "Distância, carga 1",
    acerto: "S (da carga)",
    cargaTest: "Antes de atirar, gasta 1 turno de carga: rola 3d10 sem atributo, sucesso >5. Os sucessos obtidos (S) viram o bônus de Acerto do disparo no turno seguinte.",
    dano: "6",
    ferida: "1",
    modificadores: ["Prioridade -1"],
    descricao: "Arma de área/indireta. Precisa carregar 1 turno antes de disparar (teste de carga: 3d10, sucesso >5 — os sucessos viram o bônus de Acerto do disparo). Confirmação do disparo: 1d10 + 6 (valor da arma, sem somar atributo) vs Resistência, 1 de ferimento por confirmação.",
  },
  {
    id: "shin", profKey: "magiasOfensivas",
    nome: "Shin",
    categoria: "Mágico",
    caracteristicas: ["mágico", "área"],
    tipo: "magico",
    custoMp: 1,
    acerto: "+3",
    dano: "+1",
    ferida: "1",
    descricao: "Magia de mana pura em área. Acerto: +3 (só o valor da magia, sem atributo). Confirmação: 1d10 + 1 + Magia vs Resistência Mágica. 1 de ferimento por confirmação.",
  },
  {
    id: "tiro_magico", profKey: "magiasOfensivas",
    nome: "Tiro mágico",
    categoria: "Mágico",
    caracteristicas: ["mágico", "distância"],
    tipo: "magico",
    custoMp: 1,
    acerto: "+2",
    dano: "+1",
    ferida: "1",
    descricao: "Magia de mana pura à distância. Acerto: +2 (só o valor da magia). Confirmação: 1d10 + 1 + Magia vs Resistência Mágica. 1 de ferimento por confirmação.",
  },
  {
    id: "torrente_magica", profKey: "magiasOfensivas",
    nome: "Torrente mágica",
    categoria: "Mágico",
    caracteristicas: ["mágico", "distância", "curta"],
    tipo: "magico",
    custoMp: 2,
    acerto: "+1",
    dano: "+1",
    ferida: "1",
    descricao: "Magia de mana pura, distância ou curta. Acerto: +1 (só o valor da magia). Confirmação: 1d10 + 1 + Magia vs Resistência Mágica. 1 de ferimento por confirmação.",
  },
  {
    id: "bombardeio_de_mana", profKey: "magiasOfensivas",
    nome: "Bombardeio de mana",
    categoria: "Mágico",
    caracteristicas: ["mágico", "área"],
    tipo: "magico",
    custoMp: 2,
    acerto: "2S",
    dano: "+1",
    ferida: "1",
    descricao: "Magia de mana pura em área. Não rola Acerto — já considera 2 sucessos fixos e vai direto pra Confirmação. Confirmação: 1d10 + 1 + Magia vs Resistência Mágica, para cada um dos 2 sucessos. 1 de ferimento por confirmação.",
  },
];

export function attrBonus(grade) {
  // E=0, D=1, C=2, B=3, A=4
  return Math.max(0, (GRADE_VALUE[grade] || 1) - 1);
}

// Vigor (Atributo Geral físico) determina o máximo de HP: E=2, D=3, C=4, B=5, A=6.
// Os outros Atributos Gerais (Carisma, Manipulação, Compostura, Inteligência,
// Perspicácia, Resolução) não têm função de combate - servem pra testes
// interpretativos fora de combate, sem afetar nada aqui no motor.
// Persistente (habilidade passiva, sempre ativa) soma +1 no HP máximo e +1 no SP máximo.
export function computeMaxHP(character) {
  const bonusPersistente = (character?.procs || []).includes("persistente") ? 1 : 0;
  return 2 + attrBonus(character?.atributosGerais?.vigor) + bonusPersistente;
}

export function computeMaxSP(character) {
  const base = character?.sp?.max ?? 3;
  const bonusPersistente = (character?.procs || []).includes("persistente") ? 1 : 0;
  return base + bonusPersistente;
}

// Avalia formulas simples do tipo "+1", "-1", "0" para bonus manuais de ataque.
export function parseFlatBonus(value) {
  if (value === undefined || value === null || value === "") return 0;
  const num = Number(String(value).replace(",", "."));
  return isNaN(num) ? 0 : num;
}

export function limiarDaHabilidade(character, p) {
  const attrs = p.atributosLimiar || (p.atributoLimiar ? [p.atributoLimiar] : []);
  const profs = p.proficienciasLimiar || (p.proficienciaLimiar ? [p.proficienciaLimiar] : []);
  const limiaresAttr = attrs.map((a) => 11 - (GRADE_VALUE[getAttrGrade(character, a)] || 1));
  const limiaresProf = profs.map((k) => 11 - (GRADE_VALUE[character?.proficiencias?.[k]] || 1));
  const todos = [...limiaresAttr, ...limiaresProf];
  if (todos.length === 0) return 10;
  return Math.min(...todos); // usa o melhor (mais baixo) limiar entre todas as fontes da habilidade
}

export function attrLabelDaHabilidade(p) {
  const attrs = p.atributosLimiar || (p.atributoLimiar ? [p.atributoLimiar] : []);
  const profs = p.proficienciasLimiar || (p.proficienciaLimiar ? [p.proficienciaLimiar] : []);
  const attrLabels = attrs.map((a) => (ATTR_LIST.find((x) => x.key === a) || ATRIBUTOS_GERAIS_LIST.find((x) => x.key === a))?.label);
  const profLabels = profs.map((k) => PROFICIENCIAS_LIST.find((x) => x.key === k)?.label);
  return [...attrLabels, ...profLabels].filter(Boolean).join(" ou ");
}

export function findTriggeredProc(character, gatilho, dieValue, attackTipo) {
  const procIds = character?.procs || [];
  if (!procIds.length) return null;
  const matching = PROC_ABILITIES.filter((p) => {
    if (p.id === "furia_crescente") return false; // Mestre do Crítico é tratado à parte (muda o limiar de crítico, não é um proc de "olhar dado já rolado")
    if (!procIds.includes(p.id) || p.gatilho !== gatilho) return false;
    if (p.restricaoTipo && p.restricaoTipo !== attackTipo) return false;
    const limiar = limiarDaHabilidade(character, p);
    return dieValue >= limiar;
  });
  if (matching.length === 0) return null;
  return matching.sort((a, b) => b.prioridade - a.prioridade)[0];
}

// Cada estatística de combate pode ter uma Proficiência de Combate correspondente
// que soma junto com os atributos vinculados (Defesa, Resistência Física/Mágica).
export const STAT_PROF_LINK = { defesa: "defesaProf", resistNaturalFisica: "resistFisicaProf", resistNaturalMagica: "resistMagicaProf" };

export function computeStat(character, statKey) {
  const base = (character.statBase && character.statBase[statKey]) ?? STAT_BASE_DEFAULTS[statKey] ?? 0;
  const temp = (character.statTemp && character.statTemp[statKey]) ?? 0;
  const links = (character.statLinks && character.statLinks[statKey]) ?? DEFAULT_STAT_LINKS[statKey] ?? [];
  const fromAttrs = links.reduce((sum, attrKey) => sum + attrBonus(getAttrGrade(character, attrKey)), 0);
  const profKey = STAT_PROF_LINK[statKey];
  const fromProf = profKey ? attrBonus(character.proficiencias?.[profKey]) : 0;
  return base + fromAttrs + fromProf + temp;
}

// Rola N dados de 10, sucesso se dado > limiar (customizável, padrão 5). Um 10
// natural sempre conta como sucesso e como crítico, mesmo abaixo do limiar.
export function rollSuccessDice(totalDice, limiar = 5) {
  const dice = Array.from({ length: Math.max(1, totalDice) }, () => Math.floor(Math.random() * 10) + 1);
  const successes = dice.filter((d) => d === 10 || d > limiar).length;
  const criticos = dice.filter((d) => d === 10).length;
  const superSucesso = successes >= 3;
  return { dice, successes, criticos, superSucesso };
}

// Resolucao de combate ajustada nas sessoes de revisao (difere do texto bruto dos
// docs - ver nota na aba Regras). Duas etapas, cada uma com sua propria rolagem:
// 1) Acerto: rola 3d10. Critico e sempre um 10 natural (Sorte nao afeta mais isso -
//    virou o atributo que governa as Habilidades Passivas de Combate). Um dado
//    critico soma +1 a si mesmo antes de comparar com o limiar (nao e sucesso
//    automatico) - e tambem soma +1 na rolagem de confirmacao que esse sucesso gerar.
//    Cada dado conta sucesso (S) se (dado + bonus do ataque + bonus de critico) > Defesa
//    do alvo (a Defesa ja inclui a base 5 embutida, nao soma de novo aqui).
// 2) Confirmacao: PARA CADA sucesso obtido no Acerto, rola 1d10 + bonus de dano do
//    ataque (+1 extra se esse sucesso veio de um dado critico). A Armadura funciona
//    como um escudo de uso unico: confirmacoes checam a Armadura em ordem ate uma
//    romper (iguala/supera seu valor) - a partir dali, checam a Resistencia Natural
//    correspondente ao tipo do ataque (Fisica para Marcial/Arma de fogo, Magica para
//    Magico). Cada confirmacao bem-sucedida causa Ferida (valor fixo por acerto
//    confirmado, definido no proprio ataque - padrao 1).
// Habilidades Passivas de Combate (procs) - efeitos aplicados AUTOMATICAMENTE:
//  - furia_crescente (nome: Mestre do Crítico): reduz o limiar de critico no Acerto
//    em 1 flat (9+ em vez de 10) - vale pra TODOS os criticos da rolagem. Tratado a
//    parte, fora do sistema generico de findTriggeredProc.
//  - golpe_certeiro: aquele dado de Acerto conta como 2 sucessos em vez de 1 - so uma vez por ataque.
//  - fortaleza_viva: aquele dado de confirmacao inimiga eh re-rolado uma vez (nao
//    anula mais o hit direto - anular deixava Resistencia alta "inquebravel",
//    ja que os dados que fariam a confirmacao passar sao os mesmos que disparam
//    a habilidade).
//  - surto_arcano: +1 na rolagem daquela confirmacao (magico).
//  - reflexo_agil: aquele dado de acerto inimigo eh re-rolado uma vez (mesma logica
//    da fortaleza_viva - re-rolar em vez de anular).
//  - blindagem_reativa (nome: Mestre em Armadura): passiva SEMPRE ativa, nao depende
//    de bater limiar de dado - com ela equipada, a Armadura so quebra na SEGUNDA vez
//    que for superada em vez da primeira (dentro do mesmo ataque).
//  - instinto_selvagem (nome: Ataque Poderoso): em ataques Marciais, quando um dado
//    do Acerto bate o limiar de Força, soma mais uma instancia de IMPACTO (mesmo se
//    ja tiver - instancias extras so somam +1 no dado de IMPACTO, nao rolam de novo).
//  - toque_flamejante (nome: Magia Pyro): mesma logica, mas com limiar de Magia em
//    ataques Magicos, somando mais uma instancia de CHAMAS (cada instancia de CHAMAS
//    rola 1d10 separado, diferente do IMPACTO).
// Etapa 2 (Confirmacao + IMPACTO/CHAMAS + Ferida final) extraida em funcao propria
// pra poder ser chamada de novo depois que um dado do Acerto for alterado (gastando
// MP/SP no Confronto), sem precisar re-rolar o Acerto inteiro.
export function resolveConfirmationPhase({ attacker, defender, attack, successes, successFlags, successCritOrder, fixedSuccessMatch }) {
  const tipoInfo = TIPOS_ATAQUE[attack.tipo] || TIPOS_ATAQUE.marcial;
  // IMPACTO e CHAMAS: efeitos que disparam "quando o ataque faz contato" (successes>0),
  // uma vez por ataque (nao por dado de confirmacao). Podem vir do texto do proprio ataque
  // (campo Efeito menciona "impacto"/"chamas") e/ou de uma Habilidade Passiva de Combate
  // equipada que concede o efeito quando um dado do Acerto bate o limiar do atributo
  // dela (Força pro Impacto, Magia pro Chamas) - cada fonte conta como 1 instancia.
  const fezContato = successes > 0;
  const efeitoTexto = (attack.efeito || "").toLowerCase();
  const impactoDeProc = fezContato && !fixedSuccessMatch && successFlags.some((f) => f.success && f.procAtacante?.concedeEfeito === "impacto");
  const chamasDeProc = fezContato && !fixedSuccessMatch && successFlags.some((f) => f.success && f.procAtacante?.concedeEfeito === "chamas");
  // Efeitos por texto do ataque também exigem contato (fezContato) — sem essa
  // checagem, um ataque que ERROU o Acerto ainda rolaria a confirmação de
  // Impacto/Chamas/Envenenamento, contradizendo a própria regra ("quando o
  // ataque faz contato"). Não filtra por !fixedSuccessMatch (esse filtro só
  // faz sentido pra concessão via Habilidade Passiva, que depende de olhar um
  // dado de Acerto que não existe em ataques de sucesso fixo tipo "2S" — mas
  // esses ataques TÊM contato, successes já vem preenchido, e fezContato
  // funciona neles normalmente).
  const instanciasImpacto = (fezContato && efeitoTexto.includes("impacto") ? 1 : 0) + (impactoDeProc ? 1 : 0);
  const instanciasChamas = (fezContato && efeitoTexto.includes("chamas") ? 1 : 0) + (chamasDeProc ? 1 : 0);
  const instanciasEnvenenamento = fezContato && efeitoTexto.includes("envenenamento") ? 1 : 0;

  let impactoBonus = 0;
  let impactoRoll = null;
  if (instanciasImpacto > 0) {
    const dBase = Math.floor(Math.random() * 10) + 1;
    const dAjustado = Math.min(10, dBase + (instanciasImpacto - 1));
    impactoBonus = dAjustado <= 4 ? 0 : dAjustado <= 7 ? 1 : dAjustado <= 9 ? 2 : 3;
    impactoRoll = { dado: dBase, instancias: instanciasImpacto, dadoAjustado: dAjustado, bonus: impactoBonus };
  }

  // Etapa 2 - Confirmacao: uma rolagem de 1d10 por sucesso obtido no Acerto.
  // O atributo somado depende do tipo do ataque (marcial soma Forca, magico soma
  // Magia, arma de fogo nao soma atributo nenhum - so o valor da arma). A
  // Proficiencia de Combate do ataque (Briga/Armas de Fogo/Combate Corpo a Corpo/
  // Magias Ofensivas) soma tanto no Acerto quanto aqui na Confirmacao.
  const danoAttrBonus = tipoInfo.danoAttr ? attrBonus(getAttrGrade(attacker, tipoInfo.danoAttr)) : 0;
  const danoProfBonus = attack.profKey ? attrBonus(attacker.proficiencias?.[attack.profKey]) : 0;
  const manualDanoBonus = parseFlatBonus(attack.dano);
  // golpe_penetrante: em ataques fisicos, ignora a Resistencia Armadura do alvo (vai
  // direto pra Resistencia Natural) e soma bonus extra conforme a Tecnica do atacante:
  // grau C+ soma +1, grau A soma +1 adicional (total +2).
  const temGolpePenetrante = (attacker.procs || []).includes("golpe_penetrante") && (attack.tipo === "marcial" || attack.tipo === "arma_de_fogo");
  const tecnicaGolpePenetrante = attacker.proficiencias?.tecnicaProf;
  const golpePenetranteBonus = temGolpePenetrante
    ? ((GRADE_VALUE[tecnicaGolpePenetrante] || 1) >= 3 ? 1 : 0) + (tecnicaGolpePenetrante === "A" ? 1 : 0)
    : 0;
  const confirmBonusBase = danoAttrBonus + danoProfBonus + manualDanoBonus + impactoBonus + golpePenetranteBonus;
  const resistArmadura = computeStat(defender, "resistArmadura");
  const resistNaturalKey = tipoInfo.resistKey || "resistNaturalFisica";
  const resistNatural = computeStat(defender, resistNaturalKey);
  // So conta com Armadura se houver de fato um item de armadura cadastrado em Itens.
  const temArmadura = (defender.itens?.armadura || []).length > 0;
  const feridaPorAcerto = attack.ferida !== undefined && attack.ferida !== "" ? parseFlatBonus(attack.ferida) || 1 : 1;

  // A armadura funciona como um "escudo de uso unico": as confirmacoes sao checadas
  // em ordem contra a Armadura ate uma delas igualar/superar seu valor - essa rompe
  // a armadura e causa dano. A partir dali (e se nao houver armadura), as confirmacoes
  // seguintes checam contra a Resistencia Natural do tipo do ataque.
  // Mestre em Armadura (blindagem_reativa) e uma passiva SEMPRE ativa (nao depende de
  // bater limiar de dado nenhum): com ela equipada, a Armadura so quebra na SEGUNDA
  // vez que for superada, em vez da primeira.
  const temMestreEmArmadura = (defender.procs || []).includes("blindagem_reativa");
  const golpesParaQuebrarArmadura = temMestreEmArmadura ? 2 : 1;
  let golpesNaArmadura = 0;
  let armaduraQuebrada = !temArmadura || temGolpePenetrante;
  // Escudo de Mana e uma passiva SEMPRE ativa que cria uma camada extra ANTES da
  // Armadura: vale 8 + bonus de Magia, quebra igual uma Armadura (primeira confirmacao
  // que igualar/superar rompe), e só depois disso as confirmacoes passam a checar a
  // Armadura de verdade (se houver) e por fim a Resistencia Natural.
  const temEscudoDeMana = (defender.procs || []).includes("escudo_de_mana");
  const escudoDeManaValor = temEscudoDeMana ? 8 + attrBonus(defender.proficiencias?.magiasOfensivas) : 0;
  let escudoDeManaQuebrado = !temEscudoDeMana;
  const confirmRolls = [];
  for (let i = 0; i < successes; i++) {
    const veioDeCritico = !!successCritOrder[i];
    // fortaleza_viva: em vez de anular a confirmação (o que tornava Resistência
    // alta "inquebrável"), o dado que bater o limiar de Resistência Física é
    // RE-ROLADO uma vez, e o novo valor é o que vale pra tudo daqui pra frente.
    const dRolado = Math.floor(Math.random() * 10) + 1;
    const procDefensorPreCheck = findTriggeredProc(defender, "confirmacao_recebida", dRolado, attack.tipo);
    let d = dRolado;
    let rerolado = false;
    if (procDefensorPreCheck?.id === "fortaleza_viva") {
      d = Math.floor(Math.random() * 10) + 1;
      rerolado = true;
    }
    const isCrit = d === 10;
    const procAtacante = findTriggeredProc(attacker, "confirmacao_propria", d, attack.tipo);
    const procDefensor = findTriggeredProc(defender, "confirmacao_recebida", d, attack.tipo);

    let extraConfirmBonus = 0;
    let extraFerida = 0;
    if (procAtacante?.id === "surto_arcano") extraConfirmBonus += 1;

    const confirmBonus = confirmBonusBase + (veioDeCritico ? 1 : 0) + extraConfirmBonus;
    const total = d + confirmBonus;

    // Ordem das camadas: Escudo de Mana -> Armadura -> Resistência Natural.
    let resistUsada, alvo, romperiaArmadura = false, romperiaEscudo = false;
    if (!escudoDeManaQuebrado) {
      resistUsada = "escudoDeMana";
      alvo = escudoDeManaValor;
      romperiaEscudo = true;
    } else if (!armaduraQuebrada) {
      resistUsada = "resistArmadura";
      alvo = resistArmadura;
      romperiaArmadura = true;
    } else {
      resistUsada = resistNaturalKey;
      alvo = resistNatural;
    }
    const passou = isCrit || total >= alvo;

    let blindada = false;
    if (passou && romperiaEscudo) {
      escudoDeManaQuebrado = true; // Escudo de Mana quebra na primeira que superar, igual uma Armadura
    } else if (passou && romperiaArmadura) {
      golpesNaArmadura += 1;
      if (golpesNaArmadura >= golpesParaQuebrarArmadura) {
        armaduraQuebrada = true;
      } else {
        blindada = true; // aguentou esse golpe, mas ainda nao quebrou (Mestre em Armadura)
      }
    }

    confirmRolls.push({
      die: d, isCrit, total, passou, resistUsada, resistValor: alvo, confirmBonus, veioDeCritico,
      procAtacante, procDefensor, extraFerida, blindada, rerolado, dadoOriginal: dRolado,
    });
  }

  // CHAMAS: uma rolagem de confirmacao INDEPENDENTE por instancia, sem bonus nenhum,
  // contra a Resistencia Natural do alvo (nao interage com Armadura) - 1 de Ferida cada uma.
  const chamasRolls = [];
  for (let i = 0; i < instanciasChamas; i++) {
    const d = Math.floor(Math.random() * 10) + 1;
    const isCrit = d === 10;
    const passou = isCrit || d >= resistNatural;
    chamasRolls.push({ die: d, isCrit, passou, resistValor: resistNatural });
  }

  // ENVENENAMENTO: igual o Chamas (rolagem independente, sem bonus, 1 de Ferida cada
  // uma, sem interagir com Armadura ou Escudo de Mana) mas vai DIRETO na Resistencia
  // Natural MAGICA do alvo, independente do tipo do proprio ataque (o Chamas vai na
  // Natural do tipo do ataque - Fisica pra Marcial/Arma de fogo, Magica pra Magico).
  const resistNaturalMagicaVal = computeStat(defender, "resistNaturalMagica");
  const envenenamentoRolls = [];
  for (let i = 0; i < instanciasEnvenenamento; i++) {
    const d = Math.floor(Math.random() * 10) + 1;
    const isCrit = d === 10;
    const passou = isCrit || d >= resistNaturalMagicaVal;
    envenenamentoRolls.push({ die: d, isCrit, passou, resistValor: resistNaturalMagicaVal });
  }

  const confirmedHits = confirmRolls.filter((r) => r.passou).length;
  const chamasConfirmedHits = chamasRolls.filter((r) => r.passou).length;
  const envenenamentoConfirmedHits = envenenamentoRolls.filter((r) => r.passou).length;
  const causaDano = confirmedHits > 0 || chamasConfirmedHits > 0 || envenenamentoConfirmedHits > 0;
  const extraFeridaTotal = confirmRolls.reduce((sum, r) => sum + (r.passou ? r.extraFerida : 0), 0) + chamasConfirmedHits + envenenamentoConfirmedHits;
  // Ataques Marciais (desarmado e arma branca) escalam: ferida = confirmações que passaram × ferida do ataque.
  // Arma de fogo e Mágico: ferida fixa (o valor do ataque), independente de quantas confirmaram.
  const escalaComSucessos = attack.tipo === "marcial";
  const feridaValor = confirmedHits === 0 ? extraFeridaTotal : (escalaComSucessos ? confirmedHits * feridaPorAcerto : feridaPorAcerto) + extraFeridaTotal;
  const contato = successes > 0 && !causaDano;

  return {
    danoAttrBonus, confirmBonus: confirmBonusBase, resistArmadura, resistNatural, resistNaturalKey, temArmadura,
    confirmRolls, confirmedHits, causaDano, contato, feridaValor,
    impactoRoll, chamasRolls, envenenamentoRolls,
  };
}

export function resolveAttack({ attacker, defender, attack }) {
  const tipoInfo = TIPOS_ATAQUE[attack.tipo] || TIPOS_ATAQUE.marcial;
  const critThreshold = 10; // crítico só em 10 natural — Sorte não afeta mais isso, virou só uma stat de habilidades

  // Etapa 1 - Acerto. Alguns ataques (ex: "2S" no campo Acerto) nao rolam dado nenhum
  // aqui - ja consideram um numero fixo de sucessos e vao direto pra Confirmacao.
  const fixedSuccessMatch = String(attack.acerto ?? "").trim().match(/^(\d*)[sS]$/);
  let dice = [];
  let acertoBonus = 0;
  let threshold = null;
  let successFlags = []; // um por dado: { isCrit, success, procAtacante, procDefensor, sucessosGerados }
  let successes;
  let desaceleracaoRollOut = null;
  if (fixedSuccessMatch) {
    successes = fixedSuccessMatch[1] ? parseInt(fixedSuccessMatch[1], 10) : 1;
  } else {
    const acertoAttrBonus = tipoInfo.acertoAttr ? attrBonus(getAttrGrade(attacker, tipoInfo.acertoAttr)) : 0;
    const acertoProfBonus = attack.profKey ? attrBonus(attacker.proficiencias?.[attack.profKey]) : 0;
    const manualAcertoBonus = parseFlatBonus(attack.acerto);
    acertoBonus = acertoAttrBonus + acertoProfBonus + manualAcertoBonus;
    const defesaAlvo = computeStat(defender, "defesa");
    threshold = defesaAlvo; // Defesa já inclui a base 5 embutida — não soma de novo aqui
    dice = [1, 2, 3].map(() => Math.floor(Math.random() * 10) + 1);
    let golpeCerteiroUsado = false; // só pode dobrar sucesso uma vez por ataque, não em cada dado
    // mestre_do_critico (furia_crescente): reduz o limiar de critico em 1 (flat -
    // sem depender de atributo/proficiencia, pra nao ficar forte demais) - vale pra
    // TODOS os criticos da rolagem, nao so o primeiro.
    const temMestreCritico = (attacker.procs || []).includes("furia_crescente");
    const mestreCriticoInfo = PROC_ABILITIES.find((p) => p.id === "furia_crescente");
    const limiarMestreCritico = critThreshold - (mestreCriticoInfo?.reduzCriticoEm || 0);

    // DESACELERACAO: rola 1d10 (tabela igual Impacto) ANTES do Acerto - o resultado
    // reduz a Defesa do alvo pra TODOS os 3 dados dessa rolagem (nao e por dado).
    const efeitoTextoAcerto = (attack.efeito || "").toLowerCase();
    const instanciasDesaceleracao = efeitoTextoAcerto.includes("desaceleração") || efeitoTextoAcerto.includes("desaceleracao") ? 1 : 0;
    let desaceleracaoRoll = null;
    let desaceleracaoReducao = 0;
    if (instanciasDesaceleracao > 0) {
      const dBase = Math.floor(Math.random() * 10) + 1;
      const dAjustado = Math.min(10, dBase + (instanciasDesaceleracao - 1));
      desaceleracaoReducao = dAjustado <= 4 ? 0 : dAjustado <= 7 ? 1 : dAjustado <= 9 ? 2 : 3;
      desaceleracaoRoll = { dado: dBase, instancias: instanciasDesaceleracao, dadoAjustado: dAjustado, reducao: desaceleracaoReducao };
    }
    // ENRAIZAMENTO: sem tabela - o numero de instancias (ate 3) decide quantos dos
    // 3 dados do Acerto, comecando do primeiro, enfrentam Defesa -2.
    const instanciasEnraizamento = Math.min(3, efeitoTextoAcerto.includes("enraizamento") ? 1 : 0);
    // ACELERACAO: sem tabela - dispara em sequencia. O 1o dado nao tem bonus; cada
    // dado seguinte so ganha bonus (o anterior +1) se o dado anterior confirmou
    // sucesso - senao volta pra 0.
    const temAceleracao = efeitoTextoAcerto.includes("aceleração") || efeitoTextoAcerto.includes("aceleracao");
    let bonusAceleracao = 0;

    successFlags = dice.map((dRolado, idx) => {
      // reflexo_agil: em vez de anular o sucesso (o que tornava defesas altas
      // "inquebráveis"), o dado que bater o limiar é RE-ROLADO uma vez, e o novo
      // valor é o que vale pra tudo daqui pra frente.
      const procDefensorPreCheck = findTriggeredProc(defender, "acerto_recebido", dRolado, attack.tipo);
      let d = dRolado;
      let rerolado = false;
      if (procDefensorPreCheck?.id === "reflexo_agil") {
        d = Math.floor(Math.random() * 10) + 1;
        rerolado = true;
        dice[idx] = d; // atualiza o dado exibido/usado pro valor final
      }
      const limiarEfetivo = temMestreCritico ? limiarMestreCritico : critThreshold;
      const isCrit = d >= limiarEfetivo;
      const mestreCriticoUsado = temMestreCritico && isCrit && limiarEfetivo < critThreshold;
      const critBonus = isCrit ? 1 : 0;
      const enraizamentoAplicado = idx < instanciasEnraizamento;
      const enraizamentoPenalidade = enraizamentoAplicado ? 2 : 0;
      const thresholdEfetivo = threshold - desaceleracaoReducao - enraizamentoPenalidade;
      const aceleracaoBonusEsteDado = temAceleracao ? bonusAceleracao : 0;
      const success = d + acertoBonus + critBonus + aceleracaoBonusEsteDado > thresholdEfetivo;
      if (temAceleracao) bonusAceleracao = success ? aceleracaoBonusEsteDado + 1 : 0;
      const procAtacante = findTriggeredProc(attacker, "acerto_proprio", d, attack.tipo);
      const procDefensor = findTriggeredProc(defender, "acerto_recebido", d, attack.tipo);
      // golpe_certeiro: esse dado gera 2 sucessos em vez de 1 - só na primeira vez que disparar no ataque
      let sucessosGerados = success ? 1 : 0;
      const golpeCerteiroDispara = success && procAtacante?.id === "golpe_certeiro" && !golpeCerteiroUsado;
      if (golpeCerteiroDispara) {
        sucessosGerados = 2;
        golpeCerteiroUsado = true;
      }
      return {
        isCrit, success, procAtacante, procDefensor, sucessosGerados, golpeCerteiroDispara, rerolado, dadoOriginal: dRolado, mestreCriticoUsado,
        thresholdEfetivo, enraizamentoAplicado, aceleracaoBonusEsteDado,
      };
    });
    successes = successFlags.reduce((sum, f) => sum + f.sucessosGerados, 0);
    desaceleracaoRollOut = desaceleracaoRoll; // exposto pro retorno da funcao
  }
  const criticosAcerto = successFlags.filter((f) => f.isCrit).length;
  const superSucesso = successes >= 3;
  // Ordem dos sucessos (para saber quais rolagens de confirmação ganham +1 de crítico) -
  // cada dado entra na lista uma vez por sucesso que gerou (golpe_certeiro gera 2 entradas).
  const successCritOrder = [];
  if (!fixedSuccessMatch) {
    for (const f of successFlags) {
      for (let i = 0; i < f.sucessosGerados; i++) successCritOrder.push(f.isCrit);
    }
  }

  const confirmResult = resolveConfirmationPhase({ attacker, defender, attack, successes, successFlags, successCritOrder, fixedSuccessMatch });

  return {
    dice, acertoBonus, threshold, successes, criticos: criticosAcerto, superSucesso, critThreshold,
    semRolagemDeAcerto: !!fixedSuccessMatch, successFlags,
    desaceleracaoRoll: desaceleracaoRollOut,
    ...confirmResult,
  };
}
