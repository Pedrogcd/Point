// Catálogo de magias e ofícios mágicos — dados editáveis, fonte de verdade:
// docs/ATUALIZACAO_23-10.md (complementa docs/ATUALIZACAO_21-10.md; em caso
// de conflito, vale o de 23/10). Mantido fora do engine.js de propósito (o
// motor não deve ter magia nenhuma hard-coded).
//
// Campos comuns das magias (catálogo "Ataque", usado por Magias de guerra,
// Dreno de Mana e os ataques de Invocação):
// - id: chave estável (usada pra salvar qual magia tá "ativa" na ficha).
// - nome: nome de exibição.
// - disciplinaId: a disciplina (DISCIPLINAS, abaixo) "dona" da magia — filtra
//   qual ofício mostra a magia no seletor de equipar (ver point-amaranth-
//   app.jsx:DisciplinaSlotPicker). Ausente = Sensor, que qualquer ofício
//   mágico pode pegar (23/10, seção 1).
// - descritores: array de strings minúsculas que o motor entende.
// - custoMp: custo em mana pra conjurar.
// - ajusteDados: ajuste no pool de dados ALÉM de Base mágica + Ofícios
//   Mágicos/Inteligência.
// - feridas: nº de ferimentos causados num acerto (sucessos líquidos > 0).
// - superficial: true força ferimento superficial mesmo com sucessos líquidos
//   altos.
// - emArea: true = usar resolveAtaqueEmArea (um alvo por vez é resolveAtaque).
// - semRolagem / efeito: magias especiais sem pool de ataque (Escudo de Mana,
//   Sensor).

// Disciplinas — até 3 slots por personagem (character.disciplinas, array de
// até 3 `{ disciplinaId, habilidadesAtivas }` ou `null`). Só as de tipo
// "oficio-magico" ou "magia-inata" oferecem magias equipáveis.
//
// 23/10 (docs/ATUALIZACAO_23-10.md seção 2b): cada ofício agora dá 3
// proficiências reais (+1 grau cada, teto C — ver BONUS_GRAU_POR_OFICIO
// abaixo, consumido por racasCatalogo.js:bonusGrauDoPersonagem) e 1 passiva
// própria (ver PASSIVA_POR_OFICIO). Conduíte e Magia Inata não dão
// proficiências. `bonusTexto` resume as duas coisas pra exibir no seletor de
// disciplina (point-amaranth-app.jsx:DisciplinaSlotPicker, cartão de cada
// ofício) — ver "mecanizada" em PASSIVA_POR_OFICIO pra saber se a passiva
// realmente faz algo no motor ou só aparece como texto.
//
// Campos:
// - id: chave estável (character.disciplinas[i].disciplinaId).
// - nome: nome de exibição.
// - tipo: "oficio-magico" (conta 1 no pool de ataque mágico/recuperação de
//   mana — ver engine.contagemOficiosMagicos) ou "magia-inata" (NÃO conta
//   como ofício, dá bônus próprio).
// - temMagias: true = a disciplina oferece o catálogo de MAGIAS (filtrado por
//   disciplinaId) pra equipar (até magiasAtivasMax). Só Magias de guerra e
//   Magia Inata usam esse mecanismo de "equipar até N, trocar com ação/MP" —
//   as magias de Encantamentos (Dreno de Mana) e Invocação (Lança Longínqua,
//   Chuva de Lâminas, Chama Mágica) ficam disponíveis automaticamente assim
//   que o ofício dono está equipado, sem precisar escolher entre elas (mesma
//   simplificação que Encantamentos/Alquimia já tinham — "ocupa 1 dos 3
//   espaços do ofício" não é validado em nenhum desses catálogos ainda, ver
//   relatório).
// - magiasIniciais/magiasAtivasMax/temTelaDeMana/trocaGratisComAcao: só
//   Magias de guerra/Magia Inata (ver point-amaranth-app.jsx).
// - bonusTexto: texto do bônus (proficiências + passiva) pra exibir na ficha.
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
    bonusTexto: "Magias Gerais, Política e Tecnologia +1 grau cada (teto C). Passiva: proficiência em todas as armas (mecanizada: libera o Descritor 2 de qualquer arma). Quem já tem proficiência em armas por outra habilidade pode escolher a passiva anterior — a primeira magia lançada em um combate custa 1 MP a menos, mínimo 0 (essa não é mecanizada: o app não acompanha início de combate).",
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
    bonusTexto: "+1 MP máximo. +1d10 extra em todas as rolagens de magia (não conta como ofício mágico, não dá proficiências nem passiva de ofício).",
    descricao: "Magia que vem de dentro, sem estudo formal.",
  },
  {
    id: "oficio-encantamentos", nome: "Ofício Mágico: Encantamentos", tipo: "oficio-magico",
    bonusTexto: "Magias Gerais, Ofício e Investigação +1 grau cada (teto C). Passiva: a cada descanso longo, escolhe uma proficiência qualquer (inclusive de Combate) e ganha +1 grau nela até o próximo descanso longo, teto C (não mecanizada: o app não tem descanso longo nem essa escolha).",
    descricao: "Disciplina de ofício mágico. Cada encantamento quebra 1 mana e concede um descritor ao usuário (ou aos ataques dele, físicos e mágicos) enquanto ela estiver quebrada. Nomes no formato 'Encantamento: Descritor'.",
  },
  {
    id: "oficio-alquimia", nome: "Ofício Mágico: Alquimia", tipo: "oficio-magico",
    bonusTexto: "Medicina, Ofício e Acadêmicos +1 grau cada (teto C). Passiva: no descanso longo, prepara qualquer habilidade de Alquimia em quantidade igual à Inteligência ou ao número de ofícios (o maior), sem quebrar mana (não mecanizada: o app não tem descanso longo nem contagem de itens de graça).",
    descricao: "Disciplina de ofício mágico. Itens preparados que quebram mana pra existir, fora de combate — qualquer pessoa pode usá-los depois.",
  },
  {
    id: "oficio-constructo", nome: "Ofício Mágico: Constructo", tipo: "oficio-magico",
    bonusTexto: "Tecnologia, Ofício e Liderança +1 grau cada (teto C). Passiva: já começa com um constructo acompanhando a pessoa (à escolha), sem quebrar mana (não mecanizada: não há UI de invocar/gerenciar constructo ainda).",
    descricao: "Disciplina de ofício mágico. Servos/torres/armadilhas/armas/armaduras criados, que agem só quando o dono manda.",
  },
  {
    id: "oficio-invocacao", nome: "Ofício Mágico: Invocação", tipo: "oficio-magico",
    bonusTexto: "Magias Gerais, Atletismo e Percepção +1 grau cada (teto C). Passiva: +1 grau em Combate Corpo a Corpo (teto C), sempre, não só com armas invocadas — mecanizada.",
    descricao: "Disciplina de ofício mágico (separado de Encantamentos e Constructo em 21/10). Invoca armas espectrais e algumas magias de invocação (Chama Mágica).",
  },
];

export function getDisciplinaPorId(id) {
  return DISCIPLINAS.find((d) => d.id === id) || null;
}

// Máximo de disciplinas por personagem — Magia Inata ocupa um dos 3 slots
// também, mesmo não contando como ofício mágico.
export const MAX_DISCIPLINAS = 3;

