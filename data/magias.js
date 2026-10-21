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
//   ("perfurante", "saturante", "letal", "sortudo", "queimadura"/
//   "queimadura_N" — ver engine.js:grauQueimadura) mais as que são só
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
  {
    id: "oficio-encantamentos", nome: "Ofício Mágico: Encantamentos", tipo: "oficio-magico",
    bonusTexto: "Bônus de grau ainda não definido. 8 encantamentos (21/10) — cada um quebra 1 mana e concede um descritor enquanto ela estiver quebrada.",
    descricao: "Disciplina de ofício mágico. Habilidades que, ao quebrar 1 mana, dão um descritor ao usuário ou aos ataques dele, físicos e mágicos.",
  },
  {
    id: "oficio-alquimia", nome: "Ofício Mágico: Alquimia", tipo: "oficio-magico",
    bonusTexto: "Bônus de grau ainda não definido. 19 itens preparáveis (21/10) — cada um quebra 1 mana, fora de combate, pra existir; qualquer pessoa pode usá-lo depois.",
    descricao: "Disciplina de ofício mágico. Itens preparados que quebram mana pra existir — ver engine.js:diceAtaqueAlquimia.",
  },
  {
    id: "oficio-constructo", nome: "Ofício Mágico: Constructo", tipo: "oficio-magico",
    bonusTexto: "Bônus de grau ainda não definido. 7 constructos (21/10, catálogo de dados só — sem UI de invocar/gerenciar ainda, ver CONTEXTO.md). Cada um quebra 2 mana.",
    descricao: "Disciplina de ofício mágico. Servos/torres/armadilhas/armas/armaduras criados, que agem só quando o dono manda — ver engine.js:diceAtaqueConstructo.",
  },
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
    descritores: ["magia", "em_area", "abrangente_2"],
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
    descritores: ["magia", "em_area", "abrangente_2"],
    custoMp: 1,
    ajusteDados: 0,
    feridas: 1,
    superficial: true,
    emArea: true,
  },
  {
    id: "misseis_magicos",
    nome: "Mísseis Mágicos",
    descritores: ["magia", "abrangente_2", "sortudo"],
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
    descritores: ["magia", "abrangente_2", "sortudo", "atrasada_1"],
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
  // Chama Mágica (Pedro, 19/10): primeira magia a usar o descritor Queimadura
  // (ver engine.js:grauQueimadura/resolveQueimadura). Nome e custo são
  // placeholders do Pedro ("nomes e custos são placeholders") — ajuste aqui
  // quando a planilha oficial tiver os valores finais.
  {
    id: "chama_magica",
    nome: "Chama Mágica",
    descritores: ["magia", "queimadura"],
    custoMp: 2,
    ajusteDados: 0,
    feridas: 1,
    superficial: false,
    emArea: false,
  },
  // Descarga Elétrica e Dreno de Mana (21/10, docs/ATUALIZACAO_21-10.md
  // seção 4, tabela "Magias de guerra" de oficios-por-aba.xlsx) —
  // "(Placeholder)" no texto do Pedro, nome/custo ainda a confirmar.
  {
    id: "descarga_eletrica",
    nome: "Descarga Elétrica",
    descritores: ["magia", "carga_2"],
    custoMp: 2,
    ajusteDados: 0,
    feridas: 1,
    superficial: true,
    emArea: false,
  },
  {
    id: "dreno_de_mana",
    nome: "Dreno de Mana",
    descritores: ["magia", "drenante"],
    custoMp: 1,
    ajusteDados: 0,
    feridas: 1,
    superficial: true,
    emArea: false,
  },
];

export function getMagiaPorId(id) {
  return MAGIAS.find((m) => m.id === id) || null;
}

