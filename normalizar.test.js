// Teste da normalização única usada tanto no carregamento normal quanto na
// importação de backup (ver normalizar.js) — garante que os dois caminhos
// corrigem exatamente os mesmos formatos antigos, pra um backup baixado antes
// de uma migração existir não restaurar com campo em branco (ex: resumo da
// cidade) ou quebrar a UI (ex: abilities undefined).
// Roda com `node --test` (Node >=20, nativo, sem dependências) ou `npm test`.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizarEstado } from "./normalizar.js";
import { buildBackup, parseBackup } from "./backup.js";

describe("normalizarEstado", () => {
  it("migra cidade no formato antigo (description, sem id/x/y) dentro de kingdoms", () => {
    const estado = {
      kingdoms: [{ id: "katalao", name: "Katalão", cities: [{ name: "Frontier", description: "Cidade de fronteira." }] }],
    };
    const normalizado = normalizarEstado(estado);
    const cidade = normalizado.kingdoms[0].cities[0];
    assert.equal(cidade.resumo, "Cidade de fronteira.");
    assert.equal("description" in cidade, false);
    assert.equal(typeof cidade.id, "string");
    assert.deepEqual(cidade.distritos, []);
    assert.deepEqual(cidade.pessoas, []);
  });

  it("migra personagem sem `abilities` dentro de characters", () => {
    const estado = { characters: [{ id: "sp_leon", name: "Leon Winters" }] };
    const normalizado = normalizarEstado(estado);
    assert.deepEqual(normalizado.characters[0].abilities, []);
  });

  it("personagem sem imagemPos (backup de formato antigo) ganha o padrão ao normalizar", () => {
    const estado = { characters: [{ id: "sp_leon", name: "Leon Winters", imageUrl: "retratos/leon.jpg" }] };
    const normalizado = normalizarEstado(estado);
    assert.deepEqual(normalizado.characters[0].imagemPos, { y: 50, zoom: 1 });
  });

  it("round-trip exportar -> importar preserva um imagemPos customizado", () => {
    const estado = {
      characters: [{ id: "sp_leon", name: "Leon Winters", imageUrl: "retratos/leon.jpg", imagemPos: { y: 25, zoom: 1.8 } }],
    };
    const backup = buildBackup(estado);
    const restaurado = parseBackup(JSON.stringify(backup));
    const normalizado = normalizarEstado(restaurado);
    assert.deepEqual(normalizado.characters[0].imagemPos, { y: 25, zoom: 1.8 });
  });

  it("campos ausentes no estado viram listas vazias, sem quebrar", () => {
    const normalizado = normalizarEstado({});
    assert.deepEqual(normalizado.characters, []);
    assert.deepEqual(normalizado.kingdoms, []);
    assert.deepEqual(normalizado.gods, []);
    assert.deepEqual(normalizado.sagas, []);
    assert.deepEqual(normalizado.objectives, []);
    assert.deepEqual(normalizado.cidadesOverrides, {});
  });

  it("cidadesOverrides válido passa direto; formato inválido (array/string/entrada não-objeto) vira {}", () => {
    const valido = { frontier: { subtitulo: "Novo" } };
    assert.deepEqual(normalizarEstado({ cidadesOverrides: valido }).cidadesOverrides, valido);
    assert.deepEqual(normalizarEstado({ cidadesOverrides: [] }).cidadesOverrides, {});
    assert.deepEqual(normalizarEstado({ cidadesOverrides: "x" }).cidadesOverrides, {});
    assert.deepEqual(normalizarEstado({ cidadesOverrides: { frontier: "não é objeto" } }).cidadesOverrides, {});
  });

  it("gods/sagas/objectives passam direto, sem migração (não têm formato antigo)", () => {
    const gods = [{ id: "kronos", name: "Kronos" }];
    const sagas = [{ id: "saga_1", title: "O Casamento em Suth" }];
    const objectives = [{ id: "obj_1", title: "Derrotar o Pendragon" }];
    const normalizado = normalizarEstado({ gods, sagas, objectives });
    assert.deepEqual(normalizado.gods, gods);
    assert.deepEqual(normalizado.sagas, sagas);
    assert.deepEqual(normalizado.objectives, objectives);
  });

  it("é idempotente: normalizar o próprio resultado não muda nada", () => {
    const estado = {
      characters: [{ id: "x", name: "X" }],
      kingdoms: [{ id: "k", name: "K", cities: [{ name: "C", description: "d" }] }],
    };
    const uma = normalizarEstado(estado);
    const duas = normalizarEstado(uma);
    assert.deepEqual(uma, duas);
  });
});