// 23/10 (docs/ATUALIZACAO_23-10.md seção 2b): 3 proficiências fixas por
// ofício equipado (+1 grau cada, sem escolha do jogador) — consumido por
// racasCatalogo.js:bonusGrauDoPersonagem (soma com o resto dos bônus de
// grau do personagem, teto C por padrão, igual qualquer outro bônus de
// BONUS_GRAU_POR_HABILIDADE). "Os bônus de disciplinas diferentes somam até
// o teto C": automático — se duas disciplinas diferentes derem +1 na mesma
// chave (ex.: Encantamentos e Constructo nos dois dão "oficio"), os passos
// somam antes do teto, mesmo mecanismo de BONUS_GRAU_POR_HABILIDADE.
// Conduíte e Magia Inata não entram aqui (não dão proficiências).
//
// Invocação tem uma 4ª entrada (combateCorpoACorpo): não é uma das "3
// proficiências" do ofício, é a PASSIVA dele ("+1 grau em Combate Corpo a
// Corpo, sempre") — mecanicamente idêntica (mesmo +1 grau/teto C), por isso
// cabe na mesma tabela sem precisar de um mecanismo à parte.
export const BONUS_GRAU_POR_OFICIO = {
  "oficio-magias-de-guerra": [
    { tipo: "proficiencia", chave: "magiasGerais" },
    { tipo: "proficiencia", chave: "politica" },
    { tipo: "proficiencia", chave: "tecnologia" },
  ],
  "oficio-encantamentos": [
    { tipo: "proficiencia", chave: "magiasGerais" },
    { tipo: "proficiencia", chave: "oficio" },
    { tipo: "proficiencia", chave: "investigacao" },
  ],
  "oficio-alquimia": [
    { tipo: "proficiencia", chave: "medicina" },
    { tipo: "proficiencia", chave: "oficio" },
    { tipo: "proficiencia", chave: "academicos" },
  ],
  "oficio-constructo": [
    { tipo: "proficiencia", chave: "tecnologia" },
    { tipo: "proficiencia", chave: "oficio" },
    { tipo: "proficiencia", chave: "lideranca" },
  ],
  "oficio-invocacao": [
    { tipo: "proficiencia", chave: "magiasGerais" },
    { tipo: "proficiencia", chave: "atletismo" },
    { tipo: "proficiencia", chave: "percepcao" },
    { tipo: "proficiencia", chave: "combateCorpoACorpo" }, // passiva do ofício, sempre ativa
  ],
};

// 23/10 (seção 2b): texto da passiva de cada ofício, pra exibir e pro
// relatório. `mecanizada` diz se o motor realmente aplica o efeito (hoje só
// a de Invocação, via BONUS_GRAU_POR_OFICIO acima, e a de Magias de guerra,
// via periciasDeOficio abaixo) — as outras três
// dependem de conceitos que o app não modela (início de combate, descanso
// longo, UI de constructo) e ficam só como texto, mostradas no bonusTexto
// de cada disciplina.
export const PASSIVA_POR_OFICIO = {
  // 23/10 (segunda parte): a passiva virou "proficiência em todas as armas"
  // (mecanizada via periciasDeOficio, abaixo). A anterior fica como
  // `alternativa`, escolhível só por quem já tem proficiência em armas por
  // outra habilidade (slot.passivaAnterior = true) — essa continua sem
  // mecânica (o app não acompanha início de combate).
  "oficio-magias-de-guerra": {
    texto: "Proficiência em todas as armas. Quem já tem proficiência em armas por outra habilidade pode, em vez disso, escolher a passiva anterior.",
    mecanizada: true,
    alternativa: {
      texto: "A primeira magia lançada em um combate custa 1 MP a menos (mínimo 0). Vale para qualquer magia, de qualquer ofício. Combate não é o mesmo que cena.",
      mecanizada: false,
    },
  },
  "oficio-encantamentos": {
    texto: "A cada descanso longo, escolhe uma proficiência (qualquer uma, inclusive de Combate) e ganha +1 grau nela até o próximo descanso longo, respeitando o teto C.",
    mecanizada: false,
  },
  "oficio-alquimia": {
    texto: "No descanso longo, prepara habilidades de Alquimia (poções, bombas e qualquer outro item) em quantidade igual à Inteligência ou ao número de ofícios (o que for maior). Os itens preparados assim não quebram mana, e podem ser de qualquer habilidade de Alquimia, não só das equipadas.",
    mecanizada: false,
  },
  "oficio-constructo": {
    texto: "Já começa com um constructo acompanhando a pessoa (à escolha), sem quebrar mana. Se for destruído, só volta no descanso longo.",
    mecanizada: false,
  },
  "oficio-invocacao": {
    texto: "Ganha +1 grau em Combate Corpo a Corpo (teto C), sempre, não só com armas invocadas.",
    mecanizada: true,
  },
};

export function getPassivaDoOficio(disciplinaId) {
  return PASSIVA_POR_OFICIO[disciplinaId] || null;
}

// 23/10 (segunda parte, docs/ATUALIZACAO_23-10.md seções 2b e 8): habilidades
// de proficiência ESCOLHIDAS, uma por ofício, cada uma ocupando 1 dos 3
// espaços do ofício. Guardadas em slot.habilidadesAtivas (o mesmo array das
// magias equipadas): em Magias de guerra isso já conta contra o limite de 3
// (magiasAtivasMax); em Alquimia/Invocação o array não tinha outro uso e o
// limite de 3 espaços continua não validado (mesma simplificação de antes).
// "Proficiência" aqui = a "perícia" de data/armas.js/data/armaduras.js
// (Descritor 2 da arma; sem penalidade de -1 dado na Defesa da armadura).
// `armas`/`armaduras`: "todas" ou lista de `periciaFamilia`.
export const PROFICIENCIAS_DE_OFICIO = [
  {
    id: "proficiencia_armaduras",
    nome: "Proficiência em Armaduras",
    disciplinaId: "oficio-magias-de-guerra",
    armaduras: "todas",
    efeito: "Proficiência em todas as armaduras (inclui escudos): nenhuma peça tira o dado da Defesa por falta de perícia. Ocupa 1 dos 3 espaços do ofício.",
  },
  {
    id: "proficiencia_armas_de_fogo",
    nome: "Proficiência em Armas de Fogo",
    disciplinaId: "oficio-alquimia",
    armas: ["Armas de fogo"],
    efeito: "Proficiência em armas de fogo: o Descritor 2 de pistolas, rifles e espingardas passa a valer. Ocupa 1 dos 3 espaços do ofício.",
  },
  {
    id: "proficiencia_armas",
    nome: "Proficiência em Armas",
    disciplinaId: "oficio-invocacao",
    armas: "todas",
    efeito: "Proficiência em todas as famílias de arma: o Descritor 2 de qualquer arma passa a valer. Ocupa 1 dos 3 espaços do ofício.",
  },
];

export function getProficienciaDeOficioPorId(id) {
  return PROFICIENCIAS_DE_OFICIO.find((p) => p.id === id) || null;
}

// Qualquer coisa que pode morar em slot.habilidadesAtivas (magia ou
// habilidade de proficiência) — pra listar nome/descrição na ficha.
export function getHabilidadeDeOficioPorId(id) {
  return getMagiaPorId(id) || getProficienciaDeOficioPorId(id);
}

