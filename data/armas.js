// Catálogo de TIPOS de arma física (docs/ATUALIZACAO_21-10.md item 6,
// planilha "armas (4).xlsx", aba "Armas", 21/10). 17 tipos genéricos — na
// ficha a pessoa escolhe o TIPO aqui e digita o NOME da própria arma (os
// `exemplos` abaixo são só referência pro jogador, não aparecem como nome).
//
// Cada tipo tem 2 descritores. 27/10 (pedido do Pedro): sem treino na
// proficiência da arma, a pessoa ESCOLHE um dos dois (`descritor1` ou
// `descritor2`, guardado em character.equipamento.descritorArmaEscolhido,
// padrão 1); treinada (grau 1+ ou Treino de ofício — ver treinadoNaArma),
// usa os dois. Antes (até 24/10) o Descritor 1 era fixo e o 2 só vinha
// com treino.
//
// `extra: "pesado"` é um terceiro descritor à parte (não entra nos dois
// normais): dados de ataque precisam de 7+ (não soma com Blindado — mesmo
// limiar, não sobe pra 8+) e a arma causa 2 feridas por ataque que acerta.
// Ambas as feridas seguem o Vigor juntas (as duas agravantes ou as duas
// superficiais) — regra provisória da própria planilha ("Falta definir
// como os 2 ferimentos seguem o Vigor" / "Provisório: ... se os sucessos
// líquidos forem iguais ou maiores que o Vigor do alvo, os 2 são
// agravantes; senão, superficiais"); é exatamente o que determinarFerimento
// já faz hoje (engine.js) pra qualquer ataque com feridas>1, então não há
// nada a mudar lá — só usar feridas:2 nestes 5 tipos.
//
// `superficial: true` marca os tipos "1 superficial" da planilha — o
// ferimento é SEMPRE superficial, nunca agravante, independente do Vigor
// (mesmo campo `superficial` que resolveAtaque já aceita pra magias
// marcadas assim em data/magias.js).
//
// `ajusteDados` existe pra futuro ajuste de acerto por tipo, mas a planilha
// lista 0 pra todos os 17 tipos agora ("Ajuste de acerto = +/- dados no
// ataque (0 por padrão)").
//
// Todos os descritores usados aqui (letal, perfurante, sortudo, esmagador_N,
// preciso_N) já são mecânicos em engine.js (resolveAtaque lê
// `descritoresAtaque`); "veloz" é só etiqueta de prioridade — a planilha
// marca como "Etiqueta" porque a iniciativa ainda não existe no sistema, não
// faz nada aqui. "em_area" no Descritor2 de "Arma de fogo de dispersão"
// também é só o label/chip — como no catálogo físico que já existia
// (BASE_ATTACK_TYPES.morteiro_pesado em engine.js), o roteamento real pra
// resolveAtaqueEmArea não está automatizado por este catálogo; ver
// CONFLITOS no relatório final.
//
// CONFLITO (não resolvido nesta pass, listado no relatório): este catálogo
// é ADICIONAL ao catálogo físico simplificado que já existia em engine.js
// (BASE_ATTACK_TYPES: soco/arma_branca/arma_branca_pesada/mosquetao/
// revolver/morteiro_pesado, usado por defaultAttacksForCharacter e pelas
// migrações). Os dois catálogos descrevem armas físicas de formas
// diferentes (BASE_ATTACK_TYPES não tem Descritor1/Descritor2/perícia) e
// não foram unificados — BASE_ATTACK_TYPES continua intocado porque fichas
// salvas referenciam esses ids diretamente.
export const ARMAS = [
  { id: "lamina_curta", nome: "Lâmina curta", familia: "Lâmina", exemplos: "Adaga, faca, sabre", alcance: "mesma_zona", feridas: 1, superficial: false, descritor1: "letal", descritor2: "veloz", extra: null, ajusteDados: 0, periciaFamilia: "Lâminas" },
  { id: "lamina", nome: "Lâmina", familia: "Lâmina", exemplos: "Espada, gládio", alcance: "mesma_zona", feridas: 1, superficial: false, descritor1: "letal", descritor2: "sortudo", extra: null, ajusteDados: 0, periciaFamilia: "Lâminas" },
  { id: "lamina_perfurante", nome: "Lâmina perfurante", familia: "Lâmina", exemplos: "Katana, estoque, rapieira", alcance: "mesma_zona", feridas: 1, superficial: false, descritor1: "letal", descritor2: "perfurante", extra: null, ajusteDados: 0, periciaFamilia: "Lâminas" },
  { id: "lamina_pesada", nome: "Lâmina pesada", familia: "Lâmina", exemplos: "Machado, montante", alcance: "mesma_zona", feridas: 2, superficial: false, descritor1: "letal", descritor2: "esmagador_1", extra: "pesado", ajusteDados: 0, periciaFamilia: "Lâminas" },
  { id: "contundente_leve", nome: "Contundente leve", familia: "Contundente", exemplos: "Bastão, cassetete", alcance: "mesma_zona", feridas: 1, superficial: true, descritor1: "esmagador_1", descritor2: "veloz", extra: null, ajusteDados: 0, periciaFamilia: "Contundentes" },
  { id: "contundente", nome: "Contundente", familia: "Contundente", exemplos: "Maça, clava", alcance: "mesma_zona", feridas: 1, superficial: false, descritor1: "esmagador_1", descritor2: "sortudo", extra: null, ajusteDados: 0, periciaFamilia: "Contundentes" },
  { id: "contundente_pesado", nome: "Contundente pesado", familia: "Contundente", exemplos: "Martelo de guerra, marreta", alcance: "mesma_zona", feridas: 2, superficial: false, descritor1: "esmagador_2", descritor2: "perfurante", extra: "pesado", ajusteDados: 0, periciaFamilia: "Contundentes" },
  { id: "contundente_de_punho", nome: "Contundente de punho", familia: "Contundente", exemplos: "Manoplas, soco-inglês", alcance: "mesma_zona", feridas: 1, superficial: true, descritor1: "veloz", descritor2: "esmagador_1", extra: null, ajusteDados: 0, periciaFamilia: "Contundentes" },
  { id: "haste", nome: "Haste", familia: "Haste", exemplos: "Lança, tridente", alcance: "uma_zona_adiante", feridas: 1, superficial: false, descritor1: "perfurante", descritor2: "sortudo", extra: null, ajusteDados: 0, periciaFamilia: "Hastes" },
  { id: "haste_pesada", nome: "Haste pesada", familia: "Haste", exemplos: "Alabarda, glaive", alcance: "uma_zona_adiante", feridas: 2, superficial: false, descritor1: "letal", descritor2: "perfurante", extra: "pesado", ajusteDados: 0, periciaFamilia: "Hastes" },
  { id: "arma_de_fogo_curta", nome: "Arma de fogo curta", familia: "Arma de fogo", exemplos: "Pistola, revólver", alcance: "uma_zona_adiante", feridas: 1, superficial: false, descritor1: "veloz", descritor2: "sortudo", extra: null, ajusteDados: 0, periciaFamilia: "Armas de fogo" },
  { id: "arma_de_fogo_longa", nome: "Arma de fogo longa", familia: "Arma de fogo", exemplos: "Rifle, fuzil", alcance: "longo", feridas: 2, superficial: false, descritor1: "perfurante", descritor2: "sortudo", extra: "pesado", ajusteDados: 0, periciaFamilia: "Armas de fogo" },
  { id: "arma_de_fogo_dispersao", nome: "Arma de fogo de dispersão", familia: "Arma de fogo", exemplos: "Espingarda", alcance: "uma_zona_adiante", feridas: 1, superficial: false, descritor1: "preciso_1", descritor2: "em_area", extra: null, ajusteDados: 0, periciaFamilia: "Armas de fogo" },
  { id: "arma_de_arco", nome: "Arma de arco", familia: "Distância", exemplos: "Arco curto, arco longo", alcance: "longo", feridas: 1, superficial: false, descritor1: "perfurante", descritor2: "sortudo", extra: null, ajusteDados: 0, periciaFamilia: "Distância" },
  { id: "arma_de_mecanismo", nome: "Arma de mecanismo", familia: "Distância", exemplos: "Besta", alcance: "longo", feridas: 2, superficial: false, descritor1: "perfurante", descritor2: "letal", extra: "pesado", ajusteDados: 0, periciaFamilia: "Distância" },
  { id: "arma_de_arremesso", nome: "Arma de arremesso", familia: "Distância", exemplos: "Facas de arremesso, machadinha", alcance: "uma_zona_adiante", feridas: 1, superficial: true, descritor1: "veloz", descritor2: "sortudo", extra: null, ajusteDados: 0, periciaFamilia: "Distância" },
  { id: "arma_flexivel", nome: "Arma flexível", familia: "Flexível", exemplos: "Corrente, mangual, chicote", alcance: "mesma_zona", feridas: 1, superficial: false, descritor1: "preciso_1", descritor2: "veloz", extra: null, ajusteDados: 0, periciaFamilia: "Flexíveis" },
];

