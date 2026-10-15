# 00 — Resumo: as 10 maiores inconsistências

Ordenadas por impacto (o quanto afetam o que o jogador vê/usa na ficha hoje). Detalhes e referências de arquivo/linha estão nos documentos 01-05.

## 1. Bônus de HP/MP/SP de raça são só texto — não têm efeito mecânico

Quase toda raça/habilidade do catálogo (`catalogo-racas.json`) promete "+1 HP máximo", "+1 MP máximo" ou "+1 SP máximo" (Mana Fluida, Coelho/Bode, Leonino, Lobo/Canino, Raposa/Kitsune, Reptiliano, Descendentes de Arcani, Descendentes de Sabato, Goethiano, Homúnculo, Haxos, Singularidade Tengou, etc.). Mas `computeMaxHP`, `computeMaxSP` e `computeMaxMana` (`engine.js:456-479`) só somam Vigor, a habilidade "Persistente" e a flag Magia Inata — **nenhuma delas lê bônus de raça**. Resultado: um jogador pode escolher qualquer uma dessas habilidades e o HP/MP/SP máximo da ficha não muda nada. É a lacuna mais ampla encontrada, porque afeta a maioria das raças de uma vez (ver doc 03).

## 2. `docs/SISTEMA_MAGIA.md` é citado como "fonte de verdade" mas está desatualizado

O próprio comentário de abertura de `engine.js` (linha 6) chama `docs/SISTEMA_MAGIA.md` de fonte de verdade das regras — mas esse arquivo ainda descreve Resistência Mágica, Blindado Mágico separado, a proficiência Magias Ofensivas e a recuperação de mana via "Manipulação de Mana" — tudo isso removido do código em 14/10. Quem realmente bate com o código são `docs/MUDANCAS_RACAS_E_MAGIA.md` e `docs/DISCIPLINAS_MAGIA.md` (que se autodeclaram sobrepondo o `SISTEMA_MAGIA.md` onde divergem), mas o comentário do código aponta pro arquivo errado como referência principal — quem for atualizar o jogo lendo só esse comentário vai se basear em regras extintas.

## 3. Habilidades Passivas de Combate (PROC_ABILITIES) estão 100% órfãs

As 11 habilidades do catálogo (`engine.js:207-296`) — incluindo as 3 ligadas às proficiências já removidas `manipulacaoManaProf`/`magiasOfensivas` — não são mais chamadas por `resolveAtaque` (`engine.js:200` confirma isso no próprio comentário). A ficha ainda mostra 3 slots pra equipar (`point-amaranth-app.jsx:6286, 7339`) e lista o catálogo completo (`point-amaranth-app.jsx:6903, 10280`), dando a impressão de que a mecânica funciona — mas nenhum efeito dispara numa rolagem de combate real hoje.

## 4. A proficiência "Defesa" existe na ficha mas não é usada em nenhuma rolagem

`defesaProf` está no catálogo de proficiências (`engine.js:96`) e aparece na ficha, mas não é lida por `resolveAtaque` nem por `resolveRolagemDefesa` — toda defesa usa só Resistência Física. `defesaProf` só é consultada pelo painel decorativo antigo `STAT_LIST`/`STAT_PROF_LINK` (`engine.js:524, 532-534`), que o próprio código já documenta como não consultado pelo motor novo. Um jogador pode subir o grau de Defesa pensando que isso ajuda a se defender, e não ajuda em nada hoje.

## 5. O painel "Estatísticas de Combate" antigo (Defesa/Resistência Armadura/Geral) e o resumo "Acertos por Tipo" continuam decorativos

`STAT_LIST`/`computeStat` (`engine.js:147-164, 526-535`) e `ACERTOS_POR_TIPO`/`computeAcertoTipo` (`engine.js:183-192`) usam o modelo antigo de "bônus plano" (E=0..A=+4), incompatível com o pool de dados atual — ambos são comentados explicitamente no código como não lidos por `resolveAtaque`. Continuam visíveis na ficha sem nenhum aviso pro jogador de que são só referência histórica.

## 6. "Resistência Armadura"/sistema de armadura não tem nenhuma mecânica, mas ainda aparece configurável na ficha

`resolveAtaque` não lê nada de armadura — o modelo novo é só ataque vs. defesa, sucessos líquidos, ferimento por Vigor (comentário em `engine.js:142-146`). Ainda assim, "Resistência Armadura" continua como estatística editável (`STAT_LIST`, `engine.js:149`) e o bloco de referência de equipamentos (`EQUIPMENT_REFERENCE`, `point-amaranth-app.jsx:230-257`) descreve valores de resistência por tipo de armadura sem indicar que isso não afeta mais nenhuma rolagem.

