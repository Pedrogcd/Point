# Point — Gerenciador de Campanha (Universo Amaranth)

App de gerenciamento para a campanha de RPG de mesa **Point**, ambientada no universo Amaranth. Sistema próprio baseado em 3d10.

## O que tem aqui

- `point-amaranth-app.jsx` — o aplicativo completo (React)
- `engine.js` — o motor de combate (regras puras, sem React), importado pelo app
- `engine.test.js` — suíte de testes automatizados do motor
- `sidepoint.js` — funções puras do Grupo Aurora (Sidepoint): classificação de grupo e reposição idempotente das fichas semente
- `sidepoint.test.js` — testes automatizados do `sidepoint.js` (cenários de carregamento e idempotência)
- `mundoDados.js` — conteúdo fixo do Mundo: Katalão (casas, etiquetas, mapa) e a cidade de Frontier (distritos, NPCs, forças, mesa do mestre), com versão pública (`pub`) e do mestre (`gm`)
- `mundo.js` / `mundo.test.js` — funções puras do Mundo (o que cada modo Jogador/GM enxerga, agrupamento de NPCs, pinos do mapa) e seus testes, incluindo uma checagem de que segredos do mestre não aparecem no modo Jogador
- `public/mundo/` — mapa do mundo, mapa e imagem de Katalão, retratos dos NPCs
- `cidades.js` — funções puras das cidades semente do Mundo: reposição idempotente (ex: Frontier em Katalão) em quem já tinha reinos salvos, respeitando as cidades apagadas de propósito (`point-cidades-removidas`)
- `cidades.test.js` — testes automatizados do `cidades.js`
- `mapaMundo.js` — funções puras do mapa interativo dos reinos: conversão de coordenada normalizada (0 a 1) pra porcentagem, caixa delimitadora e enquadramento (scale/translate) de um polígono, migração do formato antigo de cidade (`{name, description}`) pro novo (com `id`/`x`/`y`/`capital`/`resumo`/`visaoGeral`/`imageUrl`/`distritos`/`pessoas`), e `personagemDaPessoa` (resolve o vínculo opcional de uma pessoa de interesse com uma ficha de personagem existente, ou `null` se não tiver vínculo ou a ficha tiver sido apagada)
- `mapaMundo.test.js` — testes automatizados do `mapaMundo.js`, incluindo a migração `description` → `resumo` (idempotente, sem perder texto), `personagemDaPessoa` e um smoke test da aba Mundo e da página da cidade (`CidadePaginaView`) renderizando nas três abas, com e sem dados
- `public/sidepoint/frontier.html` — guia de jogadores de Frontier (Sidepoint), página estática publicada em https://pedrogcd.github.io/Point/sidepoint/frontier.html e aberta pelo botão "Abrir guia" da cidade na aba Mundo
- `storage.js` — camada de armazenamento: Supabase como fonte de verdade (sincroniza entre aparelhos), localStorage como cache offline
- `supabaseClient.js` / `imageUpload.js` — cliente Supabase, upload de retrato
- `backup.js` — exportar/importar o estado inteiro do app em `.json` (sem depender de File/Blob do navegador, testável)
- `backup.test.js` — testes automatizados do `backup.js`, incluindo o ciclo exportar → importar
- `seedGuard.js` — decide quando é seguro propor enviar o localStorage pro Supabase (blindagem contra repovoar o banco sem querer)
- `seedGuard.test.js` — testes automatizados do `seedGuard.js`
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
| **Início** | Um quadrado por mesa (Grupo C, Grupo Aurora) que leva para os personagens daquele grupo, e quadradinhos dos reinos que levam para as fichas e os NPCs de cada reino |
| **Objetivos** | Metas da campanha com estados (Ativo/Pausado/Concluído) |
| **Personagens** | Fichas completas dos 19 personagens (13 do Grupo C + 6 do Grupo Aurora) e a seleção "NPCs do mundo" (cartões por reino e cidade, ex.: Katalão › Frontier), com edição, seletor de mesa, teste de Atributo+Perícia e rolagem de ataque contra um alvo sintético direto na ficha |
| **Confronto** | Simulador de combate — ataque vs defesa, rolagem completa |
| **Habilidades** | Catálogo das 11 Habilidades Passivas de Combate |
| **Regras** | Referência do sistema e status effects |
| **Mundo** | Mapa do mundo interativo: reinos com `mapa` definido (Katalão) ganham território desenhado por polígono (hover mostra nome/descrição, clique "recorta" com zoom e mostra as cidades posicionadas) — reino sem `mapa` segue com o pino de sempre. Botão "Editar mapa" liga um modo pra traçar a fronteira e posicionar/arrastar/remover cidades, tudo salvo via storage.js. Cada reino também tem abas de texto (Visão geral, Cidades e, em Katalão, Casas, Etiquetas e Mapa do reino); cidades com conteúdo próprio (Frontier) abrem com sub-abas: Visão geral, Distritos (mapa clicável), Personagens, Forças e, no modo GM, Mesa do mestre. Clicar numa cidade no mapa interativo abre um modal-resumo (nome, reino, resumo curto) com três botões — **Visão geral**, **Distritos** e **Pessoas de interesse** — que levam pra página da cidade (`CidadePaginaView`), uma sub-tela do Mundo no mesmo espírito da ficha de personagem: cabeçalho roxo com nome + reino, trilha "Mundo > Reino > Cidade" (cada nível clicável) e as três seções como abas. Visão geral tem textos editáveis (resumo e visão geral longa) e imagem (mesmo upload dos retratos); Distritos é uma lista de cartões (nome, descrição, notas) editável, com adicionar/remover; Pessoas de interesse são registros leves (nome, papel, descrição, facção, imagem opcional) — **não é ficha de personagem** — com um vínculo opcional (`personagemId`) pra uma ficha já existente, que mostra um botão "Abrir ficha"; sem vínculo, ou se a ficha vinculada foi apagada, o registro continua funcionando normal, só sem o botão. Cidades sem distritos/pessoas (as 11 de Katalão, por exemplo) mostram um estado vazio convidativo em vez de área em branco |
| **Deuses** | 7 deidades do panteão |
| **Sagas** | Arcos narrativos da campanha |

