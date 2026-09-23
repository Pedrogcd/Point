# Point — Gerenciador de Campanha (Universo Amaranth)

App de gerenciamento para a campanha de RPG de mesa **Point**, ambientada no universo Amaranth. Sistema próprio baseado em 3d10.

## O que tem aqui

- `point-amaranth-app.jsx` — o aplicativo completo (React)
- `engine.js` — o motor de combate (regras puras, sem React), importado pelo app
- `engine.test.js` — suíte de testes automatizados do motor
- `sidepoint.js` — funções puras do Grupo Aurora (Sidepoint): classificação de grupo e reposição idempotente das fichas semente
- `sidepoint.test.js` — testes automatizados do `sidepoint.js` (cenários de carregamento e idempotência)
- `storage.js` — camada de armazenamento: Supabase como fonte de verdade (sincroniza entre aparelhos), localStorage como cache offline
- `supabaseClient.js` / `auth.js` / `imageUpload.js` — cliente Supabase, login do mestre, upload de retrato
- `supabase/schema.sql` — SQL pra rodar uma vez no projeto Supabase (tabela + bucket de imagens)
- `index.html` / `main.jsx` / `vite.config.js` — scaffold Vite que empacota o app como site/PWA
- `public/` — ícones e manifest do PWA
- `.github/workflows/` — CI (testes a cada push) e deploy automático no GitHub Pages
- `SISTEMA.md` — regras do sistema de combate
- `CONTEXTO.md` — decisões de design e pendências (continuidade entre sessões)

O app **não depende mais do Lovable** — publicação é direto deste repositório (ver "Publicar" abaixo). O projeto Lovable antigo ainda existe mas está desatualizado e não é mais a fonte de verdade.

## Funcionalidades

| Aba | O que faz |
|---|---|
| **Início** | Vitrine de uma mesa por vez (Grupo C ou Grupo Aurora) e arco atual |
| **Objetivos** | Metas da campanha com estados (Ativo/Pausado/Concluído) |
| **Personagens** | Fichas completas dos 19 personagens (13 do Grupo C + 6 do Grupo Aurora), com edição e seletor de mesa |
| **Confronto** | Simulador de combate — ataque vs defesa, rolagem completa |
| **Habilidades** | Catálogo das 11 Habilidades Passivas de Combate |
| **Regras** | Referência do sistema e status effects |
| **Mundo** | 6 reinos e suas cidades |
| **Deuses** | 7 deidades do panteão |
| **Sagas** | Arcos narrativos da campanha |

Sem login, o app é **somente leitura**: editar, excluir, salvar e os gastos de MP/SP que alteram a ficha ficam escondidos. Confronto e o Teste (Atributo + Perícia) continuam funcionando pra todo mundo — só não persistem gasto de MP/SP sem login. Ver "Dados e login" abaixo.

## Estrutura da ficha

- **Grupo (mesa)**: Grupo C (campanha principal) ou Grupo Aurora (Sidepoint)
- **Singularidade**, **Habilidade de Raça** + **2 Classes** — tabelas de 3 caixas em largura total, acima dos atributos
- **Atributos Gerais** (9): Força, Destreza, Vigor / Carisma, Manipulação, Compostura / Inteligência, Perspicácia, Resolução
- **Proficiências** (32), em 4 categorias: Combate, Física, Social, Mental
- **Estatísticas de Combate**: Defesa, Resistência Armadura, Resistência Natural Física, Resistência Natural Mágica, Geral. Acerto não é estatística fixa — é calculado por tipo de ataque (corpo a corpo, arma de fogo, mágico)
- **Recursos**: HP (definido por Vigor), MP (azul), SP (verde)
- **Habilidades Passivas de Combate**: até 3 espaços por personagem, clicáveis — a Singularidade não ocupa espaço

## Dados e login (Supabase)

Os dados da campanha (personagens, mundo, deuses, sagas, objetivos) ficam num projeto Supabase — sincronizados entre qualquer aparelho que abrir o app. Sem conexão, o app cai pro cache local (localStorage) e continua funcionando em modo leitura; a próxima vez que conseguir falar com o Supabase, ele volta a ser a fonte de verdade.

### O que você precisa rodar no Supabase (uma vez só)