// Perícias (proficiências de arma/armadura) que os ofícios equipados dão.
// Recebe a lista de slots já resolvida (racasCatalogo.js:
// disciplinasDoPersonagem — os 3 normais + o encaixe extra do Humano).
// Uma habilidade de proficiência só conta no slot do ofício dono dela.
// Magias de guerra: a passiva dá todas as armas, a menos que o slot tenha
// passivaAnterior E outra habilidade já dê proficiência em TODAS as armas
// (hoje só a Proficiência em Armas de Invocação) — sem essa outra fonte, a
// escolha salva não vale e a passiva volta a ser a de armas.
export function periciasDeOficio(slots) {
  const lista = (slots || []).filter(Boolean);
  const familiasArmas = new Set();
  let armasTodas = false;
  let armadurasTodas = false;
  const familiasArmaduras = new Set();
  for (const slot of lista) {
    for (const id of slot.habilidadesAtivas || []) {
      const p = getProficienciaDeOficioPorId(id);
      if (!p || p.disciplinaId !== slot.disciplinaId) continue;
      if (p.armas === "todas") armasTodas = true;
      else for (const f of p.armas || []) familiasArmas.add(f);
      if (p.armaduras === "todas") armadurasTodas = true;
      else for (const f of p.armaduras || []) familiasArmaduras.add(f);
    }
  }
  const outraFonteArmasTodas = armasTodas;
  let passivaAnteriorMagiasDeGuerra = false;
  const slotMdg = lista.find((s) => s.disciplinaId === "oficio-magias-de-guerra");
  if (slotMdg) {
    if (slotMdg.passivaAnterior && outraFonteArmasTodas) passivaAnteriorMagiasDeGuerra = true;
    else armasTodas = true;
  }
  return { armasTodas, familiasArmas, armadurasTodas, familiasArmaduras, outraFonteArmasTodas, passivaAnteriorMagiasDeGuerra };
}

export function periciaDeOficioCobreArma(pericias, arma) {
  if (!pericias || !arma) return false;
  return pericias.armasTodas || pericias.familiasArmas?.has(arma.periciaFamilia);
}

export function periciaDeOficioCobreArmadura(pericias, peca) {
  if (!pericias || !peca?.periciaFamilia) return false;
  return pericias.armadurasTodas || pericias.familiasArmaduras?.has(peca.periciaFamilia);
}

// Catálogo de MAGIAS (Tipo "Ataque"/"Defesa"/"Magia"/"Utilidade" — rolam com
// Base mágica + Ofícios/Inteligência, exceto as semRolagem). 23/10: ficam 12
// magias de Magias de guerra + Sensor (compartilhado) + Dreno de Mana (foi
// pra Encantamentos) + os 3 ataques de Invocação (Lança Longínqua, Chuva de
// Lâminas e Chama Mágica, que veio de Magias de guerra). `disciplinaId`
// filtra o seletor de equipar; ausente = Sensor (qualquer ofício mágico).
export const MAGIAS = [
  // --- Magias de guerra (12) -------------------------------------------
  {
    id: "bombardeio_de_mana",
    nome: "Bombardeio de Mana",
    disciplinaId: "oficio-magias-de-guerra",
    descritores: ["magia", "em_area", "preciso_2"],
    custoMp: 2,
    ajusteDados: 0,
    feridas: 1,
    superficial: false,
    emArea: true,
  },
  {
    id: "escudo_de_mana",
    nome: "Escudo de Mana",
    disciplinaId: "oficio-magias-de-guerra",
    descritores: ["magia", "blindado"],
    custoMp: 1,
    custoMpExtensaoAliado: 1,
    semRolagem: true,
    efeito:
      "O conjurador ganha Blindado até o fim da cena. Gastando +1 MP, o escudo se estende também a " +
      "um aliado escolhido. Blindado não acumula com outras fontes.",
  },
  {
    // 23/10: Esmagador 1 no lugar do Preciso 2 (docs/ATUALIZACAO_23-10.md
    // seção 3 — "Quem bloqueia (Força) rola 1 dado a menos", não mais a
    // esquiva).
    id: "shin",
    nome: "Shin",
    disciplinaId: "oficio-magias-de-guerra",
    descritores: ["magia", "em_area", "esmagador_1"],
    custoMp: 1,
    ajusteDados: 0,
    feridas: 1,
    superficial: true,
    emArea: true,
  },
  {
    id: "misseis_magicos",
    nome: "Mísseis Mágicos",
    disciplinaId: "oficio-magias-de-guerra",
    descritores: ["magia", "preciso_2", "sortudo"],
    custoMp: 1,
    ajusteDados: 1,
    feridas: 1,
    superficial: true,
    emArea: false,
  },
  {
    id: "laser_magico",
    nome: "Laser Mágico",
    disciplinaId: "oficio-magias-de-guerra",
    descritores: ["magia", "perfurante"],
    custoMp: 2,
    ajusteDados: 0,
    feridas: 1,
    superficial: false,
    emArea: false,
  },
  {
    // 23/10: Pesado (dados precisam de 7+, 2 ferimentos) e custo caiu de 3
    // pra 2 MP (docs/ATUALIZACAO_23-10.md seção 3 — "Torrente Pesada").
    id: "torrente_magica",
    nome: "Torrente Mágica",
    disciplinaId: "oficio-magias-de-guerra",
    descritores: ["magia", "letal", "pesado"],
    custoMp: 2,
    ajusteDados: 0,
    feridas: 2,
    superficial: false,
    emArea: false,
  },
  {
    id: "tiro_magico",
    nome: "Tiro Mágico",
    disciplinaId: "oficio-magias-de-guerra",
    descritores: ["magia"],
    custoMp: 1,
    ajusteDados: 0,
    feridas: 1,
    superficial: false,
    emArea: false,
  },
  {
    // 23/10: ganhou Esmagador 1 (docs/ATUALIZACAO_23-10.md seção 3).
    id: "shin_kay",
    nome: "Shin-kay",
    disciplinaId: "oficio-magias-de-guerra",
    descritores: ["magia", "letal", "esmagador_1"],
    custoMp: 2,
    ajusteDados: 0,
    feridas: 1,
    superficial: false,
    emArea: false,
  },
  {
    // 23/10: perdeu o Atrasada 1 — "a iniciativa não é acompanhada" (docs/
    // ATUALIZACAO_23-10.md seção 3, "Suth sem Atrasada").
    id: "magia_de_guerra_suth",
    nome: "Magia de guerra Suth",
    disciplinaId: "oficio-magias-de-guerra",
    descritores: ["magia", "preciso_2", "sortudo"],
    custoMp: 2,
    ajusteDados: 0,
    feridas: 1,
    superficial: false,
    emArea: false,
  },
  {
    // 23/10: quem sofrer sucesso líquido fica Lento 1 até o fim do próximo
    // turno dele — NÃO mecanizado (o motor não tem status temporário em
    // quem é atingido; o descritor "lento_1" aqui só serve pra mostrar o
    // selo/pop-up, ver relatório).
    id: "magia_de_guerra_maxis",
    nome: "Magia de guerra Maxis",
    disciplinaId: "oficio-magias-de-guerra",
    descritores: ["magia", "em_area", "lento_1"],
    custoMp: 2,
    ajusteDados: 0,
    feridas: 2,
    superficial: true,
    emArea: true,
  },
  {
    // 23/10: perdeu o Sortudo — "Katalão sem Sortudo" (docs/ATUALIZACAO_23-
    // 10.md seção 3).
    id: "magia_de_guerra_katalao",
    nome: "Magia de guerra Katalão",
    disciplinaId: "oficio-magias-de-guerra",
    descritores: ["magia", "perfurante", "letal"],
    custoMp: 3,
    ajusteDados: 0,
    feridas: 1,
    superficial: false,
    emArea: false,
  },
  {
    id: "descarga_eletrica",
    nome: "Descarga Elétrica",
    disciplinaId: "oficio-magias-de-guerra",
    descritores: ["magia", "carga_2"],
    custoMp: 2,
    ajusteDados: 0,
    feridas: 1,
    superficial: true,
    emArea: false,
  },

  // --- Compartilhada (qualquer ofício mágico) ---------------------------
  {
    // 23/10: custo definido (1 MP) — deixou de ser placeholder. "Qualquer
    // ofício pode pegar esta habilidade" (docs/ATUALIZACAO_23-10.md seção
    // 1/3): sem disciplinaId, aparece no seletor de Magias de guerra (fallback
    // `!m.disciplinaId`) e fica disponível pra qualquer ofício equipado (ver
    // point-amaranth-app.jsx, cálculo de magiasDisponiveis).
    id: "sensor",
    nome: "Sensor",
    descritores: ["magia"],
    custoMp: 1,
    semRolagem: true,
    efeito: "Marca 1 pessoa numa rede de visão: você sabe onde ela está. Dura até o descanso longo. Qualquer ofício pode pegar esta habilidade (ocupa 1 dos 3 espaços do ofício).",
  },

  // --- Encantamentos (Dreno de Mana, 23/10: saiu de Magias de guerra) ---
  {
    id: "dreno_de_mana",
    nome: "Dreno de Mana",
    disciplinaId: "oficio-encantamentos",
    descritores: ["magia", "drenante"],
    custoMp: 1,
    ajusteDados: 0,
    feridas: 1,
    superficial: true,
    emArea: false,
    efeito: "Ataque que cria, por um instante, um encantamento no alvo que o drena: se acertar, o alvo perde 1 mana e o conjurador recupera 1. O encantamento dura só aquele ataque. Só exige o ofício Encantamentos.",
  },

  // --- Invocação (Lança Longínqua/Chuva de Lâminas novas; Chama Mágica
  //     veio de Magias de guerra, 23/10) ----------------------------------
  {
    id: "lanca_longinqua",
    nome: "Lança Longínqua",
    disciplinaId: "oficio-invocacao",
    descritores: ["perfurante"],
    custoMp: 1,
    ajusteDados: 0,
    feridas: 1,
    superficial: false,
    emArea: false,
    efeito: "Cria uma lança espectral e a arremessa contra qualquer zona da cena, sem penalidade de alcance. A lança desaparece depois.",
  },
  {
    id: "chuva_de_laminas",
    nome: "Chuva de Lâminas",
    disciplinaId: "oficio-invocacao",
    descritores: ["em_area", "preciso_1", "letal"],
    custoMp: 2,
    ajusteDados: 0,
    feridas: 1,
    superficial: false,
    emArea: true,
    efeito: "Lâminas espectrais caem sobre uma zona. Cada alvo rola a própria defesa; aliados na zona também são atingidos.",
  },
  {
    // 23/10: veio de Magias de guerra — "só Queimadura" (sem ferimento do
    // ataque em si), igual Bomba Incendiária.
    id: "chama_magica",
    nome: "Chama Mágica",
    disciplinaId: "oficio-invocacao",
    descritores: ["magia", "queimadura_2"],
    custoMp: 1,
    ajusteDados: 0,
    feridas: 0,
    superficial: false,
    emArea: false,
    efeito: "Uma chama é arremessada no alvo. Se o ataque causar ao menos 1 sucesso líquido, não há ferimento do ataque e rola 2 dados de Queimadura (8+; ignora a defesa). Veio de Magias de guerra.",
  },
];

