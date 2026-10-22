// Catálogo de raças/habilidades raciais — fonte única: catalogo-racas.json.
// Funções puras (sem React), usadas pela UI (point-amaranth-app.jsx) e pela
// migração de fichas antigas (personagens.js); testadas em racasCatalogo.test.js.
import catalogo from "./catalogo-racas.json" with { type: "json" };
import { GRADE_ORDER, PROFICIENCIAS_LIST } from "./engine.js";
import { DISCIPLINAS, getDisciplinaPorId, descritoresDeEncantamentosAtivos } from "./data/magias.js";
import { descritoresDeEquipamentoDefensivo, penalidadeDefesaSemPericiaDoPersonagem, bonusDefesaDeEquipamento } from "./data/armaduras.js";

export const CATALOGO_RACAS = catalogo;

export function listaRacas() {
  return catalogo.racas;
}

export function encontrarRaca(racaId) {
  if (!racaId) return null;
  return catalogo.racas.find((r) => r.id === racaId) || null;
}

export function encontrarPrincipal(raca, principalId) {
  if (!raca || !principalId) return null;
  return raca.principais.find((p) => p.id === principalId) || null;
}

export function encontrarSecundaria(raca, secundariaId) {
  if (!raca || !secundariaId) return null;
  return raca.secundarias.find((s) => s.id === secundariaId) || null;
}

// União sem duplicar dos descritores das entradas ativas (habilidade principal
// e/ou secundária escolhidas). Disciplina (Humano) não carrega descritor no
// catálogo, então nunca entra aqui — ainda não há regra ligada a eles (só
// armazenamento), por pedido do Pedro.
export function descritoresDeSelecao(...entradas) {
  const vistos = new Set();
  const resultado = [];
  for (const entrada of entradas) {
    for (const d of entrada?.descritores || []) {
      if (!vistos.has(d)) {
        vistos.add(d);
        resultado.push(d);
      }
    }
  }
  return resultado;
}

// Checa se o personagem tem um descritor ativo (vindo de `character.descritores`
// — já é a união sem duplicar das habilidades principal/secundária escolhidas,
// ver descritoresDeSelecao). Existe pra não repetir `(character?.descritores ||
// []).includes(id)` em todo lugar que precisa checar um descritor específico
// (ex.: Sortudo, Ignora Blindado) — hoje é só esse `includes`, mas é o ponto
// único pra outras fontes de descritor (ex.: armadura dando Blindado) entrarem
// no futuro sem precisar caçar cada chamada.
export function temDescritor(character, id) {
  return (character?.descritores || []).includes(id);
}

// Remapeamento do esquema antigo (racaId/habilidadePrincipalId/habilidadeSecundariaId,
// enviado nos PRs #30/#31) pro novo (raca/habilidadePrincipal) — os ids de
// habilidade principal mudaram de formato (ex.: "sharkan" -> "descendentes-de-sharkan").
// A raça usa o mesmo id nos dois esquemas, sem remapeamento. A secundária antiga
// não migra: o conceito mudou (antes era só "outra habilidade principal da
// mesma raça", decorativa e neutra; agora é uma lista própria e distinta,
// secundarias[]) — não existe de-para seguro entre os dois.
export const REMAPEAMENTO_HABILIDADE_PRINCIPAL_LEGADO = {
  mana_concentrada: "mana-concentrada",
  mana_fluida: "mana-fluida",
  mana_estatica: "mana-estatica",
  sharkan: "descendentes-de-sharkan",
  arcani: "descendentes-de-arcani",
  sabato: "descendentes-de-sabato",
  coelho_bode: "coelho-bode",
  leonino: "leonino",
  reptiliano: "reptiliano",
  lobo_canino: "lobo-canino",
  urso: "urso",
  radiante: "cla-radiante",
  noctis: "cla-noctis",
  corvus: "cla-corvus",
  seasus: "cla-seasus",
  natrus: "cla-natrus",
  texoni: "texoni",
  kutrefas: "kutrefas",
  terramak: "terramak",
  kurlav: "kurlav",
  haxos: "haxos",
  anjo: "anjo",
  demonio: "demonio",
  fada: "fada",
};

// Inferência de raça/habilidades a partir de texto livre (21/10, pedido do
// Pedro: "migre fichas existentes, ex. Raiko, pelo nome da habilidade") —
// pra fichas de ANTES até do esquema racaId/habilidadePrincipalId (PR #30/
// #31): só têm `character.race` (string livre, ex. "Ningen Leonino") e/ou
// `character.racialAbility.name`/`description` (texto solto, ex. "Niosh —
// Agressividade Oni · Descendente de Arcani", caso da Raiko). Só migra
// quando dá pra ter certeza: exatamente 1 raça (Humano/Niosh/Ningen/Elfo)
// citada pela palavra-chave, e no máximo 1 habilidade principal e 1
// secundária batendo por nome — ambíguo ou sem nenhuma pista vira `null`
// (não force uma raça errada). Dragonato/Tengou nunca batem aqui porque a
// palavra-chave não existe pra eles (não precisa de bloqueio explícito).
const PALAVRA_CHAVE_RACA = { niosh: "niosh", ningen: "ningen", elfo: "elf", humano: "human" };

function normalizarTextoBusca(s) {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// "Coelho / Bode" -> ["Coelho","Bode"]; "Clã Radiante" -> ["Radiante"];
// "Descendentes de Arcani" -> ["Arcani"]; "Leonino (felinos)" -> ["Leonino"].
function apelidosDeHabilidade(nome) {
  const semParenteses = nome.replace(/\([^)]*\)/g, "").trim();
  const semPrefixo = semParenteses.replace(/^Clã\s+/i, "").replace(/^Descendentes?\s+de\s+/i, "");
  const partes = semPrefixo.split("/").map((p) => p.trim()).filter(Boolean);
  return partes.length ? partes : [semPrefixo];
}

