import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { linkDaFicha, fichaDoHash } from "./linkFicha.js";

describe("link direto pra ficha (08/11)", () => {
  it("monta o link a partir do endereço atual, trocando o hash", () => {
    assert.equal(linkDaFicha("https://pedrogcd.github.io/Point/#algo", "akira"), "https://pedrogcd.github.io/Point/#ficha=akira");
    assert.equal(linkDaFicha("http://localhost:5191/Point/", "id com espaço"), "http://localhost:5191/Point/#ficha=id%20com%20espa%C3%A7o");
  });
  it("lê o id do hash (ida e volta) e ignora outros hashes", () => {
    assert.equal(fichaDoHash("#ficha=id%20com%20espa%C3%A7o"), "id com espaço");
    assert.equal(fichaDoHash("#outra=1"), null);
    assert.equal(fichaDoHash(""), null);
  });
});