// Catálogo de ENCANTAMENTOS (ofício mágico "Encantamentos", hoje `vazia:
// true` em DISCIPLINAS — primeira entrada concreta dele, decidida pelo
// Pedro em 19/10). Nome e custo são placeholders ("nomes e custos são
// placeholders", pedido do Pedro).
//
// Regra de mana quebrada (01 - Sistema/Magias e Disciplinas.md do
// Point-Vault, 15/10): "mana gasta que não regenera normalmente até o
// jogador escolher desquebrar". NENHUMA PARTE dessa economia (descontar/
// devolver MP, o botão de quebrar/desquebrar na ficha) existe no motor
// ainda — só a etiqueta textual na nota do vault. Por isso esta entrada e
// `descritoresDeEncantamentosAtivos` só modelam a CONSEQUÊNCIA do
// encantamento estar ativo (quais descritores ele concede); a ativação em
// si (campo `character.encantamentosAtivos`) é gravada por quem chama,
// sem nenhum desconto de mana — ver TODO no relatório final.
//
// Campos:
// - id: chave estável (usada em `character.encantamentosAtivos`).
// - nome: nome de exibição.
// - disciplinaId: a disciplina (DISCIPLINAS, acima) que dá acesso a este
//   encantamento.
// - custoManaQuebrada: quantos pontos de mana ficam quebrados enquanto
//   este encantamento está ativo (hoje só documentado — não desconta MP).
// - descritoresConcedidos: descritores que TODOS os ataques do usuário
//   (físicos e mágicos) ganham enquanto o encantamento está ativo.
// 21/10 (docs/ATUALIZACAO_21-10.md item 4 + planilha oficios-por-aba.xlsx,
// aba "Encantamentos"): as 6 entradas novas seguem o mesmo molde do
// Encantamento Flamejante — "(Placeholder)" no texto do Pedro pra todas,
// nome/custo a confirmar. "Pele Encantada" é a ÚNICA que concede um
// descritor ao USUÁRIO como defensor (Blindado), não aos ataques dele — por
// isso não entra na lista `DESCRITORES_DE_ATAQUE_DO_PERSONAGEM` do
// engine.js (ver descritoresEfetivosDoAtaque): o Blindado só precisa estar
// em `character.descritores` pra já funcionar (limiarAtaque/resolveQueimadura
// checam `temDescritor(defensor, "blindado")` direto), nada a mais a fazer
// aqui — o mesmo mecanismo que já suportava Queimadura de ataque já cobre
// Blindado de defesa, sem precisar de código novo.
export const ENCANTAMENTOS = [
  {
    id: "encantamento_flamejante",
    nome: "Encantamento Flamejante",
    disciplinaId: "oficio-encantamentos",
    custoManaQuebrada: 1,
    descritoresConcedidos: ["queimadura"],
    descricao:
      "Quebra 1 de mana. Enquanto a mana estiver quebrada, os ataques do " +
      "usuário — físicos e mágicos — ganham Queimadura 1.",
  },
  {
    id: "lamina_letal",
    nome: "Lâmina Letal",
    disciplinaId: "oficio-encantamentos",
    custoManaQuebrada: 1,
    descritoresConcedidos: ["letal"],
    descricao: "Quebra 1 de mana. Enquanto a mana estiver quebrada, os ataques do usuário — físicos e mágicos — ganham Letal. (Placeholder)",
  },
  {
    id: "ponta_perfurante",
    nome: "Ponta Perfurante",
    disciplinaId: "oficio-encantamentos",
    custoManaQuebrada: 1,
    descritoresConcedidos: ["perfurante"],
    descricao: "Quebra 1 de mana. Enquanto a mana estiver quebrada, os ataques do usuário — físicos e mágicos — ganham Perfurante. (Placeholder)",
  },
  {
    id: "golpe_abrangente",
    nome: "Golpe Abrangente",
    disciplinaId: "oficio-encantamentos",
    custoManaQuebrada: 1,
    descritoresConcedidos: ["abrangente_2"],
    descricao: "Quebra 1 de mana. Enquanto a mana estiver quebrada, os ataques do usuário — físicos e mágicos — ganham Abrangente 2. (Placeholder)",
  },
  {
    id: "pele_encantada",
    nome: "Pele Encantada",
    disciplinaId: "oficio-encantamentos",
    custoManaQuebrada: 1,
    descritoresConcedidos: ["blindado"],
    descricao: "Quebra 1 de mana. Enquanto a mana estiver quebrada, o usuário ganha Blindado. (Placeholder)",
  },
  {
    id: "sorte_encantada",
    nome: "Sorte Encantada",
    disciplinaId: "oficio-encantamentos",
    custoManaQuebrada: 1,
    descritoresConcedidos: ["sortudo"],
    descricao: "Quebra 1 de mana. Enquanto a mana estiver quebrada, o usuário ganha Sortudo. (Placeholder)",
  },
  {
    id: "encantamento_eletrico",
    nome: "Encantamento Elétrico",
    disciplinaId: "oficio-encantamentos",
    custoManaQuebrada: 1,
    descritoresConcedidos: ["carga_2"],
    descricao: "Quebra 1 de mana. Enquanto a mana estiver quebrada, os ataques do usuário — físicos e mágicos — ganham Carga 2. (Placeholder)",
  },
  {
    id: "encantamento_drenante",
    nome: "Encantamento Drenante",
    disciplinaId: "oficio-encantamentos",
    custoManaQuebrada: 1,
    descritoresConcedidos: ["drenante"],
    descricao: "Quebra 1 de mana. Enquanto a mana estiver quebrada, os ataques do usuário — físicos e mágicos — ganham Drenante. (Placeholder)",
  },
];

