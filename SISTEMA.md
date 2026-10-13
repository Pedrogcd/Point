# Sistema de Combate — Point

**Fonte de verdade do combate/magia (14/10): [docs/SISTEMA_MAGIA.md](docs/SISTEMA_MAGIA.md).**
Este arquivo descrevia o modelo anterior (Acerto 3d10 → Resistência ativa →
Confirmação por camadas de Armadura/Escudo de Mana). Esse modelo não existe
mais no motor (`engine.js`) — foi substituído por uma rolagem única de
ataque contra uma rolagem única de defesa, sem bônus somado ao dado (pool de
dados), descrito no documento acima. O que ainda vale e não mudou continua
aqui.

## Graus

Todo atributo e proficiência vai de **E** a **A**:

| Grau | Nível | Bônus (fora de combate) |
|---|---|---|
| E | 1 | +0 |
| D | 2 | +1 |
| C | 3 | +2 |
| B | 4 | +3 |
| A | 5 | +4 |

Em combate (docs/SISTEMA_MAGIA.md) o que importa é o **grau cheio** (coluna
"Nível" acima — E=1 .. A=5), não o bônus: cada ponto de grau é 1 dado no pool.

## Recursos

- **HP** = 2 + bônus de Vigor (E=2, D=3, C=4, B=5, A=6)
- **MP** (Mana Points, azul) — de 1 a 6 (docs/SISTEMA_MAGIA.md item 7). Gasto ao
  conjurar magias (ver catálogo em `data/magias.js`); parte volta durante a
  cena pela rolagem de Manipulação de Mana, e tudo volta no fim da cena.
- **SP** (Soul Points, verde) — gasta 1 para **somar +5** num dado do painel
  "Teste — Atributo + Perícia" (fora de combate; não se aplica mais ao
  ataque/defesa de combate, que não tem bônus somado ao dado).

Na ficha, HP/MP/SP aparecem como bolinhas clicáveis. HP tem dois passos: 1º
clique numa bolinha cheia racha (só visual), 2º clique quebra (cai 1 ponto);
clicar numa vazia restaura na hora. MP e SP são um clique só: cheia →
esvazia/evapora 1 ponto; vazia → enche 1 ponto. **Atenção**: esse gesto de
"rachar" é só visual — o contador `hp.superficiais` (que decide quando um
ferimento superficial vira agravante, docs/SISTEMA_MAGIA.md) é um campo
separado, persistido, atualizado pelo motor (`aplicarFerimentos`), não por
esse clique.

## Status Effects e Habilidades Passivas de Combate (ÓRFÃOS desde 14/10)

As 11 Habilidades Passivas de Combate (catálogo em `engine.js`,
`PROC_ABILITIES`) e os 6 status effects (IMPACTO, DESACELERAÇÃO,
ENRAIZAMENTO, ACELERAÇÃO, CHAMAS, ENVENENAMENTO) dependiam das fases de
Acerto/Confirmação e das camadas de Armadura/Escudo de Mana do modelo
antigo — nenhuma dessas fases existe mais no `resolveAtaque` novo. Os dados
das 11 habilidades continuam na ficha (campo `procs`, até 3 espaços) e
aparecem na interface, mas **nenhum efeito automático dispara mais** — ficam
só como referência narrativa até o Pedro decidir redesenhá-las pro modelo
novo ou aposentar a feature. Os status effects de texto livre (tabela abaixo)
também não têm mais nenhum gancho mecânico automatizado; continuam valendo
como regra narrada pelo mestre, se o grupo quiser usar.

| Status | Quando | Efeito (texto, sem automação) |
|---|---|---|
| **IMPACTO** | Após contato | 1d10: 1-4 nada, 5-7 +1, 8-9 +2, 10 +3 — dano extra narrado pelo mestre |
| **DESACELERAÇÃO** | Antes do ataque | 1d10: 1-4 nada, 5-7 -1, 8-9 -2, 10 -3 (dificulta o atacante) |
| **ENRAIZAMENTO** | Antes do ataque | N instâncias dificultam os N primeiros dados (máx 3) |
| **ACELERAÇÃO** | Durante o ataque | Cada sucesso facilita o próximo dado; falha zera a cadeia |
| **CHAMAS** | Após contato | +1 ferida extra, narrado |
| **ENVENENAMENTO** | Após contato | +1 ferida extra, narrado, sempre contra o lado mágico |

## Testes fora de combate

`Atributo Geral + Perícia` = número de dados (soma dos graus, de 2d10 a
10d10). Limiar de sucesso customizável (padrão: dado > 5, ou seja, bate 6 =
sucesso). Um 10 natural sempre conta. MP re-rola um dado, SP soma +5 num
dado (máx. 10) — ver painel "Teste" da ficha.
