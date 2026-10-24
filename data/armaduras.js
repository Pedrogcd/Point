// Catálogo de TIPOS de armadura (docs/ATUALIZACAO_21-10.md seção 7,
// planilha armaduras.xlsx, 21/10). 12 tipos genéricos — na ficha a pessoa
// escolhe o tipo e digita o nome. Mesmo padrão não-destrutivo do catálogo
// de armas (data/armas.js): dados aqui, engine.js só consome genericamente.
//
// `slot` é "armadura" | "escudo" | "acessorio" — separado de `familia`
// (grupo de flavor/perícia) porque a planilha não os faz coincidir: Escudo
// de mana é família "Mágica", não "Escudo", mas ocupa o slot escudo do
// mesmo jeito. Limite da ficha: 1 peça por slot (1 armadura + 1 escudo + 1
// acessório ao mesmo tempo, Regra 5).
//
// `bonusDefesa` soma em DADOS no pool de defesa (0 onde a planilha não lista
// bônus). `descritoresConcedidos` são os descritores que a peça dá a quem
// veste, sempre ativos — EXCETO quando `custoManaAtivar > 0`: nesse caso só
// valem enquanto a mana correspondente estiver ativa/quebrada (Vestimenta
// rúnica é a única peça "mágica" que NÃO precisa disso — a nota do Pedro diz
// que o Selado dela "pode ser sempre ativa", só cobra o SP de equipar).
//
// `custoSpEquipar`: quanto SP QUEBRADO custa equipar a peça (uma vez, no
// momento de equipar — "equipar já consome o SP, mesmo que o item não seja
// ativado", Regra 6). SP quebrado só volta no descanso longo (ver
// engine.js:quebrarSP/repararSP) — bem diferente da mana quebrada, que
// qualquer um repara de graça fora de combate.
//
// `periciaFamilia`: nome da disciplina de perícia necessária pra NÃO sofrer
// a penalidade de -1 dado na defesa (Regra 4) — null nas famílias que não
// exigem (Leve, Média). As disciplinas em si ainda não existem no app
// (mesmo caso das armas, `temPericia` é campo manual na ficha).
//
// `extra`: texto livre pra mecânicas bespoke que a planilha anota na coluna
// "Extra" e que não são um dos 7 descritores genéricos — hoje só a Armadura
// de placas completa tem ("1 sucesso garantido em qualquer defesa... rola
// defesa com 1 dado a menos"). NÃO mecanizado (só o Lento 1 dela, via
// descritoresConcedidos, é real) — ver CONFLITO no relatório final.
export const ARMADURAS = [
  { id: "vestimenta_reforcada", nome: "Vestimenta reforçada", familia: "Leve", slot: "armadura", exemplos: "Gibão, couro grosso, casaco blindado", bonusDefesa: 1, descritoresConcedidos: ["resistente"], custoSpEquipar: 0, custoManaAtivar: 0, periciaFamilia: null, extra: null },
  { id: "armadura_leve", nome: "Armadura leve", familia: "Leve", slot: "armadura", exemplos: "Couro batido, gibão de malha", bonusDefesa: 0, descritoresConcedidos: ["resistente"], custoSpEquipar: 0, custoManaAtivar: 0, periciaFamilia: null, extra: null },
  { id: "armadura_media", nome: "Armadura média", familia: "Média", slot: "armadura", exemplos: "Cota de malha, brigandina", bonusDefesa: 0, descritoresConcedidos: ["resistente", "blindado"], custoSpEquipar: 0, custoManaAtivar: 0, periciaFamilia: null, extra: null },
  { id: "armadura_de_placas_completa", nome: "Armadura de placas completa", familia: "Pesada", slot: "armadura", exemplos: "Placas, armadura de cavaleiro", bonusDefesa: 0, descritoresConcedidos: ["resistente", "blindado", "lento_1"], custoSpEquipar: 0, custoManaAtivar: 0, periciaFamilia: "Armaduras pesadas", extra: "1 sucesso garantido em qualquer defesa (esquiva e bloqueio); rola defesa com 1 dado a menos." },
  { id: "escudo_leve", nome: "Escudo leve", familia: "Escudo", slot: "escudo", exemplos: "Broquel, rodela", bonusDefesa: 0, descritoresConcedidos: ["firme_1"], custoSpEquipar: 0, custoManaAtivar: 0, periciaFamilia: "Escudos", extra: "Só ao bloquear: rola defesa de Força com 1 dado a menos e 1 sucesso garantido." },
  { id: "armadura_de_poder_base", nome: "Armadura de poder base (power armor)", familia: "Tecnologia", slot: "armadura", exemplos: "Couraça de caldeira, blindagem de latão", bonusDefesa: 0, descritoresConcedidos: ["resistente", "potente_forca", "lento_1"], custoSpEquipar: 1, custoManaAtivar: 0, periciaFamilia: "Armaduras de poder", extra: null },
  { id: "exoesqueleto", nome: "Exoesqueleto", familia: "Tecnologia", slot: "armadura", exemplos: "Esqueleto mecânico, juntas hidráulicas", bonusDefesa: 0, descritoresConcedidos: ["resistente", "potente_destreza", "lento_1"], custoSpEquipar: 1, custoManaAtivar: 0, periciaFamilia: "Armaduras de poder", extra: null },
  { id: "armadura_catalisadora", nome: "Armadura catalisadora (power armor)", familia: "Tecnologia", slot: "armadura", exemplos: "Traje de caldeira com núcleo de mana, mecha de infantaria", bonusDefesa: 0, descritoresConcedidos: ["resistente", "potente_oficio_magico", "lento_1"], custoSpEquipar: 1, custoManaAtivar: 0, periciaFamilia: "Armaduras de poder", extra: null },
  { id: "vestimenta_runica", nome: "Vestimenta rúnica", familia: "Mágica", slot: "armadura", exemplos: "Manto encantado, túnica de runas", bonusDefesa: 1, descritoresConcedidos: ["selado_1"], custoSpEquipar: 1, custoManaAtivar: 0, periciaFamilia: "Armadura mágica", extra: "Liga com Encantamentos (Pele Encantada). Pode ser sempre ativa." },
  { id: "armadura_de_mana", nome: "Armadura de mana", familia: "Mágica", slot: "armadura", exemplos: "Cota espectral, placas de mana solidificada", bonusDefesa: 1, descritoresConcedidos: ["campo_de_mana"], custoSpEquipar: 1, custoManaAtivar: 1, periciaFamilia: "Armadura mágica", extra: "Campo de mana permanente sobre o corpo, com +1 de Defesa." },
  { id: "escudo_de_mana", nome: "Escudo de mana", familia: "Mágica", slot: "escudo", exemplos: "Escudo de luz, égide", bonusDefesa: 0, descritoresConcedidos: ["firme_2"], custoSpEquipar: 1, custoManaAtivar: 1, periciaFamilia: "Armadura mágica", extra: "Só ao bloquear: rola defesa de Força com 2 dados a menos e 2 sucessos garantidos." },
  { id: "chifre_de_mana", nome: "Chifre de Mana", familia: "Acessório mágico", slot: "acessorio", exemplos: "Tiara, diadema, coroa de mana", bonusDefesa: 0, descritoresConcedidos: ["campo_de_mana"], custoSpEquipar: 0, custoManaAtivar: 1, periciaFamilia: null, extra: "Armadura leve que não dá proteção. Ativo, transforma o primeiro dano agravante em superficial e se desliga. Reativar: quebrar uma nova mana como ação." },
];