export function getMagiaPorId(id) {
  return MAGIAS.find((m) => m.id === id) || null;
}

// Catálogo de ENCANTAMENTOS (ofício mágico "Encantamentos"). 23/10 (docs/
// ATUALIZACAO_23-10.md seção 4): renomeados pro formato "Encantamento:
// Descritor" (de-para completo no comentário de cada entrada renomeada, pra
// a migração de fichas antigas em personagens.js); 6 novos (Esmagador 1,
// Firme 1, Selado 1, Potente Força, Potente Destreza, Veloz); Perícia
// Encantada é novo (não segue o formato "Encantamento: X" porque concede
// uma PERÍCIA, não um descritor); Dreno de Mana saiu daqui — virou uma
// MAGIA de verdade (rola ataque), ver MAGIAS acima. "Golpe Preciso" baixou
// de Preciso 2 pra Preciso 1; "Pele Encantada" trocou Blindado por
// Resistente.
//
// Regra de mana quebrada: cada encantamento quebra 1 mana; o descritor vale
// enquanto ela estiver quebrada (desquebrar só fora de combate). 23/10
// (seção 1): os encantamentos MAIS FORTES (Resistente, Potente Força,
// Potente Destreza, Selado, Sortudo, Drenante — `custoSpQuebrado: true`
// abaixo) TAMBÉM quebram 1 SP; o SP só volta no descanso longo (provisório
// — o app trata o botão "Restaurar MP e SP" como equivalente, não existe
// descanso longo de verdade). Mecanizado: ativar/desativar um desses 6
// agora quebra/repara 1 SP de verdade, igual já fazia com a mana (ver
// point-amaranth-app.jsx, onToggleEncantamento).
//
// Campos:
// - id: chave estável (usada em `character.encantamentosAtivos`).
// - nome: nome de exibição.
// - disciplinaId: sempre "oficio-encantamentos".
// - custoManaQuebrada: quantos pontos de mana ficam quebrados enquanto este
//   encantamento está ativo.
// - custoSpQuebrado: true nos 6 "fortes" (23/10) — quebra 1 SP junto.
// - descritoresConcedidos: descritores que o usuário (ou os ataques dele,
//   físicos e mágicos) ganham enquanto o encantamento está ativo — somados
//   em `character.descritores` por comGrausEfetivos, igual equipamento.
export const ENCANTAMENTOS = [
  {
    // era "lamina_letal" / "Lâmina Letal".
    id: "encantamento_letal",
    nome: "Encantamento: Letal",
    disciplinaId: "oficio-encantamentos",
    custoManaQuebrada: 1,
    descritoresConcedidos: ["letal"],
    descricao: "Quebra 1 de mana. Enquanto a mana estiver quebrada, os ataques do usuário — físicos e mágicos — ganham Letal.",
  },
  {
    // era "ponta_perfurante" / "Ponta Perfurante".
    id: "encantamento_perfurante",
    nome: "Encantamento: Perfurante",
    disciplinaId: "oficio-encantamentos",
    custoManaQuebrada: 1,
    descritoresConcedidos: ["perfurante"],
    descricao: "Quebra 1 de mana. Enquanto a mana estiver quebrada, os ataques do usuário — físicos e mágicos — ganham Perfurante.",
  },
  {
    // era "golpe_preciso" / "Golpe Preciso", Preciso 2 -> Preciso 1 (23/10).
    id: "encantamento_preciso_1",
    nome: "Encantamento: Preciso 1",
    disciplinaId: "oficio-encantamentos",
    custoManaQuebrada: 1,
    descritoresConcedidos: ["preciso_1"],
    descricao: "Quebra 1 de mana. Enquanto a mana estiver quebrada, os ataques do usuário — físicos e mágicos — ganham Preciso 1.",
  },
  {
    // novo (23/10).
    id: "encantamento_esmagador_1",
    nome: "Encantamento: Esmagador 1",
    disciplinaId: "oficio-encantamentos",
    custoManaQuebrada: 1,
    descritoresConcedidos: ["esmagador_1"],
    descricao: "Quebra 1 de mana. Enquanto a mana estiver quebrada, os ataques do usuário — físicos e mágicos — ganham Esmagador 1.",
  },
  {
    // era "encantamento_flamejante" / "Encantamento Flamejante".
    id: "encantamento_queimadura_1",
    nome: "Encantamento: Queimadura 1",
    disciplinaId: "oficio-encantamentos",
    custoManaQuebrada: 1,
    descritoresConcedidos: ["queimadura_1"],
    descricao: "Quebra 1 de mana. Enquanto a mana estiver quebrada, os ataques do usuário — físicos e mágicos — ganham Queimadura 1. Se o ataque causar ao menos 1 sucesso líquido, rola 1 dado de Queimadura.",
  },
  {
    // era "encantamento_eletrico" / "Encantamento Elétrico".
    id: "encantamento_carga_2",
    nome: "Encantamento: Carga 2",
    disciplinaId: "oficio-encantamentos",
    custoManaQuebrada: 1,
    descritoresConcedidos: ["carga_2"],
    descricao: "Quebra 1 de mana. Enquanto a mana estiver quebrada, os ataques do usuário — físicos e mágicos — ganham Carga 2.",
  },
  {
    // id já existia com este nome — ganhou custoSpQuebrado (23/10).
    id: "encantamento_drenante",
    nome: "Encantamento: Drenante",
    disciplinaId: "oficio-encantamentos",
    custoManaQuebrada: 1,
    custoSpQuebrado: true,
    descritoresConcedidos: ["drenante"],
    descricao: "Quebra 1 de mana e 1 SP. Enquanto a mana estiver quebrada, os ataques do usuário — físicos e mágicos — ganham Drenante.",
  },
  {
    // era "sorte_encantada" / "Sorte Encantada" — ganhou custoSpQuebrado.
    id: "encantamento_sortudo",
    nome: "Encantamento: Sortudo",
    disciplinaId: "oficio-encantamentos",
    custoManaQuebrada: 1,
    custoSpQuebrado: true,
    descritoresConcedidos: ["sortudo"],
    descricao: "Quebra 1 de mana e 1 SP. Enquanto a mana estiver quebrada, o usuário ganha Sortudo.",
  },
  {
    // era "pele_encantada" / "Pele Encantada" — trocou Blindado por
    // Resistente (23/10) e ganhou custoSpQuebrado.
    id: "encantamento_resistente",
    nome: "Encantamento: Resistente",
    disciplinaId: "oficio-encantamentos",
    custoManaQuebrada: 1,
    custoSpQuebrado: true,
    descritoresConcedidos: ["resistente"],
    descricao: "Quebra 1 de mana e 1 SP. Enquanto a mana estiver quebrada, o usuário ganha Resistente. Não acumula com Resistente de outra fonte.",
  },
  {
    // novo (23/10) — só vale ao bloquear (Força + Defesa).
    id: "encantamento_firme_1",
    nome: "Encantamento: Firme 1",
    disciplinaId: "oficio-encantamentos",
    custoManaQuebrada: 1,
    descritoresConcedidos: ["firme_1"],
    descricao: "Quebra 1 de mana. Enquanto a mana estiver quebrada, o usuário ganha Firme 1. Só vale ao bloquear (Força + Defesa).",
  },
  {
    // novo (23/10) — ganhou custoSpQuebrado.
    id: "encantamento_selado_1",
    nome: "Encantamento: Selado 1",
    disciplinaId: "oficio-encantamentos",
    custoManaQuebrada: 1,
    custoSpQuebrado: true,
    descritoresConcedidos: ["selado_1"],
    descricao: "Quebra 1 de mana e 1 SP. Enquanto a mana estiver quebrada, o usuário ganha Selado 1.",
  },
  {
    // novo (23/10) — +1 grau em Força até C, mesmo descritor que a
    // armadura/Homúnculo já usam (comGrausEfetivos já aplica o bônus de
    // grau quando "potente_forca" está em character.descritores).
    id: "encantamento_potente_forca",
    nome: "Encantamento: Potente Força",
    disciplinaId: "oficio-encantamentos",
    custoManaQuebrada: 1,
    custoSpQuebrado: true,
    descritoresConcedidos: ["potente_forca"],
    descricao: "Quebra 1 de mana e 1 SP. Enquanto a mana estiver quebrada, o usuário ganha Potente Força (+1 grau em Força, até C).",
  },
  {
    // novo (23/10).
    id: "encantamento_potente_destreza",
    nome: "Encantamento: Potente Destreza",
    disciplinaId: "oficio-encantamentos",
    custoManaQuebrada: 1,
    custoSpQuebrado: true,
    descritoresConcedidos: ["potente_destreza"],
    descricao: "Quebra 1 de mana e 1 SP. Enquanto a mana estiver quebrada, o usuário ganha Potente Destreza (+1 grau em Destreza, até C).",
  },
  {
    // novo (23/10) — etiqueta (iniciativa não é acompanhada no sistema).
    id: "encantamento_veloz",
    nome: "Encantamento: Veloz",
    disciplinaId: "oficio-encantamentos",
    custoManaQuebrada: 1,
    descritoresConcedidos: ["veloz"],
    descricao: "Quebra 1 de mana. Enquanto a mana estiver quebrada, o usuário ganha Veloz. Veloz é etiqueta: a iniciativa existe mas não é acompanhada no sistema.",
  },
  {
    // novo (23/10) — concede PERÍCIA, não descritor; por isso não vira
    // `descritoresConcedidos` (não mecanizado, ver relatório).
    id: "pericia_encantada",
    nome: "Perícia Encantada",
    disciplinaId: "oficio-encantamentos",
    custoManaQuebrada: 1,
    descricao: "Quebra 1 de mana. Enquanto a mana estiver quebrada, o alvo usa o Descritor 2 de um tipo de arma à sua escolha, como se tivesse a perícia da família. Permite combinar Invocação + Encantamentos (um mago de invocação). Não mecanizado: a escolha do tipo de arma e o acesso ao Descritor 2 ficam a cargo da mesa.",
  },
];

