# Atualização 23/10 — Ofícios mágicos e descritores

Documento para o Claude Code. Complementa o ATUALIZACAO_21-10.md: em caso de conflito, vale este. Fonte de dados: `descritores.json` (versão 23/10) e este texto. Ofícios mágicos apenas; disciplinas marciais, Maestria de Armas e as raças de Dragonato e Tengou não entram.

## 1. Regras gerais

- **Acúmulo de descritores (23/10).** Queimadura, Envenenamento e Carga de fontes diferentes SOMAM os N. Preciso e Lento: vale só o maior N. Blindado, Firme, Campo de Mana, Resistente e Reabastecer não acumulam (vale um só). Esmagador ainda não foi decidido (sugestão: como o Preciso, vale o maior).
- **Proficiências e passivas (23/10).** Cada ofício dá 3 proficiências (+1 grau cada) e 1 passiva própria. Os bônus de disciplinas diferentes somam até o teto C. Conduíte e Magia Inata não dão proficiências. Detalhes na aba Proficiências e passivas.
- **Sensor.** Qualquer ofício pode pegar Sensor: 1 MP, marca 1 pessoa, dura até o descanso longo, ocupa 1 dos 3 espaços do ofício. Não precisa ser compartilhada.
- **Duplicatas.** Duplicatas entre ofícios são permitidas. A mesma habilidade pode existir em mais de um ofício, com custo e texto adaptados. Círculo mágico só vale com os dois ofícios e fica em Habilidades conjuntas.
- **SP quebrado nos encantamentos.** Encantamentos fortes (Resistente, Potente Força, Potente Destreza, Selado, Sortudo, Drenante) quebram 1 mana e 1 SP. SP quebrado só volta no descanso longo (provisório).
- **Iniciativa.** A iniciativa existe, mas não é acompanhada no sistema. Veloz, Prioridade -1 e Atrasada continuam só como etiqueta.
- **Corrosivo.** Definido em 23/10: remove o Blindado do alvo e cancela os efeitos (descritores) da armadura até o fim da cena.
- **Em espera.** Repulsivo e Contínuo seguem em espera. Habilidades que dependem deles ficaram de fora.

## 2. Descritores

- Corrosivo passou a Definido: remove o Blindado do alvo e cancela os descritores da armadura até o fim da cena.
- Acúmulo: Queimadura, Envenenamento e Carga somam os N de fontes diferentes; Preciso e Lento valem o maior N; Blindado, Firme, Campo de Mana, Resistente e Reabastecer não acumulam.
- Repulsivo e Contínuo seguem em espera.
- Use o `descritores.json` desta pasta (substitui o de 21/10): regras, onde aparece e acúmulo atualizados.

## 2b. Proficiências e passivas dos ofícios (23/10)

Cada ofício dá 3 proficiências (+1 grau cada) e 1 passiva própria. Os bônus de disciplinas diferentes somam até o teto C. Conduíte e Magia Inata não dão proficiências.

### Magias de guerra
- **Proficiências:** Magias Gerais, Política, Tecnologia (+1 grau cada)
- **Passiva:** A primeira magia que a pessoa lança em um combate custa 1 MP a menos (mínimo 0). Vale para qualquer magia, de qualquer ofício. Combate não é o mesmo que cena.

### Encantamentos
- **Proficiências:** Magias Gerais, Ofício, Investigação (+1 grau cada)
- **Passiva:** A cada descanso longo, escolhe uma proficiência (qualquer uma, inclusive de Combate) e ganha +1 grau nela até o próximo descanso longo, respeitando o teto C.

### Alquimia
- **Proficiências:** Medicina, Ofício, Acadêmicos (+1 grau cada)
- **Passiva:** No descanso longo, prepara habilidades de Alquimia (poções, bombas e qualquer outro item) em quantidade igual à Inteligência ou ao número de ofícios (o que for maior). Os itens preparados assim não quebram mana, e podem ser de qualquer habilidade de Alquimia, não só das equipadas. Substitui a regra antiga de preparar de graça 1 item por ofício.

### Constructo
- **Proficiências:** Tecnologia, Ofício, Liderança (+1 grau cada)
- **Passiva:** Já começa com um constructo acompanhando a pessoa (à escolha), sem quebrar mana. Se for destruído, só volta no descanso longo.

### Invocação
- **Proficiências:** Magias Gerais, Atletismo, Percepção (+1 grau cada)
- **Passiva:** Ganha +1 grau em Combate Corpo a Corpo (teto C), sempre, não só com armas invocadas.

## 3. Magias de guerra

Ficam 12 magias, Sensor e Conduíte. Saíram: Chama Mágica (vai para Invocação), Dreno de Mana (vai para Encantamentos), Círculo mágico (só em Habilidades conjuntas).

