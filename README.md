# Point — Gerenciador de Campanha (Universo Amaranth)

App de gerenciamento para a campanha de RPG de mesa **Point**, ambientada no universo Amaranth. Sistema próprio baseado em 3d10.

## O que tem aqui

- `point-amaranth-app.jsx` — o aplicativo completo (React)
- `engine.js` — o motor de combate (regras puras, sem React), importado pelo app
- `engine.test.js` — suíte de testes automatizados do motor
- `storage.js` — camada de armazenamento (hoje localStorage, trocável no futuro)
- `index.html` / `main.jsx` / `vite.config.js` — scaffold Vite que empacota o app como site/PWA
- `public/` — ícones e manifest do PWA
- `.github/workflows/` — CI (testes a cada push) e deploy automático no GitHub Pages
- `SISTEMA.md` — regras do sistema de combate
- `CONTEXTO.md` — decisões de design e pendências (continuidade entre sessões)

O app **não depende mais do Lovable** — publicação é direto deste repositório (ver "Publicar" abaixo). O projeto Lovable antigo ainda existe mas está desatualizado e não é mais a fonte de verdade.

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

## Como rodar localmente

```
npm install
npm run dev
```

Abre em `http://localhost:5173/Point/` (o `/Point/` no caminho é de propósito — ver "Publicar" abaixo). Os dados ficam salvos no localStorage do navegador (ver `storage.js`).

## Testes

O motor de combate tem suíte de testes automatizados (Node nativo, sem dependências):

```
npm test
```

`npm run build` roda os testes antes de gerar o build de produção — o build **falha** se algum teste falhar, então isso funciona como trava extra mesmo fora do GitHub Actions (ex: build manual).

## PWA (offline / "Adicionar à tela inicial")

O app é uma PWA: funciona offline (o service worker faz cache do app inteiro, inclusive as fontes do Google Fonts) e pode ser instalado pela opção "Adicionar à tela inicial" do navegador (Android/Chrome) ou "Adicionar ao Dock" (iOS/Safari, no menu de compartilhar). Isso só funciona no site publicado (https) — em `npm run dev` o service worker fica desligado de propósito, pra não atrapalhar o hot-reload. Pra testar o comportamento de PWA localmente, use `npm run build && npm run preview`.

## Publicar (GitHub Pages)

Todo push na branch `main` roda os testes e, se passarem, publica automaticamente em **https://pedrogcd.github.io/Point/** via GitHub Actions (`.github/workflows/pages.yml`). Pull requests e outras branches só rodam os testes (`.github/workflows/ci.yml`), sem publicar. Sem conta externa, sem CLI, sem token — só o GitHub mesmo.

### O que você precisa fazer (uma vez só)

No repositório, em **Settings → Pages → Source**, escolha **GitHub Actions** (em vez de "Deploy from a branch"). Só isso — não precisa escolher branch nem pasta, o workflow já cuida disso.

Depois desse passo, o próximo push na `main` (por exemplo, o merge deste pull request) já publica o site. Acompanhe em *Actions*, no GitHub.

O caminho `/Point/` no meio da URL vem do nome do repositório — é assim que o GitHub Pages funciona pra sites de projeto (não é o domínio raiz `pedrogcd.github.io`, que ficaria reservado pra um repositório especial chamado `pedrogcd.github.io`, se você criar um no futuro). Se o repositório for renomeado, o caminho muda junto — é só atualizar a constante `BASE` em `vite.config.js`.
