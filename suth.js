// Grupo Suth — funções puras de dados (ficha nova do Fate + preenchimento do
// reino), no mesmo padrão de sidepoint.js/cidades.js: sem depender de storage
// nem de React, pra poder ser testadas isoladas (ver suth.test.js).
// point-amaranth-app.jsx importa deste módulo; não duplique esta lógica lá.

// Fate já existe como personagem do Grupo C (ficha antiga) — o documento de
// Suth trouxe uma ficha nova e mais completa pra ela. Em vez de semeá-la como
// personagem novo (ela já existe), ATUALIZAMOS a ficha existente uma única
// vez, marcada por `fichaSuthAplicada: true` dentro do próprio objeto (em vez
// de uma flag externa em storage, que poderia ficar fora de sincronia numa
// gravação incompleta ou num backup restaurado de outro ponto no tempo — ver
// o mesmo raciocínio em sidepoint.js sobre por que a reposição é por
// personagem e não por flag global).
//
// `id`, `grupo`, `imageUrl` e `xp` da ficha JÁ EXISTENTE são mantidos de
// propósito — a atualização é só de conteúdo: o Fate continua no Grupo C
// (grupoDoPersonagem nunca o reclassifica pra "suth", ver sidepoint.js), com
// o retrato e o xp que já estavam configurados. O JSON de Suth também traz um
// `id`/`grupo` próprios (ambos "suth") — resquício de como o documento foi
// gerado a partir do grupo novo, não uma instrução pra mudar o grupo do Fate;
// por isso são ignorados aqui junto com `imageUrl`/`xp`.
export function aplicarFichaSuthDoFate(characters, fichaNova) {
  return characters.map((ch) => {
    if (ch.id !== fichaNova.id || ch.fichaSuthAplicada) return ch;
    const { id, grupo, imageUrl, xp, ...resto } = fichaNova;
    return { ...ch, ...resto, fichaSuthAplicada: true };
  });
}

// Preenche o reino Suth com o conteúdo rico do documento (visão geral,
// pilares, rebelião, economia, relações, glossário, notas do mestre e
// banner) — mas só enquanto a descrição ainda for o rascunho original
// (contém "[Rascunho"), pra nunca sobrescrever uma edição que o Pedro já
// tenha feito pela interface. Idempotente: na segunda chamada a descrição já
// não bate com "[Rascunho" e nada muda. `cities` é ignorado de propósito —
// isso já é coberto por reporCidadesSemente (ver cidades.js), chamado
// separadamente, que adiciona só as cidades que ainda não existem por nome.
export function preencherReinoSuth(reinos, dadosSuth) {
  if (!Array.isArray(reinos) || !dadosSuth) return reinos;
  let mudou = false;
  const resultado = reinos.map((r) => {
    if (r?.id !== dadosSuth.id) return r;
    const aindaRascunho = typeof r.description === "string" && r.description.includes("[Rascunho");
    if (!aindaRascunho) return r;
    mudou = true;
    const { id, cities, ...conteudo } = dadosSuth;
    return { ...r, ...conteudo };
  });
  return mudou ? resultado : reinos;
}
