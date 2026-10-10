# Bom dia, Stenio

Trabalhei a noite na revisão. O que segue é o que mudou, o que **só você pode
fazer** e o que eu deixei de fora de propósito.

Tudo que escrevi está commitado e no ar em
[github.com/steniodsb/aromahaus](https://github.com/steniodsb/aromahaus) —
três commits novos em cima do `3872aaa`:

| commit | assunto |
|---|---|
| `fb0bae9` | Fecha o que deixava a loja aberta antes de ela abrir |
| `1b49b97` | O que o cliente vê não pode ser diferente do que ele paga |
| `a366e2f` | Texto que ninguém lia, cinza que ninguém enxergava, coração que apagava |

`npx tsc --noEmit`, `npx eslint .` e `npm run build` passam limpos. As páginas
principais respondem 200 no dev. Subi o Next de 16.2.9 para 16.4.0 (havia RCE
na otimização de imagem); `npm audit --omit=dev` está zerado.

---

## 1. Três coisas que só você consegue fazer

Eu não tenho acesso. O MCP do Supabase dá 403 neste projeto (é de outra
conta) e o da Vercel dá 403 no time `stenio-web-designer`. **Enquanto estes
três itens não forem feitos, o site publicado não funciona** — não é questão
de polimento, é o que liga a loja.

### 1.1 Rodar a migração `0013` — bloqueia o lançamento

Supabase → SQL Editor → New query → cole
`supabase/migrations/0013_correcoes_seguranca.sql` → Run. Pode ser colada
sozinha, é idempotente.

**Por que é urgente:** a policy antiga de `profiles` não tinha `with check`.
Sem ele, o Postgres reaproveita a expressão do `using` para validar a linha
nova, e a única exigência vira "o id continua sendo o meu". Nada impedia
escrever a coluna `is_admin`. Ou seja: qualquer pessoa que se cadastrasse na
loja virava administradora com

```
PATCH /rest/v1/profiles?id=eq.<o-uid-dela>   {"is_admin": true}
```

Com isso ela teria CPF, telefone e endereço de todos os clientes, o botão de
estorno, os preços, os cupons — e o campo `settings.pixels.head_html`, que
injeta JavaScript em **todas** as páginas da loja, checkout incluído. Não é
teórico; é uma requisição de uma linha.

A mesma migração conserta três coisas que hoje simplesmente não funcionam:

- **Nenhum cliente consegue avaliar um produto.** O índice único era parcial
  e o PostgREST não consegue inferir índice parcial num `ON CONFLICT`: toda
  submissão morria em `42P10` e o cliente lia "Não foi possível enviar
  agora". (O código já está consertado dos dois lados — funciona com a
  migração ou sem ela — mas o índice precisa ser corrigido mesmo assim.)
- **`settings` era legível por qualquer visitante.** Hoje está vazia desses
  dados, mas é onde o painel grava seu CPF/CNPJ, telefone e endereço de
  origem para a etiqueta do Melhor Envio. No minuto em que você preencher,
  fica público — basta a chave `anon`, que vai no bundle do site.
- **Limite de cupom era furável por corrida.** A leitura e o incremento
  estavam separados por uma chamada ao gateway inteira.

### 1.2 Variáveis de ambiente na Vercel

Está tudo pronto em **`vercel.env`** (gitignored, não subiu — contém a
`service_role`, que ignora todo o RLS).

Vercel → Projeto → Settings → Environment Variables → cole as linhas →
marque **Production, Preview e Development** → Save → **Redeploy sem cache de
build**.

Confirmei que hoje elas não estão lá: baixei os chunks JS do site publicado e
o ref do projeto Supabase não aparece em nenhum. É isso que causava o
`supabaseUrl is required` no build.

### 1.3 Supabase Auth → URL Configuration

- **Site URL:** `https://aromahaus.steniowebdesigner.com`
- **Redirect URLs:** acrescente `https://aromahaus.steniowebdesigner.com/auth/confirm`

Sem isso o link de confirmação de cadastro e o de recuperar senha voltam para
o domínio errado.

E, depois de criar sua conta em `/conta/cadastro`:

```sql
update public.profiles set is_admin = true where id = '<seu-user-id>';
```

(o id está em Authentication → Users). Só o primeiro admin precisa de SQL;
daí em diante é por **Admin → Equipe**.

---

## 2. O que consertei

### Segurança

- **`notifyWelcome`** recebia `{name, email}` do corpo da requisição. Server
  action é endpoint HTTP público: era um relay de spam assinado pelo seu
  domínio, com o logo da marca — exatamente o que faz o Resend suspender uma
  conta. Agora o destinatário sai da sessão e a função não tem parâmetro.
- **Templates de e-mail** interpolavam nome do cliente, endereço, motivo de
  recusa do gateway e nome de produto crus no HTML. Tudo escapado, e `href`
  só aceita `http(s)` (o link do boleto vem do gateway).
- **`/pedido/[id]`** lia pelo service-role sem conferir dono. Pedido de quem
  tem conta agora exige a sessão; compra sem cadastro continua valendo pelo
  link, que é a única credencial que esse cliente tem.
- **JSON-LD** saía de `JSON.stringify`, que não escapa `<`. Um nome de
  produto com `</script>` fecharia a tag e o resto viraria HTML executável.