export function getEncantamentoPorId(id) {
  return ENCANTAMENTOS.find((e) => e.id === id) || null;
}

// União sem duplicar dos descritores concedidos pelos encantamentos ATIVOS
// do personagem (`character.encantamentosAtivos`, lista de ids — ver
// ENCANTAMENTOS acima). Mesmo padrão de racasCatalogo.js:descritoresDeSelecao.
// Quem monta o personagem EFETIVO (racasCatalogo.js:comGrausEfetivos) soma
// isto em `character.descritores`, de onde engine.js:descritoresEfetivosDoAtaque
// lê pra aplicar a Queimadura em qualquer ataque do personagem.
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

// Conduíte mágico (21/10, docs/ATUALIZACAO_21-10.md item 4): "existe em
// todo ofício mágico, ocupa 1 dos 3 espaços, conta +1 ofício. Só um
// Conduíte funciona por vez." Não é magia nem encantamento — é uma
// passiva, por isso não tem catálogo de instâncias (só este objeto de
// exibição): o estado é um único flag global, `character.conduiteAtivo`
// (ver racasCatalogo.js:comGrausEfetivos, que soma o +1 ofício em
// disciplinaMagica.oficiosExtras). "Só um por vez" é automático — é um
// booleano, não uma lista, então nunca existe mais de um ativo.
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