export function getEncantamentoPorId(id) {
  return ENCANTAMENTOS.find((e) => e.id === id) || null;
}

// União sem duplicar dos descritores concedidos pelos encantamentos ATIVOS
// do personagem (`character.encantamentosAtivos`, lista de ids). Quem monta
// o personagem EFETIVO (racasCatalogo.js:comGrausEfetivos) soma isto em
// `character.descritores`.
export function descritoresDeEncantamentosAtivos(character) {
  const ativos = character?.encantamentosAtivos || [];
  const vistos = new Set();
  const resultado = [];
  for (const id of ativos) {
    const encantamento = getEncantamentoPorId(id);
    for (const d of encantamento?.descritoresConcedidos || []) {
      if (!vistos.has(d)) {
        vistos.add(d);
        resultado.push(d);
      }
    }
  }
  return resultado;
}

// Conduíte mágico: "existe em todo ofício mágico, ocupa 1 dos 3 espaços,
// conta +1 ofício. Só um Conduíte funciona por vez." Não é magia nem
// encantamento — é uma passiva; o estado é um único flag global,
// `character.conduiteAtivo` (ver racasCatalogo.js:comGrausEfetivos).
export const CONDUITE_MAGICO = {
  id: "conduite_magico",
  nome: "Conduíte mágico",
  custoMp: 0,
  descricao:
    "Ocupa 1 dos 3 slots de habilidade do ofício. Equipado, soma +1 ofício " +
    "mágico no pool de ataque mágico e na recuperação de mana. Não é magia " +
    "e não custa MP. Todo ofício pode ter um, mas só um Conduíte funciona " +
    "por vez.",
};

