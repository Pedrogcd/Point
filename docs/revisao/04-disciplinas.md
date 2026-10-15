# 04 — Disciplinas

Fonte: `data/magias.js` (array `DISCIPLINAS`, linhas 62-90) e `racasCatalogo.js` (funções de disciplina, linhas 258-333). O código só tem HOJE uma família de disciplinas: as de magia (Ofício Mágico + Magia Inata). **Artes Marciais, Maestria de Armas e Engenharia e Alquimia — citadas no pedido do Pedro como famílias a documentar — não existem como catálogo próprio no código atual**; a única referência a elas é textual, dentro da secundária "Vaga de Disciplina" do Humano (`catalogo-racas.json` linha 75: "Escola de Magia, Artes Marciais, Maestria de Armas ou Engenharia e Alquimia"), que não tem nenhuma lista de opções codificada — é só a descrição da habilidade, sem um catálogo real por trás pra essas 3 famílias "físicas". ("Disciplina única", também citada no pedido, **não é uma família de disciplina** — ver esclarecimento abaixo.)

## Como funciona uma disciplina (mecanismo genérico)

- Até **3 slots normais** por personagem: `character.disciplinas[]`, array de até 3 `{ disciplinaId, habilidadesAtivas }` ou `null` (`MAX_DISCIPLINAS = 3`, `data/magias.js:99`).
- **+1 slot extra, independente**, só pra Humano com a secundária "Vaga de Disciplina" ativa: `character.disciplinaExtraHumano`, gated por `temEncaixeExtraDeDisciplina` (`racasCatalogo.js:278-282`) — não compete por espaço com os 3 normais.
- `disciplinasDoPersonagem(character)` (`racasCatalogo.js:284-288`) = os normais + o extra (se o slot extra estiver ativo).
- Cada disciplina dá um **bônus base** (fixo) e permite equipar até **3 habilidades ativas** por vez (o resto fica "na reserva" — mas como o jogador adquire a reserva é uma pendência explícita não implementada, ver abaixo).
- Nenhuma disciplina tem "nível" numérico próprio (grau E/D/C/B/A) — o pedido original menciona "como o nível é limitado e como é calculado no código", mas no modelo atual uma disciplina é só "tem" ou "não tem" (não há grau por disciplina); o que varia em grau são as proficiências que o bônus base da disciplina concede (ver abaixo), e essas sim seguem a escada E-A normal com teto C.

## Catálogo de disciplinas hoje (`DISCIPLINAS`, `data/magias.js:62-90`)

| id | Nome | Tipo | Bônus base | Magias/habilidades | Limite ativo |
|---|---|---|---|---|---|
| `oficio-magias-de-guerra` | Ofício Mágico: Magias de guerra | `oficio-magico` | Magias Gerais +1 grau (teto C); Acadêmicos +1 grau (teto C); Tecnologia +1 grau (teto C) — ver `racasCatalogo.js:437-441` | Catálogo de 11 magias (`MAGIAS`, ver doc 05), 2 iniciais | 3 |
| `magia-inata` | Magia Inata | `magia-inata` | +1 MP máximo (`computeMaxMana`, `engine.js:482`); +1d10 fixo em toda rolagem de magia (`diceAtaqueMagico`, `engine.js:661`) | Mesmo catálogo de 11 magias, 2 iniciais | 3 |
| `oficio-encantamentos` | Ofício Mágico: Encantamentos | `oficio-magico` | Nenhum (`vazia: true`) | Nenhuma | — |
| `oficio-alquimia` | Ofício Mágico: Alquimia | `oficio-magico` | Nenhum (`vazia: true`) | Nenhuma | — |
| `oficio-constructo` | Ofício Mágico: Constructo | `oficio-magico` | Nenhum (`vazia: true`) | Nenhuma | — |

As 3 "vazias" ocupam 1 dos slots e **contam como ofício mágico de verdade** pro pool de ataque mágico e recuperação de mana (`contagemOficiosMagicos`, `engine.js:638-648`, conta pelo número de disciplinas tipo `"oficio-magico"`, sem checar `vazia`) — ou seja, um jogador pode escolher "Ofício Mágico: Alquimia" só pra ganhar +1 no pool de magia, sem nenhuma habilidade própria, o que é consistente com o texto de `docs/DISCIPLINAS_MAGIA.md` linha 31 ("Cadastre-os como disciplinas vazias para o jogador poder escolher").

## Limite de disciplinas e como é calculado

