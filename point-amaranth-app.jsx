import React, { useState, useEffect, useMemo } from "react";
import {
  Users, Swords, Map as MapIcon, Sparkles, Plus, X, Dices, ChevronLeft,
  Pencil, Trash2, Save, ShieldHalf, Shield, Flame, Droplet, BookOpen, Landmark,
  ChevronDown, ChevronRight, Star, Crown, Home, ScrollText, Target, Check
} from "lucide-react";

/* ---------------------------------------------------------------
   TOKENS — paleta inspirada em Fire Emblem: Three Houses (fundo
   pergaminho creme, cabeçalhos em roxo profundo, dourado para
   números e destaques, texto em tinta escura sobre o papel).
----------------------------------------------------------------*/
const INK = "#2B2116";
const PANEL = "#F3E9D2";
const PANEL_2 = "#EADFC0";
const LINE = "#C9B78E";
const PARCHMENT = "#2B2116";
const MUTED = "#6B5D45";
const BRASS = "#A9762C";
const BRASS_BRIGHT = "#8B6914";
const EMBER = "#A83A2E";
const PURPLE = "#4B3B6B";
const PURPLE_LIGHT = "#6B5590";
const PURPLE_TEXT = "#F3E9D2";
// MP (Mana Points) é sempre azul; SP (Soul Points) é sempre verde, em qualquer
// referência visual no app (bolinhas, textos, ícones).
const MP_COLOR = "#4A6B96";
const SP_COLOR = "#4A7A4E";

const GRADE_VALUE = { E: 1, D: 2, C: 3, B: 4, A: 5 };
const GRADE_ORDER = ["E", "D", "C", "B", "A"];

const GRADE_COLOR = {
  E: "#5A6B69",
  D: "#78725A",
  C: "#9C7A3E",
  B: "#B8862A",
  A: "#8B6914",
  S: "#B8622A",
  SS: "#C24A1E",
  EX: "#A8341E",
  "Divino": "#B8850F",
};

function tierColor(level) {
  if (!level) return MUTED;
  const l = level.toUpperCase();
  if (l.includes("DIVINO")) return GRADE_COLOR.Divino;
  if (l.includes("EX")) return GRADE_COLOR.EX;
  if (l.includes("SS")) return GRADE_COLOR.SS;
  if (l.startsWith("S")) return GRADE_COLOR.S;
  for (const g of GRADE_ORDER) if (l.startsWith(g)) return GRADE_COLOR[g];
  return BRASS;
}

// Atributos de Combate — ESVAZIADO de propósito: Magia, Técnica, Sorte, Defesa,
// Resistência Física e Resistência Mágica saíram de aqui. Magia se dividiu em
// duas Proficiências (Magias Ofensivas pro ataque, Magias Gerais no Mental);
// Defesa/Resistência Física/Resistência Mágica agora são só as Proficiências de
// Combate com o mesmo nome; Sorte foi removida (não tem substituto ainda);
// Técnica também foi removida (as habilidades que usavam ela como limiar vão
// ganhar outro atributo/proficiência depois - por enquanto ficam sem limiar
// especial, seguindo o padrão normal).
const ATTR_LIST = [];