// Compara tolerando gênero (Goethiano/Goethiana) via um stem leve (tira só
// a última vogal o/a antes de comparar) — sem isso "Humana (Goethiana)"
// nunca bateria com o nome "Goethiano" do catálogo.
function stemLeve(s) {
  return /[oa]$/.test(s) ? s.slice(0, -1) : s;
}

function habilidadeCitadaNoTexto(habilidadeNome, textoNormalizado) {
  return apelidosDeHabilidade(habilidadeNome).some((apelido) => {
    const stem = stemLeve(normalizarTextoBusca(apelido));
    return stem.length >= 4 && textoNormalizado.includes(stem);
  });
}

export function inferirRacaEHabilidadesDeTextoLivre(ch) {
  const textoRaca = normalizarTextoBusca(ch.race || "");
  const textoCompleto = normalizarTextoBusca(
    `${ch.race || ""} ${ch.racialAbility?.name || ""} ${ch.racialAbility?.description || ""}`,
  );
  const racasCitadas = Object.entries(PALAVRA_CHAVE_RACA).filter(([, chave]) => textoRaca.includes(chave));
  if (racasCitadas.length !== 1) return null;
  const racaId = racasCitadas[0][0];
  const racaInfo = encontrarRaca(racaId);
  if (!racaInfo) return null;
  function melhorMatch(lista) {
    const candidatos = lista.filter((h) => habilidadeCitadaNoTexto(h.nome, textoCompleto));
    return candidatos.length === 1 ? candidatos[0].id : null;
  }
  return {
    raca: racaId,
    habilidadePrincipal: melhorMatch(racaInfo.principais),
    habilidadeSecundaria: melhorMatch(racaInfo.secundarias),
  };
}

// Resolve os 6 campos novos (raca/habilidadePrincipal/habilidadeSecundaria/
// disciplinaHumano/descritores/bonusGrauEscolha) a partir de uma ficha que pode
// já estar no esquema novo, no esquema antigo (racaId/...Id), ou em nenhum dos
// dois (ficha anterior a qualquer um dos dois sistemas — tenta inferir do
// texto livre, ver inferirRacaEHabilidadesDeTextoLivre).
//
// 22/10: o gate do esquema novo checa `ch.raca` (truthy), não só
// `!== undefined` — uma ficha migrada ANTES de existir a inferência por
// texto livre já tinha sido salva de volta com `raca: null` (o resultado
// antigo de "não deu pra migrar"), e esse `null` persistido bloquearia a
// inferência pra sempre (fica "migrada" com tudo vazio). `null`/`undefined`
// tratam igual: tenta de novo; só uma raça de verdade escolhida (string)
// trava o resultado.
export function migrarSelecaoRacaLegado(ch) {
  if (ch.raca) {
    return {
      raca: ch.raca,
      habilidadePrincipal: ch.habilidadePrincipal ?? null,
      habilidadeSecundaria: ch.habilidadeSecundaria ?? null,
      disciplinaHumano: ch.disciplinaHumano ?? null,
      descritores: ch.descritores ?? [],
      bonusGrauEscolha: ch.bonusGrauEscolha ?? {},
    };
  }
  const racaId = ch.racaId ?? null;
  if (racaId) {
    const principalIdLegado = ch.habilidadePrincipalId ?? null;
    const habilidadePrincipal = principalIdLegado
      ? (REMAPEAMENTO_HABILIDADE_PRINCIPAL_LEGADO[principalIdLegado] || null)
      : null;
    return { raca: racaId, habilidadePrincipal, habilidadeSecundaria: null, disciplinaHumano: null, descritores: [], bonusGrauEscolha: {} };
  }
  const inferido = inferirRacaEHabilidadesDeTextoLivre(ch);
  if (inferido) {
    const racaInfo = encontrarRaca(inferido.raca);
    const principal = inferido.habilidadePrincipal ? encontrarPrincipal(racaInfo, inferido.habilidadePrincipal) : null;
    const secundaria = inferido.habilidadeSecundaria ? encontrarSecundaria(racaInfo, inferido.habilidadeSecundaria) : null;
    return {
      raca: inferido.raca,
      habilidadePrincipal: inferido.habilidadePrincipal,
      habilidadeSecundaria: inferido.habilidadeSecundaria,
      disciplinaHumano: null,
      descritores: descritoresDeSelecao(principal, secundaria),
      bonusGrauEscolha: {},
    };
  }
  return { raca: null, habilidadePrincipal: null, habilidadeSecundaria: null, disciplinaHumano: null, descritores: [], bonusGrauEscolha: {} };
}

