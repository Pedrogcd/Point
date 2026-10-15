// Lógica pura da APRESENTAÇÃO da rolagem animada de dados (painel de
// Teste/Ataque/Magia e DuelRoller, point-amaranth-app.jsx) — nunca decide
// resultado nem regra: o dado já vem calculado por rollSuccessDice/
// resolveAtaque de engine.js, isso aqui só diz COMO e QUANDO revelar.
// Pura (sem DOM/window) pra poder testar fora do browser.

// Tempo (ms) até o dado de índice `indice` "pousar" e revelar seu valor
// final — 1s de tumble + 0.14s de atraso por posição (igual ao protótipo
// de referência), ou 0 (revela na hora, sem animação) se `reduzido`
// (prefers-reduced-motion).
export function duracaoRolagem(indice, reduzido) {
  if (reduzido) return 0;
  return 1000 + Math.max(0, indice) * 140;
}

// Classe visual do dado, pela MESMA regra de sucesso/crítico já usada em
// recomputeRoll/DiceRow (engine.js nunca entra aqui — só repete a
// comparação que o motor já fez): crítico = 10 natural; sucesso = d === 10
// || d > limiar; "1" = dado natural 1. Prioridade quando mais de uma bate
// ao mesmo tempo (só acontece em bordas, ex. limiar 0): crítico > sucesso
// > "1" > normal — um 10 nunca é "1"; um sucesso quase nunca é "1" também
// (só se limiar < 1), e aí o sucesso tem prioridade visual.
export function faceDoDado(valor, limiar) {
  if (valor === 10) return "crit";
  if (valor > limiar) return "win";
  if (valor === 1) return "one";
  return "normal";
}
