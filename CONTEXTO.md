# CONTEXTO — Estado do projeto Point

Documento de continuidade. Leia junto com `SISTEMA.md` (regras completas) e `README.md` (visão geral).

---

## O que é este projeto

App de gerenciamento para a campanha de RPG de mesa **Point** (universo Amaranth), em português brasileiro. Sistema próprio de 3d10. Arquivo principal: `point-amaranth-app.jsx` (componente React, ~300KB) + `engine.js` (motor de combate, extraído dele — ver "Arquitetura do motor" abaixo).

Publicado como site próprio (Vite + PWA, deploy no GitHub Pages) — ver "Arquitetura de publicação" abaixo. **Não depende mais do Lovable.**

**Link do app publicado**: https://pedrogcd.github.io/Point/

**Projeto Lovable antigo (desativado, só histórico)**: https://id-preview--1c753329-b2f1-4878-9fbe-458337a6a7ca.lovable.app — id `1c753329-b2f1-4878-9fbe-458337a6a7ca`. Ficou desatualizado (última sessão 12/09, com uma reestruturação de atributos aplicada mas sem validação final — nunca foi retomado) e o Pedro decidiu não usar mais. Não sincronizar; só serve de referência arqueológica se um dia for preciso recuperar algo de lá.

---

## Decisões de design (o "porquê" por trás das regras)

### Por que Atributos de Combate estão vazios
O sistema **começou** com atributos próprios de combate (Força, Percepção, Agilidade, Resistência, Inteligência, Determinação), depois migrou pro modelo Fire Emblem (Magia, Técnica, Sorte, Defesa, Resistência Física/Mágica), e por fim para o modelo Vampiro: A Máscara. Na última reforma, **todos** os atributos de combate foram esvaziados: o que era atributo virou Proficiência de Combate.

`ATTR_LIST` existe mas está `[]` de propósito. Não remova — ainda é usado em `.find()` com fallback para `ATRIBUTOS_GERAIS_LIST`.

### Por que a Magia foi dividida em duas
O atributo "Magia" virou duas proficiências: **Magias Ofensivas** (Combate — usada em todo cálculo de ataque mágico) e **Magias Gerais** (Mental — conhecimento mágico sem função de combate).

### Por que Técnica é o atributo padrão das habilidades
Decisão explícita do Pedro: "Técnica vai ser o atributo principal para habilidades em geral". Golpe Preciso, Giro Defensivo e Borrão usam a Proficiência de Técnica como limiar.

### Por que as defensivas re-rolam em vez de anular
Versão original anulava a confirmação inimiga. Isso quebrava o jogo: com Resistência alta, os dados que fariam a confirmação passar eram os mesmos que disparavam a habilidade — resultado, era impossível acertar. Trocado para **re-rolar o dado uma vez**.

### Por que o Mestre do Crítico não usa limiar de atributo
Testado com limiar variável e ficou forte demais. Virou um `-1` flat no valor de crítico (9+ em vez de 10), valendo para todos os dados da rolagem.

### Por que Golpe Preciso só dobra uma vez
Sem o limite, 3 dados qualificando davam 6 sucessos. Limitado a uma ativação por ataque.

### Balanceamento calibrado por simulação
Meta: personagem com tudo em grau E deve ter ~25% de chance de causar 1 de ferimento com ataque desarmado contra alvo com armadura. Valores resultantes: Defesa 8, Resistência Armadura 8, Resistências Naturais 6. Verificado: 25-27% com armadura, ~40% sem.

### Vigor define HP; os outros atributos gerais são narrativos
HP = 2 + bônus de Vigor (E=2 a A=6). Carisma, Manipulação, Compostura, Inteligência, Perspicácia e Resolução **não têm função de combate por design** — servem para testes interpretativos.

### Por que saímos do Lovable (21/09)
Decisão do Pedro: parar de depender do Lovable e publicar como app web próprio a partir deste repositório. Motivo prático — o Lovable trava por falta de créditos e tinha uma base de código paralela (`src/lib/rpg.ts`, modular) que nunca foi reconciliada com este `point-amaranth-app.jsx`; manter os dois sincronizados era trabalho duplicado. Agora o repositório é a única fonte de verdade, publicado no GitHub Pages (ver "Arquitetura de publicação").

