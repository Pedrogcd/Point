# 02 — Rolagens

Como o código resolve HOJE cada rolagem, com arquivo e linha, e o que contradiz `docs/MUDANCAS_RACAS_E_MAGIA.md` (14/10 — o documento que vale quando ele e o código divergirem de `docs/SISTEMA_MAGIA.md`, por autodeclaração dos próprios docs). (Números de linha de `engine.js`/`racasCatalogo.js` atualizados em 15/10, depois das correções desta mesma data.)

## Regra geral de sucesso

Um dado de 10 faces é sucesso se `dado > limiar` (padrão `LIMIAR_SUCESSO = 5`, ou seja 6+); um 10 natural sempre conta como sucesso (`rollSuccessDice`, `engine.js:550-559`). Contra alvo Blindado, o limiar sobe pra `LIMIAR_BLINDADO = 6` (7+) — ver `limiarAtaque` abaixo. Isso bate com `docs/MUDANCAS_RACAS_E_MAGIA.md` linha 7.

## Acerto (ataque físico)

- **Pool**: `diceAtaqueFisico(attacker, atributoKey, profKey, ajusteDados)` = `GRADE_VALUE[atributo] + GRADE_VALUE[proficiência] + ajusteDados` (mínimo 0) — `engine.js:630-636`. Atributo e proficiência vêm de `BASE_ATTACK_TYPES` (`engine.js:354-422`): sempre Destreza + (Combate Corpo a Corpo ou Armas de Fogo), com `ajusteDados` fixo por arma (ex.: Ataque desarmado +1, Arma branca pesada -1, Mosquete -1, Morteiro -1).
- **Limiar**: `limiarAtaque` (`engine.js:609-614`) — 7+ se o defensor tiver o descritor `blindado`, EXCETO se o ataque for `perfurante` ou o atacante tiver o descritor de personagem `ignora_blindado` (a negação sempre vence — comentário em `engine.js:592-608`).
- **Sortudo do atacante**: `temDescritor(attacker,"sortudo")` OU o próprio ataque/magia ter `"sortudo"` nos descritores OU (só se não for magia) `temDescritor(attacker,"sortudo_fisico")` (`engine.js:755-760`).

## Acerto (ataque mágico)

- **Base mágica**: `diceBaseMagica(manaGasta, custoMagia)` = `2 + extraDeManaMagica` (mana gasta acima do custo, mínimo 0) — `engine.js:616-628`.
- **Pool total**: `diceAtaqueMagico` (`engine.js:650-664`) = Base mágica + (contagem de Ofícios Mágicos **OU** grau de Inteligência, à escolha do jogador a cada conjuração) + `ajusteDados` da magia (ex.: Mísseis Mágicos soma +1) + 1 dado fixo se tiver Magia Inata equipada.
- **`contagemOficiosMagicos`** (`engine.js:638-648`) = nº de disciplinas tipo "ofício-mágico" equipadas (até 3) + "ofícios extras" de raça/habilidade (Clã Natrus/Corvus/Seasus, +1 cada — `racasCatalogo.js:252-256`).
- Isso bate com `docs/MUDANCAS_RACAS_E_MAGIA.md` linha 9, mas **contradiz `docs/SISTEMA_MAGIA.md` linha 39** da versão antiga do documento — já corrigido em 15/10 (ver doc 00, item 2): a versão atual de `docs/SISTEMA_MAGIA.md` já descreve Base mágica + Ofícios/Inteligência, sem citar "Magias Ofensivas".

## Defesa