describe("importação de backup no formato ANTIGO (cenário real: restaurar um .json baixado antes das migrações)", () => {
  it("backup com cidade `description` e personagem sem `abilities` sai normalizado, preservando o conteúdo", () => {
    // Simula um backup baixado ANTES da expansão do dossiê de cidade e antes
    // do campo `abilities` existir — exatamente o formato que handleImportFile
    // recebe de um arquivo .json antigo. parseBackup (ver backup.js) só valida
    // a forma geral (listas existem); não migra nada — por isso quem chama
    // precisa aplicar normalizarEstado depois, como handleImportFile faz.
    const backupAntigo = {
      version: 1,
      exportedAt: "2025-01-01T00:00:00.000Z",
      characters: [{ id: "sp_leon", name: "Leon Winters", faction: "Aurora (Sidepoint)" }],
      kingdoms: [{
        id: "katalao", name: "Katalão",
        cities: [{ name: "Frontier", description: "Cidade de fronteira, porta de entrada pro continente." }],
      }],
      gods: [{ id: "kronos", name: "Kronos" }],
      sagas: [],
      objectives: [],
    };

    const parsed = parseBackup(JSON.stringify(backupAntigo));
    const normalizado = normalizarEstado(parsed);

    // Personagem: não quebra, e ganha abilities = [] (sem isso, o CharacterForm
    // quebrava com tela branca ao tentar .map() em undefined).
    assert.deepEqual(normalizado.characters[0].abilities, []);
    assert.equal(normalizado.characters[0].name, "Leon Winters");
    assert.equal(normalizado.characters[0].grupo, "aurora");
    // Esse backup também não tem hp/mp/sp (formato bem antigo) — sem default,
    // a ficha quebrava ao abrir ("Cannot read properties of undefined (reading 'max')").
    assert.equal(typeof normalizado.characters[0].hp.max, "number");
    assert.equal(typeof normalizado.characters[0].sp.max, "number");
    assert.deepEqual(normalizado.characters[0].mp, { current: 3, max: 3 });

    // Cidade: o texto de `description` não se perde — migra pra `resumo`.
    const cidade = normalizado.kingdoms[0].cities[0];
    assert.equal(cidade.resumo, "Cidade de fronteira, porta de entrada pro continente.");
    assert.equal("description" in cidade, false);
    assert.equal(cidade.visaoGeral, "");
    assert.equal(cidade.imageUrl, "");
    assert.deepEqual(cidade.distritos, []);
    assert.deepEqual(cidade.pessoas, []);
    assert.equal(typeof cidade.id, "string");

    // Resto do backup preservado sem alteração.
    assert.deepEqual(normalizado.gods, backupAntigo.gods);
    assert.deepEqual(normalizado.sagas, []);
    assert.deepEqual(normalizado.objectives, []);
  });

  it("importar o mesmo backup antigo duas vezes seguidas (reimportação) dá o mesmo resultado", () => {
    const backupAntigo = {
      characters: [{ id: "x", name: "X" }],
      kingdoms: [{ id: "k", name: "K", cities: [{ name: "C", description: "d" }] }],
    };
    const parsed = parseBackup(JSON.stringify(backupAntigo));
    const primeira = normalizarEstado(parsed);
    const segunda = normalizarEstado(parseBackup(JSON.stringify(backupAntigo)));
    assert.deepEqual(primeira, segunda);
  });
});