// Catálogo de ALQUIMIA (ofício mágico "Alquimia", 21/10, docs/
// ATUALIZACAO_21-10.md seção 4.1 + planilha oficios-por-aba.xlsx, aba
// "Alquimia"). Itens são PREPARADOS, só fora de combate: preparar quebra 1
// mana (character.itensAlquimicosPreparados, mesmo mecanismo de
// quebrarMana/repararMana de ENCANTAMENTOS — ver DisciplinaSlotPicker em
// point-amaranth-app.jsx). Diferente de Encantamentos, um item preparado
// NÃO concede descritor nenhum ao dono automaticamente — ele é um objeto
// que QUALQUER UM pode usar depois, com os parâmetros de quem criou
// (rolagem: engine.js:diceAtaqueAlquimia = Destreza + ofícios/Inteligência,
// sem Base mágica nem mana extra).
//
// TODO (não implementado — ver relatório final): "1 item grátis por ofício
// mágico" (hoje preparar sempre quebra mana, sem itens de graça), "usar o
// item de quem criou" (não há fluxo de "usar item preparado num alvo" —
// a UI só liga/desliga `itensAlquimicosPreparados`, documentando que o
// item existe), efeitos específicos de cada item (Poção de Cura curar de
// verdade, Elixir de Vigor proteger o próximo ferimento, etc.) e "válido
// até o descanso longo" (não há conceito de descanso longo no app).
//
// Campos:
// - id/nome/disciplinaId: iguais aos de ENCANTAMENTOS.
// - tipo: "Ataque" (rola, usa descritores/feridas) ou "Suporte" (semRolagem,
//   efeito descrito em texto — mesmo padrão de MAGIAS:Escudo de Mana).
// - descritores/feridas/superficial/emArea: só em itens tipo "Ataque",
//   mesmos campos de MAGIAS (usam diceAtaqueAlquimia, não diceAtaqueMagico).
// - custoManaQuebrada: sempre 1 em Alquimia (regra de desenho: máximo 1 por
//   habilidade — só Constructo foge disso, com 2).
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
    descritores: ["magia", "em_area", "abrangente_2"],
    feridas: 1,
    superficial: true,
    emArea: true,
    efeito: "Versão pior do Shin: onda de choque na zona alvo (não na do usuário). Aliados na zona também são atingidos.",
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
    efeito: "Versão pior do Bombardeio de Mana: atinge a zona alvo, mas sem Abrangente.",
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
    efeito: "Versão pior da Torrente Mágica: mesmo descritor Letal, mas 1 ferimento em vez de 2.",
  },
  {
    id: "bomba_de_fumaca",
    nome: "Bomba de Fumaça",
    disciplinaId: "oficio-alquimia",
    tipo: "Suporte",
    custoManaQuebrada: 1,
    semRolagem: true,
    efeito: "Sem rolagem. A zona alvo fica encoberta por uma cena: quem estiver nela ganha Blindado.",
  },
  {
    id: "tonico_veloz",
    nome: "Tônico Veloz",
    disciplinaId: "oficio-alquimia",
    tipo: "Suporte",
    custoManaQuebrada: 1,
    semRolagem: true,
    descritoresConcedidos: ["veloz"],
    efeito: "Sem rolagem. Quem bebe ganha Veloz (prioridade +1) por uma cena. Qualquer pessoa pode usar, com os parâmetros de quem criou.",
  },
  {
    id: "elixir_de_mana",
    nome: "Elixir de Mana",
    disciplinaId: "oficio-alquimia",
    tipo: "Suporte",
    custoManaQuebrada: 1,
    semRolagem: true,
    efeito: "Sem rolagem. Quem bebe recupera 1 mana gasta (não quebrada). Uma vez por cena por pessoa. Provisório. Qualquer pessoa pode usar, com os parâmetros de quem criou.",
  },
  {
    id: "oleo_inflamavel",
    nome: "Óleo Inflamável",
    disciplinaId: "oficio-alquimia",
    tipo: "Suporte",
    custoManaQuebrada: 1,
    semRolagem: true,
    descritoresConcedidos: ["queimadura"],
    efeito: "Sem rolagem. O próximo ataque do alvo (físico ou mágico) ganha Queimadura 1. Serve também para armas de aliados.",
  },
  {
    id: "acido_corrosivo",
    nome: "Ácido Corrosivo",
    disciplinaId: "oficio-alquimia",
    tipo: "Suporte",
    custoManaQuebrada: 1,
    semRolagem: true,
    efeito: "Sem rolagem. Um alvo perde o Blindado até o fim da cena (Goethiano inclusive). Pool do arremesso, se precisar acertar: Destreza + (ofícios ou Inteligência). LEMBRAR: quando existirem armaduras, esta habilidade deve interagir com elas também.",
  },
  {
    id: "frasco_de_gosma",
    nome: "Frasco de Gosma",
    disciplinaId: "oficio-alquimia",
    tipo: "Suporte",
    custoManaQuebrada: 1,
    semRolagem: true,
    efeito: "Sem dano. Quem estiver na zona alvo fica com prioridade -1 durante a cena (só etiqueta por enquanto).",
  },
  {
    id: "catalisador",
    nome: "Catalisador",
    disciplinaId: "oficio-alquimia",
    tipo: "Suporte",
    custoManaQuebrada: 1,
    semRolagem: true,
    efeito: "Sem rolagem. A próxima magia do alvo custa 1 MP a menos (mínimo 0). Não vale para itens e constructos.",
  },
  {
    id: "elixir_de_vigor",
    nome: "Elixir de Vigor",
    disciplinaId: "oficio-alquimia",
    tipo: "Suporte",
    custoManaQuebrada: 1,
    semRolagem: true,
    efeito: "Sem rolagem. O próximo ferimento que o alvo receber vira superficial, mesmo que passasse do Vigor. Uma vez por cena por pessoa.",
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
    efeito: "Explode na zona alvo. Rola o ataque; se causar ao menos 1 sucesso líquido, cada alvo atingido rola 2 dados de Envenenamento (7+, ignora defesa e Blindado). Aliados na zona também são atingidos.",
  },
  {
    id: "veneno_de_arma",
    nome: "Veneno de Arma",
    disciplinaId: "oficio-alquimia",
    tipo: "Suporte",
    custoManaQuebrada: 1,
    semRolagem: true,
    descritoresConcedidos: ["envenenamento"],
    efeito: "Sem rolagem. O próximo ataque do alvo (físico ou mágico) ganha Envenenamento 1. Serve também para armas de aliados.",
  },
  {
    id: "antidoto",
    nome: "Antídoto",
    disciplinaId: "oficio-alquimia",
    tipo: "Suporte",
    custoManaQuebrada: 1,
    semRolagem: true,
    efeito: "Sem rolagem. Cura o veneno do alvo: zera o limite de veneno dele. Provisório: também cura os ferimentos superficiais de veneno que ele tinha?",
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
    efeito: "Explode na zona alvo. Rola o ataque; cada sucesso líquido deixa 1 carga em cada alvo atingido. Ao chegar a 2 cargas, o alvo descarrega. Aliados na zona também são atingidos. (Placeholder)",
  },
  {
    id: "elixir_drenante",
    nome: "Elixir Drenante",
    disciplinaId: "oficio-alquimia",
    tipo: "Suporte",
    custoManaQuebrada: 1,
    semRolagem: true,
    descritoresConcedidos: ["drenante"],
    efeito: "Sem rolagem. O próximo ataque do alvo (físico ou mágico) ganha Drenante. Serve também para armas de aliados. (Placeholder)",
  },
];

