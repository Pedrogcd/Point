// Testes das funções puras de sincronização em tempo real (sincronizacao.js).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  diffPersonagem, diffPersonagens, aplicarPatch, aplicarLinhaRemota, removerLinhaRemota, aplicarRecarga,
  carregarPersonagensRemotos, enviarPatchPersonagem, apagarPersonagemRemoto, assinarMudancas,
} from "./sincronizacao.js";

describe("diffPersonagem", () => {
  it("só os campos de topo que mudaram", () => {
    const a = { id: "x", name: "A", hp: { current: 3 }, xp: 0 };
    const b = { id: "x", name: "A", hp: { current: 2 }, xp: 0 };
    assert.deepEqual(diffPersonagem(a, b), { hp: { current: 2 } });
  });
  it("campo removido vai como null", () => {
    assert.deepEqual(diffPersonagem({ id: "x", nota: "oi" }, { id: "x" }), { nota: null });
  });
  it("ficha nova: inteira", () => {
    assert.deepEqual(diffPersonagem(undefined, { id: "x", name: "A" }), { id: "x", name: "A" });
  });
});

describe("diffPersonagens", () => {
  it("lista alteradas, novas e removidas", () => {
    const snap = new Map([["a", { id: "a", xp: 0 }], ["b", { id: "b", xp: 0 }]]);
    const r = diffPersonagens(snap, [{ id: "a", xp: 1 }, { id: "c", xp: 0 }]);
    assert.deepEqual(r.alterados, [{ id: "a", patch: { xp: 1 }, novo: false }, { id: "c", patch: { id: "c", xp: 0 }, novo: true }]);
    assert.deepEqual(r.removidos, ["b"]);
  });
  it("nada mudou: nada a subir", () => {
    const snap = new Map([["a", { id: "a", xp: 0 }]]);
    assert.deepEqual(diffPersonagens(snap, [{ id: "a", xp: 0 }]), { alterados: [], removidos: [] });
  });
});

describe("aplicarPatch", () => {
  it("null apaga o campo", () => {
    assert.deepEqual(aplicarPatch({ a: 1, b: 2 }, { b: null, c: 3 }), { a: 1, c: 3 });
  });
});

describe("aplicarLinhaRemota", () => {
  it("mudança de outra pessoa entra na ficha", () => {
    const snap = new Map([["a", { id: "a", xp: 0, hp: 3 }]]);
    const ordens = new Map();
    const chars = [{ id: "a", xp: 0, hp: 3 }];
    const out = aplicarLinhaRemota(chars, snap, ordens, { id: "a", data: { id: "a", xp: 0, hp: 1 } });
    assert.deepEqual(out, [{ id: "a", xp: 0, hp: 1 }]);
    assert.deepEqual(snap.get("a"), { id: "a", xp: 0, hp: 1 });
  });
  it("edição local ainda não enviada é preservada por cima da remota", () => {
    const snap = new Map([["a", { id: "a", xp: 0, hp: 3 }]]);
    const chars = [{ id: "a", xp: 5, hp: 3 }]; // xp editado aqui, ainda não subiu
    const out = aplicarLinhaRemota(chars, snap, new Map(), { id: "a", data: { id: "a", xp: 0, hp: 1 } });
    assert.deepEqual(out, [{ id: "a", xp: 5, hp: 1 }]);
  });
  it("eco da própria gravação não muda o array (mesma referência)", () => {
    const snap = new Map([["a", { id: "a", xp: 1 }]]);
    const chars = [{ id: "a", xp: 1 }];
    assert.equal(aplicarLinhaRemota(chars, snap, new Map(), { id: "a", data: { id: "a", xp: 1 } }), chars);
  });
  it("ficha nova de outra pessoa entra na posição da ordem", () => {
    const ordens = new Map([["a", 1], ["c", 3]]);
    const chars = [{ id: "a" }, { id: "c" }];
    const out = aplicarLinhaRemota(chars, new Map(), ordens, { id: "b", data: { id: "b" }, ordem: 2 });
    assert.deepEqual(out.map((p) => p.id), ["a", "b", "c"]);
  });
});

