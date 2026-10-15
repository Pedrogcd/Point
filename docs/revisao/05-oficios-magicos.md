# 05 — Ofícios Mágicos

Fonte: `data/magias.js` (lido integralmente) e `engine.js` (funções de pool/recuperação de mana). Esta é a fatia de conteúdo mais nova do app (reescrita em 14/10) e a mais alinhada entre código e `docs/MUDANCAS_RACAS_E_MAGIA.md`/`docs/DISCIPLINAS_MAGIA.md`.

## Ofícios mágicos que existem hoje no código

Só **5 disciplinas** de magia existem (`DISCIPLINAS`, `data/magias.js:62-90`):

1. **Ofício Mágico: Magias de guerra** (`oficio-magias-de-guerra`) — o único ofício com conteúdo completo. Ex-"Ofício Mágico"/"Evocação". Dá:
   - +1 grau (teto C) em **Magias Gerais**, **Acadêmicos** e **Tecnologia** (`racasCatalogo.js:420-424`).
   - Acesso a "tela de mana" (`temTelaDeMana: true`) e troca grátis de magia equipada gastando uma ação (`trocaGratisComAcao: true`) — ambos são só flags de dados hoje; não encontrei lógica de UI específica de "tela de mana" nem um sistema de ações que consuma a troca grátis (o app não modela ações/turnos — comentário explícito em `data/magias.js:59-60`).
   - 2 magias iniciais, até 3 ativas.
2. **Magia Inata** (`magia-inata`) — não conta como ofício mágico. Dá +1 MP máximo e +1d10 fixo em toda rolagem de magia. 2 iniciais, até 3 ativas.
3. **Ofício Mágico: Encantamentos** (`oficio-encantamentos`) — vazia, sem bônus nem magias.
4. **Ofício Mágico: Alquimia** (`oficio-alquimia`) — vazia, idem.
5. **Ofício Mágico: Constructo** (`oficio-constructo`) — vazia, idem.

Não existe nenhum "Ofício Mágico: Encantamentos" ou "Construto" com conteúdo — são placeholders puros.

## Magia Inata — detalhe

Diferente de um ofício mágico, mas usa o MESMO catálogo de magias (`MAGIAS`) para equipar. Bônus: `computeMaxMana` soma +1 se `disciplinaMagica.magiaInata` (`engine.js:476`); `diceAtaqueMagico` soma +1 dado fixo pelo mesmo flag (`engine.js:655`). `temMagiaInataDoPersonagem` (`racasCatalogo.js:283-285`) checa se algum slot de disciplina tem `disciplinaId === "magia-inata"`.

## Catálogo de magias (`MAGIAS`, `data/magias.js:101-222`) — 12 entradas

| id | Nome | Descritores | Custo MP | Ajuste dados | Feridas | Observação |
|---|---|---|---|---|---|---|
| `bombardeio_de_mana` | Bombardeio de Mana | magia, em_area, saturante | 2 | 0 | 1 | — |
| `escudo_de_mana` | Escudo de Mana | magia | 1 (+1 por aliado estendido) | — | — | `semRolagem: true` — não rola; dá Blindado por uma cena ao conjurador (e a 1 aliado, gastando +1 MP extra) |
| `shin` | Shin | magia, em_area, saturante | 1 | 0 | 1 | `superficial: true` |
| `misseis_magicos` | Mísseis Mágicos | magia, saturante, sortudo | 1 | **+1** | 1 | `superficial: true` — é a exceção citada no guia ("Mísseis Mágicos somam +1 dado") |
| `laser_magico` | Laser Mágico | magia, perfurante | 2 | 0 | 1 | — |
| `torrente_magica` | Torrente Mágica | magia, letal | 3 | 0 | 2 | — |
| `tiro_magico` | Tiro Mágico | magia | 1 | 0 | 1 | — |
| `shin_kay` | Shin-kay | magia, letal | 2 | 0 | 1 | — |
| `magia_de_guerra_suth` | Magia de guerra Suth | magia, saturante, sortudo, atrasada_1 | 2 | 0 | 1 | "atrasada_1" é só etiqueta |
| `magia_de_guerra_maxis` | Magia de guerra Maxis | magia, em_area | 2 | 0 | 2 | `superficial: true` |
| `magia_de_guerra_katalao` | Magia de guerra Katalão | magia, perfurante, sortudo, letal | 3 | 0 | 1 | — |
| `sensor` | Sensor | magia | `null` (a definir) | — | — | `placeholder: true` — sem pool/custo definidos no guia; efeito "marca até 5 pessoas numa rede de visão e comunicação compartilhada", sem mecânica de jogo |

