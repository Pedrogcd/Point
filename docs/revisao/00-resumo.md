# 00 — Resumo: as 10 maiores inconsistências

Ordenadas por impacto (o quanto afetam o que o jogador vê/usa na ficha hoje). Detalhes e referências de arquivo/linha estão nos documentos 01-05.

## 1. ~~Bônus de HP/MP/SP de raça são só texto — não têm efeito mecânico~~ — IMPLEMENTADO EM 15/10

Quase toda raça/habilidade do catálogo (`catalogo-racas.json`) promete "+1 HP máximo", "+1 MP máximo" ou "+1 SP máximo" (Mana Fluida, Coelho/Bode, Leonino, Lobo/Canino, Raposa/Kitsune, Reptiliano, Descendentes de Arcani, Descendentes de Sabato, Homúnculo, Haxos, Singularidade Tengou, Reservatório de Mana, etc.). Pedro decidiu em 15/10 implementar esses bônus: `racasCatalogo.js` agora soma cada um em `bonusRecursosDoPersonagem` (tabelas `BONUS_RECURSO_POR_HABILIDADE`/`BONUS_RECURSO_FIXO_POR_RACA`) e anexa o total como `character.bonusRecursos` dentro de `comGrausEfetivos`; `computeMaxHP`, `computeMaxSP` e `computeMaxMana` (`engine.js`) agora leem esse campo (com `|| 0` pra não quebrar fichas sem o campo). Respeita o limite de MP (1 a 6). Ver doc 03 pra lista completa das habilidades mapeadas.

## 2. ~~`docs/SISTEMA_MAGIA.md` é citado como "fonte de verdade" mas está desatualizado~~ — CORRIGIDO EM 15/10

`docs/SISTEMA_MAGIA.md` foi reescrito pra remover Resistência Mágica, Blindado Mágico separado, a proficiência Magias Ofensivas e a recuperação de mana via "Manipulação de Mana" — tudo substituído pelo que o código faz hoje, usando as regras já confirmadas em `docs/MUDANCAS_RACAS_E_MAGIA.md` e `docs/DISCIPLINAS_MAGIA.md`. O comentário de abertura de `engine.js` (linha 6) foi corrigido pra apontar pros três arquivos juntos como fonte de verdade, em vez de só `docs/SISTEMA_MAGIA.md`. Nenhuma decisão de regra nova foi tomada — só alinhamento de documentação com o código existente.

## 3. Habilidades Passivas de Combate (PROC_ABILITIES) estão 100% órfãs

As 11 habilidades do catálogo (`engine.js:213-302`) — incluindo as 3 ligadas às proficiências já removidas `manipulacaoManaProf`/`magiasOfensivas` — não são mais chamadas por `resolveAtaque` (`engine.js:206` confirma isso no próprio comentário). A ficha ainda mostra 3 slots pra equipar (`point-amaranth-app.jsx:6286, 7339`) e lista o catálogo completo (`point-amaranth-app.jsx:6903, 10280`), dando a impressão de que a mecânica funciona — mas nenhum efeito dispara numa rolagem de combate real hoje.

## 4. ~~A proficiência "Defesa" existe na ficha mas não é usada em nenhuma rolagem~~ — REMOVIDO EM 15/10

`defesaProf` estava no catálogo de proficiências (`engine.js:102`) e aparecia na ficha, mas não era lida por `resolveAtaque` nem por `resolveRolagemDefesa` — toda defesa usa só Resistência Física. Pedro decidiu em 15/10 remover a proficiência Defesa da ficha e do catálogo (`PROFICIENCIAS_LIST`) junto com os painéis decorativos que a liam. Fichas salvas com grau em `defesaProf` mantêm o dado intacto (não é migrado nem apagado, só deixou de ser lido/exibido).

## 5. ~~O painel "Estatísticas de Combate" antigo (Defesa/Resistência Armadura/Geral) e o resumo "Acertos por Tipo" continuam decorativos~~ — REMOVIDO EM 15/10

`STAT_LIST`/`computeStat` e `ACERTOS_POR_TIPO`/`computeAcertoTipo` usavam o modelo antigo de "bônus plano" (E=0..A=+4), incompatível com o pool de dados atual, e nunca eram lidos por `resolveAtaque`. Pedro decidiu em 15/10 remover os dois painéis (e as funções correspondentes em `engine.js`) por completo, já que eram só decorativos.

## 6. ~~"Resistência Armadura"/sistema de armadura não tem nenhuma mecânica, mas ainda aparece configurável na ficha~~ — REMOVIDO EM 15/10

`resolveAtaque` não lê nada de armadura — o modelo novo é só ataque vs. defesa, sucessos líquidos, ferimento por Vigor. Pedro decidiu em 15/10 remover "Resistência Armadura" (fazia parte do `STAT_LIST` removido no item 5) e o bloco de referência de equipamentos de resistência de armadura (`EQUIPMENT_REFERENCE.armaduras`, `point-amaranth-app.jsx`) junto com sua renderização na ficha.

