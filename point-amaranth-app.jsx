import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Users, Swords, Map as MapIcon, Sparkles, Plus, X, Dices, ChevronLeft,
  Pencil, Trash2, Save, ShieldHalf, Shield, Flame, Droplet, BookOpen, Landmark,
  ChevronDown, ChevronRight, Star, Crown, Home, ScrollText, Target, Check,
  Upload, Download, ExternalLink, Eye, EyeOff,
} from "lucide-react";
import {
  GRADE_VALUE, GRADE_ORDER,
  ATTR_LIST, ATRIBUTOS_GERAIS_LIST, ATRIBUTOS_GERAIS_DEFAULT, ATRIBUTOS_GERAIS_KEYS, getAttrGrade,
  PROFICIENCIAS_LIST, PROFICIENCIAS_DEFAULT,
  STAT_LIST, DEFAULT_STAT_LINKS, STAT_BASE_DEFAULTS, STAT_PROF_LINK, STAT_USA_GRAU_CHEIO,
  ACERTOS_POR_TIPO, computeAcertoTipo,
  PROC_ABILITIES, categoriaDaHabilidade, CATEGORIA_ORDEM, PROC_ABILITIES_AGRUPADAS, MAX_PROCS,
  TIPOS_ATAQUE, BASE_ATTACK_TYPES,
  attrBonus, computeMaxHP, computeMaxSP, parseFlatBonus, limiarDaHabilidade, attrLabelDaHabilidade,
  findTriggeredProc, resolveConfirmationPhase, resolveAttack, computeStat, rollSuccessDice,
  defaultAttacksForCharacter,
} from "./engine.js";
import { grupoDoPersonagem, reporSidepoint } from "./sidepoint.js";
import { reporCidadesSemente, idsCidadesSemente } from "./cidades.js";
import { aplicarFichaSuthDoFate, preencherReinoSuth } from "./suth.js";
import {
  TIPOS_RELACAO, infoTipoRelacao, reporPessoasDoReino, mesclarPessoasComOverride,
  gruposDoReino, relacoesDoPersonagem, itensVisiveis, geracoesDaGenealogia,
} from "./pessoasReino.js";
import {
  slugificar, paraPercentual, bboxPoligono, calcularRecorte,
  cidadesPosicionadas, personagemDaPessoa,
} from "./mapaMundo.js";
import { textoVisivel, entradasVisiveis, npcVisivel, npcsPorReinoECidade, normalizarModo, CHAVE_MODO, MAPA_MUNDO } from "./mundo.js";
import { KATALAO_INFO, FRONTIER, NPC_GRUPOS, NPCS } from "./mundoDados.js";
import { storage, checkSeedOpportunity, commitSeedFromLocal } from "./storage.js";
import { buildBackup, parseBackup } from "./backup.js";
import { normalizarEstado } from "./normalizar.js";
import { mesclarCidadeComOverride, normalizarItemLista, paraItemLista } from "./cidadeOverrides.js";
import { uploadPortrait, removePortrait } from "./imageUpload.js";

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


const CATEGORIA_GERAL_INFO = {
  combate: { label: "Combate", color: BRASS_BRIGHT },
  fisica: { label: "Física", color: EMBER },
  social: { label: "Social", color: "#5C86B0" },
  mental: { label: "Mental", color: PURPLE },
};

const FACTIONS = ["Hetalion", "Katalão", "Maxis Power", "Suth", "Goethia", "Amaranth/Omem", "Aurora (Sidepoint)", "Outra"];

const FACTION_SEAL = {
  "Hetalion": "#8AA6A3",
  "Katalão": "#B0784F",
  "Maxis Power": "#8E7FB0",
  "Suth": "#C7994F",
  "Goethia": "#6E8F6B",
  "Amaranth/Omem": "#C7994F",
  "Aurora (Sidepoint)": "#B5654A",
  "Outra": "#9C8F78",
};

/* ---------------------------------------------------------------
   SISTEMA — regras, status, equipamentos e catálogo de habilidades
   (extraído de Ficha_Base_N_Point.docx e HABILIDADES_CONHECIDAS.docx)
----------------------------------------------------------------*/
const ABILITIES_CATALOG = [{"id": "tecnica_de_defesa_bloqueio", "name": "Técnica de defesa : (bloqueio)", "category": "ativa", "subtype": "Defensivas", "reviewed": true, "intro": "Técnica defensiva com arma ou corpo, dominando uma região.", "cost": "Resposta +2mp ou 1sp", "tiers": ["E- Se um inimigo entrar na sua zona, pode gastar a reação para um ataque de oportunidade.", "D- Pode gastar a reação para tentar bloquear um golpe recebido (efeito situacional, sem bônus fixo).", "C- +1 na Defesa.", "B- +1 na Defesa adicional se não mudar de zona (total +2).", "A- Gasta a reação para cancelar 1 sucesso do acerto inimigo (não crítico)."], "revisado_v2": true}, {"id": "giro_defensivo_b_bloqueio", "name": "Giro defensivo B: (bloqueio)", "category": "ativa", "subtype": "Defensivas", "reviewed": true, "intro": "Movimento circular com arma ou corpo, criando uma zona de defesa maior contra projéteis.", "cost": "Resposta +2mp ou 1sp", "tiers": ["E- Ataques à distância contra você têm desvantagem nesta rodada.", "D- Se o inimigo mudou de zona antes de atacar, pode reagir com um ataque de oportunidade.", "C- +1 na Defesa.", "B- +1 na Defesa adicional contra ataques à distância (total +2).", "A- Reduz em 1 a Confirmação de dano de um ataque recebido (não crítico), uma vez por turno."], "revisado_v2": true}, {"id": "borrao_esquiva", "name": "Borrão: (esquiva)", "category": "ativa", "subtype": "Defensivas", "reviewed": true, "intro": "Usa mana para se mover como um borrão, melhorando a esquiva.", "cost": null, "tiers": ["E- Ataques à distância contra você têm desvantagem.", "D- Se você se moveu uma zona, o inimigo tem -1 no Acerto contra você por movimento realizado.", "C- +1 na Defesa.", "B- +1 na Defesa adicional (total +2).", "A- Gasta a reação para cancelar 1 sucesso do acerto inimigo (não crítico)."], "revisado_v2": true}, {"id": "manobra_evasiva_b_esquiva", "name": "Manobra Evasiva B: (esquiva)", "category": "ativa", "subtype": "Defensivas", "reviewed": true, "intro": "Movimento acrobático que evita golpes e escapa de áreas de efeito.", "cost": null, "tiers": ["E- Cancela um ataque de oportunidade contra você.", "D- Usando a reação, pode se mover após receber um ataque.", "C- +1 na Defesa.", "B- +1 na Defesa adicional (total +2).", "A- Gasta a reação para cancelar 1 sucesso do acerto inimigo (não crítico)."], "revisado_v2": true}, {"id": "escudo_de_mana_b_bloqueio", "name": "Escudo de mana B: (bloqueio)", "category": "ativa", "subtype": "Ofensivas", "reviewed": true, "intro": "Cria um escudo de energia que bloqueia ataques.", "cost": null, "tiers": ["E- Cria um escudo que bloqueia um ataque (efeito situacional, sem bônus fixo ainda).", "D- Pode gastar 1mp a mais para reduzir em 1 a Confirmação de dano recebida enquanto o escudo durar.", "C- +2 na Defesa enquanto o escudo estiver ativo.", "B- Estende o escudo (+2 na Defesa) para todos os aliados na sua zona.", "A- +1 na Resistência Natural enquanto o escudo estiver ativo."], "revisado_v2": true}, {"id": "golpe_poderoso_b", "name": "Golpe poderoso B", "category": "ativa", "subtype": "Ofensivas", "reviewed": true, "intro": "Concentra poder em um ataque poderoso.", "cost": "+2mp ou 1sp", "tiers": ["E- Se o ataque só causar CONTATO, ainda assim causa 1 de Confirmação de dano.", "D- Causa ARREMESSO no CONTATO com o alvo.", "C- +1 na Confirmação de dano.", "B- +1 na Confirmação de dano adicional (total +2).", "A- A Confirmação de dano ignora até 2 pontos de Resistência do alvo."], "revisado_v2": true}, {"id": "golpe_penetrante_b", "name": "Golpe penetrante B", "category": "ativa", "subtype": "Ofensivas", "reviewed": true, "intro": "Concentra poder em um ataque que perfura defesas.", "cost": "+2mp ou 1sp", "tiers": ["E- O ataque ignora a armadura inimiga, confirmando contra a Resistência Natural.", "D- No CONTATO, ainda assim causa 1 de Confirmação de dano.", "C- +1 na Confirmação de dano.", "B- +1 na Confirmação de dano adicional (total +2).", "A- +1 no Acerto deste ataque."], "revisado_v2": true}, {"id": "golpe_veloz_b", "name": "Golpe Veloz B", "category": "ativa", "subtype": "Ofensivas", "reviewed": true, "intro": "Concentra poder em um ataque veloz.", "cost": "+2mp ou1sp", "tiers": ["E- Ganha prioridade +1 neste turno.", "D- Se possuir prioridade acima do inimigo, ganha +1 na Confirmação de dano.", "C- +1 no Acerto.", "B- +1 no Acerto adicional (total +2).", "A- +1 na Confirmação de dano."], "revisado_v2": true}, {"id": "golpe_preciso_b", "name": "Golpe Preciso B", "category": "ativa", "subtype": "Ofensivas", "reviewed": true, "intro": "Concentra poder em um ataque preciso.", "cost": "+2mp ou1sp", "tiers": ["E- Se você não se moveu neste turno, o inimigo tem -1 na Defesa contra este ataque.", "D- Uma habilidade de esquiva do inimigo não reduz o seu Acerto neste ataque.", "C- +1 no Acerto.", "B- +2 no Acerto (em vez de +1).", "A- +1 na Confirmação de dano."], "revisado_v2": true}, {"id": "lamina_de_energia_b_mana_alma", "name": "Lâmina de energia B (Mana)(Alma)", "category": "ativa", "subtype": "Ofensivas", "reviewed": true, "intro": "Cria uma lâmina de Mana/Alma capaz de cortar matéria.", "cost": "+1mp/ quebra mp", "tiers": ["E- Quebra 1mp para criar e manter uma arma de mana/alma: curto alcance, Zona local, Acerto 0, dano +2, ferida S.", "D- Com +1mp, pode atacar a 1 zona de distância usando a arma criada.", "C- +1 na Confirmação de dano com a arma criada.", "B- Causa CHAMAS no CONTATO.", "A- +1 no Acerto com a arma criada."], "revisado_v2": true}, {"id": "golpe_duplo_b", "name": "Golpe duplo B", "category": "ativa", "subtype": "Ofensivas", "reviewed": true, "intro": "Golpe duplo rápido.", "cost": "+2mp ou 1sp", "tiers": ["E- Pode atacar dois alvos diferentes a curta distância.", "D- Pode realizar dois ataques de curta distância como um único ataque, com -1 na Confirmação de dano.", "C- +1 no Acerto ao usar o ataque duplo.", "B- Efeitos de status do ataque duplo são dobrados.", "A- Remove o -1 na Confirmação de dano do ataque duplo."], "revisado_v2": true}, {"id": "corte_do_vento_b", "name": "Corte do vento B", "category": "ativa", "subtype": "Ofensivas", "reviewed": true, "intro": "Ataque cortante à distância.", "cost": "+2mp ou 1sp", "tiers": ["E- Seu golpe cortante de curta distância ganha +1 de alcance.", "D- Pode atacar um alvo a curta e um a longa distância na mesma ação.", "C- +1 no Acerto.", "B- +1 na Confirmação de dano.", "A- Um crítico no Acerto soma +1 na Confirmação de dano (uma vez por teste)."], "revisado_v2": true}, {"id": "impacto_de_pressao_b", "name": "Impacto de pressão B", "category": "ativa", "subtype": "Ofensivas", "reviewed": true, "intro": "Ataque contundente à distância.", "cost": "+2mp ou 1sp", "tiers": ["E- Seu ataque contundente ganha alcance de longa distância (+1 zona).", "D- Se o ataque acertar, causa ARREMESSO no alvo (ferida limitada a 1 no total).", "C- +1 no Acerto.", "B- +1 na Confirmação de dano.", "A- Causa ARREMESSO também no CONTATO."], "revisado_v2": true}, {"id": "golpe_de_fluxo_b", "name": "Golpe de fluxo B", "category": "ativa", "subtype": "Magia", "reviewed": true, "intro": "Ataque que interfere no fluxo do inimigo.", "cost": "+2mp ou 1sp", "tiers": ["E- Reduz a ferida causada em 1 (troca por outro efeito da habilidade).", "D- No CONTATO, o alvo tem -1d10 na recuperação de MP e perde a reação até o fim de uma manutenção.", "C- +2 no Acerto.", "B- No CONTATO, causa 1 nível de ENVENENAMENTO por mana.", "A- +1 no Acerto e +1 na Confirmação de dano."], "revisado_v2": true}, {"id": "magia_mana_pura_b", "name": "Magia (mana pura) B", "category": "ativa", "subtype": "Magia", "reviewed": true, "intro": "Usa mana para criar magias de mana pura — solidificando-a em constructos ou efeitos básicos. Cada opção abaixo funciona como um Ataque próprio; cadastre o que for aprendido na tabela de Ataques da ficha.", "cost": "Ação", "tiers": ["E- 1MP — Shin: área, Zona local, Acerto +3, dano +1, ferida 1. / 1MP — Tiro mágico: distância, Zona 3, Acerto +2, dano +1+S, ferida 1.", "D- 2MP — Torrente mágica: distância ou curta, Zona 3, Acerto +1, dano +1+S, ferida S. / 1MP — Tiro vazio: distância ou curta, Zona 2, Acerto +2, dano S+2, ferida 0. / 1MP B.Ação — limpa superfícies ou cria luz com mana pura.", "C- 2MP — Bombardeio de mana: área, Zona 4, Acerto 2S, dano 1+S, ferida S. / 1MP — Bombardeio vazio: mesma área, ferida 0.", "B- 2MP — Tiro duplo: dois tiros mágicos, ou um tiro mágico e um Shin. / 3MP+1SP — realiza o bombardeio de mana duas vezes."], "revisado_v2": true}, {"id": "encantamento_b", "name": "Encantamento B", "category": "ativa", "subtype": "Magia", "reviewed": true, "intro": "Usa mana para criar encantamentos em si mesmo (um por vez). Gasta 2mp na manutenção para trocar de encantamento.", "cost": "manutenção + quebra 1MP por encantamento", "tiers": ["E- Elemento (se possuir um Sistema elemental): Pyro adiciona CHAMAS, Cyro adiciona DESACELERAÇÃO por congelamento, Hydro adiciona ENVENENAR necrótico, Anemo adiciona EMPURRAR ao que for encantado.", "D- Pode aplicar um dos encantamentos em um aliado em vez de si mesmo.", "C- Escolha um enquanto ativo: +1 na Confirmação de dano (Força), +1 no Acerto (Mira), +1 de prioridade (Velocidade), +1 na Defesa (Esquiva), ou +1 na Resistência Natural (Resistência).", "B- Probabilidade: pode re-rolar um dado do encantado, uma vez por rodada.", "A- Geo: o encantamento de Confirmação de dano sobe para +2."], "revisado_v2": true}, {"id": "sensor_b", "name": "Sensor B", "category": "ativa", "subtype": "Magia", "reviewed": true, "intro": "Usa mana para criar um sensor mágico.", "cost": "situacional", "tiers": ["E- 1MP: quebra 1MP e marca até 4 pessoas (C-5, B-6), compartilhando visão e comunicação entre elas.", "D- 1MP, como ação: transfere 1 de MP para alguém marcado (custo total 2 de MP).", "C- 1MP, como ação: prepara um efeito em um alvo marcado — ao ser atacado, ele declara e rola a defesa antes do ataque. Enquanto não ativado, não recupera o MP gasto.", "B- 1MP, como ação: um alvo marcado ganha 1 re-roll até o próximo turno, ou pode realizar um movimento."], "revisado_v2": true}, {"id": "sopro_de_dragao_tipo", "name": "Sopro de dragão (tipo)", "category": "ativa", "subtype": "Técnicas de luta", "reviewed": true, "intro": "Sopro de energia usável de formas variadas. Cada opção funciona como um Ataque próprio; cadastre na tabela de Ataques.", "cost": "situacional", "tiers": ["1MP — Sopro preciso: distância, Zona 2, Acerto +2, dano +1, ferida 1.", "2MP — Sopro destruidor: área, Zona 3 (afeta a zona adjacente), Acerto 2S, dano 2+S, ferida S.", "B.Ação, 1MP — Sopro de reforço: encanta a arma/garras por um turno, +1 na Confirmação de dano.", "Variações elementais: Pyro adiciona CHAMAS aos sopros. Geo soma +1 nas Confirmações de dano. Toxic permite ENVENENAMENTO biológico no acerto."], "revisado_v2": true}, {"id": "olho_da_mente_c", "name": "Olho da mente C", "category": "ativa", "subtype": "Técnicas de luta", "reviewed": true, "intro": "Usa instinto e treino para achar vulnerabilidades e prever movimentos inimigos.", "cost": "Resposta 2MP ou 1SP", "tiers": ["E- Antecipa o próximo golpe contra você (efeito situacional, sem bônus fixo ainda).", "D- Um 9 natural no Acerto conta como crítico, uma vez por teste.", "C- +1 na Defesa.", "B- +1 na Defesa adicional (total +2).", "A- Se rolar 1+ crítico no Acerto neste turno, sua próxima Confirmação de dano ganha +1."], "revisado_v2": true}, {"id": "stances_n_stances", "name": "Stances: N+ (Stances)", "category": "ativa", "subtype": "Técnicas de luta", "reviewed": true, "intro": "Adepto de várias artes marciais — pode adotar uma stance por vez.", "cost": "Manutenção 1sp", "tiers": ["E- Troca de stance com B.Ação+1mp (sem gastar SP) ou B.Ação+movimento. Stances situacionais disponíveis: Cobra (reação: ataca um alvo na mesma zona que atacar um aliado) e Área de controle (reação: ataca um alvo na mesma zona que lhe atacar).", "D- Pode gastar 1 SP para ativar um efeito de stance não usado na rodada.", "C- Stances numéricas disponíveis: Águia (+1 no Acerto), Jaguar (+1 na Defesa), Leão (+1 na Confirmação de dano), Tatu (-1 na Confirmação de dano recebida). Escorpião permanece situacional: se superar os sucessos do inimigo ao defender, reação de ataque de oportunidade.", "B- Pode gastar 1 SP e quebrar +1mp para manter duas stances ativas ao mesmo tempo.", "A- Ao entrar em stance, pode gastar +1 SP para dobrar o efeito numérico da stance ativa. Leopardo desbloqueada: +1 de prioridade."], "revisado_v2": true}, {"id": "tecnicas_de_foco_b", "name": "Técnicas de foco B", "category": "ativa", "subtype": "Utilidade", "reviewed": true, "intro": "Grande foco inicial usado como recurso para ganhar bônus.", "cost": "Ação+ 1MP", "tiers": ["E- Usa Ação para ficar Focado até sofrer uma ferida; enquanto focado, vantagem em testes mentais (sem bônus fixo ainda). Não recupera o MP gasto enquanto estiver focado.", "D- Pode gastar o foco (perdendo o efeito) para ganhar 1 sucesso automático em um teste.", "C- Enquanto focado, +1 no Acerto.", "B- Enquanto focado, +1 na Defesa (total: +1 Acerto e +1 Defesa).", "A- Enquanto focado, +1 na Resistência Natural (+2 se estiver com apenas 1 de HP)."], "revisado_v2": true}, {"id": "bombas_b", "name": "Bombas B", "category": "passiva", "subtype": "Utilidade", "reviewed": true, "intro": "Possui uma variedade de bombas ocultas no corpo. Você às recupera em descanso longo. Você possui uma quantidade de bombas igual ao nível.", "cost": "Ação e 1 bomba", "tiers": ["Para cada nível desta habilidade, você tem um slot de bomba a mais e um tipo de bomba a mais para produzir. E- 1, D-2, C-3, B-4.", "As bombas desta habilidade não contam para itens usáveis em batalha. Se possuir uma oficina também é capaz de produzir suas próprias bombas.", "Os tipos de bomba pode incluir:", "Bomba de fumaça: Cria uma zona visão obscurecida.", "Bomba explosiva: Explode uma zona em até 1 de distância=>Tipo de ataque: area=> Zona 2=> Acerto: 2S=> dano: S+1 => ferida: S", "Bomba de gosma: Cria uma explosão de gosma que restringe em uma zona, a zona com gosma se torna especial. Tipo de ataque: Área => Zona 2=> Acerto: ENRAIZAMENTO.", "Bomba de interferência: Cria partículas em uma zona que dificultam a recuperação de mana durante um turno. Distância de até 2 zona: Todos na zona rolam com desvantagem a recuperação de mana.", "Bomba pyro: Tipo de ataque: Área => Zona 2=> Acerto: 2S => dano: CHAMAS", "Bomba eletro: Tipo de ataque: Área => Zona 2=> Acerto: 2S => dano: CARGA: 1- nada. 2- CHAMAS. 3- Vantagem no CHAMAS.", "Bomba de veneno: Tipo de ataque: Área => Zona 2=> ENVENENAMENTO biológico.", "Bomba de gelo: Tipo de ataque: Área => Zona 2=> DESACELERAÇÃO por gelo."]}, {"id": "forte_b", "name": "Forte B", "category": "passiva", "subtype": "Atributos", "reviewed": true, "intro": "Possui uma força acima do padrão**.", "cost": null, "tiers": ["E- Com B.Ação, pode adicionar ARREMESSO a um ataque de Força.", "D- +1d10 em testes genéricos de Força.", "C- +1 na Confirmação de dano em ataques de Força.", "B- +1 na Confirmação de dano adicional em ataques de Força (total +2).", "A- Sucesso automático em testes de Força fora de combate."], "revisado_v2": true}, {"id": "percepcao_b", "name": "Percepção B", "category": "passiva", "subtype": "Atributos", "reviewed": true, "intro": "Possui uma percepção acima do padrão", "cost": null, "tiers": ["E- +1 zona de alcance em ataques a longa distância.", "D- +1d10 em testes genéricos de Percepção.", "C- +1 no Acerto em ataques de mira ou precisão.", "B- +1 no Acerto adicional em ataques de mira ou precisão (total +2).", "A- Com B.Ação, soma +1 na Confirmação de dano de um ataque (uso único por turno)."], "revisado_v2": true}, {"id": "agilidade_b", "name": "Agilidade B", "category": "passiva", "subtype": "Atributos", "reviewed": true, "intro": "Possui uma agilidade acima do padrão", "cost": null, "tiers": ["E- Prioridade +1 na iniciativa.", "D- +1d10 em testes genéricos de Agilidade.", "C- +1 na Defesa.", "B- +1 na Defesa adicional (total +2).", "A- +5 na iniciativa."], "revisado_v2": true}, {"id": "resistente_b", "name": "Resistente B", "category": "passiva", "subtype": "Atributos", "reviewed": true, "intro": "Possui uma resistência além do padrão.", "cost": null, "tiers": ["E- Com B.Ação, fica imune a um efeito de ENRAIZAMENTO ou que interrompa seu movimento até o próximo turno.", "D- +1d10 em testes genéricos de Resistência.", "C- +1 HP e +1 na Resistência Natural.", "B- +1 na Resistência Natural adicional e +1 na Resistência Armadura.", "A- Sucesso automático em testes de Resistência fora de combate."], "revisado_v2": true}, {"id": "inteligencia_b", "name": "Inteligência B", "category": "passiva", "subtype": "Atributos", "reviewed": true, "intro": "Possui uma capacidade de raciocínio e compreensão além do padrão.", "cost": null, "tiers": ["E- Uma vez por turno, pode aumentar em 1 a rolagem de um dado do Acerto.", "D- +1d10 em testes genéricos de dedução ou compreensão.", "C- +1 no dado de recuperação de MP na manutenção.", "B- Ganha uma propriedade de nível E ou D de uma habilidade passiva de Técnica ou Magia que não possua.", "A- Escolha uma habilidade ativa para ganhar um \"+\" extra, podendo alternar uma linha por outra do mesmo nível."], "revisado_v2": true}, {"id": "persistente_b", "name": "Persistente B", "category": "passiva", "subtype": "Técnicas", "reviewed": true, "intro": "Você possui uma força de vontade poderosa, o mantendo na luta a menos que sofra um dano fatal.", "cost": null, "tiers": ["E- +1d10 (ou retira 1d10) em testes que envolvam Determinação, à sua escolha.", "D- Como B.Ação, pode fazer o teste de um efeito que esteja sofrendo sem esperar o fim do turno.", "C- +1 HP e +1 SP.", "B- +1 SP adicional (total +2).", "A- Se seu HP chegar a zero, continua até -1, a menos que sofra um crítico."], "revisado_v2": true}, {"id": "mestre_de_arma_de_haste_b", "name": "Mestre de arma de haste B", "category": "passiva", "subtype": "Técnicas", "reviewed": true, "intro": "É um especialista no uso da arma de escolha.", "cost": null, "tiers": ["E- Usando a arma de haste, pode re-rolar um dado do Acerto.", "D- Se um inimigo sair da sua zona, pode reagir com um ataque de oportunidade com vantagem.", "C- +1 na Confirmação de dano com a arma de haste.", "B- +1 na Confirmação de dano adicional com a arma de haste (total +2).", "A- Ataques de oportunidade com a arma de haste têm vantagem automaticamente."], "revisado_v2": true}, {"id": "mestre_de_longo_alcance_b", "name": "Mestre de longo alcance B", "category": "passiva", "subtype": "Técnicas", "reviewed": true, "intro": "É um especialista no uso desta arma ou técnicas de longa distância.", "cost": null, "tiers": ["E- Usando armas, técnicas ou magias de longa distância, pode re-rolar um dado do Acerto.", "D- Ataques de longa distância ganham +1 zona de alcance.", "C- +1 no Acerto em ataques de longa distância.", "B- +1 na Confirmação de dano contra armaduras em ataques de longa distância.", "A- +1 no Acerto adicional em ataques de longa distância (total +2)."], "revisado_v2": true}, {"id": "mestre_de_arma_pessoal_b", "name": "Mestre de arma pessoal B", "category": "passiva", "subtype": "Técnicas", "reviewed": true, "intro": "É um especialista no uso da arma de escolha.", "cost": null, "tiers": ["E- Pode aumentar em 1 um dado do Acerto com a arma de escolha.", "D- Usando a arma de escolha, pode re-rolar um dado do Acerto.", "C- +1 na Confirmação de dano com a arma de escolha.", "B- +1 na Defesa enquanto empunhar a arma de escolha.", "A- +1 na Confirmação de dano adicional com a arma de escolha (total +2)."], "revisado_v2": true}, {"id": "mestre_de_arma_dupla_b", "name": "Mestre de arma dupla B", "category": "passiva", "subtype": "Técnicas", "reviewed": true, "intro": "É um especialista em usar duas armas ao mesmo tempo. Precisando usar uma arma em cada mão para usar as seguintes habilidades. (Pode ser usada com punhos)", "cost": null, "tiers": ["E- Com B.Ação, realiza dois ataques no turno com -1 de ferida; contam como um único efeito de ataque.", "D- Os dois ataques passam a causar efeitos individualmente.", "C- +1 na Defesa no turno em que usar os dois ataques.", "B- +1 na Confirmação de dano no segundo ataque do turno.", "A- +1 na Confirmação de dano adicional no segundo ataque do turno (total +2)."], "revisado_v2": true}, {"id": "mestre_de_arma_pesada_b", "name": "Mestre de arma pesada B", "category": "passiva", "subtype": "Técnicas", "reviewed": true, "intro": "É um especialista em usar as duas mãos ao manipular sua arma.", "cost": null, "tiers": ["E- Pode re-rolar um dado do Acerto ao usar a arma com as duas mãos.", "D- Armas pesadas causam ARREMESSO sem dano adicional; sem desvantagem ao usar nas duas mãos.", "C- +1 na Confirmação de dano com armas pesadas.", "B- +1 na Confirmação de dano adicional com armas pesadas (total +2).", "A- No CONTATO com arma pesada, ainda assim causa 1 de Confirmação de dano."], "revisado_v2": true}, {"id": "mestre_de_arma_precisa_b", "name": "Mestre de arma precisa B", "category": "passiva", "subtype": "Técnicas", "reviewed": true, "intro": "É um especialista em usar uma arma enquanto a outra está livre.", "cost": null, "tiers": ["E- Pode re-rolar um dado do Acerto ao usar uma arma com a outra mão livre.", "D- Ao rolar 1+ crítico no Acerto, pode rolar +1d10 adicional no Acerto.", "C- +1 no Acerto com uma arma e a outra mão livre.", "B- +1 no Acerto adicional (total +2).", "A- +1 na Confirmação de dano com uma arma e a outra mão livre."], "revisado_v2": true}, {"id": "mestre_de_defesa_b", "name": "Mestre de defesa B", "category": "passiva", "subtype": "Técnicas", "reviewed": true, "intro": "É um especialista em usar uma arma enquanto a outra está livre.", "cost": null, "tiers": ["E- Pode usar a habilidade de escudo em um aliado na sua zona.", "D- Reduz em 1 a Confirmação de dano recebida (não crítico), uma vez por turno.", "C- +1 na Defesa.", "B- +1 na Resistência Natural.", "A- +1 na Defesa adicional (total +2)."], "revisado_v2": true}, {"id": "mestre_desarmado_b", "name": "Mestre desarmado B", "category": "passiva", "subtype": "Técnicas", "reviewed": true, "intro": "É um especialista em usar as mãos como arma.", "cost": null, "tiers": ["E- Ao rolar crítico em ataque desarmado, causa ARREMESSO.", "D- Se obtiver mais sucessos do que o necessário ao ser atacado a curta distância, pode reagir com ataque de oportunidade sem gastar a reação de Giro Defensivo, se usada.", "C- +1 na Confirmação de dano em ataques desarmados.", "B- +1 na Confirmação de dano adicional em ataques desarmados (total +2).", "A- Uma vez por turno, pode re-rolar um dado do Acerto em um ataque desarmado."], "revisado_v2": true}, {"id": "mestre_em_arte_marcial_b", "name": "Mestre em arte marcial B", "category": "passiva", "subtype": "Técnicas", "reviewed": true, "intro": "É um especialista em um estilo de luta.", "cost": null, "tiers": ["E- Uma vez por turno, pode re-rolar um dado de valor 1 no Acerto.", "D- Ao rolar crítico em ataque, +1 na Confirmação de dano de todos os ataques no turno.", "C- Pode usar a habilidade ativa Stances sem consumir um slot de habilidade ativa.", "B- Não gasta SP ao entrar em stance.", "A- +1 na Defesa enquanto estiver em uma stance."], "revisado_v2": true}, {"id": "mestre_do_critico_b", "name": "Mestre do crítico B", "category": "passiva", "subtype": "Técnicas", "reviewed": true, "intro": "Você tem como aproveitar as oportunidades a seu favor.", "cost": null, "tiers": ["D- Um crítico natural no Acerto soma +1 na Confirmação de dano (uma vez por teste).", "C- Ao rolar um crítico, pode re-rolar um sucesso não crítico — esse novo resultado conta como sucesso automático.", "B- Pode transformar um 9 natural em crítico, uma vez por rodada.", "A- O bônus de +1 na Confirmação de dano por crítico deixa de ser limitado a uma vez por teste."], "revisado_v2": true}, {"id": "mestre_em_armadura_b", "name": "Mestre em armadura B", "category": "passiva", "subtype": "Técnicas", "reviewed": true, "intro": "Você sabe tirar o melhor proveito de sua armadura.", "cost": null, "tiers": ["E- Armaduras pesadas deixam de dar desvantagem em ataques de oportunidade.", "D- Pode trocar de armadura como B.Ação em vez de Ação.", "C- +1 na Resistência Armadura.", "B- +1 na Resistência Armadura adicional (total +2).", "A- +1 na Defesa enquanto estiver com armadura equipada."], "revisado_v2": true}, {"id": "mestre_em_movimentacao_b", "name": "Mestre em movimentação B", "category": "passiva", "subtype": "Técnicas", "reviewed": true, "intro": "Possui uma forma de se mover com facilidade", "cost": null, "tiers": ["E- Pode mudar de zona com até 1 nível de diferença de altura.", "D- Com 1MP e B.Ação, realiza um movimento extra (2MP para dois movimentos extras, se já tiver essa melhoria).", "C- +10 na iniciativa.", "B- Pode usar desengajamento como B.Ação.", "A- +1 na Defesa ao se mover pelo menos uma zona no turno."], "revisado_v2": true}, {"id": "oficio_magico_b", "name": "Ofício Mágico B", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Possui aprendizado de Magia, sendo capaz de abrir tela mágica e ter um reservatório maior de mana. Também é capaz de usar magias de nível C com maior eficiência.", "cost": null, "tiers": ["E-Pode abrir a tela de mana, capaz de analisar efeitos mágicos já existentes e criar magias ou itens mágicos gastando tempo livre.", "D- Ganha +1 MP.", "C-Pode criar e obter itens mágicos. Pode usar a habilidade de magia pura sem gastar slot de habilidade, mas ela possui +1mp para seus efeitos. Se usar a habilidade de magia pura usando slot de habilidade, poderá aumentar em +1 em um dado de magias conjuradas.", "B- Possui um slot extra para itens mágicos. Pode aumentar em +1 em um dado de magia."]}, {"id": "potencial_magico_ofensivo_b", "name": "Potencial mágico ofensivo B", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Suas magias carregam maior potencial ofensivo.", "cost": null, "tiers": ["E- Pode transformar uma habilidade ativa não mágica, em mágica. Habilidades mágicas não podem usar SP para contornar o custo.", "D- Suas magias possuem +1 na confirmação de dano.", "C- Pode gastar +1mp para aumentar em 2 zonas uma magia. Permite também ao realizar uma magia em área, escolher um alvo para não sofrer seu efeito.", "B- Com B.Ação, pode adicionar um elemento que possua em uma magia sem gastar mp extra.", "A- Tiro mágico agora causa S de ferida em vez de 1."]}, {"id": "circulos_magicos_b", "name": "Círculos mágicos B", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "É capaz de criar círculos mágicos, preparando suas magias para o futuro.", "cost": null, "tiers": ["E- Pode com +1MP+MP da magia que pretende criar em um círculo mágico em uma zona. Pode criar uma condição para o círculo ser ativado ou pode ativar como B.Ação o círculo em turnos subsequentes. Uma vez que o círculo é ativado, ele usa a magia ligada a ele. Limite de 1 círculo.", "D- A magia ao ser criada pelo círculo, possui +1 no acerto ou +1 no dano, definido na hora de criar o círculo. Pode criar 1 círculo mágico.", "C- Pode criar +1 círculo mágico e círculos mágicos aumentam o alcance da magia em 1.", "B- Pode usar Ação+B.Ação+2MP+MP da magia para criar um círculo mágico em uma zona adicionando a magia um efeito elemental. Ele segue as mesmas regras dos outros círculos mágicos. (não precisa ter o sistema para adicionar o elemento na magia)", "A- Círculos mágicos custam um a menos de MP."]}, {"id": "mutacao_de_magia_b", "name": "Mutação de magia B", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Possui a capacidade de alterar a magia.", "cost": null, "tiers": ["E- Pode usar 1SP para pagar o custo de magias.", "D- Pode com 1SP usar magias de 1MP como B.Ação sem gastar mana.", "C-Pode usar 1SP para garantir 1S no acerto de uma magia. Se usado em magias que possuem S no acerto, ele adiciona +1.", "B- Ao usar uma magia, pode adicionar 1 em uma rolagem. Uma vez por teste."]}, {"id": "grimorio_magico_b", "name": "Grimório mágico B", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Possui efeitos mágicos preparados de forma que não precisa ter sistemas para ter alguns beneficios.", "cost": null, "tiers": ["E- Pode escolher um benefício de um sistema elemental e adicionar a uma magia, criando uma nova magia que agora faz parte da sua lista de opções. Limite de 1 magia criada. (D: 2 magias criadas) (C: 3 magias criadas)", "B- Pode escolher um benefício ativo de um sistema principal e adicionar a uma magia, criando uma nova magia que agora faz parte de sua lista de opções. Limite de 1 magia criada.", "Você pode alterar as magias criadas gastando 1 tempo."]}, {"id": "magia_arma_explosiva_a", "name": "Magia(arma) explosiva A", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Pode usar as magias ou habilidades de área com melhor proficiência.", "cost": null, "tiers": ["E- magias e armas explosivas possuem +1 de alcance.", "D- alvos possuem -1 na defesa contra seus ataques em área (A-2)", "C- aliados na área do ataque possuem 1 sucesso garantido na defesa", "B-bombardeio mágico e afins agora são 3 sucessos garantidos no acerto usando B.Ação+1mp. Condicionais:"]}, {"id": "acesso_a_armas_b", "name": "Acesso a armas B", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Permite começar com um arsenal que pode ser acessado por um portal ou alguma forma secreta do corpo.", "cost": null, "tiers": ["E- Você pode ter mais um item usável. (B- +2 itens)", "D- Permite recarregar armas ou trocar de armas como B.Ação.", "C- Permite trocar arma uma vez por turno como ação livre e tem +1 item equipável.", "B-Permite usar bombas e itens como B.Ação."]}, {"id": "campo_de_forca_b", "name": "Campo de força B", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "O usuário possui um campo de força, o defendendo de golpes de longa distância.", "cost": null, "tiers": ["E- -1 em um dado de ataque de longa distância em você.", "D- Você possui re-roll contra uma \"propriedade única\" de ataque.", "C- -1 em um dado de ataque inimigo em você.", "B- A primeira resistência do turno possui +1."]}, {"id": "sniper_b", "name": "Sniper B", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Possui uma forma de aumentar o alcance de suas armas de longa distância ou habilidades.", "cost": null, "tiers": ["E- Armas de longa distância podem alcançar duas zona a mais. (C: 3 zonas a mais, com desvantagem)", "D- Armas de longa distância possuem +1 no acerto em alvos em até 2 zonas de distância.", "C- Armas de longa distância possuem +1 na confirmação em alvos em até 2 zonas de distância.", "B- Ataques de longa distância podem gastar movimento para atacar com vantagem."]}, {"id": "ocultacao_de_presenca_b", "name": "Ocultação de presença B", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "É capaz de ocultar sua presença e realizar ataques surpresa.", "cost": null, "tiers": ["E-Como ação pode ocultar sua presença em regiões de visão obstruída ou de dificuldade. É necessários dois sucessos>5 (C- 3 sucessos) acumulados para localizar o usuário. Enquanto oculto, ele pode se mover sem aparecer para o inimigo, porém sempre que ele terminar um turno em uma região imprópria para se ocultar, ele perde 1 dos sucessos que precisam para encontrá-lo. (caso chegue a zero sucessos, ele é revelado automaticamente)", "D- Ao atacar um alvo de sua forma oculta, rola +1d10 (B=2d10) de dados de acerto."]}, {"id": "voar_tipo_flutuacao_tengou", "name": "Voar tipo: Flutuação Tengou", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Enquanto possuírem suas penas secas, podem flutuar em até cem metros de distância do solo com as asas fechadas, ou dois quilômetros com ela aberta.", "cost": null, "tiers": ["Pode-se ignorar diferença de altura entre zonas.", "Ataques de oportunidades feitos contra você tem desvantagem.", "Armadura pesada não causa -1 na prioridade."]}, {"id": "voar_tipo_asas", "name": "Voar tipo: asas", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Enquanto não possuir seu movimento restrito, pode voar.", "cost": null, "tiers": ["Pode-se ignorar diferença de altura entre zonas.", "Ataques de oportunidades feitos contra você tem desvantagem.", "Quando usa a ação para se movimentar em uma zona aérea, se move com 2 de movimento."]}, {"id": "sistema_psiquico", "name": "Sistema Psíquico", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Permite adicionar poderes psíquicos a habilidades usando +1MP**.", "cost": null, "tiers": ["Ofensivo - Ganha +1 acerto e ENVENENAMENTO por psicose.", "Defensivo- ganha re-roll em um dado de defesa, prevendo o golpe.", "Especial- causa DESACELERAMENTO por fraqueza em todos os inimigos na zona.", "B.Ação- Pode levitar objetos pequenos com o poder da mente. Sistemas elemental: Um sistema elemental precisa ser usado em conjunto de uma habilidade, ele pode adicionar uma das propriedades que possui de acordo com a habilidade que é usada junto."]}, {"id": "sistema_pyro", "name": "Sistema pyro", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Permite adicionar fogo a habilidades usando +1MP**.", "cost": null, "tiers": ["Ofensivo - Adiciona +1 na confirmação de dano e efeito CHAMAS a uma habilidade ofensiva.", "Defensivo- Ao usar uma habilidade defensiva, se defender, realiza uma confirmação para CHAMAS.", "Especial- Seu próximo ataque ou habilidade, causa CHAMAS em todos na zona de efeito.", "B.Ação- Pode apagar ou acender fogo de forma que não cause ferida."]}, {"id": "pyromancer", "name": "Pyromancer", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Possui grande afinidade com o sistema pyro.", "cost": null, "tiers": ["D- Confirma chamas com +1.", "C-Se possuir, pode usar o sistema pyro em ações normais. Se não possuir, escolhe uma propriedade do sistema para ter.", "B- Pode adicionar o efeito CHAMAS às habilidades e golpes sem consumir MP.", "A- Ao confirmar um ou mais CHAMAS, role CHAMAS sem ativar essa habilidade."]}, {"id": "sistema_electro", "name": "Sistema electro", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Permite adicionar eletricidade a habilidades usando +1MP**.", "cost": null, "tiers": ["Ofensivo - Role CARGA, onde 1:+1 acerto. 2: CHAMAS. 3: vantagem na confirmação de CHAMAS.", "Defensivo- Se o inimigo teve todas as confirmações de dano falhas, role CARGA, 1:nada. 2: role CHAMAS no agressor. 3: vantagem na confirmação de CHAMAS.", "Especial- Role CARGA, 1: prioridade +1. 2: Seu próximo ataque ou habilidade, causa CHAMAS em um outro alvo na mesma zona. 3: Seu próximo ataque causa, CHAMAS em um alvo na mesma zona..", "B.Ação- Pode gerar corrente elétrica ou absorver eletricidade de forma que não cria feridas."]}, {"id": "electromancer_b", "name": "Electromancer B", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Possui grande afinidade com o sistema electro.", "cost": null, "tiers": ["D- Ao usar o sistema electro, sempre começa com CARGA 1. Fora do sistema electro, ganha um re-roll em um teste de CARGA.", "C- Se possuir, pode usar o sistema electro em ações normais. Se não possuir, escolhe uma propriedade do sistema para ter.", "B- Pode adicionar CARGA, 1: nada. 2: CHAMAS, 3: vantagem na confirmação de chamas em habilidades normais e golpes sem consumir MP.", "A- CARGAS do sistema electro ganham um re-roll e: 4: CHAMAS."]}, {"id": "sistema_cryo", "name": "Sistema cryo", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Permite adicionar gelo a habilidades usando +1MP**.", "cost": null, "tiers": ["Ofensivo - Adiciona +1 no acerto e o efeito DESACELERAÇÃO por congelamento a uma habilidade ofensiva.", "Defensivo- Ao usar uma habilidade defensiva, a maior confirmação de dano recebida é comparada a um 10. Se o dano for interrompido, o alvo sofre DESACELERAÇÃO, rolando com vantagem.", "Especial- Ao acertar um alvo, o causa -1d10 na regeneração de MP.", "B.Ação- Pode congelar superfícies ou descongelar objetos, esta habilidade não causa feridas ou status."]}, {"id": "cryomancer", "name": "Cryomancer", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Possui grande afinidade com o sistema cryo.", "cost": null, "tiers": ["D- Os testes contra sua DESACELERAÇÃO por congelamento, possuem -1 na confirmação inicial.", "C-Se possuir, pode usar o sistema cryo em ações normais. Se não possuir, escolhe uma propriedade do sistema para ter.", "B- Não gasta MP extra para adicionar DESACELERAÇÃO por congelamento em suas habilidades ou golpes.", "A- Ao causar DESACELERAÇÃO em alguém sem desaceleração, causa 2 níveis de desaceleração em vez de 1."]}, {"id": "sistema_geo", "name": "Sistema Geo", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Permite adicionar terra a habilidades usando +1MP**.", "cost": null, "tiers": ["Ofensivo - Ganha +1 na confirmação de dano e DESACELERAÇÃO por peso a uma habilidade ofensiva.", "Defensivo- Ao usar uma habilidade defensiva, a maior confirmação de dano recebida é comparada a um 10. Se o dano for interrompido, o alvo sofre ENRAIZADO, rolando com vantagem.", "Especial- Uma habilidade ganha a propriedade de causar ENRAIZADO.", "B.Ação- Pode moldar a terra na sua zona, de forma simples."]}, {"id": "geomancer", "name": "Geomancer", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Possui grande afinidade com o sistema Geo.", "cost": null, "tiers": ["D- Testes contra ENRAIZADO possuem -1 na confirmação.", "C-Se possuir, pode usar o sistema geo se em ações normais. Se não possuir, escolhe uma propriedade do sistema para ter.", "B- Não gasta MP extra para adicionar DESACELERAÇÃO por peso em suas habilidades.", "A- Ao causar DESACELERAÇÃO por peso ou ENRAIZAMENTO, causa o outro efeito também."]}, {"id": "sistema_hydro", "name": "Sistema hydro", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Permite adicionar água a habilidades usando +1MP**.", "cost": null, "tiers": ["Ofensivo - Ganha +1 confirmação de dano e uma habilidade ofensiva ganha ENVENENAMENTO de forma necrótica.", "Defensivo- A defesa ganha +1 na resistência e previne um dano de CHAMAS.", "Especial- Como B.ação após usar uma habilidade, diminui um nível de ENVENENAMENTO ou DESACELERAÇÃO de você ou um alvo na mesma zona.", "B.Ação- Pode criar água ou secar áreas, a água gerada não mata a sede."]}, {"id": "hydromancer", "name": "Hydromancer", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Possui grande afinidade com o sistema hydro.", "cost": null, "tiers": ["D- Testes contra seus ENVENENAMENTO necrótico possuem -1 na confirmação.", "C-Se possuir, pode usar o sistema hydro em ações normais. Se não possuir, escolhe uma propriedade do sistema para ter.", "B- Não gasta MP extra para adicionar ENVENENAMENTO necrótico em suas habilidades.", "A- Ao causar ENVENENAMENTO ou usar suas habilidades para reduzir um nível de ENVENENAMENTO ou DESACELERAÇÃO, recupere 1MP."]}, {"id": "sistema_anemo", "name": "Sistema anemo", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Permite adicionar vento a habilidades usando +1MP**.", "cost": null, "tiers": ["Ofensivo - Ganha +1 no acerto e adiciona ARREMESSO a uma habilidade ofensiva.", "Defensivo- role CARGA. 1: defesa +1. 2: causa ARREMESSO se defender todo o ataque. 3: o ARREMESSO é ativado mesmo sem defender o ataque.", "Especial- Adiciona a uma habilidade, a capacidade de usar movimento como reação após ela ser realizada.", "B.Ação- Pode gerar ventos simples."]}, {"id": "anemomancer", "name": "Anemomancer", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Possui grande afinidade com o sistema anemo.", "cost": null, "tiers": ["D- Testes contra seu ARREMESSO, possuem -1 na confirmação.", "C-Se possuir, pode usar o sistema anemo em ações normais. Se não possuir, escolhe uma propriedade do sistema para ter.", "B- Não gasta MP extra ao aumentar o alcance de suas habilidades em 1.", "A- Ganha a habilidade de voar tipo tengou sem consumir slot e sem asas. Possui vantagem contra ENRAIZAMENTO e aumenta o alcance de seus ataques físicos normais em 1. Sistemas principal: Apenas um sistema pode estar ativo por vez."]}, {"id": "sistema_gigas", "name": "Sistema Gigas", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Usa um sistema de mana focado em alteração de magia**. Mantendo quebrado 1HP, ganha:", "cost": null, "tiers": ["Possui +1 na recuperação de MP.", "Com +1MP, um ataque ganha +2 zonas de distância.", "Com +1MP, aumenta o acerto de uma magia em 1."]}, {"id": "sistema_uniao", "name": "Sistema União", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Usa um sistema de mana focado em suporte**. Mantendo quebrado 1HP, ganha:", "cost": null, "tiers": ["Na manutenção, pode rolar a recuperação de MP de um aliado na mesma zona em vez da sua.", "Com +1MP, faz com que um aliado na mesma zona realize movimento.", "Com +1MP, realiza o movimento do turno novamente."]}, {"id": "sistema_kronos", "name": "Sistema Kronos", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Usa um sistema de mana focado em velocidade**. Mantendo quebrado 1HP, ganha:", "cost": null, "tiers": ["Possui prioridade +1.", "Com +1MP, pode usar o movimento do turno novamente.", "Com +1MP, refazer um teste inteiro (você e o inimigo re-rolam os dados)."]}, {"id": "sistema_alma", "name": "Sistema Alma", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Usa um sistema de mana focado em energia de Alma**. Mantendo quebrado 1HP ganha:", "cost": null, "tiers": ["Com B.Ação, cria uma aura de influência que preenche sua zona o garantindo +1 no acerto dentro da zona. Nos turnos seguintes, pode gastar 1MP para aumentar a área em uma zona.", "Com +1SP, consome a aura, evitando um golpe em área ou ganhando vantagem em um teste, se teleportando dentro da zona. Não pode se teleportar no mesmo turno que cria a aura.", "Com +1MP, infunde sua área de influência na arma ou magia, perdendo o efeito dela no turno para dar a propriedade de CHAMAS astrais. A aura retorna ao tamanho normal após usar."]}, {"id": "sistema_arcanis", "name": "Sistema Arcanis", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Usa um sistema de mana focado em armazenamento**. Mantendo quebrado 1HP ganha:", "cost": null, "tiers": ["Possui +1MP.", "Ação +1MP, ganha 2MP.", "Uma vez por turno, pode dar 1MP seu para um aliado na mesma zona."]}, {"id": "sistema_thalia", "name": "Sistema Thalia", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Usa um sistema de mana focado em mudança de probabilidade**. Mantendo quebrado 1HP, ganha:", "cost": null, "tiers": ["Ações de rolagem vs rolagem na sua zona são feitas com 4d10 em vez de 3 como base. (aliados e inimigos também)", "Com +1MP, refaz um teste inteiro (você e o inimigo re-rolam os dados).", "Com +1MP, transforma uma falha crítica em um sucesso."]}, {"id": "sistema_necron", "name": "Sistema Necron", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Usa um sistema de mana focado em vitalidade**. Gasta 1SP, ganha:", "cost": null, "tiers": ["Ganha +1HP.", "Com B.Ação, gasta 1HP para recuperar 1HP de um aliado. Isso recobra a consciência de aliados caídos.", "Com B.Ação, gasta 1SP para recuperar 1HP."]}, {"id": "sistema_dulahan", "name": "Sistema Dulahan", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Usa um sistema de mana focado no ataque**. Mantendo quebrado 1HP, ganha:", "cost": null, "tiers": ["Pode ganhar +1d10 nos ataques, mas sofre -1d10 quando é atacado.", "Com +1MP, ganha +1 no acerto e confirmação de dano, em troca de -1 na defesa até o próximo turno.", "Com +1MP, seu rolou um crítico no acerto, +1 na Confirmação de dano."]}, {"id": "sistema_umbra", "name": "Sistema Umbra", "category": "passiva", "subtype": "Magia", "reviewed": true, "intro": "Usa um sistema de mana focado na defesa**. Mantendo quebrado 1HP, ganha:", "cost": null, "tiers": ["Pode ganhar +1 na Defesa, mas sofre -1d10 ao atacar.", "Com +1MP, ganha +1 na defesa e na resistência, mas perde 1 no ataque.", "Com +1MP, não sofre o -1d10 em um ataque neste turno. Extra:", "**Chefão A:** habilidade única de inimigos muito fortes.", "E- +1 HP, MP. SP", "D- Possui um turno extra na iniciativa, porém não pode repetir as mesmas ações e só pode usar movimento em uma delas.", "D+- Pode usar movimento nas duas ações, ou repetir a ação.", "C- Ganha um efeito na manutenção referente a seu poder. Ganha uma reação extra e regenera 1MP na manutenção após rolar a regeneração.", "C+ - Rola com vantagem nos testes de resistência.", "B- Ganha ação lendária, que são 3 opções de ações fixas para usar no fim do turno de um inimigo.", "A- +1HP, MP, SP. +1 nas resistencias. +1 nos acertos, defesas e confirmações de dano. No início do turno regenera +1MP. ```{=html} <!-- --> ```", "**Regra de ouro B (civilização):** Possui a capacidade de adquirir recursos com facilidade e possui um carisma elevada natural", "Possui +1d10 em rolagens envolvendo relações políticas e de interações sociais.", "É capaz de fazer uma rolagem para obter ou achar formas de obter recursos dentro de uma civilização.", "Possui uma base secreta de fácil acesso dificultando inimigos de atacá-la em seu domínio.", "Pessoas de Ascensão menor que a sua te respeitam, admiram ou temem. ```{=html} <!-- --> ```", "**Regra de ouro B (Magos):** Possui a capacidade de adquirir recursos com facilidade e possui um carisma elevada natural", "Possui +1d10 em rolagens envolvendo relações entre magos e de interações acadêmicas.", "É capaz de fazer uma rolagem para obter ou achar formas de obter informação académica ou pontos de mana.", "Possui uma oficina mágica de fácil acesso que lhe garante ingredientes e ferramentas para o ofício.", "Pessoas de Ascensão menor que a sua te respeitam, admiram ou temem. ```{=html} <!-- --> ```", "**Regra de ouro B (Arte marcial):** Possui a capacidade de adquirir recursos com facilidade e possui um carisma elevada natural", "Possui +1d10 em rolagens envolvendo relações entre guerreiros e de interações do mundo das artes marciais.", "É capaz de fazer uma rolagem para obter ou achar formas de obter informação de mestres ou guerreiros poderosos.", "Consegue facilmente identificar pessoas poderosas e saber a diferença de nivel e seus estilos de luta.", "Pessoas de Ascensão menor que a sua te respeitam, admiram ou temem. ```{=html} <!-- --> ```", "**Regra de ouro B (submundo):** Possui a capacidade de adquirir recursos com facilidade e possui um carisma elevada natural", "Possui +1d10 em rolagens envolvendo relações ao submundo, organizações criminosas e de interações ilícitas.", "É capaz de fazer uma rolagem para obter ou achar informações de criminosos ou do submundo.", "Possui acesso a caminhos que outros não possuem.", "Pessoas de Ascensão menor que a sua te respeitam, admiram ou temem. ```{=html} <!-- --> ```", "**Rastreadora B (área) :** Você é perito em achar rastros dos outros, capaz de investigar e obter informantes que o levarão a seu alvo.", "Possui +1d10 em rolagens envolvendo localizar indivíduos ou pontos de interesse.", "É capaz de fazer uma rolagem para obter ou achar formas de encontrar indivíduos famosos ou pontos de interesse.", "É capaz de localizar bases secretas ou regiões que possuem defesas para se ocultar.", "Pessoas de Ascensão menor não podem ter sua presença oculta de você. ```{=html} <!-- --> ```", "**Adaptabilidade A:** Você carrega consigo instrumentos para uma grande variedade de situações. Você consegue se adaptar bem a novos ambientes.", "Pode considerar que possui instrumentos para situações inesperadas.", "Possui equipamentos escondidos no corpo, cada um preparado para situações inesperadas. Você também é perito em usar tais equipamentos.", "Considera que possui 3 pontos de preparo por descanso longo, cada um deles pode ser usado para \"gerar\" uma ferramenta ou instrumento necessário para uma situação. ```{=html} <!-- --> ```", "Possui uma de cada bomba por descanso longo a seguir:", "Bomba de fumaça: Cria uma zona de 10m de raio de visão obscurecida.", "Bomba de fogo: Explode em chamas, causando um ataque de=> Acerto área: 2 sucessos => Dano de fogo em esfera 30m: 5/10 R.N => 1+S. (Especial)", "Bomba de óleo: Cria uma superfície oleosa e de pouco atrito, ela é escorregadia e precisa de ao menos um sucesso para se manter firme sobre ela.", "Bomba de gelatina: Cria uma explosão de gosma que restringe o movimento de quem acerta, causando -1d10 em testes relacionados a se mover e reduzindo pela metade o movimento. Termos: Quando a habilidade diz que causa o efeito, o alvo ainda precisa rolar o teste descrito no termo. Termos do mesmo tipo, ficam mais fortes, enquanto termos diferentes se aculam separadamente. ( ENVENENAMENTO necrótico aumenta apenas pelo mesmo tipo. Alguem pode sofrer de ENVENENAMENTO necrótico nivel 1 e ENVENENAMENTO biológico nivel 1 ao mesmo tempo."]}, {"id": "chefao_a", "name": "Chefão A", "category": "passiva", "subtype": "Únicas/Especiais", "reviewed": true, "intro": "habilidade única de inimigos muito fortes.", "cost": null, "tiers": ["E- +1 HP, MP. SP", "D- Possui um turno extra na iniciativa, porém não pode repetir as mesmas ações e só pode usar movimento em uma delas.", "D+- Pode usar movimento nas duas ações, ou repetir a ação.", "C- Ganha um efeito na manutenção referente a seu poder. Ganha uma reação extra e regenera 1MP na manutenção após rolar a regeneração.", "C+ - Rola com vantagem nos testes de resistência.", "B- Ganha ação lendária, que são 3 opções de ações fixas para usar no fim do turno de um inimigo.", "A- +1HP, MP, SP. +1 nas resistencias. +1 nos acertos, defesas e confirmações de dano. No início do turno regenera +1MP. ```{=html} <!-- --> ```"]}, {"id": "regra_de_ouro_b_civilizacao", "name": "Regra de ouro B (civilização)", "category": "passiva", "subtype": "Únicas/Especiais", "reviewed": true, "intro": "Possui a capacidade de adquirir recursos com facilidade e possui um carisma elevada natural", "cost": null, "tiers": ["Possui +1d10 em rolagens envolvendo relações políticas e de interações sociais.", "É capaz de fazer uma rolagem para obter ou achar formas de obter recursos dentro de uma civilização.", "Possui uma base secreta de fácil acesso dificultando inimigos de atacá-la em seu domínio.", "Pessoas de Ascensão menor que a sua te respeitam, admiram ou temem. ```{=html} <!-- --> ```"]}, {"id": "regra_de_ouro_b_magos", "name": "Regra de ouro B (Magos)", "category": "passiva", "subtype": "Únicas/Especiais", "reviewed": true, "intro": "Possui a capacidade de adquirir recursos com facilidade e possui um carisma elevada natural", "cost": null, "tiers": ["Possui +1d10 em rolagens envolvendo relações entre magos e de interações acadêmicas.", "É capaz de fazer uma rolagem para obter ou achar formas de obter informação académica ou pontos de mana.", "Possui uma oficina mágica de fácil acesso que lhe garante ingredientes e ferramentas para o ofício.", "Pessoas de Ascensão menor que a sua te respeitam, admiram ou temem. ```{=html} <!-- --> ```"]}, {"id": "regra_de_ouro_b_arte_marcial", "name": "Regra de ouro B (Arte marcial)", "category": "passiva", "subtype": "Únicas/Especiais", "reviewed": true, "intro": "Possui a capacidade de adquirir recursos com facilidade e possui um carisma elevada natural", "cost": null, "tiers": ["Possui +1d10 em rolagens envolvendo relações entre guerreiros e de interações do mundo das artes marciais.", "É capaz de fazer uma rolagem para obter ou achar formas de obter informação de mestres ou guerreiros poderosos.", "Consegue facilmente identificar pessoas poderosas e saber a diferença de nivel e seus estilos de luta.", "Pessoas de Ascensão menor que a sua te respeitam, admiram ou temem. ```{=html} <!-- --> ```"]}, {"id": "regra_de_ouro_b_submundo", "name": "Regra de ouro B (submundo)", "category": "passiva", "subtype": "Únicas/Especiais", "reviewed": true, "intro": "Possui a capacidade de adquirir recursos com facilidade e possui um carisma elevada natural", "cost": null, "tiers": ["Possui +1d10 em rolagens envolvendo relações ao submundo, organizações criminosas e de interações ilícitas.", "É capaz de fazer uma rolagem para obter ou achar informações de criminosos ou do submundo.", "Possui acesso a caminhos que outros não possuem.", "Pessoas de Ascensão menor que a sua te respeitam, admiram ou temem. ```{=html} <!-- --> ```"]}, {"id": "rastreadora_b_area", "name": "Rastreadora B (área)", "category": "passiva", "subtype": "Únicas/Especiais", "reviewed": true, "intro": "Você é perito em achar rastros dos outros, capaz de investigar e obter informantes que o levarão a seu alvo.", "cost": null, "tiers": ["Possui +1d10 em rolagens envolvendo localizar indivíduos ou pontos de interesse.", "É capaz de fazer uma rolagem para obter ou achar formas de encontrar indivíduos famosos ou pontos de interesse.", "É capaz de localizar bases secretas ou regiões que possuem defesas para se ocultar.", "Pessoas de Ascensão menor não podem ter sua presença oculta de você. ```{=html} <!-- --> ```"]}, {"id": "adaptabilidade_a", "name": "Adaptabilidade A", "category": "passiva", "subtype": "Únicas/Especiais", "reviewed": true, "intro": "Você carrega consigo instrumentos para uma grande variedade de situações. Você consegue se adaptar bem a novos ambientes.", "cost": null, "tiers": ["Pode considerar que possui instrumentos para situações inesperadas.", "Possui equipamentos escondidos no corpo, cada um preparado para situações inesperadas. Você também é perito em usar tais equipamentos.", "Considera que possui 3 pontos de preparo por descanso longo, cada um deles pode ser usado para \"gerar\" uma ferramenta ou instrumento necessário para uma situação. ```{=html} <!-- --> ```", "Possui uma de cada bomba por descanso longo a seguir:", "Bomba de fumaça: Cria uma zona de 10m de raio de visão obscurecida.", "Bomba de fogo: Explode em chamas, causando um ataque de=> Acerto área: 2 sucessos => Dano de fogo em esfera 30m: 5/10 R.N => 1+S. (Especial)", "Bomba de óleo: Cria uma superfície oleosa e de pouco atrito, ela é escorregadia e precisa de ao menos um sucesso para se manter firme sobre ela.", "Bomba de gelatina: Cria uma explosão de gosma que restringe o movimento de quem acerta, causando -1d10 em testes relacionados a se mover e reduzindo pela metade o movimento. Termos: Quando a habilidade diz que causa o efeito, o alvo ainda precisa rolar o teste descrito no termo. Termos do mesmo tipo, ficam mais fortes, enquanto termos diferentes se aculam separadamente. ( ENVENENAMENTO necrótico aumenta apenas pelo mesmo tipo. Alguem pode sofrer de ENVENENAMENTO necrótico nivel 1 e ENVENENAMENTO biológico nivel 1 ao mesmo tempo."]}, {"id": "oficio_metalico_area", "name": "Ofício metalico (área)", "category": "passiva", "subtype": "Únicas/Especiais", "reviewed": false, "intro": "Você sabe mexer com metal??? -", "cost": null, "tiers": []}, {"id": "imparavel", "name": "Imparável", "category": "passiva", "subtype": "Únicas/Especiais", "reviewed": false, "intro": "Seu corpo dificilmente é forçado a ficar imóvel e uma vez em movimento, dificilmente é parado.", "cost": null, "tiers": ["Ganha 1d10 para qualquer teste que envolva movimentação ou para resistir efeitos que o prejudicam de alguma forma a mover seu corpo.", "Habilidades que impedem seu ataque de acertar, a menos que sejam ESQUIVAS, para cancelar um sucesso do usuário precisam usar dois sucessos ou um crítico. ```{=html} <!-- --> ```"]}, {"id": "forca_do_medo", "name": "Força do medo", "category": "passiva", "subtype": "Únicas/Especiais", "reviewed": false, "intro": "Sua aura emana uma força intimidadora, que faz com que os outros fiquem mais fracos só por sua presença.", "cost": null, "tiers": ["Ao acertar dois críticos em um teste de acerto, faz uma rolagem (3d10) para intimidar, para cada sucesso ganha os efeitos acumulados: -1- Garante ao ataque um de dano extra garantido; -2- Impede o inimigo de se mover -3- O alvo é considerado um nível de Ascenção menor para você até seu próximo turno.", "Ao matar um inimigo, todos que viram a execução, sofrem a rolagem de intimidação também. ```{=html} <!-- --> ```"]}, {"id": "regra_de_ouro_b_civilizacao_2", "name": "Regra de ouro B (civilização)", "category": "passiva", "subtype": "Únicas/Especiais", "reviewed": false, "intro": "Possui a capacidade de adquirir recursos com facilidade e possui um carisma elevada natural", "cost": null, "tiers": ["Possui +1d10 em rolagens envolvendo relações políticas e de interações sociais.", "É capaz de fazer uma rolagem para obter ou achar formas de obter recursos dentro de uma civilização.", "Possui uma base secreta de fácil acesso dificultando inimigos de ataca-la em seu domínio.", "Pessoas de Ascensão menor que a sua te respeitam, admiram ou temem. ```{=html} <!-- --> ```"]}, {"id": "aquele_que_se_esconde", "name": "Aquele que se esconde", "category": "passiva", "subtype": "Únicas/Especiais", "reviewed": false, "intro": "Possui uma entidade desconhecida no fundo de sua mente.", "cost": null, "tiers": ["Possui sucesso automático em testes envolvendo resistência de sua mente.", "Possui conhecimento de tecnologias acima do nível tecnológico do mundo.", "Possui acesso a uma voz desconhecida que possui bastante sabedoria consigo ganhando +2d10 em qualquer rolagem para determinar algum conhecimento histórico ou tecnológico do mundo."]}];

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



const HABILIDADE_CATEGORIAS = [
  { key: "ativas", label: "Ativas" },
  { key: "especial", label: "Especial" },
  { key: "racial", label: "Racial" },
  { key: "passivas", label: "Passivas" },
  { key: "extras", label: "Extras" },
];

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

// Definida aqui (em vez de perto do resto das views) porque os dados semente
// mais abaixo (Suth) já precisam montar imageUrl a partir de um caminho
// relativo antes do app renderizar qualquer coisa.
const assetUrl = (p) => `${import.meta.env?.BASE_URL || "/"}${p}`;

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
function withFichaDefaults(c) {
  return {
    traits: "",
    xp: 0,
    imageUrl: "",
    imagemPos: { y: 50, zoom: 1 },
    statBase: { ...STAT_BASE_DEFAULTS },
    statTemp: { acerto: 0, defesa: 0, resistArmadura: 0, resistNaturalFisica: 0, resistNaturalMagica: 0, geral: 0 },
    statLinks: JSON.parse(JSON.stringify(DEFAULT_STAT_LINKS)),
    attacks: defaultAttacksForCharacter(),
    itens: { usaveis: [], principais: [], armadura: ["Armadura física"] },
    habilidadesFicha: { ativas: [], especial: [], racial: [], passivas: [], extras: [] },
    abilities: [],
    procs: [],
    atributosGerais: { ...ATRIBUTOS_GERAIS_DEFAULT },
    proficiencias: { ...PROFICIENCIAS_DEFAULT },
    racialAbility: { name: "", description: "" },
    classes: [{ name: "", description: "" }, { name: "", description: "" }],
    grupo: "c",
    ...c,
  };
}

// ---------------------------------------------------------------
// SIDEPOINT — Grupo Aurora (mesa paralela ao Point)
// Fichas adaptadas das fichas antigas (steampoint) para o sistema atual:
// graus E–A, 3 procs, Singularidade, Raça + 2 Classes.
// As habilidades da ficha antiga ficam arquivadas em habilidadesFicha
// (só descritivas), para não se perder nada da mesa.
// ---------------------------------------------------------------
const SIDEPOINT_FACTION = "Aurora (Sidepoint)";

const spAtk = (nome, tipo, acerto, dano, ferida, profKey, efeito = "") => ({
  nome, tipo, acerto, dano, ferida, efeito, profKey,
});

const SIDEPOINT_CHARACTERS_RAW = [
  // ----------------------------------------------------------- LEON
  {
    id: "sp_leon", name: "Leon Winters", epithet: "A Alma Ímpar · Irmão mais velho",
    race: "Humano", faction: SIDEPOINT_FACTION,
    affiliation: "Aurora (mercenários de Beltezu) · Irmãos Winters · ex-Black Shield",
    height: "1,78m", deity: "Dulahand (vínculo de alma)", weapon: "Estoc",
    traits: "Cabelos muito finos e brancos (a cor da mãe), olhos muito azuis, pele clara. Instintivo, implicante com o irmão, sente as almas ao redor.",
    xp: 2,
    singularity: {
      name: "Alma Ímpar", level: "C",
      description: "Nasceu com uma alma diferente das dos outros seres. Tem breves premonições, sente e lê a alma dos outros, cria uma aura de alma na zona onde está, se teleporta dentro dela e infunde a arma com CHAMAS astrais. Consegue concentrar a própria alma num ponto e inseri-la num objeto.",
    },
    racialAbility: { name: "Humano — Mana Concentrada", description: "Poder espiritual mais elevado que o comum; usa essa energia para melhorar o próprio desempenho em momentos decisivos." },
    classes: [
      { name: "Duelista de Estoc", description: "Esgrimista de uma mão livre, rápido e preciso. Luta colado no alvo e aproveita o teleporte da Alma Ímpar para atacar pontos cegos." },
      { name: "Mercador Ocultista (Regra de Cobre)", description: "Ex-ajudante da Madame Satã e leitor de tarô. Tem trânsito natural entre mercadores e ocultistas e sabe conseguir recursos e informação." },
    ],
    attributes: {},
    atributosGerais: { forca: "E", destreza: "C", vigor: "E", carisma: "D", manipulacao: "E", compostura: "E", inteligencia: "E", perspicacia: "C", resolucao: "E" },
    proficiencias: {
      combateCorpoACorpo: "C", armasDeFogo: "E", magiasOfensivas: "E", defesaProf: "D", resistFisicaProf: "E", resistMagicaProf: "E", tecnicaProf: "C",
      intuicao: "C", percepcao: "C", ocultismo: "D", financas: "D", persuasao: "D",
    },
    procs: ["golpe_certeiro", "reflexo_agil", "persistente"],
    attacks: [
      spAtk("Ataque desarmado", "marcial", "+1", "0", "1", "combateCorpoACorpo"),
      spAtk("Estoc", "marcial", "0", "+1", "1", "combateCorpoACorpo", "Duelo rápido e preciso"),
      // Variante gastando 1MP. Separada porque o motor lê a palavra CHAMAS no texto
      // do efeito e aplica sempre - deixar "pode receber CHAMAS" no ataque base
      // fazia o Estoc pegar fogo de graca em toda rolagem.
      spAtk("Estoc — Chamas astrais (1MP)", "marcial", "0", "+1", "1", "combateCorpoACorpo", "CHAMAS astrais da Alma Ímpar · gasta 1MP"),
    ],
    itens: { principais: ["Estoc", "Lanterna analógica"], usaveis: ["Caixa de primeiros socorros"], armadura: ["Armadura leve de Katalão"] },
    habilidadesFicha: {
      ativas: [
        { name: "Borrão D (ficha antiga)", custo: "Resposta, 2MP ou 1SP", description: "Rola defesa com +1d10; ou defesa com -1d10 para cancelar um acerto inimigo que não seja crítico." },
        { name: "Golpe Preciso D (ficha antiga)", custo: "2MP ou 1SP", description: "Inimigo com -1 na defesa se Leon não se moveu; +1 no acerto." },
      ],
      especial: [
        { name: "Sistema de Alma Ímpar", description: "Aura de influência na zona (+1 acerto) · consome a aura para se teleportar ou evitar golpe em área (1SP) · infunde a aura na arma: CHAMAS astrais (1MP) · manifesta a alma num objeto (1SP)." },
      ],
      racial: [], passivas: [
        { name: "Premonição D (ficha antiga)", description: "-1 em um dado de ataque à distância contra ele; re-roll de defesa contra quem tem alma." },
        { name: "Soulmancer D (ficha antiga)", description: "Confirma CHAMAS do sistema de Alma com +1." },
      ], extras: [],
    },
    hp: { current: 3, max: 3 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "Irmão mais velho dos Winters, criado em Midhab. Filho de Lisa (Clara), desertora de Hetalion. Vendia mercadorias e lia tarô para a Madame Satã em Maxis, onde foi recrutado por Lid e trabalhou para a Black Shield ao lado do Phantom, e hoje está desligado. Sentiu o Pendragon a quilômetros antes do ataque a Midhab. Testemunhou a queda dos deuses na montanha, morreu e foi ressuscitado pelo Dulahand, ao qual está preso junto dos outros três. Depois de 5 anos escondido, virou mercenário com Aurora. Duelou e se envolveu com Kirilia, de Suth. Pintou o cabelo para se disfarçar e depois pediu ao Ishran que o devolvesse ao branco da mãe: 'é nossa identidade'.",
  },

  // ----------------------------------------------------------- MERKEL
  {
    id: "sp_merkel", name: "Merkel Winters", epithet: "O Sacerdote Vendado de Umbra",
    race: "Humano", faction: SIDEPOINT_FACTION,
    affiliation: "Aurora · Irmãos Winters · Templo de Umbra (Kuro) · Dojo do Hill",
    height: "1,90m", deity: "Umbra", weapon: "Artes marciais (stances) · faca da Trish",
    traits: "Lindos olhos azuis quase sempre vendados. Fuma. Provocador, sem tato social, protetor à sua maneira. Implica com a Trish.",
    xp: 5,
    singularity: {
      name: "Olhos Espelhados", level: "B",
      description: "Vê e sente as emoções de quem está ao redor, enxerga através de camadas finas de matéria e copia técnicas e habilidades que vê. Anda vendado para não se afogar no que sente dos outros. Consegue espelhar a tela de mana de outro sensor.",
    },
    racialAbility: { name: "Humano — Mana Concentrada", description: "Poder espiritual mais elevado que o comum; usa essa energia para melhorar o próprio desempenho em momentos decisivos." },
    classes: [
      { name: "Monge de Umbra", description: "Treinado pelo Hill (ex-capitão de Hetalion) e pelo templo de Umbra. Luta desarmado alternando stances animais (Águia, Jaguar, Leão, Tatu, Cobra)." },
      { name: "Encantador", description: "Aplica encantamentos de mana em si e em aliados (Força, Mira, Velocidade, Esquiva), com trocas feitas na manutenção." },
    ],
    attributes: {},
    atributosGerais: { forca: "C", destreza: "D", vigor: "D", carisma: "E", manipulacao: "E", compostura: "E", inteligencia: "E", perspicacia: "E", resolucao: "E" },
    proficiencias: {
      combateCorpoACorpo: "C", armasDeFogo: "E", magiasOfensivas: "E", defesaProf: "D", resistFisicaProf: "D", resistMagicaProf: "E", tecnicaProf: "D",
      atletismo: "D", intuicao: "D", ocultismo: "D", intimidacao: "D", percepcao: "D",
    },
    procs: ["persistente", "instinto_selvagem", "furia_crescente"],
    attacks: [
      spAtk("Ataque desarmado", "marcial", "+1", "0", "1", "combateCorpoACorpo", "Stances (Águia/Leão somam na confirmação)"),
      spAtk("Faca da Trish", "marcial", "0", "+1", "1", "combateCorpoACorpo", "Não corta muito bem"),
    ],
    itens: { principais: ["Faca da Trish", "Estoque", "Máscara de gás"], usaveis: ["Poção de rápido metabolismo", "Cigarros"], armadura: [] },
    habilidadesFicha: {
      ativas: [
        { name: "Encantamento D (ficha antiga)", custo: "Manutenção, quebra 1MP por encantamento", description: "Força (+1 confirmação), Mira (+1 acerto), Velocidade (+1 prioridade), Esquiva (+1 defesa)." },
        { name: "Olho da Mente D (ficha antiga)", custo: "Resposta, 2MP ou 1SP", description: "+1d10 na defesa; com crítico no acerto, rola +1d10 na confirmação até o fim do próximo turno." },
        { name: "Stances (ficha antiga)", custo: "Manutenção 1SP", description: "Águia, Jaguar, Leão, Tatu, Cobra, Escorpião, Área de Controle, Leopardo." },
      ],
      especial: [], racial: [],
      passivas: [
        { name: "Olhos Mágicos (ficha antiga)", description: "Abre tela de mana. Com os olhos abertos, ganha efeitos pela emoção do oponente: raiva +1 confirmação, medo +1 defesa, desprezo +1 acerto e +1 confirmação com -1 defesa, etc." },
      ],
      extras: [],
    },
    hp: { current: 4, max: 4 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "Caçula dos Winters. Cresceu entre a vila de Midhab e a favela ningen, onde treinou no dojo do Hill e se tornou sacerdote de Umbra a convite da Kuro. Amigo de infância da K e rival eterno da Trish. Ao ver a queda dos deuses, um véu caiu dos seus olhos e ele passou a enxergar a alma e as emoções de todos, por isso a venda. Morreu e foi ressuscitado pelo Dulahand. Carrega a Umbra (em forma de raposa) no ombro. Quase morreu por destruir o orbe de Ishran e foi reconstruído com a biomassa doada pelas tropas de Katalão. Passou a noite na tenda da Laian.",
  },

  // ----------------------------------------------------------- RAIKO
  {
    id: "sp_raiko", name: "Raiko (雷鼓)", epithet: "A Grande Demônio da Montanha",
    race: "Niosh (Oni, descendente de Arcani)", faction: SIDEPOINT_FACTION,
    affiliation: "Aurora · antiga guardiã do templo da montanha de Midhab",
    height: "1,44m (encolheu após a transfusão) · 1,75m antes", deity: "Nenhuma (ligada a Ishran e Nekron pela mãe)", weapon: "Kanabo (porrete) e instrumentos",
    traits: "Um único chifre na lateral da cabeça, marcas vermelhas em forma de onda sob o olho. Barulhenta, bebe demais, fala pomposo quando quer e palavrão sempre. Musicista talentosa.",
    xp: 0,
    singularity: {
      name: "Eco", level: "C",
      description: "Controla e distorce ondas sonoras: gritos que quebram vidro e empurram inimigos, impacto sonoro encantando a arma, vibração que rasga criaturas grandes por dentro, abafar som e sentir todos numa área pelo eco.",
    },
    racialAbility: { name: "Niosh — Agressividade Oni · Descendente de Arcani", description: "Nioshes são naturalmente fortes e resistentes. Como descendente de Arcani, tem poderes psiônicos que simulam magia (mana pura e eletricidade) e resistência extra contra magia. Acumuladora e avarenta por natureza." },
    classes: [
      { name: "Bárbara do Kanabo", description: "Luta de perto com o porrete e muita força bruta. Aproveita críticos e perfura defesas." },
      { name: "Bardo do Eco", description: "Toca baixo, bongos e o que aparecer. Usa a música para motivar tropas, distrair e amplificar o próprio poder sonoro." },
    ],
    attributes: {},
    atributosGerais: { forca: "C", destreza: "E", vigor: "D", carisma: "E", manipulacao: "E", compostura: "E", inteligencia: "E", perspicacia: "E", resolucao: "E" },
    proficiencias: {
      combateCorpoACorpo: "D", armasDeFogo: "E", magiasOfensivas: "D", defesaProf: "E", resistFisicaProf: "E", resistMagicaProf: "D", tecnicaProf: "D",
      atuacao: "C", sobrevivencia: "D", intimidacao: "D",
    },
    procs: ["golpe_penetrante", "furia_crescente", "instinto_selvagem"],
    attacks: [
      spAtk("Ataque desarmado", "marcial", "+1", "0", "1", "combateCorpoACorpo"),
      spAtk("Kanabo", "marcial", "-1", "+2", "1", "combateCorpoACorpo", "Porrete pesado"),
      // Mesma correcao do Estoc. ARREMESSO tambem era o nome ANTIGO do IMPACTO:
      // o status so disparava por causa da palavra "impacto sonoro" na prosa.
      spAtk("Kanabo — Impacto sonoro (1MP)", "marcial", "-1", "+2", "1", "combateCorpoACorpo", "IMPACTO pelo Eco · gasta 1MP"),
      spAtk("Shin", "magico", "+3", "+1", "1", "magiasOfensivas", "1MP · área"),
      spAtk("Tiro mágico", "magico", "+2", "+1", "1", "magiasOfensivas", "1MP · distância"),
    ],
    itens: { principais: ["Kanabo (porrete de madeira)", "Baixo", "Bongos"], usaveis: [], armadura: [] },
    habilidadesFicha: {
      ativas: [
        { name: "Magia (mana pura) D — racial (ficha antiga)", custo: "Ação", description: "Shin, Tiro mágico, Torrente mágica, Tiro vazio." },
        { name: "Golpe Penetrante C (ficha antiga)", custo: "2MP ou 1SP", description: "Ignora armadura; +1 na confirmação; +1d10 no acerto contra bloqueio." },
        { name: "Giro Defensivo D (ficha antiga)", custo: "Resposta, 2MP ou 1SP", description: "+1d10 na defesa ou reduz 1 de dano recebido." },
      ],
      especial: [
        { name: "Sistema Eco", description: "+1MP: ofensivo (ARREMESSO), defensivo (re-roll de defesa), especial (campo que soma 1d10 nas defesas da área). B.Ação: sente todos na área." },
      ],
      racial: [],
      passivas: [
        { name: "Sistema Electro (ficha antiga)", description: "+1MP adiciona eletricidade (CARGA → acerto / CHAMAS). Gera ou absorve corrente sem ferir." },
      ],
      extras: [{ name: "Copper Rule — Talento Musical", description: "Música de verdade. Senhor Rosa e Laian a elogiaram." }],
    },
    hp: { current: 3, max: 3 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "Oni de um chifre que morou sozinha por anos no templo da montanha de Midhab, dormindo ao lado do corpo da mãe, preservado num baú por Nekron a pedido de Ishran. Adotada informalmente pelo Jack, enterrou a mãe e desceu para o mundo. Morreu na queda dos deuses e foi ressuscitada pelo Dulahand. Consolou o Vinland quando ele matou o pai sem querer. Busca a origem do símbolo nas roupas da mãe, e Nekron indicou o niosh Mao. Encolheu depois de doar biomassa para salvar o Merkel. Fez amizade com a Lilazian e os filhotes Kutrefas.",
  },

  // ----------------------------------------------------------- AKIRA
  {
    id: "sp_akira", name: "Akira Cagliostro", epithet: "A Raposa Ilusionista · Líder (de fachada) de Aurora",
    race: "Ningen Raposa", faction: SIDEPOINT_FACTION,
    affiliation: "Aurora · filha adotiva de Klaus (Pendragon) · provável bastarda Gotis · broche da Parteira de Suth",
    height: "1,55m", deity: "???", weapon: "Bombas alquímicas",
    traits: "Orelhas e cauda de raposa, que costuma esconder com ilusão. Quimono de mangas longas cheio de compartimentos. Esperta, sarcástica, a 'irmã menos caótica' do grupo.",
    xp: 0,
    singularity: {
      name: "Ilusão", level: "C",
      description: "Cria ilusões visuais intangíveis em si e em aliados, inclusive clones de si mesma e disfarces, e as projeta em outros através do sensor. Quanto mais mana, mais real. Com a ajuda do Leon, conseguiu envolver uma alma com ilusão (Alira).",
    },
    racialAbility: { name: "Ningen Raposa", description: "Faro e instinto apurados (detecta inimigos em zonas vizinhas), deslocamento ágil entre zonas e transformação entre forma humanoide e bestial." },
    classes: [
      { name: "Alquimista (Alqui Bomb)", description: "Carrega bombas ocultas no corpo (fumaça, explosiva, gosma, pyro, eletro, veneno, gelo...) e fabrica poções e itens mágicos numa oficina." },
      { name: "Sensora", description: "Marca até 5 pessoas numa rede de visão e comunicação compartilhada, transfere mana e prepara defesas nos marcados." },
    ],
    attributes: {},
    atributosGerais: { forca: "E", destreza: "C", vigor: "E", carisma: "E", manipulacao: "D", compostura: "E", inteligencia: "C", perspicacia: "E", resolucao: "E" },
    proficiencias: {
      combateCorpoACorpo: "E", armasDeFogo: "E", magiasOfensivas: "E", defesaProf: "D", resistFisicaProf: "E", resistMagicaProf: "E", tecnicaProf: "D",
      ciencia: "C", magiasGerais: "C", furtividade: "D", subterfugio: "D", medicina: "D", etiqueta: "D",
    },
    procs: ["reflexo_agil", "golpe_certeiro", "persistente"],
    attacks: [
      spAtk("Ataque desarmado", "marcial", "+1", "0", "1", "combateCorpoACorpo"),
      spAtk("Bomba explosiva", "arma_de_fogo", "2S", "+1", "1", "armasDeFogo", "Alqui Bomb · área, zona 2"),
      spAtk("Bomba pyro", "arma_de_fogo", "2S", "0", "1", "armasDeFogo", "Alqui Bomb · área · CHAMAS"),
    ],
    itens: { principais: ["Mosquete (sem munição)", "Máscara de gás", "Dispositivo de ilusão"], usaveis: ["Bomba banana (dinamite goetiana)", "Bomba de água", "Bomba de gelo"], armadura: ["Armadura leve de Katalão"] },
    habilidadesFicha: {
      ativas: [
        { name: "Sensor C (ficha antiga)", custo: "1MP", description: "Marca até 5 pessoas (visão e comunicação compartilhadas); transfere MP; prepara defesa antecipada num marcado." },
        { name: "Alqui Bomb D (ficha antiga)", custo: "Ação + 1 bomba", description: "Bombas ocultas no corpo, recuperadas em descanso longo." },
        { name: "Borrão E (ficha antiga)", custo: "Resposta, 2MP ou 1SP", description: "Rola defesa com +1d10." },
      ],
      especial: [], racial: [],
      passivas: [
        { name: "Ofício Mágico C (ficha antiga)", description: "Tela de mana, +1 MP, cria e obtém itens mágicos." },
        { name: "Ocultação de Presença E (ficha antiga)", description: "Esconde a presença em regiões de visão obstruída." },
      ],
      extras: [],
    },
    hp: { current: 3, max: 3 }, mp: { current: 4, max: 4 }, sp: { current: 3, max: 3 },
    history: "Ningen raposa encontrada e criada pelo alquimista Klaus, ex-servo dos Pendragons, cuidando da loja dele em Midhab e se passando por humana. Klaus partiu para ajudar os Pendragons com a pesquisa das flores de Umbra e morreu anos depois como Klaus Pendragon, procurando a filha. Morreu na queda dos deuses e foi ressuscitada pelo Dulahand. Recusou sacrificar o Mevil para salvar a Terest, sua amiga, e enfrentou o Ishran por isso. Krusland e Laian indicam que ela é bastarda da casa Gotis de Katalão. Tratada como 'líder' de Aurora por ser a mais educada do grupo.",
  },

  // ----------------------------------------------------------- K
  {
    id: "sp_k", name: "K (Kanny)", epithet: "A Loba Silenciosa",
    race: "Ningen Lobo", faction: SIDEPOINT_FACTION,
    affiliation: "Aurora · filha do Hill · ex-prisioneira da fábrica de Midhab · abençoada por Isha",
    height: "1,62m", deity: "Umbra? / abençoada por Isha", weapon: "Facas de arremesso e arma de fogo",
    traits: "Quieta, sempre com armas por perto, fuma. Olhar calmo que esconde muita raiva do passado.",
    xp: 12.6,
    singularity: {
      name: "Bênção de Isha", level: "D",
      description: "Recebeu uma fagulha do poder da deusa da vida: faz sementes e plantas brotarem na hora e sente as flores ao redor. Ainda está aprendendo o quão útil isso é.",
    },
    racialAbility: { name: "Ningen Lobo", description: "Orelhas e cauda de lobo. Faro e instinto poderosos (detecta inimigos nas zonas vizinhas) e deslocamento ágil entre zonas." },
    classes: [
      { name: "Arsenal Oculto", description: "Esconde armas pelo corpo e troca ou recarrega rápido; sempre tem uma faca a mais do que parece." },
      { name: "Batedora Furtiva", description: "Oculta a presença e ataca de surpresa. Boa atiradora de longa distância." },
    ],
    attributes: {},
    atributosGerais: { forca: "E", destreza: "C", vigor: "E", carisma: "E", manipulacao: "E", compostura: "D", inteligencia: "E", perspicacia: "D", resolucao: "E" },
    proficiencias: {
      combateCorpoACorpo: "D", armasDeFogo: "D", magiasOfensivas: "E", defesaProf: "E", resistFisicaProf: "E", resistMagicaProf: "E", tecnicaProf: "D",
      furtividade: "C", percepcao: "D", sobrevivencia: "D",
    },
    procs: ["reflexo_agil", "golpe_certeiro", "furia_crescente"],
    attacks: [
      spAtk("Ataque desarmado", "marcial", "+1", "0", "1", "combateCorpoACorpo"),
      spAtk("Faca de arremesso", "marcial", "0", "+1", "1", "combateCorpoACorpo", "Pode arremessar (curta distância)"),
      spAtk("Mosquete", "arma_de_fogo", "-1", "+4", "2", "armasDeFogo", "Carga 1"),
    ],
    itens: { principais: ["Mosquete (6 balas)", "Facas de arremesso x3", "Rádio"], usaveis: ["Facas de arremesso x4", "Lanterna", "Máscara de gás"], armadura: [] },
    habilidadesFicha: {
      ativas: [
        { name: "Golpe Veloz E (ficha antiga)", custo: "2MP ou 1SP", description: "Prioridade +1." },
        { name: "Borrão D (ficha antiga)", custo: "Resposta, 2MP ou 1SP", description: "+1d10 na defesa ou cancelar um acerto não crítico." },
      ],
      especial: [{ name: "Acesso a Armas C (ficha antiga)", description: "Arsenal acessado de forma secreta; +1 item; troca e recarrega armas como B.Ação ou ação livre." }],
      racial: [],
      passivas: [
        { name: "Mestre de Longo Alcance E (ficha antiga)", description: "Re-rola um dado de acerto à distância." },
        { name: "Ocultação de Presença E (ficha antiga)", description: "Se oculta em regiões de visão obstruída." },
      ],
      extras: [],
    },
    hp: { current: 2, max: 2 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "Filha do Hill, cresceu na favela ningen ao lado da Trish e do Merkel. Quando a Kuro fugiu para Hetalion, ficou para lutar pela cidade, brigou com a Trish e acabou presa e escravizada na fábrica erguida sobre Midhab pelos Fangs/Garras do Vaars. Foi resgatada pelo grupo após 5 anos. Fez as pazes com a Trish no jogo de União e recebeu uma bênção da Isha depois da queda da árvore. Enfim conseguiu uma arma de verdade em Katalão.",
  },

  // ----------------------------------------------------------- ISHRAN
  {
    id: "sp_ishran", name: "Mevil Ishran", epithet: "O Deus da Vida Aposentado",
    race: "Humano (corpo-boneco criado por Nekron)", faction: SIDEPOINT_FACTION,
    affiliation: "Aurora · antigo Deus da Vida (sucedido por Isha) · Mevil e Ishran fundidos",
    height: "—", deity: "Ele mesmo / Isha", weapon: "Espada e escudo",
    traits: "Pálido, veste terno sujo ou armadura velha, tosse sangue. Oscila entre a arrogância teatral do Mevil e a serenidade cansada do Ishran. Tem cerca de 2 meses de vida... ou é mais velho que a realidade.",
    xp: 0,
    singularity: {
      name: "Necromancia", level: "Divino (enfraquecido)",
      description: "Antigo poder de um Deus da Vida: cria e sustenta vida, cura e recompõe corpos com biomassa, e ergue exércitos de mortos que digitam telas de mana e trazem outros mortos de volta. Foi lenhador, soldado e depois deus. Hoje é uma sobra do que foi, num corpo que não vai durar.",
    },
    racialAbility: { name: "Humano — Mana Estática", description: "Resistência natural acima do comum e sorte nos críticos." },
    classes: [
      { name: "Guardião de Escudo", description: "Soldado de linha de frente com armadura pesada; protege aliados na mesma zona e reduz o golpe mais forte que recebe." },
      { name: "Sistema Nekron (Vitalidade)", description: "Troca vida própria e alma por cura: transfere HP para aliados, levanta aliados caídos e se recupera com SP." },
    ],
    attributes: {},
    atributosGerais: { forca: "D", destreza: "E", vigor: "D", carisma: "C", manipulacao: "E", compostura: "E", inteligencia: "C", perspicacia: "E", resolucao: "D" },
    proficiencias: {
      combateCorpoACorpo: "D", armasDeFogo: "E", magiasOfensivas: "E", defesaProf: "D", resistFisicaProf: "D", resistMagicaProf: "E", tecnicaProf: "E",
      lideranca: "B", medicina: "C", magiasGerais: "C", ocultismo: "C", persuasao: "D",
    },
    procs: ["persistente", "blindagem_reativa", "fortaleza_viva"],
    attacks: [
      spAtk("Ataque desarmado", "marcial", "+1", "0", "1", "combateCorpoACorpo"),
      spAtk("Espada", "marcial", "0", "+1", "1", "combateCorpoACorpo", "Com escudo"),
    ],
    itens: { principais: ["Espada", "Escudo"], usaveis: [], armadura: ["Armadura pesada (velha)"] },
    habilidadesFicha: {
      ativas: [
        { name: "Golpe Poderoso E (ficha antiga)", custo: "2MP ou 1SP", description: "Se o ataque só causar contato, causa 1d10 de confirmação." },
        { name: "Técnica de Defesa D (ficha antiga)", custo: "Resposta, 2MP ou 1SP", description: "+1d10 na defesa ou cancela uma confirmação não crítica." },
        { name: "Stances E (ficha antiga)", custo: "Manutenção 1SP", description: "Águia e Jaguar." },
      ],
      especial: [{ name: "Sistema Necron", description: "Gasta 1SP: +1HP; B.Ação: 1HP próprio → 1HP de aliado (acorda caídos); B.Ação: 1SP → 1HP." }],
      racial: [],
      passivas: [
        { name: "Resistente D / Persistente C / Mestre em Armadura D / Mestre de Defesa D (ficha antiga)", description: "Muito resistente, difícil de derrubar, usa bem armadura pesada e protege aliados com o escudo." },
      ],
      extras: [],
    },
    hp: { current: 4, max: 4 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "Mevil era um boneco criado por Nekron como contenção para caso os deuses caíssem; acreditava ser um arquimago e contratou Aurora como escolta. Dentro dele despertou Ishran, o lenhador que virou soldado e depois Deus da Vida ao receber o poder de três arcanjos. Ishran quis se aposentar e criar uma sucessora digna, e isso aconteceu: sentou no trono, ressuscitou os mortos da batalha da árvore e deu lugar a Isha, a Deusa da Vida. O que sobrou foi Mevil Ishran, os dois fundidos num corpo frágil, abençoado por Isha e amaldiçoado por Nekron. Ainda faz discursos revolucionários capazes de incendiar multidões.",
  },
];

const SIDEPOINT_CHARACTERS = SIDEPOINT_CHARACTERS_RAW.map((c) => withFichaDefaults({ ...c, fichaFechada: true, grupo: "aurora" }));

// Grupo Suth — 14 fichas novas (tudo exceto o Fate, que já existe no Grupo C
// e só recebe uma ATUALIZAÇÃO de conteúdo, ver FICHA_NOVA_FATE/suth.js). Vêm
// com fichaFechada e grupo "suth" já no próprio JSON de origem.
const SUTH_CHARACTERS_RAW = [
  {
    "id": "suth_emphes",
    "name": "Emphes Alpha",
    "epithet": "A Sombra Escarlate · X Imperadora de Suth",
    "race": "Suthence (criada em laboratório)",
    "faction": "Suth",
    "affiliation": "Pilar da Imperadora de Suth · X Imperadora",
    "height": "1,75m",
    "deity": "—",
    "weapon": "Machado imperial",
    "traits": "Pele pálida, olhos azuis cortantes, cabelos prateados longos e dois chifres dourados enrolados com joias; vestido vermelho escarlate e capa azul-marinho. Preocupada, estratégica, orgulhosa apesar da baixa autoestima. Não tolera fraqueza em Suth. Gosta: ?. Não gosta: ?.",
    "xp": 0,
    "singularity": {
      "name": "All-Breaker",
      "level": "EX · Divino",
      "description": "Enfraquece a conexão molecular de objetos, tornando-os quebradiços. Gastando muita mana, evolui e passa a afetar mana e alma: quebra magias de nível inferior ao seu e chega a atingir almas. Uso excessivo esgota a mana e a deixa vulnerável."
    },
    "racialAbility": {
      "name": "Criação do Pilar da Parteira — Herdeira do Trono Genético",
      "description": "Gerada em laboratório a partir do DNA da IX Imperadora e de guerreiras suthences; desenvolvimento acelerado (27 anos)."
    },
    "classes": [
      {
        "name": "Guerreira B — usuária de machado (ficha antiga)",
        "description": "Combatente treinada pelo Pilar da Santa em combate e liderança militar; espadas, machado e magia defensiva."
      },
      {
        "name": "Golden Rule EX — líder de estado",
        "description": "Vértice do poder em Suth: controla os Três Pilares em administração e diplomacia. Magecraft C (ficha antiga)."
      }
    ],
    "attributes": {},
    "atributosGerais": {
      "forca": "C",
      "destreza": "D",
      "vigor": "C",
      "carisma": "B",
      "manipulacao": "B",
      "compostura": "A",
      "inteligencia": "B",
      "perspicacia": "B",
      "resolucao": "A"
    },
    "proficiencias": {
      "combateCorpoACorpo": "C",
      "armasDeFogo": "E",
      "magiasOfensivas": "D",
      "defesaProf": "C",
      "resistFisicaProf": "D",
      "resistMagicaProf": "C",
      "tecnicaProf": "C",
      "lideranca": "A",
      "politica": "A",
      "persuasao": "B"
    },
    "procs": [
      "golpe_penetrante",
      "escudo_de_mana",
      "persistente"
    ],
    "attacks": [
      {
        "nome": "Ataque desarmado",
        "tipo": "marcial",
        "acerto": "+1",
        "dano": "0",
        "ferida": "1",
        "efeito": "",
        "profKey": "combateCorpoACorpo"
      },
      {
        "nome": "Machado imperial",
        "tipo": "marcial",
        "acerto": "-1",
        "dano": "+2",
        "ferida": "1",
        "efeito": "",
        "profKey": "combateCorpoACorpo"
      },
      {
        "nome": "Machado — All-Breaker (1MP)",
        "tipo": "marcial",
        "acerto": "-1",
        "dano": "+2",
        "ferida": "1",
        "efeito": "Singularidade All-Breaker: fragiliza o alvo ou o objeto atingido (efeito narrativo, a critério do mestre) · gasta 1MP",
        "profKey": "combateCorpoACorpo"
      }
    ],
    "itens": {
      "principais": [
        "Machado imperial",
        "Coroa metálica com pedra vermelha"
      ],
      "usaveis": [],
      "armadura": []
    },
    "habilidadesFicha": {
      "ativas": [],
      "especial": [
        {
          "name": "All-Breaker",
          "description": "Fragilizar materiais; dissolver feitiços de nível inferior ao seu; afetar almas. Desvantagem: mana alta consumida."
        },
        {
          "name": "Autoridade imperial",
          "description": "Nenhuma decisão acontece sem sua palavra; Presença A+ (ficha antiga)."
        }
      ],
      "racial": [],
      "passivas": [],
      "extras": []
    },
    "hp": {
      "current": 5,
      "max": 5
    },
    "mp": {
      "current": 3,
      "max": 3
    },
    "sp": {
      "current": 3,
      "max": 3
    },
    "history": "Décima governante de Suth, criada em laboratório a partir do DNA de Velmira Alpha e de várias guerreiras suthences, considerada geneticamente perfeita. Treinada para governar pelo Pilar da Imperadora e em combate pelo Pilar da Santa. Assumiu o trono sob tensão, após a rebelião da antiga Parteira, e consolidou a ordem entre os Três Pilares. Teme ser vista como criação artificial sem mérito próprio e ser contestada pela Santa; sua frieza afasta aliados. Prefere decisões seguras e testadas.",
    "fichaFechada": true,
    "grupo": "suth"
  },
  {
    "id": "suth_velmira",
    "name": "Velmira Alpha",
    "epithet": "A Guardiã da Mudança · IX Imperadora de Suth (aposentada)",
    "race": "Suthence (criada pelo Pilar da Parteira)",
    "faction": "Suth",
    "affiliation": "Pilar da Imperadora de Suth · Conselheira Imperial",
    "height": "—",
    "deity": "—",
    "weapon": "—",
    "traits": "107 anos, cabelos grisalhos longos, olhos dourados afiados; manto de veludo escarlate com broches dourados. Pragmática, paciente e calculista, distante emocionalmente. Gosta: ?. Não gosta: ?.",
    "xp": 0,
    "singularity": {
      "name": "A definir",
      "level": "—",
      "description": "Singularidade não definida nos documentos. Preencher quando o mestre decidir."
    },
    "racialAbility": {
      "name": "Linhagem das Imperadoras",
      "description": "Criada pelo Pilar da Parteira a partir da linhagem imperial. Longevidade notável (107 anos)."
    },
    "classes": [
      {
        "name": "A definir",
        "description": "Estilo de combate não definido nos documentos."
      },
      {
        "name": "Golden Rule — Imperadora aposentada / Conselheira Imperial",
        "description": "Única Imperadora a implementar reformas e abrir Suth politicamente. Sem grau definido na fonte."
      }
    ],
    "attributes": {},
    "atributosGerais": {
      "forca": "E",
      "destreza": "E",
      "vigor": "E",
      "carisma": "E",
      "manipulacao": "E",
      "compostura": "E",
      "inteligencia": "E",
      "perspicacia": "E",
      "resolucao": "E"
    },
    "proficiencias": {
      "combateCorpoACorpo": "E",
      "armasDeFogo": "E",
      "magiasOfensivas": "E",
      "defesaProf": "E",
      "resistFisicaProf": "E",
      "resistMagicaProf": "E",
      "tecnicaProf": "E"
    },
    "procs": [],
    "attacks": [
      {
        "nome": "Ataque desarmado",
        "tipo": "marcial",
        "acerto": "+1",
        "dano": "0",
        "ferida": "1",
        "efeito": "",
        "profKey": "combateCorpoACorpo"
      }
    ],
    "itens": {
      "principais": [
        "Manto de veludo escarlate"
      ],
      "usaveis": [],
      "armadura": []
    },
    "habilidadesFicha": {
      "ativas": [],
      "especial": [
        {
          "name": "Ficha em aberto",
          "description": "Os dossiês não trazem graus, singularidade nem combate de Velmira. Todos os graus ficaram em E até o mestre definir."
        }
      ],
      "racial": [],
      "passivas": [],
      "extras": []
    },
    "hp": {
      "current": 2,
      "max": 2
    },
    "mp": {
      "current": 3,
      "max": 3
    },
    "sp": {
      "current": 3,
      "max": 3
    },
    "history": "IX Imperadora de Suth, reformista em um reino dogmático: buscou relações menos hostis com Amaranth e flexibilizou a administração. Foi culpada por parte da população e da cúpula militar pela rebelião da antiga Parteira, ocorrida em seu reinado. Passou o trono à filha Emphes Alpha sem ruptura e hoje atua como Conselheira Imperial, observando sem interferir diretamente. A relação com Emphes sempre foi de treinamento e disciplina, não de afeto.",
    "fichaFechada": true,
    "grupo": "suth"
  },
  {
    "id": "suth_victoria",
    "name": "Victoria Bunis",
    "epithet": "A Azaleia Escarlate · General do Exército Imperial",
    "race": "Suthence",
    "faction": "Suth",
    "affiliation": "Pilar da Imperadora de Suth · Exército Imperial",
    "height": "1,45m",
    "deity": "—",
    "weapon": "Espada curta e Machado Dragonslayer",
    "traits": "Baixa e compacta, mais de uma tonelada de peso; cabelos curtos brancos, olhos escarlates; manto vermelho com detalhes dourados. Estrita, pragmática, de bom coração; prefere a política à guerra, mas gosta quando a diplomacia falha. Parceiro: Hujimo Bunis. Gosta: doces, seu trabalho. Não gosta: ser chamada de pequena.",
    "xp": 0,
    "singularity": {
      "name": "Mass Power Body",
      "level": "A · Natural (Artificial)",
      "description": "Corpo com 20 vezes a massa normal (mais de uma tonelada; só a mão pesa 150 kg), sem perder velocidade. Muito mais forte e resistente que o normal; exige muita caloria e mana para o corpo não colapsar. Com magia de anjo, flutua e ignora o peso para locomoção. Rachaduras no chão por onde pisa."
    },
    "racialAbility": {
      "name": "Suthence de corpo reforçado",
      "description": "Corpo adaptado à própria densidade; armadura de liga especial para suportar o peso."
    },
    "classes": [
      {
        "name": "Guerreira B — espada e Dragonslayer axe (ficha antiga)",
        "description": "Combate curto e devastador; Magecraft D (flutuação) na ficha antiga."
      },
      {
        "name": "Golden Rule A — General do Exército Imperial",
        "description": "Principal defensora da Imperadora; une força e diplomacia, ensinada por Velmira."
      }
    ],
    "attributes": {},
    "atributosGerais": {
      "forca": "B",
      "destreza": "E",
      "vigor": "A",
      "carisma": "D",
      "manipulacao": "C",
      "compostura": "B",
      "inteligencia": "D",
      "perspicacia": "D",
      "resolucao": "C"
    },
    "proficiencias": {
      "combateCorpoACorpo": "C",
      "armasDeFogo": "E",
      "magiasOfensivas": "E",
      "defesaProf": "E",
      "resistFisicaProf": "B",
      "resistMagicaProf": "E",
      "tecnicaProf": "C",
      "lideranca": "B",
      "politica": "C",
      "persuasao": "D"
    },
    "procs": [
      "instinto_selvagem",
      "blindagem_reativa",
      "furia_crescente"
    ],
    "attacks": [
      {
        "nome": "Ataque desarmado",
        "tipo": "marcial",
        "acerto": "+1",
        "dano": "0",
        "ferida": "1",
        "efeito": "",
        "profKey": "combateCorpoACorpo"
      },
      {
        "nome": "Espada curta",
        "tipo": "marcial",
        "acerto": "0",
        "dano": "+1",
        "ferida": "1",
        "efeito": "",
        "profKey": "combateCorpoACorpo"
      },
      {
        "nome": "Machado Dragonslayer",
        "tipo": "marcial",
        "acerto": "-1",
        "dano": "+2",
        "ferida": "1",
        "efeito": "Troféu de um rival goethiano",
        "profKey": "combateCorpoACorpo"
      },
      {
        "nome": "Golpe de massa (1MP)",
        "tipo": "marcial",
        "acerto": "0",
        "dano": "+1",
        "ferida": "1",
        "efeito": "IMPACTO · peso do Mass Power Body · gasta 1MP",
        "profKey": "combateCorpoACorpo"
      }
    ],
    "itens": {
      "principais": [
        "Espada curta",
        "Machado Dragonslayer"
      ],
      "usaveis": [],
      "armadura": [
        "Armadura de placas imperial (reforçada para o próprio peso)"
      ]
    },
    "habilidadesFicha": {
      "ativas": [],
      "especial": [
        {
          "name": "Mass Power Body",
          "description": "Densidade 20x; peso não afeta a velocidade; consome calorias e mana; flutuação por magia de anjo."
        }
      ],
      "racial": [],
      "passivas": [],
      "extras": []
    },
    "hp": {
      "current": 6,
      "max": 6
    },
    "mp": {
      "current": 3,
      "max": 3
    },
    "sp": {
      "current": 3,
      "max": 3
    },
    "history": "General do Exército Imperial e principal defensora de Emphes. Aprendeu com Velmira a unir paciência e estratégia à força bruta; reformou o Exército Imperial, deixando de ser só auxiliar para ser tão temido quanto o Pilar da Santa. Liderou defesas bem-sucedidas contra Goethia e Katalão. Carrega o Dragonslayer, deixado por um general goethiano que ela respeitava e que traiu a própria pátria. Mãe adotiva de Valéria; seu parceiro Hujimo é o único cuja opinião a faz hesitar. Os graus numéricos desta ficha foram estimados: o dossiê não traz atributos.",
    "fichaFechada": true,
    "grupo": "suth"
  },
  {
    "id": "suth_valeria",
    "name": "Valéria Bunis",
    "epithet": "A Coluna de Ferro de Suth · Comandante do Exército Imperial",
    "race": "Suthence (filha adotiva)",
    "faction": "Suth",
    "affiliation": "Pilar da Imperadora de Suth · Exército Imperial",
    "height": "1,80m",
    "deity": "—",
    "weapon": "Maça Imperial de Guerra",
    "traits": "Atlética e musculosa, cabelos longos negros, olhos dourados incandescentes; armadura dourada com gemas azuis e manto azul. Responsável e profissional, severa mas justa; folga para beber, fazer compras, ler, tomar café e ver arte. Gosta: arte, café, ler, a Imperadora. Não gosta: quem desrespeita a Imperadora.",
    "xp": 0,
    "singularity": {
      "name": "Earth Army of Self",
      "level": "B · Divino",
      "description": "Molda com facilidade a superfície não biológica que toca em uma estátua de si. Com mana alta, as estátuas viram golens remotos. Pode transformar armaduras de inimigos em pequenas estatuetas dela, quebrando-as e travando o alvo."
    },
    "racialAbility": {
      "name": "Suthence adotada pelos Bunis",
      "description": "Filha adotiva de Victoria e Hujimo; formação militar de Victoria, tática de Hujimo."
    },
    "classes": [
      {
        "name": "Guerreira B — usuária de maça (ficha antiga)",
        "description": "Combate corpo a corpo e domínio de terreno; Magecraft C, Litomancia (ficha antiga)."
      },
      {
        "name": "Golden Rule A — Comandante / Guarda Imperial",
        "description": "Maior autoridade militar do Pilar da Imperadora; lidera na linha de frente."
      }
    ],
    "attributes": {},
    "atributosGerais": {
      "forca": "B",
      "destreza": "C",
      "vigor": "B",
      "carisma": "C",
      "manipulacao": "C",
      "compostura": "A",
      "inteligencia": "C",
      "perspicacia": "C",
      "resolucao": "B"
    },
    "proficiencias": {
      "combateCorpoACorpo": "C",
      "armasDeFogo": "E",
      "magiasOfensivas": "D",
      "defesaProf": "C",
      "resistFisicaProf": "C",
      "resistMagicaProf": "B",
      "tecnicaProf": "C",
      "lideranca": "B",
      "intimidacao": "C"
    },
    "procs": [
      "instinto_selvagem",
      "golpe_penetrante",
      "blindagem_reativa"
    ],
    "attacks": [
      {
        "nome": "Ataque desarmado",
        "tipo": "marcial",
        "acerto": "+1",
        "dano": "0",
        "ferida": "1",
        "efeito": "",
        "profKey": "combateCorpoACorpo"
      },
      {
        "nome": "Maça Imperial de Guerra",
        "tipo": "marcial",
        "acerto": "-1",
        "dano": "+2",
        "ferida": "1",
        "efeito": "IMPACTO · feita para esmagar armaduras",
        "profKey": "combateCorpoACorpo"
      }
    ],
    "itens": {
      "principais": [
        "Maça Imperial de Guerra"
      ],
      "usaveis": [],
      "armadura": [
        "Armadura dourada imperial com gemas azuis"
      ]
    },
    "habilidadesFicha": {
      "ativas": [],
      "especial": [
        {
          "name": "Earth Army of Self",
          "description": "Estátuas de si; golens remotos (mana alta); armadura inimiga vira estatueta. Litomancia (Magecraft C)."
        }
      ],
      "racial": [],
      "passivas": [],
      "extras": []
    },
    "hp": {
      "current": 5,
      "max": 5
    },
    "mp": {
      "current": 3,
      "max": 3
    },
    "sp": {
      "current": 3,
      "max": 3
    },
    "history": "Adotada jovem por Victoria e Hujimo Bunis; do primeiro herdou a disciplina, do segundo a mente tática. Comandante do Exército Imperial, considerada a mais poderosa dele. Lealdade absoluta à Imperadora, de quem exige que enfrente as próprias inseguranças. Quer, sem admitir, superar Victoria como maior comandante de Suth. Acredita que a força precisa ser provada para nunca ser contestada.",
    "fichaFechada": true,
    "grupo": "suth"
  },
  {
    "id": "suth_mars",
    "name": "Mars",
    "epithet": "A Guerra Encarnada · Coronel do Exército Imperial",
    "race": "Suthence",
    "faction": "Suth",
    "affiliation": "Pilar da Imperadora de Suth · Exército Imperial (sob Valéria)",
    "height": "—",
    "deity": "—",
    "weapon": "Lança de alta performance",
    "traits": "29 anos; cabelos prateados curtos e desalinhados, olhos dourados incandescentes; armadura híbrida com ornamentos dracônicos, manto branco queimado e coroa negra de espinhos flamejantes. Impulsiva mas responsável; odeia guerra e burocracia, mas é sempre enviada para guerras de fronteira. Gosta: action-figures, fofoca, pessoas famosas. Não gosta: guerra, injustiça, goethianos.",
    "xp": 0,
    "singularity": {
      "name": "Motor de Ignição: Berserker",
      "level": "D · Natural",
      "description": "Com a adrenalina subindo, o corpo esquenta e fica mais eficiente, ágil e forte; o poder cresce quanto mais ela luta. Não há limite conhecido para a adrenalina, mas quanto mais produz, mais instável mentalmente fica, podendo virar risco até para aliados."
    },
    "racialAbility": {
      "name": "Suthence de metabolismo explosivo",
      "description": "Resistência e estamina fora do comum (ficha antiga: Resistência A+, Estamina S)."
    },
    "classes": [
      {
        "name": "Guerreira B — usuária de lanças (ficha antiga)",
        "description": "Golpes longos, ágeis e de alto impacto. Magecraft C, pyromancia (ficha antiga)."
      },
      {
        "name": "Golden Rule A — Coronel do Exército Imperial (Guarda Imperial)",
        "description": "Visada para a próxima General; treinada por Victoria para liderar, mas prefere lutar na linha de frente."
      }
    ],
    "attributes": {},
    "atributosGerais": {
      "forca": "B",
      "destreza": "C",
      "vigor": "A",
      "carisma": "D",
      "manipulacao": "E",
      "compostura": "B",
      "inteligencia": "E",
      "perspicacia": "D",
      "resolucao": "B"
    },
    "proficiencias": {
      "combateCorpoACorpo": "C",
      "armasDeFogo": "E",
      "magiasOfensivas": "D",
      "defesaProf": "B",
      "resistFisicaProf": "B",
      "resistMagicaProf": "C",
      "tecnicaProf": "C",
      "atletismo": "C"
    },
    "procs": [
      "instinto_selvagem",
      "toque_flamejante",
      "furia_crescente"
    ],
    "attacks": [
      {
        "nome": "Ataque desarmado",
        "tipo": "marcial",
        "acerto": "+1",
        "dano": "0",
        "ferida": "1",
        "efeito": "",
        "profKey": "combateCorpoACorpo"
      },
      {
        "nome": "Lança de alta performance",
        "tipo": "marcial",
        "acerto": "0",
        "dano": "+1",
        "ferida": "1",
        "efeito": "",
        "profKey": "combateCorpoACorpo"
      },
      {
        "nome": "Lança incandescente (1MP)",
        "tipo": "marcial",
        "acerto": "0",
        "dano": "+1",
        "ferida": "1",
        "efeito": "CHAMAS · pyromancia · gasta 1MP",
        "profKey": "combateCorpoACorpo"
      },
      {
        "nome": "Pyromancia (1MP)",
        "tipo": "magico",
        "acerto": "+1",
        "dano": "+1",
        "ferida": "1",
        "efeito": "CHAMAS · gasta 1MP",
        "profKey": "magiasOfensivas"
      }
    ],
    "itens": {
      "principais": [
        "Lança de alta performance"
      ],
      "usaveis": [],
      "armadura": [
        "Armadura híbrida com ornamentos dracônicos"
      ]
    },
    "habilidadesFicha": {
      "ativas": [],
      "especial": [
        {
          "name": "Motor de Ignição: Berserker",
          "description": "Poder e calor crescem enquanto luta; instabilidade mental cresce junto."
        }
      ],
      "racial": [],
      "passivas": [],
      "extras": []
    },
    "hp": {
      "current": 6,
      "max": 6
    },
    "mp": {
      "current": 3,
      "max": 3
    },
    "sp": {
      "current": 3,
      "max": 3
    },
    "history": "Nasceu para a guerra sem gostar dela: é a coronel que mais lutou em território nacional. Respeitada pelas tropas, admirada e temida, mas sem talento natural para comandar. Victoria a treina para ser General; Mars teme nunca preencher o posto e, no fundo, que sem a guerra não seja nada. Respeita Victoria como mentora e teme Valéria, que pode derrotá-la em combate direto. Ficha construída a partir do bloco detalhado de atributos do dossiê (o resumo do topo traz valores um pouco diferentes).",
    "fichaFechada": true,
    "grupo": "suth"
  },
  {
    "id": "suth_zero",
    "name": "ZERO",
    "epithet": "A Arquiteta da Vida · Líder do Pilar da Parteira",
    "race": "Biotecnológica (única)",
    "faction": "Suth",
    "affiliation": "Pilar da Parteira de Suth",
    "height": "3 m+",
    "deity": "Reconhece Ishan e Nekron (mas vê o poder de criar como superior)",
    "weapon": "Apêndices mecânicos",
    "traits": "Mais de 3 metros: tronco humanoide androgino sobre base mecânica de aranha, manto branco estéril com símbolos dourados, vários braços metálicos, sensores no lugar dos olhos, voz de múltiplas máquinas. Mente de três facetas: a Calculadora, a Criadora e a Humanista. Trata os outros como animaizinhos. Gosta: a vida de todos, suas pesquisas, conhecimento. Não gosta: Thalia, interrupções, incompetência.",
    "xp": 0,
    "singularity": {
      "name": "Golden Rule EX — Biotecnologia, Magia e Ciência",
      "level": "EX",
      "description": "Modifica qualquer matéria viva ou sintética com precisão; cria vida, homúnculos, próteses vivas e híbridos tecnobiológicos; reconfigura o próprio corpo. Mente de três camadas que não pode ser lida por telepatia."
    },
    "racialAbility": {
      "name": "Corpo biomecânico de aranha",
      "description": "Base mecânica aranhoide, múltiplos apêndices independentes com ferramentas cirúrgicas, manipuladores de mana e interfaces neurais."
    },
    "classes": [
      {
        "name": "Necromante S+ (Magecraft S+, necromancia — ficha antiga)",
        "description": "Domínio máximo da magia da morte; liga o poder de criar ao de desfazer."
      },
      {
        "name": "Golden Rule EX — Líder do Pilar da Parteira",
        "description": "Governa a biotecnologia de Suth, assumiu o Pilar após a rebelião da antiga Parteira."
      }
    ],
    "attributes": {},
    "atributosGerais": {
      "forca": "C",
      "destreza": "E",
      "vigor": "C",
      "carisma": "E",
      "manipulacao": "C",
      "compostura": "A",
      "inteligencia": "A",
      "perspicacia": "B",
      "resolucao": "A"
    },
    "proficiencias": {
      "combateCorpoACorpo": "E",
      "armasDeFogo": "E",
      "magiasOfensivas": "A",
      "defesaProf": "D",
      "resistFisicaProf": "C",
      "resistMagicaProf": "B",
      "tecnicaProf": "C",
      "ciencia": "A",
      "medicina": "A",
      "magiasGerais": "B",
      "ocultismo": "C"
    },
    "procs": [
      "escudo_de_mana",
      "surto_arcano",
      "persistente"
    ],
    "attacks": [
      {
        "nome": "Ataque desarmado",
        "tipo": "marcial",
        "acerto": "+1",
        "dano": "0",
        "ferida": "1",
        "efeito": "",
        "profKey": "combateCorpoACorpo"
      },
      {
        "nome": "Apêndices cirúrgicos",
        "tipo": "marcial",
        "acerto": "0",
        "dano": "+1",
        "ferida": "1",
        "efeito": "",
        "profKey": "combateCorpoACorpo"
      },
      {
        "nome": "Necromancia (1MP)",
        "tipo": "magico",
        "acerto": "+2",
        "dano": "+1",
        "ferida": "1",
        "efeito": "Magia da morte · gasta 1MP (efeito narrativo)",
        "profKey": "magiasOfensivas"
      }
    ],
    "itens": {
      "principais": [
        "Manto branco estéril"
      ],
      "usaveis": [],
      "armadura": []
    },
    "habilidadesFicha": {
      "ativas": [],
      "especial": [
        {
          "name": "Mente de Três Camadas",
          "description": "Calculadora, Criadora e Humanista decidem de formas distintas; o atrito entre elas pode atrasar decisões."
        },
        {
          "name": "Aura de Presença Divina",
          "description": "Quem está diante dela se sente um experimento."
        }
      ],
      "racial": [],
      "passivas": [],
      "extras": []
    },
    "hp": {
      "current": 5,
      "max": 5
    },
    "mp": {
      "current": 3,
      "max": 3
    },
    "sp": {
      "current": 3,
      "max": 3
    },
    "history": "Líder suprema da biotecnologia de Suth, projetada e lapidada ao longo de séculos; assumiu o Pilar da Parteira após a execução da antiga líder na rebelião. Cria homúnculos, soldados e aprimoramentos para o reino. Considera o universo um laboratório e cada ser vivo uma tese em andamento, mas sua faceta Humanista hesita em descartar criações que sobrevivem. Draguna é sua obra-prima. Os graus numéricos desta ficha foram estimados: o dossiê é narrativo e não traz atributos.",
    "fichaFechada": true,
    "grupo": "suth"
  },
  {
    "id": "suth_kirilia",
    "name": "Kirilia",
    "epithet": "A Lâmina Exilada · Força Auxiliar do Pilar da Parteira",
    "race": "Suthence",
    "faction": "Suth",
    "affiliation": "Pilar da Parteira de Suth (antes: Pilar da Santa)",
    "height": "—",
    "deity": "—",
    "weapon": "Espada longa",
    "traits": "27 anos; cabelos loiros longos presos com fitas vermelhas, olhar afiado e melancólico, traje prático e sem adornos. Obcecada por lutas, armas e aprimoramento; respeita as soldadas de baixo escalão. Filha da Santa e de Maria Celis. Gosta: espadas, estilos de luta diferentes, combate. Não gosta: Fate Sabato, pessoas fracas, a família Gotis de Katalão.",
    "xp": 0,
    "singularity": {
      "name": "Ponto Fixo",
      "level": "D · Artificial",
      "description": "Fixa no espaço um ponto que toca com as mãos (considera a rotação da Terra) e aprendeu a estender isso à espada. O ponto não passa de 3 cm; nenhuma força menor que Força A ou Potência A vence o ponto fixo."
    },
    "racialAbility": {
      "name": "Suthence treinada por heroína",
      "description": "Criada e treinada por Maria Celis, heroína de 1000 PO; lutou ao lado de vários batalhões entre 1015 PO e 1020 PO."
    },
    "classes": [
      {
        "name": "Artista Marcial A — Estilo dos Cinco Elementos (ficha antiga)",
        "description": "Estilo secreto herdado do herói Gotis de Katalão; Guerreira C, usuária de espada longa (ficha antiga)."
      },
      {
        "name": "Golden Rule B — Soldada da Santa e da Parteira",
        "description": "Transferida da Santa para a Parteira após perder a honra; respeitada pelas tropas de Suth."
      }
    ],
    "attributes": {},
    "atributosGerais": {
      "forca": "C",
      "destreza": "B",
      "vigor": "C",
      "carisma": "E",
      "manipulacao": "E",
      "compostura": "B",
      "inteligencia": "C",
      "perspicacia": "B",
      "resolucao": "A"
    },
    "proficiencias": {
      "combateCorpoACorpo": "B",
      "armasDeFogo": "E",
      "magiasOfensivas": "E",
      "defesaProf": "B",
      "resistFisicaProf": "C",
      "resistMagicaProf": "E",
      "tecnicaProf": "B",
      "sobrevivencia": "D"
    },
    "procs": [
      "golpe_certeiro",
      "reflexo_agil",
      "furia_crescente"
    ],
    "attacks": [
      {
        "nome": "Ataque desarmado",
        "tipo": "marcial",
        "acerto": "+1",
        "dano": "0",
        "ferida": "1",
        "efeito": "",
        "profKey": "combateCorpoACorpo"
      },
      {
        "nome": "Espada longa",
        "tipo": "marcial",
        "acerto": "0",
        "dano": "+1",
        "ferida": "1",
        "efeito": "",
        "profKey": "combateCorpoACorpo"
      },
      {
        "nome": "Espada — Fogo (1MP)",
        "tipo": "marcial",
        "acerto": "0",
        "dano": "+1",
        "ferida": "1",
        "efeito": "CHAMAS · Cinco Elementos (Fogo) · gasta 1MP",
        "profKey": "combateCorpoACorpo"
      },
      {
        "nome": "Espada — Terra (1MP)",
        "tipo": "marcial",
        "acerto": "0",
        "dano": "+1",
        "ferida": "1",
        "efeito": "IMPACTO · Cinco Elementos (Terra), espada muito pesada · gasta 1MP",
        "profKey": "combateCorpoACorpo"
      }
    ],
    "itens": {
      "principais": [
        "Espada longa"
      ],
      "usaveis": [],
      "armadura": [
        "Armadura leve sem adornos"
      ]
    },
    "habilidadesFicha": {
      "ativas": [],
      "especial": [
        {
          "name": "Estilo dos Cinco Elementos (singularidade E · Artificial)",
          "description": "Madeira (eletricidade): paralisa o alvo; Fogo: lâmina flamejante; Terra: espada pesada; Metal: fio aprimorado que corta materiais reforçados; Água: cortes fluidos que ignoram defesas físicas. Sincroniza com a mana local."
        }
      ],
      "racial": [],
      "passivas": [],
      "extras": []
    },
    "hp": {
      "current": 4,
      "max": 4
    },
    "mp": {
      "current": 3,
      "max": 3
    },
    "sp": {
      "current": 3,
      "max": 3
    },
    "history": "Seria uma das mais renomadas guerreiras do Pilar da Santa, até ser derrotada por Fate Sabato e expulsa. No exílio viveu com as tropas de baixo escalão e aprendeu que toda vida tem valor. Hoje busca a perfeição na arte da espada, sem querer voltar à Santa nem se vingar. Responde à ZERO, a única líder que não tenta controlá-la. Mais tarde ela também derrotou Fate Sabato, mas com estratégia e aliados, não em duelo. Níveis: o documento de Suth (Guerreira C, Artista Marcial A) foi preferido ao dossiê (B e A+).",
    "fichaFechada": true,
    "grupo": "suth"
  },
  {
    "id": "suth_galantia",
    "name": "Galantia",
    "epithet": "Ex-General da Estagnação · agente da Imperadora",
    "race": "Homúnculo (corpo aprimorado)",
    "faction": "Suth",
    "affiliation": "Pilar da Imperadora de Suth (antes: Pilar da Parteira)",
    "height": "—",
    "deity": "—",
    "weapon": "Espada longa",
    "traits": "49 anos; cabelos loiros retos e sem brilho, olhos verdes vazios, postura rígida; manto branco forrado de pele escura e armadura azul e preta simples. Conformista, lenta e tranquila; segue ordens sem questionar, sem bússola moral. Gosta: comer, dormir, evitar trabalho. Não gosta: deixar trabalho por fazer, lutar.",
    "xp": 0,
    "singularity": {
      "name": "Ponto Fixo",
      "level": "A · Natural (Artificial)",
      "description": "Fixa pontos no espaço dentro do campo de visão (considera a rotação da Terra); o ponto não passa de 3 cm e nenhuma força menor que Força A ou Potência A o move. Tem um olho escondido com cinco pequenos olhos presos por tentáculos que expandem a singularidade até seis pontos; mantê-los ativos consome muita mana."
    },
    "racialAbility": {
      "name": "Homúnculo A+ — corpo aprimorado (ficha antiga)",
      "description": "Geneticamente melhorada pelo Pilar da Parteira: muito resistente e ágil. Modificações divinas Krovskin."
    },
    "classes": [
      {
        "name": "Guerreira C — usuária de espada (ficha antiga)",
        "description": "Golpes precisos e sem excessos; usa a singularidade para abrir brechas."
      },
      {
        "name": "Golden Rule A — Ex-General da Parteira",
        "description": "Sem título, ainda respeitada por muitas guerreiras; hoje agente especial de Emphes."
      }
    ],
    "attributes": {},
    "atributosGerais": {
      "forca": "B",
      "destreza": "C",
      "vigor": "B",
      "carisma": "D",
      "manipulacao": "D",
      "compostura": "B",
      "inteligencia": "C",
      "perspicacia": "C",
      "resolucao": "E"
    },
    "proficiencias": {
      "combateCorpoACorpo": "D",
      "armasDeFogo": "E",
      "magiasOfensivas": "E",
      "defesaProf": "C",
      "resistFisicaProf": "A",
      "resistMagicaProf": "D",
      "tecnicaProf": "B",
      "lideranca": "C"
    },
    "procs": [
      "golpe_certeiro",
      "blindagem_reativa",
      "fortaleza_viva"
    ],
    "attacks": [
      {
        "nome": "Ataque desarmado",
        "tipo": "marcial",
        "acerto": "+1",
        "dano": "0",
        "ferida": "1",
        "efeito": "",
        "profKey": "combateCorpoACorpo"
      },
      {
        "nome": "Espada longa",
        "tipo": "marcial",
        "acerto": "0",
        "dano": "+1",
        "ferida": "1",
        "efeito": "",
        "profKey": "combateCorpoACorpo"
      }
    ],
    "itens": {
      "principais": [
        "Espada longa",
        "Manto branco forrado de pele"
      ],
      "usaveis": [],
      "armadura": [
        "Armadura azul e preta simples"
      ]
    },
    "habilidadesFicha": {
      "ativas": [],
      "especial": [
        {
          "name": "Ponto Fixo — âncoras",
          "description": "Até 6 pontos fixos ao mesmo tempo com os olhos ocultos; custo de mana extremo."
        }
      ],
      "racial": [],
      "passivas": [],
      "extras": []
    },
    "hp": {
      "current": 5,
      "max": 5
    },
    "mp": {
      "current": 3,
      "max": 3
    },
    "sp": {
      "current": 3,
      "max": 3
    },
    "history": "Seguiu sem hesitar a antiga Parteira na rebelião; aceitou o julgamento calada e passou anos presa em Amaranth. Poupada por ter uma singularidade valiosa e reputação de general, foi libertada por Emphes, sem devolver o cargo. Sente pela primeira vez uma semente de dúvida sobre seguir ordens cegamente. ZERO, a nova Parteira, nunca confiou nela. Respeita Victoria e a força de Draguna, que ocupou seu posto.",
    "fichaFechada": true,
    "grupo": "suth"
  },
  {
    "id": "suth_kyubei",
    "name": "Kyubei",
    "epithet": "O Olho Direito do Dragão · Cavaleira de Omen",
    "race": "Homúnculo suthence (modificada)",
    "faction": "Suth",
    "affiliation": "Cavaleiros de Omen (antes: Pilar da Parteira)",
    "height": "1,83m",
    "deity": "—",
    "weapon": "Katana forjada pela Irmandade da Forja de Goethia",
    "traits": "38 anos; cabelos negros longos e bem presos, olho direito verde-esmeralda e tapa-olho no esquerdo. Direta, honrada, com forte bússola moral, esforçada em tudo; bebe chá amargo. Gosta: chá, pessoas fortes e determinadas. Não gosta: pessoas indecisas, comida salgada, homens em geral.",
    "xp": 0,
    "singularity": {
      "name": "Olho de Kronos",
      "level": "A · Divino (Artificial)",
      "description": "Vê até 3 segundos no futuro (apesar do nome, é o olho esquerdo). O futuro visto é a soma de todas as possibilidades e pode ser alterado. Manter o olho ativo consome muita mana e energia."
    },
    "racialAbility": {
      "name": "Homúnculo C — corpo modificado (ficha antiga)",
      "description": "Corpo inteiro modificado de forma superior; Kyubei Goethis Suth."
    },
    "classes": [
      {
        "name": "Artista Marcial B — usuária de espada (ficha antiga)",
        "description": "Mestre do Iaijutsu (saque rápido); infiltradora e espadachim de elite."
      },
      {
        "name": "Golden Rule EX — Coronel da Parteira e Cavaleira de Omen",
        "description": "Fiel a Suth na rebelião, depois recrutada pelos Cavaleiros de Omen (1020 PO); atua em missões de sigilo."
      }
    ],
    "attributes": {},
    "atributosGerais": {
      "forca": "D",
      "destreza": "A",
      "vigor": "C",
      "carisma": "E",
      "manipulacao": "E",
      "compostura": "C",
      "inteligencia": "C",
      "perspicacia": "C",
      "resolucao": "B"
    },
    "proficiencias": {
      "combateCorpoACorpo": "C",
      "armasDeFogo": "E",
      "magiasOfensivas": "E",
      "defesaProf": "A",
      "resistFisicaProf": "D",
      "resistMagicaProf": "C",
      "tecnicaProf": "A",
      "furtividade": "B",
      "sobrevivencia": "C",
      "percepcao": "C"
    },
    "procs": [
      "reflexo_agil",
      "golpe_certeiro",
      "fortaleza_viva"
    ],
    "attacks": [
      {
        "nome": "Ataque desarmado",
        "tipo": "marcial",
        "acerto": "+1",
        "dano": "0",
        "ferida": "1",
        "efeito": "",
        "profKey": "combateCorpoACorpo"
      },
      {
        "nome": "Katana (Iaijutsu)",
        "tipo": "marcial",
        "acerto": "0",
        "dano": "+1",
        "ferida": "1",
        "efeito": "Saque rápido",
        "profKey": "combateCorpoACorpo"
      }
    ],
    "itens": {
      "principais": [
        "Katana da Forja de Goethia",
        "Tapa-olho"
      ],
      "usaveis": [
        "Chá amargo"
      ],
      "armadura": []
    },
    "habilidadesFicha": {
      "ativas": [],
      "especial": [
        {
          "name": "Olho de Kronos",
          "description": "3 segundos de futuro; custo alto de mana e energia."
        }
      ],
      "racial": [],
      "passivas": [],
      "extras": []
    },
    "hp": {
      "current": 4,
      "max": 4
    },
    "mp": {
      "current": 3,
      "max": 3
    },
    "sp": {
      "current": 3,
      "max": 3
    },
    "history": "Recusou trair Suth quando a comandante Galantia aderiu à rebelião da antiga Parteira e foi essencial em sua supressão (1000 a 1002 PO). Promovida a Coronel, ficou com reputação ambígua: heroína para umas, traidora de suas irmãs para outras. Em 1020 PO deixou Suth para os Cavaleiros de Omen. Não confia em Draguna, vê em Victoria alguém digno de absoluto respeito e em Valéria uma comandante emocional demais. Conflito de fontes: o dossiê dá Destreza A+ e Reflexos S, o documento de Suth dá Artista Marcial B. Foram combinados.",
    "fichaFechada": true,
    "grupo": "suth"
  },
  {
    "id": "suth_draguna",
    "name": "Draguna",
    "epithet": "A Quimera Perfeita · General do Exército da Parteira",
    "race": "Homúnculo Perfeito",
    "faction": "Suth",
    "affiliation": "Pilar da Parteira de Suth",
    "height": "1,85m",
    "deity": "—",
    "weapon": "Garras biológicas e lâminas ósseas",
    "traits": "Corpo de fusão de várias criaturas, composição genética conhecida só por ZERO. Preguiçosa e gulosa fora de combate, brutal e incansável em combate; segue ordens sem questionar e só poupa vidas por ordem de ZERO. Gosta: donuts, doces, dormir. Não gosta: trabalhar demais, poupar inimigos, ordens demoradas, pessoas muito ativas.",
    "xp": 0,
    "singularity": {
      "name": "Selfmancia",
      "level": "EX · Divino (Artificial)",
      "description": "Controle absoluto da estrutura do corpo: regeneração quase instantânea, morfose, peso e densidade variáveis. Analisa singularidades naturais e as replica temporariamente, podendo combiná-las, com consumo de energia proporcional ao poder."
    },
    "racialAbility": {
      "name": "Homúnculo EX — modificações supremas (ficha antiga)",
      "description": "Corpo de combate perfeito, limitado pela preguiça e pelo gasto de energia."
    },
    "classes": [
      {
        "name": "Guerreira D — espadas e garras (ficha antiga)",
        "description": "Estilo caótico e imprevisível."
      },
      {
        "name": "Golden Rule A — General da Parteira",
        "description": "Ponta da lança do exército biotecnológico: captura, supressão e testes de campo."
      }
    ],
    "attributes": {},
    "atributosGerais": {
      "forca": "B",
      "destreza": "C",
      "vigor": "A",
      "carisma": "E",
      "manipulacao": "D",
      "compostura": "C",
      "inteligencia": "E",
      "perspicacia": "E",
      "resolucao": "C"
    },
    "proficiencias": {
      "combateCorpoACorpo": "E",
      "armasDeFogo": "E",
      "magiasOfensivas": "E",
      "defesaProf": "C",
      "resistFisicaProf": "A",
      "resistMagicaProf": "C",
      "tecnicaProf": "B"
    },
    "procs": [
      "instinto_selvagem",
      "golpe_penetrante",
      "furia_crescente"
    ],
    "attacks": [
      {
        "nome": "Ataque desarmado",
        "tipo": "marcial",
        "acerto": "+1",
        "dano": "0",
        "ferida": "1",
        "efeito": "",
        "profKey": "combateCorpoACorpo"
      },
      {
        "nome": "Garras biológicas",
        "tipo": "marcial",
        "acerto": "0",
        "dano": "+1",
        "ferida": "1",
        "efeito": "",
        "profKey": "combateCorpoACorpo"
      },
      {
        "nome": "Lâminas ósseas",
        "tipo": "marcial",
        "acerto": "0",
        "dano": "+1",
        "ferida": "1",
        "efeito": "",
        "profKey": "combateCorpoACorpo"
      }
    ],
    "itens": {
      "principais": [],
      "usaveis": [
        "Donuts"
      ],
      "armadura": []
    },
    "habilidadesFicha": {
      "ativas": [],
      "especial": [
        {
          "name": "Selfmancia",
          "description": "Regeneração, morfose, peso variável; replica singularidades naturais temporariamente (custo alto)."
        }
      ],
      "racial": [],
      "passivas": [],
      "extras": []
    },
    "hp": {
      "current": 6,
      "max": 6
    },
    "mp": {
      "current": 3,
      "max": 3
    },
    "sp": {
      "current": 3,
      "max": 3
    },
    "history": "Projetada por ZERO no auge da revolução biotecnológica de Suth como guerreira definitiva; substituiu Galantia como General da Parteira. Vê-se como ferramenta e só quer seguir ordens e continuar existindo. Não sente remorso nem empatia; sua única conexão com o mundo são a fome e o descanso. Preferir capturar a matar é só obediência a ZERO. Sua preguiça limita o potencial.",
    "fichaFechada": true,
    "grupo": "suth"
  },
  {
    "id": "suth_athena",
    "name": "Athena",
    "epithet": "A Ex-General do Amanhã · Unidade Especial da Imperadora",
    "race": "Homúnculo (corpo modificado)",
    "faction": "Suth",
    "affiliation": "Pilar da Imperadora de Suth (antes: Pilar da Santa)",
    "height": "—",
    "deity": "—",
    "weapon": "Lança",
    "traits": "Cabelo dourado trançado, olhos verde-esmeralda desafiadores; manto branco de pele e armadura reforçada. Intensa, possessiva, dominadora; resolve tudo ela mesma e age ignorando normas sociais e como as pessoas se sentem. Mãe de Athermis; tia de Farron. Gosta: vencer, duelos, disciplina, liderança, respeito. Não gosta: perder, ser subestimada, aceitar ordens sem questionar.",
    "xp": 0,
    "singularity": {
      "name": "Corpo de Luz",
      "level": "A · Divino (Artificial)",
      "description": "Transforma partes do corpo ou o corpo todo em partículas de luz, que viajam a velocidades superiores até à Velocidade A, não têm massa e queimam. Escolhe livremente quais partes viram luz. Intangibilidade parcial e ataques de luz que cortam barreiras mágicas. Gasta muita mana."
    },
    "racialAbility": {
      "name": "Homúnculo B — corpo modificado (ficha antiga)",
      "description": "Modificada geneticamente para maximizar resistência e força."
    },
    "classes": [
      {
        "name": "Guerreira A — usuária de lança (ficha antiga)",
        "description": "Mestre em lanças, golpes comparados a um relâmpago."
      },
      {
        "name": "Golden Rule A — Ex-General da Santa",
        "description": "Lutou ao lado de Galantia na rebelião da Parteira; capturada, presa em Amaranth e libertada por Emphes como 'arma sem exército'."
      }
    ],
    "attributes": {},
    "atributosGerais": {
      "forca": "D",
      "destreza": "B",
      "vigor": "C",
      "carisma": "C",
      "manipulacao": "C",
      "compostura": "A",
      "inteligencia": "C",
      "perspicacia": "C",
      "resolucao": "B"
    },
    "proficiencias": {
      "combateCorpoACorpo": "B",
      "armasDeFogo": "E",
      "magiasOfensivas": "E",
      "defesaProf": "B",
      "resistFisicaProf": "C",
      "resistMagicaProf": "C",
      "tecnicaProf": "B",
      "lideranca": "B",
      "intimidacao": "C"
    },
    "procs": [
      "golpe_certeiro",
      "reflexo_agil",
      "furia_crescente"
    ],
    "attacks": [
      {
        "nome": "Ataque desarmado",
        "tipo": "marcial",
        "acerto": "+1",
        "dano": "0",
        "ferida": "1",
        "efeito": "",
        "profKey": "combateCorpoACorpo"
      },
      {
        "nome": "Lança",
        "tipo": "marcial",
        "acerto": "0",
        "dano": "+1",
        "ferida": "1",
        "efeito": "",
        "profKey": "combateCorpoACorpo"
      },
      {
        "nome": "Lança de luz (1MP)",
        "tipo": "marcial",
        "acerto": "0",
        "dano": "+1",
        "ferida": "1",
        "efeito": "Ataque de luz: queima e corta barreiras mágicas (efeito narrativo) · gasta 1MP",
        "profKey": "combateCorpoACorpo"
      }
    ],
    "itens": {
      "principais": [
        "Lança",
        "Manto branco de pele"
      ],
      "usaveis": [],
      "armadura": [
        "Armadura reforçada"
      ]
    },
    "habilidadesFicha": {
      "ativas": [],
      "especial": [
        {
          "name": "Corpo de Luz",
          "description": "Luz parcial ou total; movimento de luz; intangibilidade parcial; ataques de luz."
        }
      ],
      "racial": [],
      "passivas": [],
      "extras": []
    },
    "hp": {
      "current": 4,
      "max": 4
    },
    "mp": {
      "current": 3,
      "max": 3
    },
    "sp": {
      "current": 3,
      "max": 3
    },
    "history": "Já foi a maior general do Pilar da Santa, nunca derrotada em combate direto. Aliou-se à rebelião da Parteira, foi capturada e passou anos presa em Amaranth. Libertada por ordem de Emphes, atua em missões sob ordens diretas da Imperadora: uma 'coleira disfarçada'. Despreza a aceitação resignada de Galantia e alimenta o desejo de restaurar a própria glória.",
    "fichaFechada": true,
    "grupo": "suth"
  },
  {
    "id": "suth_azula",
    "name": "Azula",
    "epithet": "A Faísca Divina · General da Santa",
    "race": "Homúnculo de Alta Performance",
    "faction": "Suth",
    "affiliation": "Pilar da Santa de Suth",
    "height": "—",
    "deity": "—",
    "weapon": "Decretos divinos (magia de luz)",
    "traits": "Pele pálida, olhos azuis brilhantes, cabelos loiros longos e ondulados cobertos por um véu negro; trajes cerimoniais negros e azuis e coroa de espinhos. Direta, disciplinada e insegura por baixo da frieza; leal ao cargo, não às pessoas. Gosta: batalhas bem planejadas, ordem, disciplina. Não gosta: sentir-se perdida, desorganização, bajulação vazia.",
    "xp": 0,
    "singularity": {
      "name": "Decretos Divinos (Faísca Divina)",
      "level": "A · Divino (Artificial)",
      "description": "Absorve a mana do ambiente e a converte, recuperando rapidamente a mana gasta. Tem encantamentos variados no corpo, sustentados pela regeneração da singularidade. Cria encantamentos com os ataques: esferas de mana que ativam com o tempo ou sob condições e produzem vários efeitos, chamadas Decretos. Pode soltar descargas de luz que queimam corpo e alma. Risco de sobrecarga e colapso energético."
    },
    "racialAbility": {
      "name": "Homúnculo B — corpo aprimorado (ficha antiga)",
      "description": "Homúnculo de infantaria cuja singularidade despertou por erro ou milagre; seu caso é único e irrepetível."
    },
    "classes": [
      {
        "name": "Maga de encantamentos — Magecraft A (ficha antiga)",
        "description": "Encantamentos variados; magia divina B+ na ficha antiga."
      },
      {
        "name": "Golden Rule A — General da Santa",
        "description": "Ascendeu de soldada comum a General da Santa, sem preparo para comandar."
      }
    ],
    "attributes": {},
    "atributosGerais": {
      "forca": "D",
      "destreza": "D",
      "vigor": "D",
      "carisma": "D",
      "manipulacao": "E",
      "compostura": "B",
      "inteligencia": "B",
      "perspicacia": "D",
      "resolucao": "B"
    },
    "proficiencias": {
      "combateCorpoACorpo": "E",
      "armasDeFogo": "E",
      "magiasOfensivas": "B",
      "defesaProf": "C",
      "resistFisicaProf": "C",
      "resistMagicaProf": "A",
      "tecnicaProf": "C",
      "lideranca": "D",
      "magiasGerais": "C"
    },
    "procs": [
      "surto_arcano",
      "escudo_de_mana",
      "persistente"
    ],
    "attacks": [
      {
        "nome": "Ataque desarmado",
        "tipo": "marcial",
        "acerto": "+1",
        "dano": "0",
        "ferida": "1",
        "efeito": "",
        "profKey": "combateCorpoACorpo"
      },
      {
        "nome": "Descarga de luz (1MP)",
        "tipo": "magico",
        "acerto": "+2",
        "dano": "+1",
        "ferida": "1",
        "efeito": "Rajada de luz que queima corpos e almas (efeito narrativo) · gasta 1MP",
        "profKey": "magiasOfensivas"
      }
    ],
    "itens": {
      "principais": [
        "Coroa de espinhos do Pilar da Santa"
      ],
      "usaveis": [],
      "armadura": []
    },
    "habilidadesFicha": {
      "ativas": [],
      "especial": [
        {
          "name": "Decretos",
          "description": "Esferas de mana encantadas que ativam por tempo ou condição (efeito narrativo)."
        },
        {
          "name": "Absorção de mana ambiente",
          "description": "Recupera mana gasta rapidamente; MP 5 por esse motivo."
        }
      ],
      "racial": [],
      "passivas": [],
      "extras": []
    },
    "hp": {
      "current": 4,
      "max": 4
    },
    "mp": {
      "current": 5,
      "max": 5
    },
    "sp": {
      "current": 3,
      "max": 3
    },
    "history": "Criada por ZERO como experimento para forçar o despertar de singularidades em soldados comuns; o caso de Azula foi único. Numa batalha, a Faísca Divina aniquilou o exército inimigo e a tornou lenda de um dia para o outro: de soldada sem nome a General da Santa. Não foi preparada para comandar, é brilhante em combate e insegura fora dele. O que mais teme é o vazio de não saber quem realmente é.",
    "fichaFechada": true,
    "grupo": "suth"
  },
  {
    "id": "suth_farron",
    "name": "Farron",
    "epithet": "A Arma Divina · Coronel da Santa",
    "race": "Suthence (nascida de parto natural)",
    "faction": "Suth",
    "affiliation": "Pilar da Santa de Suth (antes: Pilar da Imperadora)",
    "height": "—",
    "deity": "—",
    "weapon": "Espada e escudo",
    "traits": "Cabelo rosa-claro longo e desgrenhado, olhos azul-acinzentados cortantes; traje de combate reforçado. Silenciosa, disciplinada e pragmática; isolada emocionalmente, não acredita em glória nem destino. Sobrenome apagado após a traição da família. Gosta: duelos justos, disciplina, treinamento extremo. Não gosta: covardia, sentimentalismo, traição, hesitação.",
    "xp": 0,
    "singularity": {
      "name": "Constructo de Luz",
      "level": "B · Divino (Artificial)",
      "description": "Cria construtos e armas de partículas de luz. Conforme o dossiê, forja espadas, lanças e adagas de luz sólida, dispara raios cortantes de alta perfuração que atravessam armaduras e escudos mágicos, e manipula a ausência de luz para criar escuridão. Mais forte em locais iluminados. Manipulações complexas desgastam o corpo e a mana."
    },
    "racialAbility": {
      "name": "Linhagem de guerreiras de elite",
      "description": "Sangue de uma família nobre de tradição militar e biotecnológica; a singularidade veio desde o nascimento."
    },
    "classes": [
      {
        "name": "Guerreira A — espada e escudo (ficha antiga)",
        "description": "Uma das melhores duelistas de Suth; Magecraft B, Luminocraft (ficha antiga)."
      },
      {
        "name": "Golden Rule A — Coronel da Santa",
        "description": "Recusou o posto de General por não se achar forte o bastante."
      }
    ],
    "attributes": {},
    "atributosGerais": {
      "forca": "C",
      "destreza": "B",
      "vigor": "C",
      "carisma": "E",
      "manipulacao": "D",
      "compostura": "B",
      "inteligencia": "C",
      "perspicacia": "C",
      "resolucao": "C"
    },
    "proficiencias": {
      "combateCorpoACorpo": "B",
      "armasDeFogo": "E",
      "magiasOfensivas": "C",
      "defesaProf": "C",
      "resistFisicaProf": "D",
      "resistMagicaProf": "D",
      "tecnicaProf": "B",
      "lideranca": "D"
    },
    "procs": [
      "golpe_certeiro",
      "golpe_penetrante",
      "reflexo_agil"
    ],
    "attacks": [
      {
        "nome": "Ataque desarmado",
        "tipo": "marcial",
        "acerto": "+1",
        "dano": "0",
        "ferida": "1",
        "efeito": "",
        "profKey": "combateCorpoACorpo"
      },
      {
        "nome": "Espada",
        "tipo": "marcial",
        "acerto": "0",
        "dano": "+1",
        "ferida": "1",
        "efeito": "",
        "profKey": "combateCorpoACorpo"
      },
      {
        "nome": "Lâmina de luz (1MP)",
        "tipo": "marcial",
        "acerto": "0",
        "dano": "+1",
        "ferida": "1",
        "efeito": "Forja Luminosa: arma de luz sólida · gasta 1MP",
        "profKey": "combateCorpoACorpo"
      },
      {
        "nome": "Raios cortantes (1MP)",
        "tipo": "magico",
        "acerto": "+2",
        "dano": "+1",
        "ferida": "1",
        "efeito": "Feixe de luz de alta perfuração (efeito narrativo) · gasta 1MP",
        "profKey": "magiasOfensivas"
      }
    ],
    "itens": {
      "principais": [
        "Espada",
        "Escudo"
      ],
      "usaveis": [],
      "armadura": [
        "Traje de combate reforçado"
      ]
    },
    "habilidadesFicha": {
      "ativas": [],
      "especial": [
        {
          "name": "Constructo de Luz",
          "description": "Forja Luminosa, Raios Cortantes, Domínio de Sombras, Ritmo Solar (força e velocidade maiores à luz)."
        },
        {
          "name": "Conflito de fontes",
          "description": "Dossiê: singularidade nível S hereditária. Documento de Suth: nível B. Foi usado o documento de Suth."
        }
      ],
      "racial": [],
      "passivas": [],
      "extras": []
    },
    "hp": {
      "current": 4,
      "max": 4
    },
    "mp": {
      "current": 3,
      "max": 3
    },
    "sp": {
      "current": 3,
      "max": 3
    },
    "history": "Nasceu de parto natural numa família nobre de guerreiras; criada no Pilar da Imperadora, transferiu-se para a Santa por admirar a tia Athena. Quando a família aderiu à rebelião da Parteira, lutou contra ela para proteger o império; o nome da família foi apagado. Mandou a prima Athermis para Maxis, longe da influência de Athena. Recusou o posto de General: Azula assumiu o cargo.",
    "fichaFechada": true,
    "grupo": "suth"
  },
  {
    "id": "suth_athermis",
    "name": "Athermis",
    "epithet": "A Herdeira da Luz · Representante da Santa",
    "race": "Homúnculo (corpo modificado)",
    "faction": "Suth",
    "affiliation": "Pilar da Santa de Suth",
    "height": "—",
    "deity": "—",
    "weapon": "Lança",
    "traits": "Cabelos dourados trançados com fitas vermelhas, olhos azul-claros; casaco azul com insígnias do Pilar da Santa; próteses especiais nos dois braços e nas duas pernas. Inteligente, pragmática, ambiciosa, amorosa e possessiva. Filha de Athena. Gosta: estruturas eficientes, progresso, desafios intelectuais, duelos de alto nível. Não gosta: tradições ultrapassadas, desconfiança injustificada, a sombra do passado.",
    "xp": 0,
    "singularity": {
      "name": "Corpo de Luz",
      "level": "C+ · Divino (Artificial)",
      "description": "Transforma partes do corpo ou o corpo todo em partículas de luz, que viajam a altas velocidades e queimam. Precisa gastar mana para reconectar as partículas, ou pode perder o membro transformado. Pode usar a singularidade nas próteses. Ainda não domina todas as aplicações."
    },
    "racialAbility": {
      "name": "Homúnculo C — corpo modificado (ficha antiga)",
      "description": "Aprimorada por biotecnologia; próteses nos quatro membros."
    },
    "classes": [
      {
        "name": "Guerreira C — usuária de lança (ficha antiga)",
        "description": "Investidas rápidas como relâmpago."
      },
      {
        "name": "Golden Rule B — Representante do Exército da Santa",
        "description": "Criada em Maxis Power; tenta redefinir o que é ser guerreira de Suth."
      }
    ],
    "attributes": {},
    "atributosGerais": {
      "forca": "E",
      "destreza": "B",
      "vigor": "D",
      "carisma": "D",
      "manipulacao": "C",
      "compostura": "D",
      "inteligencia": "D",
      "perspicacia": "C",
      "resolucao": "B"
    },
    "proficiencias": {
      "combateCorpoACorpo": "D",
      "armasDeFogo": "E",
      "magiasOfensivas": "E",
      "defesaProf": "B",
      "resistFisicaProf": "D",
      "resistMagicaProf": "C",
      "tecnicaProf": "C",
      "persuasao": "C",
      "politica": "D",
      "financas": "D",
      "tecnologia": "D"
    },
    "procs": [
      "reflexo_agil",
      "golpe_certeiro",
      "persistente"
    ],
    "attacks": [
      {
        "nome": "Ataque desarmado",
        "tipo": "marcial",
        "acerto": "+1",
        "dano": "0",
        "ferida": "1",
        "efeito": "",
        "profKey": "combateCorpoACorpo"
      },
      {
        "nome": "Lança",
        "tipo": "marcial",
        "acerto": "0",
        "dano": "+1",
        "ferida": "1",
        "efeito": "",
        "profKey": "combateCorpoACorpo"
      },
      {
        "nome": "Lança de luz (1MP)",
        "tipo": "marcial",
        "acerto": "0",
        "dano": "+1",
        "ferida": "1",
        "efeito": "Partículas de luz queimam o alvo (efeito narrativo) · gasta 1MP",
        "profKey": "combateCorpoACorpo"
      }
    ],
    "itens": {
      "principais": [
        "Lança",
        "Próteses especiais (2 braços, 2 pernas)"
      ],
      "usaveis": [],
      "armadura": []
    },
    "habilidadesFicha": {
      "ativas": [],
      "especial": [
        {
          "name": "Corpo de Luz",
          "description": "Luz parcial ou total; reconectar custa mana; funciona nas próteses."
        },
        {
          "name": "Conflito de fontes",
          "description": "Dossiê: singularidade A, Guerreira A, Golden Rule C+. Documento de Suth: singularidade C+, Guerreira C, Golden Rule B. Foi usado o documento de Suth."
        }
      ],
      "racial": [],
      "passivas": [],
      "extras": []
    },
    "hp": {
      "current": 4,
      "max": 4
    },
    "mp": {
      "current": 3,
      "max": 3
    },
    "sp": {
      "current": 3,
      "max": 3
    },
    "history": "Filha de Athena, nasceu com o nome queimado depois da traição da mãe na rebelião da Parteira. A tia Farron a enviou para Maxis Power, onde aprendeu economia, política, tecnologia e diplomacia, e voltou a Suth com ideias que a maioria das suthences não tem. Ainda carrega a desconfiança por ser filha de Athena e precisa provar seu valor.",
    "fichaFechada": true,
    "grupo": "suth"
  }
];

// Qual arquivo em public/retratos-suth/ é o retrato de cada id (ver pasta
// "Retratos" do pedido) — Galantia não tem imagem ainda, fica sem imageUrl até
// alguém subir uma (checagem "somente se estiver vazio" não se aplica aqui
// porque a ficha nunca teve imageUrl antes: withFichaDefaults parte de "").
const SUTH_RETRATOS = {
  suth_emphes: "suth_emphes.jpg",
  suth_velmira: "suth_velmira.jpg",
  suth_victoria: "suth_victoria.jpg",
  suth_valeria: "suth_valeria.jpg",
  suth_mars: "suth_mars.jpg",
  suth_zero: "suth_zero.jpg",
  suth_kirilia: "suth_kirilia.jpg",
  suth_kyubei: "suth_kyubei.jpg",
  suth_draguna: "suth_draguna.jpg",
  suth_athena: "suth_athena.jpg",
  suth_azula: "suth_azula.jpg",
  suth_farron: "suth_farron.jpg",
  suth_athermis: "suth_athermis.jpg",
};
const SUTH_CHARACTERS = SUTH_CHARACTERS_RAW.map((c) => withFichaDefaults({
  ...c, fichaFechada: true, grupo: "suth",
  imageUrl: SUTH_RETRATOS[c.id] ? assetUrl(`retratos-suth/${SUTH_RETRATOS[c.id]}`) : "",
}));

// Ficha nova do Fate vinda do documento de Suth — NÃO é um personagem novo
// (ela já existe em SEED_CHARACTERS_RAW, no Grupo C): aplicarFichaSuthDoFate
// (suth.js) atualiza o conteúdo preservando id/grupo/imageUrl/xp existentes.
const FICHA_NOVA_FATE = {
  "id": "fate",
  "name": "Fate, A Indomável",
  "epithet": "A Indomável · Próxima Santa de Suth",
  "race": "Homúnculo de Elite (experimento biotecnológico)",
  "faction": "Suth",
  "affiliation": "Pilar da Santa de Suth",
  "height": "1,80m",
  "deity": "—",
  "weapon": "Naginata e lâminas múltiplas",
  "traits": "Idade aparente 25 a 30; cabelos brancos lisos com marcas negras verticais, olhos dourados predatórios; armadura leve preta, dourada e vermelha. Fria, reservada, ameaçadora e solitária; protetora seletiva de quem demonstra valor. Gosta: batalhas desafiadoras, aperfeiçoar-se, testar estratégias. Não gosta: perder, perder tempo, fraqueza, depender dos outros.",
  "xp": 0,
  "singularity": {
    "name": "Deusa da Guerra",
    "level": "EX · Divino",
    "description": "Analisa qualquer técnica ou singularidade artificial voltada ao combate, achando pontos fortes e fracos, e cria técnicas para contra-atacá-las, até contra singularidades divinas ou naturais. Perdeu a capacidade de assimilar e replicar técnicas devido à intoxicação de mana."
  },
  "racialAbility": {
    "name": "Homúnculo B — experimento de Primordial (ficha antiga)",
    "description": "Criada por Kino Kuni a partir da alma capturada de um Primordial; corpo modificado para combate extremo."
  },
  "classes": [
    {
      "name": "Guerreira e Artista Marcial EX — naginata, espada e facas (ficha antiga)",
      "description": "Mestre em lâminas; jamais perdera uma batalha antes da derrota que a feriu."
    },
    {
      "name": "Golden Rule A — Elite do Pilar da Santa",
      "description": "Escolhida pela Santa Encarnada como sucessora; questionada por parte do Pilar ('Santa Fraca')."
    }
  ],
  "attributes": {},
  "atributosGerais": {
    "forca": "D",
    "destreza": "A",
    "vigor": "D",
    "carisma": "D",
    "manipulacao": "E",
    "compostura": "B",
    "inteligencia": "C",
    "perspicacia": "B",
    "resolucao": "A"
  },
  "proficiencias": {
    "combateCorpoACorpo": "A",
    "armasDeFogo": "E",
    "magiasOfensivas": "E",
    "defesaProf": "A",
    "resistFisicaProf": "C",
    "resistMagicaProf": "D",
    "tecnicaProf": "A",
    "intimidacao": "B",
    "percepcao": "C"
  },
  "procs": [
    "reflexo_agil",
    "fortaleza_viva",
    "golpe_certeiro"
  ],
  "attacks": [
    {
      "nome": "Ataque desarmado",
      "tipo": "marcial",
      "acerto": "+1",
      "dano": "0",
      "ferida": "1",
      "efeito": "",
      "profKey": "combateCorpoACorpo"
    },
    {
      "nome": "Naginata",
      "tipo": "marcial",
      "acerto": "0",
      "dano": "+1",
      "ferida": "1",
      "efeito": "",
      "profKey": "combateCorpoACorpo"
    },
    {
      "nome": "Lâminas múltiplas",
      "tipo": "marcial",
      "acerto": "0",
      "dano": "+1",
      "ferida": "1",
      "efeito": "",
      "profKey": "combateCorpoACorpo"
    }
  ],
  "itens": {
    "principais": [
      "Naginata",
      "Lâminas múltiplas"
    ],
    "usaveis": [
      "Cadeira de rodas (intoxicação de mana)"
    ],
    "armadura": [
      "Armadura leve preta, dourada e vermelha"
    ]
  },
  "habilidadesFicha": {
    "ativas": [],
    "especial": [
      {
        "name": "Deusa da Guerra",
        "description": "Contra-estratégia absoluta: após ver uma técnica uma vez, cria um estilo para neutralizá-la."
      },
      {
        "name": "Intoxicação de mana (irreversível)",
        "description": "Lutar causa dores avassaladoras; hoje usa cadeira de rodas."
      }
    ],
    "racial": [],
    "passivas": [],
    "extras": []
  },
  "hp": {
    "current": 3,
    "max": 3
  },
  "mp": {
    "current": 3,
    "max": 3
  },
  "sp": {
    "current": 3,
    "max": 3
  },
  "history": "Criada em laboratório por Kino Kuni, segunda em comando da antiga Parteira, como réplica da essência de um Primordial; fugiu num banho de sangue e foi acolhida pelo Pilar da Santa. Invicta até o embate contra Kirilia, Emphes Alpha e outros combatentes, que causou a intoxicação de mana irreversível. Começa a perceber o valor da estratégia e da colaboração, mas o instinto solitário resiste. Esta ficha atualiza a que já existia no Grupo C. Não confundir com FATE, a Guardiã (Santa Encarnada), que é outra pessoa.",
  "fichaFechada": true,
  "grupo": "suth"
};

// Grupo Goethia — 10 fichas novas (a Erin Genova, 11ª pessoa do material,
// NÃO entra aqui: ela já existe em SEED_CHARACTERS_RAW, no Grupo C — ver
// nota abaixo). Diferente do Suth, o material de origem (dossiês em prosa,
// sem nenhum número) não trouxe estatísticas prontas — por decisão do Pedro,
// essas 10 fichas entram como RASCUNHO, grau E em tudo (mesmo padrão dos 13
// personagens originais do Grupo C): sem fichaFechada, sem atributosGerais/
// proficiencias/procs/attacks/itens definidos aqui, pra herdar os defaults
// de withFichaDefaults (grau E, sem procs, ataques e armadura padrão) —
// prontas pra alguém preencher os números depois pela própria interface.
const GOETHIA_CHARACTERS_RAW = [
  {
    id: "goethia_giovana", name: "Giovana Brunhild Goetus II", epithet: "Tzar de Goethia · Guardião da Fortaleza dos Extremos",
    race: "Goethiano puro (Dinastia Goetus)", faction: "Goethia",
    affiliation: "Tzar de Goethia · Dinastia Goetus", height: "2,05m",
    deity: "—", weapon: "Rifle sniper personalizado (forjado por Zed)",
    traits: "Magro, mas com presença marcante; sempre em uniforme militar formal cinza-escuro e vermelho-vinho, luvas, capa com pelugem e quepe militar. Cabelos brancos lisos, olhos dourados penetrantes e frios, anel de platina com o brasão de Goethia. Frio, calculista, diplomata estratégico — prefere converter inimigos a enfrentá-los. Despreza a tradição em segredo, mas finge respeitá-la pra não desestabilizar o reino. Gosta: estratégia, xadrez político. Não gosta: incompetência, perder o controle da situação.",
    xp: 0,
    singularity: { name: "O Olho do Tzar", level: "A · Natural", description: "Visão sempre ativa com percepção de 360°; com foco, vê a quilômetros de distância com clareza absoluta. Usando mana, enxerga através de paredes e barreiras físicas. Permite estudar um campo de batalha inteiro sem estar presente." },
    racialAbility: { name: "Goethiano puro — linhagem Goetus", description: "Herdeiro da dinastia que governa Goethia há gerações; tomou o trono do próprio pai por golpe." },
    classes: [
      { name: "Atirador de precisão", description: "Evita combate corpo a corpo; prefere uma sniper personalizada e abater o inimigo de longe, antes que perceba sua presença." },
      { name: "Tzar de Goethia — governante supremo", description: "Comanda o reino com pragmatismo; planeja unir Goethia e Suth por meio de um casamento político com a Imperadora Emphes Alpha." },
    ],
    hp: { current: 3, max: 3 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "Tomou o trono de seu pai, Brunhild, através de um golpe de estado, prendendo-o nos calabouços de Goethia (Skuld, que o protegia, foi enganado e forçado a jurar lealdade ao novo Tzar pra salvar a vida de Brunhild). Hoje governa com pragmatismo, odiando em segredo boa parte das tradições goethianas, mas mantendo a fachada de respeito a elas pra não colapsar o reino. Sua jogada política mais ambiciosa é o plano de casamento com Emphes Alpha, Imperadora de Suth, pra unir os dois reinos numa só superpotência — um movimento calculado, sem apego sentimental. Atua secretamente contra outros reinos, quebrando acordos e acolhendo criminosos políticos em troca de informação estratégica. [Ficha rascunho — estatísticas de combate ainda não definidas, ver notas do mestre do reino.]",
    grupo: "goethia",
  },
  {
    id: "goethia_krish", name: "Krish Rostnamov", epithet: "Voz da Tempestade · Coordenadora da Irmandade da Tempestade",
    race: "Goethiana (nobre de Lavkhekh)", faction: "Goethia",
    affiliation: "Irmandade da Tempestade · Coordenadora", height: "2,20m",
    deity: "—", weapon: "Dois machados encantados (herdados da mãe e do irmão)",
    traits: "Olhos frios e focados, pele marcada por tatuagens cerimoniais da tempestade (fogo, gelo e eletricidade), cabelos brancos trançados e adornados. Intensa, contraditória, maternal e fria ao mesmo tempo — impulsiva mas astuta. Vê a magia como liberdade, a via que a libertou do destino de casamentos políticos imposto às nobres goethianas. Gosta: liberdade, outras mulheres escolhendo seu próprio caminho. Não gosta: Hetalion (desprezo herdado das invasões a Lavkhekh), generais tradicionalistas que veem mulheres como frágeis.",
    xp: 0,
    singularity: { name: "—", level: "—", description: "Não possui singularidade nata. Seu poder vem do domínio pessoal da magia combinado a dois machados encantados com almas familiares: o da mãe controla chamas vivas, o do irmão manifesta e molda gelo absoluto. Dependente de mana; sem as armas, torna-se vulnerável." },
    racialAbility: { name: "Goethiana", description: "Filha do lorde de Lavkhekh; recusou a vida de casamentos e alianças políticas da nobreza e buscou na magia a única via de poder aberta a mulheres em Goethia." },
    classes: [
      { name: "Maga elemental (fogo e gelo)", description: "Combina os elementos dos dois machados encantados com sua própria versatilidade arcana." },
      { name: "Coordenadora da Irmandade da Tempestade", description: "Organiza, comanda e representa a Irmandade nas decisões estratégicas — a Santa Erin é a líder espiritual, mas é Krish quem administra de fato." },
    ],
    hp: { current: 3, max: 3 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "Cresceu entre o luxo e as tradições rígidas da nobreza de Lavkhekh; recusou o destino de casamentos políticos e ingressou na Irmandade da Tempestade como noviça, subindo até se tornar sua voz mais potente. Desconfia profundamente do Tzar Giovana, mas segue sua autoridade por respeito a Erin. É mãe de Victor Elena Rostnamov, de quem viveu afastada — abandono que pesa na relação das duas, ainda que o vínculo de sangue nunca tenha sido negado. [Ficha rascunho — estatísticas de combate ainda não definidas, ver notas do mestre do reino.]",
    grupo: "goethia",
  },
  {
    id: "goethia_victor", name: "Victor Elena Rostnamov", epithet: "A Tempestade Viva",
    race: "Goethiana", faction: "Goethia",
    affiliation: "Irmandade da Tempestade · Sacerdotisa de Batalha · Comandante da Tropa Pessoal do Tzar", height: "2,1m",
    deity: "Gigas", weapon: "—",
    traits: "Baixa pros padrões goethianos, mas com presença maior que a estatura. Cabelos platinados longos e soltos, olhos vermelho-carmesim penetrantes, veste-se com roupas formais masculinas elegantes; em campo usa armadura leve roxo-clara com capa de pelos branca. Leveza encantadora, carismática, odeia estagnação. Fascinada (em segredo) pela estética e cultura de Suth. Gosta: ideias sendo questionadas, vento, mudança. Não gosta: hierarquia pela hierarquia, estagnação.",
    xp: 0,
    singularity: { name: "Bênção de Gigas — Domínio dos Ventos Elementais", level: "B · Divino (herdado)", description: "Não cria o vento — encontra, direciona e intensifica correntes existentes, podendo resfriar ou aquecer o clima do campo de batalha. Mais estratégica que destrutiva. Depende de ambiente aberto e de mana; não conjura vento onde não há." },
    racialAbility: { name: "Goethiana", description: "Filha de Krish Rostnamov; cresceu afastada da mãe, criada por uma comunidade em Lavkhekh. Subiu por mérito, não por apadrinhamento." },
    classes: [
      { name: "Sacerdotisa de Batalha da Irmandade da Tempestade", description: "Combina fé, magia dos ventos e combate — respeitada, mas subestimada por sua idade dentro da Irmandade." },
      { name: "Comandante da Tropa Pessoal do Tzar", description: "Lidera uma tropa que responde exclusivamente a Giovana; confidente e instrumento de ação do Tzar, numa relação de pacto, não de subordinação." },
    ],
    hp: { current: 3, max: 3 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "Herdou o sangue da tempestade da mãe, Krish Rostnamov, mas não o abrigo familiar — cresceu longe dela, criada por uma comunidade de criadoras em Lavkhekh. Giovana a reconheceu por sua força e lealdade inabalável à ideia de uma nova Goethia, e hoje os dois compartilham segredos, visões e estratégias numa relação de confiança mútua. Deseja o posto da mãe, não por rancor, mas por desejo de superação e renovação. [Ficha rascunho — estatísticas de combate ainda não definidas, ver notas do mestre do reino.]",
    grupo: "goethia",
  },
  {
    id: "goethia_skuld", name: "Skuld", epithet: "O Punho Imortal · General Supremo de Goethia",
    race: "Goethiano (Imortal, geração antiga)", faction: "Goethia",
    affiliation: "General Supremo de Goethia (em guerra total) · General de Grande Goethia", height: "2,60m",
    deity: "—", weapon: "Punhos (desarmado, estado berserker)",
    traits: "Titã musculoso, cabelos longos verdes e selvagens, manto preto e branco com braceletes dourados e um colar com uma pedra verde — onde reside a alma de sua esposa falecida. Relaxado, confiante, sempre com um sorriso provocador. Extremamente carismático, caloroso e festeiro; trata soldados como irmãos. Aceitou os ningens de braços abertos, treinando-os como guerreiros de verdade. Gosta: festas, combate, camaradagem. Não gosta: morrer de velhice (seu maior medo — quer uma morte gloriosa em batalha).",
    xp: 0,
    singularity: { name: "Ira da Santa", level: "A · Passiva/Involuntária", description: "A alma de sua esposa falecida, guardada num colar, desperta em combates intensos e se funde a ele, tornando-o sobre-humano: reflexos ao extremo, força triplicada, movimentos imprevisíveis como se guiado pelo destino. Não pode ser ativada por vontade própria — só desperta em momentos de combate intenso — e se perde se o colar for removido ou destruído." },
    racialAbility: { name: "Goethiano Imortal", description: "432 anos; um dos últimos sobreviventes da era em que os goethianos eram imortais, antes da libertação de Sharkan encerrar essa condição." },
    classes: [
      { name: "Guerreiro berserker (combate corpo a corpo)", description: "Luta sempre na linha de frente, ao lado dos soldados, nunca de um gabinete." },
      { name: "General Supremo de Goethia", description: "O general mais popular do exército; não deseja governar, mas poderia dividir as tropas numa rebelião se quisesse — prefere observar até onde Giovana levará Goethia." },
    ],
    hp: { current: 3, max: 3 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "Protegeu Brunhild, pai de Giovana, durante o golpe de estado, mas foi enganado pelo novo Tzar, que capturou Brunhild sem precisar derrotá-lo em combate — pra salvar a vida do antigo Tzar, Skuld foi forçado a jurar lealdade a Giovana. Hoje vê o jovem Tzar como um pirralho arrogante, mas reconhece (sem conseguir entender completamente) sua visão e inteligência estratégica. Não é leal a Giovana, mas tem lealdade absoluta à Santa e forte senso de dever com o reino. [Ficha rascunho — estatísticas de combate ainda não definidas, ver notas do mestre do reino.]",
    grupo: "goethia",
  },
  {
    id: "goethia_zed", name: "Zed", epithet: "O Espírito do Fogo · Guardião de Goethia",
    race: "Guardião (raça primordial)", faction: "Goethia",
    affiliation: "Irmandade da Forja · Espírito da Forja (cargo simbólico mais alto)", height: "1,80m",
    deity: "—", weapon: "—",
    traits: "Forma de homem alto e musculoso, coberto por uma armadura negra que parece estar derretendo lentamente — só a boca, sempre num sorriso largo e inquietante, fica visível. Carrega sempre um relógio de bolso ornamentado pra cronometrar jogos e apostas. Energético, sorridente, bem-humorado, viciado em jogos e apostas; não acredita em moralidade universal, só em contratos e regras. Gosta: jogos, apostas, desafios interessantes. Não gosta: tédio (sua única inimiga de verdade).",
    xp: 0,
    singularity: { name: "Agitação Molecular", level: "EX · Guardião", description: "Agita moléculas à vontade, gerando calor, combustão ou derretimento absoluto — compreende a base vibracional da matéria. Forja com o toque, incendeia com o olhar, funde mundos com um sopro. Por ser Guardião, seu poder se conecta diretamente à mana do mundo (quase ilimitado), mas está preso a contratos antigos e à própria compulsão por criar jogos onde pode perder." },
    racialAbility: { name: "Guardião — raça primordial", description: "Raça secreta criada na origem do mundo como contrapeso ao poder dos deuses. Entregue a Goethia por Lord Omem como parte de um pacto de equilíbrio entre as nações — cada reino recebeu um Guardião, exceto Amaranth, que recebeu dois." },
    classes: [
      { name: "Ferreiro primordial", description: "Forjador original da Irmandade da Forja, de onde vem seu título simbólico — anterior à própria instituição." },
      { name: "Guardião de Goethia", description: "Obedece ao Tzar não por respeito, mas por contrato; vê todos os líderes de Goethia como 'jogadores temporários' num jogo maior." },
    ],
    hp: { current: 3, max: 3 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "Ligado ao trono goethiano por contrato primordial desde que foi entregue ao reino por Lord Omem. Instrui Paulão Ivanovich na arte da forja, considerando-o um jogo que vale a pena acompanhar, e reforjou a armadura e a arma de Suzane Bruth, oferecendo paz às almas ali contidas — que optaram por continuar ao lado de Suzane. Não se impressiona com o próprio poder; usa-o como ferramenta pra brincar com as regras do mundo, contanto que o jogo permaneça interessante. [Ficha rascunho — estatísticas de combate ainda não definidas, ver notas do mestre do reino.]",
    grupo: "goethia",
  },
  {
    id: "goethia_hildr", name: "Hildr", epithet: "O Guardião da Fronteira · General de Lavkhekh",
    race: "Goethiano (primeira geração de generais)", faction: "Goethia",
    affiliation: "General de Lavkhekh", height: "2,35m",
    deity: "—", weapon: "Espada com alma de um antigo amigo de combate + escudo com a alma da filha",
    traits: "Alto, robusto, marcado por cicatrizes; cabelos loiros curtos e bagunçados, grisalhos nas laterais. Rosto de feições duras, sobrancelhas grossas, olhos azuis intensos. Sarcástico e direto, não gosta de rodeios; respeita força e inteligência, despreza fraqueza e indecisão. Cansado, mas determinado a lutar enquanto for necessário. Gosta: veteranos competentes, silêncio. Não gosta: rodeios, ser tratado como monumento vivo.",
    xp: 0,
    singularity: { name: "—", level: "—", description: "Não possui Singularidade, mas compensa com um controle absoluto de alma, mana e corpo — talvez o melhor combatente puro de todos os reinos, capaz de enfrentar até as Singularidades mais poderosas com técnica e estratégia pura." },
    racialAbility: { name: "Goethiano", description: "Um dos primeiros grandes generais do reino, com 346 anos de idade; viveu guerras e viu o exército e a cultura goethiana evoluírem." },
    classes: [
      { name: "Veterano de combate corpo a corpo", description: "Cada golpe calculado pra ser decisivo; evita desperdício de recursos humanos em batalha." },
      { name: "General de Lavkhekh (ex-General Supremo)", description: "Aposentou-se do cargo mais alto pra formar novas gerações, mas retornou à ativa após a traição do antigo general de Lavkhekh." },
    ],
    hp: { current: 3, max: 3 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "Parte da primeira geração de generais de Goethia, foi essencial pra manter o reino unido por mais de um século. Aposentou-se do posto de General Supremo pra se tornar tutor de novas gerações, suavizando seu temperamento, mas retomou um cargo militar recentemente, após a traição do antigo general de Lavkhekh — e se interessou pela liderança de Giovana, a quem reconhece como um jovem astuto, apesar de vê-lo como um revolucionário perigoso. Carrega a alma de um antigo amigo de combate na espada e a alma de sua própria filha no escudo. [Ficha rascunho — estatísticas de combate ainda não definidas, ver notas do mestre do reino.]",
    grupo: "goethia",
  },
  {
    id: "goethia_mustafar", name: "Mustafar", epithet: "O Guardião dos Exilados · General de Krakovsk",
    race: "Ningen Raposa", faction: "Goethia",
    affiliation: "General de Krakovsk · Protetor dos Exilados", height: "—",
    deity: "União", weapon: "Garras / espada cerimonial",
    traits: "Alto, robusto e imponente; pelagem predominantemente cinza e branca. Olhos perspicazes, sempre analisando a situação com calma. Veste kimono preto e branco de corte militar com detalhes dourados. Racional e prático, com forte senso de justiça; não busca conflito desnecessário, mas nunca recua de uma luta necessária. Vê os ningens como parte essencial do futuro de Goethia. Gosta: justiça, integração. Não gosta: preconceito contra ningens, conflito desnecessário.",
    xp: 0,
    singularity: { name: "Pele Adaptável", level: "B · Divino", description: "Pode alterar a propriedade de sua pelagem, tornando-a extremamente fria, extremamente quente ou rígida como aço — uma bênção do deus União, que o vê como um abridor de caminhos e um símbolo de que será preciso flexibilidade pra integrar os ningens em Goethia." },
    racialAbility: { name: "Ningen Raposa", description: "Raça frequentemente menosprezada nos outros reinos; chegou como refugiado de Novolar. Lutou na guerra de cerca de 5 anos atrás entre Goethia e Suth, destacando-se e entrando pro exército goethiano." },
    classes: [
      { name: "Guerreiro de guerrilha", description: "Luta de forma fluida e adaptativa, misturando velocidade e precisão; foca em emboscadas e uso do terreno." },
      { name: "General de Krakovsk", description: "Ascendeu por mérito e lealdade, não por tradição; governa com equilíbrio entre disciplina e empatia, tratando soldados como irmãos." },
    ],
    hp: { current: 3, max: 3 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "Veio como refugiado de Novolar e se destacou na guerra entre Goethia e Suth de cerca de 5 anos atrás; em 3 anos se tornou general, pela liderança que exerceu sobre outros ningens e pelo respeito que conquistou dos goethianos. Sua competência convenceu o pai de Giovana a nomeá-lo General de Krakovsk; hoje tem ótima relação com o próprio Giovana. É o maior defensor dos ningens dentro do exército goethiano, lutando por oportunidades iguais, mas também exigindo que eles se provem. [Ficha rascunho — estatísticas de combate ainda não definidas, ver notas do mestre do reino.]",
    grupo: "goethia",
  },
  {
    id: "goethia_suzane", name: "Suzane Bruth", epithet: "O Ferreiro Silencioso · General de Libish",
    race: "Goethiano", faction: "Goethia",
    affiliation: "General de Libish · Supervisor da Irmandade da Forja", height: "2,15m",
    deity: "—", weapon: "Porrete de aço (alma da filha) + escudo-espírito (alma da esposa)",
    traits: "Corpo largo e denso, movimentos contidos; cabelos e barba ruivo-escuros, longos e desgrenhados. Rosto marcado por tatuagens cerimoniais ligadas à alma da esposa e da filha falecidas. Silencioso e atento, carrega mais do que deixa transparecer. Antes extremamente tradicionalista, hoje adaptável e prático. Gosta: honrar a memória da família, forja. Não gosta: ostentação, ser lembrado por ter falhado em proteger Libish.",
    xp: 0,
    singularity: { name: "—", level: "—", description: "Não possui singularidade natural — todo o poder vem da simbiose com armadura e arma encantadas pelas almas da esposa e da filha falecidas. A armadura gera escudos de mana autônomos e tem 'mente' própria; a arma pode se duplicar, permitindo lutar com quatro bastões simultâneos através de braços astrais." },
    racialAbility: { name: "Goethiano", description: "Filho de uma boa família, cresceu em meio às forjas de Libish; foi mão direita do antigo lorde da cidade." },
    classes: [
      { name: "Guerreiro de porrete (armas de alma)", description: "Mestre em combate corpo a corpo com um porrete de aço; gera braços astrais e duplica a própria arma em combate." },
      { name: "General de Libish e Supervisor da Irmandade da Forja", description: "Supervisiona a qualidade das armas fornecidas às tropas, aprimorando pessoalmente os equipamentos de outros generais." },
    ],
    hp: { current: 3, max: 3 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "Foi mão direita do antigo lorde de Libish e, mesmo após a morte dele numa invasão de Hetalion e Amaranth, conquistou o respeito da população — até ser derrotado pela guerreira lendária Maria, perdendo o título, que recuperou depois através de trabalho duro. A derrota o mudou: de extremamente tradicionalista pra um líder adaptável e prático, hoje apoiado por Giovana, a quem se sente em dívida por ter restaurado seu cargo. Zed reforjou sua armadura e sua arma, oferecendo paz às almas da esposa e da filha ali contidas — que optaram por permanecer ao lado dele. [Ficha rascunho — estatísticas de combate ainda não definidas, ver notas do mestre do reino.]",
    grupo: "goethia",
  },
  {
    id: "goethia_paulao", name: "Paulão Ivanovich Dragunov", epithet: "O Coração de Ferro · Alto-Artificer da Irmandade da Forja",
    race: "Goethiano", faction: "Goethia",
    affiliation: "Comandante Especial do Exército do Tzar · Irmandade da Forja · Discípulo de Zed", height: "—",
    deity: "Deus da Alma", weapon: "Armadura viva (voo, garras, cauda, fogo)",
    traits: "Alto e musculoso, ombros largos, postura imponente; cabelos longos loiros bem cuidados, barba loira aparada, olhos azuis intensos com brilho de provocação. Rosto delicado com maquiagem sutil contrastando com o corpo robusto. Acolhedor e festivo fora de combate, brutal dentro dele; odeia política, mas respeita profundamente Giovana. Abertamente homossexual num reino tradicionalista — figura polêmica e símbolo de mudança. Gosta: criar livremente, ser quem é com orgulho. Não gosta: esconder quem é, política.",
    xp: 0,
    singularity: { name: "Forja da Alma", level: "A · Divino (Deus da Alma)", description: "Capacidade de criar almas artificiais pra armas e equipamentos — cada arma ganha uma 'vontade' única, aumentando a sinergia com o portador. Sua própria armadura tem alma própria: voo, garras metálicas, cauda como extensão de ataque, cuspir fogo e aura de intimidação contra dragões e criaturas mágicas. Sem a armadura, seu combate é significativamente menos eficaz." },
    racialAbility: { name: "Goethiano", description: "Filho de um ferreiro da Irmandade da Forja; reconhecido desde jovem por um talento anormal pra forja e criação de armamentos." },
    classes: [
      { name: "Artífice de almas (combate com armadura viva)", description: "Luta vestindo sua própria criação: uma armadura com alma própria, capaz de voo, garras, cauda e fogo." },
      { name: "Alto-Artificer da Irmandade da Forja", description: "Discípulo e sucessor natural de Zed; recentemente indicado para se tornar Cavaleiro de Omem." },
    ],
    hp: { current: 3, max: 3 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "Amigo de infância de Giovana, a quem deve sua ascensão — foi o Tzar quem lhe abriu as portas após sofrer forte rejeição social por ser abertamente homossexual desde criança. Tornou-se discípulo de Zed e rapidamente se destacou como seu sucessor natural. Mantém rivalidade acirrada (mas com respeito técnico mútuo) com Suzane Bruth. Idolatrado por grupos progressistas e criticado por conservadores, sua popularidade cresce entre os jovens da Irmandade da Forja. [Ficha rascunho — estatísticas de combate ainda não definidas, ver notas do mestre do reino.]",
    grupo: "goethia",
  },
  {
    id: "goethia_mistake", name: "Mistake", epithet: "O Erro Leal · Comandante das Forças Especiais do Tzar",
    race: "Meio-orc goethiano", faction: "Goethia",
    affiliation: "Comandante das Forças Especiais do Tzar", height: "—",
    deity: "—", weapon: "Armamento variado (armas de fogo, facas, explosivos)",
    traits: "Alto, pele verde muito clara (quase branca), dentes proeminentes, olhos cansados e profundos, cabelos longos lisos escuros. Uniforme militar leve à prova de balas, luvas negras constantes. Presença fria, metódica, controlada — impessoal e quase misericordiosa ao mesmo tempo. Calado, metódico, extremamente prático e profissional; capaz de atos extremos sem hesitação, mas nunca sem necessidade. Gosta: cumprir a missão. Não gosta: ser inútil.",
    xp: 0,
    singularity: { name: "Sangue Corrompido (Meio-Orc)", level: "B · Natural (herança divina corrompida)", description: "Resultado do sangue corrompido de uma deusa consumido pela mãe durante a gestação — não se tornou orc completo, nem permaneceu humano. Dá força e resistência física muito acima do normal, regeneração acelerada, imunidade a venenos e toxinas e estamina quase inesgotável." },
    racialAbility: { name: "Meio-orc goethiano", description: "Nascido de uma goethiana que consumiu sangue de uma deusa corrompida; rejeitado pela mãe, criado pelo pai apenas por dever legal, sem amor — nomeado 'Mistake' em registro." },
    classes: [
      { name: "Especialista em CQC e infiltração", description: "Combate corpo a corpo de curta distância, infiltração, execução rápida, resgate, assassinato e extração." },
      { name: "Comandante das Forças Especiais do Tzar", description: "Subordinado apenas a Giovana; opera fora da cadeia de comando tradicional, temido e respeitado pelos generais." },
    ],
    hp: { current: 3, max: 3 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "Dedicou-se desde jovem a servir Goethia, o único lugar que, mesmo friamente, lhe ofereceu estrutura e sobrevivência depois de ser rejeitado pela própria mãe. Giovana o descobriu e o acolheu como soldado fiel — hoje tem lealdade total ao Tzar, vendo-o como sua razão de existir. Visto pelo povo goethiano como um espectro: crianças contam histórias sobre ele, adultos evitam dizer seu nome. Sua filosofia pessoal resume quem ele é: 'Um erro pode ser corrigido se for útil o suficiente.' [Ficha rascunho — estatísticas de combate ainda não definidas, ver notas do mestre do reino.]",
    grupo: "goethia",
  },
];

const GOETHIA_CHARACTERS = GOETHIA_CHARACTERS_RAW.map((c) => withFichaDefaults(c));

// Grupo Hetalion — 6 fichas em rascunho (grau E em tudo, mesma convenção do
// Grupo Goethia), vindas de dossiês em prosa pura, sem estatísticas de
// combate. Os quatro Generais das Federações + dois subcomandantes
// (Executor-Chefe da Azul, Comandante das Forças Especiais da Negra).
// Hetalion Prime e Seguintes (a cargo/sucessora) não têm dossiê — entram só
// como nomeLivre na aba Pessoas do reino, sem ficha.
const HETALION_CHARACTERS_RAW = [
  {
    id: "hetalion_crikon", name: "Crikon", epithet: "A Lâmina Invisível · Executor-Chefe da Federação Azul",
    race: "Hetaliano (nascido em Katalão)", faction: "Hetalion",
    affiliation: "Federação Azul · Executor-Chefe das Forças Policiais", height: "—",
    deity: "—", weapon: "Espada",
    traits: "32 anos (aparenta menos, graças a magia de preservação). Olhos azul-acinzentados, imóveis e clínicos; uniforme azul-escuro cerimonial sem adornos, cada botão alinhado como um ritual pessoal de autocontrole. Frio, lógico e implacável — raramente mostra emoção real. Determinação inabalável, autocontrole absoluto, foco total em resultados. Totalmente inflexível, incapaz de se conectar genuinamente com qualquer pessoa, ignora o sofrimento alheio justificando tudo como 'parte do equilíbrio necessário'.",
    xp: 0,
    singularity: { name: "Corte Fantasma", level: "—", description: "Torna partes do corpo ou da arma intangíveis em relação a objetos e pessoas específicos: a lâmina atravessa blindagens, armaduras e escudos, atingindo só o alvo desejado, e ele pode atravessar paredes e obstáculos sólidos ao perseguir fugitivos. Precisa de concentração total pra manter a intangibilidade; usar o poder por períodos longos desgasta sua energia vital." },
    racialAbility: { name: "Filho sem pátria", description: "Nascido em Katalão, filho de uma nobre hetaliense exilada e de um aristocrata katalanês; repatriado ainda criança após a execução da mãe por traição." },
    classes: [
      { name: "Executor-Chefe das Forças Policiais da Federação Azul", description: "Autoridade máxima operacional em investigações, repressão e execução de sentenças; subiu de investigador a Executor-Chefe em tempo recorde por competência absoluta e resultados inquestionáveis." },
      { name: "Agente infiltrado de Seguintes", description: "Finge lealdade absoluta a Hetalion Prime; na realidade é um dos principais agentes de Seguintes, trabalhando por dentro pra livrar Hetalion da influência de Amaranth." },
    ],
    hp: { current: 3, max: 3 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "Subiu ao topo da Federação Azul por competência absoluta. Na Guerra Civil, 5 anos atrás, ganhou notoriedade como o caçador infalível de rebeldes, responsável pelo 'extermínio' de várias células insurgentes — o que ninguém sabe é que seus maiores feitos foram, na verdade, operações cuidadosamente conduzidas para permitir que os principais líderes rebeldes escapassem em segredo. Prega a justiça absoluta como se fosse uma força da natureza, mas essa crença é uma máscara: uma penitência autoimposta pela execução da própria mãe. Despreza Hetalion Prime e Amaranth em silêncio. [Ficha rascunho — estatísticas de combate ainda não definidas, ver notas do mestre do reino.]",
    grupo: "hetalion",
  },
  {
    id: "hetalion_emeaver", name: "Emeaver Valcron", epithet: "Estrela Negra Ascendente · Comandante das Forças Especiais",
    race: "Hetaliana (linhagem tradicional da Federação Negra)", faction: "Hetalion",
    affiliation: "Federação Negra · Comandante das Forças Especiais", height: "—",
    deity: "—", weapon: "Combate marcial — o próprio corpo como arma",
    traits: "25 anos aparentes. Extremamente pragmática, direta, presa aos protocolos sociais de Hetalion; tem dificuldade em interpretar nuances emocionais, o que a faz parecer fria e arrogante. Falta de empatia e expressividade; dificuldade com relações políticas e emocionais. É respeitada, mas vista como distante ou inalcançável — só os subordinados mais próximos entendem sua forma de demonstrar cuidado. Apelido não oficial entre os soldados: 'A que nunca erra'.",
    xp: 0,
    singularity: { name: "Corpo Ideal", level: "—", description: "Nasceu com um corpo fisicamente perfeito — força, agilidade, destreza, raciocínio e imunidade avançadas. Desde jovem entendeu que isso não bastava, e aprimorou técnicas marciais e táticas pra maximizar esse dom. Estilo de combate rápido, preciso, sem desperdício de movimento, treinado pra infiltração e execução com máxima eficiência." },
    racialAbility: { name: "Programa secreto da Negra", description: "Recrutada ainda criança por um programa secreto da Federação Negra; moldada com disciplina absoluta, seus méritos e desempenho tático a elevaram rapidamente — vista internamente como 'senhorita perfeitinha', imponente e aparentemente sem falhas." },
    classes: [
      { name: "Comandante das Forças Especiais da Federação Negra", description: "Lidera missões de infiltração e execução de máxima eficiência." },
      { name: "Analista política neutra", description: "Avalia federações e reinos externos com pragmatismo frio, sem envolvimento emocional ou preconceito — tenta manter neutralidade política, mas nutre admiração secreta por Hetalion Seguinte." },
    ],
    hp: { current: 3, max: 3 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "Vê seu corpo como um dom e sente que deve usá-lo para propósitos maiores. Leal declaradamente à Federação Negra, mantém amizade distante e respeito mútuo com Crikon (Azul), relação funcional e de respeito como superior com Jingen (seu comandante direto na Negra), e uma amizade inesperada — construída em respeito tático — com Kiryu, de Maxis Power. Nutre admiração interna e um conflito emocional em relação a Hetalion Seguinte. [Ficha rascunho — estatísticas de combate ainda não definidas, ver notas do mestre do reino.]",
    grupo: "hetalion",
  },
  {
    id: "hetalion_asana", name: "Asana Desroar", epithet: "A Heroína de Hetalion · General da Federação Vermelha",
    race: "Hetaliana (origem estrangeira desconhecida)", faction: "Hetalion",
    affiliation: "Federação Vermelha · Comandante das Forças de Justiça Histórica e Tribunais Militares", height: "—",
    deity: "—", weapon: "Lança modular eletrificada (fragmentável em chicote laminado)",
    traits: "40 anos (aparência de vinte e poucos, graças a magia de preservação contínua). Olhos vermelhos vibrantes, cabelos longos roxo-escuros com reflexos magenta; postura sempre de avanço, ataque e liderança pessoal. Impetuosa, apaixonada e emocionalmente intensa. Inspiradora no campo de batalha, carismática com as tropas, incansável quando o tema é proteger civis ou soldados sob seu comando. Imprudente, orgulhosa, extremamente impaciente com burocracia e longas discussões políticas.",
    xp: 0,
    singularity: { name: "Lança da Tempestade", level: "—", description: "Manipula eletricidade e corrente elétrica com maestria através de sua lança modular, que se fragmenta em um chicote laminado e eletrificado capaz de atacar à distância com extrema violência. Mistura combate de médio e curto alcance, com foco em mobilidade e ataques de área; famosa por criar zonas de negação de terreno, espalhando eletricidade em campo aberto." },
    racialAbility: { name: "Ascensão por mérito puro", description: "Estrangeira de origem desconhecida, sem registros oficiais de sua terra natal; ascendeu inteiramente por mérito militar e fidelidade ao Código do Exército Vermelho." },
    classes: [
      { name: "General da Federação Vermelha de Hetalion", description: "Comanda as Forças de Justiça Histórica e os Tribunais Militares; quase uma lenda viva dentro da Vermelha, capaz de liderar batalhões inteiros com um grito de comando." },
      { name: "Veterana de guerra", description: "Destacou-se há 20 anos na guerra contra Goethia e na operação antiterrorista que salvou Amaranth de um ataque devastador, trabalhando ao lado de agentes como Jingen." },
    ],
    hp: { current: 3, max: 3 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "Chegou ao cargo de General da Vermelha pelo suor, sangue e mérito puro, liderando dezenas de campanhas militares à frente das próprias tropas. Na Guerra Civil, 5 anos atrás, lutou ao lado da Prime — não por lealdade pessoal, mas por ver na defesa do governo a única forma de proteger a estrutura militar da Vermelha e a honra de Hetalion. Não é leal nem à Prime nem à Seguintes: é leal exclusivamente ao Código da Vermelha e à ideia de ser o escudo e a espada do povo de Hetalion. Vista como 'a Heroína de Hetalion' pelo povo. [Ficha rascunho — estatísticas de combate ainda não definidas, ver notas do mestre do reino.]",
    grupo: "hetalion",
  },
  {
    id: "hetalion_jingen", name: "Jingen Baladar", epithet: "O Veneno Adormecido · General da Federação Negra",
    race: "Hetaliano (nascido em Tauros, cidade militar da Negra)", faction: "Hetalion",
    affiliation: "Federação Negra · Líder das Forças de Defesa Nacional", height: "1,65m",
    deity: "—", weapon: "Armas discretas e de rápido saque (facas, punhais, espada curta)",
    traits: "38 anos (aparência jovem por uso contínuo de mana). Pele extremamente pálida, quase alva, rosto arredondado de traços delicados quase infantis; olhos vermelho-sangue intensos, cabelos louro-claros bagunçados. Sorriso debochado e comportamento teatral escondem um homem letal, imprevisível e profundamente danificado por anos de espionagem e infiltração. Extremamente adaptável, inteligente em campo, capaz de improvisar sob pressão como poucos. Impulsivo, incapaz de manter uma personalidade estável, desrespeita hierarquias administrativas, tendência autodestrutiva.",
    xp: 0,
    singularity: { name: "Névoa de Veneno e Gelo", level: "—", description: "Singularidade híbrida: gera, manipula e espalha névoas geladas carregadas de veneno e miasma. Envenena ambientes fechados, cria armadilhas geladas e imobiliza alvos com névoas densas — arma de contenção e de assassinato silencioso ao mesmo tempo." },
    racialAbility: { name: "Agente duplo de carreira", description: "Durante duas décadas atuou como espião, sabotador e agente duplo, infiltrando-se em grupos terroristas, milícias rebeldes e células dissidentes dentro da própria Hetalion." },
    classes: [
      { name: "General da Federação Negra de Hetalion", description: "Líder das Forças de Defesa Nacional; respeitado por resultados, malquisto pela administração — uma lenda e um problema dentro da própria Negra." },
      { name: "Infiltrado e agente duplo", description: "Foi o principal agente infiltrado na maior célula terrorista da história de Hetalion (20 anos atrás) e, na Guerra Civil, fingiu apoiar os rebeldes para depois traí-los na hora decisiva, garantindo a vitória de Prime." },
    ],
    hp: { current: 3, max: 3 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "Construiu sua reputação como o agente mais eficiente e perigoso da história recente da Federação Negra. Sua 'lealdade' na Guerra Civil lhe rendeu promoção direta a General, mas ele nunca escondeu que a escolha foi por oportunismo e autopreservação, não por lealdade a Prime — a quem respeita a posição, mas considera submissa demais à influência de Amaranth. Está alinhado com Seguintes, em quem enxerga a chance de mudar o rumo de Hetalion. Acredita que 'os fins sempre justificam os meios'. [Ficha rascunho — estatísticas de combate ainda não definidas, ver notas do mestre do reino.]",
    grupo: "hetalion",
  },
  {
    id: "hetalion_shoebil", name: "Shoebil Valadar", epithet: "A Engrenagem Impecável · General da Federação Azul",
    race: "Hetaliana (nascida em Cancer, coração administrativo da Azul)", faction: "Hetalion",
    affiliation: "Federação Azul · General", height: "1,85m",
    deity: "—", weapon: "Espada longa funcional (raramente usada)",
    traits: "49 anos (aparência mais jovem por magia estabilizadora). Cabelos longos dourado-platinados sempre alinhados, olhos lilás-claro com brilho cortante e sempre atentos a detalhes técnicos; uniforme azul-escuro com bordas douradas, luvas brancas, capa com insígnia da justiça. Fria, metódica, obcecada por procedimentos, rigidez quase caricatural com regras e formulários. Um pouco incompetente fora do papel administrativo, desatenta a nuances políticas e estratégias militares; inflexibilidade que a torna lenta em crises que exigem improviso.",
    xp: 0,
    singularity: { name: "Dissolução Progressiva", level: "—", description: "Derrete lentamente o que toca, podendo afetar materiais orgânicos e inorgânicos. Útil para interrogatórios, contenção de prisioneiros ou destruição controlada de barreiras — mas pouco útil em combate direto contra inimigos de nível general." },
    racialAbility: { name: "Carreira burocrática exemplar", description: "Não é guerreira nem estrategista militar brilhante; subiu ao cargo de General por uma carreira exemplar como burocrata e lealdade inabalável à Hetalion Prime." },
    classes: [
      { name: "General da Federação Azul de Hetalion", description: "Faz a máquina estatal Azul funcionar sem travar; indicada por Prime após a Guerra Civil como parte de uma estratégia para cercar o governo de figuras de confiança." },
      { name: "Coordenadora logística", description: "Na Guerra Civil, coordenou a logística, a mobilização das tropas legais e a comunicação entre departamentos na defesa de Cancer, contra a rebelião promovida pelo antigo General Azul." },
    ],
    hp: { current: 3, max: 3 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "O epítome da burocracia viva: 'a lei é um procedimento, execute-o e siga para o próximo'. Leal de forma absoluta à Hetalion Prime, evita pensar no assunto de Seguintes. Boa relação com a Vermelha (trabalham juntas em prisões de base histórica), relação tensa com a Negra (por operações na linha da ilegalidade), indiferente com a Branca a menos que envolva burocracia. Vinte anos atrás, auxiliou heróis de Amaranth a derrotar uma célula terrorista em Cancer, fortalecendo os laços diplomáticos entre Hetalion e Amaranth. [Ficha rascunho — estatísticas de combate ainda não definidas, ver notas do mestre do reino.]",
    grupo: "hetalion",
  },
  {
    id: "hetalion_hoshon", name: "Hoshon Val Genkai", epithet: "O Sumo Mediador · General da Federação Branca",
    race: "Hetaliano (natural de um distrito monástico da Federação Branca)", faction: "Hetalion",
    affiliation: "Federação Branca · Sumo Mediador dos Rituais Nacionais de Hetalion", height: "—",
    deity: "Os 9 deuses universais do continente", weapon: "Leque preto com detalhes dourados (símbolo de autoridade e catalisador mágico)",
    traits: "61 anos (aparência de cerca de 30, graças a rituais de preservação da Branca). Cabelos longos prateados, pele alva, olhos prateado-esverdeados; manto cerimonial branco com ornamentos dourados e azuis. Voz suave que carrega o peso de uma sentença divina ou de uma armadilha política cuidadosamente tecida. Manipulador, teatral e politicamente venenoso — cada gesto parece ensaiado, cada sorriso carrega uma segunda intenção. Extremamente inteligente, persuasivo, mestre em leitura emocional e manipulação de massas. Arrogância espiritual extrema, trata vidas humanas como peças de um grande jogo filosófico, incapaz de criar laços genuínos de afeto.",
    xp: 0,
    singularity: { name: "Véu da Verdade", level: "—", description: "Enxerga o fluxo emocional e espiritual de todos ao redor: detecta emoções ocultas, dúvidas, mentiras e intenções homicidas mesmo quando camufladas por treinamento mental, e pode manipular o estado emocional coletivo de uma multidão, induzindo pânico, fé, arrependimento ou coragem. Pessoas extremamente disciplinadas, com autocontrole excepcional (como veteranos da Negra ou alguns guerreiros de Goethia), podem resistir." },
    racialAbility: { name: "Arquiteto dos ritos de Hetalion", description: "Subiu pelas fileiras da Federação Branca não por feitos de combate, mas por habilidade inigualável em manipulação social, jogos de influência e domínio cultural." },
    classes: [
      { name: "General da Federação Branca — Sumo Mediador", description: "Conduziu os rituais fúnebres de dezenas de figuras importantes de Hetalion, consolidando-se como figura central nas cerimônias de transição de poder." },
      { name: "Arquiteto político", description: "Foi o arquiteto dos Tratados de Paz Internos pós-Guerra Civil, e dizem ter sido o mentor por trás das atuais leis que limitam o poder espiritual da própria Federação Branca — usando o paradoxo para fortalecer a própria influência." },
    ],
    hp: { current: 3, max: 3 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "Para Hoshon, Hetalion é uma entidade espiritual viva, e ele se vê como o guardião moral e cultural desse espírito nacional. Trata Prime com respeito teatral, mas age nos bastidores para garantir que a Branca nunca perca relevância política. Observa Seguintes com interesse e desconfiança — vê nela um símbolo de mudança que pode ser moldado se for bem administrado. Respeita a Deusa Karphel, mas considera Amaranth um tabuleiro perigoso. [Ficha rascunho — estatísticas de combate ainda não definidas, ver notas do mestre do reino.]",
    grupo: "hetalion",
  },
  // Valefor e Yurity vieram num dossiê separado (07/10), já com graus e procs
  // propostos (conferidos contra as fórmulas do engine.js — bate certinho).
  // Os dois são do "Grupo A" (torneio da Academia de Omem, liderado por
  // Hetalion Seguintes) — por decisão do Pedro, entram dentro do Grupo
  // Hetalion mesmo, com "Grupo A" registrado como texto na affiliation.
  {
    id: "hetalion_valefor", name: "Valefor", epithet: "Mago do Tempo · Sacerdote de Kronos · Partido Branco",
    race: "Humano", faction: "Hetalion",
    affiliation: "Grupo A — torneio da Academia de Omem, liderado por Hetalion Seguintes · Partido/Federação Branca · Sacerdote de Kronos e mago da Associação de Magia", height: "1,67m",
    deity: "Kronos, o Deus do Trono das Cordas (Tempo, Destino, História)", weapon: "Nenhuma — luta só com magia (o cachimbo é estilo)",
    traits: "25 anos aparentes, 1,67m, corpo baixo e esguio, postura relaxada de quem não tem pressa nenhuma. Cabelo preto ondulado e volumoso preso num rabo alto com fita vermelha, com um tufo de penas laranja-rosado; mechas soltas pelo rosto. Olhos âmbar com brilho de ironia, pele morena, barba rala só no queixo e maxilar, meio sorriso de quem sabe uma piada que você ainda não entendeu. Luvas pretas com punho vermelho; segura sempre um cachimbo longo (kiseru) de metal como quem segura uma batuta. Amargo, ríspido e sarcástico — era racista e extremamente tradicional, seguindo cegamente o que a família mandava; hoje tenta se afastar disso, ainda carregando os preconceitos antigos e confrontando-os aos poucos (trabalho em andamento, não conversão). Pensa por si pela primeira vez. Leal e dedicado a Seguintes, dá suporte ao grupo sem alarde. Gosta (sugestão do dossiê): o cachimbo, a calma, ordem e ritual, Seguintes, momentos de silêncio, ser levado a sério. Não gosta (sugestão): pressa, ser tratado como peça da família, ser comparado a Hoshon, conversa fiada, os próprios preconceitos antigos quando se lembra deles.",
    xp: 0,
    singularity: { name: "Hora Suspensa", level: "—", description: "Para o tempo por cerca de 1 minuto e se move livremente nele — só ele se move, o resto fica parado. Com o 'poder de alma', move outras coisas e carrega pessoas, mas não interfere a fundo: não fere ninguém nesse estado. Serve pra reposicionar, resgatar, fugir e preparar o terreno, não pra causar dano diretamente. Custa muita mana e exige muito dele, porque precisa romper a resistência do ar. Nível e regras de mesa (duração em turnos, custo exato) ainda não definidos — ver notas do mestre." },
    racialAbility: { name: "Família tradicional de Kronos", description: "Cresceu numa família que segue Kronos há gerações, cumprindo o que se esperava dele — virou sacerdote do deus e mago da Associação de Magia por obrigação, não por escolha." },
    classes: [
      { name: "Sacerdote de Kronos", description: "Ritos e conhecimento sacerdotal de Kronos, como Chaeskele Boda, de Katalão." },
      { name: "Mago da Associação de Magia", description: "Magias de combate e utilidade de um mago habilidoso; estilo de suporte à distância, sem entrar em combate corpo a corpo." },
    ],
    atributosGerais: { forca: "E", destreza: "C", vigor: "D", carisma: "C", manipulacao: "B", compostura: "B", inteligencia: "A", perspicacia: "B", resolucao: "B" },
    proficiencias: { armasDeFogo: "E", combateCorpoACorpo: "E", magiasOfensivas: "A", defesaProf: "D", resistFisicaProf: "D", resistMagicaProf: "B", tecnicaProf: "A" },
    procs: ["reflexo_agil", "surto_arcano", "escudo_de_mana"],
    hp: { current: 3, max: 3 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "A família de Valefor segue Kronos há gerações; ele cresceu cumprindo o que se esperava dele, virando sacerdote de Kronos e mago da Associação de Magia porque era o esperado, não por escolha. Para ele, a Prime e a tradição eram tudo — foi zeloso e fiel, cegamente, por boa parte do tempo, e via Hoshon como seu superior e como tudo o que precisava ser. Foi ao conhecer Hetalion Seguintes que passou a pensar fora do molde que lhe deram; hoje se dedica a ela e procura decidir o próprio destino. Recentemente soube do plano secreto de Yurity e Crikon (ampliar a influência de Seguintes para derrubar o governo atual de Hetalion). Não sabe o que pensar, mas está disposto a ver aonde vai e quer decidir por conta própria. [Estatísticas estimadas a partir do dossiê enviado pelo mestre — conferidas contra as fórmulas do engine.js, mas o nível da singularidade, o 'poder de alma' e as magias de combate específicas ainda não foram definidos; ver notas do mestre do reino.]",
    grupo: "hetalion",
  },
  {
    id: "hetalion_yurity", name: "Yurity", epithet: "Comandante do Exército Vermelho · Partido Vermelho",
    race: "Humana", faction: "Hetalion",
    affiliation: "Grupo A — torneio da Academia de Omem, liderado por Hetalion Seguintes · Partido/Federação Vermelha · Comandante do Exército Vermelho", height: "1,78m",
    deity: "Gigas e Thalia", weapon: "Escopeta ligada à singularidade (rajadas de fogo); sabre no combate próximo",
    traits: "25 anos aparentes, 1,78m, alta e esguia, postura reta de oficial, corpo magro e treinado sem exagero de músculo. Cabelo longo, liso, vermelho escuro (carmesim profundo), franja reta e pesada que esconde parte de um olho. Olhos vermelhos intensos, pele pálida com sombras frias no rosto, lábios finos num meio sorriso de quem já calculou o resultado. Luvas pretas sempre; leva a mão enluvada perto da boca ou do queixo quando pensa ou ameaça. Mistura emoção e frieza, e sabe usar as duas — a emoção (sobretudo o ódio) decide para onde ela vai, a frieza decide como chegar lá. Vingativa, mas sem pressa; vê quase todos como peças do objetivo final, exceto Crikon e Hetalion Seguintes, o mais perto de amigos que ela consegue admitir. Leal ao código do Pilar Vermelho, mas no fim leal aos próprios sentimentos e ao próprio ódio. Comanda com autoridade natural, sem gritar. Gosta (sugestão do dossiê): planos bem executados, vingança que chega na hora certa, a lealdade de Seguintes e Crikon, memória e justiça (valores do Pilar Vermelho), a mãe como lembrança. Não gosta (sugestão): Amaranth e Karphel, o status quo, negligência, pressa que estraga um plano, heroísmo que termina em morte inútil.",
    xp: 0,
    singularity: { name: "Elo de Brasa", level: "—", description: "Se conecta a outras pessoas; combinado à magia de Sensor, percebe quem está ligado a ela. Quem está conectado pode ser encantado com fogo, e ela oferece a todos os conectados magias de fogo capazes de bombardear uma região inteira. A escopeta dela é ligada à singularidade e dispara rajadas de fogo. Nível, custo, limite de conectados e alcance ainda não definidos — ver notas do mestre." },
    racialAbility: { name: "Filha da general caída", description: "Filha da antiga general do Partido Vermelho, morta em serviço na guerra em Amaranth há cerca de 20 anos (Yurity tinha uns 5 anos). Recebeu treinamento pesado desde jovem; o sobrenome e os contatos da mãe abriram portas até o posto de comandante do Exército Vermelho." },
    classes: [
      { name: "Comandante do Exército Vermelho", description: "Lidera o braço armado do Partido Vermelho de Hetalion; estilo de suporte e bombardeio à longa distância." },
      { name: "Conspiradora política", description: "Usa a posição para ampliar influência junto de Hetalion Seguintes, com o objetivo de derrubar o governo atual de Hetalion e enfrentar Amaranth." },
    ],
    atributosGerais: { forca: "D", destreza: "B", vigor: "C", carisma: "B", manipulacao: "A", compostura: "C", inteligencia: "B", perspicacia: "A", resolucao: "A" },
    proficiencias: { armasDeFogo: "B", combateCorpoACorpo: "D", magiasOfensivas: "A", defesaProf: "C", resistFisicaProf: "D", resistMagicaProf: "B", tecnicaProf: "B" },
    procs: ["toque_flamejante", "surto_arcano", "escudo_de_mana"],
    hp: { current: 4, max: 4 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
    history: "Yurity é filha da antiga general do Partido Vermelho, que morreu em serviço durante a guerra em Amaranth, há cerca de 20 anos. Para o povo, a mãe morreu como heroína; para Yurity, a morte foi desnecessária, causada pela negligência de Amaranth. O ódio por Amaranth mudou a forma como ela vê o mundo — pra ela, o continente inteiro está preso nas garras de Karphel e de um status quo que ninguém questiona. Seu plano é crescer no Exército Vermelho, ampliar a influência junto de Hetalion Seguintes e ter poder pra derrubar o governo atual de Hetalion, enfrentar Amaranth e se libertar desses grilhões. No início usava Seguintes como degrau; hoje a vê como aliada próxima — foi Yurity quem acendeu a centelha revolucionária de Seguintes, e Seguintes disse que não sacrificaria Yurity nem Crikon. [Estatísticas estimadas a partir do dossiê enviado pelo mestre — conferidas contra as fórmulas do engine.js, mas o nível da singularidade e as regras do Elo (limite de conectados, alcance, custo) ainda não foram definidos; ver notas do mestre do reino.]",
    grupo: "hetalion",
  },
];

// Qual arquivo em public/retratos-hetalion/ é o retrato de cada id — Crikon,
// Emeaver, Valefor e Yurity não têm imagem nos dossiês recebidos, ficam sem
// imageUrl até alguém subir uma pela ficha.
const HETALION_RETRATOS = {
  hetalion_asana: "hetalion_asana.jpg",
  hetalion_jingen: "hetalion_jingen.jpg",
  hetalion_shoebil: "hetalion_shoebil.jpg",
  hetalion_hoshon: "hetalion_hoshon.jpg",
};
const HETALION_CHARACTERS = HETALION_CHARACTERS_RAW.map((c) => withFichaDefaults({
  ...c,
  imageUrl: HETALION_RETRATOS[c.id] ? assetUrl(`retratos-hetalion/${HETALION_RETRATOS[c.id]}`) : "",
}));

// Exportado (além do default App) só pro teste de smoke de render
// (characterForm.render.test.js) — garante que os personagens semente (Grupo
// C + Aurora + Suth + Goethia + Hetalion) renderizam sem lançar exceção.
export const SEED_CHARACTERS = aplicarFichaSuthDoFate(
  [...SEED_CHARACTERS_RAW.map(withFichaDefaults), ...SIDEPOINT_CHARACTERS, ...SUTH_CHARACTERS, ...GOETHIA_CHARACTERS, ...HETALION_CHARACTERS],
  FICHA_NOVA_FATE
);

const SEED_KINGDOMS_RAW = [
  { id: "hetalion", name: "Hetalion",
    description: "República federativa de ordem, mérito e pragmatismo, dividida em quatro federações coloridas — Vermelha, Azul, Branca e Negra — cada uma com doutrina militar e política próprias, unidas sob a figura cerimonial da Hetalion e um Conselho Executivo compartilhado.",
    visaoGeral: "Hetalion é uma república federativa baseada em ordem, mérito e pragmatismo. O povo hetaliano é unido por um senso coletivo de dever, ética e respeito às instituições — honestidade, disciplina e lealdade ao Estado são virtudes celebradas. Aos olhos estrangeiros, porém, os hetalianos são vistos como literalistas, socialmente rígidos e com pouco senso de humor; sarcasmo, ironia e gírias são quase incompreensíveis para eles. O culto à separação entre funções é tamanho que cada cidadão mantém trajes específicos para cada ocasião da vida: trabalho, lazer, rituais, sono e até negociações diplomáticas.\n\nO governo é dividido entre a Hetalion (título cerimonial do chefe de Estado, figura pública, mediadora entre as federações, líder espiritual e última instância judicial) e os Generais das Quatro Federações, numa estrutura híbrida entre república parlamentarista e conselho militar. O Conselho Legislativo e Judiciário tem 52 membros, com cadeiras proporcionais ao apoio popular de cada federação, e atua também como suprema corte. O Conselho Executivo reúne os 4 Generais (um de cada cor) mais a Hetalion. Cargos menores vêm de concurso público, cargos médios por acúmulo de mérito, e o cargo de General é eleito dentro da própria federação, com indicação prévia obrigatória da Hetalion.\n\nCada federação governa suas áreas com autonomia relativa: a Vermelha cuida de Justiça e Memória (nenhuma injustiça deve ser esquecida); a Azul, de Lei e Ordem (a lei é absoluta até ser reformada); a Branca, de Cultura e Fé (defende tradições, cultura nacional e religião, supervisionando todos os ritos oficiais); e a Negra, de Defesa e Militarismo (segurança interna e externa, controle do braço armado e da Força Unificada). Hetalion segue os 9 deuses universais do continente, os mesmos cultuados em Goethia e outros reinos; a Branca supervisiona todas as práticas religiosas através de uma Igreja Nacional centralizada na capital, mas sua influência direta não alcança as demais federações.\n\nCada federação mantém seu próprio exército — Vermelho, Azul, Branco e Negro — que em tempos de guerra se unem na Força Unificada de Hetalion. As tropas são pequenas em número, mas de altíssima qualidade tática, espionagem e magia estratégica; Singularidades aparecem nas patentes mais altas, mas não são obrigatórias para ascensão política ou militar.\n\nA sociedade tem alta liberdade teórica, mas rigidez social extrema na prática: quem quebra protocolos sociais é punido socialmente, mesmo sem infringir a lei. Estrangeiros são tolerados, mas geralmente confinados a zonas específicas, e poucos conseguem cidadania plena. Casamentos inter-federativos existem, mas são mal vistos. Entre os eventos nacionais estão jogos internos entre federações, festivais de batalha e mérito, e competições de estratégia e oratória.",
    rebeliao: {
      titulo: "A Guerra Civil de Hetalion (5 anos atrás)",
      texto: "Uma guerra civil interna, ligada à cidade ningen de Novolar — que recebia apoio de Goethia —, colocou a estrutura do Estado à prova. Hetalion chegou a ajudar Suth militarmente durante a guerra Suth x Goethia da mesma época, como forma de retaliar Goethia. Internamente, tropas legais enfrentaram uma rebelião promovida pelo então General da Federação Azul, que se voltara contra o Estado; a vitória do governo (da atual Hetalion, Prime) redesenhou o Conselho Executivo e elevou vários dos nomes hoje no poder. Durante o Golpe de Giovana em Goethia, Hetalion apoiou ativamente a ascensão do novo Tzar — exércitos das Federações Vermelha e Negra intervieram diretamente ao lado dele. Hoje, a tensão interna cresce entre a atual Hetalion (Prime) e sua sucessora designada (Seguintes, sua filha), enquanto a ameaça de invasão por Katalão ronda as fronteiras.",
    },
    economia: [
      "Baseada em tecnologia administrativa, engenharia de precisão, serviços estratégicos e consultoria mágica — não possui grande indústria ou força de produção, mas é referência em eficiência, gestão e soluções complexas.",
      "Moeda oficial: Karphel, a mesma dos outros reinos.",
      "A Federação Branca é a mais rica; a Vermelha é a mais pobre, mas tem o maior efetivo militar.",
      "Há regulação econômica interna, com tarifas e ajustes para equilibrar o desenvolvimento entre as federações.",
    ],
    relacoes: [
      { reino: "Suth", tipo: "Aliança pontual e assimétrica", texto: "Hetalion ajudou Suth militarmente contra Goethia há 5 anos, como forma de retaliação; Suth, porém, vê Hetalion como alvo militar fraco e constante alvo de invasões — a aliança é mais útil a Hetalion do que recíproca." },
      { reino: "Goethia", tipo: "Intervenção calculada no golpe", texto: "Apesar do histórico de invasões passadas contra Lavkhekh e Libish, Hetalion apoiou ativamente o golpe de Giovana — tropas das Federações Vermelha e Negra intervieram diretamente ao lado do novo Tzar, numa aposta política de longo prazo." },
      { reino: "Katalão", tipo: "Ameaça crescente", texto: "Relação de desconfiança e hostilidade histórica; a ameaça de invasão por Katalão ronda as fronteiras de Hetalion e é motivo de preocupação nacional crescente." },
      { reino: "Maxis Power", tipo: "Desconfiança cultural", texto: "Visto por boa parte da liderança hetaliana como um reino de mercado inovador, porém degenerado — uma potência econômica a ser tolerada, não admirada." },
      { reino: "Amaranth/Omem", tipo: "Respeito cauteloso", texto: "Hetalion respeita a Deusa Karphel e mantém laços diplomáticos reais com Amaranth, mas parte da liderança vê a influência do reino sobre a Hetalion Prime como um risco à soberania — um tabuleiro perigoso de se jogar." },
    ],
    glossario: [
      { termo: "Hetalion (cargo)", texto: "Título cerimonial do chefe de Estado — dá nome ao próprio reino. Atual: Prime. Sucessora oficial: Seguintes (sua filha)." },
      { termo: "Federação Vermelha", texto: "Justiça e Memória — tribunais militares e justiça histórica; preza que nenhuma injustiça seja esquecida." },
      { termo: "Federação Azul", texto: "Lei e Ordem — aplicação da lei, investigação e repressão; \"a lei é absoluta até que seja reformada\"." },
      { termo: "Federação Branca", texto: "Cultura e Fé — tradições, cultura nacional e supervisão de todos os ritos religiosos oficiais." },
      { termo: "Federação Negra", texto: "Defesa e Militarismo — segurança interna e externa, braço armado e Força Unificada." },
      { termo: "Força Unificada", texto: "União dos quatro exércitos federativos (Vermelho, Azul, Branco e Negro) em tempos de guerra." },
      { termo: "Conselho Executivo", texto: "Os 4 Generais das Federações mais a Hetalion; principal instância de decisão política e militar do reino." },
    ],
    notasDoMestre: [
      "Os 6 personagens do Grupo Hetalion (4 Generais + 2 subcomandantes) entram em rascunho, grau E em tudo — mesma convenção do Grupo Goethia, só com estatísticas reais quando o mestre definir.",
      "Hetalion Prime e Seguintes são cargo/título que também funciona como nome próprio; não há dossiê de nenhuma das duas ainda. Aparecem na aba Pessoas como nomes livres, sem ficha.",
      "Crikon nasceu em Katalão, filho de aristocrata katalanês — bate com a descrição já existente do reino Katalão ('revelação de Crikon como herdeiro ilegítimo do trono'). As duas fontes são consistentes, não conflitam; vale linkar quando o dossiê de Katalão chegar.",
      "Leona, Ookami Serin e Vientra já existiam como personagens do Grupo C com faction \"Hetalion\" antes deste material chegar — nenhuma delas tem ficha tocada aqui; o dossiê novo só adicionou o elenco de Generais e o conteúdo do reino/aba Pessoas.",
      "O General Azul anterior, que se voltou contra o Estado na Guerra Civil, não tem nome nos dossiês recebidos — citado só como figura histórica no texto da rebelião.",
      "Nenhum dossiê nomeia uma capital nacional nem cidades-sede da Federação Vermelha ou Branca; só Cancer (Azul) e Tauros (Negra) são citadas por nome, além de Novolar (comunidade ningen, já existente no reino antes deste material).",
      "Valefor e Yurity (07/10) vieram num dossiê separado, já com fichas 3d10 estimadas — graus, procs e HP/Defesa/Resistências calculados e conferidos contra o engine.js. Por decisão do Pedro, entram com esses números (não em rascunho grau E) e dentro do Grupo Hetalion, com \"Grupo A — torneio da Academia de Omem, liderado por Hetalion Seguintes\" registrado como texto na affiliation de cada um, não como mesa própria.",
      "O dossiê de Valefor/Yurity usa \"Partido Vermelho/Branco\"; o documento original do reino usa \"Federação Vermelha/Branca\". Tratado aqui como a mesma estrutura (sinônimo), mas sem confirmação explícita — vale perguntar.",
      "Relação entre Yurity e Asana Desroar ainda não definida: a mãe de Yurity foi general do Partido/Federação Vermelha antes de Asana, morta em serviço há ~20 anos — não ficou claro se Asana é sucessora direta dela, nem se as duas são aliadas, rivais ou nem se conhecem. Ver `relacoes` em DADOS_PESSOAS_HETALION.",
      "O dossiê de Valefor/Yurity pede ficha \"fechada para jogadores\" (contém o plano secreto de Yurity e Crikon de levar Seguintes ao poder). O app hoje não tem nenhum mecanismo de ficha oculta por personagem — por decisão do Pedro, as duas fichas entram visíveis como qualquer outra, e o sigilo fica por conta da mesa (não abrir essas fichas com os jogadores olhando).",
      "Thalia, citada no dossiê de Yurity como deidade sem entrada no Guia do Mundo, já existia em SEED_GODS (\"Thalia (Freya)\", domínio Beleza/Vínculo, cultuada por Kiryu) — não é uma lacuna.",
      "\"Dragoalma\", citado de passagem no dossiê de Yurity (\"Dragoalma não gosta dela\"), não tem nenhuma referência em nenhum outro material do app — não criei personagem nem entrada pra ele(a), fica como nome solto até aparecer em outro dossiê.",
    ],
    cities: [
      { id: "hetalion_cancer", name: "Cancer", resumo: "Coração administrativo da Federação Azul. Sede da burocracia estatal e das forças policiais azuis; vinte anos atrás foi palco de uma operação conjunta com heróis de Amaranth contra uma célula terrorista, e cinco anos atrás resistiu a uma rebelião interna liderada por um General Azul dissidente.", x: null, y: null, capital: false, documentada: true },
      { id: "hetalion_tauros", name: "Tauros", resumo: "Cidade militar da Federação Negra. Centro de formação e operações das forças de defesa nacional e de inteligência da Negra.", x: null, y: null, capital: false, documentada: true },
      { id: "hetalion_novolar", name: "Novolar", resumo: "Comunidade de imigrantes ningen dentro de Hetalion; palco de uma revolta interna liderada por Puman, contida com ajuda de agentes infiltrados da Federação Vermelha. Hoje administra suas próprias regras comunitárias.", x: null, y: null, capital: false, documentada: true },
    ],
  },
  { id: "katalao", name: "Katalão", description: "Reino cuja nobreza foi recentemente fraturada pela revelação de Crikon como herdeiro ilegítimo do trono. [Rascunho — refine comigo quando quiser.]",
    // Lido pela cor dos nomes no mapa (amarelo parece ser Katalão) — o Pedro
    // confirma e corrige pelo editor (botão "Editar mapa" na aba Mundo).
    // Sem coordenadas de propósito: elas são posicionadas ali, não aqui.
    mapa: { cor: "#C9A227", poligono: [] },
    cities: [
      { id: "katalao_cidade", name: "Katalão", resumo: "", x: null, y: null, capital: true },
      { id: "kingsyard", name: "Kingsyard", resumo: "", x: null, y: null, capital: false },
      { id: "mundis", name: "Mundis", resumo: "", x: null, y: null, capital: false },
      { id: "frontier", name: "Frontier", resumo: "Cidade grande na fronteira nordeste, colada em Hoshon (Maxis). Regida pela Casa Brennard, vassala dos Pendragons. Ningens do Cadastro Brennard na Vila Nova, dentro da muralha nova; o Barro dos sem-etiqueta do lado de fora.", link: "sidepoint/frontier.html", x: null, y: null, capital: false },
      { id: "riviera", name: "Riviéra", resumo: "", x: null, y: null, capital: false },
      { id: "atlarin", name: "Atlarin", resumo: "", x: null, y: null, capital: false },
      { id: "atlas", name: "Atlas", resumo: "", x: null, y: null, capital: false },
      { id: "promet", name: "Promet", resumo: "", x: null, y: null, capital: false },
      { id: "kil", name: "Kil", resumo: "", x: null, y: null, capital: false },
      { id: "pompeia", name: "Pompeia", resumo: "", x: null, y: null, capital: false },
      { id: "tengov", name: "Tengov", resumo: "", x: null, y: null, capital: false },
    ] },
  { id: "maxis", name: "Maxis Power", description: "Potência industrial e militar, lar de famílias como Mason e Ayamato. [Rascunho — refine comigo quando quiser.]", cities: [] },
  { id: "suth", name: "Suth",
    description: "Império matriarcal de castas e dogmas religiosos, comandado pela Imperadora e sustentado por três Pilares: a Imperadora (lei e administração), a Santa (guerra e doutrina) e a Parteira (ciência e criação de vida). Nacionalismo intenso, supremacia da mulher e da raça suthence, e um poder biotecnológico guardado a sete chaves, capaz de criar homúnculos e raças em laboratório.",
    imagem: "retratos-suth/reino_suth_banner.jpg",
    visaoGeral: "Suth é um reino matriarcal com uma sociedade rigidamente organizada em castas e dogmas religiosos. A mulher tem supremacia sobre o homem, a raça suthence tem direitos sobre as outras e o nacionalismo é intenso. O Estado define o propósito de cada indivíduo desde o nascimento, conforme sua utilidade para o Império, e a maioria das suthences tem o destino definido ao nascer.\n\nA grandeza do reino é reforçada pelo domínio absoluto da biotecnologia, que Suth guarda a sete chaves: o reino cria homúnculos e raças em laboratório e gera um exército de guerreiras geneticamente aprimoradas. Homens são cidadãos de segunda classe, proibidos de ocupar cargos políticos ou militares, e os estrangeiros são vistos com desconfiança e hostilidade, sobretudo pelo Pilar da Santa. A mobilidade social existe só para mulheres.\n\nSuth se divide em três Pilares, cada um com função própria, e é comandada pela Imperadora, que tem poder absoluto sobre os outros Pilares apenas em assuntos administrativos e diplomáticos. A unidade do reino é frágil: qualquer fraqueza pode ser explorada para um golpe interno ou externo. Para evitar revoltas, Suth direciona sua necessidade de guerra para alvos externos; se passar tempo demais sem guerra, a população poderia voltar sua fúria contra Amaranth e Karphel.",
    pilares: [
      {
        id: "imperadora", nome: "Pilar da Imperadora", lema: "Lei, administração e tradição suthence",
        imagem: "retratos-suth/pilar_imperadora.jpg",
        resumo: "Administra as leis e a gestão de recursos do reino, é encarregado da diplomacia e das relações internas e externas, e é comandado pela Imperadora. Todos os cargos civis não tecnológicos pertencem a este pilar.",
        exercito: "Exército Imperial: de natureza defensiva e de controle; age como polícia, força de controle civil e guarda das cidades.",
        relacoes: [
          "Não pode interferir em como o Pilar da Parteira conduz suas criações biotecnológicas.",
          "Não pode influenciar as decisões militares do Pilar da Santa; só define direções estratégicas e a alocação de recursos.",
          "Pode restringir pesquisas e operações dos outros Pilares limitando o acesso aos recursos estatais.",
        ],
        sucessao: [
          "A sucessão ao título de Imperadora é hereditária, mas todas as filhas da Imperadora têm direitos iguais ao trono e precisam disputar entre si.",
          "A Imperadora pode adotar filhas, que terão os mesmos direitos sucessórios.",
          "A sucessora é treinada pela Santa até ser considerada digna.",
          "A Santa Encarnada pode contestar a sucessão, forçando um desafio físico e mental.",
        ],
        familiaImperial: "Descende da primeira Imperadora, que unificou os pilares e as cidades de Suth (inicialmente apenas Holly, Tenebris e Orion). A IX Imperadora, Velmira Alpha, hoje é Conselheira Imperial; sua filha Emphes Alpha é a X Imperadora.",
        lideres: [
          { nome: "Emphes Alpha", cargo: "X Imperadora de Suth", personagem: "suth_emphes" },
          { nome: "Velmira Alpha", cargo: "IX Imperadora, Conselheira Imperial", personagem: "suth_velmira" },
          { nome: "Victoria Bunis", cargo: "General do Exército Imperial", personagem: "suth_victoria" },
          { nome: "Hujimo Bunis", cargo: "Parceiro de Victoria; especialista em portais (sem ficha)", personagem: null },
          { nome: "Valéria Bunis", cargo: "Comandante do Exército Imperial", personagem: "suth_valeria" },
          { nome: "Mars", cargo: "Coronel do Exército Imperial", personagem: "suth_mars" },
          { nome: "Galantia", cargo: "Ex-General da Parteira, agente especial da Imperadora", personagem: "suth_galantia" },
          { nome: "Athena", cargo: "Ex-General da Santa, unidade especial da Imperadora", personagem: "suth_athena" },
        ],
      },
      {
        id: "parteira", nome: "Pilar da Parteira", lema: "Ciência, biotecnologia, genética e biocriação",
        imagem: "retratos-suth/pilar_parteira.jpg",
        resumo: "Controla as criações artificiais do reino: cria homúnculos e gera guerreiras geneticamente melhoradas para servir ao Estado e aos outros pilares. É a força científica e médica do Império, tem conhecimento muito além dos outros reinos em biotecnologia e é sancionado até pelos deuses da vida.",
        exercito: "Exército da Parteira: pequeno, mas altamente especializado; usado em testes biotecnológicos e na proteção das pesquisas. Pode agir de forma independente dos outros pilares.",
        relacoes: [
          "A maior parte da população militar de Suth é criada em laboratório.",
          "A maioria das cidadãs de elite passa por aprimoramentos biotecnológicos para aumentar força, longevidade e eficiência.",
          "O Pilar da Santa recebe como base criações de baixa qualidade do Pilar da Parteira.",
        ],
        lideres: [
          { nome: "ZERO", cargo: "Líder do Pilar da Parteira, a Arquiteta da Vida", personagem: "suth_zero" },
          { nome: "Draguna", cargo: "General do Exército da Parteira", personagem: "suth_draguna" },
          { nome: "Kirilia", cargo: "Força auxiliar", personagem: "suth_kirilia" },
          { nome: "Kyubei", cargo: "Ex-Coronel da Parteira, Cavaleira de Omen", personagem: "suth_kyubei" },
        ],
      },
      {
        id: "santa", nome: "Pilar da Santa", lema: "Militarismo, conquista e doutrina; o exército de Suth e da fronteira",
        imagem: "retratos-suth/pilar_santa.jpg",
        resumo: "Segue os ensinamentos da Santa Encarnada, que é vista como descendente direta de Dulahand e herdeira do mundo, e acredita ter direito divino sobre todo o mundo. É o exército de Suth, responsável pela expansão territorial e pela defesa do Império. Qualquer uma pode pertencer a ele, mas a base é composta por criações de baixa qualidade do Pilar da Parteira, enquanto os cargos mais altos variam entre suthences de grande destaque e homúnculos de alta qualidade.",
        exercito: "Exército da Santa: o maior e mais poderoso de Suth, composto quase inteiramente por homúnculos criados para a guerra.",
        doutrina: [
          "A Santa é vista como herdeira do mundo.",
          "Fraqueza é considerada heresia, e quem não busca aprimoramento é rejeitado.",
          "Aceitar as modificações biotecnológicas do Pilar da Parteira como meio de fortalecimento é parte fundamental da doutrina.",
        ],
        hierarquia: [
          "FATE (a Guardiã, a Santa Encarnada) é incontestável e venerada como um ser divino.",
          "A sucessora da Santa atual é Fate, a Indomável, escolhida diretamente por FATE, mas sua autoridade ainda pode ser desafiada.",
        ],
        lideres: [
          { nome: "FATE (a Santa Encarnada)", cargo: "Guardiã do Pilar da Santa (sem ficha)", personagem: null },
          { nome: "Fate, a Indomável", cargo: "Próxima Santa", personagem: "fate" },
          { nome: "Azula", cargo: "General da Santa", personagem: "suth_azula" },
          { nome: "Farron", cargo: "Coronel da Santa", personagem: "suth_farron" },
          { nome: "Athermis", cargo: "Representante do Exército da Santa", personagem: "suth_athermis" },
        ],
      },
    ],
    rebeliao: {
      titulo: "A Rebelião da Parteira",
      texto: "A antiga líder do Pilar da Parteira, uma Krovskin (um monstro cientista), buscava a divindade e liderou uma revolta contra o Império, na época do reinado de Velmira Alpha. Queria dominar Suth e conquistar Amaranth, governada então pelo Lorde Omem, antecessor de Karphel. A Krovskin acabou se tornando parte do novo deus do Caos: a Besta. A revolta foi suprimida e a Parteira, executada; ZERO assumiu o Pilar, inaugurando uma nova era de controle biotecnológico. Galantia e Athena, que lutaram na rebelião por seguirem ordens cegamente, foram poupadas por suas singularidades úteis e presas em Amaranth; hoje atuam sob ordens diretas da Imperadora. A rebelião é datada de 1000 a 1002 PO e é atribuída injustamente à suposta complacência de Velmira.",
    },
    economia: [
      "Sistema de Estado: os cidadãos trocam serviço militar ou civil por recursos básicos.",
      "Karphel (a moeda) é restrito às elites e à administração; pouco usado pela população comum.",
      "Algumas cidades implementam um sistema de mérito: quem desempenha melhor sua função recebe mais benefícios do Estado.",
      "Mobilidade social só para mulheres; homens são cidadãos de segunda classe.",
    ],
    relacoes: [
      { reino: "Goethia", tipo: "Rivalidade", texto: "Disputa constante por fronteiras." },
      { reino: "Katalão", tipo: "Ódio histórico", texto: "Diferenças culturais levaram a um ciclo sem fim de guerras." },
      { reino: "Maxis Power", tipo: "Abominação", texto: "Maxis tenta influenciar Suth com sua economia de mercado; é visto como reino depravado." },
      { reino: "Hetalion", tipo: "Alvo militar", texto: "Visto como fraco e alvo constante de invasões." },
      { reino: "Amaranth/Omem", tipo: "Respeito relutante", texto: "Suth respeita Karphel, mas a vê como governante estrangeira; a rejeição popular é forte." },
    ],
    glossario: [
      { termo: "Guerreira/o", texto: "Lutadora de alta força e constituição." },
      { termo: "Artista marcial", texto: "Lutadora de alta agilidade e precisão." },
      { termo: "Magecraft", texto: "Domínio sobre magia." },
      { termo: "Golden Rule", texto: "Área de domínio e atuação." },
      { termo: "Homunculus", texto: "Corpo modificado/criado pelo Pilar da Parteira; o grau mede a qualidade." },
    ],
    notasDoMestre: [
      "A Santa: decidido pelo Mestre, ela descende diretamente de Dulahand. A menção a 'avatar da deusa Gigas' no documento de Suth foi descartada.",
      "O seed antigo chama a líder de 'Imperatriz'; os documentos usam 'Imperadora'. Usar Imperadora.",
      "Fate: são duas pessoas distintas. FATE (a Guardiã, Santa Encarnada, incontestável, sem dossiê) e Fate Sabato, a Indomável (sucessora, com ficha). Kirilia perdeu para Fate Sabato e depois a derrotou com estratégia e aliados.",
      "Dossiês pendentes: FATE (Guardiã) e Hujimo Bunis têm só dados parciais no documento de Suth. Velmira não tem graus nem singularidade.",
    ],
    cities: [
      { id: "suth_holly", name: "Holly Suth", resumo: "Cidade-sede no mapa de Suth. Uma das três cidades originais unificadas pela primeira Imperadora (o documento a chama de Holly).", x: null, y: null, capital: true, documentada: true },
      { id: "suth_tenebris", name: "Tenebris", resumo: "Uma das três cidades originais unificadas pela primeira Imperadora.", x: null, y: null, capital: false, documentada: true },
      { id: "suth_orion", name: "Orion", resumo: "Uma das três cidades originais unificadas pela primeira Imperadora.", x: null, y: null, capital: false, documentada: true },
      { id: "suth_astra", name: "Astra", resumo: "Cidade de Suth marcada no mapa; ainda sem descrição.", x: null, y: null, capital: false, documentada: false },
      { id: "suth_becelgeuse", name: "Becelgeuse", resumo: "Cidade de Suth marcada no mapa (grafia a confirmar: no mapa lê-se Becelgeuse ou Becelkeuse); ainda sem descrição.", x: null, y: null, capital: false, documentada: false },
      { id: "suth_virsa", name: "Virsa", resumo: "Cidade de Suth marcada no mapa (grafia a confirmar); ainda sem descrição.", x: null, y: null, capital: false, documentada: false },
      { id: "suth_risel", name: "Risel", resumo: "Cidade de Suth marcada no mapa (grafia a confirmar); ainda sem descrição.", x: null, y: null, capital: false, documentada: false },
    ],
  },
  { id: "goethia", name: "Goethia",
    description: "Reino de guerreiros moldado pelo sangue e pelo ferro, unido pela conexão emocional coletiva com sua Santa, Erin Genova, e governado pelo Tzar Giovana Brunhild Goetus II — o primeiro, em mais de mil anos, a desafiar abertamente o status quo goethiano.",
    visaoGeral: "Goethia é marcado por climas extremos — frio intenso no centro, rios de lava no leste — e por cidades gigantescas com biomas distintos dentro de uma mesma muralha. Os goethianos têm estatura imponente (média de 2 metros) e uma tradição peculiar: homens recebem nomes considerados femininos em outras culturas, e mulheres, nomes tidos como masculinos.\n\nA sociedade prioriza o bem coletivo sobre o indivíduo — não há fome, pobreza ou miséria dentro das muralhas, pois os recursos são distribuídos igualmente a quem serve ao Estado. Quem desrespeita as leis é declarado \"morto\" e exilado pras favelas que se formam fora das muralhas, sem direito de reentrar. Apesar da rigidez, o povo aprecia festivais e música, oscilando entre frieza e impulsividade.\n\nO reino foi fundado por Lady Ulher, esposa de Lord Omem, que encontrou seguidores na região após deixar Amaranth e ajudou tribos locais contra dragões. Ferida pela entidade primordial Sharkan, foi forçada a partir — mas Sharkan foi derrotada, seu corpo esquartejado e selado em quatro fontes, que deram origem às grandes cidades de Goethia. Por séculos essas águas concederam juventude eterna aos goethianos, sustentando uma sociedade sem dinheiro, baseada na contribuição obrigatória ao Estado. Há 20 anos, porém, Sharkan foi libertada, encerrando a imortalidade — e o povo de Goethia hoje enfrenta a própria mortalidade pela primeira vez na história.",
    rebeliao: {
      titulo: "A Libertação de Sharkan",
      texto: "Sharkan, entidade primordial que feriu a fundadora Lady Ulher, foi derrotada havia séculos e teve seu corpo esquartejado e selado em quatro fontes — as mesmas que deram origem às grandes cidades de Goethia e concediam juventude eterna aos goethianos. Há 20 anos, Sharkan foi libertada, encerrando de uma vez a imortalidade dos goethianos modernos. O primeiro Tzar havia governado 1.200 anos estabilizando o reino sob essa promessa de eternidade; hoje, pela primeira vez na história, o povo goethiano precisa lidar com a própria mortalidade — um dos pano de fundo da tensão entre tradição e mudança que marca o reinado de Giovana.",
    },
    economia: [
      "Sistema sem moeda: cidadãos têm acesso a tudo que precisam, desde que sirvam ao Estado.",
      "Perda da cidadania: quem falha em contribuir é declarado \"morto\" e exilado das cidades.",
      "Favelas de exilados se formam nas áreas externas das cidades; os \"mortos\" são proibidos de reentrar nas muralhas.",
      "Armas que incorporam almas são uma tecnologia única de Goethia — algumas famílias de guerreiros lutam lado a lado com seus ancestrais através delas.",
    ],
    relacoes: [
      { reino: "Suth", tipo: "Guerra recente e aliança em formação", texto: "Guerra de cerca de 5 anos atrás entre os dois reinos; hoje o Tzar Giovana planeja um casamento político com a Imperadora Emphes Alpha, de Suth, para uni-los numa só superpotência." },
      { reino: "Hetalion", tipo: "Desprezo histórico", texto: "Invasões passadas contra Lavkhekh e Libish alimentam um desprezo profundo, sobretudo dentro da Irmandade da Tempestade." },
      { reino: "Amaranth/Omem", tipo: "Pacto dos Guardiões", texto: "Lord Omem entregou um Guardião a cada reino (Zed, em Goethia) como parte de um pacto de equilíbrio entre as nações — Amaranth, sede dos Cavaleiros de Omem, recebeu dois." },
    ],
    glossario: [
      { termo: "Tzar", texto: "Governante supremo de Goethia; título hereditário da Dinastia Goetus." },
      { termo: "Arquiduque", texto: "Governador de uma cidade goethiana; autonomia local, mas presta tributo ao Tzar." },
      { termo: "Irmandade da Tempestade", texto: "Facção espiritual e mágica ligada à Santa; neutra politicamente, mas de forte influência espiritual." },
      { termo: "Irmandade da Forja", texto: "Controla a produção de armas do reino; pode favorecer aliados." },
      { termo: "Irmandade dos Contos", texto: "Influencia a cultura e a educação de Goethia." },
      { termo: "Guardião", texto: "Raça secreta criada na origem do mundo como contrapeso ao poder dos deuses; cada reino recebeu um — Amaranth recebeu dois." },
      { termo: "\"Morto\" (status civil)", texto: "Quem desrespeita as leis de Goethia ou falha em contribuir ao Estado é declarado \"morto\" e exilado das cidades, sem direito de retorno." },
    ],
    notasDoMestre: [
      "A cidade grafada \"Lavkhehk\" no dossiê pessoal de Hildr foi padronizada para \"Lavkhekh\" (grafia do relatório oficial do reino).",
      "Erin Genova já existia como personagem do Grupo C, com ficha fechada e estatísticas completas, antes deste material chegar. O dossiê novo só enriqueceu a aba Pessoas/relações do reino — a ficha mecânica dela não foi tocada.",
      "As outras 10 fichas de Goethia entraram em rascunho (grau E em tudo), por decisão do Pedro — o material de origem é só prosa, sem nenhum número de combate.",
      "Nomes citados nos dossiês sem ficha própria neste material: Aisha Zeke (diplomata da Irmandade dos Contos), a mãe e o irmão de Krish, a esposa de Skuld, a esposa e a filha de Suzane, o amigo de combate e a filha de Hildr, Brunhild (pai de Giovana, preso nos calabouços), a guerreira Maria (derrotou Suzane) e FATE/Hetalion Seguintes (citadas só como rivalidade simbólica de Erin).",
    ],
    cities: [
      { id: "goethia_grande", name: "Grande Goethia", resumo: "Capital do reino (Leste). Centro administrativo e político; sede do Tzar e do Sangue do Tzar, responsável pela ordem e segurança. Maior cidade de Goethia, onde se concentram as decisões estratégicas.", x: null, y: null, capital: true, documentada: true },
      { id: "goethia_krakovsk", name: "Krakovsk", resumo: "Norte, gélida e brutal. Região congelada de temperaturas extremamente baixas; seus habitantes são guerreiros endurecidos pelo frio, conhecida por suas arenas de combate e treinos brutais.", x: null, y: null, capital: false, documentada: true },
      { id: "goethia_changhek", name: "Changhek", resumo: "Sul, cidade espiritual. Cidade sagrada e sede da Irmandade da Tempestade; centro de conhecimento sobre reencarnação e rituais, local de formação dos monges e magas de Goethia.", x: null, y: null, capital: false, documentada: true },
      { id: "goethia_libish", name: "Libish", resumo: "Oeste, comércio e defesa. Principal centro comercial e militar de defesa do reino; controla as rotas de transporte e é ponto-chave para negociações, com grandes fortalezas protegendo as fronteiras ocidentais.", x: null, y: null, capital: false, documentada: true },
      { id: "goethia_vantohrk", name: "Vantohrk", resumo: "Noroeste, agricultura e recursos. Responsável pela produção de alimentos e distribuição de recursos básicos; terra fértil que garante abastecimento estável para o resto do reino.", x: null, y: null, capital: false, documentada: true },
      { id: "goethia_lavkhekh", name: "Lavkhekh", resumo: "Sudoeste, cidade de guerreiros. Treinamentos militares e berço de guerreiros excepcionais; forte influência da Irmandade da Tempestade, combinando fé e combate, também contribui com recursos estratégicos.", x: null, y: null, capital: false, documentada: true },
      { id: "goethia_santorum", name: "Goethia Santorum", resumo: "Sudeste, região arruinada. Antiga cidade tomada por uma maldição desconhecida; evitada pela maioria dos goethianos, mas ainda guarda segredos ocultos.", x: null, y: null, capital: false, documentada: true },
    ],
  },
  { id: "amaranth", name: "Amaranth/Omem", description: "Sede da Academia de Omem e dos Cavaleiros de Omem, centro do grupo principal da campanha. [Rascunho — refine comigo quando quiser.]", cities: [] },
];

// Conteúdo rico do reino Suth, usado por preencherReinoSuth (suth.js) pra
// repor quem já tinha um point-kingdoms salvo com o rascunho antigo — a
// própria entrada "suth" acima em SEED_KINGDOMS já tem esse conteúdo
// definitivo pra quem abre o app sem nada salvo ainda.
const DADOS_SUTH = SEED_KINGDOMS_RAW.find((k) => k.id === "suth");

// Mesmo raciocínio, agora pro reino de Goethia (preencherReinoSuth é
// genérica — já olhava só pro id do reino, não precisou de função nova).
const DADOS_GOETHIA = SEED_KINGDOMS_RAW.find((k) => k.id === "goethia");

// Mesmo raciocínio, agora pro reino de Hetalion.
const DADOS_HETALION = SEED_KINGDOMS_RAW.find((k) => k.id === "hetalion");

// Pessoas do reino Suth (Pilares, relações, genealogias) — ver pessoasReino.js
// pra como isso é semeado (reporPessoasDoReino) e exibido (aba "Pessoas" em
// WorldView). Todo personagemId aqui existe em SUTH_CHARACTERS_RAW ou é
// "fate" — conferido em pessoasReino.test.js (varredura de ids).
export const DADOS_PESSOAS_SUTH = {
  "estrutura": {
    "titulo": "Pilares do Império",
    "grupos": [
      {
        "id": "imperadora",
        "nome": "Pilar da Imperadora",
        "funcao": "Lei, administração, recursos e diplomacia",
        "membros": [
          {
            "personagemId": "suth_emphes",
            "cargo": "X Imperadora (líder do pilar)",
            "ordem": 1
          },
          {
            "personagemId": "suth_velmira",
            "cargo": "Conselheira Imperial (IX Imperadora, aposentada)",
            "ordem": 2
          },
          {
            "personagemId": "suth_victoria",
            "cargo": "General do Exército Imperial",
            "ordem": 3
          },
          {
            "personagemId": "suth_valeria",
            "cargo": "Comandante do Exército Imperial",
            "ordem": 4
          },
          {
            "personagemId": "suth_mars",
            "cargo": "Coronel do Exército Imperial",
            "ordem": 5
          },
          {
            "nomeLivre": "Hujimo Bunis",
            "cargo": "Parceiro de Victoria; especialista em portais",
            "ordem": 6,
            "nota": "Dossiê pendente"
          },
          {
            "personagemId": "suth_galantia",
            "cargo": "Agente da Imperadora (ex-General da Parteira)",
            "ordem": 7
          },
          {
            "personagemId": "suth_athena",
            "cargo": "Unidade Especial da Imperadora (ex-General da Santa)",
            "ordem": 8
          }
        ]
      },
      {
        "id": "parteira",
        "nome": "Pilar da Parteira",
        "funcao": "Ciência, biotecnologia e biocriação",
        "membros": [
          {
            "personagemId": "suth_zero",
            "cargo": "Líder do pilar",
            "ordem": 1
          },
          {
            "personagemId": "suth_draguna",
            "cargo": "General do Exército da Parteira",
            "ordem": 2
          },
          {
            "personagemId": "suth_kirilia",
            "cargo": "Força auxiliar (veio do Pilar da Santa)",
            "ordem": 3
          }
        ]
      },
      {
        "id": "santa",
        "nome": "Pilar da Santa",
        "funcao": "Militarismo, conquista e doutrina",
        "membros": [
          {
            "nomeLivre": "FATE, a Guardiã",
            "cargo": "Santa Encarnada (líder do pilar)",
            "ordem": 1,
            "nota": "Dossiê pendente"
          },
          {
            "personagemId": "fate",
            "cargo": "Próxima Santa (sucessora)",
            "ordem": 2
          },
          {
            "personagemId": "suth_azula",
            "cargo": "General da Santa",
            "ordem": 3
          },
          {
            "personagemId": "suth_farron",
            "cargo": "Coronel da Santa",
            "ordem": 4
          },
          {
            "personagemId": "suth_athermis",
            "cargo": "Representante da Santa",
            "ordem": 5
          }
        ]
      },
      {
        "id": "fora",
        "nome": "Fora dos pilares",
        "funcao": "Ligações externas",
        "membros": [
          {
            "personagemId": "suth_kyubei",
            "cargo": "Cavaleira de Omen (ex-Parteira)",
            "ordem": 1
          }
        ]
      }
    ]
  },
  "relacoes": [
    {
      "de": "suth_velmira",
      "para": "suth_emphes",
      "tipo": "hierarquia",
      "rotulo": "antecessora no trono"
    },
    {
      "de": "suth_victoria",
      "para": "suth_valeria",
      "tipo": "hierarquia",
      "rotulo": "General → Comandante"
    },
    {
      "de": "suth_valeria",
      "para": "suth_mars",
      "tipo": "hierarquia",
      "rotulo": "Comandante → Coronel"
    },
    {
      "de": "suth_victoria",
      "para": "suth_mars",
      "tipo": "mentoria",
      "rotulo": "mentora"
    },
    {
      "de": "suth_zero",
      "para": "suth_draguna",
      "tipo": "hierarquia",
      "rotulo": "Líder → General; criadora"
    },
    {
      "de": "suth_zero",
      "para": "suth_kirilia",
      "tipo": "hierarquia",
      "rotulo": "Kirilia responde à ZERO"
    },
    {
      "de": "suth_azula",
      "para": "suth_farron",
      "tipo": "hierarquia",
      "rotulo": "General → Coronel"
    },
    {
      "de": "suth_farron",
      "para": "suth_athermis",
      "tipo": "hierarquia",
      "rotulo": "Coronel → Representante"
    },
    {
      "de": "suth_zero",
      "para": "suth_azula",
      "tipo": "criacao",
      "rotulo": "criou Azula como experimento"
    },
    {
      "de": "suth_kyubei",
      "para": "suth_galantia",
      "tipo": "hierarquia",
      "rotulo": "foi subordinada de Galantia"
    },
    {
      "de": "suth_athena",
      "para": "suth_galantia",
      "tipo": "aliança",
      "rotulo": "lutaram ao lado da antiga Parteira na rebelião"
    },
    {
      "de": "suth_emphes",
      "para": "suth_galantia",
      "tipo": "aliança",
      "rotulo": "libertou Galantia e Athena de Amaranth"
    },
    {
      "de": "suth_emphes",
      "para": "suth_athena",
      "tipo": "aliança",
      "rotulo": "libertou Galantia e Athena de Amaranth"
    },
    {
      "de": "suth_kirilia",
      "para": "fate",
      "tipo": "rivalidade",
      "rotulo": "perdeu para Fate Sabato; depois a derrotou com estratégia e aliados"
    },
    {
      "de": "suth_farron",
      "para": "suth_athena",
      "tipo": "familia",
      "rotulo": "lutou contra a própria família na rebelião"
    }
  ],
  "genealogias": [
    {
      "id": "imperial",
      "titulo": "Linhagem imperial",
      "nos": [
        {
          "id": "velmira",
          "personagemId": "suth_velmira"
        },
        {
          "id": "emphes",
          "personagemId": "suth_emphes"
        }
      ],
      "ligacoes": [
        {
          "pais": [
            "velmira"
          ],
          "filho": "emphes",
          "tipo": "mãe e filha (Emphes criada em laboratório)"
        }
      ]
    },
    {
      "id": "bunis",
      "titulo": "Família Bunis",
      "nos": [
        {
          "id": "victoria",
          "personagemId": "suth_victoria"
        },
        {
          "id": "hujimo",
          "nome": "Hujimo Bunis",
          "nota": "Dossiê pendente"
        },
        {
          "id": "valeria",
          "personagemId": "suth_valeria"
        },
        {
          "id": "mars",
          "personagemId": "suth_mars"
        }
      ],
      "ligacoes": [
        {
          "pais": [
            "victoria",
            "hujimo"
          ],
          "filho": "valeria",
          "tipo": "filha adotiva"
        },
        {
          "pais": [
            "victoria"
          ],
          "filho": "mars",
          "tipo": "mentora (não é parentesco de sangue)",
          "tracejado": true
        }
      ]
    },
    {
      "id": "luz",
      "titulo": "Família da Luz",
      "nos": [
        {
          "id": "athena",
          "personagemId": "suth_athena"
        },
        {
          "id": "athermis",
          "personagemId": "suth_athermis"
        },
        {
          "id": "farron",
          "personagemId": "suth_farron"
        }
      ],
      "ligacoes": [
        {
          "pais": [
            "athena"
          ],
          "filho": "athermis",
          "tipo": "mãe e filha"
        },
        {
          "pais": [
            "athena"
          ],
          "filho": "farron",
          "tipo": "tia e sobrinha",
          "tracejado": true
        }
      ],
      "notas": [
        "Farron e Athermis são primas."
      ]
    },
    {
      "id": "criacoes",
      "titulo": "Criações e filiações",
      "nos": [
        {
          "id": "santa",
          "nome": "A Santa",
          "nota": "A confirmar se é a mesma pessoa que FATE, a Guardiã"
        },
        {
          "id": "mariacelis",
          "nome": "Maria Celis"
        },
        {
          "id": "kirilia",
          "personagemId": "suth_kirilia"
        },
        {
          "id": "galantia",
          "personagemId": "suth_galantia"
        },
        {
          "id": "kyubei",
          "personagemId": "suth_kyubei"
        },
        {
          "id": "draguna",
          "personagemId": "suth_draguna"
        },
        {
          "id": "zero",
          "personagemId": "suth_zero"
        },
        {
          "id": "kino",
          "nome": "Kino Kuni",
          "nota": "Antiga segunda em comando da Parteira"
        },
        {
          "id": "fate",
          "personagemId": "fate"
        },
        {
          "id": "azula",
          "personagemId": "suth_azula"
        }
      ],
      "ligacoes": [
        {
          "pais": [
            "santa",
            "mariacelis"
          ],
          "filho": "kirilia",
          "tipo": "filha"
        },
        {
          "pais": [
            "santa"
          ],
          "filho": "galantia",
          "tipo": "filha (segundo o documento de Suth)"
        },
        {
          "pais": [
            "kyubei"
          ],
          "filho": "draguna",
          "tipo": "mãe (segundo o documento de Suth)"
        },
        {
          "pais": [
            "zero"
          ],
          "filho": "draguna",
          "tipo": "criadora",
          "tracejado": true
        },
        {
          "pais": [
            "kino"
          ],
          "filho": "fate",
          "tipo": "criadora (laboratório)",
          "tracejado": true
        },
        {
          "pais": [
            "zero"
          ],
          "filho": "azula",
          "tipo": "criadora (experimento)",
          "tracejado": true
        }
      ]
    }
  ]
};

// Pessoas do reino Goethia (Tzar/Irmandades/generais, relações e as duas
// genealogias — família Rostnamov e as almas vinculadas a armas/armaduras).
// A Erin Genova aparece aqui pelo id já existente "erin" (Grupo C) — não tem
// ficha nova sendo criada pra ela, só o vínculo na estrutura/relações.
export const DADOS_PESSOAS_GOETHIA = {
  estrutura: {
    titulo: "Tzar, Irmandades e Generais de Goethia",
    grupos: [
      {
        id: "tzar", nome: "Tzar e Comando Direto", funcao: "Governo supremo de Goethia e as forças que respondem só a ele",
        membros: [
          { personagemId: "goethia_giovana", cargo: "Tzar de Goethia", ordem: 1 },
          { personagemId: "goethia_victor", cargo: "Comandante da Tropa Pessoal do Tzar", ordem: 2 },
          { personagemId: "goethia_mistake", cargo: "Comandante das Forças Especiais do Tzar", ordem: 3 },
        ],
      },
      {
        id: "tempestade", nome: "Irmandade da Tempestade", funcao: "Facção espiritual e mágica; forte influência espiritual, neutra politicamente",
        membros: [
          { personagemId: "erin", cargo: "A Santa de Goethia (figura espiritual suprema)", ordem: 1 },
          { personagemId: "goethia_krish", cargo: "Coordenadora — organiza e comanda a Irmandade na prática", ordem: 2 },
        ],
      },
      {
        id: "forja", nome: "Irmandade da Forja", funcao: "Controla a produção de armas de Goethia",
        membros: [
          { personagemId: "goethia_zed", cargo: "Espírito da Forja (cargo simbólico mais alto, anterior à própria Irmandade)", ordem: 1 },
          { personagemId: "goethia_suzane", cargo: "Supervisor da Irmandade da Forja · General de Libish", ordem: 2 },
          { personagemId: "goethia_paulao", cargo: "Alto-Artificer · discípulo de Zed", ordem: 3 },
        ],
      },
      {
        id: "generais", nome: "Generais Regionais", funcao: "Comandam o exército goethiano nas cidades-chave do reino",
        membros: [
          { personagemId: "goethia_skuld", cargo: "General Supremo de Goethia · General de Grande Goethia", ordem: 1 },
          { personagemId: "goethia_hildr", cargo: "General de Lavkhekh", ordem: 2 },
          { personagemId: "goethia_mustafar", cargo: "General de Krakovsk", ordem: 3 },
          { nomeLivre: "Aisha Zeke", cargo: "Diplomata da Irmandade dos Contos", ordem: 4, nota: "Dossiê pendente" },
        ],
      },
    ],
  },
  relacoes: [
    { de: "goethia_giovana", para: "goethia_skuld", tipo: "hierarquia", rotulo: "respeito tenso — Skuld não é leal a Giovana, mas tem senso de dever com o reino" },
    { de: "goethia_giovana", para: "goethia_zed", tipo: "alianca", rotulo: "vínculo por contrato, não por afeto" },
    { de: "goethia_giovana", para: "goethia_krish", tipo: "alianca", rotulo: "aliados políticos — compartilham a visão de um reino mais aberto" },
    { de: "goethia_giovana", para: "goethia_victor", tipo: "alianca", rotulo: "pacto de confiança mútua, não de subordinação" },
    { de: "goethia_giovana", para: "goethia_mistake", tipo: "hierarquia", rotulo: "lealdade total — Mistake o vê como sua razão de existir" },
    { de: "goethia_giovana", para: "goethia_paulao", tipo: "alianca", rotulo: "amigos de infância; protegido político do Tzar" },
    { de: "goethia_giovana", para: "goethia_mustafar", tipo: "alianca", rotulo: "ótima relação — Mustafar deve o posto de general a Giovana" },
    { de: "goethia_giovana", para: "suth_emphes", tipo: "alianca", rotulo: "plano de casamento político pra unir Goethia e Suth numa só superpotência" },
    { de: "goethia_krish", para: "goethia_victor", tipo: "familia", rotulo: "mãe e filha — cresceram afastadas, mas o vínculo de sangue nunca foi negado" },
    { de: "goethia_krish", para: "goethia_giovana", tipo: "rivalidade", rotulo: "desconfiança mútua, mas seguem juntas por respeito à Santa Erin" },
    { de: "goethia_zed", para: "goethia_suzane", tipo: "alianca", rotulo: "reforjou armadura e arma de Suzane, oferecendo paz às almas ali contidas" },
    { de: "goethia_zed", para: "goethia_paulao", tipo: "mentoria", rotulo: "mestre e mentor na arte da forja" },
    { de: "goethia_paulao", para: "goethia_suzane", tipo: "rivalidade", rotulo: "rivalidade acirrada, com respeito técnico mútuo" },
    { de: "goethia_hildr", para: "goethia_skuld", tipo: "alianca", rotulo: "respeito mútuo; divergem sobre a necessidade do conflito" },
    { de: "goethia_hildr", para: "goethia_mustafar", tipo: "alianca", rotulo: "respeita Mustafar, mas ainda vê ningens como \"outsiders\"" },
    { de: "goethia_mustafar", para: "goethia_skuld", tipo: "alianca", rotulo: "admira a força de Skuld, mas considera sua obsessão pela guerra perigosa" },
    { de: "erin", para: "goethia_giovana", tipo: "alianca", rotulo: "aliados diretos — hoje ela confia nele plenamente" },
    { de: "erin", para: "goethia_victor", tipo: "alianca", rotulo: "aliadas diretas" },
    { de: "erin", para: "goethia_paulao", tipo: "alianca", rotulo: "aliados diretos" },
    { de: "erin", para: "goethia_mistake", tipo: "alianca", rotulo: "aliados diretos" },
    { de: "erin", para: "kiryu", tipo: "alianca", rotulo: "aliada direta de Kiryu, do Grupo C" },
    { de: "erin", para: "fate", tipo: "rivalidade", rotulo: "rivalidade simbólica entre as Santas de Goethia e de Suth, criada pela população dos dois reinos" },
  ],
  genealogias: [
    {
      id: "rostnamov", titulo: "Família Rostnamov",
      nos: [
        { id: "mae_krish", nome: "Mãe de Krish (falecida)", nota: "Deu origem ao machado de fogo que Krish carrega até hoje." },
        { id: "krish", personagemId: "goethia_krish" },
        { id: "victor", personagemId: "goethia_victor" },
      ],
      ligacoes: [
        { pais: ["mae_krish"], filho: "krish", tipo: "mãe e filha" },
        { pais: ["krish"], filho: "victor", tipo: "mãe e filha" },
      ],
      notas: [
        "O irmão de Krish (fonte do machado de gelo) também é mencionado no dossiê, mas sem nome — não entra na árvore por falta de dado (é irmão de Krish, não ascendente nem descendente).",
        "Victor Elena cresceu afastada de Krish, criada por uma comunidade em Lavkhekh — mas o vínculo de sangue entre as duas nunca foi negado.",
      ],
    },
    {
      id: "almas_vinculadas", titulo: "Almas Vinculadas a Armas e Armaduras",
      nos: [
        { id: "esposa_suzane", nome: "Esposa de Suzane (falecida)", nota: "Sua alma habita a armadura de Suzane, reforjada por Zed." },
        { id: "filha_suzane", nome: "Filha de Suzane (falecida)", nota: "Sua alma habita o porrete de aço de Suzane." },
        { id: "suzane", personagemId: "goethia_suzane" },
        { id: "esposa_skuld", nome: "Esposa de Skuld (falecida)", nota: "Sua alma habita o colar de Skuld — a fonte da singularidade Ira da Santa." },
        { id: "skuld", personagemId: "goethia_skuld" },
        { id: "amigo_hildr", nome: "Antigo amigo de combate de Hildr (falecido)", nota: "Sua alma habita a espada de Hildr." },
        { id: "filha_hildr", nome: "Filha de Hildr (falecida)", nota: "Sua alma habita o escudo de Hildr." },
        { id: "hildr", personagemId: "goethia_hildr" },
      ],
      ligacoes: [
        { pais: ["esposa_suzane"], filho: "suzane", tipo: "alma vinculada à armadura", tracejado: true },
        { pais: ["filha_suzane"], filho: "suzane", tipo: "alma vinculada à arma", tracejado: true },
        { pais: ["esposa_skuld"], filho: "skuld", tipo: "alma vinculada ao colar (singularidade)", tracejado: true },
        { pais: ["amigo_hildr"], filho: "hildr", tipo: "alma vinculada à espada", tracejado: true },
        { pais: ["filha_hildr"], filho: "hildr", tipo: "alma vinculada ao escudo", tracejado: true },
      ],
      notas: [
        "Goethia tem uma tecnologia única de armas que incorporam almas — não é parentesco de sangue, por isso toda ligação aqui é tracejada.",
      ],
    },
  ],
};

// Pessoas do reino Hetalion (Conselho, Federações, relações) — ver
// pessoasReino.js pra como isso é semeado (reporPessoasDoReino) e exibido
// (aba "Pessoas" em WorldView). Todo personagemId aqui existe em
// HETALION_CHARACTERS_RAW ou é "kiryu" (Grupo C) — conferido em
// pessoasReino.render.test.js (varredura de ids). Sem genealogias: os
// dossiês recebidos não trazem dados de família suficientes pra montar uma
// árvore sem inventar parentesco.
export const DADOS_PESSOAS_HETALION = {
  estrutura: {
    titulo: "Conselho Executivo e as Quatro Federações de Hetalion",
    grupos: [
      {
        id: "coroa", nome: "Hetalion e a Sucessão", funcao: "Chefia de Estado cerimonial, mediação entre federações e última instância judicial",
        membros: [
          { nomeLivre: "Hetalion Prime", cargo: "Hetalion atual — chefe de Estado", ordem: 1, nota: "Dossiê pendente" },
          { nomeLivre: "Seguintes", cargo: "Sucessora oficial (filha de Prime)", ordem: 2, nota: "Dossiê pendente" },
        ],
      },
      {
        id: "federacao_vermelha", nome: "Federação Vermelha — Justiça e Memória", funcao: "Justiça histórica e tribunais militares",
        membros: [
          { personagemId: "hetalion_asana", cargo: "General da Federação Vermelha", ordem: 1 },
        ],
      },
      {
        id: "federacao_azul", nome: "Federação Azul — Lei e Ordem", funcao: "Aplicação da lei, investigação e repressão",
        membros: [
          { personagemId: "hetalion_shoebil", cargo: "General da Federação Azul", ordem: 1 },
          { personagemId: "hetalion_crikon", cargo: "Executor-Chefe das Forças Policiais", ordem: 2 },
        ],
      },
      {
        id: "federacao_branca", nome: "Federação Branca — Cultura e Fé", funcao: "Tradições, cultura nacional e supervisão dos ritos religiosos",
        membros: [
          { personagemId: "hetalion_hoshon", cargo: "General da Federação Branca · Sumo Mediador dos Rituais Nacionais", ordem: 1 },
        ],
      },
      {
        id: "federacao_negra", nome: "Federação Negra — Defesa e Militarismo", funcao: "Segurança interna e externa, braço armado e Força Unificada",
        membros: [
          { personagemId: "hetalion_jingen", cargo: "General da Federação Negra", ordem: 1 },
          { personagemId: "hetalion_emeaver", cargo: "Comandante das Forças Especiais", ordem: 2 },
        ],
      },
      {
        id: "grupo_a", nome: "Grupo A — Torneio da Academia de Omem", funcao: "Equipe reunida por Hetalion Seguintes para o torneio; por trás, o núcleo do plano político dela com Yurity e Crikon",
        membros: [
          { personagemId: "hetalion_yurity", cargo: "Comandante do Exército Vermelho · aliada próxima de Seguintes", ordem: 1 },
          { personagemId: "hetalion_valefor", cargo: "Sacerdote de Kronos · suporte discreto a Seguintes", ordem: 2 },
        ],
      },
    ],
  },
  relacoes: [
    { de: "hetalion_crikon", para: "hetalion_shoebil", tipo: "rivalidade velada", rotulo: "vê Shoebil como incompetente funcional, útil só por ser previsível e obediente" },
    { de: "hetalion_crikon", para: "hetalion_asana", tipo: "respeito", rotulo: "respeita sua coragem e pureza de propósito, ainda que ache sua impulsividade perigosa" },
    { de: "hetalion_crikon", para: "hetalion_jingen", tipo: "desconfiança", rotulo: "desconfia profundamente — sabe que Jingen pode perceber suas intenções se prestar atenção" },
    { de: "hetalion_crikon", para: "hetalion_hoshon", tipo: "desprezo", rotulo: "considera Hoshon um parasita político, manipulador incapaz de sujar as próprias mãos" },
    { de: "hetalion_emeaver", para: "hetalion_crikon", tipo: "amizade distante", rotulo: "amizade distante e respeito mútuo" },
    { de: "hetalion_emeaver", para: "hetalion_jingen", tipo: "hierarquia", rotulo: "relação funcional e de respeito como superior direto, sem envolvimento pessoal" },
    { de: "hetalion_emeaver", para: "kiryu", tipo: "amizade", rotulo: "amizade inesperada com Kiryu, de Maxis Power, construída em respeito tático" },
    { de: "hetalion_asana", para: "hetalion_shoebil", tipo: "tolerância impaciente", rotulo: "respeita a importância da Azul, mas não tem paciência com Shoebil — \"funcionária do mês em modo eterno\"" },
    { de: "hetalion_asana", para: "hetalion_jingen", tipo: "desconfiança", rotulo: "não entende nem confia — considera Jingen perigoso, instável e teatral demais" },
    { de: "hetalion_asana", para: "hetalion_hoshon", tipo: "distanciamento", rotulo: "evita contato sempre que possível; não se dá bem com a influência religiosa da Branca" },
    { de: "hetalion_jingen", para: "hetalion_shoebil", tipo: "desprezo", rotulo: "desprezo absoluto — vê Shoebil como \"um cão obediente da Prime\", sem autonomia ou pensamento crítico" },
    { de: "hetalion_jingen", para: "hetalion_asana", tipo: "respeito tático", rotulo: "reconhece a importância militar da Vermelha, trabalha com eles por necessidade, mas sem afeto" },
    { de: "hetalion_jingen", para: "hetalion_hoshon", tipo: "desinteresse", rotulo: "acha os religiosos da Branca pretensiosos e inúteis em campo de batalha" },
    { de: "hetalion_shoebil", para: "hetalion_asana", tipo: "parceria", rotulo: "boa relação — trabalham juntas em prisões de base histórica" },
    { de: "hetalion_shoebil", para: "hetalion_jingen", tipo: "tensão", rotulo: "tensa, por conta de operações da Negra na linha da ilegalidade" },
    { de: "hetalion_shoebil", para: "hetalion_hoshon", tipo: "indiferença", rotulo: "indiferente, a menos que algum processo burocrático a envolva" },
    { de: "hetalion_yurity", para: "hetalion_crikon", tipo: "aliança", rotulo: "o mais perto de amigo que ela consegue admitir — parceiro no plano de levar Seguintes ao poder" },
    { de: "hetalion_valefor", para: "hetalion_yurity", tipo: "colegas de Grupo A", rotulo: "sabe do plano secreto dela com Crikon; ainda não decidiu o que pensar, mas quer ver aonde vai" },
    { de: "hetalion_valefor", para: "hetalion_crikon", tipo: "aliança cautelosa", rotulo: "sabe do plano secreto dos dois; avalia por conta própria, pela primeira vez na vida" },
    { de: "hetalion_valefor", para: "hetalion_hoshon", tipo: "distanciamento", rotulo: "via Hoshon como seu superior e como tudo que precisava ser; hoje se afasta dessa visão" },
    { de: "hetalion_yurity", para: "hetalion_asana", tipo: "relação indefinida", rotulo: "Asana é General da Vermelha hoje; a relação com Yurity (filha da general anterior) ainda não foi definida — ver notas do mestre" },
  ],
  genealogias: [],
};

// Sementes de "pessoas do reino" (ver reporPessoasDoReino em pessoasReino.js)
// — Suth, Goethia e Hetalion por agora; outro reino que ganhar esse formato
// entra aqui.
const SEMENTES_PESSOAS_REINO = [
  { reinoId: "suth", pessoas: DADOS_PESSOAS_SUTH },
  { reinoId: "goethia", pessoas: DADOS_PESSOAS_GOETHIA },
  { reinoId: "hetalion", pessoas: DADOS_PESSOAS_HETALION },
];

// Aplicado aqui (e não só na reposição do useEffect de carregamento) pelo
// mesmo motivo do Grupo Aurora/Suth em SEED_CHARACTERS: num app sem nada
// salvo ainda, `kingdoms` nasce direto de SEED_KINGDOMS (useState inicial) —
// sem isso, a aba "Pessoas" só apareceria depois de já existir um
// point-kingdoms salvo. reporPessoasDoReino é idempotente, então chamar aqui
// não duplica nada quando a reposição do useEffect rodar de novo depois.
export const SEED_KINGDOMS = reporPessoasDoReino(SEED_KINGDOMS_RAW, SEMENTES_PESSOAS_REINO);

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

// Conceito de GRUPO (mesa): cada personagem pertence a uma campanha. "c" é o
// Grupo C (a campanha principal), "aurora" é o Sidepoint, "suth" é a mesa do
// Império de Suth, "goethia" é a mesa do reino de Goethia, "hetalion" é a
// mesa da república federativa de Hetalion.
const GRUPOS = [
  { id: "c", label: "Grupo C", subtitulo: "Cavaleiros de Omem · campanha principal", cor: BRASS },
  { id: "aurora", label: "Grupo Aurora", subtitulo: "Mercenários de Beltezu · mesa Sidepoint", cor: "#B5654A" },
  { id: "suth", label: "Grupo Suth", subtitulo: "Três Pilares do Império de Suth", cor: EMBER },
  { id: "goethia", label: "Grupo Goethia", subtitulo: "Tzar, Irmandades e generais de Goethia", cor: FACTION_SEAL["Goethia"] },
  { id: "hetalion", label: "Grupo Hetalion", subtitulo: "Generais e Executores das Quatro Federações", cor: FACTION_SEAL["Hetalion"] },
];

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
  affiliation: "", height: "", deity: "", weapon: "", traits: "", xp: 0, imageUrl: "", imagemPos: { y: 50, zoom: 1 },
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
  racialAbility: { name: "", description: "" },
  classes: [{ name: "", description: "" }, { name: "", description: "" }],
  grupo: "c",
  atributosGerais: { ...ATRIBUTOS_GERAIS_DEFAULT },
  proficiencias: { ...PROFICIENCIAS_DEFAULT },
  hp: { current: 3, max: 3 }, mp: { current: 3, max: 3 }, sp: { current: 3, max: 3 },
  history: "",
});

/* ---------------------------------------------------------------
   PEQUENOS COMPONENTES DE APOIO
----------------------------------------------------------------*/
// Retrato de personagem — componente único usado em todo lugar que desenha
// `character.imageUrl` (ficha aberta, cards da lista, Confronto, vitrine da
// capa), pra o enquadramento (`imagemPos: { y, zoom }`, ver withFichaDefaults)
// se comportar igual em todos eles. `y` (0 a 100) move objectPosition
// verticalmente; `zoom` > 1 amplia a imagem com transform scale, ancorado no
// mesmo ponto vertical — o contêiner precisa de overflow:hidden pra isso não
// vazar por fora da moldura. Sem imageUrl, ou se a imagem falhar ao carregar
// (onError), cai pro ícone de escudo com a cor da facção — nunca tela branca.
export function Retrato({ character, size, iconSize, borderRadius = 8, style, iconColor }) {
  const [erro, setErro] = useState(false);
  const imageUrl = character?.imageUrl;
  // Reseta o erro ao trocar de personagem/URL (ex: navegar pra ficha
  // adjacente) — sem isso, uma imagem quebrada anterior "contaminaria" a
  // próxima ficha mesmo com imageUrl válida, porque o componente não remonta.
  useEffect(() => { setErro(false); }, [imageUrl]);
  const mostrarImagem = !!imageUrl && !erro;
  const y = character?.imagemPos?.y ?? 50;
  const zoom = character?.imagemPos?.zoom ?? 1;
  const tamanho = size ? { width: size, height: size } : { width: "100%", height: "100%" };
  return (
    <div
      style={{
        ...tamanho, borderRadius, overflow: "hidden", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "#00000030", ...style,
      }}
    >
      {mostrarImagem ? (
        <img
          src={imageUrl}
          alt={character?.name || ""}
          onError={() => setErro(true)}
          style={{
            width: "100%", height: "100%", objectFit: "cover",
            objectPosition: `50% ${y}%`,
            transform: zoom > 1 ? `scale(${zoom})` : undefined,
            transformOrigin: `50% ${y}%`,
          }}
        />
      ) : (
        <ShieldHalf size={iconSize || (size ? Math.round(size * 0.55) : 24)} color={iconColor || FACTION_SEAL[character?.faction] || BRASS} />
      )}
    </div>
  );
}

// Dialog de confirmação genérico — por padrão é o de exclusão (ícone/cor de
// perigo, botão "Excluir"), mas aceita title/confirmLabel/icon/tone pra outras
// ações destrutivas ou importantes (ex: importar um backup, que substitui tudo).
function ConfirmDialog({ message, onConfirm, onCancel, title = "Confirmar exclusão", confirmLabel = "Excluir", icon: Icon = Trash2, tone = EMBER }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "#00000090", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20,
    }}>
      <div style={{
        background: PANEL_2, border: `1px solid ${tone}`, borderRadius: 8, padding: 22,
        maxWidth: 340, boxShadow: `0 0 30px #00000080`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Icon size={16} color={tone} />
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 13, letterSpacing: 1, color: tone, textTransform: "uppercase" }}>{title}</span>
        </div>
        <p style={{ fontSize: 13, color: PARCHMENT, lineHeight: 1.5, margin: "0 0 18px" }}>{message}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
          <Btn onClick={onConfirm} style={{ background: tone, color: PARCHMENT, border: "none", fontWeight: 700 }}>
            <Icon size={13} /> {confirmLabel}
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

function Btn({ children, onClick, variant = "default", style, href, ...props }) {
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
  // Com `href`, vira um link com a mesma cara de botão (ex: abrir guia em nova aba).
  if (href) {
    return (
      <a href={href} onClick={onClick} style={{ ...base, textDecoration: "none", ...variants[variant], ...style }} {...props}>
        {children}
      </a>
    );
  }
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
  const caixa = { background: "#00000030", border: `1px solid ${LINE}`, borderRadius: 6, padding: "8px 10px", textAlign: "center" };
  const rotulo = { fontSize: 9.5, color: MUTED, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.5, textTransform: "uppercase" };
  const numero = { fontFamily: "'Cinzel', serif", fontSize: 20, color: BRASS_BRIGHT, fontWeight: 700 };
  const detalhe = { fontSize: 9, color: MUTED, fontFamily: "'IBM Plex Mono', monospace" };
  const sinal = (n) => (n >= 0 ? `+${n}` : `${n}`);

  return (
    <div>
      <div style={{ fontSize: 10, color: BRASS, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>Acerto (por tipo de ataque)</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
        {ACERTOS_POR_TIPO.map((e) => {
          const { total, doAtributo, daProficiencia } = computeAcertoTipo(character, e);
          const grauAttr = e.attr ? getAttrGrade(character, e.attr) || "E" : null;
          const grauProf = character?.proficiencias?.[e.prof] || "E";
          const nomeProf = PROFICIENCIAS_LIST.find((p) => p.key === e.prof)?.label || e.prof;
          return (
            <div key={e.key} style={caixa}>
              <div style={rotulo}>{e.label}</div>
              <div style={numero}>{sinal(total)}</div>
              <div style={detalhe}>
                {e.attr
                  ? `Destreza ${grauAttr} ${sinal(doAtributo)} · ${nomeProf} ${grauProf} ${sinal(daProficiencia)}`
                  : `${nomeProf} ${grauProf} ${sinal(daProficiencia)} · sem atributo`}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 10, color: BRASS, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>Defesa e Resistências</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {STAT_LIST.map((st) => {
          const usaGrau = STAT_USA_GRAU_CHEIO.has(st.key);
          const profKey = STAT_PROF_LINK[st.key];
          const nomeProf = profKey ? PROFICIENCIAS_LIST.find((p) => p.key === profKey)?.label : null;
          return (
            <div key={st.key} style={caixa}>
              <div style={rotulo}>{st.label}</div>
              <div style={numero}>{computeStat(character, st.key)}</div>
              {usaGrau && (
                <div style={detalhe}>
                  2 + Vigor {character?.atributosGerais?.vigor || "E"} + {nomeProf} {character?.proficiencias?.[profKey] || "E"}
                </div>
              )}
            </div>
          );
        })}
      </div>
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

// Caixa genérica usada nas duas tabelas de 3 colunas da ficha (Raça/Classes e
// Habilidades Passivas de Combate) — mostra vazio/preenchido de forma consistente.
function SlotBox({ etiqueta, cor, titulo, subtitulo, corpo, vazio, onClick, acao }) {
  const clicavel = !!onClick;
  return (
    <div
      onClick={onClick}
      style={{
        background: vazio ? "#00000012" : `${cor}12`,
        border: `1px solid ${vazio ? LINE : `${cor}88`}`,
        borderRadius: 8, padding: 12, minHeight: 104,
        cursor: clicavel ? "pointer" : "default",
        display: "flex", flexDirection: "column", gap: 4,
        transition: "border-color .15s",
      }}
      title={clicavel ? (vazio ? "Clique pra escolher uma habilidade" : "Clique pra trocar ou remover") : undefined}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
        <span style={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.8, textTransform: "uppercase", color: vazio ? MUTED : cor }}>
          {etiqueta}
        </span>
        {acao}
      </div>
      {vazio ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: 11.5, fontStyle: "italic", textAlign: "center", lineHeight: 1.4 }}>
          {corpo}
        </div>
      ) : (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: PARCHMENT, lineHeight: 1.25 }}>{titulo}</div>
          {subtitulo && <div style={{ fontSize: 9.5, fontFamily: "'IBM Plex Mono', monospace", color: cor }}>{subtitulo}</div>}
          <div style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.45 }}>{corpo}</div>
        </>
      )}
    </div>
  );
}

// Modal que abre ao clicar num espaço de habilidade da ficha. Lista as mesmas
// habilidades já criadas (PROC_ABILITIES), agrupadas por categoria e com filtro,
// desabilitando as que já estão em outro espaço.
function ProcSlotPicker({ character, slotIndex, onPick, onClear, onClose }) {
  const [filtro, setFiltro] = useState("todas");
  const procs = character.procs || [];
  const atual = procs[slotIndex];
  const visiveis = PROC_ABILITIES_AGRUPADAS.filter((p) => filtro === "todas" || categoriaDaHabilidade(p) === filtro);

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "#00000090", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: PANEL_2, border: `1px solid ${PURPLE}`, borderRadius: 10, width: "min(860px, 100%)", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 0 40px #00000090" }}
      >
        <div style={{ padding: "16px 20px 10px", borderBottom: `1px solid ${LINE}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 14, letterSpacing: 1, color: BRASS_BRIGHT, textTransform: "uppercase" }}>
              Espaço de habilidade {slotIndex + 1}
            </span>
            <Btn variant="ghost" onClick={onClose}>Fechar</Btn>
          </div>
          <p style={{ fontSize: 11, color: MUTED, margin: "6px 0 10px" }}>
            {character.name} · {procs.filter(Boolean).length} de {MAX_PROCS} espaços preenchidos. A Singularidade não ocupa espaço.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {["todas", ...CATEGORIA_ORDEM].map((catKey) => {
              const info = catKey === "todas" ? { label: "Todas", color: BRASS } : HABILIDADE_CATEGORIA_INFO[catKey];
              const ativo = filtro === catKey;
              return (
                <button
                  key={catKey}
                  onClick={() => setFiltro(catKey)}
                  style={{
                    background: ativo ? `${info.color}25` : "transparent", border: `1px solid ${ativo ? info.color : LINE}`,
                    color: ativo ? info.color : MUTED, borderRadius: 20, padding: "4px 12px", fontSize: 11, cursor: "pointer",
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >{info.label}</button>
              );
            })}
          </div>
        </div>

        <div style={{ overflowY: "auto", padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {visiveis.map((p) => {
              const emOutroSlot = procs.some((id, i) => id === p.id && i !== slotIndex);
              const selecionada = atual === p.id;
              const cor = HABILIDADE_CATEGORIA_INFO[categoriaDaHabilidade(p)].color;
              const limiar = limiarDaHabilidade(character, p);
              const attrLabel = attrLabelDaHabilidade(p);
              return (
                <div
                  key={p.id}
                  onClick={() => { if (!emOutroSlot) onPick(p.id); }}
                  style={{
                    padding: 11, borderRadius: 8, cursor: emOutroSlot ? "not-allowed" : "pointer", opacity: emOutroSlot ? 0.4 : 1,
                    background: selecionada ? `${cor}20` : "#00000012", border: `1px solid ${selecionada ? cor : LINE}`,
                  }}
                  title={emOutroSlot ? "Já está em outro espaço desta ficha" : undefined}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: PARCHMENT }}>{p.nome}</span>
                    <span style={{ fontSize: 9.5, fontFamily: "'IBM Plex Mono', monospace" }}><HabilidadeCategoriaBadge p={p} /></span>
                  </div>
                  <div style={{ fontSize: 10, color: PURPLE, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 3 }}>
                    {p.reduzCriticoEm
                      ? `Reduz o crítico em ${p.reduzCriticoEm}`
                      : p.gatilho?.startsWith("passivo_")
                      ? "Sempre ativa"
                      : p.gatilho === "contato_proprio"
                      ? "Dispara ao fazer contato"
                      : `Dispara com dado ≥${limiar} (${attrLabel})`}
                    {p.restricaoTipo ? ` · só ${TIPOS_ATAQUE[p.restricaoTipo]?.label}` : ""}
                  </div>
                  <div style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.45 }}>{p.efeito}</div>
                </div>
              );
            })}
          </div>
        </div>

        {atual && (
          <div style={{ padding: "10px 20px 16px", borderTop: `1px solid ${LINE}` }}>
            <Btn variant="danger" onClick={onClear}><Trash2 size={13} /> Esvaziar este espaço</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

// Exportado (além do default App) só pra teste de render — ver
// characterForm.render.test.js. `initialTestPanelMode` também é um seam de
// teste: a prop nunca é passada pelo App de verdade.
export function CharacterSheet({ character, onBack, onEdit, onRequestDelete, onRestoreAttacks, onPrev, onNext, onUpdateCharacter, initialTestPanelMode = "teste" }) {
  const [rollAttr, setRollAttr] = useState(ATRIBUTOS_GERAIS_LIST[0].key);
  const [rollProf, setRollProf] = useState(PROFICIENCIAS_LIST[0].key);
  const [successThreshold, setSuccessThreshold] = useState(5);
  const [ascensaoDiff, setAscensaoDiff] = useState(0);
  const [history, setHistory] = useState([]);
  const [rolling, setRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState(null);
  // Painel "Teste — Atributo + Perícia / Ataque": dois modos escolhidos por um
  // seletor no topo. `initialTestPanelMode` só existe pra teste de render (o
  // app de verdade nunca passa essa prop — o modo real sempre começa em
  // "teste", preservando o comportamento de antes da feature).
  const [rollPanelMode, setRollPanelMode] = useState(initialTestPanelMode);
  const [ataqueIdx, setAtaqueIdx] = useState(0);
  const [ataqueDefesa, setAtaqueDefesa] = useState(8);
  const [ataqueUsaArmadura, setAtaqueUsaArmadura] = useState(true);
  const [ataqueResistArmadura, setAtaqueResistArmadura] = useState(8);
  const [ataqueResistNatural, setAtaqueResistNatural] = useState(4);
  const [ataqueResult, setAtaqueResult] = useState(null);
  const [ataqueHistory, setAtaqueHistory] = useState([]);
  // Índice do espaço de habilidade aberto na tabela de 3 caixas (null = fechado).
  const [slotAberto, setSlotAberto] = useState(null);
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

  // Modo Ataque do mesmo painel: ataques do próprio personagem (com fallback
  // genérico, igual o Confronto) contra um alvo sintético definido na mão.
  const ataqueOptions = character.attacks && character.attacks.length > 0
    ? character.attacks
    : [{ nome: "(ataque genérico)", tipo: "marcial", acerto: 0, dano: "0", ferida: "S" }];
  const ataqueSelecionado = ataqueOptions[ataqueIdx] || ataqueOptions[0];
  const ataqueTipoInfo = TIPOS_ATAQUE[ataqueSelecionado.tipo] || TIPOS_ATAQUE.marcial;
  const ataqueResistLabel = ataqueTipoInfo.resistKey === "resistNaturalMagica" ? "Resistência Natural Mágica" : "Resistência Natural Física";

  function rollAtaque() {
    const r = resolveFichaAtaque({
      character,
      attack: ataqueSelecionado,
      targetDefesa: ataqueDefesa,
      targetResistNatural: ataqueResistNatural,
      targetResistArmadura: ataqueResistArmadura,
      targetUsaArmadura: ataqueUsaArmadura,
    });
    setAtaqueResult(r);
    setAtaqueHistory((h) => [{ ...r, atkNome: ataqueSelecionado.nome, id: Date.now() }, ...h].slice(0, 6));
  }

  // Grava a habilidade escolhida num dos espaços da tabela. A lista `procs`
  // fica densa (sem buracos): esvaziar um espaço puxa os seguintes pra trás.
  function setProcNoSlot(indice, procId) {
    if (!onUpdateCharacter) return;
    const atuais = (character.procs || []).filter(Boolean).slice(0, MAX_PROCS);
    let novos;
    if (procId === null) {
      novos = atuais.filter((_, i) => i !== indice);
    } else if (indice < atuais.length) {
      novos = atuais.map((id, i) => (i === indice ? procId : id));
    } else {
      novos = [...atuais, procId];
    }
    novos = novos.filter((id, i) => novos.indexOf(id) === i).slice(0, MAX_PROCS);
    onUpdateCharacter(character.id, { procs: novos });
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
          {onEdit && (
            <button onClick={() => onEdit(character)} title="Editar" style={{ background: "transparent", border: "none", cursor: "pointer", color: PURPLE_TEXT, display: "flex" }}>
              <Pencil size={16} />
            </button>
          )}
          {onRequestDelete && (
            <button onClick={() => onRequestDelete(character)} title="Excluir" style={{ background: "transparent", border: "none", cursor: "pointer", color: "#E8A090", display: "flex" }}>
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,0.85fr) minmax(0,1fr) minmax(0,1fr)", gap: 16 }}>
        {/* Coluna 1: retrato + informações pessoais + recursos + atributos */}
        <div>
          <div style={panelStyle}>
            <div style={{ width: "100%", aspectRatio: "1", marginBottom: 10 }}>
              <Retrato character={character} borderRadius={8} iconSize={40} style={{ border: `1px solid ${LINE}` }} />
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
              Acerto usa o atributo do Tipo (Destreza p/ Marcial e Arma de fogo, só o valor da magia p/ Mágico) + a Proficiência de Combate do ataque (Combate Corpo a Corpo/Armas de Fogo/Magias Ofensivas). Dano usa Força (Marcial), Magia (Mágico) ou só o valor da arma (Arma de fogo) + a mesma Proficiência. Ferida escala com confirmações no Marcial; é fixa nos outros. Use o Confronto pra resolver contra um alvo.
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
              Acerto não é estatística da ficha: cada tipo de ataque monta o seu com o atributo do Tipo + a Proficiência de Combate, e a arma soma o bônus dela por cima. Defesa = base + Proficiência de Defesa. As duas Resistências Naturais seguem 2 + Vigor + Resistência (Física ou Mágica), contando o grau cheio (E=1 … A=5) — com tudo em E dá 4. Resistência Armadura é um valor manual da ficha.
            </div>
          </div>
        </div>

        {/* Coluna 3: habilidades antigas + história + teste.
            A Singularidade e as duas tabelas de 3 caixas (Raça/Classes e
            Habilidades) ficam logo abaixo, em largura total, acima dos atributos. */}
        <div>
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

            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              <button
                onClick={() => setRollPanelMode("teste")}
                style={{
                  flex: 1, padding: "6px 10px", borderRadius: 20, cursor: "pointer", fontSize: 11.5, fontFamily: "'IBM Plex Mono', monospace",
                  border: `1px solid ${PURPLE}`, background: rollPanelMode === "teste" ? PURPLE : "transparent", color: rollPanelMode === "teste" ? "#fff" : PURPLE,
                  fontWeight: rollPanelMode === "teste" ? 700 : 400,
                }}
              >Teste</button>
              <button
                onClick={() => setRollPanelMode("ataque")}
                style={{
                  flex: 1, padding: "6px 10px", borderRadius: 20, cursor: "pointer", fontSize: 11.5, fontFamily: "'IBM Plex Mono', monospace",
                  border: `1px solid ${PURPLE}`, background: rollPanelMode === "ataque" ? PURPLE : "transparent", color: rollPanelMode === "ataque" ? "#fff" : PURPLE,
                  fontWeight: rollPanelMode === "ataque" ? 700 : 400,
                }}
              >Ataque</button>
            </div>

            {rollPanelMode === "teste" && (
              <>
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
                            {onUpdateCharacter && (
                              <>
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
                              </>
                            )}
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
              </>
            )}

            {rollPanelMode === "ataque" && (
              <>
                <Field label="Ataque">
                  <select value={ataqueIdx} onChange={(e) => { setAtaqueIdx(Number(e.target.value)); setAtaqueResult(null); }} style={inputStyle}>
                    {ataqueOptions.map((atk, i) => <option key={i} value={i}>{atk.nome} ({TIPOS_ATAQUE[atk.tipo]?.label || "Marcial"})</option>)}
                  </select>
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Field label="Defesa do alvo">
                    <input type="number" style={inputStyle} value={ataqueDefesa} onChange={(e) => setAtaqueDefesa(Number(e.target.value) || 0)} />
                  </Field>
                  <Field label={ataqueResistLabel}>
                    <input type="number" style={inputStyle} value={ataqueResistNatural} onChange={(e) => setAtaqueResistNatural(Number(e.target.value) || 0)} />
                  </Field>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, margin: "2px 0 10px", fontSize: 12, color: PARCHMENT }}>
                  <input type="checkbox" checked={ataqueUsaArmadura} onChange={(e) => setAtaqueUsaArmadura(e.target.checked)} />
                  O alvo usa armadura
                </label>
                <Field label="Resistência Armadura">
                  <input
                    type="number" style={inputStyle} value={ataqueResistArmadura} disabled={!ataqueUsaArmadura}
                    onChange={(e) => setAtaqueResistArmadura(Number(e.target.value) || 0)}
                  />
                </Field>
                <div style={{ fontSize: 10, color: MUTED, margin: "-2px 0 10px", fontStyle: "italic" }}>
                  Padrões (Defesa 8, Armadura 8, Natural 4): alvo com tudo em grau E, referência do balanceamento. Sem armadura, as confirmações vão direto pra {ataqueResistLabel}.
                </div>

                <Btn variant="primary" onClick={rollAtaque} style={{ width: "100%", justifyContent: "center", padding: "10px 16px", fontSize: 13.5 }}>
                  <Swords size={15} /> Rolar ataque
                </Btn>

                <div style={{ marginTop: 14 }}>
                  <AttackResultPanel result={ataqueResult} emptyMessage="Escolha um ataque e role pra ver o resultado aqui." />
                </div>

                {ataqueHistory.length > 0 && (
                  <div style={{ marginTop: 16, borderTop: `1px solid ${LINE}`, paddingTop: 10 }}>
                    <div style={{ fontSize: 10, color: MUTED, marginBottom: 6, fontFamily: "'IBM Plex Mono', monospace" }}>HISTÓRICO</div>
                    {ataqueHistory.map((h) => (
                      <div key={h.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: MUTED, padding: "3px 0", fontFamily: "'IBM Plex Mono', monospace" }}>
                        <span>{h.atkNome}</span>
                        <span style={{ color: BRASS }}>{h.causaDano ? `Ferida ${h.feridaValor}` : h.contato ? "Contato" : "Falhou"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* SINGULARIDADE — acima das duas tabelas, em largura total. Não ocupa
          espaço de habilidade: tem lugar próprio na ficha. */}
      <div style={{ ...panelStyle, borderColor: `${BRASS}66` }}>
        <div style={panelHeadStyle}>Singularidade</div>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <Seal grade={character.singularity?.level?.split(" ")[0]?.replace(/[^A-Za-z]/g, "") || "E"} size={38} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, color: BRASS_BRIGHT, fontSize: 16 }}>{character.singularity?.name || "—"}</span>
              <span style={{ fontSize: 11, color: tierColor(character.singularity?.level), fontFamily: "'IBM Plex Mono', monospace" }}>{character.singularity?.level}</span>
            </div>
            <p style={{ fontSize: 12.5, color: MUTED, margin: "5px 0 0", lineHeight: 1.55 }}>{character.singularity?.description || "—"}</p>
          </div>
        </div>
      </div>

      {/* TABELA 1 — Habilidade de Raça + as duas Classes. Ainda vão ser criadas
          no sistema; por enquanto as caixas guardam nome + descrição livres. */}
      <div style={panelStyle}>
        <div style={panelHeadStyle}>Raça e Classes</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <SlotBox
            etiqueta="Habilidade de Raça"
            cor={BRASS}
            vazio={!character.racialAbility?.name}
            titulo={character.racialAbility?.name}
            subtitulo={character.race || null}
            corpo={character.racialAbility?.name
              ? (character.racialAbility.description || "Sem descrição.")
              : `Ainda não definida${character.race ? ` (raça: ${character.race})` : ""} — a criar.`}
          />
          {[0, 1].map((i) => (
            <SlotBox
              key={i}
              etiqueta={`Classe ${i + 1}`}
              cor={PURPLE}
              vazio={!character.classes?.[i]?.name}
              titulo={character.classes?.[i]?.name}
              corpo={character.classes?.[i]?.name
                ? (character.classes[i].description || "Sem descrição.")
                : "Ainda não definida — a criar."}
            />
          ))}
        </div>
      </div>

      {/* TABELA 2 — os 3 espaços de Habilidade Passiva de Combate. Clicar numa
          caixa abre o seletor com as habilidades já criadas (PROC_ABILITIES). */}
      <div style={panelStyle}>
        <div style={panelHeadStyle}>Habilidades Passivas de Combate</div>
        <p style={{ fontSize: 10.5, color: MUTED, marginTop: -4, marginBottom: 10 }}>
          {MAX_PROCS} espaços. Clique numa caixa pra escolher, trocar ou esvaziar. A maioria dispara sozinha quando um dado já rolado bate o limiar — sem rolagem extra.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {Array.from({ length: MAX_PROCS }).map((_, i) => {
            const procId = (character.procs || [])[i];
            const p = procId ? PROC_ABILITIES.find((x) => x.id === procId) : null;
            const cor = p ? HABILIDADE_CATEGORIA_INFO[categoriaDaHabilidade(p)].color : PURPLE;
            const limiar = p ? limiarDaHabilidade(character, p) : null;
            return (
              <SlotBox
                key={i}
                etiqueta={p ? HABILIDADE_CATEGORIA_INFO[categoriaDaHabilidade(p)].label : `Espaço ${i + 1}`}
                cor={cor}
                vazio={!p}
                titulo={p?.nome}
                subtitulo={p
                  ? (p.reduzCriticoEm
                    ? `Reduz o crítico em ${p.reduzCriticoEm}`
                    : p.gatilho?.startsWith("passivo_")
                    ? "Sempre ativa"
                    : p.gatilho === "contato_proprio"
                    ? "Dispara ao fazer contato"
                    : `Dado ≥${limiar} (${attrLabelDaHabilidade(p)})`) + (p.restricaoTipo ? ` · só ${TIPOS_ATAQUE[p.restricaoTipo]?.label}` : "")
                  : null}
                corpo={p ? p.efeito : (onUpdateCharacter ? "Vazio — clique pra escolher." : "Vazio.")}
                onClick={onUpdateCharacter ? () => setSlotAberto(i) : undefined}
              />
            );
          })}
        </div>
      </div>

      {slotAberto !== null && onUpdateCharacter && (
        <ProcSlotPicker
          character={character}
          slotIndex={slotAberto}
          onPick={(procId) => { setProcNoSlot(slotAberto, procId); setSlotAberto(null); }}
          onClear={() => { setProcNoSlot(slotAberto, null); setSlotAberto(null); }}
          onClose={() => setSlotAberto(null)}
        />
      )}

      <div style={panelStyle}>
        <div style={panelHeadStyle}>Atributos Gerais e Proficiências (estilo Vampiro: A Máscara)</div>
        <p style={{ fontSize: 10.5, color: MUTED, marginTop: -4, marginBottom: 12 }}>
          Força e Destreza migraram pra cá (saíram dos Atributos de Combate). Vigor determina o HP máximo (2 + bônus de Vigor). Os demais — Carisma, Manipulação, Compostura, Inteligência, Perspicácia, Resolução — não têm função de combate: servem pra testes interpretativos fora de combate. As Proficiências de Combate já entram nos cálculos de Acerto/Dano/Defesa/Resistência; as outras 22 são só de referência.
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

export function CharacterForm({ initial, onSave, onCancel }) {
  // Garante a estrutura de Raça/Classes mesmo em fichas salvas antes dela existir.
  const [c, setC] = useState(() => ({
    ...initial,
    grupo: initial.grupo || grupoDoPersonagem(initial),
    racialAbility: initial.racialAbility || { name: "", description: "" },
    classes: [0, 1].map((i) => (Array.isArray(initial.classes) ? initial.classes[i] : null) || { name: "", description: "" }),
  }));
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  async function handlePickImage(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite escolher o mesmo arquivo de novo depois, se precisar
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const url = await uploadPortrait(file, c.id);
      set(["imageUrl"], url);
    } catch (err) {
      setUploadError(err.message || "Falha ao enviar a imagem.");
    } finally {
      setUploading(false);
    }
  }
  function handleRemoveImage() {
    removePortrait(c.imageUrl); // best-effort, não bloqueia a UI
    set(["imageUrl"], "");
  }

  function set(path, value) {
    setC((prev) => {
      // Clona preservando o tipo: array continua array (senão `classes` viraria
      // um objeto {0:…,1:…} e quebraria o .map da ficha).
      const clone = (v) => (Array.isArray(v) ? [...v] : { ...(v || {}) });
      const next = clone(prev);
      let cur = next;
      for (let i = 0; i < path.length - 1; i++) {
        cur[path[i]] = clone(cur[path[i]]);
        cur = cur[path[i]];
      }
      cur[path[path.length - 1]] = value;
      return next;
    });
  }

  function addAbility() {
    setC((prev) => ({ ...prev, abilities: [...(prev.abilities || []), { name: "", grade: "E", description: "" }] }));
  }
  function updateAbility(i, key, value) {
    setC((prev) => {
      const abilities = [...(prev.abilities || [])];
      abilities[i] = { ...abilities[i], [key]: value };
      return { ...prev, abilities };
    });
  }
  function removeAbility(i) {
    setC((prev) => ({ ...prev, abilities: (prev.abilities || []).filter((_, idx) => idx !== i) }));
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
        <Field label="Grupo (mesa)">
          <select style={inputStyle} value={c.grupo || grupoDoPersonagem(c)} onChange={(e) => set(["grupo"], e.target.value)}>
            {GRUPOS.map((g) => <option key={g.id} value={g.id}>{g.label} — {g.subtitulo}</option>)}
          </select>
        </Field>
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
        <Field label="Imagem (URL, ou envie um arquivo abaixo)">
          <input style={inputStyle} placeholder="https://..." value={c.imageUrl || ""} onChange={(e) => set(["imageUrl"], e.target.value)} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePickImage} />
            <Btn type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload size={13} /> {uploading ? "Enviando..." : "Enviar imagem do computador"}
            </Btn>
            {c.imageUrl && (
              <Btn type="button" variant="ghost" onClick={handleRemoveImage}><X size={13} /> Remover</Btn>
            )}
          </div>
          {uploadError && <p style={{ color: EMBER, fontSize: 11.5, margin: "6px 0 0" }}>{uploadError}</p>}
        </Field>
      </div>

      {c.imageUrl && (() => {
        const rotuloCampo = { fontSize: 9.5, color: MUTED, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4, marginTop: 10 };
        return (
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start", marginTop: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ ...rotuloCampo, marginTop: 0 }}>Altura do recorte</div>
              <input
                type="range" min={0} max={100} value={c.imagemPos?.y ?? 50}
                onChange={(e) => set(["imagemPos", "y"], Number(e.target.value))}
                style={{ width: 180 }}
              />
              <div style={rotuloCampo}>Zoom</div>
              <input
                type="range" min={1} max={3} step={0.1} value={c.imagemPos?.zoom ?? 1}
                onChange={(e) => set(["imagemPos", "zoom"], Number(e.target.value))}
                style={{ width: 180 }}
              />
              <div>
                <Btn type="button" variant="ghost" onClick={() => set(["imagemPos"], { y: 50, zoom: 1 })} style={{ marginTop: 6 }}>
                  Centralizar
                </Btn>
              </div>
            </div>
            <div>
              <div style={{ ...rotuloCampo, marginTop: 0 }}>Prévia (ficha)</div>
              <div style={{ width: 90, aspectRatio: "1" }}>
                <Retrato character={c} borderRadius={8} style={{ border: `1px solid ${LINE}` }} />
              </div>
            </div>
            <div>
              <div style={{ ...rotuloCampo, marginTop: 0 }}>Prévia (card da lista)</div>
              <Retrato character={c} size={40} borderRadius={8} />
            </div>
          </div>
        );
      })()}

      <SectionTitle icon={Sparkles}>Singularidade</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Nome"><input style={inputStyle} value={c.singularity.name} onChange={(e) => set(["singularity", "name"], e.target.value)} /></Field>
        <Field label="Nível (ex: E, C, A, S, EX, Divino)"><input style={inputStyle} value={c.singularity.level} onChange={(e) => set(["singularity", "level"], e.target.value)} /></Field>
      </div>
      <Field label="Descrição">
        <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={c.singularity.description} onChange={(e) => set(["singularity", "description"], e.target.value)} />
      </Field>

      <SectionTitle icon={ShieldHalf}>Raça e Classes</SectionTitle>
      <p style={{ fontSize: 11, color: MUTED, marginTop: -6, marginBottom: 10 }}>
        Aparecem na primeira tabela de 3 caixas da ficha, logo abaixo da Singularidade. O sistema de raças e classes ainda vai ser criado — por enquanto são campos livres.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
        <div>
          <Field label="Habilidade de Raça — nome">
            <input style={inputStyle} value={c.racialAbility?.name || ""} onChange={(e) => set(["racialAbility", "name"], e.target.value)} />
          </Field>
          <Field label="Descrição">
            <textarea style={{ ...inputStyle, minHeight: 56, resize: "vertical" }} value={c.racialAbility?.description || ""} onChange={(e) => set(["racialAbility", "description"], e.target.value)} />
          </Field>
        </div>
        {[0, 1].map((i) => (
          <div key={i}>
            <Field label={`Classe ${i + 1} — nome`}>
              <input style={inputStyle} value={c.classes?.[i]?.name || ""} onChange={(e) => set(["classes", i, "name"], e.target.value)} />
            </Field>
            <Field label="Descrição">
              <textarea style={{ ...inputStyle, minHeight: 56, resize: "vertical" }} value={c.classes?.[i]?.description || ""} onChange={(e) => set(["classes", i, "description"], e.target.value)} />
            </Field>
          </div>
        ))}
      </div>

      <SectionTitle icon={Swords}>Proficiências de Combate</SectionTitle>
      <p style={{ fontSize: 11, color: MUTED, marginTop: -6, marginBottom: 10 }}>
        Essas entram nos cálculos de combate (somando com o atributo correspondente) — Combate Corpo a Corpo/Armas de Fogo/Magias Ofensivas por tipo de ataque, e Defesa/Resistência Física/Resistência Mágica/Técnica reforçando a stat equivalente.
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
        Defesa = base + bônus da Proficiência de Defesa. Resistências Naturais = base 2 + Vigor + Resistência (Física/Mágica), contando o grau cheio (E=1 … A=5): com tudo em E dá 4. Resistência Armadura é manual (não tem proficiência ligada a ela). A estatística Acerto foi removida — o Acerto real é por tipo de ataque e aparece na ficha.
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
        Escolha até 3 — os mesmos 3 espaços da tabela da ficha. A Singularidade não ocupa espaço: ela tem lugar próprio, junto da Habilidade de Raça e das Classes.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        {PROC_ABILITIES_AGRUPADAS.map((p) => {
          const checked = (c.procs || []).includes(p.id);
          const limiar = limiarDaHabilidade(c, p);
          const attrLabel = attrLabelDaHabilidade(p);
          const atLimit = !checked && (c.procs || []).length >= MAX_PROCS;
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
                      const next = checked ? cur.filter((id) => id !== p.id) : [...cur, p.id].slice(0, MAX_PROCS);
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
      {(c.abilities || []).map((ab, i) => (
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

// Exibição de um resultado de resolveAttack(): dados de Acerto, Confirmação
// (com a camada que cada uma enfrentou), CHAMAS/IMPACTO/ENVENENAMENTO quando
// houver, e a ferida final. Usado pelo Confronto (DuelRoller, com re-rolagem
// via MP/SP) e pelo modo Ataque do painel de Teste da ficha (só leitura —
// omite modoGasto/onAcertoDieClick/onConfirmDieClick). Extraído daqui pra não
// existir uma segunda versão divergente desse display.
function AttackResultPanel({ result, modoGasto, onAcertoDieClick, onConfirmDieClick, emptyMessage = "Escolha um ataque à esquerda pra ver o resultado aqui." }) {
  return (
    <>
      {!result && (
        <div style={{ textAlign: "center", color: MUTED, fontSize: 12.5, padding: "20px 0" }}>
          {emptyMessage}
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
                        onClick={() => clicavel && onAcertoDieClick && onAcertoDieClick(i)}
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
                        onClick={() => clicavel && onConfirmDieClick && onConfirmDieClick(i)}
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
    </>
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

          {result && onUpdateCharacter && (
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

          <AttackResultPanel result={result} modoGasto={modoGasto} onAcertoDieClick={clicarDadoAcerto} onConfirmDieClick={clicarDadoConfirm} />
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

// Monta o defensor sintético do modo Ataque do painel "Teste — Atributo +
// Perícia / Ataque" da ficha (mesma peça que o Confronto usa pro oponente
// Editável — ver makeEditableOpponent) e resolve o ataque contra ele. Extraído
// como função pura (exportada só pra teste) pra poder verificar, sem precisar
// de interação de UI, que os números digitados viram exatamente o defensor
// que o motor recebe.
export function resolveFichaAtaque({ character, attack, targetDefesa, targetResistNatural, targetResistArmadura, targetUsaArmadura }) {
  const defender = makeEditableOpponent({
    defesa: targetDefesa,
    resistNatural: targetResistNatural,
    resistArmadura: targetResistArmadura,
    usaArmadura: targetUsaArmadura,
  });
  return resolveAttack({ attacker: character, defender, attack });
}

export function CompareView({ characters, onUpdateCharacter }) {
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
      const next = cur.includes(procId) ? cur.filter((id) => id !== procId) : [...cur, procId].slice(0, MAX_PROCS);
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
            {a && <Retrato character={a} size={44} borderRadius={8} iconSize={22} style={{ border: `1px solid ${LINE}` }} />}
            <select style={inputStyle} value={aId} onChange={(e) => setAId(e.target.value)}>
              {selectOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <Btn variant="ghost" onClick={() => { setAId(bId); setBId(aId); }} style={{ marginTop: 16 }} title="Trocar lados">⇄</Btn>
        <div>
          <div style={{ fontSize: 10.5, color: MUTED, marginBottom: 4, fontFamily: "'IBM Plex Mono', monospace" }}>DEFENSOR</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {b && <Retrato character={b} size={44} borderRadius={8} iconSize={22} style={{ border: `1px solid ${LINE}` }} />}
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
            Habilidades Passivas de Combate (até {MAX_PROCS})
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {PROC_ABILITIES_AGRUPADAS.map((p) => {
              const checked = (editableStats.procs || []).includes(p.id);
              const atLimit = !checked && (editableStats.procs || []).length >= MAX_PROCS;
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
                  <Retrato character={ch} size={40} borderRadius={8} iconSize={22} style={{ border: `1px solid ${LINE}` }} />
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
                  {(ch.abilities || []).slice(0, 4).map((ab, i) => (
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

// Conteúdo fixo por reino e por cidade (ver mundoDados.js). Reinos/cidades que
// não estão aqui continuam só com a descrição editável de sempre.
const REINO_INFO = { katalao: KATALAO_INFO };
// Exportado só pra teste de render — ver mapaMundo.test.js (confere que
// nenhuma cidade semente vira dossiê por engano, e que as confidencialidade
// do modo mestre/jogador não vaza).
export const CIDADE_INFO = { frontier: FRONTIER };
// Mapeia o botão do modal do mapa (CidadePaginaView) pra aba equivalente do
// dossiê completo (CidadeView) — "pessoas" (lightweight) ~ "personagens" (NPCs).
const ABA_MODAL_PARA_DOSSIE = { geral: "geral", distritos: "distritos", pessoas: "personagens" };
// `import.meta.env` só existe sob o Vite — o `?.` evita quebrar quando este
// arquivo é importado direto num teste (sem bundler), igual supabaseClient.js.

// Paleta das variáveis CSS usadas pelo SVG do mapa de distritos de Frontier.
const MAPA_CSS_VARS = {
  "--bg": "#F3E9D2", "--paper": "#FBF5E6", "--ink": INK, "--muted": MUTED, "--line": LINE,
  "--brass": BRASS, "--brass-soft": "#EBD9AE", "--red": EMBER, "--red-soft": "#F0D5CC",
  "--verd": "#2F6D61", "--verd-soft": "#D2E6E0", "--field": "#DDD3A3", "--mud": "#B9A58A", "--water": "#9FB6B0",
};

const NPC_GRUPO_COR = { pend: EMBER, gov: BRASS, mil: EMBER, barro: "#2F6D61", fora: MUTED, crime: INK };

function GmBadge() {
  return (
    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, letterSpacing: 0.8, color: EMBER, border: `1px dashed ${EMBER}`, borderRadius: 3, padding: "1px 5px", textTransform: "uppercase" }}>
      só GM
    </span>
  );
}

// Seletor Jogador / GM do canto superior direito.
function ModoVisaoToggle({ modo, setModo }) {
  return (
    <div role="group" aria-label="Ver como" style={{ display: "flex", alignItems: "center", gap: 2, border: `1px solid ${PURPLE_TEXT}55`, borderRadius: 6, padding: 2 }}>
      <span style={{ fontSize: 9.5, color: `${PURPLE_TEXT}99`, fontFamily: "'IBM Plex Mono', monospace", padding: "0 6px" }}>VER COMO</span>
      {[["jogador", "Jogador", Eye], ["gm", "GM", EyeOff]].map(([id, label, Icon]) => {
        const ativo = modo === id;
        return (
          <button
            key={id} aria-pressed={ativo} onClick={() => setModo(id)}
            style={{
              display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", borderRadius: 4, cursor: "pointer",
              border: "none", background: ativo ? "#F0D98C" : "transparent", color: ativo ? INK : `${PURPLE_TEXT}CC`,
              fontFamily: "'Cinzel', serif", fontSize: 11, letterSpacing: 0.5,
            }}
          >
            <Icon size={12} /> {label}
          </button>
        );
      })}
    </div>
  );
}

// HTML do conteúdo fixo, com botões internos (data-term / data-person /
// data-region) que abrem pop-ups pelo onAcao.
function RichText({ html, onAcao, style }) {
  if (!html) return null;
  return (
    <div
      className="mundo-rich"
      style={{ fontSize: 14, lineHeight: 1.6, color: PARCHMENT, ...style }}
      onClick={(e) => {
        const el = e.target.closest("[data-term],[data-person],[data-region]");
        if (!el || !onAcao) return;
        e.preventDefault();
        if (el.dataset.term) onAcao({ tipo: "termo", id: el.dataset.term });
        else if (el.dataset.person) onAcao({ tipo: "npc", id: el.dataset.person.startsWith("frontier_") ? el.dataset.person : `frontier_${el.dataset.person}` });
        else if (el.dataset.region) onAcao({ tipo: "distrito", id: el.dataset.region });
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function MundoModal({ onClose, children, largura = 560 }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "#00000090", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16 }}
    >
      <div role="dialog" aria-modal="true" style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 8, padding: 20, width: `min(100%, ${largura}px)`, maxHeight: "86vh", overflowY: "auto", boxShadow: "0 0 30px #00000080" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
          <Btn variant="ghost" onClick={onClose} style={{ padding: "4px 10px" }}><X size={13} /> Fechar</Btn>
        </div>
        {children}
      </div>
    </div>
  );
}

function NpcCard({ npc, gm, onOpen }) {
  const v = npcVisivel(npc, gm);
  const cor = NPC_GRUPO_COR[v.grupo] || BRASS;
  return (
    <button
      onClick={() => onOpen(npc.id)}
      style={{ textAlign: "left", background: PANEL_2, border: `1px solid ${LINE}`, borderRadius: 8, padding: 12, cursor: "pointer", color: "inherit", display: "flex", gap: 10, alignItems: "center" }}
    >
      {v.img ? (
        <img src={assetUrl(v.img)} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0, border: `1px solid ${LINE}` }} />
      ) : (
        <div style={{ width: 44, height: 44, borderRadius: 8, background: "#00000018", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Users size={18} color={cor} />
        </div>
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13.5, color: PARCHMENT }}>{v.nome}</div>
        <div style={{ fontSize: 11, color: BRASS, fontStyle: "italic" }}>{v.papel}</div>
        <div style={{ fontSize: 10, color: cor, fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>{textoVisivel(NPC_GRUPOS[v.grupo], gm) || ""}</div>
      </div>
    </button>
  );
}

// Exportado só pra teste de render — ver mapaMundo.test.js.
export function NpcDetalhe({ npcId, gm, onAcao }) {
  const npc = NPCS.find((n) => n.id === npcId);
  if (!npc) return <p style={{ color: MUTED }}>Personagem não encontrado.</p>;
  const v = npcVisivel(npc, gm);
  const cidade = CIDADE_INFO[v.cidade];
  return (
    <div>
      {v.img && <img src={assetUrl(v.img)} alt={`Retrato de ${v.nome}`} style={{ float: "right", width: "min(40%, 180px)", margin: "0 0 10px 14px", borderRadius: 6, border: `1px solid ${LINE}` }} />}
      <div style={{ fontSize: 10.5, color: MUTED, fontFamily: "'IBM Plex Mono', monospace" }}>
        {(cidade?.nome || v.cidade)} · {textoVisivel(NPC_GRUPOS[v.grupo], gm)}
      </div>
      <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 20, margin: "4px 0 2px", color: PARCHMENT }}>{v.nome}</h2>
      <div style={{ fontSize: 12.5, color: BRASS, fontStyle: "italic", marginBottom: 12 }}>{v.papel}</div>
      {Object.keys(v.kv).length > 0 && (
        <dl style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: "4px 12px", fontSize: 13, margin: "0 0 12px" }}>
          {Object.entries(v.kv).map(([k, val]) => (
            <React.Fragment key={k}>
              <dt style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: MUTED, textTransform: "uppercase", paddingTop: 2 }}>{k}</dt>
              <dd style={{ margin: 0 }}>{val}</dd>
            </React.Fragment>
          ))}
        </dl>
      )}
      <RichText html={`<p>${v.texto}</p>`} onAcao={onAcao} />
      {gm && v.segredo && (
        <div style={{ clear: "both", border: `1px dashed ${EMBER}`, background: "#F0D5CC", borderRadius: 6, padding: "10px 12px", marginTop: 10 }}>
          <div style={{ marginBottom: 4 }}><GmBadge /> <span style={{ fontFamily: "'Cinzel', serif", fontSize: 12, color: EMBER }}>Segredo do mestre</span></div>
          <RichText html={`<p style="margin:0">${v.segredo}</p>`} onAcao={onAcao} style={{ fontSize: 13.5 }} />
        </div>
      )}
      {gm && v.ganchos.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ marginBottom: 4 }}><GmBadge /> <span style={{ fontFamily: "'Cinzel', serif", fontSize: 12, color: EMBER }}>Ganchos</span></div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, lineHeight: 1.5 }}>{v.ganchos.map((h, i) => <li key={i}>{h}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

// Pop-up genérico do Mundo: termo, distrito, casa ou NPC.
// Exportado só pra teste de render — ver mapaMundo.test.js (é por aqui que o
// texto de distrito/termo de Frontier chega a aparecer — CidadeView só mostra
// o título do distrito, o corpo pub/gm vem deste popup).
export function MundoPopup({ acao, gm, onClose, onAcao }) {
  let corpo = null;
  if (acao.tipo === "npc") corpo = <NpcDetalhe npcId={acao.id} gm={gm} onAcao={onAcao} />;
  else if (acao.tipo === "termo" || acao.tipo === "distrito") {
    const fonte = acao.tipo === "termo" ? FRONTIER.termos : FRONTIER.distritos;
    const t = fonte[acao.id];
    const html = t ? textoVisivel(t, gm) : null;
    corpo = (
      <div>
        <div style={{ fontSize: 10.5, color: MUTED, fontFamily: "'IBM Plex Mono', monospace" }}>{acao.tipo === "distrito" ? "Distrito de Frontier" : "Frontier"}</div>
        <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 19, margin: "4px 0 10px" }}>{t?.titulo || "Sem informação"}</h2>
        {html ? <RichText html={html} onAcao={onAcao} /> : <p style={{ color: MUTED }}>Nada que os jogadores saibam ainda.</p>}
        {gm && t?.gm && t?.pub && <div style={{ marginTop: 8 }}><GmBadge /> <span style={{ fontSize: 11.5, color: MUTED }}>Mostrando a versão do mestre.</span></div>}
      </div>
    );
  } else if (acao.tipo === "casa") {
    const c = KATALAO_INFO.casas.find((x) => x.id === acao.id);
    corpo = c && (
      <div>
        {c.img && <img src={assetUrl(c.img)} alt="" style={{ float: "right", width: "min(38%, 170px)", margin: "0 0 10px 14px", borderRadius: 6, border: `1px solid ${LINE}` }} />}
        <div style={{ fontSize: 10.5, color: MUTED, fontFamily: "'IBM Plex Mono', monospace" }}>{c.papel}</div>
        <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 19, margin: "4px 0 10px" }}>{c.nome}</h2>
        <RichText html={textoVisivel(c, gm)} onAcao={onAcao} />
      </div>
    );
  }
  return <MundoModal onClose={onClose}>{corpo}</MundoModal>;
}

function SubAbas({ abas, ativa, setAtiva }) {
  return (
    <div role="tablist" style={{ display: "flex", gap: 4, flexWrap: "wrap", borderBottom: `1px solid ${LINE}`, marginBottom: 14 }}>
      {abas.map((a) => {
        const on = a.id === ativa;
        return (
          <button
            key={a.id} role="tab" aria-selected={on} onClick={() => setAtiva(a.id)}
            style={{
              padding: "7px 12px", border: "none", borderBottom: `2px solid ${on ? BRASS : "transparent"}`, marginBottom: -1,
              background: "transparent", cursor: "pointer", fontFamily: "'Cinzel', serif", fontSize: 12, letterSpacing: 0.5,
              color: on ? BRASS_BRIGHT : MUTED, display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {a.label}{a.gm && <GmBadge />}
          </button>
        );
      })}
    </div>
  );
}

const cardBox = { background: PANEL_2, border: `1px solid ${LINE}`, borderRadius: 8, padding: 14 };
const rotulo = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: MUTED, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 };

// Bloco de conteúdo do dossiê com edição pelo GM: sempre mostra o conteúdo
// (renderLeitura); só no modo mestre aparece "Editar" (troca pra Salvar/
// Cancelar) e, quando já existe um override nesse campo, "Restaurar
// original" (apaga só esse campo do override — nunca toca mundoDados.js).
// No modo Jogador nenhum controle aparece — é só renderLeitura().
function BlocoEditavel({ gm, temOverride, valorInicial, onSalvar, onRestaurar, renderLeitura, renderEdicao }) {
  const [editando, setEditando] = useState(false);
  const [draft, setDraft] = useState(valorInicial);
  if (!gm) return renderLeitura();
  if (!editando) {
    return (
      <div>
        {renderLeitura()}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <Btn variant="ghost" onClick={() => { setDraft(valorInicial); setEditando(true); }} style={{ padding: "3px 8px", fontSize: 11 }}>
            <Pencil size={11} /> Editar
          </Btn>
          {temOverride && (
            <Btn variant="ghost" onClick={onRestaurar} style={{ padding: "3px 8px", fontSize: 11, color: MUTED }}>
              Restaurar original
            </Btn>
          )}
        </div>
      </div>
    );
  }
  return (
    <div>
      {renderEdicao(draft, setDraft)}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <Btn variant="primary" onClick={() => { onSalvar(draft); setEditando(false); }} style={{ padding: "3px 10px", fontSize: 11 }}>
          <Save size={11} /> Salvar
        </Btn>
        <Btn variant="ghost" onClick={() => setEditando(false)} style={{ padding: "3px 10px", fontSize: 11 }}>
          <X size={11} /> Cancelar
        </Btn>
      </div>
    </div>
  );
}

// Editor de lista pro GM (ficha/chegada têm rótulo; estética/medos não):
// cada item tem texto + a caixa "Só o mestre vê" (padrão desmarcada — item
// novo nasce visível ao jogador), e dá pra adicionar/remover itens.
function EditorDeItensLista({ itens, setItens, comRotulo, placeholderRotulo }) {
  function atualizar(i, patch) {
    setItens((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function remover(i) {
    setItens((prev) => prev.filter((_, idx) => idx !== i));
  }
  function adicionar() {
    setItens((prev) => [...prev, { rotulo: "", texto: "", soMestre: false }]);
  }
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {itens.map((it, i) => (
        <div key={i} style={{ ...cardBox, padding: 10 }}>
          {comRotulo && (
            <input
              style={{ ...inputStyle, fontWeight: 700, marginBottom: 6 }} placeholder={placeholderRotulo || "Rótulo"}
              value={it.rotulo || ""} onChange={(e) => atualizar(i, { rotulo: e.target.value })}
            />
          )}
          <textarea
            style={{ ...inputStyle, minHeight: 50, resize: "vertical", marginBottom: 6 }} placeholder="Texto"
            value={it.texto || ""} onChange={(e) => atualizar(i, { texto: e.target.value })}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: MUTED, cursor: "pointer" }}>
              <input type="checkbox" checked={!!it.soMestre} onChange={(e) => atualizar(i, { soMestre: e.target.checked })} />
              Só o mestre vê
            </label>
            <Btn variant="ghost" onClick={() => remover(i)} aria-label="Remover item" style={{ padding: "2px 6px" }}><X size={12} /></Btn>
          </div>
        </div>
      ))}
      <Btn onClick={adicionar} style={{ padding: "4px 10px", fontSize: 11 }}><Plus size={12} /> Adicionar</Btn>
    </div>
  );
}

/* --- Cidade (conteúdo fixo/dossiê, ex: Frontier — ver mundoDados.js).
   kingdom.cities[] cobre só a geografia (x/y, resumo curto pro mapa); este é
   o CONTEÚDO da cidade, ligado pelo id. Aberto tanto pelo botão "Abrir
   cidade" na aba Cidades quanto pelo clique no mapa (ver abrirCidade em
   WorldView) — os dois caminhos levam aqui, com a mesma trilha Mundo >
   Reino > Cidade da página leve (CidadePaginaView). */
// Exportado só pra teste de render — ver mapaMundo.test.js.
export function CidadeView({
  cidade, gm, onVoltar, onVoltarMundo, nomeReino, abaInicial, onAcao,
  overrideAtivo, onEditarCampo, onRestaurarCampo, kingdoms, setKingdoms, reinoId, cidadeId,
}) {
  const [aba, setAba] = useState(abaInicial || "geral");
  const [boato, setBoato] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);
  const npcs = NPCS.filter((n) => n.cidade === cidade.id);
  const overrideSeguro = overrideAtivo || {};

  // Geografia da cidade (kingdom.cities[]: x/y, resumo curto, imagem) —
  // separada do conteúdo do dossiê, ligada só pelo id. Resolvida por id (não
  // guardada como objeto) pra sempre ler o dado mais recente de `kingdoms`.
  const reinoGeografia = kingdoms?.find((k) => k.id === reinoId) || null;
  const cidadeGeografia = reinoGeografia ? (reinoGeografia.cities || []).find((c) => c.id === cidadeId) || null : null;
  function atualizarGeografia(patch) {
    setKingdoms((prev) => prev.map((k) => (
      k.id !== reinoId ? k : { ...k, cities: (k.cities || []).map((c) => (c.id === cidadeId ? { ...c, ...patch } : c)) }
    )));
  }
  async function handlePickImage(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !cidadeGeografia) return;
    setUploadError(null);
    setUploading(true);
    try {
      const url = await uploadPortrait(file, cidadeGeografia.id);
      atualizarGeografia({ imageUrl: url });
    } catch (err) {
      setUploadError(err.message || "Falha ao enviar a imagem.");
    } finally {
      setUploading(false);
    }
  }
  function handleRemoveImage() {
    removePortrait(cidadeGeografia.imageUrl); // best-effort, não bloqueia a UI
    atualizarGeografia({ imageUrl: "" });
  }

  // Ficha/chegada (rótulo + valor) <-> itens do editor ({rotulo, texto, soMestre}).
  function paraItensComRotulo(lista) {
    return (lista || []).map(([rotuloItem, valor]) => ({ rotulo: rotuloItem || "", ...normalizarItemLista(valor) }));
  }
  function deItensComRotulo(itens) {
    return (itens || []).map((it) => [it.rotulo || "", paraItemLista(it)]);
  }
  // Estética/medos (só valor) <-> itens do editor ({texto, soMestre}).
  function paraItensSemRotulo(lista) {
    return (lista || []).map((valor) => normalizarItemLista(valor));
  }
  function deItensSemRotulo(itens) {
    return (itens || []).map((it) => paraItemLista(it));
  }
  const abas = [
    { id: "geral", label: "Visão geral" },
    { id: "distritos", label: "Distritos" },
    { id: "personagens", label: `Personagens (${npcs.length})` },
    { id: "forcas", label: "Forças" },
    ...(gm ? [{ id: "mestre", label: "Mesa do mestre", gm: true }] : []),
  ];
  const abaAtual = abas.some((a) => a.id === aba) ? aba : "geral";

  return (
    <div>
      {/* Mundo > Katalão > Frontier — mesma trilha e mesmo comportamento da
          página leve (CidadePaginaView), pra quem chegou pelo mapa ou pela
          aba Cidades ter a mesma navegação. */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, fontSize: 12, flexWrap: "wrap", fontFamily: "'IBM Plex Mono', monospace" }}>
        <button onClick={onVoltarMundo} style={{ background: "transparent", border: "none", color: BRASS, cursor: "pointer", padding: 0 }}>Mundo</button>
        <ChevronRight size={11} color={MUTED} />
        <button onClick={onVoltar} style={{ background: "transparent", border: "none", color: BRASS, cursor: "pointer", padding: 0 }}>{nomeReino}</button>
        <ChevronRight size={11} color={MUTED} />
        <span style={{ color: PARCHMENT }}>{cidade.nome}</span>
      </div>
      <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 24, margin: "0 0 2px", color: PARCHMENT }}>{cidade.nome}</h2>
      <BlocoEditavel
        gm={gm} temOverride={"subtitulo" in overrideSeguro} valorInicial={cidade.subtitulo || ""}
        onSalvar={(v) => onEditarCampo("subtitulo", v)} onRestaurar={() => onRestaurarCampo("subtitulo")}
        renderLeitura={() => <div style={{ fontStyle: "italic", color: EMBER, marginBottom: 14 }}>{cidade.subtitulo}</div>}
        renderEdicao={(draft, setDraft) => (
          <input
            style={{ ...inputStyle, fontStyle: "italic", marginBottom: 6 }} value={draft}
            onChange={(e) => setDraft(e.target.value)} placeholder="Epígrafe da cidade"
          />
        )}
      />
      <SubAbas abas={abas} ativa={abaAtual} setAtiva={setAba} />

      {abaAtual === "geral" && (
        <div className="mundo-grid2">
          <div style={cardBox}>
            <div style={rotulo}>O conceito</div>
            <BlocoEditavel
              gm={gm} temOverride={"conceito" in overrideSeguro} valorInicial={textoVisivel(cidade.conceito, true) || ""}
              onSalvar={(v) => onEditarCampo("conceito", { pub: v })} onRestaurar={() => onRestaurarCampo("conceito")}
              renderLeitura={() => <RichText html={textoVisivel(cidade.conceito, gm)} onAcao={onAcao} />}
              renderEdicao={(draft, setDraft) => (
                <textarea
                  style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} value={draft}
                  onChange={(e) => setDraft(e.target.value)} placeholder="Texto do conceito (aceita HTML simples, igual o original)"
                />
              )}
            />
          </div>
          <div style={cardBox}>
            <div style={rotulo}>Ficha rápida</div>
            <BlocoEditavel
              gm={gm} temOverride={"ficha" in overrideSeguro} valorInicial={paraItensComRotulo(cidade.ficha)}
              onSalvar={(itens) => onEditarCampo("ficha", deItensComRotulo(itens))} onRestaurar={() => onRestaurarCampo("ficha")}
              renderLeitura={() => (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <tbody>
                    {cidade.ficha.filter(([, val]) => textoVisivel(val, gm) != null).map(([k, val], i) => (
                      <tr key={`${k}-${i}`} style={{ borderBottom: `1px solid ${LINE}` }}>
                        <th style={{ textAlign: "left", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: MUTED, fontWeight: 400, padding: "6px 10px 6px 0", verticalAlign: "top", textTransform: "uppercase" }}>{k}</th>
                        <td style={{ padding: "6px 0" }}>{textoVisivel(val, gm)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              renderEdicao={(draft, setDraft) => (
                <EditorDeItensLista itens={draft} setItens={setDraft} comRotulo placeholderRotulo="Rótulo (ex: Onde)" />
              )}
            />
          </div>
          <div style={{ ...cardBox, gridColumn: "1 / -1" }}>
            <div style={rotulo}>A chegada pela estrada de Maxis</div>
            <BlocoEditavel
              gm={gm} temOverride={"chegada" in overrideSeguro} valorInicial={paraItensComRotulo(cidade.chegada)}
              onSalvar={(itens) => onEditarCampo("chegada", deItensComRotulo(itens))} onRestaurar={() => onRestaurarCampo("chegada")}
              renderLeitura={() => (
                <ol style={{ margin: 0, paddingLeft: 22, display: "grid", gap: 8, fontSize: 13.5, lineHeight: 1.5 }}>
                  {cidade.chegada.filter(([, d]) => textoVisivel(d, gm) != null).map(([t, d], i) => (
                    <li key={`${t}-${i}`}><b style={{ fontFamily: "'Cinzel', serif" }}>{t}.</b> {textoVisivel(d, gm)}</li>
                  ))}
                </ol>
              )}
              renderEdicao={(draft, setDraft) => (
                <EditorDeItensLista itens={draft} setItens={setDraft} comRotulo placeholderRotulo="Título do passo" />
              )}
            />
          </div>
          <div style={cardBox}>
            <div style={rotulo}>Estética</div>
            <BlocoEditavel
              gm={gm} temOverride={"estetica" in overrideSeguro} valorInicial={paraItensSemRotulo(cidade.estetica)}
              onSalvar={(itens) => onEditarCampo("estetica", deItensSemRotulo(itens))} onRestaurar={() => onRestaurarCampo("estetica")}
              renderLeitura={() => (
                <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 4, fontSize: 13.5, lineHeight: 1.5 }}>
                  {cidade.estetica.filter((e) => textoVisivel(e, gm) != null).map((e, i) => <li key={i}>{textoVisivel(e, gm)}</li>)}
                </ul>
              )}
              renderEdicao={(draft, setDraft) => <EditorDeItensLista itens={draft} setItens={setDraft} />}
            />
          </div>
          <div style={cardBox}>
            <div style={rotulo}>Os medos da cidade</div>
            <BlocoEditavel
              gm={gm} temOverride={"medos" in overrideSeguro} valorInicial={paraItensSemRotulo(cidade.medos)}
              onSalvar={(itens) => onEditarCampo("medos", deItensSemRotulo(itens))} onRestaurar={() => onRestaurarCampo("medos")}
              renderLeitura={() => (
                <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 4 }}>
                  {entradasVisiveis(cidade.medos, gm).map((m, i) => (
                    <li key={i}><RichText html={textoVisivel(m, gm)} onAcao={onAcao} style={{ fontSize: 13.5, lineHeight: 1.5 }} />{gm && !m.pub && <GmBadge />}</li>
                  ))}
                </ul>
              )}
              renderEdicao={(draft, setDraft) => <EditorDeItensLista itens={draft} setItens={setDraft} />}
            />
          </div>
          {cidade.guiaJogadores && (
            <div style={{ gridColumn: "1 / -1" }}>
              <Btn variant="ghost" href={assetUrl(cidade.guiaJogadores)} target="_blank" rel="noopener" style={{ padding: "4px 8px", fontSize: 11 }}>
                <ExternalLink size={12} /> Abrir o guia dos jogadores numa página separada
              </Btn>
            </div>
          )}
          {gm && (
            <div style={{ ...cardBox, gridColumn: "1 / -1" }}>
              <div style={rotulo}>Resumo curto (mapa/hover) e imagem — sincronizado com a página leve</div>
              {cidadeGeografia ? (
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 16, alignItems: "start" }}>
                  <textarea
                    style={{ ...inputStyle, minHeight: 50, resize: "vertical" }} value={cidadeGeografia.resumo || ""}
                    onChange={(e) => atualizarGeografia({ resumo: e.target.value })} placeholder="Resumo curto"
                  />
                  <div style={{ width: 120 }}>
                    <div style={{ width: 120, aspectRatio: "1", borderRadius: 8, background: PANEL_2, border: `1px solid ${LINE}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 8 }}>
                      {cidadeGeografia.imageUrl ? (
                        <img src={cidadeGeografia.imageUrl} alt={cidade.nome} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; }} />
                      ) : (
                        <Landmark size={24} color={MUTED} />
                      )}
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePickImage} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <Btn onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{ fontSize: 11 }}>
                        <Upload size={11} /> {uploading ? "Enviando..." : "Enviar imagem"}
                      </Btn>
                      {cidadeGeografia.imageUrl && <Btn variant="ghost" onClick={handleRemoveImage} style={{ fontSize: 11 }}><X size={11} /> Remover</Btn>}
                    </div>
                    {uploadError && <p style={{ color: EMBER, fontSize: 10.5, margin: "6px 0 0" }}>{uploadError}</p>}
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>Esta cidade ainda não foi posicionada no mapa — posicione-a primeiro ("Editar mapa" na aba Mundo) pra editar resumo/imagem aqui.</p>
              )}
            </div>
          )}
        </div>
      )}

      {abaAtual === "distritos" && (
        <div>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>Norte em cima. Quem chega vem pelo leste, dos entrepostos, e entra pelo portão leste no mercado. Toque num distrito.</div>
          <div className="mapa-distritos" style={{ ...MAPA_CSS_VARS, border: `1px solid ${LINE}`, borderRadius: 8, overflowX: "auto", background: "#FBF5E6" }}>
            <div style={{ minWidth: 620 }}>
              <RichText html={cidade.mapaSvg} onAcao={onAcao} style={{ lineHeight: 0 }} />
            </div>
          </div>
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", marginTop: 12 }}>
            {Object.entries(cidade.distritos).filter(([, d]) => textoVisivel(d, gm)).map(([id, d]) => (
              <button key={id} onClick={() => onAcao({ tipo: "distrito", id })} style={{ ...cardBox, padding: 10, textAlign: "left", cursor: "pointer", color: "inherit", fontFamily: "'Cinzel', serif", fontSize: 13 }}>
                {d.titulo}
              </button>
            ))}
          </div>
        </div>
      )}

      {abaAtual === "personagens" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 10 }}>
          {npcs.map((n) => <NpcCard key={n.id} npc={n} gm={gm} onOpen={(id) => onAcao({ tipo: "npc", id })} />)}
        </div>
      )}

      {abaAtual === "forcas" && (
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {cidade.forcas.map((f, i) => (
            <div key={i} style={{ ...cardBox, borderTop: `3px solid ${i % 2 ? BRASS : EMBER}` }}>
              <div style={rotulo}>{textoVisivel(f.rotulo, gm)}</div>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: 15, marginBottom: 6 }}>{textoVisivel(f.titulo, gm)}</div>
              <RichText html={`<p style="margin:0 0 8px">${textoVisivel(f, gm)}</p>`} onAcao={onAcao} style={{ fontSize: 13.5, lineHeight: 1.5 }} />
              {f.npc && <Btn variant="ghost" onClick={() => onAcao({ tipo: "npc", id: f.npc })} style={{ padding: "3px 8px", fontSize: 11 }}><Users size={12} /> Ver personagem</Btn>}
            </div>
          ))}
        </div>
      )}

      {abaAtual === "mestre" && gm && (
        <div className="mundo-grid2">
          <div style={cardBox}>
            <div style={rotulo}>Quem pode entregar as tarefas</div>
            <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 6, fontSize: 13.5, lineHeight: 1.5 }}>
              {cidade.gm.entregadores.map(([a, b]) => <li key={a}><b>{a}.</b> {b}</li>)}
            </ul>
          </div>
          <div style={cardBox}>
            <div style={rotulo}>Gatilhos para soltar quando a cena parar</div>
            <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 6, fontSize: 13.5, lineHeight: 1.5 }}>
              {cidade.gm.gatilhos.map((g) => <li key={g}>{g}</li>)}
            </ul>
          </div>
          <div style={{ ...cardBox, gridColumn: "1 / -1" }}>
            <div style={rotulo}>Boatos da taverna (d{cidade.gm.boatos.length})</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <Btn onClick={() => setBoato(Math.floor(Math.random() * cidade.gm.boatos.length))}><Dices size={14} /> Rolar boato</Btn>
              {boato != null && <span style={{ fontStyle: "italic", fontSize: 15 }}>{boato + 1}: “{cidade.gm.boatos[boato]}”</span>}
            </div>
            <ol style={{ margin: "12px 0 0", paddingLeft: 22, display: "grid", gap: 4, fontSize: 13, color: MUTED }}>
              {cidade.gm.boatos.map((b) => <li key={b}>{b}</li>)}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   MUNDO — mapa, reinos, cidades
----------------------------------------------------------------*/
// Mapa interativo dos reinos — overlay de SVG sobre a imagem do mapa do
// mundo. Cada reino com `mapa.poligono` (>=3 pontos) ganha um território
// clicável; clicar entra no "recorte" (zoom via transform/scale, nunca
// recortando a imagem — ver calcularRecorte em mapaMundo.js) e mostra as
// cidades posicionadas como botões. Reino sem `mapa` continua só com o pino
// de sempre, sem overlay nenhum — nada quebra pra quem ainda não foi mapeado.
//
// Modo de edição (prop `editando`): clicar num reino (pino ou território) o
// seleciona pra editar; "Traçar fronteira" acrescenta um ponto ao polígono
// por clique (com desfazer/fechar); "Posicionar cidade" cria ou reposiciona
// uma cidade pelo nome no ponto clicado; marcadores existentes arrastam
// (pointer events) e têm um botão de remover. Tudo passa por `setKingdoms`,
// que o App já persiste via storage.js — nenhuma escrita própria aqui.
//
// Tamanho do texto do balão de descrição (nome + resumo do reino/cidade ao
// passar o mouse): é só preferência de exibição deste navegador, não dado de
// campanha, então fica fora de `kingdoms`/storage.js — direto no
// localStorage, mesmo padrão do CHAVE_MODO (ver mundo.js). Default já entra
// no tamanho "M" (maior que o original) — os botões A-/A+ deixam ajustar.
const CHAVE_TAMANHO_TOOLTIP_MAPA = "point-mapa-tamanho-tooltip";
const TAMANHOS_TOOLTIP_MAPA = [
  { label: "P", titulo: 12.5, texto: 11, largura: 220 },
  { label: "M", titulo: 15.5, texto: 14, largura: 280 },
  { label: "G", titulo: 19, texto: 17, largura: 340 },
];
function MapaMundoInterativo({ kingdoms, setKingdoms, removeCity, reinoAbertoId, onAbrirReino, onAbrirCidade, editando }) {
  const containerRef = useRef(null);
  const [hover, setHover] = useState(null); // { nome, descricao, ponto }
  const [tamanhoTooltipIdx, setTamanhoTooltipIdx] = useState(() => {
    try {
      const v = parseInt(localStorage.getItem(CHAVE_TAMANHO_TOOLTIP_MAPA), 10);
      return Number.isInteger(v) && v >= 0 && v < TAMANHOS_TOOLTIP_MAPA.length ? v : 1;
    } catch (e) { return 1; }
  });
  function mudarTamanhoTooltip(delta) {
    setTamanhoTooltipIdx((prev) => {
      const next = Math.min(TAMANHOS_TOOLTIP_MAPA.length - 1, Math.max(0, prev + delta));
      try { localStorage.setItem(CHAVE_TAMANHO_TOOLTIP_MAPA, String(next)); } catch (e) {}
      return next;
    });
  }
  const tamanhoTooltip = TAMANHOS_TOOLTIP_MAPA[tamanhoTooltipIdx];
  const [recorteReinoId, setRecorteReinoId] = useState(null);
  const [reinoEditandoId, setReinoEditandoId] = useState(null);
  const [modoEdicao, setModoEdicao] = useState(null); // null | "tracando" | "posicionando"
  const [draftPoligono, setDraftPoligono] = useState([]);
  const [pontoPendente, setPontoPendente] = useState(null);
  const [nomeCidadeInput, setNomeCidadeInput] = useState("");
  const [arrastando, setArrastando] = useState(null);

  const reinoEditando = reinoEditandoId ? kingdoms.find((k) => k.id === reinoEditandoId) : null;
  const reinoRecorte = recorteReinoId ? kingdoms.find((k) => k.id === recorteReinoId) : null;
  // Com uma ferramenta ativa (traçando/posicionando), um clique em cima do
  // próprio território (ou de um pino) precisa virar ponto/posição, não
  // re-selecionar o reino — por isso os dois cliques abaixo checam isso antes
  // de agir e deixam o evento borbulhar pro onContainerClick quando for o caso.
  const ferramentaAtiva = editando && !!reinoEditandoId && !!modoEdicao;
  const recorte = reinoRecorte ? calcularRecorte(reinoRecorte.mapa?.poligono) : null;

  function pontoDoEvento(e) {
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    return [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000];
  }
  // Mesma composição scale+translate(centro) do CSS do contêiner (ver
  // calcularRecorte), pra posicionar a tooltip num tamanho fixo mesmo com
  // zoom ativo — sem isso ela cresceria/encolheria junto com o mapa.
  function paraTela([x, y]) {
    if (!recorte) return [x, y];
    return [
      (x - 0.5 + recorte.translateX / 100) * recorte.scale + 0.5,
      (y - 0.5 + recorte.translateY / 100) * recorte.scale + 0.5,
    ];
  }

  function selecionarReino(k) {
    if (editando) {
      setReinoEditandoId(k.id);
      setModoEdicao(null);
      setDraftPoligono(k.mapa?.poligono || []);
      setRecorteReinoId(null);
      return;
    }
    setRecorteReinoId(k.id);
  }
  function onPinoClick(k) {
    if (editando) return selecionarReino(k);
    onAbrirReino(k.id);
  }

  function onContainerClick(e) {
    if (!editando || !reinoEditandoId || !modoEdicao) return;
    const p = pontoDoEvento(e);
    if (modoEdicao === "tracando") setDraftPoligono((prev) => [...prev, p]);
    else if (modoEdicao === "posicionando") setPontoPendente(p);
  }
  function fecharTracado() {
    if (draftPoligono.length < 3) return;
    setKingdoms((prev) => prev.map((k) => (
      k.id === reinoEditandoId ? { ...k, mapa: { cor: k.mapa?.cor || BRASS, poligono: draftPoligono } } : k
    )));
    setModoEdicao(null);
  }
  function confirmarCidade() {
    const nome = nomeCidadeInput.trim();
    if (!nome || !pontoPendente) return;
    const [x, y] = pontoPendente;
    setKingdoms((prev) => prev.map((k) => {
      if (k.id !== reinoEditandoId) return k;
      const cidades = k.cities || [];
      const idx = cidades.findIndex((c) => (c.name || "").trim().toLowerCase() === nome.toLowerCase());
      if (idx >= 0) {
        const novas = [...cidades];
        novas[idx] = { ...novas[idx], x, y };
        return { ...k, cities: novas };
      }
      const idsExistentes = new Set(cidades.map((c) => c.id).filter(Boolean));
      const base = slugificar(nome);
      let id = base, i = 2;
      while (idsExistentes.has(id)) id = `${base}_${i++}`;
      return { ...k, cities: [...cidades, { id, name: nome, resumo: "", x, y, capital: false }] };
    }));
    setPontoPendente(null);
    setNomeCidadeInput("");
  }

  // Arrastar um marcador já posicionado: ouve o ponteiro na window enquanto
  // durar o gesto, independente de onde ele saiu do marcador.
  useEffect(() => {
    if (!arrastando) return;
    function onMove(e) {
      const [x, y] = pontoDoEvento(e);
      setKingdoms((prev) => prev.map((k) => (
        k.id !== reinoEditandoId ? k : { ...k, cities: k.cities.map((c) => (c.id === arrastando ? { ...c, x, y } : c)) }
      )));
    }
    function onUp() { setArrastando(null); }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrastando, reinoEditandoId]);

  const aspect = `${MAPA_MUNDO.largura} / ${MAPA_MUNDO.altura}`;
  const transformEstilo = recorte
    ? { transform: `scale(${recorte.scale}) translate(${recorte.translateX}%, ${recorte.translateY}%)`, transition: "transform 0.4s ease" }
    : { transform: "none", transition: "transform 0.4s ease" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: MUTED, fontFamily: "'IBM Plex Mono', monospace" }}>Tamanho do texto no mapa:</span>
        <Btn variant="ghost" onClick={() => mudarTamanhoTooltip(-1)} disabled={tamanhoTooltipIdx === 0} style={{ padding: "3px 9px" }}>
          A-
        </Btn>
        <span style={{ fontSize: 11, color: PARCHMENT, fontFamily: "'IBM Plex Mono', monospace", minWidth: 14, textAlign: "center" }}>
          {tamanhoTooltip.label}
        </span>
        <Btn variant="ghost" onClick={() => mudarTamanhoTooltip(1)} disabled={tamanhoTooltipIdx === TAMANHOS_TOOLTIP_MAPA.length - 1} style={{ padding: "3px 9px" }}>
          A+
        </Btn>
      </div>
      <div
        ref={containerRef} onClick={onContainerClick}
        style={{
          position: "relative", borderRadius: 8, overflow: "hidden", border: `1px solid ${LINE}`, marginBottom: 12,
          aspectRatio: aspect, background: "#00000010",
          cursor: editando && modoEdicao ? "crosshair" : "default",
        }}
      >
        <div style={{ position: "absolute", inset: 0, ...transformEstilo }}>
          <img
            src={assetUrl(MAPA_MUNDO.imagem)} alt="Mapa do continente com os seis reinos"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }}
          />
          {/* viewBox é um quadrado unitário (0 a 1), mas o contêiner não é quadrado
              (segue a proporção real da imagem via aspectRatio no CSS) — então
              precisa de preserveAspectRatio="none" pra esticar sem letterbox e
              coincidir com a conta de clique (fração simples de largura/altura). */}
          <svg viewBox="0 0 1 1" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
            {kingdoms.map((k) => {
              const poligono = k.mapa?.poligono;
              if (!poligono || poligono.length < 3) return null;
              const cor = k.mapa.cor || BRASS;
              const emFoco = hover?.reinoId === k.id || reinoEditandoId === k.id;
              return (
                <polygon
                  key={k.id}
                  points={poligono.map(([x, y]) => `${x},${y}`).join(" ")}
                  fill={cor} fillOpacity={emFoco ? 0.22 : 0.12} stroke={cor} strokeWidth={0.0035}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => {
                    const bbox = bboxPoligono(poligono);
                    setHover({ reinoId: k.id, nome: k.name, descricao: k.description, ponto: [(bbox.minX + bbox.maxX) / 2, (bbox.minY + bbox.maxY) / 2] });
                  }}
                  onMouseLeave={() => setHover((h) => (h?.reinoId === k.id ? null : h))}
                  onClick={(e) => { if (ferramentaAtiva) return; e.stopPropagation(); selecionarReino(k); }}
                />
              );
            })}
            {modoEdicao === "tracando" && draftPoligono.length > 0 && (
              <g pointerEvents="none">
                {draftPoligono.length > 1 && (
                  <polyline points={draftPoligono.map(([x, y]) => `${x},${y}`).join(" ")} fill="none" stroke={BRASS_BRIGHT} strokeWidth={0.003} />
                )}
                {draftPoligono.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={0.006} fill={BRASS_BRIGHT} />)}
              </g>
            )}
          </svg>

          {/* Nome do reino no centro do território — só na visão do mundo (sem recorte ativo pra outro reino). */}
          {!recorteReinoId && kingdoms.map((k) => {
            const bbox = bboxPoligono(k.mapa?.poligono);
            if (!bbox) return null;
            return (
              <div
                key={k.id} style={{
                  position: "absolute", ...paraPercentual([(bbox.minX + bbox.maxX) / 2, (bbox.minY + bbox.maxY) / 2]),
                  transform: "translate(-50%, -50%)", pointerEvents: "none", textAlign: "center",
                  fontFamily: "'Cinzel', serif", fontSize: "clamp(10px, 1.4vw, 14px)", color: PARCHMENT,
                  textShadow: "0 1px 3px #F3E9D2CC, 0 0 2px #F3E9D2", fontWeight: 700,
                }}
              >
                {k.name}
              </div>
            );
          })}

          {/* Pinos de sempre — somem durante o recorte pra não disputar espaço com as cidades. */}
          {!recorteReinoId && kingdoms.map((k) => {
            const pino = MAPA_MUNDO.pinos[k.id];
            if (!pino) return null;
            const ativo = k.id === reinoAbertoId || k.id === reinoEditandoId;
            return (
              <button
                key={k.id} onClick={(e) => { if (ferramentaAtiva) return; e.stopPropagation(); onPinoClick(k); }} aria-label={`Abrir ${k.name}`}
                style={{
                  position: "absolute", left: `${pino.x}%`, top: `${pino.y}%`, transform: "translate(-50%, -50%)",
                  padding: "3px 8px", borderRadius: 14, cursor: "pointer", whiteSpace: "nowrap",
                  border: `1.5px solid ${ativo ? "#F0D98C" : "#FFFFFFAA"}`, background: ativo ? PURPLE : "#2B2116CC",
                  color: "#F3E9D2", fontFamily: "'Cinzel', serif", fontSize: "clamp(9px, 1.3vw, 12.5px)", boxShadow: "0 1px 4px #00000080",
                }}
              >
                {k.name}
              </button>
            );
          })}

          {/* Cidades posicionadas do reino em recorte, ou do reino sendo editado (pra poder posicionar/arrastar vendo o resultado). */}
          {(reinoRecorte || reinoEditando) && cidadesPosicionadas((reinoRecorte || reinoEditando).cities).map((c) => {
            const reinoDaCidade = reinoRecorte || reinoEditando;
            return (
              <div key={c.id} style={{ position: "absolute", ...paraPercentual([c.x, c.y]), transform: "translate(-50%, -50%)" }}>
                <button
                  onPointerDown={(e) => { if (editando && reinoEditandoId === reinoDaCidade.id) { e.stopPropagation(); setArrastando(c.id); } }}
                  onClick={(e) => {
                    if (ferramentaAtiva && reinoEditandoId === reinoDaCidade.id) return; // deixa borbulhar pro traçar/posicionar
                    e.stopPropagation();
                    if (editando && reinoEditandoId === reinoDaCidade.id) return;
                    setHover(null);
                    setPontoPendente(null);
                    onAbrirCidade(reinoDaCidade, c);
                  }}
                  onMouseEnter={() => setHover({ reinoId: `cidade-${c.id}`, nome: c.name, descricao: c.resumo, ponto: [c.x, c.y] })}
                  onMouseLeave={() => setHover((h) => (h?.reinoId === `cidade-${c.id}` ? null : h))}
                  style={{
                    display: "flex", alignItems: "center", gap: 3, padding: "2px 7px", borderRadius: 10, whiteSpace: "nowrap",
                    border: `1px solid ${c.capital ? "#F0D98C" : "#FFFFFFCC"}`, background: c.capital ? PURPLE : "#2B2116DD",
                    color: "#F3E9D2", fontFamily: "'Cinzel', serif", fontSize: "clamp(8px, 1.1vw, 11px)", cursor: editando ? "grab" : "pointer",
                    boxShadow: "0 1px 3px #00000080",
                  }}
                >
                  {c.capital && <Crown size={9} />}
                  {c.name}
                </button>
                {editando && reinoEditandoId === reinoDaCidade.id && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeCity(reinoDaCidade.id, reinoDaCidade.cities.findIndex((x) => x.id === c.id), c); }}
                    title={`Remover ${c.name} do mapa`}
                    style={{ position: "absolute", top: -6, right: -6, width: 15, height: 15, borderRadius: "50%", background: EMBER, border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                  >
                    <X size={9} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {hover && (() => {
          const [sx, sy] = paraTela(hover.ponto);
          return (
            <div style={{
              position: "absolute", left: `${sx * 100}%`, top: `${sy * 100}%`, transform: "translate(-50%, -130%)",
              pointerEvents: "none", zIndex: 20, background: PANEL, border: `1px solid ${LINE}`, borderRadius: 6,
              padding: "6px 10px", boxShadow: "0 2px 10px #00000060", maxWidth: tamanhoTooltip.largura,
            }}>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: tamanhoTooltip.titulo, color: BRASS_BRIGHT }}>{hover.nome}</div>
              {hover.descricao && <div style={{ fontSize: tamanhoTooltip.texto, color: MUTED, lineHeight: 1.4, marginTop: 2 }}>{hover.descricao}</div>}
            </div>
          );
        })()}

        {recorteReinoId && (
          <Btn variant="ghost" onClick={() => setRecorteReinoId(null)} style={{ position: "absolute", top: 8, left: 8, background: "#2B2116CC", color: "#F3E9D2", zIndex: 10 }}>
            <ChevronLeft size={13} /> Voltar ao mundo
          </Btn>
        )}

        {editando && pontoPendente && (
          <div style={{
            position: "absolute", ...paraPercentual(pontoPendente), transform: "translate(-50%, 8px)", zIndex: 30,
            background: PANEL, border: `1px solid ${LINE}`, borderRadius: 6, padding: 8, boxShadow: "0 2px 10px #00000060", width: 190,
          }} onClick={(e) => e.stopPropagation()}>
            <input
              autoFocus value={nomeCidadeInput} onChange={(e) => setNomeCidadeInput(e.target.value)}
              placeholder="Nome da cidade" style={{ ...inputStyle, fontSize: 12, padding: "5px 8px", marginBottom: 6 }}
              onKeyDown={(e) => { if (e.key === "Enter") confirmarCidade(); if (e.key === "Escape") { setPontoPendente(null); setNomeCidadeInput(""); } }}
            />
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={() => { setPontoPendente(null); setNomeCidadeInput(""); }}><X size={12} /></Btn>
              <Btn variant="primary" onClick={confirmarCidade}><Check size={12} /></Btn>
            </div>
          </div>
        )}
      </div>

      {editando && (
        <div style={{ ...cardBox, marginBottom: 14 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: BRASS, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
            Modo de edição do mapa
          </div>
          {!reinoEditando && <p style={{ fontSize: 12.5, color: MUTED, margin: 0 }}>Clique num reino (pino ou território) pra editar o mapa dele.</p>}
          {reinoEditando && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 13.5, color: PARCHMENT }}>{reinoEditando.name}</span>
              <Btn
                variant={modoEdicao === "tracando" ? "primary" : "default"}
                onClick={() => setModoEdicao(modoEdicao === "tracando" ? null : "tracando")}
              >
                <MapIcon size={13} /> Traçar fronteira
              </Btn>
              {modoEdicao === "tracando" && (
                <>
                  <Btn variant="ghost" onClick={() => setDraftPoligono((prev) => prev.slice(0, -1))} disabled={draftPoligono.length === 0}>
                    <ChevronLeft size={13} /> Desfazer último ponto
                  </Btn>
                  <Btn variant="primary" onClick={fecharTracado} disabled={draftPoligono.length < 3}>
                    <Check size={13} /> Fechar traçado ({draftPoligono.length} pontos)
                  </Btn>
                </>
              )}
              <Btn
                variant={modoEdicao === "posicionando" ? "primary" : "default"}
                onClick={() => setModoEdicao(modoEdicao === "posicionando" ? null : "posicionando")}
              >
                <Plus size={13} /> Posicionar cidade
              </Btn>
              <Btn variant="ghost" onClick={() => { setReinoEditandoId(null); setModoEdicao(null); setDraftPoligono([]); }}>
                <X size={13} /> Sair deste reino
              </Btn>
            </div>
          )}
          {reinoEditando && modoEdicao === "tracando" && (
            <p style={{ fontSize: 11, color: MUTED, margin: "8px 0 0" }}>Clique no mapa pra acrescentar um ponto à fronteira. Precisa de pelo menos 3 pontos pra fechar.</p>
          )}
          {reinoEditando && modoEdicao === "posicionando" && (
            <p style={{ fontSize: 11, color: MUTED, margin: "8px 0 0" }}>Clique no mapa onde fica a cidade e digite o nome (se já existir na lista, só reposiciona).</p>
          )}
          {reinoEditando && !modoEdicao && (
            <p style={{ fontSize: 11, color: MUTED, margin: "8px 0 0" }}>Arraste um marcador de cidade já posicionado pra mover, ou use o × pra remover.</p>
          )}
        </div>
      )}
    </div>
  );
}

// Exportado (além do default App) só pra teste de render — ver mapaMundo.test.js.
// Página de uma cidade (sub-tela da aba Mundo, mesmo espírito da ficha de
// personagem como sub-tela de Personagens). Três abas — Visão geral,
// Distritos, Pessoas de interesse — tudo editável direto (sem modo de
// edição separado, igual as "Anotações do reino"). `reinoId`/`cidadeId` (não
// os objetos em si) garantem que a página sempre lê o dado mais recente de
// `kingdoms`, mesmo depois de uma edição. Exportado só pra teste de render.
export function CidadePaginaView({ kingdoms, setKingdoms, reinoId, cidadeId, abaInicial, characters, askConfirm, onVoltarMundo, onVoltarReino, onAbrirFicha }) {
  const [aba, setAba] = useState(abaInicial || "geral");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const reino = kingdoms.find((k) => k.id === reinoId) || null;
  const cidade = reino ? (reino.cities || []).find((c) => c.id === cidadeId) || null : null;

  function atualizarCidade(patch) {
    setKingdoms((prev) => prev.map((k) => (
      k.id !== reinoId ? k : { ...k, cities: (k.cities || []).map((c) => (c.id === cidadeId ? { ...c, ...patch } : c)) }
    )));
  }
  function addDistrito() {
    atualizarCidade({ distritos: [...(cidade.distritos || []), { id: `distrito_${Date.now()}`, nome: "", descricao: "", notas: "" }] });
  }
  function updateDistrito(id, key, value) {
    atualizarCidade({ distritos: (cidade.distritos || []).map((d) => (d.id === id ? { ...d, [key]: value } : d)) });
  }
  function removeDistrito(id, nome) {
    askConfirm(`Remover o distrito "${nome || "sem nome"}"? Essa ação não pode ser desfeita.`, () => {
      atualizarCidade({ distritos: (cidade.distritos || []).filter((d) => d.id !== id) });
    });
  }
  function addPessoa() {
    atualizarCidade({ pessoas: [...(cidade.pessoas || []), { id: `pessoa_${Date.now()}`, nome: "", papel: "", descricao: "", faccao: "", imageUrl: "", personagemId: "" }] });
  }
  function updatePessoa(id, key, value) {
    atualizarCidade({ pessoas: (cidade.pessoas || []).map((p) => (p.id === id ? { ...p, [key]: value } : p)) });
  }
  function removePessoa(id, nome) {
    askConfirm(`Remover "${nome || "essa pessoa"}" da lista? Essa ação não pode ser desfeita.`, () => {
      atualizarCidade({ pessoas: (cidade.pessoas || []).filter((p) => p.id !== id) });
    });
  }
  async function handlePickImage(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !cidade) return;
    setUploadError(null);
    setUploading(true);
    try {
      const url = await uploadPortrait(file, cidade.id);
      atualizarCidade({ imageUrl: url });
    } catch (err) {
      setUploadError(err.message || "Falha ao enviar a imagem.");
    } finally {
      setUploading(false);
    }
  }
  function handleRemoveImage() {
    removePortrait(cidade.imageUrl); // best-effort, não bloqueia a UI
    atualizarCidade({ imageUrl: "" });
  }

  if (!reino || !cidade) {
    return (
      <div>
        <p style={{ color: MUTED, fontSize: 13 }}>Essa cidade não existe mais.</p>
        <Btn onClick={onVoltarMundo}><ChevronLeft size={14} /> Voltar ao Mundo</Btn>
      </div>
    );
  }

  const distritos = cidade.distritos || [];
  const pessoas = cidade.pessoas || [];
  const temResumo = !!(cidade.resumo && cidade.resumo.trim());
  const temVisaoGeral = !!(cidade.visaoGeral && cidade.visaoGeral.trim());
  const abas = [
    { id: "geral", label: "Visão geral" },
    { id: "distritos", label: `Distritos (${distritos.length})` },
    { id: "pessoas", label: `Pessoas de interesse (${pessoas.length})` },
  ];

  return (
    <div>
      {/* Mundo > Katalão > Frontier — cada nível clicável, menos o atual. */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, fontSize: 12, flexWrap: "wrap", fontFamily: "'IBM Plex Mono', monospace" }}>
        <button onClick={onVoltarMundo} style={{ background: "transparent", border: "none", color: BRASS, cursor: "pointer", padding: 0 }}>Mundo</button>
        <ChevronRight size={11} color={MUTED} />
        <button onClick={onVoltarReino} style={{ background: "transparent", border: "none", color: BRASS, cursor: "pointer", padding: 0 }}>{reino.name}</button>
        <ChevronRight size={11} color={MUTED} />
        <span style={{ color: PARCHMENT }}>{cidade.name}</span>
      </div>

      {/* Barra roxa, mesmo estilo do cabeçalho da ficha de personagem. */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderRadius: 8,
        background: `linear-gradient(100deg, ${PURPLE} 0%, ${PURPLE_LIGHT} 100%)`, marginBottom: 16,
      }}>
        <button onClick={onVoltarReino} title="Voltar" style={{ background: "transparent", border: "none", cursor: "pointer", color: PURPLE_TEXT, display: "flex" }}>
          <ChevronLeft size={18} />
        </button>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 18, color: "#F0D98C", margin: 0, letterSpacing: 1 }}>{cidade.name}</h2>
          <div style={{ fontSize: 10.5, color: `${PURPLE_TEXT}AA`, fontFamily: "'IBM Plex Mono', monospace" }}>{reino.name}</div>
        </div>
        <div style={{ width: 18 }} />
      </div>

      {/* Nota informativa, não aviso de erro: essa cidade só ainda não ganhou
          um dossiê rico (texto longo, mapa de distritos, forças, NPCs) — o
          essencial abaixo já é editável normalmente, sem limitação nenhuma. */}
      {!CIDADE_INFO[cidade.id] && (
        <p style={{ fontSize: 11.5, color: MUTED, margin: "0 0 10px" }}>
          Ponto de partida desta cidade — edite o que quiser abaixo. (Um dossiê completo, com visão geral rica, distritos e NPCs, é opcional e pode ser adicionado depois.)
        </p>
      )}

      <SubAbas abas={abas} ativa={aba} setAtiva={setAba} />

      {aba === "geral" && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 16, alignItems: "start" }}>
          <div>
            <Field label="Epígrafe (frase curta sob o nome da cidade)">
              <input style={inputStyle} value={cidade.subtitulo || ""} onChange={(e) => atualizarCidade({ subtitulo: e.target.value })} placeholder="ex: A cidade sem lugar para quem chega" />
            </Field>
            <Field label="Resumo curto (aparece no modal do mapa e no hover)">
              <textarea style={{ ...inputStyle, minHeight: 50, resize: "vertical" }} value={cidade.resumo || ""} onChange={(e) => atualizarCidade({ resumo: e.target.value })} />
            </Field>
            <Field label="Visão geral">
              {/* Nunca pode aparecer vazia quando a cidade tem algum texto: se
                  `visaoGeral` ainda não foi escrita, mostra o `resumo` como
                  corpo (deixa claro que é o resumo, não um texto "perdido");
                  se os dois existem, resumo vem como parágrafo de abertura. */}
              {(temResumo || temVisaoGeral) ? (
                <div style={{ ...cardBox, marginBottom: 10 }}>
                  {temResumo && (
                    <p style={{ margin: temVisaoGeral ? "0 0 10px" : 0, fontSize: 14, lineHeight: 1.6, color: PARCHMENT }}>{cidade.resumo}</p>
                  )}
                  {temVisaoGeral && (
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: PARCHMENT, whiteSpace: "pre-wrap" }}>{cidade.visaoGeral}</p>
                  )}
                  {temResumo && !temVisaoGeral && (
                    <p style={{ margin: "8px 0 0", fontSize: 11.5, color: MUTED, fontStyle: "italic" }}>
                      Mostrando o resumo curto enquanto a Visão geral não é preenchida — escreva abaixo pra ter um texto próprio.
                    </p>
                  )}
                </div>
              ) : (
                <div style={{ ...cardBox, marginBottom: 10 }}>
                  <p style={{ margin: 0, fontSize: 13, color: MUTED }}>Nenhum texto ainda — escreva um resumo curto acima ou uma visão geral completa abaixo.</p>
                </div>
              )}
              <textarea
                style={{ ...inputStyle, minHeight: 140, resize: "vertical" }} value={cidade.visaoGeral || ""}
                placeholder="Escreva aqui uma visão geral mais longa (enquanto isso, o resumo curto acima aparece sozinho)."
                onChange={(e) => atualizarCidade({ visaoGeral: e.target.value })}
              />
            </Field>
            {cidade.link && (
              <div style={{ marginTop: 10 }}>
                <Btn variant="ghost" href={assetUrl(cidade.link)} target="_blank" rel="noopener" style={{ padding: "4px 8px", fontSize: 11 }}>
                  <ExternalLink size={12} /> Abrir guia dos jogadores numa página separada
                </Btn>
              </div>
            )}
          </div>
          <div style={{ width: 160 }}>
            <div style={{ width: 160, aspectRatio: "1", borderRadius: 8, background: PANEL_2, border: `1px solid ${LINE}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 8 }}>
              {cidade.imageUrl ? (
                <img src={cidade.imageUrl} alt={cidade.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; }} />
              ) : (
                <Landmark size={30} color={MUTED} />
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePickImage} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Btn onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Upload size={12} /> {uploading ? "Enviando..." : "Enviar imagem"}
              </Btn>
              {cidade.imageUrl && <Btn variant="ghost" onClick={handleRemoveImage}><X size={12} /> Remover</Btn>}
            </div>
            {uploadError && <p style={{ color: EMBER, fontSize: 11, margin: "6px 0 0" }}>{uploadError}</p>}
          </div>
        </div>
      )}

      {aba === "distritos" && (
        <div>
          {distritos.length === 0 && (
            <div style={{ ...cardBox, textAlign: "center", marginBottom: 12 }}>
              <p style={{ margin: "0 0 10px", fontSize: 13, color: MUTED }}>Nenhum distrito cadastrado ainda — distritos ajudam a organizar bairros, zonas ou pontos notáveis da cidade.</p>
              <Btn variant="primary" onClick={addDistrito}><Plus size={13} /> Adicionar distrito</Btn>
            </div>
          )}
          {distritos.length > 0 && (
            <>
              <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
                {distritos.map((d) => (
                  <div key={d.id} style={cardBox}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      <input style={{ ...inputStyle, fontWeight: 700 }} placeholder="Nome do distrito" value={d.nome || ""} onChange={(e) => updateDistrito(d.id, "nome", e.target.value)} />
                      <Btn variant="ghost" onClick={() => removeDistrito(d.id, d.nome)} aria-label={`Remover ${d.nome || "distrito"}`}><X size={13} /></Btn>
                    </div>
                    <textarea style={{ ...inputStyle, minHeight: 50, resize: "vertical", marginBottom: 8 }} placeholder="Descrição" value={d.descricao || ""} onChange={(e) => updateDistrito(d.id, "descricao", e.target.value)} />
                    <textarea style={{ ...inputStyle, minHeight: 40, resize: "vertical" }} placeholder="Notas (referência própria, ex: do mestre)" value={d.notas || ""} onChange={(e) => updateDistrito(d.id, "notas", e.target.value)} />
                  </div>
                ))}
              </div>
              <Btn onClick={addDistrito}><Plus size={13} /> Adicionar distrito</Btn>
            </>
          )}
        </div>
      )}

      {aba === "pessoas" && (
        <div>
          {pessoas.length === 0 && (
            <div style={{ ...cardBox, textAlign: "center", marginBottom: 12 }}>
              <p style={{ margin: "0 0 10px", fontSize: 13, color: MUTED }}>Nenhuma pessoa de interesse cadastrada ainda — não precisa de ficha completa, é só um registro leve (nome, papel, descrição).</p>
              <Btn variant="primary" onClick={addPessoa}><Plus size={13} /> Adicionar pessoa</Btn>
            </div>
          )}
          {pessoas.length > 0 && (
            <>
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", marginBottom: 12 }}>
                {pessoas.map((p) => {
                  const vinculado = personagemDaPessoa(p, characters);
                  return (
                    <div key={p.id} style={cardBox}>
                      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <input style={{ ...inputStyle, fontWeight: 700 }} placeholder="Nome" value={p.nome || ""} onChange={(e) => updatePessoa(p.id, "nome", e.target.value)} />
                        <Btn variant="ghost" onClick={() => removePessoa(p.id, p.nome)} aria-label={`Remover ${p.nome || "pessoa"}`}><X size={13} /></Btn>
                      </div>
                      <input style={{ ...inputStyle, marginBottom: 6 }} placeholder="Papel (ex: Chefe da Casa Brennard)" value={p.papel || ""} onChange={(e) => updatePessoa(p.id, "papel", e.target.value)} />
                      <input style={{ ...inputStyle, marginBottom: 6 }} placeholder="Facção" value={p.faccao || ""} onChange={(e) => updatePessoa(p.id, "faccao", e.target.value)} />
                      <textarea style={{ ...inputStyle, minHeight: 50, resize: "vertical", marginBottom: 6 }} placeholder="Descrição" value={p.descricao || ""} onChange={(e) => updatePessoa(p.id, "descricao", e.target.value)} />
                      <input style={{ ...inputStyle, marginBottom: 6 }} placeholder="URL da imagem (opcional)" value={p.imageUrl || ""} onChange={(e) => updatePessoa(p.id, "imageUrl", e.target.value)} />
                      <Field label="Vincular a um personagem (opcional)">
                        <select style={inputStyle} value={p.personagemId || ""} onChange={(e) => updatePessoa(p.id, "personagemId", e.target.value)}>
                          <option value="">— nenhum —</option>
                          {(characters || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </Field>
                      {vinculado && (
                        <Btn onClick={() => onAbrirFicha(vinculado.id)} style={{ marginTop: 8, width: "100%", justifyContent: "center" }}>
                          <Users size={13} /> Abrir ficha
                        </Btn>
                      )}
                    </div>
                  );
                })}
              </div>
              <Btn onClick={addPessoa}><Plus size={13} /> Adicionar pessoa</Btn>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function WorldView({ kingdoms, setKingdoms, askConfirm, gm, characters, cidadesOverrides, setCidadesOverrides, pessoasOverrides, setPessoasOverrides, onAbrirFicha }) {
  const [reinoId, setReinoId] = useState(null);
  const [abaReino, setAbaReino] = useState("geral");
  const [cidadeId, setCidadeId] = useState(null);
  const [popup, setPopup] = useState(null);
  const [newCity, setNewCity] = useState({});
  const [editandoMapa, setEditandoMapa] = useState(false);
  const [filtroRelacao, setFiltroRelacao] = useState("todos");
  const [genealogiasAbertas, setGenealogiasAbertas] = useState({});
  // Guardam só os ids (não os objetos) — assim sempre leem o dado mais
  // recente de `kingdoms`, mesmo depois de uma edição na própria página.
  const [cidadeMapaAberta, setCidadeMapaAberta] = useState(null); // { reinoId, cidadeId }
  const [cidadePaginaAberta, setCidadePaginaAberta] = useState(null); // { reinoId, cidadeId, abaInicial }
  // Aba inicial do dossiê completo (CidadeView) — kingdom.cities[] é só
  // geografia (x/y/resumo); o dossiê rico (CIDADE_INFO/FRONTIER) é um
  // conteúdo separado, ligado pelo id da cidade, não duplicado aqui.
  const [abaCidadeInicial, setAbaCidadeInicial] = useState("geral");

  // Botão "Visão geral"/"Distritos"/"Pessoas de interesse" do modal do mapa, e
  // o botão "Abrir cidade" da aba Cidades, chamam esta MESMA função — por
  // isso os dois caminhos sempre chegam na mesma tela pra uma mesma cidade.
  // Dossiê completo (CidadeView, com modo mestre/jogador, popups, mapa de
  // distritos, forças e NPCs) quando existir um pra esse id (CIDADE_INFO);
  // senão, a página leve (CidadePaginaView), só com o que kingdom.cities[] tem.
  function abrirCidade(rId, cId, abaModal) {
    setCidadeMapaAberta(null);
    if (CIDADE_INFO[cId]) {
      setCidadePaginaAberta(null);
      setReinoId(rId);
      setAbaReino("cidades");
      setCidadeId(cId);
      setAbaCidadeInicial(ABA_MODAL_PARA_DOSSIE[abaModal] || "geral");
    } else {
      setCidadePaginaAberta({ reinoId: rId, cidadeId: cId, abaInicial: abaModal });
    }
  }
  function voltarAoMundoDaPaginaCidade() {
    setCidadePaginaAberta(null);
    setReinoId(null);
  }
  function voltarAoReinoDaPaginaCidade() {
    if (cidadePaginaAberta) setReinoId(cidadePaginaAberta.reinoId);
    setAbaReino("cidades");
    setCidadePaginaAberta(null);
  }
  function voltarAoMundoDoDossie() {
    setCidadeId(null);
    setReinoId(null);
  }
  function voltarAoReinoDoDossie() {
    setCidadeId(null);
    setAbaReino("cidades");
  }

  const reino = kingdoms.find((k) => k.id === reinoId) || null;
  const info = reino ? REINO_INFO[reino.id] : null;

  function abrirReino(id) {
    setReinoId(id); setAbaReino("geral"); setCidadeId(null);
  }
  function addCity(kid) {
    const draft = newCity[kid];
    if (!draft?.name) return;
    setKingdoms((prev) => prev.map((k) => k.id === kid ? { ...k, cities: [...k.cities, { name: draft.name, resumo: draft.resumo || "" }] } : k));
    setNewCity((p) => ({ ...p, [kid]: { name: "", resumo: "" } }));
  }
  function removeCity(kid, idx, city) {
    askConfirm(`Remover a cidade "${city.name}"? Essa ação não pode ser desfeita.`, () => {
      setKingdoms((prev) => prev.map((k) => k.id === kid ? { ...k, cities: k.cities.filter((_, i) => i !== idx) } : k));
      // Cidade semente apagada de propósito entra numa lista de exclusões, pra
      // reposição automática (ver cidades.js) não trazer ela de volta.
      if (city.id && idsCidadesSemente(SEED_KINGDOMS).includes(city.id)) {
        (async () => {
          let lista = [];
          try {
            const rem = await storage.get("point-cidades-removidas");
            lista = rem?.value ? JSON.parse(rem.value) : [];
          } catch (e) { lista = []; }
          if (!Array.isArray(lista)) lista = [];
          if (!lista.includes(city.id)) lista.push(city.id);
          try { await storage.set("point-cidades-removidas", JSON.stringify(lista)); } catch (e) {}
        })();
      }
    });
  }
  function updateDescription(kid, value) {
    setKingdoms((prev) => prev.map((k) => k.id === kid ? { ...k, description: value } : k));
  }

  const cidadeInfo = cidadeId ? CIDADE_INFO[cidadeId] : null;
  // Edições do GM sobre o dossiê (mundoDados.js nunca é reescrito — ver
  // cidadeOverrides.js): overrideDaCidade é só os campos editados dessa
  // cidade; cidadeMesclada é o que a CidadeView de fato mostra (override
  // quando existir, senão o original).
  const overrideDaCidade = cidadeId ? (cidadesOverrides[cidadeId] || {}) : {};
  const cidadeMesclada = cidadeInfo ? mesclarCidadeComOverride(cidadeInfo, overrideDaCidade) : null;
  function editarCampoDossie(campo, valor) {
    setCidadesOverrides((prev) => ({ ...prev, [cidadeId]: { ...(prev[cidadeId] || {}), [campo]: valor } }));
  }
  function restaurarCampoDossie(campo) {
    setCidadesOverrides((prev) => {
      if (!prev[cidadeId]) return prev;
      const restante = { ...prev[cidadeId] };
      delete restante[campo];
      const novo = { ...prev };
      if (Object.keys(restante).length === 0) delete novo[cidadeId]; else novo[cidadeId] = restante;
      return novo;
    });
  }
  function editarCampoPessoas(reinoId, campo, valor) {
    setPessoasOverrides((prev) => ({ ...prev, [reinoId]: { ...(prev[reinoId] || {}), [campo]: valor } }));
  }
  function restaurarCampoPessoas(reinoId, campo) {
    setPessoasOverrides((prev) => {
      if (!prev[reinoId]) return prev;
      const restante = { ...prev[reinoId] };
      delete restante[campo];
      const novo = { ...prev };
      if (Object.keys(restante).length === 0) delete novo[reinoId]; else novo[reinoId] = restante;
      return novo;
    });
  }
  // "Pessoas do reino": mescla a semente (reino.pessoas) com a edição do GM
  // (pessoasOverrides, mesmo padrão não-destrutivo de cidadesOverrides — ver
  // pessoasReino.js) e resolve os grupos a mostrar (com estrutura, ou por
  // afiliação quando o reino não tem uma). A aba só aparece se houver algo
  // pra mostrar — reino sem nenhum personagem com essa faction continua OK.
  const overrideDePessoas = reino ? (pessoasOverrides?.[reino.id] || {}) : {};
  const pessoasMescladas = reino ? mesclarPessoasComOverride(reino.pessoas, overrideDePessoas) : null;
  const gruposPessoas = reino ? gruposDoReino(pessoasMescladas, characters, reino.name) : [];
  const abasReino = [
    { id: "geral", label: "Visão geral" },
    { id: "cidades", label: `Cidades (${reino?.cities?.length || 0})` },
    ...(info?.casas ? [{ id: "casas", label: "Casas" }] : []),
    ...(info?.etiquetas ? [{ id: "etiquetas", label: "Etiquetas" }] : []),
    ...(info?.mapa ? [{ id: "mapa", label: "Mapa do reino" }] : []),
    ...((reino?.pilares || []).length > 0 ? [{ id: "pilares", label: "Pilares" }] : []),
    ...(gruposPessoas.length > 0 ? [{ id: "pessoas", label: "Pessoas" }] : []),
    ...(gm && reino?.notasDoMestre ? [{ id: "notas", label: "Notas do mestre" }] : []),
  ];

  return (
    <div>
      {popup && <MundoPopup acao={popup} gm={gm} onClose={() => setPopup(null)} onAcao={setPopup} />}
      {cidadeMapaAberta && (() => {
        const reinoModal = kingdoms.find((k) => k.id === cidadeMapaAberta.reinoId);
        const cidadeModal = reinoModal ? (reinoModal.cities || []).find((c) => c.id === cidadeMapaAberta.cidadeId) : null;
        if (!reinoModal || !cidadeModal) return null; // cidade/reino removido nesse meio tempo — não quebra, só não mostra
        return (
          <MundoModal onClose={() => setCidadeMapaAberta(null)}>
            <div style={{ fontSize: 10.5, color: MUTED, fontFamily: "'IBM Plex Mono', monospace" }}>{reinoModal.name}</div>
            <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 19, margin: "4px 0 10px" }}>{cidadeModal.name}</h2>
            <p style={{ fontSize: 13.5, color: cidadeModal.resumo ? PARCHMENT : MUTED, lineHeight: 1.6, margin: "0 0 14px" }}>
              {cidadeModal.resumo || "Sem descrição ainda."}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn variant="primary" onClick={() => abrirCidade(reinoModal.id, cidadeModal.id, "geral")}>Visão geral</Btn>
              <Btn variant="primary" onClick={() => abrirCidade(reinoModal.id, cidadeModal.id, "distritos")}>Distritos</Btn>
              <Btn variant="primary" onClick={() => abrirCidade(reinoModal.id, cidadeModal.id, "pessoas")}>Pessoas de interesse</Btn>
            </div>
          </MundoModal>
        );
      })()}

      {cidadePaginaAberta ? (
        <CidadePaginaView
          kingdoms={kingdoms} setKingdoms={setKingdoms} askConfirm={askConfirm} characters={characters}
          reinoId={cidadePaginaAberta.reinoId} cidadeId={cidadePaginaAberta.cidadeId} abaInicial={cidadePaginaAberta.abaInicial}
          onVoltarMundo={voltarAoMundoDaPaginaCidade} onVoltarReino={voltarAoReinoDaPaginaCidade} onAbrirFicha={onAbrirFicha}
        />
      ) : (
      <>
      {!cidadeInfo && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <SectionTitle icon={MapIcon}>Mapa do Mundo</SectionTitle>
            <Btn
              variant={editandoMapa ? "primary" : "ghost"}
              onClick={() => setEditandoMapa((v) => !v)}
              style={{ marginBottom: 10 }}
            >
              <Pencil size={13} /> {editandoMapa ? "Sair da edição" : "Editar mapa"}
            </Btn>
          </div>
          <MapaMundoInterativo
            kingdoms={kingdoms} setKingdoms={setKingdoms} removeCity={removeCity}
            reinoAbertoId={reinoId} onAbrirReino={abrirReino}
            onAbrirCidade={(reino, cidade) => setCidadeMapaAberta({ reinoId: reino.id, cidadeId: cidade.id })}
            editando={editandoMapa}
          />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            {kingdoms.map((k) => (
              <button
                key={k.id} onClick={() => abrirReino(k.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20, cursor: "pointer",
                  border: `1px solid ${k.id === reinoId ? (FACTION_SEAL[k.name] || BRASS) : LINE}`,
                  background: k.id === reinoId ? `${FACTION_SEAL[k.name] || BRASS}22` : "transparent", color: PARCHMENT,
                  fontFamily: "'Cinzel', serif", fontSize: 12,
                }}
              >
                <Landmark size={13} color={FACTION_SEAL[k.name] || BRASS} /> {k.name}
              </button>
            ))}
          </div>
        </>
      )}

      {!reino && !cidadeInfo && <p style={{ color: MUTED, fontSize: 13 }}>Escolha um reino no mapa ou na lista.</p>}

      {reino && cidadeInfo && (
        <CidadeView
          cidade={cidadeMesclada} overrideAtivo={overrideDaCidade} onEditarCampo={editarCampoDossie} onRestaurarCampo={restaurarCampoDossie}
          kingdoms={kingdoms} setKingdoms={setKingdoms} reinoId={reino.id} cidadeId={cidadeId}
          gm={gm} nomeReino={reino.name} abaInicial={abaCidadeInicial}
          onVoltar={voltarAoReinoDoDossie} onVoltarMundo={voltarAoMundoDoDossie} onAcao={setPopup}
        />
      )}

      {reino && !cidadeInfo && (
        <div style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: 16, background: "#00000008" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <Landmark size={18} color={FACTION_SEAL[reino.name] || BRASS} />
            <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 20, margin: 0 }}>{reino.name}</h2>
          </div>
          <SubAbas abas={abasReino} ativa={abaReino} setAtiva={setAbaReino} />

          {abaReino === "geral" && (
            <div style={{ display: "grid", gap: 14 }}>
              {reino.imagem && (
                <img src={assetUrl(reino.imagem)} alt={`Suth`} style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 6, border: `1px solid ${LINE}` }} />
              )}
              {info && <RichText html={textoVisivel(info.visaoGeral, gm)} onAcao={setPopup} />}
              {!info && reino.visaoGeral && <RichText html={textoVisivel(reino.visaoGeral, gm)} onAcao={setPopup} />}
              <div>
                <div style={rotulo}>Anotações do reino (editável)</div>
                <textarea
                  style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
                  value={reino.description}
                  onChange={(e) => updateDescription(reino.id, e.target.value)}
                />
              </div>
              {reino.rebeliao && (
                <div style={cardBox}>
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: 15, marginBottom: 6 }}>{reino.rebeliao.titulo}</div>
                  <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>{reino.rebeliao.texto}</p>
                </div>
              )}
              {(reino.economia || []).length > 0 && (
                <div style={cardBox}>
                  <div style={rotulo}>Economia</div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.6 }}>
                    {(reino.economia || []).map((linha, i) => <li key={i}>{linha}</li>)}
                  </ul>
                </div>
              )}
              {(reino.relacoes || []).length > 0 && (
                <div style={cardBox}>
                  <div style={rotulo}>Relações exteriores</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {(reino.relacoes || []).map((r, i) => (
                      <div key={i}>
                        <b style={{ fontFamily: "'Cinzel', serif", fontSize: 13.5 }}>{r.reino}</b>
                        <span style={{ color: BRASS, fontSize: 11.5, fontFamily: "'IBM Plex Mono', monospace", marginLeft: 6 }}>{r.tipo}</span>
                        <div style={{ fontSize: 13, color: MUTED }}>{r.texto}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(reino.glossario || []).length > 0 && (
                <div style={cardBox}>
                  <div style={rotulo}>Glossário</div>
                  <div style={{ display: "grid", gap: 6 }}>
                    {(reino.glossario || []).map((g, i) => (
                      <div key={i} style={{ fontSize: 13.5 }}><b style={{ fontFamily: "'Cinzel', serif" }}>{g.termo}:</b> {g.texto}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {abaReino === "cidades" && (
            <div>
              {reino.cities.length === 0 && <p style={{ color: MUTED, fontSize: 13 }}>Nenhuma cidade cadastrada ainda.</p>}
              <div style={{ display: "grid", gap: 10 }}>
                {reino.cities.map((city, idx) => {
                  const temGuia = city.id && CIDADE_INFO[city.id];
                  return (
                    <div key={idx} style={{ ...cardBox, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 15, color: PARCHMENT, display: "flex", alignItems: "center", gap: 6 }}>
                          {city.name}
                          {city.documentada === false && (
                            <span style={{ fontSize: 9.5, color: MUTED, border: `1px solid ${LINE}`, borderRadius: 10, padding: "1px 6px", fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase" }}>Esboço</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12.5, color: MUTED }}>{city.resumo}</div>
                      </div>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        {temGuia && <Btn onClick={() => abrirCidade(reino.id, city.id, "geral")}><MapIcon size={13} /> Abrir cidade</Btn>}
                        <Btn variant="ghost" onClick={() => removeCity(reino.id, idx, city)} aria-label={`Remover ${city.name}`}><X size={13} /></Btn>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <input
                  style={inputStyle} placeholder="Nova cidade"
                  value={newCity[reino.id]?.name || ""}
                  onChange={(e) => setNewCity((p) => ({ ...p, [reino.id]: { ...p[reino.id], name: e.target.value } }))}
                />
                <input
                  style={inputStyle} placeholder="Descrição curta"
                  value={newCity[reino.id]?.resumo || ""}
                  onChange={(e) => setNewCity((p) => ({ ...p, [reino.id]: { ...p[reino.id], resumo: e.target.value } }))}
                />
                <Btn onClick={() => addCity(reino.id)}><Plus size={13} /></Btn>
              </div>
            </div>
          )}

          {abaReino === "casas" && info && (
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))" }}>
              {info.casas.map((c) => (
                <button key={c.id} onClick={() => setPopup({ tipo: "casa", id: c.id })} style={{ ...cardBox, textAlign: "left", cursor: "pointer", color: "inherit" }}>
                  <div style={{ fontSize: 10, color: BRASS, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase" }}>{c.tag}</div>
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: 14.5, margin: "2px 0" }}>{c.nome}</div>
                  <div style={{ fontSize: 12, color: MUTED }}>{c.papel}</div>
                </button>
              ))}
            </div>
          )}

          {abaReino === "etiquetas" && info && (
            <div>
              <p style={{ fontSize: 13.5, margin: "0 0 10px" }}>Todo morador usa no pescoço uma etiqueta de metal com <b>nome, sobrenome e brasão da casa</b>. O metal diz o lugar da casa no reino.</p>
              <div style={{ display: "grid", gap: 8 }}>
                {info.etiquetas.map((t) => (
                  <div key={t.metal} style={{ ...cardBox, display: "flex", gap: 12, alignItems: "center", padding: 10 }}>
                    <span aria-hidden="true" style={{ width: 44, height: 28, borderRadius: 14, background: t.cor, border: "1.5px solid #00000055", flexShrink: 0, boxShadow: "inset 0 1px 0 #FFFFFF70" }} />
                    <div><div style={{ fontFamily: "'Cinzel', serif", fontSize: 14 }}>{t.metal}</div><div style={{ fontSize: 12.5, color: MUTED }}>{t.texto}</div></div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginTop: 10 }}>
                {info.marcas.map(([t, d]) => (
                  <div key={t} style={{ border: `1px dashed ${BRASS}`, borderRadius: 6, padding: 10, fontSize: 13 }}><b style={{ fontFamily: "'Cinzel', serif" }}>{t}</b><br />{d}</div>
                ))}
              </div>
            </div>
          )}

          {abaReino === "mapa" && info && (
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
              <figure style={{ margin: 0 }}>
                <img src={assetUrl(info.mapa)} alt={`Mapa de ${reino.name}`} style={{ width: "100%", borderRadius: 6, border: `1px solid ${LINE}` }} />
                <figcaption style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>{info.mapaLegenda}</figcaption>
              </figure>
              {info.imagem && (
                <figure style={{ margin: 0 }}>
                  <img src={assetUrl(info.imagem)} alt={`Uma cidade de ${reino.name}`} style={{ width: "100%", borderRadius: 6, border: `1px solid ${LINE}` }} />
                  <figcaption style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>Referência visual de uma cidade de {reino.name}.</figcaption>
                </figure>
              )}
            </div>
          )}

          {abaReino === "pilares" && (
            <div style={{ display: "grid", gap: 14 }}>
              {(reino.pilares || []).map((pilar) => (
                <div key={pilar.id} style={cardBox}>
                  {pilar.imagem && (
                    <img src={assetUrl(pilar.imagem)} alt={pilar.nome} style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 6, marginBottom: 10, border: `1px solid ${LINE}` }} />
                  )}
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: 16, color: BRASS_BRIGHT }}>{pilar.nome}</div>
                  <div style={{ fontSize: 11.5, color: BRASS, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 8 }}>{pilar.lema}</div>
                  <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: "0 0 8px" }}>{pilar.resumo}</p>
                  {pilar.exercito && <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, margin: "0 0 10px" }}>{pilar.exercito}</p>}
                  {(pilar.relacoes || []).length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={rotulo}>Relações entre pilares</div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.5 }}>
                        {(pilar.relacoes || []).map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}
                  {(pilar.sucessao || []).length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={rotulo}>Sucessão</div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.5 }}>
                        {(pilar.sucessao || []).map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}
                  {(pilar.doutrina || []).length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={rotulo}>Doutrina</div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.5 }}>
                        {(pilar.doutrina || []).map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}
                  {(pilar.hierarquia || []).length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={rotulo}>Hierarquia</div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.5 }}>
                        {(pilar.hierarquia || []).map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}
                  {pilar.familiaImperial && (
                    <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, margin: "0 0 10px" }}>{pilar.familiaImperial}</p>
                  )}
                  {(pilar.lideres || []).length > 0 && (
                    <div>
                      <div style={rotulo}>Líderes</div>
                      <div style={{ display: "grid", gap: 6 }}>
                        {(pilar.lideres || []).map((lider, i) => {
                          const personagem = lider.personagem ? (characters || []).find((c) => c.id === lider.personagem) : null;
                          return (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <div>
                                <b style={{ fontFamily: "'Cinzel', serif", fontSize: 13.5 }}>{lider.nome}</b>
                                <div style={{ fontSize: 12, color: MUTED }}>{lider.cargo}</div>
                              </div>
                              {personagem && onAbrirFicha && (
                                <Btn variant="ghost" onClick={() => onAbrirFicha(personagem.id)} style={{ padding: "3px 8px", fontSize: 11 }}><Users size={12} /> Ver ficha</Btn>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {abaReino === "pessoas" && (
            <div style={{ display: "grid", gap: 18 }}>
              <BlocoEditavel
                gm={gm} temOverride={"estrutura" in overrideDePessoas} valorInicial={pessoasMescladas?.estrutura || { titulo: "", grupos: [] }}
                onSalvar={(v) => editarCampoPessoas(reino.id, "estrutura", v)} onRestaurar={() => restaurarCampoPessoas(reino.id, "estrutura")}
                renderLeitura={() => (
                  <div style={{ display: "grid", gap: 14 }}>
                    {pessoasMescladas?.estrutura?.titulo && (
                      <div style={{ fontFamily: "'Cinzel', serif", fontSize: 15, color: BRASS_BRIGHT }}>{pessoasMescladas.estrutura.titulo}</div>
                    )}
                    {gruposPessoas.map((grupo) => (
                      <div key={grupo.id}>
                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 14, marginBottom: 2 }}>{grupo.nome}</div>
                        {grupo.funcao && <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 8 }}>{grupo.funcao}</div>}
                        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))" }}>
                          {itensVisiveis(grupo.membros, gm).map((m, i) => (
                            <CardMembroReino key={m.personagemId || m.nomeLivre || i} membro={m} onAbrirFicha={onAbrirFicha} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                renderEdicao={(draft, setDraft) => (
                  <EditorEstruturaPessoas estrutura={draft} setEstrutura={setDraft} characters={characters} />
                )}
              />

              {(pessoasMescladas?.relacoes || []).length > 0 && (
                <div>
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: 14, marginBottom: 8 }}>Relações</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                    <button
                      onClick={() => setFiltroRelacao("todos")}
                      style={{
                        fontSize: 10.5, padding: "3px 9px", borderRadius: 20, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace",
                        border: `1px solid ${LINE}`, background: filtroRelacao === "todos" ? `${BRASS}33` : "transparent", color: PARCHMENT,
                      }}
                    >
                      Todos
                    </button>
                    {TIPOS_RELACAO.map((t) => (
                      <button
                        key={t.id} onClick={() => setFiltroRelacao(t.id)}
                        style={{
                          fontSize: 10.5, padding: "3px 9px", borderRadius: 20, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace",
                          border: `1px solid ${t.cor}`, background: filtroRelacao === t.id ? `${t.cor}33` : "transparent", color: t.cor,
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <BlocoEditavel
                    gm={gm} temOverride={"relacoes" in overrideDePessoas} valorInicial={pessoasMescladas?.relacoes || []}
                    onSalvar={(v) => editarCampoPessoas(reino.id, "relacoes", v)} onRestaurar={() => restaurarCampoPessoas(reino.id, "relacoes")}
                    renderLeitura={() => (
                      <div style={{ display: "grid", gap: 6 }}>
                        {itensVisiveis(pessoasMescladas?.relacoes, gm)
                          .filter((r) => filtroRelacao === "todos" || r.tipo === filtroRelacao)
                          .map((r, i) => (
                            <LinhaRelacao key={i} relacao={r} characters={characters} onAbrirFicha={onAbrirFicha} />
                          ))}
                      </div>
                    )}
                    renderEdicao={(draft, setDraft) => (
                      <EditorRelacoesPessoas relacoes={draft} setRelacoes={setDraft} characters={characters} />
                    )}
                  />
                </div>
              )}

              {(pessoasMescladas?.genealogias || []).length > 0 && (
                <div>
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: 14, marginBottom: 8 }}>Árvores genealógicas</div>
                  <BlocoEditavel
                    gm={gm} temOverride={"genealogias" in overrideDePessoas} valorInicial={pessoasMescladas?.genealogias || []}
                    onSalvar={(v) => editarCampoPessoas(reino.id, "genealogias", v)} onRestaurar={() => restaurarCampoPessoas(reino.id, "genealogias")}
                    renderLeitura={() => (
                      <div style={{ display: "grid", gap: 10 }}>
                        {itensVisiveis(pessoasMescladas?.genealogias, gm).map((genealogia) => {
                          const aberta = genealogiasAbertas[genealogia.id] !== false; // começa aberta
                          return (
                            <div key={genealogia.id} style={cardBox}>
                              <button
                                onClick={() => setGenealogiasAbertas((prev) => ({ ...prev, [genealogia.id]: !aberta }))}
                                style={{
                                  display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer",
                                  color: "inherit", padding: 0, fontFamily: "'Cinzel', serif", fontSize: 13.5, width: "100%", textAlign: "left",
                                }}
                              >
                                {aberta ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {genealogia.titulo}
                              </button>
                              {aberta && (
                                <div style={{ marginTop: 10 }}>
                                  <ArvoreGenealogica genealogia={genealogia} characters={characters} onAbrirFicha={onAbrirFicha} />
                                  {(genealogia.notas || []).length > 0 && (
                                    <div style={{ marginTop: 8 }}>
                                      {genealogia.notas.map((n, i) => (
                                        <p key={i} style={{ fontSize: 12, color: MUTED, fontStyle: "italic", margin: "2px 0" }}>{n}</p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    renderEdicao={(draft, setDraft) => (
                      <EditorGenealogiasPessoas genealogias={draft} setGenealogias={setDraft} characters={characters} />
                    )}
                  />
                </div>
              )}
            </div>
          )}

          {abaReino === "notas" && gm && (
            <div style={{ display: "grid", gap: 8 }}>
              <p style={{ fontSize: 11.5, color: MUTED, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", margin: 0 }}>Visível só pro mestre</p>
              {(reino.notasDoMestre || []).map((nota, i) => (
                <div key={i} style={cardBox}>
                  <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>{nota}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </>
      )}
    </div>
  );
}

/* --- Aba "Pessoas" do reino: card de membro, linha de relação, árvore
   genealógica (ver pessoasReino.js pros dados puros). --- */
export function CardMembroReino({ membro, onAbrirFicha }) {
  const personagem = membro.personagem;
  if (!personagem) {
    return (
      <div style={{ ...cardBox, padding: 10, opacity: 0.65, display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: "#00000030", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Users size={16} color={MUTED} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{membro.nomeLivre || "?"}</div>
          <div style={{ fontSize: 10.5, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{membro.cargo}</div>
          <div style={{ fontSize: 9.5, color: MUTED, fontStyle: "italic" }}>{membro.nota || "Dossiê pendente"}</div>
        </div>
      </div>
    );
  }
  return (
    <button
      onClick={() => onAbrirFicha && onAbrirFicha(personagem.id)}
      style={{ ...cardBox, padding: 10, textAlign: "left", cursor: "pointer", color: "inherit", display: "flex", gap: 8, alignItems: "center" }}
    >
      <Retrato character={personagem} size={36} borderRadius={8} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 12.5, color: PARCHMENT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{personagem.name}</div>
        <div style={{ fontSize: 10.5, color: BRASS, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{membro.cargo || personagem.epithet}</div>
      </div>
    </button>
  );
}

export function LinhaRelacao({ relacao, characters, onAbrirFicha }) {
  const info = infoTipoRelacao(relacao.tipo);
  const de = (characters || []).find((c) => c.id === relacao.de);
  const para = (characters || []).find((c) => c.id === relacao.para);
  const Chip = ({ personagem, id }) => (
    <button
      disabled={!personagem} onClick={() => personagem && onAbrirFicha && onAbrirFicha(personagem.id)}
      style={{
        fontSize: 11.5, padding: "2px 8px", borderRadius: 20, border: `1px solid ${LINE}`, background: "transparent",
        color: personagem ? PARCHMENT : MUTED, cursor: personagem ? "pointer" : "default", fontFamily: "'Cinzel', serif",
      }}
    >
      {personagem?.name || id}
    </button>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 12 }}>
      <Chip personagem={de} id={relacao.de} />
      <span style={{ color: info.cor, fontSize: 10.5, fontFamily: "'IBM Plex Mono', monospace", display: "flex", alignItems: "center", gap: 3 }}>
        <ChevronRight size={11} /> {info.label}
      </span>
      <Chip personagem={para} id={relacao.para} />
      {relacao.rotulo && <span style={{ color: MUTED, fontSize: 11.5 }}>— {relacao.rotulo}</span>}
    </div>
  );
}

function NoGenealogia({ no, characters, onAbrirFicha, x, y, width, height }) {
  const personagem = no?.personagemId ? (characters || []).find((c) => c.id === no.personagemId) : null;
  const nome = personagem?.name || no?.nome || "?";
  return (
    <foreignObject x={x} y={y} width={width} height={height}>
      <div
        title={no?.nota || ""}
        onClick={personagem ? () => onAbrirFicha && onAbrirFicha(personagem.id) : undefined}
        style={{
          width: width - 2, height: height - 2, boxSizing: "border-box", display: "flex", alignItems: "center", gap: 5, padding: "3px 6px",
          background: PANEL_2, border: `1px solid ${LINE}`, borderRadius: 6, cursor: personagem ? "pointer" : "default",
          opacity: personagem ? 1 : 0.75,
        }}
      >
        {personagem && <Retrato character={personagem} size={22} borderRadius={5} />}
        <span style={{ fontSize: 10, fontFamily: "'Cinzel', serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nome}</span>
      </div>
    </foreignObject>
  );
}

// Desenha a árvore em gerações (ver geracoesDaGenealogia em pessoasReino.js):
// pais acima, filhos abaixo, linha tracejada quando a ligação não é
// parentesco de sangue (criação, mentoria etc.). Rolagem horizontal própria
// pra não quebrar o layout em tela pequena.
export function ArvoreGenealogica({ genealogia, characters, onAbrirFicha }) {
  const geracoes = geracoesDaGenealogia(genealogia.nos, genealogia.ligacoes);
  const nodeW = 116, nodeH = 40, hGap = 14, vGap = 44, pad = 14;
  const maxPorLinha = Math.max(1, ...geracoes.map((g) => g.nos.length));
  const largura = pad * 2 + maxPorLinha * (nodeW + hGap) - hGap;
  const altura = pad * 2 + Math.max(1, geracoes.length) * (nodeH + vGap) - vGap;
  const posicoes = new Map();
  geracoes.forEach((linha, gi) => {
    linha.nos.forEach((id, i) => {
      posicoes.set(id, { x: pad + i * (nodeW + hGap), y: pad + gi * (nodeH + vGap), width: nodeW, height: nodeH });
    });
  });
  const nosPorId = new Map((genealogia.nos || []).map((n) => [n.id, n]));
  return (
    <div style={{ overflowX: "auto", border: `1px solid ${LINE}`, borderRadius: 8, padding: 8 }}>
      <svg width={largura} height={altura} style={{ display: "block", minWidth: largura }}>
        {(genealogia.ligacoes || []).map((lig, i) => {
          const filhoPos = posicoes.get(lig.filho);
          if (!filhoPos) return null;
          return (lig.pais || []).map((paiId, j) => {
            const paiPos = posicoes.get(paiId);
            if (!paiPos) return null;
            const x1 = paiPos.x + paiPos.width / 2, y1 = paiPos.y + paiPos.height;
            const x2 = filhoPos.x + filhoPos.width / 2, y2 = filhoPos.y;
            const midY = (y1 + y2) / 2;
            return (
              <g key={`${i}-${j}`}>
                <path
                  d={`M ${x1} ${y1} V ${midY} H ${x2} V ${y2}`} fill="none" stroke={LINE} strokeWidth={1.5}
                  strokeDasharray={lig.tracejado ? "4 3" : undefined}
                />
                <text x={(x1 + x2) / 2} y={midY - 3} fontSize={8} fill={MUTED} textAnchor="middle" fontFamily="'IBM Plex Mono', monospace">
                  {lig.tipo}
                </text>
              </g>
            );
          });
        })}
        {[...posicoes.entries()].map(([id, pos]) => {
          const no = nosPorId.get(id);
          if (!no) return null;
          return <NoGenealogia key={id} no={no} characters={characters} onAbrirFicha={onAbrirFicha} {...pos} />;
        })}
      </svg>
    </div>
  );
}

/* --- Edição GM de "Pessoas do reino": um editor por campo mesclável
   (estrutura/relacoes/genealogias — ver CAMPOS_MESCLAVEIS_PESSOAS em
   pessoasReino.js), usados dentro de BlocoEditavel. Mesmo estilo de forms do
   resto do app (EditorDeItensLista etc.): listas simples de adicionar/
   remover, nada de arrastar. */
function EditorEstruturaPessoas({ estrutura, setEstrutura, characters }) {
  const grupos = estrutura?.grupos || [];
  function atualizarGrupo(gi, patch) {
    setEstrutura((prev) => ({ ...prev, grupos: (prev.grupos || []).map((g, i) => (i === gi ? { ...g, ...patch } : g)) }));
  }
  function removerGrupo(gi) {
    setEstrutura((prev) => ({ ...prev, grupos: (prev.grupos || []).filter((_, i) => i !== gi) }));
  }
  function adicionarGrupo() {
    setEstrutura((prev) => ({ ...prev, grupos: [...(prev.grupos || []), { id: `grupo_${Date.now()}`, nome: "Novo grupo", funcao: "", membros: [] }] }));
  }
  function atualizarMembro(gi, mi, patch) {
    setEstrutura((prev) => ({
      ...prev,
      grupos: (prev.grupos || []).map((g, i) => (i !== gi ? g : { ...g, membros: (g.membros || []).map((m, j) => (j === mi ? { ...m, ...patch } : m)) })),
    }));
  }
  function removerMembro(gi, mi) {
    setEstrutura((prev) => ({
      ...prev,
      grupos: (prev.grupos || []).map((g, i) => (i !== gi ? g : { ...g, membros: (g.membros || []).filter((_, j) => j !== mi) })),
    }));
  }
  function adicionarMembro(gi) {
    setEstrutura((prev) => ({
      ...prev,
      grupos: (prev.grupos || []).map((g, i) => (i !== gi ? g : { ...g, membros: [...(g.membros || []), { nomeLivre: "Novo membro", cargo: "", ordem: (g.membros || []).length }] })),
    }));
  }
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <input
        style={inputStyle} placeholder="Título da estrutura (ex: Pilares do Império)"
        value={estrutura?.titulo || ""} onChange={(e) => setEstrutura((prev) => ({ ...prev, titulo: e.target.value }))}
      />
      {grupos.map((g, gi) => (
        <div key={g.id || gi} style={cardBox}>
          <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <input style={{ ...inputStyle, fontWeight: 700 }} placeholder="Nome do grupo" value={g.nome || ""} onChange={(e) => atualizarGrupo(gi, { nome: e.target.value })} />
            <Btn variant="ghost" onClick={() => removerGrupo(gi)} aria-label="Remover grupo"><X size={12} /></Btn>
          </div>
          <input style={{ ...inputStyle, marginBottom: 10 }} placeholder="Função do grupo" value={g.funcao || ""} onChange={(e) => atualizarGrupo(gi, { funcao: e.target.value })} />
          <div style={{ display: "grid", gap: 8 }}>
            {(g.membros || []).map((m, mi) => (
              <div key={mi} style={{ ...cardBox, padding: 8, background: PANEL }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                  <select
                    style={inputStyle} value={m.personagemId || ""}
                    onChange={(e) => atualizarMembro(gi, mi, e.target.value ? { personagemId: e.target.value, nomeLivre: undefined } : { personagemId: undefined, nomeLivre: m.nomeLivre || "" })}
                  >
                    <option value="">— nome livre (sem ficha) —</option>
                    {(characters || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <input
                    type="number" style={{ ...inputStyle, width: 64 }} placeholder="Ordem"
                    value={m.ordem ?? 0} onChange={(e) => atualizarMembro(gi, mi, { ordem: Number(e.target.value) })}
                  />
                  <Btn variant="ghost" onClick={() => removerMembro(gi, mi)} aria-label="Remover membro"><X size={11} /></Btn>
                </div>
                {!m.personagemId && (
                  <input style={{ ...inputStyle, marginBottom: 6 }} placeholder="Nome (sem ficha)" value={m.nomeLivre || ""} onChange={(e) => atualizarMembro(gi, mi, { nomeLivre: e.target.value })} />
                )}
                <input style={{ ...inputStyle, marginBottom: 6 }} placeholder="Cargo" value={m.cargo || ""} onChange={(e) => atualizarMembro(gi, mi, { cargo: e.target.value })} />
                {!m.personagemId && (
                  <input style={{ ...inputStyle, marginBottom: 6 }} placeholder="Nota (ex: Dossiê pendente)" value={m.nota || ""} onChange={(e) => atualizarMembro(gi, mi, { nota: e.target.value })} />
                )}
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: MUTED, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!m.soMestre} onChange={(e) => atualizarMembro(gi, mi, { soMestre: e.target.checked })} /> Só o mestre vê
                </label>
              </div>
            ))}
          </div>
          <Btn onClick={() => adicionarMembro(gi)} style={{ marginTop: 8, padding: "4px 10px", fontSize: 11 }}><Plus size={12} /> Adicionar membro</Btn>
        </div>
      ))}
      <Btn onClick={adicionarGrupo}><Plus size={13} /> Adicionar grupo</Btn>
    </div>
  );
}

function EditorRelacoesPessoas({ relacoes, setRelacoes, characters }) {
  const lista = relacoes || [];
  function atualizar(i, patch) { setRelacoes((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r))); }
  function remover(i) { setRelacoes((prev) => prev.filter((_, idx) => idx !== i)); }
  function adicionar() { setRelacoes((prev) => [...(prev || []), { de: "", para: "", tipo: TIPOS_RELACAO[0].id, rotulo: "" }]); }
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {lista.map((r, i) => (
        <div key={i} style={{ ...cardBox, padding: 10, display: "grid", gap: 6 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <select style={inputStyle} value={r.de || ""} onChange={(e) => atualizar(i, { de: e.target.value })}>
              <option value="">De...</option>
              {(characters || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select style={inputStyle} value={r.tipo || ""} onChange={(e) => atualizar(i, { tipo: e.target.value })}>
              {TIPOS_RELACAO.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <select style={inputStyle} value={r.para || ""} onChange={(e) => atualizar(i, { para: e.target.value })}>
              <option value="">Para...</option>
              {(characters || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <input style={inputStyle} placeholder="Rótulo (ex: mentora)" value={r.rotulo || ""} onChange={(e) => atualizar(i, { rotulo: e.target.value })} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: MUTED, cursor: "pointer" }}>
              <input type="checkbox" checked={!!r.soMestre} onChange={(e) => atualizar(i, { soMestre: e.target.checked })} /> Só o mestre vê
            </label>
            <Btn variant="ghost" onClick={() => remover(i)} aria-label="Remover relação"><X size={12} /></Btn>
          </div>
        </div>
      ))}
      <Btn onClick={adicionar}><Plus size={12} /> Adicionar relação</Btn>
    </div>
  );
}

function EditorGenealogiasPessoas({ genealogias, setGenealogias, characters }) {
  const lista = genealogias || [];
  function atualizarGenealogia(i, patch) { setGenealogias((prev) => prev.map((g, idx) => (idx === i ? { ...g, ...patch } : g))); }
  function removerGenealogia(i) { setGenealogias((prev) => prev.filter((_, idx) => idx !== i)); }
  function adicionarGenealogia() {
    setGenealogias((prev) => [...(prev || []), { id: `gen_${Date.now()}`, titulo: "Nova genealogia", nos: [], ligacoes: [], notas: [] }]);
  }
  function atualizarNo(gi, ni, patch) {
    setGenealogias((prev) => prev.map((g, i) => (i !== gi ? g : { ...g, nos: (g.nos || []).map((n, j) => (j === ni ? { ...n, ...patch } : n)) })));
  }
  function removerNo(gi, ni) {
    setGenealogias((prev) => prev.map((g, i) => (i !== gi ? g : { ...g, nos: (g.nos || []).filter((_, j) => j !== ni) })));
  }
  function adicionarNo(gi) {
    setGenealogias((prev) => prev.map((g, i) => (i !== gi ? g : { ...g, nos: [...(g.nos || []), { id: `no_${Date.now()}`, nome: "Novo nó" }] })));
  }
  function atualizarLigacao(gi, li, patch) {
    setGenealogias((prev) => prev.map((g, i) => (i !== gi ? g : { ...g, ligacoes: (g.ligacoes || []).map((l, j) => (j === li ? { ...l, ...patch } : l)) })));
  }
  function removerLigacao(gi, li) {
    setGenealogias((prev) => prev.map((g, i) => (i !== gi ? g : { ...g, ligacoes: (g.ligacoes || []).filter((_, j) => j !== li) })));
  }
  function adicionarLigacao(gi) {
    setGenealogias((prev) => prev.map((g, i) => (i !== gi ? g : { ...g, ligacoes: [...(g.ligacoes || []), { pais: [], filho: "", tipo: "" }] })));
  }
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {lista.map((g, gi) => (
        <div key={g.id || gi} style={cardBox}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input style={{ ...inputStyle, fontWeight: 700 }} placeholder="Título da genealogia" value={g.titulo || ""} onChange={(e) => atualizarGenealogia(gi, { titulo: e.target.value })} />
            <Btn variant="ghost" onClick={() => removerGenealogia(gi)} aria-label="Remover genealogia"><X size={12} /></Btn>
          </div>

          <div style={rotulo}>Nós</div>
          <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
            {(g.nos || []).map((n, ni) => (
              <div key={n.id || ni} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <input style={{ ...inputStyle, width: 90 }} placeholder="id do nó" value={n.id || ""} onChange={(e) => atualizarNo(gi, ni, { id: e.target.value })} />
                <select
                  style={inputStyle} value={n.personagemId || ""}
                  onChange={(e) => atualizarNo(gi, ni, e.target.value ? { personagemId: e.target.value, nome: undefined } : { personagemId: undefined, nome: n.nome || "" })}
                >
                  <option value="">— nome livre —</option>
                  {(characters || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {!n.personagemId && <input style={inputStyle} placeholder="Nome" value={n.nome || ""} onChange={(e) => atualizarNo(gi, ni, { nome: e.target.value })} />}
                <input style={inputStyle} placeholder="Nota (tooltip)" value={n.nota || ""} onChange={(e) => atualizarNo(gi, ni, { nota: e.target.value })} />
                <Btn variant="ghost" onClick={() => removerNo(gi, ni)} aria-label="Remover nó"><X size={11} /></Btn>
              </div>
            ))}
          </div>
          <Btn onClick={() => adicionarNo(gi)} style={{ fontSize: 11, marginBottom: 12 }}><Plus size={11} /> Adicionar nó</Btn>

          <div style={rotulo}>Ligações (filiação)</div>
          <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
            {(g.ligacoes || []).map((l, li) => (
              <div key={li} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  style={{ ...inputStyle, width: 140 }} placeholder="ids dos pais (vírgula)" value={(l.pais || []).join(",")}
                  onChange={(e) => atualizarLigacao(gi, li, { pais: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                />
                <select style={inputStyle} value={l.filho || ""} onChange={(e) => atualizarLigacao(gi, li, { filho: e.target.value })}>
                  <option value="">filho...</option>
                  {(g.nos || []).map((n) => <option key={n.id} value={n.id}>{n.id}</option>)}
                </select>
                <input style={inputStyle} placeholder="Tipo (ex: mãe e filha)" value={l.tipo || ""} onChange={(e) => atualizarLigacao(gi, li, { tipo: e.target.value })} />
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: MUTED, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!l.tracejado} onChange={(e) => atualizarLigacao(gi, li, { tracejado: e.target.checked })} /> Tracejado
                </label>
                <Btn variant="ghost" onClick={() => removerLigacao(gi, li)} aria-label="Remover ligação"><X size={11} /></Btn>
              </div>
            ))}
          </div>
          <Btn onClick={() => adicionarLigacao(gi)} style={{ fontSize: 11 }}><Plus size={11} /> Adicionar ligação</Btn>
        </div>
      ))}
      <Btn onClick={adicionarGenealogia}><Plus size={13} /> Adicionar genealogia</Btn>
    </div>
  );
}

/* --- Aba Personagens: NPCs por reino e cidade --- */
function NpcsMundoView({ gm, factionFilter }) {
  const [popup, setPopup] = useState(null);
  const grupos = npcsPorReinoECidade(NPCS);
  const nomeReino = (id) => (id === "katalao" ? "Katalão" : id);
  const visiveis = grupos.filter((r) => factionFilter === "Todos" || nomeReino(r.reino) === factionFilter);
  return (
    <div>
      {popup && <MundoPopup acao={popup} gm={gm} onClose={() => setPopup(null)} onAcao={setPopup} />}
      {visiveis.length === 0 && <p style={{ color: MUTED, fontSize: 13 }}>Nenhum NPC cadastrado para esse filtro.</p>}
      {visiveis.map((r) => (
        <div key={r.reino} style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Landmark size={15} color={FACTION_SEAL[nomeReino(r.reino)] || BRASS} />
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 16 }}>{nomeReino(r.reino)}</span>
          </div>
          {r.cidades.map((c) => (
            <div key={c.cidade} style={{ marginLeft: 6, paddingLeft: 12, borderLeft: `2px solid ${LINE}`, marginBottom: 12 }}>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13.5, color: BRASS_BRIGHT, marginBottom: 8 }}>{CIDADE_INFO[c.cidade]?.nome || c.cidade}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 10 }}>
                {c.npcs.map((n) => <NpcCard key={n.id} npc={n} gm={gm} onOpen={(id) => setPopup({ tipo: "npc", id })} />)}
              </div>
            </div>
          ))}
        </div>
      ))}
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
// Frase da capa por grupo (mesa), já que cada mesa tem o seu elenco e sua história.
const GRUPO_CHAMADA = {
  c: "Dossiês táticos, singularidades e o destino dos Cavaleiros de Omem, reunidos num só lugar.",
  aurora: "Os mercenários de Beltezu e a mesa paralela do Sidepoint — mesmo mundo, outra história.",
  suth: "Os Três Pilares do Império de Suth — Imperadora, Parteira e Santa, e as guerreiras que os sustentam.",
};

// Reinos que aparecem como quadradinhos na capa (mesma grafia das facções).
const REINOS_CAPA = ["Hetalion", "Katalão", "Maxis Power", "Suth", "Goethia", "Amaranth/Omem"];
const REINO_ID_POR_NOME = { "Hetalion": "hetalion", "Katalão": "katalao", "Maxis Power": "maxis", "Suth": "suth", "Goethia": "goethia", "Amaranth/Omem": "amaranth" };

function CoverView({ characters, onOpenGrupo, onOpenReino }) {
  const doGrupo = (gid) => characters.filter((c) => grupoDoPersonagem(c) === gid);
  // O Grupo C segue a ordem manual (líder e sub-líder primeiro) também nas miniaturas.
  const rosterC = GRUPO_C_ORDER
    .map((id) => characters.find((c) => c.id === id))
    .filter(Boolean)
    .concat(doGrupo("c").filter((c) => !GRUPO_C_ORDER.includes(c.id)));
  const roster = { c: rosterC, aurora: doGrupo("aurora") };

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
          Escolha uma mesa ou um reino para ver os personagens.
        </p>
      </div>

      {/* Mesas: um quadrado por grupo, leva para Personagens daquele grupo */}
      <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, letterSpacing: 1.5, textTransform: "uppercase", color: MUTED, marginBottom: 10 }}>Mesas</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 28 }}>
        {GRUPOS.map((g) => {
          const membros = roster[g.id] || doGrupo(g.id);
          return (
            <button
              key={g.id}
              onClick={() => onOpenGrupo(g.id)}
              style={{
                textAlign: "left", cursor: "pointer", color: "inherit", borderRadius: 10, padding: 18,
                minHeight: 170, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 14,
                background: `linear-gradient(160deg, ${g.cor}22 0%, ${PANEL_2} 70%)`, border: `1.5px solid ${g.cor}`,
                boxShadow: `0 2px 14px ${g.cor}22`,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {g.id === "c" ? <Crown size={18} color={g.cor} /> : <Swords size={18} color={g.cor} />}
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: 20, letterSpacing: 1, color: g.cor }}>{g.label}</span>
                </div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>{g.subtitulo}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ display: "flex" }}>
                  {membros.slice(0, 7).map((c, i) => (
                    <span key={c.id} title={c.name} style={{
                      width: 34, height: 34, borderRadius: "50%", marginLeft: i ? -8 : 0, overflow: "hidden",
                      border: `2px solid ${PANEL_2}`, display: "block",
                    }}>
                      <Retrato character={c} size={30} borderRadius="50%" iconSize={15} />
                    </span>
                  ))}
                </div>
                <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: MUTED, whiteSpace: "nowrap" }}>
                  {membros.length} personagens <ChevronRight size={12} style={{ verticalAlign: "middle" }} />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Reinos: quadradinhos que levam para Personagens filtrado pelo reino */}
      <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, letterSpacing: 1.5, textTransform: "uppercase", color: MUTED, marginBottom: 10 }}>Reinos</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
        {REINOS_CAPA.map((nome) => {
          const cor = FACTION_SEAL[nome] || BRASS;
          const pcs = characters.filter((c) => c.faction === nome).length;
          const npcs = NPCS.filter((n) => n.reino === REINO_ID_POR_NOME[nome]).length;
          return (
            <button
              key={nome}
              onClick={() => onOpenReino(nome)}
              style={{
                aspectRatio: "1 / 1", cursor: "pointer", color: "inherit", borderRadius: 8, padding: 10,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, textAlign: "center",
                background: PANEL_2, border: `1px solid ${LINE}`, borderTop: `3px solid ${cor}`,
              }}
            >
              <Landmark size={22} color={cor} />
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 13.5, color: PARCHMENT, lineHeight: 1.2 }}>{nome}</span>
              <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: MUTED }}>
                {pcs} {pcs === 1 ? "ficha" : "fichas"}{npcs ? ` · ${npcs} NPCs` : ""}
              </span>
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
        Sistema em uso agora: cada ficha tem 3 espaços pra essas habilidades (a tabela de 3 caixas na ficha). A Singularidade não ocupa espaço — fica acima, junto da Habilidade de Raça e das duas Classes. A maioria dispara sozinha quando um dado já rolado (Acerto ou Confirmação) bate um limiar ligado a um atributo — sem rolagem extra. O Mestre em Armadura é sempre ativa, sem limiar nenhum. Se duas pudessem disparar no mesmo dado, só a de maior prioridade ativa.
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
  // Edições do GM sobre o dossiê de uma cidade (conteúdo fixo em
  // mundoDados.js) — nunca reescreve mundoDados.js, fica num objeto separado
  // { [cidadeId]: { campo: valor } }, mesclado na hora de exibir (ver
  // cidadeOverrides.js e CidadeView em WorldView).
  const [cidadesOverrides, setCidadesOverrides] = useState({});
  // Edições do GM sobre "Pessoas do reino" (estrutura/relações/genealogias) —
  // mesmo padrão de cidadesOverrides: nunca reescreve o que foi semeado, fica
  // num objeto separado { [reinoId]: { campo: valor } }, mesclado na hora de
  // exibir (ver pessoasReino.js e a aba "Pessoas" em WorldView).
  const [pessoasOverrides, setPessoasOverrides] = useState({});
  const [gods, setGods] = useState(SEED_GODS);
  const [sagas, setSagas] = useState(SEED_SAGAS);
  const [objectives, setObjectives] = useState(SEED_OBJECTIVES);
  const [tab, setTab] = useState("home");
  const [subView, setSubView] = useState("list");
  const [selectedId, setSelectedId] = useState(null);
  const [editingChar, setEditingChar] = useState(null);
  const [factionFilter, setFactionFilter] = useState("Todos");
  const [grupoFilter, setGrupoFilter] = useState("c"); // abre no Grupo C (campanha principal)
  // Ver como Jogador ou GM: esconde/mostra o conteúdo do mestre no Mundo e
  // nos NPCs. Sem login por enquanto: qualquer um pode trocar. Fica salvo só
  // neste navegador; começa em Jogador.
  const [modoVisao, setModoVisaoState] = useState(() => {
    try { return normalizarModo(localStorage.getItem(CHAVE_MODO)); } catch (e) { return normalizarModo(null); }
  });
  const setModoVisao = (m) => {
    const v = normalizarModo(m);
    setModoVisaoState(v);
    try { localStorage.setItem(CHAVE_MODO, v); } catch (e) {}
  };
  const gm = modoVisao === "gm";
  const [loaded, setLoaded] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const backupInputRef = useRef(null);
  const seedCheckedRef = useRef(false);

  function askConfirm(message, action, options) {
    setConfirmState({ message, action, ...options });
  }

  // Blindagem contra repovoar o banco sem querer: se a tabela não tiver
  // point-characters (banco vazio — limpeza acidental, pausa longa do
  // projeto, migração) e o localStorage deste navegador tiver uma
  // quantidade plausível de personagens, pergunta antes de enviar — nunca
  // semeia silenciosamente (ver checkSeedOpportunity/commitSeedFromLocal em
  // storage.js, e a lógica de decisão em seedGuard.js). Recusar não semeia;
  // o ref garante que só pergunta uma vez por sessão (inclusive contra o
  // duplo-disparo do React.StrictMode em dev).
  useEffect(() => {
    if (seedCheckedRef.current) return;
    seedCheckedRef.current = true;
    (async () => {
      const opportunity = await checkSeedOpportunity();
      if (!opportunity) return;
      const { count } = opportunity;
      askConfirm(
        `O banco de dados do Supabase está vazio (sem personagens salvos). Este navegador tem ${count} personagem${count === 1 ? "" : "s"} salvo${count === 1 ? "" : "s"} localmente — enviar agora pra sincronizar com os outros aparelhos?`,
        () => { commitSeedFromLocal(); },
        { title: "Banco vazio — enviar dados locais?", confirmLabel: "Enviar", icon: Upload, tone: PURPLE }
      );
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const c = await storage.get("point-characters");
        if (c?.value) {
          const loadedChars = JSON.parse(c.value);
          // Migração de formato antigo -> novo (renomeia/remove ataques legados,
          // tipa ataques sem "tipo", repõe ataques padrão, corrige defaults de
          // Defesa/Resistência, atributos no formato antigo, Grupo/Raça+Classes,
          // `abilities` ausente, etc.) — extraída pra personagens.js, e chamada
          // via normalizarEstado tanto aqui quanto na importação de backup
          // (handleImportFile), pra um backup salvo num formato antigo não ficar
          // com campos em branco ou quebrar a UI quando restaurado.
          const migrated = normalizarEstado({ characters: loadedChars }).characters;
          // Reset de HP/MP/SP pedido nas sessões de revisão — roda só uma vez (marcado
          // por uma flag), pra não sobrescrever ajustes manuais feitos depois.
          // storage.get devolve undefined quando a chave não existe (ver storage.js),
          // então tratamos isso como "flag ainda não definida" = precisa resetar.
          let flagAlreadySet = false;
          try {
            const hpResetFlag = await storage.get("point-hp-reset-v1");
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
            try { await storage.set("point-hp-reset-v1", "done"); } catch (e) {}
          }
          // Sidepoint: repõe o grupo Aurora em quem já tinha personagens salvos, de
          // forma idempotente e por personagem (ver rationale em sidepoint.js).
          let apagadosDeProposito = [];
          try {
            const rem = await storage.get("point-sidepoint-removidos");
            apagadosDeProposito = rem?.value ? JSON.parse(rem.value) : [];
          } catch (e) { apagadosDeProposito = []; }
          finalChars = reporSidepoint(finalChars, SIDEPOINT_CHARACTERS, apagadosDeProposito);
          // Suth: mesma reposição idempotente por personagem (ver suth.js), e a
          // ficha nova do Fate é aplicada uma única vez (marcador no próprio
          // objeto, não depende de storage).
          let apagadosSuth = [];
          try {
            const remSuth = await storage.get("point-suth-removidos");
            apagadosSuth = remSuth?.value ? JSON.parse(remSuth.value) : [];
          } catch (e) { apagadosSuth = []; }
          finalChars = reporSidepoint(finalChars, SUTH_CHARACTERS, apagadosSuth);
          finalChars = aplicarFichaSuthDoFate(finalChars, FICHA_NOVA_FATE);
          // Goethia: mesma reposição idempotente por personagem — a Erin Genova
          // não entra aqui, ela já é semente do Grupo C (id "erin") e não recebeu
          // ficha nova (só enriquecemos Pessoas/relações do reino pra ela).
          let apagadosGoethia = [];
          try {
            const remGoethia = await storage.get("point-goethia-removidos");
            apagadosGoethia = remGoethia?.value ? JSON.parse(remGoethia.value) : [];
          } catch (e) { apagadosGoethia = []; }
          finalChars = reporSidepoint(finalChars, GOETHIA_CHARACTERS, apagadosGoethia);
          // Hetalion: mesma reposição idempotente por personagem.
          let apagadosHetalion = [];
          try {
            const remHetalion = await storage.get("point-hetalion-removidos");
            apagadosHetalion = remHetalion?.value ? JSON.parse(remHetalion.value) : [];
          } catch (e) { apagadosHetalion = []; }
          finalChars = reporSidepoint(finalChars, HETALION_CHARACTERS, apagadosHetalion);
          setCharacters(finalChars);
        }
      } catch (e) {}
      try {
        const k = await storage.get("point-kingdoms");
        if (k?.value) {
          // Cidades semente novas (ex: Frontier) entram em quem já tinha reinos
          // salvos, de forma idempotente e por cidade (ver rationale em cidades.js).
          let reinos = JSON.parse(k.value);
          // Cidades no formato antigo ({name, description}) ganham id/x/y/capital/
          // resumo/visaoGeral/distritos/pessoas sem perder nada — mesma função
          // (normalizarEstado, que por sua vez chama migrarCidades em mapaMundo.js)
          // usada na importação de backup, ver handleImportFile. Roda antes da
          // reposição de sementes pra elas já chegarem no formato novo também.
          reinos = normalizarEstado({ kingdoms: reinos }).kingdoms;
          let cidadesRemovidas = [];
          try {
            const rem = await storage.get("point-cidades-removidas");
            cidadesRemovidas = rem?.value ? JSON.parse(rem.value) : [];
          } catch (e) { cidadesRemovidas = []; }
          reinos = reporCidadesSemente(reinos, SEED_KINGDOMS, cidadesRemovidas);
          // Reino Suth/Goethia: preenche visão geral/rebelião/economia/relações/
          // glossário/notas do mestre só enquanto a descrição ainda for o
          // rascunho antigo — não sobrescreve edição já feita (preencherReinoSuth
          // é genérica, reusada aqui pra Goethia também, ver suth.js).
          reinos = preencherReinoSuth(reinos, DADOS_SUTH);
          reinos = preencherReinoSuth(reinos, DADOS_GOETHIA);
          reinos = preencherReinoSuth(reinos, DADOS_HETALION);
          // Pessoas do reino (estrutura/relações/genealogias): semeia só quem
          // ainda não tem `pessoas` — idempotente, não sobrescreve edição do
          // GM nem um conteúdo semeado antes (ver pessoasReino.js).
          reinos = reporPessoasDoReino(reinos, SEMENTES_PESSOAS_REINO);
          setKingdoms(reinos);
        }
      } catch (e) {}
      try {
        const ov = await storage.get("point-cidades-overrides");
        if (ov?.value) setCidadesOverrides(normalizarEstado({ cidadesOverrides: JSON.parse(ov.value) }).cidadesOverrides);
      } catch (e) {}
      try {
        const pov = await storage.get("point-pessoas-overrides");
        if (pov?.value) setPessoasOverrides(normalizarEstado({ pessoasOverrides: JSON.parse(pov.value) }).pessoasOverrides);
      } catch (e) {}
      try {
        const g = await storage.get("point-gods");
        if (g?.value) setGods(JSON.parse(g.value));
      } catch (e) {}
      try {
        const s = await storage.get("point-sagas");
        if (s?.value) setSagas(JSON.parse(s.value));
      } catch (e) {}
      try {
        const o = await storage.get("point-objectives");
        if (o?.value) setObjectives(JSON.parse(o.value));
      } catch (e) {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (loaded) storage.set("point-characters", JSON.stringify(characters)).catch(() => {}); }, [characters, loaded]);
  useEffect(() => { if (loaded) storage.set("point-kingdoms", JSON.stringify(kingdoms)).catch(() => {}); }, [kingdoms, loaded]);
  useEffect(() => { if (loaded) storage.set("point-cidades-overrides", JSON.stringify(cidadesOverrides)).catch(() => {}); }, [cidadesOverrides, loaded]);
  useEffect(() => { if (loaded) storage.set("point-pessoas-overrides", JSON.stringify(pessoasOverrides)).catch(() => {}); }, [pessoasOverrides, loaded]);
  useEffect(() => { if (loaded) storage.set("point-gods", JSON.stringify(gods)).catch(() => {}); }, [gods, loaded]);
  useEffect(() => { if (loaded) storage.set("point-sagas", JSON.stringify(sagas)).catch(() => {}); }, [sagas, loaded]);
  useEffect(() => { if (loaded) storage.set("point-objectives", JSON.stringify(objectives)).catch(() => {}); }, [objectives, loaded]);

  const filtered = useMemo(() => {
    const porGrupo = grupoFilter === "todos" ? characters : characters.filter((c) => grupoDoPersonagem(c) === grupoFilter);
    return factionFilter === "Todos" ? porGrupo : porGrupo.filter((c) => c.faction === factionFilter);
  }, [characters, grupoFilter, factionFilter]);

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
    // Personagem semente do Sidepoint apagado de propósito entra numa lista de
    // exclusões, pra reposição automática do grupo Aurora não trazer ele de volta.
    if (SIDEPOINT_CHARACTERS.some((ch) => ch.id === id)) {
      (async () => {
        let lista = [];
        try {
          const rem = await storage.get("point-sidepoint-removidos");
          lista = rem?.value ? JSON.parse(rem.value) : [];
        } catch (e) { lista = []; }
        if (!Array.isArray(lista)) lista = [];
        if (!lista.includes(id)) lista.push(id);
        try { await storage.set("point-sidepoint-removidos", JSON.stringify(lista)); } catch (e) {}
      })();
    }
    // Mesma lógica pra uma ficha semente do grupo Suth (o Fate não entra aqui:
    // ele não é uma semente do SUTH_CHARACTERS, é uma ficha atualizada do
    // Grupo C que não deveria ser excluída por essa lista).
    if (SUTH_CHARACTERS.some((ch) => ch.id === id)) {
      (async () => {
        let lista = [];
        try {
          const rem = await storage.get("point-suth-removidos");
          lista = rem?.value ? JSON.parse(rem.value) : [];
        } catch (e) { lista = []; }
        if (!Array.isArray(lista)) lista = [];
        if (!lista.includes(id)) lista.push(id);
        try { await storage.set("point-suth-removidos", JSON.stringify(lista)); } catch (e) {}
      })();
    }
    // Mesma lógica pra uma ficha semente do grupo Goethia (a Erin não entra
    // aqui: ela é semente do Grupo C, não do GOETHIA_CHARACTERS).
    if (GOETHIA_CHARACTERS.some((ch) => ch.id === id)) {
      (async () => {
        let lista = [];
        try {
          const rem = await storage.get("point-goethia-removidos");
          lista = rem?.value ? JSON.parse(rem.value) : [];
        } catch (e) { lista = []; }
        if (!Array.isArray(lista)) lista = [];
        if (!lista.includes(id)) lista.push(id);
        try { await storage.set("point-goethia-removidos", JSON.stringify(lista)); } catch (e) {}
      })();
    }
    // Mesma lógica pra uma ficha semente do grupo Hetalion.
    if (HETALION_CHARACTERS.some((ch) => ch.id === id)) {
      (async () => {
        let lista = [];
        try {
          const rem = await storage.get("point-hetalion-removidos");
          lista = rem?.value ? JSON.parse(rem.value) : [];
        } catch (e) { lista = []; }
        if (!Array.isArray(lista)) lista = [];
        if (!lista.includes(id)) lista.push(id);
        try { await storage.set("point-hetalion-removidos", JSON.stringify(lista)); } catch (e) {}
      })();
    }
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

  // Backup manual: agora que qualquer um com o link edita e apaga direto, sem
  // login, isso é a rede de segurança — baixa um .json com tudo (personagens +
  // reinos/deuses/sagas/objetivos) pra poder restaurar se algo for apagado.
  function handleExportBackup() {
    const backup = buildBackup({ characters, kingdoms, gods, sagas, objectives, cidadesOverrides, pessoasOverrides });
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `point-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(file) {
    if (!file) return;
    let data;
    try {
      data = parseBackup(await file.text());
    } catch (e) {
      askConfirm(e.message || "Não foi possível ler esse arquivo.", () => {}, { title: "Falha ao importar", confirmLabel: "OK", icon: X, tone: EMBER });
      return;
    }
    askConfirm(
      "Importar esse arquivo substitui todos os personagens e o resto dos dados (reinos, deuses, sagas, objetivos) pelo conteúdo do backup. Essa ação não pode ser desfeita.",
      () => {
        // Um backup pode ter sido baixado antes de uma migração existir (ex:
        // cidade ainda com `description`, personagem sem `abilities`) — aplica
        // a mesma normalização do carregamento normal (normalizarEstado, usada
        // também no useEffect de carregamento acima) pra não restaurar dado
        // com campo em branco ou formato que quebra a UI.
        const normalizado = normalizarEstado(data);
        setCharacters(normalizado.characters);
        setKingdoms(normalizado.kingdoms);
        setGods(normalizado.gods);
        setSagas(normalizado.sagas);
        setObjectives(normalizado.objectives);
        setCidadesOverrides(normalizado.cidadesOverrides);
        setPessoasOverrides(normalizado.pessoasOverrides);
      },
      { title: "Importar backup", confirmLabel: "Importar", icon: Upload, tone: PURPLE }
    );
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
        .point-nav { display: flex; gap: 4px; min-width: 0; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: thin; }
        .point-nav > button { flex-shrink: 0; white-space: nowrap; }
        @media (max-width: 1100px) {
          .point-header { padding: 12px 14px !important; }
          .point-nav { order: 3; flex: 1 1 100%; padding-bottom: 6px; }
        }
        @media (max-width: 600px) { .point-conteudo { padding: 14px !important; } }
        .mundo-rich p { margin: 0 0 8px; }
        .mundo-rich ul { margin: 0 0 8px; padding-left: 20px; }
        .mundo-rich button[data-term], .mundo-rich button[data-person] { border: none; background: none; padding: 0; font: inherit; color: #2F6D61; border-bottom: 1px dotted #2F6D61; cursor: pointer; }
        .mundo-grid2 { display: grid; gap: 14px; grid-template-columns: minmax(0,1fr) minmax(0,1fr); }
        @media (max-width: 760px) { .mundo-grid2 { grid-template-columns: minmax(0,1fr); } }
        .mapa-distritos svg { display: block; width: 100%; height: auto; }
        .mapa-distritos .region { cursor: pointer; }
        .mapa-distritos .region:hover .shape, .mapa-distritos .region:focus .shape { stroke: ${INK}; stroke-width: 2.5; }
      `}</style>

      <div className="point-header" style={{
        padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center",
        background: `linear-gradient(100deg, ${PURPLE} 0%, ${PURPLE_LIGHT} 100%)`,
        boxShadow: `0 2px 10px #00000030`,
        flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, letterSpacing: 2, color: "#F0D98C" }}>POINT</div>
          <div style={{ fontSize: 10.5, color: `${PURPLE_TEXT}AA`, letterSpacing: 1, fontFamily: "'IBM Plex Mono', monospace" }}>DOSSIÊS TÁTICOS · AMARANTH</div>
        </div>
        <nav className="point-nav" aria-label="Seções">
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
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <ModoVisaoToggle modo={modoVisao} setModo={setModoVisao} />
          <input
            ref={backupInputRef} type="file" accept="application/json" style={{ display: "none" }}
            onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; handleImportFile(file); }}
          />
          <button
            onClick={() => backupInputRef.current?.click()}
            title="Importar backup (.json) — substitui todos os dados atuais"
            style={{ background: "transparent", border: "none", cursor: "pointer", color: `${PURPLE_TEXT}88`, display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, fontFamily: "'IBM Plex Mono', monospace" }}
          >
            <Upload size={12} /> Importar
          </button>
          <button
            onClick={handleExportBackup}
            title="Baixar um backup .json com todos os dados (personagens, reinos, deuses, sagas, objetivos)"
            style={{ background: "transparent", border: "none", cursor: "pointer", color: `${PURPLE_TEXT}88`, display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, fontFamily: "'IBM Plex Mono', monospace" }}
          >
            <Download size={12} /> Backup
          </button>
        </div>
      </div>

      <div className="point-conteudo" style={{ padding: 24 }}>
        {tab === "home" && (
          <CoverView
            characters={characters}
            onOpenGrupo={(gid) => { setGrupoFilter(gid); setFactionFilter("Todos"); setTab("characters"); setSubView("list"); }}
            onOpenReino={(nome) => { setGrupoFilter("todos"); setFactionFilter(nome); setTab("characters"); setSubView("list"); }}
          />
        )}

        {tab === "objectives" && <ObjectivesView objectives={objectives} setObjectives={setObjectives} askConfirm={askConfirm} />}

        {tab === "characters" && subView === "list" && (
          <div>
            {/* Seletor de GRUPO (mesa) — separa o Grupo C do Grupo Aurora */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              {[...GRUPOS, { id: "todos", label: "Todos", subtitulo: "As duas mesas juntas", cor: MUTED }, { id: "npcs", label: "NPCs do mundo", subtitulo: "Por reino e cidade", cor: "#2F6D61" }].map((g) => {
                const ativo = grupoFilter === g.id;
                const qtd = g.id === "todos" ? characters.length : g.id === "npcs" ? NPCS.length : characters.filter((c) => grupoDoPersonagem(c) === g.id).length;
                return (
                  <button
                    key={g.id}
                    onClick={() => { setGrupoFilter(g.id); setFactionFilter("Todos"); }}
                    style={{
                      textAlign: "left", cursor: "pointer", borderRadius: 8, padding: "9px 14px",
                      border: `1px solid ${ativo ? g.cor : LINE}`,
                      background: ativo ? `${g.cor}1E` : "transparent", color: "inherit",
                    }}
                  >
                    <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13.5, letterSpacing: 0.8, color: ativo ? g.cor : PARCHMENT }}>
                      {g.label} <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: MUTED }}>({qtd})</span>
                    </div>
                    <div style={{ fontSize: 10, color: MUTED }}>{g.subtitulo}</div>
                  </button>
                );
              })}
            </div>

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
              {grupoFilter !== "npcs" && (
                <Btn variant="primary" onClick={() => { setEditingChar(emptyCharacter()); setSubView("form"); }}>
                  <Plus size={14} /> Nova Ficha
                </Btn>
              )}
            </div>

            {grupoFilter === "npcs" && <NpcsMundoView gm={gm} factionFilter={factionFilter} />}

            {grupoFilter !== "npcs" && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 14 }}>
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
                    <Retrato character={c} size={40} borderRadius={8} iconSize={20} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: "'Cinzel', serif", fontSize: 14, color: PARCHMENT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: BRASS, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.epithet}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 10.5, color: FACTION_SEAL[c.faction] || BRASS, fontFamily: "'IBM Plex Mono', monospace" }}>{c.faction}</div>
                </button>
              ))}
            </div>}

            {/* Vindo de um reino (capa ou filtro): mostra também os NPCs daquele reino, por cidade */}
            {grupoFilter === "todos" && factionFilter !== "Todos" && NPCS.some((n) => n.reino === REINO_ID_POR_NOME[factionFilter]) && (
              <div style={{ marginTop: 22 }}>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, letterSpacing: 1.5, textTransform: "uppercase", color: MUTED, marginBottom: 10 }}>NPCs de {factionFilter}</div>
                <NpcsMundoView gm={gm} factionFilter={factionFilter} />
              </div>
            )}
            {grupoFilter !== "npcs" && filtered.length === 0 && (
              <p style={{ color: MUTED, fontSize: 13, fontStyle: "italic" }}>Nenhuma ficha de personagem neste filtro.</p>
            )}
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
        {tab === "world" && (
          <WorldView
            kingdoms={kingdoms} setKingdoms={setKingdoms} askConfirm={askConfirm} gm={gm}
            characters={characters}
            cidadesOverrides={cidadesOverrides} setCidadesOverrides={setCidadesOverrides}
            pessoasOverrides={pessoasOverrides} setPessoasOverrides={setPessoasOverrides}
            onAbrirFicha={(characterId) => { setSelectedId(characterId); setTab("characters"); setSubView("detail"); }}
          />
        )}
        {tab === "gods" && <GodsView gods={gods} setGods={setGods} askConfirm={askConfirm} />}
        {tab === "sagas" && <SagasView sagas={sagas} setSagas={setSagas} askConfirm={askConfirm} />}
      </div>

      {confirmState && (
        <ConfirmDialog
          message={confirmState.message}
          title={confirmState.title}
          confirmLabel={confirmState.confirmLabel}
          icon={confirmState.icon}
          tone={confirmState.tone}
          onCancel={() => setConfirmState(null)}
          onConfirm={() => { confirmState.action(); setConfirmState(null); }}
        />
      )}
    </div>
  );
}
