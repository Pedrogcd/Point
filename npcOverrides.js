// Overrides de edição do GM sobre os NPCs de mundo (conteúdo fixo em
// mundoDados.js:NPCS) — funções puras, sem depender de React nem de storage,
// pra serem testadas isoladas (ver npcOverrides.test.js). Mesmo padrão não-
// destrutivo de cidadeOverrides.js: mundoDados.js continua sendo o conteúdo
// ORIGINAL e nunca é reescrito. As edições do GM ficam num objeto separado,
// guardado em storage.js sob a chave "point-npcs-overrides":
// { [npcId]: { campo: valor } }. Pra exibir, mescla: valor do override (se
// existir) senão o original. Um campo sem override nem aparece no objeto —
// "Restaurar original" só apaga essa chave, nunca toca mundoDados.js.
//
// `gm` é substituído por INTEIRO (igual os campos de cidadeOverrides.js) —
// é o sub-objeto {papel, kv, texto, segredo, ganchos} que só existe no modo
// GM (ver mundo.js:npcVisivel); editar segredo/ganchos mexe nesse campo
// inteiro, não item a item.
export const CAMPOS_MESCLAVEIS_NPC = ["nome", "papel", "img", "texto", "gm"];

export function mesclarNpcComOverride(npcOriginal, override) {
  if (!npcOriginal) return npcOriginal;
  const o = override && typeof override === "object" ? override : {};
  const mesclado = { ...npcOriginal };
  for (const campo of CAMPOS_MESCLAVEIS_NPC) {
    if (Object.prototype.hasOwnProperty.call(o, campo)) mesclado[campo] = o[campo];
  }
  return mesclado;
}
