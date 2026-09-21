# CONTEXTO — Estado do projeto Point

Documento de continuidade. Leia junto com `SISTEMA.md` (regras completas) e `README.md` (visão geral).

---

## O que é este projeto

App de gerenciamento para a campanha de RPG de mesa **Point** (universo Amaranth), em português brasileiro. Sistema próprio de 3d10. Arquivo principal: `point-amaranth-app.jsx` (componente React, ~300KB) + `engine.js` (motor de combate, extraído dele — ver "Arquitetura do motor" abaixo).

Publicado como site próprio (Vite + PWA, deploy no Vercel) — ver "Arquitetura de publicação" abaixo. **Não depende mais do Lovable.**

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
Decisão do Pedro: parar de depender do Lovable e publicar como app web próprio a partir deste repositório. Motivo prático — o Lovable trava por falta de créditos e tinha uma base de código paralela (`src/lib/rpg.ts`, modular) que nunca foi reconciliada com este `point-amaranth-app.jsx`; manter os dois sincronizados era trabalho duplicado. Agora o repositório é a única fonte de verdade, publicado via Vercel (ver "Arquitetura de publicação").

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

## Arquitetura de publicação (Vite + PWA + Vercel)

Desde 21/09 o repositório é um app Vite completo, não só um arquivo `.jsx` solto:

- **`index.html` / `main.jsx`** — scaffold padrão do Vite. `main.jsx` só monta `<App/>` (default export de `point-amaranth-app.jsx`) no `#root`.
- **`storage.js`** — camada de armazenamento isolada, ver "Por que a camada de storage é separada" abaixo.
- **`vite.config.js`** — plugin React + `vite-plugin-pwa` (gera manifest, ícones referenciados e o service worker via Workbox).
- **`public/`** — `icon.svg` (favicon) e `icons/*.png` (192/512, normal e maskable). Gerados por script (sem lib de imagem — zlib + PNG cru), não são artes feitas por um designer; é um selo dourado simples com "P", dá pra trocar por uma arte de verdade depois sem mexer em mais nada.
- **`.github/workflows/ci.yml`** — roda `npm test` + `npm run build` em todo push e pull request, qualquer branch.
- **`.github/workflows/deploy.yml`** — em push na `main`: roda os testes de novo e, só se passarem, publica no Vercel via CLI (`vercel pull` → `vercel build` → `vercel deploy --prebuilt --prod`), usando os secrets `VERCEL_TOKEN`/`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID`. **Esses secrets são passos manuais que o Pedro precisa configurar** — ver pendência 1 abaixo e o README ("Publicar (Vercel)") para o passo a passo.
- `package.json`: `npm run build` = `npm test && vite build` — o build falha se os testes falharem, então mesmo se algo disparar um build fora do GitHub Action (o próprio Vercel, um build manual), a trava continua valendo.

### Por que a camada de storage é separada
O app usava `window.storage` (API que só existe dentro do ambiente do Claude/Lovable). Fora de lá isso não existe. `storage.js` isola um `get(key)`/`set(key, value)` assíncrono — hoje implementado com `localStorage`, mas é a ÚNICA peça que precisa mudar se um dia trocar por Supabase (ou outro backend): o resto do app (as migrações de personagem, os `useEffect` de load/save) não sabe nem precisa saber onde os dados realmente vivem. Detalhe: `get()` devolve `{ value: string } | undefined` (não o valor cru) de propósito — é o mesmo formato que `window.storage` tinha, pra não precisar reescrever a lógica de migração que já esperava esse formato.

### Testado localmente antes de commitar
`npm run build` gerou o `dist/` esperado (manifest, ícones, `sw.js`, `workbox-*.js`). Rodado num Chromium headless (Playwright) via `npm run preview`: app carrega sem erros de console, navegação entre abas funciona (Confronto, ficha de personagem), service worker registra e assume controle da página, `localStorage` funciona, e — testado de verdade, não só por inspeção — o app **continua funcionando com a rede desligada** (`context.setOffline(true)` no Playwright, recarregando a página).

**Achado durante esse teste**: o app carrega as fontes (Cinzel/Spectral/IBM Plex Mono) via `@import` do Google Fonts em tempo de render (não é algo que eu adicionei agora — já existia). Isso não é coberto pelo precache padrão do service worker (que só pega os arquivos gerados pelo build). Adicionado `runtimeCaching` no `vite.config.js` pra `fonts.googleapis.com`/`fonts.gstatic.com` (CacheFirst, 1 ano) — sem isso, offline de verdade cairia pra fonte padrão do sistema depois da 1ª visita.

---

## Estado atual: FUNCIONANDO, com rede de segurança de novo

Auditoria completa feita em sessão anterior: **161 testes automatizados, 0 falhas** — mas rodados num ambiente temporário que não persistiu, então não sobreviveram no repositório (isso foi corrigido, ver abaixo).

**17/09**: motor extraído para `engine.js` e reconstruída uma suíte de testes com `node --test` (nativo do Node 20+, sem dependências), usando `Math.random` mockado (via `t.mock.method`) para dados controlados — exceto os testes de balanceamento, que usam aleatoriedade real com 20.000 amostras. **55 testes, 0 falhas**, rodados 5x seguidas sem flakiness. Cobre: `resolveAttack` (acerto, crítico, confirmação), `computeStat`, `limiarDaHabilidade`, `findTriggeredProc`, as 11 Habilidades Passivas de Combate (uma a uma), os 6 status effects (IMPACTO, DESACELERAÇÃO, ENRAIZAMENTO, ACELERAÇÃO, CHAMAS, ENVENENAMENTO), as camadas de defesa (Escudo de Mana → Armadura → Resistência Natural) e o balanceamento estatístico (confirmado empiricamente: ~27% com armadura, ~40% sem — bate com os números documentados acima). Rodar com `npm test` ou `node --test`.