### Bombardeio de Mana
- **Tipo:** Ataque
- **Descritores:** Magia, Em área, Preciso 2
- **Custo:** 2 MP
- **Ferimentos:** 1
- **O que faz:** Projéteis de mana sobem ao céu e caem sobre uma região inteira. Se o defensor usar Destreza como base da defesa, rola 2 dados a menos. Aliados na zona também são atingidos.

### Escudo de Mana
- **Tipo:** Defesa
- **Descritores:** Blindado
- **Custo:** 1 MP
- **Ferimentos:** —
- **O que faz:** Sem rolagem. O conjurador ganha Blindado por uma cena. +1 MP estende a um aliado. Blindado não acumula com outras fontes.

### Shin
- **Tipo:** Ataque
- **Descritores:** Magia, Em área, Esmagador 1
- **Custo:** 1 MP
- **Ferimentos:** 1 superficial
- **O que faz:** Explosão contundente de mana, como um campo de força que se expande do usuário. Baixo dano e alto impacto, na zona do usuário. Quem bloqueia (Força) rola 1 dado a menos.

### Mísseis Mágicos
- **Tipo:** Ataque
- **Descritores:** Magia, Preciso 2, Sortudo
- **Custo:** 1 MP
- **Ferimentos:** 1 superficial
- **O que faz:** Magia focada em acerto e precisão.

### Laser Mágico
- **Tipo:** Ataque
- **Descritores:** Magia, Perfurante
- **Custo:** 2 MP
- **Ferimentos:** 1
- **O que faz:** Magia focada em perfuração e em combater barreiras.

### Torrente Mágica
- **Tipo:** Ataque
- **Descritores:** Magia, Letal, Pesado
- **Custo:** 2 MP
- **Ferimentos:** 2 (Pesado)
- **O que faz:** Rajada de mana concentrada, feita para causar mais dano. Pesado: os dados de ataque precisam de 7+ e o ataque causa 2 ferimentos, seguindo o Vigor.

### Tiro mágico
- **Tipo:** Ataque
- **Descritores:** Magia
- **Custo:** 1 MP
- **Ferimentos:** 1
- **O que faz:** Tiro de mana concentrada. É a magia de referência: sem descritor extra.

### Shin-kay
- **Tipo:** Ataque
- **Descritores:** Magia, Letal, Esmagador 1
- **Custo:** 2 MP
- **Ferimentos:** 1
- **O que faz:** Shin concentrado em uma esfera arremessável.

### Magia de guerra Suth
- **Tipo:** Ataque
- **Descritores:** Magia, Preciso 2, Sortudo
- **Custo:** 2 MP
- **Ferimentos:** 1
- **O que faz:** Apoio a ataques físicos: cria duas esferas de mana que perseguem o inimigo. (O Atrasada 1 saiu: a iniciativa não é acompanhada.)

### Magia de guerra Maxis
- **Tipo:** Ataque
- **Descritores:** Magia, Em área, Lento 1
- **Custo:** 2 MP
- **Ferimentos:** 2 superficiais
- **O que faz:** Criada em Maxis para contenção de população; atinge uma zona inteira. Quem sofrer sucesso líquido fica Lento 1 até o fim do próximo turno dele.

### Magia de guerra Katalão
- **Tipo:** Ataque
- **Descritores:** Magia, Perfurante, Letal
- **Custo:** 3 MP
- **Ferimentos:** 1
- **O que faz:** Laser maleável criado por Katalão.

### Descarga Elétrica
- **Tipo:** Ataque
- **Descritores:** Magia, Carga 2
- **Custo:** 2 MP
- **Ferimentos:** 1 superficial
- **O que faz:** Raio que carrega o alvo. Cada sucesso líquido deixa 1 carga; ao chegar a 2, o alvo descarrega um ataque extra de 2 dados.

### Sensor
- **Tipo:** Utilidade
- **Descritores:** Magia
- **Custo:** 1 MP
- **Ferimentos:** —
- **O que faz:** Marca 1 pessoa numa rede de visão: você sabe onde ela está. Dura até o descanso longo. Qualquer ofício pode pegar esta habilidade (ocupa 1 dos 3 espaços do ofício).

### Conduíte mágico
- **Tipo:** Passiva
- **Descritores:** Conta como +1 ofício mágico
- **Custo:** — (ocupa 1 slot)
- **Ferimentos:** —
- **O que faz:** Ocupa 1 dos 3 slots de habilidade do ofício. Equipado, soma +1 ofício mágico no pool de ataque mágico e na recuperação de mana. Não é magia e não custa MP. Todo ofício pode ter um, mas só um Conduíte funciona por vez.

## 4. Encantamentos

