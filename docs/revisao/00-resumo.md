# 00 — Resumo: as 10 maiores inconsistências

Ordenadas por impacto (o quanto afetam o que o jogador vê/usa na ficha hoje). Detalhes e referências de arquivo/linha estão nos documentos 01-05.

## 1. Bônus de HP/MP/SP de raça são só texto — não têm efeito mecânico

Quase toda raça/habilidade do catálogo (`catalogo-racas.json`) promete "+1 HP máximo", "+1 MP máximo" ou "+1 SP máximo" (Mana Fluida, Coelho/Bode, Leonino, Lobo/Canino, Raposa/Kitsune, Reptiliano, Descendentes de Arcani, Descendentes de Sabato, Goethiano, Homúnculo, Haxos, Singularidade Tengou, etc.). Mas `computeMaxHP`, `computeMaxSP` e `computeMaxMana` (`engine.js:462-485`) só somam Vigor, a habilidade "Persistente" e a flag Magia Inata — **nenhuma delas lê bônus de raça**. Resultado: um jogador pode escolher qualquer uma dessas habilidades e o HP/MP/SP máximo da ficha não muda nada. É a lacuna mais ampla encontrada, porque afeta a maioria das raças de uma vez (ver doc 03).

## 2. ~~`docs/SISTEMA_MAGIA.md` é citado como "fonte de verdade" mas está desatualizado~~ — CORRIGIDO EM 15/10

`docs/SISTEMA_MAGIA.md` foi reescrito pra remover Resistência Mágica, Blindado Mágico separado, a proficiência Magias Ofensivas e a recuperação de mana via "Manipulação de Mana" — tudo substituído pelo que o código faz hoje, usando as regras já confirmadas em `docs/MUDANCAS_RACAS_E_MAGIA.md` e `docs/DISCIPLINAS_MAGIA.md`. O comentário de abertura de `engine.js` (linha 6) foi corrigido pra apontar pros três arquivos juntos como fonte de verdade, em vez de só `docs/SISTEMA_MAGIA.md`. Nenhuma decisão de regra nova foi tomada — só alinhamento de documentação com o código existente.

## 3. Habilidades Passivas de Combate (PROC_ABILITIES) estão 100% órfãs

As 11 habilidades do catálogo (`engine.js:213-302`) — incluindo as 3 ligadas às proficiências já removidas `manipulacaoManaProf`/`magiasOfensivas` — não são mais chamadas por `resolveAtaque` (`engine.js:206` confirma isso no próprio comentário). A ficha ainda mostra 3 slots pra equipar (`point-amaranth-app.jsx:6286, 7339`) e lista o catálogo completo (`point-amaranth-app.jsx:6903, 10280`), dando a impressão de que a mecânica funciona — mas nenhum efeito dispara numa rolagem de combate real hoje.

## 4. A proficiência "Defesa" existe na ficha mas não é usada em nenhuma rolagem

`defesaProf` está no catálogo de proficiências (`engine.js:102`) e aparece na ficha, mas não é lida por `resolveAtaque` nem por `resolveRolagemDefesa` — toda defesa usa só Resistência Física. `defesaProf` só é consultada pelo painel decorativo antigo `STAT_LIST`/`STAT_PROF_LINK` (`engine.js:530, 538-540`), que o próprio código já documenta como não consultado pelo motor novo. Um jogador pode subir o grau de Defesa pensando que isso ajuda a se defender, e não ajuda em nada hoje.

## 5. O painel "Estatísticas de Combate" antigo (Defesa/Resistência Armadura/Geral) e o resumo "Acertos por Tipo" continuam decorativos

`STAT_LIST`/`computeStat` (`engine.js:153-170, 532-541`) e `ACERTOS_POR_TIPO`/`computeAcertoTipo` (`engine.js:189-198`) usam o modelo antigo de "bônus plano" (E=0..A=+4), incompatível com o pool de dados atual — ambos são comentados explicitamente no código como não lidos por `resolveAtaque`. Continuam visíveis na ficha sem nenhum aviso pro jogador de que são só referência histórica.

## 6. "Resistência Armadura"/sistema de armadura não tem nenhuma mecânica, mas ainda aparece configurável na ficha

`resolveAtaque` não lê nada de armadura — o modelo novo é só ataque vs. defesa, sucessos líquidos, ferimento por Vigor (comentário em `engine.js:148-152`). Ainda assim, "Resistência Armadura" continua como estatística editável (`STAT_LIST`, `engine.js:155`) e o bloco de referência de equipamentos (`EQUIPMENT_REFERENCE`, `point-amaranth-app.jsx:230-257`) descreve valores de resistência por tipo de armadura sem indicar que isso não afeta mais nenhuma rolagem.

## 7. 3 das 5 disciplinas de magia (Encantamentos, Alquimia, Constructo) são "vazias" mas contam como ofício mágico de verdade

