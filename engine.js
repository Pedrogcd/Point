// Motor de combate do Point (universo Amaranth) — extraído de point-amaranth-app.jsx
// pra poder ser testado com Node puro, sem depender de React/JSX/ícones.
// point-amaranth-app.jsx importa deste módulo — esta é a fonte única da lógica
// de regras. Não duplique estas funções de volta no jsx.
//
// Fonte de verdade das regras de combate/magia: docs/SISTEMA_MAGIA.md (14/10) —
// substitui o modelo antigo de Acerto/Confirmação em duas fases por rolagem +
// ferimento direto. SISTEMA.md (mais antigo) ainda cobre o que não mudou
// (Teste genérico, recursos, status effects de texto livre). Ver CONTEXTO.md
// pro "porquê" de cada decisão de design.

// Grau F (14/10): abaixo de E, selecionável em qualquer Atributo Geral ou
// Proficiência — pedido explícito do Pedro pra representar uma fraqueza
// grave ("reduzem em 1 o dado referente a eles"). Continua a mesma escada de
// -1 por grau que já existia entre E..A (1,2,3,4,5): F fica em 0, exatamente
// 1 dado a menos que E nos pools que somam atributo+proficiência direto
// (diceAtaqueFisico, resolveRolagemDefesa, diceAtaqueMagico com Inteligência,
// o painel de Teste). IMPORTANTE: como F vale 0 (falsy em JS), todo lugar
// que lê `GRADE_VALUE[grau]` precisa usar `?? 1` (nullish coalescing), nunca
// `|| 1` — `|| 1` trataria F como se fosse E (1), anulando a redução. Grau
// ausente/inválido (undefined) continua caindo em E (1) com `?? 1`, igual
// antes.
export const GRADE_VALUE = { F: 0, E: 1, D: 2, C: 3, B: 4, A: 5 };
export const GRADE_ORDER = ["F", "E", "D", "C", "B", "A"];

// Atributos de Combate — ESVAZIADO de propósito: Magia, Técnica, Sorte, Defesa,
// Resistência Física e Resistência Mágica saíram de aqui. Magia se dividiu em
// duas Proficiências (Magias Ofensivas pro ataque, Magias Gerais no Mental);
// Defesa/Resistência Física/Resistência Mágica agora são só as Proficiências de
// Combate com o mesmo nome; Sorte foi removida (não tem substituto ainda);
// Técnica virou Manipulação de Mana (14/10, ver PROFICIENCIAS_LIST).
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
//
// "tecnicaProf"/"Técnica" virou "manipulacaoManaProf"/"Manipulação de Mana"
// (14/10, docs/SISTEMA_MAGIA.md item 5), e depois — mesmo dia, documento
// seguinte docs/MUDANCAS_RACAS_E_MAGIA.md — "Manipulação de Mana" junto com
// "Magias Ofensivas" e "Resistência Mágica" saíram de vez do catálogo: a
// recuperação de mana na cena passou a usar a contagem de Ofícios Mágicos
// (ver contagemOficiosMagicos) em vez de uma proficiência, o pool de ataque
// mágico passou a usar Ofícios OU Inteligência (escolha do jogador, ver
// diceAtaqueMagico), e a defesa contra QUALQUER ataque (físico ou mágico)
// passa a ser sempre Resistência Física (ver resolveRolagemDefesa). Grau
// salvo nessas 3 chaves em fichas antigas é descartado na migração (ver
// personagens.js) — não há pra onde migrar esse grau, o conceito não existe
// mais. Referências à essas 3 chaves antes da remoção (listadas no relatório
// final da PR): PROFICIENCIAS_LIST (este arquivo), ACERTOS_POR_TIPO (entrada
// "magico" removida — não tinha mais proficiência fixa pra mostrar),
// PROC_ABILITIES (golpe_certeiro/fortaleza_viva/reflexo_agil usavam
// manipulacaoManaProf, surto_arcano/toque_flamejante usavam magiasOfensivas,
// como proficienciaLimiar — já eram órfãs desde 14/10, ver nota ali; ficaram
// com chave morta de propósito, não as redesenhei, é a revisão de
// habilidades passivas que o Pedro pediu pra NÃO fazer agora),
// racasCatalogo.js (BONUS_GRAU_POR_HABILIDADE de várias raças), catalogo-
// racas.json, point-amaranth-app.jsx, engine.test.js/racasCatalogo.test.js.
//
// "Defesa substitui Resistência Física" (21/10, docs/ATUALIZACAO_21-10.md
// item 1): a proficiência "resistFisicaProf" (Resistência Física) SAIU do
// catálogo — "defesaProf" (Defesa, já existia aqui desde sempre, mas sem
// função mecânica nenhuma até hoje) assume o papel dela em
// resolveRolagemDefesa. Combate volta a ter 3 proficiências (Armas de
// Fogo, Combate Corpo a Corpo, Defesa), 25 proficiências no total (3 de
// Combate + 22 gerais) — confere com o número do documento. Migração não-
// destrutiva (ver personagens.js:migrarPersonagem): a nova Defesa recebe o
// grau que estava em Resistência Física (só na primeira vez — não
// sobrescreve uma Defesa editada manualmente depois da migração), e o
// grau antigo de Resistência Física fica preservado em
// `character.proficienciasLegado.resistFisicaProf` (não apaga).
export const PROFICIENCIAS_LIST = [
  // Combate — perícias usadas nos cálculos de combate (somam com o atributo correspondente).
  // "Briga" foi eliminada (21/09) — Ataque desarmado passou a usar Combate Corpo a Corpo,
  // igual toda arma branca. Fichas salvas com profKey "briga" migram automaticamente.
  { key: "armasDeFogo", label: "Armas de Fogo", categoria: "combate" },
  { key: "combateCorpoACorpo", label: "Combate Corpo a Corpo", categoria: "combate" },
  { key: "defesaProf", label: "Defesa", categoria: "combate" },
  // Física (não-combate)
  { key: "atletismo", label: "Atletismo", categoria: "fisica" },
  { key: "oficio", label: "Ofício", categoria: "fisica" },
  { key: "conducao", label: "Condução", categoria: "fisica" },
  { key: "roubo", label: "Roubo", categoria: "fisica" },
  { key: "furtividade", label: "Furtividade", categoria: "fisica" },
  { key: "sobrevivencia", label: "Sobrevivência", categoria: "fisica" },
  { key: "etiqueta", label: "Etiqueta", categoria: "social" },
  { key: "intuicao", label: "Intuição", categoria: "social" },
  { key: "intimidacao", label: "Intimidação", categoria: "social" },
  { key: "lideranca", label: "Liderança", categoria: "social" },
  { key: "atuacao", label: "Atuação", categoria: "social" },
  { key: "persuasao", label: "Persuasão", categoria: "social" },
  { key: "malandragem", label: "Malandragem", categoria: "social" },
  { key: "academicos", label: "Acadêmicos", categoria: "mental" },
  { key: "percepcao", label: "Percepção", categoria: "mental" },
  { key: "financas", label: "Finanças", categoria: "mental" },
  { key: "investigacao", label: "Investigação", categoria: "mental" },
  { key: "medicina", label: "Medicina", categoria: "mental" },
  { key: "religiao", label: "Religião", categoria: "mental" },
  { key: "magiasGerais", label: "Magias Gerais", categoria: "mental" },
  { key: "politica", label: "Política", categoria: "mental" },
  { key: "tecnologia", label: "Tecnologia", categoria: "mental" },
];
// Removidas do catálogo (08/10, pedido do Pedro): "ciencia", "subterfugio" e
// "empatiaAnimal" — nenhuma das três tinha função mecânica (eram só
// referência, como as outras 22 não-combate que sobraram). Fichas que já
// tinham grau salvo nessas chaves (Akira Cagliostro: ciencia/subterfugio;
// ZERO: ciencia) mantêm o dado salvo, só não aparece mais na ficha nem é
// editável — reaparece se a proficiência voltar pro catálogo um dia.
//
// "ocultismo" saiu do catálogo e virou "religiao" (08/10, mesmo dia, mesmo
// pedido do Pedro) — mesma regra: fichas com grau salvo em "ocultismo"
// mantêm o dado, só não aparece/edita mais; "religiao" entra em "E" por
// padrão pra todo mundo (nenhuma ficha semente tinha essa chave ainda).

export const PROFICIENCIAS_DEFAULT = PROFICIENCIAS_LIST.reduce((acc, p) => ({ ...acc, [p.key]: "E" }), {});

// "acerto" saiu daqui: era uma estatística decorativa (o motor nunca a lia).
// "Resistência Natural Física/Mágica" saíram em 14/10 (docs/SISTEMA_MAGIA.md
// item 2, "Resistência Natural não existe mais") — a defesa contra ataque
// agora é a rolagem ativa de Resistência Física/Mágica (ver
// resolveRolagemDefesa), não mais uma estatística passiva somada na
// Confirmação (esse conceito de "Confirmação" também não existe mais).
// "Resistência Armadura" fica — o guia não manda removê-la, mas o novo
// resolveAtaque não a consulta em lugar nenhum (o modelo novo não tem camada
// de armadura: é só ataque vs defesa, sucessos líquidos, ferimento por
// Vigor). Ela continua existindo como estatística configurável na ficha, só
// sem função mecânica até o Pedro decidir o que fazer com ela.
//
// "defesa" SAIU daqui em 21/10 (docs/ATUALIZACAO_21-10.md item 1: "Remova...
// a fórmula antiga 'Defesa = 8 + bônus' e o painel antigo de Defesa") — essa
// era a estatística decorativa de "8 + bônus" (nunca lida por resolveAtaque),
// bem diferente da proficiência de Combate "Defesa" (defesaProf, ver
// PROFICIENCIAS_LIST), que agora É a Defesa de verdade. Não-destrutivo:
// `character.statBase.defesa` continua existindo em fichas salvas (só não
// aparece mais no painel nem em nenhum cálculo) — "os pontos gastos na
// Defesa antiga voltam ao orçamento" (texto do Pedro) é uma orientação de
// mesa pra quem monta ficha por pontos manualmente; o app não tem um
// sistema de orçamento pra devolver automaticamente.
export const STAT_LIST = [
  { key: "resistArmadura", label: "Resistência Armadura" },
  { key: "geral", label: "Geral" },
];