Ofício Mágico: Encantamentos — conta como 1 ofício mágico. Cada encantamento quebra 1 mana; o descritor vale enquanto ela estiver quebrada (desquebrar só fora de combate). Vários podem ficar ativos, cada um com 1 mana quebrada a mais. Os encantamentos mais fortes (Resistente, Potente Força, Potente Destreza, Selado, Sortudo, Drenante) também quebram 1 SP: o SP só volta no descanso longo (provisório). Nomes no formato 'Encantamento: Descritor'. Vale para ataque físico e mágico, quando o descritor é de ataque. Renomeações: Lâmina Letal → Encantamento: Letal; Ponta Perfurante → Encantamento: Perfurante; Golpe Preciso → Encantamento: Preciso 1 (era Preciso 2); Pele Encantada → Encantamento: Resistente; Encantamento Flamejante → Encantamento: Queimadura 1; Sorte Encantada → Encantamento: Sortudo; Encantamento Elétrico → Encantamento: Carga 2; Encantamento Drenante → Encantamento: Drenante. Novos: Esmagador 1, Firme 1, Selado 1, Potente Força, Potente Destreza, Veloz. Sensor e Círculo mágico: ver regras gerais.

### Conduíte mágico
- **Tipo:** Passiva
- **Descritores:** Conta como +1 ofício mágico
- **Custo:** — (ocupa 1 slot)
- **Ferimentos:** —
- **O que faz:** Ocupa 1 dos 3 slots de habilidade do ofício. Equipado, soma +1 ofício mágico no pool de ataque mágico e na recuperação de mana. Não é magia e não custa MP. Todo ofício pode ter um, mas só um Conduíte funciona por vez.

### Encantamento: Letal
- **Tipo:** Encantamento
- **Descritores:** Os ataques do usuário ganham Letal
- **Custo:** 1 mana quebrada
- **Ferimentos:** —
- **O que faz:** Enquanto a mana estiver quebrada. Vale para ataque físico e mágico.

### Encantamento: Perfurante
- **Tipo:** Encantamento
- **Descritores:** Os ataques do usuário ganham Perfurante
- **Custo:** 1 mana quebrada
- **Ferimentos:** —
- **O que faz:** Enquanto a mana estiver quebrada. Vale para ataque físico e mágico.

### Encantamento: Preciso 1
- **Tipo:** Encantamento
- **Descritores:** Os ataques do usuário ganham Preciso 1
- **Custo:** 1 mana quebrada
- **Ferimentos:** —
- **O que faz:** Enquanto a mana estiver quebrada. Vale para ataque físico e mágico.

### Encantamento: Esmagador 1
- **Tipo:** Encantamento
- **Descritores:** Os ataques do usuário ganham Esmagador 1
- **Custo:** 1 mana quebrada
- **Ferimentos:** —
- **O que faz:** Enquanto a mana estiver quebrada. Vale para ataque físico e mágico.

### Encantamento: Queimadura 1
- **Tipo:** Encantamento
- **Descritores:** Os ataques do usuário ganham Queimadura 1
- **Custo:** 1 mana quebrada
- **Ferimentos:** —
- **O que faz:** Enquanto a mana estiver quebrada. Vale para ataque físico e mágico. Se o ataque causar ao menos 1 sucesso líquido, rola 1 dado de Queimadura.

### Encantamento: Carga 2
- **Tipo:** Encantamento
- **Descritores:** Os ataques do usuário ganham Carga 2
- **Custo:** 1 mana quebrada
- **Ferimentos:** —
- **O que faz:** Enquanto a mana estiver quebrada. Vale para ataque físico e mágico.

### Encantamento: Drenante
- **Tipo:** Encantamento
- **Descritores:** Os ataques do usuário ganham Drenante
- **Custo:** 1 mana quebrada + 1 SP quebrado
- **Ferimentos:** —
- **O que faz:** Enquanto a mana estiver quebrada. Vale para ataque físico e mágico.

### Encantamento: Sortudo
- **Tipo:** Encantamento
- **Descritores:** O usuário ganha Sortudo
- **Custo:** 1 mana quebrada + 1 SP quebrado
- **Ferimentos:** —
- **O que faz:** Enquanto a mana estiver quebrada.

### Encantamento: Resistente
- **Tipo:** Encantamento
- **Descritores:** O usuário ganha Resistente
- **Custo:** 1 mana quebrada + 1 SP quebrado
- **Ferimentos:** —
- **O que faz:** Enquanto a mana estiver quebrada. Não acumula com Resistente de outra fonte.

### Encantamento: Firme 1
- **Tipo:** Encantamento
- **Descritores:** O usuário ganha Firme 1
- **Custo:** 1 mana quebrada
- **Ferimentos:** —
- **O que faz:** Enquanto a mana estiver quebrada. Só vale ao bloquear (Força + Defesa).

### Encantamento: Selado 1
- **Tipo:** Encantamento
- **Descritores:** O usuário ganha Selado 1
- **Custo:** 1 mana quebrada + 1 SP quebrado
- **Ferimentos:** —
- **O que faz:** Enquanto a mana estiver quebrada.

