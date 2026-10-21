# Point: atualização consolidada de 21/10/2026

Espelho do artefato "Sistema Point". Cobre tudo o que mudou desde 14/10. Magias e armas serão revisadas depois, mas já entram no site. Valores marcados como **(provisório)** devem ficar em constantes editáveis.

## 1. Defesa substitui Resistência Física

- Proficiências de Combate: Armas de Fogo, Combate Corpo a Corpo, Defesa. Total de 25 proficiências (3 de Combate, 22 gerais).
- Defesa = atributo (Destreza para esquivar, Força para bloquear) + proficiência Defesa. Vale contra ataque físico e mágico.
- Morrem: Resistência Física, a fórmula "Defesa = 8 + bônus" e o painel antigo de Defesa.
- Migração (confirmada por Pedro): a nova Defesa recebe o valor da antiga Resistência Física; os pontos gastos na Defesa antiga voltam ao orçamento; o valor antigo fica num campo legado (não apagar).
- Pele Grossa (Niosh) dá +1 grau em Defesa, sem teto C (vai até A). Mana Estática usa o descritor Resistente (já decidido em 19/10), sem mudança de proficiência.

## 2. Dados e dano (base)

- Grau = número de d10: F 0, E 1, D 2, C 3, B 4, A 5. Teto C para jogadores (exceções: Pele Grossa em Defesa, até A).
- Sucesso: 6+. Contra Blindado: 7+. O 10 natural sempre conta.
- Ataque físico: Destreza + (Combate Corpo a Corpo ou Armas de Fogo) + ajuste da arma.
- Ataque mágico: Base mágica (2d10 + mana gasta acima do custo) + (nº de ofícios mágicos OU Inteligência, à escolha) + ajuste da magia (Mísseis +1) + 1d10 com Magia Inata. Magia Inata não conta como ofício.
- Sucessos líquidos = sucessos do ataque − sucessos da defesa.
- Agravante se líquidos >= Vigor (E=1 … A=5). Letal reduz o Vigor em 1 (mínimo 1). Resistente soma +1 ao Vigor (não acumula; Letal e Resistente se anulam). O resto é superficial. Ferimento marcado "superficial" é sempre superficial.

## 3. Mana

- Cada pessoa tem de 1 a 6 mana. Volta ao fim da cena. Recupera-se também nas rolagens de lançamento (ofícios + mana usada).
- **Mana quebrada**: gasta 1 e continua quebrada até o jogador reparar, de graça, só fora de combate. No máximo 1 mana quebrada por habilidade (exceção: Constructo quebra 2).

## 4. Ofícios mágicos

Cada disciplina de ofício conta como 1 ofício. Até 3 disciplinas, 3 habilidades ativas cada; humano com Vaga de Disciplina tem um quarto espaço. As 8 Escolas de Magia viram ofícios; as demais disciplinas estão em aberto.

| Ofício | Resumo |
|---|---|
| Magias de guerra | 12 magias ofensivas + Chama Mágica, Descarga Elétrica, Dreno de Mana, círculo mágico, Conduíte, Sensor. O antigo Saturante virou Abrangente 2. |
| Encantamentos | Conduíte, Lâmina Letal, Ponta Perfurante, Golpe Abrangente, Pele Encantada, Encantamento Flamejante, Sorte Encantada, Encantamento Elétrico, Encantamento Drenante, círculo mágico. |
| Alquimia | Itens preparados (ver 4.1). |
| Constructo | Golem Guardião, Torre de Mana, Armadilha Rúnica, Arma Viva, Armadura Animada, Servo Familiar, Torre Elétrica, Conduíte. |
| Habilidades conjuntas | Círculo mágico, Frasco Armazenado, Frasco Rúnico, Poção Encantada, Bomba de Guerra, Encantamento Venenoso. Exigem mais de um ofício. |
| Invocação | Só ideia (armas invocadas com descritores). Não implementar. |

Fonte dos textos de cada habilidade: `oficios-por-aba.xlsx` (uma aba por ofício, mais "Todos os descritores" e "Descritores novos"). Carregar de lá para `data/magias.js`.

**Conduíte mágico**: existe em todo ofício, ocupa 1 dos 3 espaços, conta +1 ofício. Só um Conduíte funciona por vez (máximo +1 no total).

### 4.1 Alquimia
- Itens são preparados: quebram 1 mana, só fora de combate. 1 item grátis por nível de ofício mágico. Duram até ser usados ou até o descanso longo.
- Qualquer um usa o item, com os parâmetros de quem criou. Rolagem: Destreza + (ofícios OU Inteligência), sem Base mágica nem mana extra.
- Exemplos: bombas que simulam magia de guerra (um pouco piores); poção que cura 1 ferimento superficial (uma vez por pessoa por descanso longo); bomba incendiária (Queimadura 3 em área, 1 mana quebrada, não causa superficial além da queimadura); Frasco de Gosma (prioridade -1 na cena); Ácido Corrosivo (lembrar: interagir com armaduras quando existirem).

### 4.2 Constructo
- Quebra 2 mana; quando destruído só 1 volta. Age só quando o dono manda.
- Pool: Base mágica (2d10, sem mana extra) + nº de ofícios do dono.
- Magias feitas por ele custam 1 MP a menos (custo 1 sai de graça).
- Cada constructo tem no mínimo 2 funções e uma magia única.

