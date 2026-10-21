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

- **SP quebrado** (21/10): funciona como a mana quebrada, mas só se recupera no descanso longo. Equipar um item que quebra SP já consome o SP, mesmo que o item não seja ativado.

## 4. Ofícios mágicos

Cada disciplina de ofício conta como 1 ofício. Até 3 disciplinas, 3 habilidades ativas cada; humano com Vaga de Disciplina tem um quarto espaço. As 8 Escolas de Magia viram ofícios; as demais disciplinas estão em aberto.

| Ofício | Resumo |
|---|---|
| Magias de guerra | 12 magias ofensivas + Chama Mágica, Descarga Elétrica, Dreno de Mana, círculo mágico, Conduíte, Sensor. O antigo Saturante virou Preciso 2. |
| Encantamentos | Conduíte, Lâmina Letal, Ponta Perfurante, Golpe Preciso, Pele Encantada, Encantamento Flamejante, Sorte Encantada, Encantamento Elétrico, Encantamento Drenante, círculo mágico. |
| Alquimia | Itens preparados (ver 4.1). |
| Constructo | Golem Guardião, Torre de Mana, Armadilha Rúnica, Arma Viva, Armadura Animada, Servo Familiar, Torre Elétrica, Conduíte. |
| Habilidades conjuntas | Círculo mágico, Frasco Armazenado, Frasco Rúnico, Poção Encantada, Bomba de Guerra, Encantamento Venenoso. Exigem mais de um ofício. |
| Invocação | Decidido em 21/10: ofício separado de Encantamentos e Constructo. Invoca armas espectrais (ver 4.3). Habilidades ainda em proposta (aba "Invocação" do Excel). |

Fonte dos textos de cada habilidade: `oficios-por-aba.xlsx` (uma aba por ofício, mais "Todos os descritores" e "Descritores novos"). Carregar de lá para `data/magias.js`.

**Conduíte mágico**: existe em todo ofício, ocupa 1 dos 3 espaços, conta +1 ofício. Só um Conduíte funciona por vez. O descritor Potente ofício mágico (armadura) soma com o Conduíte.

### 4.1 Alquimia
- Itens são preparados: quebram 1 mana, só fora de combate. 1 item grátis por nível de ofício mágico. Duram até ser usados ou até o descanso longo.
- Qualquer um usa o item, com os parâmetros de quem criou. Rolagem: Destreza + (ofícios OU Inteligência), sem Base mágica nem mana extra.
- Exemplos: bombas que simulam magia de guerra (um pouco piores); poção que cura 1 ferimento superficial (uma vez por pessoa por descanso longo); bomba incendiária (Queimadura 3 em área, 1 mana quebrada, não causa superficial além da queimadura); Frasco de Gosma (prioridade -1 na cena); Ácido Corrosivo (lembrar: interagir com armaduras quando existirem).

### 4.2 Constructo
- Quebra 2 mana; quando destruído só 1 volta. Age só quando o dono manda.
- Pool: Base mágica (2d10, sem mana extra) + nº de ofícios do dono.
- Magias feitas por ele custam 1 MP a menos (custo 1 sai de graça).
- Cada constructo tem no mínimo 2 funções e uma magia única.

### 4.3 Invocação (decidido em 21/10)
- Ofício próprio, conta como 1 ofício mágico. Habilidades na aba "Invocação" de `oficios-por-aba.xlsx` (propostas, a revisar).
- Armas invocadas duram enquanto a mana estiver quebrada e são um pouco melhores que as normais (+1 de ajuste de acerto **(provisório)**).
- Arma invocada NÃO dá perícia: só vale o Descritor 1 do tipo. O encantamento **Perícia Encantada** (em Encantamentos) dá perícia no tipo de arma à escolha. Isso permite combinar Invocação com Encantamentos, ou um artista marcial com o ofício de Invocação.
- Ataque com arma invocada: Força ou Destreza + (Base mágica ou nº de ofícios mágicos) ou + (Armas de Fogo ou Combate Corpo a Corpo), conforme a arma **(provisório: confirmar se o jogador escolhe entre as duas formas)**.

## 5. Descritores (glossário único)