// Catálogo de ALQUIMIA (ofício mágico "Alquimia"). Itens são PREPARADOS, só
// fora de combate: preparar quebra 1 mana (character.itensAlquimicosAtivos,
// mesmo mecanismo de quebrarMana/repararMana de ENCANTAMENTOS). Diferente de
// Encantamentos, um item preparado NÃO concede descritor nenhum ao dono
// automaticamente — ele é um objeto que QUALQUER UM pode usar depois, com os
// parâmetros de quem criou (rolagem: engine.js:diceAtaqueAlquimia = Destreza
// + ofícios/Inteligência, sem Base mágica nem mana extra). Por isso
// `descritores`/`descritoresConcedidos` aqui são só DECORATIVOS (pro selo/
// pop-up aparecer na ficha) — nunca entram em character.descritores do dono,
// mesmo quando o item afeta quem o usa (Tônico Veloz) e principalmente
// quando afeta outro alvo (Ácido Corrosivo, Bomba de Fumaça).
//
// 23/10 (docs/ATUALIZACAO_23-10.md seção 5): Antídoto saiu (apagado). Elixir
// Drenante foi pra Habilidades Conjuntas (exige Alquimia + Encantamentos,
// ver HABILIDADES_CONJUNTAS). Vários efeitos reescritos: Elixir de Mana
// (Reabastecer), Óleo Inflamável (efeito em arma OU alvo), Ácido Corrosivo
// (interage com armadura de verdade — Corrosivo virou "Definido"), Frasco de
// Gosma (era "prioridade -1", virou Lento 1), Elixir de Vigor (era "próximo
// ferimento vira superficial", virou Resistente por uma cena), Catalisador
// (ganhou +1d10), Bomba de Fumaça (era "ganha Blindado", virou Azarado pra
// quem ataca/testa na zona — efeito em terceiros, não mecanizado).
//
// TODO (não implementado — ver relatório final): a passiva do ofício (itens
// de graça no descanso longo) não existe (não há descanso longo no app);
// não há fluxo de "usar item preparado num alvo"; efeitos que miram OUTRO
// personagem (Ácido Corrosivo, Bomba de Fumaça, Frasco de Gosma, Óleo
// Inflamável no modo "alvo") ficam só em texto — precisam de ação manual
// de mesa.
export const ALQUIMIA = [
  {
    id: "pocao_de_cura",
    nome: "Poção de Cura",
    disciplinaId: "oficio-alquimia",
    tipo: "Suporte",
    custoManaQuebrada: 1,
    semRolagem: true,
    efeito: "Quem bebe cura 1 ferimento superficial. Cada pessoa só pode usar uma vez por descanso longo, não importa quantas poções existam.",
  },
  {
    id: "bomba_incendiaria",
    nome: "Bomba Incendiária",
    disciplinaId: "oficio-alquimia",
    tipo: "Ataque",
    custoManaQuebrada: 1,
    descritores: ["magia", "em_area", "queimadura_3"],
    feridas: 0,
    superficial: false,
    emArea: true,
    efeito: "Explode na zona alvo. Rola o ataque; se causar ao menos 1 sucesso líquido, não há ferimento do ataque em si — só 3 dados de Queimadura (8+). Aliados na zona também são atingidos.",
  },
  {
    id: "bomba_estilhaco",
    nome: "Bomba Estilhaço",
    disciplinaId: "oficio-alquimia",
    tipo: "Ataque",
    custoManaQuebrada: 1,
    descritores: ["magia"],
    feridas: 1,
    superficial: true,
    emArea: false,
    efeito: "Versão pior do Tiro mágico: a bomba estilhaça e perde força (ferimento sempre superficial).",
  },
  {
    id: "bomba_de_impacto",
    nome: "Bomba de Impacto",
    disciplinaId: "oficio-alquimia",
    tipo: "Ataque",
    custoManaQuebrada: 1,
    descritores: ["magia", "em_area", "preciso_2"],
    feridas: 1,
    superficial: true,
    emArea: true,
    efeito: "Onda de choque na zona alvo (não na do usuário). Aliados na zona também são atingidos.",
  },
  {
    id: "bomba_de_fragmentacao",
    nome: "Bomba de Fragmentação",
    disciplinaId: "oficio-alquimia",
    tipo: "Ataque",
    custoManaQuebrada: 1,
    descritores: ["magia", "em_area"],
    feridas: 1,
    superficial: false,
    emArea: true,
    efeito: "Versão pior do Bombardeio de Mana: atinge a zona alvo, mas sem Preciso.",
  },
  {
    id: "bomba_perfurante",
    nome: "Bomba Perfurante",
    disciplinaId: "oficio-alquimia",
    tipo: "Ataque",
    custoManaQuebrada: 1,
    descritores: ["magia", "perfurante"],
    feridas: 1,
    superficial: true,
    emArea: false,
    efeito: "Versão pior do Laser Mágico: ignora Blindado, mas o ferimento é sempre superficial.",
  },
  {
    id: "bomba_pesada",
    nome: "Bomba Pesada",
    disciplinaId: "oficio-alquimia",
    tipo: "Ataque",
    custoManaQuebrada: 1,
    descritores: ["magia", "letal"],
    feridas: 1,
    superficial: false,
    emArea: false,
    efeito: "Mesmo descritor Letal da Torrente Mágica, mas 1 ferimento em vez de 2 e sem o Pesado.",
  },
  {
    // 23/10: era "ganha Blindado" — o descritor certo é Azarado, mirando
    // quem ataca/testa na zona (não o usuário) — não mecanizado.
    id: "bomba_de_fumaca",
    nome: "Bomba de Fumaça",
    disciplinaId: "oficio-alquimia",
    tipo: "Suporte",
    custoManaQuebrada: 1,
    semRolagem: true,
    descritoresConcedidos: ["azarado"],
    efeito: "Sem rolagem. A zona alvo fica encoberta por uma cena: quem atacar ou testar contra alguém na zona fica Azarado (re-rola o primeiro sucesso, sem escolha). Efeito em terceiros, não mecanizado.",
  },
  {
    id: "tonico_veloz",
    nome: "Tônico Veloz",
    disciplinaId: "oficio-alquimia",
    tipo: "Suporte",
    custoManaQuebrada: 1,
    semRolagem: true,
    descritoresConcedidos: ["veloz"],
    efeito: "Sem rolagem. Quem bebe ganha Veloz por uma cena. Qualquer pessoa pode usar, com os parâmetros de quem criou.",
  },
  {
    // 23/10: ganha Reabastecer (não acumula), em vez de "recuperar 1 mana
    // gasta" solto.
    id: "elixir_de_mana",
    nome: "Elixir de Mana",
    disciplinaId: "oficio-alquimia",
    tipo: "Suporte",
    custoManaQuebrada: 1,
    semRolagem: true,
    descritoresConcedidos: ["reabastecer"],
    efeito: "Sem rolagem. Quem bebe recupera 1 MP gasto (não quebrado) e ganha Reabastecer por uma cena. Reabastecer de fontes diferentes não soma: vale um só. Uma vez por cena por pessoa.",
  },
  {
    // 23/10: dois modos — na arma (Queimadura 1 à arma) ou no alvo (+2
    // dados na próxima Queimadura recebida). Só o modo "arma" é
    // mecanizável (descritoresConcedidos); o modo "alvo" fica em texto.
    id: "oleo_inflamavel",
    nome: "Óleo Inflamável",
    disciplinaId: "oficio-alquimia",
    tipo: "Suporte",
    custoManaQuebrada: 1,
    semRolagem: true,
    descritoresConcedidos: ["queimadura_1"],
    efeito: "Sem rolagem. Usado em uma arma (própria ou de aliado), dá Queimadura 1 à arma durante a cena. Usado em um alvo, a próxima Queimadura que ele receber rola +2 dados (vale até essa Queimadura ou o fim da cena) — efeito em terceiros, não mecanizado.",
  },
  {
    // 23/10 (Corrosivo virou "Definido"): remove Blindado e cancela os
    // descritores da armadura do alvo até o fim da cena, de verdade.
    // Efeito em terceiros — não mecanizado (precisa editar a ficha do
    // alvo manualmente).
    id: "acido_corrosivo",
    nome: "Ácido Corrosivo",
    disciplinaId: "oficio-alquimia",
    tipo: "Suporte",
    custoManaQuebrada: 1,
    semRolagem: true,
    descritoresConcedidos: ["corrosivo"],
    efeito: "Sem rolagem. Um alvo perde o Blindado e tem os efeitos (descritores) da armadura cancelados até o fim da cena (Goethiano inclusive). Pool do arremesso, se precisar acertar: Destreza + (ofícios ou Inteligência). Efeito em terceiros, não mecanizado.",
  },
  {
    // 23/10: era "prioridade -1" — virou Lento 1.
    id: "frasco_de_gosma",
    nome: "Frasco de Gosma",
    disciplinaId: "oficio-alquimia",
    tipo: "Suporte",
    custoManaQuebrada: 1,
    semRolagem: true,
    descritoresConcedidos: ["lento_1"],
    efeito: "Sem dano. Quem estiver na zona alvo fica Lento 1 durante a cena. Efeito em terceiros, não mecanizado.",
  },
  {
    id: "catalisador",
    nome: "Catalisador",
    disciplinaId: "oficio-alquimia",
    tipo: "Suporte",
    custoManaQuebrada: 1,
    semRolagem: true,
    efeito: "Sem rolagem. A próxima magia do alvo custa 1 MP a menos (mínimo 0) e rola 1d10 a mais. Não vale para itens e constructos.",
  },
  {
    // 23/10: era "próximo ferimento vira superficial" — virou Resistente
    // por uma cena, não acumula com outra fonte.
    id: "elixir_de_vigor",
    nome: "Elixir de Vigor",
    disciplinaId: "oficio-alquimia",
    tipo: "Suporte",
    custoManaQuebrada: 1,
    semRolagem: true,
    descritoresConcedidos: ["resistente"],
    efeito: "Sem rolagem. Quem bebe ganha Resistente por uma cena. Não acumula com Resistente de outra fonte.",
  },
  {
    id: "bomba_toxica",
    nome: "Bomba Tóxica",
    disciplinaId: "oficio-alquimia",
    tipo: "Ataque",
    custoManaQuebrada: 1,
    descritores: ["magia", "em_area", "envenenamento_2"],
    feridas: 0,
    superficial: false,
    emArea: true,
    efeito: "Explode na zona alvo. Rola o ataque; se causar ao menos 1 sucesso líquido, cada alvo atingido rola 2 dados de Envenenamento (7+; ignora defesa e Blindado). Com pelo menos 1 sucesso, recebe 1 ferimento superficial (limite 2). Aliados na zona também são atingidos.",
  },
  {
    id: "veneno_de_arma",
    nome: "Veneno de Arma",
    disciplinaId: "oficio-alquimia",
    tipo: "Suporte",
    custoManaQuebrada: 1,
    semRolagem: true,
    descritoresConcedidos: ["envenenamento"],
    efeito: "Sem rolagem. A arma do alvo (própria ou de aliado) fica com Envenenamento 1 durante a cena. Efeito em terceiros, não mecanizado.",
  },
  {
    id: "bomba_eletrica",
    nome: "Bomba Elétrica",
    disciplinaId: "oficio-alquimia",
    tipo: "Ataque",
    custoManaQuebrada: 1,
    descritores: ["magia", "em_area", "carga_2"],
    feridas: 0,
    superficial: false,
    emArea: true,
    efeito: "Explode na zona alvo. Rola o ataque; cada sucesso líquido deixa 1 carga em cada alvo atingido. Ao chegar a 2 cargas, o alvo descarrega um ataque extra de 2 dados. Aliados na zona também são atingidos.",
  },
];