### Encantamento: Potente Força
- **Tipo:** Encantamento
- **Descritores:** O usuário ganha Potente Força (+1 grau em Força, até C)
- **Custo:** 1 mana quebrada + 1 SP quebrado
- **Ferimentos:** —
- **O que faz:** Enquanto a mana estiver quebrada.

### Encantamento: Potente Destreza
- **Tipo:** Encantamento
- **Descritores:** O usuário ganha Potente Destreza (+1 grau em Destreza, até C)
- **Custo:** 1 mana quebrada + 1 SP quebrado
- **Ferimentos:** —
- **O que faz:** Enquanto a mana estiver quebrada.

### Encantamento: Veloz
- **Tipo:** Encantamento
- **Descritores:** O usuário ganha Veloz
- **Custo:** 1 mana quebrada
- **Ferimentos:** —
- **O que faz:** Enquanto a mana estiver quebrada. Veloz é etiqueta: a iniciativa existe mas não é acompanhada no sistema.

### Dreno de Mana
- **Tipo:** Ataque
- **Descritores:** Magia, Drenante
- **Custo:** 1 MP
- **Ferimentos:** 1 superficial
- **O que faz:** Ataque que cria, por um instante, um encantamento no alvo que o drena: se acertar, o alvo perde 1 mana e o conjurador recupera 1. O encantamento dura só aquele ataque. Só exige o ofício Encantamentos.

### Perícia Encantada
- **Tipo:** Encantamento
- **Descritores:** Dá perícia no tipo de arma à escolha
- **Custo:** 1 mana quebrada
- **Ferimentos:** —
- **O que faz:** Enquanto a mana estiver quebrada, o alvo usa o Descritor 2 de um tipo de arma à sua escolha, como se tivesse a perícia da família. Permite combinar Invocação + Encantamentos (um mago de invocação).

### Sensor
- **Tipo:** Utilidade
- **Descritores:** Magia
- **Custo:** 1 MP
- **Ferimentos:** —
- **O que faz:** Marca 1 pessoa numa rede de visão: você sabe onde ela está. Dura até o descanso longo. Qualquer ofício pode pegar esta habilidade (ocupa 1 dos 3 espaços do ofício).

## 5. Alquimia

Ofício Mágico: Alquimia — conta como 1 ofício mágico. Itens alquímicos são PREPARADOS, só fora de combate: preparar quebra 1 mana (a mana fica quebrada enquanto o item existir; usar o item não custa MP). A passiva do ofício (23/10) substitui a antiga regra de 1 item grátis por ofício: no descanso longo, prepara qualquer habilidade de Alquimia sem quebrar mana, em quantidade igual à Inteligência ou aos ofícios (o maior). Itens preparados fora dessa cota quebram 1 mana, como antes. Itens prontos valem até serem usados ou até o próximo descanso longo, quando perdem a validade. Poções, tônicos e bombas podem ser usados por qualquer pessoa, com os parâmetros de quem os criou. Criações que rolam (bombas) usam Destreza + (ofícios mágicos OU Inteligência), sem Base mágica nem mana extra. Regra de desenho: no máximo 1 mana quebrada por habilidade. Efeitos que dependem de dois ofícios ficam em Habilidades conjuntas. Saiu: Antídoto (apagado). Elixir Drenante foi para Habilidades conjuntas.

### Poção de Cura
- **Tipo:** Suporte
- **Descritores:** —
- **Custo:** 1 mana quebrada
- **Ferimentos:** —
- **O que faz:** Quem bebe cura 1 ferimento superficial (ferida leve). Cada pessoa só pode usar uma vez por descanso longo, não importa quantas poções existam.

### Bomba Incendiária
- **Tipo:** Ataque
- **Descritores:** Magia, Em área, Queimadura 3
- **Custo:** 1 mana quebrada
- **Ferimentos:** — (só Queimadura)
- **O que faz:** Explode na zona alvo. Rola o ataque; se causar ao menos 1 sucesso líquido, não há ferimento do ataque e rola 3 dados de Queimadura (8+). Aliados na zona também são atingidos.

### Bomba Estilhaço
- **Tipo:** Ataque
- **Descritores:** Magia
- **Custo:** 1 mana quebrada
- **Ferimentos:** 1 superficial
- **O que faz:** Versão pior do Tiro mágico: a bomba estilhaça e perde força (ferimento sempre superficial).

### Bomba de Impacto
- **Tipo:** Ataque
- **Descritores:** Magia, Em área, Preciso 2
- **Custo:** 1 mana quebrada
- **Ferimentos:** 1 superficial
- **O que faz:** Onda de choque na zona alvo (não na do usuário). Aliados na zona também são atingidos.

