// Motor de combate do Point (universo Amaranth) — extraído de point-amaranth-app.jsx
// pra poder ser testado com Node puro, sem depender de React/JSX/ícones.
// point-amaranth-app.jsx importa deste módulo — esta é a fonte única da lógica
// de regras. Não duplique estas funções de volta no jsx.
//
// Fonte de verdade das regras de combate/magia: os TRÊS arquivos juntos —
// docs/SISTEMA_MAGIA.md (guia geral, atualizado em 15/10 pra parar de citar
// Resistência Mágica/Blindado Mágico/Magias Ofensivas/Manipulação de Mana,
// todos extintos), docs/MUDANCAS_RACAS_E_MAGIA.md e docs/DISCIPLINAS_MAGIA.md
// (14/10, detalham raças/disciplinas/catálogo de magias com mais precisão —
// onde algum dos três divergir dos outros dois, valem esses dois por serem
// mais recentes e específicos). Substituem o modelo antigo de Acerto/
// Confirmação em duas fases por rolagem + ferimento direto. SISTEMA.md (mais
// antigo) ainda cobre o que não mudou (Teste genérico, recursos, status
// effects de texto livre). Ver CONTEXTO.md pro "porquê" de cada decisão de
// design.

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
export const PROFICIENCIAS_LIST = [
  // Combate — perícias usadas nos cálculos de combate (somam com o atributo correspondente).
  // "Briga" foi eliminada (21/09) — Ataque desarmado passou a usar Combate Corpo a Corpo,
  // igual toda arma branca. Fichas salvas com profKey "briga" migram automaticamente.
  { key: "armasDeFogo", label: "Armas de Fogo", categoria: "combate" },
  { key: "combateCorpoACorpo", label: "Combate Corpo a Corpo", categoria: "combate" },
  { key: "defesaProf", label: "Defesa", categoria: "combate" },
  { key: "resistFisicaProf", label: "Resistência Física", categoria: "combate" },
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
export const STAT_LIST = [
  { key: "defesa", label: "Defesa" },
  { key: "resistArmadura", label: "Resistência Armadura" },
  { key: "geral", label: "Geral" },
];

// Vínculo padrão sugerido entre atributo e estatística de combate — o grau do
// atributo soma automaticamente na estatística vinculada (bônus E=0..A=+4).
// Isso é uma SUGESTÃO ajustável por ficha (não uma regra confirmada no material
// original) — dá pra reatribuir por personagem em "Vínculos de atributo".
export const DEFAULT_STAT_LINKS = {
  acerto: ["destreza"],
  defesa: [],
  resistArmadura: [],
  geral: [],
};

export const STAT_BASE_DEFAULTS = { acerto: 0, defesa: 8, resistArmadura: 8, geral: 0 };

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
export function descritoresEfetivosDoAtaque(attacker, attack) {
  const base = attack?.descritores || [];
  if (attack?.ehDesarmado && temDescritor(attacker, "desarmado_letal") && !base.includes("letal")) {
    return [...base, "letal"];
  }
  return base;
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
export function computeMaxHP(character) {
  const bonusPersistente = (character?.procs || []).includes("persistente") ? 1 : 0;
  return 2 + attrBonus(character?.atributosGerais?.vigor) + bonusPersistente;
}

export function computeMaxSP(character) {
  const base = character?.sp?.max ?? 3;
  const bonusPersistente = (character?.procs || []).includes("persistente") ? 1 : 0;
  return base + bonusPersistente;
}

// MP (mana) máximo: 1 a 6 (docs/SISTEMA_MAGIA.md item 7). Magia Inata (+1 MP
// máximo) soma aqui, igual Persistente soma em HP/SP. Magia Inata virou um
// flag independente (`disciplinaMagica.magiaInata`, 14/10 docs/MUDANCAS_
// RACAS_E_MAGIA.md) — não é mais um "tipo" de disciplina exclusivo com
// Ofício Mágico: um personagem pode ter Ofícios Mágicos E Magia Inata ao
// mesmo tempo.
export const MANA_MIN = 1;
export const MANA_MAX = 6;
export function computeMaxMana(character) {
  const bonusMagiaInata = character?.disciplinaMagica?.magiaInata ? 1 : 0;
  const base = character?.mp?.max ?? 3;
  return Math.max(MANA_MIN, Math.min(MANA_MAX, base + bonusMagiaInata));
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
// que soma junto com os atributos vinculados (hoje só Defesa).
export const STAT_PROF_LINK = { defesa: "defesaProf" };

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

// Checa se uma entidade (personagem OU ataque/magia — qualquer coisa com um
// array `descritores`) tem um descritor específico. Único ponto de checagem
// de descritor no motor (docs/SISTEMA_MAGIA.md item 3, função pedida
// explicitamente: temDescritor(entidade, nome)).
export function temDescritor(entidade, nome) {
  return (entidade?.descritores || []).includes(nome);
}

export const LIMIAR_SUCESSO = 5; // dado > 5 => 6+ é sucesso
export const LIMIAR_BLINDADO = 6; // dado > 6 => 7+ é sucesso contra Blindado

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
export function limiarAtaque({ atacante, defensor, descritoresAtaque }) {
  const ds = descritoresAtaque || [];
  const perfurante = ds.includes("perfurante") || temDescritor(atacante, "ignora_blindado");
  if (perfurante) return LIMIAR_SUCESSO;
  return temDescritor(defensor, "blindado") ? LIMIAR_BLINDADO : LIMIAR_SUCESSO;
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
export function diceAtaqueFisico(attacker, atributoKey, profKey, ajusteDados = 0) {
  const base = (GRADE_VALUE[getAttrGrade(attacker, atributoKey)] ?? 1) + (GRADE_VALUE[attacker?.proficiencias?.[profKey]] ?? 1);
  return Math.max(0, base + (ajusteDados || 0));
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

// Rolagem de DEFESA do personagem atacado: SEMPRE Resistência Física, contra
// qualquer tipo de ataque (14/10, docs/MUDANCAS_RACAS_E_MAGIA.md — "Contra
// qualquer ataque o defensor rola apenas Resistência Física"; Resistência
// Mágica saiu do catálogo) + o Atributo Geral que o jogador escolher como
// base da defesa. Saturante: se `defesaAtributo` for "destreza", rola 2
// dados a menos (mín. 0). `ehMagia`: true quando o ataque tem o descritor
// "magia" — ativa o Resiste a Magia (Descendentes de Arcani, ver abaixo).
// `totalDiceManual` (14/10, ainda mais tarde, pedido do Pedro — painel Teste
// "Ataque"/"Magia": "em vez de perguntar o vigor e atributo de defesa do
// alvo, apenas dê a opção de quantos dados o jogador defensor rola"): quando
// informado, pula o cálculo por atributo+proficiência (e o desconto de
// Saturante, que não faz mais sentido sem um "atributo de defesa" pra
// checar) e usa esse número direto — Resiste a Magia (se o alvo tiver o
// descritor) continua descontando 1 dado por cima, igual no cálculo normal.
export function resolveRolagemDefesa({ defensor, defesaAtributo, saturante, ehMagia, limiar = LIMIAR_SUCESSO, totalDiceManual }) {
  const profKey = "resistFisicaProf";
  let totalDice;
  if (totalDiceManual != null) {
    totalDice = Math.max(0, totalDiceManual);
  } else {
    totalDice = (GRADE_VALUE[getAttrGrade(defensor, defesaAtributo)] ?? 1) + (GRADE_VALUE[defensor?.proficiencias?.[profKey]] ?? 1);
    if (saturante && defesaAtributo === "destreza") totalDice = Math.max(0, totalDice - 2);
  }
  // Resiste a Magia (Descendentes de Arcani, catalogo-racas.json): ao se
  // defender de um ataque com o descritor "magia", rola 1 dado a menos e tem
  // 1 sucesso sempre garantido — substitui o antigo Blindado Mágico dessa raça.
  const resisteAMagia = !!ehMagia && temDescritor(defensor, "resiste_a_magia");
  if (resisteAMagia) totalDice = Math.max(0, totalDice - 1);
  const temSortudo = temDescritor(defensor, "sortudo");
  const rolagem = rolarComSortudo(totalDice, limiar, temSortudo);
  if (resisteAMagia && rolagem.successes < 1) rolagem.successes = 1; // 1 sucesso sempre garantido
  return { ...rolagem, totalDice, profKey, resisteAMagia };
}

// Determina o tipo de ferimento causado pelos sucessos líquidos de um ataque
// (docs/SISTEMA_MAGIA.md — Dano): sem sucesso líquido, sem ferimento.
// "superficialForcado" (magia marcada "superficial") sempre causa superficial,
// mesmo com sucessos líquidos altos. Senão: agravante se sucessos líquidos >=
// Vigor do defensor (grau cheio; Letal reduz esse Vigor necessário em 1,
// mínimo 1) — superficial caso contrário.
export function determinarFerimento({ sucessosLiquidos, vigorGrauCheio, letal, superficialForcado }) {
  if (sucessosLiquidos <= 0) return null;
  if (superficialForcado) return "superficial";
  const vigorNecessario = letal ? Math.max(1, (vigorGrauCheio ?? 1) - 1) : (vigorGrauCheio ?? 1);
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
export function resolveAtaque({ attacker, defender, tipoAtaque, totalDiceAtaque, descritoresAtaque = [], defesaAtributo, feridas = 1, superficial = false, limiarOverride, totalDiceDefesaManual }) {
  const limiar = limiarOverride != null ? limiarOverride : limiarAtaque({ atacante: attacker, defensor: defender, descritoresAtaque });
  const ehMagia = descritoresAtaque.includes("magia");
  // Sortudo "normal" (personagem ou a própria magia/arma) vale pra qualquer
  // ataque. "sortudo_fisico" (14/10, Descendentes de Sabato — pedido do
  // Pedro) é uma versão restrita: só ativa quando o ataque NÃO é mágico.
  const temSortudoAtacante = temDescritor(attacker, "sortudo") || descritoresAtaque.includes("sortudo")
    || (!ehMagia && temDescritor(attacker, "sortudo_fisico"));
  const rolagemAtaque = rolarComSortudo(totalDiceAtaque, limiar, temSortudoAtacante);
  const saturante = descritoresAtaque.includes("saturante");
  const rolagemDefesa = resolveRolagemDefesa({ defensor: defender, defesaAtributo, saturante, ehMagia, totalDiceManual: totalDiceDefesaManual });
  const sucessosLiquidos = Math.max(0, rolagemAtaque.successes - rolagemDefesa.successes);
  const letal = descritoresAtaque.includes("letal");
  const vigorGrauCheio = GRADE_VALUE[getAttrGrade(defender, "vigor")] ?? 1;
  const tipoFerimento = determinarFerimento({ sucessosLiquidos, vigorGrauCheio, letal, superficialForcado: superficial });
  return {
    limiar, rolagemAtaque, rolagemDefesa, sucessosLiquidos, letal,
    tipoFerimento, feridas: tipoFerimento ? feridas : 0,
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
export function resolveAtaqueEmArea({ attacker, defenders, tipoAtaque, totalDiceAtaque, descritoresAtaque = [], defesaAtributo, defesaAtributoPorDefensor, feridas = 1, superficial = false }) {
  const ehMagia = descritoresAtaque.includes("magia");
  // Mesma regra de resolveAtaque: sortudo_fisico só ativa fora de magia.
  const temSortudoAtacante = temDescritor(attacker, "sortudo") || descritoresAtaque.includes("sortudo")
    || (!ehMagia && temDescritor(attacker, "sortudo_fisico"));
  const rolagemAtaqueBase = rolarComSortudo(totalDiceAtaque, LIMIAR_SUCESSO, temSortudoAtacante);
  const resultados = (defenders || []).map((defender) => {
    const limiar = limiarAtaque({ atacante: attacker, defensor: defender, descritoresAtaque });
    const sucessosAtaque = rolagemAtaqueBase.dice.filter((d) => d === 10 || d > limiar).length;
    const atributoDefesa = defesaAtributoPorDefensor ? defesaAtributoPorDefensor(defender) : defesaAtributo;
    const saturante = descritoresAtaque.includes("saturante");
    const rolagemDefesa = resolveRolagemDefesa({ defensor: defender, defesaAtributo: atributoDefesa, saturante, ehMagia });
    const sucessosLiquidos = Math.max(0, sucessosAtaque - rolagemDefesa.successes);
    const letal = descritoresAtaque.includes("letal");
    const vigorGrauCheio = GRADE_VALUE[getAttrGrade(defender, "vigor")] ?? 1;
    const tipoFerimento = determinarFerimento({ sucessosLiquidos, vigorGrauCheio, letal, superficialForcado: superficial });
    return {
      defender, limiar, sucessosAtaque, rolagemDefesa, sucessosLiquidos, letal,
      tipoFerimento, feridas: tipoFerimento ? feridas : 0,
    };
  });
  return { rolagemAtaqueBase, resultados };
}