No painel do seu projeto Supabase → **SQL Editor** → **New query** → cola o conteúdo inteiro de [`supabase/schema.sql`](supabase/schema.sql) → **Run**. Esse arquivo é seguro de rodar mais de uma vez (idempotente). Ele cria:

1. **`point_kv`** — tabela chave/valor, uma linha por chave que o app já salvava (`point-characters`, `point-kingdoms`, `point-gods`, `point-sagas`, `point-objectives`). Leitura pública (RLS), escrita só pra usuário autenticado.
2. **Bucket `retratos`** — Storage pras imagens de personagem enviadas pelo formulário. Leitura pública, upload só autenticado.

Nada mais é necessário no banco — sem tabelas ou índices adicionais.

### Login do mestre

Botão discreto "Entrar como mestre" no canto superior direito — e-mail/senha (Supabase Auth, que você já configurou). Só quem estiver logado edita, exclui, salva ou gasta MP/SP na ficha de verdade; o resto do app (incluindo Confronto e o rolador de Teste) funciona pra qualquer visitante, sem login.

**Primeiro login**: se o Supabase ainda não tiver nenhum dado salvo (banco recém-criado) e o navegador tiver dados no localStorage (de uma sessão anterior, offline), o primeiro login sobe esses dados locais pro Supabase automaticamente — só nas chaves que ainda estiverem vazias lá, nunca sobrescrevendo o que já existir. Roda de novo (sem efeito) em todo login seguinte, então é seguro.

### Upload de imagem

No formulário de personagem, "Enviar imagem do computador" redimensiona a imagem no navegador (máximo 512px, JPEG ~80% de qualidade) antes de subir pro bucket `retratos`, e preenche a URL pública automaticamente. "Remover" limpa o campo e tenta apagar o arquivo do bucket (melhor esforço — se falhar, não trava a UI).

### Limites conhecidos (documentados, não escondidos)

- **Sem fila de retry offline pra escrita**: se você estiver logado e a escrita no Supabase falhar (rede caiu no meio de uma edição), a mudança fica salva no cache local do seu navegador mas não sincroniza sozinha depois — só na próxima edição bem-sucedida daquela mesma chave. Editar de novo (ou só reabrir com internet) resolve.
- **Login e upload não foram testados contra o Supabase de verdade nesta sessão**: o ambiente onde rodei os testes bloqueia acesso de saída pra `supabase.co` (política de rede do sandbox). Testei exaustivamente tudo que dava pra testar sem essa conexão — build, modo leitura, esconder/mostrar controles, Confronto funcionando, o app funcionando offline de verdade, e até que uma tentativa de login com a rede fora do ar mostra o erro tratado em vez de quebrar a UI. Mas o fluxo completo (logar de verdade, ver os dados sincronizarem, subir uma imagem) só você consegue confirmar depois do deploy. Se algo não funcionar como esperado, me avisa com o erro exato (console do navegador) que eu ajusto.

## Como rodar localmente

```
npm install
npm run dev
```

Abre em `http://localhost:5173/Point/` (o `/Point/` no caminho é de propósito — ver "Publicar" abaixo). Copie `.env.example` pra `.env.local` e preencha com os dados do seu projeto Supabase pra testar com dados de verdade — sem isso, o app funciona igual, só que sempre em modo leitura com localStorage puro.

## Testes

O motor de combate e o Grupo Aurora têm suíte de testes automatizados (Node nativo, sem dependências), em `engine.test.js` e `sidepoint.test.js` — 78 testes ao todo:

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

Os secrets `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (você já cadastrou em Settings → Secrets and variables → Actions) são passados pro build automaticamente — não precisa mexer em mais nada por causa deles.

Depois desse passo (e de rodar o `supabase/schema.sql`, ver "Dados e login" acima), o próximo push na `main` (por exemplo, o merge deste pull request) já publica o site. Acompanhe em *Actions*, no GitHub.

O caminho `/Point/` no meio da URL vem do nome do repositório — é assim que o GitHub Pages funciona pra sites de projeto (não é o domínio raiz `pedrogcd.github.io`, que ficaria reservado pra um repositório especial chamado `pedrogcd.github.io`, se você criar um no futuro). Se o repositório for renomeado, o caminho muda junto — é só atualizar a constante `BASE` em `vite.config.js`.