## 7. 3 das 5 disciplinas de magia (Encantamentos, Alquimia, Constructo) são "vazias" mas contam como ofício mágico de verdade

Qualquer uma das 3 disciplinas vazias ocupa um slot e soma no pool de ataque mágico e na recuperação de mana (`contagemOficiosMagicos`, `engine.js:638-648`, não distingue `vazia`), mesmo sem dar nenhum bônus ou habilidade própria. Isso é intencional segundo `docs/DISCIPLINAS_MAGIA.md` linha 31 ("cadastre-os como disciplinas vazias para o jogador poder escolher"), mas pode confundir quem não souber que uma disciplina sem conteúdo ainda é mecanicamente útil (conta no pool).

## 8. ~~"Adaptado" (Niosh) com texto de bônus sem mapeamento~~ — CORRIGIDO EM 15/10

"Adaptado" (secundária Niosh: +1 Sobrevivência/Atletismo/Furtividade) tinha texto de bônus de grau no catálogo sem entrada em `BONUS_GRAU_POR_HABILIDADE` — confirmado nesta revisão e corrigido: a habilidade agora está mapeada (`racasCatalogo.js:187-191`, teto C). A checagem automática do catálogo (`racasCatalogo.test.js`) só reconhecia as frases "+1 grau"/"+1 na(s) proficiência(s)"; foi estendida pra também reconhecer o formato "+1 dado em X"/"+1 em X" (com X sendo o nome da proficiência em maiúscula), que é como "Adaptado" está escrito — por isso o caso nunca tinha sido pego antes. ("Escamas Fortes" e "Corpo Resistente", citadas junto na primeira versão deste item, eram um engano desta própria revisão: já estavam mapeadas corretamente desde antes.)

## 9. ~~Texto `fixos` do Dragonato promete Blindado pra "toda a raça", mas só 1 das 5 principais tem o descritor codificado~~ — CORRIGIDO EM 15/10

`catalogo-racas.json` linha 594 listava Blindado como fixo da raça Dragonato, mas não existe entrada em `BONUS_GRAU_FIXO_POR_RACA` pra Dragonato (só Niosh tem). Na prática, só quem escolhe "Texoni" como principal tem o descritor Blindado de verdade — Kutrefas/Terramak/Kurlav/Haxos não têm. Pedro confirmou em 15/10 que o Blindado do Dragonato vale só pro Texoni por ora; o texto `fixos` do catálogo foi corrigido pra não dizer mais "toda a raça".

## 10. Texto histórico de "3d10"/sistema de 3 fases ainda aparece na ficha sem aviso claro de que está obsoleto

`CORE_RULES` (`point-amaranth-app.jsx:259-287`) preserva a descrição completa do sistema antigo (Acerto 3d10 + Confirmação + Armadura como escudo de uso único, atributo "Sorte" controlando Habilidades Passivas de Combate) como "referência histórica" — mas a entrada de status "CARGA" (`point-amaranth-app.jsx:224-226`) ainda usa literalmente "3d10 (sucesso >5)" como a própria regra do efeito, sem rótulo de histórico, diferente do resto do bloco. Quem usar esse status effect hoje rola com uma mecânica que não bate com o resto do sistema (que usa pool variável, não 3 dados fixos).

## Pontos que não consegui verificar nesta revisão

- O artefato **"Sistema Point"** e o **"documento Magias de Área — Point"**, citados como fonte original em `docs/MUDANCAS_RACAS_E_MAGIA.md` linha 3, não existem neste repositório — toda comparação dos docs 02-05 contra "o guia" foi feita contra os três arquivos `docs/*.md` já derivados desses artefatos, nunca contra o original.
- ~~O termo "Disciplina única"...~~ — **esclarecido pelo Pedro em 15/10**: "Disciplina única" é o termo do artefato Sistema Point para as duas habilidades raciais de cada personagem (tipo principal e subtipo) — ou seja, não é uma família de disciplina de magia/combate à parte, é só como o artefato original chama o par habilidadePrincipal/habilidadeSecundaria que o código já implementa (`racasCatalogo.js:encontrarPrincipal`/`encontrarSecundaria`). **Não deve ser criado nada novo no código por esse nome** — ver doc 04.
- O conteúdo do vault do Obsidian local do Pedro (`C:\Users\Usuario\Desktop\Point Vault\Point`, referenciado em `CLAUDE.md`) não está acessível desta sessão (container Linux na nuvem, sem acesso ao filesystem Windows local) — se alguma nota do vault contradiz o que está documentado aqui, não consegui cruzar essa informação.
- ~~Não localizei um sistema de crítico com efeito mecânico próprio...~~ — **decidido pelo Pedro em 15/10**: o 10 natural fica como está por ora (só sucesso garantido, sem efeito extra). Pode ganhar efeito próprio no futuro, mas não é uma pendência esquecida — ver doc 02.
- Não confirmei com certeza se "Escolas de Magia" (citada na secundária "Vaga de Disciplina" do Humano) é sinônimo do atual "Ofício Mágico" ou uma família ainda não escrita — ambíguo no estado atual do código (ver doc 04).
