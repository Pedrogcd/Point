# 02 — Rolagens

Como o código resolve HOJE cada rolagem, com arquivo e linha, e o que contradiz `docs/MUDANCAS_RACAS_E_MAGIA.md` (14/10 — o documento que vale quando ele e o código divergirem de `docs/SISTEMA_MAGIA.md`, por autodeclaração dos próprios docs).

## Regra geral de sucesso

Um dado de 10 faces é sucesso se `dado > limiar` (padrão `LIMIAR_SUCESSO = 5`, ou seja 6+); um 10 natural sempre conta como sucesso (`rollSuccessDice`, `engine.js:544-553`). Contra alvo Blindado, o limiar sobe pra `LIMIAR_BLINDADO = 6` (7+) — ver `limiarAtaque` abaixo. Isso bate com `docs/MUDANCAS_RACAS_E_MAGIA.md` linha 7.

## Acerto (ataque físico)

- **Pool**: `diceAtaqueFisico(attacker, atributoKey, profKey, ajusteDados)` = `GRADE_VALUE[atributo] + GRADE_VALUE[proficiência] + ajusteDados` (mínimo 0) — `engine.js:624-630`. Atributo e proficiência vêm de `BASE_ATTACK_TYPES` (`engine.js:348-416`): sempre Destreza + (Combate Corpo a Corpo ou Armas de Fogo), com `ajusteDados` fixo por arma (ex.: Ataque desarmado +1, Arma branca pesada -1, Mosquete -1, Morteiro -1).
- **Limiar**: `limiarAtaque` (`engine.js:603-608`) — 7+ se o defensor tiver o descritor `blindado`, EXCETO se o ataque for `perfurante` ou o atacante tiver o descritor de personagem `ignora_blindado` (a negação sempre vence — comentário em `engine.js:586-602`).
- **Sortudo do atacante**: `temDescritor(attacker,"sortudo")` OU o próprio ataque/magia ter `"sortudo"` nos descritores OU (só se não for magia) `temDescritor(attacker,"sortudo_fisico")` (`engine.js:749-754`).

## Acerto (ataque mágico)

- **Base mágica**: `diceBaseMagica(manaGasta, custoMagia)` = `2 + extraDeManaMagica` (mana gasta acima do custo, mínimo 0) — `engine.js:610-622`.
- **Pool total**: `diceAtaqueMagico` (`engine.js:644-658`) = Base mágica + (contagem de Ofícios Mágicos **OU** grau de Inteligência, à escolha do jogador a cada conjuração) + `ajusteDados` da magia (ex.: Mísseis Mágicos soma +1) + 1 dado fixo se tiver Magia Inata equipada.
- **`contagemOficiosMagicos`** (`engine.js:632-642`) = nº de disciplinas tipo "ofício-mágico" equipadas (até 3) + "ofícios extras" de raça/habilidade (Clã Natrus/Corvus/Seasus, +1 cada — `racasCatalogo.js:235-239`).
- Isso bate com `docs/MUDANCAS_RACAS_E_MAGIA.md` linha 9, mas **contradiz `docs/SISTEMA_MAGIA.md` linha 39** ("Todo ataque mágico: Base mágica + Magias Ofensivas"), que descreve a proficiência Magias Ofensivas, já removida do catálogo.

## Defesa