// Atributos Gerais — Físicos, Sociais e Mentais, adaptados de Vampiro: A Máscara
// (V5). Força e Destreza MUDARAM pra cá (saíram dos Atributos de Combate acima -
// essa era a duplicação "paralela" que existia antes, agora substituída de vez).
// Vigor (Stamina) é novo, não existia antes do sistema Mascarade.
const ATRIBUTOS_GERAIS_LIST = [
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

const ATRIBUTOS_GERAIS_DEFAULT = {
  forca: "E", destreza: "E", vigor: "E",
  carisma: "E", manipulacao: "E", compostura: "E",
  inteligencia: "E", perspicacia: "E", resolucao: "E",
};

// Atributos que "moraram" nos Atributos de Combate mas agora vivem nos Atributos
// Gerais (Força, Destreza) — usado pra ler o grau certo independente de onde o
// resto do código está procurando.
const ATRIBUTOS_GERAIS_KEYS = new Set(ATRIBUTOS_GERAIS_LIST.map((a) => a.key));
function getAttrGrade(character, key) {
  if (ATRIBUTOS_GERAIS_KEYS.has(key)) return character?.atributosGerais?.[key];
  return character?.attributes?.[key];
}

// Proficiências — perícias adaptadas de Vampiro: A Máscara (V5), traduzidas e
// organizadas nas 3 categorias do livro (Física, Social, Mental). Usam o mesmo
// grau E–A dos atributos.
const PROFICIENCIAS_LIST = [
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

const PROFICIENCIAS_DEFAULT = PROFICIENCIAS_LIST.reduce((acc, p) => ({ ...acc, [p.key]: "E" }), {});

const CATEGORIA_GERAL_INFO = {
  combate: { label: "Combate", color: BRASS_BRIGHT },
  fisica: { label: "Física", color: EMBER },
  social: { label: "Social", color: "#5C86B0" },
  mental: { label: "Mental", color: PURPLE },
};

const FACTIONS = ["Hetalion", "Katalão", "Maxis Power", "Suth", "Goethia", "Amaranth/Omem", "Outra"];

const FACTION_SEAL = {
  "Hetalion": "#8AA6A3",
  "Katalão": "#B0784F",
  "Maxis Power": "#8E7FB0",
  "Suth": "#C7994F",
  "Goethia": "#6E8F6B",
  "Amaranth/Omem": "#C7994F",
  "Outra": "#9C8F78",
};

/* ---------------------------------------------------------------
   SISTEMA — regras, status, equipamentos e catálogo de habilidades
   (extraído de Ficha_Base_N_Point.docx e HABILIDADES_CONHECIDAS.docx)
----------------------------------------------------------------*/
const ABILITIES_CATALOG = [{"id": "tecnica_de_defesa_bloqueio", "name": "Técnica de defesa : (bloqueio)", "category": "ativa", "subtype": "Defensivas", "reviewed": true, "intro": "Técnica defensiva com arma ou corpo, dominando uma região.", "cost": "Resposta +2mp ou 1sp", "tiers": ["E- Se um inimigo entrar na sua zona, pode gastar a reação para um ataque de oportunidade.", "D- Pode gastar a reação para tentar bloquear um golpe recebido (efeito situacional, sem bônus fixo).", "C- +1 na Defesa.", "B- +1 na Defesa adicional se não mudar de zona (total +2).", "A- Gasta a reação para cancelar 1 sucesso do acerto inimigo (não crítico)."], "revisado_v2": true}, {"id": "giro_defensivo_b_bloqueio", "name": "Giro defensivo B: (bloqueio)", "category": "ativa", "subtype": "Defensivas", "reviewed": true, "intro": "Movimento circular com arma ou corpo, criando uma zona de defesa maior contra projéteis.", "cost": "Resposta +2mp ou 1sp", "tiers": ["E- Ataques à distância contra você têm desvantagem nesta rodada.", "D- Se o inimigo mudou de zona antes de atacar, pode reagir com um ataque de oportunidade.", "C- +1 na Defesa.", "B- +1 na Defesa adicional contra ataques à distância (total +2).", "A- Reduz em 1 a Confirmação de dano de um ataque recebido (não crítico), uma vez por turno."], "revisado_v2": true}, {"id": "borrao_esquiva", "name": "Borrão: (esquiva)", "category": "ativa", "subtype": "Defensivas", "reviewed": true, "intro": "Usa mana para se mover como um borrão, melhorando a esquiva.", "cost": null, "tiers": ["E- Ataques à distância contra você têm desvantagem.", "D- Se você se moveu uma zona, o inimigo tem -1 no Acerto contra você por movimento realizado.", "C- +1 na Defesa.", "B- +1 na Defesa adicional (total +2).", "A- Gasta a reação para cancelar 1 sucesso do acerto inimigo (não crítico)."], "revisado_v2": true}, {"id": "manobra_evasiva_b_esquiva", "name": "Manobra Evasiva B: (esquiva)", "category": "ativa", "subtype": "Defensivas", "reviewed": true, "intro": "Movimento acrobático que evita golpes e escapa de áreas de efeito.", "cost": null, "tiers": ["E- Cancela um ataque de oportunidade contra você.", "D- Usando a reação, pode se mover após receber um ataque.", "C- +1 na Defesa.", "B- +1 na Defesa adicional (total +2).", "A- Gasta a reação para cancelar 1 sucesso do acerto inimigo (não crítico)."], "revisado_v2": true}, {"id": "escudo_de_mana_b_bloqueio", "name": "Escudo de mana B: (bloqueio)", "category": "ativa", "subtype": "Ofensivas", "reviewed": true, "intro": "Cria um escudo de energia que bloqueia ataques.", "cost": null, "tiers": ["E- Cria um escudo que bloqueia um ataque (efeito situacional, sem bônus fixo ainda).", "D- Pode gastar 1mp a mais para reduzir em 1 a Confirmação de dano recebida enquanto o escudo durar.", "C- +2 na Defesa enquanto o escudo estiver ativo.", "B- Estende o escudo (+2 na Defesa) para todos os aliados na sua zona.", "A- +1 na Resistência Natural enquanto o escudo estiver ativo."], "revisado_v2": true}, {"id": "golpe_poderoso_b", "name": "Golpe poderoso B", "category": "ativa", "subtype": "Ofensivas", "reviewed": true, "intro": "Concentra poder em um ataque poderoso.", "cost": "+2mp ou 1sp", "tiers": ["E- Se o ataque só causar CONTATO, ainda assim causa 1 de Confirmação de dano.", "D- Causa ARREMESSO no CONTATO com o alvo.", "C- +1 na Confirmação de dano.", "B- +1 na Confirmação de dano adicional (total +2).", "A- A Confirmação de dano ignora até 2 pontos de Resistência do alvo."], "revisado_v2": true}, {"id": "golpe_penetrante_b", "name": "Golpe penetrante B", "category": "ativa", "subtype": "Ofensivas", "reviewed": true, "intro": "Concentra poder em um ataque que perfura defesas.", "cost": "+2mp ou 1sp", "tiers": ["E- O ataque ignora a armadura inimiga, confirmando contra a Resistência Natural.", "D- No CONTATO, ainda assim causa 1 de Confirmação de dano.", "C- +1 na Confirmação de dano.", "B- +1 na Confirmação de dano adicional (total +2).", "A- +1 no Acerto deste ataque."], "revisado_v2": true}, {"id": "golpe_veloz_b", "name": "Golpe Veloz B", "category": "ativa", "subtype": "Ofensivas", "reviewed": true, "intro": "Concentra poder em um ataque veloz.", "cost": "+2mp ou1sp", "tiers": ["E- Ganha prioridade +1 neste turno.", "D- Se possuir prioridade acima do inimigo, ganha +1 na Confirmação de dano.", "C- +1 no Acerto.", "B- +1 no Acerto adicional (total +2).", "A- +1 na Confirmação de dano."], "revisado_v2": true}, {"id": "golpe_preciso_b", "name": "Golpe Preciso B", "category": "ativa", "subtype": "Ofensivas", "reviewed": true, "intro": "Concentra poder em um ataque preciso.", "cost": "+2mp ou1sp", "tiers": ["E- Se você não se moveu neste turno, o inimigo tem -1 na Defesa contra este ataque.", "D- Uma habilidade de esquiva do inimigo não reduz o seu Acerto neste ataque.", "C- +1 no Acerto.", "B- +2 no Acerto (em vez de +1).", "A- +1 na Confirmação de dano."], "revisado_v2": true}, {"id": "lamina_de_energia_b_mana_alma", "name": "Lâmina de energia B (Mana)(Alma)", "category": "ativa", "subtype": "Ofensivas", "reviewed": true, "intro": "Cria uma lâmina de Mana/Alma capaz de cortar matéria.", "cost": "+1mp/ quebra mp", "tiers": ["E- Quebra 1mp para criar e manter uma arma de mana/alma: curto alcance, Zona local, Acerto 0, dano +2, ferida S.", "D- Com +1mp, pode atacar a 1 zona de distância usando a arma criada.", "C- +1 na Confirmação de dano com a arma criada.", "B- Causa CHAMAS no CONTATO.", "A- +1 no Acerto com a arma criada."], "revisado_v2": true}, {"id": "golpe_duplo_b", "name": "Golpe duplo B", "category": "ativa", "subtype": "Ofensivas", "reviewed": true, "intro": "Golpe duplo rápido.", "cost": "+2mp ou 1sp", "tiers": ["E- Pode atacar dois alvos diferentes a curta distância.", "D- Pode realizar dois ataques de curta distância como um único ataque, com -1 na Confirmação de dano.", "C- +1 no Acerto ao usar o ataque duplo.", "B- Efeitos de status do ataque duplo são dobrados.", "A- Remove o -1 na Confirmação de dano do ataque duplo."], "revisado_v2": true}, {"id": "corte_do_vento_b", "name": "Corte do vento B", "category": "ativa", "subtype": "Ofensivas", "reviewed": true, "intro": "Ataque cortante à distância.", "cost": "+2mp ou 1sp", "tiers": ["E- Seu golpe cortante de curta distância ganha +1 de alcance.", "D- Pode atacar um alvo a curta e um a longa distância na mesma ação.", "C- +1 no Acerto.", "B- +1 na Confirmação de dano.", "A- Um crítico no Acerto soma +1 na Confirmação de dano (uma vez por teste)."], "revisado_v2": true}, {"id": "impacto_de_pressao_b", "name": "Impacto de pressão B", "category": "ativa", "subtype": "Ofensivas", "reviewed": true, "intro": "Ataque contundente à distância.", "cost": "+2mp ou 1sp", "tiers": ["E- Seu ataque contundente ganha alcance de longa distância (+1 zona).", "D- Se o ataque acertar, causa ARREMESSO no alvo (ferida limitada a 1 no total).", "C- +1 no Acerto.", "B- +1 na Confirmação de dano.", "A- Causa ARREMESSO também no CONTATO."], "revisado_v2": true}, {"id": "golpe_de_fluxo_b", "name": "Golpe de fluxo B", "category": "ativa", "subtype": "Magia", "reviewed": true, "intro": "Ataque que interfere no fluxo do inimigo.", "cost": "+2mp ou 1sp", "tiers": ["E- Reduz a ferida causada em 1 (troca por outro efeito da habilidade).", "D- No CONTATO, o alvo tem -1d10 na recuperação de MP e perde a reação até o fim de uma manutenção.", "C- +2 no Acerto.", "B- No CONTATO, causa 1 nível de ENVENENAMENTO por mana.", "A- +1 no Acerto e +1 na Confirmação de dano."], "revisado_v2": true}, {"id": "magia_mana_pura_b", "name": "Magia (mana pura) B", "category": "ativa", "subtype": "Magia", "reviewed": true, "intro": "Usa mana para criar magias de mana pura — solidificando-a em constructos ou efeitos básicos. Cada opção abaixo funciona como um Ataque próprio; cadastre o que for aprendido na tabela de Ataques da ficha.", "cost": "Ação", "tiers": ["E- 1MP — Shin: área, Zona local, Acerto +3, dano +1, ferida 1. / 1MP — Tiro mágico: distância, Zona 3, Acerto +2, dano +1+S, ferida 1.", "D- 2MP — Torrente mágica: distância ou curta, Zona 3, Acerto +1, dano +1+S, ferida S. / 1MP — Tiro vazio: distância ou curta, Zona 2, Acerto +2, dano S+2, ferida 0. / 1MP B.Ação — limpa superfícies ou cria luz com mana pura.", "C- 2MP — Bombardeio de mana: área, Zona 4, Acerto 2S, dano 1+S, ferida S. / 1MP — Bombardeio vazio: mesma área, ferida 0.", "B- 2MP — Tiro duplo: dois tiros mágicos, ou um tiro mágico e um Shin. / 3MP+1SP — realiza o bombardeio de mana duas vezes."], "revisado_v2": true}, {"id": "encantamento_b", "name": "Encantamento B", "category": "ativa", "subtype": "Magia", "reviewed": true, "intro": "Usa mana para criar encantamentos em si mesmo (um por vez). Gasta 2mp na manutenção para trocar de encantamento.", "cost": "manutenção + quebra 1MP por encantamento", "tiers": ["E- Elemento (se possuir um Sistema elemental): Pyro adiciona CHAMAS, Cyro adiciona DESACELERAÇÃO por congelamento, Hydro adiciona ENVENENAR necrótico, Anemo adiciona EMPURRAR ao que for encantado.", "D- Pode aplicar um dos encantamentos em um aliado em vez de si mesmo.", "C- Escolha um enquanto ativo: +1 na Confirmação de dano (Força), +1 no Acerto (Mira), +1 de prioridade (Velocidade), +1 na Defesa (Esquiva), ou +1 na Resistência Natural (Resistência).", "B- Probabilidade: pode re-rolar um dado do encantado, uma vez por rodada.", "A- Geo: o encantamento de Confirmação de dano sobe para +2."], "revisado_v2": true}, {"id": "sensor_b", "name": "Sensor B", "category": "ativa", "subtype": "Magia", "reviewed": true, "intro": "Usa mana para criar um sensor mágico.", "cost": "situacional", "tiers": ["E- 1MP: quebra 1MP e marca até 4 pessoas (C-5, B-6), compartilhando visão e comunicação entre elas.", "D- 1MP, como ação: transfere 1 de MP para alguém marcado (custo total 2 de MP).", "C- 1MP, como ação: prepara um efeito em um alvo marcado — ao ser atacado, ele declara e rola a defesa antes do ataque. Enquanto não ativado, não recupera o MP gasto.", "B- 1MP, como ação: um alvo marcado ganha 1 re-roll até o próximo turno, ou pode realizar um movimento."], "revisado_v2": true}, {"id": "sopro_de_dragao_tipo", "name": "Sopro de dragão (tipo)", "category": "ativa", "subtype": "Técnicas de luta", "reviewed": true, "intro": "Sopro de energia usável de formas variadas. Cada opção funciona como um Ataque próprio; cadastre na tabela de Ataques.", "cost": "situacional", "tiers": ["1MP — Sopro preciso: distância, Zona 2, Acerto +2, dano +1, ferida 1.", "2MP — Sopro destruidor: área, Zona 3 (afeta a zona adjacente), Acerto 2S, dano 2+S, ferida S.", "B.Ação, 1MP — Sopro de reforço: encanta a arma/garras por um turno, +1 na Confirmação de dano.", "Variações elementais: Pyro adiciona CHAMAS aos sopros. Geo soma +1 nas Confirmações de dano. Toxic permite ENVENENAMENTO biológico no acerto."], "revisado_v2": true}, {"id": "olho_da_mente_c", "name": "Olho da mente C", "category": "ativa", "subtype": "Técnicas de luta", "reviewed": true, "intro": "Usa instinto e treino para achar vulnerabilidades e prever movimentos inimigos.", "cost": "Resposta 2MP ou 1SP", "tiers": ["E- Antecipa o próximo golpe contra você (efeito situacional, sem bônus fixo ainda).", "D- Um 9 natural no Acerto conta como crítico, uma vez por teste.", "C- +1 na Defesa.", "B- +1 na Defesa adicional (total +2).", "A- Se rolar 1+ crítico no Acerto neste turno, sua próxima Confirmação de dano ganha +1."], "revisado_v2": true}, {"id": "stances_n_stances", "name": "Stances: N+ (Stances)", "category": "ativa", "subtype": "Técnicas de luta", "reviewed": true, "intro": "Adepto de várias artes marciais — pode adotar uma stance por vez.", "cost": "Manutenção 1sp", "tiers": ["E- Troca de stance com B.Ação+1mp (sem gastar SP) ou B.Ação+movimento. Stances situacionais disponíveis: Cobra (reação: ataca um alvo na mesma zona que atacar um aliado) e Área de controle (reação: ataca um alvo na mesma zona que lhe atacar).", "D- Pode gastar 1 SP para ativar um efeito de stance não usado na rodada.", "C- Stances numéricas disponíveis: Águia (+1 no Acerto), Jaguar (+1 na Defesa), Leão (+1 na Confirmação de dano), Tatu (-1 na Confirmação de dano recebida). Escorpião permanece situacional: se superar os sucessos do inimigo ao defender, reação de ataque de oportunidade.", "B- Pode gastar 1 SP e quebrar +1mp para manter duas stances ativas ao mesmo tempo.", "A- Ao entrar em stance, pode gastar +1 SP para dobrar o efeito numérico da stance ativa. Leopardo desbloqueada: +1 de prioridade."], "revisado_v2": true}, {"id": "tecnicas_de_foco_b", "name": "Técnicas de foco B", "category": "ativa", "subtype": "Utilidade", "reviewed": true, "intro": "Grande foco inicial usado como recurso para ganhar bônus.", "cost": "Ação+ 1MP", "tiers": ["E- Usa Ação para ficar Focado até sofrer uma ferida; enquanto focado, vantagem em testes mentais (sem bônus fixo ainda). Não recupera o MP gasto enquanto estiver focado.", "D- Pode gastar o foco (perdendo o efeito) para ganhar 1 sucesso automático em um teste.", "C- Enquanto focado, +1 no Acerto.", "B- Enquanto focado, +1 na Defesa (total: +1 Acerto e +1 Defesa).", "A- Enquanto focado, +1 na Resistência Natural (+2 se estiver com apenas 1 de HP)."], "revisado_v2": true}, {"id": "bombas_b", "name": "Bombas B", "category": "passiva", "subtype": "Utilidade", "reviewed": true, "intro": "Possui uma variedade de bombas ocultas no corpo. Você às recupera em descanso longo. Você possui uma quantidade de bombas igual ao nível.", "cost": "Ação e 1 bomba", "tiers": ["Para cada nível desta habilidade, você tem um slot de bomba a mais e um tipo de bomba a mais para produzir. E- 1, D-2, C-3, B-4.", "As bombas desta habilidade não contam para itens usáveis em batalha. Se possuir uma oficina também é capaz de produzir suas próprias bombas.", "Os tipos de bomba pode incluir:", "Bomba de fumaça: Cria uma zona visão obscurecida.", "Bomba explosiva: Explode uma zona em até 1 de distância=>Tipo de ataque: area=> Zona 2=> Acerto: 2S=> dano: S+1 => ferida: S", "Bomba de gosma: Cria uma explosão de gosma que restringe em uma zona, a zona com gosma se torna especial. Tipo de ataque: Área => Zona 2=> Acerto: ENRAIZAMENTO.", "Bomba de interferência: Cria partículas em uma zona que dificultam a recuperação de mana durante um turno. Distância de até 2 zona: Todos na zona rolam com desvantagem a recuperação de mana.", "Bomba pyro: Tipo de ataque: Área => Zona 2=> Acerto: 2S => dano: CHAMAS", "Bomba eletro: Tipo de ataque: Área => Zona 2=> Acerto: 2S => dano: CARGA: 1- nada. 2- CHAMAS. 3- Vantagem no CHAMAS.", "Bomba de veneno: Tipo de ataque: Área => Zona 2=> ENVENENAMENTO biológico.", "Bomba de gelo: Tipo de ataque: Área => Zona 2=> DESACELERAÇÃO por gelo."]}, {"id": "forte_b", "name": "Forte B", "category": "passiva", "subtype": "Atributos", "reviewed": true, "intro": "Possui uma força acima do padrão**.", "cost": null, "tiers": ["E- Com B.Ação, pode adicionar ARREMESSO a um ataque de Força.", "D- +1d10 em testes genéricos de Força.", "C- +1 na Confirmação de dano em ataques de Força.", "B- +1 na Confirmação de dano adicional em ataques de Força (total +2).", "A- Sucesso automático em testes de Força fora de combate."], "revisado_v2": true}, {"id": "percepcao_b", "name": "Percepção B", "category": "passiva", "subtype": "Atributos", "reviewed": true, "intro": "Possui uma percepção acima do padrão", "cost": null, "tiers": ["E- +1 zona de alcance em ataques a longa distância.", "D- +1d10 em testes genéricos de Percepção.", "C- +1 no Acerto em ataques de mira ou precisão.", "B- +1 no Acerto adicional em ataques de mira ou precisão (total +2).", "A- Com B.Ação, soma +1 na Confirmação de dano de um ataque (uso único por turno)."], "revisado_v2": true}, {"id": "agilidade_b", "name": "Agilidade B", "category": "passiva", "subtype": "Atributos", "reviewed": true, "intro": "Possui uma agilidade acima do padrão", "cost": null, "tiers": ["E- Prioridade +1 na iniciativa.", "D- +1d10 em testes genéricos de Agilidade.", "C- +1 na Defesa.", "B- +1 na Defesa adicional (total +2).", "A- +5 na iniciativa."], "revisado_v2": true}, {"id": "resistente_b", "name": "Resistente B", "category": "passiva", "subtype": "Atributos", "reviewed": true, "intro": "Possui uma resistência além do padrão.", "cost": null, "tiers": ["E- Com B.Ação, fica imune a um efeito de ENRAIZAMENTO ou que interrompa seu movimento até o próximo turno.", "D- +1d10 em testes genéricos de Resistência.", "C- +1 HP e +1 na Resistência Natural.", "B- +1 na Resistência Natural adicional e +1 na Resistência Armadura.", "A- Sucesso automático em testes de Resistência fora de combate."], "revisado_v2": true}, {"id": "inteligencia_b", "name": "Inteligência B", "category": "passiva", "subtype": "Atributos", "reviewed": true, "intro": "Possui uma capacidade de raciocínio e compreensão além do padrão.", "cost": null, "tiers": ["E- Uma vez por turno, pode aumentar em 1 a rolagem de um dado do Acerto.", "D- +1d10 em testes genéricos de dedução ou compreensão.", "C- +1 no dado de recuperação de MP na manutenção.", "B- Ganha uma propriedade de nível E ou D de uma habilidade passiva de Técnica ou Magia que não possua.", "A- Escolha uma habilidade ativa para ganhar um \"+\" extra, podendo alternar uma linha por outra do mesmo nível."], "revisado_v2": true}, {"id": "persistente_b", "name": "Persistente B", "category": "passiva", "subtype": "Técnicas", "reviewed": true, "intro": "Você possui uma força de vontade poderosa, o mantendo na luta a menos que sofra um dano fatal.", "cost": null, "tiers": ["E- +1d10 (ou retira 1d10) em testes que envolvam Determinação, à sua escolha.", "D- Como B.Ação, pode fazer o teste de um efeito que esteja sofrendo sem esperar o fim do turno.", "C- +1 HP e +1 SP.", "B- +1 SP adicional (total +2).", "A- Se seu HP chegar a zero, continua até -1, a menos que sofra um crítico."], "revisado_v2": true}, {"id": "mestre_de_arma_de_haste_b", "name": "Mestre de arma de haste B", "category": "passiva", "subtype": "Técnicas", "reviewed": true, "intro": "É um especialista no uso da arma de escolha.", "cost": null, "tiers": ["E- Usando a arma de haste, pode re-rolar um dado do Acerto.", "D- Se um inimigo sair da sua zona, pode reagir com um ataque de oportunidade com vantagem.", "C- +1 na Confirmação de dano com a arma de haste.", "B- +1 na Confirmação de dano adicional com a arma de haste (total +2).", "A- Ataques de oportunidade com a arma de haste têm vantagem automaticamente."], "revisado_v2": true}, {"id": "mestre_de_longo_alcance_b", "name": "Mestre de longo alcance B", "category": "passiva", "subtype": "Técnicas", "reviewed": true, "intro": "É um especialista no uso desta arma ou técnicas de longa distância.", "cost": null, "tiers": ["E- Usando armas, técnicas ou magias de longa distância, pode re-rolar um dado do Acerto.", "D- Ataques de longa distância ganham +1 zona de alcance.", "C- +1 no Acerto em ataques de longa distância.", "B- +1 na Confirmação de dano contra armaduras em ataques de longa distância.", "A- +1 no Acerto adicional em ataques de longa distância (total +2)."], "revisado_v2": true}, {"id": "mestre_de_arma_pessoal_b", "name": "Mestre de arma pessoal B", "category": "passiva", "subtype": "Técnicas", "reviewed": true, "intro": "É um especialista no uso da arma de escolha.", "cost": null, "tiers": ["E- Pode aumentar em 1 um dado do Acerto com a arma de escolha.", "D- Usando a arma de escolha, pode re-rolar um dado do Acerto.", "C- +1 na Confirmação de dano com a arma de escolha.", "B- +1 na Defesa enquanto empunhar a arma de escolha.", "A- +1 na Confirmação de dano adicional com a arma de escolha (total +2)."], "revisado_v2": true}, {"id": "mestre_de_arma_dupla_b", "name": "Mestre de arma dupla B", "category": "passiva", "subtype": "Técnicas", "reviewed": true, "intro": "É um especialista em usar duas armas ao mesmo tempo. Precisando usar uma arma em cada mão para usar as seguintes habilidades. (Pode ser usada com punhos)", "cost": null, "tiers": ["E- Com B.Ação, realiza dois ataques no turno com -1 de ferida; contam como um único efeito de ataque.", "D- Os dois ataques passam a causar efeitos individualmente.", "C- +1 na Defesa no turno em que usar os dois ataques.", "B- +1 na Confirmação de dano no segundo ataque do turno.", "A- +1 na Confirmação de dano adicional no segundo ataque do turno (total +2)."], "revisado_v2": true}, {"id": "mestre_de_arma_pesada_b", "name": "Mestre de arma pesada B", "category": "passiva", "subtype": "Técnicas", "reviewed": true, "intro": "É um especialista em usar as duas mãos ao manipular sua arma.", "cost": null, "tiers": ["E- Pode re-rolar um dado do Acerto ao usar a arma com as duas mãos.", "D- Armas pesadas causam ARREMESSO sem dano adicional; sem desvantagem ao usar nas duas mãos.", "C- +1 na Confirmação de dano com armas pesadas.", "B- +1 na Confirmação de dano adicional com armas pesadas (total +2).", "A- No CONTATO com arma pesada, ainda assim causa 1 de Confirmação de dano."], "revisado_v2": true}, {"id": "mestre_de_arma_precisa_b", "name": "Mestre de arma precisa B", "category": "passiva", "subtype": "Técnicas", "reviewed": true, "intro": "É um especialista em usar uma arma enquanto a outra está livre.", "cost": null, "tiers": ["E- Pode re-rolar um dado do Acerto ao usar uma arma com a outra mão livre.", "D- Ao rolar 1+ crítico no Acerto, pode rolar +1d10 adicional no Acerto.", "C- +1 no Acerto com uma arma e a outra mão livre.", "B- +1 no Acerto adicional (total +2).", "A- +1 na Confirmação de dano com uma arma e a outra mão livre."], "revisado_v2": true}, {"id": "mestre_de_defesa_b", "name": "Mestre de defesa B", "category": "passiva", "subtype": "Técnicas", "reviewed": true, "intro": "É um especialista em usar uma arma enquanto a outra está livre.", "cost": null, "tiers": ["E- Pode usar a habilidade de escudo em um aliado na sua zona.", "D- Reduz em 1 a Confirmação de dano recebida (não crítico), uma vez por turno.", "C- +1 na Defesa.", "B- +1 na Resistência Natural.", "A- +1 na Defesa adicional (total +2)."], "revisado_v2": true}, {"id": "mestre_desarmado_b", "name": "Mestre desarmado B", "category": "passiva", "subtype": "Técnicas", "reviewed": true, "intro": "É um especialista em usar as mãos como arma.", "cost": null, "tiers": ["E- Ao rolar crítico em ataque desarmado, causa ARREMESSO.", "D- Se obtiver mais sucessos do que o necessário ao ser atacado a curta distância, pode reagir com ataque de oportunidade sem gastar a reação de Giro Defensivo, se usada.", "C- +1 na Confirmação de dano em ataques desarmados.", "B- +1 na Confirmação de dano adicional em ataques desarmados (total +2).", "A- Uma vez por turno, pode re-rolar um dado do Acerto em um ataque desarmado."], "revisado_v2": true}, {"id": "mestre_em_arte_marcial_b", "name": "Mestre em arte marcial B", "category": "passiva", "subtype": "Técnicas", "reviewed": true, "intro": "É um especialista em um estilo de luta.", "cost": null, "tiers": ["E- Uma vez por turno, pode re-rolar um dado de valor 1 no Acerto.", "D- Ao rolar crítico em ataque, +1 na Confirmação de dano de todos os ataques no turno.", "C- Pode usar a habilidade ativa Stances sem consumir um slot de habilidade ativa.", "B- Não gasta SP ao entrar em stance.", "A- +1 na Defesa enquanto estiver em uma stance."], "revisado_v2": true}, {"id": "mestre_do_critico_b", "name": "Mestre do crítico B", "category": "passiva", "subtype": "Técnicas", "reviewed": true, "intro": "Você tem como aproveitar as oportunidades a seu favor.", "cost": null, "tiers": ["D- Um crítico natural no Acerto soma +1 na Confirmação de dano (uma vez por teste).", "C- Ao rolar um crítico, pode re-rolar um sucesso não crítico — esse novo resultado conta como sucesso automático.", "B- Pode transformar um 9 natural em crítico, uma vez por rodada.", "A- O bônus de +1 na Confirmação de dano por crítico deixa de ser limitado a uma vez por teste."], "revisado_v2": true}, {"id": "mestre_em_armadura_b", "name": "Mestre em armadura B", "category": "passiva", "subtype": "Técnicas", "reviewed": true, "intro": "Você sabe tirar o melhor proveito de sua armadura.", "cost": null, "tiers": ["E- Armaduras pesadas deixam de dar desvantagem em ataques de oportunidade.", "D- Pode trocar de armadura como B.Ação em vez de Ação.", "C- +1 na Resistência Armadura.", "B- +1 na Resistência Armadura adicional (total +2).", "A- +1 na Defesa enquanto estiver com armadura equipada."], "revisado_v2": true}, {"id": "mestre_em_movimentacao_b", "name": "Mestre em movimentação B", "category": "passiva", "subtype": "Técnicas", "reviewed": true, "intro": "Possui uma forma de se mover com facilidade", "cost": null, "tiers": ["E- Pode mudar de zona com até 1 nível de diferença de altura.", "D- Com 1MP e B.Ação, realiza um movimento extra (2MP para dois movimentos extras, se já tiver essa melhoria).", "C- +10 na iniciativa.", "B- Pode usar desengajamento como B.Ação.", "A- +1 na Defesa ao se mover pelo menos uma zona no turno."], "revisado_v2": true}, {"id": "oficio_magico_b", "name": "Ofício Mágico B", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Possui aprendizado de Magia, sendo capaz de abrir tela mágica e ter um reservatório maior de mana. Também é capaz de usar magias de nível C com maior eficiência.", "cost": null, "tiers": ["E-Pode abrir a tela de mana, capaz de analisar efeitos mágicos já existentes e criar magias ou itens mágicos gastando tempo livre.", "D- Ganha +1 MP.", "C-Pode criar e obter itens mágicos. Pode usar a habilidade de magia pura sem gastar slot de habilidade, mas ela possui +1mp para seus efeitos. Se usar a habilidade de magia pura usando slot de habilidade, poderá aumentar em +1 em um dado de magias conjuradas.", "B- Possui um slot extra para itens mágicos. Pode aumentar em +1 em um dado de magia."]}, {"id": "potencial_magico_ofensivo_b", "name": "Potencial mágico ofensivo B", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Suas magias carregam maior potencial ofensivo.", "cost": null, "tiers": ["E- Pode transformar uma habilidade ativa não mágica, em mágica. Habilidades mágicas não podem usar SP para contornar o custo.", "D- Suas magias possuem +1 na confirmação de dano.", "C- Pode gastar +1mp para aumentar em 2 zonas uma magia. Permite também ao realizar uma magia em área, escolher um alvo para não sofrer seu efeito.", "B- Com B.Ação, pode adicionar um elemento que possua em uma magia sem gastar mp extra.", "A- Tiro mágico agora causa S de ferida em vez de 1."]}, {"id": "circulos_magicos_b", "name": "Círculos mágicos B", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "É capaz de criar círculos mágicos, preparando suas magias para o futuro.", "cost": null, "tiers": ["E- Pode com +1MP+MP da magia que pretende criar em um círculo mágico em uma zona. Pode criar uma condição para o círculo ser ativado ou pode ativar como B.Ação o círculo em turnos subsequentes. Uma vez que o círculo é ativado, ele usa a magia ligada a ele. Limite de 1 círculo.", "D- A magia ao ser criada pelo círculo, possui +1 no acerto ou +1 no dano, definido na hora de criar o círculo. Pode criar 1 círculo mágico.", "C- Pode criar +1 círculo mágico e círculos mágicos aumentam o alcance da magia em 1.", "B- Pode usar Ação+B.Ação+2MP+MP da magia para criar um círculo mágico em uma zona adicionando a magia um efeito elemental. Ele segue as mesmas regras dos outros círculos mágicos. (não precisa ter o sistema para adicionar o elemento na magia)", "A- Círculos mágicos custam um a menos de MP."]}, {"id": "mutacao_de_magia_b", "name": "Mutação de magia B", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Possui a capacidade de alterar a magia.", "cost": null, "tiers": ["E- Pode usar 1SP para pagar o custo de magias.", "D- Pode com 1SP usar magias de 1MP como B.Ação sem gastar mana.", "C-Pode usar 1SP para garantir 1S no acerto de uma magia. Se usado em magias que possuem S no acerto, ele adiciona +1.", "B- Ao usar uma magia, pode adicionar 1 em uma rolagem. Uma vez por teste."]}, {"id": "grimorio_magico_b", "name": "Grimório mágico B", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Possui efeitos mágicos preparados de forma que não precisa ter sistemas para ter alguns beneficios.", "cost": null, "tiers": ["E- Pode escolher um benefício de um sistema elemental e adicionar a uma magia, criando uma nova magia que agora faz parte da sua lista de opções. Limite de 1 magia criada. (D: 2 magias criadas) (C: 3 magias criadas)", "B- Pode escolher um benefício ativo de um sistema principal e adicionar a uma magia, criando uma nova magia que agora faz parte de sua lista de opções. Limite de 1 magia criada.", "Você pode alterar as magias criadas gastando 1 tempo."]}, {"id": "magia_arma_explosiva_a", "name": "Magia(arma) explosiva A", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Pode usar as magias ou habilidades de área com melhor proficiência.", "cost": null, "tiers": ["E- magias e armas explosivas possuem +1 de alcance.", "D- alvos possuem -1 na defesa contra seus ataques em área (A-2)", "C- aliados na área do ataque possuem 1 sucesso garantido na defesa", "B-bombardeio mágico e afins agora são 3 sucessos garantidos no acerto usando B.Ação+1mp. Condicionais:"]}, {"id": "acesso_a_armas_b", "name": "Acesso a armas B", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Permite começar com um arsenal que pode ser acessado por um portal ou alguma forma secreta do corpo.", "cost": null, "tiers": ["E- Você pode ter mais um item usável. (B- +2 itens)", "D- Permite recarregar armas ou trocar de armas como B.Ação.", "C- Permite trocar arma uma vez por turno como ação livre e tem +1 item equipável.", "B-Permite usar bombas e itens como B.Ação."]}, {"id": "campo_de_forca_b", "name": "Campo de força B", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "O usuário possui um campo de força, o defendendo de golpes de longa distância.", "cost": null, "tiers": ["E- -1 em um dado de ataque de longa distância em você.", "D- Você possui re-roll contra uma \"propriedade única\" de ataque.", "C- -1 em um dado de ataque inimigo em você.", "B- A primeira resistência do turno possui +1."]}, {"id": "sniper_b", "name": "Sniper B", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Possui uma forma de aumentar o alcance de suas armas de longa distância ou habilidades.", "cost": null, "tiers": ["E- Armas de longa distância podem alcançar duas zona a mais. (C: 3 zonas a mais, com desvantagem)", "D- Armas de longa distância possuem +1 no acerto em alvos em até 2 zonas de distância.", "C- Armas de longa distância possuem +1 na confirmação em alvos em até 2 zonas de distância.", "B- Ataques de longa distância podem gastar movimento para atacar com vantagem."]}, {"id": "ocultacao_de_presenca_b", "name": "Ocultação de presença B", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "É capaz de ocultar sua presença e realizar ataques surpresa.", "cost": null, "tiers": ["E-Como ação pode ocultar sua presença em regiões de visão obstruída ou de dificuldade. É necessários dois sucessos>5 (C- 3 sucessos) acumulados para localizar o usuário. Enquanto oculto, ele pode se mover sem aparecer para o inimigo, porém sempre que ele terminar um turno em uma região imprópria para se ocultar, ele perde 1 dos sucessos que precisam para encontrá-lo. (caso chegue a zero sucessos, ele é revelado automaticamente)", "D- Ao atacar um alvo de sua forma oculta, rola +1d10 (B=2d10) de dados de acerto."]}, {"id": "voar_tipo_flutuacao_tengou", "name": "Voar tipo: Flutuação Tengou", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Enquanto possuírem suas penas secas, podem flutuar em até cem metros de distância do solo com as asas fechadas, ou dois quilômetros com ela aberta.", "cost": null, "tiers": ["Pode-se ignorar diferença de altura entre zonas.", "Ataques de oportunidades feitos contra você tem desvantagem.", "Armadura pesada não causa -1 na prioridade."]}, {"id": "voar_tipo_asas", "name": "Voar tipo: asas", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Enquanto não possuir seu movimento restrito, pode voar.", "cost": null, "tiers": ["Pode-se ignorar diferença de altura entre zonas.", "Ataques de oportunidades feitos contra você tem desvantagem.", "Quando usa a ação para se movimentar em uma zona aérea, se move com 2 de movimento."]}, {"id": "sistema_psiquico", "name": "Sistema Psíquico", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Permite adicionar poderes psíquicos a habilidades usando +1MP**.", "cost": null, "tiers": ["Ofensivo - Ganha +1 acerto e ENVENENAMENTO por psicose.", "Defensivo- ganha re-roll em um dado de defesa, prevendo o golpe.", "Especial- causa DESACELERAMENTO por fraqueza em todos os inimigos na zona.", "B.Ação- Pode levitar objetos pequenos com o poder da mente. Sistemas elemental: Um sistema elemental precisa ser usado em conjunto de uma habilidade, ele pode adicionar uma das propriedades que possui de acordo com a habilidade que é usada junto."]}, {"id": "sistema_pyro", "name": "Sistema pyro", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Permite adicionar fogo a habilidades usando +1MP**.", "cost": null, "tiers": ["Ofensivo - Adiciona +1 na confirmação de dano e efeito CHAMAS a uma habilidade ofensiva.", "Defensivo- Ao usar uma habilidade defensiva, se defender, realiza uma confirmação para CHAMAS.", "Especial- Seu próximo ataque ou habilidade, causa CHAMAS em todos na zona de efeito.", "B.Ação- Pode apagar ou acender fogo de forma que não cause ferida."]}, {"id": "pyromancer", "name": "Pyromancer", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Possui grande afinidade com o sistema pyro.", "cost": null, "tiers": ["D- Confirma chamas com +1.", "C-Se possuir, pode usar o sistema pyro em ações normais. Se não possuir, escolhe uma propriedade do sistema para ter.", "B- Pode adicionar o efeito CHAMAS às habilidades e golpes sem consumir MP.", "A- Ao confirmar um ou mais CHAMAS, role CHAMAS sem ativar essa habilidade."]}, {"id": "sistema_electro", "name": "Sistema electro", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Permite adicionar eletricidade a habilidades usando +1MP**.", "cost": null, "tiers": ["Ofensivo - Role CARGA, onde 1:+1 acerto. 2: CHAMAS. 3: vantagem na confirmação de CHAMAS.", "Defensivo- Se o inimigo teve todas as confirmações de dano falhas, role CARGA, 1:nada. 2: role CHAMAS no agressor. 3: vantagem na confirmação de CHAMAS.", "Especial- Role CARGA, 1: prioridade +1. 2: Seu próximo ataque ou habilidade, causa CHAMAS em um outro alvo na mesma zona. 3: Seu próximo ataque causa, CHAMAS em um alvo na mesma zona..", "B.Ação- Pode gerar corrente elétrica ou absorver eletricidade de forma que não cria feridas."]}, {"id": "electromancer_b", "name": "Electromancer B", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Possui grande afinidade com o sistema electro.", "cost": null, "tiers": ["D- Ao usar o sistema electro, sempre começa com CARGA 1. Fora do sistema electro, ganha um re-roll em um teste de CARGA.", "C- Se possuir, pode usar o sistema electro em ações normais. Se não possuir, escolhe uma propriedade do sistema para ter.", "B- Pode adicionar CARGA, 1: nada. 2: CHAMAS, 3: vantagem na confirmação de chamas em habilidades normais e golpes sem consumir MP.", "A- CARGAS do sistema electro ganham um re-roll e: 4: CHAMAS."]}, {"id": "sistema_cryo", "name": "Sistema cryo", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Permite adicionar gelo a habilidades usando +1MP**.", "cost": null, "tiers": ["Ofensivo - Adiciona +1 no acerto e o efeito DESACELERAÇÃO por congelamento a uma habilidade ofensiva.", "Defensivo- Ao usar uma habilidade defensiva, a maior confirmação de dano recebida é comparada a um 10. Se o dano for interrompido, o alvo sofre DESACELERAÇÃO, rolando com vantagem.", "Especial- Ao acertar um alvo, o causa -1d10 na regeneração de MP.", "B.Ação- Pode congelar superfícies ou descongelar objetos, esta habilidade não causa feridas ou status."]}, {"id": "cryomancer", "name": "Cryomancer", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Possui grande afinidade com o sistema cryo.", "cost": null, "tiers": ["D- Os testes contra sua DESACELERAÇÃO por congelamento, possuem -1 na confirmação inicial.", "C-Se possuir, pode usar o sistema cryo em ações normais. Se não possuir, escolhe uma propriedade do sistema para ter.", "B- Não gasta MP extra para adicionar DESACELERAÇÃO por congelamento em suas habilidades ou golpes.", "A- Ao causar DESACELERAÇÃO em alguém sem desaceleração, causa 2 níveis de desaceleração em vez de 1."]}, {"id": "sistema_geo", "name": "Sistema Geo", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Permite adicionar terra a habilidades usando +1MP**.", "cost": null, "tiers": ["Ofensivo - Ganha +1 na confirmação de dano e DESACELERAÇÃO por peso a uma habilidade ofensiva.", "Defensivo- Ao usar uma habilidade defensiva, a maior confirmação de dano recebida é comparada a um 10. Se o dano for interrompido, o alvo sofre ENRAIZADO, rolando com vantagem.", "Especial- Uma habilidade ganha a propriedade de causar ENRAIZADO.", "B.Ação- Pode moldar a terra na sua zona, de forma simples."]}, {"id": "geomancer", "name": "Geomancer", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Possui grande afinidade com o sistema Geo.", "cost": null, "tiers": ["D- Testes contra ENRAIZADO possuem -1 na confirmação.", "C-Se possuir, pode usar o sistema geo se em ações normais. Se não possuir, escolhe uma propriedade do sistema para ter.", "B- Não gasta MP extra para adicionar DESACELERAÇÃO por peso em suas habilidades.", "A- Ao causar DESACELERAÇÃO por peso ou ENRAIZAMENTO, causa o outro efeito também."]}, {"id": "sistema_hydro", "name": "Sistema hydro", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Permite adicionar água a habilidades usando +1MP**.", "cost": null, "tiers": ["Ofensivo - Ganha +1 confirmação de dano e uma habilidade ofensiva ganha ENVENENAMENTO de forma necrótica.", "Defensivo- A defesa ganha +1 na resistência e previne um dano de CHAMAS.", "Especial- Como B.ação após usar uma habilidade, diminui um nível de ENVENENAMENTO ou DESACELERAÇÃO de você ou um alvo na mesma zona.", "B.Ação- Pode criar água ou secar áreas, a água gerada não mata a sede."]}, {"id": "hydromancer", "name": "Hydromancer", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Possui grande afinidade com o sistema hydro.", "cost": null, "tiers": ["D- Testes contra seus ENVENENAMENTO necrótico possuem -1 na confirmação.", "C-Se possuir, pode usar o sistema hydro em ações normais. Se não possuir, escolhe uma propriedade do sistema para ter.", "B- Não gasta MP extra para adicionar ENVENENAMENTO necrótico em suas habilidades.", "A- Ao causar ENVENENAMENTO ou usar suas habilidades para reduzir um nível de ENVENENAMENTO ou DESACELERAÇÃO, recupere 1MP."]}, {"id": "sistema_anemo", "name": "Sistema anemo", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Permite adicionar vento a habilidades usando +1MP**.", "cost": null, "tiers": ["Ofensivo - Ganha +1 no acerto e adiciona ARREMESSO a uma habilidade ofensiva.", "Defensivo- role CARGA. 1: defesa +1. 2: causa ARREMESSO se defender todo o ataque. 3: o ARREMESSO é ativado mesmo sem defender o ataque.", "Especial- Adiciona a uma habilidade, a capacidade de usar movimento como reação após ela ser realizada.", "B.Ação- Pode gerar ventos simples."]}, {"id": "anemomancer", "name": "Anemomancer", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Possui grande afinidade com o sistema anemo.", "cost": null, "tiers": ["D- Testes contra seu ARREMESSO, possuem -1 na confirmação.", "C-Se possuir, pode usar o sistema anemo em ações normais. Se não possuir, escolhe uma propriedade do sistema para ter.", "B- Não gasta MP extra ao aumentar o alcance de suas habilidades em 1.", "A- Ganha a habilidade de voar tipo tengou sem consumir slot e sem asas. Possui vantagem contra ENRAIZAMENTO e aumenta o alcance de seus ataques físicos normais em 1. Sistemas principal: Apenas um sistema pode estar ativo por vez."]}, {"id": "sistema_gigas", "name": "Sistema Gigas", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Usa um sistema de mana focado em alteração de magia**. Mantendo quebrado 1HP, ganha:", "cost": null, "tiers": ["Possui +1 na recuperação de MP.", "Com +1MP, um ataque ganha +2 zonas de distância.", "Com +1MP, aumenta o acerto de uma magia em 1."]}, {"id": "sistema_uniao", "name": "Sistema União", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Usa um sistema de mana focado em suporte**. Mantendo quebrado 1HP, ganha:", "cost": null, "tiers": ["Na manutenção, pode rolar a recuperação de MP de um aliado na mesma zona em vez da sua.", "Com +1MP, faz com que um aliado na mesma zona realize movimento.", "Com +1MP, realiza o movimento do turno novamente."]}, {"id": "sistema_kronos", "name": "Sistema Kronos", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Usa um sistema de mana focado em velocidade**. Mantendo quebrado 1HP, ganha:", "cost": null, "tiers": ["Possui prioridade +1.", "Com +1MP, pode usar o movimento do turno novamente.", "Com +1MP, refazer um teste inteiro (você e o inimigo re-rolam os dados)."]}, {"id": "sistema_alma", "name": "Sistema Alma", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Usa um sistema de mana focado em energia de Alma**. Mantendo quebrado 1HP ganha:", "cost": null, "tiers": ["Com B.Ação, cria uma aura de influência que preenche sua zona o garantindo +1 no acerto dentro da zona. Nos turnos seguintes, pode gastar 1MP para aumentar a área em uma zona.", "Com +1SP, consome a aura, evitando um golpe em área ou ganhando vantagem em um teste, se teleportando dentro da zona. Não pode se teleportar no mesmo turno que cria a aura.", "Com +1MP, infunde sua área de influência na arma ou magia, perdendo o efeito dela no turno para dar a propriedade de CHAMAS astrais. A aura retorna ao tamanho normal após usar."]}, {"id": "sistema_arcanis", "name": "Sistema Arcanis", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Usa um sistema de mana focado em armazenamento**. Mantendo quebrado 1HP ganha:", "cost": null, "tiers": ["Possui +1MP.", "Ação +1MP, ganha 2MP.", "Uma vez por turno, pode dar 1MP seu para um aliado na mesma zona."]}, {"id": "sistema_thalia", "name": "Sistema Thalia", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Usa um sistema de mana focado em mudança de probabilidade**. Mantendo quebrado 1HP, ganha:", "cost": null, "tiers": ["Ações de rolagem vs rolagem na sua zona são feitas com 4d10 em vez de 3 como base. (aliados e inimigos também)", "Com +1MP, refaz um teste inteiro (você e o inimigo re-rolam os dados).", "Com +1MP, transforma uma falha crítica em um sucesso."]}, {"id": "sistema_necron", "name": "Sistema Necron", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Usa um sistema de mana focado em vitalidade**. Gasta 1SP, ganha:", "cost": null, "tiers": ["Ganha +1HP.", "Com B.Ação, gasta 1HP para recuperar 1HP de um aliado. Isso recobra a consciência de aliados caídos.", "Com B.Ação, gasta 1SP para recuperar 1HP."]}, {"id": "sistema_dulahan", "name": "Sistema Dulahan", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Usa um sistema de mana focado no ataque**. Mantendo quebrado 1HP, ganha:", "cost": null, "tiers": ["Pode ganhar +1d10 nos ataques, mas sofre -1d10 quando é atacado.", "Com +1MP, ganha +1 no acerto e confirmação de dano, em troca de -1 na defesa até o próximo turno.", "Com +1MP, seu rolou um crítico no acerto, +1 na Confirmação de dano."]}, {"id": "sistema_umbra", "name": "Sistema Umbra", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Usa um sistema de mana focado na defesa**. Mantendo quebrado 1HP, ganha:", "cost": null, "tiers": ["Pode ganhar +1 na Defesa, mas sofre -1d10 ao atacar.", "Com +1MP, ganha +1 na defesa e na resistência, mas perde 1 no ataque.", "Com +1MP, não sofre o -1d10 em um ataque neste turno. Extra:", "**Chefão A:** habilidade única de inimigos muito fortes.", "E- +1 HP, MP. SP", "D- Possui um turno extra na iniciativa, porém não pode repetir as mesmas ações e só pode usar movimento em uma delas.", "D+- Pode usar movimento nas duas ações, ou repetir a ação.", "C- Ganha um efeito na manutenção referente a seu poder. Ganha uma reação extra e regenera 1MP na manutenção após rolar a regeneração.", "C+ - Rola com vantagem nos testes de resistência.", "B- Ganha ação lendária, que são 3 opções de ações fixas para usar no fim do turno de um inimigo.", "A- +1HP, MP, SP. +1 nas resistencias. +1 nos acertos, defesas e confirmações de dano. No início do turno regenera +1MP. ```{=html} <!-- --> ```", "**Regra de ouro B (civilização):** Possui a capacidade de adquirir recursos com facilidade e possui um carisma elevada natural", "Possui +1d10 em rolagens envolvendo relações políticas e de interações sociais.", "É capaz de fazer uma rolagem para obter ou achar formas de obter recursos dentro de uma civilização.", "Possui uma base secreta de fácil acesso dificultando inimigos de atacá-la em seu domínio.", "Pessoas de Ascensão menor que a sua te respeitam, admiram ou temem. ```{=html} <!-- --> ```", "**Regra de ouro B (Magos):** Possui a capacidade de adquirir recursos com facilidade e possui um carisma elevada natural", "Possui +1d10 em rolagens envolvendo relações entre magos e de interações acadêmicas.", "É capaz de fazer uma rolagem para obter ou achar formas de obter informação académica ou pontos de mana.", "Possui uma oficina mágica de fácil acesso que lhe garante ingredientes e ferramentas para o ofício.", "Pessoas de Ascensão menor que a sua te respeitam, admiram ou temem. ```{=html} <!-- --> ```", "**Regra de ouro B (Arte marcial):** Possui a capacidade de adquirir recursos com facilidade e possui um carisma elevada natural", "Possui +1d10 em rolagens envolvendo relações entre guerreiros e de interações do mundo das artes marciais.", "É capaz de fazer uma rolagem para obter ou achar formas de obter informação de mestres ou guerreiros poderosos.", "Consegue facilmente identificar pessoas poderosas e saber a diferença de nivel e seus estilos de luta.", "Pessoas de Ascensão menor que a sua te respeitam, admiram ou temem. ```{=html} <!-- --> ```", "**Regra de ouro B (submundo):** Possui a capacidade de adquirir recursos com facilidade e possui um carisma elevada natural", "Possui +1d10 em rolagens envolvendo relações ao submundo, organizações criminosas e de interações ilícitas.", "É capaz de fazer uma rolagem para obter ou achar informações de criminosos ou do submundo.", "Possui acesso a caminhos que outros não possuem.", "Pessoas de Ascensão menor que a sua te respeitam, admiram ou temem. ```{=html} <!-- --> ```", "**Rastreadora B (área) :** Você é perito em achar rastros dos outros, capaz de investigar e obter informantes que o levarão a seu alvo.", "Possui +1d10 em rolagens envolvendo localizar indivíduos ou pontos de interesse.", "É capaz de fazer uma rolagem para obter ou achar formas de encontrar indivíduos famosos ou pontos de interesse.", "É capaz de localizar bases secretas ou regiões que possuem defesas para se ocultar.", "Pessoas de Ascensão menor não podem ter sua presença oculta de você. ```{=html} <!-- --> ```", "**Adaptabilidade A:** Você carrega consigo instrumentos para uma grande variedade de situações. Você consegue se adaptar bem a novos ambientes.", "Pode considerar que possui instrumentos para situações inesperadas.", "Possui equipamentos escondidos no corpo, cada um preparado para situações inesperadas. Você também é perito em usar tais equipamentos.", "Considera que possui 3 pontos de preparo por descanso longo, cada um deles pode ser usado para \"gerar\" uma ferramenta ou instrumento necessário para uma situação. ```{=html} <!-- --> ```", "Possui uma de cada bomba por descanso longo a seguir:", "Bomba de fumaça: Cria uma zona de 10m de raio de visão obscurecida.", "Bomba de fogo: Explode em chamas, causando um ataque de=> Acerto área: 2 sucessos => Dano de fogo em esfera 30m: 5/10 R.N => 1+S. (Especial)", "Bomba de óleo: Cria uma superfície oleosa e de pouco atrito, ela é escorregadia e precisa de ao menos um sucesso para se manter firme sobre ela.", "Bomba de gelatina: Cria uma explosão de gosma que restringe o movimento de quem acerta, causando -1d10 em testes relacionados a se mover e reduzindo pela metade o movimento. Termos: Quando a habilidade diz que causa o efeito, o alvo ainda precisa rolar o teste descrito no termo. Termos do mesmo tipo, ficam mais fortes, enquanto termos diferentes se aculam separadamente. ( ENVENENAMENTO necrótico aumenta apenas pelo mesmo tipo. Alguem pode sofrer de ENVENENAMENTO necrótico nivel 1 e ENVENENAMENTO biológico nivel 1 ao mesmo tempo."]}, {"id": "chefao_a", "name": "Chefão A", "category": "passiva", "subtype": "Únicas/Especiais", "reviewed": true, "intro": "habilidade única de inimigos muito fortes.", "cost": null, "tiers": ["E- +1 HP, MP. SP", "D- Possui um turno extra na iniciativa, porém não pode repetir as mesmas ações e só pode usar movimento em uma delas.", "D+- Pode usar movimento nas duas ações, ou repetir a ação.", "C- Ganha um efeito na manutenção referente a seu poder. Ganha uma reação extra e regenera 1MP na manutenção após rolar a regeneração.", "C+ - Rola com vantagem nos testes de resistência.", "B- Ganha ação lendária, que são 3 opções de ações fixas para usar no fim do turno de um inimigo.", "A- +1HP, MP, SP. +1 nas resistencias. +1 nos acertos, defesas e confirmações de dano. No início do turno regenera +1MP. ```{=html} <!-- --> ```"]}, {"id": "regra_de_ouro_b_civilizacao", "name": "Regra de ouro B (civilização)", "category": "passiva", "subtype": "Únicas/Especiais", "reviewed": true, "intro": "Possui a capacidade de adquirir recursos com facilidade e possui um carisma elevada natural", "cost": null, "tiers": ["Possui +1d10 em rolagens envolvendo relações políticas e de interações sociais.", "É capaz de fazer uma rolagem para obter ou achar formas de obter recursos dentro de uma civilização.", "Possui uma base secreta de fácil acesso dificultando inimigos de atacá-la em seu domínio.", "Pessoas de Ascensão menor que a sua te respeitam, admiram ou temem. ```{=html} <!-- --> ```"]}, {"id": "regra_de_ouro_b_magos", "name": "Regra de ouro B (Magos)", "category": "passiva", "subtype": "Únicas/Especiais", "reviewed": true, "intro": "Possui a capacidade de adquirir recursos com facilidade e possui um carisma elevada natural", "cost": null, "tiers": ["Possui +1d10 em rolagens envolvendo relações entre magos e de interações acadêmicas.", "É capaz de fazer uma rolagem para obter ou achar formas de obter informação académica ou pontos de mana.", "Possui uma oficina mágica de fácil acesso que lhe garante ingredientes e ferramentas para o ofício.", "Pessoas de Ascensão menor que a sua te respeitam, admiram ou temem. ```{=html} <!-- --> ```"]}, {"id": "regra_de_ouro_b_arte_marcial", "name": "Regra de ouro B (Arte marcial)", "category": "passiva", "subtype": "Únicas/Especiais", "reviewed": true, "intro": "Possui a capacidade de adquirir recursos com facilidade e possui um carisma elevada natural", "cost": null, "tiers": ["Possui +1d10 em rolagens envolvendo relações entre guerreiros e de interações do mundo das artes marciais.", "É capaz de fazer uma rolagem para obter ou achar formas de obter informação de mestres ou guerreiros poderosos.", "Consegue facilmente identificar pessoas poderosas e saber a diferença de nivel e seus estilos de luta.", "Pessoas de Ascensão menor que a sua te respeitam, admiram ou temem. ```{=html} <!-- --> ```"]}, {"id": "regra_de_ouro_b_submundo", "name": "Regra de ouro B (submundo)", "category": "passiva", "subtype": "Únicas/Especiais", "reviewed": true, "intro": "Possui a capacidade de adquirir recursos com facilidade e possui um carisma elevada natural", "cost": null, "tiers": ["Possui +1d10 em rolagens envolvendo relações ao submundo, organizações criminosas e de interações ilícitas.", "É capaz de fazer uma rolagem para obter ou achar informações de criminosos ou do submundo.", "Possui acesso a caminhos que outros não possuem.", "Pessoas de Ascensão menor que a sua te respeitam, admiram ou temem. ```{=html} <!-- --> ```"]}, {"id": "rastreadora_b_area", "name": "Rastreadora B (área)", "category": "passiva", "subtype": "Únicas/Especiais", "reviewed": true, "intro": "Você é perito em achar rastros dos outros, capaz de investigar e obter informantes que o levarão a seu alvo.", "cost": null, "tiers": ["Possui +1d10 em rolagens envolvendo localizar indivíduos ou pontos de interesse.", "É capaz de fazer uma rolagem para obter ou achar formas de encontrar indivíduos famosos ou pontos de interesse.", "É capaz de localizar bases secretas ou regiões que possuem defesas para se ocultar.", "Pessoas de Ascensão menor não podem ter sua presença oculta de você. ```{=html} <!-- --> ```"]}, {"id": "adaptabilidade_a", "name": "Adaptabilidade A", "category": "passiva", "subtype": "Únicas/Especiais", "reviewed": true, "intro": "Você carrega consigo instrumentos para uma grande variedade de situações. Você consegue se adaptar bem a novos ambientes.", "cost": null, "tiers": ["Pode considerar que possui instrumentos para situações inesperadas.", "Possui equipamentos escondidos no corpo, cada um preparado para situações inesperadas. Você também é perito em usar tais equipamentos.", "Considera que possui 3 pontos de preparo por descanso longo, cada um deles pode ser usado para \"gerar\" uma ferramenta ou instrumento necessário para uma situação. ```{=html} <!-- --> ```", "Possui uma de cada bomba por descanso longo a seguir:", "Bomba de fumaça: Cria uma zona de 10m de raio de visão obscurecida.", "Bomba de fogo: Explode em chamas, causando um ataque de=> Acerto área: 2 sucessos => Dano de fogo em esfera 30m: 5/10 R.N => 1+S. (Especial)", "Bomba de óleo: Cria uma superfície oleosa e de pouco atrito, ela é escorregadia e precisa de ao menos um sucesso para se manter firme sobre ela.", "Bomba de gelatina: Cria uma explosão de gosma que restringe o movimento de quem acerta, causando -1d10 em testes relacionados a se mover e reduzindo pela metade o movimento. Termos: Quando a habilidade diz que causa o efeito, o alvo ainda precisa rolar o teste descrito no termo. Termos do mesmo tipo, ficam mais fortes, enquanto termos diferentes se aculam separadamente. ( ENVENENAMENTO necrótico aumenta apenas pelo mesmo tipo. Alguem pode sofrer de ENVENENAMENTO necrótico nivel 1 e ENVENENAMENTO biológico nivel 1 ao mesmo tempo."]}, {"id": "oficio_metalico_area", "name": "Ofício metalico (área)", "category": "passiva", "subtype": "Únicas/Especiais", "reviewed": false, "intro": "Você sabe mexer com metal??? -", "cost": null, "tiers": []}, {"id": "imparavel", "name": "Imparável", "category": "passiva", "subtype": "Únicas/Especiais", "reviewed": false, "intro": "Seu corpo dificilmente é forçado a ficar imóvel e uma vez em movimento, dificilmente é parado.", "cost": null, "tiers": ["Ganha 1d10 para qualquer teste que envolva movimentação ou para resistir efeitos que o prejudicam de alguma forma a mover seu corpo.", "Habilidades que impedem seu ataque de acertar, a menos que sejam ESQUIVAS, para cancelar um sucesso do usuário precisam usar dois sucessos ou um crítico. ```{=html} <!-- --> ```"]}, {"id": "forca_do_medo", "name": "Força do medo", "category": "passiva", "subtype": "Únicas/Especiais", "reviewed": false, "intro": "Sua aura emana uma força intimidadora, que faz com que os outros fiquem mais fracos só por sua presença.", "cost": null, "tiers": ["Ao acertar dois críticos em um teste de acerto, faz uma rolagem (3d10) para intimidar, para cada sucesso ganha os efeitos acumulados: -1- Garante ao ataque um de dano extra garantido; -2- Impede o inimigo de se mover -3- O alvo é considerado um nível de Ascenção menor para você até seu próximo turno.", "Ao matar um inimigo, todos que viram a execução, sofrem a rolagem de intimidação também. ```{=html} <!-- --> ```"]}, {"id": "regra_de_ouro_b_civilizacao_2", "name": "Regra de ouro B (civilização)", "category": "passiva", "subtype": "Únicas/Especiais", "reviewed": false, "intro": "Possui a capacidade de adquirir recursos com facilidade e possui um carisma elevada natural", "cost": null, "tiers": ["Possui +1d10 em rolagens envolvendo relações políticas e de interações sociais.", "É capaz de fazer uma rolagem para obter ou achar formas de obter recursos dentro de uma civilização.", "Possui uma base secreta de fácil acesso dificultando inimigos de ataca-la em seu domínio.", "Pessoas de Ascensão menor que a sua te respeitam, admiram ou temem. ```{=html} <!-- --> ```"]}, {"id": "aquele_que_se_esconde", "name": "Aquele que se esconde", "category": "passiva", "subtype": "Únicas/Especiais", "reviewed": false, "intro": "Possui uma entidade desconhecida no fundo de sua mente.", "cost": null, "tiers": ["Possui sucesso automático em testes envolvendo resistência de sua mente.", "Possui conhecimento de tecnologias acima do nível tecnológico do mundo.", "Possui acesso a uma voz desconhecida que possui bastante sabedoria consigo ganhando +2d10 em qualquer rolagem para determinar algum conhecimento histórico ou tecnológico do mundo."]}];
const STAT_LIST = [
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
const DEFAULT_STAT_LINKS = {
  acerto: ["destreza"],
  defesa: [],
  resistArmadura: [],
  resistNaturalFisica: [],
  resistNaturalMagica: [],
  geral: [],
};

const STAT_BASE_DEFAULTS = { acerto: 0, defesa: 8, resistArmadura: 8, resistNaturalFisica: 6, resistNaturalMagica: 6, geral: 0 };

// Catálogo NOVO de Habilidades Passivas de Combate — substitui o sistema antigo
// (as 92 habilidades ficam arquivadas na aba Habilidades, só como referência).
// Cada uma dispara sozinha, olhando um dado que JÁ foi rolado (Acerto ou
// Confirmação) contra um limiar definido por um atributo do dono da habilidade
// (o mesmo limiar usado pro crítico: 11 - grau do atributo => E=10, D=9, C=8,
// B=7, A=6). Se dois procs poderiam disparar no mesmo dado, só o de maior
// "prioridade" ativa. Cada ficha só pode ter até 2 dessas equipadas, e a
// Singularidade conta como a terceira habilidade "ativa" do personagem.
const PROC_ABILITIES = [
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
// Cada categoria tem um ícone e uma cor próprios, mostrados perto da prioridade.
const HABILIDADE_CATEGORIA_INFO = {
  ataque: { label: "Ataque", icon: Swords, color: EMBER },
  confirmacao: { label: "Confirmação de Dano", icon: Flame, color: BRASS_BRIGHT },
  defesa: { label: "Defesa", icon: ShieldHalf, color: "#5C86B0" },
  resistencia: { label: "Resistência", icon: Shield, color: PURPLE },
};

function categoriaDaHabilidade(p) {
  if (p.gatilho === "acerto_proprio" || p.gatilho === "passivo_ignora_armadura") return "ataque";
  if (p.gatilho === "confirmacao_propria") return "confirmacao";
  if (p.gatilho === "acerto_recebido") return "defesa";
  if (p.gatilho === "confirmacao_recebida" || p.gatilho?.startsWith("passivo_")) return "resistencia";
  return "ataque";
}

// Mesma lista de PROC_ABILITIES, mas agrupada por categoria (Ataque, Confirmação de
// Dano, Defesa, Resistência) — usada em todo lugar que lista as habilidades, pra
// sempre aparecerem juntas as do mesmo tipo.
const CATEGORIA_ORDEM = ["ataque", "confirmacao", "defesa", "resistencia"];
const PROC_ABILITIES_AGRUPADAS = [...PROC_ABILITIES].sort(
  (a, b) => CATEGORIA_ORDEM.indexOf(categoriaDaHabilidade(a)) - CATEGORIA_ORDEM.indexOf(categoriaDaHabilidade(b))
);

// Tipos de Ataque — define automaticamente qual atributo entra no Acerto e qual
// entra no Dano (confirmação). Substitui o antigo par zona+atributoBase.
const TIPOS_ATAQUE = {
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
const BASE_ATTACK_TYPES = [
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
    ferida: "1", // planilha: "S" — sem multiplicador extra, 1 por confirmação (padrão)
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
    ferida: "1", // planilha: "S"
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

function attrBonus(grade) {
  // E=0, D=1, C=2, B=3, A=4
  return Math.max(0, (GRADE_VALUE[grade] || 1) - 1);
}

// Vigor (Atributo Geral físico) determina o máximo de HP: E=2, D=3, C=4, B=5, A=6.
// Os outros Atributos Gerais (Carisma, Manipulação, Compostura, Inteligência,
// Perspicácia, Resolução) não têm função de combate - servem pra testes
// interpretativos fora de combate, sem afetar nada aqui no motor.
// Persistente (habilidade passiva, sempre ativa) soma +1 no HP máximo e +1 no SP máximo.
function computeMaxHP(character) {
  const bonusPersistente = (character?.procs || []).includes("persistente") ? 1 : 0;
  return 2 + attrBonus(character?.atributosGerais?.vigor) + bonusPersistente;
}

function computeMaxSP(character) {
  const base = character?.sp?.max ?? 3;
  const bonusPersistente = (character?.procs || []).includes("persistente") ? 1 : 0;
  return base + bonusPersistente;
}

// Avalia formulas simples do tipo "+1", "-1", "0" para bonus manuais de ataque.
function parseFlatBonus(value) {
  if (value === undefined || value === null || value === "") return 0;
  const num = Number(String(value).replace(",", "."));
  return isNaN(num) ? 0 : num;
}

function limiarDaHabilidade(character, p) {
  const attrs = p.atributosLimiar || (p.atributoLimiar ? [p.atributoLimiar] : []);
  const profs = p.proficienciasLimiar || (p.proficienciaLimiar ? [p.proficienciaLimiar] : []);
  const limiaresAttr = attrs.map((a) => 11 - (GRADE_VALUE[getAttrGrade(character, a)] || 1));
  const limiaresProf = profs.map((k) => 11 - (GRADE_VALUE[character?.proficiencias?.[k]] || 1));
  const todos = [...limiaresAttr, ...limiaresProf];
  if (todos.length === 0) return 10;
  return Math.min(...todos); // usa o melhor (mais baixo) limiar entre todas as fontes da habilidade
}

function attrLabelDaHabilidade(p) {
  const attrs = p.atributosLimiar || (p.atributoLimiar ? [p.atributoLimiar] : []);
  const profs = p.proficienciasLimiar || (p.proficienciaLimiar ? [p.proficienciaLimiar] : []);
  const attrLabels = attrs.map((a) => (ATTR_LIST.find((x) => x.key === a) || ATRIBUTOS_GERAIS_LIST.find((x) => x.key === a))?.label);
  const profLabels = profs.map((k) => PROFICIENCIAS_LIST.find((x) => x.key === k)?.label);
  return [...attrLabels, ...profLabels].filter(Boolean).join(" ou ");
}

function findTriggeredProc(character, gatilho, dieValue, attackTipo) {
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
//    pro valor da Sorte, mas so vale ate o PRIMEIRO critico da rolagem - os dados
//    seguintes voltam a precisar de 10 natural. Tratado a parte, fora do sistema
//    generico de findTriggeredProc.
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
function resolveConfirmationPhase({ attacker, defender, attack, successes, successFlags, successCritOrder, fixedSuccessMatch }) {
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
  const instanciasImpacto = (efeitoTexto.includes("impacto") ? 1 : 0) + (impactoDeProc ? 1 : 0);
  const instanciasChamas = (efeitoTexto.includes("chamas") ? 1 : 0) + (chamasDeProc ? 1 : 0);
  const instanciasEnvenenamento = efeitoTexto.includes("envenenamento") ? 1 : 0;

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

function resolveAttack({ attacker, defender, attack }) {
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
    var desaceleracaoRollOut = desaceleracaoRoll; // exposto pro retorno da funcao
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
    desaceleracaoRoll: typeof desaceleracaoRollOut !== "undefined" ? desaceleracaoRollOut : null,
    ...confirmResult,
  };
}

// Cada estatística de combate pode ter uma Proficiência de Combate correspondente
// que soma junto com os atributos vinculados (Defesa, Resistência Física/Mágica).
const STAT_PROF_LINK = { defesa: "defesaProf", resistNaturalFisica: "resistFisicaProf", resistNaturalMagica: "resistMagicaProf" };

function computeStat(character, statKey) {
  const base = (character.statBase && character.statBase[statKey]) ?? STAT_BASE_DEFAULTS[statKey] ?? 0;
  const temp = (character.statTemp && character.statTemp[statKey]) ?? 0;
  const links = (character.statLinks && character.statLinks[statKey]) ?? DEFAULT_STAT_LINKS[statKey] ?? [];
  const fromAttrs = links.reduce((sum, attrKey) => sum + attrBonus(getAttrGrade(character, attrKey)), 0);
  const profKey = STAT_PROF_LINK[statKey];
  const fromProf = profKey ? attrBonus(character.proficiencias?.[profKey]) : 0;
  return base + fromAttrs + fromProf + temp;
}

const HABILIDADE_CATEGORIAS = [
  { key: "ativas", label: "Ativas" },
  { key: "especial", label: "Especial" },
  { key: "racial", label: "Racial" },
  { key: "passivas", label: "Passivas" },
  { key: "extras", label: "Extras" },
];

// Rola N dados de 10, sucesso se dado > limiar (customizável, padrão 5). Um 10
// natural sempre conta como sucesso e como crítico, mesmo abaixo do limiar.
function rollSuccessDice(totalDice, limiar = 5) {
  const dice = Array.from({ length: Math.max(1, totalDice) }, () => Math.floor(Math.random() * 10) + 1);
  const successes = dice.filter((d) => d === 10 || d > limiar).length;
  const criticos = dice.filter((d) => d === 10).length;
  const superSucesso = successes >= 3;
  return { dice, successes, criticos, superSucesso };
}

const STATUS_EFFECTS = [
  {
    name: "IMPACTO",
    teste: "1d10 (tabela)",
    texto: "Quando o ataque faz contato (acerta), rola 1d10: 1-4 nada acontece; 5-7 soma +1 na Confirmação de dano (se houver); 8-9 soma +2; 10 soma +3. Havendo mais de uma instância de Impacto no mesmo ataque, soma +1 no dado antes de checar a tabela pra cada instância extra.",
  },
  {
    name: "ENVENENAMENTO",
    teste: "1d10 por instância",
    texto: "Igual a CHAMAS (rolagem de confirmação independente, sem bônus, 1 de Ferida extra por instância que confirmar, sem interagir com Armadura ou Escudo de Mana) — mas vai direto na Resistência Natural MÁGICA do alvo, independente do tipo do próprio ataque (Chamas vai na Natural do tipo do ataque: Física pra Marcial/Arma de fogo, Mágica pra Mágico).",
  },
  {
    name: "DESACELERAÇÃO",
    teste: "1d10 (tabela)",
    texto: "Antes de rolar o Acerto, rola 1d10: 1-4 nada; 5-7 reduz em 1 a Defesa do alvo só para essa rolagem de Acerto (todos os 3 dados); 8-9 reduz em 2; 10 reduz em 3. Mais de uma instância soma +1 no dado antes de checar a tabela, igual Impacto.",
  },
  {
    name: "ENRAIZAMENTO",
    teste: "sem rolagem de tabela",
    texto: "Sem tabela de dado — o número de instâncias acumuladas (até 3) define quantos dos 3 dados do Acerto, começando do primeiro, enfrentam a Defesa do alvo com -2. Enraizamento 1 = só o 1º dado; Enraizamento 2 = 1º e 2º; Enraizamento 3 = os 3 dados.",
  },
  {
    name: "ACELERAÇÃO",
    teste: "sem rolagem de tabela",
    texto: "Sem tabela de dado — dispara em sequência nos 3 dados do Acerto. O 1º dado não tem bônus. Cada dado seguinte só ganha bônus (o bônus do anterior +1) SE o dado anterior confirmou sucesso; se o anterior falhou, o bônus volta a 0. Ex: sucesso-sucesso-sucesso dá bônus 0/+1/+2; falha-sucesso dá bônus 0/0/+1 no terceiro.",
  },
  {
    name: "CHAMAS",
    teste: "1d10 por instância",
    texto: "Quando o ataque faz contato (acerta), rola separadamente 1d10 de confirmação de dano (sem nenhum bônus) contra a Resistência do alvo — se confirmar, causa 1 de Ferida extra. Havendo mais de uma instância de Chamas no mesmo ataque, rola mais um 1d10 independente (também sem bônus, também 1 de Ferida) pra cada instância extra.",
  },
  {
    name: "CARGA",
    teste: "3d10 (sucesso >5)",
    texto: "Antes do acerto ou do efeito da habilidade, role 3d10 com sucesso >5. Cada sucesso define o nível de carga; o efeito é cumulativo com os níveis anteriores descritos na habilidade.",
  },
];

const EQUIPMENT_REFERENCE = {
  armas: [
    { nome: "Arma branca", perfil: "Zona 0 · Acerto 0 · Dano +1 · Ferida S" },
    { nome: "Arma branca pesada", perfil: "Zona 0 · Acerto -1 · Dano +2 · Ferida S" },
    { nome: "Mosquete", perfil: "Distância, carga 1 · Acerto -1 · Dano +4 · Ferida 2" },
    { nome: "Morteiro pesado", perfil: "Distância, carga 1 · Zona 4 · Acerto S · Dano 6+S · Ferida 1 · Prioridade -1" },
    { nome: "Revólver", perfil: "Distância 6, carga · Acerto 0 · Dano +2 · Ferida 2" },
    { nome: "Granada", perfil: "Área · Zona 2 · Acerto 2S · Dano 1+S · Ferida 1" },
    { nome: "Escudo", perfil: "+1 na defesa, -1 no acerto (patch: -1 em um dado do ataque inimigo; gasta slot de equipamento)" },
  ],
  armaduras: [
    { nome: "Armadura leve", perfil: "7 de resistência" },
    { nome: "Armadura média", perfil: "8 de resistência, -1 nos dois maiores dados de defesa" },
    { nome: "Armadura pesada", perfil: "9 de resistência (patch: fixa em 9), -2 no maior dado de defesa, -1 prioridade, desvantagem em ataques de oportunidade" },
    { nome: "Power armor", perfil: "8 de resistência, +1 confirmação de dano, -1 MP (sem MP: 8 de resistência, -1 em defesa)" },
    { nome: "Armadura mágica", perfil: "5 de resistência + 1hp extra; recupera o HP da armadura gastando 3 de MP" },
  ],
  patchNotes: [
    "Armaduras agora defendem apenas a primeira confirmação de dano da rodada e não têm vida própria — exceto a armadura mágica.",
    "Armaduras físicas normalmente possuem +1 de resistência natural.",
    "CONTATO: um ataque que acerta (1+ sucesso no Acerto) mas não confirma dano (não bate a Resistência do alvo, e não é Super Sucesso) é CONTATO — não causa dano normal, mas ativa habilidades ligadas a CONTATO. Ataques que confirmam dano ativam essas habilidades automaticamente também.",
  ],
  limites: [
    "Só pode ter 3 itens usáveis equipados.",
    "Só pode ter 3 itens principais equipados.",
    "Só pode ter 1 armadura equipada.",
  ],
};

const CORE_RULES = {
  testeBasico: "A menos que algo especifique o contrário, todo teste usa 3d10, onde >5 é sucesso. Ganha +1d10 extra por diferença de nível de Ascensão.",
  ajusteEmUso: "Versão em uso neste app: atributos no estilo Fire Emblem — Força (confirma dano físico), Magia (confirma dano mágico), Destreza (Acerto), Técnica (prioridade/iniciativa), Sorte (governa as Habilidades Passivas de Combate — quanto mais alta, mais fácil disparar), Defesa (stat Defesa) e Resistência Física/Mágica (Resistência Natural por tipo de ataque). Defesa do alvo não gera mais uma rolagem própria — ela é o próprio limiar de sucesso do atacante (Defesa = 5 + bônus de Defesa). Resolução em 2 rolagens: 1) Acerto — 3d10; crítico é sempre um 10 natural (Sorte não afeta mais isso) — um dado crítico soma +1 a si mesmo (não é sucesso automático) e também soma +1 na confirmação que aquele sucesso gerar. Sucesso = (dado + bônus + bônus de crítico) > Defesa do alvo. 2) Confirmação — para CADA sucesso do Acerto, rola-se 1d10 + bônus (definido pelo Tipo do ataque: Marcial soma Força, Mágico soma Magia, Arma de fogo não soma atributo). A Armadura funciona como um escudo de uso único: as confirmações são checadas em ordem contra o valor da Armadura até uma delas igualar/superar esse valor — essa rompe a armadura e causa dano; as seguintes (e todas, se não houver armadura) checam a Resistência Natural Física (Marcial/Arma de fogo) ou Mágica (Mágico). Um 10 natural na confirmação sempre confirma. A Ferida final depende do Tipo: em ataques Marciais (desarmado e arma branca) escala com a quantidade de confirmações que passaram; em Arma de fogo e Mágico é um valor fixo, aplicado uma vez. Cada ataque tem um Tipo (Marcial/Arma de fogo/Mágico) que já define os atributos usados. O texto original abaixo é a versão bruta dos documentos, mantida como referência histórica — o sistema mudou bastante desde então.",
  recursos: [
    { nome: "Ação", desc: "Permite realizar ações." },
    { nome: "B.Ação", desc: "Permite complementar ações com efeitos de habilidades." },
    { nome: "Movimento", desc: "Permite se mover uma zona (de uma interseção só para uma região, e vice-versa, salvo zonas especiais)." },
    { nome: "Reação", desc: "Permite realizar certas ações fora do turno." },
  ],
  rodada: [
    { fase: "Manutenção", passos: ["Para cada MP vazio, rola 1d10 — sucesso recupera 1 MP.", "Pode usar habilidades de manutenção.", "Define ataque a curta ou longa distância (longa tem prioridade +1, mas o movimento segue a ordem normal do turno)."] },
    { fase: "Turno", passos: ["Usa o recurso Movimento.", "Usa o recurso Ação.", "Usa o recurso B.Ação."] },
  ],
  acao: [
    "Texto original (docx): Acerto rola 3d10, >Acerto é sucesso; confronta a Defesa do inimigo (3d10, >Defesa). Cada sucesso na defesa cancela um sucesso no acerto. Com pelo menos 1 sucesso restante, a ação prossegue para confirmação.",
    "Crítico: 10 natural no d10 do acerto.",
    "Super sucesso: 3 ou mais sucessos no acerto garantem um sucesso automático na confirmação.",
    "Texto original (docx): rola confirmação de dano contra a Resistência do oponente — igual ou maior causa o efeito do ataque. Em ação genérica, confirma contra o parâmetro pedido pela ação.",
  ],
  extras: [
    "Reação de Agilidade para bloquear um golpe dirigido a um alvo: 2+ sucessos = você sofre o ataque; 1 sucesso = defende pelo alvo em desvantagem; 0 sucessos = o alvo recebe o dano direto.",
    "Reação de Agilidade para se ocultar de um golpe em área: 2+ sucessos = o alvo escolhido sofre o ataque; 1-0 sucessos = você falha a defesa.",
    "Ação de Força vs Agilidade/Força: sucesso causa ARREMESSO com no mínimo 1 movimento.",
  ],
  termosGerais: [
    "Quando uma habilidade diz que causa um efeito, o alvo ainda precisa rolar o teste descrito no termo.",
    "Termos do mesmo tipo se acumulam e ficam mais fortes; termos diferentes acumulam separadamente (ex.: ENVENENAMENTO necrótico só aumenta por outro necrótico — pode coexistir com ENVENENAMENTO biológico nível 1 ao mesmo tempo).",
  ],
};

/* ---------------------------------------------------------------
   DADOS SEMENTE — os 13 dossiês já existentes do Grupo C e aliados.
   Isso já deixa o app populado de cara.
----------------------------------------------------------------*/
const SEED_CHARACTERS_RAW = [
  {
    id: "almah", name: "Almah Mason", epithet: "Líder do Grupo C · Maga Bateria",
    race: "Ningen Roedor (Coelho)", faction: "Amaranth/Omem",
    affiliation: "Família Mason · Associação de Magia · Líder do Grupo C",
    height: "1,72m", deity: "Gigas", weapon: "Revólver e Rifle Herança de Giovana",
    attacks: (() => {
      const pick = (id) => BASE_ATTACK_TYPES.find((t) => t.id === id);
      return [pick("arma_branca"), pick("revolver"), pick("shin")].filter(Boolean).map((t) => ({
        nome: t.nome, tipo: t.tipo, acerto: t.acerto, dano: t.dano, ferida: t.ferida,
        efeito: t.modificadores ? t.modificadores.join(", ") : "", profKey: t.profKey,
      }));
    })(),
    singularity: { name: "Mana Consciente", level: "EX", description: "Manifesta mana como um ser consciente com memória própria — deu origem a Minerva. Pode vincular e transferir mana a longa distância." },
    attributes: {},
    atributosGerais: { forca: "E", destreza: "B", vigor: "E", carisma: "E", manipulacao: "E", compostura: "E", inteligencia: "E", perspicacia: "E", resolucao: "E" },
    abilities: [
      { name: "Ofício mágico", grade: "A", description: "Domínio avançado de ofício mágico; cria magias e itens mágicos. Regra de Ouro." },
      { name: "Combatente à Distância", grade: "D", description: "Revólver, rifle, bombas e torres de mana com funções variadas." },
      { name: "Bombas, Torres e Constructos", grade: "B", description: "Bombas ocultas no corpo; cria torres e constructos mágicos independentes." },
      { name: "Ocultar presença", grade: "D", description: "É capaz de ocultar sua presença." },
    ],
    hp: { current: 3, max: 3 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "Nascida ningen em Novolar, quarta filha de Cher, foi entregue para adoção e criada pela família Mason, industriais de armas de Maxis, que a tratava mais como ativo do que como filha. Para não ser descartada, tornou-se a maior promessa da Associação de Magia, desenvolvendo em segredo o Constructo de Mana Consciente que deu origem a Minerva. Na Academia de Omem, transformou inteligência e sentimentos em pilares de liderança, tornando-se comandante tática e, para Minerva, uma verdadeira mãe.",
  },
  {
    id: "kiryu", name: "Kiryu Ayamato Edward Lian", epithet: "Rex Gold · Sub-líder do Grupo C",
    race: "Dragonato Texoni", faction: "Amaranth/Omem",
    affiliation: "Família Ayamato · Grupo C", height: "1,90m",
    deity: "Thalia (Freya) e Gigas", weapon: "Punhos + manipulação de metal",
    singularity: { name: "Metal Craft", level: "EX", description: "Manipulação e criação de habilidades ligadas ao magnetismo — mãos de ferro à distância, estilhaços, barreiras de metal." },
    attributes: {},
    atributosGerais: { forca: "B", destreza: "C", vigor: "E", carisma: "E", manipulacao: "E", compostura: "E", inteligencia: "E", perspicacia: "E", resolucao: "E" },
    abilities: [
      { name: "Força e Resistência Acima do Padrão", grade: "B", description: "Escamas metálicas e campo de força magnético constante." },
      { name: "Artista Marcial", grade: "D", description: "Especialista em combate desarmado e estilo único de combate." },
      { name: "Aurummancer", grade: "A", description: "Grande afinidade com o Sistema Aurum, usos avançados de magnetismo." },
      { name: "Socialite", grade: "B", description: "Adquire recursos com facilidade; carisma elevado e vasta rede de contatos." },
    ],
    hp: { current: 3, max: 3 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "Nasceu de um ovo de dragão perdido há mais de mil anos, redescoberto e dado de presente à família Ayamato, que o criou como bichinho de estimação ao lado do filho biológico do casal — também chamado Kiryu. Quando o Kiryu humano foi assassinado por uma família rival, o dragão foi treinado para assumir sua identidade por completo, raspando os chifres e escondendo as escamas todos os dias desde então. Vive hoje como aristocrata de Maxis, enviado à Academia de Omem, onde vive um relacionamento com Leona.",
  },
  {
    id: "leona", name: "Leona", epithet: "A Juba de Ouro",
    race: "Ningen Leonino", faction: "Hetalion",
    affiliation: "Grupo principal · Novolar · Ex-Exército Vermelho", height: "1,78m–2,08m",
    deity: "União", weapon: "Garras",
    singularity: { name: "Juba de Chamas", level: "B — Superior", description: "Manifestação de fogo dourado ligada à sua forma bestial, ampliando força e agressividade em combate." },
    attributes: {},
    atributosGerais: { forca: "C", destreza: "D", vigor: "E", carisma: "E", manipulacao: "E", compostura: "E", inteligencia: "E", perspicacia: "E", resolucao: "E" },
    abilities: [
      { name: "Militar (Hetalion)", grade: "D", description: "Cargo militar elevado e condecorações de mérito." },
      { name: "Artista Marcial", grade: "D", description: "Especialista em combate desarmado e estilo único de combate." },
      { name: "Pyromancer", grade: "C", description: "Grande afinidade com o uso e controle de fogo." },
      { name: "Instinto de Sobrevivência", grade: "C", description: "Usa instintos para incrementar habilidades e localizações." },
    ],
    hp: { current: 3, max: 3 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "Chegou a Hetalion criança, imigrante ningen acolhida em Novolar. Recrutada pelo Exército Vermelho como espiã enquanto sua irmã Puman liderava a revolta ningen pelo Exército Preto, Leona ajudou secretamente a conter a revolução e foi condecorada heroína de guerra. Convocada para a Academia de Omem, superou um período de vício em bebida e hoje vive um relacionamento com Kiryu.",
  },
  {
    id: "ookami", name: "Ookami Serin", epithet: "A Dançarina Elemental",
    race: "Ningen Kitsune", faction: "Hetalion",
    affiliation: "Grupo principal · Novolar · Black Shield (honorária)", height: "1,54m",
    deity: "União", weapon: "Magia elemental de suporte",
    singularity: { name: "Imbuição Elemental", level: "C — Intermediário", description: "Fortalece aliados em combate através da imbuição de elementos em armas e habilidades." },
    attributes: {},
    atributosGerais: { forca: "E", destreza: "A", vigor: "E", carisma: "E", manipulacao: "E", compostura: "E", inteligencia: "E", perspicacia: "E", resolucao: "E" },
    abilities: [
      { name: "Diplomata e Estrategista", grade: "A", description: "Mente estratégica refinada; rede de contatos (Black Shield)." },
      { name: "Artista Marcial", grade: "E", description: "Uso de armas escondidas e leque." },
      { name: "Maga Versátil", grade: "B", description: "Domina magias elementares de suporte e combate leve." },
      { name: "Ocultar presença", grade: "D", description: "É capaz de ocultar sua presença." },
    ],
    hp: { current: 3, max: 3 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "Nasceu ningen, imigrante pobre em Novolar, acolhida por Saito, figura política neutra de Hetalion, que a treinou na diplomacia e a levou a viajar por todos os reinos. Durante a revolta de Novolar ajudou a redigir as novas regras da comunidade ningen, o que a levou à Academia de Omem. Hoje se aceita cada vez mais em seu lado feminino e desenvolveu sentimentos reais por Almah.",
  },
  {
    id: "boda", name: "Chaeskele Boda", epithet: "A Guerreira de Kronos",
    race: "Niosh (Descendente de Sharkan)", faction: "Katalão",
    affiliation: "Templo de Kronos · Katalão · Amaranth", height: "2,08m",
    deity: "Kronos", weapon: "Espada de Kronos",
    singularity: { name: "Domínio Temporal Local", level: "A", description: "Acelera ou desacelera o tempo em pequenas zonas ao seu redor." },
    attributes: {},
    atributosGerais: { forca: "D", destreza: "C", vigor: "E", carisma: "E", manipulacao: "E", compostura: "E", inteligencia: "E", perspicacia: "E", resolucao: "E" },
    abilities: [
      { name: "Lutadora de Alta Velocidade", grade: "B", description: "Combos com a Espada de Kronos que confundem os inimigos." },
      { name: "Bênção de Kronos", grade: "B", description: "Manipula o fluxo do tempo em zonas pequenas." },
      { name: "Sistema Kronos", grade: "C", description: "Prioridade e movimento melhorados ao custo de HP." },
      { name: "Esquivas e Manobras Evasivas", grade: "C", description: "Especialista em evitar golpes através de manobras precisas." },
    ],
    hp: { current: 3, max: 3 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "Identificada ainda criança como portadora de singularidade, foi entregue ao Templo de Kronos em Katalão. Serviu como militar sob os Pendragons até ser dispensada por desafiar ordens superiores, retornando ao templo como sacerdotisa combatente. Convocada por Amaranth para a Academia de Omem, segue em busca do título de Cavaleira de Omem.",
  },
  {
    id: "erin", name: "Erin Genova", epithet: "A Santa de Goethia",
    race: "Humana (Goethiana)", faction: "Goethia",
    affiliation: "Goethia · Irmandade da Tempestade · aliada via Kiryu", height: "3,2m",
    deity: "Presente de Umbra, moldada por Gigas", weapon: "Duas espadas",
    singularity: { name: "A Voz de Goethia", level: "EX — Divino", description: "Conexão emocional em massa com toda a nação goethiana; usada para inspirar, proteger e orientar seu povo." },
    attributes: {},
    atributosGerais: { forca: "A", destreza: "B", vigor: "E", carisma: "E", manipulacao: "E", compostura: "E", inteligencia: "E", perspicacia: "E", resolucao: "E" },
    abilities: [
      { name: "Guerreira Poderosa", grade: "EX", description: "Temida até pelos generais goethianos; força e combate excepcionais." },
      { name: "Magia de Gravidade", grade: "EX", description: "Capaz de erguer estruturas colossais, como um castelo montanha acima." },
      { name: "Redistribuição de Mana", grade: "B", description: "Equilibra recursos mágicos entre si e aliados através de marcas voluntárias." },
      { name: "Combate com Espadas Duplas", grade: "B", description: "Luta empunhando duas espadas, complementando sua força colossal." },
    ],
    hp: { current: 3, max: 3 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "Ao nascer, sua singularidade ativou instantaneamente, fazendo todo o povo goethiano sentir seu nascimento. Treinada para ser a Santa que Goethia esperava, quase perdeu a própria vontade ao sentir e ouvir a mente de cada goethiano, sofrendo colapsos mentais. O Tzar desenvolveu secretamente uma coroa capaz de abafar essas vozes, devolvendo-lhe controle sobre a própria mente.",
  },
  {
    id: "fate", name: "Fate, A Indomável", epithet: "Próxima Santa de Suth",
    race: "Homúnculo de Elite", faction: "Suth",
    affiliation: "Pilar da Santa de Suth", height: "1,80m",
    deity: "—", weapon: "Naginata e lâminas múltiplas",
    singularity: { name: "Deusa da Guerra", level: "EX — Divino", description: "Poder de combate elevado a um patamar quase divino, base de seu título e de sua ascensão como próxima Santa." },
    attributes: {},
    atributosGerais: { forca: "A", destreza: "B", vigor: "E", carisma: "E", manipulacao: "E", compostura: "E", inteligencia: "E", perspicacia: "E", resolucao: "E" },
    abilities: [
      { name: "Guerreira e Artista Marcial", grade: "EX", description: "Mestre no uso de naginatas, espadas e facas." },
      { name: "Golden Rule", grade: "A", description: "Elite do Pilar da Santa; influência crescente dentro do exército." },
      { name: "Homúnculo", grade: "B", description: "Corpo geneticamente modificado para combate extremo." },
      { name: "Corpo de Combate Extremo", grade: "B", description: "Suporta danos intensos por períodos prolongados." },
    ],
    hp: { current: 3, max: 3 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "Criada em laboratório por Kino Kuni como experimento proibido, nasceu quase perfeita, mas com vontade própria que a tornou livre. Acolhida pelo Pilar da Santa, tornou-se guerreira lendária e invicta — até enfrentar Kirilia, Emphes Alpha e um grupo formidável. Sofreu uma intoxicação de mana irreversível, sua primeira e única derrota, e hoje vive em cadeira de rodas, recusando-se a aceitar essa derrota como definitiva.",
  },
  {
    id: "kutrefas", name: "Lady Kutrefas", epithet: "A que Tudo Produz",
    race: "Dragonata (Clã Kutrefas)", faction: "Outra",
    affiliation: "Clã Kutrefas, Cinco Picos · aliança com Amaranth", height: "—",
    deity: "—", weapon: "Facas de osso de dragão imbuídas de toxina",
    singularity: { name: "Sopro Alquímico", level: "A", description: "Cura aliados ou envenena/corrói inimigos conforme a necessidade do combate." },
    attributes: {},
    atributosGerais: { forca: "C", destreza: "B", vigor: "E", carisma: "E", manipulacao: "E", compostura: "E", inteligencia: "E", perspicacia: "E", resolucao: "E" },
    abilities: [
      { name: "Suporte Versátil (Sopro Alquímico)", grade: "A", description: "Cura ou corrói, adaptando-se à situação de combate." },
      { name: "Combatente Furtiva e Ágil", grade: "B", description: "Luta com facas envenenadas, ocultando-se nas sombras." },
      { name: "Resistência Dracônica", grade: "B", description: "Herança natural de resistência a venenos e toxinas." },
      { name: "Traços Dracônicos Latentes", grade: "D", description: "Asas e cauda que só se manifestam plenamente em momentos especiais." },
    ],
    hp: { current: 3, max: 3 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "Filha direta da líder do clã Kutrefas, dragões venenosos dos Cinco Picos temidos por outras espécies, foi treinada desde cedo para eventualmente liderar. Representa os Kutrefas na Academia de Omem. Recentemente sua mãe garantiu apoio a ela independentemente de sua escolha sobre a liderança, deixando-a livre — mas em conflito interno sobre o que realmente deseja para si.",
  },
  {
    id: "mercurio", name: "Mercúrio Auriom", epithet: "A Paladina de Omem · Professora do Grupo C",
    race: "Niosh (Oni/Elfo)", faction: "Amaranth/Omem",
    affiliation: "Amaranth — professora na Academia de Omem", height: "—",
    deity: "Umbra", weapon: "Varia conforme o estilo ativo (Modal de Alma)",
    singularity: { name: "Modal de Alma", level: "S — Superior", description: "Domina completamente os três arquétipos de combate (guerreira, ladina, maga), trocando arma e abordagem em tempo real." },
    attributes: {},
    atributosGerais: { forca: "A", destreza: "A", vigor: "E", carisma: "E", manipulacao: "E", compostura: "E", inteligencia: "E", perspicacia: "E", resolucao: "E" },
    abilities: [
      { name: "Guerreira Veterana", grade: "S", description: "Treinada por heróis lendários; incontáveis missões de altíssimo risco." },
      { name: "Paladina de Umbra", grade: "S", description: "Poderes sagrados de proteção contra ameaças dimensionais." },
      { name: "Liderança e Ensino", grade: "A", description: "Professora na Academia de Omem, forma a próxima geração de cavaleiros." },
      { name: "Rede de Contatos Lendária", grade: "A", description: "Décadas de convivência com heróis, deuses e figuras de poder." },
    ],
    hp: { current: 3, max: 3 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "Criada em laboratório como experimento de Krovskin e Kino Kuni, foi resgatada aos 13 anos pelo herói Haifrid e adotada por ele. Ajudou a estabelecer os Cavaleiros de Omem e cumpriu incontáveis missões como paladina de Umbra. Hoje professora do grupo principal, está pronta para deixar o cargo em busca do pai desaparecido, Haifrid.",
  },
  {
    id: "minerva", name: "Minerva", epithet: "A Guardiã de Mana · Constructo de Almah",
    race: "Constructo de Mana Consciente", faction: "Amaranth/Omem",
    affiliation: "Grupo principal — vinculada a Almah Mason", height: "1,60m",
    deity: "—", weapon: "Nenhuma (combate desarmado, quatro braços)",
    singularity: { name: "Assimilação Adaptativa", level: "Indefinido (em desenvolvimento)", description: "Potencial de absorver e replicar poderes alheios — ainda instável, sem tier fixo definido." },
    attributes: {},
    atributosGerais: { forca: "B", destreza: "C", vigor: "E", carisma: "E", manipulacao: "E", compostura: "E", inteligencia: "E", perspicacia: "E", resolucao: "E" },
    abilities: [
      { name: "Combatente Desarmada", grade: "C", description: "Luta com as próprias mãos, aproveitando quatro braços em sincronia." },
      { name: "Suporte e Proteção", grade: "C", description: "Atua como protetora pessoal de Almah, priorizando defesa." },
      { name: "Controle Remoto", grade: "D", description: "Pode ser comandada através da habilidade 'Torres' de Almah." },
      { name: "Assimilação em Desenvolvimento", grade: "E", description: "Potencial de absorver poderes alheios, ainda instável." },
    ],
    hp: { current: 3, max: 3 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "Criada por Almah Mason como projeto secreto da Associação de Magia, Minerva vem aprendendo continuamente desde que chegou à Academia de Omem. Aprendeu sobre sentimentos com Vientra e conheceu outros Guardiões como ela. Para Almah, já não é mais um projeto ou ferramenta, mas uma verdadeira filha.",
  },
  {
    id: "rena", name: "Rena, A Imortal", epithet: "A Imortal",
    race: "Elfa Radiante", faction: "Outra",
    affiliation: "Corte Radiante Élfica · Grupo principal", height: "1,81m",
    deity: "Dulahand", weapon: "Katana criada do próprio sangue",
    singularity: { name: "Sangue Eterno", level: "S — Superior", description: "Regeneração extrema e criação de constructos de sangue, usada tanto ofensivamente quanto para sobrevivência." },
    attributes: {},
    atributosGerais: { forca: "B", destreza: "A", vigor: "E", carisma: "E", manipulacao: "E", compostura: "E", inteligencia: "E", perspicacia: "E", resolucao: "E" },
    abilities: [
      { name: "Regeneração e Constructos de Sangue", grade: "S", description: "Sua singularidade, usada para ataque e sobrevivência extrema." },
      { name: "Combatente com Katana de Sangue", grade: "A", description: "Luta com a katana que também serve de reserva mágica de emergência." },
      { name: "Estrategista e Manipuladora", grade: "A", description: "Mente afiada para tramar e manipular pessoas sem escrúpulos." },
      { name: "Musicista (Heavy Metal Élfico)", grade: "A", description: "Canta e toca com talento genuíno, reconhecida em Suth e Maxis Power." },
    ],
    hp: { current: 3, max: 3 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "Abandonada nas florestas próximas a Amaranth ainda criança, seguindo o costume élfico, aprendeu magias antigas de sangue e música clássica élfica. Ingressou na Associação de Magia de Hetalion para provar a capacidade real de seu povo. Convocada para a Academia de Omem, busca se tornar Cavaleira de Omem.",
  },
  {
    id: "sombra", name: "Sombra", epithet: "A Demônio Selada",
    race: "Demônio (Tengou)", faction: "Outra",
    affiliation: "Tengou · sob supervisão de Amaranth", height: "1,55m",
    deity: "Necron (atual)", weapon: "Par de facas",
    singularity: { name: "Véu da Não-Existência", level: "Selada: D | Potencial: S — Transcendente", description: "Poder de ocultação e não-existência, atualmente limitado por um selo — seu potencial real é muito maior." },
    attributes: {},
    atributosGerais: { forca: "C", destreza: "B", vigor: "E", carisma: "E", manipulacao: "E", compostura: "E", inteligencia: "E", perspicacia: "E", resolucao: "E" },
    abilities: [
      { name: "Ladra e Prestidigitadora Profissional", grade: "A", description: "Séculos de prática em roubos e truques de mão." },
      { name: "Pregadora de Peças Profissional", grade: "A", description: "Especialista em confundir e enganar sem causar dano real." },
      { name: "Furtividade e Ocultamento", grade: "B", description: "Mesmo selada, uma das melhores em passar despercebida." },
      { name: "Combatente com Facas Gêmeas", grade: "B", description: "Luta priorizando tecnica e discrição sobre força bruta." },
    ],
    hp: { current: 3, max: 3 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "Criada como anja por Eikido, fugiu para Beyond quando sua criadora foi derrotada por Omem. Vivendo entre demônios, foi se transformando em uma demônio de pequenas inconveniências, cobrando pedágios e pregando peças, nunca causando mal de verdade. Capturada pelos Cavaleiros de Omem, hoje atua como oficial de Tengou sob supervisão de Amaranth.",
  },
  {
    id: "vientra", name: "Vientra", epithet: "A Encantadora",
    race: "Elfa Corvus", faction: "Hetalion",
    affiliation: "Associação de Magia de Hetalion · Grupo principal", height: "1,70m",
    deity: "União", weapon: "Encantamentos aplicados ao próprio corpo",
    singularity: { name: "Compilação Emocional", level: "S — Superior", description: "Acessa, estuda e altera emoções, personalidade e memórias de outros seres através da mana." },
    attributes: {},
    atributosGerais: { forca: "C", destreza: "A", vigor: "E", carisma: "E", manipulacao: "E", compostura: "E", inteligencia: "E", perspicacia: "E", resolucao: "E" },
    abilities: [
      { name: "Encantadora e Pesquisadora", grade: "S", description: "Domina magias de manipulação emocional/mental reconhecidas até por divindades." },
      { name: "Auto-Encantamento Marcial", grade: "A", description: "Torna-se temporariamente uma artista marcial experiente." },
      { name: "Observadora Analítica", grade: "B", description: "Compreensão quase científica de comportamento e emoção." },
      { name: "Manipulação de Telas de Mana", grade: "B", description: "Interage com interfaces mágicas para cálculo e análise em tempo real." },
    ],
    hp: { current: 3, max: 3 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "Abandonada ainda criança em uma floresta de Katalão, começou a 'digitalizar' personalidades e emoções através da mana, especializando-se em encantamentos. Convocada para a Academia de Omem, apaixonou-se por Minerva como seu objeto de estudo perfeito: uma alma artificial ainda em formação.",
  },
];

// Aplica os campos da Ficha Base nova (Acerto/Defesa/Ataques/Itens/traços/XP)
// como padrão a cada dossiê semente já existente, sem sobrescrever o que já
// estava preenchido (singularidade, história, atributos, habilidades antigas).
function defaultAttacksForCharacter() {
  const pick = (id) => BASE_ATTACK_TYPES.find((t) => t.id === id);
  return [pick("soco"), pick("arma_branca"), pick("revolver"), pick("shin")].filter(Boolean).map((t) => ({
    nome: t.nome, tipo: t.tipo, acerto: t.acerto,
    dano: t.dano, ferida: t.ferida, efeito: t.modificadores ? t.modificadores.join(", ") : "", profKey: t.profKey,
  }));
}

function withFichaDefaults(c) {
  return {
    traits: "",
    xp: 0,
    imageUrl: "",
    statBase: { ...STAT_BASE_DEFAULTS },
    statTemp: { acerto: 0, defesa: 0, resistArmadura: 0, resistNaturalFisica: 0, resistNaturalMagica: 0, geral: 0 },
    statLinks: JSON.parse(JSON.stringify(DEFAULT_STAT_LINKS)),
    attacks: defaultAttacksForCharacter(),
    itens: { usaveis: [], principais: [], armadura: ["Armadura física"] },
    habilidadesFicha: { ativas: [], especial: [], racial: [], passivas: [], extras: [] },
    procs: [],
    atributosGerais: { ...ATRIBUTOS_GERAIS_DEFAULT },
    proficiencias: { ...PROFICIENCIAS_DEFAULT },
    ...c,
  };
}

const SEED_CHARACTERS = SEED_CHARACTERS_RAW.map(withFichaDefaults);

const SEED_KINGDOMS = [
  { id: "hetalion", name: "Hetalion", description: "República federal dividida em quatro federações coloridas (Vermelha, Azul, Branca e Preta), cada uma com sua própria doutrina militar e política interna. [Rascunho — refine comigo quando quiser.]", cities: [{ name: "Novolar", description: "Comunidade de imigrantes ningen; palco da revolta liderada por Puman." }] },
  { id: "katalao", name: "Katalão", description: "Reino cuja nobreza foi recentemente fraturada pela revelação de Crikon como herdeiro ilegítimo do trono. [Rascunho — refine comigo quando quiser.]", cities: [] },
  { id: "maxis", name: "Maxis Power", description: "Potência industrial e militar, lar de famílias como Mason e Ayamato. [Rascunho — refine comigo quando quiser.]", cities: [] },
  { id: "suth", name: "Suth", description: "Império matriarcal sustentado por três Pilares: a Imperatriz, a Santa e a Parteira. [Rascunho — refine comigo quando quiser.]", cities: [] },
  { id: "goethia", name: "Goethia", description: "Nação unida pela conexão emocional coletiva com sua Santa, Erin Genova, sob o governo do Tzar. [Rascunho — refine comigo quando quiser.]", cities: [] },
  { id: "amaranth", name: "Amaranth/Omem", description: "Sede da Academia de Omem e dos Cavaleiros de Omem, centro do grupo principal da campanha. [Rascunho — refine comigo quando quiser.]", cities: [] },
];

const SEED_GODS = [
  { id: "kronos", name: "Kronos", domain: "Tempo", description: "Divindade ligada à manipulação e ao domínio do tempo; seu templo em Katalão forma sacerdotisas-guerreiras como Boda. [Rascunho — refine comigo.]" },
  { id: "umbra", name: "Umbra", domain: "Proteção / Sombra", description: "Divindade das sombras e da proteção contra ameaças dimensionais; seus paladinos, como Mercúrio, defendem os reinos de incursões de outros planos. [Rascunho — refine comigo.]" },
  { id: "gigas", name: "Gigas", domain: "Força / Criação", description: "Divindade associada à força bruta e à criação material — ligada tanto a Almah quanto, em parte, à formação de Erin. [Rascunho — refine comigo.]" },
  { id: "uniao", name: "União", domain: "Vínculo / Comunhão", description: "Divindade dos laços emocionais e sociais entre os povos; abençoou pesquisas incomuns, como as de Vientra, por reconhecer boas intenções. [Rascunho — refine comigo.]" },
  { id: "dulahand", name: "Dulahand", domain: "Morte / Imortalidade", description: "Divindade ligada ao limiar entre vida e morte; padroeira de Rena e de sua regeneração extrema pelo sangue. [Rascunho — refine comigo.]" },
  { id: "thalia", name: "Thalia (Freya)", domain: "Beleza / Vínculo", description: "Divindade dupla de beleza e afeto, cultuada junto de Gigas por Kiryu. [Rascunho — refine comigo.]" },
  { id: "hetalion-deus", name: "Hetalion", domain: "Nação / República", description: "A própria divindade-nação, padroeira do povo e das quatro federações de Hetalion. [Rascunho — refine comigo.]" },
];

// Ordem de destaque do Grupo C na vitrine da capa: líder e sub-líder primeiro.
const GRUPO_C_ROLE = {
  almah: "Líder do Grupo C",
  kiryu: "Sub-líder do Grupo C",
};
const GRUPO_C_ORDER = ["almah", "kiryu", "fate", "boda", "leona", "ookami", "kutrefas", "vientra", "sombra", "rena", "erin", "minerva", "mercurio"];

const SEED_SAGAS = [
  {
    id: "saga_casamento",
    title: "O Casamento em Suth",
    status: "Concluída",
    summary: "O grupo viaja a Suth para um casamento real, mas a cerimônia é interrompida por um ataque conjunto de sete príncipes demoníacos (os Biocários) agindo ao lado da figura misteriosa Nafiras. No caos, o grupo enfrenta Leviathan em um domínio abissal. É revelado que cinco heróis do passado foram enviados para planos dimensionais chamados Horizontes, parte de um pacto firmado há quinze anos. O arco se encerra com desdobramentos políticos envolvendo a Deusa Imperatriz Karphel e a rival Hetalion Seguintes.",
  },
];

const SEED_OBJECTIVES = [
  {
    id: "obj_kante",
    title: "Chegar a Kante, em Maxis",
    status: "Ativo",
    description: "Kiryu e Almah viajam a Kante para visitar os pais de Kiryu e conhecer Jubei, sua tia biológica.",
  },
  {
    id: "obj_trem",
    title: "Buscar Erin e Fate em Belteguse",
    status: "Concluído",
    description: "O grupo atravessou Beltezu de trem até Belteguse para reunir Erin e Fate A Indomável antes de seguir viagem.",
  },
];

const emptyCharacter = () => ({
  id: `char_${Date.now()}`, name: "", epithet: "", race: "", faction: FACTIONS[0],
  affiliation: "", height: "", deity: "", weapon: "", traits: "", xp: 0, imageUrl: "",
  singularity: { name: "", level: "E", description: "" },
  attributes: {},
  statBase: { ...STAT_BASE_DEFAULTS },
  statTemp: { acerto: 0, defesa: 0, resistArmadura: 0, resistNaturalFisica: 0, resistNaturalMagica: 0, geral: 0 },
  statLinks: JSON.parse(JSON.stringify(DEFAULT_STAT_LINKS)),
  attacks: defaultAttacksForCharacter(),
  itens: { usaveis: [], principais: [], armadura: ["Armadura física"] },
  abilities: [],
  habilidadesFicha: { ativas: [], especial: [], racial: [], passivas: [], extras: [] },
  procs: [],
  atributosGerais: { ...ATRIBUTOS_GERAIS_DEFAULT },
  proficiencias: { ...PROFICIENCIAS_DEFAULT },
  hp: { current: 3, max: 3 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
  history: "",
});

/* ---------------------------------------------------------------
   PEQUENOS COMPONENTES DE APOIO
----------------------------------------------------------------*/
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "#00000090", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20,
    }}>
      <div style={{
        background: PANEL_2, border: `1px solid ${EMBER}`, borderRadius: 8, padding: 22,
        maxWidth: 340, boxShadow: `0 0 30px #00000080`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Trash2 size={16} color={EMBER} />
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 13, letterSpacing: 1, color: EMBER, textTransform: "uppercase" }}>Confirmar exclusão</span>
        </div>
        <p style={{ fontSize: 13, color: PARCHMENT, lineHeight: 1.5, margin: "0 0 18px" }}>{message}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
          <Btn onClick={onConfirm} style={{ background: EMBER, color: PARCHMENT, border: "none", fontWeight: 700 }}>
            <Trash2 size={13} /> Excluir
          </Btn>
        </div>
      </div>
    </div>
  );
}

// Selo pequeno com ícone + cor indicando se a habilidade afeta Ataque, Confirmação
// de Dano, Defesa ou Resistência — usado sempre perto da prioridade da habilidade.
function HabilidadeCategoriaBadge({ p }) {
  const cat = HABILIDADE_CATEGORIA_INFO[categoriaDaHabilidade(p)];
  const Icon = cat.icon;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: cat.color, fontWeight: 700 }}>
      <Icon size={11} color={cat.color} /> {cat.label}
    </span>
  );
}

function Seal({ grade, size = 34 }) {
  const color = GRADE_COLOR[grade] || tierColor(grade) || BRASS;
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        border: `2px solid ${color}`, color, background: "#FFFFFF",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: size * 0.4,
        boxShadow: `0 1px 4px #00000022`,
        flexShrink: 0,
      }}
    >
      {grade}
    </div>
  );
}

function AttrBar({ label, grade, highlight }) {
  const value = GRADE_VALUE[grade] || 1;
  const color = GRADE_COLOR[grade] || BRASS;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
      <span style={{ width: 100, fontSize: 12.5, color: PARCHMENT, letterSpacing: 0.3, fontFamily: "'Spectral', serif" }}>{label}</span>
      <div style={{ flex: 1, height: 8, background: "#00000015", borderRadius: 4, border: `1px solid ${LINE}`, overflow: "hidden" }}>
        <div style={{ width: `${value * 20}%`, height: "100%", background: `linear-gradient(90deg, ${color}99, ${color})`, transition: "width 0.4s ease" }} />
      </div>
      <span style={{ width: 20, textAlign: "center", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: highlight ? BRASS_BRIGHT : color, fontWeight: highlight ? 700 : 500 }}>{grade}</span>
    </div>
  );
}

function ResourceBar({ label, resource, color, icon: Icon }) {
  const pct = resource.max > 0 ? Math.min(100, (resource.current / resource.max) * 100) : 0;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: MUTED, marginBottom: 3, fontFamily: "'IBM Plex Mono', monospace" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Icon size={12} /> {label}</span>
        <span>{resource.current}/{resource.max}</span>
      </div>
      <div style={{ height: 10, background: "#00000015", borderRadius: 3, border: `1px solid ${LINE}`, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 0.3s ease" }} />
      </div>
    </div>
  );
}

// MP e SP sao mostrados como bolinhas (nao barra): preenchidas na cor do recurso
// (MP sempre azul, SP sempre verde) ate o "atual", e cinzas dali ate o "maximo"
// (representando o que ja foi gasto).
function ResourceDots({ label, resource, color, icon: Icon }) {
  const max = Math.max(0, resource.max || 0);
  const current = Math.max(0, Math.min(resource.current ?? 0, max));
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: MUTED, marginBottom: 4, fontFamily: "'IBM Plex Mono', monospace" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Icon size={12} color={color} /> {label}</span>
        <span>{current}/{max}</span>
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {Array.from({ length: max }, (_, i) => (
          <div key={i} style={{
            width: 14, height: 14, borderRadius: "50%",
            background: i < current ? color : "#00000020",
            border: `1px solid ${i < current ? color : LINE}`,
          }} />
        ))}
        {max === 0 && <span style={{ fontSize: 10, color: MUTED, fontStyle: "italic" }}>sem pontos</span>}
      </div>
    </div>
  );
}

function SectionTitle({ children, icon: Icon }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, margin: "18px 0 10px",
      padding: "6px 12px", borderRadius: 4,
      background: `linear-gradient(100deg, ${PURPLE} 0%, ${PURPLE_LIGHT} 100%)`,
    }}>
      {Icon && <Icon size={14} color="#F0D98C" />}
      <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 12.5, letterSpacing: 1.5, textTransform: "uppercase", color: PURPLE_TEXT, margin: 0 }}>{children}</h3>
    </div>
  );
}

function Btn({ children, onClick, variant = "default", style, ...props }) {
  const base = {
    fontFamily: "'Cinzel', serif", fontSize: 12.5, letterSpacing: 0.6, padding: "8px 16px",
    borderRadius: 4, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
    border: `1px solid ${LINE}`, transition: "all 0.15s ease",
  };
  const variants = {
    default: { background: PANEL_2, color: PARCHMENT },
    primary: { background: `linear-gradient(180deg, ${BRASS_BRIGHT}, ${BRASS})`, color: INK, border: "none", fontWeight: 700 },
    danger: { background: "transparent", color: EMBER, border: `1px solid ${EMBER}66` },
    ghost: { background: "transparent", color: MUTED, border: "1px solid transparent" },
  };
  return (
    <button onClick={onClick} style={{ ...base, ...variants[variant], ...style }} {...props}>
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <span style={{ display: "block", fontSize: 11, color: MUTED, marginBottom: 4, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.5 }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle = {
  width: "100%", background: "#FFFFFF", border: `1px solid ${LINE}`, borderRadius: 4,
  color: PARCHMENT, padding: "8px 10px", fontSize: 13.5, fontFamily: "'Spectral', serif",
  outline: "none",
};

/* ---------------------------------------------------------------
   FICHA — visualização completa + rolador de dados
----------------------------------------------------------------*/
function StatBlock({ character }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
      {STAT_LIST.map((s) => (
        <div key={s.key} style={{ background: "#00000030", border: `1px solid ${LINE}`, borderRadius: 6, padding: "8px 10px", textAlign: "center" }}>
          <div style={{ fontSize: 9.5, color: MUTED, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.5, textTransform: "uppercase" }}>{s.label}</div>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, color: BRASS_BRIGHT, fontWeight: 700 }}>{computeStat(character, s.key)}</div>
        </div>
      ))}
    </div>
  );
}

function AbilityCategoryList({ title, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: BRASS, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.5, marginBottom: 6, textTransform: "uppercase" }}>{title}</div>
      {items.map((ab, i) => (
        <div key={i} style={{ marginBottom: 8, paddingLeft: 10, borderLeft: `2px solid ${LINE}` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: PARCHMENT }}>
            {ab.name} {ab.custo && <span style={{ color: MUTED, fontWeight: 400, fontSize: 11 }}>({ab.custo})</span>}
          </div>
          {ab.description && <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.4 }}>{ab.description}</div>}
          {ab.tecnica && <div style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.4, fontStyle: "italic" }}>{ab.tecnica}</div>}
        </div>
      ))}
    </div>
  );
}

