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

// Ofícios Mágicos — disciplinas de ofício (docs/MUDANCAS_RACAS_E_MAGIA.md,
// 14/10): cada uma conhecida conta como 1 dado no pool de ataque mágico
// (engine.contagemOficiosMagicos). Até 3 por personagem (character.
// disciplinaMagica.oficiosMagicos, array de ids). "magias-de-guerra" é o
// antigo "Ofício Mágico" único (ex-Evocação) — mantém o bônus de +1 Magias
// Gerais (ver racasCatalogo.js:bonusGrauDoPersonagem); os outros três não dão
// bônus de grau, só contam pro pool.
export const OFICIOS_MAGICOS = [
  { id: "magias-de-guerra", nome: "Magias de guerra", descricao: "Ex-Ofício Mágico/Evocação. Mantém +1 Magias Gerais; dá Acadêmicos e Tecnologia (flavor, sem mecânica numérica)." },
  { id: "encantamentos", nome: "Encantamentos", descricao: "Disciplina de ofício mágico." },
  { id: "alquimia", nome: "Alquimia", descricao: "Disciplina de ofício mágico." },
  { id: "constructo", nome: "Constructo", descricao: "Disciplina de ofício mágico." },
];

export function getOficioMagicoPorId(id) {
  return OFICIOS_MAGICOS.find((o) => o.id === id) || null;
}

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