### Por que GitHub Pages em vez de Vercel (21/09, mesmo dia)
Primeira tentativa foi Vercel (deploy via CLI no GitHub Action, com secrets `VERCEL_TOKEN`/`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID`). O Pedro trocou por GitHub Pages pra não depender de conta externa, CLI nem token — só o GitHub mesmo, que já é usado de qualquer forma. Custo: a URL carrega o nome do repositório no caminho (`/Point/`), por isso o `base` do Vite e o `start_url`/`scope` do manifest do PWA precisam apontar pra lá (ver `vite.config.js`, constante `BASE`) — não é a raiz do domínio como seria no Vercel.

### Por que Supabase virou a fonte de verdade, não só um backup (21/09)
Motivo do Pedro: dados sincronizados entre aparelhos (celular na mesa, notebook em casa) e upload de imagem direto no app, sem precisar hospedar imagem em outro lugar e colar URL. `get()` no `storage.js` agora tenta o Supabase PRIMEIRO (não o localStorage) — é isso que garante que abrir o app em outro aparelho já puxa o que o mestre salvou no último. O localStorage vira só cache/fallback pra quando não tem rede.

### Por que ficou só-leitura sem login, em vez de exigir login sempre
O Pedro quer que o grupo (jogadores) consiga abrir o app, ver fichas, rolar Confronto e testar Atributo+Perícia sem precisar de conta — só ele (mestre) precisa editar. A trava de verdade é a RLS do Supabase (escrita exige `authenticated`); esconder os botões de editar/excluir/salvar no app é só UX (evita cliques que dariam erro silencioso), não é a camada de segurança.

---

## Arquitetura do motor de combate

Desde a auditoria de teste (ver "Estado atual" abaixo), o motor foi **extraído para `engine.js`** — um módulo Node puro, sem React/JSX/ícones, importado de volta por `point-amaranth-app.jsx`. Isso existe pra garantir que os testes automatizados rodem contra o mesmo código que o app usa (fonte única), não uma cópia que pode divergir.

Funções-chave em `engine.js`:

| Função | O que faz |
|---|---|
| `resolveAttack({attacker, defender, attack})` | Ponto de entrada. Rola Acerto e chama a fase de Confirmação |
| `resolveConfirmationPhase({...})` | Extraída para poder ser re-executada quando um dado de Acerto muda (gasto de MP/SP) |
| `computeStat(character, statKey)` | Base + Proficiência de Combate vinculada + ajuste temporário |
| `getAttrGrade(character, key)` | Busca grau em `attributes` OU `atributosGerais` (compatibilidade da migração) |
| `limiarDaHabilidade(character, p)` | 11 − grau; aceita atributo e/ou proficiência, usa o melhor |
| `findTriggeredProc(...)` | Acha qual habilidade dispara num dado; exclui `furia_crescente` (tratada à parte) |
| `computeMaxHP` / `computeMaxSP` | Vigor e bônus de Persistente |

**Constante importante**: `STAT_PROF_LINK` mapeia estatística → proficiência que soma nela.

O que **fica** em `point-amaranth-app.jsx` (não foi extraído por ser puramente visual): cores/tokens de tema, `HABILIDADE_CATEGORIA_INFO` (ícones lucide-react), `STATUS_EFFECTS` (textos de referência da aba Regras — o comportamento de verdade está em `engine.js`, esse array é só documentação exibida na UI), componentes React.

---

## Arquitetura de publicação (Vite + PWA + GitHub Pages)

Desde 21/09 o repositório é um app Vite completo, não só um arquivo `.jsx` solto:

