# Guia do Sistema de Magia e Combate — Point

Fonte de verdade das regras, junto com `docs/MUDANCAS_RACAS_E_MAGIA.md` e `docs/DISCIPLINAS_MAGIA.md` (14/10) — os três juntos cobrem as regras de combate/magia hoje; onde algum divergir dos outros dois, valem os dois mais específicos. Atualizado em 15/10 pra parar de citar conceitos extintos (Resistência Mágica, Blindado Mágico separado, Magias Ofensivas, Manipulação de Mana) e refletir o que o código realmente faz. O código deve seguir este documento. Dados de magias e descritores ficam em arquivo editável (ex.: `data/magias.js`), nunca fixos no motor.

## Rolagem

- Atributo + proficiência = número de d10. Cada dado com 6 ou mais é sucesso. O 10 natural fica como crítico (a confirmar).
- Graus: E=1, D=2, C=3, B=4, A=5 (e F=0, abaixo de E, pra representar uma fraqueza grave). Teto C para jogadores, salvo habilidades que digam explicitamente "sem teto"/"até A". Bônus de "+1" em habilidades e disciplinas é +1 grau.

## Dano

- Sucessos líquidos = sucessos do atacante - sucessos da defesa (mínimo 0).
- Ferimento agravante (perde o ponto de vida) se líquidos >= Vigor do defensor (grau cheio). Senão é superficial (quebra o ponto).
- Letal reduz o Vigor necessário em 1 (mínimo 1).
- Com todos os pontos quebrados, os próximos ferimentos viram agravantes.
- 1 ferimento por ataque por padrão. Magias e armas podem definir outro número.
- Magia marcada "superficial" causa sempre ferimento superficial.

## Defesa

- Contra qualquer ataque, físico ou mágico: Resistência Física + o Atributo Geral que o defensor escolher como base da defesa. Os sucessos do defensor reduzem os do atacante. Resistência Mágica e Resistência Natural não existem mais — não há mais uma proficiência de defesa separada por tipo de ataque.

## Descritores

- Ataque: Magia (toda magia tem), Em área, Saturante, Perfurante, Letal, Sortudo.
- Personagem: Blindado, Sortudo, Veloz. (Sortudo também tem uma variante restrita, "Sortudo (físico)", concedida por uma habilidade racial específica — só vale em ataques não-mágicos.)
- Blindado: um só descritor cobre qualquer ataque, físico ou mágico — dados de ataque contra o personagem precisam de 7+. Não existe mais "Blindado Mágico" separado.
- Perfurante: ignora Blindado.
- Saturante: se o defensor usar Destreza como base da defesa, rola 2 dados a menos (mínimo 0).
- Em área: atinge todos os alvos da zona; cada alvo rola a própria defesa; o conjurador rola uma vez; aliados na zona também são atingidos.
- Sortudo: re-rola o primeiro 1 ou 2 do teste (inclusive de ataque), mostrando o dado original e o novo.
- Veloz, "prioridade -1" e "atrasada 1": só etiquetas por enquanto, sem efeito no motor (o jogo é por cenas).
- Guiável foi removido.
- Quando duas habilidades se contradizem, a negação vence (ex.: Perfurante sempre vence Blindado).

## Mana

- Cada pessoa tem de 1 a 6 de mana. Magias custam normalmente 1 ou 2, mais se forem fortes.
- Toda a mana volta no fim da cena.
- Recuperação durante a cena: ao conjurar, rola-se a contagem de Ofícios Mágicos (disciplinas de tipo ofício-mágico equipadas, mais ofícios extras de raça/habilidade) + a mana usada na magia. Cada sucesso recupera 1 mana gasta (nunca mais que a gasta), aplicada no botão "Início de turno". Isso permite encadear várias magias numa cena. Não existe mais a proficiência Manipulação de Mana (nem a Técnica que a precedeu) — a recuperação não depende de proficiência nenhuma, só da quantidade de ofícios mágicos.

## Base mágica

- Opção "Base mágica" no seletor "Atributo Geral dos Testes — Atributo + Perícia". Vale 2d10 + a mana gasta ACIMA do custo da magia. Não lê atributo da ficha.
- Todo ataque mágico: Base mágica + (Ofícios Mágicos **ou** grau de Inteligência, à escolha do jogador a cada conjuração) + 1 dado extra se o personagem tiver Magia Inata (Mísseis Mágicos soma mais +1 dado fixo, além disso). Não existe mais a proficiência Magias Ofensivas — o pool mágico nunca lê uma proficiência fixa, só a contagem de ofícios ou Inteligência.

## Disciplinas

- Bônus base + até 3 magias ativas; o resto fica na reserva (como o jogador adquire a reserva ainda é pendente).
- Ofício Mágico: Magias de guerra (ex-"Ofício Mágico"/Evocação): Magias Gerais +1, Acadêmicos +1 e Tecnologia +1 (graus, teto C). Tela de mana para analisar magias (sem mecânica numérica definida ainda). Conta como 1 Ofício Mágico. Começa com 2 magias, até 3 ativas. Trocar uma ativa por uma da reserva custa 1 MP, ou é grátis gastando uma ação.
- Magia Inata: +1 MP máximo e +1d10 fixo em todas as rolagens de magia. NÃO conta como ofício mágico. Começa com 2 magias, até 3 ativas. Trocar custa 1 MP (sem a opção grátis do Ofício Mágico).
- Outros ofícios mágicos (Encantamentos, Alquimia, Constructo): cada um conta como 1 Ofício Mágico igual Magias de guerra, mas ainda não têm bônus nem magias próprias definidos — ficam como disciplinas "vazias" até serem escritas.
- Pendente: como o jogador adquire a reserva (magias além das 2 iniciais).

## Catálogo de magias (nome | descritores | pool | MP | ferimentos)

Pool de todas: Base mágica + (Ofícios Mágicos ou Inteligência). Exceção: Mísseis Mágicos soma +1 dado por cima.

- Bombardeio de Mana | Magia, Em área, Saturante | Base mágica + (Ofícios ou Inteligência) | 2 | 1
- Escudo de Mana (defesa) | sem rolagem | 1 MP | o conjurador ganha Blindado por uma cena; +1 MP estende a um aliado
- Shin | Magia, Em área, Saturante | Base mágica + (Ofícios ou Inteligência) | 1 | 1 superficial
- Mísseis Mágicos | Magia, Saturante, Sortudo | Base mágica + 1 + (Ofícios ou Inteligência) | 1 | 1 superficial
- Laser Mágico | Magia, Perfurante | Base mágica + (Ofícios ou Inteligência) | 2 | 1
- Torrente Mágica | Magia, Letal | Base mágica + (Ofícios ou Inteligência) | 3 | 2
- Tiro mágico | Magia | Base mágica + (Ofícios ou Inteligência) | 1 | 1
- Shin-kay | Magia, Letal | Base mágica + (Ofícios ou Inteligência) | 2 | 1
- Magia de guerra Suth | Magia, Saturante, Sortudo, atrasada 1 | Base mágica + (Ofícios ou Inteligência) | 2 | 1
- Magia de guerra Maxis | Magia, Em área | Base mágica + (Ofícios ou Inteligência) | 2 | 2 superficiais
- Magia de guerra Katalão | Magia, Perfurante, Sortudo, Letal | Base mágica + (Ofícios ou Inteligência) | 3 | 1
- Sensor | Magia | a definir | a definir | marca até 5 pessoas numa rede de visão e comunicação compartilhada (placeholder)

## Fora do escopo

Ações, reações, rodadas, iniciativa.
