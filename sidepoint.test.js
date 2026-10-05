// Testes do módulo sidepoint.js: reposição idempotente do Grupo Aurora e
// classificação de grupo (mesa) por personagem.
// Roda com `node --test` (Node >=20, nativo, sem dependências) ou `npm test`.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { grupoDoPersonagem, reporSidepoint } from "./sidepoint.js";

const SEMENTES_AURORA = [
  { id: "sp_leon", name: "Leon Winters", faction: "Aurora (Sidepoint)" },
  { id: "sp_merkel", name: "Merkel Winters", faction: "Aurora (Sidepoint)" },
  { id: "sp_raiko", name: "Raiko", faction: "Aurora (Sidepoint)" },
  { id: "sp_akira", name: "Akira Cagliostro", faction: "Aurora (Sidepoint)" },
  { id: "sp_k", name: "K (Kanny)", faction: "Aurora (Sidepoint)" },
  { id: "sp_ishran", name: "Mevil Ishran", faction: "Aurora (Sidepoint)" },
];

function grupoCFalso(n) {
  return Array.from({ length: n }, (_, i) => ({ id: `char_${i}`, name: `Personagem ${i}`, faction: "Amaranth/Omem" }));
}

describe("grupoDoPersonagem", () => {
  it("usa o campo grupo salvo quando existe", () => {
    assert.equal(grupoDoPersonagem({ id: "qualquer", grupo: "aurora" }), "aurora");
    assert.equal(grupoDoPersonagem({ id: "qualquer", grupo: "c" }), "c");
  });
  it("sem campo grupo, classifica pelo prefixo sp_ do id", () => {
    assert.equal(grupoDoPersonagem({ id: "sp_leon" }), "aurora");
  });
  it("sem campo grupo, classifica pela facção Aurora (Sidepoint)", () => {
    assert.equal(grupoDoPersonagem({ id: "outro_id", faction: "Aurora (Sidepoint)" }), "aurora");
  });
  it("sem grupo, sem prefixo sp_, sem facção Aurora, cai no Grupo C por padrão", () => {
    assert.equal(grupoDoPersonagem({ id: "almah", faction: "Amaranth/Omem" }), "c");
    assert.equal(grupoDoPersonagem({}), "c");
  });
  it("sem campo grupo, classifica pelo prefixo suth_ do id", () => {
    assert.equal(grupoDoPersonagem({ id: "suth_emphes" }), "suth");
  });
  it("o Fate (id 'fate') NÃO é reclassificado pra suth mesmo recebendo uma ficha nova de lá — fica no Grupo C", () => {
    assert.equal(grupoDoPersonagem({ id: "fate" }), "c");
    // mesmo com uma ficha já marcada fichaSuthAplicada: true, sem grupo salvo
    // explicitamente o id "fate" continua caindo no Grupo C por padrão.
    assert.equal(grupoDoPersonagem({ id: "fate", fichaSuthAplicada: true }), "c");
  });
});

// Cenários de carregamento verificados manualmente (ver INSTRUCAO-claude-code-
// merge.md) — cada linha da tabela vira um teste aqui.
describe("reporSidepoint — cenários de carregamento", () => {
  it("13 salvos, nenhuma chave do Sidepoint: repõe as 6 sementes (19 no total)", () => {
    const existentes = grupoCFalso(13);
    const resultado = reporSidepoint(existentes, SEMENTES_AURORA, []);
    assert.equal(resultado.length, 19);
    assert.equal(resultado.filter((c) => c.id.startsWith("sp_")).length, 6);
  });

  it("13 salvos + lista de removidos vazia/abandonada: também repõe as 6 (recupera o grupo)", () => {
    // A versão antiga usava uma flag "point-sidepoint-v1" separada, que não
    // existe mais — reporSidepoint só olha os ids existentes e os removidos de
    // propósito, então uma flag antiga (ou ausente) nunca impede a reposição.
    const existentes = grupoCFalso(13);
    const resultado = reporSidepoint(existentes, SEMENTES_AURORA, undefined);
    assert.equal(resultado.length, 19);
    assert.equal(resultado.filter((c) => c.id.startsWith("sp_")).length, 6);
  });

  it("os 19 já salvos: não duplica", () => {
    const existentes = [...grupoCFalso(13), ...SEMENTES_AURORA];
    const resultado = reporSidepoint(existentes, SEMENTES_AURORA, []);
    assert.equal(resultado.length, 19);
    assert.equal(resultado.filter((c) => c.id.startsWith("sp_")).length, 6);
  });

  it("18 salvos (falta sp_raiko) + sp_raiko na lista de removidos: fica com 18, Aurora com 5", () => {
    const semRaiko = SEMENTES_AURORA.filter((c) => c.id !== "sp_raiko");
    const existentes = [...grupoCFalso(13), ...semRaiko];
    const resultado = reporSidepoint(existentes, SEMENTES_AURORA, ["sp_raiko"]);
    assert.equal(resultado.length, 18);
    assert.equal(resultado.filter((c) => c.id.startsWith("sp_")).length, 5);
    assert.ok(!resultado.some((c) => c.id === "sp_raiko"));
  });

  it("é idempotente: abrir o app duas vezes seguidas não duplica personagens", () => {
    const existentes = grupoCFalso(13);
    const primeiraAbertura = reporSidepoint(existentes, SEMENTES_AURORA, []);
    const segundaAbertura = reporSidepoint(primeiraAbertura, SEMENTES_AURORA, []);
    assert.equal(segundaAbertura.length, 19);
    assert.deepEqual(segundaAbertura, primeiraAbertura);
  });

  it("não mexe na lista quando não falta nenhuma semente (mesma referência)", () => {
    const existentes = [...grupoCFalso(13), ...SEMENTES_AURORA];
    const resultado = reporSidepoint(existentes, SEMENTES_AURORA, []);
    assert.equal(resultado, existentes); // mesma referência: evita re-render desnecessário
  });

  it("não sobrescreve imagemPos (enquadramento do retrato) de quem já existe", () => {
    // A reposição só ADICIONA sementes faltando por id — nunca toca em quem já
    // está na lista, então um ajuste de enquadramento feito pelo jogador numa
    // ficha do Aurora sobrevive a qualquer reabertura do app.
    const sp_leonCustomizado = { id: "sp_leon", name: "Leon Winters", faction: "Aurora (Sidepoint)", imagemPos: { y: 15, zoom: 2.5 } };
    const existentes = [...grupoCFalso(13), sp_leonCustomizado, ...SEMENTES_AURORA.filter((c) => c.id !== "sp_leon")];
    const resultado = reporSidepoint(existentes, SEMENTES_AURORA, []);
    const leon = resultado.find((c) => c.id === "sp_leon");
    assert.deepEqual(leon.imagemPos, { y: 15, zoom: 2.5 });
  });
});