export function getItemAlquimicoPorId(id) {
  return ALQUIMIA.find((i) => i.id === id) || null;
}

// Catálogo de CONSTRUCTO (ofício mágico "Constructo"). "Quebra 2 mana"
// (exceção à regra de 1 por habilidade); o constructo fica com o
// personagem enquanto a mana estiver quebrada. Magias feitas através dele
// custam 1 MP a menos. Quando destruído, só 1 das 2 manas quebradas volta.
// Pool: engine.js:diceAtaqueConstructo = Base mágica + ofícios do dono.
//
// TODO (não implementado — ver relatório final): não há "invocar
// constructo" na UI nem tracking de Integridade, nem as "funções" como
// ações separadas, nem a magia única de cada um, nem o desconto de 1 MP em
// magias conjuradas através dele. Só o catálogo de dados e a fórmula de
// pool existem.
export const CONSTRUCTO = [
  {
    id: "golem_guardiao",
    nome: "Golem Guardião",
    disciplinaId: "oficio-constructo",
    tipo: "Servo",
    custoManaQuebrada: 2,
    descritoresConcedidos: ["blindado", "resistente"],
    integridade: 3,
    funcoes: ["Golpe: ataque corpo a corpo, Letal, 1 ferimento.", "Proteger: assume o ataque dirigido a um aliado na zona dele."],
    magiaUnica: "Muralha (1 MP): cria uma barreira na zona — ataques que a atravessam precisam de 7+.",
  },
  {
    id: "torre_de_mana",
    nome: "Torre de Mana",
    disciplinaId: "oficio-constructo",
    tipo: "Torre",
    custoManaQuebrada: 2,
    descritoresConcedidos: ["magia"],
    integridade: 2,
    funcoes: ["Disparo: ataque mágico a cada turno do dono, 1 ferimento superficial.", "Ponto de conjuração: magias do dono lançadas a partir dela custam 1 MP a menos."],
    magiaUnica: "Salva da Torre (2 MP): ataque em área com Preciso 2.",
  },
  {
    id: "armadilha_runica",
    nome: "Armadilha Rúnica",
    disciplinaId: "oficio-constructo",
    tipo: "Armadilha",
    custoManaQuebrada: 2,
    descritoresConcedidos: ["magia", "preciso_2"],
    integridade: 1,
    funcoes: ["Disparo: ataque mágico Preciso 2, 1 ferimento, único quando um inimigo entra na zona dela (rearma na próxima cena).", "Alarme: avisa o dono quando algo passa."],
    magiaUnica: "Rede Rúnica (1 MP): o alvo fica Lento 1 por uma rodada.",
  },
  {
    // 23/10: funcao "Golpe" era Letal e Perfurante — o documento só
    // confirma Letal (igual o descritor contínuo da arma).
    id: "arma_viva",
    nome: "Arma Viva",
    disciplinaId: "oficio-constructo",
    tipo: "Arma criada",
    custoManaQuebrada: 2,
    descritoresConcedidos: ["letal"],
    integridade: 1,
    funcoes: ["Golpe: corpo a corpo ou arremesso, Letal, 1 ferimento.", "Defesa: o dono ganha +1 dado ao se defender."],
    magiaUnica: "Corte Conjurado (2 MP): ataque que atinge duas zonas.",
  },
  {
    // 23/10: Contínuo ganhou Resistente, além do Blindado que já tinha.
    id: "armadura_animada",
    nome: "Armadura Animada",
    disciplinaId: "oficio-constructo",
    tipo: "Armadura criada",
    custoManaQuebrada: 2,
    descritoresConcedidos: ["blindado", "resistente"],
    integridade: 3,
    funcoes: ["Escudo: o dono ganha Blindado e Resistente.", "Reflexo: reação 1 vez por cena, devolve ao atacante 1 sucesso líquido."],
    magiaUnica: "Aegis (1 MP): estende Blindado a um aliado por uma cena.",
    observacao: "Descritores não acumulam com os de outra armadura.",
  },
  {
    id: "servo_familiar",
    nome: "Servo Familiar",
    disciplinaId: "oficio-constructo",
    tipo: "Servo",
    custoManaQuebrada: 2,
    descritoresConcedidos: ["magia"],
    integridade: 1,
    funcoes: ["Batedor: dá ao dono visão de outra zona.", "Mensageiro: carrega itens e recados."],
    magiaUnica: "Olho do Familiar (1 MP): marca até 2 alvos numa rede de visão.",
    continuoTexto: "Carrega a habilidade Sensor de graça (não custa MP).",
  },
  {
    id: "torre_eletrica",
    nome: "Torre Elétrica",
    disciplinaId: "oficio-constructo",
    tipo: "Torre",
    custoManaQuebrada: 2,
    descritoresConcedidos: ["magia", "carga_2"],
    integridade: 2,
    funcoes: ["Disparo carregado: ataque mágico que deixa Carga 2.", "Ponto de conjuração: magias do dono lançadas a partir dela custam 1 MP a menos."],
    magiaUnica: "Corrente Elétrica (2 MP): atinge dois alvos na zona, ambos recebem Carga 1.",
  },
];

