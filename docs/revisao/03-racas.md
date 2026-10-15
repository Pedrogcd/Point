# 03 — Raças

Fonte: `catalogo-racas.json` (versão "2026-10-14", lido integralmente em 15/10/2026) cruzado com `racasCatalogo.js` (bônus de grau/descritores realmente aplicados). Para cada raça: tipo principal, subtipo (secundária), texto da habilidade e o que o código de fato faz com ela.

**Achado geral, antes de entrar raça por raça**: `computeMaxHP` (`engine.js:462-465`), `computeMaxSP` (`engine.js:467-471`) e `computeMaxMana` (`engine.js:481-485`) só somam: Vigor (HP), a habilidade "Persistente" (HP e SP, +1 cada) e a flag Magia Inata (MP, +1). **Nenhuma delas lê bônus de raça.** Isso significa que TODO texto do catálogo dizendo "+1 HP máximo", "+1 MP máximo" ou "+1 SP máximo" por uma habilidade principal/secundária é **só descritivo — não tem efeito mecânico hoje**. Marco isso como "(texto apenas, sem efeito)" abaixo em cada ocorrência, em vez de repetir a explicação.

## Humano

Fixo: escolhe um tipo de mana (principal). `secundariaNome`: "Vaga de Disciplina" — a secundária do Humano É uma disciplina (`secundariaEhDisciplina: true`), tratada à parte (ver doc 04, "4º slot de disciplina").

Bônus de raça (não de habilidade específica): `BONUS_GRAU_ESCOLHA_POR_RACA.humano` (`racasCatalogo.js:230-233`) — +1 grau (teto C) numa proficiência não-combate à escolha do jogador, pra QUALQUER humano, independente da principal/secundária escolhida. Confere com `catalogo-racas.json` linha 61 ("Todo tipo de humano ganha +1 grau...").

### Principais

| Habilidade | Texto do catálogo | Efeito codificado |
|---|---|---|
| Mana Concentrada | +1 SP máximo e +1 grau em proficiência à escolha (teto C) | SP: texto apenas, sem efeito. Grau: `BONUS_GRAU_ESCOLHA_POR_HABILIDADE["mana-concentrada"]` (`racasCatalogo.js:218`) — escolha salva em `character.bonusGrauEscolha["mana-concentrada"]`, teto C implícito (default) |
| Mana Fluida | +1 MP máximo | Texto apenas, sem efeito (não está em nenhuma tabela de bônus) |
| Mana Estática | +1 grau em Resistência Física (teto C) | `BONUS_GRAU_POR_HABILIDADE["mana-estatica"]` (`racasCatalogo.js:171-173`) — implementado, com teto C |

### Secundárias

| Habilidade | Texto | Efeito codificado |
|---|---|---|
| Vaga de Disciplina | Disciplina no lugar da secundária | Ver doc 04 |
| Homúnculo | +1 HP, +1 grau Força-ou-Destreza (teto C), +1 grau Atletismo | HP: texto apenas. Força/Destreza: `BONUS_GRAU_ESCOLHA_POR_HABILIDADE.homunculo` (`racasCatalogo.js:219`). Atletismo: `BONUS_GRAU_POR_HABILIDADE.homunculo` (`racasCatalogo.js:148`) |
| Goethiano | +1 grau Vigor (até A, sem teto C), descritor Blindado | Vigor: `BONUS_GRAU_POR_HABILIDADE.goethiano`, `teto: "A"` (`racasCatalogo.js:147`). Blindado: descritor no catálogo (`catalogo-racas.json` linha 107-109), lido por `limiarAtaque` via `descritoresDeSelecao`/`character.descritores` — implementado de ponta a ponta |

## Niosh

**Fixos de raça** (`catalogo-racas.json` linhas 121-124): "+1 HP máximo para toda a raça (hoje sem campo no motor)" — o próprio JSON já avisa que não há campo pra isso; confirmado, é texto apenas. "+1 grau em Força para toda a raça, teto C" — **este sim está implementado**: `BONUS_GRAU_FIXO_POR_RACA.niosh` (`racasCatalogo.js:244-246`), aplicado independente de qual principal/secundária o jogador escolher (mudança desta sessão, pedido do Pedro).

Fraqueza: "Não usam armadura pesada nem mágica" — só texto, sem checagem no código (não há sistema de restrição de equipamento no motor).

