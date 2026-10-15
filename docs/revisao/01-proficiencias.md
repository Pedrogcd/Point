# 01 — Proficiências

Fiel ao código em `engine.js` (lista `PROFICIENCIAS_LIST`, linhas 90-121) e `racasCatalogo.js`/`catalogo-racas.json` em 15/10/2026. Não alterei nada — este arquivo só descreve o que já existe.

## Graus e como viram dado/bônus

`GRADE_VALUE` (`engine.js:23`): `F=0, E=1, D=2, C=3, B=4, A=5`. `GRADE_ORDER` (`engine.js:24`): `["F","E","D","C","B","A"]`.

Existem **dois** jeitos de usar o grau no código, pra coisas diferentes:

1. **Pool de dados (modelo atual, o que o jogo realmente rola hoje).** O grau entra direto como número de dados — `GRADE_VALUE[grau] ?? 1` — sem nenhum "bônus" somado: grau E = 1 dado, D = 2, C = 3, B = 4, A = 5, F = 0 dados (abaixo de E; representa uma fraqueza grave). É assim que `diceAtaqueFisico` (`engine.js:627-630`), `resolveRolagemDefesa` (`engine.js:674-692`) e a parte de Inteligência de `diceAtaqueMagico` (`engine.js:651-658`) leem atributo e proficiência. **Importante:** o código usa sempre `?? 1` (nullish coalescing), nunca `|| 1`, porque F vale `0`, que em JS é "falsy" — se alguém usasse `|| 1` em vez de `?? 1`, um F acabaria contando como E (bug já evitado de propósito, comentário em `engine.js:12-22`).
2. **Bônus plano antigo (`attrBonus`, `engine.js:445-449`).** `Math.max(0, (GRADE_VALUE[grau] ?? 1) - 1)`: E=0, D=1, C=2, B=3, A=4 (F também cai em 0). Esse modelo só é usado hoje pelos painéis **decorativos** que sobraram do sistema antigo: `STAT_LIST`/`computeStat` (Defesa/Resistência Armadura/Geral, `engine.js:147-164, 526-535`) e `ACERTOS_POR_TIPO`/`computeAcertoTipo` (resumo "Corpo a corpo"/"Arma de fogo", `engine.js:183-192`). Nenhum dos dois alimenta `resolveAtaque` — são só exibição (comentários explícitos em `engine.js:171-182` e `136-146`).

Teto para jogadores (bônus racial): grau C, salvo exceções específicas com `teto: "A"` (Goethiano em Vigor, Pele Grossa em Resistência Física — `racasCatalogo.js:145, 172-174`).

## Atributos Gerais (`ATRIBUTOS_GERAIS_LIST`, `engine.js:38-48`)

Adaptados de Vampiro: A Máscara (V5). Todos começam em "E" (`ATRIBUTOS_GERAIS_DEFAULT`, `engine.js:50-54`).

| Categoria | Atributos |
|---|---|
| Física | Força, Destreza, Vigor |
| Social | Carisma, Manipulação, Compostura |
| Mental | Inteligência, Perspicácia, Resolução |

Uso mecânico real hoje:
- **Força**: só testes narrativos/fora de combate hoje (nenhuma fórmula de `resolveAtaque` soma Força diretamente; os ataques marciais somam Destreza — ver doc 02).
- **Destreza**: base de todo ataque físico (`BASE_ATTACK_TYPES`, `atributoKey: "destreza"` em todas as entradas, `engine.js:350-416`) e opção de base da defesa escolhida pelo jogador (`resolveRolagemDefesa`, parâmetro `defesaAtributo`).
- **Vigor**: define o HP máximo (`computeMaxHP`, `engine.js:456-459`, fórmula `2 + attrBonus(vigor) + bônus de Persistente`) e o "Vigor grau cheio" usado pra decidir ferimento agravante vs. superficial (`determinarFerimento`, `engine.js:700-705`, lê `GRADE_VALUE` cheio, não `attrBonus`).
- **Inteligência**: opção alternativa aos Ofícios Mágicos no pool de ataque mágico, à escolha do jogador (`diceAtaqueMagico`, `engine.js:651-658`).
- **Carisma, Manipulação, Compostura, Perspicácia, Resolução**: sem função mecânica no motor hoje — só recebem bônus de grau de certas habilidades raciais (ver doc 03) e servem pra testes narrativos/sociais fora de combate.

## Proficiências (`PROFICIENCIAS_LIST`, `engine.js:90-121`) — 24 entradas atuais

### Combate (4)

