// Testes do backup/restauração manual (ver backup.js) — exportar e depois
// importar precisa devolver o mesmo estado, e um arquivo inválido precisa
// falhar com uma mensagem clara em vez de corromper os dados.
// Roda com `node --test` (Node >=20, nativo, sem dependências) ou `npm test`.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildBackup, parseBackup } from "./backup.js";

function sampleState() {
  return {
    characters: [{ id: "almah", name: "Almah Mason" }, { id: "kiryu", name: "Kiryu" }],
    kingdoms: [{ id: "hetalion", name: "Hetalion" }],
    gods: [{ id: "kronos", name: "Kronos" }],
    sagas: [{ id: "saga_casamento", title: "O Casamento em Suth" }],
    objectives: [{ id: "obj_1", title: "Derrotar o Pendragon" }],
    cidadesOverrides: {},
  };
}

describe("buildBackup", () => {
  it("inclui as 5 listas e metadados de versão/data", () => {
    const backup = buildBackup(sampleState());
    assert.equal(backup.version, 1);
    assert.ok(typeof backup.exportedAt === "string" && backup.exportedAt.length > 0);
    assert.deepEqual(backup.characters, sampleState().characters);
    assert.deepEqual(backup.kingdoms, sampleState().kingdoms);
    assert.deepEqual(backup.gods, sampleState().gods);
    assert.deepEqual(backup.sagas, sampleState().sagas);
    assert.deepEqual(backup.objectives, sampleState().objectives);
  });

  it("listas ausentes no estado viram array vazio, não quebram", () => {
    const backup = buildBackup({ characters: [{ id: "almah" }] });
    assert.deepEqual(backup.kingdoms, []);
    assert.deepEqual(backup.gods, []);
    assert.deepEqual(backup.sagas, []);
    assert.deepEqual(backup.objectives, []);
  });
});

describe("parseBackup", () => {
  it("aceita uma string JSON válida e devolve as 5 listas", () => {
    const backup = buildBackup(sampleState());
    const parsed = parseBackup(JSON.stringify(backup));
    assert.deepEqual(parsed.characters, sampleState().characters);
    assert.deepEqual(parsed.kingdoms, sampleState().kingdoms);
  });

  it("aceita um objeto já parseado (não só string)", () => {
    const backup = buildBackup(sampleState());
    const parsed = parseBackup(backup);
    assert.deepEqual(parsed.characters, sampleState().characters);
  });

  it("rejeita texto que não é JSON", () => {
    assert.throws(() => parseBackup("isso não é json{{{"), /JSON válido/);
  });

  it("rejeita JSON sem a lista de personagens", () => {
    assert.throws(() => parseBackup(JSON.stringify({ kingdoms: [] })), /personagens/);
  });

  it("rejeita null, número ou array na raiz", () => {
    assert.throws(() => parseBackup(JSON.stringify(null)));
    assert.throws(() => parseBackup(JSON.stringify(42)));
    assert.throws(() => parseBackup(JSON.stringify([1, 2, 3])));
  });

  it("listas que não existirem no arquivo viram array vazio, sem quebrar", () => {
    const parsed = parseBackup(JSON.stringify({ characters: [{ id: "almah" }] }));
    assert.deepEqual(parsed.kingdoms, []);
    assert.deepEqual(parsed.gods, []);
    assert.deepEqual(parsed.sagas, []);
    assert.deepEqual(parsed.objectives, []);
  });
});

describe("ciclo exportar → importar", () => {
  it("o estado volta igual depois de buildBackup + serializar + parseBackup", () => {
    const original = sampleState();
    const serializado = JSON.stringify(buildBackup(original));
    const restaurado = parseBackup(serializado);
    assert.deepEqual(restaurado, original);
  });

  it("funciona com listas vazias (campanha nova, sem nada salvo ainda)", () => {
    const original = { characters: [], kingdoms: [], gods: [], sagas: [], objectives: [], cidadesOverrides: {} };
    const serializado = JSON.stringify(buildBackup(original));
    const restaurado = parseBackup(serializado);
    assert.deepEqual(restaurado, original);
  });

  it("funciona com uma ficha completa de verdade (campos aninhados, arrays, etc.)", () => {
    const original = {
      characters: [{
        id: "sp_leon", name: "Leon Winters", atributosGerais: { forca: "E", destreza: "C" },
        procs: ["golpe_certeiro", "reflexo_agil", "persistente"],
        classes: [{ name: "Duelista de Estoc", description: "..." }, { name: "Mercador", description: "..." }],
        hp: { current: 3, max: 3 },
      }],
      kingdoms: [], gods: [], sagas: [], objectives: [], cidadesOverrides: {},
    };
    const restaurado = parseBackup(JSON.stringify(buildBackup(original)));
    assert.deepEqual(restaurado, original);
  });
});

describe("cidadesOverrides no backup — edições do GM no dossiê da cidade", () => {
  it("buildBackup inclui cidadesOverrides; ausente no estado vira {}", () => {
    assert.deepEqual(buildBackup({ characters: [] }).cidadesOverrides, {});
  });

  it("ciclo exportar → importar preserva as edições de override", () => {
    const original = {
      ...sampleState(),
      cidadesOverrides: { frontier: { subtitulo: "Novo subtítulo", ficha: [["Onde", "Editado"]] } },
    };
    const restaurado = parseBackup(JSON.stringify(buildBackup(original)));
    assert.deepEqual(restaurado.cidadesOverrides, original.cidadesOverrides);
  });

  it("backup ANTIGO, sem a chave cidadesOverrides, carrega normal (vira {})", () => {
    const backupAntigo = { characters: [{ id: "almah" }], kingdoms: [], gods: [], sagas: [], objectives: [] };
    const restaurado = parseBackup(JSON.stringify(backupAntigo));
    assert.deepEqual(restaurado.cidadesOverrides, {});
  });

  it("cidadesOverrides com formato inválido (array, string, número) vira {}, não quebra", () => {
    for (const invalido of [[], "x", 42, null]) {
      const restaurado = parseBackup(JSON.stringify({ characters: [], cidadesOverrides: invalido }));
      assert.deepEqual(restaurado.cidadesOverrides, {});
    }
  });
});