- **`index.html` / `main.jsx`** — scaffold padrão do Vite. `main.jsx` só monta `<App/>` (default export de `point-amaranth-app.jsx`) no `#root`.
- **`storage.js` / `supabaseClient.js` / `auth.js` / `imageUpload.js`** — camada de dados, ver "Arquitetura de dados (Supabase)" abaixo.
- **`vite.config.js`** — plugin React + `vite-plugin-pwa` (gera manifest, ícones referenciados e o service worker via Workbox). Tem uma constante `BASE = "/Point/"` (nome do repositório) usada no `base` do Vite e no `start_url`/`scope` do manifest/`navigateFallback` do service worker — **importante**: se o repositório for renomeado, é só atualizar essa constante; o `npm run dev` também serve em `/Point/`, não na raiz, por causa disso.
- **`public/`** — `icon.svg` (favicon) e `icons/*.png` (192/512, normal e maskable). Gerados por script (sem lib de imagem — zlib + PNG cru), não são artes feitas por um designer; é um selo dourado simples com "P", dá pra trocar por uma arte de verdade depois sem mexer em mais nada.
- **`.github/workflows/ci.yml`** — roda `npm test` + `npm run build` em todo push e pull request, qualquer branch.
- **`.github/workflows/pages.yml`** — em push na `main`: job `test` (roda os testes) → job `build` (só roda se `test` passar; `npm run build`, depois `actions/upload-pages-artifact`) → job `deploy` (só roda se `build` passar; `actions/deploy-pages`, publica em https://pedrogcd.github.io/Point/). Cada job depende do anterior via `needs` — se algum falhar, os seguintes nem começam. **Não precisa de secret nenhum** — só usa o `GITHUB_TOKEN` automático do Actions (via as permissions `pages: write`/`id-token: write` declaradas no workflow).
- `package.json`: `npm run build` = `npm test && vite build` — o build falha se os testes falharem, trava extra que vale mesmo fora do GitHub Action (build manual, por exemplo).

---

## Arquitetura de dados (Supabase)

Desde 21/09 (mesmo dia, sessão seguinte à publicação no Pages) o app usa Supabase como backend: dados sincronizados entre aparelhos + upload de imagem. `storage.js` continua isolando o resto do app da implementação de verdade — a interface `get(key)`/`set(key, value)` não mudou (mesmo formato `{ value: string } | undefined` de sempre, herdado do antigo `window.storage`), só o que tem por trás dela.

**Arquivos**:
- **`supabaseClient.js`** — cria o cliente a partir de `import.meta.env.VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`. Se as env vars não existirem (build sem os secrets, dev sem `.env.local`), `supabase` fica `null` e `supabaseConfigured` fica `false` — **todo o resto do app trata isso como "sempre offline, sempre deslogado"** em vez de quebrar. Isso é o que permite o `ci.yml` (que não recebe os secrets) buildar normalmente.
- **`storage.js`** — `get(key)` tenta o Supabase primeiro (tabela `point_kv`, ver `supabase/schema.sql`); se der certo, atualiza o cache local e devolve esse valor; se falhar (offline, sem Supabase configurado, tabela ainda não criada, RLS) cai pro `localStorage`. `set(key, value)` grava no `localStorage` sempre, e só tenta gravar no Supabase se houver sessão autenticada (nem tenta sem sessão — evitaria erro de RLS sem propósito). Exporta também `seedFromLocalIfEmpty()`: roda em todo login, sobe pro Supabase qualquer chave `point-*` que exista no localStorage mas ainda não exista lá — nunca sobrescreve o que já está no Supabase, idempotente.
- **`auth.js`** — `signIn`/`signOut`/`getSession`/`onAuthStateChange`, tudo em cima de `supabase.auth` (e-mail/senha). Sem Supabase configurado, vira no-op (`onAuthStateChange` chama o callback com `null` na hora e não faz mais nada).
- **`imageUpload.js`** — `uploadPortrait(file, characterId)`: redimensiona no `<canvas>` do navegador (máx. 512px no maior lado, JPEG qualidade 0.8, sem nenhuma lib) e sobe pro bucket `retratos` em `${characterId}/${timestamp}.jpg`, devolve a URL pública. `removePortrait(url)`: best-effort, extrai o path da URL e tenta apagar — se falhar, não trava a UI (o campo `imageUrl` já foi limpo, que é o que o usuário percebe).
- **`supabase/schema.sql`** — SQL idempotente (`drop policy if exists` antes de cada `create policy`, `create table if not exists`) pro Pedro rodar no SQL Editor do Supabase. Cria a tabela `point_kv` (key text PK, value jsonb, updated_at timestamptz, RLS: select público, insert/update/delete só `authenticated`) e o bucket `retratos` (RLS do Storage: select público, insert/update/delete só `authenticated`).

**Modo somente-leitura**: `App` guarda `session` (via `auth.onAuthStateChange`) e deriva `readOnly = !session`. `readOnly`/`onUpdateCharacter` (`undefined` quando readOnly) são passados pra baixo pros componentes que mutam algo — cada um esconde seus próprios botões de criar/editar/excluir e blinda as funções de mutação com `if (readOnly) return` (mesmo padrão que já existia pro `onUpdateCharacter &&` do "Restaurar MP/SP"). **Confronto e o Teste (rolar dados) continuam 100% funcionais sem login** — só não chamam `onUpdateCharacter`, então gastar MP/SP durante uma rolagem simplesmente não persiste (o botão "Usar MP/SP" nem aparece sem login).

**Login**: botão discreto "Entrar como mestre" no canto superior direito do cabeçalho, abre um modal simples (e-mail + senha) — ver `LoginModal` em `point-amaranth-app.jsx`, perto do `ConfirmDialog`.

### Testado localmente antes de commitar
`npm run build` gerou o `dist/` esperado (manifest, ícones, `sw.js`, `workbox-*.js`, tudo com o prefixo `/Point/` nas URLs — conferido lendo o HTML/manifest/service worker gerados, não só assumindo que o `base` do Vite ia propagar sozinho). Rodado num Chromium headless (Playwright) via `npm run preview` (que serve em `http://localhost:4173/Point/`): app carrega sem erros de console, navegação entre abas funciona (Confronto, ficha de personagem), service worker registra com escopo `/Point/` e assume controle da página, `localStorage` funciona, e — testado de verdade, não só por inspeção — o app **continua funcionando com a rede desligada** (`context.setOffline(true)` no Playwright, recarregando a página).

**Achado durante esse teste**: o app carrega as fontes (Cinzel/Spectral/IBM Plex Mono) via `@import` do Google Fonts em tempo de render (não é algo que eu adicionei agora — já existia). Isso não é coberto pelo precache padrão do service worker (que só pega os arquivos gerados pelo build). Adicionado `runtimeCaching` no `vite.config.js` pra `fonts.googleapis.com`/`fonts.gstatic.com` (CacheFirst, 1 ano) — sem isso, offline de verdade cairia pra fonte padrão do sistema depois da 1ª visita.

### Testado depois da integração com Supabase (21/09)
**Limitação do ambiente**: o sandbox onde rodo bloqueia acesso de saída pro domínio `supabase.co` (política de rede) — não dá pra testar login de verdade, sync de dados nem upload de imagem contra o projeto real do Pedro. Documentado essa limitação sem esconder — ver README, "Limites conhecidos".

O que testei de verdade, com Chromium headless (Playwright), com `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` reais num `.env.local` (não commitado):
- Build com Supabase configurado gera o bundle normalmente (fica ~200KB maior por causa do `@supabase/supabase-js` — Vite avisa que o chunk passou de 500KB; não mexi nisso, é só um aviso de performance, não um erro).
- Com o Supabase configurado mas inacessível (o bloqueio do sandbox vira, sem querer, um teste de "Supabase fora do ar"): o app carrega normalmente, cai pro localStorage, nenhum erro de página.
- Modo somente-leitura: sem sessão, "Nova Ficha", "Novo Deus", "Nova Saga", "Novo Objetivo" e os botões de editar/excluir na ficha **não aparecem** (confirmado via `isVisible()` do Playwright, não só lendo o código).
- Tentativa de login (com a rede bloqueada) mostra a mensagem de erro tratada ("E-mail ou senha incorretos.") em vez de travar a UI ou estourar um erro no console.
- Confronto continua rolando ataques normalmente sem login; o botão "Usar MP" não aparece depois do resultado.
- Offline de verdade (`context.setOffline(true)`) continua funcionando com o Supabase configurado.
- Build **sem** nenhuma env var do Supabase: funciona igual, e confirmei que o app **nem tenta** nenhuma requisição de rede pro Supabase nesse caso (só as fontes do Google, que já existiam) — a checagem `supabaseConfigured` na inicialização evita a tentativa, não é só um catch silencioso depois de falhar.

---

## Estado atual: FUNCIONANDO, com rede de segurança de novo

Auditoria completa feita em sessão anterior: **161 testes automatizados, 0 falhas** — mas rodados num ambiente temporário que não persistiu, então não sobreviveram no repositório (isso foi corrigido, ver abaixo).

**17/09**: motor extraído para `engine.js` e reconstruída uma suíte de testes com `node --test` (nativo do Node 20+, sem dependências), usando `Math.random` mockado (via `t.mock.method`) para dados controlados — exceto os testes de balanceamento, que usam aleatoriedade real com 20.000 amostras. **55 testes, 0 falhas**, rodados 5x seguidas sem flakiness. Cobre: `resolveAttack` (acerto, crítico, confirmação), `computeStat`, `limiarDaHabilidade`, `findTriggeredProc`, as 11 Habilidades Passivas de Combate (uma a uma), os 6 status effects (IMPACTO, DESACELERAÇÃO, ENRAIZAMENTO, ACELERAÇÃO, CHAMAS, ENVENENAMENTO), as camadas de defesa (Escudo de Mana → Armadura → Resistência Natural) e o balanceamento estatístico (confirmado empiricamente: ~27% com armadura, ~40% sem — bate com os números documentados acima). Rodar com `npm test` ou `node --test`.

**Achado durante a escrita dos testes, confirmado como bug e corrigido no mesmo dia**: IMPACTO, CHAMAS e ENVENENAMENTO, quando concedidos pelo *texto* do ataque (campo `efeito`), rolavam a confirmação mesmo se o ataque errasse o Acerto (`successes === 0`) — só a via de concessão por Habilidade Passiva (`impactoDeProc`/`chamasDeProc`) checava `fezContato` antes. Corrigido em `engine.js`: as três linhas (`instanciasImpacto`/`instanciasChamas`/`instanciasEnvenenamento`) agora também exigem `fezContato` na parte de texto — sem replicar o `!fixedSuccessMatch` das linhas de proc, já que ataques de sucesso fixo ("2S", Bombardeio de Mana) têm contato normalmente. Cobertura de regressão adicionada: efeito por texto não dispara com Acerto errado; efeito por texto ainda dispara em ataque de sucesso fixo.

Se for mexer no motor, mexa em `engine.js` e rode os testes antes de subir — eles agora **estão no repositório** e não dependem de nenhum ambiente externo.

**21/09**: repositório virou app Vite publicável direto (sem Lovable) — ver "Arquitetura de publicação" acima. `window.storage` substituído por `storage.js` (localStorage, isolado pra trocar por Supabase depois). PWA configurado (manifest, ícones, service worker offline via `vite-plugin-pwa`/Workbox, com cache de runtime pras fontes do Google Fonts). Primeira versão publicava no Vercel; trocado no mesmo dia por **GitHub Pages** (sem conta externa/CLI/token — ver "Por que GitHub Pages em vez de Vercel"). `base` do Vite e `start_url`/`scope`/`navigateFallback` do PWA ajustados pra `/Point/` (caminho do repositório no Pages). Tudo testado localmente de novo depois da troca (`npm run build`, `npm run preview` em `/Point/`, Chromium headless) antes de commitar — inclusive offline de verdade, não só inspeção de código.

**21/09 (mesmo dia, sessão seguinte)**: migração de armazenamento pro Supabase — dados sincronizados entre aparelhos, login do mestre (e-mail/senha) com modo somente-leitura pra quem não estiver logado, upload de imagem de personagem. Ver "Arquitetura de dados (Supabase)" acima pro detalhe completo. Resumo: `storage.js` reescrito (Supabase como fonte de verdade, localStorage como cache — interface `get`/`set` não mudou), `auth.js` e `supabaseClient.js` novos, `imageUpload.js` novo (redimensiona no canvas antes de subir), `supabase/schema.sql` novo (tabela `point_kv` + bucket `retratos`, RLS: leitura pública, escrita autenticada), `pages.yml` passa os 2 secrets do Supabase pro build. App inteiro ganhou um `readOnly` derivado da sessão, propagado pra cada tela que edita algo.

---

## PENDÊNCIAS

### 1. Passos manuais que faltam do lado do Pedro (PRIORITÁRIO)
Duas coisas, independentes uma da outra:
- **GitHub Pages**: no repositório, **Settings → Pages → Source: GitHub Actions**. Sem isso o job `deploy` do `pages.yml` falha (`test` e `build` funcionam normalmente do mesmo jeito).
- **Supabase**: rodar `supabase/schema.sql` no SQL Editor do projeto (uma vez só, idempotente — seguro rodar de novo). Sem isso, a tabela `point_kv` e o bucket `retratos` não existem, e o app funciona inteiro em modo leitura com localStorage (não quebra, só não sincroniza nem aceita upload).

Depois dos dois, o merge deste PR (ou qualquer push na `main`) já publica em https://pedrogcd.github.io/Point/ com o Supabase funcionando de ponta a ponta.

### 2. Login/sync/upload nunca foram testados contra o Supabase de verdade
O sandbox onde essas sessões rodam bloqueia acesso de saída pro domínio `supabase.co` — não dá pra fazer um teste end-to-end de verdade daqui. Testei tudo que dava pra testar sem essa conexão (ver "Testado depois da integração com Supabase" acima: build, modo leitura, Confronto funcionando, erro de login tratado, offline, degradação sem Supabase configurado). Depois do deploy, vale o Pedro confirmar manualmente: logar de verdade, editar uma ficha e ver se sincroniza abrindo em outro aparelho, e subir uma imagem. Se algo não funcionar como esperado, é só trazer o erro exato do console do navegador.

### 3. Sem fila de retry pra escrita offline
Se o mestre estiver logado e a escrita no Supabase falhar no meio de uma edição (rede caiu), a mudança fica só no cache local do navegador dele até a próxima escrita bem-sucedida daquela mesma chave — não há retry automático em background. Documentado no README ("Limites conhecidos"). Se isso incomodar na prática, dá pra resolver depois com uma fila simples (guardar as chaves que falharam e tentar de novo quando a conexão voltar, via `navigator.onLine`/evento `online`).

### 4. ~~Sincronizar com o Lovable~~ (obsoleta em 21/09 — decisão do Pedro)
Não se aplica mais: o Pedro decidiu parar de usar o Lovable e publicar direto deste repositório (ver "Por que saímos do Lovable" nas Decisões de design). O projeto Lovable antigo fica só como referência histórica, sem sincronização. O que ainda estava pendente de portar de lá (balanceamento, Golpe Penetrante/Persistente, Mestre do Crítico redesenhado, MP/SP, teste de ficha, 4 status novos) já estava, na prática, **implementado neste repositório** antes mesmo dessa decisão — era só o Lovable que estava atrasado, não o contrário.

### 5. Personagens ainda não preenchidos
Os 13 personagens do Grupo C têm **grau E em quase tudo** — atributos gerais, proficiências e nenhuma habilidade escolhida. Precisam ser preenchidos com valores reais.

### 6. Sistemas elementais não implementados
Discutido mas não construído. Ideias levantadas (inspiradas em Genshin Impact):
- **Electro** → concede CHAMAS; ou combo que soma dano se já houver CHAMAS
- **Cryo** → concede DESACELERAÇÃO; ou trava o alvo desacelerado
- **Geo** → concede ENRAIZAMENTO; ou "Escudo de Pedra" (mesma estrutura do Escudo de Mana, mas com Resistência Física)
- **Hydro** → concede ENVENENAMENTO; ou dobra a Ferida se o ataque também causa CHAMAS
- **Anemo** → concede IMPACTO em ataques mágicos; ou re-rola confirmação mágica inimiga

**Nota**: reações de combo verdadeiras (tipo Genshin) exigiriam rastrear status ativos no alvo entre rodadas, algo que o motor não faz — cada ataque resolve tudo na hora, sem memória.

### 7. Catálogo antigo arquivado
~86 habilidades do sistema antigo (`ABILITIES_CATALOG`) ficaram arquivadas, visíveis mas sem função. Duas já foram convertidas (Golpe Penetrante, Persistente). O resto exigiria infraestrutura nova — por exemplo, maestrias de arma específica precisariam restringir habilidade a uma arma, e hoje só dá pra restringir por Tipo (Marcial/Arma de fogo/Mágico).

### 8. Proficiências não-combate são decorativas
24 das 32 proficiências (Física, Social, Mental) não afetam nada mecanicamente ainda — só aparecem na ficha e no teste de Atributo+Perícia.

### 9. ~~IMPACTO/CHAMAS/ENVENENAMENTO por texto do ataque não checavam "fez contato"~~ (resolvida em 17/09)
Era bug, confirmado pelo Pedro. Corrigido em `engine.js` — ver "Estado atual" acima.

### 10. ~~Motor sem rede de segurança~~ (resolvida em 17/09)
Existia um risco real de qualquer edição no motor quebrar regras silenciosamente, já que os 161 testes antigos não sobreviveram no repositório. Resolvido: motor extraído para `engine.js` e nova suíte de testes (55 testes) commitada no repo (ver "Estado atual" acima).

---

## Como o Pedro trabalha

- Português brasileiro, sempre
- Prefere ver o número/simulação antes de decidir balanceamento
- Gosta de iterar rápido: pede uma mudança, vê o resultado, ajusta
- Valoriza quando você **avisa** que algo não dá pra fazer direito, em vez de fazer torto