### Bomba de Fragmentação
- **Tipo:** Ataque
- **Descritores:** Magia, Em área
- **Custo:** 1 mana quebrada
- **Ferimentos:** 1
- **O que faz:** Versão pior do Bombardeio de Mana: atinge a zona alvo, mas sem Preciso.

### Bomba Perfurante
- **Tipo:** Ataque
- **Descritores:** Magia, Perfurante
- **Custo:** 1 mana quebrada
- **Ferimentos:** 1 superficial
- **O que faz:** Versão pior do Laser Mágico: ignora Blindado, mas o ferimento é sempre superficial.

### Bomba Pesada
- **Tipo:** Ataque
- **Descritores:** Magia, Letal
- **Custo:** 1 mana quebrada
- **Ferimentos:** 1
- **O que faz:** Mesmo descritor Letal da Torrente Mágica, mas 1 ferimento em vez de 2 e sem o Pesado.

### Bomba de Fumaça
- **Tipo:** Suporte
- **Descritores:** Azarado
- **Custo:** 1 mana quebrada
- **Ferimentos:** —
- **O que faz:** Sem rolagem. A zona alvo fica encoberta por uma cena: quem atacar ou testar contra alguém na zona fica Azarado (re-rola o primeiro sucesso).

### Tônico Veloz
- **Tipo:** Suporte
- **Descritores:** Veloz
- **Custo:** 1 mana quebrada
- **Ferimentos:** —
- **O que faz:** Sem rolagem. Quem bebe ganha Veloz por uma cena. Qualquer pessoa pode usar, com os parâmetros de quem criou.

### Elixir de Mana
- **Tipo:** Suporte
- **Descritores:** Reabastecer
- **Custo:** 1 mana quebrada
- **Ferimentos:** —
- **O que faz:** Sem rolagem. Quem bebe recupera 1 MP gasto (não quebrado) e ganha Reabastecer por uma cena. Reabastecer de fontes diferentes não soma: vale um só. Uma vez por cena por pessoa.

### Óleo Inflamável
- **Tipo:** Suporte
- **Descritores:** Queimadura 1
- **Custo:** 1 mana quebrada
- **Ferimentos:** —
- **O que faz:** Sem rolagem. Usado em uma arma (própria ou de aliado), dá Queimadura 1 à arma durante a cena. Usado em um alvo, a próxima Queimadura que ele receber rola +2 dados (vale até essa Queimadura ou o fim da cena).

### Ácido Corrosivo
- **Tipo:** Suporte
- **Descritores:** Corrosivo
- **Custo:** 1 mana quebrada
- **Ferimentos:** —
- **O que faz:** Sem rolagem. Um alvo perde o Blindado e tem os efeitos (descritores) da armadura cancelados até o fim da cena (Goethiano inclusive). Pool do arremesso, se precisar acertar: Destreza + (ofícios ou Inteligência).

### Frasco de Gosma
- **Tipo:** Suporte
- **Descritores:** Em área, Lento 1
- **Custo:** 1 mana quebrada
- **Ferimentos:** —
- **O que faz:** Sem dano. Quem estiver na zona alvo fica Lento 1 durante a cena.

### Catalisador
- **Tipo:** Suporte
- **Descritores:** —
- **Custo:** 1 mana quebrada
- **Ferimentos:** —
- **O que faz:** Sem rolagem. A próxima magia do alvo custa 1 MP a menos (mínimo 0) e rola 1d10 a mais. Não vale para itens e constructos.

### Elixir de Vigor
- **Tipo:** Suporte
- **Descritores:** Resistente
- **Custo:** 1 mana quebrada
- **Ferimentos:** —
- **O que faz:** Sem rolagem. Quem bebe ganha Resistente por uma cena. Não acumula com Resistente de outra fonte.

### Bomba Tóxica
- **Tipo:** Ataque
- **Descritores:** Magia, Em área, Envenenamento 2
- **Custo:** 1 mana quebrada
- **Ferimentos:** — (só Envenenamento)
- **O que faz:** Explode na zona alvo. Rola o ataque; se causar ao menos 1 sucesso líquido, cada alvo atingido rola 2 dados de Envenenamento (7+; ignora defesa e Blindado). Com pelo menos 1 sucesso, recebe 1 ferimento superficial (limite 2). Aliados na zona também são atingidos.

### Veneno de Arma
- **Tipo:** Suporte
- **Descritores:** Envenenamento 1
- **Custo:** 1 mana quebrada
- **Ferimentos:** —
- **O que faz:** Sem rolagem. A arma do alvo (própria ou de aliado) fica com Envenenamento 1 durante a cena.