## 7. 3 das 5 disciplinas de magia (Encantamentos, Alquimia, Constructo) são "vazias" mas contam como ofício mágico de verdade

Qualquer uma das 3 disciplinas vazias ocupa um slot e soma no pool de ataque mágico e na recuperação de mana (`contagemOficiosMagicos`, `engine.js:632-642`, não distingue `vazia`), mesmo sem dar nenhum bônus ou habilidade própria. Isso é intencional segundo `docs/DISCIPLINAS_MAGIA.md` linha 31 ("cadastre-os como disciplinas vazias para o jogador poder escolher"), mas pode confundir quem não souber que uma disciplina sem conteúdo ainda é mecanicamente útil (conta no pool).

## 8. Duas habilidades/arsenal com texto de "+1 grau" sem mapeamento de bônus

"Adaptado" (secundária Niosh: +1 Sobrevivência/Atletismo/Furtividade) e "Escamas Fortes"/"Corpo Resistente" (arsenal dracônico: +1 grau Força/Vigor) têm texto no catálogo idêntico em formato a outras habilidades que SÃO mapeadas em `BONUS_GRAU_POR_HABILIDADE`, mas não aparecem nessa tabela (`racasCatalogo.js:144-192`) — ou seja, prometem um bônus de grau permanente que não é aplicado. O próprio comentário do código (`racasCatalogo.js:115-134`) descreve um teste automático que deveria pegar esses casos; vale conferir se ele realmente cobre esses formatos de texto.

## 9. Texto `fixos` do Dragonato promete Blindado pra "toda a raça", mas só 1 das 5 principais tem o descritor codificado

`catalogo-racas.json` linha 594 lista Blindado como fixo da raça Dragonato, mas não existe entrada em `BONUS_GRAU_FIXO_POR_RACA` pra Dragonato (só Niosh tem). Na prática, só quem escolhe "Texoni" como principal tem o descritor Blindado de verdade — Kutrefas/Terramak/Kurlav/Haxos não têm, apesar do campo `fixos` dizer que é de toda a raça.

## 10. Texto histórico de "3d10"/sistema de 3 fases ainda aparece na ficha sem aviso claro de que está obsoleto

`CORE_RULES` (`point-amaranth-app.jsx:259-287`) preserva a descrição completa do sistema antigo (Acerto 3d10 + Confirmação + Armadura como escudo de uso único, atributo "Sorte" controlando Habilidades Passivas de Combate) como "referência histórica" — mas a entrada de status "CARGA" (`point-amaranth-app.jsx:224-226`) ainda usa literalmente "3d10 (sucesso >5)" como a própria regra do efeito, sem rótulo de histórico, diferente do resto do bloco. Quem usar esse status effect hoje rola com uma mecânica que não bate com o resto do sistema (que usa pool variável, não 3 dados fixos).

## Pontos que não consegui verificar nesta revisão

- O artefato **"Sistema Point"** e o **"documento Magias de Área — Point"**, citados como fonte original em `docs/MUDANCAS_RACAS_E_MAGIA.md` linha 3, não existem neste repositório — toda comparação dos docs 02-05 contra "o guia" foi feita contra os três arquivos `docs/*.md` já derivados desses artefatos, nunca contra o original.
- O termo **"Disciplina única"**, citado no pedido de revisão como uma das famílias de disciplina a documentar, não aparece em nenhum arquivo do repositório — não sei a que corresponde no vocabulário atual do jogo.
- O conteúdo do vault do Obsidian local do Pedro (`C:\Users\Usuario\Desktop\Point Vault\Point`, referenciado em `CLAUDE.md`) não está acessível desta sessão (container Linux na nuvem, sem acesso ao filesystem Windows local) — se alguma nota do vault contradiz o que está documentado aqui, não consegui cruzar essa informação.
- Não localizei um sistema de crítico com efeito mecânico próprio alinhado ao "10 natural = crítico, a confirmar" do guia (`docs/SISTEMA_MAGIA.md` linha 6) — hoje o 10 natural só conta como sucesso garantido; não sei se isso é a decisão final ou uma pendência esquecida.
- Não confirmei com certeza se "Escolas de Magia" (citada na secundária "Vaga de Disciplina" do Humano) é sinônimo do atual "Ofício Mágico" ou uma família ainda não escrita — ambíguo no estado atual do código (ver doc 04).