export function getConstructoPorId(id) {
  return CONSTRUCTO.find((c) => c.id === id) || null;
}

// Catálogo de INVOCAÇÃO (ofício mágico "Invocação", 23/10 — item novo:
// antes só existiam os 3 ataques "Magia", agora em MAGIAS acima). Mesmo
// padrão de mana quebrada de ENCANTAMENTOS/ALQUIMIA (toggle, quebra 1 mana
// pra existir enquanto ativo). `character.invocacoesAtivas` guarda os ids
// ativos.
//
// "Invocar Arma" não gera uma linha de ataque derivada (ao contrário do
// slot "Arma" do painel Equipamento) nem modela a escolha do tipo do
// catálogo de armas — fica como toggle + texto de referência, não
// mecanizado (ver relatório).
export const INVOCACAO = [
  {
    id: "invocar_arma",
    nome: "Invocar Arma",
    disciplinaId: "oficio-invocacao",
    tipo: "Invocação",
    custoManaQuebrada: 1,
    efeito: "Invoca uma arma de qualquer tipo do catálogo de armas (escolha o tipo ao ativar — não modelado aqui, ver o slot Arma do painel Equipamento). Dura enquanto a mana estiver quebrada. Só o Descritor 1 do tipo vale (sem perícia, a menos que o usuário tenha a perícia da família ou o encantamento Perícia Encantada). O ataque usa Base mágica + ofícios mágicos (sem Destreza), com +1 de ajuste de acerto. Armas arremessadas voltam à mão ao fim do turno e, se soltas ou destruídas, podem ser re-invocadas de graça uma vez por cena.",
  },
  {
    id: "escudo_invocado",
    nome: "Escudo Invocado",
    disciplinaId: "oficio-invocacao",
    tipo: "Invocação",
    custoManaQuebrada: 1,
    descritoresConcedidos: ["firme_1"],
    efeito: "Invoca um escudo espectral. Quem bloqueia (Força + Defesa) ganha Firme 1 enquanto a mana estiver quebrada.",
  },
  {
    id: "arma_de_brasa",
    nome: "Arma de Brasa",
    disciplinaId: "oficio-invocacao",
    tipo: "Invocação",
    custoManaQuebrada: 1,
    descritoresConcedidos: ["queimadura_1"],
    efeito: "A arma invocada ganha Queimadura 1. Variações possíveis: Carga 2 (elétrica) ou Envenenamento 1 — escolha de texto, não modelada como opção separada.",
  },
];

export function getInvocacaoPorId(id) {
  return INVOCACAO.find((i) => i.id === id) || null;
}

// Mesmo padrão de descritoresDeEncantamentosAtivos, pras invocações ativas
// (`character.invocacoesAtivas`).
export function descritoresDeInvocacoesAtivas(character) {
  const ativos = character?.invocacoesAtivas || [];
  const vistos = new Set();
  const resultado = [];
  for (const id of ativos) {
    const invocacao = getInvocacaoPorId(id);
    for (const d of invocacao?.descritoresConcedidos || []) {
      if (!vistos.has(d)) {
        vistos.add(d);
        resultado.push(d);
      }
    }
  }
  return resultado;
}

// Habilidades conjuntas: exigem MAIS DE UM ofício mágico. Todas quebram 1
// mana (máximo da regra de desenho). 23/10 (docs/ATUALIZACAO_23-10.md seção
// 8): Elixir Drenante entrou aqui (saiu de Alquimia sozinha — agora exige
// Alquimia + Encantamentos, igual as outras habilidades conjuntas com
// Alquimia). Círculo mágico só existe aqui (nunca esteve duplicado nas
// listas de Magias de guerra/Encantamentos).
// TODO: a checagem "o personagem tem os dois ofícios exigidos" NÃO é
// validada na UI ainda — fica só documentado em `oficiosExigidos`.
export const HABILIDADES_CONJUNTAS = [
  {
    id: "circulo_magico",
    nome: "Círculo mágico",
    oficiosExigidos: ["oficio-magias-de-guerra", "oficio-encantamentos"],
    custoManaQuebrada: 1,
    efeito: "Cria um círculo que armazena uma magia de guerra: conjura a magia gastando o MP normal dela e quebra 1 mana pra sustentar o círculo. Liberar a mana quebrada dispara a magia armazenada, a qualquer momento. Só pode ser pega com os dois ofícios.",
  },
  {
    id: "frasco_armazenado",
    nome: "Frasco Armazenado",
    oficiosExigidos: ["oficio-alquimia", "oficio-magias-de-guerra"],
    custoManaQuebrada: 1,
    efeito: "Prepara um frasco que guarda uma magia de guerra conjurada na hora (gasta o MP normal). Qualquer pessoa pode arremessá-lo depois, até o descanso longo. Versão portátil do Círculo.",
  },
  {
    id: "frasco_runico",
    nome: "Frasco Rúnico",
    oficiosExigidos: ["oficio-alquimia", "oficio-encantamentos"],
    custoManaQuebrada: 1,
    efeito: "Ao preparar um item alquímico, grava nele um descritor de encantamento (Letal, Perfurante, Preciso 1, Queimadura 1...). O descritor vale quando o item for usado.",
  },
  {
    id: "pocao_encantada",
    nome: "Poção Encantada",
    oficiosExigidos: ["oficio-alquimia", "oficio-encantamentos"],
    custoManaQuebrada: 1,
    efeito: "Uma poção que, ao ser bebida, concede um encantamento do usuário (ex.: Encantamento: Resistente) a quem bebeu por uma cena, sem que o beneficiário quebre mana.",
  },
  {
    id: "bomba_de_guerra",
    nome: "Bomba de Guerra",
    oficiosExigidos: ["oficio-alquimia", "oficio-magias-de-guerra"],
    custoManaQuebrada: 1,
    efeito: "Bomba que usa uma magia de guerra no lugar da versão pior: o item copia a magia inteira, sem as penalidades da bomba comum. Fica de melhoria pra quando as bombas estiverem fechadas.",
  },
  {
    id: "encantamento_venenoso",
    nome: "Encantamento Venenoso",
    oficiosExigidos: ["oficio-alquimia", "oficio-encantamentos"],
    custoManaQuebrada: 1,
    descritoresConcedidos: ["envenenamento_2"],
    efeito: "Enquanto a mana estiver quebrada, os ataques do usuário (físicos e mágicos) ganham Envenenamento 2 — acima do Envenenamento 1 de um item comum, porque exige os dois ofícios.",
  },
  {
    // 23/10: entrou aqui (saiu de Alquimia sozinha).
    id: "elixir_drenante",
    nome: "Elixir Drenante",
    oficiosExigidos: ["oficio-alquimia", "oficio-encantamentos"],
    custoManaQuebrada: 1,
    descritoresConcedidos: ["drenante"],
    efeito: "Sem rolagem. Durante uma cena, os ataques de quem bebe (físicos e mágicos) ganham Drenante. Exige os dois ofícios. Qualquer pessoa pode usar.",
  },
];

export function getHabilidadeConjuntaPorId(id) {
  return HABILIDADES_CONJUNTAS.find((h) => h.id === id) || null;
}