### Bomba Elétrica
- **Tipo:** Ataque
- **Descritores:** Magia, Em área, Carga 2
- **Custo:** 1 mana quebrada
- **Ferimentos:** — (só Carga)
- **O que faz:** Explode na zona alvo. Rola o ataque; cada sucesso líquido deixa 1 carga em cada alvo atingido. Ao chegar a 2 cargas, o alvo descarrega um ataque extra de 2 dados. Aliados na zona também são atingidos.

### Sensor
- **Tipo:** Utilidade
- **Descritores:** Magia
- **Custo:** 1 MP
- **Ferimentos:** —
- **O que faz:** Marca 1 pessoa numa rede de visão: você sabe onde ela está. Dura até o descanso longo. Qualquer ofício pode pegar esta habilidade (ocupa 1 dos 3 espaços do ofício).

### Conduíte mágico
- **Tipo:** Passiva
- **Descritores:** Conta como +1 ofício mágico
- **Custo:** — (ocupa 1 slot)
- **Ferimentos:** —
- **O que faz:** Ocupa 1 dos 3 slots de habilidade do ofício. Equipado, soma +1 ofício mágico no pool de ataque mágico e na recuperação de mana. Não é magia e não custa MP. Todo ofício pode ter um, mas só um Conduíte funciona por vez.

## 6. Constructo

Ofício Mágico: Constructo — conta como 1 ofício mágico. Construir quebra 2 mana (exceção à regra de 1 por habilidade) e o constructo fica com o personagem enquanto a mana estiver quebrada; dá para manter quantos constructos houver mana para quebrar, mas 2 de cada vira caro. Cada constructo tem no mínimo duas funções e uma magia única. Magias do dono feitas através do constructo custam 1 MP a menos (de 1 MP, ficam de graça). Quando um constructo é destruído, só 1 das 2 manas quebradas volta (fica disponível); a outra continua quebrada. O constructo só age quando o dono manda. Pool do constructo = Base mágica (2d10, sem mana extra, pois o constructo não gasta MP) + número de ofícios mágicos do dono (contando o Conduíte, se equipado). Sucesso em 6+, 7+ contra Blindado. Tudo provisório.

### Golem Guardião
- **Tipo:** Servo
- **Descritores:** Blindado, Resistente
- **Custo:** 2 mana quebradas
- **Ferimentos:** 1
- **O que faz:** Pool: Base mágica + ofícios do dono. Integridade: aguenta 3 ferimentos. Funções: (1) Golpe: ataque corpo a corpo, Letal, 1 ferimento; (2) Proteger: assume o ataque dirigido a um aliado na zona dele. Contínuo: Blindado e Resistente. Magia única: Muralha (1 MP; cria uma barreira na zona: ataques que a atravessam precisam de 7+).

### Torre de Mana
- **Tipo:** Torre
- **Descritores:** Magia
- **Custo:** 2 mana quebradas
- **Ferimentos:** 1 superficial
- **O que faz:** Pool: Base mágica + ofícios do dono. Fixa na zona onde foi criada. Integridade: aguenta 2 ferimentos. Funções: (1) Disparo: ataque mágico a cada turno do dono, 1 ferimento superficial; (2) Ponto de conjuração: magias do dono lançadas a partir dela custam 1 MP a menos. Contínuo: vigia a zona. Magia única: Salva da Torre (2 MP; ataque em área com Preciso 2).

### Armadilha Rúnica
- **Tipo:** Armadilha
- **Descritores:** Magia, Preciso 2
- **Custo:** 2 mana quebradas
- **Ferimentos:** 1
- **O que faz:** Pool: Base mágica + ofícios do dono. Disparo único quando um inimigo entra na zona dela; se rearma na próxima cena. Funções: (1) Disparo: ataque mágico Preciso 2, 1 ferimento; (2) Alarme: avisa o dono quando algo passa. Contínuo: marca a zona. Magia única: Rede Rúnica (1 MP; o alvo fica Lento 1 por uma rodada).

### Arma Viva
- **Tipo:** Arma criada
- **Descritores:** Letal
- **Custo:** 2 mana quebradas
- **Ferimentos:** 1
- **O que faz:** Pool: Base mágica + ofícios do dono. Arma que flutua e luta junto com o dono. Integridade: aguenta 1 ferimento. Funções: (1) Golpe: corpo a corpo ou arremesso, Letal, 1 ferimento; (2) Defesa: o dono ganha +1 dado ao se defender. Contínuo: as armas do dono ganham Letal. Magia única: Corte Conjurado (2 MP; ataque que atinge duas zonas).

### Armadura Animada
- **Tipo:** Armadura criada
- **Descritores:** Blindado, Resistente
- **Custo:** 2 mana quebradas
- **Ferimentos:** —
- **O que faz:** Pool: Base mágica + ofícios do dono. Armadura que veste o dono e ocupa o espaço de armadura dele (equivale a uma armadura média). Integridade: aguenta 3 ferimentos (absorve antes do dono). Funções: (1) Escudo: o dono ganha Blindado e Resistente; (2) Reflexo: reação 1 vez por cena, devolve ao atacante 1 sucesso líquido. Contínuo: Blindado e Resistente. Magia única: Aegis (1 MP; estende Blindado a um aliado por uma cena). Descritores não acumulam com os de outra armadura.

