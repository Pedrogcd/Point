// Pessoas do reino (aba "Pessoas" do painel de Mundo) — funções puras de
// dados, sem depender de storage nem de React, pra poder ser testadas
// isoladas (ver pessoasReino.test.js). point-amaranth-app.jsx importa deste
// módulo; não duplique esta lógica lá.
//
// Formato de `reino.pessoas` (semeado por reino, ver reporPessoasDoReino):
//   {
//     estrutura: { titulo, grupos: [{ id, nome, funcao, membros: [
//       { personagemId?, nomeLivre?, cargo, ordem, nota?, soMestre? }
//     ] }] },
//     relacoes: [{ de, para, tipo, rotulo, soMestre? }],
//     genealogias: [{ id, titulo, nos: [{ id, personagemId?, nome?, nota?, soMestre? }],
//       ligacoes: [{ pais: [noId...], filho: noId, tipo, tracejado?, soMestre? }], notas?: [] }],
//   }
// Reino sem `pessoas` continua funcionando: a aba cai pro agrupamento por
// afiliação (ou lista simples) — ver gruposDoReino.

export const TIPOS_RELACAO = [
  { id: "hierarquia", label: "Hierarquia", cor: "#A9762C", icone: "Crown" },
  { id: "mentoria", label: "Mentoria", cor: "#6B5590", icone: "BookOpen" },
  { id: "criacao", label: "Criação", cor: "#2F6D61", icone: "Sparkles" },
  { id: "familia", label: "Família", cor: "#4A7A4E", icone: "Users" },
  { id: "alianca", label: "Aliança", cor: "#4A6B96", icone: "Shield" },
  { id: "rivalidade", label: "Rivalidade", cor: "#A83A2E", icone: "Swords" },
];

export function infoTipoRelacao(tipo) {
  return TIPOS_RELACAO.find((t) => t.id === tipo) || { id: tipo, label: tipo || "Relação", cor: "#6B5D45", icone: "Users" };
}

// Semeia `reino.pessoas` só em quem AINDA não tem (idempotente, por reino):
// uma vez semeado — ou criado pelo GM pela interface — nunca é sobrescrito,
// mesmo que o conteúdo da semente mude depois. `sementes`: [{ reinoId, pessoas }].
export function reporPessoasDoReino(reinos, sementes) {
  if (!Array.isArray(reinos)) return reinos;
  const porReino = new Map((Array.isArray(sementes) ? sementes : []).map((s) => [s.reinoId, s.pessoas]));
  let mudou = false;
  const resultado = reinos.map((reino) => {
    if (reino?.pessoas) return reino;
    const semente = porReino.get(reino?.id);
    if (!semente) return reino;
    mudou = true;
    return { ...reino, pessoas: semente };
  });
  return mudou ? resultado : reinos;
}

// Mesmo padrão de cidadeOverrides.js: cada campo é substituído por INTEIRO
// (não item a item) — "Restaurar original" apaga só a chave desse campo.
export const CAMPOS_MESCLAVEIS_PESSOAS = ["estrutura", "relacoes", "genealogias"];

export function mesclarPessoasComOverride(pessoasOriginal, override) {
  const original = pessoasOriginal || { estrutura: null, relacoes: [], genealogias: [] };
  const o = override && typeof override === "object" ? override : {};
  const mesclada = { ...original };
  for (const campo of CAMPOS_MESCLAVEIS_PESSOAS) {
    if (Object.prototype.hasOwnProperty.call(o, campo)) mesclada[campo] = o[campo];
  }
  return mesclada;
}

function normalizado(texto) {
  return String(texto || "").trim().toLowerCase();
}

// Monta os grupos exibidos na aba "Pessoas": com estrutura (ex: Pilares do
// Suth), os grupos e a ordem vêm dela, cada membro resolvido pra ficha (ou
// null se o id não existir mais — ficha apagada). Sem estrutura, agrupa quem
// tem a faction do reino pela afiliação (ou "Outros" sem afiliação); sem
// nenhum desses dois, devolve lista vazia (a aba mostra um estado vazio).
export function gruposDoReino(pessoas, characters, reinoNome) {
  const todos = Array.isArray(characters) ? characters : [];
  const grupos = pessoas?.estrutura?.grupos;
  if (Array.isArray(grupos) && grupos.length > 0) {
    return grupos.map((g) => ({
      id: g.id,
      nome: g.nome,
      funcao: g.funcao || "",
      membros: (g.membros || [])
        .slice()
        .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
        .map((m) => ({
          ...m,
          personagem: m.personagemId ? todos.find((c) => c.id === m.personagemId) || null : null,
        })),
    }));
  }
  const doReino = todos.filter((c) => c.faction === reinoNome);
  if (doReino.length === 0) return [];
  const porAfiliacao = new Map();
  for (const c of doReino) {
    const chave = normalizado(c.affiliation) || "__sem_afiliacao__";
    if (!porAfiliacao.has(chave)) porAfiliacao.set(chave, { nome: c.affiliation || "Outros", membros: [] });
    porAfiliacao.get(chave).membros.push({ personagemId: c.id, personagem: c, cargo: "", ordem: porAfiliacao.get(chave).membros.length });
  }
  return [...porAfiliacao.entries()].map(([id, g]) => ({ id, nome: g.nome, funcao: "", membros: g.membros }));
}

// Relações visíveis de um personagem — nas duas direções (ele como `de` ou
// como `para`), com `direcao`/`outroId` pra UI montar "A <rótulo> B" ou
// "A é <rótulo> de B" de qualquer um dos dois lados.
export function relacoesDoPersonagem(relacoes, personagemId) {
  return (relacoes || [])
    .filter((r) => r.de === personagemId || r.para === personagemId)
    .map((r) => ({ ...r, direcao: r.de === personagemId ? "de" : "para", outroId: r.de === personagemId ? r.para : r.de }));
}

// Sigilo por item, mesma convenção das cidades: item sem `soMestre` (ou
// `soMestre: false`) é visível a todos; `soMestre: true` só aparece no GM.
export function itensVisiveis(lista, gm) {
  return (lista || []).filter((item) => gm || !item.soMestre);
}

// O LAYOUT da árvore genealógica (posição x/y de cada nó, cônjuges lado a
// lado, sobreposição resolvida) foi pra arvoreLayout.js — ver
// layoutGenealogia lá, usada por ArvoreGenealogica em point-amaranth-app.jsx.