// Mapeamento manual (não vem do catalogo-racas.json) de quais habilidades dão
// +1 grau PERMANENTE numa proficiência ou atributo — pedido do Pedro: "coloque
// na ficha pintado de azul... mostrar que o crescimento da perícia é devido a
// uma habilidade". É DISTINTO dos vários "+1 dado"/"+1d10" condicionais que
// outras partes do `efeito` também descrevem (esses valem só numa rolagem
// específica, não mudam o grau salvo — fora do escopo daqui).
//
// Curado à mão, não derivado de `bonus[]`, porque esse array do catálogo é
// incompleto pra esse fim. Toda entrada aqui foi conferida contra o `efeito`
// de cada uma das habilidades do catálogo em 13/10 (catálogo "2026-10-11" v3
// — Elfo reescrito com vários bônus de grau novos, e Resistência Física/
// Resistência Mágica entraram como proficiências que também recebem esse
// bônus, igual qualquer outra): essas habilidades mencionam "+1 grau" ou "+1
// na(s) proficiência(s)" — a maioria tem uma chave FIXA (tabela abaixo) e 2
// (Mana Concentrada, Homúnculo) deixam a escolha pro jogador (ver
// BONUS_GRAU_ESCOLHA_POR_HABILIDADE); Homúnculo tem as duas coisas ao mesmo
// tempo (Atletismo é fixo, Força-ou-Destreza é escolha). Se o catálogo mudar
// nomes de raça/efeito de novo, conferir aqui também (racasCatalogo.test.js
// tem uma checagem automática: toda habilidade cujo `efeito` contenha essas
// frases-chave precisa estar numa das duas tabelas, e vice-versa).
//
// "Descendentes de Sabato" SAIU daqui em 14/10 (mais tarde, pedido do Pedro:
// "todos os nioshes tenham +1 de força também das habilidades de raça
// principal") — o +1 grau em Força deixou de ser exclusivo de quem escolhe
// Sabato como principal e virou um bônus de TODA a raça Niosh, veja
// BONUS_GRAU_FIXO_POR_RACA logo abaixo. O texto de `efeito` de Sabato no
// catálogo foi reescrito pra não repetir a frase "+1 grau" (evita a
// checagem automática pedir essa habilidade de volta nesta tabela) — ele
// ainda tem o bônus, só que herdado da raça, não mais próprio dele.
export const BONUS_GRAU_POR_HABILIDADE = {
  // "goethiano" SAIU daqui em 21/10 (pedido do Pedro): o +1 grau em Vigor
  // (sem teto) foi removido de vez — Goethiano virou +1 HP máximo (ver
  // engine.js:computeMaxHP, descritor "hp_maximo_1") + os descritores
  // "resistente" e "blindado" (ver catalogo-racas.json, campo `descritores`
  // — "blindado" já existia, "resistente" é novo). Nenhum bônus de grau.
  homunculo: [{ tipo: "proficiencia", chave: "atletismo" }],
  "coelho-bode": [{ tipo: "proficiencia", chave: "sobrevivencia" }],
  leonino: [{ tipo: "proficiencia", chave: "investigacao" }],
  reptiliano: [{ tipo: "proficiencia", chave: "intimidacao" }],
  "lobo-canino": [{ tipo: "proficiencia", chave: "lideranca" }],
  "raposa-kitsune": [
    { tipo: "proficiencia", chave: "intuicao" },
    { tipo: "proficiencia", chave: "malandragem" },
  ],
  "sentidos-agucados": [
    { tipo: "atributo", chave: "perspicacia" },
    { tipo: "proficiencia", chave: "intuicao" },
  ],
  "camuflagem-animal": [
    { tipo: "proficiencia", chave: "furtividade" },
    { tipo: "proficiencia", chave: "sobrevivencia" },
  ],
  // "adaptado" (Niosh) virou bônus de GRAU de verdade em 21/10 — antes era
  // "+1 dado" solto no texto, sem entrada aqui (mecanismo indefinido).
  adaptado: [
    { tipo: "proficiencia", chave: "sobrevivencia" },
    { tipo: "proficiencia", chave: "atletismo" },
    { tipo: "proficiencia", chave: "furtividade" },
  ],
  "escamas-fortes": [{ tipo: "atributo", chave: "forca" }],
  "corpo-resistente": [{ tipo: "atributo", chave: "vigor" }],
  // "resistMagicaProf"/"magiasOfensivas" saíram do catálogo em 14/10 (docs/
  // MUDANCAS_RACAS_E_MAGIA.md) — as habilidades que bonificavam essas chaves
  // perderam essa parte do bônus (ver tabela "Raças" do documento). Goethiano
  // e Pele Grossa ganharam `teto: "A"` (sem teto C) nesse mesmo documento.
  //
  // 21/10 (docs/ATUALIZACAO_21-10.md item 1 + pedido do Pedro sobre o
  // descritor Resistente): "mana-estatica" PERDEU o bônus de grau em
  // Resistência Física/Defesa de vez — virou só o descritor "resistente"
  // (ver catalogo-racas.json, campo `descritores`), sem bônus de grau
  // nenhum.
  //
  // 21/10 (seção 8.4, revisão posterior): "pele-grossa" SAIU daqui de vez —
  // tinha trocado de Resistência Física pra Defesa (+1 grau, teto A) no
  // item 1, mas a seção 8.4 revisa de novo: "não dá mais +1 grau em
  // Defesa", vira só o descritor Blindado (ver catalogo-racas.json).
  "cla-radiante": [{ tipo: "atributo", chave: "carisma" }],
  "cla-noctis": [{ tipo: "atributo", chave: "manipulacao" }],
  "cla-corvus": [
    { tipo: "proficiencia", chave: "furtividade" },
  ],
  "cla-seasus": [
    { tipo: "proficiencia", chave: "magiasGerais" },
  ],
  "cla-natrus": [
    { tipo: "proficiencia", chave: "sobrevivencia" },
  ],
  "resistencia-a-dor": [{ tipo: "atributo", chave: "resolucao" }],
  "arte-e-tradicao": [
    { tipo: "proficiencia", chave: "etiqueta" },
    { tipo: "proficiencia", chave: "atuacao" },
    { tipo: "proficiencia", chave: "malandragem" },
  ],
};