export function getItemAlquimicoPorId(id) {
  return ALQUIMIA.find((i) => i.id === id) || null;
}

// Catálogo de CONSTRUCTO (ofício mágico "Constructo", 21/10, docs/
// ATUALIZACAO_21-10.md seção 4.2 + planilha oficios-por-aba.xlsx, aba
// "Constructo"). "Quebra 2 mana" (exceção à regra de 1 por habilidade); o
// constructo fica com o personagem enquanto a mana estiver quebrada.
// Magias feitas através dele custam 1 MP a menos. Quando destruído, só 1
// das 2 manas quebradas volta. Pool: engine.js:diceAtaqueConstructo.
//
// TODO (não implementado — ver relatório final): não há "invocar
// constructo" na UI nem tracking de Integridade (HP próprio do
// constructo), nem as "funções" como ações separadas, nem a magia única de
// cada um, nem o desconto de 1 MP em magias conjuradas através dele. Só o
// catálogo de dados e a fórmula de pool (diceAtaqueConstructo) existem —
// o resto fica pra quando o Pedro decidir a UI (o guia marca "tudo aqui é
// provisório").
//
// Campos: id/nome/disciplinaId iguais aos de ALQUIMIA; `tipo` é o tipo de
// constructo (Servo/Torre/Armadilha/Arma criada/Armadura criada);
// `descritoresConcedidos` é o efeito "Contínuo" (constante, não uma
// função); `integridade` é quantos ferimentos o constructo aguenta antes
// de ser destruído; `funcoes` e `magiaUnica` ficam como texto de
// referência (não viram ações separadas na UI ainda).
export const CONSTRUCTO = [
  {
    id: "golem_guardiao",
    nome: "Golem Guardião",
    disciplinaId: "oficio-constructo",
    tipo: "Servo",
    custoManaQuebrada: 2,
    descritoresConcedidos: ["blindado"],
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
    magiaUnica: "Salva da Torre (2 MP): ataque em área com Abrangente 2.",
  },
  {
    id: "armadilha_runica",
    nome: "Armadilha Rúnica",
    disciplinaId: "oficio-constructo",
    tipo: "Armadilha",
    custoManaQuebrada: 2,
    descritoresConcedidos: ["magia", "abrangente_2"],
    integridade: 1,
    funcoes: ["Disparo: ataque mágico Abrangente 2, 1 ferimento, único quando um inimigo entra na zona dela (rearma na próxima cena).", "Alarme: avisa o dono quando algo passa."],
    magiaUnica: "Rede Rúnica (1 MP): o alvo age com prioridade -1 por uma rodada (só etiqueta).",
  },
  {
    id: "arma_viva",
    nome: "Arma Viva",
    disciplinaId: "oficio-constructo",
    tipo: "Arma criada",
    custoManaQuebrada: 2,
    descritoresConcedidos: ["letal"],
    integridade: 1,
    funcoes: ["Golpe: corpo a corpo ou arremesso, Letal e Perfurante, 1 ferimento.", "Defesa: o dono ganha +1 dado ao se defender."],
    magiaUnica: "Corte Conjurado (2 MP): ataque que atinge duas zonas.",
  },
  {
    id: "armadura_animada",
    nome: "Armadura Animada",
    disciplinaId: "oficio-constructo",
    tipo: "Armadura criada",
    custoManaQuebrada: 2,
    descritoresConcedidos: ["blindado"],
    integridade: 3,
    funcoes: ["Escudo: o dono ganha Blindado.", "Reflexo: reação 1 vez por cena, devolve ao atacante 1 sucesso líquido."],
    magiaUnica: "Aegis (1 MP): estende Blindado a um aliado por uma cena.",
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
    contínuoTexto: "Carrega a magia Sensor de graça (não custa MP).",
  },
  {
    id: "torre_eletrica",
    nome: "Torre Elétrica",
    disciplinaId: "oficio-constructo",
    tipo: "Torre",
    custoManaQuebrada: 2,
    descritoresConcedidos: ["magia"],
    integridade: 2,
    funcoes: ["Disparo carregado: ataque mágico que deixa Carga 2.", "Ponto de conjuração: magias do dono lançadas a partir dela custam 1 MP a menos."],
    magiaUnica: "Corrente Elétrica (2 MP): atinge dois alvos na zona, ambos recebem Carga 1. (Placeholder)",
  },
];