- **`resolveRolagemDefesa`** (`engine.js:680-698`): SEMPRE Resistência Física (`resistFisicaProf`) + o Atributo Geral que o jogador escolher como base da defesa (`defesaAtributo`) — nunca Resistência Mágica (que não existe mais no catálogo). Isso implementa `docs/MUDANCAS_RACAS_E_MAGIA.md` linha 8 ("Contra qualquer ataque o defensor rola apenas Resistência Física"); a versão atual de `docs/SISTEMA_MAGIA.md` (corrigida em 15/10) já bate com isso.
- **Modo manual** (`totalDiceManual`, mesma função): se informado, pula o cálculo por atributo+proficiência e usa o número direto — é o que a aba "Ataque"/"Magia" do painel Teste usa hoje (pedido do Pedro, 14/10 mais tarde: "em vez de perguntar o vigor e atributo de defesa do alvo, apenas dê a opção de quantos dados o jogador defensor rola").
- **Saturante**: -2 dados (mínimo 0) só se `defesaAtributo === "destreza"` **e só no caminho não-manual** — no modo manual (número de dados direto), o desconto de Saturante não é recalculado pela fórmula automática: a UI aplica o desconto ela mesma antes de passar o número final (`point-amaranth-app.jsx`, lógica `ataqueDadosDefesaEfetivos`/toggle "Saturante em efeito", adicionada nesta sessão). Isso é coerente com o comentário em `engine.js:675-679`, que já avisa que o desconto automático "não faz mais sentido sem um atributo de defesa pra checar" no modo manual.
- **Resiste a Magia** (Descendentes de Arcani): se o ataque tiver o descritor `magia` e o defensor tiver `resiste_a_magia`, desconta 1 dado e garante 1 sucesso mínimo (`engine.js:689-696`).

## Dano / Ferimento

- **Sucessos líquidos** = `max(0, sucessos do ataque - sucessos da defesa)` (`resolveAtaque`, `engine.js:763`).
- **`determinarFerimento`** (`engine.js:706-711`): sem sucesso líquido, sem ferimento. Se a magia for marcada `superficial`, o ferimento é sempre superficial. Senão: agravante se sucessos líquidos ≥ Vigor do defensor (grau cheio, E=1..A=5); Letal reduz esse Vigor necessário em 1 (mínimo 1); caso contrário, superficial.
- **`aplicarFerimentos`** (`engine.js:723-736`): agravante remove 1 HP de verdade; superficial só marca um ponto como "quebrado" (contador `hp.superficiais`) — quando todos os pontos de HP já estão quebrados, os próximos ferimentos virão agravantes mesmo que o ataque fosse superficial.
- Bate com `docs/MUDANCAS_RACAS_E_MAGIA.md`/`DISCIPLINAS_MAGIA.md` linha 53. **`docs/SISTEMA_MAGIA.md` não contradiz aqui** (seção "Dano", linhas 9-15, já estava alinhada).

## Resistência Física

Não existe mais uma rolagem de "Resistência Física" separada da Defesa — Resistência Física **é** a proficiência usada dentro de `resolveRolagemDefesa` (ver acima). Não há "Resistência Natural" alguma (removida 14/10, `engine.js:142-147`).

## Blindado

`limiarAtaque` (`engine.js:609-614`): dado de ataque precisa de 7+ contra alvo com `blindado`, salvo Perfurante/`ignora_blindado`. **Não existe mais "Blindado Mágico" separado** — um só descritor cobre ataque físico e mágico (`engine.js:597-601`, `catalogo-racas.json` regra 3). A versão atual de `docs/SISTEMA_MAGIA.md` (corrigida em 15/10) já bate com isso — não lista mais "Blindado Mágico" como descritor separado.

## Descritores

Ponto único de checagem: `temDescritor(entidade, nome)` em `engine.js:585-587` — lê `entidade.descritores` de qualquer coisa (personagem OU ataque/magia). **Corrigido em 15/10**: havia uma segunda função com o mesmo nome e propósito em `racasCatalogo.js` (duplicada, não importada); agora `racasCatalogo.js` importa e reexporta a de `engine.js` (`racasCatalogo.js:5,47-58`) em vez de ter a própria — comportamento idêntico, só sem duplicação. Quem importava `temDescritor` de `racasCatalogo.js` (ex.: `racasCatalogo.test.js`) continua funcionando sem mudar nada.