Qualquer uma das 3 disciplinas vazias ocupa um slot e soma no pool de ataque mágico e na recuperação de mana (`contagemOficiosMagicos`, `engine.js:638-648`, não distingue `vazia`), mesmo sem dar nenhum bônus ou habilidade própria. Isso é intencional segundo `docs/DISCIPLINAS_MAGIA.md` linha 31 ("cadastre-os como disciplinas vazias para o jogador poder escolher"), mas pode confundir quem não souber que uma disciplina sem conteúdo ainda é mecanicamente útil (conta no pool).

## 8. ~~"Adaptado" (Niosh) com texto de bônus sem mapeamento~~ — CORRIGIDO EM 15/10

"Adaptado" (secundária Niosh: +1 Sobrevivência/Atletismo/Furtividade) tinha texto de bônus de grau no catálogo sem entrada em `BONUS_GRAU_POR_HABILIDADE` — confirmado nesta revisão e corrigido: a habilidade agora está mapeada (`racasCatalogo.js:187-191`, teto C). A checagem automática do catálogo (`racasCatalogo.test.js`) só reconhecia as frases "+1 grau"/"+1 na(s) proficiência(s)"; foi estendida pra também reconhecer o formato "+1 dado em X"/"+1 em X" (com X sendo o nome da proficiência em maiúscula), que é como "Adaptado" está escrito — por isso o caso nunca tinha sido pego antes. ("Escamas Fortes" e "Corpo Resistente", citadas junto na primeira versão deste item, eram um engano desta própria revisão: já estavam mapeadas corretamente desde antes.)

## 9. Texto `fixos` do Dragonato promete Blindado pra "toda a raça", mas só 1 das 5 principais tem o descritor codificado

`catalogo-racas.json` linha 594 lista Blindado como fixo da raça Dragonato, mas não existe entrada em `BONUS_GRAU_FIXO_POR_RACA` pra Dragonato (só Niosh tem). Na prática, só quem escolhe "Texoni" como principal tem o descritor Blindado de verdade — Kutrefas/Terramak/Kurlav/Haxos não têm, apesar do campo `fixos` dizer que é de toda a raça.

## 10. Texto histórico de "3d10"/sistema de 3 fases ainda aparece na ficha sem aviso claro de que está obsoleto

`CORE_RULES` (`point-amaranth-app.jsx:259-287`) preserva a descrição completa do sistema antigo (Acerto 3d10 + Confirmação + Armadura como escudo de uso único, atributo "Sorte" controlando Habilidades Passivas de Combate) como "referência histórica" — mas a entrada de status "CARGA" (`point-amaranth-app.jsx:224-226`) ainda usa literalmente "3d10 (sucesso >5)" como a própria regra do efeito, sem rótulo de histórico, diferente do resto do bloco. Quem usar esse status effect hoje rola com uma mecânica que não bate com o resto do sistema (que usa pool variável, não 3 dados fixos).

## Pontos que não consegui verificar nesta revisão

- O artefato **"Sistema Point"** e o **"documento Magias de Área — Point"**, citados como fonte original em `docs/MUDANCAS_RACAS_E_MAGIA.md` linha 3, não existem neste repositório — toda comparação dos docs 02-05 contra "o guia" foi feita contra os três arquivos `docs/*.md` já derivados desses artefatos, nunca contra o original.
- ~~O termo "Disciplina única"...~~ — **esclarecido pelo Pedro em 15/10**: "Disciplina única" é o termo do artefato Sistema Point para as duas habilidades raciais de cada personagem (tipo principal e subtipo) — ou seja, não é uma família de disciplina de magia/combate à parte, é só como o artefato original chama o par habilidadePrincipal/habilidadeSecundaria que o código já implementa (`racasCatalogo.js:encontrarPrincipal`/`encontrarSecundaria`). **Não deve ser criado nada novo no código por esse nome** — ver doc 04.
- O conteúdo do vault do Obsidian local do Pedro (`C:\Users\Usuario\Desktop\Point Vault\Point`, referenciado em `CLAUDE.md`) não está acessível desta sessão (container Linux na nuvem, sem acesso ao filesystem Windows local) — se alguma nota do vault contradiz o que está documentado aqui, não consegui cruzar essa informação.
- Não localizei um sistema de crítico com efeito mecânico próprio alinhado ao "10 natural = crítico, a confirmar" do guia (`docs/SISTEMA_MAGIA.md` linha 6) — hoje o 10 natural só conta como sucesso garantido; não sei se isso é a decisão final ou uma pendência esquecida.
- Não confirmei com certeza se "Escolas de Magia" (citada na secundária "Vaga de Disciplina" do Humano) é sinônimo do atual "Ofício Mágico" ou uma família ainda não escrita — ambíguo no estado atual do código (ver doc 04).
