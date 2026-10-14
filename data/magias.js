// Catálogo de magias — dados editáveis, fonte de verdade: docs/SISTEMA_MAGIA.md
// (seção "Catálogo de magias"), atualizado em 14/10 por
// docs/MUDANCAS_RACAS_E_MAGIA.md (onde os dois divergirem, vale o de 14/10).
// Mantido fora do engine.js de propósito (o
// motor não deve ter magia nenhuma hard-coded — ver item 9 do pedido do
// Pedro). Cada entrada descreve uma magia OFENSIVA pronta pra alimentar
// engine.diceAtaqueMagico/resolveAtaque/resolveAtaqueEmArea, exceto Escudo de
// Mana (não rola, só concede descritores por uma cena) e Sensor (placeholder,
// ainda sem pool/custo definidos no guia — "a definir").
//
// Campos:
// - id: chave estável (usada pra salvar qual magia tá "ativa" na ficha).
// - nome: nome de exibição.
// - descritores: array de strings minúsculas — as que o motor entende
//   ("perfurante", "saturante", "letal", "sortudo") mais as que são só
//   etiqueta por enquanto ("magia", "em_area", "atrasada_1" — ver
//   docs/SISTEMA_MAGIA.md, "Veloz/prioridade -1/atrasada 1: só etiquetas").
// - custoMp: custo em mana pra conjurar (null = "a definir", caso do Sensor).
// - ajusteDados: ajuste no pool de dados ALÉM de Base mágica + Ofícios
//   Mágicos/Inteligência (ex.: Mísseis Mágicos é "Base mágica + 1 +
//   Ofícios/Inteligência" — docs/MUDANCAS_RACAS_E_MAGIA.md, 14/10).
// - feridas: nº de ferimentos causados num acerto (sucessos líquidos > 0).
// - superficial: true força ferimento superficial mesmo com sucessos líquidos
//   altos (docs/SISTEMA_MAGIA.md — "Magia marcada 'superficial' causa sempre
//   ferimento superficial").
// - emArea: true = usar resolveAtaqueEmArea (um alvo por vez é resolveAtaque).
// - semRolagem / efeito: magias especiais sem pool de ataque (Escudo de Mana).
// - placeholder: magia ainda sem regra fechada no guia (Sensor).

// Disciplinas — dados editáveis, fonte de verdade: docs/DISCIPLINAS_MAGIA.md
// (14/10, complementa docs/MUDANCAS_RACAS_E_MAGIA.md). Substitui o antigo
// OFICIOS_MAGICOS (checkbox solto, 13/10-14/10): agora uma disciplina é um
// dos até 3 "slots" da ficha (ver point-amaranth-app.jsx:DisciplinaSlotPicker
// — troca o antigo painel "Classes"), e só as de tipo "oficio-magico" ou
// "magia-inata" oferecem magias equipáveis (até 3 cada, próprias da
// disciplina — não é mais um pool só compartilhado entre todas as
// disciplinas do personagem).
//
// Campos:
// - id: chave estável (character.disciplinas[i].disciplinaId).
// - nome: nome de exibição.
// - tipo: "oficio-magico" (conta 1 no pool de ataque mágico/recuperação de
//   mana — ver engine.contagemOficiosMagicos) ou "magia-inata" (NÃO conta
//   como ofício, dá bônus próprio).
// - vazia: true = ainda sem bônus nem magias definidos no guia (Encantamentos/
//   Alquimia/Constructo — "Cadastre-os como disciplinas vazias", pendência 4
//   de docs/DISCIPLINAS_MAGIA.md). Só ocupa 1 dos 3 slots e conta como ofício
//   (se for do tipo oficio-magico); sem acesso a magias.
// - temMagias: true = a disciplina oferece o catálogo de MAGIAS pra equipar
//   (até magiasAtivasMax, mesmo catálogo pras duas: Magias de guerra e Magia
//   Inata).
// - magiasIniciais: nº de magias escolhidas de graça ao adquirir a disciplina
//   (como o jogador chega além disso — a "reserva" — é pendência 3 do guia,
//   não implementada; a UI deixa equipar livremente até magiasAtivasMax).
// - magiasAtivasMax: nº máximo de magias equipadas ao mesmo tempo (3).
// - temTelaDeMana: só Magias de guerra — acesso extra "que permite analisar
//   magias" (sem mecânica numérica definida no guia; ver UI).
// - trocaGratisComAcao: só Magias de guerra — trocar uma magia equipada por
//   uma da reserva é de graça gastando uma ação (o app não modela ações/
//   turnos, então o botão correspondente só não desconta MP).
// - bonusTexto: texto do bônus base pra exibir na ficha.
export const DISCIPLINAS = [
  {
    id: "oficio-magias-de-guerra",
    nome: "Ofício Mágico: Magias de guerra",
    tipo: "oficio-magico",
    temMagias: true,
    magiasIniciais: 2,
    magiasAtivasMax: 3,
    temTelaDeMana: true,
    trocaGratisComAcao: true,
    bonusTexto: "Magias Gerais +1 grau (teto C). Dá também +1 grau (teto C) em Acadêmicos e Tecnologia (confirmado 14/10).",
    descricao: "Ex-Ofício Mágico/Evocação, renomeado. O usuário é um mago que entende código de magia.",
  },
  {
    id: "magia-inata",
    nome: "Magia Inata",
    tipo: "magia-inata",
    temMagias: true,
    magiasIniciais: 2,
    magiasAtivasMax: 3,
    temTelaDeMana: false,
    trocaGratisComAcao: false,
    bonusTexto: "+1 MP máximo. +1d10 extra em todas as rolagens de magia (não conta como ofício mágico).",
    descricao: "Magia que vem de dentro, sem estudo formal.",
  },
  { id: "oficio-encantamentos", nome: "Ofício Mágico: Encantamentos", tipo: "oficio-magico", vazia: true, bonusTexto: "Disciplina vazia — bônus e habilidades ainda não definidos.", descricao: "Disciplina de ofício mágico." },
  { id: "oficio-alquimia", nome: "Ofício Mágico: Alquimia", tipo: "oficio-magico", vazia: true, bonusTexto: "Disciplina vazia — bônus e habilidades ainda não definidos.", descricao: "Disciplina de ofício mágico." },
  { id: "oficio-constructo", nome: "Ofício Mágico: Constructo", tipo: "oficio-magico", vazia: true, bonusTexto: "Disciplina vazia — bônus e habilidades ainda não definidos.", descricao: "Disciplina de ofício mágico." },
];