## 5. Descritores (glossário único)

| Descritor | Regra |
|---|---|
| Magia | Marca o ataque como mágico. |
| Em área | Atinge todos da zona. |
| Abrangente N **(nome provisório)** | Quem defende com Destreza rola N dados a menos. Saturante antigo = Abrangente 2; armas usam Abrangente 1. |
| Esmagador N **(nome provisório)** | Quem defende com Força (bloqueio) rola N dados a menos. |
| Perfurante | Ignora Blindado. |
| Letal | Vigor −1 na comparação de agravante (mín. 1). |
| Resistente | Vigor +1 na comparação de agravante. Não acumula. Anula Letal. |
| Sortudo | Re-rola o primeiro 1 ou 2 do teste. |
| Blindado | Dados de ataque precisam de 7+. |
| Veloz | Prioridade +1 (rótulo; iniciativa ainda não existe no motor). |
| Prioridade -1 / Atrasada 1 | Rótulos. |
| Pesado | Ataque precisa de 7+; não acumula com Blindado; a arma causa 2 ferimentos. **Pendente**: ambos seguem o Vigor (provisório) ou 1 agravante + 1 superficial. |
| Queimadura N | Com >= 1 sucesso líquido: N d10 extras a 8+ (9+ vs Blindado; Perfurante ignora), sem defesa, superficiais; agravante se os sucessos da queimadura >= Vigor. Só na hora. |
| Envenenamento N | Com >= 1 sucesso líquido: N dados a 7+ (ignora defesa e Blindado). Se houver >= 1 sucesso, exatamente 1 superficial. Limite por alvo = maior N recebido; zera na cura ou descanso longo. |
| Carga N | Cada sucesso líquido deixa 1 carga. Ao atingir N (o N do ataque que acabou de carregar) descarrega N dados a 6+, sem defesa, cada sucesso = 1 ferimento (agravante se >= Vigor). Cargas persistem até a descarga ou descanso longo. Quem pôs a última faz a descarga. |
| Drenante | Com >= 1 sucesso líquido: alvo perde 1 mana, atacante recupera 1 mana gasta (nunca uma quebrada). Alvo sem mana: atacante recupera mesmo assim **(provisório)**. |
| Contínuo X | Futuro. Não implementar. |

Em espera (não implementar): Lento N, Repulsivo, Corrosivo, Azarado.

## 6. Tipos de arma

Catálogo de tipos genéricos. No site o jogador escolhe o tipo e digita o nome da arma. Descritor 1 vale para qualquer um; Descritor 2 só com perícia no tipo (a disciplina de perícia ainda não existe; usar um campo "tem perícia" manual **(provisório)**).

| Tipo | Desc. 1 | Desc. 2 | Alcance | Extra |
|---|---|---|---|---|
| Lâmina curta | Letal | Veloz | mesma zona | |
| Lâmina | Letal | Sortudo | mesma zona | |
| Lâmina perfurante | Letal | Perfurante | mesma zona | |
| Lâmina pesada | Letal | Esmagador 1 | mesma zona | Pesado, 2 ferimentos |
| Contundente leve | Esmagador 1 | Veloz | mesma zona | 1 superficial |
| Contundente | Esmagador 1 | Sortudo | mesma zona | |
| Contundente pesado | Esmagador 2 | Perfurante | mesma zona | Pesado, 2 ferimentos |
| Contundente de punho | Veloz | Esmagador 1 | mesma zona | 1 superficial |
| Haste | Perfurante | Sortudo | até 1 zona | |
| Haste pesada | Letal | Perfurante | até 1 zona | Pesado, 2 ferimentos |
| Arma de fogo curta | Veloz | Sortudo | até 1 zona | |
| Arma de fogo longa | Perfurante | Sortudo | longo | Pesado, 2 ferimentos |
| Arma de fogo de dispersão | Abrangente 1 | Em área | até 1 zona | |
| Arma de arco | Perfurante | Sortudo | longo | |
| Arma de mecanismo | Perfurante | Letal | longo | Pesado, 2 ferimentos |
| Arma de arremesso | Veloz | Sortudo | até 1 zona | 1 superficial |
| Arma flexível | Abrangente 1 | Veloz | mesma zona | |

Alcance: mesma zona, até 1 zona, longo. Sem regra de munição. Perícias provisórias: Lâminas, Contundentes, Hastes, Armas de fogo, Distância, Flexíveis. Fonte: `armas.xlsx`.

## 7. Decisões abertas

1. Pesado: os 2 ferimentos seguem o Vigor ou 1 agravante + 1 superficial.
2. Nomes finais de Abrangente e Esmagador.
3. Terceiro tipo de defesa (Resistir com Vigor, sem penalidade).
4. Perícia de arma por tipo, família ou arma; Armas de Fogo vira "Armas à distância"; armas invocadas contam como perícia.
5. Ofício Invocação.
6. Lento, Repulsivo, Corrosivo, Azarado; Contínuo X.
7. Casos de borda de Carga N; Drenante sem mana no alvo.
8. Revisão de todas as magias e armas; revisão das passivas.
9. Iniciativa/prioridade no motor; efeitos de crítico.
