# Point — Gerenciador de Campanha (Universo Amaranth)

App de gerenciamento para a campanha de RPG de mesa **Point**, ambientada no universo Amaranth. Sistema próprio baseado em 3d10.

## O que tem aqui

- `point-amaranth-app.jsx` — o aplicativo completo (React)
- `engine.js` — o motor de combate (regras puras, sem React), importado pelo app
- `engine.test.js` — suíte de testes automatizados do motor
- `SISTEMA.md` — regras do sistema de combate
- `CONTEXTO.md` — decisões de design e pendências (continuidade entre sessões)
- Versão online (Lovable): https://id-preview--1c753329-b2f1-4878-9fbe-458337a6a7ca.lovable.app

## Funcionalidades

| Aba | O que faz |
|---|---|
| **Início** | Vitrine do Grupo C e arco atual |
| **Objetivos** | Metas da campanha com estados (Ativo/Pausado/Concluído) |
| **Personagens** | Fichas completas dos 13 personagens, com edição |
| **Confronto** | Simulador de combate — ataque vs defesa, rolagem completa |
| **Habilidades** | Catálogo das 11 Habilidades Passivas de Combate |
| **Regras** | Referência do sistema e status effects |
| **Mundo** | 6 reinos e suas cidades |
| **Deuses** | 7 deidades do panteão |
| **Sagas** | Arcos narrativos da campanha |

## Estrutura da ficha

- **Atributos Gerais** (9): Força, Destreza, Vigor / Carisma, Manipulação, Compostura / Inteligência, Perspicácia, Resolução
- **Proficiências** (32), em 4 categorias: Combate, Física, Social, Mental
- **Estatísticas de Combate**: Acerto, Defesa, Resistência Armadura, Resistência Natural Física, Resistência Natural Mágica, Geral
- **Recursos**: HP (definido por Vigor), MP (azul), SP (verde)
- **Habilidades Passivas de Combate**: até 2 por personagem + a Singularidade

## Como rodar

O app (`point-amaranth-app.jsx`) importa o motor de `engine.js` — pode ser usado em qualquer projeto React/Vite (mantendo os dois arquivos juntos), ou visualizado pelo link do Lovable acima.

## Testes

O motor de combate tem suíte de testes automatizados (Node nativo, sem dependências):

```
npm test
```