| Chave | Rótulo | Onde é usada hoje |
|---|---|---|
| `armasDeFogo` | Armas de Fogo | `diceAtaqueFisico` para Mosquete/Revólver/Morteiro pesado (`BASE_ATTACK_TYPES`, `engine.js:384,395,406`) |
| `combateCorpoACorpo` | Combate Corpo a Corpo | `diceAtaqueFisico` para Ataque desarmado/Arma branca/Arma branca pesada (`engine.js:350,362,373`) |
| `defesaProf` | Defesa | **Não é lida em nenhuma fórmula de ataque/defesa.** Só existe no painel decorativo antigo via `STAT_PROF_LINK = { defesa: "defesaProf" }` (`engine.js:524`), que soma nela pro stat "Defesa" do `STAT_LIST` — stat que o próprio código documenta como não consultado por `resolveAtaque` (ver doc 02). Hoje é puramente de exibição, sem efeito na rolagem real. |
| `resistFisicaProf` | Resistência Física | **A única proficiência de combate realmente lida pelo motor novo**: toda defesa, contra ataque físico OU mágico, soma `GRADE_VALUE[resistFisicaProf]` (`resolveRolagemDefesa`, `engine.js:675,680`) |

### Física, não-combate (5)

Atletismo, Ofício, Condução, Roubo, Furtividade, Sobrevivência — nenhuma tem fórmula no motor; servem pra testes genéricos (painel Teste) e recebem bônus de grau de habilidades raciais específicas (ver doc 03).

### Social (7)

Etiqueta, Intuição, Intimidação, Liderança, Atuação, Persuasão, Malandragem — mesma situação: sem fórmula de combate, usadas no painel Teste e como alvo de bônus raciais.

### Mental (7)

Acadêmicos, Percepção, Finanças, Investigação, Medicina, Religião, Magias Gerais, Política, Tecnologia — sem fórmula de combate. **Magias Gerais, Acadêmicos e Tecnologia** são as três que recebem +1 grau (teto C) de quem tem a disciplina "Ofício Mágico: Magias de guerra" equipada (`racasCatalogo.js:420-424` — ponto confirmado pelo Pedro em 14/10, pendência 2 de `docs/DISCIPLINAS_MAGIA.md` já resolvida).

*(Nota: a contagem "24" corresponde às entradas realmente listadas no array hoje — combate 4 + física 5 + social 7 + mental 8 = 24; o pedido original mencionava "26 entradas" em uma versão anterior da sessão, mas a lista atual em `engine.js:90-121` tem exatamente 24 chaves.)*

## Proficiências removidas/renomeadas (não aparecem mais na ficha, mas podem existir em dados salvos)

- **`briga`** → migra automaticamente para `combateCorpoACorpo` (`migrateBrigaProfKey`, `engine.js:537-542`; removida em 21/09).
- **`ciencia`, `subterfugio`, `empatiaAnimal`** → removidas do catálogo em 08/10 por não terem função mecânica. Fichas antigas que tinham grau salvo nessas chaves mantêm o dado (não é apagado), só não aparece mais na ficha (`engine.js:122-127`).
- **`ocultismo`** → virou `religiao` no mesmo dia (mesma regra de preservação do dado antigo, `engine.js:129-132`).
- **`tecnicaProf`/"Técnica"** → renomeada para `manipulacaoManaProf`/"Manipulação de Mana" em 14/10, e **depois, no mesmo dia**, removida de vez do catálogo junto com `magiasOfensivas` ("Magias Ofensivas") e `resistMagicaProf` ("Resistência Mágica") — a recuperação de mana passou a usar a contagem de Ofícios Mágicos em vez de uma proficiência fixa (`engine.js:65-89`, comentário extenso). **Essas três chaves continuam escritas em código hoje**, mas como referências mortas: `PROC_ABILITIES` ainda cita `manipulacaoManaProf` (golpe_certeiro, fortaleza_viva, reflexo_agil, `engine.js:223,231,248`) e `magiasOfensivas` (surto_arcano, toque_flamejante, `engine.js:239,290`) como `proficienciaLimiar` — mas como as próprias Habilidades Passivas de Combate estão órfãs (ver doc 02), isso nunca é avaliado em jogo. Também aparecem em dados de personagens pré-existentes em `point-amaranth-app.jsx` (fichas-semente antigas) com grau salvo nessas chaves — não migradas, só ignoradas pela ficha atual.

## Não verificado

Não encontrei no repositório nenhum arquivo chamado "F" com regra própria além do que está documentado em `GRADE_VALUE`/`GRADE_ORDER` — se existir uma nota específica do grau F no vault do Obsidian do Pedro, não tive acesso a ela nesta revisão (vault local, fora do alcance desta sessão).