**Ver como Jogador / GM**: o seletor no canto superior direito esconde ou mostra o conteúdo do mestre (segredos e ganchos dos NPCs, versões do mestre de distritos e termos, aba Mesa do mestre). Começa em Jogador e fica salvo no navegador. Por enquanto qualquer um pode trocar; o conteúdo do mestre está no código publicado, então não é segredo de verdade para quem procurar.

O app **não exige login**: qualquer pessoa com o link edita, exclui, salva e gasta MP/SP direto, a qualquer momento (uso atual é só entre pessoas de confiança). Ver "Dados (Supabase) e backup" abaixo — inclusive o botão de backup manual, já que sem login qualquer um também pode apagar algo sem querer.

## Estrutura da ficha

- **Grupo (mesa)**: Grupo C (campanha principal) ou Grupo Aurora (Sidepoint)
- **Singularidade**, **Habilidade de Raça** + **2 Classes** — tabelas de 3 caixas em largura total, acima dos atributos
- **Atributos Gerais** (9): Força, Destreza, Vigor / Carisma, Manipulação, Compostura / Inteligência, Perspicácia, Resolução
- **Proficiências** (32), em 4 categorias: Combate, Física, Social, Mental
- **Estatísticas de Combate**: Defesa, Resistência Armadura, Resistência Natural Física, Resistência Natural Mágica, Geral. Acerto não é estatística fixa — é calculado por tipo de ataque (corpo a corpo, arma de fogo, mágico)
- **Recursos**: HP (definido por Vigor), MP (azul), SP (verde)
- **Habilidades Passivas de Combate**: até 3 espaços por personagem, clicáveis — a Singularidade não ocupa espaço
- **Painel Teste/Ataque**: seletor com dois modos — Teste (Atributo+Perícia, igual sempre) e Ataque (rola um ataque do personagem contra um alvo sintético com Defesa/Resistências definidas ali mesmo, sem precisar abrir o Confronto)

## Dados (Supabase) e backup

Os dados da campanha (personagens, mundo, deuses, sagas, objetivos) ficam num projeto Supabase — sincronizados entre qualquer aparelho que abrir o app, sem precisar de login. Sem conexão, o app cai pro cache local (localStorage) e continua funcionando; a próxima vez que conseguir falar com o Supabase, ele volta a ser a fonte de verdade.

### O que você precisa rodar no Supabase (uma vez só)

No painel do seu projeto Supabase → **SQL Editor** → **New query** → cola o conteúdo inteiro de [`supabase/schema.sql`](supabase/schema.sql) → **Run**. Esse arquivo é seguro de rodar mais de uma vez (idempotente). Ele cria:

