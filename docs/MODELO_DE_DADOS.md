# Modelo de Dados dos Lançamentos

Mapa de referência: de onde vem cada dado, onde ele mora no banco, e como se cruza pra virar indicador.
Banco: Supabase `sxoebppeutexyaljxucr`.

## 1. A coluna vertebral: `lancamentos`

Toda tabela de dado operacional se pendura em `lancamentos.codigo` (ex: `LC01`, `LC25`) via `id_lancamento`.
Se um dado novo não tiver `id_lancamento`, ele fica órfão e não entra em nenhum comparativo entre safras — esse é o erro mais fácil de cometer.

```
lancamentos (codigo, nome, data_inicio, data_fim, meta_faturamento, status)
```

## 2. As 4 fontes que você citou → onde elas moram

### a) Pesquisa de aluno (Google Forms) → `pesquisa_alunos`
- 1.172 respostas.
- Perguntas de perfil pós-compra: formação, nível acadêmico, renda, nível de Excel/mat. financeira, se já fez curso parecido.
- **Problema:** campo `lancamento` é texto livre, sem FK pra `lancamentos`. Não tem link com `leads`/`compradores` (nem por email). Hoje é uma ilha — dá pra tirar estatística agregada por lançamento (se o texto bater certinho), mas não dá pra cruzar "este aluno específico veio de qual UTM/comprou quanto".

### b) Pesquisa de avatar (Google Forms) → `avatar`
- 7.800 respostas, aplicada geralmente na entrada do funil (pré-venda).
- Perfil: idade, sexo, estado, renda familiar, tempo que conhece o Claudio, desejos/desafios, UTMs.
- Tem `id_lancamento` (FK ok) e `utm_source/medium/campaign/content/term` — então dá pra cruzar avatar × canal de aquisição diretamente.
- Link com `leads` é só por `email` (não tem FK formal), então cruzamentos exigem `JOIN ON avatar.email = leads.email`.

### c) Lista de leads com UTM (Hotmart) → `leads`
- 10.858 linhas. Todo lead que entrou no funil, com UTMs completas e dois flags: `virou_comprador`, `respondeu_avatar`.
- FK pra `lancamentos` ok.
- É o **hub de conversão**: a partir daqui você mede CAC por canal, taxa lead→comprador, e funil de UTM.

### d) Lista de compradores (Hotmart) → `compradores`
- 2.252 linhas. Tem FK direta pra `leads.id_lead` (quando a compra veio de um lead capturado) e pra `lancamentos`.
- Guarda produto, valor bruto/líquido, método e status de pagamento, UTMs próprias da compra (podem divergir das UTMs do lead original, ex. em upsell/order bump — por isso existe `tipo_venda`).

### Bônus: tráfego pago → `trafego_meta`
- 3.499 linhas, granularidade anúncio/dia: gasto, CPM, CTR, CPC, leads, cliques. É o lado de custo que fecha a conta de CAC/ROAS.

## 3. Como os dados se cruzam (o que já é possível fazer hoje)

```
trafego_meta (gasto, cliques)
      │  (por campanha/utm + data)
      ▼
   leads (utm_source, utm_medium, utm_campaign, respondeu_avatar, virou_comprador)
      │                              │
      │ email ↔ avatar.email          │ FK id_lead
      ▼                              ▼
   avatar (perfil pré-venda)     compradores (produto, valor, status)
                                       │
                                 lancamento_texto ↔ pesquisa_alunos (perfil pós-venda, hoje solto)
```

**Indicadores que já dá pra tirar sem mexer em nada:**
- CAC por UTM/campanha = `trafego_meta.total_gasto` ÷ leads ou compradores daquela campanha
- Taxa de conversão lead → comprador, geral e por UTM
- Ticket médio e faturamento por lançamento (`compradores.valor_liquido`)
- Perfil do avatar por canal de aquisição (idade/renda × utm_source)
- Evolução comparada entre lançamentos (LC01 vs LC25) em qualquer uma dessas métricas

**O que fica capado até resolver o gap do item (a):**
- Perfil do aluno (pós-venda) cruzado com o canal que ele veio ou quanto pagou — porque `pesquisa_alunos` não tem link confiável com lead/comprador.

## 4. Pendências conhecidas
1. `pesquisa_alunos` sem FK pra `lancamentos` e sem chave pra ligar a `leads`/`compradores` (ver seção 3).
2. RLS desligado em 10 tabelas (`leads`, `compradores`, `avatar`, `pesquisa_alunos`, `trafego_meta`, `lancamentos`, `funnels`, `checklist_tarefa`, `lancamento_link`, `lancamento_links_config`) — exposto pra chave anon. Corrigir com policies antes de expor o app publicamente.

## 5. Como cada dado entra de fato (ingestão)

Nenhuma ingestão acontece no repo `hello-world` — ele só lê. As fontes reais são:

| Fonte | Mecanismo | Detalhe |
|---|---|---|
| Meta Ads → `trafego_meta` | n8n, roda a cada 1h, puxa API do Meta | Upsert via `ON CONFLICT (unique_key) DO UPDATE`. Prefixos do `unique_key`: sem prefixo = ao vivo, `HIST__` = histórico manual, `CSV__` = importação CSV |
| Hotmart (compra) → `compradores` | Webhook Hotmart → `https://n8n.primeexpert.com.br/webhook/hotmart-compras` | Nós n8n: `Webhook` → `Processar Compra` (JS) → `Gravar Comprador no Supabase` (HTTP POST). Dedupe via `UNIQUE (hotmart_transaction)` |
| Formulário de Avatar → `avatar` | Google Apps Script vinculado ao Form, integrado via n8n | Perfil do lead + UTMs |
| Pesquisa de Alunos → `pesquisa_alunos` | Formulário pós-compra (Google Forms) | Ainda não confirmado se por Apps Script direto ou via n8n |
| `leads` (Hotmart + UTM) | **Ainda não mapeado** — falta confirmar | |

**Identificação do lançamento em cada fonte:**
- `trafego_meta`: campo `id_lancamento` enviado pelo próprio n8n via Meta API
- `compradores`: extraído da UTM campaign (ex: `LC25_remarketing` → `LC25`), com fallback manual fixo (ex: `'LC25'`) hardcoded no nó "Processar Compra" — **precisa ser atualizado manualmente no n8n a cada novo lançamento**, senão vendas do lançamento novo caem no código do lançamento anterior
- `avatar`: campo `id_lancamento` vindo do próprio formulário

## 6. Como o app lê tudo isso

```
trafego_meta ─────┐
avatar ────────────┤
compradores ───────┼──→ VIEW funil_lancamento ──→ API /api/funil ──→ Dashboard
pesquisa_alunos ───┘
lancamentos ───────┘
```

A view `funil_lancamento` agrega tudo em uma linha por lançamento: tráfego (investimento, leads, CPL) de `trafego_meta`, vendas principais e order bumps de `compradores` (filtrado por `tipo_venda`), avatar de `avatar`, e ROI/conversão calculados dentro da própria view.

## 7. Pontos de atenção operacionais
- **n8n fora do ar** → vendas da Hotmart ficam presas no receiver do eNotas; recuperação manual via SQL ou Postman.
- **Troca de lançamento** → é preciso trocar manualmente o fallback (ex: `'LC25'` → `'LC26'`) no nó "Processar Compra" do n8n. Esquecer esse passo é a causa mais provável de vendas aparecerem no lançamento errado.
- **Dados históricos** → importados via CSV com prefixo `HIST__` no `unique_key`, pra não colidir com dado ao vivo.