// Vínculo padrão sugerido entre atributo e estatística de combate — o grau do
// atributo soma automaticamente na estatística vinculada (bônus E=0..A=+4).
// Isso é uma SUGESTÃO ajustável por ficha (não uma regra confirmada no material
// original) — dá pra reatribuir por personagem em "Vínculos de atributo".
export const DEFAULT_STAT_LINKS = {
  acerto: ["destreza"],
  resistArmadura: [],
  geral: [],
};

export const STAT_BASE_DEFAULTS = { acerto: 0, resistArmadura: 8, geral: 0 };

// Nenhuma estatística usa mais grau cheio (as Resistências Naturais, que
// usavam, saíram do STAT_LIST em 14/10) — mantido como Set vazio só pra não
// quebrar quem ainda importa STAT_USA_GRAU_CHEIO.
export const STAT_USA_GRAU_CHEIO = new Set();

// Os Acertos reais do personagem, um por tipo de ataque físico — usado só
// como RESUMO/exibição na ficha (não alimenta resolveAtaque, que já lê o
// grau do atributo/proficiência direto). Esses números de bônus (E=0..A=+4)
// são do modelo antigo "dado + bônus vs limiar"; o modelo novo é pool de
// dados (sem bônus somado ao dado), então esse resumo mostra uma ideia
// aproximada de "força de ataque" mas não corresponde 1:1 à fórmula nova.
// TODO: revisar esse painel pra mostrar o número de dados do pool em vez do
// bônus antigo. A entrada "Mágico" saiu em 14/10 (docs/MUDANCAS_RACAS_E_
// MAGIA.md): o pool mágico não tem mais uma Proficiência fixa (é Base
// mágica + Ofícios OU Inteligência, escolha do jogador a cada conjuração) —
// não dava pra resumir num par atributo/proficiência fixo como os outros
// dois tipos.
export const ACERTOS_POR_TIPO = [
  { key: "corpoACorpo", label: "Corpo a corpo", attr: "destreza", prof: "combateCorpoACorpo", tipo: "marcial" },
  { key: "armaDeFogo", label: "Arma de fogo", attr: "destreza", prof: "armasDeFogo", tipo: "arma_de_fogo" },
];

export function computeAcertoTipo(character, entrada) {
  const doAtributo = entrada.attr ? attrBonus(getAttrGrade(character, entrada.attr)) : 0;
  const daProficiencia = attrBonus(character?.proficiencias?.[entrada.prof]);
  return { total: doAtributo + daProficiencia, doAtributo, daProficiencia };
}