// Habilidades cujo bônus de grau é à ESCOLHA do jogador (pedido confirmado em
// 13/10) — as chaves concretas não vêm do catálogo, são guardadas por
// personagem em `character.bonusGrauEscolha[habilidadeId]` (preenchida pela
// UI em CharacterForm). Cada entrada é um ARRAY de escolhas independentes
// (21/10, docs/ATUALIZACAO_21-10.md seção 8.3: "Mana Concentrada dá duas
// proficiências, que podem ser a mesma" — por isso é um array, não um valor
// só; antes de 21/10 era sempre um valor único, generalizado aqui porque
// nenhuma ficha salva ainda usava esse campo com valor real pra migrar).
// `character.bonusGrauEscolha[habId]` guarda um ARRAY de valores escolhidos,
// na mesma ordem/índice das escolhas aqui — "podem ser a mesma" funciona
// de graça: se o jogador escolher a mesma chave nas duas, os dois +1
// somam na mesma proficiência (bonusGrauDoPersonagem soma por posição).
// `opcoes` nunca inclui proficiência de Combate (seção 8.3: "o +1 grau em
// proficiência nunca é de Combate", pra Humano).
export const BONUS_GRAU_ESCOLHA_POR_HABILIDADE = {
  "mana-concentrada": [
    { tipo: "proficiencia", opcoes: PROFICIENCIAS_LIST.filter((p) => p.categoria !== "combate").map((p) => p.key) },
    { tipo: "proficiencia", opcoes: PROFICIENCIAS_LIST.filter((p) => p.categoria !== "combate").map((p) => p.key) },
  ],
  "mana-fluida": [
    { tipo: "proficiencia", opcoes: PROFICIENCIAS_LIST.filter((p) => p.categoria !== "combate").map((p) => p.key) },
  ],
  "mana-estatica": [
    { tipo: "proficiencia", opcoes: PROFICIENCIAS_LIST.filter((p) => p.categoria !== "combate").map((p) => p.key) },
  ],
  // Descendentes de Sharkan (Niosh, 21/10, seção 8.4): "+1 grau numa
  // proficiência Física à escolha" — só as proficiências de categoria
  // "fisica" (Atletismo/Ofício/Condução/Roubo/Furtividade/Sobrevivência),
  // não qualquer não-combate.
  "descendentes-de-sharkan": [
    { tipo: "proficiencia", opcoes: PROFICIENCIAS_LIST.filter((p) => p.categoria === "fisica").map((p) => p.key) },
  ],
  // Regra geral do Elfo (22/10, confirmado pelo Pedro: a frase "regra de
  // todos os tipos de elfo" em docs/revisao/racas-site.json, dentro do
  // texto do Clã Corvus, vale pros 5 clãs — não só o Corvus, que CHEGOU A
  // PERDER esse bônus numa revisão anterior da seção 8. Corrigido: todo
  // clã (a habilidade PRINCIPAL do Elfo) dá +1 grau numa proficiência à
  // escolha, não-Combate — além do que cada clã já tem de próprio.
  "cla-radiante": [
    { tipo: "proficiencia", opcoes: PROFICIENCIAS_LIST.filter((p) => p.categoria !== "combate").map((p) => p.key) },
  ],
  "cla-noctis": [
    { tipo: "proficiencia", opcoes: PROFICIENCIAS_LIST.filter((p) => p.categoria !== "combate").map((p) => p.key) },
  ],
  "cla-corvus": [
    { tipo: "proficiencia", opcoes: PROFICIENCIAS_LIST.filter((p) => p.categoria !== "combate").map((p) => p.key) },
  ],
  "cla-seasus": [
    { tipo: "proficiencia", opcoes: PROFICIENCIAS_LIST.filter((p) => p.categoria !== "combate").map((p) => p.key) },
  ],
  "cla-natrus": [
    { tipo: "proficiencia", opcoes: PROFICIENCIAS_LIST.filter((p) => p.categoria !== "combate").map((p) => p.key) },
  ],
};

// Habilidades cujo bônus é um DESCRITOR à escolha do jogador (21/10, novo —
// Homúnculo: "um Potente à escolha (Força, Destreza ou ofício mágico)",
// docs/ATUALIZACAO_21-10.md seção 8.3) — diferente de
// BONUS_GRAU_ESCOLHA_POR_HABILIDADE (que bonifica um GRAU), aqui a escolha
// vira um descritor de personagem direto (reaproveita os mesmos "Potente
// Força/Destreza/ofício mágico" que a armadura já usa — ver data/armaduras.js
// e comGrausEfetivos abaixo, que já sabe aplicar esses três descritores
// onde quer que venham). Guardado em `character.descritorEscolha[habId]`.
export const DESCRITOR_ESCOLHA_POR_HABILIDADE = {
  homunculo: { opcoes: ["potente_forca", "potente_destreza", "potente_oficio_magico"] },
};

// BONUS_GRAU_ESCOLHA_POR_RACA (bônus de grau à escolha concedido pela RAÇA
// em si, independente de qual principal/secundária escolhida) foi RETIRADO
// em 21/10 (docs/ATUALIZACAO_21-10.md seção 8) — existia só pra Humano e
// Elfo ("todo tipo de humano"/"todo tipo de elfo" ganha +1 grau numa
// proficiência à escolha). A seção 8.3 revisa Humano com uma escolha de
// proficiência DIFERENTE por cada tipo de mana (Mana Concentrada=2, Mana
// Fluida=1, Mana Estática=1 — ver BONUS_GRAU_ESCOLHA_POR_HABILIDADE acima),
// substituindo o bônus de raça único; a seção 8.6 não menciona mais nenhuma
// escolha de proficiência genérica pra nenhum clã élfico — o bônus de Elfo
// foi retirado de vez, sem substituto. `character.bonusGrauEscolhaRaca`
// fica como campo legado nas fichas salvas, só não é mais lido aqui.

// Bônus de grau FIXO (chave já definida, sem escolha do jogador) concedido
// pela RAÇA em si, não por uma habilidade principal/secundária específica —
// pedido do Pedro (14/10, mais tarde): "todos os nioshes tenham +1 de força
// também das habilidades de raça principal", ou seja, deixa de depender de
// escolher especificamente "Descendentes de Sabato" como principal — todo
// Niosh ganha, não importa qual principal/secundária escolheu. É a versão
// FIXA de BONUS_GRAU_ESCOLHA_POR_RACA acima (aquela é só pra bônus à escolha
// do jogador); "Descendentes de Sabato" tinha essa entrada em
// BONUS_GRAU_POR_HABILIDADE antes de virar bônus de raça — ver nota lá.
export const BONUS_GRAU_FIXO_POR_RACA = {
  niosh: [{ tipo: "atributo", chave: "forca" }],
};

