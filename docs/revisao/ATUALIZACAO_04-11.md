# Atualização 04/11 e 05/11 — Arquétipos e regras (para o Claude Code)

Fonte de verdade dos dados: `arquetipos.json` (mesma pasta). Fonte de leitura: aba "Arquétipos" do artefato Sistema Point. Tudo é provisório: Pedro mandou implementar agora e ajustar depois, então os textos e números devem ficar em dados (JSON), nunca espalhados no código.

## O que entra no site
8 arquétipos × 3 variações = 24 disciplinas. Cada variação é UMA disciplina (ocupa 1 slot de disciplina). O JSON tem, por variação: arquetipo, variacao, foco, conceito, recurso (MP ou MP + SP), fixaCombate, outrasFixas (2), passiva, descritores, fraqueza e 6 habilidades (nome, tipo, custo, descritores, texto, origem, geral).

Arquétipos e variações: Guerreiro (Modal, Poder, Preciso); Bárbaro (Fúria, Sanguinário, Inabalável); Guerreiro Arcano (Encantado, Barreira, Rúnico; antes "Paladino"); Ladino (Assassino, Trapaceiro, Gatuno); Caçador (Atirador, Rastreador, Armadilheiro); Comandante (Estrategista, Inspirador, Tirano); Guardião (Muralha, Protetor, Provocador); Artista Marcial (Percussão, Pontos Vitais, Fluxo).

## Regras
1. Ao escolher a disciplina: +1 grau em UMA proficiência de combate à escolha do jogador, mais +1 grau em 3 proficiências fixas da variação (a fixaCombate + as 2 de outrasFixas). Bônus somam até o teto 3 (grau numérico, 0 a 5, teto 3 para jogadores).
2. A variação tem 6 habilidades: 2 gerais (flag `geral`, iguais em todas as variações do arquétipo) e 4 únicas. Se o personagem tem duas variações do mesmo arquétipo, cada geral aparece uma vez só.
3. Habilidades custam MP. Poucas custam "1 SP". Custo "1x por cena" não gasta recurso, só limita o uso (marcar usado, voltar no fim da cena). SP gasto volta no fim da cena. Reação: 1 por ataque recebido.
4. Regra de redundância: se a habilidade dá um descritor que o personagem já tem (da arma, da raça ou de outra habilidade), ela rende um bônus. Letal repetido: causa também Sangramento 1 (Sangramento soma N entre fontes, como o Envenenamento; o Sangramento de redundância de Letal tem teto de 2 por ataque; o Letal racial também causa Sangramento 1 quando o ataque já tem Letal). Perfurante, Veloz ou Sortudo repetidos: +1d10 no ataque. Preciso e Esmagador repetidos: sobem +1. Pesado repetido: vira Esmagador 1. Resistente repetido: 1 ponto de vida temporário. Firme ou Selado repetidos: +1d10 ao bloquear ou defender. Azarado repetido: o alvo rola 1 dado a menos no próximo teste. Isso já está escrito no texto de cada habilidade; a ficha só precisa mostrar o texto.
5. Guarda Alta vale só para defesas físicas (Esquiva e Bloqueio).
6. Lento N, Veloz (iniciativa) e Reabastecer não têm efeito mecânico definido; mostrar o texto sem automatizar nada.

## Tarefas
1. Descobrir como o repositório guarda disciplinas, ofícios e proficiências hoje (ler o código antes de mexer).
2. Importar `arquetipos.json` como dado (por exemplo `data/arquetipos.json`) e carregar na ficha.
3. Na ficha: o jogador escolhe disciplinas de arquétipo nos slots de disciplina; ao escolher, pedir a proficiência de combate livre e aplicar os 3 bônus fixos (respeitando o teto 3).
4. Mostrar as 6 habilidades da variação como cartões (nome, tipo, custo, descritores, texto, tag geral/única/compartilhada), com marcação de "usada na cena" para as de "1x por cena" e contadores de MP/SP se a ficha já tiver.
5. Não automatizar efeitos de combate nesta etapa: só exibir e controlar custo e uso.
6. Se faltar a proficiência "Magias Gerais" entre as 22 gerais, avisar o Pedro (Guerreiro Arcano usa essa fixa no lugar de Religião).
7. Não apagar nem alterar as disciplinas e ofícios que já existem.

## Mudanças de regra de 05/11 (aplicar também em textos e cálculos do site)
1. **Sangramento N (descritor novo).** Mecanicamente igual ao Envenenamento N, com nome próprio: cada Sangramento N causa N ferimentos superficiais, um por rodada, e soma N entre fontes. O Sangramento que vem de redundância de Letal tem teto de 2 por ataque. A confirmar: se Sangramento e Envenenamento somam um com o outro.
2. **Redundância de Letal (e racial).** Se um ataque já tem Letal e uma habilidade ou a raça dá Letal de novo, o ataque causa também Sangramento 1. Isso vale para as habilidades dos arquétipos (já escrito no texto de cada uma) e para o Letal racial: Leonino, Reptiliano, Lobo/Canino (Ningen) e Agressividade Oni (Niosh). Os textos dessas habilidades raciais foram atualizados no artefato; atualizar no site.
3. **Resistente (descritor).** O Vigor do defensor conta como +1 para decidir o agravante, mas só até o primeiro ferimento agravante que ele sofrer na cena; depois o bônus acaba até a cena seguinte. Continua não acumulando e sendo anulado por Letal. Afeta Mana Estática, Resistência à Dor, Goethiano, Sharkan, Arcani, Sabato, Reptiliano, armaduras com Resistente e as habilidades de arquétipo que dão Resistente. Na ficha, guardar "primeiro agravante da cena sofrido" como marca que volta a zero no fim da cena.
4. **Resistir à Dor.** Uma vez por cena, teste de Vigor + Fortitude; com 1 sucesso, o primeiro ferimento agravante que receber vira superficial. Está em Bárbaro Fúria e Sanguinário (habilidade geral) e na passiva do Inabalável.
5. Pendente (não implementar): Sangue Quente (Niosh) tem o efeito antigo de Resistir à Dor, sem teste. O Pedro vai decidir se iguala.
6. Habilidades de arquétipo que o simulador marcou como fracas ou redundantes serão reescritas depois; implementar o texto atual do JSON.

## Dependências ainda pendentes (se não estiverem no repositório)
- Graus numéricos (0 a 5) no lugar das letras.
- Proficiências de combate (8): Armas, Desarmado, Armas de Fogo, Magia Ofensiva, Esquiva, Bloqueio, Fortitude, Vontade.
- Regra de armas de 28/10: em cada ataque a pessoa escolhe UM dos dois descritores da arma.