export function getArmaduraPorId(id) {
  return ARMADURAS.find((a) => a.id === id) || null;
}

export function armadurasDoSlot(slot) {
  return ARMADURAS.filter((a) => a.slot === slot);
}

// Descritores EFETIVOS do equipamento defensivo de um personagem — mesmo
// padrão de data/magias.js:descritoresDeEncantamentosAtivos. Peças que
// exigem mana ativa (custoManaAtivar > 0) só contam enquanto a flag
// correspondente (`character.equipamento.manaAtiva<Slot>`) estiver ligada;
// as demais valem sempre que equipadas. Quem monta o personagem EFETIVO
// (racasCatalogo.js:comGrausEfetivos) soma isto em `character.descritores`.
export function descritoresDeEquipamentoDefensivo(character) {
  const eq = character?.equipamento || {};
  const vistos = new Set();
  const resultado = [];
  const add = (lista) => {
    for (const d of lista || []) {
      if (!vistos.has(d)) {
        vistos.add(d);
        resultado.push(d);
      }
    }
  };
  const peca = (id, manaAtiva) => {
    const armadura = getArmaduraPorId(id);
    if (!armadura) return;
    if (armadura.custoManaAtivar > 0 && !manaAtiva) return;
    add(armadura.descritoresConcedidos);
  };
  peca(eq.armaduraId, eq.manaAtivaArmadura);
  peca(eq.escudoId, eq.manaAtivaEscudo);
  peca(eq.acessorioId, eq.manaAtivaAcessorio);
  return resultado;
}

// Soma do bônus de Defesa (em dados) das peças equipadas — não depende de
// mana ativa (o bônus de Defesa da planilha não é condicional a isso em
// nenhuma peça: Vestimenta rúnica e Armadura de mana dão +1 só por estarem
// equipadas).
export function bonusDefesaDeEquipamento(character) {
  const eq = character?.equipamento || {};
  const soma = (id) => getArmaduraPorId(id)?.bonusDefesa || 0;
  return soma(eq.armaduraId) + soma(eq.escudoId) + soma(eq.acessorioId);
}

// Regra 4: "Sem a perícia da família, a pessoa usa a armadura normalmente,
// mas rola a defesa com 1 dado a menos." Conta 1 penalidade por peça
// (armadura, escudo) que EXIGE perícia (periciaFamilia != null) e cujo
// `temPericia<Slot>` manual está desmarcado — podem somar (armadura E
// escudo sem perícia ao mesmo tempo = -2). Acessório nunca exige perícia
// (nenhuma das famílias de perícia da Regra 4 cobre acessório).
// `periciaAutomatica(peca)` (opcional): perícia que vem de outra fonte além
// do checkbox manual — hoje a Proficiência em Armaduras de Magias de guerra
// (23/10, ver data/magias.js:periciasDeOficio, passada por
// racasCatalogo.js:comGrausEfetivos).
export function penalidadeDefesaSemPericiaDoPersonagem(character, periciaAutomatica = () => false) {
  const eq = character?.equipamento || {};
  let penalidade = 0;
  const checar = (id, temPericia) => {
    const armadura = getArmaduraPorId(id);
    if (armadura?.periciaFamilia && !temPericia && !periciaAutomatica(armadura)) penalidade += 1;
  };
  checar(eq.armaduraId, eq.temPericiaArmadura);
  checar(eq.escudoId, eq.temPericiaEscudo);
  return penalidade;
}