Bate exatamente com `docs/DISCIPLINAS_MAGIA.md` linhas 37-49 e `docs/MUDANCAS_RACAS_E_MAGIA.md` linhas 29-40 — **não encontrei divergência entre o catálogo e os dois guias mais recentes** nesta área (a única divergência é com `docs/SISTEMA_MAGIA.md`, mais antigo e já marcado como substituído — ver doc 02, que cobre isso).

Todas as magias, exceto Escudo de Mana (sem rolagem) e Sensor (placeholder), são resolvidas por `resolveAtaque` (as sem `emArea`) ou `resolveAtaqueEmArea` (`bombardeio_de_mana`, `shin`, `magia_de_guerra_maxis`, as três com `emArea: true`).

## Pool do ataque mágico

`diceAtaqueMagico(attacker, manaGasta, custoMagia, fonte, ajusteDados)` — `engine.js:644-658`:

```
Base mágica        = 2 + max(0, manaGasta - custoMagia)        [diceBaseMagica/extraDeManaMagica, engine.js:610-622]
contribuição        = contagemOficiosMagicos(attacker)          [se fonte === "oficios", padrão]
                     OU GRADE_VALUE[grau de Inteligência]        [se fonte === "inteligencia", escolha do jogador]
bônus Magia Inata   = +1 se disciplinaMagica.magiaInata
ajuste da magia     = ajusteDados da magia (ex.: +1 em Mísseis Mágicos)
TOTAL = max(0, Base mágica + contribuição + bônus Magia Inata + ajuste da magia)
```

`contagemOficiosMagicos(character)` (`engine.js:632-642`) = nº de disciplinas tipo `oficio-magico` equipadas (até 3, incluindo as vazias) + `oficiosExtras` (Clã Natrus/Corvus/Seasus, +1 cada — `racasCatalogo.js:235-239`, somado dentro de `comGrausEfetivos`).

## Recuperação de mana

Ao conjurar (`point-amaranth-app.jsx:5405`): rola `contagemOficiosMagicos(characterEfetivo) + manaGasta` dados, sucesso 6+ (`rollSuccessDice`, `LIMIAR_SUCESSO`). `manaRecuperada = min(sucessos, manaGasta)` (`point-amaranth-app.jsx:5406`) — nunca recupera mais do que foi gasto naquela conjuração. O valor fica pendente (`mp.recuperarPendente`) até o jogador clicar "Início de turno" (`point-amaranth-app.jsx:5582, 5598`), que soma o pendente ao MP atual. Bate com `docs/DISCIPLINAS_MAGIA.md` linha 57 e `docs/MUDANCAS_RACAS_E_MAGIA.md` linha 12.

## MP máximo e faixa de mana

`MANA_MIN = 1`, `MANA_MAX = 6` (`engine.js:473-474`). `computeMaxMana` = `clamp(1, 6, base + 1 se Magia Inata)` (`engine.js:475-479`) — "base" vem de `character.mp.max` (default 3), não de um valor fixo por raça. Bate com `docs/SISTEMA_MAGIA.md` linha 33 ("Cada pessoa tem de 1 a 6 de mana") e `docs/MUDANCAS_RACAS_E_MAGIA.md` linha 14 ("Toda a mana volta no fim da cena" — não encontrei um botão "Fim de cena" com essa lógica localizado nesta revisão; só confirmei o "Início de turno", ver abaixo em "Não verificado").

## Confirmações adicionais (botão "Fim de cena" e "Tela de mana")

- **"Fim de cena"** existe de fato: botão em `point-amaranth-app.jsx:5600-5602`, função `fimDeCena` (`point-amaranth-app.jsx:5429-5434`) — zera `recuperarPendente` e repõe `mp.current` para o máximo. Bate com "toda a mana volta no fim da cena" (`docs/MUDANCAS_RACAS_E_MAGIA.md` linha 14). **Detalhe que o guia não menciona**: esse botão só restaura MP, não SP — existe um botão separado "Restaurar MP e SP" (`point-amaranth-app.jsx:5587-5595`) que restaura os dois ao mesmo tempo; "Fim de cena" e "Restaurar MP e SP" fazem quase a mesma coisa pro MP, mas só o segundo também repõe o SP.
- **"Tela de mana"** (`temTelaDeMana`) é só um texto informativo na ficha (`point-amaranth-app.jsx:5062-5066`): "acesso extra que permite analisar magias (...) sem mecânica numérica definida no guia ainda" — a própria UI admite que não tem mecânica implementada, confirmando o que o guia já dizia.

## Não verificado

Fora os dois pontos confirmados acima, não identifiquei outras lacunas específicas nesta área — o catálogo de magias e o cálculo do pool mágico/recuperação de mana estão bem alinhados com `docs/MUDANCAS_RACAS_E_MAGIA.md` e `docs/DISCIPLINAS_MAGIA.md`.
