// Grupo Aurora (Sidepoint) — funções puras de dados, sem depender de storage
// nem de React, pra poder ser testadas isoladas (ver sidepoint.test.js).
// point-amaranth-app.jsx importa deste módulo; não duplique esta lógica lá.

// Conceito de GRUPO (mesa): cada personagem pertence a uma campanha. "c" é o
// Grupo C (a campanha principal), "aurora" é o Sidepoint. Classifica pelo campo
// salvo, senão pelo id "sp_" ou pela facção — cobre fichas salvas antes do
// campo `grupo` existir.
export function grupoDoPersonagem(c) {
  if (c?.grupo) return c.grupo;
  if (String(c?.id || "").startsWith("sp_") || c?.faction === "Aurora (Sidepoint)") return "aurora";
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