export function getConstructoPorId(id) {
  return CONSTRUCTO.find((c) => c.id === id) || null;
}

// Habilidades conjuntas (21/10, docs/ATUALIZACAO_21-10.md item 4 + planilha
// oficios-por-aba.xlsx, aba "Habilidades conjuntas"): exigem MAIS DE UM
// ofício mágico. Todas quebram 1 mana (máximo da regra de desenho).
// TODO: a checagem "o personagem tem os dois ofícios exigidos" NÃO é
// validada na UI ainda — fica só documentado em `oficiosExigidos`.
export const HABILIDADES_CONJUNTAS = [
  {
    id: "circulo_magico",
    nome: "Círculo mágico",
    oficiosExigidos: ["oficio-magias-de-guerra", "oficio-encantamentos"],
    custoManaQuebrada: 1,
    efeito: "Cria um círculo que armazena uma magia de guerra (gasta o MP normal dela); liberar a mana quebrada dispara a magia armazenada, a qualquer momento.",
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
    efeito: "Ao preparar um item alquímico, grava nele um descritor de encantamento (Letal, Perfurante, Abrangente 2, Queimadura 1...). O descritor vale quando o item for usado.",
  },
  {
    id: "pocao_encantada",
    nome: "Poção Encantada",
    oficiosExigidos: ["oficio-alquimia", "oficio-encantamentos"],
    custoManaQuebrada: 1,
    efeito: "Uma poção que, ao ser bebida, concede um encantamento do usuário (ex.: Pele Encantada) a quem bebeu por uma cena, sem que o beneficiário quebre mana.",
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
    efeito: "Enquanto a mana estiver quebrada, os ataques do usuário (físicos e mágicos) ganham Envenenamento 2 — acima do Envenenamento 1 de um item comum, porque exige os dois ofícios. Provisório.",
  },
];

export function getHabilidadeConjuntaPorId(id) {
  return HABILIDADES_CONJUNTAS.find((h) => h.id === id) || null;
}