- **`resolveRolagemDefesa`** (`engine.js:674-692`): SEMPRE Resistência Física (`resistFisicaProf`) + o Atributo Geral que o jogador escolher como base da defesa (`defesaAtributo`) — nunca Resistência Mágica (que não existe mais no catálogo). Isso implementa `docs/MUDANCAS_RACAS_E_MAGIA.md` linha 8 ("Contra qualquer ataque o defensor rola apenas Resistência Física") e **contradiz `docs/SISTEMA_MAGIA.md` linha 18** ("Contra ataque mágico: Resistência Mágica" — proficiência extinta).
- **Modo manual** (`totalDiceManual`, mesma função): se informado, pula o cálculo por atributo+proficiência e usa o número direto — é o que a aba "Ataque"/"Magia" do painel Teste usa hoje (pedido do Pedro, 14/10 mais tarde: "em vez de perguntar o vigor e atributo de defesa do alvo, apenas dê a opção de quantos dados o jogador defensor rola").
- **Saturante**: -2 dados (mínimo 0) só se `defesaAtributo === "destreza"` **e só no caminho não-manual** — no modo manual (número de dados direto), o desconto de Saturante não é recalculado pela fórmula automática: a UI aplica o desconto ela mesma antes de passar o número final (`point-amaranth-app.jsx`, lógica `ataqueDadosDefesaEfetivos`/toggle "Saturante em efeito", adicionada nesta sessão). Isso é coerente com o comentário em `engine.js:669-673`, que já avisa que o desconto automático "não faz mais sentido sem um atributo de defesa pra checar" no modo manual.
- **Resiste a Magia** (Descendentes de Arcani): se o ataque tiver o descritor `magia` e o defensor tiver `resiste_a_magia`, desconta 1 dado e garante 1 sucesso mínimo (`engine.js:683-690`).

## Dano / Ferimento

- **Sucessos líquidos** = `max(0, sucessos do ataque - sucessos da defesa)` (`resolveAtaque`, `engine.js:757`).
- **`determinarFerimento`** (`engine.js:700-705`): sem sucesso líquido, sem ferimento. Se a magia for marcada `superficial`, o ferimento é sempre superficial. Senão: agravante se sucessos líquidos ≥ Vigor do defensor (grau cheio, E=1..A=5); Letal reduz esse Vigor necessário em 1 (mínimo 1); caso contrário, superficial.
- **`aplicarFerimentos`** (`engine.js:717-730`): agravante remove 1 HP de verdade; superficial só marca um ponto como "quebrado" (contador `hp.superficiais`) — quando todos os pontos de HP já estão quebrados, os próximos ferimentos virão agravantes mesmo que o ataque fosse superficial.
- Bate com `docs/MUDANCAS_RACAS_E_MAGIA.md`/`DISCIPLINAS_MAGIA.md` linha 53. **`docs/SISTEMA_MAGIA.md` não contradiz aqui** (seção "Dano", linhas 9-15, já estava alinhada).

## Resistência Física

Não existe mais uma rolagem de "Resistência Física" separada da Defesa — Resistência Física **é** a proficiência usada dentro de `resolveRolagemDefesa` (ver acima). Não há "Resistência Natural" alguma (removida 14/10, `engine.js:136-141`).

## Blindado

`limiarAtaque` (`engine.js:603-608`): dado de ataque precisa de 7+ contra alvo com `blindado`, salvo Perfurante/`ignora_blindado`. **Não existe mais "Blindado Mágico" separado** — um só descritor cobre ataque físico e mágico (`engine.js:591-595`, `catalogo-racas.json` regra 3). Isso **contradiz `docs/SISTEMA_MAGIA.md` linhas 22-24**, que ainda lista "Blindado Mágico" como descritor de personagem separado.

## Descritores

Ponto único de checagem: `temDescritor(entidade, nome)` em `engine.js:579-581` — lê `entidade.descritores` de qualquer coisa (personagem OU ataque/magia). **Existe uma segunda função com o mesmo nome e propósito em `racasCatalogo.js:54-56`** (`temDescritor(character, id)`, lê `character.descritores`) — duplicação entre os dois arquivos; não quebra nada hoje porque cada uma é chamada no contexto certo, mas é uma inconsistência de organização (duas fontes de verdade pro mesmo conceito).