| Descritor | Regra |
|---|---|
| Magia | Marca o ataque como mágico. |
| Em área | Atinge todos da zona. |
| Preciso N | Quem defende com Destreza rola N dados a menos. Saturante antigo = Preciso 2; armas usam Preciso 1. |
| Esmagador N | Quem defende com Força (bloqueio) rola N dados a menos. |
| Perfurante | Ignora Blindado. |
| Letal | Vigor −1 na comparação de agravante (mín. 1). |
| Resistente | Vigor +1 na comparação de agravante. Não acumula. Anula Letal. |
| Sortudo | Re-rola o primeiro 1 ou 2 do teste. |
| Blindado | Dados de ataque precisam de 7+. |
| Veloz | Prioridade +1 (rótulo; iniciativa ainda não existe no motor). |
| Prioridade -1 / Atrasada 1 | Rótulos. |
| Pesado | Ataque precisa de 7+; não acumula com Blindado; a arma causa 2 ferimentos. Os dois ferimentos seguem o Vigor: ambos agravantes ou ambos superficiais (decidido em 21/10). |
| Queimadura N | Com >= 1 sucesso líquido: N d10 extras a 8+ (9+ vs Blindado; Perfurante ignora), sem defesa, superficiais; agravante se os sucessos da queimadura >= Vigor. Só na hora. |
| Envenenamento N | Com >= 1 sucesso líquido: N dados a 7+ (ignora defesa e Blindado). Se houver >= 1 sucesso, exatamente 1 superficial. Limite por alvo = maior N recebido; zera na cura ou descanso longo. |
| Carga N | Cada sucesso líquido deixa 1 carga. Ao atingir N (o N do ataque que acabou de carregar) descarrega N dados a 6+, sem defesa, cada sucesso = 1 ferimento (agravante se >= Vigor). Cargas persistem até a descarga ou descanso longo. Quem pôs a última faz a descarga. |
| Drenante | Com >= 1 sucesso líquido: alvo perde 1 mana, atacante recupera 1 mana gasta (nunca uma quebrada). Alvo sem mana: o atacante não recupera nada (decidido em 21/10). |
| Contínuo X | Futuro. Não implementar. |

Em espera (não implementar): Lento N, Repulsivo, Corrosivo, Azarado.

## 6. Tipos de arma

Catálogo de tipos genéricos. A perícia é por família (decidido em 21/10). No site o jogador escolhe o tipo e digita o nome da arma. Descritor 1 vale para qualquer um; Descritor 2 só com perícia no tipo (a disciplina de perícia ainda não existe; usar um campo "tem perícia" manual **(provisório)**).

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
| Arma de fogo de dispersão | Preciso 1 | Em área | até 1 zona | |
| Arma de arco | Preciso 1 | Sortudo | longo | |
| Arma de mecanismo | Perfurante | Letal | longo | |
| Arma de arremesso | Veloz | Sortudo | até 1 zona | 1 superficial |
| Arma flexível | Preciso 1 | Veloz | mesma zona | |

Alcance: mesma zona, até 1 zona, longo (longo alcança qualquer zona da cena, sem penalidade). Sem regra de munição (interpretativo). Perícias por família, em disciplinas separadas: Lâminas, Contundentes, Hastes, Armas de fogo, Distância (arco, mecanismo, arremesso), Flexíveis. Defesa: só esquivar (Destreza) ou bloquear (Força); o defensor escolhe, então só uma penalidade (Preciso ou Esmagador) se aplica. Não existe terceiro tipo de defesa. Fonte: `armas.xlsx`.

## 7. Armaduras (21/10)

Fonte: `armaduras.xlsx`. Dados em arquivo editável (ex.: data/armaduras.js), no mesmo padrão do catálogo de armas.

### 7.1 Regras
- Catálogo de tipos genéricos de armadura; no site a pessoa escolhe o tipo e digita o nome (21/10).
- Cada armadura tem os descritores listados (pode ter mais de um) e um bônus de Defesa em dados; onde não há bônus, vale 0 (21/10).
- Pesado em armadura dá Lento 1: 1 dado a menos em ações físicas (ataque físico e esquiva).
- Sem a perícia da família, a pessoa usa a armadura normalmente, mas rola a defesa com 1 dado a menos. Famílias de perícia: Armaduras pesadas, Escudos, Armaduras de poder, Armadura mágica (as demais não exigem). As disciplinas de perícia ainda serão criadas.
- Peças ao mesmo tempo: 1 armadura, 1 escudo e 1 acessório. Hoje o único acessório é o Chifre de Mana; outros virão depois.
- SP quebrado: funciona como a mana quebrada, mas só se recupera no descanso longo. Equipar um item que quebra SP já consome o SP, mesmo que o item não seja ativado.
- Campo de Mana: só um fica ativo por vez, e não acumulam.
- Blindado da armadura e Blindado racial não acumulam.
- Potente ofício mágico soma com o Conduíte mágico. Potente Força e Potente Destreza valem para ataque e defesa.
- Raças: o Texoni e o Niosh podem usar armadura. Foi removida a frase de que o Texoni não gosta de armadura.
- Armadura animada fica em Constructo e Armadura Invocada em Invocação, fora deste catálogo.
- Lembrete: o Corrosivo (em espera) remove o Blindado até o fim da cena e interage com armaduras.
- Aberto: outros tipos de acessório além do Chifre de Mana.

