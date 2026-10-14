// Migração de personagens — funções puras, sem depender de storage nem de
// React, pra poder ser testada isolada (ver personagens.test.js) e reutilizada
// tanto no carregamento normal do app quanto na importação de um backup
// (ver backup.js e handleImportFile em point-amaranth-app.jsx). Não duplique
// esta lógica em nenhum dos dois lugares — chame migrarPersonagens.

import {
  BASE_ATTACK_TYPES, STAT_BASE_DEFAULTS, ATRIBUTOS_GERAIS_DEFAULT, PROFICIENCIAS_DEFAULT,
  migrateBrigaProfKey, defaultAttacksForCharacter, MAX_PROCS, computeMaxHP, computeMaxSP,
} from "./engine.js";
import { grupoDoPersonagem } from "./sidepoint.js";
import { migrarSelecaoRacaLegado } from "./racasCatalogo.js";
import { DISCIPLINAS, MAX_DISCIPLINAS } from "./data/magias.js";

const NAME_ALIASES = { soco: "Ataque desarmado", mosquetão: "Mosquete", mosquetao: "Mosquete" };
const REMOVED_NAMES = new Set(["chute"]);
const OLD_DEFAULT_DEFESA = new Set([0, 5, undefined]);
const OLD_DEFAULT_RESIST_ARMADURA = new Set([7, undefined]);

// Ids antigos (13/10-14/10, checkbox solto disciplinaMagica.oficiosMagicos)
// -> ids novos do catálogo DISCIPLINAS (data/magias.js, 14/10 — docs/
// DISCIPLINAS_MAGIA.md).
const OFICIO_ID_LEGADO_PARA_NOVO = {
  "magias-de-guerra": "oficio-magias-de-guerra",
  "encantamentos": "oficio-encantamentos",
  "alquimia": "oficio-alquimia",
  "constructo": "oficio-constructo",
};