// Catálogo de Habilidades Passivas de Combate — ÓRFÃ desde 14/10. O modelo de
// combate novo (docs/SISTEMA_MAGIA.md) não tem mais fase de Acerto/Confirmação
// separadas nem camada de Armadura/Escudo de Mana com valor numérico — é só
// ataque vs defesa, sucessos líquidos, ferimento por Vigor. Os gatilhos destas
// 11 habilidades (acerto_proprio, confirmacao_recebida, passivo_armadura,
// passivo_escudo_mana, passivo_ignora_armadura) dependiam exatamente dessas
// fases, que não existem mais — resolveAtaque NÃO chama mais findTriggeredProc
// em lugar nenhum. Os dados (catálogo, character.procs, a tabela de 3 espaços
// na ficha) continuam intactos — só o efeito automático parou de disparar.
// TODO (decisão do Pedro): redesenhar as 11 pra encaixar no modelo novo, ou
// aposentar a feature. Não decidi isso sozinho porque o guia novo não fala
// nada sobre elas.
export const MAX_PROCS = 3;
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
    proficienciaLimiar: "manipulacaoManaProf",
    prioridade: 2,
    efeito: "Quando um dado do seu Acerto bate o limiar da sua Proficiência de Manipulação de Mana, esse dado conta como 2 sucessos em vez de 1 — só pode disparar uma vez por ataque.",
  },
  {
    id: "fortaleza_viva",
    nome: "Giro Defensivo",
    gatilho: "confirmacao_recebida",
    proficienciaLimiar: "manipulacaoManaProf",
    prioridade: 2,
    efeito: "Quando um dado de Confirmação inimiga contra você bate o limiar da sua Proficiência de Manipulação de Mana, esse dado é re-rolado uma vez — vale o novo valor.",
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
    proficienciaLimiar: "manipulacaoManaProf",
    prioridade: 1,
    efeito: "Quando um dado do Acerto inimigo contra você bate o limiar da sua Proficiência de Manipulação de Mana, esse dado é re-rolado uma vez — vale o novo valor.",
  },
  {
    id: "instinto_selvagem",
    nome: "Ataque Poderoso",
    gatilho: "acerto_proprio",
    atributoLimiar: "forca",
    prioridade: 1,
    restricaoTipo: "marcial",
    concedeEfeito: "impacto",
    efeito: "Em ataques Marciais, quando um dado do Acerto bate o limiar de Força, soma mais uma instância de IMPACTO ao ataque (mesmo se ele já tiver) — lembrando que várias instâncias de IMPACTO não rolam vários dados: cada instância extra só soma +1 no dado de IMPACTO antes de checar a tabela.",
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
    efeito: "Sempre ativa (não precisa bater limiar de dado): seus ataques físicos ignoram a Resistência Armadura do alvo — as confirmações vão direto pra Resistência Natural, mesmo que o alvo tenha armadura equipada. Além disso, com sua Proficiência de Manipulação de Mana em grau C ou mais, soma +1 na Confirmação de dano; sendo grau A, soma mais +1 (total +2).",
  },
  {
    id: "persistente",
    nome: "Persistente",
    gatilho: "passivo_recurso",
    efeito: "Sempre ativa (não precisa bater limiar de dado): soma +1 no HP máximo e +1 no SP máximo.",
  },
  {
    id: "toque_flamejante",
    nome: "Magias energéticas",
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
// Mantido só pra exibição (ver nota de "órfã" acima — o gatilho não dispara mais sozinho).
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

// Tipos de Ataque — define o atributo somado no pool de dados do Acerto (pra
// ataques físicos) e qual "bucket" de defesa ele enfrenta (física ou mágica).
// Mágico não tem atributoKey: usa Base mágica (ver diceAtaqueMagico), não um
// Atributo Geral da ficha.
export const TIPOS_ATAQUE = {
  marcial: { label: "Marcial", atributoKey: "destreza", tipoDefesa: "fisico" },
  arma_de_fogo: { label: "Arma de fogo", atributoKey: "destreza", tipoDefesa: "fisico" },
  magico: { label: "Mágico", atributoKey: null, tipoDefesa: "magico" },
};

// Catálogo de Armas — formas de atacar fisicamente em sua forma genérica, sem
// estar ligadas a nenhum personagem específico. Um personagem "aprende" uma
// destas e ela vira uma entrada na sua tabela de Ataques.
//
// Reescrito em 14/10 pro modelo de pool de dados (docs/SISTEMA_MAGIA.md): as
// armas MÁGICAS que existiam aqui (Shin, Tiro Mágico, Torrente Mágica,
// Bombardeio de Mana) foram REMOVIDAS — o catálogo de magias (data/magias.js)
// é agora a fonte única pra ataques mágicos, pra não duplicar/divergir dados
// entre os dois catálogos. `acerto` (antigo bônus flat tipo "+1"/"-1") virou
// `ajusteDados` (dados extras ou a menos no pool) — é a interpretação mais
// direta num sistema sem bônus somado ao dado; não é uma regra confirmada
// pelo Pedro, é decisão minha, listada no relatório final. `dano` (antigo
// bônus flat na Confirmação) foi removido — não existe mais rolagem de dano
// separada. `letal`/`descritores` são novos: marquei como Letal toda arma de
// verdade (lâmina, arma de fogo) e deixei o ataque desarmado SEM Letal por
// padrão, preservando o que já existia (Leonino/Reptiliano/Lobo-Canino etc.
// davam o descritor de personagem "desarmado_letal" justamente pra TORNAR o
// desarmado letal — ver descritoresEfetivosDoAtaque, abaixo). Morteiro Pesado
// perdeu o mecanismo de "carga" (1 turno antes de disparar) — isso é sobre
// rodadas/ações, fora do escopo do guia novo; fica como TODO.
export const BASE_ATTACK_TYPES = [
  {
    id: "soco", profKey: "combateCorpoACorpo", atributoKey: "destreza",
    nome: "Ataque desarmado",
    categoria: "Corpo a corpo — desarmado",
    caracteristicas: ["físico", "corpo a corpo"],
    tipo: "marcial",
    ajusteDados: 1,
    feridas: 1,
    ehDesarmado: true,
    descritores: [],
    descricao: "Ataque desarmado básico (soco, chute, etc). Rola Destreza + Combate Corpo a Corpo + 1 dado extra, sucesso 6+ (7+ se o alvo tiver Blindado). O defensor rola a própria defesa (Resistência Física) pra reduzir os sucessos. Sucessos líquidos ≥ Vigor do alvo = ferimento agravante; senão, superficial.",
  },
  {
    id: "arma_branca", profKey: "combateCorpoACorpo", atributoKey: "destreza",
    nome: "Arma branca",
    categoria: "Corpo a corpo — arma",
    caracteristicas: ["físico", "corpo a corpo"],
    tipo: "marcial",
    ajusteDados: 0,
    feridas: 1,
    descritores: ["letal"],
    descricao: "Arma branca comum (espada, adaga, etc). Rola Destreza + Combate Corpo a Corpo, sucesso 6+. Letal: reduz em 1 o Vigor necessário pro ferimento virar agravante.",
  },
  {
    id: "arma_branca_pesada", profKey: "combateCorpoACorpo", atributoKey: "destreza",
    nome: "Arma branca pesada",
    categoria: "Corpo a corpo — arma",
    caracteristicas: ["físico", "corpo a corpo"],
    tipo: "marcial",
    ajusteDados: -1,
    feridas: 1,
    descritores: ["letal"],
    descricao: "Arma branca de duas mãos — menos precisa (-1 dado), mas letal igual qualquer arma de verdade.",
  },
  {
    id: "mosquetao", profKey: "armasDeFogo", atributoKey: "destreza",
    nome: "Mosquete",
    categoria: "À distância",
    caracteristicas: ["físico", "longa distância"],
    tipo: "arma_de_fogo",
    ajusteDados: -1,
    feridas: 2,
    descritores: ["letal"],
    descricao: "Arma de fogo de longa distância. Rola Destreza + Armas de Fogo -1 dado, sucesso 6+. Letal, 2 feridas por ataque.",
  },
  {
    id: "revolver", profKey: "armasDeFogo", atributoKey: "destreza",
    nome: "Revólver",
    categoria: "À distância",
    caracteristicas: ["físico", "longa distância"],
    tipo: "arma_de_fogo",
    ajusteDados: 0,
    feridas: 2,
    descritores: ["letal"],
    descricao: "Arma de fogo curta. Rola Destreza + Armas de Fogo, sucesso 6+. Letal, 2 feridas por ataque.",
  },
  {
    id: "morteiro_pesado", profKey: "armasDeFogo", atributoKey: "destreza",
    nome: "Morteiro pesado",
    categoria: "À distância — área",
    caracteristicas: ["físico", "longa distância"],
    tipo: "arma_de_fogo",
    ajusteDados: -1,
    feridas: 1,
    descritores: ["letal", "em_area"],
    descricao: "Arma de área/indireta. TODO: o mecanismo antigo de carregar 1 turno antes de disparar dependia de rodadas/ações — fora do escopo do guia novo, removido por enquanto.",
  },
];

// Os 3 ataques físicos padrão (Ataque desarmado/Arma branca/Revólver) que todo
// personagem novo ganha, e que a migração de personagens antigos também usa
// pra repor quem foi salvo antes dessa funcionalidade existir. Ataques mágicos
// não entram mais aqui — ver data/magias.js e a aba de conjuração na ficha.
export function defaultAttacksForCharacter() {
  const pick = (id) => BASE_ATTACK_TYPES.find((t) => t.id === id);
  return [pick("soco"), pick("arma_branca"), pick("revolver")].filter(Boolean).map((t) => ({
    nome: t.nome, tipo: t.tipo, profKey: t.profKey, atributoKey: t.atributoKey,
    ajusteDados: t.ajusteDados, feridas: t.feridas, descritores: [...t.descritores], ehDesarmado: !!t.ehDesarmado,
  }));
}

// Descritores EFETIVOS de um ataque do catálogo (BASE_ATTACK_TYPES) pro
// atacante que vai usá-lo — hoje só cobre desarmado_letal (descritor de
// PERSONAGEM concedido por Garras e Presas/Agressividade Oni em
// catalogo-racas.json, de antes desta mudança): torna ataques desarmados
// (ehDesarmado) letais, preservando o que essas habilidades já faziam.
// Chame esta função (não `attack.descritores` direto) ao montar
// `descritoresAtaque` pro resolveAtaque/resolveAtaqueEmArea.
// Descritores de PERSONAGEM que, quando presentes, valem pra TODOS os
// ataques dele, físicos e mágicos (21/10: generaliza o que antes só cobria
// Queimadura — Encantamentos dão Letal/Perfurante/Preciso N/Carga N/
// Drenante/Sortudo do mesmo jeito, ver data/magias.js:ENCANTAMENTOS). Só os
// descritores que fazem sentido DENTRO de um ataque entram aqui — Blindado,
// Resiste a Magia e Sortudo (já tratado à parte, ver resolveAtaque) são
// descritores do personagem como DEFENSOR (ou já lidos direto no atacante),
// nunca deveriam "vazar" pro ataque em si (poluiria os chips de exibição
// à toa, mesmo sendo inofensivo pro motor — nada checa descritoresAtaque
// por "blindado"). Esmagador não entra na lista de propósito: nenhum
// Encantamento dá Esmagador a um personagem no guia (só Preciso), e
// Esmagador descreve o ATAQUE sendo difícil de bloquear, não uma
// característica do atacante — mantido fora até existir uma fonte real.
const DESCRITORES_DE_ATAQUE_DO_PERSONAGEM = /^(letal|perfurante|sortudo|drenante|preciso(_\d+)?|queimadura(_\d+)?|carga(_\d+)?|envenenamento(_\d+)?)$/;

export function descritoresEfetivosDoAtaque(attacker, attack) {
  const base = attack?.descritores || [];
  let resultado = base;
  if (attack?.ehDesarmado && temDescritor(attacker, "desarmado_letal") && !base.includes("letal")) {
    resultado = [...resultado, "letal"];
  }
  // desarmado_perfurante (21/10, Garras e Presas — docs/ATUALIZACAO_21-10.md
  // seção 8.5): "ataques desarmados ganham Perfurante" — mesmo padrão de
  // desarmado_letal, só que pro descritor Perfurante. A segunda parte da
  // habilidade ("à escolha na hora do ataque, Esmagador 1 ou Preciso 1") NÃO
  // está aqui: é uma escolha do jogador NO MOMENTO do ataque, sem um lugar
  // na UI de ataques catalogados pra isso (só existe esse tipo de escolha
  // manual no painel "Ataque livre"/Teste) — listada como não mecanizada no
  // relatório final.
  if (attack?.ehDesarmado && temDescritor(attacker, "desarmado_perfurante") && !base.includes("perfurante")) {
    resultado = [...resultado, "perfurante"];
  }
  const doPersonagem = (attacker?.descritores || []).filter((d) => DESCRITORES_DE_ATAQUE_DO_PERSONAGEM.test(d));
  if (doPersonagem.length) {
    resultado = [...resultado, ...doPersonagem];
  }
  return resultado;
}

export function attrBonus(grade) {
  // E=0, D=1, C=2, B=3, A=4 (F também cai em 0 — piso em 0, não desconta HP/
  // stat; a redução de F é só nos pools de dado, ver GRADE_VALUE acima)
  return Math.max(0, (GRADE_VALUE[grade] ?? 1) - 1);
}

// Vigor (Atributo Geral físico) determina o máximo de HP: E=2, D=3, C=4, B=5, A=6.
// Os outros Atributos Gerais (Carisma, Manipulação, Compostura, Inteligência,
// Perspicácia, Resolução) não têm função de combate - servem pra testes
// interpretativos fora de combate, sem afetar nada aqui no motor.
// Persistente (habilidade passiva, sempre ativa) soma +1 no HP máximo e +1 no SP máximo.
// "hp_maximo_1" (21/10, Goethiano — docs/ATUALIZACAO_21-10.md + pedido do
// Pedro: "agora é +1 HP máximo + resistente + blindado", no lugar do antigo
// +1 grau em Vigor): primeiro bônus de HP de RAÇA do app — resolve em parte
// a pendência "Implementar bônus de HP/MP/SP das raças" (CONTEXTO.md).
// Reaproveita o mecanismo de descritores de personagem (igual Blindado/
// Resistente) em vez de uma tabela de raça própria — já chega aqui pronto
// em `character.descritores`, preenchido por descritoresDeSelecao na hora
// de escolher a habilidade (ver racasCatalogo.js), sem engine.js precisar
// conhecer raça nenhuma. Booleano (não soma por fonte), igual Blindado.
export function computeMaxHP(character) {
  const bonusPersistente = (character?.procs || []).includes("persistente") ? 1 : 0;
  const bonusDescritor = temDescritor(character, "hp_maximo_1") ? 1 : 0;
  return 2 + attrBonus(character?.atributosGerais?.vigor) + bonusPersistente + bonusDescritor;
}

// "sp_maximo_menos_1" (21/10, Homúnculo — docs/ATUALIZACAO_21-10.md seção
// 8.3: "-1 SP máximo"): mesmo mecanismo de "hp_maximo_1" (descritor de
// personagem, booleano — não soma por fonte), só que SUBTRAI em vez de
// somar. Math.max(0, ...) pra nunca ficar negativo (defensivo — na prática
// a base já é 3, nunca chegaria a isso).
// "sp_maximo_1" (22/10, docs/revisao/racas-site.json — Mana Concentrada,
// Coelho/Bode, Leonino, Lobo/Canino, Raposa/Kitsune: "+1 SP máximo"): mesmo
// mecanismo de "sp_maximo_menos_1", só que soma em vez de subtrair. Com o
// Homúnculo (penalidade) no mesmo personagem (não acontece hoje — nenhuma
// raça combina as duas), os dois se cancelam naturalmente pela soma.
export function computeMaxSP(character) {
  const base = character?.sp?.max ?? 3;
  const bonusPersistente = (character?.procs || []).includes("persistente") ? 1 : 0;
  const bonusDescritor = temDescritor(character, "sp_maximo_1") ? 1 : 0;
  const penalidadeHomunculo = temDescritor(character, "sp_maximo_menos_1") ? 1 : 0;
  return Math.max(0, base + bonusPersistente + bonusDescritor - penalidadeHomunculo);
}

// MP (mana) máximo: 1 a 6 (docs/SISTEMA_MAGIA.md item 7). Magia Inata (+1 MP
// máximo) soma aqui, igual Persistente soma em HP/SP. Magia Inata virou um
// flag independente (`disciplinaMagica.magiaInata`, 14/10 docs/MUDANCAS_
// RACAS_E_MAGIA.md) — não é mais um "tipo" de disciplina exclusivo com
// Ofício Mágico: um personagem pode ter Ofícios Mágicos E Magia Inata ao
// mesmo tempo. "mp_maximo_1" (22/10, docs/revisao/racas-site.json — Mana
// Fluida, Descendentes de Arcani, Reservatório de Mana: "+1 MP máximo"):
// mesmo mecanismo de "hp_maximo_1"/"sp_maximo_1" (descritor de personagem,
// booleano — não soma por fonte).
export const MANA_MIN = 1;
export const MANA_MAX = 6;
export function computeMaxMana(character) {
  const bonusMagiaInata = character?.disciplinaMagica?.magiaInata ? 1 : 0;
  const bonusDescritor = temDescritor(character, "mp_maximo_1") ? 1 : 0;
  const base = character?.mp?.max ?? 3;
  return Math.max(MANA_MIN, Math.min(MANA_MAX, base + bonusMagiaInata + bonusDescritor));
}

// Mana quebrada (21/10, docs/ATUALIZACAO_21-10.md item 3): mana gasta pra
// ativar uma habilidade (Encantamento, item de Alquimia, Constructo...) que
// NÃO volta sozinha — nem no fim de cena, nem no início de turno — até o
// jogador escolher reparar, de graça, só fora de combate (o app não modela
// combate/turnos como estado, então "fora de combate" não é travado aqui,
// é confiança de mesa, igual outras regras manuais do app).
// `mp = { current, max, quebrada }`. `quebrada` é NOVO: conta quantos
// pontos de mana estão quebrados agora — ausente/undefined conta como 0
// (ficha antiga, sem nenhuma mana quebrada ainda). O teto que `current`
// pode recuperar (fim de cena/início de turno) passa a ser `max - quebrada`,
// nunca `max` sozinho — ver fimDeCena/inicioDeTurno em point-amaranth-app.jsx.
//
// `quebrarMana`: tira até `quantidade` pontos de `current` (nunca mais do
// que há disponível — satura em vez de ficar negativo) e soma em
// `quebrada`. Quem chama decide `quantidade` (1 pra Encantamentos/Alquimia,
// 2 pra Constructo — "máximo 1 mana quebrada por habilidade, exceção
// Constructo quebra 2").
export function quebrarMana(mp, quantidade = 1) {
  const current = mp?.current ?? 0;
  const quebradaAtual = mp?.quebrada ?? 0;
  const real = Math.max(0, Math.min(quantidade, current));
  return { ...mp, current: current - real, quebrada: quebradaAtual + real };
}

// `repararMana`: tira até `quantidade` de `quebrada` (satura) e devolve pra
// `current`, nunca deixando `current` passar do teto `max - quebrada` (já
// descontando a própria quantidade reparada).
export function repararMana(mp, quantidade = 1) {
  const quebradaAtual = mp?.quebrada ?? 0;
  const max = mp?.max ?? 0;
  const current = mp?.current ?? 0;
  const real = Math.max(0, Math.min(quantidade, quebradaAtual));
  const novaQuebrada = quebradaAtual - real;
  const novoCurrent = Math.min(Math.max(0, max - novaQuebrada), current + real);
  return { ...mp, current: novoCurrent, quebrada: novaQuebrada };
}

// SP quebrado (21/10, docs/ATUALIZACAO_21-10.md seção 7.1/Regra 6): mesmo
// formato de mana quebrada (`sp = { current, max, quebrada }`), mas com uma
// diferença importante — "só se recupera no descanso longo", nunca de
// graça fora de combate como a mana. Por isso `quebrarSP` é idêntica a
// `quebrarMana` (mesma matemática de saturação), mas NÃO existe um
// "repararSP a qualquer hora" exposto como ação livre na UI: o app não
// modela "descanso longo" como mecânica própria (não existe em lugar
// nenhum, nem pra zerar o limite de Envenenamento/Carga — ver seus
// comentários acima), então `repararSP` só é chamada pelo botão "Restaurar
// MP e SP" (reset manual completo, point-amaranth-app.jsx) — decisão minha,
// provisória, listada no relatório final: trato esse botão como o
// equivalente de "descanso longo" pra fins de SP quebrado, por ser o único
// lugar do app que já reseta tudo de uma vez (e já fazia o mesmo pra mana
// quebrada, ver comentário no botão).
export function quebrarSP(sp, quantidade = 1) {
  const current = sp?.current ?? 0;
  const quebradaAtual = sp?.quebrada ?? 0;
  const real = Math.max(0, Math.min(quantidade, current));
  return { ...sp, current: current - real, quebrada: quebradaAtual + real };
}
export function repararSP(sp, quantidade = 1) {
  const quebradaAtual = sp?.quebrada ?? 0;
  const max = sp?.max ?? 0;
  const current = sp?.current ?? 0;
  const real = Math.max(0, Math.min(quantidade, quebradaAtual));
  const novaQuebrada = quebradaAtual - real;
  const novoCurrent = Math.min(Math.max(0, max - novaQuebrada), current + real);
  return { ...sp, current: novoCurrent, quebrada: novaQuebrada };
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
  const limiaresAttr = attrs.map((a) => 11 - (GRADE_VALUE[getAttrGrade(character, a)] ?? 1));
  const limiaresProf = profs.map((k) => 11 - (GRADE_VALUE[character?.proficiencias?.[k]] ?? 1));
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

// Mantido só pra exibição/referência (ver nota de "órfã" em PROC_ABILITIES) —
// resolveAtaque não chama mais esta função.
export function findTriggeredProc(character, gatilho, dieValue, attackTipo) {
  const procIds = character?.procs || [];
  if (!procIds.length) return null;
  const matching = PROC_ABILITIES.filter((p) => {
    if (p.id === "furia_crescente") return false;
    if (!procIds.includes(p.id) || p.gatilho !== gatilho) return false;
    if (p.restricaoTipo && p.restricaoTipo !== attackTipo) return false;
    const limiar = limiarDaHabilidade(character, p);
    return dieValue >= limiar;
  });
  if (matching.length === 0) return null;
  return matching.sort((a, b) => b.prioridade - a.prioridade)[0];
}

// Cada estatística de combate pode ter uma Proficiência de Combate correspondente
// que soma junto com os atributos vinculados. Vazio desde 21/10 — a única
// entrada era "defesa" (a estatística antiga, agora removida de STAT_LIST;
// a Defesa de verdade não é mais uma STAT, é direto resolveRolagemDefesa).
// Mantido como objeto vazio só pra não quebrar quem ainda importa isto.
export const STAT_PROF_LINK = {};

export function computeStat(character, statKey) {
  const base = (character.statBase && character.statBase[statKey]) ?? STAT_BASE_DEFAULTS[statKey] ?? 0;
  const temp = (character.statTemp && character.statTemp[statKey]) ?? 0;
  const links = (character.statLinks && character.statLinks[statKey]) ?? DEFAULT_STAT_LINKS[statKey] ?? [];
  const peso = STAT_USA_GRAU_CHEIO.has(statKey) ? (g) => GRADE_VALUE[g] ?? 1 : attrBonus;
  const fromAttrs = links.reduce((sum, attrKey) => sum + peso(getAttrGrade(character, attrKey)), 0);
  const profKey = STAT_PROF_LINK[statKey];
  const fromProf = profKey ? peso(character.proficiencias?.[profKey]) : 0;
  return base + fromAttrs + fromProf + temp;
}

// "Briga" foi eliminada (21/09): ataques salvos com profKey "briga" migram pra
// "combateCorpoACorpo", igual toda arma branca. Idempotente — rodar de novo não
// muda nada em ataques que já foram migrados (ou que nunca usaram "briga").
export function migrateBrigaProfKey(attacks) {
  return (attacks || []).map((atk) => (atk.profKey === "briga" ? { ...atk, profKey: "combateCorpoACorpo" } : atk));
}

// Rola N dados de 10, sucesso se dado > limiar (customizável, padrão 5, ou
// seja, 6+). Um 10 natural sempre conta como sucesso (crítico "a confirmar"
// no guia novo — contado aqui, mas sem efeito mecânico ainda).
export function rollSuccessDice(totalDice, limiar = 5) {
  const dice = Array.from({ length: Math.max(1, totalDice) }, () => Math.floor(Math.random() * 10) + 1);
  const successes = dice.filter((d) => d === 10 || d > limiar).length;
  const criticos = dice.filter((d) => d === 10).length;
  const superSucesso = successes >= 3;
  return { dice, successes, criticos, superSucesso };
}

// Descritor Sortudo (docs/SISTEMA_MAGIA.md): "re-rola o primeiro 1 ou 2 do
// teste (inclusive de ataque), mostrando o dado original e o novo". Vale uma
// vez por rolagem — re-rola só o PRIMEIRO dado (na ordem rolada) que saiu 1
// ou 2; se nenhum saiu 1/2, não faz nada. Usado tanto pela rolagem de Ataque
// quanto pela de Defesa (cada lado aplica Sortudo de forma independente, se
// tiver o descritor) e pelo Teste genérico da ficha.
export function rolarComSortudo(totalDice, limiar, temSortudo) {
  const base = rollSuccessDice(totalDice, limiar);
  if (!temSortudo) return { ...base, sortudoAplicado: null };
  const idx = base.dice.findIndex((d) => d === 1 || d === 2);
  if (idx === -1) return { ...base, sortudoAplicado: null };
  const dice = [...base.dice];
  const original = dice[idx];
  const novo = Math.floor(Math.random() * 10) + 1;
  dice[idx] = novo;
  const successes = dice.filter((d) => d === 10 || d > limiar).length;
  const criticos = dice.filter((d) => d === 10).length;
  return { dice, successes, criticos, superSucesso: successes >= 3, sortudoAplicado: { indice: idx, original, novo } };
}

// Azarado (21/10, docs/ATUALIZACAO_21-10.md seção 5): "o alvo re-rola o
// primeiro sucesso do teste e fica com o novo resultado — oposto do
// Sortudo". Implementado como descritor do DEFENSOR que afeta a rolagem do
// ATACANTE (mesma leitura da habilidade racial Raposa/Kitsune, seção 8.5:
// "o primeiro sucesso de UM ATAQUE CONTRA VOCÊ é re-rolado") — chamado de
// dentro de `resolveAtaque`, nunca pelo próprio atacante. Diferente do
// Sortudo, não tem "se não achar, devolve null": sempre re-rola o primeiro
// sucesso achado, pro bem ou pro mal (dado novo pode ser melhor OU pior —
// "fica com o novo resultado" é incondicional, ao contrário do Sortudo, que
// só re-rola o 1/2 justamente porque não tem como piorar).
// Decisão minha de ordem (não confirmada pelo Pedro, listada no relatório):
// se o atacante também tiver Sortudo, o Sortudo aplica primeiro (sobre o
// 1/2 original) — só depois o Azarado escaneia o array já modificado em
// busca do primeiro sucesso. Não é regra fechada, é a leitura mais direta
// de aplicar os dois descritores em sequência.
export function aplicarAzarado(resultado, limiar) {
  const idx = resultado.dice.findIndex((d) => d === 10 || d > limiar);
  if (idx === -1) return { ...resultado, azaradoAplicado: null };
  const dice = [...resultado.dice];
  const original = dice[idx];
  const novo = Math.floor(Math.random() * 10) + 1;
  dice[idx] = novo;
  const successes = dice.filter((d) => d === 10 || d > limiar).length;
  const criticos = dice.filter((d) => d === 10).length;
  return { ...resultado, dice, successes, criticos, superSucesso: successes >= 3, azaradoAplicado: { indice: idx, original, novo } };
}

// Checa se uma entidade (personagem OU ataque/magia — qualquer coisa com um
// array `descritores`) tem um descritor específico. Único ponto de checagem
// de descritor no motor (docs/SISTEMA_MAGIA.md item 3, função pedida
// explicitamente: temDescritor(entidade, nome)).
export function temDescritor(entidade, nome) {
  return (entidade?.descritores || []).includes(nome);
}

// Grau de um descritor NUMÉRICO genérico: "nome" sozinho no array vale grau
// 1, "nome_N" vale grau N — mesma convenção de "atrasada_1" (ver
// data/magias.js). 23/10 (docs/ATUALIZACAO_23-10.md seção 1, "Acúmulo de
// descritores"): regra de acúmulo de verdade, substitui a soma cega de
// 21/10 — Queimadura/Envenenamento/Carga de fontes diferentes SOMAM os N
// (`modo: "soma"`); Preciso e Lento valem só o MAIOR N entre as fontes
// (`modo: "maior"`), e o documento sugere o mesmo pro Esmagador (ainda "não
// decidido" oficialmente — seção 9 "Abertas" — mas é a leitura adotada
// aqui, mesmo tratamento de Firme/Selado por serem a mesma categoria de
// descritor defensivo de armadura com N, mesmo sem entrar explicitamente na
// lista do documento — decisão minha, ver relatório final).
export function grauDescritorNumerico(descritores, nome, modo = "soma") {
  const ds = descritores || [];
  const regexN = new RegExp(`^${nome}_(\\d+)$`);
  const ocorrencias = ds.reduce((lista, d) => {
    if (d === nome) return [...lista, 1];
    const m = regexN.exec(d);
    return m ? [...lista, parseInt(m[1], 10)] : lista;
  }, []);
  if (ocorrencias.length === 0) return 0;
  return modo === "maior" ? Math.max(...ocorrencias) : ocorrencias.reduce((a, b) => a + b, 0);
}
export function grauQueimadura(descritores) { return grauDescritorNumerico(descritores, "queimadura", "soma"); }
export function grauPreciso(descritores) { return grauDescritorNumerico(descritores, "preciso", "maior"); }
export function grauEsmagador(descritores) { return grauDescritorNumerico(descritores, "esmagador", "maior"); }
export function grauEnvenenamento(descritores) { return grauDescritorNumerico(descritores, "envenenamento", "soma"); }
export function grauCarga(descritores) { return grauDescritorNumerico(descritores, "carga", "soma"); }
// Descritores defensivos de ARMADURA (21/10, docs/ATUALIZACAO_21-10.md
// seção 7.2, planilha armaduras.xlsx) — diferente dos acima, estes vêm do
// character.descritores do PRÓPRIO DEFENSOR (via data/armaduras.js:
// descritoresDeEquipamentoDefensivo + racasCatalogo.js:comGrausEfetivos),
// nunca de descritoresAtaque. Mesma convenção "nome"/"nome_N". Firme não
// acumula (23/10, lista explícita); Selado segue o mesmo tratamento por
// categoria (ver nota acima).
export function grauFirme(descritores) { return grauDescritorNumerico(descritores, "firme", "maior"); }
export function grauSelado(descritores) { return grauDescritorNumerico(descritores, "selado", "maior"); }
export function grauLento(descritores) { return grauDescritorNumerico(descritores, "lento", "maior"); }

export const LIMIAR_SUCESSO = 5; // dado > 5 => 6+ é sucesso
export const LIMIAR_BLINDADO = 6; // dado > 6 => 7+ é sucesso contra Blindado
export const LIMIAR_QUEIMADURA = 7; // dado > 7 => 8+ é sucesso na rolagem de Queimadura
export const LIMIAR_QUEIMADURA_BLINDADO = 8; // dado > 8 => 9+ contra defensor Blindado
export const LIMIAR_ENVENENAMENTO = 6; // dado > 6 => 7+ é sucesso na rolagem de Envenenamento (ignora Blindado)

// Limiar efetivo do dado de ATAQUE contra um defensor: 7+ se o defensor tiver
// Blindado, exceto se o ataque for Perfurante (ignora Blindado) — "quando
// duas habilidades se contradizem, a negação vence" (docs/SISTEMA_MAGIA.md),
// então Perfurante sempre vence Blindado, sem exceção adicional.
//
// 14/10 (docs/MUDANCAS_RACAS_E_MAGIA.md): Blindado Mágico deixou de existir
// como descritor separado — Blindado agora "vale contra qualquer ataque
// (físico ou mágico)", um só descritor pros dois tipos. `tipoAtaque`
// continua no parâmetro (outras partes do motor/chamadores ainda o usam pra
// montar o pool de ataque), mas não entra mais nesta checagem.
//
// Retrocompatibilidade (decisão minha, não pedida explicitamente — listada no
// relatório final): o descritor de PERSONAGEM "ignora_blindado" (concedido
// por Garras e Presas/Agressividade Oni em catalogo-racas.json, de antes
// desta mudança) também ignora Blindado, do mesmo jeito que Perfurante —
// preserva o que essas habilidades já faziam, já que o guia novo não fala
// delas.
//
// "Pesado" (21/10, docs/ATUALIZACAO_21-10.md item 6/seção 5): "os dados de
// ataque precisam de 7+ (como contra Blindado); não soma com Blindado" — ou
// seja, é só mais uma fonte do MESMO limiar elevado (7+), nunca um 8+/9+:
// por isso basta somar "ds.includes('pesado')" na mesma condição OR que já
// elevava o limiar por Blindado do defensor. Perfurante continua vencendo
// os dois (negação sempre vence) — a arma de fogo longa do catálogo
// (Perfurante + Pesado) fica só em 6+, como qualquer Perfurante.
export function limiarAtaque({ atacante, defensor, descritoresAtaque }) {
  const ds = descritoresAtaque || [];
  const perfurante = ds.includes("perfurante") || temDescritor(atacante, "ignora_blindado");
  if (perfurante) return LIMIAR_SUCESSO;
  const elevado = temDescritor(defensor, "blindado") || ds.includes("pesado");
  return elevado ? LIMIAR_BLINDADO : LIMIAR_SUCESSO;
}

// "Extra" de dados da Base Mágica: mana gasta ACIMA do custo da magia (mínimo
// 0). Função única (docs/SISTEMA_MAGIA.md item 4: "Deixe a definição de
// 'extra' em uma única função") — usada tanto pelo painel de Teste (opção
// Base mágica) quanto pela conjuração de magias do catálogo.
export function extraDeManaMagica(manaGasta, custoMagia) {
  return Math.max(0, (manaGasta || 0) - (custoMagia || 0));
}

// Dados da Base Mágica: sempre 2d10 + o extra acima. Não lê nenhum Atributo
// Geral da ficha (docs/SISTEMA_MAGIA.md item 4).
export function diceBaseMagica(manaGasta, custoMagia) {
  return 2 + extraDeManaMagica(manaGasta, custoMagia);
}

// Pool de dados de um ataque FÍSICO: grau do Atributo Geral + grau da
// Proficiência de Combate do ataque + ajuste manual da arma (dados extra ou a
// menos, mínimo 0 no total).
// Lento N (armadura Pesada, 21/10 — docs/ATUALIZACAO_21-10.md seção 7.2):
// "rola N dados a menos em ações físicas (ataque físico e esquiva)" — aqui
// cobre o lado do ataque físico; esquiva é tratada em resolveRolagemDefesa.
// Não afeta ataque MÁGICO (diceAtaqueMagico) de propósito — a regra fala só
// em "ações físicas".
export function diceAtaqueFisico(attacker, atributoKey, profKey, ajusteDados = 0) {
  const base = (GRADE_VALUE[getAttrGrade(attacker, atributoKey)] ?? 1) + (GRADE_VALUE[attacker?.proficiencias?.[profKey]] ?? 1);
  const lento = grauLento(attacker?.descritores);
  return Math.max(0, base + (ajusteDados || 0) - lento);
}

// Contagem de Ofícios Mágicos (docs/MUDANCAS_RACAS_E_MAGIA.md): cada
// disciplina conhecida (até 3, ver `character.disciplinaMagica.oficiosMagicos`)
// conta como 1, "como grau de proficiência" — mais os "ofícios extras"
// concedidos por raça/habilidade (ver racasCatalogo.js:oficiosExtrasDoPersonagem,
// já somado em `disciplinaMagica.oficiosExtras` pelo comGrausEfetivos antes de
// chegar aqui — engine.js não conhece raças, só soma o que já veio pronto).
export function contagemOficiosMagicos(character) {
  const oficios = character?.disciplinaMagica?.oficiosMagicos || [];
  const extras = character?.disciplinaMagica?.oficiosExtras || 0;
  return oficios.length + extras;
}

// Rolagem de recuperação de mana ao lançar ("ofícios mágicos + mana gasta",
// docs/SISTEMA_MAGIA.md item 6/docs/ATUALIZACAO_21-10.md seção 3) — extraída
// pra cá em 21/10 (antes vivia inline em point-amaranth-app.jsx:castMagia)
// pra poder somar o descritor **Reabastecer** (seção 5, 21/10): "+1 dado na
// rolagem de recuperação de mana ao lançar magia". `manaGasta` é o número de
// mana gasto NESTA conjuração (não o total da ficha).
export function diceRecuperacaoMana(character, manaGasta) {
  const reabastecer = temDescritor(character, "reabastecer") ? 1 : 0;
  return contagemOficiosMagicos(character) + (manaGasta || 0) + reabastecer;
}

// Pool de dados de um ataque MÁGICO: Base Mágica (2d10 + extra de mana) +
// (Ofícios Mágicos OU Inteligência, à escolha do jogador a cada conjuração —
// `fonte`: "oficios" default, ou "inteligencia") + ajuste da magia (ex.:
// Mísseis Mágicos é "Base mágica + 1 + Ofícios/Inteligência", ajusteDados=1)
// + 1 dado fixo se o personagem tiver Magia Inata (docs/MUDANCAS_RACAS_E_
// MAGIA.md: "+1d10 extra nas rolagens de magia, não conta como ofício").
// Magias Ofensivas (proficiência) saiu — não existe mais no catálogo.
export function diceAtaqueMagico(attacker, manaGasta, custoMagia, fonte = "oficios", ajusteDados = 0) {
  const contribuicao = fonte === "inteligencia"
    ? (GRADE_VALUE[getAttrGrade(attacker, "inteligencia")] ?? 1)
    : contagemOficiosMagicos(attacker);
  const bonusMagiaInata = attacker?.disciplinaMagica?.magiaInata ? 1 : 0;
  const base = diceBaseMagica(manaGasta, custoMagia) + contribuicao + bonusMagiaInata;
  return Math.max(0, base + (ajusteDados || 0));
}

// Pool de dados de uma criação de ALQUIMIA (21/10, docs/ATUALIZACAO_21-10.md
// seção 4.1): "Destreza + (ofícios OU Inteligência), sem Base mágica nem
// mana extra" — diferente de diceAtaqueMagico, não soma diceBaseMagica
// nenhuma (o item já foi preparado antes, fora de combate; usá-lo não gasta
// MP nem rola Base mágica). `fonte`: "oficios" (padrão) ou "inteligencia",
// mesma escolha de diceAtaqueMagico.
export function diceAtaqueAlquimia(attacker, fonte = "oficios", ajusteDados = 0) {
  const contribuicao = fonte === "inteligencia"
    ? (GRADE_VALUE[getAttrGrade(attacker, "inteligencia")] ?? 1)
    : contagemOficiosMagicos(attacker);
  const destreza = GRADE_VALUE[getAttrGrade(attacker, "destreza")] ?? 1;
  return Math.max(0, destreza + contribuicao + (ajusteDados || 0));
}

// Pool de dados de um ataque de CONSTRUCTO (21/10, docs/ATUALIZACAO_21-10.md
// seção 4.2): "Base mágica (2d10, SEM mana extra) + número de ofícios do
// dono" — fixo em 2d10 (o constructo não gasta MP pra agir, só pra ser
// criado), sem escolha de fonte (Inteligência não entra — quem ataca é o
// constructo, não o dono) e sem o +1 de Magia Inata do dono (o guia não
// menciona Magia Inata em nenhuma das 7 entradas do catálogo de
// Constructo — decisão minha, listada no relatório final).
export function diceAtaqueConstructo(dono, ajusteDados = 0) {
  return Math.max(0, 2 + contagemOficiosMagicos(dono) + (ajusteDados || 0));
}

// Rolagem de DEFESA do personagem atacado (21/10, docs/ATUALIZACAO_21-10.md
// item 1 — "Defesa substitui Resistência Física"): SEMPRE a proficiência
// Defesa (defesaProf — existia no catálogo desde sempre, mas sem função
// mecânica até aqui), contra qualquer tipo de ataque, físico ou mágico, +
// o Atributo Geral que o jogador escolher como base: Destreza pra esquivar
// ou Força pra bloquear (só esses dois são regra fechada — um terceiro
// tipo, tipo "Resistir com Vigor sem penalidade", está em aberto no
// documento, seção 7 item 3, então não é aceito aqui; quem chama decide
// isso na UI). Preciso N penaliza quem esquiva (defesaAtributo
// "destreza"): rola N dados a menos. Esmagador N penaliza quem bloqueia
// (defesaAtributo "forca"): rola N dados a menos. Nenhum dos dois penaliza
// quem usa o outro atributo como base — contrapartida um do outro,
// substituem o antigo Saturante (Saturante = Preciso 2, docs/
// ATUALIZACAO_21-10.md seção 5 — renomeado de "Abrangente" pra "Preciso" a
// pedido do Pedro, 21/10, mesma rodada). `ehMagia`: true quando o ataque
// tem o descritor "magia" — ativa o Resiste a Magia (Descendentes de
// Arcani, ver abaixo). `totalDiceManual` (14/10, ainda mais tarde, pedido
// do Pedro — painel Teste "Ataque"/"Magia": "em vez de perguntar o vigor e
// atributo de defesa do alvo, apenas dê a opção de quantos dados o jogador
// defensor rola"): quando informado, pula o cálculo por atributo+
// proficiência (e o desconto de Preciso/Esmagador, que não fazem mais
// sentido sem um "atributo de defesa" pra checar) e usa esse número direto
// — Resiste a Magia (se o alvo tiver o descritor) continua descontando 1
// dado por cima, igual no cálculo normal.
export function resolveRolagemDefesa({ defensor, defesaAtributo, descritoresAtaque = [], ehMagia, limiar = LIMIAR_SUCESSO, totalDiceManual }) {
  const profKey = "defesaProf";
  let totalDice;
  let firmeGarantidos = 0;
  if (totalDiceManual != null) {
    totalDice = Math.max(0, totalDiceManual);
  } else {
    totalDice = (GRADE_VALUE[getAttrGrade(defensor, defesaAtributo)] ?? 1) + (GRADE_VALUE[defensor?.proficiencias?.[profKey]] ?? 1);
    // Bônus de Defesa em dados da armadura equipada (21/10, seção 7.1,
    // Regra 2) — já vem somado em `defensor.bonusDefesaEquipamento`
    // (racasCatalogo.js:comGrausEfetivos, via data/armaduras.js:
    // bonusDefesaDeEquipamento); engine.js só soma o número.
    totalDice += defensor?.bonusDefesaEquipamento || 0;
    const preciso = grauPreciso(descritoresAtaque);
    if (preciso && defesaAtributo === "destreza") totalDice = Math.max(0, totalDice - preciso);
    const esmagador = grauEsmagador(descritoresAtaque);
    if (esmagador && defesaAtributo === "forca") totalDice = Math.max(0, totalDice - esmagador);
    // Lento N (armadura Pesada, 21/10): -N dados na esquiva (Destreza), não
    // no bloqueio — mesma regra de diceAtaqueFisico, lado da defesa.
    const lento = defesaAtributo === "destreza" ? grauLento(defensor?.descritores) : 0;
    if (lento) totalDice = Math.max(0, totalDice - lento);
    // Firme N (escudo, 21/10 — docs/ATUALIZACAO_21-10.md seção 7.2): "só ao
    // bloquear. Tira N dados da sua rolagem de defesa e considera N
    // sucessos como garantidos." Descritor do DEFENSOR (vem do equipamento,
    // ver data/armaduras.js/racasCatalogo.js:comGrausEfetivos), não do
    // ataque — por isso lê `defensor?.descritores`, não `descritoresAtaque`.
    if (defesaAtributo === "forca") {
      firmeGarantidos = grauFirme(defensor?.descritores);
      if (firmeGarantidos) totalDice = Math.max(0, totalDice - firmeGarantidos);
    }
    // Sem a perícia da família da armadura/escudo equipados (Regra 4, 21/10):
    // -1 dado por peça sem perícia — já vem somado em
    // `defensor.penalidadeDefesaSemPericia` (racasCatalogo.js:comGrausEfetivos,
    // via data/armaduras.js:penalidadeDefesaSemPericiaDoPersonagem), engine.js
    // só consome o número, sem conhecer armadura nenhuma.
    const penalidadeSemPericia = defensor?.penalidadeDefesaSemPericia || 0;
    if (penalidadeSemPericia) totalDice = Math.max(0, totalDice - penalidadeSemPericia);
  }
  // Resiste a Magia (Descendentes de Arcani, catalogo-racas.json): ao se
  // defender de um ataque com o descritor "magia", rola 1 dado a menos e tem
  // 1 sucesso sempre garantido — substitui o antigo Blindado Mágico dessa raça.
  const resisteAMagia = !!ehMagia && temDescritor(defensor, "resiste_a_magia");
  if (resisteAMagia) totalDice = Math.max(0, totalDice - 1);
  // sortudo_esquiva (21/10, Coelho/Bode — docs/ATUALIZACAO_21-10.md seção
  // 8.5: "Sortudo ao esquivar"): mesma restrição de sortudo_fisico, mas por
  // ATRIBUTO de defesa em vez de tipo de ataque — só vale quando a defesa
  // usa Destreza (esquivar), nunca ao bloquear.
  const temSortudo = temDescritor(defensor, "sortudo")
    || (defesaAtributo === "destreza" && temDescritor(defensor, "sortudo_esquiva"));
  const rolagem = rolarComSortudo(totalDice, limiar, temSortudo);
  if (firmeGarantidos) rolagem.successes += firmeGarantidos; // sucessos garantidos do Firme N somam direto, sem rolar
  if (resisteAMagia && rolagem.successes < 1) rolagem.successes = 1; // 1 sucesso sempre garantido
  return { ...rolagem, totalDice, profKey, resisteAMagia, firmeGarantidos };
}

// Determina o tipo de ferimento causado pelos sucessos líquidos de um ataque
// (docs/SISTEMA_MAGIA.md — Dano, atualizado 21/10 por docs/ATUALIZACAO_21-10.md
// seção 2): sem sucesso líquido, sem ferimento. "superficialForcado" (magia
// marcada "superficial") sempre causa superficial, mesmo com sucessos
// líquidos altos. Senão: agravante se sucessos líquidos >= Vigor do
// defensor (grau cheio). Letal reduz esse Vigor necessário em 1 (mínimo 1).
// Resistente (descritor do DEFENSOR, 21/10) soma +1 ao Vigor necessário —
// "não acumula" (é um booleano, não um grau: ter o descritor de mais de uma
// fonte não soma mais que +1) "e anula Letal" (os dois presentes ao mesmo
// tempo voltam pro Vigor normal, sem +1 nem -1) — texto exato do Pedro.
export function determinarFerimento({ sucessosLiquidos, vigorGrauCheio, letal, resistente, superficialForcado }) {
  if (sucessosLiquidos <= 0) return null;
  if (superficialForcado) return "superficial";
  const vigorBase = vigorGrauCheio ?? 1;
  let vigorNecessario = vigorBase;
  if (letal && !resistente) vigorNecessario = Math.max(1, vigorBase - 1);
  else if (resistente && !letal) vigorNecessario = vigorBase + 1;
  return sucessosLiquidos >= vigorNecessario ? "agravante" : "superficial";
}

// Aplica `quantidade` ferimentos de um `tipo` ("agravante"|"superficial") num
// hp = { current, max, superficiais }. "superficiais" é NOVO (14/10): conta
// quantos pontos de HP já têm um ferimento superficial registrado, pra
// aplicar a regra "com todos os pontos quebrados, os próximos ferimentos
// viram agravantes" — sem esse contador persistido não dá pra saber quantos
// pontos já foram "quebrados" entre um ataque e outro (o clique manual de
// rachar/quebrar da UI é só um efeito visual passageiro, não salva nada).
// Agravante remove 1 HP de verdade; superficial só marca (não reduz HP), a
// não ser que todos os pontos restantes já estejam marcados — aí vira
// agravante mesmo. Clamps current em 0 e superficiais em current.
export function aplicarFerimentos(hp, tipo, quantidade = 1) {
  let current = hp?.current ?? 0;
  let superficiais = hp?.superficiais ?? 0;
  for (let i = 0; i < quantidade; i++) {
    const viraAgravante = tipo === "agravante" || superficiais >= current;
    if (viraAgravante) {
      current = Math.max(0, current - 1);
      superficiais = Math.min(superficiais, current);
    } else {
      superficiais = Math.min(current, superficiais + 1);
    }
  }
  return { ...hp, current, superficiais };
}

// Descritor "Queimadura N" (Pedro, 19/10) — efeito separado do dano
// principal: só dispara se o ataque causou PELO MENOS 1 sucesso líquido
// (sucessosLiquidosAtaque, já calculado pelo chamador); rola N d10 PRÓPRIOS
// (fora do pool do ataque principal), sem rolagem de defesa — sucesso em 8+
// (9+ se o defensor tiver Blindado; Perfurante/ignora_blindado ainda ignora
// Blindado, mesma regra de limiarAtaque), 10 natural sempre sucesso
// (rollSuccessDice já cobre isso). Cada sucesso = 1 ferimento PRÓPRIO, que
// NÃO soma com os sucessos líquidos do ataque principal (ferimentos
// contados à parte). Ferimento superficial por padrão; agravante só se os
// sucessos de queimadura >= Vigor do alvo (grau cheio; Letal do MESMO
// ataque reduz em 1, mínimo 1 — mesma fórmula de determinarFerimento, só
// que aplicada aos sucessos da queimadura, não aos do ataque). Sortudo não
// é mencionado na regra do Pedro pra este efeito — não aplicado aqui
// (decisão minha, listada no relatório final). Devolve null quando não há
// Queimadura no ataque ou quando o ataque não causou sucesso líquido.
export function resolveQueimadura({ attacker, defender, descritoresAtaque = [], sucessosLiquidosAtaque }) {
  // Selado N (armadura, 21/10 — docs/ATUALIZACAO_21-10.md seção 7.2): "a
  // Queimadura... contra você rolam N dados a menos" — desconta ANTES do
  // "não há Queimadura" (grau<=0), igual Preciso/Esmagador descontam antes
  // de checar o pool.
  const grau = Math.max(0, grauQueimadura(descritoresAtaque) - grauSelado(defender?.descritores));
  if (grau <= 0 || !sucessosLiquidosAtaque || sucessosLiquidosAtaque < 1) return null;
  const perfurante = descritoresAtaque.includes("perfurante") || temDescritor(attacker, "ignora_blindado");
  const limiar = perfurante
    ? LIMIAR_QUEIMADURA
    : (temDescritor(defender, "blindado") ? LIMIAR_QUEIMADURA_BLINDADO : LIMIAR_QUEIMADURA);
  const rolagem = rollSuccessDice(grau, limiar);
  const letal = descritoresAtaque.includes("letal");
  const resistente = temDescritor(defender, "resistente");
  const vigorGrauCheio = GRADE_VALUE[getAttrGrade(defender, "vigor")] ?? 1;
  const tipoFerimento = determinarFerimento({
    sucessosLiquidos: rolagem.successes, vigorGrauCheio, letal, resistente, superficialForcado: false,
  });
  return {
    dados: grau, limiar, rolagem, sucessos: rolagem.successes,
    tipoFerimento, feridas: tipoFerimento ? rolagem.successes : 0,
  };
}

// Descritor "Envenenamento N" (21/10, docs/ATUALIZACAO_21-10.md seção 5 +
// planilha oficios-por-aba.xlsx, aba "Descritores novos" — texto mais
// detalhado que o do documento principal, usado aqui ao pé da letra): age
// na hora, sem controle de turnos — igual Queimadura, só dispara com >=1
// sucesso líquido no ataque principal. Rola N d10 PRÓPRIOS, sucesso em 7+,
// IGNORA defesa e Blindado (nunca 9+, diferente de Queimadura — por isso
// não lê `defender` pra limiar nenhum). Não importa quantos sucessos saírem
// na rolagem de veneno: com >=1, é SEMPRE exatamente 1 ferimento superficial
// (nunca agravante — Letal/Resistente não entram aqui, o glossário não fala
// deles pra Envenenamento). Limite por alvo: o total de ferimentos de
// veneno que ele pode acumular é o MAIOR N de veneno já recebido com
// sucesso — por isso recebe e devolve `limiteAtual`/`feridasAtuais`
// (estado persistido no personagem, ver character.veneno em personagens.js/
// point-amaranth-app.jsx); already-no-limite "nada acontece" (nem ferimento
// nem gasto do limite). Zera na cura ou no descanso longo — NÃO no fim de
// cena (por isso é um estado à parte de hp.superficiais, que não distingue
// a origem do ferimento).
export function resolveEnvenenamento({ defender, descritoresAtaque = [], sucessosLiquidosAtaque, limiteAtual = 0, feridasAtuais = 0 }) {
  // Imunidade total (21/10, Descendentes de Sharkan — docs/ATUALIZACAO_21-10.md
  // seção 8.4: "imune a Envenenamento"): diferente de Selado N (que só
  // desconta N dados), zera o efeito por completo, sem rolar nada.
  if (temDescritor(defender, "imune_envenenamento")) return null;
  // Selado N (armadura, 21/10): "o Envenenamento... contra você rolam N
  // dados a menos" — mesmo desconto de resolveQueimadura.
  const grau = Math.max(0, grauEnvenenamento(descritoresAtaque) - grauSelado(defender?.descritores));
  if (grau <= 0 || !sucessosLiquidosAtaque || sucessosLiquidosAtaque < 1) return null;
  const rolagem = rollSuccessDice(grau, LIMIAR_ENVENENAMENTO);
  const teveSucesso = rolagem.successes >= 1;
  const novoLimite = teveSucesso ? Math.max(limiteAtual, grau) : limiteAtual;
  const noLimite = feridasAtuais >= novoLimite;
  const aplicouFerimento = teveSucesso && !noLimite;
  return {
    dados: grau, rolagem, sucessos: rolagem.successes,
    limiteAntes: limiteAtual, limiteDepois: novoLimite,
    feridasAntes: feridasAtuais, feridasDepois: aplicouFerimento ? feridasAtuais + 1 : feridasAtuais,
    aplicouFerimento,
  };
}

// Descritor "Carga N" (21/10, docs/ATUALIZACAO_21-10.md seção 5 + planilha,
// aba "Descritores novos"): NÃO rola dados próprios na aplicação — cada
// SUCESSO LÍQUIDO do ataque principal (o mesmo `sucessosLiquidosAtaque` que
// vira ferimento) deixa 1 carga no alvo (estado persistido, ver
// character.cargas). Quando as cargas (já somando as desta aplicação)
// chegam ao N do ataque que ACABOU de carregar (não a um N diferente de
// uma carga anterior), descarrega: N dados extras a 6+, SEM rolagem de
// defesa, cada sucesso = 1 ferimento (agravante se >= Vigor do alvo, grau
// cheio; Letal/Resistente do MESMO ataque que descarregou valem, mesma
// fórmula de determinarFerimento). As cargas voltam a 0 ao descarregar (ou
// ficam no alvo até lá / até o descanso longo). "Quem pôs a última carga
// faz a descarga" (texto do Pedro) já é automático aqui: quem chama
// resolveCarga é sempre o atacante do golpe que disparou o gatilho.
export function resolveCarga({ defender, descritoresAtaque = [], sucessosLiquidosAtaque, cargasAtuais = 0 }) {
  const grau = grauCarga(descritoresAtaque);
  if (grau <= 0 || !sucessosLiquidosAtaque || sucessosLiquidosAtaque < 1) return null;
  const cargasDepoisDeAcumular = cargasAtuais + sucessosLiquidosAtaque;
  if (cargasDepoisDeAcumular < grau) {
    return {
      grauAtaque: grau, cargasAntes: cargasAtuais, cargasAdicionadas: sucessosLiquidosAtaque,
      cargasDepois: cargasDepoisDeAcumular, descarregou: false, descarga: null,
    };
  }
  const rolagem = rollSuccessDice(grau, LIMIAR_SUCESSO);
  const letal = descritoresAtaque.includes("letal");
  const resistente = temDescritor(defender, "resistente");
  const vigorGrauCheio = GRADE_VALUE[getAttrGrade(defender, "vigor")] ?? 1;
  const tipoFerimento = determinarFerimento({
    sucessosLiquidos: rolagem.successes, vigorGrauCheio, letal, resistente, superficialForcado: false,
  });
  return {
    grauAtaque: grau, cargasAntes: cargasAtuais, cargasAdicionadas: sucessosLiquidosAtaque,
    cargasDepois: 0, descarregou: true,
    descarga: { dados: grau, rolagem, sucessos: rolagem.successes, tipoFerimento, feridas: tipoFerimento ? rolagem.successes : 0 },
  };
}

// Descritor "Drenante" (21/10, docs/ATUALIZACAO_21-10.md seção 5): com >=1
// sucesso líquido, o alvo perde 1 mana DISPONÍVEL e o atacante recupera 1
// mana GASTA (nunca quebrada) — uma vez por ataque. Não rola dado nenhum;
// só sinaliza que deve acontecer — quem chama (UI) aplica o MP real nos
// dois personagens (ver mp.quebrada/quebrarMana/repararMana — "nunca
// quebrada" é automático, porque a mana quebrada já fica fora do teto que
// current pode recuperar).
// CORREÇÃO (21/10, mesma sessão do catálogo de armaduras — a versão mais
// recente do documento fecha o que antes era provisório): "Alvo sem mana: o
// atacante não recupera nada" — a versão anterior ("provisório: atacante
// recupera mesmo assim") foi substituída; agora `resolveDrenante` lê
// `defender.mp.current` de verdade em vez de sempre devolver 1.
// Selado N (armadura, seção 7.2): "o Drenante não funciona contra você" —
// anula o efeito por completo (nem o alvo perde, nem o atacante recupera),
// não é um desconto de N dados como em Queimadura/Envenenamento (Drenante
// não rola dado nenhum pra haver o que descontar).
export function resolveDrenante({ defender, descritoresAtaque = [], sucessosLiquidosAtaque }) {
  if (!descritoresAtaque.includes("drenante") || !sucessosLiquidosAtaque || sucessosLiquidosAtaque < 1) return null;
  if (grauSelado(defender?.descritores) > 0) {
    return { aplicou: false, bloqueadoPorSelado: true, manaRoubadaDoAlvo: 0, manaRecuperadaPeloAtacante: 0 };
  }
  const alvoTemMana = (defender?.mp?.current ?? 0) > 0;
  return { aplicou: true, manaRoubadaDoAlvo: alvoTemMana ? 1 : 0, manaRecuperadaPeloAtacante: alvoTemMana ? 1 : 0 };
}

// Resolução de um ataque genérico (físico ou mágico) — docs/SISTEMA_MAGIA.md.
// `totalDiceAtaque` já vem calculado pelo chamador (diceAtaqueFisico ou
// diceAtaqueMagico), porque a origem do pool difere bastante entre os dois
// (atributo da ficha vs Base Mágica) — mantém esta função agnóstica à fonte.
// `descritoresAtaque` é o array de descritores do PRÓPRIO ataque/magia (ex.:
// ["letal"], ["perfurante"], ["saturante", "sortudo"]). `defesaAtributo` é o
// Atributo Geral que o defensor está usando como base da defesa (escolha do
// jogador, ver UI). `feridas`/`superficial` vêm da arma/magia (padrão 1
// ferida, não forçado a superficial). `limiarOverride` (14/10, ainda mais
// tarde — painel Teste, aba "Magia": "Limiar de sucesso" virou um campo
// editável, igual a aba Teste) pula o cálculo automático de
// limiarAtaque (Blindado/Perfurante) e usa o valor direto. `totalDiceDefesaManual`
// repassa pra resolveRolagemDefesa (ver lá) — usado pela aba "Ataque", que
// trocou "atributo de defesa + grau" por um número direto de dados.
export function resolveAtaque({
  attacker, defender, tipoAtaque, totalDiceAtaque, descritoresAtaque = [], defesaAtributo,
  feridas = 1, superficial = false, limiarOverride, totalDiceDefesaManual,
  cargasAtuais = 0, envenenamentoLimiteAtual = 0, envenenamentoFeridasAtuais = 0,
}) {
  const limiar = limiarOverride != null ? limiarOverride : limiarAtaque({ atacante: attacker, defensor: defender, descritoresAtaque });
  const ehMagia = descritoresAtaque.includes("magia");
  // Sortudo "normal" (personagem ou a própria magia/arma) vale pra qualquer
  // ataque. "sortudo_fisico" (14/10, Descendentes de Sabato — pedido do
  // Pedro) é uma versão restrita: só ativa quando o ataque NÃO é mágico.
  const temSortudoAtacante = temDescritor(attacker, "sortudo") || descritoresAtaque.includes("sortudo")
    || (!ehMagia && temDescritor(attacker, "sortudo_fisico"));
  let rolagemAtaque = rolarComSortudo(totalDiceAtaque, limiar, temSortudoAtacante);
  // Azarado (21/10, descritor do DEFENSOR): re-rola o primeiro sucesso do
  // ATACANTE, incondicional — depois do Sortudo (ver aplicarAzarado acima).
  if (temDescritor(defender, "azarado")) {
    rolagemAtaque = aplicarAzarado(rolagemAtaque, limiar);
  }
  const rolagemDefesa = resolveRolagemDefesa({ defensor: defender, defesaAtributo, descritoresAtaque, ehMagia, totalDiceManual: totalDiceDefesaManual });
  const sucessosLiquidos = Math.max(0, rolagemAtaque.successes - rolagemDefesa.successes);
  const letal = descritoresAtaque.includes("letal");
  const resistente = temDescritor(defender, "resistente");
  const vigorGrauCheio = GRADE_VALUE[getAttrGrade(defender, "vigor")] ?? 1;
  const tipoFerimento = determinarFerimento({ sucessosLiquidos, vigorGrauCheio, letal, resistente, superficialForcado: superficial });
  const queimadura = resolveQueimadura({ attacker, defender, descritoresAtaque, sucessosLiquidosAtaque: sucessosLiquidos });
  const envenenamento = resolveEnvenenamento({
    defender, descritoresAtaque, sucessosLiquidosAtaque: sucessosLiquidos,
    limiteAtual: envenenamentoLimiteAtual, feridasAtuais: envenenamentoFeridasAtuais,
  });
  const carga = resolveCarga({ defender, descritoresAtaque, sucessosLiquidosAtaque: sucessosLiquidos, cargasAtuais });
  const drenante = resolveDrenante({ defender, descritoresAtaque, sucessosLiquidosAtaque: sucessosLiquidos });
  return {
    limiar, rolagemAtaque, rolagemDefesa, sucessosLiquidos, letal, resistente,
    tipoFerimento, feridas: tipoFerimento ? feridas : 0, queimadura, envenenamento, carga, drenante,
  };
}

// Descritor "Em área" (docs/SISTEMA_MAGIA.md): "atinge todos os alvos da
// zona; cada alvo rola a própria defesa; o conjurador rola uma vez; aliados
// na zona também são atingidos". O conjurador rola os dados do ataque UMA
// única vez (mesmas faces pra todo mundo); cada defensor rola a própria
// defesa e tem os sucessos recontados com o SEU limiar (um alvo Blindado
// ainda exige 7+ nessas mesmas faces, mesmo que outro alvo na área não seja).
// `defenders` é a lista de todos os atingidos (inimigos e aliados na zona).
// `defesaAtributoPorDefensor(defender)` escolhe o Atributo Geral de defesa de
// cada um (default: pede o mesmo pra todos via `defesaAtributo`).
export function resolveAtaqueEmArea({
  attacker, defenders, tipoAtaque, totalDiceAtaque, descritoresAtaque = [], defesaAtributo, defesaAtributoPorDefensor,
  feridas = 1, superficial = false, cargasAtuaisPorDefensor,
}) {
  const ehMagia = descritoresAtaque.includes("magia");
  // Mesma regra de resolveAtaque: sortudo_fisico só ativa fora de magia.
  const temSortudoAtacante = temDescritor(attacker, "sortudo") || descritoresAtaque.includes("sortudo")
    || (!ehMagia && temDescritor(attacker, "sortudo_fisico"));
  const rolagemAtaqueBase = rolarComSortudo(totalDiceAtaque, LIMIAR_SUCESSO, temSortudoAtacante);
  const resultados = (defenders || []).map((defender) => {
    const limiar = limiarAtaque({ atacante: attacker, defensor: defender, descritoresAtaque });
    const sucessosAtaque = rolagemAtaqueBase.dice.filter((d) => d === 10 || d > limiar).length;
    const atributoDefesa = defesaAtributoPorDefensor ? defesaAtributoPorDefensor(defender) : defesaAtributo;
    const rolagemDefesa = resolveRolagemDefesa({ defensor: defender, defesaAtributo: atributoDefesa, descritoresAtaque, ehMagia });
    const sucessosLiquidos = Math.max(0, sucessosAtaque - rolagemDefesa.successes);
    const letal = descritoresAtaque.includes("letal");
    const resistente = temDescritor(defender, "resistente");
    const vigorGrauCheio = GRADE_VALUE[getAttrGrade(defender, "vigor")] ?? 1;
    const tipoFerimento = determinarFerimento({ sucessosLiquidos, vigorGrauCheio, letal, resistente, superficialForcado: superficial });
    const queimadura = resolveQueimadura({ attacker, defender, descritoresAtaque, sucessosLiquidosAtaque: sucessosLiquidos });
    const cargasAtuais = cargasAtuaisPorDefensor ? cargasAtuaisPorDefensor(defender) : 0;
    const carga = resolveCarga({ defender, descritoresAtaque, sucessosLiquidosAtaque: sucessosLiquidos, cargasAtuais });
    const drenante = resolveDrenante({ defender, descritoresAtaque, sucessosLiquidosAtaque: sucessosLiquidos });
    return {
      defender, limiar, sucessosAtaque, rolagemDefesa, sucessosLiquidos, letal, resistente,
      tipoFerimento, feridas: tipoFerimento ? feridas : 0, queimadura, carga, drenante,
    };
  });
  return { rolagemAtaqueBase, resultados };
}