Descritores ativos no motor hoje: `blindado`, `resiste_a_magia`, `desarmado_letal`, `ignora_blindado`, `sortudo`, `sortudo_fisico` (restrito a ataques não-mágicos), `magia`, `saturante`, `perfurante`, `letal`. Só etiquetas, sem efeito no motor: `veloz`, `em_area` (afeta como o ataque é resolvido — múltiplos defensores — mas não a matemática por alvo), `atrasada_1` (confirmado por `DESCRITOR_INFO` em `point-amaranth-app.jsx:163,171` e pelo guia).

## Mana

- **Custo**: descontado do MP atual ao conjurar (`point-amaranth-app.jsx:5410-5417`).
- **Recuperação**: ao conjurar, rola `contagemOficiosMagicos(character) + manaGasta` dados, sucesso 6+; cada sucesso recupera 1 mana da própria magia (até o gasto), aplicado só depois, no botão "Início de turno" (`point-amaranth-app.jsx:5405-5407, 5582, 5598`). Bate com `docs/MUDANCAS_RACAS_E_MAGIA.md` linha 12 e `docs/DISCIPLINAS_MAGIA.md` linha 57. A versão atual de `docs/SISTEMA_MAGIA.md` (corrigida em 15/10) também já bate com isso — não cita mais "Manipulação de Mana".
- **MP máximo**: `computeMaxMana` (`engine.js:481-485`) = `clamp(1, 6, base + 1 se Magia Inata)`. **Nenhuma outra fonte de bônus de MP é somada aqui** — ver a observação grande no resumo (doc 00, item sobre HP/MP/SP de raça não implementados, ainda pendente de decisão do Pedro).

## Tudo que ainda assume 3d10 ou a proficiência Defesa

- **3d10**: os únicos lugares que mencionam "3d10" hoje estão em `point-amaranth-app.jsx`, dentro de blocos de texto explicitamente marcados como referência histórica, não como regra em vigor:
  - `CORE_RULES.testeBasico` (`point-amaranth-app.jsx:260`): "todo teste usa 3d10, onde >5 é sucesso" — texto antigo.
  - `CORE_RULES.ajusteEmUso` (`point-amaranth-app.jsx:261`): descreve o modelo de Acerto (3d10) + Confirmação por sucesso, armadura como escudo de uso único, etc. — a própria string termina avisando "o sistema mudou bastante desde então".
  - `CORE_RULES.acao` (`point-amaranth-app.jsx:273`): "Texto original (docx): Acerto rola 3d10...".
  - `STATUS_EFFECTS` entrada "CARGA" (`point-amaranth-app.jsx:224-226`): ainda descreve "3d10 (sucesso >5)" como teste da habilidade de status CARGA — este é o único "3d10" que não está claramente rotulado como histórico; se a habilidade CARGA (efeito de status, não ligada ao acerto/defesa principal) ainda estiver em uso narrativo, ela usa uma rolagem de 3 dados independente das regras de combate atuais, e não foi atualizada junto com o resto.
  - Nenhuma fórmula em `engine.js` usa um número fixo de 3 dados — o pool sempre varia por grau/ajuste.
- **Proficiência "Defesa" (`defesaProf`)**: ver doc 01 — não é lida em `resolveAtaque`/`resolveRolagemDefesa`; só aparece no painel decorativo `STAT_LIST`/`STAT_PROF_LINK` (`engine.js:530, 538-540`, renderizado em `point-amaranth-app.jsx:4646, 6878`).

## Decisões do Pedro (15/10)

- **Crítico (10 natural)**: Pedro decidiu em 15/10 que o 10 natural fica como está por ora — conta só como sucesso automático em `rollSuccessDice`, sem efeito mecânico extra (sem o +1 bônus do texto histórico `CORE_RULES`). Pode ganhar efeito próprio no futuro, mas isso não foi implementado nesta rodada. Deixa de ser uma pendência "a confirmar" e passa a ser um "por ora não" — não é mais algo esquecido, é decisão tomada.