### Principais

| Habilidade | Texto | Efeito codificado |
|---|---|---|
| Descendentes de Sharkan | +1 dado vs veneno, pode envenenar em ataques | Nenhum bônus de grau/descritor relevante no motor de combate — é tratado como texto/narrativo (não há sistema de veneno/status implementado em `engine.js`) |
| Descendentes de Arcani | Ao defender de ataque com descritor Magia: -1 dado e 1 sucesso garantido; +1 MP | **Totalmente implementado**: descritor `resiste_a_magia`, lido em `resolveRolagemDefesa` (`engine.js:689-696`). MP: texto apenas |
| Descendentes de Sabato | Já tem a Força de todo Niosh; ganha Sortudo só em ataques físicos; +1 HP | Sortudo físico: descritor `sortudo_fisico`, lido em `resolveAtaque`/`resolveAtaqueEmArea` restrito a `!ehMagia` (`engine.js:755-760, 785-786`). HP: texto apenas. (Nesta sessão, o +1 Força deixou de ser próprio desta habilidade — herda do bônus fixo de raça acima; o `efeito` do catálogo foi reescrito pra não repetir "+1 grau" de propósito, ver comentário em `racasCatalogo.js:138-145`.) |

### Secundárias

| Habilidade | Texto | Efeito codificado |
|---|---|---|
| Agressividade Oni | Ataques físicos ignoram Blindado (exceto o que não pode ser ignorado) | Descritor `ignora_blindado`, lido em `limiarAtaque` (`engine.js:611`) |
| Sangue Quente | 1º dano letal pós-descanso vira não letal; 1 SP regenera ferida | Texto apenas — não há sistema de "descanso longo" nem conversão automática no motor |
| Pele Grossa | +1 grau Resistência Física (até A), remove restrição de armadura | Grau: `BONUS_GRAU_POR_HABILIDADE["pele-grossa"]`, `teto: "A"` (`racasCatalogo.js:174-176`). Restrição de armadura: texto apenas (não há restrição codificada pra remover) |
| Adaptado | +1 dado Sobrevivência, +1 Atletismo, +1 Furtividade | **Corrigido em 15/10**: as três agora estão em `BONUS_GRAU_POR_HABILIDADE["adaptado"]` (`racasCatalogo.js:187-191`, teto C por padrão). Era de fato uma lacuna (confirmada nesta revisão) — a checagem automática do catálogo (`racasCatalogo.test.js`) só reconhecia "+1 grau"/"+1 na(s) proficiência(s)", e o texto desta habilidade usa "+1 dado em X"/"+1 em X"; a checagem foi estendida pra cobrir essa variante também. |

## Ningen

Fixo: escolhe uma base animal; só quem tem a secundária "Transformação" muda de forma.

### Principais (5 bases animais)

| Habilidade | Texto | Efeito codificado |
|---|---|---|
| Coelho/Bode | +1 Sobrevivência, +1 dado salto/faro, +1 SP | Sobrevivência: `BONUS_GRAU_POR_HABILIDADE["coelho-bode"]` (`racasCatalogo.js:149`). Salto/faro/SP: texto apenas |
| Leonino | +1 Investigação, +1 dado faro, desarmado letal, +1 SP | Investigação: `racasCatalogo.js:150`. Desarmado letal: descritor `desarmado_letal`, lido por `descritoresEfetivosDoAtaque` (`engine.js:443-449`) — implementado. Faro/SP: texto apenas |
| Reptiliano | +1 Intimidação, Blindado, desarmado letal, +1 HP | Intimidação: `racasCatalogo.js:151`. Blindado e desarmado letal: descritores implementados (mesmos mecanismos acima). HP: texto apenas |
| Lobo/Canino | +1 Liderança, +1 dado faro, desarmado letal, +1 SP | Liderança: `racasCatalogo.js:152`. Desarmado letal: implementado. Faro/SP: texto apenas |
| Raposa/Kitsune | +1 Intuição, +1 dado faro, +1 Malandragem, +1 SP | Intuição e Malandragem: `BONUS_GRAU_POR_HABILIDADE["raposa-kitsune"]` (`racasCatalogo.js:153-156`). Faro/SP: texto apenas |

### Secundárias