- `MAX_DISCIPLINAS = 3` (`data/magias.js:99`) — constante simples, não é "calculada", é fixa.
- `magiasAtivasMax: 3` em cada disciplina com magias (`data/magias.js:69,81`) — também fixo, não escala com grau nem nível de personagem.
- Nada no código impede o jogador de ter, por exemplo, Ofício Mágico: Magias de guerra + Magia Inata + uma disciplina vazia ao mesmo tempo (3 slots preenchidos) — são todas independentes.

## `contagemOficiosMagicos` — como o nível/contagem é calculado

`engine.js:638-648`: soma (nº de disciplinas tipo `oficio-magico` equipadas) + (`oficiosExtras`, de raça/habilidade — Clã Natrus/Corvus/Seasus, +1 cada, `racasCatalogo.js:252-256`). **Magia Inata nunca entra nessa contagem** (`oficiosMagicosDoPersonagem`, `racasCatalogo.js:293-298`, filtra só `tipo === "oficio-magico"`) — consistente com `docs/DISCIPLINAS_MAGIA.md` linha 23 ("NÃO conta como ofício mágico").

## Famílias citadas no pedido que não existem no código hoje

- **Artes Marciais**, **Maestria de Armas**, **Engenharia e Alquimia**: sem catálogo de disciplinas próprio — só mencionadas como opções de texto dentro da secundária "Vaga de Disciplina" do Humano (`catalogo-racas.json` linha 75). Não há `DISCIPLINAS` com `tipo` diferente de `oficio-magico`/`magia-inata` no código; "Ofício Mágico: Alquimia" (vazia) existe, mas é tratada como disciplina MÁGICA (ofício mágico), não como a "Engenharia e Alquimia" física citada no pedido — são conceitos com nome parecido, mas não é a mesma entrada.
- **Escolas de Magia**: citada só dentro do mesmo texto de "Vaga de Disciplina" (`catalogo-racas.json` linha 75) — não tem catálogo próprio separado do Ofício Mágico. Pode ser o mesmo conceito que "Ofício Mágico" (o próprio `DISCIPLINAS` descreve o ofício como "ex-Ofício Mágico/Evocação", comentário em `data/magias.js:30-38`) ou pode ser uma família ainda não escrita — ambíguo no estado atual do código.

## "Disciplina única" — esclarecido pelo Pedro (15/10), não é uma família de disciplina

A revisão original (03-racas.md) não achou o termo em nenhum arquivo do repositório e marcou como "não verificado". **Esclarecimento do Pedro**: "Disciplina única" é o nome que o artefato Sistema Point dá ao PAR de habilidades raciais de cada personagem — tipo principal e subtipo — não a uma família de disciplinas de magia/combate. Ou seja, é só a terminologia do artefato original para o que o código já chama de `habilidadePrincipal`/`habilidadeSecundaria` (`racasCatalogo.js:encontrarPrincipal`/`encontrarSecundaria`, usado em toda a ficha). **Não deve ser criado nada novo no código por esse nome** — o mecanismo já existe e já está implementado; só o nome do artefato era desconhecido desta revisão.

## Pendências já registradas nos próprios docs (não implementar, só registrar — confirmando que seguem pendentes no código)

- Como o jogador adquire magias/habilidades além das iniciais ("a reserva") — `docs/DISCIPLINAS_MAGIA.md` pendência 3, `docs/MUDANCAS_RACAS_E_MAGIA.md` pendência 2. **Confirmado**: a UI deixa equipar livremente até `magiasAtivasMax`, sem nenhum conceito de "reserva" limitada implementado — qualquer magia do catálogo pode ser escolhida a qualquer momento, não só as 2 iniciais.
- Bônus e habilidades de Encantamentos/Alquimia/Constructo — `docs/DISCIPLINAS_MAGIA.md` pendência 4. **Confirmado**: continuam `vazia: true`, sem bônus nem magias.
- Revisão das Habilidades Passivas de Combate que usavam Técnica/Magias Ofensivas — `docs/MUDANCAS_RACAS_E_MAGIA.md` pendência 1. **Confirmado**: `PROC_ABILITIES` continua com `proficienciaLimiar: "manipulacaoManaProf"`/`"magiasOfensivas"` órfãos (ver doc 02) — não revisado, como pedido.
- Novo limite das disciplinas marciais (já que a Técnica saiu) — `docs/MUDANCAS_RACAS_E_MAGIA.md` pendência 3. Não aplicável a verificar: não há "disciplinas marciais" codificadas (ver seção acima).

## Não verificado

"Disciplina única" já foi esclarecido (ver acima). Ainda não confirmei se "Escolas de Magia" é ou não sinônimo de "Ofício Mágico" no vocabulário atual do Pedro — o termo aparece no pedido de revisão, mas não tem definição própria em nenhum arquivo deste repositório. Recomendo perguntar ao Pedro ou checar o vault do Obsidian (fora do alcance desta sessão).