Descritores ativos no motor hoje: `blindado`, `resiste_a_magia`, `desarmado_letal`, `ignora_blindado`, `sortudo`, `sortudo_fisico` (restrito a ataques não-mágicos), `magia`, `saturante`, `perfurante`, `letal`. Só etiquetas, sem efeito no motor: `veloz`, `em_area` (afeta como o ataque é resolvido — múltiplos defensores — mas não a matemática por alvo), `atrasada_1` (confirmado por `DESCRITOR_INFO` em `point-amaranth-app.jsx:163,171` e pelo guia).

## Mana

- **Custo**: descontado do MP atual ao conjurar (`point-amaranth-app.jsx:5410-5417`).
- **Recuperação**: ao conjurar, rola `contagemOficiosMagicos(character) + manaGasta` dados, sucesso 6+; cada sucesso recupera 1 mana da própria magia (até o gasto), aplicado só depois, no botão "Início de turno" (`point-amaranth-app.jsx:5405-5407, 5582, 5598`). Bate com `docs/MUDANCAS_RACAS_E_MAGIA.md` linha 12 e `docs/DISCIPLINAS_MAGIA.md` linha 57.
- **`docs/SISTEMA_MAGIA.md` linha 35 contradiz isso**: ainda descreve a recuperação usando "Manipulação de Mana" (proficiência extinta) em vez da contagem de Ofícios Mágicos.
- **MP máximo**: `computeMaxMana` (`engine.js:475-479`) = `clamp(1, 6, base + 1 se Magia Inata)`. **Nenhuma outra fonte de bônus de MP é somada aqui** — ver a observação grande no resumo (doc 00, item sobre HP/MP/SP de raça não implementados).

## Tudo que ainda assume 3d10 ou a proficiência Defesa

- **3d10**: os únicos lugares que mencionam "3d10" hoje estão em `point-amaranth-app.jsx`, dentro de blocos de texto explicitamente marcados como referência histórica, não como regra em vigor:
  - `CORE_RULES.testeBasico` (`point-amaranth-app.jsx:260`): "todo teste usa 3d10, onde >5 é sucesso" — texto antigo.
  - `CORE_RULES.ajusteEmUso` (`point-amaranth-app.jsx:261`): descreve o modelo de Acerto (3d10) + Confirmação por sucesso, armadura como escudo de uso único, etc. — a própria string termina avisando "o sistema mudou bastante desde então".
  - `CORE_RULES.acao` (`point-amaranth-app.jsx:273`): "Texto original (docx): Acerto rola 3d10...".
  - `STATUS_EFFECTS` entrada "CARGA" (`point-amaranth-app.jsx:224-226`): still describes "3d10 (sucesso >5)" como teste da habilidade de status CARGA — este é o único "3d10" que não está claramente rotulado como histórico; se a habilidade CARGA (efeito de status, não ligada ao acerto/defesa principal) ainda estiver em uso narrativo, ela usa uma rolagem de 3 dados independente das regras de combate atuais, e não foi atualizada junto com o resto.
  - Nenhuma fórmula em `engine.js` usa um número fixo de 3 dados — o pool sempre varia por grau/ajuste.
- **Proficiência "Defesa" (`defesaProf`)**: ver doc 01 — não é lida em `resolveAtaque`/`resolveRolagemDefesa`; só aparece no painel decorativo `STAT_LIST`/`STAT_PROF_LINK` (`engine.js:524, 532-534`, renderizado em `point-amaranth-app.jsx:4646, 6878`).

## Não verificado

Não encontrei um "10 natural = crítico" com efeito mecânico implementado — `rollSuccessDice` conta 10 natural como sucesso automático, mas o guia marca "o 10 natural fica como crítico (a confirmar)" (`docs/SISTEMA_MAGIA.md` linha 6) e não encontrei nenhuma lógica extra de crítico no motor novo (o conceito de crítico com +1 bônus é só do texto histórico `CORE_RULES`). Não dá pra confirmar se isso é intencional (crítico "virou" apenas contar como sucesso garantido) ou uma pendência esquecida — fica para o Pedro decidir.
