// Cidades semente do Mundo — funções puras de dados, sem depender de storage
// nem de React, pra poder ser testadas isoladas (ver cidades.test.js).
// point-amaranth-app.jsx importa deste módulo; não duplique esta lógica lá.
//
// Mesmo problema do Sidepoint (ver sidepoint.js): SEED_KINGDOMS só entra
// sozinho com o armazenamento vazio, então uma cidade semente nova nunca
// chegaria a quem já tem `point-kingdoms` salvo. Aqui ela é reposta por
// CIDADE, sem flag de "já rodei": comparando por id e por nome, rodar de novo
// com o resultado anterior não muda nada (idempotente).

// Só cidades semente com `id` participam da reposição — cidades antigas sem id
// (ex: Novolar) continuam só na semente inicial, como antes.
function cidadesSementeDe(sementes) {
  const lista = [];
  for (const reino of sementes || []) {
    for (const cidade of reino?.cities || []) {
      if (cidade?.id) lista.push({ reinoId: reino.id, cidade });
    }
  }
  return lista;
}

export function idsCidadesSemente(sementes) {
  return cidadesSementeDe(sementes).map(({ cidade }) => cidade.id);
}

function nomeNormalizado(nome) {
  return String(nome || "").trim().toLowerCase();
}

// `reinos`: point-kingdoms salvo. `sementes`: reinos semente (formato de
// SEED_KINGDOMS). `removidas`: ids de cidades semente apagadas de propósito.
// Pra cada cidade semente, no reino de mesmo id:
// - já existe com o mesmo id → nada muda;
// - já existe com o mesmo nome (sem diferenciar maiúsculas) → completa só `id`
//   e `link` que faltarem, sem tocar na descrição (pode ter sido editada);
// - está nas removidas → não volta;
// - senão → é adicionada ao fim da lista de cidades do reino.
// Devolve o mesmo array quando nada muda.
export function reporCidadesSemente(reinos, sementes, removidas) {
  if (!Array.isArray(reinos)) return reinos;
  const removidasSet = new Set(Array.isArray(removidas) ? removidas : []);
  const porReino = new Map();
  for (const { reinoId, cidade } of cidadesSementeDe(sementes)) {
    if (!porReino.has(reinoId)) porReino.set(reinoId, []);
    porReino.get(reinoId).push(cidade);
  }

  let mudouAlgum = false;
  const resultado = reinos.map((reino) => {
    const sementesDoReino = porReino.get(reino?.id);
    if (!sementesDoReino) return reino;
    let cidades = Array.isArray(reino.cities) ? reino.cities : [];
    let mudou = false;
    for (const semente of sementesDoReino) {
      if (cidades.some((c) => c?.id === semente.id)) continue;
      const idxNome = cidades.findIndex((c) => nomeNormalizado(c?.name) === nomeNormalizado(semente.name));
      if (idxNome >= 0) {
        const atual = cidades[idxNome];
        if (atual.id && atual.link) continue;
        const completada = { ...atual };
        if (!completada.id) completada.id = semente.id;
        if (!completada.link && semente.link) completada.link = semente.link;
        cidades = cidades.map((c, i) => (i === idxNome ? completada : c));
        mudou = true;
        continue;
      }
      if (removidasSet.has(semente.id)) continue;
      cidades = [...cidades, { ...semente }];
      mudou = true;
    }
    if (!mudou) return reino;
    mudouAlgum = true;
    return { ...reino, cities: cidades };
  });
  return mudouAlgum ? resultado : reinos;
}
