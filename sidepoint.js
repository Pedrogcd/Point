// Grupo Aurora (Sidepoint) — funções puras de dados, sem depender de storage
// nem de React, pra poder ser testadas isoladas (ver sidepoint.test.js).
// point-amaranth-app.jsx importa deste módulo; não duplique esta lógica lá.

// Conceito de GRUPO (mesa): cada personagem pertence a uma campanha. "c" é o
// Grupo C (a campanha principal), "aurora" é o Sidepoint, "suth" é a mesa do
// Império de Suth, "goethia" é a mesa de Goethia, "hetalion" é a mesa da
// república de Hetalion. Classifica pelo campo salvo, senão pelo id
// "sp_"/"suth_"/"goethia_"/"hetalion_" ou pela facção — cobre fichas salvas
// antes do campo `grupo` existir. O Fate ("fate") não começa com "suth_", e
// a Erin ("erin") não começa com "goethia_" nem "hetalion_", então ambos
// caem no Grupo C por padrão, como deve: pertencem ao Grupo C mesmo tendo
// ligação forte com o reino de origem (Suth e Goethia, respectivamente).
export function grupoDoPersonagem(c) {
  if (c?.grupo) return c.grupo;
  if (String(c?.id || "").startsWith("sp_") || c?.faction === "Aurora (Sidepoint)") return "aurora";
  if (String(c?.id || "").startsWith("suth_")) return "suth";
  if (String(c?.id || "").startsWith("goethia_")) return "goethia";
  if (String(c?.id || "").startsWith("hetalion_")) return "hetalion";
  return "c";
}

// Repõe as sementes do Grupo Aurora em quem já tinha personagens salvos (as
// sementes só entram sozinhas quando o armazenamento está vazio — isso já
// acontece antes de chegar aqui, via SEED_CHARACTERS).
//
// A regra é por PERSONAGEM, e não por lote: cada ficha semente é reposta só se
// o id dela não existir E ela não estiver na lista de apagados de propósito.
// De propósito NÃO existe uma flag de "já inseri uma vez" — uma flag correria o
// risco de ser marcada numa gravação que não completou, e o grupo sumiria PARA
// SEMPRE sem jeito de voltar pela interface. Comparando por id, a função é
// idempotente: chamar de novo com o resultado anterior não duplica nada.
export function reporSidepoint(existentes, sementes, removidos) {
  const idsExistentes = new Set(existentes.map((ch) => ch.id));
  const removidosSet = new Set(Array.isArray(removidos) ? removidos : []);
  const faltando = sementes.filter((ch) => !idsExistentes.has(ch.id) && !removidosSet.has(ch.id));
  return faltando.length > 0 ? [...existentes, ...faltando] : existentes;
}