### Servo Familiar
- **Tipo:** Servo
- **Descritores:** Magia
- **Custo:** 2 mana quebradas
- **Ferimentos:** —
- **O que faz:** Pool: Base mágica + ofícios do dono. Criatura pequena que voa. Integridade: aguenta 1 ferimento. Funções: (1) Batedor: dá ao dono visão de outra zona; (2) Mensageiro: carrega itens e recados. Contínuo: carrega a habilidade Sensor de graça (não custa MP). Magia única: Olho do Familiar (1 MP; marca até 2 alvos numa rede de visão).

### Torre Elétrica
- **Tipo:** Torre
- **Descritores:** Magia, Carga 2
- **Custo:** 2 mana quebradas
- **Ferimentos:** 1 superficial
- **O que faz:** Pool: Base mágica + ofícios do dono. Fixa na zona onde foi criada. Integridade: aguenta 2 ferimentos. Funções: (1) Disparo carregado: ataque mágico que deixa Carga 2; (2) Ponto de conjuração: magias do dono lançadas a partir dela custam 1 MP a menos. Contínuo: vigia a zona. Magia única: Corrente Elétrica (2 MP; atinge dois alvos na zona, ambos recebem Carga 1).

### Sensor
- **Tipo:** Utilidade
- **Descritores:** Magia
- **Custo:** 1 MP
- **Ferimentos:** —
- **O que faz:** Marca 1 pessoa numa rede de visão: você sabe onde ela está. Dura até o descanso longo. Qualquer ofício pode pegar esta habilidade (ocupa 1 dos 3 espaços do ofício).

### Conduíte mágico
- **Tipo:** Passiva
- **Descritores:** Conta como +1 ofício mágico
- **Custo:** — (ocupa 1 slot)
- **Ferimentos:** —
- **O que faz:** Ocupa 1 dos 3 slots de habilidade do ofício. Equipado, soma +1 ofício mágico no pool de ataque mágico e na recuperação de mana. Não é magia e não custa MP. Todo ofício pode ter um, mas só um Conduíte funciona por vez.

## 7. Invocação

Ofício Mágico: Invocação (decidido em 21/10, separado de Encantamentos e Constructo) — conta como 1 ofício mágico. Invoca armas espectrais, que duram enquanto a mana estiver quebrada e são um pouco melhores que as normais (+1 de ajuste de acerto, provisório), e algumas magias de invocação (Chama Mágica). A arma invocada NÃO dá perícia: só vale o Descritor 1, a menos que o usuário tenha a perícia ou o encantamento Perícia Encantada. Ataque com arma invocada: Base mágica (2d10 + mana gasta acima do custo) + ofícios mágicos, sem Destreza, como um ataque mágico completo (23/10). Saíram: Arsenal Emprestado (apagado) e Retorno Espectral (embutido em Invocar Arma). Entrou: Chama Mágica.

### Invocar Arma
- **Tipo:** Invocação
- **Descritores:** Arma de um tipo do catálogo, à escolha; +1 de ajuste de acerto
- **Custo:** 1 mana quebrada
- **Ferimentos:** Os do tipo
- **O que faz:** Invoca uma arma de qualquer tipo do catálogo de armas. Dura enquanto a mana estiver quebrada. Só o Descritor 1 do tipo vale (sem perícia). O ataque usa Base mágica + ofícios mágicos (sem Destreza). Armas arremessadas voltam à mão ao fim do turno e, se forem soltas ou destruídas, podem ser re-invocadas de graça uma vez por cena.

### Lança Longínqua
- **Tipo:** Magia
- **Descritores:** Perfurante, alcance longo
- **Custo:** 1 MP
- **Ferimentos:** 1
- **O que faz:** Cria uma lança espectral e a arremessa contra qualquer zona da cena, sem penalidade. A lança desaparece depois. Ataque: Base mágica + ofícios.

### Chuva de Lâminas
- **Tipo:** Magia
- **Descritores:** Em área, Preciso 1, Letal
- **Custo:** 2 MP
- **Ferimentos:** 1 por sucesso líquido (regra normal de área)
- **O que faz:** Lâminas espectrais caem sobre uma zona. Cada alvo rola a própria defesa; aliados na zona também são atingidos.

### Chama Mágica
- **Tipo:** Ataque
- **Descritores:** Magia, Queimadura 2
- **Custo:** 1 MP
- **Ferimentos:** — (só Queimadura)
- **O que faz:** Uma chama é arremessada no alvo. Se o ataque causar ao menos 1 sucesso líquido, não há ferimento do ataque e rola 2 dados de Queimadura (8+; ignora a defesa). Veio de Magias de guerra.

