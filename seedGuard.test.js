// Testes da blindagem de seed (ver seedGuard.js): não deixa repovoar o banco
// a partir de um localStorage vazio/corrompido, não propõe nada quando o
// banco já tem personagens, e calcula corretamente a oportunidade (quantidade
// a enviar) quando as duas condições batem — o que a confirmação no App usa
// pra pedir "enviar N personagens?" antes de qualquer escrita.
// Roda com `node --test` (Node >=20, nativo, sem dependências) ou `npm test`.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MIN_PLAUSIBLE_CHARACTERS, countPlausibleCharacters, isPlausibleSeed,
  decideSeedOpportunity, buildSeedLogEntry,
} from "./seedGuard.js";

const UM_PERSONAGEM = JSON.stringify([{ id: "almah", name: "Almah Mason" }]);
const TRES_PERSONAGENS = JSON.stringify([
  { id: "almah", name: "Almah Mason" },
  { id: "kiryu", name: "Kiryu" },
  { id: "sp_leon", name: "Leon Winters" },
]);

describe("countPlausibleCharacters", () => {
  it("conta personagens com id e nome", () => {
    assert.equal(countPlausibleCharacters(TRES_PERSONAGENS), 3);
    assert.equal(countPlausibleCharacters(UM_PERSONAGEM), 1);
  });
  it("ignora entradas sem id ou sem nome (lixo/placeholder)", () => {
    const json = JSON.stringify([{ id: "almah", name: "Almah" }, { id: "", name: "" }, { name: "sem id" }, { id: "sem_nome" }]);
    assert.equal(countPlausibleCharacters(json), 1);
  });
  it("devolve 0 pra ausente, vazio, não-JSON, não-array ou null", () => {
    assert.equal(countPlausibleCharacters(undefined), 0);
    assert.equal(countPlausibleCharacters(null), 0);
    assert.equal(countPlausibleCharacters(""), 0);
    assert.equal(countPlausibleCharacters("isso não é json{{{"), 0);
    assert.equal(countPlausibleCharacters(JSON.stringify({ not: "an array" })), 0);
    assert.equal(countPlausibleCharacters(JSON.stringify([])), 0);
  });
});

describe("isPlausibleSeed", () => {
  it("verdadeiro quando bate o mínimo de personagens plausíveis", () => {
    assert.equal(isPlausibleSeed(UM_PERSONAGEM), true);
    assert.equal(MIN_PLAUSIBLE_CHARACTERS, 1);
  });
  it("falso pra localStorage vazio, ausente ou corrompido", () => {
    assert.equal(isPlausibleSeed(undefined), false);
    assert.equal(isPlausibleSeed(JSON.stringify([])), false);
    assert.equal(isPlausibleSeed("{{{"), false);
  });
});

describe("decideSeedOpportunity", () => {
  it("null (não semeia) com localStorage vazio, mesmo se o banco remoto também estiver vazio", () => {
    assert.equal(decideSeedOpportunity({ remoteHasCharacters: false, localCharactersJson: undefined }), null);
    assert.equal(decideSeedOpportunity({ remoteHasCharacters: false, localCharactersJson: JSON.stringify([]) }), null);
    assert.equal(decideSeedOpportunity({ remoteHasCharacters: false, localCharactersJson: "{{{corrompido" }), null);
  });

  it("null (não semeia) quando o banco remoto já tem personagens, mesmo com local plausível", () => {
    const resultado = decideSeedOpportunity({ remoteHasCharacters: true, localCharactersJson: TRES_PERSONAGENS });
    assert.equal(resultado, null);
  });

  it("propõe a oportunidade certa (banco vazio + local plausível): count bate com a quantidade real", () => {
    const resultado = decideSeedOpportunity({ remoteHasCharacters: false, localCharactersJson: TRES_PERSONAGENS });
    assert.deepEqual(resultado, { count: 3 });

    const umSo = decideSeedOpportunity({ remoteHasCharacters: false, localCharactersJson: UM_PERSONAGEM });
    assert.deepEqual(umSo, { count: 1 });
  });
});

describe("buildSeedLogEntry", () => {
  it("registra data (ISO), quantidade de personagens e as chaves enviadas", () => {
    const now = new Date("2026-10-02T12:00:00.000Z");
    const entry = buildSeedLogEntry(["point-characters", "point-kingdoms"], 3, now);
    assert.equal(entry.at, "2026-10-02T12:00:00.000Z");
    assert.equal(entry.characterCount, 3);
    assert.deepEqual(entry.keys, ["point-characters", "point-kingdoms"]);
  });
  it("não compartilha referência com o array de chaves passado (cópia defensiva)", () => {
    const keys = ["point-characters"];
    const entry = buildSeedLogEntry(keys, 1, new Date());
    keys.push("point-gods");
    assert.deepEqual(entry.keys, ["point-characters"]);
  });
});