### 7.2 Descritores defensivos novos
| Descritor | Regra |
|---|---|
| Firme N | Só ao bloquear (Força + Defesa). Tira N dados da sua rolagem de defesa e considera N sucessos como garantidos. Os sucessos garantidos somam aos da defesa em cada ataque bloqueado. |
| Selado N | O Drenante não funciona contra você: você não perde mana e o atacante não recupera. A Queimadura e o Envenenamento contra você rolam N dados a menos. |
| Lento N | Você rola N dados a menos em ações físicas (ataque físico e esquiva). Em armadura, é o efeito do Pesado: o portador ganha Lento 1. |
| Campo de Mana | Ativo, quebra 1 mana. O primeiro ferimento agravante que você receberia (de ataque, magia ou Queimadura) vira superficial, e o campo se desativa: a mana quebrada passa a gasta (volta no fim da cena). Para reativar, quebre uma nova mana como ação. Só um Campo de Mana fica ativo por vez; não acumulam. |
| Potente Força | Aumenta a Força do usuário em 1 grau, até C. Vale para ataque e defesa, como um atributo normal, enquanto a armadura está equipada e ativa. |
| Potente Destreza | Aumenta a Destreza do usuário em 1 grau, até C. Vale para ataque e defesa. |
| Potente ofício mágico | Conta como 1 ponto de ofício mágico. Soma com o Conduíte mágico. |

Resistente e Blindado seguem como na seção 5. Removidos: Reforçado, Ágil, Isolante, Ignífugo, Hermético. O Lento N agora existe (era "em espera").

### 7.3 Catálogo
| Tipo | Família | Defesa | Descritores | Extra | Custo | Perícia |
|---|---|---|---|---|---|---|
| Vestimenta reforçada | Leve | +1 | Resistente | — | — | — |
| Armadura leve | Leve | 0 | Resistente | — | — | — |
| Armadura média | Média | 0 | Resistente, Blindado | — | — | — |
| Armadura de placas completa | Pesada | 0 | Resistente, Blindado | Pesado (Lento 1). 1 sucesso garantido em qualquer defesa (esquiva e bloqueio); rola defesa com 1 dado a menos. | — | Armaduras pesadas |
| Escudo leve | Escudo | 0 | Firme 1 | Só ao bloquear: rola defesa de Força com 1 dado a menos e 1 sucesso garantido. | — | Escudos |
| Armadura de poder base (power armor) | Tecnologia | 0 | Resistente, Potente Força | Pesado (Lento 1) | Quebra 1 SP ao equipar | Armaduras de poder |
| Exoesqueleto | Tecnologia | 0 | Resistente, Potente Destreza | Pesado (Lento 1) | Quebra 1 SP ao equipar | Armaduras de poder |
| Armadura catalisadora (power armor) | Tecnologia | 0 | Resistente, Potente ofício mágico | Pesado (Lento 1) | Quebra 1 SP ao equipar | Armaduras de poder |
| Vestimenta rúnica | Mágica | +1 | Selado 1 | — | Quebra 1 SP ao equipar | Armadura mágica |
| Armadura de mana | Mágica | +1 | Campo de Mana | — | 1 mana quebrada (ativa) e quebra 1 SP ao equipar | Armadura mágica |
| Escudo de mana | Mágica | 0 | Firme 2 | Só ao bloquear: rola defesa de Força com 2 dados a menos e 2 sucessos garantidos. | 1 mana quebrada (ativo) e quebra 1 SP ao equipar | Armadura mágica |
| Chifre de Mana | Acessório mágico | 0 (não protege) | Campo de Mana | — | 1 mana quebrada (ativo) | — |

## 8. Decisões abertas

1. Com qual proficiência de ataque rolam o arco, o mecanismo e o arremesso (armas à distância são separadas das armas de fogo)?
2. Arma invocada: o jogador escolhe entre a forma mágica (Base mágica ou ofícios) e a forma de proficiência (Armas de Fogo ou Combate Corpo a Corpo)?
3. Habilidades do ofício Invocação (proposta na aba "Invocação").
4. Lento, Repulsivo, Corrosivo, Azarado; Contínuo X.
5. Casos de borda de Carga N.
6. Outros tipos de acessório além do Chifre de Mana; disciplinas de perícia de armadura.
7. Revisão de todas as magias e armas; revisão das passivas.
8. Iniciativa/prioridade no motor; efeitos de crítico.
