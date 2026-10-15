// Testes de render do componente ResourceDots (point-amaranth-app.jsx) — a
// bolinha de HP/MP/SP do painel Recursos da ficha. Cobre a prop nova
// `visual` ("coracao" | "liquido" | "gas"), que troca só a RENDERIZAÇÃO
// (data-s/data-full, aria-label, título) sem tocar a lógica de
// quebradas/rachadas/onToggle já existente — e confirma que sem `visual`
// (qualquer outro uso futuro do componente) a saída continua idêntica à de
// antes desta mudança.
// Roda com `node --test` (Node >=20, nativo) ou `npm test`.
//
// Observação: react-dom/server (usado aqui, no mesmo estilo de
// retrato.render.test.js) faz só uma passada de render sem useEffect — por
// isso dá pra conferir os estados "cheio" (data-s="full"/data-full="true")
// e "quebrado"/"vazio" (data-s="broken"/data-full="false") a partir de
// `resource.current`, mas não o estado intermediário "rachado"
// (data-s="crack"), que só existe depois de um clique de verdade (mudança
// de estado local via useState, não via prop) — esse fica pra conferência
// manual no navegador (ver passo a passo no relatório da tarefa).

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Droplet, Sparkles, Flame } from "lucide-react";
import { loadAppModule } from "./renderTestUtils.js";

let ResourceDots;

before(async () => {
  const mod = await loadAppModule();
  ResourceDots = mod.ResourceDots;
});

function render(props) {
  return renderToStaticMarkup(React.createElement(ResourceDots, props));
}

describe("ResourceDots — visual=\"coracao\" (HP)", () => {
  it("dots cheios (dentro de current) vêm com data-s=\"full\"", () => {
    const html = render({ label: "HP", rachavel: true, visual: "coracao", icon: Droplet, color: "#A83A2E", resource: { current: 3, max: 3 }, onToggle: () => {} });
    const fulls = html.match(/data-s="full"/g) || [];
    assert.equal(fulls.length, 3, "esperava os 3 dots cheios com data-s=\"full\"");
    assert.ok(!html.includes('data-s="broken"'));
  });

  it("dots fora do current vêm com data-s=\"broken\"", () => {
    const html = render({ label: "HP", rachavel: true, visual: "coracao", icon: Droplet, color: "#A83A2E", resource: { current: 3, max: 5 }, onToggle: () => {} });
    assert.equal((html.match(/data-s="full"/g) || []).length, 3);
    assert.equal((html.match(/data-s="broken"/g) || []).length, 2);
  });

  it("current 0 -> todos os dots quebrados", () => {
    const html = render({ label: "HP", rachavel: true, visual: "coracao", icon: Droplet, color: "#A83A2E", resource: { current: 0, max: 4 }, onToggle: () => {} });
    assert.equal((html.match(/data-s="broken"/g) || []).length, 4);
    assert.ok(!html.includes('data-s="full"'));
  });

  it("aria-label e title batem com o estado de cada dot", () => {
    const html = render({ label: "HP", rachavel: true, visual: "coracao", icon: Droplet, color: "#A83A2E", resource: { current: 1, max: 2 }, onToggle: () => {} });
    assert.ok(html.includes('aria-label="HP 1: inteiro"'));
    assert.ok(html.includes('aria-label="HP 2: quebrado"'));
    assert.ok(html.includes("Clique pra rachar"));
    assert.ok(html.includes("Clique pra restaurar"));
  });

  it("sem onToggle, renderiza <div> (não clicável) em vez de <button>", () => {
    const html = render({ label: "HP", rachavel: true, visual: "coracao", icon: Droplet, color: "#A83A2E", resource: { current: 1, max: 1 } });
    assert.ok(!html.includes("<button"), "não deveria ter <button> sem onToggle");
  });
});