// Tenta casar o nome de uma Classe antiga (texto livre, ex.: "Duelista de
// Estoc") com uma disciplina do catálogo atual — comparação por nome exato,
// sem acento/maiúscula, ou pelo nome sem o prefixo "Ofício Mágico: ". Hoje o
// catálogo só tem disciplinas mágicas (Magias de guerra/Encantamentos/
// Alquimia/Constructo/Magia Inata), então a grande maioria das Classes
// (nomes de ofício/narrativa comuns, ex. "Duelista de Estoc") não bate com
// nada — fica sem disciplina correspondente, mesmo não sendo apagada de
// `character.classes` (ver migrarPersonagem).
function normalizarNomeClasse(s) {
  return (s || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}
function casarClasseComDisciplina(nomeClasse) {
  const alvo = normalizarNomeClasse(nomeClasse);
  if (!alvo) return null;
  return DISCIPLINAS.find((d) => {
    const nomeCompleto = normalizarNomeClasse(d.nome);
    const nomeSemPrefixo = normalizarNomeClasse(d.nome.replace(/^Ofício Mágico:\s*/i, ""));
    return alvo === nomeCompleto || alvo === nomeSemPrefixo;
  }) || null;
}

// Migra pro novo modelo de Disciplinas (até MAX_DISCIPLINAS slots — docs/
// DISCIPLINAS_MAGIA.md, 14/10): já no formato novo (`ch.disciplinas`), só
// normaliza o tamanho do array (preenche/corta pra exatamente 3 slots,
// descarta disciplinaId desconhecido). Senão, monta a partir de fontes
// antigas, nesta ordem de prioridade (quando ultrapassa os 3 slots, o que
// não couber fica de fora — sem indicação de qual era "principal" nos dados
// antigos, essa ordem é minha escolha, reportada no relatório final):
// 1) disciplinaMagica.oficiosMagicos (13/10-14/10) — ids remapeados;
// 2) disciplinaMagica.magiaInata (flag) — vira o slot "magia-inata";
// 3) Classes (texto livre, ch.classes) cujo nome bate com uma disciplina do
//    catálogo atual (ver casarClasseComDisciplina) — hoje praticamente
//    nunca bate, já que o catálogo só tem disciplinas mágicas.
// As magias equipadas salvas em disciplinaMagica.magiasAtivas (lista única,
// compartilhada entre todos os ofícios no modelo antigo) são atribuídas ao
// primeiro slot que `temMagias` (preferindo magias-de-guerra, depois magia
// inata) — o modelo novo é por disciplina, então não há como saber de qual
// ofício cada magia salva "era" no formato antigo.
function migrarDisciplinas(ch) {
  if (Array.isArray(ch.disciplinas)) {
    const normalizado = [0, 1, 2].map((i) => {
      const slot = ch.disciplinas[i];
      if (!slot || !slot.disciplinaId) return null;
      const def = DISCIPLINAS.find((d) => d.id === slot.disciplinaId);
      if (!def) return null; // disciplinaId desconhecido (catálogo mudou) — descarta o slot
      return { disciplinaId: slot.disciplinaId, habilidadesAtivas: Array.isArray(slot.habilidadesAtivas) ? slot.habilidadesAtivas.slice(0, def.magiasAtivasMax || 3) : [] };
    });
    return normalizado;
  }
  const slots = [];
  const disciplinaMagicaSalva = ch.disciplinaMagica || {};
  const magiasAtivasSalvas = Array.isArray(disciplinaMagicaSalva.magiasAtivas) ? disciplinaMagicaSalva.magiasAtivas : [];
  for (const oficioIdLegado of (disciplinaMagicaSalva.oficiosMagicos || [])) {
    const novoId = OFICIO_ID_LEGADO_PARA_NOVO[oficioIdLegado];
    if (novoId && !slots.some((s) => s.disciplinaId === novoId) && slots.length < MAX_DISCIPLINAS) {
      slots.push({ disciplinaId: novoId, habilidadesAtivas: [] });
    }
  }
  if ((disciplinaMagicaSalva.magiaInata ?? disciplinaMagicaSalva.tipo === "magia-inata") && !slots.some((s) => s.disciplinaId === "magia-inata") && slots.length < MAX_DISCIPLINAS) {
    slots.push({ disciplinaId: "magia-inata", habilidadesAtivas: [] });
  }
  for (const classe of (Array.isArray(ch.classes) ? ch.classes : [])) {
    if (slots.length >= MAX_DISCIPLINAS) break;
    const def = casarClasseComDisciplina(classe?.name);
    if (def && !slots.some((s) => s.disciplinaId === def.id)) slots.push({ disciplinaId: def.id, habilidadesAtivas: [] });
  }
  const slotComMagias = slots.find((s) => s.disciplinaId === "oficio-magias-de-guerra") || slots.find((s) => DISCIPLINAS.find((d) => d.id === s.disciplinaId)?.temMagias);
  if (slotComMagias && magiasAtivasSalvas.length > 0) {
    const def = DISCIPLINAS.find((d) => d.id === slotComMagias.disciplinaId);
    slotComMagias.habilidadesAtivas = magiasAtivasSalvas.slice(0, def?.magiasAtivasMax || 3);
  }
  while (slots.length < MAX_DISCIPLINAS) slots.push(null);
  return slots;
}

function migrateAttributes(attrs) {
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
}

// Migração automática e não-destrutiva de UM personagem:
// 1) renomeia "Soco"→"Ataque desarmado" e "Mosquetão"→"Mosquete" (nomes antigos),
//    e ajusta o Mosquetão/Revólver salvos para os novos valores de Acerto/Dano;
// 2) remove "Chute" (agora redundante, já coberto por "Ataque desarmado");
// 3) em ataques salvos no formato antigo (sem "tipo", com atributoBase/zona),
//    identifica pelo nome e preenche o "tipo" correto (ou "marcial" se for
//    um ataque customizado desconhecido);
// 4) preenche ataques padrão (Ataque desarmado/Arma branca/Revólver/Shin) em quem foi
//    salvo antes dessa funcionalidade existir;
// 5) corrige a base de Defesa (era 0, agora 5) e Resistência Natural (era 2 ou 6,
//    agora 1, e agora dividida em Física/Mágica) pra quem ainda estava no valor
//    padrão antigo — não mexe em quem já tinha um valor diferente (provavelmente
//    editado manualmente);
// 6) adiciona o item "Armadura física" em quem não tiver nenhuma armadura
//    cadastrada em Itens — necessário pra Resistência Armadura contar no combate;
// 7) converte atributos do formato antigo (Força/Percepção/Agilidade/Resistência/
//    Inteligência/Determinação) pro novo formato Fire-Emblem-like;
// 8) a Proficiência "Briga" foi eliminada: Ataque desarmado passou a usar
//    Combate Corpo a Corpo, como qualquer outro ataque marcial;
// 9) Grupo (Grupo C / Grupo Aurora) e a tabela de Raça + Classes em quem foi
//    salvo antes desses campos existirem;
// 10) "Resumo de Poder" legado: fichas salvas antes do campo `abilities` existir
//     não têm essa lista — sem isso, o CharacterForm quebrava com tela branca
//     ao tentar .map() em undefined.
// 11) Sistema de magia/combate (13/10, docs/SISTEMA_MAGIA.md): a proficiência
//     "Técnica" (tecnicaProf) virou "Manipulação de Mana" (manipulacaoManaProf);
//     Resistência Natural (Física/Mágica) saiu do statBase — a defesa agora é
//     a rolagem ativa de Resistência Física/Mágica, sem base numérica fixa.
//     hp.superficiais (contador de pontos de HP com ferimento superficial
//     ainda não quebrado) nasce em 0 pra quem não tiver.
// 12) Mudanças de 14/10 (docs/MUDANCAS_RACAS_E_MAGIA.md): as proficiências
//     Magias Ofensivas, Resistência Mágica e Manipulação de Mana (ex-Técnica,
//     item 11 acima) deixaram de existir — grau salvo nelas é descartado (não
//     há mais pra onde migrar, a defesa virou só Resistência Física e o pool
//     mágico passou a usar Ofícios Mágicos/Inteligência).
// 13) Disciplinas (docs/DISCIPLINAS_MAGIA.md, 14/10, mesmo dia): o antigo
//     checkbox solto disciplinaMagica.oficiosMagicos/magiaInata/magiasAtivas
//     (13/10-14/10) e o antigo painel "Classes" (texto livre, antes disso)
//     viram `character.disciplinas` — até 3 slots escolhidos do catálogo
//     DISCIPLINAS (ver migrarDisciplinas acima pra prioridade/limites).
//     `character.disciplinaMagica` não é mais um campo salvo — vira sempre
//     DERIVADO de `character.disciplinas` por racasCatalogo.js:
//     comGrausEfetivos, nunca lido direto daqui em diante.
export function migrarPersonagem(ch) {
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
  const semBriga = migrateBrigaProfKey(renamedAttacks);
  const fixedAttacks = semBriga.map((atk) => {
    if (atk.tipo) return atk;
    const base = BASE_ATTACK_TYPES.find((t) => t.nome.trim().toLowerCase() === (atk.nome || "").trim().toLowerCase());
    return { ...atk, tipo: base?.tipo || "marcial" };
  });
  const existingNames = new Set(fixedAttacks.map((a) => (a.nome || "").trim().toLowerCase()));
  const missing = ch.fichaFechada ? [] : defaultAttacksForCharacter().filter((a) => {
    const nomeLower = a.nome.trim().toLowerCase();
    if (existingNames.has(nomeLower)) return false;
    if (isAlmah && nomeLower === "ataque desarmado") return false; // não repor pra Almah
    return true;
  });
  const statBase = { ...(ch.statBase || {}) };
  if (OLD_DEFAULT_DEFESA.has(statBase.defesa)) statBase.defesa = STAT_BASE_DEFAULTS.defesa;
  if (OLD_DEFAULT_RESIST_ARMADURA.has(statBase.resistArmadura)) statBase.resistArmadura = STAT_BASE_DEFAULTS.resistArmadura;
  // Resistência Natural não existe mais (docs/SISTEMA_MAGIA.md): defesa agora é
  // só a rolagem ativa de Resistência Física/Mágica, sem base numérica.
  delete statBase.resistNatural;
  delete statBase.resistNaturalFisica;
  delete statBase.resistNaturalMagica;
  const itensArmadura = (ch.itens?.armadura || []);
  const itens = (itensArmadura.length > 0 || ch.fichaFechada) ? ch.itens : { ...(ch.itens || { usaveis: [], principais: [] }), armadura: ["Armadura física"] };
  const attributes = migrateAttributes(ch.attributes);
  const procs = Array.isArray(ch.procs) ? ch.procs.slice(0, MAX_PROCS) : [];
  const atributosGerais = { ...ATRIBUTOS_GERAIS_DEFAULT, ...(ch.atributosGerais || {}) };
  // "Técnica" (tecnicaProf) virou "Manipulação de Mana" (manipulacaoManaProf),
  // mantendo o grau já salvo — ver docs/SISTEMA_MAGIA.md. Precisa checar o
  // objeto original (ch.proficiencias), antes do merge com PROFICIENCIAS_DEFAULT
  // preencher manipulacaoManaProf com o grau-padrão "E" e mascarar o "ausente".
  const proficienciasSalvas = { ...(ch.proficiencias || {}) };
  if (proficienciasSalvas.tecnicaProf !== undefined && proficienciasSalvas.manipulacaoManaProf === undefined) {
    proficienciasSalvas.manipulacaoManaProf = proficienciasSalvas.tecnicaProf;
  }
  delete proficienciasSalvas.tecnicaProf;
  const proficiencias = { ...PROFICIENCIAS_DEFAULT, ...proficienciasSalvas };
  delete proficiencias.briga; // proficiencia eliminada do sistema
  // 14/10 (docs/MUDANCAS_RACAS_E_MAGIA.md): Magias Ofensivas, Resistência
  // Mágica e Manipulação de Mana saíram do sistema — grau salvo é descartado.
  delete proficiencias.magiasOfensivas;
  delete proficiencias.resistMagicaProf;
  delete proficiencias.manipulacaoManaProf;
  // Disciplinas (item 13 acima) — ver migrarDisciplinas.
  const disciplinas = migrarDisciplinas(ch);
  const grupo = ch.grupo || grupoDoPersonagem(ch);
  const racialAbility = ch.racialAbility || { name: "", description: "" };
  const classesSalvas = Array.isArray(ch.classes) ? ch.classes : [];
  const classes = [0, 1].map((i) => classesSalvas[i] || { name: "", description: "" });
  const abilities = Array.isArray(ch.abilities) ? ch.abilities : [];
  // Raça/habilidades do catálogo (catalogo-racas.json): migra o esquema antigo
  // (racaId/habilidadePrincipalId/habilidadeSecundariaId, PR #30/#31) pro novo
  // quando a ficha ainda não tiver os campos novos — ver racasCatalogo.js.
  const { raca, habilidadePrincipal, habilidadeSecundaria, disciplinaHumano, descritores, bonusGrauEscolha } = migrarSelecaoRacaLegado(ch);
  // hp/mp/sp: toda ficha criada pelo app (semente, "Nova Ficha", Sidepoint) já
  // nasce com os três — por isso nunca precisou de default aqui. Mas um backup
  // incompleto ou salvo num formato bem antigo pode não ter; sem isso, a ficha
  // quebrava com tela branca ("Cannot read properties of undefined (reading
  // 'max')") ao tentar ler hp.max. Máximo calculado igual a uma ficha nova
  // (computeMaxHP/computeMaxSP, que já dependem de atributosGerais/procs
  // migrados acima); MP é sempre fixo em 3, igual toda ficha semente.
  const hpBase = (ch.hp && typeof ch.hp.max === "number") ? ch.hp : (() => { const max = computeMaxHP({ atributosGerais, procs }); return { current: max, max }; })();
  const hp = { ...hpBase, superficiais: hpBase.superficiais ?? 0 };
  const mp = (ch.mp && typeof ch.mp.max === "number") ? ch.mp : { current: 3, max: 3 };
  const sp = (ch.sp && typeof ch.sp.max === "number") ? ch.sp : (() => { const max = computeMaxSP({ sp: ch.sp, procs }); return { current: max, max }; })();
  // Enquadramento do retrato (y/zoom): fichas salvas antes desse campo existir
  // (ou um backup de formato antigo) ganham o padrão centralizado/sem zoom —
  // sem sobrescrever quem já tiver um valor customizado.
  const imagemPos = { y: 50, zoom: 1, ...(ch.imagemPos || {}) };
  // Visibilidade pro jogador (aba Personagens, 14/10): fichas sem esse campo
  // (toda ficha existente antes de hoje) nascem `false` — "todas só-GM até
  // você liberar", decisão do Pedro — o GM arrasta cada uma pra seção
  // "Jogadores veem" quando quiser revelar.
  const visivelJogador = ch.visivelJogador ?? false;
  // 4º encaixe de Disciplina da secundária "Vaga de Disciplina" do Humano
  // (14/10, mesmo dia): independente de disciplinaHumano (o antigo texto
  // livre nome+grau, preservado intocado acima via ...ch) — nunca existiu
  // antes de hoje, então toda ficha ganha `null` por padrão, não-destrutivo.
  const disciplinaExtraHumano = ch.disciplinaExtraHumano ?? null;
  return {
    ...ch, attacks: [...fixedAttacks, ...missing], statBase, itens, attributes, procs, grupo, racialAbility, classes,
    abilities, atributosGerais, proficiencias, hp, mp, sp, imagemPos, disciplinas, visivelJogador,
    raca, habilidadePrincipal, habilidadeSecundaria, disciplinaHumano, disciplinaExtraHumano, descritores, bonusGrauEscolha,
  };
}

export function migrarPersonagens(characters) {
  return (Array.isArray(characters) ? characters : []).map(migrarPersonagem);
}
