# Sistema de Combate — Point

Todas as fórmulas abaixo estão verificadas por 161 testes automatizados no motor.

## Graus

Todo atributo e proficiência vai de **E** a **A**:

| Grau | Nível | Bônus |
|---|---|---|
| E | 1 | +0 |
| D | 2 | +1 |
| C | 3 | +2 |
| B | 4 | +3 |
| A | 5 | +4 |

## Resolução de ataque — 2 etapas

### Etapa 1: Acerto (3d10)

Cada dado é sucesso se: `dado + bônus do ataque + bônus de crítico > Defesa do alvo`

**Bônus do ataque** = atributo do Tipo + Proficiência de Combate vinculada + valor manual do ataque.

**Crítico**: 10 natural. Soma +1 ao próprio dado (não é sucesso automático) e +1 na Confirmação que aquele sucesso gerar.

### Etapa 2: Confirmação (1d10 por sucesso)

`dado + bônus de dano` contra as camadas de defesa, **nesta ordem**:

1. **Escudo de Mana** (se o alvo tiver a habilidade) — vale 8 + Proficiência de Magias Ofensivas
2. **Resistência Armadura** (se tiver item de armadura) — quebra na 1ª que superar
3. **Resistência Natural** — Física (Marcial/Arma de fogo) ou Mágica (Mágico)

## Tipos de ataque

| Tipo | Acerto usa | Dano usa | Resistência alvo | Ferida |
|---|---|---|---|---|
| Marcial | Destreza + Proficiência | Força + Proficiência | Natural Física | Escala com confirmações |
| Arma de fogo | Destreza + Proficiência | Só Proficiência | Natural Física | Fixa |
| Mágico | Só Proficiência | Só Proficiência | Natural Mágica | Fixa |

## Valores base

| Estatística | Base | Soma |
|---|---|---|
| Defesa | 8 | + Proficiência de Defesa |
| Resistência Armadura | 8 | — |
| Resistência Natural Física | 6 | + Proficiência de Resistência Física |
| Resistência Natural Mágica | 6 | + Proficiência de Resistência Mágica |

**Balanceamento**: com tudo em grau E, ataque desarmado contra alvo com armadura = ~25% de chance de causar dano.

## Recursos

- **HP** = 2 + bônus de Vigor (E=2, D=3, C=4, B=5, A=6)
- **MP** (Mana Points, azul) — gasta 1 para **re-rolar** um dado
- **SP** (Soul Points, verde) — gasta 1 para **somar +5** num dado (máx. 10)

## Status Effects

| Status | Quando | Efeito |
|---|---|---|
| **IMPACTO** | Após contato | 1d10: 1-4 nada, 5-7 +1 na Confirmação, 8-9 +2, 10 +3 |
| **DESACELERAÇÃO** | Antes do Acerto | 1d10: 1-4 nada, 5-7 -1 na Defesa do alvo, 8-9 -2, 10 -3 |
| **ENRAIZAMENTO** | Antes do Acerto | Sem dado. N instâncias = N primeiros dados enfrentam Defesa -2 (máx 3) |
| **ACELERAÇÃO** | Durante o Acerto | Sem dado. Cada sucesso dá +1 ao dado seguinte; falha zera a cadeia |
| **CHAMAS** | Após contato | 1d10 independente, sem bônus, vs Resistência Natural do tipo → +1 Ferida |
| **ENVENENAMENTO** | Após contato | 1d10 independente, sem bônus, vs Resistência Natural **Mágica** → +1 Ferida |

Instâncias extras: IMPACTO e DESACELERAÇÃO somam +1 no mesmo dado; CHAMAS e ENVENENAMENTO rolam dados adicionais.

## Habilidades Passivas de Combate (11)

Cada personagem escolhe até **2** + a Singularidade conta como a terceira.

### Ataque
- **Golpe Preciso** — dado do Acerto que bate o limiar de Técnica conta como 2 sucessos (1× por ataque)
- **Ataque Poderoso** — dado que bate limiar de Força concede IMPACTO (só Marcial)
- **Magia Pyro** — dado que bate limiar de Magias Ofensivas concede CHAMAS (só Mágico)
- **Golpe Penetrante** — sempre ativa: ignora a Resistência Armadura. Técnica C/B = +1 na Confirmação, A = +2

### Confirmação de Dano
- **Mestre do Crítico** — crítico com 9+ em vez de só 10, em todos os dados
- **Potencial Mágico Ofensivo** — dado que bate limiar de Magias Ofensivas soma +1 no Dano (só Mágico)

### Defesa
- **Borrão** — dado do Acerto inimigo que bate limiar de Técnica é re-rolado

### Resistência
- **Giro Defensivo** — dado de Confirmação inimiga que bate limiar de Técnica é re-rolado
- **Mestre em Armadura** — sempre ativa: Armadura só quebra na 2ª vez que for superada
- **Escudo de Mana** — sempre ativa: camada extra de 8 + Magias Ofensivas antes da Armadura
- **Persistente** — sempre ativa: +1 HP máximo e +1 SP máximo

## Testes fora de combate

`Atributo Geral + Perícia` = número de dados (soma dos graus, de 2d10 a 10d10).
Limiar de sucesso customizável (padrão: dado > 5). Um 10 natural sempre conta.