### Escudo Invocado
- **Tipo:** Invocação
- **Descritores:** Firme 1
- **Custo:** 1 mana quebrada
- **Ferimentos:** —
- **O que faz:** Invoca um escudo espectral. Quem bloqueia (Força + Defesa) ganha Firme 1 enquanto a mana estiver quebrada.

### Arma de Brasa
- **Tipo:** Invocação
- **Descritores:** Queimadura 1 na arma invocada
- **Custo:** 1 mana quebrada
- **Ferimentos:** Os da arma
- **O que faz:** A arma invocada ganha Queimadura 1. Variações possíveis: Carga 2 (elétrica) ou Envenenamento 1.

### Sensor
- **Tipo:** Utilidade
- **Descritores:** Magia
- **Custo:** 1 MP
- **Ferimentos:** —
- **O que faz:** Marca 1 pessoa numa rede de visão: você sabe onde ela está. Dura até o descanso longo. Qualquer ofício pode pegar esta habilidade (ocupa 1 dos 3 espaços do ofício).

### Conduíte mágico
- **Tipo:** Passiva
- **Descritores:** Conta como +1 ofício mágico
- **Custo:** — (ocupa 1 slot)
- **Ferimentos:** —
- **O que faz:** Ocupa 1 dos 3 slots de habilidade do ofício. Equipado, soma +1 ofício mágico no pool de ataque mágico e na recuperação de mana. Não é magia e não custa MP. Todo ofício pode ter um, mas só um Conduíte funciona por vez.

## 8. Habilidades conjuntas

Exigem mais de um ofício. Círculo mágico só aqui; Elixir Drenante entra (Alquimia + Encantamentos).

### Círculo mágico
- **Ofícios exigidos:** Magias de guerra + Encantamentos
- **Custo:** 1 mana quebrada
- **O que faz:** Cria um círculo que armazena uma magia de guerra: conjura a magia gastando o MP normal e quebra 1 mana para sustentar o círculo. Liberar a mana quebrada dispara a magia. Só pode ser pega com os dois ofícios. Existe só aqui (saiu das listas dos dois ofícios).

### Frasco Armazenado
- **Ofícios exigidos:** Alquimia + Magias de guerra
- **Custo:** 1 mana quebrada
- **O que faz:** Prepara um frasco que guarda uma magia de guerra conjurada na hora (gasta o MP normal). Qualquer pessoa pode arremessá-lo depois, até o descanso longo. Versão portátil do Círculo.

### Frasco Rúnico
- **Ofícios exigidos:** Alquimia + Encantamentos
- **Custo:** 1 mana quebrada
- **O que faz:** Ao preparar um item alquímico, grava nele um descritor de encantamento (Letal, Perfurante, Preciso 1, Queimadura 1...). O descritor vale quando o item for usado.

### Poção Encantada
- **Ofícios exigidos:** Alquimia + Encantamentos
- **Custo:** 1 mana quebrada
- **O que faz:** Uma poção que, ao ser bebida, concede um encantamento do usuário (ex.: Encantamento: Resistente) a quem bebeu por uma cena, sem que o beneficiário quebre mana.

### Bomba de Guerra
- **Ofícios exigidos:** Alquimia + Magias de guerra
- **Custo:** 1 mana quebrada
- **O que faz:** Bomba que usa uma magia de guerra no lugar da versão pior: o item copia a magia inteira, sem as penalidades da bomba comum. Fica de melhoria para quando as bombas estiverem fechadas.

### Encantamento Venenoso
- **Ofícios exigidos:** Alquimia + Encantamentos
- **Custo:** 1 mana quebrada
- **O que faz:** Enquanto a mana estiver quebrada, os ataques do usuário (físicos e mágicos) ganham Envenenamento 2. Exige os dois ofícios; por isso tem Envenenamento 2, acima do Envenenamento 1 de um item comum.

### Elixir Drenante
- **Ofícios exigidos:** Alquimia + Encantamentos
- **Custo:** 1 mana quebrada
- **O que faz:** Sem rolagem. Durante uma cena, os ataques de quem bebe (físicos e mágicos) ganham Drenante. Exige os dois ofícios. Qualquer pessoa pode usar.

## 9. Abertas

- Esmagador acumula ou vale o maior? (sugestão: o maior)
- Envenenamento e Carga somando: como fica o limite de veneno e o limiar de descarga? (provisório acima)
- Repulsivo e Contínuo em espera.
- Bomba de Impacto e Bomba Pesada foram mantidas como estavam, mesmo com Shin e Torrente alterados.
- Quanto custa e como funciona o SP quebrado nos encantamentos fortes (provisório).
- Abjuração e outros ofícios novos: ainda não decidido.