import { grauNumero } from "../engine.js";

export function getArmaPorId(id) {
  return ARMAS.find((a) => a.id === id) || null;
}

// Descritores EFETIVOS de uma arma do catálogo pra quem a empunha (27/10):
// treinado = os dois; sem treino = só o escolhido (`escolhido`: 1 ou 2,
// qualquer outro valor vale 1). `pesado` (o extra) entra sempre.
export function descritoresEfetivosArma(arma, treinado, escolhido = 1) {
  if (!arma) return [];
  const out = treinado
    ? [arma.descritor1, arma.descritor2]
    : [escolhido === 2 && arma.descritor2 ? arma.descritor2 : arma.descritor1];
  if (arma.extra === "pesado") out.push("pesado");
  return out.filter(Boolean);
}

// Proficiência de combate usada ao atacar com uma arma do catálogo: Armas
// de Fogo pra família "Arma de fogo"; Armas (chave combateCorpoACorpo) pra
// todo o resto — lâminas, contundentes, hastes, flexíveis e, desde 27/10,
// também as de "Distância" (arco, besta, arremesso; Armas à Distância
// saiu).
export function profKeyDaArma(arma) {
  if (arma?.familia === "Arma de fogo") return "armasDeFogo";
  return "combateCorpoACorpo";
}

// Treinado na arma (24/10, seção 0.2): grau 1 ou mais (E pra cima) na
// proficiência da arma, OU Treino vindo de habilidade de ofício
// (`treinoPorOficio`, ver data/magias.js:periciaDeOficioCobreArma) — este
// conta mesmo com grau 0. Só treinado usa o Descritor 2. Substitui o
// antigo checkbox manual `temPericiaArma` (a proficiência é a progressão).
export function treinadoNaArma(personagem, arma, treinoPorOficio = false) {
  if (!arma) return false;
  if (treinoPorOficio) return true;
  return grauNumero(personagem?.proficiencias?.[profKeyDaArma(arma)], 0) >= 1;
}

export const ALCANCE_LABEL = {
  mesma_zona: "Mesma zona",
  uma_zona_adiante: "Até 1 zona",
  longo: "Longo",
};
