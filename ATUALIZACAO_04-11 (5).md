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

## Mudanças de 06/11 (Guerreiro, validação do Pedro)
- Modal: passiva agora diz que começa com Maestria de Estilo, que custa 0 MP na primeira vez de cada turno; 2 MP para usar de novo no turno com um segundo modificador.
- Poder: passiva passa de "+1 dado de ataque" para "Sortudo" em ataques com Pesado ou Esmagador.
- Preciso: passiva passa de "Preciso 1" para "ataques desarmados ou com arma leve podem rolar com −1 grau nos dois atributos de ataque (mínimo 1 em cada), mas fazem dois ataques".
- Guarda Alta (geral): 1 sucesso garantido na defesa (antes 2), mantendo −2 dados.
- Postura Ofensiva: sem penalidade de defesa (+1d10 e Letal).
- Maestria de Estilo nas outras variações: em discussão, sem mudança.
- Dados completos em arquetipos.json (substituir a cópia antiga).

## Mudanças de 06/11, segunda rodada (Guerreiro)
- Maestria de Estilo (geral): opções Letal, Preciso 1, Perfurante ou Esmagador 1. Redundância de Letal, Preciso e Esmagador causa Sangramento 1 (teto 2 por ataque); Perfurante repetido ignora também Resistente. Custa 0 MP na primeira vez da cena e 1 MP nas seguintes. No Modal: 0 MP na primeira vez de cada turno, 2 MP para repetir com segundo modificador, e a lista cresce com a postura ativa.
- Guarda Alta (geral): custa 1 MP e rola defesas físicas com +1d10. Não há mais sucesso garantido nem penalidade de dados.
- Postura Ofensiva (Modal): só ativa ao escolher postura diferente da do turno anterior; ataques ganham Letal, ou +1d10 se já tiverem Letal. Sem penalidade de defesa.
- Postura Defensiva (Modal): Maestria de Estilo ganha a opção Firme 1 ou Ágil 1. Ágil N é descritor novo: N sucessos garantidos ao esquivar. Redundância: +1d10 na defesa.
- Postura Ágil vira Postura Veloz: dá Veloz; no seu turno precisa trocar de postura antes de agir; se já tiver Veloz ganha Sortudo; se já tiver Sortudo ganha Potência de Destreza.
- Troca Fluida é substituída por Postura de Fogo: Maestria ganha a opção Queimadura 1; se o ataque errar, a mesma postura pode ser escolhida no turno seguinte e conta como troca.
- Novo descritor Ágil N no glossário e na lista de descritores do Modal.

## Mudanças de 07/11 (Guerreiro Poder)
- Golpe Devastador é substituído por Mãos Fortes: passiva que permite usar armas Pesadas com uma mão.
- Tudo ou Nada: custa 2 MP; o ataque ganha Letal e +1d10; se errar, fica Azarado na defesa.
- Golpe Gigante: custa 1 MP (antes 1 SP); golpe em área sem fogo amigo (não atinge aliados).
- Ainda a revisar no Guerreiro: Empurrão, Golpe Rápido, Estocada, Olho na Brecha e Contragolpe.

## Mudanças de 09/11 (descritor Leve)
- Novo descritor Leve, oposto do Pesado: o ataque acerta com 5 ou mais no d10 (um a menos que o normal; 6 ou mais contra Blindado) e causa no máximo 1 ferimento agravante (1 ponto de vida) por ataque. Leve e Pesado no mesmo ataque se anulam.
- Armas Leves (as que têm Veloz): Lâmina curta, Contundente leve, Contundente de punho, Arma de fogo curta, Arma de arremesso e Arma flexível. O Desarmado não é Leve por padrão.
- Guerreiro Preciso, passiva: "ataques desarmados ou com arma Leve" (antes "arma leve", sem definição).
- Em aberto: Contundente leve, Contundente de punho e Arma de arremesso já tinham a nota "1 superficial" no catálogo; foi mantida junto de Leve até Pedro decidir.

## Mudanças de 09/11, segunda rodada (Guerreiro revisado de novo)
- Guarda Alta (geral): agora custa 2 MP e rola o BLOQUEIO com +2d10 (antes: 1 MP, +1d10 em Esquiva ou Bloqueio).
- Mãos Fortes (Poder): além de usar Pesadas com uma mão, pode optar por tirar o efeito de Pesado de uma arma pesada e fazê-la atacar normalmente.
- Preciso, passiva: pode usar armas Leves ignorando o descritor Leve (ataque normal) e pode adicionar o descritor Leve a qualquer arma que não seja Pesada. Substitui a passiva dos dois ataques.
- Golpe Rápido: 2 MP; dois ataques com arma Leve; o segundo com 1 grau a menos no atributo e na proficiência (mínimo 1 em cada).
- Estocada: ganha Perfurante; se já tiver, causa também Sangramento 1 (antes: +1d10).
- Olho na Brecha: vira ataque; até o fim do turno todos os seus ataques ganham Sortudo, mas todo ferimento causado no turno é superficial.
- Contragolpe é substituído por Borrão: 2 MP; ao rolar a esquiva, rola com +2d10.
- Ainda a revisar no Guerreiro: Empurrão.

## Mudanças de 09/11, terceira rodada (Guerreiro concluído)
- Guerreiro Poder: Empurrão é substituído por uma passiva chamada Poder: ganha +1 grau em Força (teto 3). O Empurrão continua existindo no Guardião Muralha, agora como habilidade única (deixa de ser compartilhada).
- Guerreiro está com a revisão concluída (as 3 variações).