// Card retangular de um ataque — usado na ficha (só exibição) e no Confronto (clicável,
// dispara a rolagem quando onClick é passado).
function AttackCard({ atk, onClick, selected, character }) {
  const tipoInfo = TIPOS_ATAQUE[atk.tipo] || TIPOS_ATAQUE.marcial;
  const findAnyAttrLabel = (key) => (ATTR_LIST.find((a) => a.key === key) || ATRIBUTOS_GERAIS_LIST.find((a) => a.key === key))?.label;
  const profInfo = atk.profKey ? PROFICIENCIAS_LIST.find((p) => p.key === atk.profKey) : null;
  const acertoAttrLabel = tipoInfo.acertoAttr ? findAnyAttrLabel(tipoInfo.acertoAttr) : "só valor do ataque";
  const danoAttrLabel = tipoInfo.danoAttr ? findAnyAttrLabel(tipoInfo.danoAttr) : "só valor do ataque";
  const Wrapper = onClick ? "button" : "div";

  const isFixedSuccess = /^\d*[sS]$/.test(String(atk.acerto ?? "").trim());
  const acertoBase = parseFlatBonus(atk.acerto);
  const danoBase = parseFlatBonus(atk.dano);
  const acertoAttrGrade = character && tipoInfo.acertoAttr ? getAttrGrade(character, tipoInfo.acertoAttr) : null;
  const danoAttrGrade = character && tipoInfo.danoAttr ? getAttrGrade(character, tipoInfo.danoAttr) : null;
  const profGrade = character && atk.profKey ? character.proficiencias?.[atk.profKey] : null;
  const acertoAttrBonus = acertoAttrGrade ? attrBonus(acertoAttrGrade) : 0;
  const danoAttrBonus = danoAttrGrade ? attrBonus(danoAttrGrade) : 0;
  const profBonus = profGrade ? attrBonus(profGrade) : 0;
  const acertoTotal = acertoBase + acertoAttrBonus + (atk.profKey ? profBonus : 0);
  const danoTotal = danoBase + danoAttrBonus + (atk.profKey ? profBonus : 0);
  const hasTotals = !!character;

  function MiniStat({ label, value, sub }) {
    return (
      <div style={{ textAlign: "center", minWidth: 44 }}>
        <div style={{ fontSize: 8, color: MUTED, fontFamily: "'IBM Plex Mono', monospace" }}>{label}</div>
        <div style={{ fontSize: 14, color: BRASS_BRIGHT, fontFamily: "'Cinzel', serif" }}>{value}</div>
        {sub && <div style={{ fontSize: 7.5, color: MUTED }}>{sub}</div>}
      </div>
    );
  }

  return (
    <Wrapper
      onClick={onClick}
      style={{
        display: "block", width: "100%", textAlign: "left", cursor: onClick ? "pointer" : "default",
        background: selected ? `${BRASS}22` : PANEL_2, border: `1px solid ${selected ? BRASS_BRIGHT : LINE}`,
        borderRadius: 8, padding: 12, fontFamily: "inherit",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ fontFamily: "'Cinzel', serif", fontSize: 14, color: PARCHMENT }}>{atk.nome || "—"}</span>
        <span style={{ fontSize: 9.5, color: BRASS, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase" }}>{tipoInfo.label}</span>
      </div>

      <div style={{ display: "flex", alignItems: "stretch", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 8, color: MUTED, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 3, letterSpacing: 0.5 }}>BASE</div>
          <div style={{ display: "flex", gap: 10 }}>
            <MiniStat label="ACERTO" value={isFixedSuccess ? atk.acerto : (atk.acerto || "0")} sub={isFixedSuccess ? "sucessos fixos" : null} />
            <MiniStat label="DANO" value={atk.dano || "0"} />
            <MiniStat label="FERIDA" value={atk.ferida || "1"} />
          </div>
        </div>

        {hasTotals && !isFixedSuccess && (
          <>
            <div style={{ width: 1, background: LINE, alignSelf: "stretch" }} />
            <div>
              <div style={{ fontSize: 8, color: PURPLE, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 3, letterSpacing: 0.5, fontWeight: 700 }}>TOTAL (com atributo + proficiência)</div>
              <div style={{ display: "flex", gap: 10 }}>
                <MiniStat
                  label="ACERTO"
                  value={<span style={{ color: PURPLE, fontWeight: 700 }}>{acertoTotal >= 0 ? "+" : ""}{acertoTotal}</span>}
                  sub={(acertoAttrGrade || profGrade) ? `${acertoBase >= 0 ? "+" : ""}${acertoBase}${acertoAttrGrade ? ` + ${acertoAttrLabel[0]}${acertoAttrBonus}` : ""}${profInfo && profGrade ? ` + ${profInfo.label[0]}${profBonus}` : ""}` : null}
                />
                <MiniStat
                  label="DANO"
                  value={<span style={{ color: PURPLE, fontWeight: 700 }}>{danoTotal >= 0 ? "+" : ""}{danoTotal}</span>}
                  sub={(danoAttrGrade || profGrade) ? `${danoBase >= 0 ? "+" : ""}${danoBase}${danoAttrGrade ? ` + ${danoAttrLabel[0]}${danoAttrBonus}` : ""}${profInfo && profGrade ? ` + ${profInfo.label[0]}${profBonus}` : ""}` : null}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <div style={{ fontSize: 10.5, color: MUTED, lineHeight: 1.4, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${LINE}` }}>
        Acerto usa {acertoAttrLabel} · Dano usa {danoAttrLabel}{profInfo ? ` · Proficiência: ${profInfo.label}` : ""}
      </div>
      {atk.efeito && <div style={{ fontSize: 10.5, color: MUTED, marginTop: 4, fontStyle: "italic" }}>{atk.efeito}</div>}
    </Wrapper>
  );
}

function CharacterSheet({ character, onBack, onEdit, onRequestDelete, onRestoreAttacks, onPrev, onNext, onUpdateCharacter }) {
  const [rollAttr, setRollAttr] = useState(ATRIBUTOS_GERAIS_LIST[0].key);
  const [rollProf, setRollProf] = useState(PROFICIENCIAS_LIST[0].key);
  const [successThreshold, setSuccessThreshold] = useState(5);
  const [ascensaoDiff, setAscensaoDiff] = useState(0);
  const [history, setHistory] = useState([]);
  const [rolling, setRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState(null);
  const habilidadesFicha = character.habilidadesFicha || { ativas: [], especial: [], racial: [], passivas: [], extras: [] };
  const itens = character.itens || { usaveis: [], principais: [], armadura: [] };
  const attacks = character.attacks || [];
  const attackNames = new Set(attacks.map((a) => (a.nome || "").trim().toLowerCase()));
  const missingDefaultAttacks = defaultAttacksForCharacter().filter((a) => !attackNames.has(a.nome.trim().toLowerCase()));
  const hasHabilidades = ["ativas", "especial", "racial", "passivas", "extras"].some((k) => (habilidadesFicha[k] || []).length);

  const rollAttrGrade = character.atributosGerais?.[rollAttr] || "E";
  const rollProfGrade = character.proficiencias?.[rollProf] || "E";
  const totalDice = (GRADE_VALUE[rollAttrGrade] || 1) + (GRADE_VALUE[rollProfGrade] || 1) + Math.max(0, ascensaoDiff);

  function roll() {
    setRolling(true);
    setTimeout(() => {
      const result = rollSuccessDice(totalDice, successThreshold);
      setLastRoll(result);
      setHistory((h) => [{ ...result, attr: rollAttr, prof: rollProf, id: Date.now() }, ...h].slice(0, 6));
      setRolling(false);
    }, 380);
  }

  function recomputeRoll(dice) {
    const successes = dice.filter((d) => d === 10 || d > successThreshold).length;
    const criticos = dice.filter((d) => d === 10).length;
    const superSucesso = successes >= 3;
    return { dice, successes, criticos, superSucesso };
  }

  // MP: gasta 1 pra re-rolar um dado. SP: gasta 1 pra somar +5 num dado (limitado a 10).
  function gastarMpRerolar(index) {
    if (!lastRoll || !onUpdateCharacter || (character.mp?.current || 0) <= 0) return;
    const novoDado = Math.floor(Math.random() * 10) + 1;
    const novosDados = [...lastRoll.dice];
    novosDados[index] = novoDado;
    setLastRoll(recomputeRoll(novosDados));
    onUpdateCharacter(character.id, { mp: { ...character.mp, current: character.mp.current - 1 } });
  }
  function gastarSpMais5(index) {
    if (!lastRoll || !onUpdateCharacter || (character.sp?.current || 0) <= 0) return;
    const novosDados = [...lastRoll.dice];
    novosDados[index] = Math.min(10, novosDados[index] + 5);
    setLastRoll(recomputeRoll(novosDados));
    onUpdateCharacter(character.id, { sp: { ...character.sp, current: character.sp.current - 1 } });
  }

  const attrLabel = ATRIBUTOS_GERAIS_LIST.find((a) => a.key === rollAttr)?.label;
  const profLabel = PROFICIENCIAS_LIST.find((p) => p.key === rollProf)?.label;
  const panelStyle = { background: "#FFFFFFAA", border: `1px solid ${LINE}`, borderRadius: 8, padding: 14, marginBottom: 14 };
  const panelHeadStyle = { fontFamily: "'Cinzel', serif", fontSize: 11.5, color: PURPLE, letterSpacing: 0.8, textTransform: "uppercase", margin: "0 0 10px", paddingBottom: 6, borderBottom: `1px solid ${LINE}` };

  return (
    <div>
      {/* Barra roxa com navegação entre personagens */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderRadius: 8,
        background: `linear-gradient(100deg, ${PURPLE} 0%, ${PURPLE_LIGHT} 100%)`, marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onBack} title="Voltar" style={{ background: "transparent", border: "none", cursor: "pointer", color: PURPLE_TEXT, display: "flex" }}>
            <ChevronLeft size={18} />
          </button>
          {onPrev && (
            <button onClick={onPrev} title="Personagem anterior" style={{ background: "transparent", border: "none", cursor: "pointer", color: `${PURPLE_TEXT}CC`, display: "flex" }}>
              <ChevronLeft size={16} />
            </button>
          )}
        </div>
        <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 18, color: "#F0D98C", margin: 0, letterSpacing: 1 }}>{character.name}</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {onNext && (
            <button onClick={onNext} title="Próximo personagem" style={{ background: "transparent", border: "none", cursor: "pointer", color: `${PURPLE_TEXT}CC`, display: "flex" }}>
              <ChevronRight size={16} />
            </button>
          )}
          <button onClick={() => onEdit(character)} title="Editar" style={{ background: "transparent", border: "none", cursor: "pointer", color: PURPLE_TEXT, display: "flex" }}>
            <Pencil size={16} />
          </button>
          <button onClick={() => onRequestDelete(character)} title="Excluir" style={{ background: "transparent", border: "none", cursor: "pointer", color: "#E8A090", display: "flex" }}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,0.85fr) minmax(0,1fr) minmax(0,1fr)", gap: 16 }}>
        {/* Coluna 1: retrato + informações pessoais + recursos + atributos */}
        <div>
          <div style={panelStyle}>
            <div style={{
              width: "100%", aspectRatio: "1", borderRadius: 8, background: PANEL_2, border: `1px solid ${LINE}`,
              display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 10,
            }}>
              {character.imageUrl ? (
                <img src={character.imageUrl} alt={character.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; }} />
              ) : (
                <ShieldHalf size={40} color={FACTION_SEAL[character.faction] || BRASS} />
              )}
            </div>
            <p style={{ color: BRASS, fontSize: 12.5, margin: "0 0 6px", fontStyle: "italic", textAlign: "center" }}>{character.epithet}</p>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <span style={{
                fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "2px 8px", borderRadius: 20,
                border: `1px solid ${FACTION_SEAL[character.faction] || BRASS}`, color: FACTION_SEAL[character.faction] || BRASS,
              }}>{character.faction}</span>
            </div>
          </div>

          <div style={panelStyle}>
            <div style={panelHeadStyle}>Informações Pessoais</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 5, fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: MUTED }}>Raça</span><span style={{ color: PARCHMENT }}>{character.race || "—"}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: MUTED }}>Altura</span><span style={{ color: PARCHMENT }}>{character.height || "—"}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: MUTED }}>Deidade</span><span style={{ color: PARCHMENT }}>{character.deity || "—"}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: MUTED }}>Afiliação</span><span style={{ color: PARCHMENT, textAlign: "right" }}>{character.affiliation || "—"}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: MUTED }}>Arma principal</span><span style={{ color: PARCHMENT, textAlign: "right" }}>{character.weapon || "—"}</span></div>
              {character.xp > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: MUTED }}>XP</span><span style={{ color: PARCHMENT }}>{character.xp}</span></div>}
              {character.traits && <div style={{ marginTop: 4, paddingTop: 6, borderTop: `1px solid ${LINE}` }}><span style={{ color: MUTED }}>Traços marcantes: </span><span style={{ color: PARCHMENT }}>{character.traits}</span></div>}
            </div>
          </div>

          <div style={panelStyle}>
            <div style={panelHeadStyle}>Recursos</div>
            <ResourceBar label="HP" resource={{ current: Math.min(character.hp?.current ?? computeMaxHP(character), computeMaxHP(character)), max: computeMaxHP(character) }} color={EMBER} icon={Droplet} />
            <ResourceDots label="MP (Mana Points)" resource={character.mp} color={MP_COLOR} icon={Sparkles} />
            <ResourceDots label="SP (Soul Points)" resource={{ current: Math.min(character.sp?.current ?? computeMaxSP(character), computeMaxSP(character)), max: computeMaxSP(character) }} color={SP_COLOR} icon={Flame} />
            <div style={{ fontSize: 10, color: MUTED, marginTop: 6, fontStyle: "italic" }}>HP máximo = 2 + bônus de Vigor (E=2, D=3, C=4, B=5, A=6){(character.procs || []).includes("persistente") ? " + 1 (Persistente)" : ""}. SP máximo{(character.procs || []).includes("persistente") ? " inclui +1 (Persistente)" : ""}.</div>
            {onUpdateCharacter && (
              <Btn
                onClick={() => onUpdateCharacter(character.id, {
                  mp: { ...character.mp, current: character.mp?.max ?? 0 },
                  sp: { ...character.sp, current: computeMaxSP(character) },
                })}
                style={{ width: "100%", justifyContent: "center", marginTop: 10 }}
              >
                <Sparkles size={13} color={MP_COLOR} /> Restaurar MP e SP
              </Btn>
            )}
          </div>
        </div>

        {/* Coluna 2: ataques (equipamento) + itens + estatísticas de combate */}
        <div>
          <div style={panelStyle}>
            <div style={panelHeadStyle}>Ataques</div>
            {attacks.length === 0 && missingDefaultAttacks.length === 0 && (
              <p style={{ color: MUTED, fontSize: 12.5 }}>Nenhum ataque cadastrado.</p>
            )}
            {attacks.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {attacks.map((atk, i) => <AttackCard key={i} atk={atk} character={character} />)}
              </div>
            )}
            {missingDefaultAttacks.length > 0 && onRestoreAttacks && (
              <div style={{ marginTop: 8 }}>
                <Btn onClick={() => onRestoreAttacks(character)}>
                  <Plus size={13} /> Adicionar ataque{missingDefaultAttacks.length > 1 ? "s" : ""} padrão faltando ({missingDefaultAttacks.map((a) => a.nome).join(", ")})
                </Btn>
              </div>
            )}
            <div style={{ fontSize: 10, color: MUTED, marginTop: 10, fontStyle: "italic" }}>
              Acerto usa o atributo do Tipo (Destreza p/ Marcial e Arma de fogo, só o valor da magia p/ Mágico) + a Proficiência de Combate do ataque (Briga/Combate Corpo a Corpo/Armas de Fogo/Magias Ofensivas). Dano usa Força (Marcial), Magia (Mágico) ou só o valor da arma (Arma de fogo) + a mesma Proficiência. Ferida escala com confirmações no Marcial; é fixa nos outros. Use o Confronto pra resolver contra um alvo.
            </div>
          </div>

          <div style={panelStyle}>
            <div style={panelHeadStyle}>Itens</div>
            {(itens.usaveis.length + itens.principais.length + itens.armadura.length) === 0 ? (
              <p style={{ color: MUTED, fontSize: 12.5 }}>Nenhum item cadastrado.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5 }}>
                {itens.principais.map((it, i) => (
                  <div key={`p${i}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: `1px solid ${LINE}` }}>
                    <Swords size={13} color={BRASS} /><span style={{ color: PARCHMENT }}>{it}</span>
                  </div>
                ))}
                {itens.usaveis.map((it, i) => (
                  <div key={`u${i}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: `1px solid ${LINE}` }}>
                    <Sparkles size={13} color="#5C86B0" /><span style={{ color: PARCHMENT }}>{it}</span>
                  </div>
                ))}
                {itens.armadura.map((it, i) => (
                  <div key={`a${i}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                    <ShieldHalf size={13} color={MUTED} /><span style={{ color: PARCHMENT }}>{it}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={panelStyle}>
            <div style={panelHeadStyle}>Estatísticas de Combate</div>
            <StatBlock character={character} />
            <div style={{ fontSize: 10, color: MUTED, marginTop: 8, fontStyle: "italic" }}>
              Valor = base da ficha + bônus dos atributos vinculados + bônus da Proficiência de Combate correspondente (Defesa/Resistência Física/Resistência Mágica) + ajustes temporários. Ajuste na edição da ficha.
            </div>
          </div>
        </div>

        {/* Coluna 3: singularidade + habilidades + história */}
        <div>
          <div style={panelStyle}>
            <div style={panelHeadStyle}>Singularidade</div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <Seal grade={character.singularity.level?.split(" ")[0]?.replace(/[^A-Za-z]/g, "") || "E"} size={30} />
              <div>
                <div style={{ fontWeight: 700, color: PARCHMENT, fontSize: 13.5 }}>{character.singularity.name}</div>
                <div style={{ fontSize: 10.5, color: tierColor(character.singularity.level), marginBottom: 4, fontFamily: "'IBM Plex Mono', monospace" }}>{character.singularity.level}</div>
                <p style={{ fontSize: 12, color: MUTED, margin: 0, lineHeight: 1.5 }}>{character.singularity.description}</p>
              </div>
            </div>
          </div>

          <div style={panelStyle}>
            <div style={panelHeadStyle}>Habilidades Passivas de Combate</div>
            <p style={{ fontSize: 10.5, color: MUTED, marginTop: -4, marginBottom: 8 }}>
              Cada ficha tem até 2 dessas + a Singularidade (acima) como a 3ª habilidade ativa do personagem.
            </p>
            {(character.procs || []).length === 0 && (
              <p style={{ color: MUTED, fontSize: 12.5 }}>Nenhuma habilidade passiva escolhida ainda. Edite a ficha pra escolher até 2.</p>
            )}
            {(character.procs || []).map((procId) => {
              const p = PROC_ABILITIES.find((x) => x.id === procId);
              if (!p) return null;
              const limiar = limiarDaHabilidade(character, p);
              const attrLabel = attrLabelDaHabilidade(p);
              return (
                <div key={p.id} style={{ marginBottom: 10, paddingLeft: 10, borderLeft: `2px solid ${PURPLE}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: PARCHMENT }}>{p.nome}</div>
                    <span style={{ fontSize: 9.5, fontFamily: "'IBM Plex Mono', monospace" }}>
                      <HabilidadeCategoriaBadge p={p} />
                      {p.prioridade ? <span style={{ color: MUTED }}> · prioridade {p.prioridade}</span> : null}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: PURPLE, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 3 }}>
                    {p.reduzCriticoEm
                      ? `Reduz o crítico em ${p.reduzCriticoEm} (em todos os críticos da rolagem)`
                      : p.gatilho?.startsWith("passivo_")
                      ? "Sempre ativa (não depende de dado)"
                      : p.gatilho === "contato_proprio"
                      ? `Dispara sempre ao fazer contato${p.restricaoTipo ? ` com ataque ${TIPOS_ATAQUE[p.restricaoTipo]?.label}` : ""}`
                      : `Dispara com dado ≥${limiar} (${attrLabel})${p.restricaoTipo ? ` · só ${TIPOS_ATAQUE[p.restricaoTipo]?.label}` : ""}`}
                  </div>
                  <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.4 }}>{p.efeito}</div>
                </div>
              );
            })}
          </div>

          {hasHabilidades && (
            <details style={{ ...panelStyle, cursor: "pointer" }}>
              <summary style={{ ...panelHeadStyle, marginBottom: 0, borderBottom: "none", cursor: "pointer" }}>Habilidades antigas (arquivadas)</summary>
              <div style={{ marginTop: 10 }}>
                <p style={{ fontSize: 10.5, color: MUTED, marginTop: -4, marginBottom: 8, fontStyle: "italic" }}>
                  Sistema anterior, desativado — mantido só como referência/histórico desta ficha.
                </p>
                <AbilityCategoryList title="Ativas" items={habilidadesFicha.ativas} />
                <AbilityCategoryList title="Especial" items={habilidadesFicha.especial} />
                <AbilityCategoryList title="Racial" items={habilidadesFicha.racial} />
                <AbilityCategoryList title="Passivas" items={habilidadesFicha.passivas} />
                <AbilityCategoryList title="Extras" items={habilidadesFicha.extras} />
                {character.abilities && character.abilities.length > 0 && (
                  <>
                    <div style={{ fontSize: 10.5, color: BRASS, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.5, margin: "10px 0 6px", textTransform: "uppercase" }}>Resumo de Poder (legado)</div>
                    {character.abilities.map((ab, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
                        <Seal grade={ab.grade} size={22} />
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: PARCHMENT }}>{ab.name}</div>
                          <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.4 }}>{ab.description}</div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </details>
          )}

          <div style={panelStyle}>
            <div style={panelHeadStyle}>História e Criação</div>
            <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0 }}>{character.history || "—"}</p>
          </div>

          <div style={panelStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Dices size={14} color={PURPLE} />
              <h3 style={panelHeadStyle}>Teste — Atributo + Perícia</h3>
            </div>

            <Field label="Atributo Geral">
              <select value={rollAttr} onChange={(e) => setRollAttr(e.target.value)} style={inputStyle}>
                {ATRIBUTOS_GERAIS_LIST.map((a) => <option key={a.key} value={a.key}>{a.label} ({character.atributosGerais?.[a.key] || "E"})</option>)}
              </select>
            </Field>
            <Field label="Perícia (Proficiência)">
              <select value={rollProf} onChange={(e) => setRollProf(e.target.value)} style={inputStyle}>
                {PROFICIENCIAS_LIST.map((p) => <option key={p.key} value={p.key}>{p.label} ({character.proficiencias?.[p.key] || "E"})</option>)}
              </select>
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Limiar de sucesso (dado >)">
                <input type="number" min={0} max={9} style={inputStyle} value={successThreshold} onChange={(e) => setSuccessThreshold(Math.max(0, Math.min(9, Number(e.target.value))))} />
              </Field>
              <Field label="Dados extra (Ascensão)">
                <input type="number" min={0} style={inputStyle} value={ascensaoDiff} onChange={(e) => setAscensaoDiff(Math.max(0, Number(e.target.value)))} />
              </Field>
            </div>
            <div style={{ fontSize: 10, color: MUTED, margin: "-2px 0 10px", fontStyle: "italic" }}>
              Dados = grau do Atributo ({GRADE_VALUE[rollAttrGrade]}) + grau da Perícia ({GRADE_VALUE[rollProfGrade]}) + dados extra ({ascensaoDiff}) = {totalDice}d10. Sucesso se dado &gt; {successThreshold} (um 10 natural sempre conta).
            </div>

            <Btn variant="primary" onClick={roll} style={{ width: "100%", justifyContent: "center", padding: "10px 16px", fontSize: 13.5 }}>
              <Dices size={15} className={rolling ? "spin" : ""} /> Rolar {totalDice}d10
            </Btn>

            {lastRoll && (
              <div style={{ marginTop: 14, textAlign: "center" }}>
                <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                  {lastRoll.dice.map((d, i) => (
                    <div key={i} style={{ textAlign: "center" }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 6, border: `1px solid ${(d === 10 || d > successThreshold) ? BRASS_BRIGHT : LINE}`,
                        background: d === 10 ? `${EMBER}22` : "#00000010",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: (d === 10 || d > successThreshold) ? BRASS_BRIGHT : MUTED, fontSize: 13,
                      }}>{d}</div>
                      <div style={{ display: "flex", gap: 3, justifyContent: "center", marginTop: 3 }}>
                        <button
                          onClick={() => gastarMpRerolar(i)} disabled={(character.mp?.current || 0) <= 0}
                          title="Gastar 1 MP pra re-rolar este dado"
                          style={{
                            width: 18, height: 18, borderRadius: "50%", border: `1px solid ${MP_COLOR}`, background: "transparent",
                            color: MP_COLOR, fontSize: 9, cursor: (character.mp?.current || 0) > 0 ? "pointer" : "not-allowed",
                            opacity: (character.mp?.current || 0) > 0 ? 1 : 0.35, display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                          }}
                        >↻</button>
                        <button
                          onClick={() => gastarSpMais5(i)} disabled={(character.sp?.current || 0) <= 0}
                          title="Gastar 1 SP pra somar +5 neste dado"
                          style={{
                            width: 18, height: 18, borderRadius: "50%", border: `1px solid ${SP_COLOR}`, background: "transparent",
                            color: SP_COLOR, fontSize: 8, fontWeight: 700, cursor: (character.sp?.current || 0) > 0 ? "pointer" : "not-allowed",
                            opacity: (character.sp?.current || 0) > 0 ? 1 : 0.35, display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                          }}
                        >+5</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: MUTED, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {lastRoll.successes} sucesso{lastRoll.successes === 1 ? "" : "s"} · {attrLabel} + {profLabel}
                  {lastRoll.criticos > 0 && ` · ${lastRoll.criticos} crítico${lastRoll.criticos > 1 ? "s" : ""}`}
                  {lastRoll.superSucesso && " · SUPER SUCESSO"}
                </div>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: 28, color: BRASS_BRIGHT, fontWeight: 700 }}>{lastRoll.successes}</div>
                <div style={{ fontSize: 9.5, color: MUTED, fontStyle: "italic", marginTop: 2 }}>
                  <span style={{ color: MP_COLOR }}>↻</span> re-rola (1 MP) · <span style={{ color: SP_COLOR }}>+5</span> soma no dado (1 SP)
                </div>
              </div>
            )}

            {history.length > 0 && (
              <div style={{ marginTop: 16, borderTop: `1px solid ${LINE}`, paddingTop: 10 }}>
                <div style={{ fontSize: 10, color: MUTED, marginBottom: 6, fontFamily: "'IBM Plex Mono', monospace" }}>HISTÓRICO</div>
                {history.map((h) => (
                  <div key={h.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: MUTED, padding: "3px 0", fontFamily: "'IBM Plex Mono', monospace" }}>
                    <span>[{h.dice.join(",")}]</span>
                    <span style={{ color: BRASS }}>{h.successes} suc.{h.superSucesso ? " ★" : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={panelStyle}>
        <div style={panelHeadStyle}>Atributos Gerais e Proficiências (estilo Vampiro: A Máscara)</div>
        <p style={{ fontSize: 10.5, color: MUTED, marginTop: -4, marginBottom: 12 }}>
          Força e Destreza migraram pra cá (saíram dos Atributos de Combate). Vigor determina o HP máximo (2 + bônus de Vigor). Os demais — Carisma, Manipulação, Compostura, Inteligência, Perspicácia, Resolução — não têm função de combate: servem pra testes interpretativos fora de combate. As Proficiências de Combate já entram nos cálculos de Acerto/Dano/Defesa/Resistência; as outras 24 são só de referência.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, color: CATEGORIA_GERAL_INFO.fisica.color, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>Físicos</div>
            {ATRIBUTOS_GERAIS_LIST.filter((a) => a.categoria === "fisica").map((a) => (
              <AttrBar key={a.key} label={a.label} grade={character.atributosGerais?.[a.key] || "E"} highlight={a.key === rollAttr} />
            ))}
          </div>
          <div>
            <div style={{ fontSize: 10, color: CATEGORIA_GERAL_INFO.social.color, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>Sociais</div>
            {ATRIBUTOS_GERAIS_LIST.filter((a) => a.categoria === "social").map((a) => (
              <AttrBar key={a.key} label={a.label} grade={character.atributosGerais?.[a.key] || "E"} highlight={a.key === rollAttr} />
            ))}
          </div>
          <div>
            <div style={{ fontSize: 10, color: CATEGORIA_GERAL_INFO.mental.color, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>Mentais</div>
            {ATRIBUTOS_GERAIS_LIST.filter((a) => a.categoria === "mental").map((a) => (
              <AttrBar key={a.key} label={a.label} grade={character.atributosGerais?.[a.key] || "E"} highlight={a.key === rollAttr} />
            ))}
          </div>
        </div>

        <div style={{ fontSize: 11, color: BRASS, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, margin: "14px 0 8px", textTransform: "uppercase" }}>Proficiências</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
          {["combate", "fisica", "social", "mental"].map((cat) => (
            <div key={cat}>
              <div style={{ fontSize: 10, color: CATEGORIA_GERAL_INFO[cat].color, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>{CATEGORIA_GERAL_INFO[cat].label}</div>
              {PROFICIENCIAS_LIST.filter((p) => p.categoria === cat).map((p) => (
                <AttrBar key={p.key} label={p.label} grade={character.proficiencias?.[p.key] || "E"} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   FORMULÁRIO — criar / editar ficha
----------------------------------------------------------------*/
function AbilityPicker({ onPick }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return ABILITIES_CATALOG.filter((a) => a.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query]);

  return (
    <div style={{ position: "relative", marginBottom: 10 }}>
      <input
        style={inputStyle}
        placeholder="Buscar no catálogo de habilidades conhecidas para adicionar..."
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && results.length > 0 && (
        <div style={{
          position: "absolute", zIndex: 5, top: "100%", left: 0, right: 0, background: PANEL_2,
          border: `1px solid ${LINE}`, borderRadius: 6, marginTop: 4, maxHeight: 220, overflowY: "auto",
        }}>
          {results.map((a) => (
            <button
              key={a.id}
              onClick={() => { onPick(a); setQuery(""); setOpen(false); }}
              style={{
                display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none",
                borderBottom: `1px solid ${LINE}`, color: PARCHMENT, padding: "8px 10px", cursor: "pointer", fontSize: 12.5,
              }}
            >
              <b>{a.name}</b> <span style={{ color: MUTED, fontSize: 10.5 }}>({a.category} · {a.subtype})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CharacterForm({ initial, onSave, onCancel }) {
  const [c, setC] = useState(initial);

  function set(path, value) {
    setC((prev) => {
      const next = { ...prev };
      let cur = next;
      for (let i = 0; i < path.length - 1; i++) {
        cur[path[i]] = { ...cur[path[i]] };
        cur = cur[path[i]];
      }
      cur[path[path.length - 1]] = value;
      return next;
    });
  }

  function addAbility() {
    setC((prev) => ({ ...prev, abilities: [...prev.abilities, { name: "", grade: "E", description: "" }] }));
  }
  function updateAbility(i, key, value) {
    setC((prev) => {
      const abilities = [...prev.abilities];
      abilities[i] = { ...abilities[i], [key]: value };
      return { ...prev, abilities };
    });
  }
  function removeAbility(i) {
    setC((prev) => ({ ...prev, abilities: prev.abilities.filter((_, idx) => idx !== i) }));
  }

  const habilidadesFicha = c.habilidadesFicha || { ativas: [], especial: [], racial: [], passivas: [], extras: [] };
  function addFichaAbility(catKey, entry) {
    setC((prev) => {
      const hf = { ...(prev.habilidadesFicha || { ativas: [], especial: [], racial: [], passivas: [], extras: [] }) };
      hf[catKey] = [...(hf[catKey] || []), entry];
      return { ...prev, habilidadesFicha: hf };
    });
  }
  function updateFichaAbility(catKey, i, key, value) {
    setC((prev) => {
      const hf = { ...prev.habilidadesFicha };
      const list = [...hf[catKey]];
      list[i] = { ...list[i], [key]: value };
      hf[catKey] = list;
      return { ...prev, habilidadesFicha: hf };
    });
  }
  function removeFichaAbility(catKey, i) {
    setC((prev) => {
      const hf = { ...prev.habilidadesFicha };
      hf[catKey] = hf[catKey].filter((_, idx) => idx !== i);
      return { ...prev, habilidadesFicha: hf };
    });
  }
  function pickFromCatalog(catKey, catalogEntry) {
    addFichaAbility(catKey, {
      name: catalogEntry.name,
      description: catalogEntry.intro || "",
      custo: catalogEntry.cost || "",
      tecnica: (catalogEntry.tiers || []).join(" | "),
    });
  }

  const attacks = c.attacks || [];
  function addAttack() {
    setC((prev) => ({ ...prev, attacks: [...(prev.attacks || []), { nome: "", tipo: "marcial", acerto: "0", dano: "0", ferida: "S", efeito: "" }] }));
  }
  function updateAttack(i, key, value) {
    setC((prev) => {
      const list = [...(prev.attacks || [])];
      list[i] = { ...list[i], [key]: value };
      return { ...prev, attacks: list };
    });
  }
  function removeAttack(i) {
    setC((prev) => ({ ...prev, attacks: (prev.attacks || []).filter((_, idx) => idx !== i) }));
  }

  const itens = c.itens || { usaveis: [], principais: [], armadura: [] };
  function updateItensText(slotKey, text) {
    const list = text.split(",").map((s) => s.trim()).filter(Boolean);
    setC((prev) => ({ ...prev, itens: { ...(prev.itens || { usaveis: [], principais: [], armadura: [] }), [slotKey]: list } }));
  }

  const statBase = c.statBase || { ...STAT_BASE_DEFAULTS };
  const statLinks = c.statLinks || JSON.parse(JSON.stringify(DEFAULT_STAT_LINKS));
  function toggleStatLink(statKey, attrKey) {
    setC((prev) => {
      const links = { ...(prev.statLinks || JSON.parse(JSON.stringify(DEFAULT_STAT_LINKS))) };
      const cur = links[statKey] || [];
      links[statKey] = cur.includes(attrKey) ? cur.filter((k) => k !== attrKey) : [...cur, attrKey];
      return { ...prev, statLinks: links };
    });
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 18, color: PARCHMENT, margin: 0 }}>
          {initial.name ? `Editando: ${initial.name}` : "Nova Ficha"}
        </h2>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="ghost" onClick={onCancel}><X size={14} /> Cancelar</Btn>
          <Btn variant="primary" onClick={() => onSave(c)}><Save size={14} /> Salvar</Btn>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Nome"><input style={inputStyle} value={c.name} onChange={(e) => set(["name"], e.target.value)} /></Field>
        <Field label="Epíteto"><input style={inputStyle} value={c.epithet} onChange={(e) => set(["epithet"], e.target.value)} /></Field>
        <Field label="Raça"><input style={inputStyle} value={c.race} onChange={(e) => set(["race"], e.target.value)} /></Field>
        <Field label="Facção">
          <select style={inputStyle} value={c.faction} onChange={(e) => set(["faction"], e.target.value)}>
            {FACTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </Field>
        <Field label="Afiliação"><input style={inputStyle} value={c.affiliation} onChange={(e) => set(["affiliation"], e.target.value)} /></Field>
        <Field label="Altura"><input style={inputStyle} value={c.height} onChange={(e) => set(["height"], e.target.value)} /></Field>
        <Field label="Deidade"><input style={inputStyle} value={c.deity} onChange={(e) => set(["deity"], e.target.value)} /></Field>
        <Field label="Arma principal"><input style={inputStyle} value={c.weapon} onChange={(e) => set(["weapon"], e.target.value)} /></Field>
        <Field label="Traços marcantes"><input style={inputStyle} value={c.traits || ""} onChange={(e) => set(["traits"], e.target.value)} /></Field>
        <Field label="XP"><input type="number" style={inputStyle} value={c.xp || 0} onChange={(e) => set(["xp"], Number(e.target.value))} /></Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "start", marginTop: 4 }}>
        <Field label="Imagem (URL)">
          <input style={inputStyle} placeholder="https://..." value={c.imageUrl || ""} onChange={(e) => set(["imageUrl"], e.target.value)} />
        </Field>
        {c.imageUrl && (
          <img
            src={c.imageUrl}
            alt="Prévia"
            style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover", border: `1px solid ${LINE}` }}
            onError={(e) => { e.target.style.display = "none"; }}
          />
        )}
      </div>

      <SectionTitle icon={Sparkles}>Singularidade</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Nome"><input style={inputStyle} value={c.singularity.name} onChange={(e) => set(["singularity", "name"], e.target.value)} /></Field>
        <Field label="Nível (ex: E, C, A, S, EX, Divino)"><input style={inputStyle} value={c.singularity.level} onChange={(e) => set(["singularity", "level"], e.target.value)} /></Field>
      </div>
      <Field label="Descrição">
        <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={c.singularity.description} onChange={(e) => set(["singularity", "description"], e.target.value)} />
      </Field>

      <SectionTitle icon={Swords}>Proficiências de Combate</SectionTitle>
      <p style={{ fontSize: 11, color: MUTED, marginTop: -6, marginBottom: 10 }}>
        Essas entram nos cálculos de combate (somando com o atributo correspondente) — Briga/Armas de Fogo/Combate Corpo a Corpo/Magias Ofensivas por tipo de ataque, e Defesa/Resistência Física/Resistência Mágica/Técnica reforçando a stat equivalente.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        {PROFICIENCIAS_LIST.filter((p) => p.categoria === "combate").map((p) => (
          <Field key={p.key} label={p.label}>
            <select style={inputStyle} value={c.proficiencias?.[p.key] || "E"} onChange={(e) => set(["proficiencias", p.key], e.target.value)}>
              {GRADE_ORDER.map((g) => <option key={g} value={g}>{g} — nível {GRADE_VALUE[g]}</option>)}
            </select>
          </Field>
        ))}
      </div>

      <SectionTitle icon={Users}>Atributos Gerais e Proficiências (estilo Vampiro: A Máscara)</SectionTitle>
      <p style={{ fontSize: 11, color: MUTED, marginTop: -6, marginBottom: 10 }}>
        Força e Destreza migraram pra cá (saíram dos Atributos de Combate). Vigor determina o HP máximo (2 + bônus de Vigor, ajustável logo acima em Recursos). Os demais atributos gerais não têm função de combate — servem pra testes interpretativos. Mais as Proficiências não-combate, também só de referência por enquanto.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 14 }}>
        {ATRIBUTOS_GERAIS_LIST.map((a) => (
          <Field key={a.key} label={`${a.label} (${CATEGORIA_GERAL_INFO[a.categoria].label})`}>
            <select style={inputStyle} value={c.atributosGerais?.[a.key] || "E"} onChange={(e) => set(["atributosGerais", a.key], e.target.value)}>
              {GRADE_ORDER.map((g) => <option key={g} value={g}>{g} — nível {GRADE_VALUE[g]}</option>)}
            </select>
          </Field>
        ))}
      </div>
      <details style={{ marginBottom: 20 }}>
        <summary style={{ cursor: "pointer", fontSize: 12, color: MUTED, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.5, textTransform: "uppercase", padding: "6px 0" }}>
          Proficiências não-combate (Física / Social / Mental)
        </summary>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginTop: 10 }}>
          {PROFICIENCIAS_LIST.filter((p) => p.categoria !== "combate").map((p) => (
            <Field key={p.key} label={p.label}>
              <select style={inputStyle} value={c.proficiencias?.[p.key] || "E"} onChange={(e) => set(["proficiencias", p.key], e.target.value)}>
                {GRADE_ORDER.map((g) => <option key={g} value={g}>{g} — nível {GRADE_VALUE[g]}</option>)}
              </select>
            </Field>
          ))}
        </div>
      </details>

      <SectionTitle icon={ShieldHalf}>Estatísticas de Combate</SectionTitle>
      <p style={{ fontSize: 11, color: MUTED, marginTop: -6, marginBottom: 10 }}>
        Cada estatística soma: base (manual, abaixo) + bônus da Proficiência de Combate correspondente (Defesa, Resistência Física, Resistência Mágica) + ajuste temporário.
      </p>
      {STAT_LIST.map((s) => (
        <div key={s.key} style={{ display: "grid", gridTemplateColumns: "180px 90px 1fr 70px", gap: 10, alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 12.5, color: PARCHMENT }}>{s.label}</span>
          <input type="number" style={inputStyle} value={statBase[s.key] ?? 0} onChange={(e) => set(["statBase", s.key], Number(e.target.value))} />
          <span style={{ fontSize: 10.5, color: MUTED, fontStyle: "italic" }}>
            {STAT_PROF_LINK[s.key] ? `+ Proficiência de ${PROFICIENCIAS_LIST.find((p) => p.key === STAT_PROF_LINK[s.key])?.label}` : "—"}
          </span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: BRASS_BRIGHT, textAlign: "right" }}>= {computeStat(c, s.key)}</span>
        </div>
      ))}

      <SectionTitle icon={Target}>Ataques</SectionTitle>
      <p style={{ fontSize: 11, color: MUTED, marginTop: -6, marginBottom: 10 }}>
        Cada ataque tem um Tipo, que já define o que entra na conta: Marcial (Acerto: Destreza + Proficiência, Dano: Força + Proficiência, ferida escala), Arma de fogo (Acerto: Destreza + Proficiência, Dano: só Proficiência + valor da arma, ferida fixa), Mágico (Acerto e Dano: só a Proficiência de Magias Ofensivas + valor da magia, ferida fixa).
      </p>
      {attacks.map((atk, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 0.5fr 0.7fr 0.5fr 1.3fr auto", gap: 6, marginBottom: 8 }}>
          <input style={inputStyle} placeholder="Nome" value={atk.nome} onChange={(e) => updateAttack(i, "nome", e.target.value)} />
          <select style={inputStyle} value={atk.tipo || "marcial"} onChange={(e) => updateAttack(i, "tipo", e.target.value)}>
            {Object.entries(TIPOS_ATAQUE).map(([key, t]) => <option key={key} value={key}>{t.label}</option>)}
          </select>
          <input style={inputStyle} placeholder="Acerto" value={atk.acerto} onChange={(e) => updateAttack(i, "acerto", e.target.value)} />
          <input style={inputStyle} placeholder="Dano (bônus na confirmação, ex: +1)" value={atk.dano} onChange={(e) => updateAttack(i, "dano", e.target.value)} />
          <input style={inputStyle} placeholder="Ferida (por confirmação, padrão 1)" value={atk.ferida} onChange={(e) => updateAttack(i, "ferida", e.target.value)} />
          <input style={inputStyle} placeholder="Efeito" value={atk.efeito} onChange={(e) => updateAttack(i, "efeito", e.target.value)} />
          <Btn variant="danger" onClick={() => removeAttack(i)} style={{ padding: "8px 10px" }}><Trash2 size={13} /></Btn>
        </div>
      ))}
      <Btn onClick={addAttack}><Plus size={13} /> Adicionar ataque</Btn>

      <SectionTitle icon={Swords}>Habilidades Passivas de Combate</SectionTitle>
      <p style={{ fontSize: 11, color: MUTED, marginTop: -6, marginBottom: 10 }}>
        Escolha até 2. A Singularidade (acima) já conta como a 3ª habilidade ativa do personagem — não precisa duplicar aqui.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        {PROC_ABILITIES_AGRUPADAS.map((p) => {
          const checked = (c.procs || []).includes(p.id);
          const limiar = limiarDaHabilidade(c, p);
          const attrLabel = attrLabelDaHabilidade(p);
          const atLimit = !checked && (c.procs || []).length >= 2;
          return (
            <label key={p.id} style={{
              display: "block", padding: 10, borderRadius: 8, cursor: atLimit ? "not-allowed" : "pointer",
              background: checked ? `${PURPLE}18` : "#00000010", border: `1px solid ${checked ? PURPLE : LINE}`,
              opacity: atLimit ? 0.5 : 1,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox" checked={checked} disabled={atLimit}
                    onChange={() => {
                      const cur = c.procs || [];
                      const next = checked ? cur.filter((id) => id !== p.id) : [...cur, p.id].slice(0, 2);
                      set(["procs"], next);
                    }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 700, color: PARCHMENT }}>{p.nome}</span>
                </div>
                <span style={{ fontSize: 9.5, fontFamily: "'IBM Plex Mono', monospace" }}>
                  <HabilidadeCategoriaBadge p={p} />
                  {p.prioridade ? <span style={{ color: MUTED }}> · prioridade {p.prioridade}</span> : null}
                </span>
              </div>
              <div style={{ fontSize: 10, color: PURPLE, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 3 }}>
                {p.reduzCriticoEm
                  ? `Reduz o crítico em ${p.reduzCriticoEm} (em todos os críticos da rolagem)`
                  : p.gatilho?.startsWith("passivo_")
                  ? "Sempre ativa (não depende de dado)"
                  : p.gatilho === "contato_proprio"
                  ? `Dispara sempre ao fazer contato${p.restricaoTipo ? ` com ataque ${TIPOS_ATAQUE[p.restricaoTipo]?.label}` : ""}`
                  : `Dispara com dado ≥${limiar} (${attrLabel})${p.restricaoTipo ? ` · só ${TIPOS_ATAQUE[p.restricaoTipo]?.label}` : ""}`}
              </div>
              <div style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.4 }}>{p.efeito}</div>
            </label>
          );
        })}
      </div>

      <details style={{ marginBottom: 20, background: "#00000010", border: `1px solid ${LINE}`, borderRadius: 8, padding: 12 }}>
        <summary style={{ fontSize: 12, color: MUTED, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.5, cursor: "pointer", textTransform: "uppercase" }}>
          Habilidades antigas (arquivadas — sistema anterior, desativado)
        </summary>
        <div style={{ marginTop: 12 }}>
          {HABILIDADE_CATEGORIAS.map((cat) => (
            <div key={cat.key} style={{ marginBottom: 20, background: "#00000020", border: `1px solid ${LINE}`, borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 12, color: BRASS, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.5, marginBottom: 8, textTransform: "uppercase" }}>{cat.label}</div>
              <AbilityPicker onPick={(entry) => pickFromCatalog(cat.key, entry)} />
              {(habilidadesFicha[cat.key] || []).map((ab, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1.2fr 0.9fr 2fr auto", gap: 8, marginBottom: 6, alignItems: "start" }}>
                  <input style={inputStyle} placeholder="Nome" value={ab.name} onChange={(e) => updateFichaAbility(cat.key, i, "name", e.target.value)} />
                  <input style={inputStyle} placeholder="Custo (ex: 2mp ou 1sp)" value={ab.custo || ""} onChange={(e) => updateFichaAbility(cat.key, i, "custo", e.target.value)} />
                  <input style={inputStyle} placeholder="Descrição" value={ab.description || ""} onChange={(e) => updateFichaAbility(cat.key, i, "description", e.target.value)} />
                  <Btn variant="danger" onClick={() => removeFichaAbility(cat.key, i)} style={{ padding: "8px 10px" }}><Trash2 size={13} /></Btn>
                </div>
              ))}
              <Btn onClick={() => addFichaAbility(cat.key, { name: "", description: "", custo: "", tecnica: "" })} style={{ marginTop: 4 }}>
                <Plus size={13} /> Adicionar manualmente
              </Btn>
            </div>
          ))}
        </div>
      </details>

      <SectionTitle icon={ShieldHalf}>Itens</SectionTitle>
      <p style={{ fontSize: 11, color: MUTED, marginTop: -6, marginBottom: 10 }}>Máximo: 3 usáveis, 3 principais, 1 armadura. Separe os nomes por vírgula.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <Field label="Principais (até 3)"><input style={inputStyle} value={(itens.principais || []).join(", ")} onChange={(e) => updateItensText("principais", e.target.value)} /></Field>
        <Field label="Usáveis (até 3)"><input style={inputStyle} value={(itens.usaveis || []).join(", ")} onChange={(e) => updateItensText("usaveis", e.target.value)} /></Field>
        <Field label="Armadura (até 1)"><input style={inputStyle} value={(itens.armadura || []).join(", ")} onChange={(e) => updateItensText("armadura", e.target.value)} /></Field>
      </div>

      <SectionTitle icon={Star}>Resumo de Poder (legado narrativo)</SectionTitle>
      <p style={{ fontSize: 11, color: MUTED, marginTop: -6, marginBottom: 10 }}>Campo antigo, mantido para os dossiês narrativos já existentes (grau E–Divino + descrição curta).</p>
      {c.abilities.map((ab, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1.2fr 0.5fr 2fr auto", gap: 8, marginBottom: 8, alignItems: "start" }}>
          <input style={inputStyle} placeholder="Nome" value={ab.name} onChange={(e) => updateAbility(i, "name", e.target.value)} />
          <select style={inputStyle} value={ab.grade} onChange={(e) => updateAbility(i, "grade", e.target.value)}>
            {[...GRADE_ORDER, "S", "SS", "EX", "Divino"].map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <input style={inputStyle} placeholder="Descrição" value={ab.description} onChange={(e) => updateAbility(i, "description", e.target.value)} />
          <Btn variant="danger" onClick={() => removeAbility(i)} style={{ padding: "8px 10px" }}><Trash2 size={13} /></Btn>
        </div>
      ))}
      <Btn onClick={addAbility}><Plus size={13} /> Adicionar habilidade</Btn>

      <SectionTitle>Recursos</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {["hp", "mp", "sp"].map((res) => {
          const maxHP = res === "hp" ? computeMaxHP(c) : null;
          const temPersistente = (c.procs || []).includes("persistente");
          return (
            <div key={res}>
              <span style={{ display: "block", fontSize: 11, color: MUTED, marginBottom: 4, fontFamily: "'IBM Plex Mono', monospace" }}>{res.toUpperCase()} (atual / máximo)</span>
              <div style={{ display: "flex", gap: 6 }}>
                <input type="number" style={inputStyle} value={c[res].current} onChange={(e) => set([res, "current"], Number(e.target.value))} />
                {res === "hp" ? (
                  <input type="number" style={{ ...inputStyle, opacity: 0.6 }} value={maxHP} disabled title="Calculado pelo Vigor (+1 se tiver Persistente) — ajuste o Vigor nos Atributos Gerais" />
                ) : (
                  <input type="number" style={inputStyle} value={c[res].max} onChange={(e) => set([res, "max"], Number(e.target.value))} />
                )}
              </div>
              {res === "hp" && <div style={{ fontSize: 9.5, color: MUTED, marginTop: 3, fontStyle: "italic" }}>Máximo = 2 + bônus de Vigor{temPersistente ? " + 1 (Persistente)" : ""} (ajuste o Vigor lá embaixo, em Atributos Gerais)</div>}
              {res === "sp" && temPersistente && <div style={{ fontSize: 9.5, color: MUTED, marginTop: 3, fontStyle: "italic" }}>Persistente soma +1 ao máximo mostrado na ficha (total: {computeMaxSP(c)})</div>}
            </div>
          );
        })}
      </div>

      <SectionTitle icon={BookOpen}>História e Criação</SectionTitle>
      <textarea style={{ ...inputStyle, minHeight: 110, resize: "vertical" }} value={c.history} onChange={(e) => set(["history"], e.target.value)} />
    </div>
  );
}

function DuelRoller({ a, b, onUpdateCharacter }) {
  const attacksA = a.attacks && a.attacks.length > 0 ? a.attacks : [{ nome: "(ataque genérico)", tipo: "marcial", acerto: 0, dano: "0", ferida: "S" }];
  const [attackIdx, setAttackIdx] = useState(0);
  const [result, setResult] = useState(null);
  const [modoGasto, setModoGasto] = useState(null); // null | "mp" | "sp"
  const attack = attacksA[attackIdx] || attacksA[0];
  const tipoAtual = TIPOS_ATAQUE[attack.tipo] || TIPOS_ATAQUE.marcial;
  const resistKeyAtual = tipoAtual.resistKey || "resistNaturalFisica";

  function chooseAndRoll(i) {
    setAttackIdx(i);
    const r = resolveAttack({ attacker: a, defender: b, attack: attacksA[i] });
    setResult(r);
    setModoGasto(null);
  }

  // MP do atacante: gasta 1 pra re-rolar um dado (de Acerto ou de Confirmação). SP:
  // gasta 1 pra somar +5 nele (limitado a 10). Fluxo: clica em "Usar MP" ou "Usar SP"
  // pra entrar no modo, depois clica no dado que quer afetar - o gasto só acontece
  // nesse segundo clique.
  // Mudar um dado de Acerto muda quantos sucessos existem, entao a Confirmacao
  // inteira e refeita do zero (via resolveConfirmationPhase) pra ficar consistente -
  // os dados de Confirmacao ja rolados nao sao reaproveitados nesse caso.
  function clicarDadoAcerto(index) {
    if (!result || !onUpdateCharacter || !modoGasto) return;
    if (modoGasto === "mp" && (a.mp?.current || 0) <= 0) return;
    if (modoGasto === "sp" && (a.sp?.current || 0) <= 0) return;
    const novosDados = [...result.dice];
    novosDados[index] = modoGasto === "mp" ? (Math.floor(Math.random() * 10) + 1) : Math.min(10, novosDados[index] + 5);

    const temMestreCritico = (a.procs || []).includes("furia_crescente");
    const mestreCriticoInfo = PROC_ABILITIES.find((p) => p.id === "furia_crescente");
    const limiarMestreCritico = result.critThreshold - (mestreCriticoInfo?.reduzCriticoEm || 0);
    let golpeCerteiroUsado = false;
    const novosFlags = novosDados.map((d) => {
      const limiarEfetivo = temMestreCritico ? limiarMestreCritico : result.critThreshold;
      const isCrit = d >= limiarEfetivo;
      const critBonus = isCrit ? 1 : 0;
      const success = d + result.acertoBonus + critBonus > result.threshold;
      const procAtacante = findTriggeredProc(a, "acerto_proprio", d, attack.tipo);
      const procDefensor = findTriggeredProc(b, "acerto_recebido", d, attack.tipo);
      let sucessosGerados = success ? 1 : 0;
      const golpeCerteiroDispara = success && procAtacante?.id === "golpe_certeiro" && !golpeCerteiroUsado;
      if (golpeCerteiroDispara) { sucessosGerados = 2; golpeCerteiroUsado = true; }
      return { isCrit, success, procAtacante, procDefensor, sucessosGerados, golpeCerteiroDispara };
    });
    const novosSuccesses = novosFlags.reduce((sum, f) => sum + f.sucessosGerados, 0);
    const novosCriticos = novosFlags.filter((f) => f.isCrit).length;
    const successCritOrder = [];
    for (const f of novosFlags) for (let i = 0; i < f.sucessosGerados; i++) successCritOrder.push(f.isCrit);

    const confirmResult = resolveConfirmationPhase({
      attacker: a, defender: b, attack, successes: novosSuccesses, successFlags: novosFlags, successCritOrder, fixedSuccessMatch: false,
    });
    setResult({
      ...result, dice: novosDados, successFlags: novosFlags, successes: novosSuccesses, criticos: novosCriticos, superSucesso: novosSuccesses >= 3,
      ...confirmResult,
    });
    if (modoGasto === "mp") onUpdateCharacter(a.id, { mp: { ...a.mp, current: a.mp.current - 1 } });
    else onUpdateCharacter(a.id, { sp: { ...a.sp, current: a.sp.current - 1 } });
    setModoGasto(null);
  }
  function recomputeConfirm(confirmRolls) {
    const confirmedHits = confirmRolls.filter((r) => r.passou).length;
    const causaDano = confirmedHits > 0;
    const feridaPorAcerto = attack.ferida !== undefined && attack.ferida !== "" ? parseFlatBonus(attack.ferida) || 1 : 1;
    const escalaComSucessos = attack.tipo === "marcial";
    const extraFeridaTotal = confirmRolls.reduce((sum, r) => sum + (r.passou ? (r.extraFerida || 0) : 0), 0);
    const feridaValor = !causaDano ? 0 : (escalaComSucessos ? confirmedHits * feridaPorAcerto : feridaPorAcerto) + extraFeridaTotal;
    const contato = result.successes > 0 && !causaDano;
    return { ...result, confirmRolls, confirmedHits, causaDano, contato, feridaValor };
  }
  function clicarDadoConfirm(index) {
    if (!result || !onUpdateCharacter || !modoGasto) return;
    const r = { ...result.confirmRolls[index] };
    if (modoGasto === "mp") {
      if ((a.mp?.current || 0) <= 0) return;
      r.die = Math.floor(Math.random() * 10) + 1;
    } else {
      if ((a.sp?.current || 0) <= 0) return;
      r.die = Math.min(10, r.die + 5);
    }
    r.isCrit = r.die === 10;
    r.total = r.die + r.confirmBonus;
    r.passou = r.isCrit || r.total >= r.resistValor;
    const novosConfirmRolls = [...result.confirmRolls];
    novosConfirmRolls[index] = r;
    setResult(recomputeConfirm(novosConfirmRolls));
    if (modoGasto === "mp") onUpdateCharacter(a.id, { mp: { ...a.mp, current: a.mp.current - 1 } });
    else onUpdateCharacter(a.id, { sp: { ...a.sp, current: a.sp.current - 1 } });
    setModoGasto(null);
  }

  const defesaAlvo = computeStat(b, "defesa");
  const threshold = defesaAlvo;
  const resistArmaduraB = computeStat(b, "resistArmadura");
  const resistNaturalB = computeStat(b, resistKeyAtual);
  const temArmaduraB = (b.itens?.armadura || []).length > 0;
  const critThresholdA = 10;

  return (
    <div style={{ marginTop: 24 }}>
      <SectionTitle icon={Dices}>Rolagem de Confronto — Acerto × Defesa</SectionTitle>
      <p style={{ fontSize: 11.5, color: MUTED, margin: "-4px 0 14px" }}>
        {a.name} ataca, {b.name} defende. Acerto: 3d10 conta sucesso (S) se (dado + bônus do ataque + bônus de crítico) for maior que a Defesa do alvo (a Defesa já inclui a base 5). Um 10 natural é sempre crítico (+1 no próprio dado, mas não é sucesso automático). Confirmação: pra cada sucesso do Acerto, rola 1d10 + bônus (+1 extra se veio de acerto crítico) — um 10 natural na confirmação sempre passa. {temArmaduraB
          ? "Como o alvo tem armadura, as confirmações checam a Armadura em ordem até uma romper (rolagem que iguala/supera o valor) — a partir dali, as seguintes checam a Resistência Natural (Física ou Mágica, conforme o Tipo do ataque)."
          : "O alvo não tem armadura equipada, então todas as confirmações checam direto a Resistência Natural (Física ou Mágica, conforme o Tipo do ataque)."} A Ferida final depende do Tipo: em ataques Marciais (desarmado e arma branca) escala com a quantidade de confirmações que passaram; em Arma de fogo e Mágico é um valor fixo do ataque, aplicado uma vez.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 8, fontFamily: "'IBM Plex Mono', monospace" }}>
            Clique num ataque de {a.name} pra rolar:
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {attacksA.map((atk, i) => (
              <AttackCard key={i} atk={atk} character={a} selected={i === attackIdx && !!result} onClick={() => chooseAndRoll(i)} />
            ))}
          </div>
        </div>

        <div style={{ background: PANEL_2, border: `1px solid ${LINE}`, borderRadius: 8, padding: 16, alignSelf: "start" }}>
          {/^\d*[sS]$/.test(String(attack.acerto ?? "").trim()) ? (
            <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 4, fontFamily: "'IBM Plex Mono', monospace" }}>
              Este ataque não rola Acerto — usa sucessos fixos direto na Confirmação.
            </div>
          ) : (
            <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 4, fontFamily: "'IBM Plex Mono', monospace" }}>
              Limiar de sucesso: dado + bônus &gt; {threshold} (Defesa {defesaAlvo}, já com a base 5 incluída) · crítico em dado ≥{critThresholdA}
            </div>
          )}
          <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
            Resistência de {b.name} ({tipoAtual.label}): {temArmaduraB ? `Armadura ${resistArmaduraB} → depois ${STAT_LIST.find((s) => s.key === resistKeyAtual)?.label} ${resistNaturalB}` : `${STAT_LIST.find((s) => s.key === resistKeyAtual)?.label} ${resistNaturalB} (sem armadura)`}
          </div>

          {result && (
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <button
                onClick={() => setModoGasto(modoGasto === "mp" ? null : "mp")}
                disabled={(a.mp?.current || 0) <= 0}
                style={{
                  display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, padding: "6px 12px", borderRadius: 20,
                  border: `1px solid ${MP_COLOR}`, background: modoGasto === "mp" ? `${MP_COLOR}33` : "transparent",
                  color: MP_COLOR, fontFamily: "'IBM Plex Mono', monospace", fontWeight: modoGasto === "mp" ? 700 : 400,
                  cursor: (a.mp?.current || 0) > 0 ? "pointer" : "not-allowed", opacity: (a.mp?.current || 0) > 0 ? 1 : 0.4,
                }}
              >
                <Sparkles size={13} /> Usar MP ({a.mp?.current || 0}) — re-rolar
              </button>
              <button
                onClick={() => setModoGasto(modoGasto === "sp" ? null : "sp")}
                disabled={(a.sp?.current || 0) <= 0}
                style={{
                  display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, padding: "6px 12px", borderRadius: 20,
                  border: `1px solid ${SP_COLOR}`, background: modoGasto === "sp" ? `${SP_COLOR}33` : "transparent",
                  color: SP_COLOR, fontFamily: "'IBM Plex Mono', monospace", fontWeight: modoGasto === "sp" ? 700 : 400,
                  cursor: (a.sp?.current || 0) > 0 ? "pointer" : "not-allowed", opacity: (a.sp?.current || 0) > 0 ? 1 : 0.4,
                }}
              >
                <Flame size={13} /> Usar SP ({a.sp?.current || 0}) — +5
              </button>
              {onUpdateCharacter && (
                <button
                  onClick={() => onUpdateCharacter(a.id, {
                    mp: { ...a.mp, current: a.mp?.max ?? 0 },
                    sp: { ...a.sp, current: computeMaxSP(a) },
                  })}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, padding: "6px 12px", borderRadius: 20,
                    border: `1px solid ${LINE}`, background: "transparent", color: MUTED, fontFamily: "'IBM Plex Mono', monospace",
                  }}
                  title={`Restaura o MP e o SP de ${a.name} pro máximo`}
                >
                  ↺ Restaurar MP/SP
                </button>
              )}
              {modoGasto && (
                <span style={{ fontSize: 11, color: modoGasto === "mp" ? MP_COLOR : SP_COLOR, alignSelf: "center", fontStyle: "italic" }}>
                  Clique num dado de Acerto ou Confirmação abaixo...
                </span>
              )}
            </div>
          )}

          {!result && (
            <div style={{ textAlign: "center", color: MUTED, fontSize: 12.5, padding: "20px 0" }}>
              Escolha um ataque à esquerda pra ver o resultado aqui.
            </div>
          )}

          {result && (
            <>
              {result.semRolagemDeAcerto ? (
                <div style={{ textAlign: "center", fontSize: 12.5, color: BRASS_BRIGHT, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 10 }}>
                  Este ataque não rola Acerto — considera {result.successes} sucesso{result.successes === 1 ? "" : "s"} fixo{result.successes === 1 ? "" : "s"} e vai direto pra Confirmação.
                </div>
              ) : (
                <>
                  {result.desaceleracaoRoll && (
                    <div style={{ textAlign: "center", marginBottom: 8 }}>
                      <div style={{ fontSize: 9.5, color: MUTED, fontFamily: "'IBM Plex Mono', monospace" }}>
                        ⚡ DESACELERAÇÃO: dado {result.desaceleracaoRoll.dado}{result.desaceleracaoRoll.instancias > 1 ? ` +${result.desaceleracaoRoll.instancias - 1} = ${result.desaceleracaoRoll.dadoAjustado}` : ""} → Defesa do alvo -{result.desaceleracaoRoll.reducao} nesta rolagem de Acerto
                      </div>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                    {result.dice.map((d, i) => {
                      const flag = result.successFlags?.[i];
                      const isCrit = flag ? flag.isCrit : d >= result.critThreshold;
                      const critBonus = isCrit ? 1 : 0;
                      const aceleracaoBonus = flag?.aceleracaoBonusEsteDado || 0;
                      const thresholdEfetivo = flag?.thresholdEfetivo ?? result.threshold;
                      const total = d + result.acertoBonus + critBonus + aceleracaoBonus;
                      const hit = flag ? flag.success : total > thresholdEfetivo;
                      const proc = flag?.procAtacante || flag?.procDefensor;
                      const procNaoDisparouAqui = proc?.id === "golpe_certeiro" && !flag?.golpeCerteiroDispara;
                      const clicavel = !!modoGasto;
                      const corModo = modoGasto === "mp" ? MP_COLOR : SP_COLOR;
                      return (
                        <div key={i} style={{ textAlign: "center" }}>
                          <button
                            onClick={() => clicavel && clicarDadoAcerto(i)}
                            disabled={!clicavel}
                            title={clicavel ? (modoGasto === "mp" ? "Clique pra re-rolar este dado (gasta 1 MP)" : "Clique pra somar +5 neste dado (gasta 1 SP)") : ""}
                            style={{
                              width: 40, height: 40, borderRadius: 6, padding: 0, fontFamily: "inherit",
                              border: `1px solid ${clicavel ? corModo : (isCrit ? EMBER : hit ? BRASS_BRIGHT : LINE)}`,
                              background: isCrit ? `${EMBER}33` : hit ? `${BRASS}33` : "#00000040",
                              boxShadow: clicavel ? `0 0 8px ${corModo}88` : (hit ? `0 0 8px ${isCrit ? EMBER : BRASS}66` : "none"),
                              cursor: clicavel ? "pointer" : "default",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontWeight: 700, color: PARCHMENT, fontSize: 15,
                            }}
                          >{d}</button>
                          <div style={{ fontSize: 9, color: isCrit ? EMBER : MUTED, marginTop: 2, fontFamily: "'IBM Plex Mono', monospace" }}>
                            {d} + {result.acertoBonus}{isCrit ? " + 1 (crít.)" : ""}{aceleracaoBonus > 0 ? ` + ${aceleracaoBonus} (acel.)` : ""} = {total}{thresholdEfetivo !== result.threshold ? ` vs ${thresholdEfetivo}` : ""}
                          </div>
                          {flag?.enraizamentoAplicado && (
                            <div style={{ fontSize: 8, color: PURPLE, fontWeight: 700, marginTop: 2, maxWidth: 64 }} title="ENRAIZAMENTO: este dado enfrenta a Defesa do alvo com -2">
                              ⚡ Enraizamento
                            </div>
                          )}
                          {aceleracaoBonus > 0 && (
                            <div style={{ fontSize: 8, color: PURPLE, fontWeight: 700, marginTop: 2, maxWidth: 64 }} title="ACELERAÇÃO: bônus crescente por sucessos em sequência">
                              ⚡ Aceleração +{aceleracaoBonus}
                            </div>
                          )}
                          {flag?.mestreCriticoUsado && (
                            <div style={{ fontSize: 8, color: PURPLE, fontWeight: 700, marginTop: 2, maxWidth: 64 }} title="Mestre do Crítico: limiar de crítico reduzido pra Sorte, só no primeiro crítico da rolagem">
                              ⚡ Mestre do Crítico
                            </div>
                          )}
                          {flag?.rerolado && (
                            <div style={{ fontSize: 8, color: PURPLE, fontWeight: 700, marginTop: 2, maxWidth: 64 }} title="Borrão: dado original re-rolado uma vez">
                              ⚡ Borrão ({flag.dadoOriginal} → {d})
                            </div>
                          )}
                          {proc && !procNaoDisparouAqui && !flag?.rerolado && !flag?.mestreCriticoUsado && (
                            <div style={{ fontSize: 8, color: PURPLE, fontWeight: 700, marginTop: 2, maxWidth: 64 }} title={proc.efeito}>
                              ⚡ {proc.nome}{flag?.sucessosGerados === 2 ? " (2 sucessos!)" : ""}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ textAlign: "center", fontSize: 12.5, color: MUTED, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 8 }}>
                    {result.successes} sucesso{result.successes === 1 ? "" : "s"} no acerto{result.criticos > 0 ? ` · ${result.criticos} crítico${result.criticos > 1 ? "s" : ""}` : ""}{result.superSucesso ? " · SUPER SUCESSO" : ""}
                  </div>
                </>
              )}

              {result.confirmRolls.length > 0 && (
                <>
                  <div style={{ fontSize: 10.5, color: MUTED, textAlign: "center", marginBottom: 6, fontFamily: "'IBM Plex Mono', monospace" }}>
                    CONFIRMAÇÃO (1d10 + bônus cada, +1 extra se veio de crítico) — em ordem, contra Armadura até romper, depois Natural
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                    {result.confirmRolls.map((r, i) => {
                      const proc = r.procAtacante || r.procDefensor;
                      const clicavel = !!modoGasto;
                      const corModo = modoGasto === "mp" ? MP_COLOR : SP_COLOR;
                      return (
                        <div key={i} style={{ textAlign: "center" }}>
                          <button
                            onClick={() => clicavel && clicarDadoConfirm(i)}
                            disabled={!clicavel}
                            title={clicavel ? (modoGasto === "mp" ? "Clique pra re-rolar este dado (gasta 1 MP)" : "Clique pra somar +5 neste dado (gasta 1 SP)") : ""}
                            style={{
                              width: 36, height: 36, borderRadius: 6, padding: 0, fontFamily: "inherit",
                              border: `1px solid ${clicavel ? corModo : (r.isCrit ? EMBER : r.passou ? BRASS_BRIGHT : LINE)}`,
                              background: r.isCrit ? `${EMBER}33` : r.passou ? `${BRASS}33` : "#00000040",
                              boxShadow: clicavel ? `0 0 6px ${corModo}88` : "none",
                              cursor: clicavel ? "pointer" : "default",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontWeight: 700, color: PARCHMENT, fontSize: 14,
                            }}
                          >{r.die}</button>
                          <div style={{ fontSize: 8, color: MUTED, marginTop: 2, fontFamily: "'IBM Plex Mono', monospace" }}>{r.die} + {r.confirmBonus}{r.veioDeCritico ? " (+1 crít.)" : ""} = {r.total}</div>
                          <div style={{ fontSize: 8, color: MUTED }}>vs {r.resistUsada === "escudoDeMana" ? "Escudo" : r.resistUsada === "resistArmadura" ? "Armad." : (STAT_LIST.find((s) => s.key === r.resistUsada)?.label.replace("Resistência Natural ", "") || "Nat.")} {r.resistValor}</div>
                          <div style={{ fontSize: 8.5, color: r.passou ? BRASS_BRIGHT : MUTED }}>{r.passou ? "confirma" : "falha"}</div>
                          {r.rerolado && (
                            <div style={{ fontSize: 8, color: PURPLE, fontWeight: 700, marginTop: 2, maxWidth: 60 }} title="Giro Defensivo: dado original re-rolado uma vez">
                              ⚡ Giro Defensivo ({r.dadoOriginal} → {r.die})
                            </div>
                          )}
                          {r.blindada && (
                            <div style={{ fontSize: 8, color: PURPLE, fontWeight: 700, marginTop: 2, maxWidth: 60 }} title="Mestre em Armadura: essa confirmação superou a Armadura, mas ela ainda não quebrou">
                              ⚡ Mestre em Armadura (aguentou)
                            </div>
                          )}
                          {proc && !r.rerolado && !r.blindada && (
                            <div style={{ fontSize: 8, color: PURPLE, fontWeight: 700, marginTop: 2, maxWidth: 60 }} title={proc.efeito}>
                              ⚡ {proc.nome}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {result.impactoRoll && (
                <div style={{ textAlign: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 10.5, color: MUTED, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 4 }}>
                    ⚡ IMPACTO ({result.impactoRoll.instancias} instância{result.impactoRoll.instancias > 1 ? "s" : ""})
                  </div>
                  <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 6, border: `1px solid ${PURPLE}`, background: `${PURPLE}22`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: PARCHMENT, fontSize: 14,
                    }}>{result.impactoRoll.dado}</div>
                    <div style={{ fontSize: 9, color: MUTED, marginTop: 2, fontFamily: "'IBM Plex Mono', monospace" }}>
                      {result.impactoRoll.instancias > 1 ? `${result.impactoRoll.dado} +${result.impactoRoll.instancias - 1} = ${result.impactoRoll.dadoAjustado} → ` : ""}+{result.impactoRoll.bonus} na Confirmação
                    </div>
                  </div>
                </div>
              )}

              {result.chamasRolls.length > 0 && (
                <div style={{ textAlign: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 10.5, color: MUTED, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 4 }}>
                    ⚡ CHAMAS ({result.chamasRolls.length} instância{result.chamasRolls.length > 1 ? "s" : ""}, vs Resistência Natural {result.resistNatural})
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                    {result.chamasRolls.map((r, i) => (
                      <div key={i} style={{ textAlign: "center" }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 6, border: `1px solid ${r.isCrit ? EMBER : r.passou ? PURPLE : LINE}`,
                          background: r.isCrit ? `${EMBER}33` : r.passou ? `${PURPLE}22` : "#00000040",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: PARCHMENT, fontSize: 13,
                        }}>{r.die}</div>
                        <div style={{ fontSize: 8, color: r.passou ? PURPLE : MUTED }}>{r.passou ? "+1 ferida" : "falha"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.envenenamentoRolls && result.envenenamentoRolls.length > 0 && (
                <div style={{ textAlign: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 10.5, color: MUTED, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 4 }}>
                    ⚡ ENVENENAMENTO ({result.envenenamentoRolls.length} instância{result.envenenamentoRolls.length > 1 ? "s" : ""})
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                    {result.envenenamentoRolls.map((r, i) => (
                      <div key={i} style={{ textAlign: "center" }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 6, border: `1px solid ${r.isCrit ? EMBER : r.passou ? "#4A7A4E" : LINE}`,
                          background: r.isCrit ? `${EMBER}33` : r.passou ? "#4A7A4E22" : "#00000040",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: PARCHMENT, fontSize: 13,
                        }}>{r.die}</div>
                        <div style={{ fontSize: 8, color: MUTED }}>vs Res. Mágica {r.resistValor}</div>
                        <div style={{ fontSize: 8, color: r.passou ? "#4A7A4E" : MUTED }}>{r.passou ? "+1 ferida" : "falha"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ textAlign: "center", borderTop: `1px solid ${LINE}`, paddingTop: 10 }}>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: 16, color: result.causaDano ? BRASS_BRIGHT : result.contato ? "#5C86B0" : MUTED }}>
                  {result.successes === 0
                    ? "Acerto falhou — sem sucesso algum"
                    : result.causaDano
                      ? `Causa dano! ${result.confirmedHits} confirmação${result.confirmedHits > 1 ? "ões" : ""} passaram — Ferida: ${result.feridaValor}`
                      : "CONTATO — acertou, mas nenhuma confirmação passou"}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   COMPARATIVO — Confronto Direto (1v1)
----------------------------------------------------------------*/
const EDITABLE_OPPONENT_ID = "__editavel__";

const EDITABLE_ATTR_DEFAULTS = {};

function makeEditableOpponent(stats) {
  return {
    id: EDITABLE_OPPONENT_ID,
    name: "Editável",
    epithet: "Oponente customizado",
    faction: "—",
    singularity: { name: "—", level: "E", description: "Oponente genérico para testar Acerto/Defesa/Resistência sem precisar de uma ficha completa." },
    attributes: { ...EDITABLE_ATTR_DEFAULTS, ...stats.attributes },
    atributosGerais: { ...ATRIBUTOS_GERAIS_DEFAULT, ...stats.atributosGerais },
    proficiencias: { ...PROFICIENCIAS_DEFAULT, ...stats.proficiencias },
    statBase: { acerto: 0, defesa: stats.defesa, resistArmadura: stats.resistArmadura, resistNaturalFisica: stats.resistNatural, resistNaturalMagica: stats.resistNatural, geral: 0 },
    statTemp: { acerto: 0, defesa: 0, resistArmadura: 0, resistNaturalFisica: 0, resistNaturalMagica: 0, geral: 0 },
    statLinks: { acerto: [], defesa: [], resistArmadura: [], resistNaturalFisica: [], resistNaturalMagica: [], geral: [] },
    itens: { usaveis: [], principais: [], armadura: stats.usaArmadura ? ["Armadura de teste"] : [] },
    attacks: [],
    abilities: [],
    procs: stats.procs || [],
  };
}

function CompareView({ characters, onUpdateCharacter }) {
  const [aId, setAId] = useState(characters[0]?.id || "");
  const [bId, setBId] = useState(EDITABLE_OPPONENT_ID);
  const [editableStats, setEditableStats] = useState({
    defesa: 8, resistNatural: 6, resistArmadura: 8, usaArmadura: true,
    attributes: { ...EDITABLE_ATTR_DEFAULTS },
    atributosGerais: { ...ATRIBUTOS_GERAIS_DEFAULT },
    proficiencias: { ...PROFICIENCIAS_DEFAULT },
    procs: [],
  });


  const selectOptions = [{ id: EDITABLE_OPPONENT_ID, name: "Editável (oponente customizado)" }, ...characters];
  const editableOpponent = makeEditableOpponent(editableStats);
  const a = aId === EDITABLE_OPPONENT_ID ? editableOpponent : characters.find((c) => c.id === aId);
  const b = bId === EDITABLE_OPPONENT_ID ? editableOpponent : characters.find((c) => c.id === bId);

  function updateEditableStat(key, value) {
    setEditableStats((prev) => ({ ...prev, [key]: Number(value) || 0 }));
  }
  function updateEditableAttr(key, grade) {
    setEditableStats((prev) => ({ ...prev, attributes: { ...prev.attributes, [key]: grade } }));
  }
  function updateEditableAtributoGeral(key, grade) {
    setEditableStats((prev) => ({ ...prev, atributosGerais: { ...prev.atributosGerais, [key]: grade } }));
  }
  function updateEditableProficiencia(key, grade) {
    setEditableStats((prev) => ({ ...prev, proficiencias: { ...prev.proficiencias, [key]: grade } }));
  }
  function toggleEditableProc(procId) {
    setEditableStats((prev) => {
      const cur = prev.procs || [];
      const next = cur.includes(procId) ? cur.filter((id) => id !== procId) : [...cur, procId].slice(0, 2);
      return { ...prev, procs: next };
    });
  }

  return (
    <div>
      <SectionTitle icon={Swords}>Confronto</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 16, marginBottom: 8, alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 10.5, color: MUTED, marginBottom: 4, fontFamily: "'IBM Plex Mono', monospace" }}>ATACANTE</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {a?.imageUrl && (
              <img
                src={a.imageUrl} alt={a.name}
                style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", border: `1px solid ${LINE}`, flexShrink: 0 }}
                onError={(e) => { e.target.style.display = "none"; }}
              />
            )}
            <select style={inputStyle} value={aId} onChange={(e) => setAId(e.target.value)}>
              {selectOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <Btn variant="ghost" onClick={() => { setAId(bId); setBId(aId); }} style={{ marginTop: 16 }} title="Trocar lados">⇄</Btn>
        <div>
          <div style={{ fontSize: 10.5, color: MUTED, marginBottom: 4, fontFamily: "'IBM Plex Mono', monospace" }}>DEFENSOR</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {b?.imageUrl && (
              <img
                src={b.imageUrl} alt={b.name}
                style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", border: `1px solid ${LINE}`, flexShrink: 0 }}
                onError={(e) => { e.target.style.display = "none"; }}
              />
            )}
            <select style={inputStyle} value={bId} onChange={(e) => setBId(e.target.value)}>
              {selectOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {(aId === EDITABLE_OPPONENT_ID || bId === EDITABLE_OPPONENT_ID) && (
        <div style={{ background: `${BRASS}18`, border: `1px solid ${BRASS}`, borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 10.5, color: BRASS_BRIGHT, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.5, marginBottom: 8, textTransform: "uppercase" }}>
            Valores do oponente Editável
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <Field label="Defesa">
              <input type="number" style={inputStyle} value={editableStats.defesa} onChange={(e) => updateEditableStat("defesa", e.target.value)} />
            </Field>
            <Field label="Resistência Natural">
              <input type="number" style={inputStyle} value={editableStats.resistNatural} onChange={(e) => updateEditableStat("resistNatural", e.target.value)} />
            </Field>
            <Field label="Resistência Armadura">
              <input type="number" style={inputStyle} value={editableStats.resistArmadura} onChange={(e) => updateEditableStat("resistArmadura", e.target.value)} disabled={!editableStats.usaArmadura} />
            </Field>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 12, color: PARCHMENT }}>
            <input type="checkbox" checked={editableStats.usaArmadura} onChange={(e) => setEditableStats((prev) => ({ ...prev, usaArmadura: e.target.checked }))} />
            Possui armadura equipada (as confirmações checam a Armadura primeiro, até uma romper — daí em diante checa a Resistência Natural)
          </label>

          <div style={{ fontSize: 10.5, color: BRASS_BRIGHT, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.5, margin: "14px 0 8px", textTransform: "uppercase" }}>
            Atributos Gerais (Força/Destreza agora moram aqui)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 12 }}>
            {ATRIBUTOS_GERAIS_LIST.map((attr) => (
              <Field key={attr.key} label={attr.label}>
                <select style={inputStyle} value={editableStats.atributosGerais[attr.key]} onChange={(e) => updateEditableAtributoGeral(attr.key, e.target.value)}>
                  {GRADE_ORDER.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>
            ))}
          </div>

          <div style={{ fontSize: 10.5, color: BRASS_BRIGHT, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.5, margin: "14px 0 8px", textTransform: "uppercase" }}>
            Proficiências de Combate
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 12 }}>
            {PROFICIENCIAS_LIST.filter((p) => p.categoria === "combate").map((p) => (
              <Field key={p.key} label={p.label}>
                <select style={inputStyle} value={editableStats.proficiencias[p.key]} onChange={(e) => updateEditableProficiencia(p.key, e.target.value)}>
                  {GRADE_ORDER.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>
            ))}
          </div>

          <div style={{ fontSize: 10.5, color: BRASS_BRIGHT, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.5, margin: "14px 0 8px", textTransform: "uppercase" }}>
            Habilidades Passivas de Combate (até 2)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {PROC_ABILITIES_AGRUPADAS.map((p) => {
              const checked = (editableStats.procs || []).includes(p.id);
              const atLimit = !checked && (editableStats.procs || []).length >= 2;
              const limiar = limiarDaHabilidade({ attributes: editableStats.attributes, atributosGerais: editableStats.atributosGerais }, p);
              const attrLabel = attrLabelDaHabilidade(p);
              return (
                <label key={p.id} style={{
                  display: "block", padding: 8, borderRadius: 6, cursor: atLimit ? "not-allowed" : "pointer",
                  background: checked ? `${PURPLE}18` : "#00000010", border: `1px solid ${checked ? PURPLE : LINE}`,
                  opacity: atLimit ? 0.5 : 1,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input type="checkbox" checked={checked} disabled={atLimit} onChange={() => toggleEditableProc(p.id)} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: PARCHMENT }}>{p.nome}</span>
                    </div>
                    <span style={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace" }}>
                      <HabilidadeCategoriaBadge p={p} />
                      {p.prioridade ? <span style={{ color: MUTED }}> · prio. {p.prioridade}</span> : null}
                    </span>
                  </div>
                  <div style={{ fontSize: 9, color: PURPLE, fontFamily: "'IBM Plex Mono', monospace", margin: "2px 0" }}>
                    {p.reduzCriticoEm
                      ? `Reduz o crítico em ${p.reduzCriticoEm} (em todos os críticos da rolagem)`
                      : p.gatilho?.startsWith("passivo_")
                      ? "Sempre ativa (não depende de dado)"
                      : p.gatilho === "contato_proprio"
                      ? `Dispara sempre ao fazer contato${p.restricaoTipo ? ` com ataque ${TIPOS_ATAQUE[p.restricaoTipo]?.label}` : ""}`
                      : `Dispara com dado ≥${limiar} (${attrLabel})${p.restricaoTipo ? ` · só ${TIPOS_ATAQUE[p.restricaoTipo]?.label}` : ""}`}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {a && b && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 16 }}>
            {[a, b].map((ch, side) => (
              <div key={ch.id} style={{ background: PANEL_2, border: `1px solid ${LINE}`, borderRadius: 8, padding: 16, order: side === 0 ? 0 : 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 8, background: PANEL, border: `1px solid ${LINE}`,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden",
                  }}>
                    {ch.imageUrl ? (
                      <img src={ch.imageUrl} alt={ch.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; }} />
                    ) : (
                      <ShieldHalf size={22} color={FACTION_SEAL[ch.faction] || BRASS} />
                    )}
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Cinzel', serif", fontSize: 15, color: PARCHMENT }}>{ch.name}</div>
                    <div style={{ fontSize: 11, color: BRASS, fontStyle: "italic" }}>{ch.epithet}</div>
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: tierColor(ch.singularity.level), marginBottom: 8, fontFamily: "'IBM Plex Mono', monospace" }}>
                  Singularidade: {ch.singularity.name} ({ch.singularity.level})
                </div>
                {ATRIBUTOS_GERAIS_LIST.filter((attr) => attr.categoria === "fisica").map((attr) => {
                  const outro = (side === 0 ? b : a);
                  const otherVal = GRADE_VALUE[outro.atributosGerais?.[attr.key]] || 1;
                  const thisVal = GRADE_VALUE[ch.atributosGerais?.[attr.key]] || 1;
                  return <AttrBar key={attr.key} label={attr.label} grade={ch.atributosGerais?.[attr.key] || "E"} highlight={thisVal > otherVal} />;
                })}
                {PROFICIENCIAS_LIST.filter((p) => p.categoria === "combate").map((p) => {
                  const outro = (side === 0 ? b : a);
                  const otherVal = GRADE_VALUE[outro.proficiencias?.[p.key]] || 1;
                  const thisVal = GRADE_VALUE[ch.proficiencias?.[p.key]] || 1;
                  return <AttrBar key={p.key} label={p.label} grade={ch.proficiencias?.[p.key] || "E"} highlight={thisVal > otherVal} />;
                })}
                <div style={{ marginTop: 10 }}>
                  <StatBlock character={ch} />
                </div>
                <div style={{ marginTop: 10, fontSize: 11, color: MUTED }}>
                  {ch.abilities.slice(0, 4).map((ab, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                      <span>{ab.name}</span><span style={{ color: GRADE_COLOR[ab.grade] || BRASS }}>{ab.grade}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", order: 1 }}>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 22, color: EMBER }}>VS</span>
            </div>
          </div>

          <DuelRoller key={`${a.id}-${b.id}`} a={a} b={b} onUpdateCharacter={onUpdateCharacter} />
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   MUNDO — reinos e cidades
----------------------------------------------------------------*/
function WorldView({ kingdoms, setKingdoms, askConfirm }) {
  const [openId, setOpenId] = useState(null);
  const [newCity, setNewCity] = useState({});

  function addCity(kid) {
    const draft = newCity[kid];
    if (!draft?.name) return;
    setKingdoms((prev) => prev.map((k) => k.id === kid ? { ...k, cities: [...k.cities, { name: draft.name, description: draft.description || "" }] } : k));
    setNewCity((p) => ({ ...p, [kid]: { name: "", description: "" } }));
  }
  function removeCity(kid, idx, cityName) {
    askConfirm(`Remover a cidade "${cityName}"? Essa ação não pode ser desfeita.`, () => {
      setKingdoms((prev) => prev.map((k) => k.id === kid ? { ...k, cities: k.cities.filter((_, i) => i !== idx) } : k));
    });
  }
  function updateDescription(kid, value) {
    setKingdoms((prev) => prev.map((k) => k.id === kid ? { ...k, description: value } : k));
  }

  return (
    <div>
      <SectionTitle icon={MapIcon}>Mapa do Mundo</SectionTitle>
      <div style={{
        height: 220, borderRadius: 8, border: `1px dashed ${LINE}`, background: PANEL_2,
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, color: MUTED, fontSize: 12.5,
        flexDirection: "column", gap: 6,
      }}>
        <MapIcon size={26} color={MUTED} />
        Espaço reservado para a imagem do mapa do mundo de Amaranth.
      </div>

      {kingdoms.map((k) => {
        const open = openId === k.id;
        return (
          <div key={k.id} style={{ border: `1px solid ${LINE}`, borderRadius: 8, marginBottom: 10, overflow: "hidden" }}>
            <button
              onClick={() => setOpenId(open ? null : k.id)}
              style={{
                width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 16px", background: PANEL_2, border: "none", cursor: "pointer",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Landmark size={16} color={FACTION_SEAL[k.name] || BRASS} />
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: 14, color: PARCHMENT }}>{k.name}</span>
              </span>
              {open ? <ChevronDown size={16} color={MUTED} /> : <ChevronRight size={16} color={MUTED} />}
            </button>
            {open && (
              <div style={{ padding: 16, background: "#00000020" }}>
                <textarea
                  style={{ ...inputStyle, minHeight: 70, resize: "vertical", marginBottom: 12 }}
                  value={k.description}
                  onChange={(e) => updateDescription(k.id, e.target.value)}
                />
                <div style={{ fontSize: 11, color: MUTED, marginBottom: 8, fontFamily: "'IBM Plex Mono', monospace" }}>CIDADES</div>
                {k.cities.map((city, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${LINE}` }}>
                    <div>
                      <div style={{ fontSize: 13, color: PARCHMENT, fontWeight: 600 }}>{city.name}</div>
                      <div style={{ fontSize: 11.5, color: MUTED }}>{city.description}</div>
                    </div>
                    <Btn variant="ghost" onClick={() => removeCity(k.id, idx, city.name)}><X size={13} /></Btn>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <input
                    style={inputStyle} placeholder="Nova cidade"
                    value={newCity[k.id]?.name || ""}
                    onChange={(e) => setNewCity((p) => ({ ...p, [k.id]: { ...p[k.id], name: e.target.value } }))}
                  />
                  <input
                    style={inputStyle} placeholder="Descrição curta"
                    value={newCity[k.id]?.description || ""}
                    onChange={(e) => setNewCity((p) => ({ ...p, [k.id]: { ...p[k.id], description: e.target.value } }))}
                  />
                  <Btn onClick={() => addCity(k.id)}><Plus size={13} /></Btn>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------
   DEUSES
----------------------------------------------------------------*/
function GodsView({ gods, setGods, askConfirm }) {
  const [editing, setEditing] = useState(null);

  function addGod() {
    const g = { id: `god_${Date.now()}`, name: "Novo Deus", domain: "", description: "" };
    setGods((prev) => [...prev, g]);
    setEditing(g.id);
  }
  function update(id, key, value) {
    setGods((prev) => prev.map((g) => g.id === id ? { ...g, [key]: value } : g));
  }
  function remove(id, name) {
    askConfirm(`Remover o deus "${name}" do panteão? Essa ação não pode ser desfeita.`, () => {
      setGods((prev) => prev.filter((g) => g.id !== id));
    });
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SectionTitle icon={Sparkles}>Panteão</SectionTitle>
        <Btn variant="primary" onClick={addGod} style={{ marginBottom: 10 }}><Plus size={13} /> Novo Deus</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {gods.map((g) => (
          <div key={g.id} style={{ background: PANEL_2, border: `1px solid ${LINE}`, borderRadius: 8, padding: 14 }}>
            {editing === g.id ? (
              <>
                <input style={{ ...inputStyle, marginBottom: 8, fontWeight: 700 }} value={g.name} onChange={(e) => update(g.id, "name", e.target.value)} />
                <input style={{ ...inputStyle, marginBottom: 8 }} placeholder="Domínio" value={g.domain} onChange={(e) => update(g.id, "domain", e.target.value)} />
                <textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} value={g.description} onChange={(e) => update(g.id, "description", e.target.value)} />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 8 }}>
                  <Btn variant="primary" onClick={() => setEditing(null)}><Save size={12} /></Btn>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: 16, color: BRASS_BRIGHT }}>{g.name}</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <Btn variant="ghost" onClick={() => setEditing(g.id)}><Pencil size={13} /></Btn>
                    <Btn variant="ghost" onClick={() => remove(g.id, g.name)}><Trash2 size={13} /></Btn>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: BRASS, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 8 }}>{g.domain}</div>
                <p style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.5, margin: 0 }}>{g.description}</p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   CAPA — hero + vitrine do Grupo C
----------------------------------------------------------------*/
function CoverView({ characters, onOpenCharacter }) {
  const roster = GRUPO_C_ORDER
    .map((id) => characters.find((c) => c.id === id))
    .filter(Boolean)
    .concat(characters.filter((c) => !GRUPO_C_ORDER.includes(c.id)));

  return (
    <div>
      <div style={{
        position: "relative", borderRadius: 10, overflow: "hidden", padding: "36px 28px",
        background: `radial-gradient(ellipse at 30% 20%, #00000018 0%, transparent 55%), linear-gradient(160deg, ${PURPLE} 0%, ${PURPLE_LIGHT} 100%)`,
        border: `1px solid ${LINE}`, marginBottom: 28, textAlign: "center",
      }}>
        <div style={{ fontSize: 11, letterSpacing: 4, color: `${PURPLE_TEXT}99`, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 8 }}>UNIVERSO AMARANTH</div>
        <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: 40, letterSpacing: 6, color: "#F0D98C", margin: "0 0 8px", textShadow: `0 2px 8px #00000040` }}>POINT</h1>
        <p style={{ color: PURPLE_TEXT, fontSize: 13.5, maxWidth: 480, margin: "0 auto", lineHeight: 1.6, fontStyle: "italic" }}>
          Dossiês táticos, singularidades e o destino dos Cavaleiros de Omem, reunidos num só lugar.
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <Crown size={16} color={BRASS} />
        <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 13, letterSpacing: 1.5, textTransform: "uppercase", color: BRASS_BRIGHT, margin: 0 }}>
          Vitrine do Grupo C
        </h3>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 14 }}>
        {roster.map((c) => {
          const role = GRUPO_C_ROLE[c.id];
          return (
            <button
              key={c.id}
              onClick={() => onOpenCharacter(c.id)}
              style={{
                position: "relative", textAlign: "left", cursor: "pointer", color: "inherit",
                background: PANEL_2, border: `1px solid ${role ? BRASS : LINE}`, borderRadius: 8,
                padding: "16px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                boxShadow: role ? `0 0 14px ${BRASS}33` : "none",
              }}
            >
              {role && (
                <span style={{
                  position: "absolute", top: -9, display: "flex", alignItems: "center", gap: 3,
                  background: PURPLE, border: `1px solid ${BRASS}`, borderRadius: 20, padding: "2px 8px",
                  fontSize: 9, color: "#F0D98C", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.5,
                }}>
                  <Crown size={9} /> {role.includes("Sub") ? "SUB-LÍDER" : "LÍDER"}
                </span>
              )}
              <div style={{
                width: 54, height: 54, borderRadius: "50%", background: "#00000030",
                border: `2px solid ${FACTION_SEAL[c.faction] || BRASS}`, display: "flex",
                alignItems: "center", justifyContent: "center", marginTop: role ? 6 : 0,
              }}>
                <ShieldHalf size={24} color={FACTION_SEAL[c.faction] || BRASS} />
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: 12.5, color: PARCHMENT, lineHeight: 1.3 }}>{c.name}</div>
                <div style={{ fontSize: 10, color: BRASS, fontStyle: "italic", marginTop: 2, lineHeight: 1.3 }}>{c.epithet}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   SAGAS — resumo dos acontecimentos de cada arco da campanha
----------------------------------------------------------------*/
const SAGA_STATUS_COLOR = { "Em andamento": BRASS_BRIGHT, "Concluída": "#7C8F7A", "Planejada": MUTED };

function SagasView({ sagas, setSagas, askConfirm }) {
  const [editing, setEditing] = useState(null);
  const [openId, setOpenId] = useState(sagas[0]?.id || null);

  function addSaga() {
    const s = { id: `saga_${Date.now()}`, title: "Nova Saga", status: "Planejada", summary: "" };
    setSagas((prev) => [...prev, s]);
    setEditing(s.id);
    setOpenId(s.id);
  }
  function update(id, key, value) {
    setSagas((prev) => prev.map((s) => s.id === id ? { ...s, [key]: value } : s));
  }
  function remove(id, title) {
    askConfirm(`Remover a saga "${title}"? Essa ação não pode ser desfeita.`, () => {
      setSagas((prev) => prev.filter((s) => s.id !== id));
    });
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SectionTitle icon={ScrollText}>Sagas</SectionTitle>
        <Btn variant="primary" onClick={addSaga} style={{ marginBottom: 10 }}><Plus size={13} /> Nova Saga</Btn>
      </div>

      {sagas.length === 0 && <p style={{ color: MUTED, fontSize: 12.5 }}>Nenhuma saga registrada ainda.</p>}

      {sagas.map((s) => {
        const open = openId === s.id;
        const isEditing = editing === s.id;
        return (
          <div key={s.id} style={{ border: `1px solid ${LINE}`, borderRadius: 8, marginBottom: 10, overflow: "hidden" }}>
            <button
              onClick={() => setOpenId(open ? null : s.id)}
              style={{
                width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 16px", background: PANEL_2, border: "none", cursor: "pointer",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ScrollText size={16} color={BRASS} />
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: 14, color: PARCHMENT }}>{s.title}</span>
                <span style={{
                  fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "2px 8px", borderRadius: 20,
                  border: `1px solid ${SAGA_STATUS_COLOR[s.status] || MUTED}`, color: SAGA_STATUS_COLOR[s.status] || MUTED,
                }}>{s.status}</span>
              </span>
              {open ? <ChevronDown size={16} color={MUTED} /> : <ChevronRight size={16} color={MUTED} />}
            </button>

            {open && (
              <div style={{ padding: 16, background: "#00000020" }}>
                {isEditing ? (
                  <>
                    <Field label="Título">
                      <input style={inputStyle} value={s.title} onChange={(e) => update(s.id, "title", e.target.value)} />
                    </Field>
                    <Field label="Status">
                      <select style={inputStyle} value={s.status} onChange={(e) => update(s.id, "status", e.target.value)}>
                        {Object.keys(SAGA_STATUS_COLOR).map((st) => <option key={st} value={st}>{st}</option>)}
                      </select>
                    </Field>
                    <Field label="Resumo dos acontecimentos">
                      <textarea style={{ ...inputStyle, minHeight: 140, resize: "vertical" }} value={s.summary} onChange={(e) => update(s.id, "summary", e.target.value)} />
                    </Field>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <Btn variant="primary" onClick={() => setEditing(null)}><Save size={12} /> Salvar</Btn>
                    </div>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, whiteSpace: "pre-wrap", margin: "0 0 14px" }}>
                      {s.summary || "Sem resumo ainda — clique em Editar para adicionar."}
                    </p>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                      <Btn variant="ghost" onClick={() => setEditing(s.id)}><Pencil size={13} /> Editar</Btn>
                      <Btn variant="danger" onClick={() => remove(s.id, s.title)}><Trash2 size={13} /> Excluir</Btn>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------
   OBJETIVOS — rastreador de metas ativas do grupo
----------------------------------------------------------------*/
const OBJ_STATUS = ["Ativo", "Pausado", "Concluído"];
const OBJ_STATUS_COLOR = { "Ativo": BRASS_BRIGHT, "Pausado": "#B0784F", "Concluído": "#7C8F7A" };

function ObjectivesView({ objectives, setObjectives, askConfirm }) {
  const [editing, setEditing] = useState(null);

  function addObjective() {
    const o = { id: `obj_${Date.now()}`, title: "Novo Objetivo", status: "Ativo", description: "" };
    setObjectives((prev) => [o, ...prev]);
    setEditing(o.id);
  }
  function update(id, key, value) {
    setObjectives((prev) => prev.map((o) => o.id === id ? { ...o, [key]: value } : o));
  }
  function remove(id, title) {
    askConfirm(`Remover o objetivo "${title}"? Essa ação não pode ser desfeita.`, () => {
      setObjectives((prev) => prev.filter((o) => o.id !== id));
    });
  }
  function cycleStatus(o) {
    const idx = OBJ_STATUS.indexOf(o.status);
    update(o.id, "status", OBJ_STATUS[(idx + 1) % OBJ_STATUS.length]);
  }

  const active = objectives.filter((o) => o.status === "Ativo");
  const others = objectives.filter((o) => o.status !== "Ativo");

  function renderCard(o) {
    const isEditing = editing === o.id;
    const color = OBJ_STATUS_COLOR[o.status];
    return (
      <div key={o.id} style={{
        background: PANEL_2, border: `1px solid ${o.status === "Ativo" ? BRASS : LINE}`, borderRadius: 8,
        padding: 14, marginBottom: 10, opacity: o.status === "Concluído" ? 0.7 : 1,
      }}>
        {isEditing ? (
          <>
            <input style={{ ...inputStyle, marginBottom: 8, fontWeight: 700 }} value={o.title} onChange={(e) => update(o.id, "title", e.target.value)} />
            <select style={{ ...inputStyle, marginBottom: 8 }} value={o.status} onChange={(e) => update(o.id, "status", e.target.value)}>
              {OBJ_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} value={o.description} onChange={(e) => update(o.id, "description", e.target.value)} />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <Btn variant="primary" onClick={() => setEditing(null)}><Save size={12} /> Salvar</Btn>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => cycleStatus(o)}
                  title="Clique para mudar o status"
                  style={{
                    width: 22, height: 22, borderRadius: "50%", border: `2px solid ${color}`, background: "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
                  }}
                >
                  {o.status === "Concluído" && <Check size={13} color={color} />}
                </button>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: 14, color: PARCHMENT, textDecoration: o.status === "Concluído" ? "line-through" : "none" }}>{o.title}</span>
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <Btn variant="ghost" onClick={() => setEditing(o.id)}><Pencil size={12} /></Btn>
                <Btn variant="ghost" onClick={() => remove(o.id, o.title)}><Trash2 size={12} /></Btn>
              </div>
            </div>
            {o.description && <p style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.5, margin: "8px 0 0 30px" }}>{o.description}</p>}
            <div style={{ marginLeft: 30, marginTop: 6 }}>
              <span style={{
                fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "2px 8px", borderRadius: 20,
                border: `1px solid ${color}`, color,
              }}>{o.status}</span>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SectionTitle icon={Target}>Objetivos do Grupo</SectionTitle>
        <Btn variant="primary" onClick={addObjective} style={{ marginBottom: 10 }}><Plus size={13} /> Novo Objetivo</Btn>
      </div>

      {active.length === 0 && others.length === 0 && <p style={{ color: MUTED, fontSize: 12.5 }}>Nenhum objetivo registrado ainda.</p>}

      {active.length > 0 && (
        <>
          <div style={{ fontSize: 10.5, color: MUTED, marginBottom: 8, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 1 }}>EM ANDAMENTO</div>
          {active.map(renderCard)}
        </>
      )}
      {others.length > 0 && (
        <>
          <div style={{ fontSize: 10.5, color: MUTED, margin: "18px 0 8px", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 1 }}>PAUSADOS / CONCLUÍDOS</div>
          {others.map(renderCard)}
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   HABILIDADES — catálogo de referência (Habilidades Conhecidas)
----------------------------------------------------------------*/
function AbilityCatalogCard({ ability }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: PANEL_2, border: `1px solid ${LINE}`, borderRadius: 8, padding: 12, marginBottom: 8 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ background: "transparent", border: "none", cursor: "pointer", width: "100%", textAlign: "left", padding: 0, color: "inherit" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 13.5, color: PARCHMENT }}>{ability.name}</span>
            {!ability.reviewed && <span style={{ marginLeft: 8, fontSize: 9.5, color: EMBER, fontFamily: "'IBM Plex Mono', monospace" }}>NÃO REVISADO</span>}
            {ability.revisado_v2 && <span style={{ marginLeft: 8, fontSize: 9.5, color: BRASS_BRIGHT, fontFamily: "'IBM Plex Mono', monospace" }}>ADAPTADA v2</span>}
          </div>
          {open ? <ChevronDown size={14} color={MUTED} /> : <ChevronRight size={14} color={MUTED} />}
        </div>
        <div style={{ fontSize: 10.5, color: BRASS, fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>
          {ability.category === "ativa" ? "Ativa" : "Passiva"} · {ability.subtype}{ability.cost ? ` · ${ability.cost}` : ""}
        </div>
      </button>
      {open && (
        <div style={{ marginTop: 8, borderTop: `1px solid ${LINE}`, paddingTop: 8 }}>
          {ability.intro && <p style={{ fontSize: 12.5, color: MUTED, margin: "0 0 8px", lineHeight: 1.5 }}>{ability.intro}</p>}
          {ability.tiers.map((t, i) => (
            <div key={i} style={{ fontSize: 12, color: PARCHMENT, marginBottom: 4, paddingLeft: 8, borderLeft: `2px solid ${LINE}` }}>{t}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function AbilitiesCatalogView() {
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState("Todas");
  const [revFilter, setRevFilter] = useState("Todas");
  const [procCatFilter, setProcCatFilter] = useState("todas");

  const procsOrdenados = useMemo(() => {
    return [...PROC_ABILITIES]
      .filter((p) => procCatFilter === "todas" || categoriaDaHabilidade(p) === procCatFilter)
      .sort((a, b) => CATEGORIA_ORDEM.indexOf(categoriaDaHabilidade(a)) - CATEGORIA_ORDEM.indexOf(categoriaDaHabilidade(b)));
  }, [procCatFilter]);

  const filtered = useMemo(() => {
    return ABILITIES_CATALOG.filter((a) => {
      const matchQuery = !query.trim() || a.name.toLowerCase().includes(query.toLowerCase());
      const matchCat = catFilter === "Todas" || a.category === catFilter;
      const matchRev = revFilter === "Todas" || (revFilter === "v2" ? !!a.revisado_v2 : !a.revisado_v2);
      return matchQuery && matchCat && matchRev;
    });
  }, [query, catFilter, revFilter]);

  const countV2 = ABILITIES_CATALOG.filter((a) => a.revisado_v2).length;

  return (
    <div>
      <SectionTitle icon={Sparkles}>Habilidades Passivas de Combate (catálogo atual)</SectionTitle>
      <p style={{ fontSize: 11.5, color: MUTED, margin: "-4px 0 14px" }}>
        Sistema em uso agora: cada ficha escolhe até 2 dessas + a Singularidade conta como a 3ª habilidade ativa. A maioria dispara sozinha quando um dado já rolado (Acerto ou Confirmação) bate um limiar ligado a um atributo — sem rolagem extra. O Mestre em Armadura é sempre ativa, sem limiar nenhum. Se duas pudessem disparar no mesmo dado, só a de maior prioridade ativa.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {["todas", ...CATEGORIA_ORDEM].map((catKey) => {
          const info = catKey === "todas" ? { label: "Todas", icon: null, color: BRASS } : HABILIDADE_CATEGORIA_INFO[catKey];
          const active = procCatFilter === catKey;
          const Icon = info.icon;
          return (
            <button
              key={catKey}
              onClick={() => setProcCatFilter(catKey)}
              style={{
                display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, padding: "5px 12px", borderRadius: 20, cursor: "pointer",
                border: `1px solid ${active ? info.color : LINE}`,
                background: active ? `${info.color}22` : "transparent",
                color: active ? info.color : MUTED, fontFamily: "'IBM Plex Mono', monospace", fontWeight: active ? 700 : 400,
              }}
            >
              {Icon && <Icon size={12} color={active ? info.color : MUTED} />} {info.label}
            </button>
          );
        })}
      </div>

      {procsOrdenados.map((p) => {
        const attrLabel = attrLabelDaHabilidade(p);
        return (
          <div key={p.id} style={{ background: PANEL_2, border: `1px solid ${HABILIDADE_CATEGORIA_INFO[categoriaDaHabilidade(p)].color}55`, borderRadius: 8, padding: 12, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 13.5, color: PARCHMENT }}>{p.nome}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
                <HabilidadeCategoriaBadge p={p} />
                {p.prioridade && <span style={{ color: MUTED }}>prioridade {p.prioridade}</span>}
              </span>
            </div>
            <div style={{ fontSize: 10.5, color: PURPLE, fontFamily: "'IBM Plex Mono', monospace", margin: "4px 0" }}>
              {p.reduzCriticoEm
                ? `Reduz o crítico em ${p.reduzCriticoEm} (em todos os críticos da rolagem)`
                : p.gatilho?.startsWith("passivo_")
                ? "Gatilho: sempre ativa, não depende de dado"
                : p.gatilho === "contato_proprio"
                ? `Gatilho: sempre ao fazer contato${p.restricaoTipo ? ` · só ${TIPOS_ATAQUE[p.restricaoTipo]?.label}` : ""}`
                : `Gatilho: ${p.gatilho.replace(/_/g, " ")} · Limiar por ${attrLabel}${p.restricaoTipo ? ` · só ${TIPOS_ATAQUE[p.restricaoTipo]?.label}` : ""}`}
            </div>
            <p style={{ fontSize: 12, color: MUTED, margin: 0, lineHeight: 1.5 }}>{p.efeito}</p>
          </div>
        );
      })}
      {procsOrdenados.length === 0 && <p style={{ color: MUTED, fontSize: 12.5 }}>Nenhuma habilidade nessa categoria.</p>}

      <details style={{ marginTop: 20 }}>
        <summary style={{ cursor: "pointer", fontFamily: "'Cinzel', serif", fontSize: 12.5, color: MUTED, letterSpacing: 0.5, textTransform: "uppercase", padding: "8px 0" }}>
          Catálogo antigo arquivado ({ABILITIES_CATALOG.length} habilidades — desativado, só referência)
        </summary>
        <div style={{ marginTop: 10 }}>
      <p style={{ fontSize: 11.5, color: MUTED, margin: "-4px 0 14px" }}>
        Referência extraída de HABILIDADES_CONHECIDAS.docx. {countV2} de {ABILITIES_CATALOG.length} habilidades foram adaptadas ao sistema anterior (E/D viravam efeitos situacionais, sem número fixo; C/B/A carregavam os bônus diretos na ficha). Esse sistema não está mais em uso ativo — as fichas agora usam o catálogo de Procs acima.
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <input style={{ ...inputStyle, maxWidth: 320 }} placeholder="Buscar habilidade..." value={query} onChange={(e) => setQuery(e.target.value)} />
        {["Todas", "ativa", "passiva"].map((cat) => (
          <button
            key={cat}
            onClick={() => setCatFilter(cat)}
            style={{
              fontSize: 11.5, padding: "5px 12px", borderRadius: 20, cursor: "pointer",
              border: `1px solid ${catFilter === cat ? BRASS : LINE}`,
              background: catFilter === cat ? `${BRASS}22` : "transparent",
              color: catFilter === cat ? BRASS_BRIGHT : MUTED, fontFamily: "'IBM Plex Mono', monospace",
            }}
          >{cat === "Todas" ? "Todas" : cat === "ativa" ? "Ativas" : "Passivas"}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {[["Todas", "Todas"], ["v2", "Adaptadas v2"], ["antiga", "Ainda no formato antigo"]].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setRevFilter(key)}
            style={{
              fontSize: 11.5, padding: "5px 12px", borderRadius: 20, cursor: "pointer",
              border: `1px solid ${revFilter === key ? BRASS_BRIGHT : LINE}`,
              background: revFilter === key ? `${BRASS}18` : "transparent",
              color: revFilter === key ? BRASS_BRIGHT : MUTED, fontFamily: "'IBM Plex Mono', monospace",
            }}
          >{label}</button>
        ))}
      </div>
      <div style={{ fontSize: 10.5, color: MUTED, marginBottom: 10 }}>{filtered.length} habilidade(s)</div>
      {filtered.map((a) => <AbilityCatalogCard key={a.id} ability={a} />)}
      {filtered.length === 0 && <p style={{ color: MUTED, fontSize: 12.5 }}>Nenhuma habilidade encontrada.</p>}
        </div>
      </details>
    </div>
  );
}

/* ---------------------------------------------------------------
   REGRAS — sistema, status e equipamentos (Ficha_Base + patch notes)
----------------------------------------------------------------*/
function RulesView() {
  return (
    <div>
      <SectionTitle icon={BookOpen}>Regras do Sistema</SectionTitle>
      <p style={{ fontSize: 13, color: PARCHMENT, marginBottom: 10 }}>{CORE_RULES.testeBasico}</p>

      <div style={{ background: `${BRASS}18`, border: `1px solid ${BRASS}`, borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 10.5, color: BRASS_BRIGHT, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.5, marginBottom: 6, textTransform: "uppercase" }}>Ajuste em uso neste app</div>
        <p style={{ fontSize: 12.5, color: PARCHMENT, margin: 0, lineHeight: 1.5 }}>{CORE_RULES.ajusteEmUso}</p>
      </div>

      <div style={{ fontSize: 11, color: BRASS, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.5, margin: "14px 0 6px", textTransform: "uppercase" }}>Recursos por rodada</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 14 }}>
        {CORE_RULES.recursos.map((r) => (
          <div key={r.nome} style={{ background: PANEL_2, border: `1px solid ${LINE}`, borderRadius: 6, padding: 10 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: PARCHMENT }}>{r.nome}</div>
            <div style={{ fontSize: 11.5, color: MUTED }}>{r.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: BRASS, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.5, margin: "14px 0 6px", textTransform: "uppercase" }}>Ordem da rodada</div>
      {CORE_RULES.rodada.map((f) => (
        <div key={f.fase} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: BRASS_BRIGHT }}>{f.fase}</div>
          <ul style={{ margin: "4px 0", paddingLeft: 18 }}>
            {f.passos.map((p, i) => <li key={i} style={{ fontSize: 12, color: MUTED, marginBottom: 2 }}>{p}</li>)}
          </ul>
        </div>
      ))}

      <div style={{ fontSize: 11, color: BRASS, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.5, margin: "14px 0 6px", textTransform: "uppercase" }}>Ação, acerto e confirmação</div>
      <ul style={{ margin: "0 0 14px", paddingLeft: 18 }}>
        {CORE_RULES.acao.map((p, i) => <li key={i} style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>{p}</li>)}
      </ul>

      <div style={{ fontSize: 11, color: BRASS, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.5, margin: "14px 0 6px", textTransform: "uppercase" }}>Ações extras (reações)</div>
      <ul style={{ margin: "0 0 14px", paddingLeft: 18 }}>
        {CORE_RULES.extras.map((p, i) => <li key={i} style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>{p}</li>)}
      </ul>

      <div style={{ fontSize: 11, color: BRASS, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.5, margin: "14px 0 6px", textTransform: "uppercase" }}>Termos gerais</div>
      <ul style={{ margin: "0 0 14px", paddingLeft: 18 }}>
        {CORE_RULES.termosGerais.map((p, i) => <li key={i} style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>{p}</li>)}
      </ul>

      <SectionTitle icon={Target}>Tipos de Ataque Base</SectionTitle>
      <p style={{ fontSize: 11.5, color: MUTED, margin: "-4px 0 10px" }}>
        Formas de atacar em sua forma genérica, sem personagem — cada um vira uma entrada na tabela de Ataques de quem aprender. "Acerto" é o bônus manual somado ao atributo escolhido; "Dano" é o bônus manual somado à Confirmação da ficha na rolagem de 1d10 por sucesso; "Ferida" é o valor causado por cada confirmação bem-sucedida.
      </p>
      {BASE_ATTACK_TYPES.map((t) => (
        <div key={t.id} style={{ background: PANEL_2, border: `1px solid ${LINE}`, borderRadius: 8, padding: 12, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 6 }}>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 13.5, color: PARCHMENT }}>{t.nome}</span>
            <span style={{ fontSize: 10, color: BRASS, fontFamily: "'IBM Plex Mono', monospace" }}>{t.categoria}</span>
          </div>
          <div style={{ fontSize: 11, color: MUTED, fontFamily: "'IBM Plex Mono', monospace", margin: "4px 0" }}>
            Tipo: {TIPOS_ATAQUE[t.tipo]?.label} · {t.tipoAtaque || (t.custoMp ? `${t.custoMp}MP` : "Físico")} · Acerto {t.acerto} · Dano {t.dano} · Ferida {t.ferida}
            {t.modificadores && ` · ${t.modificadores.join(", ")}`}
          </div>
          <p style={{ fontSize: 12, color: MUTED, margin: "4px 0 0", lineHeight: 1.4 }}>{t.descricao}</p>
          {t.cargaTest && (
            <p style={{ fontSize: 11, color: BRASS_BRIGHT, margin: "6px 0 0", fontStyle: "italic" }}>⚡ Carga: {t.cargaTest}</p>
          )}
        </div>
      ))}

      <SectionTitle icon={Flame}>Status e Efeitos</SectionTitle>
      {STATUS_EFFECTS.map((s) => (
        <div key={s.name} style={{ background: PANEL_2, border: `1px solid ${LINE}`, borderRadius: 8, padding: 12, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 13.5, color: BRASS_BRIGHT }}>{s.name}</span>
            <span style={{ fontSize: 10.5, color: MUTED, fontFamily: "'IBM Plex Mono', monospace" }}>Teste: {s.teste}</span>
          </div>
          <p style={{ fontSize: 12, color: MUTED, margin: "6px 0 0", lineHeight: 1.5 }}>{s.texto}</p>
        </div>
      ))}

      <SectionTitle icon={ShieldHalf}>Equipamentos</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: BRASS, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.5, marginBottom: 6, textTransform: "uppercase" }}>Armas</div>
          {EQUIPMENT_REFERENCE.armas.map((w) => (
            <div key={w.nome} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 12.5, color: PARCHMENT, fontWeight: 600 }}>{w.nome}</div>
              <div style={{ fontSize: 11.5, color: MUTED }}>{w.perfil}</div>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 11, color: BRASS, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.5, marginBottom: 6, textTransform: "uppercase" }}>Armaduras</div>
          {EQUIPMENT_REFERENCE.armaduras.map((w) => (
            <div key={w.nome} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 12.5, color: PARCHMENT, fontWeight: 600 }}>{w.nome}</div>
              <div style={{ fontSize: 11.5, color: MUTED }}>{w.perfil}</div>
            </div>
          ))}
        </div>
      </div>
      <ul style={{ margin: "0 0 10px", paddingLeft: 18 }}>
        {EQUIPMENT_REFERENCE.patchNotes.map((p, i) => <li key={i} style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>{p}</li>)}
      </ul>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {EQUIPMENT_REFERENCE.limites.map((p, i) => <li key={i} style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>{p}</li>)}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------
   APP PRINCIPAL
----------------------------------------------------------------*/
export default function App() {
  const [characters, setCharacters] = useState(SEED_CHARACTERS);
  const [kingdoms, setKingdoms] = useState(SEED_KINGDOMS);
  const [gods, setGods] = useState(SEED_GODS);
  const [sagas, setSagas] = useState(SEED_SAGAS);
  const [objectives, setObjectives] = useState(SEED_OBJECTIVES);
  const [tab, setTab] = useState("home");
  const [subView, setSubView] = useState("list");
  const [selectedId, setSelectedId] = useState(null);
  const [editingChar, setEditingChar] = useState(null);
  const [factionFilter, setFactionFilter] = useState("Todos");
  const [loaded, setLoaded] = useState(false);
  const [confirmState, setConfirmState] = useState(null);

  function askConfirm(message, action) {
    setConfirmState({ message, action });
  }

  useEffect(() => {
    (async () => {
      try {
        const c = await window.storage?.get("point-characters");
        if (c?.value) {
          const loadedChars = JSON.parse(c.value);
          // Migração automática e não-destrutiva:
          // 1) renomeia "Soco"→"Ataque desarmado" e "Mosquetão"→"Mosquete" (nomes antigos),
          //    e ajusta o Mosquetão/Revólver salvos para os novos valores de Acerto/Dano;
          // 2) remove "Chute" (agora redundante, já coberto por "Ataque desarmado");
          // 3) em ataques salvos no formato antigo (sem "tipo", com atributoBase/zona),
          //    identifica pelo nome e preenche o "tipo" correto (ou "marcial" se for
          //    um ataque customizado desconhecido) — a Ferida escalar ou não já vem
          //    direto do Tipo (Marcial escala, Arma de fogo/Mágico é fixa);
          // 4) preenche ataques padrão (Ataque desarmado/Arma branca/Revólver/Shin) em quem foi
          //    salvo antes dessa funcionalidade existir;
          // 5) corrige a base de Defesa (era 0, agora 5) e Resistência Natural (era 2 ou 6,
          //    agora 1, e agora dividida em Física/Mágica) pra quem ainda estava no valor
          //    padrão antigo — não mexe em quem já tinha um valor diferente (provavelmente
          //    editado manualmente);
          // 6) adiciona o item "Armadura física" em quem não tiver nenhuma armadura
          //    cadastrada em Itens — necessário pra Resistência Armadura contar no combate;
          // 7) converte atributos do formato antigo (Força/Percepção/Agilidade/Resistência/
          //    Inteligência/Determinação) pro novo formato Fire-Emblem-like (Força/Magia/
          //    Destreza/Técnica/Sorte/Defesa/Resistência Física/Resistência Mágica) —
          //    mapeamento: Percepção→Destreza, Agilidade→Técnica, Inteligência→Magia,
          //    Determinação→Sorte, Resistência→Física e Mágica (mesmo grau nas duas),
          //    Defesa (atributo novo) começa em "D" já que não existia antes.
          const NAME_ALIASES = { soco: "Ataque desarmado", mosquetão: "Mosquete", mosquetao: "Mosquete" };
          const REMOVED_NAMES = new Set(["chute"]);
          const OLD_DEFAULT_DEFESA = new Set([0, 5, undefined]);
          const OLD_DEFAULT_RESIST_NATURAL = new Set([1, 2, 6, undefined]);
          const OLD_DEFAULT_RESIST_ARMADURA = new Set([7, undefined]);
          const migrateAttributes = (attrs) => {
            if (!attrs || !attrs.percepcao) return attrs; // já está no formato novo (ou vazio)
            return {
              forca: attrs.forca || "E",
              magia: attrs.inteligencia || "E",
              destreza: attrs.percepcao || "E",
              tecnica: attrs.agilidade || "E",
              sorte: attrs.determinacao || "E",
              defesaAttr: "D",
              resistFisica: attrs.resistencia || "E",
              resistMagica: attrs.resistencia || "E",
            };
          };
          const migrated = loadedChars.map((ch) => {
            const isAlmah = ch.id === "almah" || (ch.name || "").trim().toLowerCase() === "almah mason";
            const withoutRemoved = (ch.attacks || []).filter((atk) => {
              const nomeLower = (atk.nome || "").trim().toLowerCase();
              if (REMOVED_NAMES.has(nomeLower)) return false;
              if (isAlmah && nomeLower === "ataque desarmado") return false; // pedido específico: Almah não tem desarmado
              return true;
            });
            const renamedAttacks = withoutRemoved.map((atk) => {
              const key = (atk.nome || "").trim().toLowerCase();
              const alias = NAME_ALIASES[key];
              if (!alias) return atk;
              // Ao renomear Mosquetão -> Mosquete, também atualiza os valores pros novos padrões.
              if (key === "mosquetão" || key === "mosquetao") {
                const base = BASE_ATTACK_TYPES.find((t) => t.id === "mosquetao");
                return { ...atk, nome: alias, acerto: base.acerto, dano: base.dano, ferida: base.ferida, tipo: base.tipo };
              }
              return { ...atk, nome: alias };
            });
            const fixedAttacks = renamedAttacks.map((atk) => {
              if (atk.tipo) return atk;
              const base = BASE_ATTACK_TYPES.find((t) => t.nome.trim().toLowerCase() === (atk.nome || "").trim().toLowerCase());
              return { ...atk, tipo: base?.tipo || "marcial" };
            });
            const existingNames = new Set(fixedAttacks.map((a) => (a.nome || "").trim().toLowerCase()));
            const missing = defaultAttacksForCharacter().filter((a) => {
              const nomeLower = a.nome.trim().toLowerCase();
              if (existingNames.has(nomeLower)) return false;
              if (isAlmah && nomeLower === "ataque desarmado") return false; // não repor pra Almah
              return true;
            });
            const statBase = { ...(ch.statBase || {}) };
            if (OLD_DEFAULT_DEFESA.has(statBase.defesa)) statBase.defesa = STAT_BASE_DEFAULTS.defesa;
            if (OLD_DEFAULT_RESIST_ARMADURA.has(statBase.resistArmadura)) statBase.resistArmadura = STAT_BASE_DEFAULTS.resistArmadura;
            if (statBase.resistNatural !== undefined && statBase.resistNaturalFisica === undefined) {
              // campo antigo unico -> divide nos dois novos, aplicando a mesma logica de "valor padrao antigo"
              const val = OLD_DEFAULT_RESIST_NATURAL.has(statBase.resistNatural) ? STAT_BASE_DEFAULTS.resistNaturalFisica : statBase.resistNatural;
              statBase.resistNaturalFisica = val;
              statBase.resistNaturalMagica = val;
              delete statBase.resistNatural;
            }
            if (OLD_DEFAULT_RESIST_NATURAL.has(statBase.resistNaturalFisica)) statBase.resistNaturalFisica = STAT_BASE_DEFAULTS.resistNaturalFisica;
            if (OLD_DEFAULT_RESIST_NATURAL.has(statBase.resistNaturalMagica)) statBase.resistNaturalMagica = STAT_BASE_DEFAULTS.resistNaturalMagica;
            const itensArmadura = (ch.itens?.armadura || []);
            const itens = itensArmadura.length > 0 ? ch.itens : { ...(ch.itens || { usaveis: [], principais: [] }), armadura: ["Armadura física"] };
            const attributes = migrateAttributes(ch.attributes);
            const procs = Array.isArray(ch.procs) ? ch.procs.slice(0, 2) : [];
            const atributosGerais = { ...ATRIBUTOS_GERAIS_DEFAULT, ...(ch.atributosGerais || {}) };
            const proficiencias = { ...PROFICIENCIAS_DEFAULT, ...(ch.proficiencias || {}) };
            return { ...ch, attacks: [...fixedAttacks, ...missing], statBase, itens, attributes, procs, atributosGerais, proficiencias };
          });
          // Reset de HP/MP/SP pedido nas sessões de revisão — roda só uma vez (marcado
          // por uma flag), pra não sobrescrever ajustes manuais feitos depois.
          // window.storage.get lança erro (não retorna null) quando a chave não existe,
          // então tratamos esse erro como "flag ainda não definida" = precisa resetar.
          let flagAlreadySet = false;
          try {
            const hpResetFlag = await window.storage?.get("point-hp-reset-v1");
            flagAlreadySet = !!hpResetFlag?.value;
          } catch (e) {
            flagAlreadySet = false;
          }
          let finalChars = migrated;
          if (!flagAlreadySet) {
            finalChars = migrated.map((ch) => ({
              ...ch,
              hp: { current: 3, max: 3 },
              mp: { current: 3, max: 3 },
              sp: { current: 3, max: 3 },
            }));
            try { await window.storage?.set("point-hp-reset-v1", "done"); } catch (e) {}
          }
          setCharacters(finalChars);
        }
      } catch (e) {}
      try {
        const k = await window.storage?.get("point-kingdoms");
        if (k?.value) setKingdoms(JSON.parse(k.value));
      } catch (e) {}
      try {
        const g = await window.storage?.get("point-gods");
        if (g?.value) setGods(JSON.parse(g.value));
      } catch (e) {}
      try {
        const s = await window.storage?.get("point-sagas");
        if (s?.value) setSagas(JSON.parse(s.value));
      } catch (e) {}
      try {
        const o = await window.storage?.get("point-objectives");
        if (o?.value) setObjectives(JSON.parse(o.value));
      } catch (e) {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (loaded) window.storage?.set("point-characters", JSON.stringify(characters)).catch(() => {}); }, [characters, loaded]);
  useEffect(() => { if (loaded) window.storage?.set("point-kingdoms", JSON.stringify(kingdoms)).catch(() => {}); }, [kingdoms, loaded]);
  useEffect(() => { if (loaded) window.storage?.set("point-gods", JSON.stringify(gods)).catch(() => {}); }, [gods, loaded]);
  useEffect(() => { if (loaded) window.storage?.set("point-sagas", JSON.stringify(sagas)).catch(() => {}); }, [sagas, loaded]);
  useEffect(() => { if (loaded) window.storage?.set("point-objectives", JSON.stringify(objectives)).catch(() => {}); }, [objectives, loaded]);

  const filtered = useMemo(
    () => factionFilter === "Todos" ? characters : characters.filter((c) => c.faction === factionFilter),
    [characters, factionFilter]
  );

  const selected = characters.find((c) => c.id === selectedId);

  function goToAdjacentCharacter(direction) {
    const list = filtered.length > 0 ? filtered : characters;
    const idx = list.findIndex((c) => c.id === selectedId);
    if (idx === -1) return;
    const nextIdx = (idx + direction + list.length) % list.length;
    setSelectedId(list[nextIdx].id);
  }

  function handleSave(c) {
    setCharacters((prev) => {
      const exists = prev.some((p) => p.id === c.id);
      return exists ? prev.map((p) => p.id === c.id ? c : p) : [...prev, c];
    });
    setSubView("detail");
    setSelectedId(c.id);
    setEditingChar(null);
  }
  function handleDelete(id) {
    setCharacters((prev) => prev.filter((c) => c.id !== id));
    setSubView("list");
  }
  function handleRestoreDefaultAttacks(character) {
    const existingNames = new Set((character.attacks || []).map((a) => (a.nome || "").trim().toLowerCase()));
    const missing = defaultAttacksForCharacter().filter((a) => !existingNames.has(a.nome.trim().toLowerCase()));
    if (missing.length === 0) return;
    const updated = { ...character, attacks: [...(character.attacks || []), ...missing] };
    setCharacters((prev) => prev.map((p) => (p.id === character.id ? updated : p)));
  }
  function updateCharacterFields(characterId, patch) {
    setCharacters((prev) => prev.map((p) => (p.id === characterId ? { ...p, ...patch } : p)));
  }
  function requestDeleteCharacter(c) {
    askConfirm(`Excluir a ficha de "${c.name}"? Essa ação não pode ser desfeita.`, () => handleDelete(c.id));
  }

  const TABS = [
    { id: "home", label: "Início", icon: Home },
    { id: "objectives", label: "Objetivos", icon: Target },
    { id: "characters", label: "Personagens", icon: Users },
    { id: "compare", label: "Confronto", icon: Swords },
    { id: "abilities", label: "Habilidades", icon: BookOpen },
    { id: "rules", label: "Regras", icon: ScrollText },
    { id: "world", label: "Mundo", icon: MapIcon },
    { id: "gods", label: "Deuses", icon: Sparkles },
    { id: "sagas", label: "Sagas", icon: ScrollText },
  ];

  return (
    <div style={{
      fontFamily: "'Spectral', serif", background: `radial-gradient(ellipse at top, ${PANEL} 0%, ${PANEL_2} 100%)`,
      minHeight: 640, color: PARCHMENT, borderRadius: 10, overflow: "hidden", border: `1px solid ${LINE}`,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Spectral:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        .spin { animation: spin 0.4s linear; }
        @keyframes spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
        select, input, textarea { font-family: inherit; }
        ::selection { background: ${BRASS}55; }
      `}</style>

      <div style={{
        padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center",
        background: `linear-gradient(100deg, ${PURPLE} 0%, ${PURPLE_LIGHT} 100%)`,
        boxShadow: `0 2px 10px #00000030`,
      }}>
        <div>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, letterSpacing: 2, color: "#F0D98C" }}>POINT</div>
          <div style={{ fontSize: 10.5, color: `${PURPLE_TEXT}AA`, letterSpacing: 1, fontFamily: "'IBM Plex Mono', monospace" }}>DOSSIÊS TÁTICOS · AMARANTH</div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setSubView("list"); }}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 6,
                  border: `1px solid ${active ? "#F0D98C" : "transparent"}`, background: active ? "#00000025" : "transparent",
                  color: active ? "#F0D98C" : `${PURPLE_TEXT}CC`, cursor: "pointer", fontFamily: "'Cinzel', serif", fontSize: 12,
                  letterSpacing: 0.6,
                }}
              >
                <t.icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: 24 }}>
        {tab === "home" && (
          <CoverView
            characters={characters}
            onOpenCharacter={(id) => { setSelectedId(id); setTab("characters"); setSubView("detail"); }}
          />
        )}

        {tab === "objectives" && <ObjectivesView objectives={objectives} setObjectives={setObjectives} askConfirm={askConfirm} />}

        {tab === "characters" && subView === "list" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["Todos", ...FACTIONS].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFactionFilter(f)}
                    style={{
                      fontSize: 11.5, padding: "5px 12px", borderRadius: 20, cursor: "pointer",
                      border: `1px solid ${factionFilter === f ? BRASS : LINE}`,
                      background: factionFilter === f ? `${BRASS}22` : "transparent",
                      color: factionFilter === f ? BRASS_BRIGHT : MUTED, fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  >{f}</button>
                ))}
              </div>
              <Btn variant="primary" onClick={() => { setEditingChar(emptyCharacter()); setSubView("form"); }}>
                <Plus size={14} /> Nova Ficha
              </Btn>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 14 }}>
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedId(c.id); setSubView("detail"); }}
                  style={{
                    textAlign: "left", background: PANEL_2, border: `1px solid ${LINE}`, borderRadius: 8, padding: 14,
                    cursor: "pointer", color: "inherit",
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: "#00000030", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <ShieldHalf size={20} color={FACTION_SEAL[c.faction] || BRASS} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: "'Cinzel', serif", fontSize: 14, color: PARCHMENT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: BRASS, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.epithet}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 10.5, color: FACTION_SEAL[c.faction] || BRASS, fontFamily: "'IBM Plex Mono', monospace" }}>{c.faction}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "characters" && subView === "detail" && selected && (
          <CharacterSheet
            character={selected}
            onBack={() => setSubView("list")}
            onEdit={(c) => { setEditingChar(c); setSubView("form"); }}
            onRequestDelete={requestDeleteCharacter}
            onRestoreAttacks={handleRestoreDefaultAttacks}
            onPrev={() => goToAdjacentCharacter(-1)}
            onNext={() => goToAdjacentCharacter(1)}
            onUpdateCharacter={updateCharacterFields}
          />
        )}

        {tab === "characters" && subView === "form" && (
          <CharacterForm
            initial={editingChar}
            onSave={handleSave}
            onCancel={() => setSubView(selectedId ? "detail" : "list")}
          />
        )}

        {tab === "compare" && <CompareView characters={characters} onUpdateCharacter={updateCharacterFields} />}
        {tab === "abilities" && <AbilitiesCatalogView />}
        {tab === "rules" && <RulesView />}
        {tab === "world" && <WorldView kingdoms={kingdoms} setKingdoms={setKingdoms} askConfirm={askConfirm} />}
        {tab === "gods" && <GodsView gods={gods} setGods={setGods} askConfirm={askConfirm} />}
        {tab === "sagas" && <SagasView sagas={sagas} setSagas={setSagas} askConfirm={askConfirm} />}
      </div>

      {confirmState && (
        <ConfirmDialog
          message={confirmState.message}
          onCancel={() => setConfirmState(null)}
          onConfirm={() => { confirmState.action(); setConfirmState(null); }}
        />
      )}
    </div>
  );
}