describe("ResourceDots — visual=\"liquido\" (MP)", () => {
  it("dots dentro do current vêm com data-full=\"true\", os demais com \"false\"", () => {
    const html = render({ label: "MP (Mana Points)", visual: "liquido", icon: Sparkles, color: "#4A6B96", resource: { current: 2, max: 3 }, onToggle: () => {} });
    assert.equal((html.match(/data-full="true"/g) || []).length, 2);
    assert.equal((html.match(/data-full="false"/g) || []).length, 1);
  });

  it("aria-label e title (esvaziar/restaurar) batem com cheio/vazio", () => {
    const html = render({ label: "MP (Mana Points)", visual: "liquido", icon: Sparkles, color: "#4A6B96", resource: { current: 1, max: 2 }, onToggle: () => {} });
    assert.ok(html.includes('aria-label="MP (Mana Points) 1: cheio"'));
    assert.ok(html.includes('aria-label="MP (Mana Points) 2: vazio"'));
    assert.ok(html.includes("Clique pra esvaziar"));
    assert.ok(html.includes("Clique pra restaurar"));
  });
});

describe("ResourceDots — visual=\"gas\" (SP)", () => {
  it("usa o verbo esvaziar customizado (evaporar) e data-full correto", () => {
    const html = render({ label: "SP (Soul Points)", visual: "gas", verboEsvaziar: "evaporar", icon: Flame, color: "#4A7A4E", resource: { current: 1, max: 2 }, onToggle: () => {} });
    assert.ok(html.includes('aria-label="SP (Soul Points) 1: cheio"'));
    assert.ok(html.includes('aria-label="SP (Soul Points) 2: vazio"'));
    assert.ok(html.includes("Clique pra evaporar"));
    assert.equal((html.match(/data-full="true"/g) || []).length, 1);
    assert.equal((html.match(/data-full="false"/g) || []).length, 1);
  });

  it("current 0 -> todos vazios (data-full=\"false\")", () => {
    const html = render({ label: "SP", visual: "gas", verboEsvaziar: "evaporar", icon: Flame, color: "#4A7A4E", resource: { current: 0, max: 3 }, onToggle: () => {} });
    assert.equal((html.match(/data-full="false"/g) || []).length, 3);
    assert.ok(!html.includes('data-full="true"'));
  });
});

describe("ResourceDots — sem `visual` (uso padrão, continua igual a antes)", () => {
  it("renderiza bolinhas simples (sem data-s/data-full), com a cor e o tamanho de sempre", () => {
    const html = render({ label: "HP", rachavel: true, icon: Droplet, color: "#A83A2E", resource: { current: 2, max: 3 }, onToggle: () => {} });
    assert.ok(!html.includes("data-s="), "modo padrão não deve usar data-s (isso é só do visual=coracao)");
    assert.ok(!html.includes("data-full="), "modo padrão não deve usar data-full (isso é só do visual=liquido/gas)");
    assert.ok(html.includes("width:14px"), "bolinha padrão continua com 14px (não os 28px do visual novo)");
    assert.ok(html.includes("border-radius:50%"));
    assert.ok(!html.includes("pt-orb"), "modo padrão não deve usar nenhuma classe pt- do visual novo");
  });

  it("título permanece \"Clique pra rachar\"/\"Clique pra quebrar\"/\"Clique pra restaurar\" (HP rachavel)", () => {
    const html = render({ label: "HP", rachavel: true, icon: Droplet, color: "#A83A2E", resource: { current: 1, max: 1 }, onToggle: () => {} });
    assert.ok(html.includes("Clique pra rachar"));
  });

  it("título permanece \"Clique pra {verbo}\" pra MP/SP (não rachavel)", () => {
    const html = render({ label: "MP", icon: Sparkles, color: "#4A6B96", resource: { current: 1, max: 1 }, onToggle: () => {} });
    assert.ok(html.includes("Clique pra esvaziar"));
  });

  it("max 0 continua mostrando \"sem pontos\"", () => {
    const html = render({ label: "SP", icon: Flame, color: "#4A7A4E", resource: { current: 0, max: 0 }, onToggle: () => {} });
    assert.ok(html.includes("sem pontos"));
  });

  it("sem onToggle, renderiza <div> (somente leitura) tanto no padrão quanto nos visuais novos", () => {
    const padrao = render({ label: "HP", rachavel: true, icon: Droplet, color: "#A83A2E", resource: { current: 1, max: 1 } });
    const coracao = render({ label: "HP", rachavel: true, visual: "coracao", icon: Droplet, color: "#A83A2E", resource: { current: 1, max: 1 } });
    assert.ok(!padrao.includes("<button"));
    assert.ok(!coracao.includes("<button"));
  });
});