describe("removerLinhaRemota / aplicarRecarga", () => {
  it("ficha apagada por outra pessoa sai da lista e do snapshot", () => {
    const snap = new Map([["a", { id: "a" }]]);
    const out = removerLinhaRemota([{ id: "a" }, { id: "b" }], snap, new Map(), "a");
    assert.deepEqual(out, [{ id: "b" }]);
    assert.equal(snap.has("a"), false);
  });
  it("recarga: remove o que sumiu do banco e aplica o resto", () => {
    const snap = new Map([["a", { id: "a", xp: 0 }], ["b", { id: "b" }]]);
    const out = aplicarRecarga([{ id: "a", xp: 0 }, { id: "b" }], snap, new Map(), [{ id: "a", data: { id: "a", xp: 2 }, ordem: 1 }]);
    assert.deepEqual(out, [{ id: "a", xp: 2 }]);
  });
  it("ficha criada aqui e ainda não enviada não some na recarga", () => {
    const out = aplicarRecarga([{ id: "nova" }], new Map(), new Map(), []);
    assert.deepEqual(out, [{ id: "nova" }]);
  });
});

// ---------------------------------------------------------------------
// Adaptador com um Supabase falso em memória: duas "abas" assinadas no
// mesmo banco — o que uma grava, a outra recebe.
// ---------------------------------------------------------------------
function supabaseFalso() {
  const linhas = new Map();
  const ouvintes = [];
  const emitir = (table, payload) => ouvintes.filter((o) => o.table === table).forEach((o) => o.cb(payload));
  return {
    linhas,
    from(table) {
      return {
        select() { return { order: async () => ({ data: [...linhas.values()].sort((a, b) => a.ordem - b.ordem), error: null }) }; },
        delete() { return { eq: async (_c, id) => { const old = linhas.get(id); linhas.delete(id); emitir(table, { eventType: "DELETE", old }); return { error: null }; } }; },
      };
    },
    async rpc(_nome, { p_id, p_patch, p_ordem }) {
      const atual = linhas.get(p_id);
      const data = { ...(atual?.data || {}) };
      for (const [k, v] of Object.entries(p_patch)) { if (v === null) delete data[k]; else data[k] = v; }
      const linha = { id: p_id, data, ordem: atual?.ordem ?? p_ordem ?? 0 };
      linhas.set(p_id, linha);
      emitir("point_personagens", { eventType: atual ? "UPDATE" : "INSERT", new: linha });
      return { error: null };
    },
    channel() {
      const canal = {
        on(_tipo, filtro, cb) { ouvintes.push({ table: filtro.table, cb }); return canal; },
        subscribe(cb) { cb?.("SUBSCRIBED"); return canal; },
      };
      return canal;
    },
    removeChannel() {},
  };
}

describe("adaptador do Supabase (falso, em memória)", () => {
  it("o que uma aba grava a outra recebe; campos diferentes da mesma ficha se somam", async () => {
    const sb = supabaseFalso();
    const recebidos = [];
    let apagados = [];
    assinarMudancas(sb, { aoMudarPersonagem: (l) => recebidos.push(l), aoApagarPersonagem: (id) => apagados.push(id) });
    await enviarPatchPersonagem(sb, "x", { id: "x", name: "A", hp: 3 }, 1);
    await enviarPatchPersonagem(sb, "x", { hp: 1 }, 1);       // pessoa 1
    await enviarPatchPersonagem(sb, "x", { name: "B" }, 1);   // pessoa 2
    assert.deepEqual(recebidos.at(-1).data, { id: "x", name: "B", hp: 1 });
    assert.deepEqual((await carregarPersonagensRemotos(sb)).map((l) => l.id), ["x"]);
    await apagarPersonagemRemoto(sb, "x");
    assert.deepEqual(apagados, ["x"]);
  });
  it("sem Supabase: carregar devolve null (modo offline) e assinar não quebra", async () => {
    assert.equal(await carregarPersonagensRemotos(null), null);
    assert.equal(typeof assinarMudancas(null, {}), "function");
  });
});