**Achado durante a escrita dos testes, confirmado como bug e corrigido no mesmo dia**: IMPACTO, CHAMAS e ENVENENAMENTO, quando concedidos pelo *texto* do ataque (campo `efeito`), rolavam a confirmação mesmo se o ataque errasse o Acerto (`successes === 0`) — só a via de concessão por Habilidade Passiva (`impactoDeProc`/`chamasDeProc`) checava `fezContato` antes. Corrigido em `engine.js`: as três linhas (`instanciasImpacto`/`instanciasChamas`/`instanciasEnvenenamento`) agora também exigem `fezContato` na parte de texto — sem replicar o `!fixedSuccessMatch` das linhas de proc, já que ataques de sucesso fixo ("2S", Bombardeio de Mana) têm contato normalmente. Cobertura de regressão adicionada: efeito por texto não dispara com Acerto errado; efeito por texto ainda dispara em ataque de sucesso fixo.

Se for mexer no motor, mexa em `engine.js` e rode os testes antes de subir — eles agora **estão no repositório** e não dependem de nenhum ambiente externo.

**21/09**: repositório virou app Vite publicável direto (sem Lovable) — ver "Arquitetura de publicação" acima. `window.storage` substituído por `storage.js` (localStorage, isolado pra trocar por Supabase depois). PWA configurado (manifest, ícones, service worker offline via `vite-plugin-pwa`/Workbox, com cache de runtime pras fontes do Google Fonts). CI (`ci.yml`) roda testes+build em todo push/PR; deploy (`deploy.yml`) publica no Vercel automaticamente em push na `main`, só se os testes passarem. Tudo testado localmente (`npm run build`, `npm run preview`, Chromium headless) antes de commitar — inclusive offline de verdade, não só inspeção de código.

---

## PENDÊNCIAS

### 1. Passos manuais no Vercel/GitHub ainda não feitos (PRIORITÁRIO)
O deploy automático (`deploy.yml`) só funciona depois que o Pedro fizer, uma vez só: criar conta no Vercel, rodar `vercel link` pra criar o projeto, e cadastrar 3 secrets no GitHub (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`). Passo a passo completo no README, seção "Publicar (Vercel)". Até isso ser feito, o workflow de deploy vai falhar (sem os secrets) — o de CI (testes) funciona normalmente independente disso.

### 2. ~~Sincronizar com o Lovable~~ (obsoleta em 21/09 — decisão do Pedro)
Não se aplica mais: o Pedro decidiu parar de usar o Lovable e publicar direto deste repositório (ver "Por que saímos do Lovable" nas Decisões de design). O projeto Lovable antigo fica só como referência histórica, sem sincronização. O que ainda estava pendente de portar de lá (balanceamento, Golpe Penetrante/Persistente, Mestre do Crítico redesenhado, MP/SP, teste de ficha, 4 status novos) já estava, na prática, **implementado neste repositório** antes mesmo dessa decisão — era só o Lovable que estava atrasado, não o contrário.

### 3. Personagens ainda não preenchidos
Os 13 personagens do Grupo C têm **grau E em quase tudo** — atributos gerais, proficiências e nenhuma habilidade escolhida. Precisam ser preenchidos com valores reais.

### 4. Sistemas elementais não implementados
Discutido mas não construído. Ideias levantadas (inspiradas em Genshin Impact):
- **Electro** → concede CHAMAS; ou combo que soma dano se já houver CHAMAS
- **Cryo** → concede DESACELERAÇÃO; ou trava o alvo desacelerado
- **Geo** → concede ENRAIZAMENTO; ou "Escudo de Pedra" (mesma estrutura do Escudo de Mana, mas com Resistência Física)
- **Hydro** → concede ENVENENAMENTO; ou dobra a Ferida se o ataque também causa CHAMAS
- **Anemo** → concede IMPACTO em ataques mágicos; ou re-rola confirmação mágica inimiga

**Nota**: reações de combo verdadeiras (tipo Genshin) exigiriam rastrear status ativos no alvo entre rodadas, algo que o motor não faz — cada ataque resolve tudo na hora, sem memória.

### 5. Catálogo antigo arquivado
~86 habilidades do sistema antigo (`ABILITIES_CATALOG`) ficaram arquivadas, visíveis mas sem função. Duas já foram convertidas (Golpe Penetrante, Persistente). O resto exigiria infraestrutura nova — por exemplo, maestrias de arma específica precisariam restringir habilidade a uma arma, e hoje só dá pra restringir por Tipo (Marcial/Arma de fogo/Mágico).

### 6. Proficiências não-combate são decorativas
24 das 32 proficiências (Física, Social, Mental) não afetam nada mecanicamente ainda — só aparecem na ficha e no teste de Atributo+Perícia.

### 7. ~~IMPACTO/CHAMAS/ENVENENAMENTO por texto do ataque não checavam "fez contato"~~ (resolvida em 17/09)
Era bug, confirmado pelo Pedro. Corrigido em `engine.js` — ver "Estado atual" acima.

### 8. ~~Motor sem rede de segurança~~ (resolvida em 17/09)
Existia um risco real de qualquer edição no motor quebrar regras silenciosamente, já que os 161 testes antigos não sobreviveram no repositório. Resolvido: motor extraído para `engine.js` e nova suíte de testes (55 testes) commitada no repo (ver "Estado atual" acima).

---

## Como o Pedro trabalha

- Português brasileiro, sempre
- Prefere ver o número/simulação antes de decidir balanceamento
- Gosta de iterar rápido: pede uma mudança, vê o resultado, ajusta
- Valoriza quando você **avisa** que algo não dá pra fazer direito, em vez de fazer torto
