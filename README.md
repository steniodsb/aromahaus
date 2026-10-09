# Aroma Haus — E-commerce

Loja de **perfumaria de ambiente** de Galvão Amorim: difusores de varetas, home
sprays, sabonetes líquidos, refis e kits de presente. Catálogo com variantes de
tamanho, perfil olfativo, avaliações, lista de desejos, checkout transparente,
frete calculado, cupons e painel administrativo completo.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS v4**
- **Supabase** (Postgres + Auth + Storage + RLS)
- **Mercado Pago** (Pix, boleto e cartão) ou **C6 Bank**
- **Melhor Envio** (cotação e etiqueta)
- **Resend** (e-mails transacionais)
- Deploy: **Vercel**

## Rodando localmente

```bash
npm install
npm run dev     # http://localhost:3000
```

As chaves do Supabase já estão em `.env.local` (não versionado). O que falta
ligar — pagamento, frete e e-mail — está em [SETUP.md](SETUP.md).

## Banco de dados

**Primeira vez:** abra o projeto no Supabase → **SQL Editor** → cole
[`supabase/APLICAR.sql`](supabase/APLICAR.sql) inteiro e rode. Ele cria o
schema, as políticas de RLS e o catálogo de demonstração (8 fragrâncias em 4
formatos, 3 kits, avaliações e 3 posts).

Depois de criar sua conta em `/conta/cadastro`, vire admin:

```sql
update public.profiles set is_admin = true where id = '<seu-user-id>';
```

O id está em **Authentication → Users**. Daí em diante o painel fica em `/admin`.

`APLICAR.sql` é só a concatenação de `supabase/migrations/`, na ordem — é
gerado, não editado à mão. Mudou uma migração? Regenere o arquivo.

## Identidade

**Linho & Champagne.** A paleta sai das próprias embalagens: a cerâmica
off-white com rosas em relevo lilás, o vidro âmbar de tampa dourada e o cenário
de linho das fotos da marca.

| Token | Uso |
| --- | --- |
| `linen-50…900` | neutro quente — fundo, texto, cabeçalho e rodapé |
| `champagne-200…700` | dourado — acento, selos, CTA do banner |
| `lilac-100…600` | lilás das rosas — selos e detalhes |

Tipografia: **Cormorant Garamond** (display, `.font-display`) e **Jost**
(interface). Tokens em [`app/globals.css`](app/globals.css); a marca em
[`components/site/brand.tsx`](components/site/brand.tsx) (símbolo em SVG +
logotipo em texto, nítido em qualquer tamanho).

Arquivos de marca em `public/brand/`: símbolo, logotipo horizontal (SVG) e o
PNG usado nos e-mails.

## Imagens

As artes de banner, categoria e peças promocionais foram **compostas a partir
das fotos do cliente** (o PDF de rótulos), e são provisórias — substitua por
fotografia de estúdio quando houver:

```
public/produtos/     frascos recortados, fundo linho
public/categorias/   um tile por formato
public/home/         banners (desktop + mobile) e peças promocionais
```

Nenhuma arte tem texto gravado: a tipografia vive no HTML, então o painel troca
a chamada sem precisar refazer a imagem.

## Estrutura

```
app/(store)/            vitrine (home, categoria, produto, carrinho, checkout, conta, blog)
app/admin/(panel)/      painel (produtos, pedidos, avaliações, cupons, frete, páginas…)
app/actions/            server actions de uso geral (wishlist, avaliações, newsletter)
components/site/        marca, cabeçalho, rodapé, busca, menu
components/store/       vitrine (cards, banner, filtros, perfil olfativo, avaliações)
components/admin/       formulários e listas do painel
lib/                    consultas, pagamentos, frete, e-mail, tipos
lib/sellables.ts        resolve preço/estoque/peso de produto OU variante
supabase/migrations/    schema + seed
```

## O que é específico de perfumaria

- **Variantes de tamanho** (`product_variants`) — difusor 250 ml e 500 ml com
  preço, peso e estoque próprios. Produto sem variante vende pelos campos dele.
- **Perfil olfativo** — família, pirâmide (topo/corpo/fundo), intensidade e
  ambientes sugeridos, tudo virando faceta de filtro.
- **Avaliações** com moderação, selo de compra verificada e resposta da loja.
- **Lista de desejos** por cliente.
- **Presente** — embrulho e cartão com mensagem, marcados no checkout e
  destacados no pedido para quem separa.

## Roadmap

- **Fase 0 — Fundação** ✅ identidade, catálogo com variantes, vitrine, perfil
  olfativo, avaliações, lista de desejos, presente, painel.
- **Fase 1 — Ligar as integrações:** Mercado Pago, Melhor Envio e Resend (ver
  [SETUP.md](SETUP.md)); fotos de estúdio; catálogo real.
- **Fase 2 — Crescimento:** clube de assinatura de refil, cartão-presente,
  recomendação por perfil olfativo, programa de indicação.
