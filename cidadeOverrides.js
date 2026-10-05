// Overrides de edição do GM sobre o dossiê de uma cidade (conteúdo fixo em
// mundoDados.js) — funções puras, sem depender de React nem de storage, pra
// serem testadas isoladas (ver cidadeOverrides.test.js).
//
// mundoDados.js continua sendo o conteúdo ORIGINAL e nunca é reescrito. As
// edições do GM ficam num objeto separado, guardado em storage.js sob a
// chave "point-cidades-overrides": { [cidadeId]: { campo: valor } }. Pra
// exibir, mescla: valor do override (se existir) senão o original. Um campo
// sem override nem aparece no objeto — "Restaurar original" só apaga essa
// chave, nunca toca mundoDados.js.
//
// Cada campo mesclável é substituído por INTEIRO (o campo todo, não item a
// item) — é assim que "Restaurar original" devolve o campo inteiro de uma
// vez, e como o editor de lista (ficha/chegada/estética/medos) já mostra a
// lista inteira pra revisar antes de salvar.
export const CAMPOS_MESCLAVEIS = ["subtitulo", "conceito", "ficha", "chegada", "estetica", "medos"];

export function mesclarCidadeComOverride(cidadeOriginal, override) {
  if (!cidadeOriginal) return cidadeOriginal;
  const o = override && typeof override === "object" ? override : {};
  const mesclada = { ...cidadeOriginal };
  for (const campo of CAMPOS_MESCLAVEIS) {
    if (Object.prototype.hasOwnProperty.call(o, campo)) mesclada[campo] = o[campo];
  }
  return mesclada;
}

// Normaliza qualquer formato de item de lista (string, {pub,gm} do
// mundoDados.js, ou o resultado de paraItemLista) num par {texto, soMestre}
// pra preencher o formulário de edição. Prefere `pub` (o que o jogador vê)
// como texto principal; só mostra `gm` quando não existe `pub` (item já
// inteiramente só-mestre).
export function normalizarItemLista(item) {
  if (item == null) return { texto: "", soMestre: false };
  if (typeof item === "string") return { texto: item, soMestre: false };
  const temPub = typeof item.pub === "string";
  const temGm = typeof item.gm === "string";
  if (temPub) return { texto: item.pub, soMestre: false };
  if (temGm) return { texto: item.gm, soMestre: true };
  return { texto: "", soMestre: false };
}

// Inverso de normalizarItemLista — o formato salvo no override (e lido de
// volta pelas mesmas textoVisivel/entradasVisiveis de mundo.js: {pub} visível
// a todos, {gm} só ao mestre, mesma convenção já usada em mundoDados.js).
export function paraItemLista({ texto, soMestre }) {
  return soMestre ? { gm: texto || "" } : { pub: texto || "" };
}