1. **`point_kv`** — tabela chave/valor, uma linha por chave que o app já salvava (`point-characters`, `point-kingdoms`, `point-gods`, `point-sagas`, `point-objectives`). Leitura e escrita públicas (RLS libera o papel `anon`) — sem exigir login.
2. **Bucket `retratos`** — Storage pras imagens de personagem enviadas pelo formulário. Leitura e upload públicos.

Nada mais é necessário no banco — sem tabelas ou índices adicionais.

### Sem login, de propósito

Qualquer pessoa com o link do app edita, exclui, salva e gasta MP/SP direto — não existe mais um botão "Entrar como mestre". Decisão atual: o app é usado só por gente de confiança, então o portão de autenticação só atrapalhava. Se um dia isso mudar (mais gente com o link, por exemplo), dá pra reintroduzir login/RLS restrita — a camada `storage.js` já isola isso do resto do app.

**Se o banco estiver vazio** (banco recém-criado, ou a tabela `point_kv` ficou vazia por algum motivo) e o navegador que abriu o app tiver personagens salvos no localStorage (de uma sessão anterior, offline), o app **pergunta antes de fazer qualquer coisa** — mostra quantos personagens tem localmente e pede confirmação pra enviar pro Supabase. Isso existe de propósito: sem login, qualquer um poderia abrir o site com uma tabela vazia por engano e repovoar o banco sozinho, sem querer, com uma cópia velha do navegador dele — a confirmação evita isso. Recusar não sobe nada, e só pergunta uma vez por sessão. Todo envio confirmado fica registrado (console do navegador + uma chave de histórico, `point-seed-log`) pra dar pra conferir depois se precisar.

### Backup manual

Sem login, qualquer um pode apagar algo sem querer — por isso o cabeçalho tem dois botões: **Backup** baixa um `.json` com tudo (personagens, reinos, deuses, sagas, objetivos) e **Importar** lê um desses arquivos de volta (pede confirmação antes, porque substitui os dados atuais inteiros). Vale baixar um de vez em quando, principalmente antes de uma sessão de jogo.

### Upload de imagem

No formulário de personagem, "Enviar imagem do computador" redimensiona a imagem no navegador (máximo 512px, JPEG ~80% de qualidade) antes de subir pro bucket `retratos`, e preenche a URL pública automaticamente. "Remover" limpa o campo e tenta apagar o arquivo do bucket (melhor esforço — se falhar, não trava a UI).

### Limites conhecidos (documentados, não escondidos)

- **Sem fila de retry offline pra escrita**: se a escrita no Supabase falhar (rede caiu no meio de uma edição), a mudança fica salva no cache local do seu navegador mas não sincroniza sozinha depois — só na próxima edição bem-sucedida daquela mesma chave. Editar de novo (ou só reabrir com internet) resolve.
- **Sem controle de quem mudou o quê**: como não tem mais login, o app não sabe quem editou cada coisa — se duas pessoas editarem a mesma ficha ao mesmo tempo, a última a salvar vence (sem aviso de conflito). Isso é aceitável pro uso atual (grupo pequeno e de confiança); o backup manual existe justamente pra cobrir esse risco.

## Como rodar localmente

```
npm install
npm run dev
```

Abre em `http://localhost:5173/Point/` (o `/Point/` no caminho é de propósito — ver "Publicar" abaixo). Copie `.env.example` pra `.env.local` e preencha com os dados do seu projeto Supabase pra testar com dados de verdade — sem isso, o app funciona igual, só que sempre com localStorage puro (sem sincronizar entre aparelhos).

## Testes

O motor de combate, o Grupo Aurora, as cidades semente, o backup e a blindagem de seed têm suíte de testes automatizados (Node nativo, sem dependências), em `engine.test.js`, `sidepoint.test.js`, `cidades.test.js`, `backup.test.js` e `seedGuard.test.js` — 108 testes ao todo:

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

Depois desse passo (e de rodar o `supabase/schema.sql`, ver "Dados (Supabase) e backup" acima), o próximo push na `main` (por exemplo, o merge deste pull request) já publica o site. Acompanhe em *Actions*, no GitHub.

O caminho `/Point/` no meio da URL vem do nome do repositório — é assim que o GitHub Pages funciona pra sites de projeto (não é o domínio raiz `pedrogcd.github.io`, que ficaria reservado pra um repositório especial chamado `pedrogcd.github.io`, se você criar um no futuro). Se o repositório for renomeado, o caminho muda junto — é só atualizar a constante `BASE` em `vite.config.js`.