| Habilidade | Texto | Efeito codificado |
|---|---|---|
| Transformação | Gasta 1 SP, +1 dado físico/-1 mental enquanto transformado | Texto apenas — não há flag de "transformado" nem ajuste de dados automático no motor |
| Agilidade Bestial | Descritor Veloz, +1 prioridade | Descritor `veloz` existe (`DESCRITOR_INFO`), mas é só etiqueta — sem efeito no motor (não há sistema de iniciativa/prioridade implementado) |
| Sentidos Aguçados | +1 grau Perspicácia (teto C), +1 Intuição, +1d10 sentidos | Perspicácia e Intuição: `BONUS_GRAU_POR_HABILIDADE["sentidos-agucados"]` (`racasCatalogo.js:157-160`). +1d10 sentidos: texto apenas (teste narrativo específico, sem fórmula) |
| Pelagem e Couro | Descritor Blindado (não pode ser ignorado se já tiver) | Blindado implementado; a parte de "não pode ser ignorado" não tem suporte técnico — `limiarAtaque` não distingue origem do Blindado, qualquer `ignora_blindado`/perfurante ignora igual, sem checar se o Blindado "veio" desta habilidade |
| Garras e Presas | Desarmado letal; se já tiver, ignora Blindado | Desarmado letal implementado; `ignora_blindado` também está nos descritores desta entrada no catálogo (`catalogo-racas.json` linhas 416-419) — implementado |
| Camuflagem Animal | +1 Furtividade, +1 Sobrevivência | `BONUS_GRAU_POR_HABILIDADE["camuflagem-animal"]` (`racasCatalogo.js:161-164`) — implementado |

## Elfo

Fixo: cada elfo tem um clã e um "dom élfico" (secundária).

Bônus de raça: `BONUS_GRAU_ESCOLHA_POR_RACA.elfo` (`racasCatalogo.js:230-231`) — mesmo mecanismo do Humano, +1 grau à escolha (teto C) numa proficiência não-combate, pra todo elfo.

### Principais (5 clãs)

| Habilidade | Texto | Efeito codificado |
|---|---|---|
| Clã Radiante | Descritor Sortudo; +1 grau Carisma (teto C) | Sortudo implementado (`temDescritor`/`rolarComSortudo`). Carisma: `BONUS_GRAU_POR_HABILIDADE["cla-radiante"]` (`racasCatalogo.js:192`) |
| Clã Noctis | Descritor Sortudo; +1 grau Manipulação (teto C) | Sortudo implementado. Manipulação: `racasCatalogo.js:193` |
| Clã Corvus | Dano não letal em si vira MP; +1 grau Furtividade; +1 ofício mágico extra | Dano→MP: botão dedicado na UI (ver `point-amaranth-app.jsx`, não lido linha a linha nesta revisão, mas citado no histórico de mudanças desta sessão). Furtividade: `racasCatalogo.js:194-196`. Ofício extra: `BONUS_OFICIO_EXTRA_POR_HABILIDADE["cla-corvus"] = 1` (`racasCatalogo.js:254`), somado em `oficiosExtrasDoPersonagem` |
| Clã Seasus | +1 grau Magias Gerais; +1 ofício mágico extra | Magias Gerais: `racasCatalogo.js:197-199`. Ofício extra: `BONUS_OFICIO_EXTRA_POR_HABILIDADE["cla-seasus"] = 1` (`racasCatalogo.js:255`) |
| Clã Natrus | +1 ofício mágico extra; +1 grau Sobrevivência | Ofício extra: `BONUS_OFICIO_EXTRA_POR_HABILIDADE["cla-natrus"] = 1` (`racasCatalogo.js:253`). Sobrevivência: `racasCatalogo.js:200-202` |

### Secundárias

| Habilidade | Texto | Efeito codificado |
|---|---|---|
| Reservatório de Mana | +1 MP máximo | Texto apenas |
| Resistência à Dor | +1 grau Resolução | `BONUS_GRAU_POR_HABILIDADE["resistencia-a-dor"]` (`racasCatalogo.js:203`) |
| Arte e Tradição | +1 grau Etiqueta, Atuação, Malandragem | `BONUS_GRAU_POR_HABILIDADE["arte-e-tradicao"]` (`racasCatalogo.js:204-208`) |
| Elfo da Natureza | Ação + 1 SP recupera 3 MP | Texto apenas — não há sistema de ações/turnos no motor pra consumir, e a UI não tem um botão específico localizado nesta revisão |