// Habilidades que concedem "ofícios mágicos extras" (docs/MUDANCAS_RACAS_E_
// MAGIA.md: "Campo 'ofícios extras' para raças e habilidades") — soma na
// contagem de Ofícios Mágicos (engine.js:contagemOficiosMagicos) SEM contar
// contra o limite de 3 disciplinas escolhidas pelo jogador.
export const BONUS_OFICIO_EXTRA_POR_HABILIDADE = {
  "cla-natrus": 1,
  "cla-corvus": 1,
  "cla-seasus": 1,
};

// Disciplinas (docs/DISCIPLINAS_MAGIA.md, 14/10): até 3 slots por personagem
// (character.disciplinas, array de até 3 `{ disciplinaId, habilidadesAtivas }`
// ou `null` pra slot vazio — mesmo padrão posicional de `character.procs`).
// Substitui o antigo `disciplinaMagica.oficiosMagicos`/`magiaInata` (checkbox
// solto, 14/10 anterior) — agora esses dois são DERIVADOS daqui, nunca mais
// guardados direto na ficha (ver comGrausEfetivos). Troca o antigo painel
// "Classes" (2 caixas de texto livre) na ficha.

// "Vaga de Disciplina" (secundária do Humano com `disciplina: true` no
// catálogo) virou um 4º encaixe de Disciplina de verdade — pedido do Pedro
// (14/10, mesmo dia): INDEPENDENTE dos 3 normais, não compete por espaço com
// eles. Guardado à parte em `character.disciplinaExtraHumano` (mesmo formato
// de um item de `character.disciplinas`: `{ disciplinaId, habilidadesAtivas }`
// ou `null`) por não ser posicional como os outros 3. Só conta de verdade
// enquanto a secundária ESCOLHIDA continuar sendo essa — se o jogador trocar
// de secundária depois, o dado salvo não é apagado (mesmo padrão não-
// destrutivo do resto do app), só para de valer até voltar a escolher essa
// secundária de novo. Substitui por completo o antigo `disciplinaHumano`
// (texto livre nome+grau E/D/C, sem ligação com o catálogo real) — esse
// campo antigo fica intocado nos dados existentes, só não é mais lido aqui.
export function temEncaixeExtraDeDisciplina(character) {
  const raca = encontrarRaca(character?.raca);
  const secundaria = encontrarSecundaria(raca, character?.habilidadeSecundaria);
  return secundaria?.disciplina === true;
}

export function disciplinasDoPersonagem(character) {
  const normais = (character?.disciplinas || []).filter(Boolean);
  const extra = temEncaixeExtraDeDisciplina(character) ? character?.disciplinaExtraHumano : null;
  return extra ? [...normais, extra] : normais;
}

// Ids das disciplinas do tipo "oficio-magico" escolhidas (conta 1 cada no
// pool de ataque mágico/recuperação de mana — engine.js:contagemOficiosMagicos).
// Magia Inata (tipo "magia-inata") nunca entra aqui.
export function oficiosMagicosDoPersonagem(character) {
  return disciplinasDoPersonagem(character)
    .map((d) => getDisciplinaPorId(d.disciplinaId))
    .filter((def) => def?.tipo === "oficio-magico")
    .map((def) => def.id);
}

export function temMagiaInataDoPersonagem(character) {
  return disciplinasDoPersonagem(character).some((d) => d.disciplinaId === "magia-inata");
}

// União das magias equipadas em TODAS as disciplinas do personagem (cada
// disciplina tem seu próprio limite de 3 — ver DISCIPLINAS em
// data/magias.js — mas o seletor de conjuração do painel Magia mostra o
// total disponível, sem precisar saber de qual disciplina veio cada uma).
export function magiasAtivasDoPersonagem(character) {
  const vistas = new Set();
  const resultado = [];
  for (const d of disciplinasDoPersonagem(character)) {
    for (const magiaId of d.habilidadesAtivas || []) {
      if (!vistas.has(magiaId)) {
        vistas.add(magiaId);
        resultado.push(magiaId);
      }
    }
  }
  return resultado;
}

// Soma os "ofícios extras" das habilidades ATIVAS do personagem (mesmo
// critério de bonusGrauDoPersonagem: principal + secundária).
export function oficiosExtrasDoPersonagem(character) {
  const raca = encontrarRaca(character?.raca);
  const principal = encontrarPrincipal(raca, character?.habilidadePrincipal);
  const secundaria = encontrarSecundaria(raca, character?.habilidadeSecundaria);
  let total = 0;
  for (const hab of [principal, secundaria]) {
    if (hab && BONUS_OFICIO_EXTRA_POR_HABILIDADE[hab.id]) total += BONUS_OFICIO_EXTRA_POR_HABILIDADE[hab.id];
  }
  return total;
}

// Descritores escolhidos pelo jogador via DESCRITOR_ESCOLHA_POR_HABILIDADE
// (21/10, hoje só Homúnculo: "um Potente à escolha") — `character.
// descritorEscolha[habId]` guarda a chave escolhida. Mesmo critério de
// oficiosExtrasDoPersonagem (principal + secundária); devolve a lista pra
// comGrausEfetivos somar em `character.descritores`.
export function descritorEscolhidoDoPersonagem(character) {
  const raca = encontrarRaca(character?.raca);
  const principal = encontrarPrincipal(raca, character?.habilidadePrincipal);
  const secundaria = encontrarSecundaria(raca, character?.habilidadeSecundaria);
  const resultado = [];
  for (const hab of [principal, secundaria]) {
    if (!hab) continue;
    const escolha = DESCRITOR_ESCOLHA_POR_HABILIDADE[hab.id];
    if (!escolha) continue;
    const chave = character?.descritorEscolha?.[hab.id];
    if (chave && escolha.opcoes.includes(chave)) resultado.push(chave);
  }
  return resultado;
}

