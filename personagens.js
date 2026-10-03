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

const NAME_ALIASES = { soco: "Ataque desarmado", mosquetão: "Mosquete", mosquetao: "Mosquete" };
const REMOVED_NAMES = new Set(["chute"]);
const OLD_DEFAULT_DEFESA = new Set([0, 5, undefined]);
const OLD_DEFAULT_RESIST_NATURAL = new Set([1, 2, 6, undefined]);
const OLD_DEFAULT_RESIST_ARMADURA = new Set([7, undefined]);

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
  const itens = (itensArmadura.length > 0 || ch.fichaFechada) ? ch.itens : { ...(ch.itens || { usaveis: [], principais: [] }), armadura: ["Armadura física"] };
  const attributes = migrateAttributes(ch.attributes);
  const procs = Array.isArray(ch.procs) ? ch.procs.slice(0, MAX_PROCS) : [];
  const atributosGerais = { ...ATRIBUTOS_GERAIS_DEFAULT, ...(ch.atributosGerais || {}) };
  const proficiencias = { ...PROFICIENCIAS_DEFAULT, ...(ch.proficiencias || {}) };
  delete proficiencias.briga; // proficiencia eliminada do sistema
  const grupo = ch.grupo || grupoDoPersonagem(ch);
  const racialAbility = ch.racialAbility || { name: "", description: "" };
  const classesSalvas = Array.isArray(ch.classes) ? ch.classes : [];
  const classes = [0, 1].map((i) => classesSalvas[i] || { name: "", description: "" });
  const abilities = Array.isArray(ch.abilities) ? ch.abilities : [];
  // hp/mp/sp: toda ficha criada pelo app (semente, "Nova Ficha", Sidepoint) já
  // nasce com os três — por isso nunca precisou de default aqui. Mas um backup
  // incompleto ou salvo num formato bem antigo pode não ter; sem isso, a ficha
  // quebrava com tela branca ("Cannot read properties of undefined (reading
  // 'max')") ao tentar ler hp.max. Máximo calculado igual a uma ficha nova
  // (computeMaxHP/computeMaxSP, que já dependem de atributosGerais/procs
  // migrados acima); MP é sempre fixo em 3, igual toda ficha semente.
  const hp = (ch.hp && typeof ch.hp.max === "number") ? ch.hp : (() => { const max = computeMaxHP({ atributosGerais, procs }); return { current: max, max }; })();
  const mp = (ch.mp && typeof ch.mp.max === "number") ? ch.mp : { current: 3, max: 3 };
  const sp = (ch.sp && typeof ch.sp.max === "number") ? ch.sp : (() => { const max = computeMaxSP({ sp: ch.sp, procs }); return { current: max, max }; })();
  return { ...ch, attacks: [...fixedAttacks, ...missing], statBase, itens, attributes, procs, grupo, racialAbility, classes, abilities, atributosGerais, proficiencias, hp, mp, sp };
}

export function migrarPersonagens(characters) {
  return (Array.isArray(characters) ? characters : []).map(migrarPersonagem);
}
