# Guia do Sistema de Magia e Combate — Point

Fonte de verdade das regras. O código deve seguir este documento. Dados de magias e descritores ficam em arquivo editável (ex.: data/magias.js), nunca fixos no motor.

## Rolagem
- Atributo + proficiência = número de d10. Cada dado com 6 ou mais é sucesso. O 10 natural fica como crítico (a confirmar).
- Graus: E=1, D=2, C=3, B=4, A=5. Teto C para jogadores. Bônus de "+1" em habilidades e disciplinas é +1 grau.

## Dano
- Sucessos líquidos = sucessos do atacante - sucessos da defesa (mínimo 0).
- Ferimento agravante (perde o ponto de vida) se líquidos >= Vigor do defensor (grau cheio). Senão é superficial (quebra o ponto).
- Letal reduz o Vigor necessário em 1 (mínimo 1).
- Com todos os pontos quebrados, os próximos ferimentos viram agravantes.
- 1 ferimento por ataque por padrão. Magias e armas podem definir outro número.
- Magia marcada "superficial" causa sempre ferimento superficial.

## Defesa
- Contra ataque físico: Resistência Física. Contra ataque mágico: Resistência Mágica. Os sucessos do defensor reduzem os do atacante. Resistência Natural não existe mais.

## Descritores
- Ataque: Magia (toda magia tem), Em área, Saturante, Perfurante, Letal, Sortudo.
- Personagem: Blindado, Blindado Mágico, Sortudo, Veloz.
- Blindado: dados de ataque físico contra o personagem precisam de 7+. Blindado Mágico: o mesmo contra ataque mágico.
- Perfurante: ignora Blindado e Blindado Mágico.
- Saturante: se o defensor usar Destreza como base da defesa, rola 2 dados a menos (mínimo 0).
- Em área: atinge todos os alvos da zona; cada alvo rola a própria defesa; o conjurador rola uma vez; aliados na zona também são atingidos.
- Sortudo: re-rola o primeiro 1 ou 2 do teste (inclusive de ataque), mostrando o dado original e o novo.
- Veloz, "prioridade -1" e "atrasada 1": só etiquetas por enquanto, sem efeito no motor (o jogo é por cenas).
- Guiável foi removido.
- Quando duas habilidades se contradizem, a negação vence.

## Mana
- Cada pessoa tem de 1 a 6 de mana. Magias custam normalmente 1 ou 2, mais se forem fortes.
- Toda a mana volta no fim da cena.
- Recuperação durante a cena: a proficiência Técnica é substituída por Manipulação de Mana. Ao conjurar, rola-se Manipulação de Mana + a mana usada na magia. Cada sucesso recupera 1 mana gasta (nunca mais que a gasta), aplicada no início de um turno da cena. Isso permite encadear várias magias numa cena.

## Base mágica
- Opção "Base mágica" no seletor "Atributo Geral dos Testes — Atributo + Perícia". Vale 2d10 + a mana gasta ACIMA do custo da magia. Não lê atributo da ficha.
- Todo ataque mágico: Base mágica + Magias Ofensivas (Mísseis Mágicos: Base mágica + 1 + Magias Ofensivas).

## Disciplinas
- Bônus base + até 3 magias ativas; o resto fica na reserva.
- Ofício Mágico: Magias Gerais +1, Magias Ofensivas +1, Resistência Mágica +1 (graus, teto C). Tela de mana para analisar magias. Começa com 2 magias. Trocar uma ativa por uma da reserva custa 1 MP, ou é grátis gastando uma ação.
- Magia Inata: +1 MP máximo e, à escolha, Magias Ofensivas +1 ou Magias Defensivas +1 (grau). Começa com 2 magias. Trocar custa 1 MP.
- Pendente: se a proficiência Magias Defensivas existe (senão, Resistência Mágica); como o jogador adquire a reserva.

## Catálogo de magias (nome | descritores | pool | MP | ferimentos)
- Bombardeio de Mana | Magia, Em área, Saturante | Base mágica + Magias Ofensivas | 2 | 1
- Escudo de Mana (defesa) | sem rolagem | 1 MP | o conjurador ganha Blindado e Blindado Mágico por uma cena; +1 MP estende a um aliado
- Shin | Magia, Em área, Saturante | Base mágica + Magias Ofensivas | 1 | 1 superficial
- Mísseis Mágicos | Magia, Saturante, Sortudo | Base mágica + 1 + Magias Ofensivas | 1 | 1 superficial
- Laser Mágico | Magia, Perfurante | Base mágica + Magias Ofensivas | 2 | 1
- Torrente Mágica | Magia, Letal | Base mágica + Magias Ofensivas | 3 | 2
- Tiro mágico | Magia | Base mágica + Magias Ofensivas | 1 | 1
- Shin-kay | Magia, Letal | Base mágica + Magias Ofensivas | 2 | 1
- Magia de guerra Suth | Magia, Saturante, Sortudo, atrasada 1 | Base mágica + Magias Ofensivas | 2 | 1
- Magia de guerra Maxis | Magia, Em área | Base mágica + Magias Ofensivas | 2 | 2 superficiais
- Magia de guerra Katalão | Magia, Perfurante, Sortudo, Letal | Base mágica + Magias Ofensivas | 3 | 1
- Sensor | Magia | a definir | a definir | marca até 5 pessoas numa rede de visão e comunicação compartilhada (placeholder)

## Fora do escopo
Ações, reações, rodadas, iniciativa.