// Transformação (Ningen, 21/10, docs/ATUALIZACAO_21-10.md seção 8.5):
// "gasta 1 SP; na forma bestial ganha Potente Força e Potente Destreza...
// dura até destransformar". Diferente dos outros ganhos de descritor
// (sempre ativos quando a habilidade é escolhida), este só vale enquanto
// `character.transformadoAtivo` estiver ligado (toggle da UI, que gasta o
// SP ao ativar — ver point-amaranth-app.jsx). O "-1 dado em testes
// mentais" NÃO está aqui — não há um pool de "teste mental" genérico no
// motor pra descontar (só o painel Teste, que não lê character.descritores
// pra penalidade nenhuma) — listado como não mecanizado no relatório.
export function descritoresDeTransformacaoAtiva(character) {
  if (character?.habilidadeSecundaria === "transformacao" && character?.transformadoAtivo) {
    return ["potente_forca", "potente_destreza"];
  }
  return [];
}

// Teto (grau máximo) de cada bônus de grau, por chave — default "C" quando
// uma habilidade não especifica `teto` em BONUS_GRAU_POR_HABILIDADE. Função
// separada de bonusGrauDoPersonagem de propósito: aquela função já é testada
// com deepEqual exato contra números de passos simples (sem teto misturado
// junto) — mudar sua forma quebraria esses testes à toa.
export function tetoGrauDoPersonagem(character) {
  const raca = encontrarRaca(character?.raca);
  const principal = encontrarPrincipal(raca, character?.habilidadePrincipal);
  const secundaria = encontrarSecundaria(raca, character?.habilidadeSecundaria);
  const resultado = { proficiencias: {}, atributos: {} };
  for (const hab of [principal, secundaria]) {
    if (!hab) continue;
    const bonus = BONUS_GRAU_POR_HABILIDADE[hab.id];
    if (!bonus) continue;
    for (const b of bonus) {
      if (!b.teto) continue;
      const alvo = b.tipo === "atributo" ? resultado.atributos : resultado.proficiencias;
      const atualIdx = GRADE_ORDER.indexOf(alvo[b.chave] || "C");
      const novoIdx = GRADE_ORDER.indexOf(b.teto);
      if (novoIdx > atualIdx) alvo[b.chave] = b.teto;
    }
  }
  // Teto do bônus FIXO de raça (BONUS_GRAU_FIXO_POR_RACA) — mesmo padrão do
  // loop acima, só que por raça em vez de por habilidade.
  const fixoRaca = BONUS_GRAU_FIXO_POR_RACA[character?.raca];
  if (fixoRaca) {
    for (const b of fixoRaca) {
      if (!b.teto) continue;
      const alvo = b.tipo === "atributo" ? resultado.atributos : resultado.proficiencias;
      const atualIdx = GRADE_ORDER.indexOf(alvo[b.chave] || "C");
      const novoIdx = GRADE_ORDER.indexOf(b.teto);
      if (novoIdx > atualIdx) alvo[b.chave] = b.teto;
    }
  }
  return resultado;
}