export function getDisciplinaPorId(id) {
  return DISCIPLINAS.find((d) => d.id === id) || null;
}

// Máximo de disciplinas por personagem (docs/DISCIPLINAS_MAGIA.md: "Cada
// personagem escolhe até 3 disciplinas no total" — Magia Inata ocupa um dos
// 3 slots também, mesmo não contando como ofício mágico).
export const MAX_DISCIPLINAS = 3;

export const MAGIAS = [
  {
    id: "bombardeio_de_mana",
    nome: "Bombardeio de Mana",
    descritores: ["magia", "em_area", "saturante"],
    custoMp: 2,
    ajusteDados: 0,
    feridas: 1,
    superficial: false,
    emArea: true,
  },
  {
    id: "escudo_de_mana",
    nome: "Escudo de Mana",
    descritores: ["magia"],
    custoMp: 1,
    custoMpExtensaoAliado: 1,
    semRolagem: true,
    efeito:
      "O conjurador ganha Blindado até o fim da cena (14/10: Blindado Mágico " +
      "não existe mais separado, Blindado agora vale contra qualquer ataque). " +
      "Gastando +1 MP, o escudo se estende também a um aliado escolhido.",
  },
  {
    id: "shin",
    nome: "Shin",
    descritores: ["magia", "em_area", "saturante"],
    custoMp: 1,
    ajusteDados: 0,
    feridas: 1,
    superficial: true,
    emArea: true,
  },
  {
    id: "misseis_magicos",
    nome: "Mísseis Mágicos",
    descritores: ["magia", "saturante", "sortudo"],
    custoMp: 1,
    ajusteDados: 1,
    feridas: 1,
    superficial: true,
    emArea: false,
  },
  {
    id: "laser_magico",
    nome: "Laser Mágico",
    descritores: ["magia", "perfurante"],
    custoMp: 2,
    ajusteDados: 0,
    feridas: 1,
    superficial: false,
    emArea: false,
  },
  {
    id: "torrente_magica",
    nome: "Torrente Mágica",
    descritores: ["magia", "letal"],
    custoMp: 3,
    ajusteDados: 0,
    feridas: 2,
    superficial: false,
    emArea: false,
  },
  {
    id: "tiro_magico",
    nome: "Tiro Mágico",
    descritores: ["magia"],
    custoMp: 1,
    ajusteDados: 0,
    feridas: 1,
    superficial: false,
    emArea: false,
  },
  {
    id: "shin_kay",
    nome: "Shin-kay",
    descritores: ["magia", "letal"],
    custoMp: 2,
    ajusteDados: 0,
    feridas: 1,
    superficial: false,
    emArea: false,
  },
  {
    id: "magia_de_guerra_suth",
    nome: "Magia de guerra Suth",
    descritores: ["magia", "saturante", "sortudo", "atrasada_1"],
    custoMp: 2,
    ajusteDados: 0,
    feridas: 1,
    superficial: false,
    emArea: false,
  },
  {
    id: "magia_de_guerra_maxis",
    nome: "Magia de guerra Maxis",
    descritores: ["magia", "em_area"],
    custoMp: 2,
    ajusteDados: 0,
    feridas: 2,
    superficial: true,
    emArea: true,
  },
  {
    id: "magia_de_guerra_katalao",
    nome: "Magia de guerra Katalão",
    descritores: ["magia", "perfurante", "sortudo", "letal"],
    custoMp: 3,
    ajusteDados: 0,
    feridas: 1,
    superficial: false,
    emArea: false,
  },
  {
    id: "sensor",
    nome: "Sensor",
    descritores: ["magia"],
    custoMp: null, // TODO(docs/SISTEMA_MAGIA.md): pool e custo ainda "a definir" no guia.
    placeholder: true,
    efeito: "Marca até 5 pessoas numa rede de visão e comunicação compartilhada.",
  },
];

export function getMagiaPorId(id) {
  return MAGIAS.find((m) => m.id === id) || null;
}