- **IDs de pixel** entravam dentro de uma string JavaScript — um apóstrofo e
  o campo vira código rodando no checkout. Agora o formato é validado na
  gravação (com aviso na tela) e recusado de novo na hora de injetar.
- **Busca**: o termo ia cru para dentro do filtro `or` do PostgREST.
  "difusor, 250 ml" devolvia zero resultado, "a%" devolvia o catálogo
  inteiro, e dava para pendurar filtro próprio em colunas de `products`.
- **Cabeçalhos**: `frame-ancestors`, `base-uri`, `form-action`, `object-src`,
  `nosniff`, `Referrer-Policy`, `Permissions-Policy`, e `X-Powered-By`
  removido. Sem `script-src` de propósito — com os inline scripts da loja ele
  exigiria `unsafe-inline`, que não protege de nada e dá falsa sensação de
  CSP.

### Dinheiro

- **O carrinho nunca reconferia preço.** Ele vive no `localStorage` com uma
  foto do produto, e essa foto não envelhecia. O cliente voltava uma semana
  depois, via R$ 279,90 e o checkout cobrava R$ 299,90. Agora o carrinho se
  reconfere contra o banco assim que sai do storage, corrige em silêncio o
  que é só desatualização e **mostra um aviso** do que mudou a conta: preço
  diferente, item fora do ar, quantidade acima do estoque. Testei os três
  caminhos contra o banco de verdade, mexendo no catálogo e devolvendo ao
  original.
- **Produto esgotado fechava compra.** A quantidade saía de
  `stock > 0 ? stock : item.qty` — com estoque zero não havia teto. Carrinho
  parado numa aba com um tamanho que esgotou era cobrado, e a baixa de
  estoque travava em `greatest(0, …)`: venda sem produto para despachar.
- **Cupom "só na primeira compra" passava sempre.** O filtro comparava com
  `'cancelled'`, dois L, num enum que só conhece `'canceled'`. E a checagem
  olhava só o e-mail digitado, que o cliente troca à vontade — agora olha
  também o `user_id` da sessão.
- **Cupom de frete grátis** podia descontar mais que o próprio frete.

### O que o cliente via

- **Contraste**: o texto de apoio da loja dava 2,5:1 e 4,0:1 sobre o linho,
  contra o mínimo de 4,5:1. Isso é o aviso de CPF no checkout, os prazos de
  entrega, a descrição de cada formato. Recalibrei os três tons (4,6 / 5,6 /
  6,4) num arquivo só, e `.surface-ink` redefine os mesmos tokens para cima,
  porque em fundo escuro o contraste inverte — rodapé, header e depoimentos
  continuam iguais.
- **Lista de desejos**: nas páginas de listagem o coração nascia sempre
  apagado. Num produto já favoritado o cliente clicava achando que estava
  salvando e o item **saía** da lista dele.
- **Checkout**: onze campos tinham `<label>` sem `htmlFor`. Não respondiam ao
  clique no rótulo, não eram anunciados por leitor de tela e o navegador não
  preenchia nenhum. Agora cada um tem `id`, `name` e o `autocomplete` certo.
- **Texto herdado da WTN que o cliente lia**: o e-mail de boas-vindas dizia
  que a Aroma Haus é "especialista em coding e retrofit automotivo" e
  perguntava se ele precisava de ajuda "pra escolher a peça certa". A
  etiqueta do Melhor Envio ia impressa com "Peças e acessórios automotivos"
  como declaração de conteúdo.
- **WhatsApp**: um número pela metade na env virava link quebrado. Agora,
  sem número válido, o canal some da interface em vez de aparecer sem
  destino.

---

## 3. O que eu não fiz, e por quê

- **Não entrei no painel admin.** Fazer isso exigiria digitar uma senha num
  serviço de autenticação remoto, que é coisa que eu não faço. Toda a revisão
  do admin foi em código, lendo as actions e as policies — não cliquei em
  nada logado.
- **Não apliquei a `0013` nem mexi na Vercel**, pelos 403 já explicados.
- **Não mexi em preço, estoque nem em nenhum produto de verdade.** Alterei
  dois registros para testar o aviso do carrinho e devolvi os dois ao valor
  original (difusor Âmbar Haus 500 ml: R$ 279,90, estoque 8; Home Spray Âmbar
  Haus: ativo). Confirmei depois.
- **Sobram 5 avisos no `npm audit`**, todos em `eslint-config-next` →
  `braces`. É dependência de desenvolvimento, não vai para produção, e o
  `audit fix --force` rebaixaria o eslint para a linha do Next 14. Deixei.

---

## 4. Sugestão de ordem para hoje

1. Rodar a `0013` (2 min).
2. Colar o `vercel.env` e fazer **Redeploy sem cache** (5 min).
3. Ajustar as URLs no Supabase Auth (2 min).
4. Criar sua conta na loja e se promover a admin pelo SQL acima.
5. Entrar no painel e dar uma passada em **Configurações** — o CNPJ, o
   telefone e o endereço de origem são o que destrava a etiqueta do Melhor
   Envio.
6. Fazer um pedido de ponta a ponta com o Mercado Pago em sandbox.

O catálogo que está no ar é o de demonstração (8 fragrâncias × 4 formatos,
3 kits, as avaliações e os 3 posts). É tudo editável pelo painel, e o
`PRIMEIRAHAUS` é um cupom real de 5%.