// Soma os bônus de grau das habilidades ATIVAS do personagem (principal +
// secundária — Disciplina do Humano não dá bônus de grau, não tem entrada no
// catálogo pra isso). Duas habilidades podem bonificar a mesma chave — os
// passos somam antes de aplicar o teto (ver grauComBonus). Quando a habilidade
// tem bônus à escolha (BONUS_GRAU_ESCOLHA_POR_HABILIDADE) e o jogador ainda não
// escolheu (ou escolheu algo fora de `opcoes`), esse bônus simplesmente não
// soma nada — não há valor "padrão" que faça sentido escolher por ele.
export function bonusGrauDoPersonagem(character) {
  const raca = encontrarRaca(character?.raca);
  const principal = encontrarPrincipal(raca, character?.habilidadePrincipal);
  const secundaria = encontrarSecundaria(raca, character?.habilidadeSecundaria);
  const resultado = { proficiencias: {}, atributos: {} };
  for (const hab of [principal, secundaria]) {
    if (!hab) continue;
    const bonus = BONUS_GRAU_POR_HABILIDADE[hab.id];
    if (bonus) {
      for (const b of bonus) {
        const alvo = b.tipo === "atributo" ? resultado.atributos : resultado.proficiencias;
        alvo[b.chave] = (alvo[b.chave] || 0) + 1;
      }
    }
    // 21/10: cada entrada de BONUS_GRAU_ESCOLHA_POR_HABILIDADE é um ARRAY de
    // escolhas independentes (ver comentário na constante) — Mana Concentrada
    // tem 2, as outras têm 1. `character.bonusGrauEscolha[hab.id]` guarda um
    // array de valores escolhidos, na mesma ordem.
    const escolhas = BONUS_GRAU_ESCOLHA_POR_HABILIDADE[hab.id];
    if (escolhas) {
      const escolhidos = character?.bonusGrauEscolha?.[hab.id];
      const lista = Array.isArray(escolhidos) ? escolhidos : (escolhidos ? [escolhidos] : []);
      escolhas.forEach((escolha, i) => {
        const chave = lista[i];
        if (chave && escolha.opcoes.includes(chave)) {
          const alvo = escolha.tipo === "atributo" ? resultado.atributos : resultado.proficiencias;
          alvo[chave] = (alvo[chave] || 0) + 1;
        }
      });
    }
  }
  // Bônus de grau FIXO da RAÇA em si (não de uma habilidade específica, sem
  // escolha do jogador) — ver BONUS_GRAU_FIXO_POR_RACA (14/10, pedido do
  // Pedro: "todos os nioshes tenham +1 de força também das habilidades de
  // raça principal" — vale pra qualquer Niosh, não só quem escolhe
  // Descendentes de Sabato como principal).
  const fixoRaca = BONUS_GRAU_FIXO_POR_RACA[character?.raca];
  if (fixoRaca) {
    for (const b of fixoRaca) {
      const alvo = b.tipo === "atributo" ? resultado.atributos : resultado.proficiencias;
      alvo[b.chave] = (alvo[b.chave] || 0) + 1;
    }
  }
  // Disciplinas (docs/DISCIPLINAS_MAGIA.md, 14/10): ter "Ofício Mágico:
  // Magias de guerra" entre os até 3 slots de disciplina mantém o +1 grau em
  // Magias Gerais que o antigo "Ofício Mágico" já dava, e TAMBÉM +1 grau
  // (teto C) em Acadêmicos e Tecnologia — confirmado pelo Pedro (14/10, mais
  // tarde ainda) como o valor real, encerrando a pendência 2 do guia ("valor
  // a confirmar, suposto +1 grau teto C" — ver docs/DISCIPLINAS_MAGIA.md e o
  // item 2 da seção "Pendências" em CONTEXTO.md). Até então isso era só
  // `bonusTexto` descritivo em data/magias.js, sem efeito numérico nenhum.
  // As outras disciplinas vazias (Encantamentos, Alquimia, Constructo — ver
  // data/magias.js:DISCIPLINAS) não dão bônus de grau nenhum, só contam como
  // dado no pool mágico (ver engine.js:contagemOficiosMagicos). Magia Inata
  // não dá bônus de grau nenhum — vira +1d10 fixo nas rolagens de magia e +1
  // MP (ver engine.js:diceAtaqueMagico/computeMaxMana).
  if (oficiosMagicosDoPersonagem(character).includes("oficio-magias-de-guerra")) {
    resultado.proficiencias.magiasGerais = (resultado.proficiencias.magiasGerais || 0) + 1;
    resultado.proficiencias.academicos = (resultado.proficiencias.academicos || 0) + 1;
    resultado.proficiencias.tecnologia = (resultado.proficiencias.tecnologia || 0) + 1;
  }
  return resultado;
}

// Aplica `passos` graus de bônus a partir de `grauBase`, com teto configurável
// (padrão "C") — regra do Pedro: "aumentos de proficiência e atributo de raça
// são +1 grau, com teto C". Algumas habilidades (14/10, docs/MUDANCAS_RACAS_E_
// MAGIA.md: Goethiano em Vigor, Pele Grossa em Resistência Física) passaram a
// não ter teto C — sobem até A. Grau já no teto (ou acima) não sobe mais por
// esse bônus (nem desce).
export function grauComBonus(grauBase, passos, teto = "C") {
  const base = grauBase || "E";
  if (!passos) return base;
  const baseIdx = Math.max(0, GRADE_ORDER.indexOf(base));
  const tetoIdx = GRADE_ORDER.indexOf(teto);
  if (baseIdx >= tetoIdx) return base;
  return GRADE_ORDER[Math.min(tetoIdx, baseIdx + passos)];
}