## Dragonato

Fixos de raça: descritor Blindado pra toda a raça e "transformação draconiana" (`catalogo-racas.json` linhas 593-596). **Nenhum dos dois está em `BONUS_GRAU_FIXO_POR_RACA`** (que só tem `niosh`) — ao contrário do que o campo `fixos` sugere, o Blindado do Dragonato não é concedido automaticamente pelo código a toda a raça; cada principal precisa ter o próprio descritor Blindado no catálogo (e de fato, só Texoni tem `"blindado"` nos seus `descritores` — Kutrefas/Terramak/Kurlav/Haxos não têm). **Isso é uma divergência real entre o texto `fixos` e o efeito codificado.**

### Principais

| Habilidade | Texto | Efeito codificado |
|---|---|---|
| Texoni | Descritor Blindado | Implementado (`catalogo-racas.json` linhas 611-617) |
| Kutrefas | Imune a veneno biológico; +1d10 recuperação de MP | Texto apenas — `bonus: []` no catálogo, nenhuma tabela de bônus referencia `kutrefas` |
| Terramak | Começa com bafo de dragão pyro | Texto apenas — não há sistema de "bafo de dragão" no motor |
| Kurlav | Começa com sistema Geo sem gastar slot | Texto apenas — "sistema Geo" não existe em nenhum outro arquivo do código |
| Haxos | +1 HP | Texto apenas |

### Secundárias (arsenal dracônico)

**Correção (15/10): "Escamas Fortes" e "Corpo Resistente" JÁ ESTAVAM mapeadas** — erro desta revisão na primeira passagem. `BONUS_GRAU_POR_HABILIDADE["escamas-fortes"]` (Força) e `["corpo-resistente"]` (Vigor) existem em `racasCatalogo.js:167-168`, ambas com teto C (o padrão, sem precisar de `teto` explícito) — batem com o texto "(até o teto C)" de cada uma. Só **Sopro de Dragão** e **Voar** não têm bônus de grau mapeado, mas corretamente: o texto de nenhuma das duas menciona "+1 grau" nem variante parecida (são efeitos de ataque/movimento, não bônus de atributo).

## Tengou

Fixo: toda Tengou tem uma "Singularidade"; se já tiver uma, ganha +2 MP (`catalogo-racas.json` linha 722) — texto apenas, igual aos outros bônus de MP/HP/SP já descritos.

### Principais (Anjo/Demônio/Fada)

Nenhuma das três tem bônus de grau, descritor ou mecânica implementada — são efeitos narrativos específicos (gastar HP pra curar, ganhar MP ao ferir, re-rolar o menor dado da zona em 1/10) sem suporte no motor hoje.

### Secundárias

Voar Tengou, Superioridade Natural (+1d10 fora de combate), Alimentação de Alma (+1d10 recuperação MP) — nenhuma tem efeito codificado; todas são texto apenas.

## Resumo da verificação

Das ~40 habilidades do catálogo, a maioria dos bônus numéricos de **HP/MP/SP** (presentes em quase toda raça) não tem nenhum efeito mecânico — é a lacuna mais ampla encontrada (ver doc 00). Fora isso, bônus de **grau de proficiência/atributo** e **descritores** estão majoritariamente implementados corretamente. A única exceção real encontrada — "Adaptado" (Niosh), cujo texto prometia +1 grau (em formato "+1 dado em X") mas não aparecia em `BONUS_GRAU_POR_HABILIDADE` — **já foi corrigida em 15/10** (ver acima); a suspeita inicial sobre "Escamas Fortes"/"Corpo Resistente" (arsenal dracônico) era um erro desta própria revisão — as duas já estavam mapeadas corretamente.

## Não verificado

Não localizei o artefato "Sistema Point" nem o "documento Magias de Área — Point" citados como fonte em `docs/MUDANCAS_RACAS_E_MAGIA.md` linha 3 em nenhum lugar deste repositório (busquei por "Sistema Point" em todo o código e documentação). Não é possível, portanto, comparar `catalogo-racas.json` diretamente contra o artefato original — só contra os três documentos derivados dele (`docs/MUDANCAS_RACAS_E_MAGIA.md`, `docs/DISCIPLINAS_MAGIA.md`, `docs/SISTEMA_MAGIA.md`), que é o que fiz acima.