// Devolve `{ character, bonusAplicado }`: uma cópia do personagem com
// proficiencias/atributosGerais já no grau EFETIVO (base + bônus racial, com
// teto — ver tetoGrauDoPersonagem) e `disciplinaMagica` já montado a partir
// de `character.disciplinas` (oficiosMagicos/magiaInata/magiasAtivas — ver
// oficiosMagicosDoPersonagem/temMagiaInataDoPersonagem/magiasAtivasDoPersonagem
// — mais oficiosExtras, base salva + bônus racial de oficiosExtrasDoPersonagem)
// — é isso que deve ir pra qualquer cálculo de dado (ataques, testes, barras
// da ficha, pool mágico), nunca o personagem cru. `bonusAplicado` dá, por
// chave, o número de passos REALMENTE aplicados (já descontado o teto — ex.:
// uma habilidade que daria +1 num grau já no teto não aplica nada) — é o que
// a UI usa pra saber quantos segmentos pintar de azul na barrinha.
// `disciplinaMagica` é sempre recalculado (nunca devolve o mesmo objeto
// salvo na ficha) porque é inteiramente derivado de `character.disciplinas`,
// nunca mais lido direto — por isso, diferente de antes, esta função não
// devolve mais o mesmo `character` por referência quando não há bônus de
// grau/ofício extra (só proficiencias/atributosGerais continuam sem clonar
// nesse caso).
export function comGrausEfetivos(character) {
  if (!character) return { character, bonusAplicado: { proficiencias: {}, atributos: {} } };
  const bonus = bonusGrauDoPersonagem(character);
  const oficiosExtrasRaciais = oficiosExtrasDoPersonagem(character);
  // Conduíte mágico (21/10, docs/ATUALIZACAO_21-10.md item 4): "existe em
  // todo ofício, ocupa 1 dos 3 espaços, conta +1 ofício. Só um Conduíte
  // funciona por vez" — por isso é um único flag GLOBAL do personagem
  // (`character.conduiteAtivo`), não um por disciplina: ligar o Conduíte de
  // uma disciplina "desliga" automaticamente o de qualquer outra, porque só
  // existe esse um booleano. Soma +1 ofício do mesmo jeito que os ofícios
  // extras raciais (Clã Corvus/Seasus/Natrus) já somavam. TODO: "ocupa 1 dos
  // 3 espaços de habilidade do ofício" não é validado — hoje não há limite
  // de 3 habilidades por ofício mágico implementado nem pra Encantamentos
  // (ver CONTEXTO.md).
  const bonusConduite = character.conduiteAtivo ? 1 : 0;
  // Encantamento Flamejante e qualquer outro encantamento futuro (19/10, ver
  // data/magias.js:ENCANTAMENTOS/descritoresDeEncantamentosAtivos): soma os
  // descritores concedidos pelos encantamentos ATIVOS do personagem
  // (character.encantamentosAtivos) nos descritores de PERSONAGEM, de onde
  // engine.js:descritoresEfetivosDoAtaque lê pra aplicar o efeito (ex.:
  // Queimadura 1) em qualquer ataque dele, físico ou mágico.
  // Equipamento defensivo (21/10, docs/ATUALIZACAO_21-10.md seção 7 — ver
  // data/armaduras.js:descritoresDeEquipamentoDefensivo): soma os
  // descritores da armadura/escudo/acessório EQUIPADOS (Resistente,
  // Blindado, Firme N, Selado N, Lento N, Campo de Mana, Potente Força/
  // Destreza/ofício mágico) do mesmo jeito. Sem clonar quando não há nada
  // ativo/equipado (igual ao resto da função).
  const descritoresEncantamentos = descritoresDeEncantamentosAtivos(character);
  const descritoresEquipamento = descritoresDeEquipamentoDefensivo(character);
  // Descritor à escolha de habilidade racial (21/10 — hoje só Homúnculo,
  // "um Potente à escolha"; ver DESCRITOR_ESCOLHA_POR_HABILIDADE acima).
  const descritoresEscolhidos = descritorEscolhidoDoPersonagem(character);
  const descritoresTransformacao = descritoresDeTransformacaoAtiva(character);
  const descritoresExtras = [...descritoresEncantamentos, ...descritoresEquipamento, ...descritoresEscolhidos, ...descritoresTransformacao];
  const descritores = descritoresExtras.length
    ? [...new Set([...(character.descritores || []), ...descritoresExtras])]
    : character.descritores;
  // Potente Força/Potente Destreza (armadura, seção 7.2): "+1 grau, até C"
  // — lidos do character JÁ com os descritores do equipamento mesclados
  // (senão a própria armadura equipada nunca veria o bônus que ela dá).
  // Potente ofício mágico: "+1 ofício, soma com o Conduíte" — mesmo
  // mecanismo de oficiosExtras que o Conduíte já usava.
  const descritoresSet = new Set(descritores || []);
  const bonusArmaduraOficioMagico = descritoresSet.has("potente_oficio_magico") ? 1 : 0;
  if (descritoresSet.has("potente_forca")) bonus.atributos.forca = (bonus.atributos.forca || 0) + 1;
  if (descritoresSet.has("potente_destreza")) bonus.atributos.destreza = (bonus.atributos.destreza || 0) + 1;
  const disciplinaMagica = {
    ...(character.disciplinaMagica || {}),
    oficiosMagicos: oficiosMagicosDoPersonagem(character),
    oficiosExtras: (character.disciplinaMagica?.oficiosExtras || 0) + oficiosExtrasRaciais + bonusConduite + bonusArmaduraOficioMagico,
    magiaInata: temMagiaInataDoPersonagem(character),
    magiasAtivas: magiasAtivasDoPersonagem(character),
  };
  // Penalidade de Defesa por falta de perícia de armadura/escudo (Regra 4,
  // seção 7.1) — anexada direto no character efetivo, pra
  // engine.js:resolveRolagemDefesa ler o número sem precisar conhecer
  // armadura nenhuma (ver data/armaduras.js:penalidadeDefesaSemPericiaDoPersonagem).
  const penalidadeDefesaSemPericia = penalidadeDefesaSemPericiaDoPersonagem(character);
  // Bônus de Defesa em dados da armadura/escudo/acessório equipados (Regra
  // 2, seção 7.1) — mesmo princípio: anexado direto, engine.js só soma o
  // número.
  const bonusDefesaEquipamento = bonusDefesaDeEquipamento(character);
  const bonusAplicado = { proficiencias: {}, atributos: {} };
  const semBonusDeGrau = Object.keys(bonus.proficiencias).length === 0 && Object.keys(bonus.atributos).length === 0;
  if (semBonusDeGrau) {
    return { character: { ...character, disciplinaMagica, descritores, penalidadeDefesaSemPericia, bonusDefesaEquipamento }, bonusAplicado };
  }
  const tetos = tetoGrauDoPersonagem(character);
  const proficiencias = { ...character.proficiencias };
  for (const [chave, passos] of Object.entries(bonus.proficiencias)) {
    const baseIdx = Math.max(0, GRADE_ORDER.indexOf(proficiencias[chave] || "E"));
    const novoGrau = grauComBonus(proficiencias[chave], passos, tetos.proficiencias[chave] || "C");
    proficiencias[chave] = novoGrau;
    bonusAplicado.proficiencias[chave] = GRADE_ORDER.indexOf(novoGrau) - baseIdx;
  }
  const atributosGerais = { ...character.atributosGerais };
  for (const [chave, passos] of Object.entries(bonus.atributos)) {
    const baseIdx = Math.max(0, GRADE_ORDER.indexOf(atributosGerais[chave] || "E"));
    const novoGrau = grauComBonus(atributosGerais[chave], passos, tetos.atributos[chave] || "C");
    atributosGerais[chave] = novoGrau;
    bonusAplicado.atributos[chave] = GRADE_ORDER.indexOf(novoGrau) - baseIdx;
  }
  return { character: { ...character, proficiencias, atributosGerais, disciplinaMagica, descritores, penalidadeDefesaSemPericia, bonusDefesaEquipamento }, bonusAplicado };
}
